import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { uuid, productUpdateSchema } from "@/lib/validation/schemas";
import {
  assertCanDeactivate,
  savePrices,
} from "@/lib/products/store-products";
async function update(
  request: Request,
  params: Promise<{ id: string }>,
  changes: (body: unknown) => ReturnType<typeof productUpdateSchema.parse>,
) {
  assertOrigin(request);
  const store = await ownedStore();
  if (!store) throw new HttpError(404, "Store not found.");
  const id = uuid.parse((await params).id);
  const values = changes(await request.json().catch(() => ({})));
  if (values.active === false) await assertCanDeactivate(store, id);
  const { prices, ...rest } = values;
  const products = adminDb().from("products");
  // Saving only prices still checks the product is this store's.
  const { data, error } = await (Object.keys(rest).length
    ? products.update(rest)
    : products.select("id")
  )
    .eq("id", id)
    .eq("creator_id", store.id)
    .select("id");
  check(error);
  if (!data?.length) throw new HttpError(404, "Product not found.");
  // The prices sent are the whole set: a currency left out is turned off.
  if (prices) await savePrices(store, id, prices);
  return { ok: true };
}
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/creator/products/[id]">,
) {
  return api(() =>
    update(request, ctx.params, (body) => productUpdateSchema.parse(body)),
  );
}
// Archived rather than deleted: past orders point at the product.
export async function DELETE(
  request: Request,
  ctx: RouteContext<"/api/creator/products/[id]">,
) {
  return api(() => update(request, ctx.params, () => ({ active: false })));
}
