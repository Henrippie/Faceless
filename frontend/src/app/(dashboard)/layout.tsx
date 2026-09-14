import { createClient } from "@/lib/supabase/server";
import { ChannelSidebar, type ChannelCounts } from "@/components/channel-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: channels },
    { data: videos },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("channels")
      .select("id, name, status")
      .order("created_at", { ascending: true }),
    supabase.from("videos").select("channel_id, status, approved_at"),
  ]);

  const counts: Record<string, ChannelCounts> = {};
  for (const video of videos ?? []) {
    const current = counts[video.channel_id] ?? {
      ready: 0,
      awaitingApproval: 0,
      inProgress: 0,
      failed: 0,
    };
    if (video.status === "ready") {
      current.ready += 1;
      if (!video.approved_at) current.awaitingApproval += 1;
    } else if (video.status === "failed") {
      current.failed += 1;
    } else {
      current.inProgress += 1;
    }
    counts[video.channel_id] = current;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <ChannelSidebar
        channels={channels ?? []}
        counts={counts}
        hasUser={Boolean(user)}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
