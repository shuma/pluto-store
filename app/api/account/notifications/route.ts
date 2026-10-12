import { api, assertOrigin } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { notificationsSchema } from "@/lib/validation/schemas";
// Which emails a creator wants. Stored now; sending starts once an email
// provider is connected.
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    const values = notificationsSchema.parse(await request.json());
    const { error } = await adminDb()
      .from("profiles")
      .upsert({ id: user.id, ...values });
    check(error);
    return { ok: true };
  });
}
