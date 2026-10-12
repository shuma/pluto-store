"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, Pencil } from "lucide-react";
import type { Order } from "@/lib/domain";
import {
  canEditDetails,
  orderStage,
  STAGE_LABELS,
  type OrderStage,
} from "@/lib/orders/state";
import { formatSize, isFramed } from "@/lib/products/catalog";
import { shippingSchema, orderUpdateSchema } from "@/lib/validation/schemas";
import { money } from "@/lib/payments/pricing";
import { send } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { FIELD, Field } from "./form-field";

const NOTE_MAX = 1000;
const TONES: Record<OrderStage, string> = {
  unpaid: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  preparing:
    "bg-warning-transparent text-warning",
  in_production: "bg-color-3 text-neutral-10",
  shipped:
    "bg-success-transparent text-success",
  attention: "bg-error-transparent text-error",
};
// What each status means for the creator, in the order's details.
const STAGE_HELP: Record<OrderStage, string> = {
  unpaid: "The customer started checkout but hasn’t paid yet.",
  expired: "The customer left checkout without paying.",
  preparing: "Paid. We’re getting it ready to print.",
  in_production: "Being printed and packed.",
  shipped: "On its way to the customer.",
  attention:
    "Something held this order up. We’re looking into it and will sort it out.",
};

export function StageBadge({
  order,
}: {
  order: Pick<Order, "payment_status" | "fulfillment_status">;
}) {
  const stage = orderStage(order);
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-3 text-xs font-medium whitespace-nowrap",
        TONES[stage],
      )}
    >
      {STAGE_LABELS[stage]}
    </span>
  );
}

