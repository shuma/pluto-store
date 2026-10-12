import { describe, it, expect } from "vitest";
import {
  defaultTitle,
  groupBySize,
  sizeBesideName,
  sizeTier,
  type CatalogProduct,
} from "@/lib/products/catalog";

describe("product naming", () => {
  it("names prints by how big they feel", () => {
    expect(sizeTier(210, 297)).toBe("Small"); // A4
    expect(sizeTier(203.2, 254)).toBe("Small"); // 8 × 10 in
    expect(sizeTier(300, 400)).toBe("Medium");
    expect(sizeTier(500, 700)).toBe("Large");
    expect(sizeTier(609.6, 914.4)).toBe("Extra large"); // 24 × 36 in
    expect(
      defaultTitle({ catalog: "framed-posters", widthMm: 500, heightMm: 700 }),
    ).toBe("Large framed print");
    expect(
      defaultTitle({ catalog: "posters", widthMm: 304.8, heightMm: 406.4 }),
    ).toBe("Medium poster");
  });
  it("doesn't repeat a size the name already says", () => {
    expect(sizeBesideName("Medium poster", 300, 400)).toBe("30 × 40 cm");
    expect(sizeBesideName("Poster 70 × 100 cm", 700, 1000)).toBeNull();
  });
});

describe("one card per size", () => {
  const print = (
    uid: string,
    width: number,
    height: number,
    paper: string,
  ): CatalogProduct => ({
    productUid: uid,
    catalog: "posters",
    widthMm: width,
    heightMm: height,
    size: `${width}x${height}`,
    details: paper,
    attributes: { Paper: paper },
  });
  it("groups papers under their size, matte first", () => {
    const groups = groupBySize([
      print("a", 300, 400, "Archival paper"),
      print("b", 300, 400, "Matte paper"),
      print("c", 500, 700, "Matte paper"),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].variants.map((v) => v.productUid)).toEqual(["b", "a"]);
    expect(groups[1].variants.map((v) => v.productUid)).toEqual(["c"]);
  });
});
