// The largest centred region of a width × height image with the given
// width/height ratio: how artwork is cut to a print's shape, for the print
// file and for its mockups alike.
export function centreCrop(width: number, height: number, ratio: number) {
  const w = Math.min(width, Math.floor(height * ratio));
  const h = Math.min(height, Math.floor(width / ratio));
  return {
    left: Math.floor((width - w) / 2),
    top: Math.floor((height - h) / 2),
    width: w,
    height: h,
  };
}
