import type Stripe from "stripe";
import type { Order, Product } from "@/lib/domain";
import { formatSize, isFramed, isMini } from "@/lib/products/catalog";
// What Stripe shows under the product name at checkout, true to what is being
// bought: "Your original artwork, printed and framed. 12 × 16 in. Shipping
// included."
export function checkoutDescription(product: Product) {
  const what = isFramed(product.gelato_catalog)
    ? "printed and framed"
    : isMini(product.width_mm, product.height_mm)
      ? "printed as a mini print"
      : "printed as an unframed poster";
  return `Your original artwork, ${what}. ${formatSize(product.width_mm, product.height_mm)}. Shipping included.`;
}
export function checkoutParams(
  order: Order,
  appUrl: string,
  storeSlug: string,
  countries: readonly string[],
  // Each item's print hanging in a room, in item order, shown beside it;
  // Stripe fetches them, so they must be reachable for the session's life.
  imageUrls: (string | null)[] = [],
): Stripe.Checkout.SessionCreateParams {
  // Cancelling returns to the size page of the first artwork in the cart.
  const first = order.order_items[0];
  return {
    mode: "payment",
    client_reference_id: order.id,
    customer_creation: "always",
    billing_address_collection: "required",
    shipping_address_collection: {
      allowed_countries:
        countries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
    },
    line_items: order.order_items.map((item, i) => ({
      quantity: item.quantity,
      price_data: {
        currency: order.currency,
        unit_amount: item.unit_amount,
        product_data: {
          name: item.product_snapshot.name,
          description: checkoutDescription(item.product_snapshot),
          ...(imageUrls[i] ? { images: [imageUrls[i]!] } : {}),
        },
      },
    })),
    metadata: {
      order_id: order.id,
      creator_id: order.creator_id,
      generation_id: order.generation_session_id,
    },
    success_url: `${appUrl}/checkout/success?order=${order.id}`,
    cancel_url: `${appUrl}/${storeSlug}/create/${order.generation_session_id}/poster${first ? `?artwork=${first.generated_artwork_id}` : ""}`,
  };
}
