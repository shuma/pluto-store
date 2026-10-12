import { describe, it, expect } from "vitest";
import { item, order, product } from "./fixtures";
import {
  bestSeller,
  change,
  inRange,
  previousTotals,
  revenueBuckets,
  totals,
} from "@/lib/income";
import type { Order } from "@/lib/domain";

const DAY = 86_400_000;
// Noon UTC, 30 September 2026.
const NOW = Date.UTC(2026, 8, 30, 12);
const sale = (daysAgo: number, amount: number, patch: Partial<Order> = {}) => ({
  ...order,
  id: crypto.randomUUID(),
  payment_status: "paid" as const,
  fulfillment_status: "fulfilled" as const,
  currency: "usd",
  amount_total: amount,
  platform_fee_amount: Math.round(amount * 0.15),
  created_at: new Date(NOW - daysAgo * DAY).toISOString(),
  ...patch,
});

describe("income", () => {
  const orders = [
    sale(0, 4499),
    sale(2, 3499),
    sale(10, 4499),
    // Unpaid, and paid in another currency: neither is revenue.
    sale(1, 9999, { payment_status: "pending_payment" }),
    sale(1, 39900, { currency: "sek" }),
    // In the previous 30 days, for the comparison.
    sale(40, 2999),
  ];
  it("counts only paid orders in the store's currency", () => {
    const current = totals(
      orders.filter((o) => inRange(o, "30d", NOW)),
      "usd",
    );
    expect(current).toEqual({
      revenue: 4499 + 3499 + 4499,
      orders: 3,
      fees: 675 + 525 + 675,
    });
  });
  it("compares with the same-length period before", () => {
    expect(previousTotals(orders, "usd", "30d", NOW)).toMatchObject({
      revenue: 2999,
      orders: 1,
    });
    expect(previousTotals(orders, "usd", "all", NOW)).toBeNull();
    expect(change(12497, 2999)).toBe(317);
    expect(change(100, 0)).toBeNull();
  });
  it("buckets revenue by day, keeping empty days so time is even", () => {
    const days = revenueBuckets(orders, "usd", "7d", NOW);
    expect(days).toHaveLength(7);
    expect(days.at(-1)).toMatchObject({ revenue: 4499, orders: 1 });
    expect(days.at(-3)).toMatchObject({ revenue: 3499, orders: 1 });
    expect(days.reduce((s, d) => s + d.revenue, 0)).toBe(4499 + 3499);
  });
  it("finds the product that made the most", () => {
    const big = { ...product, name: "Large poster" };
    const small = { ...product, name: "Small poster" };
    // One print of a product, or several copies of it, as an order's items.
    const of = (
      productId: string,
      snapshot: typeof product,
      unit: number,
      quantity = 1,
    ) => ({
      order_items: [
        {
          ...item,
          product_id: productId,
          product_snapshot: snapshot,
          unit_amount: unit,
          quantity,
        },
      ],
    });
    const sales = [
      sale(0, 4499, of("a", big, 4499)),
      sale(1, 4499, of("a", big, 4499)),
      sale(2, 2999, of("b", small, 2999)),
      sale(3, 2999, of("b", small, 2999)),
      sale(4, 2999, of("b", small, 2999)),
    ];
    expect(bestSeller(sales, "usd")).toEqual({
      name: "Large poster",
      revenue: 8998,
      orders: 2,
    });
    // Copies count at their quantity: four small prints in one order outsell.
    expect(
      bestSeller([...sales, sale(5, 11996, of("b", small, 2999, 4))], "usd"),
    ).toEqual({ name: "Small poster", revenue: 7 * 2999, orders: 4 });
    expect(bestSeller([], "usd")).toBeNull();
  });
  it("buckets longer periods by week and month", () => {
    expect(revenueBuckets(orders, "usd", "90d", NOW)).toHaveLength(13);
    const months = revenueBuckets(orders, "usd", "12m", NOW);
    expect(months.at(-1)).toMatchObject({ revenue: 4499 + 3499 + 4499 });
    expect(months.at(-2)).toMatchObject({ revenue: 2999 });
  });
});
