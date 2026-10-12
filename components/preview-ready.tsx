"use client";
import { useEffect } from "react";
// Rendered on the storefront only in preview mode. The dashboard's preview
// frame writes the creator's unsaved edits into the page's `data-preview`
// marks, and must not before React has hydrated them: a write that lands
// first makes the server HTML and the page disagree, and React re-renders
// over it. Effects run after hydration, so this is the earliest safe moment.
export const PREVIEW_READY = "pluto:preview-ready";
export function PreviewReady() {
  useEffect(() => {
    document.documentElement.dataset.previewReady = "true";
    window.dispatchEvent(new Event(PREVIEW_READY));
  }, []);
  return null;
}
