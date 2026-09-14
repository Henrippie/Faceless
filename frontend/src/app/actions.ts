"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_CHANNELS = 100;

const DEFAULT_LLM_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  moonshot: "https://api.moonshot.cn/v1",
  deepseek: "https://api.deepseek.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
};

const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(DIACRITICS_PATTERN, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "canal"
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type CreateChannelInput = {
  name: string;
  niche: string;
  language: string;
  voiceName: string;
  ttsProvider: string;
  videoScriptPrompt: string;
  customSystemPrompt: string;
  imagePromptTemplate: string;
  formats: string[];
  publishPlatforms: string[];
  youtubeMadeForKids: boolean;
};

export async function createChannel(input: CreateChannelInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("não autenticado");

  const { count } = await supabase
    .from("channels")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) >= MAX_CHANNELS) {
    throw new Error(
      `limite de ${MAX_CHANNELS} canais atingido. Pause ou remova um canal existente antes de criar outro.`,
    );
  }

  const baseSlug = slugify(input.name);
  let slug = baseSlug;
  for (let attempt = 1; attempt < 50; attempt++) {
    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("owner_id", user.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${attempt + 1}`;
  }

  const { error } = await supabase.from("channels").insert({
    owner_id: user.id,
    name: input.name,
    slug,
    niche: input.niche,
    language: input.language,
    voice_name: input.voiceName,
    tts_provider: input.ttsProvider,
    video_script_prompt: input.videoScriptPrompt,
    custom_system_prompt: input.customSystemPrompt,
    image_prompt_template: input.imagePromptTemplate,
    formats: input.formats.length ? input.formats : ["vertical", "horizontal"],
    publish_platforms: input.publishPlatforms,
    youtube_made_for_kids: input.youtubeMadeForKids,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/channels");
  revalidatePath("/");
}

export type UpdateChannelInput = {
  niche: string;
  language: string;
  voiceName: string;
  ttsProvider: string;
  videoScriptPrompt: string;
  customSystemPrompt: string;
  imagePromptTemplate: string;
  formats: string[];
};

export async function updateChannel(channelId: string, input: UpdateChannelInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("channels")
    .update({
      niche: input.niche,
      language: input.language,
      voice_name: input.voiceName,
      tts_provider: input.ttsProvider,
      video_script_prompt: input.videoScriptPrompt,
      custom_system_prompt: input.customSystemPrompt,
      image_prompt_template: input.imagePromptTemplate,
      formats: input.formats.length ? input.formats : ["vertical", "horizontal"],
    })
    .eq("id", channelId);
  if (error) throw new Error(error.message);
  revalidatePath(`/canais/${channelId}`);
  revalidatePath("/channels");
}

export async function saveChannelBgMusic(channelId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("não autenticado");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("selecione um arquivo de áudio.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("arquivo muito grande (máx. 15MB).");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp3";
  const path = `${user.id}/channel-assets/${channelId}/bg-music.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("videos")
    .upload(path, bytes, { contentType: file.type || "audio/mpeg", upsert: true });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase
    .from("channels")
    .update({ bg_music_path: path })
    .eq("id", channelId);
  if (error) throw new Error(error.message);
  revalidatePath(`/canais/${channelId}`);
}

export async function removeChannelBgMusic(channelId: string) {
  const supabase = await createClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("bg_music_path")
    .eq("id", channelId)
    .single();
  if (channel?.bg_music_path) {
    await supabase.storage.from("videos").remove([channel.bg_music_path]);
  }
  const { error } = await supabase
    .from("channels")
    .update({ bg_music_path: null })
    .eq("id", channelId);
  if (error) throw new Error(error.message);
  revalidatePath(`/canais/${channelId}`);
}

export async function updateChannelBgMusicVolume(channelId: string, volume: number) {
  const supabase = await createClient();
  const clamped = Math.min(1, Math.max(0, volume));
  const { error } = await supabase
    .from("channels")
    .update({ bg_music_volume: clamped })
    .eq("id", channelId);
  if (error) throw new Error(error.message);
  revalidatePath(`/canais/${channelId}`);
}

export async function updateChannelPublishSettings(
  channelId: string,
  platforms: string[],
  madeForKids: boolean,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("channels")
    .update({ publish_platforms: platforms, youtube_made_for_kids: madeForKids })
    .eq("id", channelId);
  if (error) throw new Error(error.message);
  revalidatePath("/channels");
}

export async function setChannelStatus(channelId: string, status: "active" | "paused") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("channels")
    .update({ status })
    .eq("id", channelId);
  if (error) throw new Error(error.message);
  revalidatePath("/channels");
}

export async function deleteChannel(channelId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("channels").delete().eq("id", channelId);
  if (error) throw new Error(error.message);
  revalidatePath("/channels");
  revalidatePath("/");
}

