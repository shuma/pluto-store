"use client";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const options = {
  defaultOptions: {
    queries: {
      // Matches staleTimes.dynamic in next.config.ts: coming back to a screen
      // within 30s reuses what we already have instead of refetching.
      staleTime: 30_000,
      // The polling queries schedule their own retry cadence, and every route
      // handler here returns a readable message we want on screen right away.
      retry: false,
    },
  },
};

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  // A fresh client per server render keeps one visitor's data out of the next
  // one's; a single client in the browser is what survives navigation.
  if (typeof window === "undefined") return new QueryClient(options);
  browserQueryClient ??= new QueryClient(options);
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
