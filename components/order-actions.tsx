"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Order } from "@/lib/domain";
import { canSubmit, canMarkFulfilled } from "@/lib/orders/state";
import { post } from "@/lib/client-api";
export function OrderActions({ order }: { order: Order }) {
  const router = useRouter(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function update(kind: string) {
    setBusy(true);
    try {
      await post(`/api/fulfillment/${kind}`, { orderId: order.id });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update order.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex min-w-32 flex-col gap-3 text-xs">
      {order.payment_status === "paid" &&
        order.order_items.map((item, i) => (
          <a
            key={item.id}
            className="underline"
            href={`/api/orders/${order.id}/print?item=${item.id}`}
          >
            Download print
            {order.order_items.length > 1 &&
              ` ${i + 1} (${item.quantity} × ${item.product_snapshot.name})`}
          </a>
        ))}
      {canSubmit(order) && (
        <button
          disabled={busy}
          className="text-left underline"
          onClick={() => update("retry")}
        >
          Retry fulfillment
        </button>
      )}
      {canMarkFulfilled(order) && (
        <button
          disabled={busy}
          className="text-left underline"
          onClick={() => update("manual")}
        >
          Mark fulfilled
        </button>
      )}
      <p role="alert">{error}</p>
    </div>
  );
}
