"use client";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import { printCount, type Order } from "@/lib/domain";
import {
  orderItemsText,
  orderStage,
  orderTitle,
  STAGE_LABELS,
  type OrderStage,
} from "@/lib/orders/state";
import { isFramed, sizeBesideName } from "@/lib/products/catalog";
import { money } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Segmented } from "./segmented";
import { PANEL_HEADER, PANEL_INSET, PANEL_SHELL } from "./panel";
import { FIELD } from "./form-field";
import { OrderSheet, StageBadge } from "./order-sheet";

const PAGE = 50;

// The groups a creator works through, each a set of stages. The page opens
// on sales; checkouts that never paid have their own group.
const VIEWS = {
  paid: {
    label: "Paid",
    stages: ["preparing", "attention", "in_production", "shipped"],
  },
  todo: { label: "To fulfil", stages: ["preparing", "attention"] },
  production: { label: "In production", stages: ["in_production"] },
  shipped: { label: "Shipped", stages: ["shipped"] },
  unpaid: { label: "Unpaid", stages: ["unpaid", "expired"] },
} satisfies Record<string, { label: string; stages: OrderStage[] }>;
export type View = keyof typeof VIEWS;

export const shortId = (id: string) => id.slice(0, 8).toUpperCase();

// A store's orders for the chosen period, searchable and filterable in
// place, each opening into its details, and downloadable as a spreadsheet.
// "To fulfil" is a work queue rather than a slice of the period, so it shows
// every waiting order whatever the dates, and carries their count.
export function OrdersBoard({
  orders,
  queue,
  truncated,
  now,
  view,
  onViewChange,
}: {
  // The orders in the chosen period.
  orders: Order[];
  // Every loaded order, for the "To fulfil" queue.
  queue: Order[];
  view: View;
  onViewChange: (view: View) => void;
  // When the page was rendered, so this year's dates can drop the year.
  now: number;
  // True when older orders exist beyond what was loaded.
  truncated: boolean;
}) {
  const [query, setQuery] = useState(""),
    [shown, setShown] = useState(PAGE),
    [openId, setOpenId] = useState<string | null>(null);
  const waiting = useMemo(
    () =>
      queue.filter((o) =>
        (VIEWS.todo.stages as OrderStage[]).includes(orderStage(o)),
      ).length,
    [queue],
  );
  const source = view === "todo" ? queue : orders;
  const matches = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const stages = VIEWS[view].stages as OrderStage[];
    return source.filter((order) => {
      if (!stages.includes(orderStage(order))) return false;
      const haystack = [
        order.id,
        order.customer_name,
        order.customer_email,
        orderItemsText(order),
      ]
        .join(" ")
        .toLowerCase();
      return words.every((word) => haystack.includes(word.replace(/^#/, "")));
    });
  }, [source, query, view]);
  const open = queue.find((o) => o.id === openId) ?? null;
  const pick = (v: View) => {
    onViewChange(v);
    setShown(PAGE);
  };
  return (
    <>
      <section className={PANEL_SHELL}>
        {/* Title and views on the left, finding and exporting on the right. */}
        <div className={PANEL_HEADER}>
          <h2 className="text-sm font-medium">Orders</h2>
          <Segmented
            label="Show"
            size="sm"
            options={(Object.keys(VIEWS) as View[]).map((v) => ({
              value: v,
              label:
                v === "todo" && waiting > 0 ? (
                  <>
                    {VIEWS[v].label}
                    <span className="grid h-4 min-w-4 place-items-center rounded-full bg-warning px-1 text-2xs font-semibold text-neutral-1 tabular-nums">
                      {waiting}
                    </span>
                  </>
                ) : (
                  VIEWS[v].label
                ),
            }))}
            value={view}
            onChange={pick}
          />
          <div className="ml-auto flex flex-wrap items-center gap-x-2 gap-y-2">
            <label className="relative block">
              <span className="sr-only">Search orders</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShown(PAGE);
                }}
                placeholder="Search orders"
                className={cn(FIELD, "h-9 w-56 max-w-full pl-8 md:text-sm")}
              />
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={!matches.length}
              onClick={() => downloadCsv(matches)}
            >
              <Download data-icon="inline-start" />
              Export
            </Button>
          </div>
        </div>
        {/* What needs the creator, pointed at from any other view. */}
        {view !== "todo" && waiting > 0 && (
          <div className="mx-1 mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-warning-transparent text-neutral-10 px-4 py-3 text-sm">
            <span className="size-2 shrink-0 rounded-full bg-warning" />
            <span className="font-medium">
              {waiting === 1
                ? "1 order is waiting to print"
                : `${waiting} orders are waiting to print`}
            </span>
            <button
              type="button"
              onClick={() => pick("todo")}
              className="ml-auto inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              Review
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
        {view === "todo" && (
          <p className="px-3 pb-2 text-xs text-muted-foreground">
            Every paid order waiting to print, whatever the period.
          </p>
        )}
        <div className={PANEL_INSET}>
          {!source.length ? (
            <Empty
              title="No orders yet"
              body="When a customer buys a print, it shows up here."
            />
          ) : !matches.length ? (
            <Empty
              title={
                view === "todo" && !query ? "All caught up" : "No orders match"
              }
              body={
                query
                  ? `Nothing matches “${query}” in ${VIEWS[view].label.toLowerCase()}.`
                  : view === "todo"
                    ? "Every paid order has been sent to print."
                    : `No ${VIEWS[view].label.toLowerCase()} orders in this period.`
              }
            />
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-normal">Customer</th>
                  <th className="hidden px-6 py-3 font-normal md:table-cell">
                    Print
                  </th>
                  <th className="hidden w-36 px-6 py-3 font-normal lg:table-cell">
                    Date
                  </th>
                  <th className="w-28 px-6 py-3 text-right font-normal">
                    Total
                  </th>
                  <th className="hidden w-40 px-6 py-3 font-normal sm:table-cell">
                    Status
                  </th>
                  <th className="w-10" aria-hidden />
                </tr>
              </thead>
              <tbody className="[&>tr>td]:shadow-[inset_0_var(--border-s)_0_var(--border)]">
                {matches.slice(0, shown).map((order) => (
                  <Row
                    key={order.id}
                    order={order}
                    year={new Date(now).getFullYear()}
                    onOpen={() => setOpenId(order.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
          {(matches.length > shown || truncated) && (
            <div className="flex items-center justify-center gap-4 shadow-[inset_0_var(--border-s)_0_var(--border)] p-3">
              {matches.length > shown && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShown((n) => n + PAGE)}
                >
                  Show more ({matches.length - shown})
                </Button>
              )}
              {truncated && (
                <p className="text-xs text-muted-foreground">
                  Showing your latest {queue.length} orders.
                </p>
              )}
            </div>
          )}
        </div>
        {source.length > 0 && (
          <p
            role="status"
            className="px-3 pt-2 pb-1 text-xs text-muted-foreground tabular-nums"
          >
            {matches.length === 1 ? "1 order" : `${matches.length} orders`}
            {query && ` matching “${query}”`}
          </p>
        )}
      </section>
      <OrderSheet order={open} onClose={() => setOpenId(null)} />
    </>
  );
}

// A row reads the way a creator recognises an order: who bought it and
// what, then when, with the order number as a quiet reference beneath.
function Row({
  order,
  year,
  onOpen,
}: {
  order: Order;
  // This year, which dates leave out.
  year: number;
  onOpen: () => void;
}) {
  const date = new Date(order.created_at);
  // One print: its size and frame. Several: how many prints in all.
  const only =
    order.order_items.length === 1
      ? order.order_items[0].product_snapshot
      : null;
  const detail = only
    ? [
        sizeBesideName(only.name, only.width_mm, only.height_mm),
        isFramed(only.gelato_catalog) ? "Framed" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : `${printCount(order)} prints`;
  return (
    <tr
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Order ${shortId(order.id)}${order.customer_name ? ` from ${order.customer_name}` : ""}`}
      className="group cursor-pointer align-middle transition-colors outline-none hover:bg-neutral-2 focus-visible:bg-neutral-2"
    >
      <td className="px-6 py-3">
        {order.customer_name ? (
          <>
            <span className="block truncate font-medium">
              {order.customer_name}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {order.customer_email}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">No details yet</span>
        )}
      </td>
      <td className="hidden px-6 py-3 md:table-cell">
        <div className="flex items-center gap-3">
          <Thumbnail orderId={order.id} />
          <div className="min-w-0">
            <span className="block truncate">{orderTitle(order)}</span>
            {detail && (
              <span className="block truncate text-xs text-muted-foreground">
                {detail}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="hidden px-6 py-3 whitespace-nowrap lg:table-cell">
        <span title={date.toLocaleString("en-GB")} className="block">
          {date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: date.getFullYear() === year ? undefined : "numeric",
          })}
        </span>
        <span className="block text-2xs text-neutral-6 tabular-nums">
          #{shortId(order.id)}
        </span>
      </td>
      <td className="px-6 py-3 text-right font-medium tabular-nums">
        {money(order.amount_total, order.currency)}
      </td>
      <td className="hidden px-6 py-3 sm:table-cell">
        <Status order={order} />
      </td>
      <td className="pr-4 text-muted-foreground">
        <ChevronRight
          className="size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      </td>
    </tr>
  );
}

// Calm states read as quiet text with a dot; only a state that needs the
// creator gets a coloured pill.
const QUIET: Partial<Record<OrderStage, string>> = {
  shipped: "bg-success",
  in_production: "bg-color-3",
  unpaid: "bg-neutral-5",
  expired: "bg-neutral-5",
};
function Status({ order }: { order: Order }) {
  const stage = orderStage(order);
  const dot = QUIET[stage];
  if (!dot) return <StageBadge order={order} />;
  return (
    <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap text-muted-foreground">
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {STAGE_LABELS[stage]}
    </span>
  );
}

// The print itself, small, so a creator can tell orders apart by the art.
// Falls back to a plain tile when the file can't be shown.
function Thumbnail({ orderId }: { orderId: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-neutral-6-transparent bg-muted">
      {failed ? (
        <ImageIcon className="size-4 text-neutral-6" aria-hidden />
      ) : (
        <img
          src={`/api/creator/orders/${orderId}/thumbnail`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}

// The orders on screen, as filtered, as a spreadsheet. Amounts are in major
// units ("44.99") with the currency beside them, so they sum in any
// spreadsheet app.
function downloadCsv(orders: Order[]) {
  const header = [
    "Order",
    "Date",
    "Status",
    "Customer",
    "Email",
    "Items",
    "Prints",
    "Currency",
    "Total",
    "Note",
  ];
  const rows = orders.map((o) => [
    shortId(o.id),
    o.created_at,
    STAGE_LABELS[orderStage(o)],
    o.customer_name ?? "",
    o.customer_email ?? "",
    orderItemsText(o),
    String(printCount(o)),
    o.currency.toUpperCase(),
    (o.amount_total / 100).toFixed(2),
    o.creator_note ?? "",
  ]);
  // Quoted, and a leading = + - @ neutralised, so no cell is ever read as a
  // spreadsheet formula.
  const cell = (value: string) =>
    `"${value.replace(/^[=+\-@]/, "'$&").replaceAll('"', '""')}"`;
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-medium">{title}</p>
      <p className={cn("mt-1 text-sm text-muted-foreground")}>{body}</p>
    </div>
  );
}
