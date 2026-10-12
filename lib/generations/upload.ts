import "server-only";
import { randomUUID } from "node:crypto";
import { adminDb, check } from "@/lib/supabase/admin";
import { getStore } from "@/lib/stores/get-store";
import { uploadSchema } from "@/lib/validation/schemas";
import { customerSecret, requireSession, rateLimit } from "./session";
import { HttpError } from "@/lib/http";
import { config } from "@/lib/config";
import { displayCopy, download, put, verifyImage } from "@/lib/storage";
import { track } from "@/lib/analytics";
export async function startUpload(input: unknown) {
  const values = uploadSchema.parse(input);
  await rateLimit("upload", Number(process.env.UPLOADS_PER_HOUR ?? 5), 3600);
  const store = await getStore(values.storeSlug);
  if (!store) throw new HttpError(404, "This store is unavailable.");
  const id = randomUUID(),
    token = await customerSecret(true),
    path = `${id}/source`;
  const db = adminDb();
  const { error } = await db.from("generation_sessions").insert({
    id,
    creator_id: store.id,
    session_token: token,
    source_image_path: path,
    source_delete_after: new Date(
      Date.now() + config().retentionDays * 86400000,
    ).toISOString(),
  });
  check(error);
  const { data, error: uploadError } = await db.storage
    .from("customer-uploads")
    .createSignedUploadUrl(path, { upsert: false });
  check(uploadError);
  track("upload_started", { creator_id: store.id });
  return { sessionId: id, path, uploadToken: data!.token };
}
// The customer's photo at a size to show while their artwork is made, beside
// the full-size one the artwork is made from.
export const displayPhotoPath = (sessionId: string) =>
  `${sessionId}/display.jpg`;
export async function completeUpload(sessionId: string) {
  const session = await requireSession(sessionId);
  if (session.status !== "uploading") return { sessionId };
  const normalized = await verifyImage(
    await download("customer-uploads", session.source_image_path),
  );
  const path = `${session.id}/verified-${randomUUID()}.jpg`;
  await put("customer-uploads", path, normalized, "image/jpeg");
  // Replaced if two completions race: both are the same photo.
  check(
    (
      await adminDb()
        .storage.from("customer-uploads")
        .upload(displayPhotoPath(session.id), await displayCopy(normalized), {
          contentType: "image/jpeg",
          upsert: true,
        })
    ).error,
  );
  const { data, error } = await adminDb()
    .from("generation_sessions")
    .update({ source_image_path: path, status: "ready" })
    .eq("id", sessionId)
    .eq("status", "uploading")
    .select("id");
  check(error);
  if (data?.length) {
    await adminDb()
      .storage.from("customer-uploads")
      .remove([session.source_image_path]);
    track("upload_completed", { session_id: sessionId });
  } else {
    await adminDb().storage.from("customer-uploads").remove([path]);
  }
  return { sessionId };
}
