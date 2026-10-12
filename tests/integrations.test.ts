import { beforeEach, describe, it, expect, vi } from "vitest";
import type Stripe from "stripe";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  fetch: vi.fn(),
  order: null as unknown,
  updates: [] as unknown[],
  retrieve: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  adminDb: () => ({
    rpc: mocks.rpc,
    // The order read and earnings write that follow a payment.
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const m of ["select", "eq", "is"]) chain[m] = () => chain;
      chain.single = async () => ({ data: mocks.order, error: null });
      chain.update = (values: unknown) => {
        mocks.updates.push(values);
        return chain;
      };
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(resolve);
      return chain;
    },
  }),
  check: (error: unknown) => {
    if (error) throw new Error("database error");
  },
}));
vi.mock("@/lib/payments/stripe", () => ({
  stripeClient: () => ({ paymentIntents: { retrieve: mocks.retrieve } }),
}));
import { order as orderFixture } from "./fixtures";
import { recordCheckoutPayment } from "@/lib/payments/webhook";
import {
  createPosterOrder,
  GelatoSubmissionError,
} from "@/lib/fulfillment/gelato";
const event = (paid = true): Stripe.Event =>
  ({
    id: "evt_1",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        payment_status: paid ? "paid" : "unpaid",
        metadata: { order_id: "11111111-1111-4111-8111-111111111111" },
        payment_intent: "pi_1",
        amount_total: 39900,
        currency: "sek",
        customer_details: { email: "fan@example.com" },
        collected_information: {
          shipping_details: {
            name: "Test Customer",
            address: {
              line1: "Street 1",
              line2: null,
              city: "Stockholm",
              postal_code: "11122",
              state: null,
              country: "SE",
            },
          },
        },
      },
    },
  }) as unknown as Stripe.Event;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.updates.length = 0;
  // A 399 kr order: 15% Pluto fee, 153.42 kr to print and deliver.
  mocks.order = {
    ...orderFixture,
    amount_total: 39900,
    platform_fee_amount: 5985,
    production_cost_amount: 15342,
    creator_earnings_amount: null,
  };
  // Stripe's fee, already in kronor (no conversion).
  mocks.retrieve.mockResolvedValue({
    latest_charge: { balance_transaction: { fee: 780, exchange_rate: null } },
  });
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubEnv("GELATO_API_KEY", "fixture");
  vi.stubEnv("GELATO_ORDER_TYPE", "draft");
});
describe("Stripe payment boundary", () => {
  it("ignores unpaid completed checkout", async () => {
    expect(await recordCheckoutPayment(event(false))).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("records the authoritative identifiers and delivery address atomically", async () => {
    expect(await recordCheckoutPayment(event())).toBe(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(mocks.rpc).toHaveBeenCalledWith(
      "record_payment",
      expect.objectContaining({
        p_event: "evt_1",
        p_session: "cs_1",
        p_intent: "pi_1",
        p_amount: 39900,
        p_currency: "sek",
        p_address: expect.objectContaining({ city: "Stockholm" }),
      }),
    );
  });
  it("does not swallow database failures", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "offline" } });
    await expect(recordCheckoutPayment(event())).rejects.toThrow(
      "database error",
    );
  });
  it("fixes the creator's earnings from Stripe's actual fee", async () => {
    await recordCheckoutPayment(event());
    expect(mocks.retrieve).toHaveBeenCalledWith("pi_1", {
      expand: ["latest_charge.balance_transaction"],
    });
    expect(mocks.updates).toEqual([
      // 399 − 59.85 Pluto − 153.42 print & delivery − 7.80 Stripe.
      { payment_fee_amount: 780, creator_earnings_amount: 17793 },
    ]);
  });
  it("leaves earnings already recorded alone on a replay", async () => {
    mocks.order = { ...(mocks.order as object), creator_earnings_amount: 100 };
    await recordCheckoutPayment(event());
    expect(mocks.retrieve).not.toHaveBeenCalled();
    expect(mocks.updates).toEqual([]);
  });
  it("replays still wake pending fulfillment", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect(await recordCheckoutPayment(event())).not.toBeNull();
  });
});
const input = {
  orderId: "order-1",
  items: [
    {
      itemId: "item-1",
      productUid: "poster-product",
      printFileUrl: "https://example.com/private-print",
      quantity: 1,
    },
    {
      itemId: "item-2",
      productUid: "framed-product",
      printFileUrl: "https://example.com/private-print-2",
      quantity: 3,
    },
  ],
  currency: "sek",
  customer: { name: "Test Customer", email: "fan@example.com" },
  shippingAddress: {
    line1: "Street 1",
    city: "Stockholm",
    postal_code: "11122",
    country: "SE",
  },
};
describe("Gelato submission boundary", () => {
  it("sends every print file with its quantity, internal reference and shipping", async () => {
    mocks.fetch.mockResolvedValue(
      new Response(
        JSON.stringify({ id: "gelato-1", fulfillmentStatus: "draft" }),
      ),
    );
    await createPosterOrder(input);
    const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({
      orderType: "draft",
      orderReferenceId: "order-1",
      currency: "SEK",
      items: [
        {
          itemReferenceId: "item-1",
          productUid: "poster-product",
          quantity: 1,
          files: [{ type: "default", url: input.items[0].printFileUrl }],
        },
        {
          itemReferenceId: "item-2",
          productUid: "framed-product",
          quantity: 3,
          files: [{ type: "default", url: input.items[1].printFileUrl }],
        },
      ],
      shippingAddress: {
        firstName: "Test",
        lastName: "Customer",
        addressLine1: "Street 1",
      },
    });
  });
  it("never automatically retries ambiguous timeouts", async () => {
    mocks.fetch.mockRejectedValue(new Error("timeout"));
    await expect(createPosterOrder(input)).rejects.toMatchObject({
      uncertain: true,
    });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("quarantines a successful response with unknown body", async () => {
    mocks.fetch.mockResolvedValue(new Response("{}"));
    await expect(createPosterOrder(input)).rejects.toMatchObject({
      uncertain: true,
    });
  });
  it("classifies definitive rejection as safe to retry after correction", async () => {
    mocks.fetch.mockResolvedValue(new Response("{}", { status: 400 }));
    await expect(createPosterOrder(input)).rejects.toMatchObject({
      uncertain: false,
    });
  });
  it("rejects overly long addresses before submission", async () => {
    await expect(
      createPosterOrder({
        ...input,
        shippingAddress: { ...input.shippingAddress, line1: "x".repeat(36) },
      }),
    ).rejects.not.toBeInstanceOf(GelatoSubmissionError);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
