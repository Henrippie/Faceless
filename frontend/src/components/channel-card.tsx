"use client";

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
import { Pause, Play, Trash2 } from "lucide-react";
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
        <p>Voz: {channel.voice_name || "padrão"}</p>
        <p>Formatos: {channel.formats.join(", ") || "vertical, horizontal"}</p>
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
