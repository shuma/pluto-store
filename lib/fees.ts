import type { Currency } from "@/lib/currency";
// What comes out of a sale before the creator is paid, besides printing and
// shipping: Pluto's fee, and the card processor's. Amounts in minor units.

// Pluto's share of every sale. It pays for the artwork generated for every
// customer, buyers or not, the storefront and fulfilment. The minimum keeps
// small prints from costing more to make than they bring in.
export const PLATFORM_FEE_RATE = 0.15;
export const PLATFORM_FEE_MINIMUM: Record<Currency, number> = {
  usd: 300,
  sek: 3000,
  eur: 300,
};

// Stripe's standard card pricing in each market, as an estimate: the actual
// fee depends on the card (international and business cards cost more).
const PAYMENT_FEES: Record<Currency, { rate: number; fixed: number }> = {
  usd: { rate: 0.029, fixed: 30 },
  sek: { rate: 0.015, fixed: 180 },
  // EEA cards on Pluto's Swedish account (SEK 1.80 is about €0.16), plus
  // Stripe's 2% for converting euros into the kronor it settles in.
  eur: { rate: 0.035, fixed: 16 },
};

export function platformFee(price: number, currency: Currency) {
  const fee = Math.max(
    Math.round(price * PLATFORM_FEE_RATE),
    PLATFORM_FEE_MINIMUM[currency],
  );
  // Never more than the sale itself.
  return Math.min(fee, price);
}

export function paymentFee(price: number, currency: Currency) {
  const { rate, fixed } = PAYMENT_FEES[currency];
  return Math.round(price * rate) + fixed;
}

// Where the customer's money goes, for one sale at `price` of a print that
// costs `cost` to make and deliver.
export function payout(price: number, cost: number, currency: Currency) {
  const platform = platformFee(price, currency),
    payment = paymentFee(price, currency);
  return { platform, payment, earnings: price - cost - platform - payment };
}

export const feeLabel = () =>
  `Pluto fee (${Math.round(PLATFORM_FEE_RATE * 100)}%)`;
