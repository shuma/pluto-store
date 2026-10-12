import { expect, it, vi } from "vitest";
import sharp, { type Color } from "sharp";
vi.mock("@/lib/supabase/admin", () => ({
  adminDb: () => ({}),
  check: () => {},
}));
import { hasPicture } from "@/lib/generations/drafts";

const solid = (background: Color, channels: 3 | 4 = 3) =>
  sharp({ create: { width: 64, height: 90, channels, background } })
    .png()
    .toBuffer();

it("skips a draft that is still a bare canvas", async () => {
  // Fully see-through, and a flat single colour: neither shows anything.
  expect(await hasPicture(await solid({ r: 0, g: 0, b: 0, alpha: 0 }, 4))).toBe(
    false,
  );
  expect(await hasPicture(await solid("#f4f1ea"))).toBe(false);
});

it("keeps a draft with a picture in it", async () => {
  // A blue ground with a green figure on it, as the artworks have.
  const figure = await sharp({
    create: { width: 32, height: 40, channels: 3, background: "#2f6b3c" },
  })
    .png()
    .toBuffer();
  const draft = await sharp(await solid("#3a66d4"))
    .composite([{ input: figure, left: 16, top: 30 }])
    .png()
    .toBuffer();
  expect(await hasPicture(draft)).toBe(true);
});
