import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedVideoUrl } from "@/lib/storage";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { GenerateVideoDialog } from "@/components/generate-video-dialog";
import { VideoGallery } from "@/components/video-gallery";
import { VideoCard } from "@/components/video-card";
import { Button } from "@/components/ui/button";
import { placeholderStreamImages } from "@/lib/placeholder-gradients";
import type { VideoWithChannel } from "@/lib/types";
import { CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: channels }, { data: videos }] = await Promise.all([
    supabase
      .from("channels")
      .select("id, name, slug, niche, status")
      .order("created_at", { ascending: true }),
    supabase
      .from("videos")
      .select("*, channel:channels(id, name, slug, niche, publish_platforms)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const videosWithUrls: VideoWithChannel[] = await Promise.all(
    (videos ?? []).map(async (video) => ({
      ...video,
      verticalUrl: await getSignedVideoUrl(video.vertical_path),
      horizontalUrl: await getSignedVideoUrl(video.horizontal_path),
      thumbnailUrl: await getSignedVideoUrl(video.thumbnail_path),
      subtitleUrl: await getSignedVideoUrl(video.subtitle_path),
    })),
  );

  const heroImages = videosWithUrls
    .map((v) => v.thumbnailUrl)
    .filter((src): src is string => Boolean(src));
  // O corredor repete a lista pra preencher os trilhos, então até 1 thumbnail
  // real já dá pra usar em vez do placeholder — sem precisar de um mínimo.
  const images =
    heroImages.length > 0
      ? heroImages.slice(0, 12).map((src) => ({ src, alt: "" }))
      : placeholderStreamImages();

  const activeChannels = (channels ?? []).filter((c) => c.status === "active");
  const readyCount = videosWithUrls.filter((v) => v.status === "ready").length;
  const generatingCount = videosWithUrls.filter(
    (v) => v.status === "queued" || v.status === "generating" || v.status === "script_ready",
  ).length;
  const awaitingApproval = videosWithUrls.filter(
    (v) => v.status === "ready" && !v.approved_at,
  );

  return (
    <div className="space-y-8">
      <ImageStreamHero
        images={images}
        className="h-[280px] w-full rounded-xl border border-border/60 sm:h-[340px]"
      >
        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Sua mesa de canais dark
          </h1>
          <p className="max-w-md text-balance text-sm text-muted-foreground">
            {activeChannels.length} canal{activeChannels.length === 1 ? "" : "is"} ativo
            {activeChannels.length === 1 ? "" : "s"} · {readyCount} vídeo
            {readyCount === 1 ? "" : "s"} pronto{readyCount === 1 ? "" : "s"}
            {generatingCount > 0 ? ` · ${generatingCount} em produção` : ""}
          </p>
        </div>
      </ImageStreamHero>

      {awaitingApproval.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-400" />
            <h2 className="text-lg font-medium">
              Precisa de aprovação ({awaitingApproval.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {awaitingApproval.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Todos os vídeos</h2>
        {channels && channels.length > 0 ? (
          <GenerateVideoDialog channels={activeChannels} />
        ) : (
          <Link href="/channels">
            <Button>Criar seu primeiro canal</Button>
          </Link>
        )}
      </div>

      <VideoGallery videos={videosWithUrls} channels={channels ?? []} />
    </div>
  );
}
