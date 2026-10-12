import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { required } from "@/lib/config";
export async function serverDb() {
  const jar = await cookies();
  return createServerClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server Components cannot write; proxy refreshes cookies. */
          }
        },
      },
    },
  );
}
