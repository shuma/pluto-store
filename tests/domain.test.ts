import { describe, it, expect } from "vitest";
import { storeSlugSchema, RESERVED_SLUGS } from "@/lib/store-slugs";
import { calculatePrice } from "@/lib/payments/pricing";
import { visitorCurrency } from "@/lib/currency";
import { canSubmit, canMarkFulfilled } from "@/lib/orders/state";
import {
  checkoutDescription,
  checkoutParams,
} from "@/lib/payments/checkout-params";
import { item, order, product } from "./fixtures";
import { preparePrintFile } from "@/lib/print/prepare-print-file";
import sharp from "sharp";
describe("store addresses", () => {
  it("normalizes valid addresses", () =>
    expect(storeSlugSchema.parse(" High-Elf-Club ")).toBe("high-elf-club"));
  it.each(RESERVED_SLUGS)("rejects reserved %s", (slug) =>
    expect(storeSlugSchema.safeParse(slug).success).toBe(false),
  );
  it.each([
    "ab",
    "-hello",
    "hello-",
    "hello--world",
    "hi/there",
    "a".repeat(64),
    "münchen",
  ])("rejects %s", (slug) =>
    expect(storeSlugSchema.safeParse(slug).success).toBe(false),
  );
});
describe("prices and checkout", () => {
  it("uses minor units with fixed quantity", () =>
    expect(calculatePrice(product, "sek")).toEqual({
      amount: 39900,
      currency: "sek",
      quantity: 1,
    }));
  it("rejects inactive or wrong currency", () => {
    expect(() =>
      calculatePrice({ ...product, active: false }, "sek"),
    ).toThrow();
    expect(() => calculatePrice(product, "eur")).toThrow();
  });
  it("rejects invalid money", () =>
    expect(() =>
      calculatePrice({ ...product, prices: { sek: 3.5 } }, "sek"),
    ).toThrow());
  it("constructs checkout only from the saved order snapshot", () => {
    const params = checkoutParams(
      order,
      "https://pluto.store",
      "high-elf-club",
      ["SE"],
    );
    expect(params.line_items?.[0].quantity).toBe(1);
    expect(params.line_items?.[0].price_data?.unit_amount).toBe(39900);
    expect(params.metadata).toEqual({
      order_id: order.id,
      creator_id: order.creator_id,
      generation_id: order.generation_session_id,
    });
    expect(params.shipping_address_collection?.allowed_countries).toEqual([
      "SE",
    ]);
    expect(params.success_url).toContain(`/checkout/success?order=${order.id}`);
    expect(params.cancel_url).toContain(
      `/poster?artwork=${item.generated_artwork_id}`,
    );
    expect(params.line_items?.[0].price_data?.product_data?.description).toBe(
      "Your original artwork, printed as an unframed poster. 29.7 × 42 cm. Shipping included.",
    );
  });
  it("lists every print in a cart with its quantity, adding up to the total", () => {
    const large = { ...product, name: "A2 Poster", prices: { sek: 54900 } };
    const cart = {
      ...order,
      amount_total: 2 * 39900 + 54900,
      order_items: [
        { ...item, quantity: 2 },
        {
          ...item,
          id: "44444444-4444-4444-8444-444444444444",
          product_id: large.id,
          product_snapshot: large,
          unit_amount: 54900,
        },
      ],
    };
    const lines =
      checkoutParams(cart, "https://pluto.store", "high-elf-club", ["SE"], [
        "https://img.test/a3.webp",
        null,
      ]).line_items ?? [];
    expect(
      lines.map((l) => [l.quantity, l.price_data?.product_data?.name]),
    ).toEqual([
      [2, "A3 Poster"],
      [1, "A2 Poster"],
    ]);
    expect(
      lines.reduce(
        (sum, l) => sum + l.quantity! * l.price_data!.unit_amount!,
        0,
      ),
    ).toBe(cart.amount_total);
    // Each print its own mockup; one that couldn't be drawn shows none.
    expect(lines[0].price_data?.product_data?.images).toEqual([
      "https://img.test/a3.webp",
    ]);
    expect(lines[1].price_data?.product_data).not.toHaveProperty("images");
  });
  it("describes a framed print as framed, in its own units", () => {
    expect(
      checkoutDescription({
        ...product,
        gelato_catalog: "framed-posters",
        width_mm: 304.8,
        height_mm: 406.4,
      }),
    ).toBe(
      "Your original artwork, printed and framed. 12 × 16 in. Shipping included.",
    );
  });
});
describe("order transitions", () => {
  it("requires paid status for fulfillment", () =>
    expect(canSubmit(order)).toBe(false));
  it("allows pending paid orders", () =>
    expect(
      canSubmit({
        ...order,
        payment_status: "paid",
        fulfillment_status: "pending",
      }),
    ).toBe(true));
  it.each(["submitting", "needs_review", "submitted", "fulfilled"] as const)(
    "does not resubmit %s",
    (status) =>
      expect(
        canSubmit({
          ...order,
          payment_status: "paid",
          fulfillment_status: status,
        }),
      ).toBe(false),
  );
  it("rejects duplicate provider order", () =>
    expect(
      canSubmit({
        ...order,
        payment_status: "paid",
        fulfillment_status: "pending",
        gelato_order_id: "gelato-1",
      }),
    ).toBe(false));
  it("allows manual completion only after payment", () => {
    expect(canMarkFulfilled({ ...order, fulfillment_status: "manual" })).toBe(
      false,
    );
    expect(
      canMarkFulfilled({
        ...order,
        payment_status: "paid",
        fulfillment_status: "manual",
      }),
    ).toBe(true);
  });
});
describe("print preparation", () => {
  it("rejects insufficient resolution instead of upscaling", async () => {
    const bytes = await sharp({
      create: { width: 100, height: 100, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(preparePrintFile(bytes, 297, 420)).rejects.toThrow(
      "insufficient_print_resolution",
    );
  });
  it("crops to product ratio without distortion", async () => {
    const bytes = await sharp({
      create: { width: 1000, height: 1000, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    const result = await preparePrintFile(bytes, 100, 140, 72);
    expect(result.width / result.height).toBeCloseTo(100 / 140, 2);
    expect(result.width).toBeLessThanOrEqual(1000);
    expect(result.height).toBeLessThanOrEqual(1000);
  });
  it("upscales within the cap to reach A2 from the generated canvas", async () => {
    const bytes = await sharp({
      create: { width: 1696, height: 2400, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const result = await preparePrintFile(bytes, 420, 594, 144);
    expect(result.upscaled).toBeGreaterThan(1);
    expect(result.upscaled).toBeLessThanOrEqual(1.5);
    expect(result.width).toBeGreaterThanOrEqual(2382);
    expect(result.height).toBeGreaterThanOrEqual(3368);
  });
  it("refuses an upscale beyond the cap", async () => {
    const bytes = await sharp({
      create: { width: 1024, height: 1448, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(preparePrintFile(bytes, 420, 594, 144)).rejects.toThrow(
      "insufficient_print_resolution",
    );
    await expect(
      preparePrintFile(bytes, 420, 594, 144, 2.4),
    ).resolves.toMatchObject({ mimeType: "image/png" });
  });
  it("supports A2 at configured default resolution and 144 DPI", async () => {
    const bytes = await sharp({
      create: { width: 2416, height: 3424, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await expect(preparePrintFile(bytes, 420, 594, 144)).resolves.toMatchObject(
      { mimeType: "image/png" },
    );
  });
});
describe("the currency a customer pays in", () => {
  it("keeps the one they picked, if the store sells in it", () => {
    expect(visitorCurrency(["sek", "eur"], "sek", "eur", "SE")).toBe("eur");
    expect(visitorCurrency(["sek"], "sek", "eur", "DE")).toBe("sek");
  });
  it("otherwise follows their country, kronor before euros in Sweden", () => {
    expect(visitorCurrency(["sek", "eur"], "sek", undefined, "DE")).toBe("eur");
    expect(visitorCurrency(["sek", "eur"], "sek", undefined, "SE")).toBe("sek");
    expect(visitorCurrency(["usd", "eur"], "usd", undefined, "SE")).toBe("eur");
  });
  it("falls back to the store's main currency", () => {
    expect(visitorCurrency(["sek", "eur"], "sek", undefined, "US")).toBe("sek");
    expect(visitorCurrency(["sek", "eur"], "sek", "gbp", null)).toBe("sek");
  });
});
