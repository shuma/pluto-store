import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { ownedStore } from "@/lib/auth";
import { adminDb, check } from "@/lib/supabase/admin";
export async function POST(r: Request) {
  return api(async () => {
    assertOrigin(r);
    const store = await ownedStore();
    if (!store) throw new HttpError(404, "Store not found.");
    const {
      id,
      action,
      order,
      x,
      y,
      rotation,
      z: depth,
    } = z
      .object({
        id: z.uuid().optional(),
        action: z.enum([
          "remove",
          "activate",
          "deactivate",
          "arrange",
          "position",
        ]),
        order: z.array(z.uuid()).max(16).optional(),
        x: z.number().min(0).max(1).optional(),
        y: z.number().min(0).max(1).optional(),
        rotation: z.number().min(-30).max(30).optional(),
        z: z.number().int().min(0).max(9999).optional(),
      })
      .parse(await r.json());
    const db = adminDb();
    if (action === "arrange") {
      if (!order?.length) throw new HttpError(400, "Send the new order.");
      // Reading order on the canvas is the order the references reach the
      // model, so the whole set is rewritten in one request.
      for (const [index, reference] of order.entries())
        check(
          (
            await db
              .from("creator_reference_images")
              .update({ sort_order: index })
              .eq("id", reference)
              .eq("creator_id", store.id)
          ).error,
        );
      return { ok: true };
    }
    if (!id) throw new HttpError(400, "Which image?");
    if (action === "position") {
      if (x === undefined || y === undefined)
        throw new HttpError(400, "Position requires x and y.");
      check(
        (
          await db
            .from("creator_reference_images")
            .update({
              canvas_x: x,
              canvas_y: y,
              canvas_rotation: rotation ?? 0,
              canvas_z: depth ?? 0,
            })
            .eq("id", id)
            .eq("creator_id", store.id)
        ).error,
      );
      return { ok: true };
    }
    if (action === "remove") {
      const { data, error } = await db
        .from("creator_reference_images")
        .delete()
        .eq("id", id)
        .eq("creator_id", store.id)
        .select("storage_path")
        .single();
      check(error);
      check(
        (
          await db.storage
            .from("creator-reference-images")
            .remove([data!.storage_path])
        ).error,
      );
    } else {
      check(
        (
          await db
            .from("creator_reference_images")
            .update({ active: action === "activate" })
            .eq("id", id)
            .eq("creator_id", store.id)
        ).error,
      );
    }
    return { ok: true };
  });
}
