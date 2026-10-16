import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  defaultTitle,
  fitsArtwork,
  formatSize,
  gelatoProduct,
  normalizeProduct,
  toMm,
  type CatalogAttribute,
} from "@/lib/products/catalog";
import { productCreateSchema } from "@/lib/validation/schemas";

// Shaped like Gelato's real framed-posters catalog (checked 2026-09-29).
const attributes: CatalogAttribute[] = [
  {
    uid: "UnifiedPaperType",
    title: "UnifiedPaperType",
    values: [
      {
        uid: "250-gsm-100lb-uncoated-offwhite-archival",
        title: "250 gsm / 100 lb cover uncoated off white archival",
      },
      {
        uid: "200-gsm-80lb-coated-silk",
        title: "200 gsm / 80 lb cover coated silk",
      },
    ],
  },
  {
    uid: "FrameColor",
    title: "FrameColor",
    values: [
      { uid: "black", title: "Black" },
      { uid: "natural-wood", title: "Natural Wood" },
    ],
  },
  {
    uid: "UnifiedFrameSize",
    title: "UnifiedFrameSize",
    values: [
      { uid: "300x400-mm-12x16-inch", title: '30x40cm / 12x16"' },
      { uid: "a3", title: "A3" },
    ],
  },
  {
    uid: "ProductModel",
    title: "ProductModel",
    values: [
      { uid: "frame_and_poster_product", title: "frame_and_poster_product" },
      {
        uid: "frame_and_poster_geo_simplified",
        title: "frame_and_poster_geo_simplified",
      },
    ],
  },
  {
    uid: "Orientation",
    title: "Orientation",
    values: [
      { uid: "hor", title: "Horizontal (landscape) orientation" },
      { uid: "ver", title: "Vertical (portrait) orientation" },
    ],
  },
];
const raw = (width: number, height: number, extra = {}) => ({
  productUid: `framed_poster_${width}x${height}`,
  attributes: {
    UnifiedPaperType: "250-gsm-100lb-uncoated-offwhite-archival",
    FrameColor: "black",
    UnifiedFrameSize: "300x400-mm-12x16-inch",
    Orientation: "ver",
    ProductStatus: "activated",
    ...extra,
  },
  // Gelato sends numbers as strings.
  dimensions: {
    Width: { value: String(width), measureUnit: "mm" },
    Height: { value: String(height), measureUnit: "mm" },
  },
});
// What normalizeProduct receives in the app: Gelato's JSON after parsing.
const parsed = (width: number, height: number, extra = {}) =>
  gelatoProduct.parse(raw(width, height, extra));

describe("catalog helpers", () => {
  it("converts Gelato units to millimetres", () => {
    expect(toMm({ value: 30, measureUnit: "cm" })).toBe(300);
    expect(toMm({ value: 10, measureUnit: "inch" })).toBe(254);
    expect(toMm({ value: 297, measureUnit: "mm" })).toBe(297);
  });
  it("reads US sizes in inches and the rest in centimetres", () => {
    expect(formatSize(304.8, 406.4)).toBe("12 × 16 in");
    expect(formatSize(203.2, 254)).toBe("8 × 10 in");
    expect(formatSize(300, 400)).toBe("30 × 40 cm");
    expect(formatSize(210, 297)).toBe("21 × 29.7 cm");
  });
  it("reads sizes in centimetres", () => {
    expect(formatSize(297, 420)).toBe("29.7 × 42 cm");
    expect(formatSize(500, 700)).toBe("50 × 70 cm");
  });
  it("only accepts portrait shapes close to the artwork", () => {
    expect(fitsArtwork(297, 420)).toBe(true); // ISO, 0.707
    expect(fitsArtwork(300, 400)).toBe(true); // 0.75
    expect(fitsArtwork(203.2, 254)).toBe(true); // 8 × 10 in, exactly 0.8
    expect(fitsArtwork(609.6, 914.4)).toBe(true); // 24 × 36 in, 0.667
    expect(fitsArtwork(500, 500)).toBe(false); // square
    expect(fitsArtwork(420, 297)).toBe(false); // landscape
    expect(fitsArtwork(200, 600)).toBe(false); // too narrow
  });
  it("describes a product by the choices that set it apart", () => {
    const product = normalizeProduct(
      parsed(300, 400),
      "framed-posters",
      attributes,
    );
    expect(product).toMatchObject({
      productUid: "framed_poster_300x400",
      size: "30 × 40 cm",
      details: "Archival paper · Black frame",
      attributes: {
        Paper: "Archival paper",
        "Frame colour": "Black frame",
      },
    });
    expect(defaultTitle(product!)).toBe("Medium framed print");
  });
  it("drops products that can't be sold", () => {
    expect(
      normalizeProduct(parsed(500, 500), "posters", attributes),
    ).toBeNull();
    expect(
      normalizeProduct(
        parsed(300, 400, { ProductStatus: "deactivated" }),
        "posters",
        attributes,
      ),
    ).toBeNull();
    expect(
      normalizeProduct(
        gelatoProduct.parse({ productUid: "x" }),
        "posters",
        attributes,
      ),
    ).toBeNull();
  });
  it("prices in minor units", () => {
    expect(
      productCreateSchema.parse({
        name: "Large print",
        description: "",
        prices: { sek: "249.50", eur: "24.99" },
        catalog: "posters",
        productUid: "x",
      }).prices,
    ).toEqual({ sek: 24950, eur: 2499 });
    expect(() =>
      productCreateSchema.parse({
        name: "Free",
        description: "",
        prices: { sek: "0" },
        catalog: "posters",
        productUid: "x",
      }),
    ).toThrow();
  });
});

