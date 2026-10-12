import { describe, expect, it } from "vitest";
import { productRow } from "@/lib/domain";
import { productDetails } from "@/lib/products/details";

const product = (fields: Record<string, unknown>) =>
  productRow.parse({
    id: "22222222-2222-4222-8222-222222222222",
    creator_id: "11111111-1111-4111-8111-111111111111",
    name: "Large poster",
    slug: "large-poster",
    gelato_product_uid: null,
    width_mm: 500,
    height_mm: 700,
    aspect_ratio: "portrait",
    currency: "usd",
    price_amount: 3499,
    active: true,
    ...fields,
  });
const text = (d: ReturnType<typeof productDetails>) =>
  [...d.features, ...d.care].join("\n");

describe("productDetails", () => {
  it("describes matte paper from the product uid", () => {
    const d = productDetails(
      product({
        gelato_catalog: "posters",
        gelato_product_uid:
          "flat_500x700-mm-20x28-inch_200-gsm-80lb-uncoated_4-0_ver",
      }),
    );
    expect(text(d)).toContain("200 gsm");
    expect(text(d)).not.toContain("250 gsm");
    expect(d.summary).toBe("200 gsm matte paper · acid-free");
  });

  it("describes archival paper from the readable attributes", () => {
    const d = productDetails(
      product({
        gelato_catalog: "posters",
        gelato_attributes: { Paper: "Archival paper" },
      }),
    );
    expect(text(d)).toContain("250 gsm");
    expect(d.summary).toBe("250 gsm archival paper · acid-free");
  });

  it("describes the frame and how to care for it", () => {
    const d = productDetails(
      product({
        gelato_catalog: "framed-posters",
        gelato_attributes: {
          Paper: "Matte paper",
          "Frame colour": "Black frame",
        },
      }),
    );
    expect(d.features).toContain("Black frame");
    expect(text(d)).toContain("plexiglass");
    expect(d.care.join(" ")).toContain("solvents");
  });

  it("claims no paper for a product it can't place", () => {
    const d = productDetails(product({}));
    expect(text(d)).not.toMatch(/gsm/);
    expect(d.summary).toBeNull();
  });

  it("shows EU safety information only where the store sells in the EU", () => {
    expect(
      productDetails(product({ currency: "sek" })).safety[0].value,
    ).toContain("Gelato Estonia");
    expect(productDetails(product({ currency: "usd" })).safety).toEqual([]);
  });
});
