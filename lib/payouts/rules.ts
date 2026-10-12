// The rules for paying creators, free of Stripe and the database so they
// can be tested directly. Amounts are in minor units.

// What a creator earns on one order: the price, less Pluto's fee, what it
// cost to print and deliver, and the card processor's fee. Never below
// zero, and unknown (null) when the print cost isn't known, so an order is
// never paid out on a guess.
export function orderEarnings({
  amount,
  platformFee,
  productionCost,
  paymentFee,
}: {
  amount: number;
  platformFee: number | null;
  productionCost: number | null;
  paymentFee: number | null;
}) {
  if (productionCost === null) return null;
  return Math.max(
    0,
    amount - (platformFee ?? 0) - productionCost - (paymentFee ?? 0),
  );
}

// Stripe's fee comes in the platform's settlement currency; the order may
// be in another. The balance transaction's exchange rate converts order
// currency into settlement currency, so dividing by it converts back.
export function feeInOrderCurrency(fee: number, exchangeRate: number | null) {
  return exchangeRate ? Math.round(fee / exchangeRate) : fee;
}

export type PayoutsStatus =
  "not_started" | "pending" | "enabled" | "restricted";

// A Stripe connected account's state, reduced to what a creator needs to
// know: not set up, being checked or needs details, receiving money, or
// blocked.
export function payoutsStatus(account: {
  details_submitted?: boolean;
  payouts_enabled?: boolean;
  capabilities?: { transfers?: string } | null;
  requirements?: {
    disabled_reason?: string | null;
    past_due?: string[] | null;
  } | null;
}): PayoutsStatus {
  if (!account.details_submitted) return "not_started";
  if (account.capabilities?.transfers === "active" && account.payouts_enabled)
    return "enabled";
  if (
    account.requirements?.disabled_reason?.startsWith("rejected") ||
    (account.requirements?.past_due?.length ?? 0) > 0
  )
    return "restricted";
  return "pending";
}

// The orders a monthly run pays: shipped at least `holdDays` ago, with
// known earnings, not paid before. Grouped by currency, since a transfer
// has one.
export type PayableOrder = {
  id: string;
  currency: string;
  creator_earnings_amount: number | null;
  fulfilled_at: string | null;
  payout_id: string | null;
};
export const HOLD_DAYS = 30;
export function payableByCurrency(
  orders: PayableOrder[],
  now: number,
  holdDays = HOLD_DAYS,
) {
  const cutoff = now - holdDays * 86_400_000;
  const groups = new Map<string, { amount: number; orderIds: string[] }>();
  for (const order of orders) {
    if (
      order.payout_id ||
      order.creator_earnings_amount === null ||
      !order.fulfilled_at ||
      Date.parse(order.fulfilled_at) > cutoff
    )
      continue;
    const group = groups.get(order.currency) ?? { amount: 0, orderIds: [] };
    group.amount += order.creator_earnings_amount;
    group.orderIds.push(order.id);
    groups.set(order.currency, group);
  }
  // A group that earned nothing (every order cost more than it sold for)
  // has nothing to send.
  return [...groups.entries()]
    .filter(([, g]) => g.amount > 0)
    .map(([currency, g]) => ({ currency, ...g }));
}

// The month a run pays for, as YYYY-MM in UTC: the month it runs in.
export const payoutPeriod = (now: number) =>
  new Date(now).toISOString().slice(0, 7);

// When the next monthly run happens: the 1st of next month, 06:00 UTC.
export function nextPayoutDate(now: number) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 6);
}
