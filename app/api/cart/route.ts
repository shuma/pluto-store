import { z } from "zod";
import { api, assertOrigin } from "@/lib/http";
import { requireSession } from "@/lib/generations/session";
import {
  addToCart,
  getCart,
  removeFromCart,
  setQuantity,
} from "@/lib/cart/cart";
// The visit's cart. Every change answers with the whole cart, so the page
// shows what the server now holds.
export async function GET(request: Request) {
  return api(async () => {
    const params = new URL(request.url).searchParams;
    const sessionId = z.uuid().parse(params.get("session"));
    const artworkId = z.uuid().parse(params.get("artwork"));
    const session = await requireSession(sessionId);
    return {
      items: await getCart(session.id, session.creator_id, artworkId),
    };
  });
}
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    return { items: await addToCart(await request.json()) };
  });
}
export async function PATCH(request: Request) {
  return api(async () => {
    assertOrigin(request);
    return { items: await setQuantity(await request.json()) };
  });
}
export async function DELETE(request: Request) {
  return api(async () => {
    assertOrigin(request);
    return { items: await removeFromCart(await request.json()) };
  });
}
