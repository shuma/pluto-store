import { queryOptions } from "@tanstack/react-query";
export type PreviewCard = {
  id: string;
  status: "idle" | "running" | "ready" | "failed";
  // Where a running card is; null otherwise.
  stage: "queued" | "generating" | "refining" | null;
  url: string | null;
  // Null means the built-in sample at /demo/sample-photo.svg.
  sampleUrl: string | null;
  stale: boolean;
  // Already shown on the storefront as a before/after example.
  published: boolean;
};
export type StylePreview = {
  // In the creator's order; the first is always there, on the built-in sample
  // until they choose their own.
  cards: PreviewCard[];
  referenceCount: number;
  maxCards: number;
  // Today's previews: each run of a card spends one.
  budget: { remaining: number; limit: number; resetsAt: string | null };
};
export function stylePreviewQuery() {
  return queryOptions({
    queryKey: ["style-preview"] as const,
    queryFn: async (): Promise<StylePreview> => {
      const response = await fetch("/api/creator/preview");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not load your preview.");
      return data;
    },
    // A run takes minutes, so check in slowly and stop as soon as it settles.
    refetchInterval: (query) =>
      query.state.data?.cards.some((c) => c.status === "running")
        ? 5000
        : false,
  });
}
