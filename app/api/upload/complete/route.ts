import { api, assertOrigin } from "@/lib/http";
import { completeUpload } from "@/lib/generations/upload";
import { z } from "zod";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    return completeUpload(
      z.object({ sessionId: z.uuid() }).parse(await request.json()).sessionId,
    );
  });
}
