import type { Product } from "@/lib/domain";
import { isFramed } from "./catalog";
import { ARCHIVAL, MATTE, VALUE_LABELS } from "./curated";
import { EU_COUNTRIES, MARKETS, type Currency } from "@/lib/currency";
// What a customer reads about a print before buying: its features, how to
// care for it and the EU product-safety (GPSR) information. Every fact is the
// print partner's own spec for that paper and frame (Gelato, checked
// 2026-10-05); a product we can't place gets only what holds for every print.

export type ProductDetails = {
  // One line for the size card: what the print is made of, or null when
  // we can't place the paper.
  summary: string | null;
  features: string[];
  // True when the paper is one we know is FSC-certified (or equivalent).
  certifiedPaper: boolean;
  // What shipping costs and where it goes.
  delivery: string;
  care: string[];
  safety: { label: string; value: string }[];
};

const PAPER_FEATURES: Record<string, string[]> = {
  [MATTE]: [
    "Premium 200 gsm (80 lb) uncoated paper, 0.26 mm thick",
    "Smooth, non-reflective matte finish",
    "Acid-free paper, buffered against yellowing over time",
    "FSC-certified paper or equivalent",
  ],
  [ARCHIVAL]: [
    "Museum-quality 250 gsm (110 lb) archival paper, 0.29 mm thick",
    "Natural white, uncoated matte finish",
    "Acid-free (pH above 7) to prevent yellowing over time",
    "FSC-certified paper",
  ],
};
const PAPER_SUMMARY: Record<string, string> = {
  [MATTE]: "200 gsm matte paper · acid-free",
  [ARCHIVAL]: "250 gsm archival paper · acid-free",
};
const FRAME_FEATURES = [
  "Pine wood frame, 20–25 mm deep",
  "Shatterproof plexiglass front",
  "Delivered in the frame, with hanging hardware included",
];

const POSTER_CARE = [
  "If the poster gathers dust, wipe it gently with a clean, dry cloth.",
  "Keep it out of direct sunlight and away from damp to preserve the colours.",
];
const FRAME_CARE = [
  "Dust the frame and plexiglass with a soft, dry cloth; don’t use solvents or glass cleaner.",
  "Keep it out of direct sunlight and away from damp to preserve the colours.",
];

// Gelato's EU responsible person. Confirm against Gelato's GPSR article
// before changing it.
const SAFETY = [
  {
    label: "Manufacturer and EU responsible person",
    value:
      "Gelato Estonia OÜ, Rotermanni 6, 10111 Tallinn, Estonia, support@gelato.com",
  },
  { label: "Warnings", value: "No special hazards" },
  {
    label: "Warranty",
    value: "Covered by the legal guarantee under EU consumer law",
  },
];

// GPSR covers sales into the EU. Checkout ships only within the market of
// the currency paid in, so that currency says whether the buyer is there; a
// customer paying in dollars gets no EU notice (or EU warranty claim) that
// isn't theirs.
const sellsInEu = (currency: Currency) =>
  MARKETS[currency].countries.some((c) =>
    (EU_COUNTRIES as readonly string[]).includes(c),
  );

// The paper is part of the product uid; products saved with readable
// attributes say it there too. Older products have neither.
function paper(product: Product) {
  const uid = product.gelato_product_uid ?? "";
  for (const value of [MATTE, ARCHIVAL]) if (uid.includes(value)) return value;
  const label = product.gelato_attributes.Paper;
  return [MATTE, ARCHIVAL].find((value) => VALUE_LABELS[value] === label);
}

// Checkout charges no shipping and takes an address only in the market of
// the currency paid in (lib/payments/checkout-params.ts), so that is all
// this says.
const delivery = (currency: Currency) =>
  `Shipping is included in the price. Your print is made to order by a print partner near you and delivered to your door in ${MARKETS[currency].name}.`;

export function productDetails(
  product: Product,
  currency: Currency,
): ProductDetails {
  const framed = isFramed(product.gelato_catalog);
  const paperValue = paper(product);
  const colour = product.gelato_attributes["Frame colour"];
  return {
    summary: paperValue ? PAPER_SUMMARY[paperValue] : null,
    // The size card already says the size and whether it's framed.
    features: [
      ...(paperValue ? PAPER_FEATURES[paperValue] : []),
      ...(framed ? [...(colour ? [colour] : []), ...FRAME_FEATURES] : []),
    ],
    certifiedPaper: paperValue !== undefined,
    delivery: delivery(currency),
    care: framed ? FRAME_CARE : POSTER_CARE,
    safety: sellsInEu(currency) ? SAFETY : [],
  };
}