// One order in full: what was bought, by whom and where it's going, with
// the details editable until it is sent to print and a private note.
export function OrderSheet({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={Boolean(order)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md data-[side=right]:sm:max-w-md">
        {/* Keyed so each order gets fresh forms. */}
        {order && <Details key={order.id} order={order} />}
      </SheetContent>
    </Sheet>
  );
}

// A print hanging in a room, as the customer saw it before buying. Hidden
// if it can't be drawn, such as an order whose artwork has been removed.
function ItemMockup({
  orderId,
  itemId,
  className,
}: {
  orderId: string;
  itemId: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={`/api/creator/orders/${orderId}/mockup?item=${itemId}`}
      alt=""
      onError={() => setFailed(true)}
      className={cn("rounded-xl bg-muted object-cover", className)}
    />
  );
}

function Details({ order }: { order: Order }) {
  const stage = orderStage(order);
  const items = order.order_items;
  const created = new Date(order.created_at);
  const address = shippingSchema.safeParse(order.shipping_address);
  return (
    <>
      <div className="shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] px-6 pt-6 pb-6">
        <SheetTitle className="text-lg font-semibold tabular-nums">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </SheetTitle>
        <SheetDescription className="mt-1">
          {created.toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </SheetDescription>
        <div className="mt-4 rounded-xl bg-neutral-2 px-4 py-3">
          <StageBadge order={order} />
          <p className="mt-2 text-sm text-muted-foreground">
            {STAGE_HELP[stage]}
          </p>
        </div>
      </div>
      <Section title={items.length > 1 ? "Prints" : "Print"}>
        {/* One print shown large; several as a list with small pictures. */}
        {items.length === 1 && (
          <ItemMockup
            orderId={order.id}
            itemId={items[0].id}
            className="mb-4 aspect-square w-full"
          />
        )}
        <ul className="space-y-3">
          {items.map((item) => {
            const product = item.product_snapshot;
            return (
              <li key={item.id} className="flex items-center gap-3">
                {items.length > 1 && (
                  <ItemMockup
                    orderId={order.id}
                    itemId={item.id}
                    className="size-14 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {item.quantity > 1 && `${item.quantity} × `}
                    {product.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatSize(product.width_mm, product.height_mm)} ·{" "}
                    {isFramed(product.gelato_catalog) ? "Framed" : "Unframed"}
                    {Object.values(product.gelato_attributes).length > 0 &&
                      ` · ${Object.values(product.gelato_attributes).join(" · ")}`}
                  </p>
                </div>
                {items.length > 1 && (
                  <span className="text-sm tabular-nums">
                    {money(item.unit_amount * item.quantity, order.currency)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <dl className="mt-4 space-y-1 text-sm tabular-nums">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Customer paid</dt>
            <dd>{money(order.amount_total, order.currency)}</dd>
          </div>
        </dl>
      </Section>
      {order.payment_status === "paid" ? (
        <Customer
          order={order}
          address={address.success ? address.data : null}
        />
      ) : (
        <Section title="Customer">
          <p className="text-sm text-muted-foreground">
            Customer details arrive when the order is paid.
          </p>
        </Section>
      )}
      <Note order={order} />
    </>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] px-6 py-6 last:border-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const detailsForm = orderUpdateSchema.required({
  customer_name: true,
  customer_email: true,
  shipping_address: true,
});
type DetailsInput = z.input<typeof detailsForm>;

function Customer({
  order,
  address,
}: {
  order: Order;
  address: z.infer<typeof shippingSchema> | null;
}) {
  const router = useRouter();
  const editable = canEditDetails(order);
  const [editing, setEditing] = useState(false),
    [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DetailsInput, unknown, z.output<typeof detailsForm>>({
    resolver: zodResolver(detailsForm),
    defaultValues: {
      customer_name: order.customer_name ?? "",
      customer_email: order.customer_email ?? "",
      shipping_address: {
        line1: address?.line1 ?? "",
        line2: address?.line2 ?? "",
        city: address?.city ?? "",
        postal_code: address?.postal_code ?? "",
        state: address?.state ?? "",
      },
    },
  });
  return (
    <Section
      title="Customer and delivery"
      action={
        editable ? (
          !editing && (
            <Button
              variant="ghost"
              className="h-8 rounded-lg px-3"
              onClick={() => setEditing(true)}
            >
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
          )
        ) : (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title="Sent to print, so the details can’t change"
          >
            <Lock className="size-3" />
            Locked
          </span>
        )
      }
    >
      {editing ? (
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            setMessage("");
            try {
              await send("PATCH", `/api/creator/orders/${order.id}`, values);
              toast("Order updated");
              setEditing(false);
              router.refresh();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Could not save.");
            }
          })}
        >
          <Field
            id="customer-name"
            label="Name"
            hint="As it should appear on the parcel."
            error={errors.customer_name?.message}
          >
            <input
              id="customer-name"
              autoComplete="off"
              aria-invalid={!!errors.customer_name}
              className={cn(FIELD, "h-11")}
              {...register("customer_name")}
            />
          </Field>
          <Field
            id="customer-email"
            label="Email"
            hint="Where delivery updates go."
            error={errors.customer_email?.message}
          >
            <input
              id="customer-email"
              type="email"
              autoComplete="off"
              aria-invalid={!!errors.customer_email}
              className={cn(FIELD, "h-11")}
              {...register("customer_email")}
            />
          </Field>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">
              Shipping address
            </legend>
            <input
              aria-label="Street address"
              placeholder="Street address"
              aria-invalid={!!errors.shipping_address?.line1}
              className={cn(FIELD, "h-11")}
              {...register("shipping_address.line1")}
            />
            <input
              aria-label="Apartment, suite, etc."
              placeholder="Apartment, suite, etc. (optional)"
              className={cn(FIELD, "h-11")}
              {...register("shipping_address.line2")}
            />
            <div className="grid grid-cols-[2fr_1fr] gap-2">
              <input
                aria-label="City"
                placeholder="City"
                aria-invalid={!!errors.shipping_address?.city}
                className={cn(FIELD, "h-11")}
                {...register("shipping_address.city")}
              />
              <input
                aria-label="Postcode"
                placeholder="Postcode"
                aria-invalid={!!errors.shipping_address?.postal_code}
                className={cn(FIELD, "h-11")}
                {...register("shipping_address.postal_code")}
              />
            </div>
            <input
              aria-label="State or region"
              placeholder="State or region (optional)"
              className={cn(FIELD, "h-11")}
              {...register("shipping_address.state")}
            />
            <p className="text-sm text-muted-foreground">
              {errors.shipping_address?.line1?.message ??
                errors.shipping_address?.city?.message ??
                errors.shipping_address?.postal_code?.message ??
                `Country: ${address?.country ?? "—"} (set by your store’s currency).`}
            </p>
          </fieldset>
          {message && (
            <p role="status" className="text-sm text-destructive">
              {message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-10 rounded-xl px-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving…" : "Save details"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium">{order.customer_name ?? "—"}</p>
            <p className="text-muted-foreground">{order.customer_email}</p>
          </div>
          {address && (
            <address className="text-muted-foreground not-italic">
              {[
                address.line1,
                address.line2,
                // Written the way each country writes it: "San Diego, CA
                // 92101" in the US, "11646 Stockholm" in Sweden.
                address.country === "US"
                  ? `${address.city}, ${[address.state, address.postal_code].filter(Boolean).join(" ")}`
                  : [address.postal_code, address.city].join(" "),
                address.country === "US" ? null : address.state,
                address.country,
              ]
                .filter(Boolean)
                .map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
            </address>
          )}
        </div>
      )}
    </Section>
  );
}

function Note({ order }: { order: Order }) {
  const router = useRouter();
  const [note, setNote] = useState(order.creator_note ?? ""),
    [saving, setSaving] = useState(false);
  const changed = note.trim() !== (order.creator_note ?? "");
  return (
    <Section title="Private note">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={NOTE_MAX}
        rows={3}
        aria-label="Private note"
        placeholder="Only you can see this, like a delivery date you promised."
        className={cn(FIELD, "min-h-20 resize-y py-3 text-sm")}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">
          {note.length}/{NOTE_MAX}
        </span>
        <Button
          variant="outline"
          className="h-9 rounded-xl px-4"
          disabled={!changed || saving}
          onClick={async () => {
            setSaving(true);
            try {
              await send("PATCH", `/api/creator/orders/${order.id}`, {
                creator_note: note,
              });
              toast("Note saved");
              router.refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save.");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save note"}
        </Button>
      </div>
    </Section>
  );
}
