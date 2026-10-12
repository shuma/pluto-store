import { z } from "zod";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { download } from "@/lib/storage";
import { api, HttpError } from "@/lib/http";
import { ORDER_WITH_ITEMS, orderRow } from "@/lib/domain";
import { itemMockup } from "@/lib/mockups/get-mockup";
// One print of an order hanging in a room, for the creator who sold it: the
// same mockup the customer saw. It never changes, so the browser keeps it a week.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let image: Uint8Array | null = null;
  const result = await api(async () => {
    const id = z.uuid().parse((await params).id);
    const itemId = z
      .uuid()
      .parse(new URL(request.url).searchParams.get("item"));
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Not found.");
    const { data, error } = await adminDb()
      .from("orders")
      .select(ORDER_WITH_ITEMS)
      .eq("id", id)
      .eq("creator_id", store.id)
      .maybeSingle();
    check(error);
    const item = data
      ? orderRow.parse(data).order_items.find((i) => i.id === itemId)
      : null;
    if (!item) throw new HttpError(404, "Not found.");
    const mockup = await itemMockup(item);
    if (!mockup) throw new HttpError(404, "Not found.");
    image = mockup.bytes ?? (await download(mockup.bucket, mockup.path));
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
