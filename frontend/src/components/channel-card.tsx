"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pause, Play, Trash2 } from "lucide-react";
import {
  deleteChannel,
  setChannelStatus,
  updateChannelPublishSettings,
} from "@/app/actions";
import type { Channel } from "@/lib/types";
import { toast } from "sonner";

const PUBLISH_PLATFORM_OPTIONS = ["youtube", "tiktok", "instagram"];

export function ChannelCard({ channel }: { channel: Channel }) {
  const [isPending, startTransition] = useTransition();
  const [platforms, setPlatforms] = useState<string[]>(channel.publish_platforms ?? []);
  const [madeForKids, setMadeForKids] = useState(channel.youtube_made_for_kids ?? false);
  const isActive = channel.status === "active";

  function savePublishSettings(nextPlatforms: string[], nextMadeForKids: boolean) {
    setPlatforms(nextPlatforms);
    setMadeForKids(nextMadeForKids);
    startTransition(async () => {
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

  function handleToggleStatus() {
    startTransition(async () => {
      try {
        await setChannelStatus(channel.id, isActive ? "paused" : "active");
      } catch {
        toast.error("Não foi possível atualizar o canal.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Remover o canal "${channel.name}"? Os vídeos dele continuam salvos.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteChannel(channel.id);
        toast.success("Canal removido.");
      } catch {
        toast.error("Não foi possível remover o canal.");
      }
    });
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="gap-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{channel.name}</CardTitle>
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-emerald-500/15 text-emerald-400" : ""}
          >
            {isActive ? "Ativo" : "Pausado"}
          </Badge>
        </div>
        {channel.niche ? (
          <p className="text-xs text-muted-foreground">{channel.niche}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-1 text-xs text-muted-foreground">
        <p>Idioma: {channel.language}</p>
        <p>
          Narrador: {channel.tts_provider === "elevenlabs" ? "ElevenLabs" : "Edge TTS"} —{" "}
          {channel.voice_name || "padrão"}
        </p>
        <p>Formatos: {channel.formats.join(", ") || "vertical, horizontal"}</p>
      </CardContent>
      <CardContent className="space-y-2 border-t border-border/60 pt-3">
        <p className="text-xs font-medium text-foreground">Publicação automática</p>
        <div className="flex flex-wrap gap-3">
          {PUBLISH_PLATFORM_OPTIONS.map((platform) => (
            <label key={platform} className="flex items-center gap-1.5 text-xs capitalize">
              <Switch
                checked={platforms.includes(platform)}
                onCheckedChange={() => togglePlatform(platform)}
                disabled={isPending}
              />
              {platform}
            </label>
          ))}
        </div>
        {platforms.includes("youtube") ? (
          <label className="flex items-center gap-1.5 text-xs">
            <Switch
              checked={madeForKids}
              onCheckedChange={(checked) => savePublishSettings(platforms, checked)}
              disabled={isPending}
            />
            Feito para crianças (YouTube)
          </label>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleStatus}
          disabled={isPending}
          className="gap-1.5"
        >
          {isActive ? (
            <>
              <Pause className="h-3.5 w-3.5" /> Pausar
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> Ativar
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
