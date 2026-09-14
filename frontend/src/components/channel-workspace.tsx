"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoTopicForm } from "@/components/video-topic-form";
import { VideoCard } from "@/components/video-card";
import { ChannelSettingsForm } from "@/components/channel-settings-form";
import { Film } from "lucide-react";
import type { Channel, VideoWithChannel } from "@/lib/types";

export function ChannelWorkspace({
  channel,
  videos,
  bgMusicUrl,
}: {
  channel: Channel;
  videos: VideoWithChannel[];
  bgMusicUrl: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-medium">{channel.name}</h1>
        <Badge
          variant={channel.status === "active" ? "default" : "secondary"}
          className={channel.status === "active" ? "bg-emerald-500/15 text-emerald-400" : ""}
        >
          {channel.status === "active" ? "Ativo" : "Pausado"}
        </Badge>
        {channel.niche ? (
          <span className="text-sm text-muted-foreground">{channel.niche}</span>
        ) : null}
      </div>

      <Tabs defaultValue="videos">
        <TabsList>
          <TabsTrigger value="videos">Vídeos ({videos.length})</TabsTrigger>
          <TabsTrigger value="new">Novo vídeo</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="pt-4">
          {videos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-16 text-center text-muted-foreground">
              <Film className="h-6 w-6" />
              <p className="text-sm">Nenhum vídeo neste canal ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new" className="pt-4">
          <div className="max-w-xl">
            <VideoTopicForm
              channels={[{ id: channel.id, name: channel.name }]}
              fixedChannelId={channel.id}
            />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <ChannelSettingsForm channel={channel} bgMusicUrl={bgMusicUrl} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
