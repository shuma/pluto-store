import Link from "next/link";
export function SiteHeader({ storeName }: { storeName?: string }) {
  return (
    <header className="mx-auto flex h-24 max-w-[1280px] items-center justify-between px-6 md:px-12">
      <Link
        href="/"
        className="text-3xl font-semibold tracking-[-.09em]"
        aria-label="Pluto home"
      >
        pluto<span className="text-[18px]">®</span>
      </Link>
      {storeName && (
        <span
          data-preview="name"
          className="hidden text-xs uppercase tracking-[.18em] text-muted-foreground sm:block"
        >
          {storeName}
        </span>
      )}
      <Link
        href="/auth/login"
        className="rounded-full bg-accent px-6 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
      >
        For creators ↗
      </Link>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 flex max-w-[1280px] flex-wrap items-center justify-between gap-6 shadow-[inset_0_var(--border-s)_0_var(--border)] px-6 py-12 text-xs text-muted-foreground md:px-12">
      <span>Pluto · Made personal.</span>
      <nav className="flex gap-6">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/auth/login">Creator login</Link>
      </nav>
    </footer>
  );
}
