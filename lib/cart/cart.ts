import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { adminDb, check } from "@/lib/supabase/admin";
import { productRow, type Product } from "@/lib/domain";
import { HttpError } from "@/lib/http";
import { requireSession } from "@/lib/generations/session";
import { cachedSignedUrl } from "@/lib/storage";
import { calculatePrice } from "@/lib/payments/pricing";
import {
  cartAddSchema,
  cartRemoveSchema,
  cartUpdateSchema,
} from "@/lib/validation/schemas";
import { allowedQuantity, cartCount, type CartLine } from "./rules";
// A visit's cart, held by the server so checkout never trusts the browser
// for what is bought or what it costs. A cart is one artwork from this visit,
// in any of the store's products and quantities, priced as each product is
// now. Choosing a print of another artwork starts the cart over.

// What the page shows for one item.
export type CartItem = {
  id: string;
  artworkId: string;
  artworkUrl: string;
  product: Product;
  quantity: number;
  unitAmount: number;
};

const row = z.object({
  id: z.uuid(),
  generated_artwork_id: z.uuid(),
  product_id: z.uuid(),
  quantity: z.number().int(),
  created_at: z.string(),
  products: productRow.nullable(),
  generated_artworks: z
    .object({
      storage_path: z.string(),
      original_storage_path: z.string(),
      status: z.string(),
    })
    .nullable(),
});

async function storeCurrency(creatorId: string) {
  const { data, error } = await adminDb()
    .from("creators")
    .select("currency")
    .eq("id", creatorId)
    .single();
  check(error);
  return z.object({ currency: z.string() }).parse(data).currency;
}

// The visit's items that can still be bought, oldest first, with what checkout
// needs to print them. An item whose product was withdrawn or whose artwork
// is gone is dropped from the cart rather than sold.
export async function cartLines(
  sessionId: string,
  creatorId: string,
  artworkId: string,
) {
  const db = adminDb();
  const [{ data, error }, currency] = await Promise.all([
    db
      .from("cart_items")
      .select(
        "id,generated_artwork_id,product_id,quantity,created_at,products(*),generated_artworks(storage_path,original_storage_path,status)",
      )
      .eq("generation_session_id", sessionId)
      .eq("generated_artwork_id", artworkId)
      .order("created_at"),
    storeCurrency(creatorId),
  ]);
  check(error);
  const lines = [];
  const stale = [];
  for (const item of row.array().parse(data)) {
    const product = item.products,
      artwork = item.generated_artworks;
    let unitAmount: number | null = null;
    try {
      if (product && product.creator_id === creatorId)
        unitAmount = calculatePrice(product, currency).amount;
    } catch {
      // Withdrawn or repriced into another currency: no longer for sale.
    }
    if (!product || unitAmount === null || artwork?.status !== "ready") {
      stale.push(item.id);
      continue;
    }
    lines.push({
      id: item.id,
      artworkId: item.generated_artwork_id,
      productId: item.product_id,
      quantity: item.quantity,
      unitAmount,
      product,
      artwork,
    });
  }
  if (stale.length)
    check((await db.from("cart_items").delete().in("id", stale)).error);
  return { lines, currency };
}

export async function getCart(
  sessionId: string,
  creatorId: string,
  artworkId: string,
) {
  const { lines } = await cartLines(sessionId, creatorId, artworkId);
  return Promise.all(
    lines.map(async (line): Promise<CartItem> => ({
      id: line.id,
      artworkId: line.artworkId,
      artworkUrl: await cachedSignedUrl(
        "generated-artworks",
        line.artwork.storage_path,
      ),
      product: line.product,
      quantity: line.quantity,
      unitAmount: line.unitAmount,
    })),
  );
}

// Names a cart's exact contents and prices, whatever order they were added
// in: checking out the same cart again finds the order already made for it.
export function cartKey(lines: CartLine[]) {
  const entries = lines
    .map((l) => `${l.artworkId}:${l.productId}:${l.quantity}:${l.unitAmount}`)
    .sort();
  return createHash("sha256").update(entries.join("|")).digest("hex");
}

function limit(quantity: number, others: number) {
  const allowed = allowedQuantity(quantity, others);
  if (!allowed.ok) throw new HttpError(400, allowed.error);
  return allowed.quantity;
}

// Adds prints of the artwork in one size; adding one already in the cart adds
// to its quantity. Prints of any other artwork leave the cart, which holds
// one artwork. Choosing an artwork to buy also marks it selected, as picking
// it on the results page does.
export async function addToCart(input: unknown) {
  const { sessionId, artworkId, productId, quantity } =
    cartAddSchema.parse(input);
  const session = await requireSession(sessionId);
  const db = adminDb();
  const [artwork, product, currency] = await Promise.all([
    db
      .from("generated_artworks")
      .update({ selected: true })
      .eq("id", artworkId)
      .eq("generation_session_id", session.id)
      .eq("status", "ready")
      .select("id")
      .maybeSingle(),
    db
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("creator_id", session.creator_id)
      .eq("active", true)
      .maybeSingle(),
    storeCurrency(session.creator_id),
  ]);
  check(artwork.error);
  check(product.error);
  if (!artwork.data) throw new HttpError(404, "Artwork not found.");
  if (!product.data) throw new HttpError(400, "That print isn’t available.");
  calculatePrice(productRow.parse(product.data), currency);
  check(
    (
      await db
        .from("cart_items")
        .delete()
        .eq("generation_session_id", session.id)
        .neq("generated_artwork_id", artworkId)
    ).error,
  );
  const { lines } = await cartLines(session.id, session.creator_id, artworkId);
  const existing = lines.find(
    (l) => l.artworkId === artworkId && l.productId === productId,
  );
  const next = limit(
    (existing?.quantity ?? 0) + quantity,
    cartCount(lines) - (existing?.quantity ?? 0),
  );
  const { error } = existing
    ? await db
        .from("cart_items")
        .update({ quantity: next })
        .eq("id", existing.id)
    : await db.from("cart_items").insert({
        generation_session_id: session.id,
        generated_artwork_id: artworkId,
        product_id: productId,
        quantity: next,
      });
  // Two adds at once: the other made the line first. Asking again adds to it.
  if (error?.code === "23505") return addToCart(input);
  check(error);
  return getCart(session.id, session.creator_id, artworkId);
}

export async function setQuantity(input: unknown) {
  const { sessionId, artworkId, itemId, quantity } =
    cartUpdateSchema.parse(input);
  const session = await requireSession(sessionId);
  const { lines } = await cartLines(session.id, session.creator_id, artworkId);
  const line = lines.find((l) => l.id === itemId);
  if (!line) throw new HttpError(404, "That print isn’t in your cart.");
  const next = limit(quantity, cartCount(lines) - line.quantity);
  check(
    (
      await adminDb()
        .from("cart_items")
        .update({ quantity: next })
        .eq("id", itemId)
        .eq("generation_session_id", session.id)
    ).error,
  );
  return getCart(session.id, session.creator_id, artworkId);
}

export async function removeFromCart(input: unknown) {
  const { sessionId, artworkId, itemId } = cartRemoveSchema.parse(input);
  const session = await requireSession(sessionId);
  check(
    (
      await adminDb()
        .from("cart_items")
        .delete()
        .eq("id", itemId)
        .eq("generation_session_id", session.id)
    ).error,
  );
  return getCart(session.id, session.creator_id, artworkId);
}
