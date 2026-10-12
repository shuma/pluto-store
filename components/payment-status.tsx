"use client";
import { useQuery } from "@tanstack/react-query";
import { orderQuery } from "@/lib/queries/order";
export function PaymentStatus({ orderId }: { orderId: string }) {
  const { data, isError } = useQuery(orderQuery(orderId));
  const paid = data?.paymentStatus === "paid";
  return (
    <div aria-live="polite">
      <h1 className="font-semibold text-5xl md:text-6xl">
        {paid ? (
          <>
            A little piece
            <br />
            of you, on its way.
          </>
        ) : (
          "Confirming your payment."
        )}
      </h1>
      <p className="mx-auto mt-6 max-w-md text-sm text-muted-foreground">
        {paid
          ? "Your payment is confirmed. Your poster is now in our fulfillment queue. Thank you for making something personal."
          : "We’re waiting for payment confirmation. This page updates automatically; you can safely return to it later."}
      </p>
      {isError && (
        <p className="mt-4 text-sm">
          We’re having trouble checking your order. Please refresh in a moment.
        </p>
      )}
    </div>
  );
}
