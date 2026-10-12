"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ChevronDown, Pencil, Plus, RotateCcw } from "lucide-react";
import type { Product } from "@/lib/domain";
import { sizeBesideName, type UnitCost } from "@/lib/products/catalog";
import { money } from "@/lib/payments/pricing";
import { post, send } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { payout, PLATFORM_FEE_RATE } from "@/lib/fees";
import { artFor, type Artwork } from "@/lib/products/art";
import {
  CURRENCIES,
  CURRENCY_LABELS,
  CURRENCY_PLURALS,
  type Currency,
} from "@/lib/currency";
import { Panel, PANEL_INSET } from "./panel";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { ProductDialog, type ProductDraft } from "./product-dialog";
import { PrintMock } from "./print-mock";
import { Segmented } from "./segmented";

// The store's catalog: what customers can choose from on the poster step,
// with what each one earns, and the way in to add more from Gelato.
export function ProductsManager({
  products,
  costs,
  currency,
  art,
}: {
  products: Product[];
  // The creator's style previews, shown on every print.
  art: Artwork;
  // What each product costs to make and deliver, by id, where Gelato could
  // quote it.
  costs: Record<string, UnitCost>;
  // The store's currency: products priced in it are for sale.
  currency: Currency;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft | null>(null),
    [busy, setBusy] = useState<string | null>(null);
  const [switching, setSwitching] = useState<Currency | null>(null),
    [showArchived, setShowArchived] = useState(false);
  const active = products.filter((p) => p.active),
    archived = products.filter((p) => !p.active);
  // Active products split by currency: the ones for sale, and the ones
  // waiting for a price since the store switched.
  const selling = active.filter((p) => p.currency === currency),
    waiting = active.filter((p) => p.currency !== currency);
  async function setActive(product: Product, on: boolean) {
    setBusy(product.id);
    try {
      await send("PATCH", `/api/creator/products/${product.id}`, {
        active: on,
      });
      router.refresh();
      if (!on)
        toast(`${product.name} archived`, {
          duration: 6000,
          action: { label: "Undo", onClick: () => setActive(product, true) },
        });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <Panel
        title="Your catalog"
        actions={
          <>
            <p className="text-sm tabular-nums text-muted-foreground">
              {selling.length === 1
                ? "1 product"
                : `${selling.length} products`}{" "}
              for sale
            </p>
            <Button
              onClick={() => setDraft({ kind: "new" })}
            >
              <Plus data-icon="inline-start" />
              Add product
            </Button>
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p className="max-w-xl text-sm text-muted-foreground">
              Customers pay your price with shipping included. You earn what’s
              left after print & delivery, card processing and the{" "}
              {Math.round(PLATFORM_FEE_RATE * 100)}% Pluto fee.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Currency</span>
              <Segmented
                label="Store currency"
                size="sm"
                options={CURRENCIES.map((c) => ({
                  value: c,
                  label: c.toUpperCase(),
                  title: CURRENCY_LABELS[c],
                }))}
                value={currency}
                onChange={setSwitching}
              />
            </div>
          </div>
        }
      >
        <div className={PANEL_INSET}>
          {waiting.length > 0 && (
            <div className="shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] bg-warning-transparent px-6 py-4">
              <p className="text-sm font-medium">
                {waiting.length === 1
                  ? "1 product needs"
                  : `${waiting.length} products need`}{" "}
                a price in {CURRENCY_PLURALS[currency]}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                They aren’t for sale until they have one.
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {waiting.map((p) => (
                  <li key={p.id}>
                    <Button
                      variant="outline"
                      className="h-9 rounded-xl px-3"
                      onClick={() => setDraft({ kind: "edit", product: p })}
                    >
                      {p.name}
                      <span className="text-muted-foreground line-through">
                        {money(p.price_amount, p.currency)}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {selling.length ? (
            <ul className="*:not-last:shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)]">
              {selling.map((p, i) => (
                <Row
                  key={p.id}
                  product={p}
                  art={artFor(art, i)}
                  cost={costs[p.id]}
                  busy={busy === p.id}
                  onEdit={() =>
                    setDraft({ kind: "edit", product: p, artIndex: i })
                  }
                  onArchive={() => setActive(p, false)}
                />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <p className="font-medium">
                {waiting.length
                  ? "Nothing for sale yet"
                  : "Add your first product"}
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Choose the prints customers can order, from posters to framed
                pieces. Your store needs at least one to go live.
              </p>
              <Button
                size="lg"
                className="mt-6 h-12 rounded-xl px-8"
                onClick={() => setDraft({ kind: "new" })}
              >
                <Plus data-icon="inline-start" />
                Browse prints
              </Button>
            </div>
          )}
        </div>
      </Panel>
      {archived.length > 0 && (
        <div className="mt-4">
          <Button variant="ghost" size="sm"
            type="button"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((open) => !open)}
            className="gap-1 px-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                !showArchived && "-rotate-90",
              )}
            />
            Archived ({archived.length})
          </Button>
          {showArchived && (
            <ul className={cn(PANEL_INSET, "mt-2 *:not-last:shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)]")}>
              {archived.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-4 px-6 py-3 text-sm text-muted-foreground"
                >
                  <span className="flex-1 truncate">
                    {[p.name, sizeBesideName(p.name, p.width_mm, p.height_mm)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  <Button
                    variant="ghost"
                    className="h-9 rounded-xl px-3"
                    disabled={busy === p.id}
                    onClick={() => setActive(p, true)}
                  >
                    <RotateCcw data-icon="inline-start" />
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <CurrencyDialog
        from={currency}
        to={switching}
        selling={selling.length}
        restored={active.filter((p) => p.currency === switching).length}
        onClose={() => setSwitching(null)}
        onConfirm={async () => {
          await post("/api/creator/store/currency", { currency: switching });
          toast(`Your store now sells in ${CURRENCY_PLURALS[switching!]}`);
          setSwitching(null);
          router.refresh();
        }}
      />
      <ProductDialog
        draft={draft}
        currency={currency}
        art={art}
        onOpenChange={(open) => !open && setDraft(null)}
        onSave={async (details, picked) => {
          // The form hands back minor units; the API takes the price as typed
          // and converts it itself, so both routes share one schema.
          const body = { ...details, price: details.price / 100 };
          if (draft?.kind === "edit")
            await send(
              "PATCH",
              `/api/creator/products/${draft.product.id}`,
              body,
            );
          else if (picked)
            await post("/api/creator/products", {
              ...body,
              catalog: picked.catalog,
              productUid: picked.productUid,
            });
          toast(
            draft?.kind === "edit" ? "Product saved" : "Added to your store",
          );
          setDraft(null);
          router.refresh();
        }}
      />
    </>
  );
}

function Row({
  product,
  cost,
  art,
  busy,
  onEdit,
  onArchive,
}: {
  product: Product;
  cost?: UnitCost;
  art: ReturnType<typeof artFor>;
  busy: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const currency = product.currency as Currency;
  const split =
    cost === undefined
      ? null
      : payout(product.price_amount, cost.total, currency);
  const details = [
    sizeBesideName(product.name, product.width_mm, product.height_mm),
    ...Object.values(product.gelato_attributes),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex flex-wrap items-center gap-4 px-4 py-3 sm:flex-nowrap">
      <PrintMock
        catalog={product.gelato_catalog}
        widthMm={product.width_mm}
        heightMm={product.height_mm}
        frameColour={product.gelato_attributes["Frame colour"]}
        artUrl={art.src}
        fallbackUrl={art.fallback}
        className="size-16 shrink-0 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{product.name}</p>
        <p className="truncate text-sm text-muted-foreground">{details}</p>
        {!product.gelato_product_uid && (
          <p className="text-xs text-warning">Fulfilled manually for now</p>
        )}
      </div>
      <div className="text-right tabular-nums">
        <p className="font-medium">{money(product.price_amount, currency)}</p>
        {cost && split && (
          <p
            className="text-sm"
            title={`After ${money(cost.total, currency)} print & delivery and ${money(split.platform + split.payment, currency)} fees`}
          >
            <span
              className={cn(
                "font-medium",
                split.earnings > 0
                  ? "text-success"
                  : "text-destructive",
              )}
            >
              Earn {money(split.earnings, currency)}
            </span>
          </p>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          aria-label={`Edit ${product.name}`}
          onClick={onEdit}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl"
          aria-label={`Archive ${product.name}`}
          disabled={busy}
          onClick={onArchive}
        >
          <Archive />
        </Button>
      </div>
    </li>
  );
}

// Switching currency never converts prices, so say plainly what happens to
// the products on sale before it does.
function CurrencyDialog({
  from,
  to,
  selling,
  restored,
  onClose,
  onConfirm,
}: {
  from: Currency;
  to: Currency | null;
  selling: number;
  restored: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const toName = to ? CURRENCY_PLURALS[to] : "";
  const fromName = CURRENCY_PLURALS[from];
  return (
    <Dialog open={Boolean(to)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <div className="px-6 pt-6 pb-6">
          <DialogTitle className="text-lg font-semibold">
            Sell in {toName}?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2 space-y-3 text-sm text-muted-foreground">
              <p>
                Customers will pay in {toName}, and printing costs and your
                earnings are shown in {toName} too.
              </p>
              {selling > 0 && (
                <p>
                  {selling === 1
                    ? "Your 1 product priced"
                    : `Your ${selling} products priced`}{" "}
                  in {fromName} will stop selling until you give{" "}
                  {selling === 1 ? "it a price" : "them prices"} in {toName}.
                  Prices aren’t converted, and switching back brings them back
                  as they were.
                </p>
              )}
              {restored > 0 && (
                <p>
                  {restored === 1
                    ? "1 product already priced"
                    : `${restored} products already priced`}{" "}
                  in {toName} will go back on sale.
                </p>
              )}
            </div>
          </DialogDescription>
        </div>
        <div className="flex justify-end gap-2 shadow-[inset_0_var(--border-s)_0_var(--border)] bg-neutral-2 px-6 py-4">
          <Button
            variant="ghost"
            className="h-11 rounded-xl px-4"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="h-11 rounded-xl px-6"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Could not switch.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Switching…" : `Switch to ${to?.toUpperCase()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
