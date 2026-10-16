import "server-only";
import { z } from "zod";
import { required } from "@/lib/config";
import { HttpError } from "@/lib/http";
import {
  gelatoProduct,
  normalizeProduct,
  toMinor,
  type CatalogAttribute,
  type CatalogProduct,
  type UnitCost,
} from "@/lib/products/catalog";
import {
  CURATED,
  SIZE_ATTRIBUTE,
  SIZE_FILTER,
  SIZE_SYSTEMS,
  type SizeSystem,
} from "@/lib/products/curated";
import { MARKETS, type Currency } from "@/lib/currency";

// Gelato's product catalog API: which posters exist, their sizes and what
// they cost to make and deliver. Catalog data changes rarely, so reads are
// cached for a day; searches and quotes are POSTs, which fetch does not cache,
// so they are kept in small in-memory caches instead.
const DAY = 86_400;
const SEARCH_TTL_MS = 60 * 60 * 1000;
const COST_TTL_MS = 12 * 60 * 60 * 1000;

const productBase = () =>
  process.env.GELATO_PRODUCT_API_BASE_URL ??
  "https://product.gelatoapis.com/v3";
const orderBase = () =>
  process.env.GELATO_API_BASE_URL ?? "https://order.gelatoapis.com/v4";

// What creators and customers read: the print partner is never named.
const PRINT_SERVICE_DOWN =
  "Prints can’t be loaded right now. Try again shortly.";
const UNEXPECTED = "Something went wrong loading prints. Try again.";

export const gelatoConfigured = () => Boolean(process.env.GELATO_API_KEY);

async function gelato<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: { method?: "POST"; body?: unknown; base?: string },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${init?.base ?? productBase()}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "X-API-KEY": required("GELATO_API_KEY"),
        "Content-Type": "application/json",
      },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(15_000),
      ...(init?.method ? {} : { next: { revalidate: DAY } }),
    });
  } catch {
    throw new HttpError(502, PRINT_SERVICE_DOWN);
  }
  if (response.status === 404)
    throw new HttpError(404, "That print wasn’t found.");
  if (!response.ok) throw new HttpError(502, PRINT_SERVICE_DOWN);
  // Gelato's responses have drifted from its docs before; a shape we don't
  // expect is Gelato's problem to report, not the creator's input.
  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error(
      JSON.stringify({
        event: "gelato_unexpected_response",
        path: path.split("?")[0],
        issues: parsed.error.issues.slice(0, 3).map((i) => i.path.join(".")),
      }),
    );
    throw new HttpError(502, UNEXPECTED);
  }
  return parsed.data;
}

// Posters and framed posters: the artwork pipeline makes flat portrait
// prints, which is what these catalogs sell. In this order in the dialog.
const CATALOGS = ["posters", "framed-posters"];
// Every catalog lists each product twice: under Gelato's original model, with
// legacy uids and paper names, and under a "geo simplified" model with clean
// uids and unified attributes. Only the second is offered, so each print
// appears once and the filters line up with its attributes.
const MODEL = /geo_simplified/;

const catalogList = z.object({
  data: z.array(z.object({ catalogUid: z.string(), title: z.string() })),
});
export async function listCatalogs() {
  const { data } = await gelato("/catalogs", catalogList);
  return CATALOGS.flatMap((uid) => {
    const catalog = data.find((c) => c.catalogUid === uid);
    return catalog ? [{ uid, title: catalog.title }] : [];
  });
}

export async function assertCatalog(uid: string) {
  if (!(await listCatalogs()).some((c) => c.uid === uid))
    throw new HttpError(400, "That catalog is not available.");
}

const value = z.object({
  productAttributeValueUid: z.string(),
  title: z.string(),
});
export async function getCatalogAttributes(
  uid: string,
): Promise<CatalogAttribute[]> {
  const catalog = await gelato(
    `/catalogs/${encodeURIComponent(uid)}`,
    z.object({
      productAttributes: z
        .array(
          z.object({
            productAttributeUid: z.string(),
            title: z.string(),
            // Usually a list, but some attributes come as an object keyed
            // by value uid.
            values: z
              .union([z.array(value), z.record(z.string(), value)])
              .transform((v) => (Array.isArray(v) ? v : Object.values(v))),
          }),
        )
        .default([]),
    }),
  );
  return catalog.productAttributes.map((a) => ({
    uid: a.productAttributeUid,
    title: a.title,
    values: a.values.map((v) => ({
      uid: v.productAttributeValueUid,
      title: v.title,
    })),
  }));
}

