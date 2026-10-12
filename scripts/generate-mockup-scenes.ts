// Makes candidate room scenes for print mockups: an empty, frontal wall the
// customer's artwork is later placed on (lib/mockups). Run once, review the
// results, and copy the ones worth keeping into lib/mockups/scenes/. Nothing
// at request time calls this.
//
//   pnpm mockups:scenes
//   pnpm mockups:scenes -- --count 6 --out tmp/mockup-scenes
//
import nextEnv from "@next/env";
import OpenAI from "openai";
import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
nextEnv.loadEnvConfig(process.cwd());

const PROMPTS: Record<string, string> = {
  plaster: `A photograph taken straight on, at eye level, of a bare, softly textured off-white plaster wall in a calm living room. Soft natural daylight falls across the wall from a window on the right, with a gentle gradient of light and the faint blurred shadow of leaves at the top left. A warm string of small fairy lights hangs loosely across the very top of the frame. In the bottom left foreground a large leafy houseplant in a white pot is slightly out of focus. Along the bottom edge is a light wooden shelf with a short stack of plain cream books and a small succulent in a white pot on the right. The large central area of the wall is completely empty and evenly lit: no frames, no pictures, no posters, no text, no hooks, no nails, nothing hanging. Realistic interior photography, shallow depth of field, natural colours, square composition.`,
  scandinavian: `A photograph taken straight on, at eye level, of a bare, light warm-grey painted wall in a minimal Scandinavian bedroom. Soft diffuse daylight from the left. At the bottom, a low oak sideboard with a ceramic vase holding a few dried grasses on the left and a small stack of books on the right. A slim floor lamp is partly visible at the far right edge. The large central area of the wall is completely empty and evenly lit: no frames, no pictures, no posters, no text, no hooks, nothing hanging. Realistic interior photography, natural colours, square composition.`,
};

const { values } = parseArgs({
  options: {
    count: { type: "string", default: "2" },
    out: { type: "string", default: "tmp/mockup-scenes" },
    size: { type: "string", default: "2048x2048" },
  },
});
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
await mkdir(values.out!, { recursive: true });
const count = Number(values.count);
await Promise.all(
  Object.entries(PROMPTS).flatMap(([name, prompt]) =>
    Array.from({ length: count }, async (_, i) => {
      const response = await client.images.generate({
        model,
        prompt,
        size: values.size as "1024x1024",
        quality: "high",
        n: 1,
      });
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error(`${name} ${i + 1}: no image returned`);
      const file = join(values.out!, `${name}-${i + 1}.png`);
      await writeFile(file, Buffer.from(b64, "base64"));
      console.log(file);
    }),
  ),
);
