"use client";
import { useRef, useState } from "react";
import type { Bucket } from "@/lib/income";
import { money } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

// Revenue per day, week or month as columns: one series, so no legend; the
// panel's heading names it. Columns are capped at 24px with a rounded top,
// grow from one baseline, and sit on hairline gridlines at clean values.
// Each whole column slot is the hover target, arrow keys move between them
// once the chart is focused, and a visually hidden table carries every
// value for screen readers.

const HEIGHT = 200;
// The series colour, as `--series`, validated against the chart surface in
// both themes. Set on an ancestor so a key beside the chart can share it.
export const SERIES = "[--series:var(--chart-1)]";
// Where the gridlines sit, as fractions of the axis.
const GRID = [1, 0.75, 0.5, 0.25, 0];

// A round top for the y-axis (1, 2, 2.5 or 5 × a power of ten), in minor
// units, so gridlines land on values like $50 or 500 kr.
function niceMax(value: number) {
  if (value <= 0) return 100;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exponent >= value)!;
  return step * exponent;
}

export function RevenueChart({
  buckets,
  currency,
  unit,
}: {
  buckets: Bucket[];
  currency: string;
  unit: "day" | "week" | "month";
}) {
  const [active, setActive] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);
  const top = niceMax(Math.max(...buckets.map((b) => b.revenue), 0));
  const ticks = [top, top / 2, 0];
  const label = (b: Bucket, long = false) => {
    const d = new Date(b.start);
    if (unit === "month")
      return d.toLocaleDateString("en-GB", {
        month: "short",
        year: long || d.getUTCMonth() === 0 ? "numeric" : undefined,
        timeZone: "UTC",
      });
    const day = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
    return unit === "week" && long ? `Week of ${day}` : day;
  };
  // Around six labels, evenly spaced, always including the last, and the
  // first too when it has room before the next, so both ends of the period
  // are dated.
  const every = Math.max(1, Math.ceil(buckets.length / 6));
  const lead = (buckets.length - 1) % every;
  const shown = buckets.map(
    (_, i) =>
      (buckets.length - 1 - i) % every === 0 || (i === 0 && lead > every / 2),
  );
  const hovered = active === null ? null : buckets[active];
  const pick = (clientX: number) => {
    const box = plot.current?.getBoundingClientRect();
    if (!box) return;
    const i = Math.floor(((clientX - box.left) / box.width) * buckets.length);
    setActive(Math.min(buckets.length - 1, Math.max(0, i)));
  };
  return (
    <figure className={cn(SERIES, "relative select-none")}>
      <div className="flex gap-3">
        {/* Y-axis ticks: clean values, muted, tabular so they align. */}
        <div
          aria-hidden
          className="relative w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums"
          style={{ height: HEIGHT }}
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(1 - t / top) * 100}%` }}
            >
              {money(t, currency).replace(/\.00$/, "")}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div
            ref={plot}
            role="img"
            tabIndex={0}
            aria-label={`Revenue by ${unit}. Use the arrow keys to read each ${unit}.`}
            onPointerMove={(e) => pick(e.clientX)}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const step = e.key === "ArrowRight" ? 1 : -1;
                setActive((i) =>
                  Math.min(
                    buckets.length - 1,
                    Math.max(
                      0,
                      (i ?? buckets.length - 1) + (i === null ? 0 : step),
                    ),
                  ),
                );
              }
            }}
            className="relative rounded-md outline-offset-4 focus-ring"
            style={{ height: HEIGHT }}
          >
            {/* Hairline gridlines every quarter, labelled at the ticks; the
                baseline a step darker. Filled hairlines, since a shadow has
                nothing to paint on a line with no height. */}
            {GRID.map((g) => (
              <div
                key={g}
                aria-hidden
                className={cn(
                  "absolute inset-x-0 h-(--border-s) -translate-y-1/2",
                  g === 0 ? "bg-neutral-5" : "bg-border",
                )}
                style={{ top: `${(1 - g) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex items-end">
              {buckets.map((b, i) => (
                <div
                  key={b.start}
                  className="flex h-full flex-1 items-end justify-center px-px"
                >
                  <div
                    className={cn(
                      "w-full max-w-6 rounded-t transition-[opacity,filter] motion-small",
                      // A day without sales gets a grey stub on the baseline,
                      // so it reads as nothing sold rather than as a gap.
                      b.revenue > 0 ? "bg-[var(--series)]" : "bg-neutral-5",
                      active !== null && active !== i && "opacity-40",
                    )}
                    style={{
                      height: `${(b.revenue / top) * 100}%`,
                      // A day with sales stays visible however small it is.
                      minHeight: 3,
                    }}
                  />
                </div>
              ))}
            </div>
            {hovered && (
              // Inside the plot, beside the hovered column rather than above
              // it, so the chart needs no empty band reserved for it: to the
              // right of columns in the left half, to the left past it.
              <div
                aria-hidden
                className="pointer-events-none absolute top-0 z-10 rounded-xl bg-popover px-3 py-2 text-xs whitespace-nowrap shadow-md ring-1 ring-neutral-4-transparent"
                style={{
                  left: `${((active! + 0.5) / buckets.length) * 100}%`,
                  transform:
                    (active! + 0.5) / buckets.length < 0.6
                      ? "translateX(16px)"
                      : "translateX(calc(-100% - 16px))",
                }}
              >
                <p className="text-sm font-semibold tabular-nums">
                  {money(hovered.revenue, currency)}
                </p>
                <p className="text-muted-foreground">
                  {label(hovered, true)} ·{" "}
                  {hovered.orders === 1
                    ? "1 order"
                    : `${hovered.orders} orders`}
                </p>
              </div>
            )}
          </div>
          <div aria-hidden className="mt-2 flex text-xs text-muted-foreground">
            {buckets.map((b, i) => (
              <span
                key={b.start}
                className="flex-1 text-center whitespace-nowrap"
              >
                {shown[i] ? label(b) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>Revenue by {unit}</caption>
        <thead>
          <tr>
            <th scope="col">{unit}</th>
            <th scope="col">Revenue</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.start}>
              <td>{label(b, true)}</td>
              <td>{money(b.revenue, currency)}</td>
              <td>{b.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
