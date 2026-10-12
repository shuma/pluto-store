import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  cookie: vi.fn(),
  query: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.cookie }),
  headers: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  adminDb: () => ({ from: () => ({ select: () => ({ eq: mocks.eq }) }) }),
  check: (error: unknown) => {
    if (error) throw error;
  },
}));
import { requireSession, hashSecret } from "@/lib/generations/session";
const id = "44444444-4444-4444-8444-444444444444";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.eq.mockReturnValue({ eq: mocks.eq, maybeSingle: mocks.query });
  mocks.cookie.mockReturnValue({ value: "secret" });
});
it("requires a browser capability even with a valid session UUID", async () => {
  mocks.cookie.mockReturnValue(undefined);
  await expect(requireSession(id)).rejects.toMatchObject({ status: 403 });
  expect(mocks.query).not.toHaveBeenCalled();
});
it("queries only the hashed capability and returns no data on mismatch", async () => {
  mocks.query.mockResolvedValue({ data: null, error: null });
  await expect(requireSession(id)).rejects.toMatchObject({ status: 404 });
  expect(mocks.eq).toHaveBeenCalledWith("session_token", hashSecret("secret"));
});
it("expires image access while allowing existing order confirmation", async () => {
  mocks.query.mockResolvedValue({
    data: {
      id,
      creator_id: "11111111-1111-4111-8111-111111111111",
      session_token: hashSecret("secret"),
      source_image_path: "private",
      round_count: 1,
      status: "completed",
      expires_at: "2000-01-01T00:00:00Z",
    },
    error: null,
  });
  await expect(requireSession(id)).rejects.toMatchObject({ status: 410 });
  await expect(requireSession(id, true)).resolves.toMatchObject({ id });
});
