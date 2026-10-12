import type { Order } from "@/lib/domain";
import { orderItemsText } from "@/lib/orders/state";
import { money } from "@/lib/payments/pricing";
import { OrderActions } from "./order-actions";
export function OrdersTable({
  orders,
  admin = false,
}: {
  orders: Order[];
  admin?: boolean;
}) {
  if (!orders.length)
    return (
      <p className="rounded-2xl bg-muted p-12 text-center text-sm text-muted-foreground">
        Your orders will appear here.
      </p>
    );
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-neutral-6-transparent">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted text-xs text-muted-foreground">
          <tr>
            {[
              "Order",
              "Date",
              "Customer",
              "Product",
              "Amount",
              "Payment",
              "Fulfillment",
              ...(admin ? ["Actions"] : []),
            ].map((h) => (
              <th key={h} className="px-3 py-4 font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="shadow-[inset_0_calc(-1*var(--border-s))_0_var(--border)] align-top last:border-0 hover:bg-neutral-2"
            >
              <td className="p-3" title={order.id}>
                {order.id.slice(0, 8)}
              </td>
              <td className="whitespace-nowrap p-3">
                {new Date(order.created_at).toLocaleDateString("en-GB")}
              </td>
              <td className="p-3">
                {order.customer_name ?? "—"}
                <span className="block text-xs text-muted-foreground">
                  {order.customer_email}
                </span>
                {admin && order.shipping_address != null && (
                  <pre className="mt-2 max-w-52 whitespace-pre-wrap text-xs">
                    {JSON.stringify(order.shipping_address, null, 2)}
                  </pre>
                )}
              </td>
              <td className="p-3">{orderItemsText(order)}</td>
              <td className="whitespace-nowrap p-3">
                {money(order.amount_total, order.currency)}
                {order.platform_fee_amount !== null && (
                  <span className="block text-xs text-muted-foreground">
                    Pluto fee {money(order.platform_fee_amount, order.currency)}
                  </span>
                )}
              </td>
              <td className="p-3">
                {order.payment_status.replaceAll("_", " ")}
              </td>
              <td className="p-3">
                {order.fulfillment_status.replaceAll("_", " ")}
                {admin && (
                  <p className="mt-2 max-w-52 text-xs text-destructive">
                    {order.fulfillment_error}
                  </p>
                )}
              </td>
              {admin && (
                <td className="p-3">
                  <OrderActions order={order} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
