"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Landmark } from "lucide-react";
import type { Currency } from "@/lib/currency";
import { HOLD_DAYS } from "@/lib/payouts/rules";
import type { PayoutsStatus } from "@/lib/payouts/rules";
import { money } from "@/lib/payments/pricing";
import { post } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { Panel, PANEL_INSET, PanelSection } from "./panel";
import { Button } from "./ui/button";
import { FIELD } from "./form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

// Stripe's components run only in the browser.
const PayoutsPanel = dynamic(
  () => import("./payouts-panel").then((m) => m.PayoutsPanel),
  { ssr: false },
);

type Notifications = {
  notify_new_order: boolean;
  notify_needs_attention: boolean;
  notify_payout_sent: boolean;
};

export function SettingsBoard({
  email,
  store,
  earnings,
  nextRun,
  notifications,
}: {
  email: string;
  store: {
    name: string;
    currency: Currency;
    hasAccount: boolean;
    payoutsStatus: PayoutsStatus;
  } | null;
  earnings: { next: number; later: number } | null;
  nextRun: number;
  notifications: Notifications;
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <Payouts store={store} earnings={earnings} nextRun={nextRun} />
      <Panel title="Account">
        <div className={PANEL_INSET}>
          <EmailRow email={email} />
        </div>
        <PanelSection
          title="Email notifications"
          footer={
            <p className="text-xs text-muted-foreground">
              We’ll start sending these soon. Your choices are saved now.
            </p>
          }
        >
          <NotificationRows initial={notifications} />
        </PanelSection>
      </Panel>
      <DeleteRow storeName={store?.name ?? null} />
    </div>
  );
}

