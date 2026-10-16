import type { Product } from "@/lib/domain";
import type { Currency } from "@/lib/currency";
// What one print costs in the currency the customer pays in. A product with
// no price in it isn't for sale in it.
export function calculatePrice(
  product: Pick<Product, "prices" | "active">,
  currency: Currency,
) {
  const amount = product.prices[currency];
  if (
    !product.active ||
    amount === undefined ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  )
    throw new Error("Product unavailable");
  return { amount, currency, quantity: 1 as const };
}
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
