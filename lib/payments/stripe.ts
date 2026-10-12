import "server-only";
import Stripe from "stripe";
import { required } from "@/lib/config";
export function stripeClient() {
  return new Stripe(required("STRIPE_SECRET_KEY"), {
    timeout: 20_000,
    maxNetworkRetries: 2,
  });
}
