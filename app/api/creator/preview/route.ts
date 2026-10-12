import { after } from "next/server";
import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import {
  activeReferences,
  claimPreviewCard,
  PREVIEW_WINDOW_SECONDS,
  previewBudgetKey,
  previewCards,
  previewsPerDay,
  readStylePreview,
  runPreviewCard,
} from "@/lib/stores/style-preview";
export const maxDuration = 300;
export async function GET() {
  return api(async () => {
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    return readStylePreview(store.id);
  });
}
// Runs one card when given its id, otherwise every card that is not already
// running. Each run is a real generation and spends one of the day's previews,
// so a refresh stops at the budget rather than failing outright.
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const { id } = z
      .object({ id: z.uuid().optional() })
      .parse(await request.json().catch(() => ({})));
    const [references, cards] = await Promise.all([
      activeReferences(store.id),
      previewCards(store.id),
    ]);
    if (!references.length)
      throw new HttpError(400, "Put at least one image in use first.");
    if (id && !cards.some((c) => c.id === id))
      throw new HttpError(404, "That preview is gone.");
    const targets = cards.filter(
      (c) => (!id || c.id === id) && c.status !== "running",
    );
    let started = 0;
    for (const card of targets) {
      const { data: allowed, error } = await adminDb().rpc(
        "consume_rate_limit",
        {
          p_key: previewBudgetKey(store.id),
          p_limit: previewsPerDay(),
          p_window_seconds: PREVIEW_WINDOW_SECONDS,
        },
      );
      check(error);
      if (!allowed) {
        if (started) break;
        throw new HttpError(
          429,
          "You have used today's previews. Please try again tomorrow.",
        );
      }
      if (await claimPreviewCard(card.id)) {
        started += 1;
        after(() => runPreviewCard(store.id, card, references));
      }
    }
    return readStylePreview(store.id);
  });
}
