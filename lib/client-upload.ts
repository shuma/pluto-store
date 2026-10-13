import { browserDb } from "@/lib/supabase/client";
import { imageMime, MAX_UPLOAD_BYTES } from "@/lib/validation/schemas";
import { post, send } from "@/lib/client-api";
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
  const path = await store(kind, file);
  return send("PATCH", "/api/creator/assets", { path, kind, previewId });
}
// A storefront example is two files recorded together: the original photo and
// the artwork made from it.
export async function uploadExamplePair(photo: File, artwork: File) {
  const [sourcePath, path] = await Promise.all([
    store("example", photo),
    store("example", artwork),
  ]);
  await send("PATCH", "/api/creator/assets", {
    path,
    sourcePath,
    kind: "example",
  });
}
// The first step: the file in storage, not yet verified or recorded.
async function store(kind: AssetKind, file: File) {
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
  return upload.path;
}
