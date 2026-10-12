import { api, assertOrigin } from "@/lib/http";
import { serverDb } from "@/lib/supabase/server";
export async function POST(r: Request) {
  return api(async () => {
    assertOrigin(r);
    await (await serverDb()).auth.signOut();
    return { ok: true };
  });
}
