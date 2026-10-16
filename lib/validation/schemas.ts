import { currencySchema } from "@/lib/currency";
import { z } from "zod";
import { storeSlugSchema } from "@/lib/store-slugs";
export const uuid = z.uuid();
export const imageMime = z.enum(["image/jpeg", "image/png", "image/webp"]);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
// Which emails a creator wants; any subset can be changed at once.
export const notificationsSchema = z
  .object({
    notify_new_order: z.boolean(),
    notify_needs_attention: z.boolean(),
    notify_payout_sent: z.boolean(),
  })
  .partial();
export const uploadSchema = z.object({
  storeSlug: storeSlugSchema,
  mimeType: imageMime,
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
export const storeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: storeSlugSchema,
  description: z.string().trim().max(400),
  status: z.enum(["draft", "live", "disabled"]),
});
// Prices arrive in major units as typed ("249" or "249.50") and leave as
// integer minor units; nothing below one unit or above 100 000 is sellable.
const price = z.coerce
  .number()
  .min(1, "Set a price of at least 1.")
  .max(100_000)
  .transform((major) => Math.round(major * 100));
// A price in each currency the store sells in, set by the creator; none is
// converted from another.
export const productDetailsSchema = z.object({
  name: z.string().trim().min(2, "Give it a name.").max(60),
  description: z.string().trim().max(200),
  prices: z.partialRecord(currencySchema, price),
});
export const productCreateSchema = productDetailsSchema.extend({
  catalog: z.string().min(1).max(100),
  productUid: z.string().min(1).max(300),
});
export const productUpdateSchema = productDetailsSchema
  .extend({ active: z.boolean(), sort_order: z.number().int().min(0) })
  .partial();
export const catalogSearchSchema = z.object({
  catalog: z.string().min(1).max(100),
  filters: z.record(z.string(), z.array(z.string()).max(50)).default({}),
});
// Checkout buys the visit's cart, which the server holds: the browser names
// only the visit and the artwork the cart is for.
export const checkoutSchema = z.object({ sessionId: uuid, artworkId: uuid });
export const cartAddSchema = z.object({
  sessionId: uuid,
  artworkId: uuid,
  productId: uuid,
  quantity: z.number().int().min(1).default(1),
});
export const cartUpdateSchema = z.object({
  sessionId: uuid,
  artworkId: uuid,
  itemId: uuid,
  quantity: z.number().int(),
});
export const cartRemoveSchema = z.object({
  sessionId: uuid,
  artworkId: uuid,
  itemId: uuid,
});
export const shippingSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().nullable().optional(),
  city: z.string().min(1),
  postal_code: z.string().min(1),
  state: z.string().nullable().optional(),
  country: z.string().length(2),
});
export type ShippingAddress = z.infer<typeof shippingSchema>;
// What a creator may change on an order: who it goes to and where, until it
// is sent to print, and their own note at any time.
export const orderUpdateSchema = z
  .object({
    customer_name: z
      .string()
      .trim()
      .min(1, "Add the customer’s name.")
      .max(100),
    customer_email: z.email("Check the email address."),
    shipping_address: z.object({
      line1: z.string().trim().min(1, "Add the street address.").max(35),
      line2: z.string().trim().max(35).nullable().optional(),
      city: z.string().trim().min(1, "Add the city.").max(30),
      postal_code: z.string().trim().min(1, "Add the postcode.").max(15),
      state: z.string().trim().max(35).nullable().optional(),
    }),
    creator_note: z
      .string()
      .trim()
      .max(1000)
      .transform((note) => note || null),
  })
  .partial();
