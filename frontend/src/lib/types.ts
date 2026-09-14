import type { Tables } from "@/lib/database.types";

export type Channel = Tables<"channels">;
export type Video = Tables<"videos">;

export type VideoWithChannel = Video & {
  channel: Pick<Channel, "id" | "name" | "slug" | "niche"> | null;
  verticalUrl: string | null;
  horizontalUrl: string | null;
  thumbnailUrl: string | null;
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
  ready: "Pronto",
  failed: "Falhou",
};
