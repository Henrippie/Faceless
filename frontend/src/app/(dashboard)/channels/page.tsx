import { createClient } from "@/lib/supabase/server";
import { ChannelCard } from "@/components/channel-card";
import { ChannelFormDialog } from "@/components/channel-form-dialog";
import { Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("channels")
    .select("*")
    .order("created_at", { ascending: true });

  const count = channels?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">Canais</h1>
          <p className="text-sm text-muted-foreground">
            {count}/100 canais criados
          </p>
        </div>
        <ChannelFormDialog disabled={count >= 100} channelCount={count} />
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 py-16 text-center text-muted-foreground">
          <Radio className="h-6 w-6" />
          <p className="text-sm">
            Nenhum canal ainda. Crie o primeiro — sugestão: Histórias Bíblicas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels!.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}
