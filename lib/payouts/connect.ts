import "server-only";
import type Stripe from "stripe";
import { stripeClient } from "@/lib/payments/stripe";
import { adminDb, check } from "@/lib/supabase/admin";
import { config } from "@/lib/config";
import { MARKETS, type Currency } from "@/lib/currency";
import type { Store } from "@/lib/domain";
import { payoutsStatus } from "./rules";

// Creators' payout accounts are Stripe Connect accounts that only receive
// transfers: Pluto sells to customers, holds the money, and pays each
// creator their share monthly. Accounts API v1, because Pluto's platform is
// in Sweden and paying US creators is a cross-border payout, which v2
// accounts don't support. Pluto pays Stripe's fees and carries losses
// (refunds and disputes are its own), and creators get Stripe's Express
// dashboard, reached through the embedded components on the Settings page.

export async function ensureConnectedAccount(store: Store, email: string) {
  if (store.stripe_account_id) return store.stripe_account_id;
  const account = await stripeClient().accounts.create(
    {
      country: MARKETS[store.currency as Currency].country,
      email,
      controller: {
        fees: { payer: "application" },
        losses: { payments: "application" },
        requirement_collection: "stripe",
        stripe_dashboard: { type: "express" },
      },
      capabilities: { transfers: { requested: true } },
      business_profile: {
        // The storefront is the creator's website, so they aren't asked
        // for one.
        url: `${config().appUrl}/${store.slug}`,
        product_description: "Illustrated posters made from customers' photos.",
      },
      metadata: { creator_id: store.id },
    },
    // One account per store, even if two tabs ask at once.
    { idempotencyKey: `connect-account:${store.id}` },
  );
  // Only set when still empty, so a race can't replace an account.
  const { data, error } = await adminDb()
    .from("creators")
    .update({ stripe_account_id: account.id, payouts_status: "not_started" })
    .eq("id", store.id)
    .is("stripe_account_id", null)
    .select("stripe_account_id");
  check(error);
  if (!data?.length) {
    const { data: current, error: readError } = await adminDb()
      .from("creators")
      .select("stripe_account_id")
      .eq("id", store.id)
      .single();
    check(readError);
    return current!.stripe_account_id!;
  }
  return account.id;
}

// A short-lived session for Stripe's embedded components on the Settings
// page: onboarding until done, then payouts, account details and alerts.
// Bank details are collected by Stripe, never by Pluto.
export async function accountSession(accountId: string) {
  const bank = { external_account_collection: true };
  const session = await stripeClient().accountSessions.create({
    account: accountId,
    components: {
      account_onboarding: { enabled: true, features: bank },
      account_management: { enabled: true, features: bank },
      notification_banner: { enabled: true, features: bank },
      payouts: {
        enabled: true,
        features: {
          ...bank,
          // Payouts follow Pluto's monthly run; no instant or manual
          // payouts to reason about.
          instant_payouts: false,
          standard_payouts: false,
          edit_payout_schedule: false,
        },
      },
    },
  });
  return session.client_secret;
}

// Brings a store's payout status in line with its Stripe account. Called
// from the Connect webhook and when the Settings page loads.
export async function syncPayoutsStatus(account: Stripe.Account | string) {
  const current =
    typeof account === "string"
      ? await stripeClient().accounts.retrieve(account)
      : account;
  const status = payoutsStatus(current);
  const { error } = await adminDb()
    .from("creators")
    .update({ payouts_status: status })
    .eq("stripe_account_id", current.id);
  check(error);
  return status;
}
