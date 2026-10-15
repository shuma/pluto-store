import { describe, it, expect } from "vitest";
import {
  defaultTitle,
  groupBySize,
  nameAndSize,
  productKind,
  sizeBesideName,
  sizeTier,
  type CatalogProduct,
} from "@/lib/products/catalog";

describe("product naming", () => {
  it("names prints by how big they feel", () => {
    expect(sizeTier(130, 180)).toBe("Mini");
    expect(sizeTier(127, 177.8)).toBe("Mini"); // 5 × 7 in
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
    expect(
      defaultTitle({ catalog: "posters", widthMm: 130, heightMm: 180 }),
    ).toBe("Mini print");
  });
  it("calls a poster too small to hang a mini print", () => {
    expect(productKind("posters", 130, 180)).toBe("print");
    expect(productKind("posters", 210, 297)).toBe("poster");
    expect(productKind("posters")).toBe("poster");
    expect(productKind("framed-posters", 130, 180)).toBe("framed");
  });
  it("splits a size out of a name so every print reads alike", () => {
    expect(nameAndSize("Poster 70 × 100 cm", 700, 1000)).toEqual({
      title: "Poster",
      size: "70 × 100 cm",
    });
    expect(nameAndSize("Poster – 50 × 70 cm", 500, 700).title).toBe("Poster");
    expect(nameAndSize("Small poster", 210, 297)).toEqual({
      title: "Small poster",
      size: "21 × 29.7 cm",
    });
    expect(nameAndSize("70 × 100 cm", 700, 1000).title).toBe("70 × 100 cm");
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
