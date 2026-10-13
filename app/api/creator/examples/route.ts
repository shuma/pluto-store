import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
const BUCKET = "creator-assets";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const { id } = z.object({ id: z.uuid() }).parse(await request.json());
    const db = adminDb();
    const { data, error } = await db
      .from("creator_examples")
      .delete()
      .eq("id", id)
      .eq("creator_id", store.id)
      .select("image_url,source_url")
      .maybeSingle();
    check(error);
    // The row goes first, so a failed removal leaves an orphaned file rather
    // than a broken example. The built-in sample is not in storage at all.
    const marker = `/object/public/${BUCKET}/`;
    const files = [data?.image_url, data?.source_url].flatMap((url) =>
      url?.includes(marker) ? [url.split(marker)[1]] : [],
    );
    if (files.length) await db.storage.from(BUCKET).remove(files);
    return { ok: true };
  });
}
