import { Skeleton } from "@/components/ui/skeleton";
// A loading boundary also makes this dynamic route prefetchable: without one
// Next skips prefetching dynamic pages entirely.
export default function Loading() {
  return (
    <div data-page-surface="paper" className="min-h-dvh bg-paper">
      <main
        id="main"
        className="mx-auto flex max-w-[30rem] flex-col items-center px-4 pt-12 sm:pt-16"
        role="status"
        aria-label="Loading store"
      >
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="mt-4 h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
        <Skeleton className="mt-8 h-96 w-full rounded-4xl" />
      </main>
    </div>
  );
}