describe("Gelato catalog client", () => {
  const fetch = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    fetch.mockReset();
    vi.stubGlobal("fetch", fetch);
    vi.stubEnv("GELATO_API_KEY", "test-key");
  });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });
  const catalog = (values: "list" | "record" = "list") => ({
    catalogUid: "framed-posters",
    title: "Framed Posters",
    productAttributes: attributes.map((a) => ({
      productAttributeUid: a.uid,
      title: a.title,
      values: (() => {
        const list = a.values.map((v) => ({
          productAttributeValueUid: v.uid,
          title: v.title,
        }));
        // Some attributes arrive as an object keyed by value uid.
        return values === "record" && a.uid === "ProductModel"
          ? Object.fromEntries(list.map((v) => [v.productAttributeValueUid, v]))
          : list;
      })(),
    })),
  });
  it("offers only poster catalogs", async () => {
    fetch.mockResolvedValueOnce(
      json({
        data: [
          { catalogUid: "cards", title: "Cards", productAttributes: [] },
          {
            catalogUid: "framed-posters",
            title: "Framed posters",
            productAttributes: [],
          },
          {
            catalogUid: "fine-art-framed-poster",
            title: "Fine Art Framed Poster",
            productAttributes: [],
          },
          { catalogUid: "posters", title: "Posters", productAttributes: [] },
        ],
      }),
    );
    const { listCatalogs } = await import("@/lib/fulfillment/gelato-catalog");
    expect(await listCatalogs()).toEqual([
      { uid: "posters", title: "Posters" },
      { uid: "framed-posters", title: "Framed posters" },
    ]);
    expect(fetch.mock.calls[0][1].headers["X-API-KEY"]).toBe("test-key");
  });
  // A quote shaped like Gelato's real one for a 30×40 cm poster to Sweden.
  const quoteResponse = () =>
    json({
      quotes: [
        {
          products: [{ price: 77.76, currency: "SEK" }],
          shipmentMethods: [
            { price: 150.24, currency: "SEK", type: "normal" },
            { price: 73.9, currency: "SEK", type: "pick_up" },
            { price: 75.66, currency: "SEK", type: "normal" },
          ],
        },
      ],
    });
  it("offers only the curated prints", async () => {
    fetch
      .mockResolvedValueOnce(json(catalog("record")))
      .mockResolvedValueOnce(
        json({ products: [raw(300, 400), raw(500, 500)] }),
      );
    const { searchCatalog } = await import("@/lib/fulfillment/gelato-catalog");
    const products = await searchCatalog("framed-posters", {
      // A pick narrows the curated values; one outside them is ignored, and
      // anything that isn't a creator's choice is dropped.
      FrameColor: ["black", "gold"],
      ProductStatus: ["deactivated"],
    });
    expect(products.map((p) => p.productUid)).toEqual([
      "framed_poster_300x400",
    ]);
    const filters = JSON.parse(fetch.mock.calls[1][1].body).attributeFilters;
    expect(filters).toMatchObject({
      FrameColor: ["black"],
      FrameMaterial: ["wood"],
      UnifiedPaperType: ["200-gsm-80lb-uncoated"],
      Orientation: ["ver"],
      ProductStatus: ["activated"],
      ProductModel: ["frame_and_poster_geo_simplified"],
    });
    // Without a size system picked, both are offered: 30 × 40 cm and its
    // slightly larger US twin, 12 × 16 in.
    expect(filters.UnifiedFrameSize).toContain("300x400-mm-12x16-inch");
    expect(filters.UnifiedFrameSize).toContain("12x16-inch-300x400-mm");
  });
  it("shows only the size system picked", async () => {
    fetch
      .mockResolvedValueOnce(json(catalog()))
      .mockResolvedValueOnce(json({ products: [] }));
    const { searchCatalog } = await import("@/lib/fulfillment/gelato-catalog");
    await searchCatalog("posters", { Sizes: ["imperial"] });
    const filters = JSON.parse(fetch.mock.calls[1][1].body).attributeFilters;
    expect(filters.UnifiedPaperFormat).toEqual([
      "5R-130x180-mm",
      "8x10-inch-200x250-mm",
      "11x14-inch-270x350-mm",
      "12x16-inch-300x400-mm",
      "16x20-inch-400x500-mm",
      "18x24-inch-450x600-mm",
      "24x36-inch-600x900-mm",
    ]);
    // Our own filter is never sent on.
    expect(filters).not.toHaveProperty("Sizes");
  });
  it("prices a print with Gelato's cheapest home delivery", async () => {
    fetch.mockResolvedValueOnce(quoteResponse());
    const { getUnitCost } = await import("@/lib/fulfillment/gelato-catalog");
    expect(await getUnitCost("p", "sek")).toEqual({
      print: 7776,
      shipping: 7566,
      total: 15342,
    });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://order.gelatoapis.com/v4/orders:quote");
    const body = JSON.parse(init.body);
    expect(body.recipient.country).toBe("SE");
    expect(body.currency).toBe("SEK");
    expect(body.products).toEqual([
      { itemReferenceId: "item-0", productUid: "p", quantity: 1 },
    ]);
  });
  it("prices a whole cart in one quote, shipping counted once", async () => {
    fetch.mockResolvedValueOnce(
      json({
        quotes: [
          {
            // Each line's price is for all its copies.
            products: [
              { price: 155.52, currency: "SEK" },
              { price: 120.0, currency: "SEK" },
            ],
            shipmentMethods: [{ price: 89.5, currency: "SEK", type: "normal" }],
          },
        ],
      }),
    );
    const { getOrderCost } = await import("@/lib/fulfillment/gelato-catalog");
    expect(
      await getOrderCost(
        [
          { productUid: "a3", quantity: 2 },
          { productUid: "a2", quantity: 1 },
        ],
        "sek",
      ),
    ).toEqual({ print: 27552, shipping: 8950, total: 36502 });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.products).toEqual([
      { itemReferenceId: "item-0", productUid: "a3", quantity: 2 },
      { itemReferenceId: "item-1", productUid: "a2", quantity: 1 },
    ]);
  });
  it("suggests shop-style prices at about double the cost", async () => {
    const { suggestPrice } = await import("@/lib/products/catalog");
    // The creator earns at least the delivered cost after every fee.
    // Kronor: whole 50 kr steps, ending in 49 or 99.
    expect(suggestPrice(15342, "sek")).toBe(39900);
    expect(suggestPrice(35408, "sek")).toBe(89900);
    // Dollars: $5 steps, ending in .99. A 12 × 16 in poster to New York
    // costs $7.08 + $4.90; a black framed one $36.54 + $13.90.
    expect(suggestPrice(1198, "usd")).toBe(2999);
    expect(suggestPrice(5044, "usd")).toBe(12499);
    const { payout } = await import("@/lib/fees");
    for (const [cost, currency] of [
      [1198, "usd"],
      [35408, "sek"],
    ] as const)
      expect(
        payout(suggestPrice(cost, currency), cost, currency).earnings,
      ).toBeGreaterThanOrEqual(cost);
  });
  it("quotes a dollar store's costs for delivery in the US", async () => {
    fetch.mockResolvedValueOnce(
      json({
        quotes: [
          {
            products: [{ price: 7.08, currency: "USD" }],
            shipmentMethods: [
              { price: 8.2, currency: "USD", type: "express" },
              { price: 4.9, currency: "USD", type: "normal" },
            ],
          },
        ],
      }),
    );
    const { getUnitCost } = await import("@/lib/fulfillment/gelato-catalog");
    expect(await getUnitCost("p", "usd")).toEqual({
      print: 708,
      shipping: 490,
      total: 1198,
    });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.currency).toBe("USD");
    expect(body.recipient).toMatchObject({ country: "US", state: "NY" });
  });
  it("reads the print cost for one poster in the store currency", async () => {
    fetch.mockResolvedValueOnce(
      json([
        {
          productUid: "p",
          country: "SE",
          quantity: 10,
          price: 1500,
          currency: "SEK",
        },
        {
          productUid: "p",
          country: "SE",
          quantity: 1,
          price: 189,
          currency: "SEK",
        },
      ]),
    );
    const { getPrintCost } = await import("@/lib/fulfillment/gelato-catalog");
    expect(await getPrintCost("p", "sek")).toEqual({
      amount: 18900,
      currency: "sek",
    });
    expect(fetch.mock.calls[0][0]).toContain("country=SE&currency=SEK");
  });
  it("reports an unexpected Gelato response as Gelato's, not the user's", async () => {
    // Before the fix, a bare array here surfaced as "check the information
    // you entered".
    fetch.mockResolvedValueOnce(json([{ catalogUid: "posters" }]));
    const { listCatalogs } = await import("@/lib/fulfillment/gelato-catalog");
    await expect(listCatalogs()).rejects.toMatchObject({
      status: 502,
      message: "Something went wrong loading prints. Try again.",
    });
  });
  it("turns Gelato outages into a friendly error", async () => {
    fetch.mockResolvedValueOnce(json({}, 503));
    const { listCatalogs } = await import("@/lib/fulfillment/gelato-catalog");
    await expect(listCatalogs()).rejects.toMatchObject({ status: 502 });
  });
});
