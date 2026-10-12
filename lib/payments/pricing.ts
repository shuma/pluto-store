import type { Product } from "@/lib/domain";
export function calculatePrice(
  product: Pick<Product, "price_amount" | "currency" | "active">,
  currency: string,
) {
  if (
    !product.active ||
    product.currency !== currency ||
    !Number.isSafeInteger(product.price_amount) ||
    product.price_amount <= 0
  )
    throw new Error("Product unavailable");
  return {
    amount: product.price_amount,
    currency: product.currency,
    quantity: 1 as const,
  };
}
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
