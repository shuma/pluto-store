import { z } from "zod";
import { api, HttpError } from "@/lib/http";
import { adminDb, check } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/generations/session";
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(async () => {
    const id = z.uuid().parse((await params).id);
    const { data, error } = await adminDb()
      .from("orders")
      .select("id,generation_session_id,payment_status,fulfillment_status")
      .eq("id", id)
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Order not found.");
    await requireSession(data.generation_session_id, true);
    return {
      paymentStatus: data.payment_status,
      fulfillmentStatus: data.fulfillment_status,
    };
  });
}
