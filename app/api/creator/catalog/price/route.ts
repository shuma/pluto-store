import { z } from "zod";
import { api, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { getUnitCost } from "@/lib/fulfillment/gelato-catalog";
import { currencySchema } from "@/lib/currency";
export async function GET(request: Request) {
  return api(async () => {
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const params = new URL(request.url).searchParams;
    const uid = z.string().min(1).max(300).parse(params.get("uid"));
    // Quoted in the currency asked for, delivered within its market.
    const currency = currencySchema
      .catch(store.currency)
      .parse(params.get("currency"));
    return { cost: await getUnitCost(uid, currency) };
  });
}
