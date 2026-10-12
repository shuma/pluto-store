import "server-only";
import { adminDb, check } from "@/lib/supabase/admin";
import { artworkRow, type Session } from "@/lib/domain";
import { cachedSignedUrl } from "@/lib/storage";
import type { GenerationResult } from "@/lib/queries/generation";
import { config } from "@/lib/config";
import { latestDrafts } from "./drafts";
import { displayPhotoPath } from "./upload";

// Shared by the route handler the browser polls and by the page that seeds the
// client cache, so the hydrated value and the polled value are the same shape.
export async function generationResult(
  session: Session,
): Promise<GenerationResult> {
  const { data, error } = await adminDb()
    .from("generated_artworks")
    .select("*")
    .eq("generation_session_id", session.id)
    .eq("status", "ready")
    .order("created_at");
  check(error);
  return {
    status: session.status,
    roundCount: session.round_count,
    progress:
      session.status === "generating"
        ? await progress(session.id, data ?? [])
        : undefined,
    photoUrl:
      session.status === "generating" ? await photoUrl(session) : undefined,
    artworks: await Promise.all(
      artworkRow
        .array()
        .parse(data)
        .map(async (a) => ({
          id: a.id,
          url: await cachedSignedUrl("generated-artworks", a.storage_path),
        })),
    ),
  };
}

// The photo to show while the artwork is made: its small display copy, or
// the full photo for a visit uploaded before copies were made.
async function photoUrl(session: Session) {
  try {
    return await cachedSignedUrl(
      "customer-uploads",
      displayPhotoPath(session.id),
    );
  } catch {
    return cachedSignedUrl("customer-uploads", session.source_image_path);
  }
}

// Where each artwork of the running round has got to: done, a draft, or not
// started. Artworks land in the slot that drew their drafts.
async function progress(
  sessionId: string,
  rows: {
    round_id: string;
    storage_path: string;
    provider_metadata: unknown;
  }[],
): Promise<NonNullable<GenerationResult["progress"]>> {
  const { data: round, error } = await adminDb()
    .from("generation_rounds")
    .select("id")
    .eq("generation_session_id", sessionId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error);
  const slots = config().alternatives;
  if (!round) return Array.from({ length: slots }, () => empty);
  const drafts = await latestDrafts(sessionId, round.id);
  const done = new Map<number, string>();
  for (const row of rows) {
    const slot = (row.provider_metadata as { slot?: unknown } | null)?.slot;
    if (row.round_id === round.id && typeof slot === "number")
      done.set(slot, row.storage_path);
  }
  return Promise.all(
    Array.from({ length: slots }, async (_, slot) => {
      const final = done.get(slot);
      if (final)
        return {
          url: await cachedSignedUrl("generated-artworks", final),
          step: 0,
          done: true,
        };
      const draft = drafts.get(slot);
      if (!draft) return empty;
      return {
        url: await cachedSignedUrl("generated-artworks", draft.path),
        step: draft.index + 1,
        done: false,
      };
    }),
  );
}
const empty = { url: null, step: 0, done: false };
