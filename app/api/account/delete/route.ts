import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore, requireUser } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { serverDb } from "@/lib/supabase/server";
import { deletionBlockers } from "@/lib/account";
// Closes a creator's account. Refused while a customer is waiting for a
// print or Pluto still owes the creator money. Otherwise the store is taken
// offline and detached, and the sign-in is deleted. Orders and payouts stay,
// as sales records must, and so does the Stripe account that received them.
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const [user, store] = await Promise.all([requireUser(), ownedStore()]);
    const db = adminDb();
    if (store) {
      const { confirm } = z
        .object({ confirm: z.string() })
        .parse(await request.json());
      if (confirm.trim() !== store.name.trim())
        throw new HttpError(400, "Type your store’s name to confirm.");
      const { data, error } = await db
        .from("orders")
        .select(
          "payment_status,fulfillment_status,creator_earnings_amount,payout_id",
        )
        .eq("creator_id", store.id);
      check(error);
      const blockers = deletionBlockers(data ?? []);
      if (blockers.length) throw new HttpError(409, blockers.join(" "));
      check(
        (
          await db
            .from("creators")
            .update({
              status: "disabled",
              owner_user_id: null,
              deleted_at: new Date().toISOString(),
            })
            .eq("id", store.id)
        ).error,
      );
    }
    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error)
      throw new HttpError(500, "Couldn’t delete your account. Try again.");
    await (await serverDb()).auth.signOut();
    return { ok: true };
  });
}
