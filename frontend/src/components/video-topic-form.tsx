"use client";

import { useState, useTransition } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";
import { queueVideo, suggestVideoTopics } from "@/app/actions";
import type { Channel } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function VideoTopicForm({
  channels,
  fixedChannelId,
  onQueued,
}: {
  channels: Pick<Channel, "id" | "name">[];
  fixedChannelId?: string;
  onQueued?: () => void;
}) {
  const [channelId, setChannelId] = useState<string>(
    fixedChannelId ?? channels[0]?.id ?? "",
  );
  const [subject, setSubject] = useState("");
  const [reviewScript, setReviewScript] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [isSuggesting, startSuggesting] = useTransition();
  const [isPending, startTransition] = useTransition();

  function handleSuggest() {
    if (!channelId) return;
    startSuggesting(async () => {
      try {
        const topics = await suggestVideoTopics(channelId);
        setSuggestions(topics);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível sugerir temas.",
        );
      }
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!channelId || !subject.trim()) return;
    startTransition(async () => {
      try {
        await queueVideo(
          channelId,
          subject.trim(),
          reviewScript ? "review_script" : "auto",
        );
        toast.success(
          reviewScript
            ? "Vídeo na fila — o roteiro vai esperar sua aprovação."
            : "Vídeo adicionado à fila de geração.",
        );
        setSubject("");
        setSuggestions(null);
        onQueued?.();
      } catch {
        toast.error("Não foi possível adicionar o vídeo à fila.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!fixedChannelId ? (
        <div className="space-y-2">
          <Label>Canal</Label>
          <Select
            value={channelId}
            onValueChange={(value) => {
              setChannelId(value ?? "");
              setSuggestions(null);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um canal">
                {(value: string) =>
                  channels.find((c) => c.id === value)?.name ?? "Selecione um canal"
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
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="subject">Tema do vídeo</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-amber-400 hover:text-amber-300"
            onClick={handleSuggest}
            disabled={isSuggesting || !channelId}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isSuggesting ? "Pensando..." : "Sugerir 5 temas com IA"}
          </Button>
        </div>
        <Textarea
          id="subject"
          placeholder="Ex.: Davi e Golias"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
        />
        {suggestions ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {suggestions.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSubject(topic)}
                title={topic}
                className={cn(
                  "max-w-full truncate rounded-full border px-2.5 py-1 text-xs transition-colors",
                  subject === topic
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                    : "border-border text-muted-foreground hover:border-amber-500/30 hover:text-foreground",
                )}
              >
                {topic}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Switch checked={reviewScript} onCheckedChange={setReviewScript} />
        Aprovar roteiro antes de gerar imagem e áudio
      </label>
      <p className="text-xs text-muted-foreground">
        {reviewScript
          ? "O worker para depois do roteiro e espera você revisar/editar antes de gastar crédito com imagem e voz."
          : "Gera direto do roteiro até o vídeo final, sem parar pra revisão."}
      </p>

      <Button type="submit" disabled={isPending || !channelId} className="w-full">
        {isPending ? "Adicionando..." : "Adicionar à fila"}
      </Button>
    </form>
  );
}
