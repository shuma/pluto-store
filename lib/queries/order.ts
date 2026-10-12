import { queryOptions } from "@tanstack/react-query";

export type OrderStatus = {
  paymentStatus: "pending_payment" | "paid" | "expired";
  fulfillmentStatus: string;
};

export function orderQuery(orderId: string) {
  return queryOptions({
    queryKey: ["order", orderId] as const,
    queryFn: async (): Promise<OrderStatus> => {
      const response = await fetch(`/api/orders/${orderId}`);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not check your order.");
      return data;
    },
    // Stripe confirms out of band, so poll until the payment settles either
    // way. An expired order never settles again, so stop there too.
    refetchInterval: (query) => {
      const status = query.state.data?.paymentStatus;
      return status === "paid" || status === "expired" ? false : 3000;
    },
  });
}
