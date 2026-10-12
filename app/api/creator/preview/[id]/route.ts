import sharp from "sharp";
import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { download } from "@/lib/storage";
import {
  readStylePreview,
  removePreviewCard,
} from "@/lib/stores/style-preview";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    await removePreviewCard(store.id, z.uuid().parse((await params).id));
    return readStylePreview(store.id);
  });
}
// Previews are stored as WebP to keep the panel light; a download is handed
// over as PNG, which every image viewer and editor opens.
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let png: Buffer | null = null;
  const result = await api(async () => {
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const { data, error } = await adminDb()
      .from("creator_style_previews")
      .select("storage_path")
      .eq("id", z.uuid().parse((await params).id))
      .eq("creator_id", store.id)
      .eq("status", "ready")
      .maybeSingle();
    check(error);
    if (!data?.storage_path) throw new HttpError(404, "Preview unavailable.");
    png = await sharp(
      await download("creator-reference-images", data.storage_path),
    )
      .png()
      .toBuffer();
    return {};
  });
  return png
    ? new Response(new Uint8Array(png), {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": 'attachment; filename="style-preview.png"',
          "Cache-Control": "private, no-store",
        },
      })
    : result;
}
