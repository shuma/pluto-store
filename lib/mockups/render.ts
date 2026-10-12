import sharp from "sharp";
import { centreCrop } from "@/lib/print/crop";
import { mockupPlacement, type Scene } from "./scenes";
// A print hanging in a room: the artwork cut to the print's shape, framed or
// bare, lit by the wall it hangs on and casting a soft shadow. The wall's own
// light and texture are multiplied over the print, which is what keeps it
// from looking pasted on.

const OUTPUT = 1600;
// How much of the wall's light and texture shows through the print (0–1).
const LIGHT = 0.7;
const SHADOW_OPACITY = 0.28;
// Frame and mat as on the page (components/print-mock.tsx): the frame is 6%
// of the print, the white mat 11% of what is inside it.
const FRAME_INSET = 0.06;
const MAT_INSET = 0.11;

export type MockupInput = {
  art: Uint8Array;
  widthMm: number;
  heightMm: number;
  scene: Scene;
  sceneBytes: Uint8Array;
  // The frame's colour, or undefined for an unframed poster.
  frameTone?: string;
};

async function artAt(art: Uint8Array, width: number, height: number) {
  const image = sharp(art, { limitInputPixels: 60_000_000 }).rotate();
  const { data, info } = await image.toBuffer({ resolveWithObject: true });
  return sharp(data)
    .extract(centreCrop(info.width, info.height, width / height))
    .resize(width, height, { kernel: "lanczos3" })
    .removeAlpha()
    .png()
    .toBuffer();
}

// The print as it hangs: bare artwork, or frame, mat and artwork.
async function printFace(input: MockupInput, width: number, height: number) {
  if (!input.frameTone) return artAt(input.art, width, height);
  const frame = Math.round(Math.min(width, height) * FRAME_INSET);
  const matW = width - 2 * frame,
    matH = height - 2 * frame;
  const mat = Math.round(Math.min(matW, matH) * MAT_INSET);
  const art = await artAt(input.art, matW - 2 * mat, matH - 2 * mat);
  return sharp({
    create: { width, height, channels: 3, background: input.frameTone },
  })
    .composite([
      {
        input: {
          create: {
            width: matW,
            height: matH,
            channels: 3,
            background: "#ffffff",
          },
        },
        left: frame,
        top: frame,
      },
      { input: art, left: frame + mat, top: frame + mat },
    ])
    .png()
    .toBuffer();
}

export async function renderMockup(input: MockupInput) {
  const { scene, sceneBytes } = input;
  const place = mockupPlacement(scene, input.widthMm, input.heightMm);
  const wall = sharp(sceneBytes);

  // The wall under the print, as a light map centred on its average
  // brightness and softened towards white by LIGHT.
  const patch = wall.clone().extract(place).greyscale();
  const { channels } = await patch.clone().stats();
  const mean = Math.max(1, channels[0].mean);
  const light = await patch
    .linear((LIGHT * 235) / mean, 255 * (1 - LIGHT))
    .toColourspace("srgb")
    .png()
    .toBuffer();
  const face = await sharp(await printFace(input, place.width, place.height))
    .composite([{ input: light, blend: "multiply" }])
    .png()
    .toBuffer();

  // A soft shadow, a little below and right of the print.
  const blur = Math.max(4, Math.round(place.height * 0.02));
  const shadow = await sharp({
    create: {
      width: place.width,
      height: place.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: SHADOW_OPACITY },
    },
  })
    .extend({
      top: blur * 2,
      bottom: blur * 2,
      left: blur * 2,
      right: blur * 2,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .blur(blur)
    .png()
    .toBuffer();
  const offset = Math.round(blur * 0.6);
  const shadowLeft = place.left - blur * 2 + offset,
    shadowTop = place.top - blur * 2 + offset * 2;

  // Composited at the scene's own size, then scaled: sharp resizes before it
  // composites within one pipeline, which would misplace the print.
  const hung = await wall
    .composite([
      {
        input: shadow,
        left: Math.max(0, shadowLeft),
        top: Math.max(0, shadowTop),
      },
      { input: face, left: place.left, top: place.top },
    ])
    .png()
    .toBuffer();
  return sharp(hung)
    .resize(OUTPUT, OUTPUT, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}
