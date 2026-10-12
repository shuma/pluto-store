import { api, assertOrigin } from "@/lib/http";
import { startUpload } from "@/lib/generations/upload";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    return startUpload(await request.json());
  });
}
