import { z } from "zod";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { cachedSignedUrl } from "@/lib/storage";
import { ReferenceCanvas } from "@/components/reference-canvas";
import Link from "next/link";
import { StylePreview } from "@/components/style-preview";
import { Hydrate } from "@/components/hydrate";
import { readStylePreview } from "@/lib/stores/style-preview";
import { stylePreviewQuery } from "@/lib/queries/style-preview";
export default async function References() {
  const store = await ownedStore();
  if (!store) return <p>Save your store first.</p>;
  const [{ data, error }, preview] = await Promise.all([
    adminDb()
      .from("creator_reference_images")
      .select("*")
      .eq("creator_id", store.id)
      .order("sort_order"),
    readStylePreview(store.id),
  ]);
  check(error);
  const refs = z
    .object({
      id: z.uuid(),
      storage_path: z.string(),
      sort_order: z.number(),
      active: z.boolean(),
      // Optional so the board still renders before 202609240001 is applied:
      // without the columns every image just falls back to its scattered spot.
      canvas_x: z.coerce.number().nullable().default(null),
      canvas_y: z.coerce.number().nullable().default(null),
      canvas_rotation: z.coerce.number().default(0),
      canvas_z: z.coerce.number().default(0),
      // Optional for the same reason as the canvas columns: rows stored before
      // 202609240003, or never backfilled, simply have no measurement.
      width_px: z.coerce.number().nullable().default(null),
      height_px: z.coerce.number().nullable().default(null),
    })
    .array()
    .parse(data);
  const references = await Promise.all(
    refs.map(async (r) => ({
      ...r,
      // Cards are drawn at most about 240 px across, so the full-resolution
      // original was several times more image than the board can show, and
      // every new signature meant downloading all of them again.
      url: await cachedSignedUrl("creator-reference-images", r.storage_path, {
        width: 600,
        height: 600,
      }),
    })),
  );
  return (
    <>
      <h1 className="text-3xl font-semibold">
        Your visual identity.
      </h1>
      <p className="mb-8 mt-3 max-w-2xl text-sm text-muted-foreground">
        Choose up to 8 images you have permission to license. These guide the
        palette, texture and artistic treatment of each customer’s artwork.{" "}
        <Link
          href="/dashboard/knowledge-base#board"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          How the board works
        </Link>
      </p>
      <ReferenceCanvas
        max={8}
        references={references.map((r) => ({
          id: r.id,
          url: r.url,
          x: r.canvas_x,
          y: r.canvas_y,
          rotation: r.canvas_rotation,
          z: r.canvas_z,
          active: r.active,
          aspect: r.width_px && r.height_px ? r.width_px / r.height_px : null,
        }))}
      >
        <Hydrate queryKey={stylePreviewQuery().queryKey} data={preview}>
          <StylePreview />
        </Hydrate>
      </ReferenceCanvas>
    </>
  );
}
