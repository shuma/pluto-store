import { z } from "zod";
import { VALUE_LABELS } from "./curated";
import { MARKETS, type Currency } from "@/lib/currency";
import { payout } from "@/lib/fees";
// Pure helpers for turning Gelato's catalog into products a creator can sell.
// Kept free of server-only imports so the dialog and the tests can share them.

export type CatalogAttribute = {
  uid: string;
  title: string;
  values: { uid: string; title: string }[];
};
export type CatalogProduct = {
  productUid: string;
  catalog: string;
  widthMm: number;
  heightMm: number;
  // A readable size, "30 × 40 cm".
  size: string;
  // The choices that set this product apart, "Matte paper · Black frame".
  details: string;
  // Attribute title → value title, for display on the product later.
  attributes: Record<string, string>;
};
// Minor units in the store currency. Shipping is the cheapest home delivery to
// the store's shipping country, or null when it couldn't be quoted.
export type UnitCost = {
  print: number;
  shipping: number | null;
  total: number;
};

// The attributes a creator chooses between, with names they would use. Gelato
// lists many more (orientation, status, coating, legacy duplicates of paper
// and size), but they are either fixed for every poster here or repeat what
// the size already says. Each one filters the catalog and describes a product.
export const FEATURES: Record<string, string> = {
  UnifiedPaperType: "Paper",
  FrameColor: "Frame colour",
};
// Gelato's paper names carry a US weight too: "250 gsm / 100 lb cover
// uncoated off white archival" reads as "250 gsm uncoated off white archival".
export function valueTitle(attribute: string, uid: string, title: string) {
  const clean =
    VALUE_LABELS[uid] ??
    title.replace(/\s*\/\s*\d+\s*lb(\s+(cover|text))?/i, "").trim();
  const text = clean.charAt(0).toUpperCase() + clean.slice(1);
  return attribute === "FrameColor" ? `${text} frame` : text;
}
// Generated artwork is portrait at roughly ISO proportions (0.707), and print
// preparation centre-crops to the product's shape. Beyond this band the crop
// would cut away too much of the picture.
export const MIN_ASPECT = 0.65;
// 8 × 10 and 16 × 20 in are exactly 0.8; the headroom keeps float rounding
// from dropping them.
export const MAX_ASPECT = 0.801;

const dimension = z.object({
  value: z.coerce.number().positive(),
  measureUnit: z.string(),
});
export const gelatoProduct = z.object({
  productUid: z.string().min(1),
  attributes: z.record(z.string(), z.string()).default({}),
  dimensions: z
    .object({ Width: dimension.optional(), Height: dimension.optional() })
    .partial()
    .default({}),
});
export type GelatoProduct = z.infer<typeof gelatoProduct>;

export function toMm({ value, measureUnit }: z.infer<typeof dimension>) {
  const unit = measureUnit.toLowerCase();
  if (unit === "cm") return value * 10;
  if (unit === "in" || unit === "inch" || unit === "inches")
    return value * 25.4;
  return value;
}

// US sizes are whole inches (12 × 16 in is 304.8 × 406.4 mm); every metric
// size we sell is not. So a size reads in the unit it was made in.
export function isInches(widthMm: number, heightMm: number) {
  const whole = (mm: number) =>
    Math.abs(mm / 25.4 - Math.round(mm / 25.4)) < 0.01;
  return whole(widthMm) && whole(heightMm);
}
export function formatSize(widthMm: number, heightMm: number) {
  if (isInches(widthMm, heightMm))
    return `${Math.round(widthMm / 25.4)} × ${Math.round(heightMm / 25.4)} in`;
  const cm = (mm: number) => Number((mm / 10).toFixed(1)).toString();
  return `${cm(widthMm)} × ${cm(heightMm)} cm`;
}

export function fitsArtwork(widthMm: number, heightMm: number) {
  const ratio = widthMm / heightMm;
  return ratio >= MIN_ASPECT && ratio <= MAX_ASPECT;
}

// A Gelato product in the terms a creator thinks in, or null when it cannot be
// sold here: not activated, missing a size, or the wrong shape for artwork.
export function normalizeProduct(
  raw: GelatoProduct,
  catalog: string,
  attributes: CatalogAttribute[],
): CatalogProduct | null {
  const status = raw.attributes.ProductStatus;
  if (status && status !== "activated") return null;
  const { Width, Height } = raw.dimensions;
  if (!Width || !Height) return null;
  const widthMm = toMm(Width),
    heightMm = toMm(Height);
  if (!fitsArtwork(widthMm, heightMm)) return null;
  const readable: Record<string, string> = {};
  for (const [uid, label] of Object.entries(FEATURES)) {
    const valueUid = raw.attributes[uid];
    if (!valueUid) continue;
    const value = attributes
      .find((a) => a.uid === uid)
      ?.values.find((v) => v.uid === valueUid);
    readable[label] = valueTitle(uid, valueUid, value?.title ?? valueUid);
  }
  return {
    productUid: raw.productUid,
    catalog,
    widthMm,
    heightMm,
    size: formatSize(widthMm, heightMm),
    details: Object.values(readable).join(" · "),
    attributes: readable,
  };
}

