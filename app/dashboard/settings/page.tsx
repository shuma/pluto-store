import { ownedStore, requireUser } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { syncPayoutsStatus } from "@/lib/payouts/connect";
import { HOLD_DAYS, nextPayoutDate } from "@/lib/payouts/rules";
import { SettingsBoard } from "@/components/settings-board";
import type { Currency } from "@/lib/currency";

// What the creator is owed: earnings the next monthly run will send (orders
// shipped long enough before it), and earnings still in their 30 days. By
// currency, as each is paid out in its own.
async function earningsDue(creatorId: string, nextRun: number) {
  const { data, error } = await adminDb()
    .from("orders")
    .select("creator_earnings_amount,fulfilled_at,currency")
    .eq("creator_id", creatorId)
    .eq("payment_status", "paid")
    .eq("fulfillment_status", "fulfilled")
    .is("payout_id", null)
    .not("creator_earnings_amount", "is", null);
  check(error);
  const cutoff = nextRun - HOLD_DAYS * 86_400_000;
  const due: Partial<Record<Currency, { next: number; later: number }>> = {};
  for (const o of data ?? []) {
    const sum = (due[o.currency as Currency] ??= { next: 0, later: 0 });
    if (Date.parse(o.fulfilled_at!) <= cutoff)
      sum.next += o.creator_earnings_amount!;
    else sum.later += o.creator_earnings_amount!;
  }
  return due;
}

async function loadSettings() {
  const [user, store] = await Promise.all([requireUser(), ownedStore()]);
  const { data: profile, error } = await adminDb()
    .from("profiles")
    .select("notify_new_order,notify_needs_attention,notify_payout_sent")
    .eq("id", user.id)
    .maybeSingle();
  check(error);
  const nextRun = nextPayoutDate(Date.now());
  // Refreshed here too, so the page is right even if a webhook was missed.
  const payoutsStatus = store?.stripe_account_id
    ? await syncPayoutsStatus(store.stripe_account_id).catch(
        () => store.payouts_status,
      )
    : (store?.payouts_status ?? "not_started");
  return {
    email: user.email ?? "",
    store: store && {
      name: store.name,
      currency: store.currency,
      hasAccount: Boolean(store.stripe_account_id),
      payoutsStatus,
    },
    earnings: store ? await earningsDue(store.id, nextRun) : null,
    nextRun,
    notifications: {
      notify_new_order: profile?.notify_new_order ?? true,
      notify_needs_attention: profile?.notify_needs_attention ?? true,
      notify_payout_sent: profile?.notify_payout_sent ?? true,
    },
  };
}

export default async function Settings() {
  const settings = await loadSettings();
  return (
    <>
      <h1 className="text-3xl font-semibold">Settings.</h1>
      <p className="mt-3 mb-8 max-w-xl text-sm text-muted-foreground">
        How you get paid, and your account.
      </p>
      <SettingsBoard {...settings} />
    </>
  );
}
