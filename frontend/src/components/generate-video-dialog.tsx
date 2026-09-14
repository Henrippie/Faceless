"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { VideoTopicForm } from "@/components/video-topic-form";
import type { Channel } from "@/lib/types";

export function GenerateVideoDialog({
  channels,
}: {
  channels: Pick<Channel, "id" | "name">[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-1.5" disabled={channels.length === 0}>
            <Plus className="h-4 w-4" />
            Gerar vídeo
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar novo vídeo</DialogTitle>
          <DialogDescription>
            Entra na fila do worker, que gera o roteiro e monta as versões
            vertical e horizontal usando a configuração do canal.
          </DialogDescription>
        </DialogHeader>
        <VideoTopicForm channels={channels} onQueued={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
