import "server-only";
import type Stripe from "stripe";
import { z } from "zod";
import { adminDb, check } from "@/lib/supabase/admin";
import { shippingSchema } from "@/lib/validation/schemas";
import { track } from "@/lib/analytics";
import { orderRow } from "@/lib/domain";
import { feeInOrderCurrency, orderEarnings } from "@/lib/payouts/rules";
import { stripeClient } from "./stripe";
export async function recordCheckoutPayment(event: Stripe.Event) {
  if (
    ![
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ].includes(event.type)
  )
    return null;
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return null;
  const orderId = z.uuid().parse(session.metadata?.order_id);
  const shipping = session.collected_information?.shipping_details;
  const address = shippingSchema.parse(shipping?.address);
  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  const { data, error } = await adminDb().rpc("record_payment", {
    p_event: event.id,
    p_order: orderId,
    p_session: session.id,
    p_intent: intent ?? null,
    p_amount: session.amount_total,
    p_currency: session.currency,
    p_email: z.email().parse(session.customer_details?.email),
    p_name: z
      .string()
      .min(1)
      .parse(shipping?.name ?? session.customer_details?.name),
    p_address: address,
  });
  check(error);
  if (data) track("purchase_completed", { order_id: orderId });
  // Also on replays, so earnings missed by a crash are filled in on retry.
  if (intent) await recordEarnings(orderId, intent);
  // Even a replay wakes a pending job after a crash between payment and submission.
  return orderId;
}

// What the creator earns on a paid order, fixed now: the price less Pluto's
// fee, the print and delivery cost quoted at checkout, and Stripe's actual
// fee for this charge. Runs once; an order with earnings is left alone.
async function recordEarnings(orderId: string, intentId: string) {
  const db = adminDb();
  const { data: row, error } = await db
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  check(error);
  const order = orderRow.parse(row);
  if (order.creator_earnings_amount !== null) return;
  const intent = await stripeClient().paymentIntents.retrieve(intentId, {
    expand: ["latest_charge.balance_transaction"],
  });
  const charge = intent.latest_charge as Stripe.Charge | null;
  const txn = charge?.balance_transaction as Stripe.BalanceTransaction | null;
  const paymentFee = txn
    ? feeInOrderCurrency(txn.fee, txn.exchange_rate)
    : null;
  const { error: updateError } = await db
    .from("orders")
    .update({
      payment_fee_amount: paymentFee,
      creator_earnings_amount: orderEarnings({
        amount: order.amount_total,
        platformFee: order.platform_fee_amount,
        productionCost: order.production_cost_amount,
        paymentFee,
      }),
    })
    .eq("id", orderId)
    .is("creator_earnings_amount", null);
  check(updateError);
}
