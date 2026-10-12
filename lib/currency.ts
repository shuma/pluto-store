import { z } from "zod";
// The currencies a store can sell in. A store has one; its products are
// priced in it and customers pay in it. USD is the default for new stores.
export const CURRENCIES = ["usd", "sek"] as const;
export const DEFAULT_CURRENCY = "usd";
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;
export const CURRENCY_LABELS: Record<Currency, string> = {
  usd: "US dollar",
  sek: "Swedish krona",
};
// For sentences: "Customers will pay in Swedish kronor".
export const CURRENCY_PLURALS: Record<Currency, string> = {
  usd: "US dollars",
  sek: "Swedish kronor",
};

// Where a store in each currency sells: customers there pay in it, checkout
// ships only there, and costs are quoted for delivery there.
export const MARKETS: Record<
  Currency,
  {
    country: "US" | "SE";
    name: string;
    // Suggested prices round up to a whole `step` and take `ending` off, so
    // they read like shop prices: $24.99, 349 kr. Both in minor units.
    step: number;
    ending: number;
  }
> = {
  usd: { country: "US", name: "the US", step: 500, ending: 1 },
  sek: { country: "SE", name: "Sweden", step: 5000, ending: 100 },
};
