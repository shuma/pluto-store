import { z } from "zod";
import { api, assertOrigin } from "@/lib/http";
import { serverDb } from "@/lib/supabase/server";
import { config } from "@/lib/config";
import { loginError } from "@/lib/auth/login-error";
import { rateLimit } from "@/lib/generations/session";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    await rateLimit(
      "login",
      5,
      3600,
      "Too many sign-in attempts. Please wait up to an hour before requesting another link.",
    );
    const { email } = z
      .object({ email: z.string().trim().toLowerCase().pipe(z.email()) })
      .parse(await request.json());
    const db = await serverDb();
    const { error } = await db.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${config().appUrl}/auth/callback`,
      },
    });
    if (error) {
      console.error(
        JSON.stringify({
          event: "login_email_failed",
          code: error.code,
          status: error.status,
        }),
      );
      throw loginError(error);
    }
    return { ok: true };
  });
}
