import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeClient } from "@/lib/payments/stripe";
import { required } from "@/lib/config";
import { recordCheckoutPayment } from "@/lib/payments/webhook";
import { submitFulfillment } from "@/lib/fulfillment/submit";
import { syncPayoutsStatus } from "@/lib/payouts/connect";
export const maxDuration = 60;
// Two Stripe endpoints deliver here: the platform's own events (checkout)
// and Connect events about creators' payout accounts, each signed with its
// own secret.
function verify(body: string, signature: string): Stripe.Event | null {
  const secrets = [
    required("STRIPE_WEBHOOK_SECRET"),
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter((s): s is string => Boolean(s));
  for (const secret of secrets) {
    try {
      return stripeClient().webhooks.constructEvent(body, signature, secret);
    } catch {
      // Try the next endpoint's secret.
    }
  }
  return null;
}
export async function POST(request: Request) {
  const event = verify(
    await request.text(),
    request.headers.get("stripe-signature") ?? "",
  );
  if (!event)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  try {
    // A creator's payout account changed: details submitted, verified, or
    // blocked.
    if (event.type === "account.updated") {
      await syncPayoutsStatus(event.data.object as Stripe.Account);
      return NextResponse.json({ received: true });
    }
    const orderId = await recordCheckoutPayment(event);
    if (orderId) await submitFulfillment(orderId);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "webhook_failed",
        event_id: event.id,
        kind: error instanceof Error ? error.name : "unknown",
      }),
    );
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
