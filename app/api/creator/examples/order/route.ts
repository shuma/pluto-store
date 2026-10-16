import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { MAX_EXAMPLES } from "@/lib/domain";
// Saves the order the creator dragged the storefront's examples into: first
// shown first. Ids that aren't the store's change nothing.
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const { ids } = z
      .object({ ids: z.array(z.uuid()).max(MAX_EXAMPLES) })
      .parse(await request.json());
    const db = adminDb();
    const results = await Promise.all(
      ids.map((id, sort_order) =>
        db
          .from("creator_examples")
          .update({ sort_order })
          .eq("id", id)
          .eq("creator_id", store.id),
      ),
    );
    for (const { error } of results) check(error);
    return { ok: true };
  });
}
