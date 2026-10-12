"use client";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import type { Product } from "@/lib/domain";
import {
  defaultTitle,
  formatSize,
  groupBySize,
  isFramed,
  suggestPrice,
  toMajor,
  type CatalogProduct,
  type SizeGroup,
  type UnitCost,
} from "@/lib/products/catalog";
import {
  catalogProductsQuery,
  catalogsQuery,
  unitCostQuery,
} from "@/lib/queries/catalog";
import { productDetailsSchema } from "@/lib/validation/schemas";
import {
  SIZE_FILTER,
  SIZE_SYSTEM_LABELS,
  type SizeSystem,
} from "@/lib/products/curated";
import { MARKETS, type Currency } from "@/lib/currency";
import { payout, PLATFORM_FEE_RATE } from "@/lib/fees";
import { money } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { FIELD, Field } from "./form-field";
import { PrintMock } from "./print-mock";
import { frameTone } from "@/lib/products/frames";
import { artFor, type Artwork } from "@/lib/products/art";
import { Segmented } from "./segmented";

const DESCRIPTION_MAX = 200;
const FRAME_COLOUR = "FrameColor";

// What is being worked on: a new product picked from the catalog, or one
// already for sale. Both end on the same details form.
export type ProductDraft =
  | { kind: "new" }
  // artIndex keeps the preview the product has in the list.
  | { kind: "edit"; product: Product; artIndex?: number };

export type ProductDetails = z.output<typeof productDetailsSchema>;

