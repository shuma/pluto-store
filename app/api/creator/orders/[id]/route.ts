import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { orderRow } from "@/lib/domain";
import { canEditDetails, EDITABLE_FULFILLMENT } from "@/lib/orders/state";
import {
  orderUpdateSchema,
  shippingSchema,
  uuid,
} from "@/lib/validation/schemas";
// A creator's changes to one of their orders. Payment and fulfilment status
// are never changed here; those belong to Stripe, the printer and operators.
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/creator/orders/[id]">,
) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const id = uuid.parse((await ctx.params).id);
    // Unknown fields, such as a status, are dropped here, never written.
    const changes = orderUpdateSchema.parse(await request.json());
    if (!Object.keys(changes).length)
      throw new HttpError(400, "There’s nothing to change.");
    const db = adminDb();
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("creator_id", store.id)
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Order not found.");
    const order = orderRow.parse(data);
    const { creator_note, shipping_address, ...contact } = changes;
    const details = shipping_address || Object.keys(contact).length;
    if (details && !canEditDetails(order))
      throw new HttpError(
        409,
        "This order has been sent to print, so its details can’t change.",
      );
    let query = db
      .from("orders")
      .update({
        ...contact,
        ...(creator_note === undefined ? {} : { creator_note }),
        ...(shipping_address
          ? {
              // The country sets the store's market, so it stays as ordered.
              shipping_address: shippingSchema.parse({
                ...shipping_address,
                country: shippingSchema.parse(order.shipping_address).country,
              }),
            }
          : {}),
      })
      .eq("id", id)
      .eq("creator_id", store.id);
    // Details only change while the order is still unsent: if it was claimed
    // for printing in the meantime, nothing is written.
    if (details)
      query = query
        .in("fulfillment_status", [...EDITABLE_FULFILLMENT])
        .is("gelato_order_id", null);
    const updated = await query.select("id");
    check(updated.error);
    if (!updated.data?.length)
      throw new HttpError(
        409,
        "This order was just sent to print, so its details can’t change.",
      );
    return { ok: true };
  });
}
