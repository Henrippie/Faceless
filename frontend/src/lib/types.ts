import type { Tables } from "@/lib/database.types";

export type Channel = Tables<"channels">;
export type Video = Tables<"videos">;

export type VideoWithChannel = Video & {
  channel: Pick<Channel, "id" | "name" | "slug" | "niche" | "publish_platforms"> | null;
  verticalUrl: string | null;
  horizontalUrl: string | null;
  thumbnailUrl: string | null;
  subtitleUrl: string | null;
};

export const PUBLISH_PLATFORMS = [
  { key: "youtube", label: "YouTube" },
  { key: "tiktok", label: "TikTok" },
  { key: "instagram", label: "Instagram" },
  { key: "kwai", label: "Kwai" },
] as const;

export const STATUS_LABELS: Record<string, string> = {
  queued: "Na fila",
  generating: "Gerando",
  script_ready: "Roteiro p/ revisão",
  ready: "Pronto",
  failed: "Falhou",
};

export const PUBLISH_STATE_LABELS: Record<string, string> = {
  idle: "Não aprovado",
  queued: "Publicação na fila",
  publishing: "Publicando",
  done: "Publicado",
  failed: "Falha ao publicar",
};