function productModel(attributes: CatalogAttribute[]) {
  return attributes
    .find((a) => a.uid === "ProductModel")
    ?.values.filter((v) => MODEL.test(v.uid))
    .map((v) => v.uid);
}

// The curated part of a catalog (lib/products/curated.ts), narrowed further
// by what the creator picked. Small enough to come back in one page. Costs
// are fetched per print by the dialog, so the grid shows without waiting on
// two dozen quotes.
const searches = new Map<string, { at: number; value: CatalogProduct[] }>();
export async function searchCatalog(
  uid: string,
  filters: Record<string, string[]>,
) {
  const key = JSON.stringify([uid, filters]);
  const hit = searches.get(key);
  if (hit && Date.now() - hit.at < SEARCH_TTL_MS) return hit.value;
  const attributes = await getCatalogAttributes(uid);
  const model = productModel(attributes);
  const curated = CURATED[uid] ?? {};
  // A creator's pick can only narrow the curated values, never widen them.
  const narrowed = Object.fromEntries(
    Object.entries(curated).map(([attribute, allowed]) => {
      const picked = filters[attribute]?.filter((v) => allowed.includes(v));
      return [attribute, picked?.length ? picked : allowed];
    }),
  );
  // The size-system filter picks which sizes to include.
  const systems = (filters[SIZE_FILTER] ?? []).filter(
    (s): s is SizeSystem => s in SIZE_SYSTEMS,
  );
  const sizeAttribute = SIZE_ATTRIBUTE[uid];
  if (systems.length && sizeAttribute && narrowed[sizeAttribute])
    narrowed[sizeAttribute] = narrowed[sizeAttribute].filter((v) =>
      systems.some((system) => SIZE_SYSTEMS[system].includes(v)),
    );
  const result = await gelato(
    `/catalogs/${encodeURIComponent(uid)}/products:search`,
    z.object({ products: z.array(gelatoProduct).default([]) }),
    {
      method: "POST",
      body: {
        attributeFilters: {
          ...narrowed,
          Orientation: ["ver"],
          ProductStatus: ["activated"],
          ...(model?.length ? { ProductModel: model } : {}),
        },
        limit: 100,
      },
    },
  );
  const value = result.products
    .flatMap((p) => normalizeProduct(p, uid, attributes) ?? [])
    // Gelato sorts by uid, which puts 70×100 cm before 30×40 cm; smallest
    // first reads as a size range.
    .sort(
      (a, b) =>
        a.widthMm * a.heightMm - b.widthMm * b.heightMm ||
        a.details.localeCompare(b.details),
    );
  searches.set(key, { at: Date.now(), value });
  return value;
}

// One product, checked on the server before it is saved: the size and
// details come from Gelato, never from the browser.
export async function getCatalogProduct(catalog: string, productUid: string) {
  await assertCatalog(catalog);
  const [raw, attributes] = await Promise.all([
    gelato(`/products/${encodeURIComponent(productUid)}`, gelatoProduct),
    getCatalogAttributes(catalog),
  ]);
  const product = normalizeProduct(raw, catalog, attributes);
  const curated = Object.entries(CURATED[catalog] ?? {}).every(
    ([attribute, allowed]) => allowed.includes(raw.attributes[attribute]),
  );
  if (!product || !curated)
    throw new HttpError(400, "That product isn’t offered here.");
  return product;
}

