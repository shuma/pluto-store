import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore, requireUser } from "@/lib/auth";
import { accountSession, ensureConnectedAccount } from "@/lib/payouts/connect";
// A client secret for Stripe's embedded payout components, creating the
// creator's connected account the first time they open payouts.
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    if (!process.env.STRIPE_SECRET_KEY)
      throw new HttpError(
        503,
        "Payouts aren’t available yet. Please try again later.",
      );
    const [user, store] = await Promise.all([requireUser(), ownedStore()]);
    if (!store) throw new HttpError(404, "Save your store first.");
    if (!user.email)
      throw new HttpError(400, "Add an email address to your account first.");
    const accountId = await ensureConnectedAccount(store, user.email);
    return { clientSecret: await accountSession(accountId) };
  });
}
