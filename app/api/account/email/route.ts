import { z } from "zod";
import { api, assertOrigin, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { serverDb } from "@/lib/supabase/server";
// Changes the email a creator signs in with. Supabase sends a confirmation
// link; the change only takes effect once it's followed, so a typo can't
// lock anyone out.
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const user = await requireUser();
    const { email } = z
      .object({ email: z.email("Check the email address.") })
      .parse(await request.json());
    if (email.toLowerCase() === user.email?.toLowerCase())
      throw new HttpError(400, "That’s already your email address.");
    const { error } = await (
      await serverDb()
    ).auth.updateUser(
      { email },
      {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback?next=/dashboard/settings`,
      },
    );
    if (error)
      throw new HttpError(
        error.status === 422 ? 409 : 400,
        error.status === 422
          ? "That email address is already in use."
          : "Couldn’t change your email. Try again.",
      );
    return { ok: true };
  });
}
