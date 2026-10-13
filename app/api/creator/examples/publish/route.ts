import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { publishPreview, readStylePreview } from "@/lib/stores/style-preview";
// Puts a finished style preview on the storefront as a before/after example.
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const { previewId } = z
      .object({ previewId: z.uuid() })
      .parse(await request.json());
    await publishPreview(store.id, previewId);
    return readStylePreview(store.id);
  });
}
