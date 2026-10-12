import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ edit: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    images = { edit: mocks.edit };
  },
  toFile: async (bytes: Uint8Array) => bytes,
}));
vi.mock("@/lib/supabase/admin", () => ({ adminDb: vi.fn() }));
const { OpenAIImageTransformProvider } =
  await import("@/lib/ai/providers/openai");
const { costOf } = await import("@/lib/ai/usage");
const png = (n: number) => ({
  b64_json: Buffer.from(`image-${n}`).toString("base64"),
});
const usage = {
  input_tokens: 5200,
  input_tokens_details: { image_tokens: 4500, text_tokens: 700 },
  output_tokens: 9000,
  total_tokens: 14200,
};
const input = {
  sourceImage: { bytes: new Uint8Array([1]), mimeType: "image/jpeg" },
  creatorReferenceImages: [
    { bytes: new Uint8Array([2]), mimeType: "image/jpeg" },
    { bytes: new Uint8Array([3]), mimeType: "image/jpeg" },
  ],
  aspectRatio: "iso-portrait" as const,
};
beforeEach(() => {
  mocks.edit.mockReset();
  process.env.OPENAI_API_KEY = "test";
});
describe("OpenAI image provider", () => {
  it("asks for every alternative in one request and keeps its usage", async () => {
    mocks.edit.mockResolvedValue({
      created: 1,
      data: [png(1), png(2), png(3)],
      usage,
    });
    const result = await new OpenAIImageTransformProvider().transform({
      ...input,
      count: 3,
    });
    // The photo and references are sent, and billed, once for all three.
    expect(mocks.edit).toHaveBeenCalledTimes(1);
    expect(mocks.edit.mock.calls[0][0]).toMatchObject({ n: 3 });
    expect(mocks.edit.mock.calls[0][0].image).toHaveLength(3);
    expect(result.images.map((b) => b.toString())).toEqual([
      "image-1",
      "image-2",
      "image-3",
    ]);
    expect(result.providerMetadata).toMatchObject({ batchSize: 3 });
    expect(result.usage).toEqual({
      inputTextTokens: 700,
      inputImageTokens: 4500,
      outputTokens: 9000,
      totalTokens: 14200,
    });
  });
  it("defaults to a single image", async () => {
    mocks.edit.mockResolvedValue({ created: 1, data: [png(1)] });
    const result = await new OpenAIImageTransformProvider().transform(input);
    expect(mocks.edit.mock.calls[0][0]).toMatchObject({ n: 1 });
    expect(result.images).toHaveLength(1);
    expect(result.usage).toBeNull();
  });
  it("sends at most four references by default", async () => {
    mocks.edit.mockResolvedValue({ created: 1, data: [png(1)] });
    const ref = { bytes: new Uint8Array([2]), mimeType: "image/jpeg" };
    await new OpenAIImageTransformProvider().transform({
      ...input,
      creatorReferenceImages: Array.from({ length: 7 }, () => ref),
    });
    // The photo plus four references.
    expect(mocks.edit.mock.calls[0][0].image).toHaveLength(5);
  });
  it("streams drafts and keeps the final image and its usage", async () => {
    const event = (type: string, n: number, extra = {}) => ({
      type,
      ...png(n),
      created_at: 7,
      ...extra,
    });
    mocks.edit.mockResolvedValue(
      (async function* () {
        yield event("image_edit.partial_image", 0, { partial_image_index: 0 });
        yield event("image_edit.partial_image", 1, { partial_image_index: 1 });
        yield event("image_edit.completed", 9, { usage });
      })(),
    );
    const drafts: string[] = [];
    const result = await new OpenAIImageTransformProvider().transform({
      ...input,
      onPartial: (image, index) => {
        drafts.push(`${index}:${Buffer.from(image).toString()}`);
      },
    });
    expect(mocks.edit.mock.calls[0][0]).toMatchObject({
      n: 1,
      stream: true,
      partial_images: 3,
    });
    expect(drafts).toEqual(["0:image-0", "1:image-1"]);
    expect(result.images.map((b) => b.toString())).toEqual(["image-9"]);
    expect(result.providerMetadata).toMatchObject({ created: 7 });
    expect(result.usage).toMatchObject({ outputTokens: 9000 });
  });
  it("refuses to stream more than one image per request", async () => {
    await expect(
      new OpenAIImageTransformProvider().transform({
        ...input,
        count: 3,
        onPartial: () => {},
      }),
    ).rejects.toThrow("Streaming drafts needs a count of 1");
    expect(mocks.edit).not.toHaveBeenCalled();
  });
  it("fails when fewer images come back than were asked for", async () => {
    mocks.edit.mockResolvedValue({ created: 1, data: [png(1), png(2)] });
    await expect(
      new OpenAIImageTransformProvider().transform({ ...input, count: 3 }),
    ).rejects.toThrow("Expected 3 images, received 2");
  });
});
describe("usage cost", () => {
  const usage = {
    inputTextTokens: 700,
    inputImageTokens: 4500,
    outputTokens: 9000,
    totalTokens: 14200,
  };
  it("prices a known model, dated snapshots included", () => {
    // 700 × $5 + 4,500 × $8 + 9,000 × $30, per million tokens.
    const expected = { cost: 0.3095 };
    expect(costOf({ model: "gpt-image-2", usage })).toMatchObject(expected);
    expect(costOf({ model: "gpt-image-2-2026-04-21", usage })).toMatchObject(
      expected,
    );
  });
  it("leaves the cost empty rather than guessing", () => {
    expect(costOf({ model: "gpt-image-2.5-sunburst", usage })).toEqual({
      rates: null,
      cost: null,
    });
    expect(costOf({ model: "gpt-image-2", usage: null }).cost).toBeNull();
  });
});
