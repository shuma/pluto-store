import "server-only";
import { logError } from "@/lib/logging";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { adminDb, check } from "@/lib/supabase/admin";
import { config } from "@/lib/config";
import { download, put } from "@/lib/storage";
import { requireSession } from "./session";
import { storeRow } from "@/lib/domain";
import { HttpError } from "@/lib/http";
import { OpenAIImageTransformProvider } from "@/lib/ai/providers/openai";
import { recordUsage } from "@/lib/ai/usage";
import { track } from "@/lib/analytics";
import { activeReferences } from "@/lib/stores/style-preview";
import { clearDrafts, saveDraft } from "./drafts";
export async function claimRound(sessionId: string) {
  const session = await requireSession(sessionId);
  const db = adminDb();
  const { data: store, error: storeError } = await db
    .from("creators")
    .select("*")
    .eq("id", session.creator_id)
    .eq("status", "live")
    .single();
  check(storeError);
  if (!store) throw new HttpError(404, "This store is unavailable.");
  const { data: budget, error: budgetError } = await db.rpc(
    "consume_rate_limit",
    {
      p_key: "global-generations",
      p_limit: Number(process.env.GENERATIONS_PER_DAY ?? 100),
      p_window_seconds: 86400,
    },
  );
  check(budgetError);
  if (!budget)
    throw new HttpError(
      429,
      "Creation is taking a short break. Please return later.",
    );
  const { data, error } = await db.rpc("claim_generation", {
    p_session: sessionId,
    p_max_rounds: config().maxRounds,
  });
  if (error) {
    if (error.message.includes("round_limit"))
      throw new HttpError(
        409,
        "You have used the available creation rounds for this visit.",
      );
    check(error);
  }
  if (!data?.id) return null;
  return {
    round: z.object({ id: z.uuid(), round_number: z.number() }).parse(data),
    session,
    store: storeRow.parse(store),
  };
}
export async function runRound(
  job: NonNullable<Awaited<ReturnType<typeof claimRound>>>,
) {
  const { round, session, store } = job,
    db = adminDb();
  try {
    track(
      round.round_number > 1 ? "generation_retried" : "generation_started",
      { session_id: session.id },
    );
    const refs = await activeReferences(store.id);
    const source = await download(
      "customer-uploads",
      session.source_image_path,
    );
    const referenceImages = await Promise.all(
      refs.map(async (r) => ({
        bytes: await download("creator-reference-images", r.storage_path),
        mimeType: "image/jpeg",
      })),
    );
    // One streamed request per alternative, all at once: the image model
    // streams drafts only for a single image, and separate requests let each
    // artwork land as soon as it is done instead of waiting for the slowest.
    // The photo and references are billed once per request, so a round costs
    // more input than one request for all of them did. A slot that fails
    // costs only itself; the round fails only if none comes back.
    const provider = new OpenAIImageTransformProvider();
    const results = await Promise.allSettled(
      Array.from({ length: config().alternatives }, async (_, slot) => {
        const generated = await provider
          .transform({
            sourceImage: { bytes: source, mimeType: "image/jpeg" },
            creatorReferenceImages: referenceImages,
            aspectRatio: "iso-portrait",
            onPartial: (image, index) =>
              // A lost draft only means one less step on screen.
              saveDraft(session.id, round.id, slot, index, image).catch(
                (error: unknown) =>
                  logError("generation_draft_failed", error, {
                    round_id: round.id,
                  }),
              ),
          })
          .catch((error: unknown) => {
            // Kept separate from the round's own failure log, which records
            // only the error kind, so the provider's code and status survive.
            logError("generation_provider_failed", error, {
              round_id: round.id,
            });
            throw error;
          });
        await recordUsage(generated, {
          creatorId: store.id,
          purpose: "generation",
          generationRoundId: round.id,
        });
        const [imageBytes] = generated.images;
        const id = randomUUID(),
          original = `${session.id}/${id}/original.png`,
          preview = `${session.id}/${id}/preview.webp`;
        const meta = await sharp(imageBytes).metadata();
        if (!meta.width || !meta.height)
          throw new Error("Invalid result dimensions");
        await put(
          "generated-artworks",
          original,
          imageBytes,
          generated.mimeType,
        );
        await put(
          "generated-artworks",
          preview,
          await sharp(imageBytes)
            .resize({ width: 1000, withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer(),
          "image/webp",
        );
        const { error: saveError } = await db
          .from("generated_artworks")
          .insert({
            id,
            generation_session_id: session.id,
            creator_id: store.id,
            round_id: round.id,
            storage_path: preview,
            original_storage_path: original,
            provider: generated.provider,
            model: generated.model,
            // The slot is where the artwork drew its drafts on the results
            // page, so it lands in the same place.
            provider_metadata: { ...generated.providerMetadata, slot },
            width_px: meta.width,
            height_px: meta.height,
            delete_after: new Date(
              Date.now() + config().retentionDays * 86400000,
            ).toISOString(),
          });
        check(saveError);
      }),
    );
    await clearDrafts(session.id, round.id).catch((error: unknown) =>
      logError("generation_drafts_clear_failed", error, { round_id: round.id }),
    );
    for (const result of results) {
      if (result.status === "rejected")
        logError("generation_save_failed", result.reason, {
          round_id: round.id,
        });
    }
    if (results.every((r) => r.status === "rejected"))
      throw new Error("Empty generation round");
    check(
      (
        await db
          .from("generation_rounds")
          .update({
            status: "completed",
            finished_at: new Date().toISOString(),
          })
          .eq("id", round.id)
      ).error,
    );
    check(
      (
        await db
          .from("generation_sessions")
          .update({ status: "completed" })
          .eq("id", session.id)
      ).error,
    );
    track("generation_completed", { session_id: session.id });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "generation_failed",
        round_id: round.id,
        kind: error instanceof Error ? error.name : "unknown",
      }),
    );
    await db
      .from("generation_rounds")
      .update({
        status: "failed",
        error_code: "creation_failed",
        finished_at: new Date().toISOString(),
      })
      .eq("id", round.id);
    await db
      .from("generation_sessions")
      .update({ status: "failed" })
      .eq("id", session.id);
    track("generation_failed", { session_id: session.id });
  }
}
