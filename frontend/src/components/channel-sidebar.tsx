"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, LayoutGrid, Radio, Settings } from "lucide-react";
import { signOut } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/types";

export type ChannelCounts = {
  ready: number;
  awaitingApproval: number;
  inProgress: number;
  failed: number;
};

type SidebarChannel = Pick<Channel, "id" | "name" | "status">;

function statusDotClass(channel: SidebarChannel, counts: ChannelCounts | undefined) {
  if (channel.status !== "active") return "bg-muted-foreground/40";
  if ((counts?.failed ?? 0) > 0) return "bg-destructive";
  if ((counts?.awaitingApproval ?? 0) > 0) return "bg-amber-400";
  if ((counts?.inProgress ?? 0) > 0) return "bg-amber-400/70 animate-pulse";
  return "bg-emerald-400";
}

export function ChannelSidebar({
  channels,
  counts,
  hasUser,
}: {
  channels: SidebarChannel[];
  counts: Record<string, ChannelCounts>;
  hasUser: boolean;
}) {
  const pathname = usePathname();
  const totalAwaiting = Object.values(counts).reduce(
    (sum, c) => sum + c.awaitingApproval,
    0,
  );

  return (
    <>
      {/* Sidebar fixa (telas médias+) */}
      <aside className="hidden w-60 shrink-0 border-r border-border/60 md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border/60 px-4 font-semibold">
          <Clapperboard className="h-5 w-5 text-amber-400" />
          <span className="text-sm">Central Dark</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            Visão geral
            {totalAwaiting > 0 ? (
              <Badge className="ml-auto h-5 gap-1 border-amber-500/30 bg-amber-500/15 px-1.5 text-[11px] text-amber-400">
                {totalAwaiting}
              </Badge>
            ) : null}
          </Link>

          <div className="mt-3 px-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Canais ({channels.length}/100)
          </div>

          {channels.map((channel) => {
            const active = pathname === `/canais/${channel.id}`;
            const c = counts[channel.id];
            return (
              <Link
                key={channel.id}
                href={`/canais/${channel.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn("h-2 w-2 shrink-0 rounded-full", statusDotClass(channel, c))}
                />
                <span className="flex-1 truncate">{channel.name}</span>
                {c?.awaitingApproval ? (
                  <Badge className="h-5 shrink-0 gap-1 border-amber-500/30 bg-amber-500/15 px-1.5 text-[11px] text-amber-400">
                    {c.awaitingApproval}
                  </Badge>
                ) : c?.ready ? (
                  <span className="shrink-0 text-[11px] text-muted-foreground">{c.ready}</span>
                ) : null}
              </Link>
            );
          })}

          <Link
            href="/channels"
            className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Radio className="h-4 w-4" />
            Gerenciar canais
          </Link>
        </nav>
        <div className="space-y-1 border-t border-border/60 p-2">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
              pathname === "/settings"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
          {hasUser ? (
            <form action={signOut}>
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="w-full justify-start gap-2 text-muted-foreground"
              >
                Sair
              </Button>
            </form>
          ) : null}
        </div>
      </aside>

      {/* Barra superior compacta (telas pequenas) */}
      <div className="flex flex-col border-b border-border/60 md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Clapperboard className="h-5 w-5 text-amber-400" />
            <span className="text-sm">Central Dark</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            {hasUser ? (
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Sair
                </Button>
              </form>
            ) : null}
          </div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2">
          <Link
            href="/"
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
              pathname === "/"
                ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                : "border-border text-muted-foreground",
            )}
          >
            Visão geral{totalAwaiting > 0 ? ` (${totalAwaiting})` : ""}
          </Link>
          {channels.map((channel) => {
            const active = pathname === `/canais/${channel.id}`;
            const c = counts[channel.id];
            return (
              <Link
                key={channel.id}
                href={`/canais/${channel.id}`}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                  active
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                    : "border-border text-muted-foreground",
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", statusDotClass(channel, c))}
                />
                {channel.name}
                {c?.awaitingApproval ? ` (${c.awaitingApproval})` : ""}
              </Link>
            );
          })}
          <Link
            href="/channels"
            className="shrink-0 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground"
          >
            + canais
          </Link>
        </div>
      </div>
    </>
  );
}
