import { z } from "zod";
// The currencies a store can sell in. A store sells in one or more; each
// product has its own price in each, and customers pay in the one they
// choose. USD is the default for new stores.
export const CURRENCIES = ["usd", "sek", "eur"] as const;
export const DEFAULT_CURRENCY = "usd";
export const currencySchema = z.enum(CURRENCIES);
export type Currency = z.infer<typeof currencySchema>;
// A store's main currency sets the country of its payouts account, so it is
// one with a home country: euros are sold alongside dollars or kronor.
export const MAIN_CURRENCIES = ["usd", "sek"] as const;
export type MainCurrency = (typeof MAIN_CURRENCIES)[number];
export const isMainCurrency = (c: Currency): c is MainCurrency =>
  (MAIN_CURRENCIES as readonly string[]).includes(c);
export const PAYOUT_COUNTRY: Record<MainCurrency, "US" | "SE"> = {
  usd: "US",
  sek: "SE",
};
export const CURRENCY_LABELS: Record<Currency, string> = {
  usd: "US dollar",
  sek: "Swedish krona",
  eur: "Euro",
};
// For sentences: "Customers will pay in Swedish kronor".
export const CURRENCY_PLURALS: Record<Currency, string> = {
  usd: "US dollars",
  sek: "Swedish kronor",
  eur: "euros",
};

export const EU_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
] as const;

// Where each currency sells: checkout ships to `countries`, printing costs
// are quoted for delivery to `quoteCountry`, and customers there see it
// first. Euros ship anywhere in the EU and are quoted for Germany, Gelato's
// largest EU market, so a delivery elsewhere can cost a little more or less
// than the estimate.
export const MARKETS: Record<
  Currency,
  {
    countries: readonly string[];
    quoteCountry: string;
    name: string;
    // Suggested prices round up to a whole `step` and take `ending` off, so
    // they read like shop prices: $24.99, 349 kr. Both in minor units.
    step: number;
    ending: number;
  }
> = {
  usd: {
    countries: ["US"],
    quoteCountry: "US",
    name: "the US",
    step: 500,
    ending: 1,
  },
  sek: {
    countries: ["SE"],
    quoteCountry: "SE",
    name: "Sweden",
    step: 5000,
    ending: 100,
  },
  eur: {
    countries: EU_COUNTRIES,
    quoteCountry: "DE",
    name: "the EU",
    step: 500,
    ending: 1,
  },
};

// The currency a customer pays in: the one they picked, if the store sells
// in it; otherwise their own country's, kronor before euros for a Swede;
// otherwise the store's main currency. `selling` is never empty.
export function visitorCurrency(
  selling: readonly Currency[],
  main: Currency,
  picked: string | undefined,
  country: string | null,
): Currency {
  const choice = currencySchema.safeParse(picked);
  if (choice.success && selling.includes(choice.data)) return choice.data;
  const local = CURRENCIES.filter((c) =>
    country ? MARKETS[c].countries.includes(country) : false,
  );
  return (
    local.find((c) => selling.includes(c)) ??
    (selling.includes(main) ? main : selling[0])
  );
}
// The cookie a customer's pick is kept in, across stores.
export const CURRENCY_COOKIE = "pluto_currency";
