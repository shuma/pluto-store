// What to show on a print in the dashboard: the creator's style previews
// from the reference images page, which are what customers will actually
// get, and a public image to fall back on when there are none or a preview
// link has expired.
export type Artwork = { urls: string[]; fallback: string | null };

// A different preview for each print, in turn, so the creator sees their
// style across sizes rather than one picture repeated.
export function artFor(art: Artwork, index: number) {
  return {
    src: art.urls.length ? art.urls[index % art.urls.length] : art.fallback,
    fallback: art.fallback,
  };
}
