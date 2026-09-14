import { createClient } from "@/lib/supabase/server";

const VIDEOS_BUCKET = "videos";
const DEFAULT_EXPIRES_IN = 60 * 60; // 1 hora

export async function getSignedVideoUrl(
  path: string | null,
  expiresIn = DEFAULT_EXPIRES_IN,
) {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(VIDEOS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
