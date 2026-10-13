import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { adminDb, check } from "@/lib/supabase/admin";
import { cachedSignedUrl, download, put, type Transform } from "@/lib/storage";
import { OpenAIImageTransformProvider } from "@/lib/ai/providers/openai";
import { logError } from "@/lib/logging";
import { recordUsage } from "@/lib/ai/usage";
import { HttpError } from "@/lib/http";
import type { StylePreview } from "@/lib/queries/style-preview";
import { MAX_EXAMPLES } from "@/lib/domain";
const BUCKET = "creator-reference-images";
const PUBLIC_BUCKET = "creator-assets";
const SAMPLE = "public/demo/sample-photo.svg";
const DEFAULT_SAMPLE_URL = "/demo/sample-photo.svg";
export const MAX_PREVIEW_CARDS = 4;
// A preview costs a real generation, so it gets its own daily budget.
export const previewBudgetKey = (creatorId: string) =>
  `style-preview:${creatorId}`;
export const previewsPerDay = () =>
  Number(process.env.STYLE_PREVIEWS_PER_DAY ?? 10);
export const PREVIEW_WINDOW_SECONDS = 86400;
// Read without consuming, so the panel can say what a click will cost before
// it is made. consume_rate_limit keeps counting past the limit on denied
// attempts, hence the floor at zero.
async function previewBudget(creatorId: string) {
  const { data, error } = await adminDb()
    .from("rate_limits")
    .select("count,reset_at")
    .eq("key", previewBudgetKey(creatorId))
    .maybeSingle();
  check(error);
  const limit = previewsPerDay();
  const live = data && Date.parse(data.reset_at) > Date.now();
  return {
    remaining: live ? Math.max(0, limit - data.count) : limit,
    limit,
    resetsAt: live ? data.reset_at : null,
  };
}
// A run that dies with the process would otherwise leave the card "running"
// forever, and nothing would ever let this creator try it again.
const STALE_RUN_MS = 15 * 60 * 1000;
const cardRow = z.object({
  id: z.uuid(),
  position: z.number(),
  sample_path: z.string().nullable(),
  storage_path: z.string().nullable(),
  signature: z.string().nullable(),
  status: z.enum(["idle", "running", "ready", "failed"]),
  // Defaulted so cards keep working before 202609250002 is applied.
  stage: z.enum(["queued", "generating", "refining"]).nullable().default(null),
  updated_at: z.string(),
});
export type CardRow = z.infer<typeof cardRow>;
const abandoned = (row: CardRow) =>
  row.status === "running" &&
  Date.now() - Date.parse(row.updated_at) > STALE_RUN_MS;
