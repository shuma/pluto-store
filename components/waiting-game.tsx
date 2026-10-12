"use client";
import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ArrowRight, Bird, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogOverlay, DialogPortal, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { BIRD, FlappyGame } from "./flappy-game";

type Frame = { url: string | null; done: boolean };

// A game to pass a long wait, over the page that is waiting. The artworks
// stay in sight as a strip along the top, and the moment they are ready the
// game pauses to say so. Full screen on a phone, so the board is as big as
// the hand holding it; a card on wider screens.
export function WaitingGame({
  open,
  onOpenChange,
  frames,
  photoUrl,
  ready,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frames: Frame[];
  photoUrl?: string;
  ready: boolean;
  // Extra controls inside the dialog (the dev playground's); the dialog
  // blocks everything outside it.
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="hidden bg-black/50 sm:block motion-large" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // The board takes focus itself.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed inset-0 z-50 flex flex-col bg-paper pt-[env(safe-area-inset-top)] pb-[max(env(safe-area-inset-bottom),1.25rem)] outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-6 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-6 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[30rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-4xl sm:pb-6 sm:shadow-2xl sm:ring-1 sm:ring-neutral-6-transparent sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95 motion-large"
        >
          <DialogTitle className="sr-only">Flappy Bird</DialogTitle>
          <GameBody
            frames={frames}
            photoUrl={photoUrl}
            ready={ready}
            onDone={() => onOpenChange(false)}
          />
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

// The invitation. Floats at the bottom of the screen: the frames fill a
// phone, so anything placed after them would be out of sight. The bird is
// the game's own, bobbing as it does on the start screen, and the line under
// the title answers the worry about looking away: the game says when the
// artworks are ready.
export function WaitingGameInvite({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),1rem)] z-40 mx-auto flex w-fit cursor-pointer items-center gap-3 rounded-full surface-raised bg-primary py-2 pr-5 pl-2 text-left text-primary-foreground shadow-[inset_0_0_0_var(--border-s)_var(--neutral-6-transparent),var(--raised-bevel),var(--shadow-l)] transition-[opacity,translate,scale,box-shadow] focus-ring hover:shadow-[inset_0_0_0_var(--border-s)_var(--neutral-7-transparent),var(--raised-bevel),var(--shadow-l)] active:scale-[.97] starting:translate-y-8 starting:opacity-0 motion-large"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-foreground/10">
        <InviteBird className="w-9 translate-x-0.5 motion-safe:animate-[bird-bob_1.6s_ease-in-out_infinite]" />
      </span>
      <span>
        <span className="block text-sm font-semibold">Play Flappy Bird</span>
        <span className="block text-xs text-primary-foreground/70">
          We’ll tell you when your artworks are ready
        </span>
      </span>
      <ArrowRight
        className="ml-1 size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-small"
        aria-hidden
      />
    </button>
  );
}

// The game's bird (drawBird in flappy-game) at rest, as a small drawing.
function InviteBird({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-13 -12 32 24"
      className={className}
      aria-hidden
      stroke={BIRD.ink}
      strokeWidth={1.4}
      strokeLinejoin="round"
    >
      <clipPath id="invite-bird-body">
        <ellipse rx={11.5} ry={10} />
      </clipPath>
      <ellipse rx={11.5} ry={10} fill={BIRD.body} stroke="none" />
      <ellipse
        cx={0.5}
        cy={5.5}
        rx={8}
        ry={5}
        fill={BIRD.belly}
        stroke="none"
        clipPath="url(#invite-bird-body)"
      />
      <ellipse rx={11.5} ry={10} fill="none" />
      <path d="M8 -1.2 Q17.5 0.5 8 4 Z" fill={BIRD.beak} />
      <circle cx={4.2} cy={-3.2} r={3.6} fill="#fff" />
      <circle cx={5.5} cy={-3} r={1.5} fill={BIRD.ink} stroke="none" />
      <g className="origin-[64%_50%] [transform-box:fill-box] motion-safe:animate-[bird-flap_0.4s_ease-in-out_infinite_alternate]">
        <ellipse cx={-4.5} cy={0.5} rx={5.5} ry={3.2} fill={BIRD.wing} />
      </g>
    </svg>
  );
}

