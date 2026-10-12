import { z } from "zod";
import { requireSession } from "@/lib/generations/session";
import { adminDb, check } from "@/lib/supabase/admin";
import { download } from "@/lib/storage";
import { api, HttpError } from "@/lib/http";
import { productRow } from "@/lib/domain";
import { ensureMockup } from "@/lib/mockups/get-mockup";
// The customer's artwork hanging in a room, as one print would look: shown on
// the size page for each size on offer. Drawn once and kept, and the same
// artwork in the same print never changes, so the browser keeps it a week.
const query = z.object({
  session: z.uuid(),
  artwork: z.uuid(),
  product: z.uuid(),
});
export async function GET(request: Request) {
  let image: Uint8Array | null = null;
  const result = await api(async () => {
    const q = query.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const session = await requireSession(q.session);
    const db = adminDb();
    const [artwork, product] = await Promise.all([
      db
        .from("generated_artworks")
        .select("storage_path")
        .eq("id", q.artwork)
        .eq("generation_session_id", session.id)
        .eq("status", "ready")
        .maybeSingle(),
      db
        .from("products")
        .select("*")
        .eq("id", q.product)
        .eq("creator_id", session.creator_id)
        .eq("active", true)
        .maybeSingle(),
    ]);
    check(artwork.error);
    check(product.error);
    if (!artwork.data || !product.data) throw new HttpError(404, "Not found.");
    const mockup = await ensureMockup(
      { bucket: "generated-artworks", path: artwork.data.storage_path },
      productRow.parse(product.data),
    );
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
