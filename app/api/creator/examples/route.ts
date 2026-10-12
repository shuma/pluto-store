import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const { id } = z.object({ id: z.uuid() }).parse(await request.json());
    const { error } = await adminDb()
      .from("creator_examples")
      .delete()
      .eq("id", id)
      .eq("creator_id", store.id);
    check(error);
    return { ok: true };
  });
}
