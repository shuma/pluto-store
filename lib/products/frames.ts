// Frame finishes as they read on screen, keyed by the words in a product's
// frame colour ("Natural wood frame"). Shared by the on-page print mock and
// the rendered room mockups, so both show the same frame.
const FRAME_TONES: [RegExp, string][] = [
  [/natural/i, "#c9a47a"],
  [/dark/i, "#5b4030"],
  [/white/i, "#f3f1ec"],
  [/black/i, "#1d1d1d"],
];
export function frameTone(colour: string | undefined) {
  return FRAME_TONES.find(([pattern]) => colour && pattern.test(colour))?.[1];
}
