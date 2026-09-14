"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Pause, Play, Trash2 } from "lucide-react";
import { deleteChannel, setChannelStatus } from "@/app/actions";
import type { Channel } from "@/lib/types";
import { toast } from "sonner";

export function ChannelCard({ channel }: { channel: Channel }) {
  const [isPending, startTransition] = useTransition();
  const isActive = channel.status === "active";

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
      <CardFooter className="justify-between gap-2">
        <Link href={`/canais/${channel.id}`}>
          <Button variant="secondary" size="sm" className="gap-1.5">
            Abrir canal
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <div className="flex items-center gap-1">
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
        </div>
      </CardFooter>
    </Card>
  );
}
