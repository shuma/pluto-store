import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { currencySchema } from "@/lib/currency";
// Switches the currency a store sells in. Prices are never converted:
// products priced in the old currency stop selling until they are given a
// price in the new one, and come back as they were if the store switches
// back.
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Save your store first.");
    const { currency } = z
      .object({ currency: currencySchema })
      .parse(await request.json());
    const { error } = await adminDb()
      .from("creators")
      .update({ currency })
      .eq("id", store.id);
    check(error);
    return { ok: true };
  });
}
