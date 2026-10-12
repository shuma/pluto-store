import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { renderMockup } from "@/lib/mockups/render";
import { mockupPlacement, type Scene } from "@/lib/mockups/scenes";

const scene: Scene = {
  id: "test",
  file: "test.jpg",
  width: 1000,
  height: 1000,
  centre: { x: 500, y: 450 },
  pxPerMm: 0.5,
};

describe("mockupPlacement", () => {
  it("hangs prints at true scale, centred on the wall", () => {
    const large = mockupPlacement(scene, 700, 1000);
    const small = mockupPlacement(scene, 300, 400);
    expect(large.height).toBe(500);
    expect(large.height / small.height).toBeCloseTo(2.5);
    expect(small.left + small.width / 2).toBe(500);
    expect(small.top + small.height / 2).toBe(450);
  });

  it("keeps a print too big for the wall inside the scene", () => {
    const p = mockupPlacement({ ...scene, pxPerMm: 2 }, 700, 1000);
    expect(p.top).toBeGreaterThanOrEqual(0);
    expect(p.left).toBeGreaterThanOrEqual(0);
    expect(p.top + p.height).toBeLessThanOrEqual(scene.height);
    expect(p.width / p.height).toBeCloseTo(0.7, 2);
  });
});

describe("renderMockup", () => {
  it("puts the artwork on the wall and leaves the wall around it", async () => {
    const solid = (r: number, g: number, b: number, size: number) =>
      sharp({
        create: {
          width: size,
          height: size,
          channels: 3,
          background: { r, g, b },
        },
      })
        .png()
        .toBuffer();
    const out = await renderMockup({
      art: await solid(220, 20, 20, 400),
      widthMm: 300,
      heightMm: 400,
      scene,
      sceneBytes: await solid(200, 200, 200, 1000),
    });
    const { data, info } = await sharp(out)
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.width).toBe(1000);
    const pixel = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const [r, g] = pixel(500, 450);
    expect(r).toBeGreaterThan(150);
    expect(g).toBeLessThan(60);
    const [wr, wg, wb] = pixel(50, 50);
    expect(Math.abs(wr - 200)).toBeLessThan(8);
    expect(Math.abs(wg - wb)).toBeLessThan(8);
  });
});