export async function queueVideo(
  channelId: string,
  subject: string,
  mode: "auto" | "review_script" = "auto",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("não autenticado");

  const { error } = await supabase.from("videos").insert({
    owner_id: user.id,
    channel_id: channelId,
    subject,
    status: "queued",
    mode,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function suggestVideoTopics(channelId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .select("name, niche, language, video_script_prompt, custom_system_prompt")
    .eq("id", channelId)
    .single();
  if (channelError || !channel) throw new Error("canal não encontrado.");

  const { data: creds, error: credError } = await supabase.rpc(
    "get_my_llm_credential",
  );
  if (credError) throw new Error(credError.message);

  const credData = (creds ?? {}) as Record<string, string | null>;
  const provider = (credData.llm_provider || "").trim();
  const apiKey = (credData.llm_api_key || "").trim();
  if (!provider || !apiKey) {
    throw new Error(
      "configure sua chave de LLM em Configurações antes de pedir sugestões.",
    );
  }
  const model = (credData.llm_model || "").trim() || "gpt-4o-mini";
  const baseUrl =
    (credData.llm_base_url || "").trim() ||
    DEFAULT_LLM_BASE_URLS[provider] ||
    DEFAULT_LLM_BASE_URLS.openai;

  const systemPrompt =
    (channel.custom_system_prompt || "").trim() ||
    `Você é o roteirista de um canal chamado "${channel.name}" sobre ${channel.niche || "temas diversos"}.`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            `Idioma do canal: ${channel.language || "pt-BR"}. Estilo: ${
              channel.video_script_prompt || "sem preferência específica"
            }.\n\n` +
            "Sugira exatamente 5 temas curtos e específicos para o próximo vídeo " +
            "desse canal, bem diferentes entre si. Responda só com uma lista " +
            "numerada de 1 a 5, uma linha por tema, sem explicações extras.",
        },
      ],
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `falha ao gerar sugestões (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  const json = await response.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  const topics = content
    .split("\n")
    .map((line: string) => line.replace(/^\s*[\d.\-*)]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (topics.length === 0) {
    throw new Error("o modelo não devolveu sugestões utilizáveis.");
  }
  return topics;
}

export async function testVoiceSample(
  ttsProvider: string,
  voiceName: string,
): Promise<string> {
  const sampleText =
    "Olá! Esta é uma amostra da narração deste canal, pra você calibrar o tom antes de gerar um vídeo inteiro.";

  if (ttsProvider !== "elevenlabs") {
    throw new Error(
      "teste de voz ao vivo só está disponível pra ElevenLabs por enquanto. " +
        "O Edge TTS é gratuito e pode ser conferido direto no primeiro vídeo gerado.",
    );
  }

  const voiceId = voiceName.replace(/^elevenlabs:/, "").trim();
  if (!voiceId) {
    throw new Error("informe o ID da voz da ElevenLabs antes de testar.");
  }

  const supabase = await createClient();
  const { data: creds, error } = await supabase.rpc(
    "get_my_elevenlabs_credential",
  );
  if (error) throw new Error(error.message);
  const apiKey = ((creds ?? {}) as Record<string, string | null>)
    .elevenlabs_api_key || "";
  if (!apiKey) {
    throw new Error(
      "configure sua chave da ElevenLabs em Configurações antes de testar.",
    );
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: sampleText,
        model_id: "eleven_multilingual_v2",
      }),
    },
  );
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `falha ao gerar amostra (${response.status}): ${text.slice(0, 200)}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
}

export async function testImageStyle(promptTemplate: string): Promise<string> {
  const supabase = await createClient();
  const { data: creds, error } = await supabase.rpc("get_my_image_credential");
  if (error) throw new Error(error.message);

  const credData = (creds ?? {}) as Record<string, string | null>;
  const baseUrl = (credData.image_base_url || "").trim();
  const model = (credData.image_model || "").trim();
  const apiKey = (credData.image_api_key || "").trim();
  if (!baseUrl || !model) {
    throw new Error(
      "configure a geração de imagem em Configurações antes de testar o estilo.",
    );
  }

  const term = "a lone figure standing at dawn, wide shot";
  const trimmedTemplate = promptTemplate.trim();
  const prompt =
    trimmedTemplate && trimmedTemplate.includes("{term}")
      ? trimmedTemplate.replace("{term}", term)
      : trimmedTemplate || term;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ model, prompt, n: 1, size: "1024x1024" }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `falha ao gerar imagem de teste (${response.status}): ${text.slice(0, 300)}`,
    );
  }
  const json = await response.json();
  const entry = json?.data?.[0];
  if (entry?.b64_json) {
    return `data:image/png;base64,${entry.b64_json}`;
  }
  if (typeof entry?.url === "string") {
    return entry.url as string;
  }
  throw new Error("resposta da API de imagem não trouxe nem b64_json nem url.");
}

export async function approveScript(videoId: string, script: string) {
  const supabase = await createClient();
  const trimmed = script.trim();
  if (!trimmed) throw new Error("o roteiro não pode ficar vazio.");
  const { error } = await supabase
    .from("videos")
    .update({ script: trimmed, status: "queued" })
    .eq("id", videoId)
    .eq("status", "script_ready");
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function updateVideoTitle(videoId: string, title: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("videos")
    .update({ title: title.trim() || null })
    .eq("id", videoId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function togglePublishedFlag(
  videoId: string,
  platform: string,
  value: boolean,
  currentPublished: Record<string, boolean>,
) {
  const supabase = await createClient();
  const next = { ...currentPublished, [platform]: value };
  const { error } = await supabase
    .from("videos")
    .update({ published: next })
    .eq("id", videoId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteVideo(videoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("videos").delete().eq("id", videoId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function saveLlmCredential(input: {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_llm_credential", {
    p_provider: input.provider,
    p_model: input.model,
    p_api_key: input.apiKey,
    p_base_url: input.baseUrl,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function saveImageCredential(input: {
  baseUrl: string;
  model: string;
  apiKey: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_image_credential", {
    p_base_url: input.baseUrl,
    p_model: input.model,
    p_api_key: input.apiKey,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function saveElevenlabsCredential(apiKey: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_elevenlabs_credential", {
    p_api_key: apiKey,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function saveUploadPostCredential(input: {
  username: string;
  apiKey: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_upload_post_credential", {
    p_username: input.username,
    p_api_key: input.apiKey,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export async function approveVideo(videoId: string, scheduledAt?: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_video", {
    p_video_id: videoId,
    p_scheduled_at: scheduledAt ?? undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
