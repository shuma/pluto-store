import "server-only";
import sharp from "sharp";
import { adminDb, check } from "@/lib/supabase/admin";
import { put } from "@/lib/storage";

// Rough drafts the image model streams while it draws, kept only for as long
// as their round runs so the results page can show each artwork taking shape.
// Each draft gets its own path (slot and draft number), so a signed URL never
// points at an image that later changed, and the newest per slot is simply
// the highest number. They hold a customer's likeness, so the round removes
// them when it ends rather than leaving them for retention.
const BUCKET = "generated-artworks";
const folder = (sessionId: string, roundId: string) =>
  `${sessionId}/drafts/${roundId}`;

// Whether a draft shows anything yet. The model's first drafts can be a bare,
// mostly see-through or single-colour canvas; shown, it would replace the
// customer's photo in the frame with an empty box for most of the wait.
export async function hasPicture(image: Uint8Array) {
  const { channels, isOpaque } = await sharp(image).stats();
  const alpha = channels[3];
  if (!isOpaque && alpha && alpha.mean < 200) return false;
  return Math.max(...channels.slice(0, 3).map((c) => c.stdev)) >= 6;
}

export async function saveDraft(
  sessionId: string,
  roundId: string,
  slot: number,
  index: number,
  image: Uint8Array,
) {
  if (!(await hasPicture(image))) return;
  // A full-size PNG would take longer to move than the draft is on screen.
  // Any see-through edge is laid on white, as the print will be.
  const small = await sharp(image)
    .flatten({ background: "#ffffff" })
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 70 })
    .toBuffer();
  await put(
    BUCKET,
    `${folder(sessionId, roundId)}/${slot}-${index}.webp`,
    small,
    "image/webp",
  );
}

// The newest draft of each slot, as storage paths with their draft number.
export async function latestDrafts(sessionId: string, roundId: string) {
  const { data, error } = await adminDb()
    .storage.from(BUCKET)
    .list(folder(sessionId, roundId), { limit: 100 });
  check(error);
  const latest = new Map<number, { path: string; index: number }>();
  for (const file of data ?? []) {
    const match = /^(\d+)-(\d+)\.webp$/.exec(file.name);
    if (!match) continue;
    const slot = Number(match[1]),
      index = Number(match[2]);
    if ((latest.get(slot)?.index ?? -1) < index)
      latest.set(slot, {
        path: `${folder(sessionId, roundId)}/${file.name}`,
        index,
      });
  }
  return latest;
}

export async function clearDrafts(sessionId: string, roundId: string) {
  const db = adminDb().storage.from(BUCKET);
  const { data, error } = await db.list(folder(sessionId, roundId), {
    limit: 100,
  });
  check(error);
  if (data?.length)
    check(
      (
        await db.remove(
          data.map((f) => `${folder(sessionId, roundId)}/${f.name}`),
        )
      ).error,
    );
}
