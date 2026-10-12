// What stops a creator deleting their account: paid orders that haven't
// shipped (a customer is waiting), and earnings not yet sent to them (Pluto
// still owes them money and needs somewhere to send it).
export type DeletionOrder = {
  payment_status: string;
  fulfillment_status: string;
  creator_earnings_amount: number | null;
  payout_id: string | null;
};
export function deletionBlockers(orders: DeletionOrder[]) {
  const paid = orders.filter((o) => o.payment_status === "paid");
  const unshipped = paid.filter(
    (o) => o.fulfillment_status !== "fulfilled",
  ).length;
  const unpaidEarnings = paid.filter(
    (o) =>
      o.fulfillment_status === "fulfilled" &&
      (o.creator_earnings_amount ?? 0) > 0 &&
      !o.payout_id,
  ).length;
  const reasons: string[] = [];
  if (unshipped)
    reasons.push(
      unshipped === 1
        ? "1 order hasn’t shipped yet."
        : `${unshipped} orders haven’t shipped yet.`,
    );
  if (unpaidEarnings)
    reasons.push(
      unpaidEarnings === 1
        ? "You have earnings from 1 order still to be paid out."
        : `You have earnings from ${unpaidEarnings} orders still to be paid out.`,
    );
  return reasons;
}
