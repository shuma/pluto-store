// Sample orders for the demo store, so the orders page has something to show.
//
//   pnpm seed:orders            add them (again: re-running replaces them)
//   pnpm seed:orders --remove   delete them
//
// Every row has a fixed id with 5eed in it, customers use @example.com,
// and nothing is left "pending": the only states that send an order to print
// are never used, so a sample can't reach the printer.
import { createHash } from "node:crypto";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PRODUCT_WITH_PRICES, productRow } from "../lib/domain";
import { platformFee } from "../lib/fees";
import type { Currency } from "../lib/currency";
nextEnv.loadEnvConfig(process.cwd());
const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .parse(process.env);
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const must = <T>(result: { data: T; error: unknown }) => {
  if (result.error) throw result.error;
  return result.data;
};

const COUNT = 20;
// Fixed, so re-running replaces the same rows and --remove finds them, but
// varied at the start, which is the part the orders page shows (#A3F9…).
// The rest marks them as samples: 5eed.
const id = (group: number, n: number) => {
  const hex = createHash("sha256").update(`sample-${group}-${n}`).digest("hex");
  return `${hex.slice(0, 8)}-5eed-4000-8000-${group}${String(n).padStart(11, "0")}`;
};
const SESSION = id(1, 0),
  ROUND = id(2, 0);
const orderIds = Array.from({ length: COUNT }, (_, n) => id(0, n));
const artworkIds = Array.from({ length: COUNT }, (_, n) => id(3, n));

async function remove() {
  // Their items go with them.
  must(await db.from("orders").delete().in("id", orderIds));
  must(await db.from("generated_artworks").delete().in("id", artworkIds));
  must(await db.from("generation_rounds").delete().eq("id", ROUND));
  must(await db.from("generation_sessions").delete().eq("id", SESSION));
}

await remove();
if (process.argv.includes("--remove")) {
  console.log("Removed the sample orders.");
  process.exit(0);
}

const store = must(
  await db
    .from("creators")
    .select("id,currency")
    .eq("slug", "high-elf-club")
    .single(),
) as { id: string; currency: Currency };
const products = productRow
  .array()
  .parse(
    must(
      await db
        .from("products")
        .select(PRODUCT_WITH_PRICES)
        .eq("creator_id", store.id)
        .eq("active", true),
    ),
  )
  .filter((p) => p.prices[store.currency] !== undefined);
if (!products.length)
  throw new Error(
    `The demo store has no active ${store.currency.toUpperCase()} products to order.`,
  );

// Customers in the store's market: the US for dollars, Sweden for kronor.
const CUSTOMERS =
  store.currency === "usd"
    ? [
        ["Maya Johnson", "412 Maple Ave", "Portland", "97205", "OR"],
        ["Daniel Reyes", "88 Harbor St", "San Diego", "92101", "CA"],
        ["Priya Shah", "1500 Lake Shore Dr", "Chicago", "60610", "IL"],
        ["Owen Carter", "27 Elm St", "Burlington", "05401", "VT"],
        ["Sofia Martinez", "903 Pecan Rd", "Austin", "78704", "TX"],
        ["Liam O’Connor", "15 Beacon St", "Boston", "02108", "MA"],
        ["Hannah Kim", "620 Pine St", "Seattle", "98101", "WA"],
        ["Marcus Bell", "44 Peachtree Pl", "Atlanta", "30309", "GA"],
        ["Grace Liu", "210 Grand St", "New York", "10013", "NY"],
        ["Noah Fischer", "7 Cedar Ln", "Denver", "80203", "CO"],
      ]
    : [
        ["Elsa Lindqvist", "Götgatan 14", "Stockholm", "11646", null],
        ["Oskar Berg", "Linnégatan 3", "Göteborg", "41304", null],
        ["Maja Holm", "Storgatan 22", "Uppsala", "75331", null],
        ["Erik Nyström", "Södra Förstadsgatan 8", "Malmö", "21143", null],
        ["Ines Karlsson", "Drottninggatan 51", "Norrköping", "60232", null],
        ["Leo Andersson", "Kungsgatan 9", "Umeå", "90326", null],
        ["Alva Sjöberg", "Västra Hamngatan 2", "Göteborg", "41117", null],
        ["Hugo Ek", "Stora Torget 4", "Linköping", "58223", null],
        ["Freja Lund", "Bergsgatan 17", "Örebro", "70210", null],
        ["Axel Dahl", "Hamngatan 6", "Luleå", "97231", null],
      ];
