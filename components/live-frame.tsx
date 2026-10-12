"use client";
import { useEffect, useState } from "react";
import { RefineFrame, type RefineStatus } from "@/components/refine-frame";

// Signed URLs are re-signed every few minutes; the path is the image itself.
const pathOf = (url: string) => url.split("?")[0];

// A frame never swaps to an image the browser still has to fetch: that would
// leave it empty, showing only its background and chip, until the download
// finished. The next image is downloaded and decoded off screen while the
// current one stays up, a finished run still reading as refining, and only
// then does the frame swap and resolve it in. An image that never loads is
// never swapped in. With no src yet it holds an empty, sweeping frame.
export function LiveFrame({
  src,
  status,
  alt,
  width,
  radius = 16,
  labels,
  className = "shadow-sm ring-1 ring-neutral-6-transparent",
}: {
  src: string | null;
  status: RefineStatus;
  alt: string;
  width: number;
  radius?: number;
  labels?: Partial<Record<RefineStatus, string>>;
  className?: string;
}) {
  // The newest image that is ready to paint, as the link it loaded from;
  // null until the first one is.
  const [ready, setReady] = useState<string | null>(null);
  // Links are signed again now and then, so the same image can arrive under a
  // new link. Only a different image is loaded: re-pointing the frame at the
  // same picture would reload it under the mosaic, which on iOS then draws
  // from an image that isn't there yet and stays blank.
  const next = src && !(ready && pathOf(ready) === pathOf(src)) ? src : null;
  useEffect(() => {
    if (!next) return undefined;
    let current = true;
    const image = new Image();
    image.src = next;
    // Only an image that actually loaded is swapped in. One that fails keeps
    // the frame on what it already shows (the customer's photo, or an earlier
    // draft) rather than emptying it; the next poll brings a newer image.
    image
      .decode()
      .then(() => {
        if (current && image.naturalWidth) setReady(next);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [next]);
  const waiting = !src || !ready || pathOf(ready) !== pathOf(src);
  // Always the loaded link: never one the browser still has to fetch.
  const shown = ready;
  return (
    <RefineFrame
      // A new image remounts the frame so it resolves from the coarsest
      // mosaic, rather than finishing the last steps of the previous one's.
      key={shown ? pathOf(shown) : "empty"}
      status={waiting && status === "complete" ? "refining" : status}
      showStatus={Boolean(shown)}
      aspectRatio=".707"
      width={width}
      radius={radius}
      background="var(--paper-shell)"
      color="var(--foreground)"
      stageDuration={300}
      labels={labels}
      className={className}
    >
      {shown && <img src={shown} alt={alt} />}
    </RefineFrame>
  );
}
