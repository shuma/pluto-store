import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { uuid, productUpdateSchema } from "@/lib/validation/schemas";
import { assertCanDeactivate } from "@/lib/products/store-products";
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
  const { price, ...rest } = values;
  // A price is always in the store's currency, so setting one also moves a
  // product priced in another currency over to it.
  const { data, error } = await adminDb()
    .from("products")
    .update({
      ...rest,
      ...(price === undefined
        ? {}
        : { price_amount: price, currency: store.currency }),
    })
    .eq("id", id)
    .eq("creator_id", store.id)
    .select("id");
  check(error);
  if (!data?.length) throw new HttpError(404, "Product not found.");
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
