import "server-only";
import sharp from "sharp";
import { adminDb, check } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/http";
import { MAX_UPLOAD_BYTES } from "@/lib/validation/schemas";
import { required } from "@/lib/config";
// Resized by Supabase's image transformation on the way out; the stored file
// is untouched.
export type Transform = { width: number; height: number };
export async function signedUrl(
  bucket: string,
  path: string,
  seconds = 900,
  transform?: Transform,
) {
  const { data, error } = await adminDb()
    .storage.from(bucket)
    .createSignedUrl(
      path,
      seconds,
      transform && { transform: { ...transform, resize: "contain" } },
    );
  check(error);
  if (!data) throw new Error("Signing failed");
  return data.signedUrl;
}
// Every call to createSignedUrl mints a new token, so re-rendering a page hands
// the browser a new URL for an image it already holds and the download starts
// again from scratch. Handing back one URL for part of its life is what lets
// the browser cache do its job. The map is per server instance and holds only
// short-lived URLs: a miss costs one extra signature, never correctness.
const DISPLAY_TTL = 900;
const REUSE_FOR = 600;
const signed = new Map<string, { url: string; until: number }>();
export async function cachedSignedUrl(
  bucket: string,
  path: string,
  transform?: Transform,
) {
  const key = `${bucket}/${path}${transform ? `@${transform.width}x${transform.height}` : ""}`;
  const now = Date.now();
  const hit = signed.get(key);
  if (hit && hit.until > now) return hit.url;
  const url = await signedUrl(bucket, path, DISPLAY_TTL, transform);
  // Evict on write rather than on a timer, and give up on the whole map if a
  // burst of distinct paths outgrows it.
  for (const [k, v] of signed) if (v.until <= now) signed.delete(k);
  if (signed.size > 500) signed.clear();
  // Kept well inside DISPLAY_TTL so a URL handed out at the last moment still
  // has five minutes of life on it.
  signed.set(key, { url, until: now + REUSE_FOR * 1000 });
  return url;
}
// The same resize for a public bucket URL, which needs no signature: Supabase
// serves it from the render endpoint instead. Any other URL comes back as is.
export function resizedPublicUrl(url: string, { width, height }: Transform) {
  const object = `${required("NEXT_PUBLIC_SUPABASE_URL")}/storage/v1/object/public/`;
  if (!url.startsWith(object)) return url;
  const resized = new URL(
    url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/"),
  );
  resized.searchParams.set("width", String(width));
  resized.searchParams.set("height", String(height));
  resized.searchParams.set("resize", "contain");
  return resized.toString();
}
export async function download(bucket: string, path: string) {
  const { data, error } = await adminDb().storage.from(bucket).download(path);
  check(error);
  if (!data) throw new Error("Image missing");
  return Buffer.from(await data.arrayBuffer());
}
export async function put(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  mimeType: string,
) {
  const { error } = await adminDb()
    .storage.from(bucket)
    .upload(path, bytes, { contentType: mimeType, upsert: false });
  check(error);
}
export async function verifyImage(bytes: Uint8Array) {
  if (bytes.length > MAX_UPLOAD_BYTES)
    throw new HttpError(400, "Choose a photo smaller than 10 MB.");
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const meta = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
    !meta.width ||
    !meta.height ||
    (meta.pages ?? 1) > 1
  )
    throw new HttpError(400, "Choose a JPEG, PNG or WebP photo.");
  if (meta.width < 256 || meta.height < 256)
    throw new HttpError(
      400,
      "Choose a photo at least 256 pixels on each side.",
    );
  return image.rotate().jpeg({ quality: 95 }).toBuffer();
}

// A copy of a photo small enough to show anywhere: at most 1600 px on its
// long side. iOS Safari won't draw an image of more than about 16.7 million
// pixels onto a canvas, and today's phones take photos well above that.
export async function displayCopy(bytes: Uint8Array) {
  return sharp(bytes, { limitInputPixels: 60_000_000 })
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
}
