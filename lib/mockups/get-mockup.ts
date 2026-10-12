import "server-only";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { OrderItem, Product } from "@/lib/domain";
import { isFramed } from "@/lib/products/catalog";
import { frameTone } from "@/lib/products/frames";
import { adminDb, check } from "@/lib/supabase/admin";
import { download, put, signedUrl } from "@/lib/storage";
import { renderMockup } from "./render";
import { DEFAULT_SCENE, SCENES, type SceneId } from "./scenes";
// A room mockup of a print, made once and kept: the same artwork in the same
// print always gives the same file, so the size page, Stripe, the success page
// and the creator's orders all share one image.

// Raise when the renderer or the scenes change, so old mockups are redrawn.
const VERSION = "v1";
const BUCKET = "generated-artworks";
const DEFAULT_FRAME = "#1d1d1d";

type Print = Pick<
  Product,
  "width_mm" | "height_mm" | "gelato_catalog" | "gelato_attributes"
>;
export type MockupSource = { bucket: string; path: string };

const scenes = new Map<SceneId, Promise<Buffer>>();
function sceneBytes(id: SceneId) {
  let bytes = scenes.get(id);
  if (!bytes) {
    // Shipped with the server functions by outputFileTracingIncludes.
    bytes = readFile(
      join(process.cwd(), "lib/mockups/scenes", SCENES[id].file),
    );
    scenes.set(id, bytes);
  }
  return bytes;
}

// Where a mockup lives: by source, scene and everything that changes how the
// print looks, so products that look the same share one.
export function mockupPath(
  source: MockupSource,
  print: Print,
  sceneId: SceneId = DEFAULT_SCENE,
) {
  const art = createHash("sha256")
    .update(`${source.bucket}/${source.path}`)
    .digest("hex")
    .slice(0, 24);
  const framed = isFramed(print.gelato_catalog);
  const look = framed
    ? `framed-${(print.gelato_attributes["Frame colour"] ?? "black")
        .toLowerCase()
        .replace(/[^a-z]+/g, "-")}`
    : "plain";
  return `mockups/${VERSION}/${art}/${sceneId}-${print.width_mm}x${print.height_mm}-${look}.webp`;
}

async function exists(path: string) {
  const slash = path.lastIndexOf("/");
  const { data, error } = await adminDb()
    .storage.from(BUCKET)
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });
  check(error);
  return Boolean(data?.some((f) => f.name === path.slice(slash + 1)));
}

// The mockup's storage path in BUCKET, drawn and stored first if needed.
export async function ensureMockup(
  source: MockupSource,
  print: Print,
  sceneId: SceneId = DEFAULT_SCENE,
) {
  const path = mockupPath(source, print, sceneId);
  if (await exists(path)) return { bucket: BUCKET, path };
  const framed = isFramed(print.gelato_catalog);
  const bytes = await renderMockup({
    art: await download(source.bucket, source.path),
    widthMm: print.width_mm,
    heightMm: print.height_mm,
    scene: SCENES[sceneId],
    sceneBytes: await sceneBytes(sceneId),
    frameTone: framed
      ? (frameTone(print.gelato_attributes["Frame colour"]) ?? DEFAULT_FRAME)
      : undefined,
  });
  try {
    await put(BUCKET, path, bytes, "image/webp");
  } catch (e) {
    // Another request drew the same mockup first; theirs is identical.
    if (!(await exists(path))) throw e;
  }
  return { bucket: BUCKET, path, bytes };
}

// One ordered print's mockup, from the same artwork image the size page drew
// it from, so the one the customer looked at is reused rather than drawn
// again. Null once the artwork has been removed.
export async function itemMockup(
  item: Pick<OrderItem, "generated_artwork_id" | "product_snapshot">,
) {
  const { data, error } = await adminDb()
    .from("generated_artworks")
    .select("storage_path")
    .eq("id", item.generated_artwork_id)
    .maybeSingle();
  check(error);
  if (!data) return null;
  return ensureMockup(
    { bucket: BUCKET, path: data.storage_path },
    item.product_snapshot,
  );
}

// A link to a mockup good for `seconds`, or null when it can't be drawn: a
// mockup is a nicety and never holds up a page or checkout.
export async function mockupUrl(
  source: MockupSource,
  print: Print,
  seconds: number,
) {
  try {
    const mockup = await ensureMockup(source, print);
    return await signedUrl(mockup.bucket, mockup.path, seconds);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "mockup_failed",
        kind: error instanceof Error ? error.name : "unknown",
      }),
    );
    return null;
  }
}
