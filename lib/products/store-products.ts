import "server-only";
import { adminDb, check } from "@/lib/supabase/admin";
import { productRow } from "@/lib/domain";
import { HttpError } from "@/lib/http";
import type { Store } from "@/lib/domain";
// Everything a creator has added, in every currency and archived included,
// for the dashboard.
export async function listStoreProducts(creatorId: string) {
  const { data, error } = await adminDb()
    .from("products")
    .select("*")
    .eq("creator_id", creatorId)
    .order("sort_order")
    .order("price_amount");
  check(error);
  return productRow.array().parse(data);
}
// What a store has for sale: active and priced in its currency.
export async function countActiveProducts(
  store: Pick<Store, "id" | "currency">,
) {
  const { count, error } = await adminDb()
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", store.id)
    .eq("active", true)
    .eq("currency", store.currency);
  check(error);
  return count ?? 0;
}
// A live store with nothing to buy is a dead end for customers.
export async function assertCanDeactivate(store: Store, productId: string) {
  if (store.status !== "live") return;
  const { data, error } = await adminDb()
    .from("products")
    .select("id")
    .eq("creator_id", store.id)
    .eq("active", true)
    .eq("currency", store.currency);
  check(error);
  if ((data ?? []).every((p) => p.id === productId))
    throw new HttpError(
      409,
      "Your store is live, so it needs at least one product. Add another first, or pause the store.",
    );
}
// Slugs are unique per store across archived products too.
export async function uniqueSlug(creatorId: string, name: string) {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "product";
  const { data, error } = await adminDb()
    .from("products")
    .select("slug")
    .eq("creator_id", creatorId)
    .like("slug", `${base}%`);
  check(error);
  const taken = new Set((data ?? []).map((p) => p.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}