// The single definition of which references are sent and in what order, shared
// with runRound so a preview can never be built from a different set than the
// artwork a customer receives.
export async function activeReferences(creatorId: string) {
  const { data, error } = await adminDb()
    .from("creator_reference_images")
    .select("id,storage_path")
    .eq("creator_id", creatorId)
    .eq("active", true)
    .order("sort_order")
    .limit(8);
  check(error);
  return z
    .object({ id: z.uuid(), storage_path: z.string() })
    .array()
    .parse(data);
}
// The sample is part of what produced a preview, so swapping it makes the
// preview out of date just as rearranging the board does. The built-in sample
// adds nothing, which keeps signatures stored before uploads were possible.
export function boardSignature(
  references: { id: string }[],
  samplePath: string | null,
) {
  return createHash("sha256")
    .update(
      references.map((r) => r.id).join(",") +
        (samplePath ? `|${samplePath}` : ""),
    )
    .digest("hex");
}
// Every creator has at least the first card, on the built-in sample, so the
// panel always has something to run. The unique position makes the insert a
// no-op when a concurrent request got there first.
export async function previewCards(creatorId: string): Promise<CardRow[]> {
  const db = adminDb();
  const select = () =>
    db
      .from("creator_style_previews")
      .select("*")
      .eq("creator_id", creatorId)
      .order("position");
  let { data, error } = await select();
  check(error);
  if (!data?.length) {
    check(
      (
        await db
          .from("creator_style_previews")
          .upsert(
            { creator_id: creatorId, position: 0 },
            { onConflict: "creator_id,position", ignoreDuplicates: true },
          )
      ).error,
    );
    ({ data, error } = await select());
    check(error);
  }
  return cardRow.array().parse(data);
}
async function ownedCard(creatorId: string, id: string) {
  const card = (await previewCards(creatorId)).find((c) => c.id === id);
  if (!card) throw new HttpError(404, "That preview is gone.");
  return card;
}
// A page that only shows previews small can ask for them resized; the panel
// itself shows them large.
export async function readStylePreview(
  creatorId: string,
  transform?: Transform,
): Promise<StylePreview> {
  const [cards, references, budget, published] = await Promise.all([
    previewCards(creatorId),
    activeReferences(creatorId),
    previewBudget(creatorId),
    publishedPreviews(creatorId),
  ]);
  return {
    cards: await Promise.all(
      cards.map(async (row) => ({
        id: row.id,
        // Reported rather than written back: the client stops polling, and the
        // next run clears the row for real.
        status: abandoned(row) ? ("failed" as const) : row.status,
        stage: row.status === "running" && !abandoned(row) ? row.stage : null,
        url: row.storage_path
          ? await cachedSignedUrl(BUCKET, row.storage_path, transform)
          : null,
        sampleUrl: row.sample_path
          ? await cachedSignedUrl(BUCKET, row.sample_path)
          : null,
        // A card with no signature has never been run and is simply empty.
        stale:
          row.signature !== null &&
          row.signature !== boardSignature(references, row.sample_path),
        published: published.has(row.id),
      })),
    ),
    referenceCount: references.length,
    maxCards: MAX_PREVIEW_CARDS,
    budget,
  };
}
// Which previews already have a storefront example made from them.
async function publishedPreviews(creatorId: string) {
  const { data, error } = await adminDb()
    .from("creator_examples")
    .select("style_preview_id")
    .eq("creator_id", creatorId)
    .not("style_preview_id", "is", null);
  check(error);
  return new Set((data ?? []).map((r) => r.style_preview_id));
}
// Puts a finished preview on the storefront as a before/after example. The
// files are copied into the public bucket rather than linked, so re-running or
// removing the preview later never changes what customers see, and the private
// bucket stays private. The built-in sample is already public.
export async function publishPreview(creatorId: string, id: string) {
  const card = await ownedCard(creatorId, id);
  if (card.status !== "ready" || !card.storage_path)
    throw new HttpError(409, "Wait for this preview to finish first.");
  const db = adminDb();
  if ((await publishedPreviews(creatorId)).has(card.id)) return;
  const { count, error: countError } = await db
    .from("creator_examples")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorId);
  check(countError);
  if ((count ?? 0) >= MAX_EXAMPLES)
    throw new HttpError(
      400,
      `Your storefront shows up to ${MAX_EXAMPLES} examples. Remove one under Your store first.`,
    );
  const base = `${creatorId}/example/${randomUUID()}`;
  const after = `${base}-after.webp`;
  const before = card.sample_path ? `${base}-before.jpg` : null;
  const files = [after, ...(before ? [before] : [])];
  // A copy that fails halfway would otherwise leave the other file behind.
  try {
    await Promise.all([
      download(BUCKET, card.storage_path).then((bytes) =>
        put(PUBLIC_BUCKET, after, bytes, "image/webp"),
      ),
      card.sample_path &&
        before &&
        // Samples are stored at full size, often several megabytes: far more
        // than the storefront shows, and slow enough to copy that the request
        // timed out.
        download(BUCKET, card.sample_path, {
          width: 1200,
          height: 1200,
        }).then((bytes) => put(PUBLIC_BUCKET, before, bytes, "image/jpeg")),
    ]);
  } catch (error) {
    await db.storage.from(PUBLIC_BUCKET).remove(files);
    throw error;
  }
  const publicUrl = (p: string) =>
    db.storage.from(PUBLIC_BUCKET).getPublicUrl(p).data.publicUrl;
  const { error } = await db.from("creator_examples").insert({
    creator_id: creatorId,
    image_url: publicUrl(after),
    source_url: before ? publicUrl(before) : DEFAULT_SAMPLE_URL,
    style_preview_id: card.id,
    sort_order: count ?? 0,
  });
  if (error) {
    await db.storage.from(PUBLIC_BUCKET).remove(files);
    // A double click got there first; it is published either way.
    if (error.code !== "23505") check(error);
  }
}
// A new card takes the lowest free position. Returns its id so the caller can
// run it straight away.
export async function addPreviewCard(creatorId: string, samplePath: string) {
  const taken = new Set((await previewCards(creatorId)).map((c) => c.position));
  const position = [...Array(MAX_PREVIEW_CARDS).keys()].find(
    (p) => !taken.has(p),
  );
  if (position === undefined)
    throw new HttpError(
      400,
      `Try up to ${MAX_PREVIEW_CARDS} samples at a time.`,
    );
  const { data, error } = await adminDb()
    .from("creator_style_previews")
    .insert({ creator_id: creatorId, position, sample_path: samplePath })
    .select("id")
    .single();
  check(error);
  return data!.id;
}
// Swapping a card's sample leaves its result in place, now out of date, until
// the creator runs it again. null puts the built-in sample back. The row is
// updated before the old file goes, so a failed removal leaves an orphaned
// file rather than a broken card.
export async function setCardSample(
  creatorId: string,
  id: string,
  samplePath: string | null,
) {
  const card = await ownedCard(creatorId, id);
  check(
    (
      await adminDb()
        .from("creator_style_previews")
        .update({ sample_path: samplePath })
        .eq("id", card.id)
    ).error,
  );
  if (card.sample_path)
    await adminDb().storage.from(BUCKET).remove([card.sample_path]);
}
// A running card is left alone so the run in flight has a row to land in.
export async function removePreviewCard(creatorId: string, id: string) {
  const card = await ownedCard(creatorId, id);
  if (card.status === "running" && !abandoned(card))
    throw new HttpError(409, "Wait for this preview to finish first.");
  check(
    (await adminDb().from("creator_style_previews").delete().eq("id", card.id))
      .error,
  );
  const files = [card.sample_path, card.storage_path].filter((p): p is string =>
    Boolean(p),
  );
  if (files.length) await adminDb().storage.from(BUCKET).remove(files);
}
// Progress only, so it is best effort: a missed write just leaves the card on
// its previous stage, and before 202609250002 there is no column to write.
// Read ignores the stage once the card stops running, so it is never cleared.
async function setStage(id: string, stage: NonNullable<CardRow["stage"]>) {
  await adminDb().from("creator_style_previews").update({ stage }).eq("id", id);
}
// Returns false when a run is already in flight, so a double click cannot spend
// two generations on the same card.
export async function claimPreviewCard(id: string) {
  const db = adminDb();
  check(
    (
      await db
        .from("creator_style_previews")
        .update({ status: "failed" })
        .eq("id", id)
        .eq("status", "running")
        .lt("updated_at", new Date(Date.now() - STALE_RUN_MS).toISOString())
    ).error,
  );
  const { data, error } = await db
    .from("creator_style_previews")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "running")
    .select("id")
    .maybeSingle();
  check(error);
  if (data) await setStage(id, "queued");
  return Boolean(data);
}
export async function runPreviewCard(
  creatorId: string,
  card: Pick<CardRow, "id" | "sample_path">,
  references: { id: string; storage_path: string }[],
) {
  const db = adminDb();
  try {
    const [source, referenceImages] = await Promise.all([
      sharp(
        card.sample_path
          ? await download(BUCKET, card.sample_path)
          : await readFile(join(process.cwd(), SAMPLE)),
      )
        .jpeg({ quality: 95 })
        .toBuffer(),
      Promise.all(
        references.map(async (r) => ({
          bytes: await download(BUCKET, r.storage_path),
          mimeType: "image/jpeg",
        })),
      ),
    ]);
    await setStage(card.id, "generating");
    const result = await new OpenAIImageTransformProvider().transform({
      sourceImage: { bytes: source, mimeType: "image/jpeg" },
      creatorReferenceImages: referenceImages,
      aspectRatio: "iso-portrait",
    });
    await setStage(card.id, "refining");
    await recordUsage(result, {
      creatorId,
      purpose: "style_preview",
      stylePreviewId: card.id,
    });
    const path = `${creatorId}/preview/${randomUUID()}.webp`;
    await put(
      BUCKET,
      path,
      await sharp(result.images[0])
        .resize({ width: 900, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer(),
      "image/webp",
    );
    check(
      (
        await db
          .from("creator_style_previews")
          .update({
            storage_path: path,
            signature: boardSignature(references, card.sample_path),
            status: "ready",
            updated_at: new Date().toISOString(),
          })
          .eq("id", card.id)
      ).error,
    );
  } catch (error) {
    logError("style_preview_failed", error, {
      creator_id: creatorId,
      preview_id: card.id,
    });
    await db
      .from("creator_style_previews")
      .update({ status: "failed" })
      .eq("id", card.id);
  }
}