// Mostly finished orders, as a real store would have, with some in every
// other state. Never "pending" (see the top of the file).
const STATES: [string, string][] = [
  ...Array<[string, string]>(8).fill(["paid", "fulfilled"]),
  ...Array<[string, string]>(3).fill(["paid", "submitted"]),
  ...Array<[string, string]>(4).fill(["paid", "manual"]),
  ["paid", "needs_review"],
  ["paid", "fulfillment_failed"],
  ["pending_payment", "awaiting_payment"],
  ["pending_payment", "awaiting_payment"],
  ["expired", "awaiting_payment"],
];
const NOTES: Record<number, string> = {
  2: "Asked if it can arrive before the 12th. Told them yes.",
  6: "Repeat customer, second print.",
  12: "Gift. Customer asked for no receipt in the parcel.",
};

must(
  await db.from("generation_sessions").insert({
    id: SESSION,
    creator_id: store.id,
    session_token: "sample",
    source_image_path: "samples/source.jpg",
    status: "completed",
    round_count: 1,
  }),
);
must(
  await db.from("generation_rounds").insert({
    id: ROUND,
    generation_session_id: SESSION,
    round_number: 1,
    status: "completed",
  }),
);
must(
  await db.from("generated_artworks").insert(
    artworkIds.map((artworkId) => ({
      id: artworkId,
      generation_session_id: SESSION,
      creator_id: store.id,
      round_id: ROUND,
      storage_path: "samples/preview.webp",
      original_storage_path: "samples/original.png",
      provider: "sample",
      model: "sample",
      width_px: 2416,
      height_px: 3424,
      selected: true,
    })),
  ),
);
const DAY = 86_400_000;
// What each sample order bought: one print, and every fourth order a second
// size in two copies, so the dashboard shows carts too.
const orderLines = (n: number) => [
  { product: products[n % products.length], quantity: 1 },
  ...(n % 4 === 3 && products.length > 1
    ? [{ product: products[(n + 1) % products.length], quantity: 2 }]
    : []),
];
must(
  await db.from("orders").insert(
    orderIds.map((orderId, n) => {
      const [payment, fulfillment] = STATES[n];
      const lines = orderLines(n);
      const amount = lines.reduce(
        (sum, l) => sum + l.product.prices[store.currency]! * l.quantity,
        0,
      );
      const paid = payment === "paid";
      const [name, line1, city, postal_code, state] =
        CUSTOMERS[n % CUSTOMERS.length];
      // Newest first, over the last two months; unpaid ones are recent.
      const ageDays = paid ? n * 3 + 1 : n - 16;
      return {
        id: orderId,
        creator_id: store.id,
        generation_session_id: SESSION,
        customer_name: paid ? name : null,
        customer_email: paid
          ? `${name!.split(" ")[0].toLowerCase()}@example.com`
          : null,
        shipping_address: paid
          ? {
              line1,
              line2: null,
              city,
              postal_code,
              state,
              country: store.currency === "usd" ? "US" : "SE",
            }
          : null,
        currency: store.currency,
        amount_total: amount,
        platform_fee_amount: platformFee(amount, store.currency),
        payment_status: payment,
        fulfillment_status: fulfillment,
        stripe_checkout_session_id: `cs_sample_${n}`,
        gelato_order_id: ["submitted", "fulfilled"].includes(fulfillment)
          ? `sample-${n}`
          : null,
        fulfillment_error:
          fulfillment === "needs_review" || fulfillment === "fulfillment_failed"
            ? "Sample order: nothing was sent to print."
            : null,
        creator_note: NOTES[n] ?? null,
        created_at: new Date(
          Date.now() - Math.max(ageDays, 0) * DAY - n * 3_600_000,
        ).toISOString(),
      };
    }),
  ),
);
must(
  await db.from("order_items").insert(
    orderIds.flatMap((orderId, n) =>
      orderLines(n).map(({ product, quantity }) => ({
        order_id: orderId,
        generated_artwork_id: artworkIds[n],
        product_id: product.id,
        product_snapshot: product,
        quantity,
        unit_amount: product.prices[store.currency]!,
        print_storage_path: "samples/print.png",
      })),
    ),
  ),
);
console.log(
  `Added ${COUNT} sample orders to the demo store (${store.currency.toUpperCase()}).`,
);
