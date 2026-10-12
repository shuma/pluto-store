// Rooms a print is shown hanging in. Each is a photograph of an empty wall
// (made once by scripts/generate-mockup-scenes.ts) and where on it a print
// hangs. Prints are centred on `centre` at true scale, so a 70 × 100 cm
// poster fills the wall and a 30 × 40 cm one sits small on it, as in a room.
export type Scene = {
  id: string;
  // Under lib/mockups/scenes/.
  file: string;
  width: number;
  height: number;
  // Where the middle of a print hangs, in scene pixels.
  centre: { x: number; y: number };
  // Scene pixels per millimetre of print, set by eye against the furniture.
  pxPerMm: number;
};

export const SCENES = {
  // Plaster wall, plant on the left, bench with books and a succulent below.
  plaster: {
    id: "plaster",
    file: "plaster.jpg",
    width: 2048,
    height: 2048,
    centre: { x: 1110, y: 930 },
    pxPerMm: 1.1,
  },
  // Grey wall above an oak sideboard, floor lamp on the right.
  scandinavian: {
    id: "scandinavian",
    file: "scandinavian.jpg",
    width: 2048,
    height: 2048,
    centre: { x: 1060, y: 800 },
    pxPerMm: 0.85,
  },
} satisfies Record<string, Scene>;
export type SceneId = keyof typeof SCENES;
export const DEFAULT_SCENE: SceneId = "plaster";

// Room left between a print and the scene's edge, for its shadow.
const MARGIN = 48;

// Where a print of this size hangs in the scene, in whole pixels. A print too
// big for the wall is scaled down to fit rather than cropped.
export function mockupPlacement(
  scene: Scene,
  widthMm: number,
  heightMm: number,
) {
  const fit = Math.min(
    1,
    (scene.width - 2 * MARGIN) / (widthMm * scene.pxPerMm),
    (scene.height - 2 * MARGIN) / (heightMm * scene.pxPerMm),
  );
  const width = Math.round(widthMm * scene.pxPerMm * fit);
  const height = Math.round(heightMm * scene.pxPerMm * fit);
  const clamp = (v: number, size: number, max: number) =>
    Math.min(Math.max(v, MARGIN), max - MARGIN - size);
  return {
    left: clamp(Math.round(scene.centre.x - width / 2), width, scene.width),
    top: clamp(Math.round(scene.centre.y - height / 2), height, scene.height),
    width,
    height,
  };
}
