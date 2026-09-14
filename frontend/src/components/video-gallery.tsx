"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoCard } from "@/components/video-card";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS, type Channel, type VideoWithChannel } from "@/lib/types";
import { Film } from "lucide-react";

export function VideoGallery({
  videos,
  channels,
}: {
  videos: VideoWithChannel[];
  channels: Pick<Channel, "id" | "name">[];
}) {
  const router = useRouter();
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Mantém a "mesa" viva: qualquer mudança nos vídeos do usuário (worker
  // atualizando status, gerando um novo, etc.) re-busca os dados do servidor.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("videos-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "videos" },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filtered = useMemo(() => {
    return videos.filter((video) => {
      if (channelFilter !== "all" && video.channel_id !== channelFilter) {
        return false;
      }
      if (statusFilter !== "all" && video.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [videos, channelFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={channelFilter}
          onValueChange={(value) => setChannelFilter(value ?? "all")}
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Canal">
              {(value: string) =>
                value === "all"
                  ? "Todos os canais"
                  : (channels.find((c) => c.id === value)?.name ?? "Canal")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {channels.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value ?? "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status">
              {(value: string) =>
                value === "all" ? "Todos os status" : (STATUS_LABELS[value] ?? value)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">
          {filtered.length} vídeo{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-16 text-center text-muted-foreground">
          <Film className="h-6 w-6" />
          <p className="text-sm">Nenhum vídeo por aqui ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
