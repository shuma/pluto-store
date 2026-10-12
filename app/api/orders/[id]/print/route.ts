import { z } from "zod";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
import { signedUrl } from "@/lib/storage";
import { api, HttpError } from "@/lib/http";
// One item's print file, for an admin: an order holds one per print.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let url = "";
  const result = await api(async () => {
    await requireAdmin();
    const id = z.uuid().parse((await params).id);
    const item = z.uuid().parse(new URL(request.url).searchParams.get("item"));
    const { data, error } = await adminDb()
      .from("order_items")
      .select("print_storage_path, orders!inner(payment_status)")
      .eq("id", item)
      .eq("order_id", id)
      .eq("orders.payment_status", "paid")
      .maybeSingle();
    check(error);
    if (!data) throw new HttpError(404, "Print file unavailable.");
    url = await signedUrl("print-files", data.print_storage_path, 60);
    return {};
  });
  return url
    ? NextResponse.redirect(url, {
        headers: { "Cache-Control": "private, no-store" },
      })
    : result;
}