export function isFramed(catalog: string | null | undefined) {
  return Boolean(catalog && /frame/i.test(catalog));
}

// The kinds of thing a store can turn a photo into, in the order the
// storefront names them. Each label reads after "Turn your photo into a".
export const PRODUCT_KINDS = [
  { kind: "poster", label: "poster" },
  { kind: "print", label: "mini print" },
  { kind: "framed", label: "framed print" },
  { kind: "canvas", label: "canvas" },
  { kind: "tshirt", label: "t-shirt" },
  { kind: "digital", label: "digital download" },
] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number]["kind"];

// Products without a catalog predate catalogs and are all posters. A poster
// too small to hang (13 × 18 cm, 5 × 7 in) is a mini print, for the fridge.
export function productKind(
  catalog: string | null | undefined,
  widthMm?: number,
  heightMm?: number,
): ProductKind {
  if (isFramed(catalog)) return "framed";
  if (catalog && /canvas/i.test(catalog)) return "canvas";
  if (catalog && /shirt|apparel|tee/i.test(catalog)) return "tshirt";
  if (catalog && /digital/i.test(catalog)) return "digital";
  if (widthMm && heightMm && isMini(widthMm, heightMm)) return "print";
  return "poster";
}

// Smaller than A5 (148 × 210 mm): photo-print sizes rather than posters.
export function isMini(widthMm: number, heightMm: number) {
  return widthMm * heightMm < 30_000;
}

// How big a print feels, by area, so names say something the size line
// doesn't: 13 × 18 cm is mini, A4 and 8 × 10 in are small, 70 × 100 cm and
// 24 × 36 in extra large.
export function sizeTier(widthMm: number, heightMm: number) {
  const area = widthMm * heightMm;
  if (isMini(widthMm, heightMm)) return "Mini";
  if (area < 90_000) return "Small";
  if (area < 200_000) return "Medium";
  if (area < 400_000) return "Large";
  return "Extra large";
}

// A starting name: "Medium poster", "Large framed print", "Mini print". The
// size is shown beside the name everywhere, so it isn't repeated in it.
export function defaultTitle(
  product: Pick<CatalogProduct, "catalog" | "widthMm" | "heightMm">,
) {
  const { catalog, widthMm, heightMm } = product;
  const noun = isFramed(catalog)
    ? "framed print"
    : isMini(widthMm, heightMm)
      ? "print"
      : "poster";
  return `${sizeTier(widthMm, heightMm)} ${noun}`;
}

// The size to show beside a product's name, unless the name already says it
// (products named before sizes were shown separately, "Poster 50 × 70 cm").
export function sizeBesideName(
  name: string,
  widthMm: number,
  heightMm: number,
) {
  const size = formatSize(widthMm, heightMm);
  return name.includes(size) ? null : size;
}

// One print in the picker per size: the paper (and for framed prints, the
// frame colour picked above) is chosen afterwards. Variants keep Gelato's
// order within a size, matte paper first.
export type SizeGroup = {
  key: string;
  catalog: string;
  size: string;
  widthMm: number;
  heightMm: number;
  variants: CatalogProduct[];
};
export function groupBySize(products: CatalogProduct[]): SizeGroup[] {
  const groups = new Map<string, SizeGroup>();
  for (const p of products) {
    const key = `${p.catalog}:${p.widthMm}x${p.heightMm}`;
    const group = groups.get(key) ?? {
      key,
      catalog: p.catalog,
      size: p.size,
      widthMm: p.widthMm,
      heightMm: p.heightMm,
      variants: [],
    };
    group.variants.push(p);
    groups.set(key, group);
  }
  for (const group of groups.values())
    group.variants.sort(
      (a, b) =>
        Number(b.attributes.Paper === "Matte paper") -
        Number(a.attributes.Paper === "Matte paper"),
    );
  return [...groups.values()];
}

// Prices are entered in major units ("249") and stored in minor units, like
// Stripe. Every currency the store supports has two decimals.
export function toMinor(major: number) {
  return Math.round(major * 100);
}
export function toMajor(minor: number) {
  return minor / 100;
}

// A starting price for a product: the lowest shop-style price for the
// currency ($29.99, 449 kr) at which the creator earns at least what the
// print costs to make and deliver, after Pluto's fee and card processing.
// Roughly half of what is left after printing goes to them.
export function suggestPrice(totalCost: number, currency: Currency) {
  const { step, ending } = MARKETS[currency];
  let price = Math.max(1, Math.ceil((totalCost * 2) / step)) * step - ending;
  while (payout(price, totalCost, currency).earnings < totalCost) price += step;
  return price;
}
