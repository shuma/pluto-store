import type { Order } from "@/lib/domain";
// Revenue over time for the income page. Revenue is what customers paid, on
// paid orders in the store's currency; orders in another currency (from
// before a switch) are left out rather than added across currencies.

export const RANGES = {
  "7d": { label: "7 days", days: 7, bucket: "day" },
  "30d": { label: "30 days", days: 30, bucket: "day" },
  "90d": { label: "90 days", days: 90, bucket: "week" },
  "12m": { label: "12 months", days: 365, bucket: "month" },
  all: { label: "All time", days: null, bucket: "month" },
} as const;
export type Range = keyof typeof RANGES;

const DAY = 86_400_000;

export type Bucket = {
  // Start of the bucket, ms since epoch.
  start: number;
  revenue: number;
  orders: number;
};

export const isRevenue = (order: Order, currency: string) =>
  order.payment_status === "paid" && order.currency === currency;

// Midnight UTC, so buckets don't shift with the viewer's timezone between
// the server render and the browser.
const startOfDay = (t: number) => Math.floor(t / DAY) * DAY;
const startOfMonth = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};
const addMonths = (t: number, n: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1);
};

// When a range starts, measured back from `now`; null for all time.
export function rangeStart(range: Range, now: number) {
  const { days } = RANGES[range];
  return days === null ? null : startOfDay(now) - (days - 1) * DAY;
}

export function inRange(order: Order, range: Range, now: number) {
  const start = rangeStart(range, now);
  return start === null || Date.parse(order.created_at) >= start;
}

// Revenue per day, week or month across the range, with empty buckets kept
// so the chart's time axis is even.
export function revenueBuckets(
  orders: Order[],
  currency: string,
  range: Range,
  now: number,
): Bucket[] {
  const paid = orders.filter((o) => isRevenue(o, currency));
  const { bucket } = RANGES[range];
  const earliest = paid.reduce(
    (min, o) => Math.min(min, Date.parse(o.created_at)),
    now,
  );
  const from = rangeStart(range, now) ?? earliest;
  const starts: number[] = [];
  if (bucket === "month")
    for (let t = startOfMonth(from); t <= now; t = addMonths(t, 1))
      starts.push(t);
  else {
    const step = bucket === "week" ? 7 * DAY : DAY;
    for (let t = startOfDay(from); t <= now; t += step) starts.push(t);
  }
  const buckets = starts.map((start) => ({ start, revenue: 0, orders: 0 }));
  for (const order of paid) {
    const t = Date.parse(order.created_at);
    if (t < starts[0]) continue;
    // The last bucket that starts at or before the order.
    let i = buckets.length - 1;
    while (i > 0 && buckets[i].start > t) i--;
    buckets[i].revenue += order.amount_total;
    buckets[i].orders += 1;
  }
  return buckets;
}

export type Totals = { revenue: number; orders: number; fees: number };
export function totals(orders: Order[], currency: string): Totals {
  return orders
    .filter((o) => isRevenue(o, currency))
    .reduce(
      (sum, o) => ({
        revenue: sum.revenue + o.amount_total,
        orders: sum.orders + 1,
        fees: sum.fees + (o.platform_fee_amount ?? 0),
      }),
      { revenue: 0, orders: 0, fees: 0 },
    );
}

// Revenue in the same-length period just before the range, to compare
// against; null for all time, which has nothing before it.
export function previousTotals(
  orders: Order[],
  currency: string,
  range: Range,
  now: number,
) {
  const { days } = RANGES[range];
  const start = rangeStart(range, now);
  if (days === null || start === null) return null;
  const before = start - days * DAY;
  return totals(
    orders.filter((o) => {
      const t = Date.parse(o.created_at);
      return t >= before && t < start;
    }),
    currency,
  );
}

// Below this many orders in the previous period, a percentage swings on a
// sale or two (10 orders to 6 is "−40%"), so the change is shown as a plain
// difference, uncoloured, instead.
export const SMALL_BASE = 20;

// A signed change as a whole percentage, or null when there is nothing to
// compare with (a first sale can't be "infinitely" up).
export function change(current: number, previous: number | undefined) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// The product that brought in the most, with what it made; null with no
// sales. Grouped by product so a renamed product still counts as one.
export function bestSeller(orders: Order[], currency: string) {
  const byProduct = new Map<
    string,
    { name: string; revenue: number; orders: number }
  >();
  for (const o of orders) {
    if (!isRevenue(o, currency)) continue;
    for (const item of o.order_items) {
      const entry = byProduct.get(item.product_id) ?? {
        name: item.product_snapshot.name,
        revenue: 0,
        orders: 0,
      };
      entry.revenue += item.unit_amount * item.quantity;
      // Orders it sold in, however many copies each.
      entry.orders += 1;
      byProduct.set(item.product_id, entry);
    }
  }
  return (
    [...byProduct.values()].sort((a, b) => b.revenue - a.revenue)[0] ?? null
  );
}
