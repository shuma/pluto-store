import "server-only";
import { randomUUID } from "node:crypto";
import { checkoutSchema } from "@/lib/validation/schemas";
import { requireSession } from "@/lib/generations/session";
import { adminDb, check } from "@/lib/supabase/admin";
import {
  ORDER_WITH_ITEMS,
  orderRow,
  type Order,
  type Product,
  type Session,
} from "@/lib/domain";
import { HttpError } from "@/lib/http";
import { config } from "@/lib/config";
import { download, put } from "@/lib/storage";
import { preparePrintFile } from "@/lib/print/prepare-print-file";
import { checkoutParams } from "./checkout-params";
import { mockupUrl } from "@/lib/mockups/get-mockup";
import { stripeClient } from "./stripe";
import { track } from "@/lib/analytics";
import { MARKETS, type Currency } from "@/lib/currency";
import { platformFee } from "@/lib/fees";
import {
  gelatoConfigured,
  getOrderCost,
} from "@/lib/fulfillment/gelato-catalog";
import { cartKey, cartLines } from "@/lib/cart/cart";
import { cartTotal } from "@/lib/cart/rules";
// The print and delivery cost of a whole order, or null when it can't be
// quoted (a product not linked to the printer, or the printer unreachable).
// Unknown earnings are never paid out, so a failed quote holds the order's
// payout rather than blocking the sale.
async function productionCost(
  lines: { product: Product; quantity: number }[],
  currency: Currency,
) {
  if (!gelatoConfigured()) return null;
  const items = lines.map((l) => ({
    productUid: l.product.gelato_product_uid,
    quantity: l.quantity,
  }));
  if (items.some((i) => !i.productUid)) return null;
  try {
    return (
      await getOrderCost(
        items as { productUid: string; quantity: number }[],
        currency,
      )
    ).total;
  } catch {
    return null;
  }
}

type Line = Awaited<ReturnType<typeof cartLines>>["lines"][number];

// One print file per item, cut to its size from the artwork's original. The
// originals are fetched once each, however many sizes share them.
async function printFiles(
  lines: Line[],
  folder: string,
  settings: ReturnType<typeof config>,
) {
  const originals = new Map<string, Promise<Uint8Array>>();
  const paths: string[] = [];
  for (const line of lines) {
    let original = originals.get(line.artworkId);
    if (!original) {
      original = download(
        "generated-artworks",
        line.artwork.original_storage_path,
      );
      originals.set(line.artworkId, original);
    }
    let print;
    try {
      print = await preparePrintFile(
        await original,
        line.product.width_mm,
        line.product.height_mm,
        settings.minPrintDpi,
        settings.maxPrintUpscale,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "insufficient_print_resolution"
      )
        throw new HttpError(
          422,
          `One of your artworks is too small for ${line.product.name}. Choose a smaller size for it, or remove it.`,
        );
      throw error;
    }
    const path = `${folder}/${randomUUID()}.png`;
    await put("print-files", path, print.bytes, print.mimeType);
    paths.push(path);
  }
  return paths;
}

const findOrder = async (sessionId: string, key: string) => {
  const { data, error } = await adminDb()
    .from("orders")
    .select(ORDER_WITH_ITEMS)
    .eq("generation_session_id", sessionId)
    .eq("cart_key", key)
    .maybeSingle();
  check(error);
  return data;
};

// The order for exactly this cart, made now if it doesn't exist yet.
async function orderForCart(
  session: Session,
  lines: Line[],
  currency: Currency,
  settings: ReturnType<typeof config>,
) {
  const key = cartKey(lines);
  const found = await findOrder(session.id, key);
  if (found) return orderRow.parse(found);
  const db = adminDb();
  const id = randomUUID();
  const paths = await printFiles(lines, `${session.id}/${id}`, settings);
  const removePrints = () => db.storage.from("print-files").remove(paths);
  const amount = cartTotal(lines);
  const { error } = await db.from("orders").insert({
    id,
    creator_id: session.creator_id,
    generation_session_id: session.id,
    cart_key: key,
    currency,
    amount_total: amount,
    // Fixed now, at the rate in force when the order is placed.
    platform_fee_amount: platformFee(amount, currency),
    // What printing and delivery cost, quoted now, so the creator's
    // earnings are known once it's paid.
    production_cost_amount: await productionCost(lines, currency),
  });
  // The same cart checked out twice at once: the other request made it.
  if (error?.code === "23505") {
    await removePrints();
    return orderRow.parse(await findOrder(session.id, key));
  }
  check(error);
  const items = await db.from("order_items").insert(
    lines.map((line, i) => ({
      order_id: id,
      generated_artwork_id: line.artworkId,
      product_id: line.productId,
      product_snapshot: line.product,
      quantity: line.quantity,
      unit_amount: line.unitAmount,
      print_storage_path: paths[i],
    })),
  );
  if (items.error) {
    // An order with no items can't be paid or printed: undo it whole.
    await db.from("orders").delete().eq("id", id);
    await removePrints();
    check(items.error);
  }
  for (const line of lines)
    track("product_selected", { product_id: line.productId });
  return orderRow.parse(await findOrder(session.id, key));
}

