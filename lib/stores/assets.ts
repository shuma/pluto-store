import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/http";
import sharp from "sharp";
import { displayCopy, download, put, verifyImage } from "@/lib/storage";
import { addPreviewCard, setCardSample } from "@/lib/stores/style-preview";
import { imageMime, MAX_UPLOAD_BYTES } from "@/lib/validation/schemas";
import { MAX_EXAMPLES } from "@/lib/domain";
const kindSchema = z.enum(["avatar", "hero", "reference", "example", "sample"]);
// A preview sample is usually a real photo of a person, so it stays in the
// private bucket beside the references rather than the public asset one.
const privateKinds = new Set<z.infer<typeof kindSchema>>([
  "reference",
  "sample",
]);
export async function assetUpload(input: unknown) {
  const store = await ownedStore();
  if (!store) throw new HttpError(400, "Save your store first.");
  const v = z
    .object({
      kind: kindSchema,
      mimeType: imageMime,
      size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
    })
    .parse(input);
  const path = `${store.id}/${v.kind}/${randomUUID()}`;
  const bucket = privateKinds.has(v.kind)
    ? "creator-reference-images"
    : "creator-assets";
  const { data, error } = await adminDb()
    .storage.from(bucket)
    .createSignedUploadUrl(path, { upsert: false });
  check(error);
  return { path, bucket, uploadToken: data!.token };
}
// Artwork exported from drawing apps often arrives letterboxed inside a uniform
// background, which then shows as padding wherever the image is displayed edge
// to edge. Trim that border off the artwork kinds; sharp's trim is a no-op when
// there is no uniform border, and a result that loses almost everything is
// treated as a bad detection and discarded.
async function trimPadding(
  bytes: Uint8Array,
  kind: z.infer<typeof kindSchema>,
) {
  if (kind !== "reference" && kind !== "example") return bytes;
  try {
    const source = sharp(bytes);
    const { width = 0, height = 0 } = await source.metadata();
    const { data, info } = await sharp(bytes)
      .trim({ threshold: 12 })
      .jpeg({ quality: 95 })
      .toBuffer({ resolveWithObject: true });
    const kept = (info.width * info.height) / Math.max(width * height, 1);
    return kept > 0.02 && kept < 0.999 ? data : bytes;
  } catch {
    return bytes;
  }
}
export async function finishAsset(input: unknown) {
  const store = await ownedStore();
  if (!store) throw new HttpError(400, "Save your store first.");
  const { path, kind, previewId, sourcePath } = z
    .object({
      path: z.string(),
      kind: kindSchema,
      previewId: z.uuid().optional(),
      // An example's original photo, uploaded beside its artwork.
      sourcePath: z.string().optional(),
    })
    .parse(input);
  const owned = (p: string) =>
    new RegExp(`^${store.id}/${kind}/[a-f0-9-]{36}$`).test(p);
  if (!owned(path) || (sourcePath !== undefined && !owned(sourcePath)))
    throw new HttpError(403, "Invalid asset.");
  if (kind === "example" && !sourcePath)
    throw new HttpError(400, "Add the original photo too.");
  const bucket = privateKinds.has(kind)
      ? "creator-reference-images"
      : "creator-assets",
    db = adminDb();
  const verified = await trimPadding(
    await verifyImage(await download(bucket, path)),
    kind,
  );
  // Examples are shown to every storefront visitor, so they are kept at a
  // display size rather than as the full-size original.
  const bytes = kind === "example" ? await displayCopy(verified) : verified;
  const normalized = `${path}.jpg`;
  await put(bucket, normalized, bytes, "image/jpeg");
  let created: string | undefined;
  if (kind === "reference") {
    const { count, error: countError } = await db
      .from("creator_reference_images")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", store.id);
    check(countError);
    if ((count ?? 0) >= 8)
      throw new HttpError(400, "Use up to 8 reference images.");
    // Recorded so the canvas can lay the card out at its true shape on the
    // first paint instead of measuring the image in the browser.
    const { width, height } = await sharp(bytes).metadata();
    check(
      (
        await db.from("creator_reference_images").insert({
          creator_id: store.id,
          storage_path: normalized,
          sort_order: count ?? 0,
          width_px: width ?? null,
          height_px: height ?? null,
        })
      ).error,
    );
  } else if (kind === "sample") {
    // With a card, the sample replaces that card's; without one, it starts a
    // new card, and the caller gets its id to run it straight away.
    try {
      if (previewId) await setCardSample(store.id, previewId, normalized);
      else created = await addPreviewCard(store.id, normalized);
    } catch (error) {
      await db.storage.from(bucket).remove([normalized, path]);
      throw error;
    }
  } else if (kind === "example" && sourcePath) {
    const { count, error: countError } = await db
      .from("creator_examples")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", store.id);
    check(countError);
    if ((count ?? 0) >= MAX_EXAMPLES)
      throw new HttpError(400, `Show up to ${MAX_EXAMPLES} examples.`);
    // The photo is shown as it was taken, so it is verified but not trimmed.
    const source = `${sourcePath}.jpg`;
    await put(
      bucket,
      source,
      await displayCopy(await verifyImage(await download(bucket, sourcePath))),
      "image/jpeg",
    );
    const publicUrl = (p: string) =>
      db.storage.from(bucket).getPublicUrl(p).data.publicUrl;
    check(
      (
        await db.from("creator_examples").insert({
          creator_id: store.id,
          image_url: publicUrl(normalized),
          source_url: publicUrl(source),
          sort_order: count ?? 0,
        })
      ).error,
    );
    check((await db.storage.from(bucket).remove([sourcePath])).error);
  } else {
    const { data } = db.storage.from(bucket).getPublicUrl(normalized);
    check(
      (
        await db
          .from("creators")
          .update({ [`${kind}_url`]: data.publicUrl })
          .eq("id", store.id)
      ).error,
    );
  }
  check((await db.storage.from(bucket).remove([path])).error);
  return { ok: true, previewId: created };
}
