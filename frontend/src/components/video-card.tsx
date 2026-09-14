"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  MoreVertical,
  Trash2,
  Smartphone,
  MonitorPlay,
} from "lucide-react";
import { approveVideo, deleteVideo, togglePublishedFlag } from "@/app/actions";
import {
  PUBLISH_PLATFORMS,
  PUBLISH_STATE_LABELS,
  STATUS_LABELS,
  type VideoWithChannel,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-secondary text-secondary-foreground",
  generating: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ready: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

export function VideoCard({ video }: { video: VideoWithChannel }) {
  const [isPending, startTransition] = useTransition();
  const [approving, setApproving] = useState(false);
  const [published, setPublished] = useState(
    (video.published as Record<string, boolean>) ?? {},
  );

  function handleApprove() {
    setApproving(true);
    startTransition(async () => {
      try {
        await approveVideo(video.id);
        toast.success(
          video.publish_state === "idle" ? "Vídeo aprovado." : "Vídeo aprovado e na fila de publicação.",
        );
      } catch {
        toast.error("Não foi possível aprovar o vídeo.");
      } finally {
        setApproving(false);
      }
    });
  }

  function handleTogglePublish(platform: string) {
    const next = !published[platform];
    setPublished((prev) => ({ ...prev, [platform]: next }));
    startTransition(async () => {
      try {
        await togglePublishedFlag(video.id, platform, next, published);
      } catch {
        setPublished((prev) => ({ ...prev, [platform]: !next }));
        toast.error("Não foi possível salvar a publicação.");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteVideo(video.id);
        toast.success("Vídeo removido.");
      } catch {
        toast.error("Não foi possível remover o vídeo.");
      }
    });
  }

  return (
    <Card className="overflow-hidden border-border/60 py-0 gap-0">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {video.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={video.subject}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-950/40 via-background to-background">
            {video.status === "generating" ? (
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            ) : (
              <MonitorPlay className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        )}
        <Badge
          className={cn(
            "absolute left-2 top-2 border",
            STATUS_STYLES[video.status],
          )}
        >
          {STATUS_LABELS[video.status] ?? video.status}
        </Badge>
      </div>

      <CardHeader className="gap-1 pt-4">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {video.subject}
        </p>
        {video.channel ? (
          <Badge variant="outline" className="w-fit text-xs font-normal">
            {video.channel.name}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-3 pb-4">
        {video.status === "failed" && video.error ? (
          <p className="line-clamp-2 text-xs text-destructive">
            {video.error}
          </p>
        ) : null}

        {video.status === "ready" ? (
          <div className="flex flex-wrap gap-2">
            {video.verticalUrl ? (
              <a href={video.verticalUrl} download target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary" className="gap-1.5">
                  <Smartphone className="h-3.5 w-3.5" />
                  Vertical
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </a>
            ) : null}
            {video.horizontalUrl ? (
              <a href={video.horizontalUrl} download target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary" className="gap-1.5">
                  <MonitorPlay className="h-3.5 w-3.5" />
                  Horizontal
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </a>
            ) : null}
          </div>
        ) : null}

        {video.status === "ready" ? (
          <div className="flex items-center gap-2">
            {!video.approved_at ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleApprove}
                disabled={isPending || approving}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {approving ? "Aprovando..." : "Aprovar e publicar"}
              </Button>
            ) : (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  video.publish_state === "done" &&
                    "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
                  video.publish_state === "failed" &&
                    "border-destructive/30 bg-destructive/15 text-destructive",
                  video.publish_state === "publishing" &&
                    "border-amber-500/30 bg-amber-500/15 text-amber-400",
                )}
              >
                {video.publish_state === "publishing" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                {PUBLISH_STATE_LABELS[video.publish_state] ?? video.publish_state}
              </Badge>
            )}
          </div>
        ) : null}

        {video.status === "ready" && video.publish_state === "failed" && video.publish_error ? (
          <p className="line-clamp-2 text-xs text-destructive">{video.publish_error}</p>
        ) : null}

        {video.status === "ready" &&
        video.publish_state === "done" &&
        video.publish_results &&
        typeof video.publish_results === "object" ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(video.publish_results as Record<string, { url?: string }>).map(
              ([platform, result]) =>
                result?.url ? (
                  <a
                    key={platform}
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline"
                  >
                    {platform} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null,
            )}
          </div>
        ) : null}

        {video.status === "ready" ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PUBLISH_PLATFORMS.map((platform) => (
              <button
                key={platform.key}
                type="button"
                disabled={isPending}
                onClick={() => handleTogglePublish(platform.key)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  published[platform.key]
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {published[platform.key] ? "✓ " : ""}
                {platform.label}
              </button>
            ))}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="justify-end border-t border-border/60 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}
