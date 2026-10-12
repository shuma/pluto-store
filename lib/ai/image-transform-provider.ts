export type PosterAspectRatio = "iso-portrait";
export type TransformImageInput = {
  sourceImage: { bytes: Uint8Array; mimeType: string };
  creatorReferenceImages: Array<{ bytes: Uint8Array; mimeType: string }>;
  aspectRatio: PosterAspectRatio;
  // Alternatives from one request. The photo, references and prompt are sent
  // and billed once however many come back, so asking for several together
  // is far cheaper than asking several times. Defaults to 1.
  count?: number;
  // Streams rough drafts of the image while it is drawn, each handed over as
  // it arrives with its 0-based index. The provider streams only one image per
  // request, so this needs a count of 1.
  onPartial?: (image: Uint8Array, index: number) => void | Promise<void>;
};
// Tokens a call was billed for. It covers the whole request, however many
// images it returned. Null where the provider did not report usage.
export type ProviderUsage = {
  inputTextTokens: number;
  inputImageTokens: number;
  outputTokens: number;
  totalTokens: number;
};
export type TransformImageResult = {
  // One per requested alternative, in the provider's order.
  images: Uint8Array[];
  mimeType: string;
  provider: string;
  model: string;
  usage: ProviderUsage | null;
  providerMetadata?: Record<string, unknown>;
};
export interface ImageTransformProvider {
  transform(input: TransformImageInput): Promise<TransformImageResult>;
}
