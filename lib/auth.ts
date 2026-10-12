import "server-only";
import type { User } from "@supabase/supabase-js";
import { serverDb } from "@/lib/supabase/server";
import { adminDb, check } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/http";
import { storeRow } from "@/lib/domain";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let announced = false;
// Development-only sign-in bypass, so the dashboard can be worked on without
// round-tripping a magic link. It needs BOTH a development build and an
// explicit user id: it is never on by default, and because Next inlines
// NODE_ENV at build time this whole branch is dead code in a production build.
function developmentUser(): User | null {
  if (process.env.NODE_ENV !== "development") return null;
  const id = process.env.DEV_AUTH_USER_ID?.trim();
  if (!id) return null;
  if (!UUID.test(id))
    throw new Error(
      `DEV_AUTH_USER_ID must be a user UUID, received "${id}". It has to match creators.owner_user_id for the store pages to find a store.`,
    );
  if (!announced) {
    announced = true;
    console.warn(
      `[auth] DEV_AUTH_USER_ID is set: every request is signed in as ${id}. Development only.`,
    );
  }
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: process.env.DEV_AUTH_EMAIL ?? "dev@localhost",
    app_metadata: { provider: "dev" },
    user_metadata: {},
    created_at: new Date(0).toISOString(),
  };
}
export async function requireUser() {
  const development = developmentUser();
  if (development) return development;
  const db = await serverDb();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Please sign in.");
  return data.user;
}
export function isAdmin(id: string) {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .includes(id);
}
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.id)) throw new HttpError(403, "Access denied.");
  return user;
}
export async function ownedStore() {
  const user = await requireUser();
  const { data, error } = await adminDb()
    .from("creators")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  check(error);
  return data ? storeRow.parse(data) : null;
}
