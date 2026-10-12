import { z } from "zod";
import { currencySchema, DEFAULT_CURRENCY } from "@/lib/currency";
export const storeRow = z.object({
  id: z.uuid(),
  owner_user_id: z.uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  avatar_url: z.string().nullable(),
  hero_url: z.string().nullable(),
  status: z.enum(["draft", "live", "disabled"]),
  // Defaults so the app still reads stores before 202609290002 is applied.
  currency: currencySchema.default(DEFAULT_CURRENCY),
  // Defaults so stores read before 202610010001 still parse.
  stripe_account_id: z.string().nullable().default(null),
  payouts_status: z
    .enum(["not_started", "pending", "enabled", "restricted"])
    .default("not_started"),
  deleted_at: z.string().nullable().default(null),
});
export type Store = z.infer<typeof storeRow>;
export const productRow = z.object({
  id: z.uuid(),
  creator_id: z.uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  gelato_product_uid: z.string().nullable(),
  width_mm: z.coerce.number(),
  height_mm: z.coerce.number(),
  // "iso-portrait" on products from before creators built their catalogs.
  aspect_ratio: z.string(),
  currency: z.string(),
  price_amount: z.number().int(),
  active: z.boolean(),
  // Defaults so order snapshots taken before these columns still parse.
  description: z.string().default(""),
  gelato_catalog: z.string().nullable().default(null),
  gelato_attributes: z.record(z.string(), z.string()).default({}),
  sort_order: z.number().int().default(0),
});
export type Product = z.infer<typeof productRow>;
export const sessionRow = z.object({
  id: z.uuid(),
  creator_id: z.uuid(),
  session_token: z.string(),
  source_image_path: z.string(),
  round_count: z.number(),
  status: z.enum(["uploading", "ready", "generating", "completed", "failed"]),
  expires_at: z.string(),
});
export type Session = z.infer<typeof sessionRow>;
export const artworkRow = z.object({
  id: z.uuid(),
  generation_session_id: z.uuid(),
  creator_id: z.uuid(),
  round_id: z.uuid(),
  storage_path: z.string(),
  original_storage_path: z.string(),
  print_storage_path: z.string().nullable(),
  width_px: z.number(),
  height_px: z.number(),
  status: z.string(),
  selected: z.boolean(),
});
// One print an order bought: which artwork, the product as it was sold, how
// many and at what price each, and the file that is printed.
export const orderItemRow = z.object({
  id: z.uuid(),
  order_id: z.uuid(),
  generated_artwork_id: z.uuid(),
  product_id: z.uuid(),
  product_snapshot: productRow,
  quantity: z.number().int(),
  unit_amount: z.number().int(),
  print_storage_path: z.string(),
  created_at: z.string(),
});
export type OrderItem = z.infer<typeof orderItemRow>;
// What an order's queries select with it: `*, order_items(*)`.
export const ORDER_WITH_ITEMS = "*, order_items(*)";
export const orderRow = z.object({
  id: z.uuid(),
  creator_id: z.uuid(),
  generation_session_id: z.uuid(),
  // What was bought, in the order it was added. Empty when a query didn't
  // ask for them.
  order_items: orderItemRow
    .array()
    .default([])
    .transform((items) =>
      [...items].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    ),
  customer_email: z.string().nullable(),
  customer_name: z.string().nullable(),
  currency: z.string(),
  amount_total: z.number(),
  // Null on orders from before the fee.
  platform_fee_amount: z.number().nullable().default(null),
  payment_status: z.enum(["pending_payment", "paid", "expired"]),
  fulfillment_status: z.enum([
    "awaiting_payment",
    "pending",
    "manual",
    "submitting",
    "submitted",
    "fulfilled",
    "fulfillment_failed",
    "needs_review",
  ]),
  stripe_checkout_session_id: z.string().nullable(),
  stripe_payment_intent_id: z.string().nullable(),
  checkout_url: z.string().nullable(),
  checkout_attempt: z.number(),
  gelato_order_id: z.string().nullable(),
  shipping_address: z.unknown(),
  created_at: z.string(),
  fulfillment_error: z.string().nullable(),
  // Private to the creator; defaulted for rows read before the column.
  creator_note: z.string().nullable().default(null),
  // Earnings and payout, from 202610010001; null until known.
  fulfilled_at: z.string().nullable().default(null),
  production_cost_amount: z.number().nullable().default(null),
  payment_fee_amount: z.number().nullable().default(null),
  creator_earnings_amount: z.number().nullable().default(null),
  payout_id: z.string().nullable().default(null),
  cart_key: z.string().nullable().default(null),
});
export type Order = z.infer<typeof orderRow>;
// How many prints an order holds, counting copies.
export const printCount = (order: Pick<Order, "order_items">) =>
  order.order_items.reduce((n, item) => n + item.quantity, 0);