// Adding a product in two steps: choose a size, then pick its paper, name and
// price it. Editing skips straight to the second step.
export function ProductDialog({
  draft,
  currency,
  art,
  onOpenChange,
  onSave,
}: {
  draft: ProductDraft | null;
  currency: Currency;
  // The creator's style previews, shown on every print.
  art: Artwork;
  onOpenChange: (open: boolean) => void;
  onSave: (
    details: ProductDetails,
    picked: CatalogProduct | null,
  ) => Promise<void>;
}) {
  // The size picked, with the preview its card showed, so the next step
  // shows the same picture.
  const [chosen, setChosen] = useState<{
    group: SizeGroup;
    art: ReturnType<typeof artFor>;
  } | null>(null);
  const picked = chosen?.group ?? null;
  const setPicked = (value: null) => setChosen(value);
  const editing = draft?.kind === "edit" ? draft.product : null;
  const choosing = draft?.kind === "new" && !picked;
  return (
    <Dialog
      open={Boolean(draft)}
      onOpenChange={(open) => {
        if (!open) setPicked(null);
        onOpenChange(open);
      }}
    >
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl",
          !choosing && "sm:max-w-xl",
        )}
      >
        {choosing ? (
          <ChooseStep
            currency={currency}
            art={art}
            onPick={(group, index) =>
              setChosen({ group, art: artFor(art, index) })
            }
          />
        ) : editing ? (
          <DetailsStep
            key={editing.id}
            variants={[
              {
                productUid: editing.gelato_product_uid ?? "",
                catalog: editing.gelato_catalog ?? "posters",
                widthMm: editing.width_mm,
                heightMm: editing.height_mm,
                size: formatSize(editing.width_mm, editing.height_mm),
                details: Object.values(editing.gelato_attributes).join(" · "),
                attributes: editing.gelato_attributes,
              },
            ]}
            linked={Boolean(editing.gelato_product_uid)}
            defaults={{
              name: editing.name,
              description: editing.description,
              // A price in another currency can't carry over; it starts
              // empty (then suggested) with the old one shown.
              price:
                editing.currency === currency
                  ? String(toMajor(editing.price_amount))
                  : "",
            }}
            previousPrice={
              editing.currency !== currency
                ? money(editing.price_amount, editing.currency)
                : undefined
            }
            currency={currency}
            art={artFor(
              art,
              draft?.kind === "edit" ? (draft.artIndex ?? 0) : 0,
            )}
            onSave={(details) => onSave(details, null)}
          />
        ) : picked ? (
          <DetailsStep
            // A fresh form for each size, so values never carry over.
            key={picked.key}
            variants={picked.variants}
            linked
            defaults={{
              name: defaultTitle(picked),
              description: "",
              // Filled with the suggested price once the cost is in.
              price: "",
            }}
            currency={currency}
            art={chosen!.art}
            onBack={() => setPicked(null)}
            onSave={async (details, variant) => {
              await onSave(details, variant);
              setPicked(null);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ChooseStep({
  currency,
  art,
  onPick,
}: {
  currency: Currency;
  art: Artwork;
  // With the card's position, which picks its preview.
  onPick: (group: SizeGroup, index: number) => void;
}) {
  const catalogs = useQuery(catalogsQuery());
  const [chosen, setChosen] = useState<string | null>(null);
  // US stores see inch sizes first, others centimetres; both are a tap away.
  const [system, setSystem] = useState<SizeSystem>(
    currency === "usd" ? "imperial" : "metric",
  );
  const [frame, setFrame] = useState("black");
  const list = catalogs.data?.configured ? catalogs.data.catalogs : [];
  const catalog = chosen ?? list[0]?.uid ?? "";
  const framed = isFramed(catalog);
  const products = useQuery(
    catalogProductsQuery(catalog, {
      [SIZE_FILTER]: [system],
      ...(framed ? { [FRAME_COLOUR]: [frame] } : {}),
    }),
  );
  const groups = groupBySize(products.data?.products ?? []);
  const frames =
    products.data?.filters.find((f) => f.uid === FRAME_COLOUR)?.values ?? [];
  // Prints are drawn against the tallest one on show.
  const tallest = Math.max(...groups.map((g) => g.heightMm), 1);
  const frameTitle = frames.find((f) => f.uid === frame)?.title;
  return (
    <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <div className="shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] px-6 pt-6 pb-4">
        <DialogTitle className="text-lg font-semibold">
          Add a product
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">
          Pick a size. Each one shows what you’d earn at a suggested price.
        </DialogDescription>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          {list.length > 1 && (
            <Segmented
              label="Kind of print"
              options={list.map((c) => ({ value: c.uid, label: c.title }))}
              value={catalog}
              onChange={setChosen}
            />
          )}
          <Segmented
            label="Sizes"
            options={(["metric", "imperial"] as const).map((s) => ({
              value: s,
              label: SIZE_SYSTEM_LABELS[s],
            }))}
            value={system}
            onChange={setSystem}
          />
        </div>
        {framed && frames.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              Frame
            </span>
            <Segmented
              label="Frame colour"
              size="sm"
              options={frames.map((f) => ({
                value: f.uid,
                label: (
                  <>
                    <span
                      aria-hidden
                      className="size-3 rounded-full ring-1 ring-neutral-6-transparent"
                      style={{ backgroundColor: frameTone(f.title) }}
                    />
                    {f.title}
                  </>
                ),
              }))}
              value={frame}
              onChange={setFrame}
            />
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {catalogs.data && !catalogs.data.configured ? (
          <Notice>
            The print catalog isn’t available right now. Try again later.
          </Notice>
        ) : catalogs.error || products.error ? (
          <Notice>
            {(catalogs.error ?? products.error)?.message}{" "}
            <button
              type="button"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              onClick={() =>
                catalogs.error ? catalogs.refetch() : products.refetch()
              }
            >
              Try again
            </button>
          </Notice>
        ) : (
          <>
            <div
              className={cn(
                "grid grid-cols-2 gap-3 transition-opacity sm:grid-cols-3",
                products.isPlaceholderData && "opacity-60",
              )}
            >
              {products.isPending || catalogs.isPending
                ? Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
                  ))
                : groups.map((group, i) => (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => onPick(group, i)}
                      className="group flex flex-col rounded-2xl ring-1 ring-neutral-6-transparent bg-background p-2 text-left transition-[border-color,box-shadow] hover:ring-neutral-6 hover:shadow-sm focus-ring"
                    >
                      <PrintMock
                        catalog={group.catalog}
                        widthMm={group.widthMm}
                        heightMm={group.heightMm}
                        frameColour={frameTitle}
                        artUrl={artFor(art, i).src}
                        fallbackUrl={art.fallback}
                        scale={group.heightMm / tallest}
                        className="mb-3 aspect-[5/4] rounded-xl transition-transform"
                      />
                      <span className="px-1 text-sm font-medium">
                        {group.size}
                      </span>
                      <span className="px-1 text-xs text-muted-foreground">
                        {defaultTitle(group)}
                      </span>
                      <CardEarnings
                        productUid={group.variants[0].productUid}
                        currency={currency}
                      />
                    </button>
                  ))}
            </div>
            {!products.isPending && !groups.length && (
              <Notice>Nothing matches. Try the other sizes.</Notice>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// What a size earns at its suggested price, in one line, so sizes can be
// compared before one is picked. The full breakdown is on the next step.
function CardEarnings({
  productUid,
  currency,
}: {
  productUid: string;
  currency: Currency;
}) {
  // One quote per card, cached on the server, so the grid never waits on
  // the slowest price.
  const cost = useQuery(unitCostQuery(productUid));
  if (cost.isPending) return <Skeleton className="mx-1 mt-3 mb-1 h-4 w-3/4" />;
  if (!cost.data)
    return (
      <span className="mt-3 px-1 pb-1 text-xs text-muted-foreground">
        Price unavailable
      </span>
    );
  const price = suggestPrice(cost.data.total, currency);
  const { earnings } = payout(price, cost.data.total, currency);
  return (
    <span className="mt-3 px-1 pb-1 text-sm tabular-nums">
      <span className="font-medium text-success">
        Earn {money(earnings, currency)}
      </span>{" "}
      <span className="text-muted-foreground">at {money(price, currency)}</span>
    </span>
  );
}

function DetailsStep({
  variants,
  linked,
  defaults,
  currency,
  art,
  previousPrice,
  onBack,
  onSave,
}: {
  // The papers this size comes in; one when editing.
  variants: CatalogProduct[];
  // Whether the product is a catalog print with a cost to show.
  linked: boolean;
  defaults: { name: string; description: string; price: string };
  currency: Currency;
  art: ReturnType<typeof artFor>;
  // The old price when the store has switched currency since.
  previousPrice?: string;
  onBack?: () => void;
  onSave: (details: ProductDetails, variant: CatalogProduct) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState(variants[0]);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<z.input<typeof productDetailsSchema>, unknown, ProductDetails>({
    resolver: zodResolver(productDetailsSchema),
    defaultValues: defaults,
  });
  const [price, description] = useWatch({
    control,
    name: ["price", "description"],
  });
  const cost = useQuery(unitCostQuery(linked ? variant.productUid : null));
  const priceMinor = Math.round(Number(price) * 100);
  const suggested = cost.data ? suggestPrice(cost.data.total, currency) : null;
  // A new product follows the suggested price, including when the paper
  // changes, until the creator types their own.
  const follows = !defaults.price && !dirtyFields.price;
  useEffect(() => {
    if (follows && suggested !== null)
      setValue("price", String(toMajor(suggested)));
  }, [follows, suggested, setValue]);
  const framed = isFramed(variant.catalog);
  const paper = variant.attributes.Paper;
  const frame = variant.attributes["Frame colour"];
  // "$" goes before the amount, "kr" after, as each is written.
  const parts = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).formatToParts(1);
  const symbol = parts.find((p) => p.type === "currency")?.value ?? "";
  const symbolFirst =
    parts.findIndex((p) => p.type === "currency") <
    parts.findIndex((p) => p.type === "integer");
  return (
    <form
      className="flex max-h-[calc(100dvh-2rem)] flex-col"
      onSubmit={handleSubmit(async (values) => {
        setMessage("");
        try {
          await onSave(values, variant);
        } catch (e) {
          setMessage(e instanceof Error ? e.message : "Could not save.");
        }
      })}
    >
      <div className="shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] px-6 pt-6 pb-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> All sizes
          </button>
        )}
        <DialogTitle className="text-lg font-semibold">
          {onBack ? "Name and price it" : "Edit product"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">
          This is what customers see when they choose a size.
        </DialogDescription>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <div className="flex items-center gap-4">
          <PrintMock
            catalog={variant.catalog}
            widthMm={variant.widthMm}
            heightMm={variant.heightMm}
            frameColour={frame}
            artUrl={art.src}
            fallbackUrl={art.fallback}
            className="size-24 shrink-0 rounded-2xl"
          />
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium">
              {framed ? "Framed print" : "Poster"} · {variant.size}
            </p>
            {variants.length > 1 ? (
              <Segmented
                label="Paper"
                size="sm"
                options={variants.map((v) => ({
                  value: v.productUid,
                  label: v.attributes.Paper ?? v.details,
                }))}
                value={variant.productUid}
                onChange={(uid) =>
                  setVariant(variants.find((v) => v.productUid === uid)!)
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {variant.details || "Printed and shipped for you"}
              </p>
            )}
          </div>
        </div>
        <Field
          id="product-name"
          label="Name"
          hint={`Keep it short, like “${framed ? "Large framed print" : "Large poster"}”.`}
          error={errors.name?.message}
        >
          <input
            id="product-name"
            aria-invalid={!!errors.name}
            className={cn(FIELD, "h-12")}
            {...register("name")}
          />
        </Field>
        <Field
          id="product-description"
          label="Description"
          hint="Optional. What makes it special."
          error={errors.description?.message}
          aside={
            <span className="tabular-nums">
              {description?.length ?? 0}/{DESCRIPTION_MAX}
            </span>
          }
        >
          <textarea
            id="product-description"
            rows={3}
            placeholder={describe(framed, paper, frame)}
            aria-invalid={!!errors.description}
            className={cn(FIELD, "min-h-24 resize-y py-3")}
            {...register("description")}
          />
        </Field>
        <div>
          <label
            htmlFor="product-price"
            className="mb-2 block text-sm font-medium"
          >
            Price
          </label>
          <div
            className={cn(
              FIELD,
              "flex h-12 items-center gap-1 px-3 focus-within:shadow-[inset_0_0_0_var(--border-s)_var(--color-1-transparent),var(--surface-recessed-shadow)] has-[:focus-visible]:[outline:var(--focus-ring-outline)]",
              errors.price && "shadow-[inset_0_0_0_var(--border-s)_var(--error),var(--surface-recessed-shadow)]",
            )}
          >
            {symbolFirst && (
              <span className="select-none text-muted-foreground">
                {symbol}
              </span>
            )}
            <input
              id="product-price"
              inputMode="decimal"
              placeholder="0"
              aria-invalid={!!errors.price}
              className="h-full min-w-0 flex-1 bg-transparent tabular-nums outline-none placeholder:text-muted-foreground"
              {...register("price")}
            />
            {!symbolFirst && (
              <span className="select-none text-muted-foreground">
                {symbol}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-sm">
            {errors.price ? (
              <p className="text-destructive">{errors.price.message}</p>
            ) : (
              <p className="text-muted-foreground">
                {previousPrice ? `Was ${previousPrice}. ` : ""}
                What customers pay, shipping included.
              </p>
            )}
            {suggested !== null && suggested !== priceMinor && (
              <button
                type="button"
                onClick={() =>
                  setValue("price", String(toMajor(suggested)), {
                    shouldValidate: true,
                  })
                }
                className="font-medium underline-offset-4 hover:underline"
              >
                Use suggested {money(suggested, currency)}
              </button>
            )}
          </div>
          {linked && (
            <Breakdown
              cost={cost.data}
              pending={cost.isPending}
              price={priceMinor > 0 ? priceMinor : null}
              currency={currency}
            />
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3 shadow-[inset_0_var(--border-s)_0_var(--border)] bg-neutral-2 px-6 py-4">
        {message && (
          <p role="status" className="mr-auto text-sm text-destructive">
            {message}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-12 rounded-xl px-8"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            "Saving…"
          ) : onBack ? (
            <>
              <Check data-icon="inline-start" />
              Add to store
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}

// A description to start from, true to the paper and frame chosen.
function describe(framed: boolean, paper?: string, frame?: string) {
  if (framed)
    return `Framed in ${
      frame?.replace(/ frame$/, "").toLowerCase() ?? "wood"
    } wood behind shatterproof glass, ready to hang.`;
  if (paper === "Archival paper")
    return "Printed on heavy archival paper, made to last for generations.";
  return "Printed on smooth matte paper with rich, even colour.";
}

// Where the customer's money goes, in the same groups as the catalog list:
// print & delivery, fees, and what is left for the creator.
function Breakdown({
  cost,
  pending,
  price,
  currency,
}: {
  cost?: UnitCost;
  pending: boolean;
  price: number | null;
  currency: Currency;
}) {
  if (pending) return <Skeleton className="mt-4 h-40 rounded-xl" />;
  if (!cost)
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        The cost of this print is unavailable right now.
      </p>
    );
  const split = price === null ? null : payout(price, cost.total, currency);
  const earned = split?.earnings ?? null;
  const amount = (value: number | undefined) =>
    value === undefined ? "—" : money(value, currency);
  const rows: { label: string; value: string; detail?: string }[] = [
    { label: "Customer pays", value: amount(price ?? undefined) },
    {
      label: "Print & delivery",
      value: `− ${amount(cost.total)}`,
      detail:
        cost.shipping === null
          ? `Printing ${amount(cost.print)} · delivery not quoted`
          : `Printing ${amount(cost.print)} · delivery ${amount(cost.shipping)}`,
    },
    {
      label: "Fees",
      value: split ? `− ${amount(split.platform + split.payment)}` : "—",
      detail: split
        ? `Pluto ${Math.round(PLATFORM_FEE_RATE * 100)}% ${amount(split.platform)} · card processing ${amount(split.payment)}`
        : undefined,
    },
  ];
  return (
    <div className="mt-4 rounded-xl bg-neutral-2 px-4 py-1 text-sm">
      <dl>
        {rows.map((row) => (
          <div key={row.label} className="py-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="tabular-nums">{row.value}</dd>
            </div>
            {row.detail && (
              <p className="mt-1 text-xs text-neutral-6 tabular-nums">
                {row.detail}
              </p>
            )}
          </div>
        ))}
        <div className="flex justify-between shadow-[inset_0_var(--border-s)_0_var(--border)] py-3 text-base font-medium">
          <dt>You earn per sale</dt>
          <dd
            className={cn(
              "tabular-nums",
              earned !== null && earned > 0
                ? "text-success"
                : earned !== null && "text-destructive",
            )}
          >
            {amount(earned ?? undefined)}
          </dd>
        </div>
      </dl>
      {earned !== null && earned <= 0 && (
        <p className="pb-3 text-destructive">
          This price doesn’t cover printing, delivery and fees.
        </p>
      )}
      <p className="shadow-[inset_0_var(--border-s)_0_var(--border)] py-3 text-xs text-muted-foreground">
        Delivery is standard home delivery within {MARKETS[currency].name}. Card
        processing is an estimate for a standard card.
      </p>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="grid min-h-40 place-items-center px-6 text-center text-sm text-muted-foreground">
      <span>{children}</span>
    </p>
  );
}
