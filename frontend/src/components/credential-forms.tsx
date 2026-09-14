"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { saveElevenlabsCredential, saveImageCredential, saveLlmCredential } from "@/app/actions";
import { toast } from "sonner";

function ConfiguredBadge({ configured }: { configured: boolean }) {
  if (!configured) return null;
  return (
    <Badge className="gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
      <CheckCircle2 className="h-3 w-3" />
      Configurado
    </Badge>
  );
}

export function LlmCredentialForm({
  initialProvider,
  initialModel,
  configured,
}: {
  initialProvider: string;
  initialModel: string;
  configured: boolean;
}) {
  const [provider, setProvider] = useState(initialProvider);
  const [model, setModel] = useState(initialModel);
  const [apiKey, setApiKey] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await saveLlmCredential({ provider, model, apiKey });
        setApiKey("");
        toast.success("Chave de LLM salva.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Roteiro (LLM)</CardTitle>
          <ConfiguredBadge configured={configured} />
        </div>
        <CardDescription>
          Usado pelo worker pra escrever o roteiro de cada vídeo. Ex.: Kimi/Moonshot,
          OpenAI, Gemini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="llm-provider">Provedor</Label>
              <Input
                id="llm-provider"
                placeholder="moonshot"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="llm-model">Modelo</Label>
              <Input
                id="llm-model"
                placeholder="kimi-k2.6"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="llm-key">Chave de API</Label>
            <Input
              id="llm-key"
              type="password"
              placeholder={configured ? "•••••••••••• (deixe em branco pra manter)" : "sk-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ImageCredentialForm({
  initialBaseUrl,
  initialModel,
  configured,
}: {
  initialBaseUrl: string;
  initialModel: string;
  configured: boolean;
}) {
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);
  const [model, setModel] = useState(initialModel);
  const [apiKey, setApiKey] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await saveImageCredential({ baseUrl, model, apiKey });
        setApiKey("");
        toast.success("Chave de imagem salva.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Geração de imagem</CardTitle>
          <ConfiguredBadge configured={configured} />
        </div>
        <CardDescription>
          Endpoint compatível com /v1/images/generations. Ex.: OpenAI, SiliconFlow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="image-base-url">Base URL</Label>
            <Input
              id="image-base-url"
              placeholder="https://api.openai.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image-model">Modelo</Label>
            <Input
              id="image-model"
              placeholder="gpt-image-2"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="image-key">Chave de API</Label>
            <Input
              id="image-key"
              type="password"
              placeholder={configured ? "•••••••••••• (deixe em branco pra manter)" : "sk-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function ElevenlabsCredentialForm({ configured }: { configured: boolean }) {
  const [apiKey, setApiKey] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await saveElevenlabsCredential(apiKey);
        setApiKey("");
        toast.success("Chave da ElevenLabs salva.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao salvar.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Narração (ElevenLabs)</CardTitle>
          <ConfiguredBadge configured={configured} />
        </div>
        <CardDescription>
          Opcional — sem isso os canais narram com o Edge TTS gratuito. Pra usar
          ElevenLabs num canal, escolha &quot;ElevenLabs&quot; no canal e coloque a
          voz como <code className="text-xs">elevenlabs:ID_DA_VOZ</code> no campo
          de voz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="elevenlabs-key">Chave de API</Label>
            <Input
              id="elevenlabs-key"
              type="password"
              placeholder={configured ? "•••••••••••• (deixe em branco pra manter)" : "..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
