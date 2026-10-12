import "server-only";
import { stripeClient } from "@/lib/payments/stripe";
import { adminDb, check } from "@/lib/supabase/admin";
import { payableByCurrency, payoutPeriod } from "./rules";

// The monthly payout run. For every creator whose payout account can
// receive money, it pays what their orders earned once they shipped at least
// 30 days ago, as one Stripe transfer per currency.
//
// Safe to run again: orders are reserved for a payout before any money
// moves, so two runs can't count them twice; the transfer's idempotency key
// is tied to the payout, so a crash after Stripe accepted it can't send it
// twice; and a failed transfer releases its orders for the next run.
export type PayoutResult = {
  creatorId: string;
  currency: string;
  amount: number;
  status: "paid" | "failed" | "skipped";
  reason?: string;
};

export async function runPayouts(now = Date.now()): Promise<PayoutResult[]> {
  const db = adminDb();
  const period = payoutPeriod(now);
  const { data: creators, error } = await db
    .from("creators")
    .select("id,stripe_account_id")
    .eq("payouts_status", "enabled")
    .not("stripe_account_id", "is", null);
  check(error);
  const results: PayoutResult[] = [];
  for (const creator of creators ?? []) {
    const { data: orders, error: ordersError } = await db
      .from("orders")
      .select("id,currency,creator_earnings_amount,fulfilled_at,payout_id")
      .eq("creator_id", creator.id)
      .eq("payment_status", "paid")
      .eq("fulfillment_status", "fulfilled")
      .is("payout_id", null)
      .not("creator_earnings_amount", "is", null);
    check(ordersError);
    for (const group of payableByCurrency(orders ?? [], now))
      results.push(
        await payGroup(creator.id, creator.stripe_account_id!, period, group),
      );
  }
  return results;
}

async function payGroup(
  creatorId: string,
  accountId: string,
  period: string,
  group: { currency: string; amount: number; orderIds: string[] },
): Promise<PayoutResult> {
  const db = adminDb();
  const base = { creatorId, currency: group.currency };
  // This month's payout for the currency: new, or one that failed earlier
  // in the month. One already paid this month waits for next month.
  const { data: existing, error } = await db
    .from("creator_payouts")
    .select("id,status")
    .eq("creator_id", creatorId)
    .eq("period", period)
    .eq("currency", group.currency)
    .maybeSingle();
  check(error);
  if (existing?.status === "paid")
    return { ...base, amount: 0, status: "skipped", reason: "already_paid" };
  let payoutId = existing?.id;
  if (!payoutId) {
    const { data: created, error: insertError } = await db
      .from("creator_payouts")
      .insert({
        creator_id: creatorId,
        period,
        currency: group.currency,
        amount: group.amount,
        order_count: group.orderIds.length,
      })
      .select("id")
      .single();
    check(insertError);
    payoutId = created!.id;
  }
  // Reserve the orders; only those still free count, in case another run
  // got to some first.
  const { data: reserved, error: reserveError } = await db
    .from("orders")
    .update({ payout_id: payoutId })
    .in("id", group.orderIds)
    .is("payout_id", null)
    .select("id,creator_earnings_amount");
  check(reserveError);
  const amount = (reserved ?? []).reduce(
    (sum, o) => sum + (o.creator_earnings_amount ?? 0),
    0,
  );
  if (!reserved?.length || amount <= 0) {
    await release(payoutId);
    return { ...base, amount: 0, status: "skipped", reason: "nothing_left" };
  }
  try {
    const transfer = await stripeClient().transfers.create(
      {
        amount,
        currency: group.currency,
        destination: accountId,
        transfer_group: payoutId,
        description: `Pluto earnings, ${period}`,
        metadata: { payout_id: payoutId, creator_id: creatorId, period },
      },
      // Tied to the payout and amount: a retry after a crash returns the
      // transfer Stripe already made instead of making another.
      { idempotencyKey: `payout:${payoutId}:${amount}` },
    );
    const { error: paidError } = await db
      .from("creator_payouts")
      .update({
        status: "paid",
        amount,
        order_count: reserved.length,
        stripe_transfer_id: transfer.id,
        failure_reason: null,
      })
      .eq("id", payoutId);
    check(paidError);
    return { ...base, amount, status: "paid" };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "transfer_failed";
    await release(payoutId, reason);
    return { ...base, amount, status: "failed", reason };
  }
}

// Frees a payout's orders for the next run and records why it didn't go.
async function release(payoutId: string, reason?: string) {
  const db = adminDb();
  check(
    (
      await db
        .from("orders")
        .update({ payout_id: null })
        .eq("payout_id", payoutId)
    ).error,
  );
  check(
    (
      await db
        .from("creator_payouts")
        .update({
          status: "failed",
          failure_reason: reason ?? "nothing_to_pay",
        })
        .eq("id", payoutId)
    ).error,
  );
}
