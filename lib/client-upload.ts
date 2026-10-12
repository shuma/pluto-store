import { browserDb } from "@/lib/supabase/client";
import { imageMime, MAX_UPLOAD_BYTES } from "@/lib/validation/schemas";
import { post } from "@/lib/client-api";
export type AssetKind = "avatar" | "hero" | "reference" | "example" | "sample";
// The two-step creator upload: ask the server for a scoped signed URL, put the
// file straight into storage, then let the server verify and record it. Shared
// by the asset panel and the reference canvas so they cannot drift.
export async function uploadCreatorAsset(
  kind: AssetKind,
  file: File,
  // Which style preview card a sample belongs to; none starts a new card.
  previewId?: string,
): Promise<{ previewId?: string }> {
  if (!imageMime.safeParse(file.type).success || file.size > MAX_UPLOAD_BYTES)
    throw new Error("Choose a JPEG, PNG or WebP smaller than 10 MB.");
  const upload = await post<{
    path: string;
    bucket: string;
    uploadToken: string;
  }>("/api/creator/assets", { kind, mimeType: file.type, size: file.size });
  const { error } = await browserDb()
    .storage.from(upload.bucket)
    .uploadToSignedUrl(upload.path, upload.uploadToken, file);
  if (error) throw new Error("Upload failed.");
  const response = await fetch("/api/creator/assets", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: upload.path, kind, previewId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
}
