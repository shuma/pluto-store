"use client";
import { useQuery } from "@tanstack/react-query";
import { FlowProgress } from "./flow-header";
import { generationQuery } from "@/lib/queries/generation";

// The results page is rendered once while the artwork is still being made,
// so its bar follows the same poll as the page below it: Create while the
// artworks are drawn, Choose once they are ready to pick from.
export function GenerationProgress({ sessionId }: { sessionId: string }) {
  const { data } = useQuery(generationQuery(sessionId));
  return <FlowProgress step={data?.status === "completed" ? 1 : 0} />;
}
