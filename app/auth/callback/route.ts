import { NextResponse } from "next/server";
import { serverDb } from "@/lib/supabase/server";
import { config } from "@/lib/config";
// Only dashboard paths, so a crafted link can't send someone off-site after
// signing in.
function safeNext(next: string | null) {
  return next && /^\/dashboard(\/[\w-]+)*$/.test(next) ? next : "/dashboard";
}
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  if (code) {
    const { error } = await (
      await serverDb()
    ).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        `${config().appUrl}${safeNext(params.get("next"))}`,
      );
  }
  return NextResponse.redirect(`${config().appUrl}/auth/login?error=link`);
}
