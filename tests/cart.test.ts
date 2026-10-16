import { describe, expect, it } from "vitest";
import {
  allowedQuantity,
  cartCount,
  cartTotal,
  MAX_PER_ITEM,
  MAX_PER_ORDER,
} from "@/lib/cart/rules";
import { cartKey } from "@/lib/cart/cart";

const line = (productId: string, quantity: number, unitAmount = 3499) => ({
  artworkId: "art-1",
  productId,
  quantity,
  unitAmount,
});

describe("cart rules", () => {
  it("allows up to 10 of one print", () => {
    expect(allowedQuantity(MAX_PER_ITEM, 0)).toEqual({
      ok: true,
      quantity: MAX_PER_ITEM,
    });
    expect(allowedQuantity(MAX_PER_ITEM + 1, 0)).toMatchObject({ ok: false });
    expect(allowedQuantity(0, 0)).toMatchObject({ ok: false });
    expect(allowedQuantity(1.5, 0)).toMatchObject({ ok: false });
  });
  it("allows up to 20 prints in one order", () => {
    expect(allowedQuantity(5, MAX_PER_ORDER - 5)).toMatchObject({ ok: true });
    const over = allowedQuantity(6, MAX_PER_ORDER - 5);
    expect(over).toMatchObject({ ok: false });
    expect(!over.ok && over.error).toContain("20 prints");
  });
  it("adds up prints and prices, copies included", () => {
    const lines = [line("a3", 2, 3499), line("a2", 1, 4499)];
    expect(cartCount(lines)).toBe(3);
    expect(cartTotal(lines)).toBe(2 * 3499 + 4499);
    expect(cartTotal([])).toBe(0);
  });
  it("names the same cart the same way, whatever order it was filled in", () => {
    const a = [line("a3", 2), line("a2", 1)];
    expect(cartKey(a, "sek")).toBe(cartKey([...a].reverse(), "sek"));
    // A different quantity, price or currency is a different cart.
    expect(cartKey(a, "sek")).not.toBe(
      cartKey([line("a3", 3), line("a2", 1)], "sek"),
    );
    expect(cartKey(a, "sek")).not.toBe(
      cartKey([line("a3", 2, 3999), line("a2", 1)], "sek"),
    );
    expect(cartKey(a, "sek")).not.toBe(cartKey(a, "eur"));
  });
});
