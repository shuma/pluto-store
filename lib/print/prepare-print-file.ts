import sharp from "sharp";
import { centreCrop } from "./crop";
export function printDimensions(
  widthMm: number,
  heightMm: number,
  dpi: number,
) {
  return {
    width: Math.ceil((widthMm / 25.4) * dpi),
    height: Math.ceil((heightMm / 25.4) * dpi),
  };
}
// Gelato accepts PNG/JPEG. 144 DPI is our minimum, not a universal Gelato guarantee.
// Confirm product-specific bleed and dimensions with a physical sample before launch.
//
// Artwork is generated at a canvas size that keeps the creator's medium legible as
// drawn marks rather than photographic detail, which is smaller than A2 needs at
// 144 DPI. A bounded upscale covers that gap: these renders carry no fine detail
// to lose, so a small Lanczos enlargement costs nothing visible. Beyond maxUpscale
// we still refuse rather than sell a soft print.
export async function preparePrintFile(
  bytes: Uint8Array,
  widthMm: number,
  heightMm: number,
  minDpi = 144,
  maxUpscale = 1.5,
) {
  const image = sharp(bytes, { limitInputPixels: 60_000_000 }).rotate();
  const { data, info } = await image.toBuffer({ resolveWithObject: true });
  const crop = centreCrop(info.width, info.height, widthMm / heightMm);
  const { width, height } = crop;
  const required = printDimensions(widthMm, heightMm, minDpi);
  const scale = Math.max(required.width / width, required.height / height);
  if (scale > maxUpscale) throw new Error("insufficient_print_resolution");
  const cropped = sharp(data).extract(crop);
  const outWidth = scale > 1 ? Math.ceil(width * scale) : width,
    outHeight = scale > 1 ? Math.ceil(height * scale) : height;
  const output = await (
    scale > 1
      ? cropped.resize(outWidth, outHeight, { kernel: "lanczos3" })
      : cropped
  )
    .withMetadata({
      density: Math.floor(
        Math.min(outWidth / (widthMm / 25.4), outHeight / (heightMm / 25.4)),
      ),
    })
    .png()
    .toBuffer();
  return {
    bytes: output,
    mimeType: "image/png",
    width: outWidth,
    height: outHeight,
    upscaled: scale > 1 ? Number(scale.toFixed(3)) : 1,
  };
}
