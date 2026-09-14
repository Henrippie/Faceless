import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSignedVideoUrl } from "@/lib/storage";
import { ChannelWorkspace } from "@/components/channel-workspace";
import type { VideoWithChannel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ChannelWorkspacePage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  const supabase = await createClient();

  const [{ data: channel }, { data: videos }] = await Promise.all([
    supabase.from("channels").select("*").eq("id", channelId).maybeSingle(),
    supabase
      .from("videos")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false }),
  ]);

  if (!channel) notFound();

  const videosWithUrls: VideoWithChannel[] = await Promise.all(
    (videos ?? []).map(async (video) => ({
      ...video,
      channel: {
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        niche: channel.niche,
        publish_platforms: channel.publish_platforms,
      },
      verticalUrl: await getSignedVideoUrl(video.vertical_path),
      horizontalUrl: await getSignedVideoUrl(video.horizontal_path),
      thumbnailUrl: await getSignedVideoUrl(video.thumbnail_path),
      subtitleUrl: await getSignedVideoUrl(video.subtitle_path),
    })),
  );

  const bgMusicUrl = channel.bg_music_path
    ? await getSignedVideoUrl(channel.bg_music_path)
    : null;

  return (
    <ChannelWorkspace channel={channel} videos={videosWithUrls} bgMusicUrl={bgMusicUrl} />
  );
}
