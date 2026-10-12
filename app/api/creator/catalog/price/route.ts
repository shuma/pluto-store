import { z } from "zod";
import { api, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { getUnitCost } from "@/lib/fulfillment/gelato-catalog";
export async function GET(request: Request) {
  return api(async () => {
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const uid = z
      .string()
      .min(1)
      .max(300)
      .parse(new URL(request.url).searchParams.get("uid"));
    return { cost: await getUnitCost(uid, store.currency) };
  });
}
