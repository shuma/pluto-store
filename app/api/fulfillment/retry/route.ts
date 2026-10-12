import { z } from "zod";
import { api, assertOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/auth";
import { submitFulfillment } from "@/lib/fulfillment/submit";
export const maxDuration = 60;
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    await requireAdmin();
    const { orderId } = z
      .object({ orderId: z.uuid() })
      .parse(await request.json());
    await submitFulfillment(orderId);
    return { ok: true };
  });
}
