import { orderRow } from "@/lib/domain";
export const order = orderRow.parse({
  id: "11111111-1111-4111-8111-111111111111",
  creator_id: "11111111-1111-4111-8111-111111111111",
  generation_session_id: "11111111-1111-4111-8111-111111111111",
  order_items: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      order_id: "11111111-1111-4111-8111-111111111111",
      generated_artwork_id: "11111111-1111-4111-8111-111111111111",
      product_id: "22222222-2222-4222-8222-222222222222",
      product_snapshot: {
        id: "22222222-2222-4222-8222-222222222222",
        creator_id: "11111111-1111-4111-8111-111111111111",
        name: "A3 Poster",
        slug: "a3-poster",
        gelato_product_uid: null,
        width_mm: 297,
        height_mm: 420,
        aspect_ratio: "iso-portrait",
        currency: "sek",
        price_amount: 39900,
        active: true,
      },
      quantity: 1,
      unit_amount: 39900,
      print_storage_path: "private/print.png",
      created_at: new Date().toISOString(),
    },
  ],
  customer_email: null,
  customer_name: null,
  currency: "sek",
  amount_total: 39900,
  payment_status: "pending_payment",
  fulfillment_status: "awaiting_payment",
  stripe_checkout_session_id: null,
  stripe_payment_intent_id: null,
  checkout_url: null,
  checkout_attempt: 0,
  gelato_order_id: null,
  shipping_address: null,
  created_at: new Date().toISOString(),
  fulfillment_error: null,
});
// The one print the order holds, and the product it was sold as.
export const item = order.order_items[0];
export const product = item.product_snapshot;
