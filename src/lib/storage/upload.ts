import { createClient } from "@/lib/supabase/client";

const BUCKET = "app-images";

export type UploadResult = {
  path: string;
  url: string;
};

/**
 * Upload a (already compressed) image blob to Supabase Storage.
 * Used by every image feature in the app (logo, avatars, ...).
 *
 * @param blob       compressed image blob (webp)
 * @param folder     logical folder, e.g. "branding", "avatars"
 * @param oldPath    previous object path to delete (keeps storage clean)
 */
export async function uploadImage(
  blob: Blob,
  folder: string,
  oldPath?: string | null
): Promise<UploadResult> {
  const supabase = createClient();

  const ext = blob.type === "image/jpeg" ? "jpg" : "webp";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type,
  });
  if (error) throw error;

  // Best-effort cleanup of the previous image.
  if (oldPath) {
    await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function deleteImage(path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}
