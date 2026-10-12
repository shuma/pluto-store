"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import DitherVeil from "./dither-veil";
// The Pluto mark: the dithered globe with its wandering reveal. Size it with
// className (e.g. "size-8", "size-28 sm:size-32"); the reveal radius and dot
// size are derived from the measured width, so the effect reads the same at
// any size. The veil canvas is opaque, so paperColor should match whatever the
// globe sits on; the rounded clip hides the corners outside the disc.
export function PlutoGlobe({
  className,
  inkColor = "#0a0a0a",
  paperColor = "#ffffff",
}: {
  className?: string;
  inkColor?: string;
  paperColor?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null),
    [width, setWidth] = useState(128);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn("shrink-0 overflow-hidden rounded-full", className)}
    >
      <DitherVeil
        src="/images/pluto-moon.png"
        fit="contain"
        pattern="floyd"
        // Two-pixel dots turn to mush below ~64px; drop to one.
        pixelSize={width < 64 ? 1 : 2}
        inkColor={inkColor}
        paperColor={paperColor}
        revealRadius={width * 0.375}
        softness={0.6}
        linger={1}
        wander
      />
    </div>
  );
}
