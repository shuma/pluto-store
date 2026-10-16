import { beforeEach, it, expect, vi } from "vitest";
import { item, order, product as a3 } from "./fixtures";
const mocks = vi.hoisted(() => ({
  results: [] as unknown[],
  create: vi.fn(),
  retrieve: vi.fn(),
  expire: vi.fn(),
  session: vi.fn(),
  queries: [] as string[],
  // The currency the customer picked, as their cookie holds it.
  picked: undefined as string | undefined,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (mocks.picked ? { value: mocks.picked } : undefined),
  }),
  headers: async () => ({ get: () => null }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  check: (e: unknown) => {
    if (e) throw e;
  },
  adminDb: () => ({
    from: (table: string) => {
      mocks.queries.push(table);
      const chain: Record<string, unknown> = {};
      for (const method of [
        "select",
        "eq",
        "neq",
        "not",
        "order",
        "update",
        "insert",
        "delete",
        "is",
        "in",
      ])
        chain[method] = () => chain;
      chain.single = async () => mocks.results.shift();
      chain.maybeSingle = async () => mocks.results.shift();
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(mocks.results.shift()).then(resolve);
      return chain;
    },
  }),
}));
vi.mock("@/lib/generations/session", () => ({ requireSession: mocks.session }));
vi.mock("@/lib/payments/stripe", () => ({
  stripeClient: () => ({
    checkout: {
      sessions: {
        create: mocks.create,
        retrieve: mocks.retrieve,
        expire: mocks.expire,
      },
    },
  }),
}));
import { startCheckout } from "@/lib/payments/checkout";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.results.length = 0;
  mocks.queries.length = 0;
  mocks.picked = undefined;
  vi.stubEnv("FULFILLMENT_MODE", "manual");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://pluto.store");
  mocks.session.mockResolvedValue({
    id: order.generation_session_id,
    creator_id: order.creator_id,
  });
  mocks.create.mockResolvedValue({
    id: "cs_test",
    url: "https://checkout.stripe.com/test",
  });
});
// One cart line as the database returns it, with its product and artwork.
const line = (quantity = 1, product = a3) => ({
  id: "99999999-9999-4999-8999-999999999999",
  generated_artwork_id: item.generated_artwork_id,
  product_id: product.id,
  quantity,
  created_at: new Date().toISOString(),
  products: product,
  generated_artworks: {
    storage_path: "preview",
    original_storage_path: "original",
    status: "ready",
  },
});
// The store's currencies and what it has priced in them, as the currency
// lookup reads them; it runs before the cart query is read.
const store = (currency = "sek", currencies = [currency], products = [a3]) => [
  { data: { currency, currencies }, error: null },
  { data: products, error: null },
];
// The queries checkout makes, answered in order: the store, its currencies
// and the cart, the order already made for that cart, the visit's other open
// checkouts, the artworks for mockups, and saving the Stripe session.
function queue({
  savedOrder = order,
  lines = [line()] as ReturnType<typeof line>[],
  currency = "sek" as string,
  currencies = undefined as string[] | undefined,
  products = undefined as unknown[] | undefined,
  others = [] as { id: string; stripe_checkout_session_id: string }[],
} = {}) {
  mocks.results.push(
    { data: { slug: "high-elf-club" }, error: null },
    ...store(
      currency,
      currencies ?? [currency],
      (products ?? lines.map((l) => l.products)) as (typeof a3)[],
    ),
    { data: lines, error: null },
    { data: savedOrder, error: null },
    { data: others, error: null },
    { data: [], error: null },
    { error: null },
  );
}
const selection = {
  sessionId: order.generation_session_id,
  artworkId: item.generated_artwork_id,
};
it("buys the server's cart at today's prices, whatever the browser sends", async () => {
  queue({
    lines: [line(2)],
    savedOrder: { ...order, order_items: [{ ...item, quantity: 2 }] },
  });
  await expect(
    startCheckout({ ...selection, amount: 1, currency: "usd", quantity: 99 }),
  ).resolves.toEqual({ url: "https://checkout.stripe.com/test" });
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      line_items: [
        expect.objectContaining({
          quantity: 2,
          price_data: expect.objectContaining({
            unit_amount: 39900,
            currency: "sek",
          }),
        }),
      ],
      // A kronor store ships within Sweden.
      shipping_address_collection: { allowed_countries: ["SE"] },
    }),
    { idempotencyKey: `checkout:${order.id}:0` },
  );
});
it("won't check out an empty cart", async () => {
  queue({ lines: [] });
  await expect(startCheckout(selection)).rejects.toMatchObject({
    status: 400,
    message: "Your cart is empty.",
  });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("returns the confirmation for an already paid cart without another charge", async () => {
  queue({ savedOrder: { ...order, payment_status: "paid" } });
  await expect(startCheckout(selection)).resolves.toEqual({
    url: `https://pluto.store/checkout/success?order=${order.id}`,
  });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("drops a product owned by another creator from the cart, never selling it", async () => {
  mocks.results.push(
    { data: { slug: "high-elf-club" }, error: null },
    ...store(),
    {
      data: [
        line(1, { ...a3, creator_id: "88888888-8888-4888-8888-888888888888" }),
      ],
      error: null,
    },
    { error: null },
  );
  await expect(startCheckout(selection)).rejects.toMatchObject({ status: 400 });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("ships a dollar store's orders within the US", async () => {
  queue({
    currency: "usd",
    lines: [line(1, { ...a3, prices: { usd: 4999 } })],
    savedOrder: { ...order, currency: "usd" },
  });
  await startCheckout(selection);
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({
      shipping_address_collection: { allowed_countries: ["US"] },
    }),
    expect.anything(),
  );
});
it("charges only in a currency the store sells in", async () => {
  // A product still priced in kronor after the store switched to dollars.
  mocks.picked = "sek";
  mocks.results.push(
    { data: { slug: "high-elf-club" }, error: null },
    ...store("usd", ["usd"], [a3]),
    { data: [line()], error: null },
  );
  await expect(startCheckout(selection)).rejects.toMatchObject({ status: 400 });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("charges euros and ships across the EU for a customer paying in euros", async () => {
  mocks.picked = "eur";
  const both = { ...a3, prices: { sek: 39900, eur: 3499 } };
  queue({
    currencies: ["sek", "eur"],
    lines: [line(1, both)],
    savedOrder: {
      ...order,
      currency: "eur",
      amount_total: 3499,
      order_items: [{ ...item, unit_amount: 3499 }],
    },
  });
  await startCheckout(selection);
  const params = mocks.create.mock.calls[0][0];
  expect(params.line_items[0].price_data).toMatchObject({
    currency: "eur",
    unit_amount: 3499,
  });
  expect(params.shipping_address_collection.allowed_countries).toHaveLength(27);
  expect(params.shipping_address_collection.allowed_countries).toContain("DE");
});
it("requires session ownership before accessing purchase data", async () => {
  mocks.session.mockRejectedValue(new Error("Not authorized"));
  await expect(startCheckout(selection)).rejects.toThrow("Not authorized");
  expect(mocks.queries).toHaveLength(0);
  expect(mocks.create).not.toHaveBeenCalled();
});
it("reuses an open checkout URL", async () => {
  queue({
    savedOrder: { ...order, stripe_checkout_session_id: "cs_existing" },
  });
  mocks.retrieve.mockResolvedValue({
    status: "open",
    url: "https://checkout.stripe.com/existing",
  });
  await expect(startCheckout(selection)).resolves.toEqual({
    url: "https://checkout.stripe.com/existing",
  });
  expect(mocks.create).not.toHaveBeenCalled();
});
it("ends the visit's earlier checkout when the cart changed", async () => {
  queue({
    others: [{ id: "old-order", stripe_checkout_session_id: "cs_old" }],
  });
  mocks.retrieve.mockResolvedValue({ id: "cs_old", status: "open" });
  await startCheckout(selection);
  expect(mocks.expire).toHaveBeenCalledWith("cs_old");
  expect(mocks.create).toHaveBeenCalled();
});
