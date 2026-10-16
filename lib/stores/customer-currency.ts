import "server-only";
import { cookies, headers } from "next/headers";
import {
  CURRENCY_COOKIE,
  visitorCurrency,
  type Currency,
} from "@/lib/currency";
import { storeCurrencies, type Product, type Store } from "@/lib/domain";

// The currencies a customer can pay in: the store's, less any it has nothing
// priced in yet, so a currency never opens on an empty store.
export function sellingCurrencies(
  store: Pick<Store, "currency" | "currencies">,
  products: Pick<Product, "prices">[],
): Currency[] {
  const selling = storeCurrencies(store).filter((c) =>
    products.some((p) => p.prices[c] !== undefined),
  );
  return selling.length ? selling : [store.currency];
}

// The currency this customer pays in, from the one they picked (a cookie)
// or the country Vercel places them in. Pages, the cart and checkout all
// ask here, so the price shown is the price charged.
export async function customerCurrency(
  store: Pick<Store, "currency" | "currencies">,
  products: Pick<Product, "prices">[],
) {
  const selling = sellingCurrencies(store, products);
  let picked: string | undefined,
    country: string | null = null;
  try {
    picked = (await cookies()).get(CURRENCY_COOKIE)?.value;
    country = (await headers()).get("x-vercel-ip-country");
  } catch {
    // Outside a request (a script or a test): the store's own currency.
  }
  return {
    currency: visitorCurrency(selling, store.currency, picked, country),
    selling,
  };
}