// A made-up address in each market, used only to ask Gelato what delivery
// costs there; quotes create nothing.
const QUOTE_ADDRESSES: Record<string, Record<string, string>> = {
  US: {
    addressLine1: "350 5th Ave",
    city: "New York",
    state: "NY",
    postCode: "10118",
  },
  SE: {
    addressLine1: "Drottninggatan 1",
    city: "Stockholm",
    postCode: "11151",
  },
  DE: {
    addressLine1: "Unter den Linden 1",
    city: "Berlin",
    postCode: "10117",
  },
};
const quote = z.object({
  quotes: z
    .array(
      z.object({
        products: z.array(
          z.object({ price: z.coerce.number(), currency: z.string() }),
        ),
        shipmentMethods: z
          .array(
            z.object({
              price: z.coerce.number(),
              currency: z.string(),
              type: z.string().optional(),
            }),
          )
          .default([]),
      }),
    )
    .min(1),
});
const costs = new Map<string, { at: number; value: UnitCost }>();
// What one print costs to make and deliver, in the store's currency and to
// its market, in minor units. Shipping is the cheapest home delivery,
// falling back to the cheapest of any kind (pick-up points).
export async function getUnitCost(
  productUid: string,
  currency: Currency,
): Promise<UnitCost> {
  const key = `${currency}:${productUid}`;
  const hit = costs.get(key);
  if (hit && Date.now() - hit.at < COST_TTL_MS) return hit.value;
  const value = await getOrderCost([{ productUid, quantity: 1 }], currency);
  costs.set(key, { at: Date.now(), value });
  return value;
}

// What a whole order costs to make and deliver: every print at its quantity,
// and shipping once, as the printer charges it for one parcel.
export async function getOrderCost(
  items: { productUid: string; quantity: number }[],
  currency: Currency,
): Promise<UnitCost> {
  // Delivered within the currency's market: dollars ship in the US, euros
  // are quoted for Germany.
  const shippingCountry = MARKETS[currency].quoteCountry;
  const address = QUOTE_ADDRESSES[shippingCountry];
  if (!address) {
    let print = 0;
    for (const item of items) {
      const unit = await getPrintCost(item.productUid, currency);
      if (!unit) throw new HttpError(502, "This print has no price right now.");
      print += unit.amount * item.quantity;
    }
    return { print, shipping: null, total: print };
  }
  const { quotes } = await gelato("/orders:quote", quote, {
    method: "POST",
    base: orderBase(),
    body: {
      orderReferenceId: "price-check",
      customerReferenceId: "price-check",
      currency: currency.toUpperCase(),
      allowMultipleQuotes: false,
      recipient: {
        country: shippingCountry,
        firstName: "Price",
        lastName: "Check",
        email: "price-check@example.com",
        ...address,
      },
      products: items.map((item, i) => ({
        itemReferenceId: `item-${i}`,
        productUid: item.productUid,
        quantity: item.quantity,
      })),
    },
  });
  // A quote's product price is for its whole line, quantity included. The
  // printer may split an order into several shipments, each its own quote.
  let print = 0,
    shipping: number | null = 0;
  for (const q of quotes) {
    if (!q.products.length) throw new HttpError(502, UNEXPECTED);
    print += q.products.reduce((sum, p) => sum + p.price, 0);
    const methods = q.shipmentMethods
      .filter((m) => m.currency.toLowerCase() === currency)
      .sort((a, b) => a.price - b.price);
    const cheapest = (methods.find((m) => m.type === "normal") ?? methods[0])
      ?.price;
    shipping =
      cheapest === undefined || shipping === null ? null : shipping + cheapest;
  }
  return {
    print: toMinor(print),
    shipping: shipping === null ? null : toMinor(shipping),
    total: toMinor(print + (shipping ?? 0)),
  };
}

// What Gelato charges to print one, in the store's currency and shipping
// country, in minor units. Excludes shipping.
export async function getPrintCost(productUid: string, currency: Currency) {
  const params = new URLSearchParams({
    country: MARKETS[currency].quoteCountry,
    currency: currency.toUpperCase(),
  });
  const prices = await gelato(
    `/products/${encodeURIComponent(productUid)}/prices?${params}`,
    z.array(
      z.object({
        quantity: z.coerce.number(),
        price: z.coerce.number(),
        currency: z.string(),
      }),
    ),
  );
  const single = prices
    .filter((p) => p.currency.toLowerCase() === currency)
    .sort((a, b) => a.quantity - b.quantity)[0];
  if (!single) return null;
  // Tiers may start above one; the per-unit price is what one poster costs.
  return {
    amount: toMinor(single.price / single.quantity),
    currency,
  };
}
