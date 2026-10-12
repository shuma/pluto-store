import { api } from "@/lib/http";
import { requireSession } from "@/lib/generations/session";
import { generationResult } from "@/lib/generations/result";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return api(async () =>
    generationResult(await requireSession((await params).id)),
  );
}
