import "server-only";
import { createClient } from "@supabase/supabase-js";
import { required } from "@/lib/config";
export function adminDb() {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, {
            ...init,
            signal: init?.signal ?? AbortSignal.timeout(30_000),
          }),
      },
    },
  );
}
export function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
