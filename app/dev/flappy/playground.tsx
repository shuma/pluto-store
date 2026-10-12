"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { WaitingGame, WaitingGameInvite } from "@/components/waiting-game";

// The results page's wait, without a generation: placeholder frames, the
// invitation after the same delay, and the game. Frames finish one at a time
// from the controls, and the game is told the artworks are ready once all
// three have.
const OFFER_AFTER = 8000;

export function FlappyPlayground() {
  const [offered, setOffered] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(0);
  const frames = [0, 1, 2].map((i) => ({ url: null, done: i < done }));
  useEffect(() => {
    if (offered) return;
    const timer = setTimeout(() => setOffered(true), OFFER_AFTER);
    return () => clearTimeout(timer);
  }, [offered]);
  const controls = (
    <div className="flex flex-wrap justify-center gap-2 pt-3">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setDone((d) => Math.min(d + 1, 3))}
      >
        Finish one artwork ({done}/3)
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setDone(0)}>
        Reset artworks
      </Button>
    </div>
  );
  return (
    <main data-page-surface="paper" className="min-h-dvh bg-paper px-4 pt-8 pb-32">
      <h1 className="mb-6 text-center text-2xl font-semibold">
        Creating your artwork
      </h1>
      <div className="mx-auto grid max-w-4xl grid-cols-3 gap-3">
        {frames.map((frame, i) => (
          <div
            key={i}
            className="rounded-2xl bg-background p-2 ring-1 ring-neutral-6-transparent"
          >
            <div
              className={
                frame.done
                  ? "aspect-[.707] rounded-xl bg-muted"
                  : "aspect-[.707] animate-pulse-fast rounded-xl bg-muted"
              }
            />
          </div>
        ))}
      </div>
      <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-2 text-center text-sm text-muted-foreground">
        <p>Dev playground: the invitation appears after 8s, as on checkout.</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setOffered(true)}>
            Show invite now
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOffered(false)}>
            Replay invite
          </Button>
        </div>
        {controls}
      </div>
      {offered && !open && <WaitingGameInvite onClick={() => setOpen(true)} />}
      <WaitingGame
        open={open}
        onOpenChange={setOpen}
        frames={frames}
        ready={done === 3}
      >
        {controls}
      </WaitingGame>
    </main>
  );
}
