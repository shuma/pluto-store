import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore, requireUser } from "@/lib/auth";
import { countActiveProducts } from "@/lib/products/store-products";
import { adminDb, check } from "@/lib/supabase/admin";
import { storeSchema } from "@/lib/validation/schemas";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    const values = storeSchema.parse(await request.json());
    if (values.status === "live") {
      const store = await ownedStore();
      if (!store || !(await countActiveProducts(store)))
        throw new HttpError(409, "Add a product before going live.");
    }
    const { error } = await adminDb()
      .from("creators")
      .upsert(
        {
          ...values,
          owner_user_id: user.id,
          rights_confirmed_at: new Date().toISOString(),
        },
        { onConflict: "owner_user_id" },
      );
    if (error?.code === "23505")
      throw new HttpError(409, "That store address is already taken.");
    check(error);
    return { ok: true };
  });
}
