import { PlutoGlobe } from "./pluto-globe";
// The card's mark, centred at the top of the card in place of the wordmark.
// It lives inside the card because the veil canvas is opaque: anywhere it
// crossed the card's border it would paint over the outline.
export function LoginBackdrop() {
  return <PlutoGlobe className="mx-auto mb-6 size-28 sm:size-32" />;
}
