"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
  ConnectPayouts,
} from "@stripe/react-connect-js";
import { post } from "@/lib/client-api";

// Stripe's own onboarding, payouts and account screens, embedded so
// creators never leave Pluto. Stripe collects identity and bank details
// directly; Pluto only ever holds the account id.
type Stage = "onboarding" | "manage";

const session = async () =>
  (await post<{ clientSecret: string }>("/api/creator/payouts/session", {}))
    .clientSecret;

// Starts Stripe with a session fetched up front, so a failure (Stripe not
// configured, the account refused) shows as a message rather than a blank
// space. Later sessions are fetched by Stripe as it needs them.
function connect(first: string) {
  let pending: string | null = first;
  return loadConnectAndInitialize({
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    fetchClientSecret: async () => {
      if (pending) {
        const secret = pending;
        pending = null;
        return secret;
      }
      return session();
    },
    // Matched to the dashboard: the Pluto Store theme's light values (the
    // embedded Stripe widget renders in its own frame and can't read CSS
    // variables): neutral-10, neutral-7, neutral-4, radius s, text s.
    appearance: {
      overlays: "dialog",
      variables: {
        colorPrimary: "#202124",
        colorText: "#202124",
        colorSecondaryText: "#6e6e76",
        colorBorder: "#e4e4e7",
        borderRadius: "8px",
        buttonBorderRadius: "8px",
        formBorderRadius: "8px",
        fontSizeBase: "14px",
      },
    },
  });
}

export function PayoutsPanel({ stage }: { stage: Stage }) {
  const router = useRouter();
  const [instance, setInstance] =
      useState<ReturnType<typeof loadConnectAndInitialize>>(),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    session()
      .then((secret) => !cancelled && setInstance(connect(secret)))
      .catch(
        (e) =>
          !cancelled &&
          setError(e instanceof Error ? e.message : "Couldn’t load payouts."),
      );
    return () => {
      cancelled = true;
    };
  }, []);
  const failed = () =>
    setError("Couldn’t load payouts. Refresh the page to try again.");
  if (error)
    return (
      <p role="alert" className="rounded-xl bg-neutral-2 px-4 py-3 text-sm">
        {error}
      </p>
    );
  if (!instance)
    return (
      <p className="animate-pulse text-sm text-muted-foreground">
        Loading payouts…
      </p>
    );
  return (
    <ConnectComponentsProvider connectInstance={instance}>
      {stage === "onboarding" ? (
        <ConnectAccountOnboarding
          // Finished or closed: reload so the page shows the new status.
          onExit={() => router.refresh()}
          onLoadError={failed}
        />
      ) : (
        <div className="space-y-6">
          <ConnectNotificationBanner onLoadError={failed} />
          <ConnectPayouts onLoadError={failed} />
          <details className="group rounded-xl ring-1 ring-neutral-6-transparent px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Payout account details
            </summary>
            <div className="mt-4">
              <ConnectAccountManagement onLoadError={failed} />
            </div>
          </details>
        </div>
      )}
    </ConnectComponentsProvider>
  );
}
