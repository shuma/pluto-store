import { expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("@/lib/supabase/admin", () => ({
  adminDb: () => ({}),
  check: () => {},
}));
import { displayCopy } from "@/lib/storage";

it("shrinks a phone photo below what iOS Safari can draw on a canvas", async () => {
  // A 24-megapixel photo, as recent iPhones take by default.
  const photo = await sharp({
    create: { width: 4284, height: 5712, channels: 3, background: "#3366cc" },
  })
    .jpeg()
    .toBuffer();
  const meta = await sharp(await displayCopy(photo)).metadata();
  expect(Math.max(meta.width!, meta.height!)).toBe(1600);
  expect(meta.width! * meta.height!).toBeLessThan(16_700_000);
  expect(meta.format).toBe("jpeg");
});
