import type { Order } from "@/lib/domain";
export function canSubmit(
  order: Pick<
    Order,
    "payment_status" | "fulfillment_status" | "gelato_order_id"
  >,
) {
  return (
    order.payment_status === "paid" &&
    !order.gelato_order_id &&
    ["pending", "fulfillment_failed"].includes(order.fulfillment_status)
  );
}
export function canMarkFulfilled(
  order: Pick<Order, "payment_status" | "fulfillment_status">,
) {
  return (
    order.payment_status === "paid" &&
    ["manual", "submitted"].includes(order.fulfillment_status)
  );
}
// Until an order is sent to print, the creator can correct who it goes to
// and where. After that the printer has the details, so changing ours would
// only make them disagree.
export const EDITABLE_FULFILLMENT = [
  "pending",
  "manual",
  "fulfillment_failed",
] as const;
export function canEditDetails(
  order: Pick<
    Order,
    "payment_status" | "fulfillment_status" | "gelato_order_id"
  >,
) {
  return (
    order.payment_status === "paid" &&
    !order.gelato_order_id &&
    (EDITABLE_FULFILLMENT as readonly string[]).includes(
      order.fulfillment_status,
    )
  );
}

// One status a creator can read at a glance, in place of the separate payment
// and fulfilment states the system tracks.
export type OrderStage =
  | "unpaid"
  | "expired"
  | "preparing"
  | "in_production"
  | "shipped"
  | "attention";
export function orderStage(
  order: Pick<Order, "payment_status" | "fulfillment_status">,
): OrderStage {
  if (order.payment_status === "pending_payment") return "unpaid";
  if (order.payment_status === "expired") return "expired";
  switch (order.fulfillment_status) {
    case "submitted":
      return "in_production";
    case "fulfilled":
      return "shipped";
    case "fulfillment_failed":
    case "needs_review":
      return "attention";
    default:
      return "preparing";
  }
}
export const STAGE_LABELS: Record<OrderStage, string> = {
  unpaid: "Awaiting payment",
  expired: "Checkout expired",
  preparing: "Preparing",
  in_production: "In production",
  shipped: "Shipped",
  attention: "Needs attention",
};

// An order in a few words, for lists: its first print, and how many more.
export function orderTitle(order: Pick<Order, "order_items">) {
  const [first, ...rest] = order.order_items;
  if (!first) return "Order";
  const name =
    first.quantity > 1
      ? `${first.quantity} × ${first.product_snapshot.name}`
      : first.product_snapshot.name;
  return rest.length ? `${name} + ${rest.length} more` : name;
}

// Every print an order holds, for exports: "2 × Poster 50 × 70 cm; 1 × …".
export function orderItemsText(order: Pick<Order, "order_items">) {
  return order.order_items
    .map((i) => `${i.quantity} × ${i.product_snapshot.name}`)
    .join("; ");
}
