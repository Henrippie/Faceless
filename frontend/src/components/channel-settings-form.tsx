"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Music, PlayCircle, Sparkles, Trash2, Upload } from "lucide-react";
import {
  removeChannelBgMusic,
  saveChannelBgMusic,
  testImageStyle,
  testVoiceSample,
  updateChannel,
  updateChannelBgMusicVolume,
  updateChannelPublishSettings,
} from "@/app/actions";
import type { Channel } from "@/lib/types";
import { toast } from "sonner";

const TTS_LABELS: Record<string, string> = {
  edge: "Edge TTS (grátis)",
  elevenlabs: "ElevenLabs",
};

const PUBLISH_PLATFORM_OPTIONS = ["youtube", "tiktok", "instagram"];

export function ChannelSettingsForm({
  channel,
  bgMusicUrl,
}: {
  channel: Channel;
  bgMusicUrl: string | null;
}) {
  const [form, setForm] = useState({
    niche: channel.niche ?? "",
    language: channel.language ?? "pt-BR",
    voiceName: channel.voice_name ?? "",
    ttsProvider: channel.tts_provider ?? "edge",
    videoScriptPrompt: channel.video_script_prompt ?? "",
    customSystemPrompt: channel.custom_system_prompt ?? "",
    imagePromptTemplate: channel.image_prompt_template ?? "",
  });
  const [vertical, setVertical] = useState(channel.formats?.includes("vertical") ?? true);
  const [horizontal, setHorizontal] = useState(channel.formats?.includes("horizontal") ?? true);
  const [isSaving, startSaving] = useTransition();

  const [platforms, setPlatforms] = useState<string[]>(channel.publish_platforms ?? []);
  const [madeForKids, setMadeForKids] = useState(channel.youtube_made_for_kids ?? false);
  const [isSavingPublish, startSavingPublish] = useTransition();

  const [isTestingVoice, startTestingVoice] = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isTestingStyle, startTestingStyle] = useTransition();
  const [styleTestImage, setStyleTestImage] = useState<string | null>(null);

  const [isUploadingMusic, startUploadingMusic] = useTransition();
  const [volume, setVolume] = useState(channel.bg_music_volume ?? 0.12);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    startSaving(async () => {
      try {
        await updateChannel(channel.id, {
          ...form,
          formats: [...(vertical ? ["vertical"] : []), ...(horizontal ? ["horizontal"] : [])],
        });
        toast.success("Configurações do canal salvas.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
      }
    });
  }

  function savePublishSettings(nextPlatforms: string[], nextMadeForKids: boolean) {
    setPlatforms(nextPlatforms);
    setMadeForKids(nextMadeForKids);
    startSavingPublish(async () => {
      try {
        await updateChannelPublishSettings(channel.id, nextPlatforms, nextMadeForKids);
      } catch {
        toast.error("Não foi possível salvar a publicação automática.");
      }
    });
  }

  function togglePlatform(platform: string) {
    const next = platforms.includes(platform)
      ? platforms.filter((p) => p !== platform)
      : [...platforms, platform];
    savePublishSettings(next, madeForKids);
  }

  function handleTestVoice() {
    startTestingVoice(async () => {
      try {
        const dataUrl = await testVoiceSample(form.ttsProvider, form.voiceName);
        if (audioRef.current) {
          audioRef.current.src = dataUrl;
          await audioRef.current.play();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível testar a voz.");
      }
    });
  }

  function handleTestStyle() {
    startTestingStyle(async () => {
      try {
        const image = await testImageStyle(form.imagePromptTemplate);
        setStyleTestImage(image);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível testar o estilo.");
      }
    });
  }

  function handleMusicFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startUploadingMusic(async () => {
      try {
        await saveChannelBgMusic(channel.id, formData);
        toast.success("Trilha sonora salva.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao subir o arquivo.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  function handleRemoveMusic() {
    startUploadingMusic(async () => {
      try {
        await removeChannelBgMusic(channel.id);
        toast.success("Trilha sonora removida.");
      } catch {
        toast.error("Não foi possível remover a trilha.");
      }
    });
  }

  function handleVolumeCommit(nextVolume: number) {
    setVolume(nextVolume);
    startUploadingMusic(async () => {
      try {
        await updateChannelBgMusicVolume(channel.id, nextVolume);
      } catch {
        toast.error("Não foi possível salvar o volume.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <audio ref={audioRef} className="hidden" />

      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perfil do canal</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="niche">Nicho</Label>
              <Input id="niche" value={form.niche} onChange={(e) => update("niche", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language">Idioma do roteiro</Label>
              <Input id="language" value={form.language} onChange={(e) => update("language", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Narração</CardTitle>
            <CardDescription>Teste a voz antes de gerar um vídeo inteiro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Narrador</Label>
                <Select
                  value={form.ttsProvider}
                  onValueChange={(value) => {
                    const provider = value ?? "edge";
                    setForm((prev) => ({
                      ...prev,
                      ttsProvider: provider,
                      voiceName:
                        provider === "elevenlabs"
                          ? prev.voiceName.startsWith("elevenlabs:")
                            ? prev.voiceName
                            : ""
                          : prev.voiceName === "" || prev.voiceName.startsWith("elevenlabs:")
                            ? "pt-BR-AntonioNeural"
                            : prev.voiceName,
                    }));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Narrador">
                      {(value: string) => TTS_LABELS[value] ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edge">Edge TTS (grátis)</SelectItem>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voiceName">
                  {form.ttsProvider === "elevenlabs" ? "ID da voz (ElevenLabs)" : "Voz (Edge TTS)"}
                </Label>
                <Input
                  id="voiceName"
                  placeholder={
                    form.ttsProvider === "elevenlabs"
                      ? "elevenlabs:21m00Tcm4TlvDq8ikWAM"
                      : "pt-BR-AntonioNeural"
                  }
                  value={form.voiceName}
                  onChange={(e) => update("voiceName", e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleTestVoice}
              disabled={isTestingVoice || !form.voiceName}
            >
              <PlayCircle className="h-3.5 w-3.5" />
              {isTestingVoice ? "Gerando amostra..." : "Ouvir amostra"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roteiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="videoScriptPrompt">Estilo do roteiro (video_script_prompt)</Label>
              <Textarea
                id="videoScriptPrompt"
                rows={2}
                value={form.videoScriptPrompt}
                onChange={(e) => update("videoScriptPrompt", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customSystemPrompt">Instruções do roteirista (custom_system_prompt)</Label>
              <Textarea
                id="customSystemPrompt"
                rows={3}
                value={form.customSystemPrompt}
                onChange={(e) => update("customSystemPrompt", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estilo visual</CardTitle>
            <CardDescription>Teste o estilo antes de rodar vídeos com ele.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="imagePromptTemplate">Estilo visual das cenas (use {"{term}"})</Label>
              <Textarea
                id="imagePromptTemplate"
                rows={2}
                placeholder="dark dramatic oil painting of {term}, chiaroscuro..."
                value={form.imagePromptTemplate}
                onChange={(e) => update("imagePromptTemplate", e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleTestStyle}
              disabled={isTestingStyle}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {isTestingStyle ? "Gerando imagem..." : "Testar estilo"}
            </Button>
            {styleTestImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={styleTestImage}
                alt="Teste de estilo visual"
                className="h-48 w-full rounded-lg border border-border/60 object-cover"
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formatos</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={vertical} onCheckedChange={setVertical} />
              Vertical (Reels/TikTok/Shorts/Kwai)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={horizontal} onCheckedChange={setHorizontal} />
              Horizontal (YouTube)
            </label>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trilha sonora padrão</CardTitle>
          <CardDescription>
            Música de fundo aplicada em todos os vídeos deste canal, com volume
            reduzido pra não cobrir a narração.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleMusicFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingMusic}
            >
              <Upload className="h-3.5 w-3.5" />
              {isUploadingMusic ? "Enviando..." : "Enviar música"}
            </Button>
            {bgMusicUrl ? (
              <>
                <audio controls src={bgMusicUrl} className="h-8 max-w-[220px]" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={handleRemoveMusic}
                  disabled={isUploadingMusic}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Music className="h-3.5 w-3.5" />
                Nenhuma música definida
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bg-volume" className="text-xs">
              Volume de fundo: {Math.round(volume * 100)}%
            </Label>
            <input
              id="bg-volume"
              type="range"
              min={0}
              max={50}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              onMouseUp={(e) => handleVolumeCommit(Number(e.currentTarget.value) / 100)}
              onTouchEnd={(e) => handleVolumeCommit(Number(e.currentTarget.value) / 100)}
              className="w-full max-w-xs accent-amber-400"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publicação automática</CardTitle>
          <CardDescription>
            Plataformas usadas quando você aprovar um vídeo pronto deste canal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-4">
            {PUBLISH_PLATFORM_OPTIONS.map((platform) => (
              <label key={platform} className="flex items-center gap-2 text-sm capitalize">
                <Switch
                  checked={platforms.includes(platform)}
                  onCheckedChange={() => togglePlatform(platform)}
                  disabled={isSavingPublish}
                />
                {platform}
              </label>
            ))}
          </div>
          {platforms.includes("youtube") ? (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={madeForKids}
                onCheckedChange={(checked) => savePublishSettings(platforms, checked)}
                disabled={isSavingPublish}
              />
              Conteúdo feito para crianças (declaração do YouTube)
            </label>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