// A visit checks out one cart at a time: changing the cart and checking out
// again ends the earlier checkout, so its link can no longer be paid.
async function expireOtherCheckouts(sessionId: string, keep: string) {
  const { data, error } = await adminDb()
    .from("orders")
    .select("id,stripe_checkout_session_id")
    .eq("generation_session_id", sessionId)
    .eq("payment_status", "pending_payment")
    .neq("id", keep)
    .not("stripe_checkout_session_id", "is", null);
  check(error);
  const stripe = stripeClient();
  for (const order of data ?? []) {
    try {
      const checkout = await stripe.checkout.sessions.retrieve(
        order.stripe_checkout_session_id!,
      );
      if (checkout.status === "open")
        await stripe.checkout.sessions.expire(checkout.id);
    } catch {
      // Already over, or Stripe unreachable: it expires by itself in a day.
    }
  }
}

// Each item's room mockup for Stripe to show beside it; a link good for the
// session's day, or nothing when one can't be drawn.
async function itemImages(order: Order) {
  const ids = [
    ...new Set(order.order_items.map((i) => i.generated_artwork_id)),
  ];
  const { data, error } = await adminDb()
    .from("generated_artworks")
    .select("id,storage_path")
    .in("id", ids);
  check(error);
  const paths = new Map((data ?? []).map((a) => [a.id, a.storage_path]));
  return Promise.all(
    order.order_items.map(async (item) => {
      const path = paths.get(item.generated_artwork_id);
      return path
        ? mockupUrl(
            { bucket: "generated-artworks", path },
            item.product_snapshot,
            86_400,
          )
        : null;
    }),
  );
}

export async function startCheckout(input: unknown) {
  const { sessionId, artworkId } = checkoutSchema.parse(input),
    session = await requireSession(sessionId),
    db = adminDb(),
    settings = config();
  const { data: store, error: storeError } = await db
    .from("creators")
    .select("slug,currency")
    .eq("id", session.creator_id)
    .eq("status", "live")
    .single();
  check(storeError);
  const { lines } = await cartLines(session.id, session.creator_id, artworkId);
  if (!lines.length) throw new HttpError(400, "Your cart is empty.");
  if (
    settings.fulfillmentMode === "gelato" &&
    lines.some((l) => !l.product.gelato_product_uid)
  )
    throw new HttpError(503, "One of these prints is temporarily unavailable.");
  // The store's currency, not a global one: each store sells in its own.
  const currency = store!.currency as Currency;
  let order = await orderForCart(session, lines, currency, settings);
  await expireOtherCheckouts(session.id, order.id);
  if (order.payment_status === "paid")
    return { url: `${settings.appUrl}/checkout/success?order=${order.id}` };
  const stripe = stripeClient();
  if (order.stripe_checkout_session_id) {
    const checkout = await stripe.checkout.sessions.retrieve(
      order.stripe_checkout_session_id,
    );
    if (checkout.status === "open" && checkout.url)
      return { url: checkout.url };
    if (checkout.status === "complete")
      return { url: `${settings.appUrl}/checkout/success?order=${order.id}` };
    const { data, error } = await db
      .from("orders")
      .update({
        stripe_checkout_session_id: null,
        checkout_url: null,
        checkout_attempt: order.checkout_attempt + 1,
      })
      .eq("id", order.id)
      .eq("checkout_attempt", order.checkout_attempt)
      .eq("payment_status", "pending_payment")

      .select(ORDER_WITH_ITEMS)
      .maybeSingle();
    check(error);
    if (!data)
      throw new HttpError(409, "Checkout is being updated. Please try again.");
    order = orderRow.parse(data);
  }
  const checkout = await stripe.checkout.sessions.create(
    checkoutParams(
      order,
      settings.appUrl,
      store!.slug,
      // Checkout ships within the store's market, which its currency sets.
      MARKETS[store!.currency as Currency].country,
      // A Checkout Session lasts a day; so do the links to its images.
      await itemImages(order),
    ),
    { idempotencyKey: `checkout:${order.id}:${order.checkout_attempt}` },
  );
  const { error } = await db
    .from("orders")
    .update({
      stripe_checkout_session_id: checkout.id,
      checkout_url: checkout.url,
    })
    .eq("id", order.id)
    .eq("checkout_attempt", order.checkout_attempt)
    .eq("payment_status", "pending_payment");
  check(error);
  if (!checkout.url) throw new Error("Missing checkout URL");
  track("checkout_started", { order_id: order.id });
  return { url: checkout.url };
}
