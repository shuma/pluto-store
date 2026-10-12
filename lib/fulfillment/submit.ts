import "server-only";
import { adminDb, check } from "@/lib/supabase/admin";
import { ORDER_WITH_ITEMS, orderRow } from "@/lib/domain";
import { config } from "@/lib/config";
import { signedUrl } from "@/lib/storage";
import { shippingSchema } from "@/lib/validation/schemas";
import { createPosterOrder, GelatoSubmissionError } from "./gelato";
export async function submitFulfillment(orderId: string) {
  const db = adminDb();
  // Compare-and-set is the lock. A crashed submitting state is never auto-reclaimed.
  const { data, error } = await db
    .from("orders")
    .update({
      fulfillment_status: "submitting",
      fulfillment_claimed_at: new Date().toISOString(),
      fulfillment_error: null,
    })
    .eq("id", orderId)
    .eq("payment_status", "paid")
    .is("gelato_order_id", null)
    .in("fulfillment_status", ["pending", "fulfillment_failed"])
    .select(ORDER_WITH_ITEMS)
    .maybeSingle();
  check(error);
  if (!data) return;
  const order = orderRow.parse(data);
  let providerAccepted = false;
  try {
    if (config().fulfillmentMode === "manual") {
      check(
        (
          await db
            .from("orders")
            .update({ fulfillment_status: "manual" })
            .eq("id", orderId)
        ).error,
      );
      return;
    }
    if (
      !order.order_items.length ||
      order.order_items.some((i) => !i.product_snapshot.gelato_product_uid) ||
      !order.customer_name ||
      !order.customer_email
    )
      throw new Error("missing_fulfillment_details");
    const response = await createPosterOrder({
      orderId,
      items: await Promise.all(
        order.order_items.map(async (item) => ({
          itemId: item.id,
          productUid: item.product_snapshot.gelato_product_uid!,
          printFileUrl: await signedUrl(
            "print-files",
            item.print_storage_path,
            86400 * 7,
          ),
          quantity: item.quantity,
        })),
      ),
      currency: order.currency,
      customer: { name: order.customer_name, email: order.customer_email },
      shippingAddress: shippingSchema.parse(order.shipping_address),
    });
    providerAccepted = true;
    check(
      (
        await db
          .from("orders")
          .update({
            fulfillment_status: "submitted",
            gelato_order_id: response.id,
            gelato_status:
              response.fulfillmentStatus ?? response.orderType ?? "submitted",
            gelato_submitted_at: new Date().toISOString(),
            provider_response: response,
          })
          .eq("id", orderId)
      ).error,
    );
  } catch (error) {
    const uncertain =
      providerAccepted ||
      (error instanceof GelatoSubmissionError && error.uncertain);
    console.error(
      JSON.stringify({
        event: "fulfillment_failed",
        order_id: orderId,
        uncertain,
      }),
    );
    check(
      (
        await db
          .from("orders")
          .update({
            fulfillment_status: uncertain
              ? "needs_review"
              : "fulfillment_failed",
            fulfillment_error: uncertain
              ? "Needs a manual check before it’s sent to print again."
              : "Submission failed. Check configuration and shipping details before retrying.",
          })
          .eq("id", orderId)
      ).error,
    );
  }
}
