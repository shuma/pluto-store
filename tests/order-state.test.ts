import { describe, it, expect } from "vitest";
import { canEditDetails, orderStage } from "@/lib/orders/state";

const paid = { payment_status: "paid", gelato_order_id: null } as const;

describe("order stages", () => {
  it("reads payment and fulfilment as one status", () => {
    expect(
      orderStage({
        payment_status: "pending_payment",
        fulfillment_status: "awaiting_payment",
      }),
    ).toBe("unpaid");
    expect(
      orderStage({
        payment_status: "expired",
        fulfillment_status: "awaiting_payment",
      }),
    ).toBe("expired");
    expect(orderStage({ ...paid, fulfillment_status: "manual" })).toBe(
      "preparing",
    );
    expect(orderStage({ ...paid, fulfillment_status: "submitting" })).toBe(
      "preparing",
    );
    expect(orderStage({ ...paid, fulfillment_status: "submitted" })).toBe(
      "in_production",
    );
    expect(orderStage({ ...paid, fulfillment_status: "fulfilled" })).toBe(
      "shipped",
    );
    expect(orderStage({ ...paid, fulfillment_status: "needs_review" })).toBe(
      "attention",
    );
  });
});

describe("editing order details", () => {
  it("is allowed until the order is sent to print", () => {
    expect(canEditDetails({ ...paid, fulfillment_status: "pending" })).toBe(
      true,
    );
    expect(canEditDetails({ ...paid, fulfillment_status: "manual" })).toBe(
      true,
    );
    expect(
      canEditDetails({ ...paid, fulfillment_status: "fulfillment_failed" }),
    ).toBe(true);
  });
  it("is not allowed once it's on its way, or before it's paid", () => {
    expect(canEditDetails({ ...paid, fulfillment_status: "submitting" })).toBe(
      false,
    );
    expect(canEditDetails({ ...paid, fulfillment_status: "submitted" })).toBe(
      false,
    );
    expect(canEditDetails({ ...paid, fulfillment_status: "fulfilled" })).toBe(
      false,
    );
    expect(
      canEditDetails({
        ...paid,
        fulfillment_status: "fulfillment_failed",
        gelato_order_id: "g_1",
      }),
    ).toBe(false);
    expect(
      canEditDetails({
        payment_status: "pending_payment",
        fulfillment_status: "awaiting_payment",
        gelato_order_id: null,
      }),
    ).toBe(false);
  });
});
