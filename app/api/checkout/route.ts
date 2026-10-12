import { api, assertOrigin } from "@/lib/http";
import { startCheckout } from "@/lib/payments/checkout";
export const maxDuration = 60;
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    return startCheckout(await request.json());
  });
}
