import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  feeInOrderCurrency,
  nextPayoutDate,
  orderEarnings,
  payableByCurrency,
  payoutPeriod,
  payoutsStatus,
} from "@/lib/payouts/rules";
import { deletionBlockers } from "@/lib/account";

const DAY = 86_400_000;
// 1 October 2026, 06:00 UTC: a payout run.
const NOW = Date.UTC(2026, 9, 1, 6);
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

describe("earnings", () => {
  it("is the price less Pluto's fee, print and delivery, and Stripe's fee", () => {
    expect(
      orderEarnings({
        amount: 2999,
        platformFee: 450,
        productionCost: 1198,
        paymentFee: 117,
      }),
    ).toBe(1234);
  });
  it("never goes below zero, and is unknown without a print cost", () => {
    expect(
      orderEarnings({
        amount: 1000,
        platformFee: 300,
        productionCost: 900,
        paymentFee: 60,
      }),
    ).toBe(0);
    expect(
      orderEarnings({
        amount: 1000,
        platformFee: 300,
        productionCost: null,
        paymentFee: 60,
      }),
    ).toBeNull();
  });
  it("converts Stripe's fee back to the order's currency", () => {
    // A $29.99 charge settled in kronor at 10.5 kr per dollar.
    expect(feeInOrderCurrency(1229, 10.5)).toBe(117);
    expect(feeInOrderCurrency(117, null)).toBe(117);
  });
});

describe("payout account status", () => {
  it("reads a Stripe account as a creator would", () => {
    expect(payoutsStatus({ details_submitted: false })).toBe("not_started");
    expect(
      payoutsStatus({
        details_submitted: true,
        payouts_enabled: true,
        capabilities: { transfers: "active" },
      }),
    ).toBe("enabled");
    expect(
      payoutsStatus({
        details_submitted: true,
        capabilities: { transfers: "pending" },
      }),
    ).toBe("pending");
    expect(
      payoutsStatus({
        details_submitted: true,
        capabilities: { transfers: "inactive" },
        requirements: { past_due: ["individual.dob.day"] },
      }),
    ).toBe("restricted");
    expect(
      payoutsStatus({
        details_submitted: true,
        requirements: { disabled_reason: "rejected.fraud" },
      }),
    ).toBe("restricted");
  });
});

describe("what a monthly run pays", () => {
  const order = (
    id: string,
    currency: string,
    earnings: number | null,
    shippedDaysAgo: number | null,
    payoutId: string | null = null,
  ) => ({
    id,
    currency,
    creator_earnings_amount: earnings,
    fulfilled_at: shippedDaysAgo === null ? null : ago(shippedDaysAgo),
    payout_id: payoutId,
  });
  it("pays orders shipped 30+ days ago, once, grouped by currency", () => {
    expect(
      payableByCurrency(
        [
          order("a", "usd", 1234, 45),
          order("b", "usd", 1000, 30),
          order("c", "usd", 999, 29), // too recent
          order("d", "usd", 500, 60, "paid-before"),
          order("e", "usd", null, 60), // earnings unknown
          order("f", "usd", 500, null), // not shipped
          order("g", "sek", 17793, 40),
        ],
        NOW,
      ),
    ).toEqual([
      { currency: "usd", amount: 2234, orderIds: ["a", "b"] },
      { currency: "sek", amount: 17793, orderIds: ["g"] },
    ]);
  });
  it("sends nothing for a group that earned nothing", () => {
    expect(payableByCurrency([order("a", "usd", 0, 40)], NOW)).toEqual([]);
  });
  it("names the period and the next run", () => {
    expect(payoutPeriod(NOW)).toBe("2026-10");
    expect(new Date(nextPayoutDate(NOW)).toISOString()).toBe(
      "2026-11-01T06:00:00.000Z",
    );
  });
});

describe("deleting an account", () => {
  const o = (
    payment_status: string,
    fulfillment_status: string,
    creator_earnings_amount: number | null = null,
    payout_id: string | null = null,
  ) => ({
    payment_status,
    fulfillment_status,
    creator_earnings_amount,
    payout_id,
  });
  it("is refused while a customer waits or earnings are unpaid", () => {
    expect(
      deletionBlockers([
        o("paid", "manual"),
        o("paid", "fulfilled", 1234),
        o("paid", "fulfilled", 1234, "p1"),
        o("pending_payment", "awaiting_payment"),
      ]),
    ).toEqual([
      "1 order hasn’t shipped yet.",
      "You have earnings from 1 order still to be paid out.",
    ]);
  });
  it("is allowed once everything has shipped and been paid", () => {
    expect(
      deletionBlockers([
        o("paid", "fulfilled", 1234, "p1"),
        o("expired", "awaiting_payment"),
      ]),
    ).toEqual([]);
  });
});

