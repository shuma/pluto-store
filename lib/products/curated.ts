// The part of Gelato's catalog creators choose from. Gelato offers about sixty
// poster sizes, a dozen papers and seven frame finishes; most stores sell a
// handful, and a short list of well-known options is easier to price and
// easier for customers to choose between. Everything here fits portrait
// artwork (see fitsArtwork).
//
// Gelato names each size twice, metric-first ("300x400-mm-12x16-inch", 300 ×
// 400 mm) and imperial-first ("12x16-inch-300x400-mm", 304.8 × 406.4 mm), and
// they are different products: the first is the metric size, the second the
// US one. The A4 frame is spelt differently from the A4 poster, and A-sizes
// are upper case in one catalog and lower case in the other; a value a
// catalog doesn't have simply matches nothing.

// Sizes customers recognise, in the two systems they shop in: ISO A-sizes
// and frame-shop standards in centimetres, and the US standards in inches.
export const SIZE_SYSTEMS = {
  metric: [
    // 13 × 18 cm, a photo-print size, sold as a mini print for the fridge.
    "130x180-mm-5R",
    "A4-8x12-inch",
    "210x297mm-8x12-inch",
    "300x400-mm-12x16-inch",
    "A3",
    "a3",
    "A2",
    "a2",
    "500x700-mm-20x28-inch",
    "700x1000-mm-28x40-inch",
  ],
  imperial: [
    // 5 × 7 in, the US photo-print size.
    "5R-130x180-mm",
    "8x10-inch-200x250-mm",
    "11x14-inch-270x350-mm",
    "12x16-inch-300x400-mm",
    "16x20-inch-400x500-mm",
    "18x24-inch-450x600-mm",
    "24x36-inch-600x900-mm",
  ],
};
export type SizeSystem = keyof typeof SIZE_SYSTEMS;
const SIZES = [...SIZE_SYSTEMS.metric, ...SIZE_SYSTEMS.imperial];
// The attribute that holds the size, per catalog.
export const SIZE_ATTRIBUTE: Record<string, string> = {
  posters: "UnifiedPaperFormat",
  "framed-posters": "UnifiedFrameSize",
};
// A filter of our own, not a Gelato attribute: which size system to show.
export const SIZE_FILTER = "Sizes";
export const SIZE_SYSTEM_LABELS: Record<SizeSystem, string> = {
  metric: "Centimetres",
  imperial: "Inches",
};

export const MATTE = "200-gsm-80lb-uncoated";
export const ARCHIVAL = "250-gsm-100lb-uncoated-offwhite-archival";

// What each catalog is narrowed to before a creator sees it.
export const CURATED: Record<string, Record<string, string[]>> = {
  posters: {
    UnifiedPaperFormat: SIZES,
    UnifiedPaperType: [MATTE, ARCHIVAL],
  },
  "framed-posters": {
    UnifiedFrameSize: SIZES,
    // One paper keeps framed choices to size and frame; matte reads well
    // behind plexiglass.
    UnifiedPaperType: [MATTE],
    FrameMaterial: ["wood"],
    FrameColor: ["black", "white", "natural-wood", "dark-wood"],
  },
};

// Names for the curated values, in place of Gelato's
// "250 gsm / 100 lb cover uncoated off white archival".
export const VALUE_LABELS: Record<string, string> = {
  [MATTE]: "Matte paper",
  [ARCHIVAL]: "Archival paper",
  black: "Black",
  white: "White",
  "natural-wood": "Natural wood",
  "dark-wood": "Dark wood",
  wood: "Wood",
};
