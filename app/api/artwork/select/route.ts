import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { requireSession } from "@/lib/generations/session";
import { adminDb, check } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const { sessionId, artworkId } = z
      .object({ sessionId: z.uuid(), artworkId: z.uuid() })
      .parse(await request.json());
    await requireSession(sessionId);
    const { data, error } = await adminDb()
      .from("generated_artworks")
      .update({ selected: true })
      .eq("id", artworkId)
      .eq("generation_session_id", sessionId)
      .eq("status", "ready")
      .select("id")
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Artwork not found.");
    track("artwork_selected", { artwork_id: artworkId });
    return { ok: true };
  });
}
