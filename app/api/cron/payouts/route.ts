import { NextResponse } from "next/server";
import { required } from "@/lib/config";
import { runPayouts } from "@/lib/payouts/run";
export const maxDuration = 300;
// The monthly payout run, called by Vercel Cron (vercel.json) with the
// project's CRON_SECRET as a bearer token. Anyone else is turned away.
export async function GET(request: Request) {
  if (
    request.headers.get("authorization") !== `Bearer ${required("CRON_SECRET")}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const results = await runPayouts();
  console.log(JSON.stringify({ event: "payouts_run", results }));
  return NextResponse.json({
    paid: results.filter((r) => r.status === "paid").length,
    failed: results.filter((r) => r.status === "failed").length,
  });
}
