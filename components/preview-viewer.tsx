"use client";
import { useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
export type ViewerItem = {
  id: string;
  url: string;
  // The photo a style preview was made from; without one there is no toggle.
  sampleUrl?: string;
  stale?: boolean;
  download?: { href: string; filename: string };
  // Width over height; a portrait print (0.707) when not given.
  aspect?: number;
};
// Round, translucent controls that read on any image and on the dark scrim.
export const VIEWER_CONTROL =
  "grid place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition-[background-color,transform] hover:bg-white/20 active:scale-95 outline-offset-2 focus-ring motion-small";
// A finished preview at the size it deserves: as large as the screen allows at
// the print's shape, with its siblings a swipe of the arrow keys away and the
// sample it came from one toggle away, so the style can be judged against the
// photo that went in.
export function PreviewViewer({
  items,
  openId,
  onOpenChange,
  label = "Style preview",
  actions,
}: {
  items: ViewerItem[];
  openId: string | null;
  onOpenChange: (id: string | null) => void;
  // What one item is called, for the dialog title, alt text and arrows.
  label?: string;
  // Extra controls for the open item, in the row under the image.
  actions?: (item: ViewerItem) => React.ReactNode;
}) {
  const index = items.findIndex((item) => item.id === openId);
  const item = index >= 0 ? items[index] : null;
  const [original, setOriginal] = useState(false);
  // Where a touch began, so a horizontal swipe on the image pages like the
  // arrows do.
  const swipe = useRef<number | null>(null);
  const go = (step: number) => {
    if (items.length < 2) return;
    setOriginal(false);
    onOpenChange(items[(index + step + items.length) % items.length].id);
  };
  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) {
          setOriginal(false);
          onOpenChange(null);
        }
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/85 supports-backdrop-filter:backdrop-blur-sm motion-small" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") go(-1);
            if (e.key === "ArrowRight") go(1);
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 sm:p-12 motion-small"
        >
          {item && (
            <>
              <DialogTitle className="sr-only">
                {label} {index + 1} of {items.length}
              </DialogTitle>
              {/* Clicking the scrim around the image closes, like any lightbox. */}
              <DialogPrimitive.Close
                tabIndex={-1}
                aria-hidden
                className="absolute inset-0 cursor-zoom-out"
              />
              <div
                onPointerDown={(e) => {
                  if (e.pointerType === "touch") swipe.current = e.clientX;
                }}
                onPointerUp={(e) => {
                  if (swipe.current === null) return;
                  const dx = e.clientX - swipe.current;
                  swipe.current = null;
                  if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
                }}
                onPointerCancel={() => {
                  swipe.current = null;
                }}
                // Sized from whichever of width or height runs out first, at
                // the print's shape, so the frame is laid out before the image
                // arrives and nothing jumps.
                style={{
                  aspectRatio: `${item.aspect ?? 0.707}`,
                  width: `min(calc(100vw - 2rem), calc((100dvh - 9rem) * ${item.aspect ?? 0.707}))`,
                }}
                className="relative touch-pan-y overflow-hidden rounded-2xl bg-white/5 shadow-2xl ring-1 ring-white/10"
              >
                <img
                  key={item.url}
                  src={item.url}
                  alt={`${label} ${index + 1} of ${items.length}`}
                  className={cn(
                    "absolute inset-0 size-full object-cover animate-in fade-in transition-opacity motion-large",
                    original && "opacity-0",
                  )}
                />
                {item.sampleUrl && (
                  <img
                    key={item.sampleUrl}
                    src={item.sampleUrl}
                    alt="The sample photo this preview was made from"
                    className={cn(
                      "absolute inset-0 size-full object-cover transition-opacity motion-large",
                      !original && "opacity-0",
                    )}
                  />
                )}
              </div>
              <div className="relative flex items-center gap-3 text-sm text-white/80">
                {item.sampleUrl && (
                  <button
                    type="button"
                    aria-pressed={original}
                    onClick={() => setOriginal((o) => !o)}
                    className={cn(
                      VIEWER_CONTROL,
                      "flex h-9 gap-2 pr-4 pl-1",
                      original && "bg-white/25",
                    )}
                  >
                    <img
                      src={item.sampleUrl}
                      alt=""
                      className="aspect-[.707] h-7 rounded-md object-cover ring-1 ring-white/30"
                    />
                    <span className="text-xs font-medium">
                      {original ? "Show preview" : "Show sample"}
                    </span>
                  </button>
                )}
                {item.stale && (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
                    Out of date
                  </span>
                )}
                {item.download && (
                  <a
                    href={item.download.href}
                    download={item.download.filename}
                    className={cn(VIEWER_CONTROL, "flex h-9 gap-2 px-4")}
                  >
                    <Download className="size-4" />
                    <span className="text-xs font-medium">Download</span>
                  </a>
                )}
                {actions?.(item)}
                {items.length > 1 && (
                  <span className="text-xs tabular-nums text-white/60">
                    {index + 1} / {items.length}
                  </span>
                )}
              </div>
              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label={`Previous ${label.toLowerCase()}`}
                    className={cn(
                      VIEWER_CONTROL,
                      "absolute bottom-4 left-4 size-10 sm:top-1/2 sm:bottom-auto sm:left-6 sm:-translate-y-1/2",
                    )}
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label={`Next ${label.toLowerCase()}`}
                    className={cn(
                      VIEWER_CONTROL,
                      "absolute right-4 bottom-4 size-10 sm:top-1/2 sm:right-6 sm:bottom-auto sm:-translate-y-1/2",
                    )}
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </>
              )}
              <DialogPrimitive.Close
                aria-label="Close"
                className={cn(
                  VIEWER_CONTROL,
                  "absolute top-3 right-3 size-10 sm:top-6 sm:right-6",
                )}
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
