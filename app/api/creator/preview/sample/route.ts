import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { readStylePreview, setCardSample } from "@/lib/stores/style-preview";
// Uploading a sample goes through /api/creator/assets like every other creator
// image; this only puts the built-in sample back on a card.
export async function DELETE(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const { id } = z.object({ id: z.uuid() }).parse(await request.json());
    await setCardSample(store.id, id, null);
    return readStylePreview(store.id);
  });
}
