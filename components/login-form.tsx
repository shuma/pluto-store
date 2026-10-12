"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { post } from "@/lib/client-api";
import { cn } from "@/lib/utils";
const RESEND_SECONDS = 30;
export function LoginForm() {
  const [email, setEmail] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function send(address: string) {
    setBusy(true);
    setMessage("");
    try {
      await post("/api/auth/login", { email: address });
      setSent(true);
      setCooldown(RESEND_SECONDS);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn’t send a link. Please try again shortly.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (sent)
    return (
      <div>
        <h1 className="text-3xl font-semibold">
          Check your email
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We sent a sign-in link to <strong>{email}</strong>. Open it in this
          browser to finish signing in. The link expires in one hour.
        </p>
        <p
          role="status"
          className={cn("text-sm text-destructive", message && "mt-4")}
        >
          {message}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Didn’t receive it?{" "}
          {cooldown > 0 ? (
            <span>Resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              className="font-medium underline underline-offset-4"
              disabled={busy}
              onClick={() => void send(email)}
            >
              {busy ? "Sending…" : "Resend email"}
            </button>
          )}
        </p>
        <button
          type="button"
          className="mt-6 flex items-center gap-2 text-sm"
          onClick={() => {
            setSent(false);
            setMessage("");
          }}
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to sign in
        </button>
      </div>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send(email);
      }}
    >
      <h1 className="text-3xl font-semibold">
        Sign in to Pluto
      </h1>
      <p className="mb-6 mt-3 text-sm text-muted-foreground">
        We’ll email you a sign-in link. No password needed.
      </p>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@yourstudio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
      </FieldGroup>
      <Button className="mt-4 w-full" size="lg" disabled={busy}>
        {busy ? "Sending…" : "Send sign-in link"}
      </Button>
      <p
        role="status"
        className={cn("text-sm text-destructive", message && "mt-4")}
      >
        {message}
      </p>
    </form>
  );
}
