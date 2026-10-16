"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Order } from "@/lib/domain";
import { CURRENCY_LABELS, type Currency } from "@/lib/currency";
import {
  bestSeller,
  change,
  inRange,
  isRevenue,
  previousTotals,
  RANGES,
  revenueBuckets,
  SMALL_BASE,
  totals,
  type Range,
} from "@/lib/income";
import { money } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";
import { Segmented } from "./segmented";
import { RAISED_CARD } from "./panel";
import { RevenueChart, SERIES } from "./revenue-chart";
import { OrdersBoard, type View } from "./orders-board";

// The income page: how much the store has made over a chosen period, and
// the orders behind it. One date range, in the revenue card, scopes the
// revenue, the chart, the figures and the orders list alike, so the numbers
// always agree.
export function IncomeBoard({
  orders,
  currency: main,
  currencies,
  now,
  truncated,
}: {
  orders: Order[];
  // The store's main currency, shown first, and every currency it has sold
  // or sells in. Money in different currencies is never added up, so the
  // page shows one at a time.
  currency: Currency;
  currencies: Currency[];
  now: number;
  truncated: boolean;
}) {
  const [currency, setCurrency] = useState(main),
    [range, setRange] = useState<Range>("30d"),
    [view, setView] = useState<View>("paid");
  const scoped = useMemo(
    () => orders.filter((o) => inRange(o, range, now)),
    [orders, range, now],
  );
  const current = totals(scoped, currency);
  const previous = previousTotals(orders, currency, range, now);
  const buckets = useMemo(
    () => revenueBuckets(orders, currency, range, now),
    [orders, currency, range, now],
  );
  const top = bestSeller(scoped, currency);
  // What the creator keeps from the period's sales, once known per order.
  const known = scoped.filter(
    (o) => isRevenue(o, currency) && o.creator_earnings_amount !== null,
  );
  const earned = known.length
    ? known.reduce((sum, o) => sum + o.creator_earnings_amount!, 0)
    : null;
  const average = (t: { revenue: number; orders: number }) =>
    t.orders ? Math.round(t.revenue / t.orders) : 0;
  const period =
    range === "all" ? "all time" : `the last ${RANGES[range].label}`;
  const compare = {
    period: RANGES[range].label,
    fallback: `Over ${period}`,
    small: (previous?.orders ?? 0) < SMALL_BASE,
  };
  const amount = (n: number) => money(n, currency);
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Your income.</h1>
        {currencies.length > 1 && (
          <Segmented
            label="Currency"
            size="sm"
            options={currencies.map((c) => ({
              value: c,
              label: c.toUpperCase(),
              title: CURRENCY_LABELS[c],
            }))}
            value={currency}
            onChange={setCurrency}
          />
        )}
      </div>
      {/* The period, the headline and the chart on a raised card; the three
          supporting figures in a tinted strip along its foot. The period
          also scopes the orders below. */}
      <section className={cn(SERIES, RAISED_CARD)}>
        <div className="px-6 pt-6 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              {/* Keyed to the bars, so the figure and the chart read as one. */}
              <span
                aria-hidden
                className="size-2.5 rounded-sm bg-[var(--series)]"
              />
              Total revenue
            </h2>
            <Segmented
              label="Period"
              size="sm"
              options={(Object.keys(RANGES) as Range[]).map((r) => ({
                value: r,
                label: RANGES[r].label,
              }))}
              value={range}
              onChange={setRange}
            />
          </div>
          <p className="mt-2 text-5xl font-semibold">
            {money(current.revenue, currency)}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            <Delta
              current={current.revenue}
              previous={previous?.revenue ?? null}
              format={amount}
              words={["more", "less"]}
              {...compare}
              context
            />
          </p>
          <div className="mt-8">
            <RevenueChart
              buckets={buckets}
              currency={currency}
              unit={RANGES[range].bucket}
            />
          </div>
        </div>
        <dl className="grid *:not-last:shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] rounded-b-3xl shadow-[inset_0_var(--border-s)_0_var(--border)] bg-paper-shell/60 sm:grid-cols-2 sm:*:not-last:shadow-[inset_calc(-1*var(--border-s))_0_0_var(--border)] lg:grid-cols-4">
          <Figure label="Orders" value={String(current.orders)}>
            <Delta
              current={current.orders}
              previous={previous?.orders ?? null}
              format={String}
              words={["more", "fewer"]}
              {...compare}
            />
          </Figure>
          <Figure
            label="Average order"
            value={current.orders ? money(average(current), currency) : "—"}
          >
            <Delta
              current={current.orders ? average(current) : null}
              previous={previous ? average(previous) : null}
              format={amount}
              words={["more", "less"]}
              {...compare}
            />
          </Figure>
          <Figure
            label="Your earnings"
            value={earned === null ? "—" : money(earned, currency)}
          >
            <Link
              href="/dashboard/settings"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {earned === null ? "Shown once orders are paid" : "Paid monthly"}
            </Link>
          </Figure>
          <Figure label="Best seller" value={top?.name ?? "—"}>
            {top
              ? `${money(top.revenue, currency)} from ${top.orders === 1 ? "1 order" : `${top.orders} orders`}`
              : `No sales over ${period}`}
          </Figure>
        </dl>
      </section>
      <div className="mt-6">
        <OrdersBoard
          orders={scoped}
          queue={orders}
          now={now}
          truncated={truncated}
          view={view}
          onViewChange={setView}
        />
      </div>
    </>
  );
}

// A supporting figure in the strip along the card's foot: label, value,
// and a line of context under it.
function Figure({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 px-6 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-xl font-semibold">{value}</dd>
      <dd className="mt-1 truncate text-xs text-muted-foreground">
        {children}
      </dd>
    </div>
  );
}

// Change against the period before, as one pill: an arrow and a signed
// percentage, coloured by direction, never colour alone. On a small base the
// pill gives the plain difference instead, uncoloured, since a sale or two
// either way is not news. Up is good for everything shown here.
function Delta({
  current,
  previous,
  format,
  words,
  period,
  fallback,
  small,
  context = false,
}: {
  // Null when this period has nothing to measure, such as an average with
  // no orders.
  current: number | null;
  // The previous period's figure; null for all time, which has none.
  previous: number | null;
  // Formats the size of a plain difference.
  format: (n: number) => string;
  // How a plain difference reads up and down: "more" / "fewer".
  words: [string, string];
  period: string;
  // Said instead when there is nothing to compare with.
  fallback: string;
  // Whether the previous period is too small for a percentage to mean much.
  small: boolean;
  // Whether to name the period compared against. Only the headline does, so
  // the strip below doesn't repeat it in every cell.
  context?: boolean;
}) {
  if (current === null || previous === null) return <span>{fallback}</span>;
  if (previous === 0) return <span>None in the previous {period}</span>;
  const diff = current - previous;
  const pct = change(current, previous)!;
  // No change is neither good nor bad, so it isn't coloured as either.
  const flat = small ? diff === 0 : pct === 0;
  const up = diff > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium tabular-nums",
          flat || small
            ? "bg-muted text-muted-foreground"
            : up
              ? "bg-success-transparent text-success"
              : "bg-error-transparent text-error",
        )}
      >
        {!flat && <Icon className="size-3.5" aria-hidden />}
        {flat
          ? "No change"
          : small
            ? `${format(Math.abs(diff))} ${up ? words[0] : words[1]}`
            : `${up ? "+" : "−"}${Math.abs(pct)}%`}
      </span>
      {context && `vs previous ${period}`}
    </span>
  );
}
