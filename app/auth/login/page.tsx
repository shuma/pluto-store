import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { LoginBackdrop } from "@/components/login-backdrop";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main
      id="main"
      className="relative isolate mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center overflow-x-clip px-4 py-12 sm:px-6 sm:py-16"
    >
      <div className="relative">
        <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(10)]">
          <CardContent>
            <LoginBackdrop />
            <div>
              {error && (
                <p role="alert" className="mb-4 text-sm text-destructive">
                  That sign-in link has expired or was opened in a different
                  browser. Please request a new one.
                </p>
              )}
              <LoginForm />
            </div>
            <p className="mt-8 shadow-[inset_0_var(--border-s)_0_var(--border)] pt-6 text-xs text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-4">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                Privacy Policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
