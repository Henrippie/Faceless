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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Smartphone,
  MonitorPlay,
} from "lucide-react";
import {
  approveScript,
  approveVideo,
  deleteVideo,
  togglePublishedFlag,
  updateVideoTitle,
} from "@/app/actions";
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
  script_ready: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  ready: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
};

function ScriptReviewPanel({ video }: { video: VideoWithChannel }) {
  const [script, setScript] = useState(video.script ?? "");
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      try {
        await approveScript(video.id, script);
        toast.success("Roteiro aprovado — gerando imagem e áudio agora.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível aprovar.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={6}
        value={script}
        onChange={(e) => setScript(e.target.value)}
        className="text-xs"
      />
      <Button size="sm" className="gap-1.5" onClick={handleApprove} disabled={isPending}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {isPending ? "Aprovando..." : "Aprovar e gerar vídeo"}
      </Button>
    </div>
  );
}

function ApproveVideoDialog({ video }: { video: VideoWithChannel }) {
  const [open, setOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const platforms = video.channel?.publish_platforms ?? [];

  function handleConfirm() {
    startTransition(async () => {
      try {
        const iso = scheduledAt ? new Date(scheduledAt).toISOString() : null;
        await approveVideo(video.id, iso);
        toast.success(
          platforms.length > 0
            ? scheduledAt
              ? "Vídeo aprovado — publicação agendada."
              : "Vídeo aprovado e na fila de publicação."
            : "Vídeo aprovado.",
        );
        setOpen(false);
      } catch {
        toast.error("Não foi possível aprovar o vídeo.");
      } finally {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aprovar e publicar
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aprovar vídeo</DialogTitle>
          <DialogDescription>
            {platforms.length > 0
              ? `Vai publicar em: ${platforms.join(", ")} (configurado no canal).`
              : "Este canal não tem plataforma de publicação configurada — só fica marcado como aprovado."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor={`schedule-${video.id}`}>Agendar para (opcional)</Label>
          <Input
            id={`schedule-${video.id}`}
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Deixe em branco pra publicar assim que o worker pegar a fila.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Confirmando..." : "Confirmar aprovação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VideoCard({ video }: { video: VideoWithChannel }) {
  const [isPending, startTransition] = useTransition();
  const [published, setPublished] = useState(
    (video.published as Record<string, boolean>) ?? {},
  );
  const [format, setFormat] = useState<"vertical" | "horizontal">(
    video.verticalUrl ? "vertical" : "horizontal",
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(video.title || video.subject);
  const [isSavingTitle, startSavingTitle] = useTransition();

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

  function handleSaveTitle() {
    startSavingTitle(async () => {
      try {
        await updateVideoTitle(video.id, title);
        setEditingTitle(false);
      } catch {
        toast.error("Não foi possível salvar o título.");
      }
    });
  }

  const activeUrl = format === "vertical" ? video.verticalUrl : video.horizontalUrl;
  const hasBothFormats = Boolean(video.verticalUrl && video.horizontalUrl);

  return (
    <Card className="overflow-hidden border-border/60 py-0 gap-0">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {video.status === "ready" && activeUrl ? (
          <video
            key={activeUrl}
            src={activeUrl}
            poster={video.thumbnailUrl ?? undefined}
            controls
            className="h-full w-full object-contain bg-black"
          />
        ) : video.thumbnailUrl ? (
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
        {hasBothFormats ? (
          <div className="absolute right-2 top-2 flex overflow-hidden rounded-full border border-border/60 bg-background/80 backdrop-blur">
            <button
              type="button"
              onClick={() => setFormat("vertical")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-[11px]",
                format === "vertical"
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-muted-foreground",
              )}
            >
              <Smartphone className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setFormat("horizontal")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 text-[11px]",
                format === "horizontal"
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-muted-foreground",
              )}
            >
              <MonitorPlay className="h-3 w-3" />
            </button>
          </div>
        ) : null}
      </div>

      <CardHeader className="gap-1 pt-4">
        {editingTitle ? (
          <div className="flex items-center gap-1.5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-7 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSaveTitle}
              disabled={isSavingTitle}
            >
              OK
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="group flex items-start gap-1.5 text-left"
          >
            <p className="line-clamp-2 text-sm font-medium leading-snug">
              {title}
            </p>
            <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
          </button>
        )}
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

        {video.status === "script_ready" ? <ScriptReviewPanel video={video} /> : null}

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
            {video.subtitleUrl ? (
              <a href={video.subtitleUrl} download target="_blank" rel="noreferrer">
                <Button size="sm" variant="ghost" className="gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  .srt
                </Button>
              </a>
            ) : null}
          </div>
        ) : null}

        {video.status === "ready" ? (
          <div className="flex items-center gap-2">
            {!video.approved_at ? (
              <ApproveVideoDialog video={video} />
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
                {video.scheduled_at && video.publish_state === "queued"
                  ? ` (${new Date(video.scheduled_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })})`
                  : ""}
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
