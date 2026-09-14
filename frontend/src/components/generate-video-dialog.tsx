"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { queueVideo } from "@/app/actions";
import type { Channel } from "@/lib/types";
import { toast } from "sonner";

export function GenerateVideoDialog({
  channels,
}: {
  channels: Pick<Channel, "id" | "name">[];
}) {
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState<string>(channels[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!channelId || !subject.trim()) return;
    startTransition(async () => {
      try {
        await queueVideo(channelId, subject.trim());
        toast.success("Vídeo adicionado à fila de geração.");
        setSubject("");
        setOpen(false);
      } catch {
        toast.error("Não foi possível adicionar o vídeo à fila.");
      }
    });
  }

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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Gerar novo vídeo</DialogTitle>
            <DialogDescription>
              Entra na fila do worker, que gera o roteiro e monta as versões
              vertical e horizontal usando a configuração do canal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                value={channelId}
                onValueChange={(value) => setChannelId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um canal">
                    {(value: string) =>
                      channels.find((c) => c.id === value)?.name ??
                      "Selecione um canal"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Tema do vídeo</Label>
              <Textarea
                id="subject"
                placeholder="Ex.: Davi e Golias"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adicionando..." : "Adicionar à fila"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
