import { notFound } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { adminDb, check } from "@/lib/supabase/admin";
import { ORDER_WITH_ITEMS, orderRow } from "@/lib/domain";
import { requireSession } from "@/lib/generations/session";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PaymentStatus } from "@/components/payment-status";
import { Hydrate } from "@/components/hydrate";
import { orderQuery } from "@/lib/queries/order";
import { money } from "@/lib/payments/pricing";
import { itemMockup } from "@/lib/mockups/get-mockup";
import { cachedSignedUrl } from "@/lib/storage";
export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const id = z.uuid().parse((await searchParams).order);
  const { data, error } = await adminDb()
    .from("orders")
    .select(ORDER_WITH_ITEMS)
    .eq("id", id)
    .maybeSingle();
  check(error);
  if (!data) notFound();
  const order = orderRow.parse(data);
  await requireSession(order.generation_session_id, true);
  // Each print hanging in a room. A nicety: the page shows without them.
  const items = await Promise.all(
    order.order_items.map(async (item) => {
      const mockup = await itemMockup(item).catch(() => null);
      return {
        ...item,
        mockupUrl: mockup
          ? await cachedSignedUrl(mockup.bucket, mockup.path)
          : null,
      };
    }),
  );
  const single = items.length === 1;
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-sm font-medium text-muted-foreground mb-8">
          Made personal. Made for you.
        </p>
        <Hydrate
          queryKey={orderQuery(id).queryKey}
          data={{
            paymentStatus: order.payment_status,
            fulfillmentStatus: order.fulfillment_status,
          }}
        >
          <PaymentStatus orderId={id} />
        </Hydrate>
        {/* One print shown large; several side by side. */}
        <ul
          className={
            single
              ? "mx-auto mt-8 max-w-md"
              : "mt-8 grid grid-cols-2 gap-3 sm:gap-4"
          }
        >
          {items.map(
            (item) =>
              item.mockupUrl && (
                <li key={item.id}>
                  <img
                    src={item.mockupUrl}
                    alt={`Your artwork as a ${item.product_snapshot.name}, hanging on a wall`}
                    className="aspect-square w-full rounded-2xl bg-muted object-cover"
                  />
                </li>
              ),
          )}
        </ul>
        <div className="my-8 rounded-2xl bg-muted p-6 text-left text-sm">
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4">
                <span>
                  {item.quantity} × {item.product_snapshot.name}
                </span>
                <span className="tabular-nums">
                  {money(item.unit_amount * item.quantity, order.currency)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between gap-4 shadow-[inset_0_var(--border-s)_0_var(--border)] pt-3 font-medium">
            <span>Total, shipping included</span>
            <span className="tabular-nums">
              {money(order.amount_total, order.currency)}
            </span>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Order {order.id}</p>
        </div>
        <Link href="/" className="text-sm underline underline-offset-4">
          Back to Pluto
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
