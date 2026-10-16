import "server-only";
import { adminDb, check } from "@/lib/supabase/admin";
import { PRODUCT_WITH_PRICES, productRow } from "@/lib/domain";
import { HttpError } from "@/lib/http";
import { storeCurrencies, type Store } from "@/lib/domain";
import type { Currency } from "@/lib/currency";
// Everything a creator has added, in every currency and archived included,
// for the dashboard.
export async function listStoreProducts(creatorId: string) {
  const { data, error } = await adminDb()
    .from("products")
    .select(PRODUCT_WITH_PRICES)
    .eq("creator_id", creatorId)
    .order("sort_order");
  check(error);
  return productRow.array().parse(data);
}
// What a store has for sale: active and priced in its main currency, the
// one every customer can fall back to.
async function forSale(store: Pick<Store, "id" | "currency">) {
  const { data, error } = await adminDb()
    .from("products")
    .select(PRODUCT_WITH_PRICES)
    .eq("creator_id", store.id)
    .eq("active", true);
  check(error);
  return productRow
    .array()
    .parse(data)
    .filter((p) => p.prices[store.currency] !== undefined);
}
export async function countActiveProducts(
  store: Pick<Store, "id" | "currency">,
) {
  return (await forSale(store)).length;
}
// A live store with nothing to buy is a dead end for customers.
export async function assertCanDeactivate(store: Store, productId: string) {
  if (store.status !== "live") return;
  if ((await forSale(store)).every((p) => p.id === productId))
    throw new HttpError(
      409,
      "Your store is live, so it needs at least one product. Add another first, or pause the store.",
    );
}
// Sets what a product sells for: a price in each of the store's currencies
// given, and none in the store's others, which the creator turned off for
// it. Prices in currencies the store no longer sells in are kept for if it
// does again. A product is always sold in at least one.
export async function savePrices(
  store: Store,
  productId: string,
  prices: Partial<Record<Currency, number>>,
) {
  const offered = storeCurrencies(store);
  const rows = offered.flatMap((currency) =>
    prices[currency] === undefined
      ? []
      : [{ product_id: productId, currency, amount: prices[currency] }],
  );
  if (!rows.length)
    throw new HttpError(400, "Set a price in at least one currency.");
  const db = adminDb();
  check((await db.from("product_prices").upsert(rows)).error);
  const off = offered.filter((c) => prices[c] === undefined);
  if (off.length)
    check(
      (
        await db
          .from("product_prices")
          .delete()
          .eq("product_id", productId)
          .in("currency", off)
      ).error,
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
