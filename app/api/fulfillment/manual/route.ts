import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    await requireAdmin();
    const { orderId } = z
      .object({ orderId: z.uuid() })
      .parse(await request.json());
    const { data, error } = await adminDb()
      .from("orders")
      .update({ fulfillment_status: "fulfilled" })
      .eq("id", orderId)
      .eq("payment_status", "paid")
      .in("fulfillment_status", ["manual", "submitted"])
      .select("id");
    check(error);
    if (!data?.length)
      throw new HttpError(409, "This order cannot be marked fulfilled.");
    return { ok: true };
  });
}
