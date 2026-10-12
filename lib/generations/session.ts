import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { adminDb, check } from "@/lib/supabase/admin";
import { sessionRow } from "@/lib/domain";
import { HttpError } from "@/lib/http";
import { required } from "@/lib/config";
import { uuid } from "@/lib/validation/schemas";
export const hashSecret = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function customerSecret(create = false) {
  const jar = await cookies();
  let secret = jar.get("pluto_customer")?.value;
  if (!secret && create) {
    secret = randomBytes(32).toString("hex");
    jar.set("pluto_customer", secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400 * 30,
    });
  }
  if (!secret)
    throw new HttpError(
      403,
      "This artwork belongs to another visit. Please start again.",
    );
  return hashSecret(secret);
}
export async function requireSession(id: string, allowExpired = false) {
  uuid.parse(id);
  const token = await customerSecret();
  const { data, error } = await adminDb()
    .from("generation_sessions")
    .select("*")
    .eq("id", id)
    .eq("session_token", token)
    .maybeSingle();
  check(error);
  if (!data) throw new HttpError(404, "Artwork not found.");
  const session = sessionRow.parse(data);
  if (!allowExpired && Date.parse(session.expires_at) <= Date.now())
    throw new HttpError(
      410,
      "This visit has expired. Please upload your photo again.",
    );
  return session;
}
export async function rateLimit(
  scope: string,
  limit: number,
  window: number,
  message = "Please come back a little later to create more artwork.",
) {
  const h = await headers();
  const ip =
    h.get("x-vercel-forwarded-for")?.split(",")[0] ??
    h.get("x-forwarded-for")?.split(",")[0] ??
    "local";
  const key = hashSecret(`${required("RATE_LIMIT_SALT")}:${scope}:${ip}`);
  const { data, error } = await adminDb().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: window,
  });
  check(error);
  if (!data) throw new HttpError(429, message);
}
