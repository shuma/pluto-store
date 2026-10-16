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
  isMainCurrency,
  type Currency,
} from "@/lib/currency";
import { Panel, PANEL_INSET } from "./panel";
import { Button } from "./ui/button";
import { ProductDialog, type ProductDraft } from "./product-dialog";
import { PrintMock } from "./print-mock";
import { Toggles } from "./segmented";

// The store's catalog: what customers can choose from on the poster step,
// with what each one earns, and the way in to add more from Gelato.
export function ProductsManager({
  products,
  costs,
  currency,
  currencies,
  art,
}: {
  products: Product[];
  // The creator's style previews, shown on every print.
  art: Artwork;
  // What each product costs to make and deliver, by id and currency, where
  // Gelato could quote it.
  costs: Record<string, Partial<Record<Currency, UnitCost>>>;
  // The store's main currency, and every currency it sells in. A product is
  // sold in each it has a price in.
  currency: Currency;
  currencies: Currency[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProductDraft | null>(null),
    [busy, setBusy] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const active = products.filter((p) => p.active),
    archived = products.filter((p) => !p.active);
  // The products for sale in at least one of the store's currencies, and
  // any priced in none of them. A product can be left out of a currency on
  // purpose; a currency with nothing in it at all can't be paid in.
  const priced = (p: Product) =>
    currencies.some((c) => p.prices[c] !== undefined);
  const selling = active.filter(priced),
    waiting = active.filter((p) => !priced(p)),
    empty = currencies.filter(
      (c) => !selling.some((p) => p.prices[c] !== undefined),
    );
  async function setCurrencies(next: Currency[]) {
    const added = next.find((c) => !currencies.includes(c)),
      dropped = currencies.find((c) => !next.includes(c));
    try {
      await post("/api/creator/store/currency", { currencies: next });
      toast(
        added
          ? `Your store now also sells in ${CURRENCY_PLURALS[added]}`
          : `Your store no longer sells in ${CURRENCY_PLURALS[dropped!]}`,
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update.");
    }
  }
  // The last of the currencies payouts can be set up in has to stay.
  const mainLeft = currencies.filter(isMainCurrency);
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
            <Button onClick={() => setDraft({ kind: "new" })}>
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
              <span className="text-xs text-muted-foreground">Sell in</span>
              <Toggles
                label="Store currencies"
                options={CURRENCIES.map((c) => ({
                  value: c,
                  label: c.toUpperCase(),
                  locked:
                    currencies.length === 1 ||
                    (isMainCurrency(c) && mainLeft.length === 1),
                  title:
                    isMainCurrency(c) && mainLeft.length === 1
                      ? `${CURRENCY_LABELS[c]}: your payouts are set up in it`
                      : CURRENCY_LABELS[c],
                }))}
                value={currencies}
                onChange={setCurrencies}
              />
            </div>
          </div>
        }
      >
        <div className={PANEL_INSET}>
          {selling.length > 0 && empty.length > 0 && (
            <div className="shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] bg-warning-transparent px-6 py-4">
              <p className="text-sm font-medium">
                Nothing is priced in{" "}
                {listJoin(empty.map((c) => CURRENCY_PLURALS[c]))} yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Customers can’t pay in {empty.length === 1 ? "it" : "them"}{" "}
                until a product has a price. Edit a product to add one, or stop
                selling in {empty.length === 1 ? "it" : "them"} below.
              </p>
            </div>
          )}
          {waiting.length > 0 && (
            <div className="shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] bg-warning-transparent px-6 py-4">
              <p className="text-sm font-medium">
                {waiting.length === 1
                  ? "1 product isn’t"
                  : `${waiting.length} products aren’t`}{" "}
                for sale
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {waiting.length === 1 ? "It has" : "They have"} no price in any
                of your store’s currencies.
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
                  currencies={currencies}
                  art={artFor(art, i)}
                  costs={costs[p.id] ?? {}}
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
          <Button
            variant="ghost"
            size="sm"
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
            <ul
              className={cn(
                PANEL_INSET,
                "mt-2 *:not-last:shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)]",
              )}
            >
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
      <ProductDialog
        draft={draft}
        currency={currency}
        currencies={currencies}
        art={art}
        onOpenChange={(open) => !open && setDraft(null)}
        onSave={async (details, picked) => {
          // The form hands back minor units; the API takes prices as typed
          // and converts them itself, so both routes share one schema.
          const body = {
            ...details,
            prices: Object.fromEntries(
              Object.entries(details.prices).map(([c, v]) => [c, v / 100]),
            ),
          };
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
  currencies,
  costs,
  art,
  busy,
  onEdit,
  onArchive,
}: {
  product: Product;
  currencies: Currency[];
  costs: Partial<Record<Currency, UnitCost>>;
  art: ReturnType<typeof artFor>;
  busy: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
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
      {/* One line per currency: the price, and what it earns once known. */}
      <dl className="space-y-1 text-right text-sm tabular-nums">
        {currencies.map((c) => {
          const price = product.prices[c],
            cost = costs[c];
          const split =
            price === undefined || !cost ? null : payout(price, cost.total, c);
          return (
            <div key={c} className="flex justify-end gap-3">
              <dt className="sr-only">{CURRENCY_LABELS[c]}</dt>
              {price === undefined ? (
                <dd className="text-muted-foreground">
                  Not sold in {c.toUpperCase()}
                </dd>
              ) : (
                <dd className="flex gap-3">
                  <span className="font-medium">{money(price, c)}</span>
                  {cost && split && (
                    <span
                      title={`After ${money(cost.total, c)} print & delivery and ${money(split.platform + split.payment, c)} fees`}
                      className={cn(
                        "font-medium",
                        split.earnings > 0
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      Earn {money(split.earnings, c)}
                    </span>
                  )}
                </dd>
              )}
            </div>
          );
        })}
      </dl>
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

// "euros", "kronor and euros", "dollars, kronor and euros".
function listJoin(items: string[]) {
  return items.length < 2
    ? (items[0] ?? "")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
