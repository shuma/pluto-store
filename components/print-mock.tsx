"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { isFramed } from "@/lib/products/catalog";
import { frameTone } from "@/lib/products/frames";
// A print as it will look: the creator's own artwork at the print's true
// proportions, framed in its frame colour or as a bare sheet. `scale` sets
// its height against the tallest print on show, so sizes can be compared at
// a glance; prints stand on a shared baseline, like on a wall.
export function PrintMock({
  catalog,
  widthMm,
  heightMm,
  frameColour,
  artUrl,
  fallbackUrl,
  scale = 1,
  className,
}: {
  catalog: string | null;
  widthMm: number;
  heightMm: number;
  frameColour?: string;
  artUrl?: string | null;
  // Shown instead when artUrl fails, such as a signed link that has expired
  // while the page stayed open.
  fallbackUrl?: string | null;
  scale?: number;
  className?: string;
}) {
  const framed = isFramed(catalog);
  const tone = frameTone(frameColour) ?? "#1d1d1d";
  // The sources that failed to load, so each is tried once.
  const [failed, setFailed] = useState<string[]>([]);
  const src = [artUrl, fallbackUrl].find(
    (url): url is string => Boolean(url) && !failed.includes(url!),
  );
  // Insets are measured against this box, not the page, so a small
  // thumbnail keeps the same proportions as a large one.
  const art = src ? (
    <img
      key={src}
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailed((current) => [...current, src])}
      className="absolute inset-0 size-full object-cover"
    />
  ) : (
    <div className="absolute inset-0 bg-[linear-gradient(160deg,var(--color-accent),var(--color-muted))]" />
  );
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <div className="absolute inset-x-[10%] top-[10%] bottom-[12%] flex items-end justify-center">
        <div
          style={{
            aspectRatio: `${widthMm}/${heightMm}`,
            height: `${Math.max(0.28, Math.min(1, scale)) * 100}%`,
            backgroundColor: framed ? tone : undefined,
          }}
          className={cn(
            "relative max-w-full shadow-[0_6px_14px_-6px_rgb(0_0_0/0.35)]",
            framed && tone === "#f3f1ec" && "ring-1 ring-neutral-6-transparent",
            !framed && "bg-background ring-1 ring-neutral-6-transparent",
          )}
        >
          {framed ? (
            // Frame, then a white mat, then the artwork.
            <div className="absolute inset-[6%] bg-white">
              <div className="absolute inset-[11%] overflow-hidden">{art}</div>
            </div>
          ) : (
            art
          )}
        </div>
      </div>
    </div>
  );
}
