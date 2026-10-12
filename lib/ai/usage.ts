import "server-only";
import { adminDb } from "@/lib/supabase/admin";
import { logError } from "@/lib/logging";
import type { TransformImageResult } from "./image-transform-provider";
// USD per million tokens, from OpenAI's published model pricing. A model not
// listed here still has its tokens recorded, with a null cost, rather than a
// cost made up from another model's rates. Add a model's rates once OpenAI
// publishes them; past rows keep the rates they were costed with.
const RATES: Record<
  string,
  { inputText: number; inputImage: number; output: number }
> = {
  "gpt-image-2": { inputText: 5, inputImage: 8, output: 30 },
};
// Dated snapshots share their model's rates.
const ratesFor = (model: string) =>
  RATES[model] ??
  Object.entries(RATES).find(([name]) => model.startsWith(`${name}-`))?.[1] ??
  null;
export function costOf(result: Pick<TransformImageResult, "model" | "usage">) {
  const rates = ratesFor(result.model);
  const usage = result.usage;
  if (!rates || !usage) return { rates, cost: null };
  const cost =
    (usage.inputTextTokens * rates.inputText +
      usage.inputImageTokens * rates.inputImage +
      usage.outputTokens * rates.output) /
    1_000_000;
  return { rates, cost: Math.round(cost * 1e6) / 1e6 };
}
// Best effort: a lost usage row must never fail the artwork or preview it
// describes, so a failed write is logged and swallowed.
export async function recordUsage(
  result: TransformImageResult,
  context: {
    creatorId: string;
    purpose: "generation" | "style_preview";
    generationRoundId?: string;
    stylePreviewId?: string;
  },
) {
  const { rates, cost } = costOf(result);
  const meta = result.providerMetadata ?? {};
  try {
    const { error } = await adminDb()
      .from("ai_usage")
      .insert({
        creator_id: context.creatorId,
        purpose: context.purpose,
        generation_round_id: context.generationRoundId ?? null,
        style_preview_id: context.stylePreviewId ?? null,
        provider: result.provider,
        model: result.model,
        quality: typeof meta.quality === "string" ? meta.quality : null,
        size: typeof meta.size === "string" ? meta.size : null,
        images: result.images.length,
        reference_images:
          typeof meta.referenceImages === "number" ? meta.referenceImages : 0,
        input_text_tokens: result.usage?.inputTextTokens ?? null,
        input_image_tokens: result.usage?.inputImageTokens ?? null,
        output_tokens: result.usage?.outputTokens ?? null,
        total_tokens: result.usage?.totalTokens ?? null,
        rate_input_text: rates?.inputText ?? null,
        rate_input_image: rates?.inputImage ?? null,
        rate_output: rates?.output ?? null,
        cost_usd: cost,
      });
    if (error) throw new Error(error.message);
  } catch (error) {
    logError("ai_usage_record_failed", error, {
      purpose: context.purpose,
      model: result.model,
    });
  }
}
