"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.amber.950/40),transparent_60%)]"
      />
      <Card className="relative z-10 w-full max-w-sm border-border/60 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl">Central de Canais Dark</CardTitle>
          <CardDescription>
            Entre com seu e-mail para acessar o painel dos seus canais e
            vídeos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "sent" ? (
            <p className="text-sm text-muted-foreground">
              Enviamos um link de acesso para <strong>{email}</strong>. Abra
              seu e-mail e clique no link para entrar.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Enviando..." : "Enviar link de acesso"}
              </Button>
              {status === "error" ? (
                <p className="text-sm text-destructive">
                  Não foi possível enviar o link. Tente novamente.
                </p>
              ) : null}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
