import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { CURRENCIES, currencySchema, isMainCurrency } from "@/lib/currency";
// Sets the currencies a store sells in. Prices are never converted: a
// product without a price in a currency isn't sold in it until it gets one,
// and a currency dropped keeps its prices for if it comes back. The main
// currency, which payouts are set up for, stays unless it was dropped; then
// it moves to the other one that can be main.
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Save your store first.");
    const picked = z
      .object({ currencies: currencySchema.array().min(1) })
      .parse(await request.json()).currencies;
    // In a fixed order, so the store's currencies always list the same way.
    const currencies = CURRENCIES.filter((c) => picked.includes(c));
    const main = currencies.includes(store.currency)
      ? store.currency
      : currencies.find(isMainCurrency);
    if (!main)
      throw new HttpError(
        400,
        "Sell in US dollars or Swedish kronor too: your payouts are set up in one of them.",
      );
    const { error } = await adminDb()
      .from("creators")
      .update({ currencies, currency: main })
      .eq("id", store.id);
    check(error);
    return { ok: true };
  });
}
