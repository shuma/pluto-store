"use client";
import { useEffect } from "react";
import { Button } from "./ui/button";

// What every waiting game shares: the cards laid over its board, and the
// rule that looking away pauses it. Each game keeps its own board and loop.

export type GamePhase = "ready" | "running" | "paused" | "over";

// The props every game takes from the waiting dialog.
export type GameProps = {
  // Held from outside (the artworks are ready); the loop stops and
  // heldOverlay shows until it is released.
  paused: boolean;
  heldOverlay?: React.ReactNode;
  best: number;
  onScore: (score: number) => void;
};

export const BOARD =
  "relative aspect-square w-full touch-none overflow-hidden rounded-2xl bg-background ring-1 ring-neutral-6-transparent outline-none select-none";

const CARD =
  "rounded-2xl bg-background/90 px-6 py-6 text-center shadow-xl ring-1 ring-neutral-6-transparent backdrop-blur-md";

// Buttons in a card are taps on the card, not on the board behind it.
const own = {
  onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  onPointerUp: (e: React.PointerEvent) => e.stopPropagation(),
};

export const buzz = (ms: number) => navigator.vibrate?.(ms);

export function BoardOverlay({
  phase,
  held,
  heldOverlay,
  howTo,
  result,
  unit,
  onAgain,
}: {
  phase: GamePhase;
  held: boolean;
  heldOverlay?: React.ReactNode;
  howTo: React.ReactNode;
  result: { score: number; newBest: boolean };
  unit: [one: string, many: string];
  onAgain: () => void;
}) {
  if (held && heldOverlay)
    return (
      <div className="absolute inset-0 grid place-items-center bg-background/30 p-4 backdrop-blur-[3px] transition-opacity starting:opacity-0 motion-large">
        <div
          {...own}
          className={`${CARD} transition-[opacity,scale] motion-large starting:scale-95 starting:opacity-0`}
        >
          {heldOverlay}
        </div>
      </div>
    );
  if (phase === "ready")
    return (
      <div className="pointer-events-none absolute inset-0 grid place-items-center p-4">
        <div className={`${CARD} w-60 px-6`}>{howTo}</div>
      </div>
    );
  if (phase === "paused")
    return (
      <div className="pointer-events-none absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-[2px]">
        <p className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
          Paused · Tap to carry on
        </p>
      </div>
    );
  if (phase === "over")
    return (
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          {...own}
          // Waits for the crash to play out before it comes in.
          className={`${CARD} transition-[opacity,scale,translate] delay-300 motion-large starting:translate-y-3 starting:scale-95 starting:opacity-0`}
        >
          {result.newBest && (
            <p className="mb-1 text-xs font-semibold tracking-wide text-warning uppercase">
              New best
            </p>
          )}
          <p className="text-5xl font-semibold tabular-nums">
            {result.score}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.score === 1 ? unit[0] : unit[1]}
          </p>
          <Button className="mt-4 h-10 rounded-full px-6" onClick={onAgain}>
            Play again
          </Button>
        </div>
      </div>
    );
  return null;
}

// Looking away pauses: another tab, another app, focus leaving the page.
export function usePauseWhenAway(away: () => void) {
  useEffect(() => {
    const onVisibility = () => document.hidden && away();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", away);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", away);
    };
    // Set up once; away reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// The backing store follows the box and pixel ratio, so a board is crisp at
// any size.
export function fitCanvas(el: HTMLCanvasElement) {
  const observer = new ResizeObserver(([entry]) => {
    el.width = el.height = Math.round(
      entry.contentRect.width * devicePixelRatio,
    );
  });
  observer.observe(el);
  return () => observer.disconnect();
}
