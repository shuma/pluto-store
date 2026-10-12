import "server-only";
import { z } from "zod";
import { cache } from "react";
import { adminDb, check } from "@/lib/supabase/admin";
import { storeRow, productRow, type Store } from "@/lib/domain";
import { storeSlugSchema } from "@/lib/store-slugs";
export const getStore = cache(async (slug: string) => {
  if (!storeSlugSchema.safeParse(slug).success) return null;
  const { data, error } = await adminDb()
    .from("creators")
    .select("*")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle();
  check(error);
  return data ? storeRow.parse(data) : null;
});
// What a store sells: its active products in its currency.
export async function getProducts(store: Pick<Store, "id" | "currency">) {
  const { data, error } = await adminDb()
    .from("products")
    .select("*")
    .eq("active", true)
    .eq("currency", store.currency)
    .eq("creator_id", store.id)
    .order("sort_order")
    .order("price_amount");
  check(error);
  return productRow.array().parse(data);
}

export async function getExamples(creatorId: string) {
  const { data, error } = await adminDb()
    .from("creator_examples")
    .select("id,image_url,caption")
    .eq("creator_id", creatorId)
    .order("sort_order")
    .limit(12);
  check(error);
  return z
    .object({ id: z.uuid(), image_url: z.string(), caption: z.string() })
    .array()
    .parse(data);
}
