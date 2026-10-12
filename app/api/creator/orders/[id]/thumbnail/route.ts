import { z } from "zod";
import sharp from "sharp";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { download } from "@/lib/storage";
import { api, HttpError } from "@/lib/http";
// A small image of an order's print for the orders list. Print files are
// private and full size, so this shrinks one for the creator who sold it. A
// print never changes, so the browser keeps it for a week.
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let image: Buffer | null = null;
  const result = await api(async () => {
    const id = z.uuid().parse((await params).id);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Not found.");
    // The first print the order holds stands for it in the list.
    const { data, error } = await adminDb()
      .from("order_items")
      .select("print_storage_path, orders!inner(creator_id)")
      .eq("order_id", id)
      .eq("orders.creator_id", store.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Not found.");
    const print = await download("print-files", data.print_storage_path).catch(
      () => {
        throw new HttpError(404, "Not found.");
      },
    );
    image = await sharp(print, { limitInputPixels: false })
      .resize(96, 96, { fit: "inside" })
      .webp({ quality: 80 })
      .toBuffer();
    return {};
  });
  return image
    ? new Response(new Uint8Array(image), {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, max-age=604800, immutable",
        },
      })
    : result;
}
