import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-32 text-center">
      <h1 className="font-semibold text-5xl">
        Nothing here just yet.
      </h1>
      <p className="my-8 text-muted-foreground">
        This store or artwork isn’t available.
      </p>
      <Link href="/" className="underline">
        Back to Pluto
      </Link>
    </main>
  );
}