const BEST_KEY = "pluto:flappy:best";
function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

// Mounted only while open, so the best score is read on the device.
function GameBody({
  frames,
  photoUrl,
  ready,
  onDone,
}: {
  frames: Frame[];
  photoUrl?: string;
  ready: boolean;
  onDone: () => void;
}) {
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  // "Keep playing" lets a run in progress finish after the artworks land.
  const [keepPlaying, setKeepPlaying] = useState(false);
  const finished = frames.filter((f) => f.done).length;
  return (
    <>
      {/* The artworks, always in view. */}
      <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:pt-6">
        <div className="flex shrink-0 -space-x-2">
          {frames.map((frame, i) => {
            const src = frame.url ?? photoUrl;
            const done = ready || frame.done;
            return (
              <span
                key={i}
                className="relative h-11 w-8 overflow-hidden rounded-md bg-muted ring-2 ring-paper"
                style={{ rotate: `${(i - 1) * 5}deg` }}
              >
                {src && (
                  <img
                    src={src}
                    alt=""
                    className={cn(
                      "size-full object-cover transition-[filter,scale] motion-large",
                      !done && "scale-110 blur-[2px]",
                    )}
                  />
                )}
                {!done && (
                  <span className="absolute inset-0 animate-pulse-fast bg-paper/50" />
                )}
              </span>
            );
          })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {ready ? "Your artworks are ready" : "Drawing your artworks…"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ready
              ? "Finish your game or see them now"
              : `${finished} of ${frames.length} done · we’ll pause the game when they’re ready`}
          </p>
        </div>
        {ready ? (
          <Button
            size="sm"
            className="h-9 shrink-0 rounded-full px-4 transition-[opacity,scale] starting:scale-90 starting:opacity-0 motion-large"
            onClick={onDone}
          >
            See them
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <DialogPrimitive.Close
            aria-label="Back to your artworks"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-neutral-3 text-muted-foreground transition-colors hover:bg-neutral-4 hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6">
        {/* As big as fits: the width, or the height left after the strip,
            the scores and the hint. */}
        <div className="w-full max-w-[min(100%,calc(100dvh-12rem))]">
          <div className="mb-2 flex items-center justify-between px-1 text-base font-semibold tabular-nums">
            <span className="flex items-center gap-1">
              <Bird
                className="size-[1.1em] fill-warning text-foreground"
                aria-hidden
              />
              <span
                key={score}
                aria-label={`Score ${score}`}
                className="inline-block animate-in zoom-in-150 motion-large"
              >
                {score}
              </span>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Trophy className="size-[1.05em] text-warning" aria-hidden />
              <span aria-label={`Best ${best}`}>{best}</span>
            </span>
          </div>
          <FlappyGame
            best={best}
            paused={ready && !keepPlaying}
            heldOverlay={
              <>
                <p className="text-2xl">✨</p>
                <p className="mt-1 font-semibold">Your artworks are ready</p>
                <div className="mt-4 flex flex-col gap-2">
                  <Button className="h-10 rounded-full px-6" onClick={onDone}>
                    See them
                    <ArrowRight aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 rounded-full text-muted-foreground"
                    onClick={() => setKeepPlaying(true)}
                  >
                    Finish this game
                  </Button>
                </div>
              </>
            }
            onScore={(next) => {
              setScore(next);
              if (next <= best) return;
              setBest(next);
              try {
                localStorage.setItem(BEST_KEY, String(next));
              } catch {}
            }}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <span className="[@media(hover:hover)]:hidden">
              Tap anywhere on the board to flap
            </span>
            <span className="hidden [@media(hover:hover)]:inline">
              Space, ↑ or W to flap · P to pause
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