// One setting: what it is on the left, its control right beside it.
function Row({
  label,
  hint,
  control,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  control?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {hint && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
        {control}
      </div>
      {children}
    </div>
  );
}

const STATUS: Record<
  PayoutsStatus,
  { label: string; body: string; icon: typeof Clock; tone: string }
> = {
  not_started: {
    label: "Not set up",
    body: "Add your details and a bank account so we can pay you what your store earns.",
    icon: Landmark,
    tone: "bg-muted text-muted-foreground",
  },
  pending: {
    label: "Almost there",
    body: "Stripe is checking your details or needs a little more. Your earnings are safe and will be paid once it’s done.",
    icon: Clock,
    tone: "bg-warning-transparent text-warning",
  },
  enabled: {
    label: "Payouts on",
    body: "You’re set up to be paid.",
    icon: CheckCircle2,
    tone: "bg-success-transparent text-success",
  },
  restricted: {
    label: "Action needed",
    body: "Stripe needs more information before it can pay you. Follow the notice below.",
    icon: AlertTriangle,
    tone: "bg-error-transparent text-error",
  },
};

function Payouts({
  store,
  earnings,
  nextRun,
}: {
  store: {
    currency: Currency;
    hasAccount: boolean;
    payoutsStatus: PayoutsStatus;
  } | null;
  earnings: { next: number; later: number } | null;
  nextRun: number;
}) {
  const [started, setStarted] = useState(false);
  const date = new Date(nextRun).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const schedule = (
    <p className="text-xs text-muted-foreground">
      Paid monthly for orders that shipped at least {HOLD_DAYS} days earlier.
    </p>
  );
  if (!store)
    return (
      <Panel title="Payouts">
        <div className={cn(PANEL_INSET, "px-6 py-4")}>
          <p className="text-sm text-muted-foreground">
            Save your store first, then set up how you get paid.
          </p>
        </div>
      </Panel>
    );
  const status = STATUS[store.payoutsStatus];
  const Icon = status.icon;
  const onboarding = store.payoutsStatus === "not_started";
  const owed = earnings ? earnings.next + earnings.later : 0;
  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
        status.tone,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {status.label}
    </span>
  );
  // Until payouts are set up, this is the one thing to do on the page.
  if (onboarding && !started)
    return (
      <Panel title="Payouts" actions={pill} footer={schedule}>
        <div className={cn(PANEL_INSET, "px-6 py-8 sm:px-8")}>
          <span className="grid size-11 place-items-center rounded-2xl ring-1 ring-neutral-6-transparent bg-background">
            <Landmark className="size-5" aria-hidden />
          </span>
          <h3 className="mt-4 text-xl font-semibold">
            {owed > 0
              ? `${money(owed, store.currency)} is waiting for you`
              : "Get paid for every print you sell"}
          </h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Add your details and a bank account, and we’ll send what your store
            earns straight to you.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Button
              size="lg"
              className="h-11 rounded-xl px-6"
              onClick={() => setStarted(true)}
            >
              Set up payouts
            </Button>
            <p className="text-sm text-muted-foreground">
              About 5 minutes, handled securely by Stripe
            </p>
          </div>
        </div>
      </Panel>
    );
  return (
    <Panel title="Payouts" actions={pill} footer={schedule}>
      <div className={PANEL_INSET}>
        {!onboarding && (
          <div className="flex flex-wrap items-start justify-between gap-4 shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] px-6 py-4">
            <p className="max-w-sm text-sm text-muted-foreground">
              {status.body}
            </p>
            {owed > 0 && (
              <dl className="flex gap-8 text-right">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Next payout, {date}
                  </dt>
                  <dd className="text-xl font-semibold tabular-nums">
                    {money(earnings!.next, store.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Waiting {HOLD_DAYS} days
                  </dt>
                  <dd className="text-xl font-semibold text-muted-foreground tabular-nums">
                    {money(earnings!.later, store.currency)}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        )}
        <div className="px-6 py-6">
          <PayoutsPanel stage={onboarding ? "onboarding" : "manage"} />
        </div>
      </div>
    </Panel>
  );
}

function EmailRow({ email }: { email: string }) {
  const [editing, setEditing] = useState(false),
    [value, setValue] = useState(""),
    [sentTo, setSentTo] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Row
      label="Sign-in email"
      hint={email}
      control={
        !editing &&
        !sentTo && (
          <Button
            variant="outline"
            className="h-9 rounded-xl px-4"
            onClick={() => setEditing(true)}
          >
            Change
          </Button>
        )
      }
    >
      {sentTo ? (
        <p className="mt-4 rounded-xl bg-neutral-2 px-4 py-3 text-sm">
          Check <span className="font-medium">{sentTo}</span> and follow the
          link to confirm. Your email changes once you do.
        </p>
      ) : (
        editing && (
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await post("/api/account/email", { email: value });
                setSentTo(value);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Couldn’t change.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">New email address</span>
              <input
                type="email"
                required
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="New email address"
                className={cn(FIELD, "h-11")}
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-xl px-4"
              onClick={() => {
                setEditing(false);
                setValue("");
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl px-6"
              disabled={busy || !value}
            >
              {busy ? "Sending…" : "Send confirmation"}
            </Button>
            {error && (
              <p role="status" className="w-full text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
        )
      )}
    </Row>
  );
}

const NOTIFICATIONS: {
  key: keyof Notifications;
  label: string;
  hint: string;
}[] = [
  {
    key: "notify_new_order",
    label: "New orders",
    hint: "When a customer buys a print.",
  },
  {
    key: "notify_needs_attention",
    label: "Orders that need attention",
    hint: "When something holds up an order.",
  },
  {
    key: "notify_payout_sent",
    label: "Payout sent",
    hint: "When we send you money.",
  },
];

function NotificationRows({ initial }: { initial: Notifications }) {
  const [values, setValues] = useState(initial);
  return (
    <ul className={cn(PANEL_INSET, "*:not-last:shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)]")}>
      {NOTIFICATIONS.map(({ key, label, hint }) => (
        <li key={key}>
          <Row
            label={label}
            hint={hint}
            control={
              <Switch
                label={label}
                checked={values[key]}
                onChange={async (on) => {
                  setValues((v) => ({ ...v, [key]: on }));
                  try {
                    await post("/api/account/notifications", { [key]: on });
                  } catch {
                    setValues((v) => ({ ...v, [key]: !on }));
                    toast.error("Couldn’t save that. Try again.");
                  }
                }}
              />
            }
          />
        </li>
      ))}
    </ul>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full transition-colors motion-small focus-ring",
        checked ? "bg-color-1" : "bg-neutral-4",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-neutral-1 shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4-transparent),var(--shadow-s)] transition-transform motion-small",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

function DeleteRow({ storeName }: { storeName: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const ready = !storeName || confirm.trim() === storeName.trim();
  return (
    // Set apart below everything else, so it's easy to skip and hard to hit.
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 shadow-[inset_0_var(--border-s)_0_var(--border)] px-3 pt-6">
      <div>
        <p className="text-sm font-medium">Delete account</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Takes your store offline and deletes your sign-in. Order records are
          kept, as the law requires.
        </p>
      </div>
      <Button
        variant="ghost"
        className="h-9 rounded-xl px-3 text-destructive hover:bg-error-transparent hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        Delete account…
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-md">
          <div className="px-6 pt-6 pb-6">
            <DialogTitle className="text-lg font-semibold">
              Delete your account?
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              Your store goes offline straight away and you won’t be able to
              sign in. You can’t delete it while orders are still to ship or
              you’re owed a payout.
            </DialogDescription>
            {storeName && (
              <label className="mt-4 block text-sm">
                Type <span className="font-medium">{storeName}</span> to confirm
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={cn(FIELD, "mt-2 h-11")}
                />
              </label>
            )}
            {error && (
              <p role="status" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 shadow-[inset_0_var(--border-s)_0_var(--border)] bg-neutral-2 px-6 py-4">
            <Button
              variant="ghost"
              className="h-11 rounded-xl px-4"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="h-11 rounded-xl px-6"
              disabled={!ready || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await post("/api/account/delete", { confirm });
                  router.push("/auth/login");
                  router.refresh();
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Couldn’t delete.",
                  );
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
