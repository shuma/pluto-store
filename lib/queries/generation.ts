import { queryOptions } from "@tanstack/react-query";

export type GenerationResult = {
  status: "uploading" | "ready" | "generating" | "completed" | "failed";
  roundCount: number;
  artworks: { id: string; url: string }[];
  // Present only while a round runs: one entry per artwork being drawn, with
  // its newest draft (step 1 is the first) or, once done, the artwork itself.
  progress?: { url: string | null; step: number; done: boolean }[];
  // The customer's own photo, also only while a round runs: each frame starts
  // from it, so a round whose drafts never come still shows something.
  photoUrl?: string;
};

export function generationQuery(sessionId: string) {
  return queryOptions({
    queryKey: ["generation", sessionId] as const,
    queryFn: async (): Promise<GenerationResult> => {
      const response = await fetch(`/api/generations/${sessionId}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not load your artwork.");
      return data;
    },
    // Poll while the artwork is still being made, and back off while the
    // request keeps failing. Drafts arrive every several seconds while the
    // artworks are drawn, so that stretch is polled more closely. Polling
    // pauses on its own once the tab is in the background and resumes on
    // return, so a forgotten tab costs nothing.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      if (query.state.error) return 8000;
      return status === "generating" ? 1500 : 3000;
    },
  });
}
