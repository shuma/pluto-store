import { after } from "next/server";
import { z } from "zod";
import { api, assertOrigin } from "@/lib/http";
import { claimRound, runRound } from "@/lib/generations/create";
import { completeUpload } from "@/lib/generations/upload";
export const maxDuration = 300;
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    const { sessionId } = z
      .object({ sessionId: z.uuid() })
      .parse(await request.json());
    // Finishes a fresh upload first, so the browser needs one request rather
    // than two to go from uploaded photo to running round. A session past
    // uploading returns at once.
    await completeUpload(sessionId);
    const job = await claimRound(sessionId);
    if (job) after(() => runRound(job));
    return { sessionId };
  });
}
