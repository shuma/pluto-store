import { Skeleton } from "@/components/ui/skeleton";
// Scoped to the dashboard segment, so the sidebar and header in
// app/dashboard/layout.tsx stay on screen while the page content resolves.
export default function Loading() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
