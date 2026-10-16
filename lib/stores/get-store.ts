import "server-only";
import { cache } from "react";
import { adminDb, check } from "@/lib/supabase/admin";
import {
  storeRow,
  productRow,
  exampleRow,
  MAX_EXAMPLES,
  PRODUCT_WITH_PRICES,
  type Store,
} from "@/lib/domain";
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
// What a store sells: its active products, with their price in each
// currency. Which of them a customer sees depends on the currency they pay
// in (lib/stores/customer-currency.ts).
export async function getProducts(store: Pick<Store, "id">) {
  const { data, error } = await adminDb()
    .from("products")
    .select(PRODUCT_WITH_PRICES)
    .eq("active", true)
    .eq("creator_id", store.id)
    .order("sort_order");
  check(error);
  return productRow.array().parse(data);
}

export async function getExamples(creatorId: string) {
  const { data, error } = await adminDb()
    .from("creator_examples")
    .select("id,image_url,source_url,caption")
    .eq("creator_id", creatorId)
    .order("sort_order")
    .limit(MAX_EXAMPLES);
  check(error);
  return exampleRow.array().parse(data);
}
