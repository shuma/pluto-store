import type { ReactNode } from "react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

// Pages already load this data on the server, so seed the client cache with it
// rather than prefetching through the route handler: the browser renders with
// data on the first paint and fires no request of its own.
export function Hydrate({
  queryKey,
  data,
  children,
}: {
  queryKey: QueryKey;
  data: unknown;
  children: ReactNode;
}) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKey, data);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