// The run itself, against a small in-memory database and a fake Stripe.
const db = vi.hoisted(() => ({
  creators: [] as Record<string, unknown>[],
  orders: [] as Record<string, unknown>[],
  payouts: [] as Record<string, unknown>[],
  transfer: vi.fn(),
}));
vi.mock("@/lib/payments/stripe", () => ({
  stripeClient: () => ({ transfers: { create: db.transfer } }),
}));
vi.mock("@/lib/supabase/admin", () => {
  type Row = Record<string, unknown>;
  const tables = () =>
    ({
      creators: db.creators,
      orders: db.orders,
      creator_payouts: db.payouts,
    }) as Record<string, Row[]>;
  return {
    check: (error: unknown) => {
      if (error) throw error;
    },
    adminDb: () => ({
      from(table: string) {
        const filters: ((r: Row) => boolean)[] = [];
        let patch: Row | null = null,
          insert: Row | null = null;
        const rows = () =>
          tables()[table].filter((r) => filters.every((f) => f(r)));
        const run = () => {
          if (insert) {
            const row = {
              id: `payout-${db.payouts.length + 1}`,
              status: "pending",
              ...insert,
            };
            tables()[table].push(row);
            return [row];
          }
          const hit = rows();
          if (patch) for (const r of hit) Object.assign(r, patch);
          return hit;
        };
        const chain = {
          select: () => chain,
          eq: (k: string, v: unknown) => (
            filters.push((r) => r[k] === v),
            chain
          ),
          in: (k: string, v: unknown[]) => (
            filters.push((r) => v.includes(r[k])),
            chain
          ),
          is: (k: string, v: unknown) => (
            filters.push((r) => (r[k] ?? null) === v),
            chain
          ),
          not: (k: string, _op: string, v: unknown) => (
            filters.push((r) => (r[k] ?? null) !== v),
            chain
          ),
          update: (values: Row) => ((patch = values), chain),
          insert: (values: Row) => ((insert = values), chain),
          single: async () => ({ data: run()[0] ?? null, error: null }),
          maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: run(), error: null }).then(resolve),
        };
        return chain;
      },
    }),
  };
});
import { runPayouts } from "@/lib/payouts/run";

describe("the monthly run", () => {
  const paidOrder = (id: string, earnings: number, shippedDaysAgo: number) => ({
    id,
    creator_id: "c1",
    currency: "usd",
    payment_status: "paid",
    fulfillment_status: "fulfilled",
    creator_earnings_amount: earnings,
    fulfilled_at: ago(shippedDaysAgo),
    payout_id: null,
  });
  beforeEach(() => {
    db.creators.splice(0, Infinity, {
      id: "c1",
      stripe_account_id: "acct_1",
      payouts_status: "enabled",
    });
    db.orders.splice(
      0,
      Infinity,
      paidOrder("o1", 1234, 40),
      paidOrder("o2", 1000, 35),
      paidOrder("o3", 900, 5),
    );
    db.payouts.splice(0, Infinity);
    db.transfer.mockReset();
    db.transfer.mockResolvedValue({ id: "tr_1" });
  });
  it("sends one transfer for what's due and marks those orders", async () => {
    const results = await runPayouts(NOW);
    expect(results).toEqual([
      { creatorId: "c1", currency: "usd", amount: 2234, status: "paid" },
    ]);
    expect(db.transfer).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 2234,
        currency: "usd",
        destination: "acct_1",
      }),
      { idempotencyKey: "payout:payout-1:2234" },
    );
    expect(db.orders.map((o) => o.payout_id)).toEqual([
      "payout-1",
      "payout-1",
      null,
    ]);
    expect(db.payouts[0]).toMatchObject({
      status: "paid",
      stripe_transfer_id: "tr_1",
      amount: 2234,
    });
  });
  it("pays nothing twice when run again", async () => {
    await runPayouts(NOW);
    await runPayouts(NOW);
    expect(db.transfer).toHaveBeenCalledTimes(1);
  });
  it("releases the orders when a transfer fails, for the next run", async () => {
    db.transfer.mockRejectedValueOnce(new Error("Insufficient funds"));
    const [result] = await runPayouts(NOW);
    expect(result).toMatchObject({
      status: "failed",
      reason: "Insufficient funds",
    });
    expect(db.orders.every((o) => o.payout_id === null)).toBe(true);
    expect(db.payouts[0]).toMatchObject({ status: "failed" });
    // Tried again, the same payout goes through.
    const [retry] = await runPayouts(NOW);
    expect(retry).toMatchObject({ status: "paid", amount: 2234 });
  });
  it("skips creators whose payout account isn't ready", async () => {
    db.creators[0].payouts_status = "pending";
    expect(await runPayouts(NOW)).toEqual([]);
    expect(db.transfer).not.toHaveBeenCalled();
  });
});
