// What a cart may hold, and what it adds up to. Pure, so the server, the page
// and the tests share one set of rules.

// Of one print (an artwork in one size), and in all.
export const MAX_PER_ITEM = 10;
export const MAX_PER_ORDER = 20;

export type CartLine = {
  artworkId: string;
  productId: string;
  quantity: number;
  // Minor units, the product's price now.
  unitAmount: number;
};

export const cartCount = (lines: Pick<CartLine, "quantity">[]) =>
  lines.reduce((n, line) => n + line.quantity, 0);

export const cartTotal = (lines: Pick<CartLine, "quantity" | "unitAmount">[]) =>
  lines.reduce((sum, line) => sum + line.quantity * line.unitAmount, 0);

// The quantity a line may move to, or why not. `others` is how many prints
// the rest of the cart holds.
export function allowedQuantity(quantity: number, others: number) {
  if (!Number.isInteger(quantity) || quantity < 1)
    return { ok: false, error: "Choose at least one." } as const;
  if (quantity > MAX_PER_ITEM)
    return {
      ok: false,
      error: `You can order up to ${MAX_PER_ITEM} of each print.`,
    } as const;
  if (others + quantity > MAX_PER_ORDER)
    return {
      ok: false,
      error: `One order holds up to ${MAX_PER_ORDER} prints. Check out these first, then start another.`,
    } as const;
  return { ok: true, quantity } as const;
}
