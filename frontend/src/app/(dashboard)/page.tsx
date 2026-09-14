import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSignedVideoUrl } from "@/lib/storage";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { GenerateVideoDialog } from "@/components/generate-video-dialog";
import { VideoGallery } from "@/components/video-gallery";
import { Button } from "@/components/ui/button";
import { placeholderStreamImages } from "@/lib/placeholder-gradients";
import type { VideoWithChannel } from "@/lib/types";

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
      .select("*, channel:channels(id, name, slug, niche)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const videosWithUrls: VideoWithChannel[] = await Promise.all(
    (videos ?? []).map(async (video) => ({
      ...video,
      verticalUrl: await getSignedVideoUrl(video.vertical_path),
      horizontalUrl: await getSignedVideoUrl(video.horizontal_path),
      thumbnailUrl: await getSignedVideoUrl(video.thumbnail_path),
    })),
  );

  const heroImages = videosWithUrls
    .map((v) => v.thumbnailUrl)
    .filter((src): src is string => Boolean(src));
  const images =
    heroImages.length >= 4
      ? heroImages.slice(0, 12).map((src) => ({ src, alt: "" }))
      : placeholderStreamImages();

  const activeChannels = (channels ?? []).filter((c) => c.status === "active");
  const readyCount = videosWithUrls.filter((v) => v.status === "ready").length;
  const generatingCount = videosWithUrls.filter(
    (v) => v.status === "queued" || v.status === "generating",
  ).length;

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">Vídeos gerados</h2>
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
