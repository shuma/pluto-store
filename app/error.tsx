"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-32 text-center">
      <h1 className="font-semibold mb-6 text-5xl">
        A small interruption.
      </h1>
      <p className="mb-8 text-muted-foreground">
        We couldn’t open this page. Please try again. If your visit has expired,
        start with a new photo.
      </p>
      <Button onClick={reset}>Try again</Button>
      <Link href="/" className="ml-6 text-sm underline">
        Back to Pluto
      </Link>
    </main>
  );
}
