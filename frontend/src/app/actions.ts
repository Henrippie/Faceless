"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAX_CHANNELS = 100;

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

export async function queueVideo(channelId: string, subject: string) {
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
  });
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

export async function approveVideo(videoId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_video", {
    p_video_id: videoId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
