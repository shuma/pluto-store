import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import {
  gelatoConfigured,
  getCatalogProduct,
} from "@/lib/fulfillment/gelato-catalog";
import { savePrices, uniqueSlug } from "@/lib/products/store-products";
import { productCreateSchema } from "@/lib/validation/schemas";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Save your store first.");
    if (!gelatoConfigured())
      throw new HttpError(
        503,
        "Adding products isn’t available right now. Try again later.",
      );
    const input = productCreateSchema.parse(await request.json());
    // Size and details come from Gelato, not from what the browser sent.
    const product = await getCatalogProduct(input.catalog, input.productUid);
    const db = adminDb();
    const { count, error: countError } = await db
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", store.id);
    check(countError);
    const { data, error } = await db
      .from("products")
      .insert({
        creator_id: store.id,
        name: input.name,
        description: input.description,
        slug: await uniqueSlug(store.id, input.name),
        gelato_product_uid: product.productUid,
        gelato_catalog: product.catalog,
        gelato_attributes: product.attributes,
        width_mm: product.widthMm,
        height_mm: product.heightMm,
        aspect_ratio: "portrait",
        sort_order: count ?? 0,
      })
      .select("id")
      .single();
    check(error);
    try {
      await savePrices(store, data!.id, input.prices);
    } catch (e) {
      // Never leave a product with no price behind.
      await db.from("products").delete().eq("id", data!.id);
      throw e;
    }
    return { id: data?.id };
  });
}
