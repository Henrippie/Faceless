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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { createChannel } from "@/app/actions";
import { toast } from "sonner";

const EMPTY_FORM = {
  name: "",
  niche: "",
  language: "pt-BR",
  voiceName: "pt-BR-AntonioNeural",
  videoScriptPrompt: "",
  customSystemPrompt: "",
  imagePromptTemplate: "",
};

export function ChannelFormDialog({
  disabled,
  channelCount,
}: {
  disabled?: boolean;
  channelCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [vertical, setVertical] = useState(true);
  const [horizontal, setHorizontal] = useState(true);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const formats = [
      ...(vertical ? ["vertical"] : []),
      ...(horizontal ? ["horizontal"] : []),
    ];
    startTransition(async () => {
      try {
        await createChannel({ ...form, formats });
        toast.success("Canal criado.");
        setForm(EMPTY_FORM);
        setOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Não foi possível criar o canal.",
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="gap-1.5" disabled={disabled}>
            <Plus className="h-4 w-4" />
            Novo canal
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Novo canal ({channelCount}/100)</DialogTitle>
            <DialogDescription>
              Define o estilo do canal: nicho, roteiro, voz e imagens. O
              worker usa essa configuração toda vez que gerar um vídeo dele.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do canal</Label>
                <Input
                  id="name"
                  required
                  placeholder="Histórias Bíblicas"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="niche">Nicho</Label>
                <Input
                  id="niche"
                  placeholder="Cristão / Bíblico"
                  value={form.niche}
                  onChange={(e) => update("niche", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="language">Idioma do roteiro</Label>
                <Input
                  id="language"
                  placeholder="pt-BR"
                  value={form.language}
                  onChange={(e) => update("language", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voiceName">Voz (Edge TTS)</Label>
                <Input
                  id="voiceName"
                  placeholder="pt-BR-AntonioNeural"
                  value={form.voiceName}
                  onChange={(e) => update("voiceName", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoScriptPrompt">
                Estilo do roteiro (video_script_prompt)
              </Label>
              <Textarea
                id="videoScriptPrompt"
                rows={2}
                placeholder="Tom sério e dramático, como um documentário..."
                value={form.videoScriptPrompt}
                onChange={(e) => update("videoScriptPrompt", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customSystemPrompt">
                Instruções do roteirista (custom_system_prompt)
              </Label>
              <Textarea
                id="customSystemPrompt"
                rows={3}
                placeholder="Você é o roteirista de um canal dark sobre..."
                value={form.customSystemPrompt}
                onChange={(e) => update("customSystemPrompt", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imagePromptTemplate">
                Estilo visual das cenas (use {"{term}"})
              </Label>
              <Textarea
                id="imagePromptTemplate"
                rows={2}
                placeholder="dark dramatic oil painting of {term}, chiaroscuro..."
                value={form.imagePromptTemplate}
                onChange={(e) => update("imagePromptTemplate", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={vertical} onCheckedChange={setVertical} />
                Vertical (Reels/TikTok/Shorts/Kwai)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={horizontal} onCheckedChange={setHorizontal} />
                Horizontal (YouTube)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Criando..." : "Criar canal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
