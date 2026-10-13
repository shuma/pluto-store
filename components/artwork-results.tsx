"use client";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, RotateCcw, ZoomIn } from "lucide-react";
import { PreviewViewer } from "./preview-viewer";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { post } from "@/lib/client-api";
import {
  generationQuery,
  type GenerationResult,
} from "@/lib/queries/generation";
import { LiveFrame } from "./live-frame";
import { WaitingGame, WaitingGameInvite } from "./waiting-game";
import type { RefineStatus } from "./refine-frame";

type Slot = NonNullable<GenerationResult["progress"]>[number];
// Shown until the first poll says how many artworks the round draws.
const PENDING: Slot[] = Array.from({ length: 3 }, () => ({
  url: null,
  step: 0,
  done: false,
}));
// The image model sends up to three drafts before the finished artwork, though
// it may send none. Until one comes the frame holds the customer's photo as a
// mid-level mosaic: recognisably theirs, plainly not the result. The coarsest
// level ("queued") is kept for the moment before even the photo is known.
const slotStatus = (slot: Slot, hasPhoto: boolean): RefineStatus =>
  slot.done
    ? "complete"
    : !slot.url && !hasPhoto
      ? "queued"
      : slot.step >= 3
        ? "refining"
        : "generating";
// Signed URLs are re-signed every few minutes; the path is the image itself.
const pathOf = (url: string) => url.split("?")[0];
// Each artwork keeps one name from its loading frame to its card, so the
// reveal morphs the frame into the card instead of swapping the layout.
const artName = (slot: number) => `artwork-${slot}`;
// Shared by the loading frames and the pick cards, which must line up exactly:
// a swipeable row on a phone with the next card peeking in, three columns on
// wider screens, each card a padded shell around a portrait image.
// A row that scrolls sideways clips above and below too, so it keeps room
// for the cards' outlines: the 2px ring of the chosen card and its focus
// outline.
const ROW =
  "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 py-1 select-none [scrollbar-width:none] sm:mx-auto sm:grid sm:max-w-4xl sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden";
const CARD = "relative w-[78%] shrink-0 snap-center sm:w-auto";
const SHELL = "block w-full rounded-2xl bg-background p-2";
// A short wait needs nothing; past this, a game is offered to pass the time.
const OFFER_GAME_AFTER = 8000;
const SLOT_LABELS = {
  queued: "Starting",
  generating: "Drawing",
  refining: "Finishing",
  complete: "Done",
};
export function ArtworkResults({
  sessionId,
  slug,
  maxRounds,
}: {
  sessionId: string;
  slug: string;
  maxRounds: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = generationQuery(sessionId);
  const { data: result, error } = useQuery(query);
  const [selected, setSelected] = useState("");
  const retry = useMutation({
    mutationFn: () => post("/api/generate", { sessionId }),
    onSuccess: () =>
      // Show the creating state at once; the poll picks it up from here.
      queryClient.setQueryData(query.queryKey, (previous) =>
        previous ? { ...previous, status: "generating" as const } : previous,
      ),
  });
  const choose = useMutation({
    mutationFn: () =>
      post("/api/artwork/select", { sessionId, artworkId: selected }),
    onSuccess: () =>
      router.push(`/${slug}/create/${sessionId}/poster?artwork=${selected}`),
  });
  // The button stays disabled through a successful selection because the route
  // change outlives the mutation.
  const busy = retry.isPending || choose.isPending || choose.isSuccess;
  const message =
    choose.error?.message ?? retry.error?.message ?? error?.message ?? "";
  const creating =
    !result || result.status === "generating" || result.status === "ready";
  const left = maxRounds - (result?.roundCount ?? 0);
  // What is on screen lags the data by one transition: a change between the
  // frames and the cards is committed inside startTransition, which is what
  // lets <ViewTransition> animate it. A visit that starts on finished
  // artworks shows them at once.
  const [shown, setShown] = useState(creating ? "frames" : "cards");
  const want = creating ? "frames" : "cards";
  const [offered, setOffered] = useState(false);
  const [playing, setPlaying] = useState(false);
  // A game in progress is never pulled away: the reveal waits until the
  // customer asks for it or closes the game.
  const held = playing && want === "cards";
  useEffect(() => {
    if (shown !== want && !held) startTransition(() => setShown(want));
  }, [shown, want, held]);
  useEffect(() => {
    if (!creating || offered) return;
    const timer = setTimeout(() => setOffered(true), OFFER_GAME_AFTER);
    return () => clearTimeout(timer);
  }, [creating, offered]);
  // Drafts are only sent while a round runs, so a held reveal keeps showing
  // the last ones seen rather than falling back to empty frames.
  const [lastProgress, setLastProgress] = useState(result?.progress);
  if (result?.progress && result.progress !== lastProgress)
    setLastProgress(result.progress);
  const frames =
    result?.progress ??
    (held && result?.status === "completed"
      ? lastProgress?.map((slot) => ({ ...slot, done: true }))
      : undefined) ??
    PENDING;
  // Which frame each finished artwork drew in, by image path, so its card
  // takes over that frame's name.
  const [slotByPath, setSlotByPath] = useState<Record<string, number>>({});
  const landed = (result?.progress ?? []).flatMap((slot, i) =>
    slot.done && slot.url && slotByPath[pathOf(slot.url)] !== i
      ? [[pathOf(slot.url), i] as const]
      : [],
  );
  if (landed.length)
    setSlotByPath({ ...slotByPath, ...Object.fromEntries(landed) });
  return (
    <div>
      {shown === "frames" || !result ? (
        <section>
          {/* The same heading, row and cards as the pick view, so the
              artworks resolve in the very frames they are then chosen from. */}
          <h1 className="mb-6 text-center text-2xl font-semibold sm:text-3xl">
            Creating your artwork
          </h1>
          <div className={ROW}>
            {frames.map((slot, i) => (
              <div key={i} className={CARD}>
                <ViewTransition name={artName(i)} share="morph" default="none">
                  <div className={cn(SHELL, "ring-1 ring-neutral-6-transparent")}>
                    <LiveFrame
                      src={slot.url ?? result?.photoUrl ?? null}
                      status={slotStatus(slot, Boolean(result?.photoUrl))}
                      alt={`Your artwork, version ${i + 1}, being drawn`}
                      // Wider than any card: the frame fills its card.
                      width={1000}
                      radius={14}
                      labels={SLOT_LABELS}
                      className=""
                    />
                  </div>
                </ViewTransition>
              </div>
            ))}
          </div>
          <div
            className={cn(
              "mx-auto mt-6 max-w-sm text-center",
              // Room for the game invitation floating below.
              offered && "pb-24",
            )}
          >
            <p className="text-sm text-pretty text-muted-foreground">
              This usually takes a minute or two. Keep this page open and your
              artworks will appear here.
            </p>
          </div>
          {offered && !playing && (
            <WaitingGameInvite onClick={() => setPlaying(true)} />
          )}
          <WaitingGame
            open={playing}
            onOpenChange={setPlaying}
            frames={frames}
            photoUrl={result?.photoUrl}
            ready={held}
          />
        </section>
      ) : (
        <>
          <h1 className="mb-6 text-center text-2xl font-semibold sm:text-3xl">
            Pick your favourite
          </h1>
          {result.status === "failed" && (
            <p
              role="alert"
              className="mx-auto mb-4 max-w-sm rounded-xl bg-warning-transparent text-neutral-10 px-4 py-3 text-center text-sm"
            >
              We couldn’t create your artwork this time.
              {result.artworks.length > 0
                ? " You can still choose one below."
                : " Please try again."}
            </p>
          )}
          <ArtworkRow
            artworks={result.artworks}
            slotByPath={slotByPath}
            selected={selected}
            onSelect={setSelected}
          />
          {/* Held at the bottom of a phone screen, so the next step is always
              a thumb away while the customer swipes. */}
          <div className="sticky bottom-0 -mx-4 mt-6 bg-gradient-to-t from-paper from-70% to-transparent px-4 pt-6 pb-[max(env(safe-area-inset-bottom),1rem)] sm:static sm:mx-auto sm:max-w-sm sm:bg-none sm:px-0">
            {/* Only offered once there is something to continue with: a
                disabled button would be the heaviest thing on the page. */}
            {selected && (
              <Button
                size="lg"
                className="h-13 w-full rounded-2xl text-base transition-[opacity,translate] starting:translate-y-2 starting:opacity-0 motion-large"
                onClick={() => choose.mutate()}
                disabled={busy}
              >
                {choose.isPending || choose.isSuccess
                  ? "One moment…"
                  : "Continue with this one"}
                {!busy && <ArrowRight aria-hidden />}
              </Button>
            )}
            {left > 0 ? (
              <Button
                variant="ghost"
                className={cn(
                  "h-11 w-full rounded-2xl text-muted-foreground",
                  selected && "mt-1",
                )}
                onClick={() => retry.mutate()}
                disabled={busy}
              >
                <RotateCcw aria-hidden />
                Not quite? Make new versions · {left}{" "}
                {left === 1 ? "try" : "tries"} left
              </Button>
            ) : (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                You’ve used all your new versions for this photo.
              </p>
            )}
          </div>
        </>
      )}
      {message && (
        <p role="alert" className="mt-4 text-center text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

// A swipeable row on a phone, with the next artwork peeking in and dots
// showing where you are; a plain grid on wider screens. Tapping an artwork
// opens it large, where it can be chosen too. Touch scrolls
// natively. A mouse can drag the row too (desktop browsers don't scroll a
// row by dragging), and a drag never counts as choosing an artwork.
function ArtworkRow({
  artworks,
  slotByPath,
  selected,
  onSelect,
}: {
  artworks: { id: string; url: string }[];
  slotByPath: Record<string, number>;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [active, setActive] = useState(0),
    [viewing, setViewing] = useState<string | null>(null);
  // An artwork whose frame was never seen finished (the round ended between
  // polls) takes a frame nobody claimed. Only for a single round's worth:
  // earlier rounds' artworks never had frames on this screen.
  const free = [0, 1, 2].filter((n) => !Object.values(slotByPath).includes(n));
  const nameOf = (url: string) => {
    const slot = slotByPath[pathOf(url)];
    if (slot !== undefined) return artName(slot);
    if (artworks.length > 3) return undefined;
    const next = free.shift();
    return next === undefined ? undefined : artName(next);
  };
  const cardAt = (i: number) =>
    row.current?.children[i] as HTMLElement | undefined;
  const scrollTo = (i: number) => {
    const el = row.current,
      card = cardAt(i);
    if (!el || !card) return;
    el.scrollTo({
      left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2,
      behavior: "smooth",
    });
  };
  // The card nearest the middle of the row.
  const nearest = () => {
    const el = row.current;
    if (!el) return 0;
    const middle = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    artworks.forEach((_, i) => {
      const card = cardAt(i),
        bestCard = cardAt(best);
      if (!card || !bestCard) return;
      const d = (c: HTMLElement) =>
        Math.abs(c.offsetLeft + c.offsetWidth / 2 - middle);
      if (d(card) < d(bestCard)) best = i;
    });
    return best;
  };
  return (
    <>
      <div
        ref={row}
        role="radiogroup"
        aria-label="Your artworks"
        onScroll={() => setActive(nearest())}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !row.current) return;
          drag.current = {
            x: e.clientX,
            left: row.current.scrollLeft,
            moved: false,
          };
        }}
        onPointerMove={(e) => {
          const d = drag.current,
            el = row.current;
          if (!d || !el) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) < 6) return;
          d.moved = true;
          // Snapping fights a drag, so it waits until the drag ends.
          el.style.scrollSnapType = "none";
          el.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => {
          const d = drag.current;
          drag.current = null;
          if (!d?.moved || !row.current) return;
          // Cleared after the click that follows, or if none does.
          setTimeout(() => delete row.current?.dataset.dragged);
          row.current.style.scrollSnapType = "";
          scrollTo(nearest());
        }}
        onPointerLeave={() => {
          if (drag.current?.moved && row.current) {
            row.current.style.scrollSnapType = "";
            scrollTo(nearest());
          }
          drag.current = null;
        }}
        // A drag ends with a click on whatever is under the pointer; that
        // click is swallowed so dragging never changes the choice.
        onClickCapture={(e) => {
          if (row.current?.dataset.dragged) {
            e.stopPropagation();
            delete row.current.dataset.dragged;
          }
        }}
        onPointerUpCapture={() => {
          if (drag.current?.moved && row.current)
            row.current.dataset.dragged = "1";
        }}
        className={ROW}
      >
        {artworks.map((a, i) => {
          const on = selected === a.id;
          return (
            // The whole card is the choice; the corner button opens it large.
            <div key={a.id} className={cn("group/card", CARD)}>
              {/* The whole card morphs, frame and all, so no empty card
                  outline shows while the artwork grows into it. */}
              <ViewTransition name={nameOf(a.url)} share="morph" default="none">
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`Version ${i + 1}`}
                  onClick={() => {
                    onSelect(a.id);
                    scrollTo(i);
                  }}
                  className={cn(
                    SHELL,
                    "cursor-pointer transition-shadow focus-ring focus-visible:outline-offset-2",
                    on
                      ? "ring-2 ring-foreground"
                      : "ring-1 ring-neutral-6-transparent hover:ring-neutral-6",
                  )}
                >
                  <img
                    src={a.url}
                    alt={`Your artwork, version ${i + 1}`}
                    draggable={false}
                    className="aspect-[.707] w-full rounded-xl bg-muted object-cover"
                  />
                </button>
              </ViewTransition>
              <button
                type="button"
                onClick={() => setViewing(a.id)}
                aria-label={`View version ${i + 1} larger`}
                // Shown on hover where there is one; always there on touch.
                className="absolute top-3.5 right-3.5 grid size-8 cursor-pointer place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-opacity focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100"
              >
                <ZoomIn className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
      <PreviewViewer
        items={artworks}
        openId={viewing}
        onOpenChange={(id) => {
          setViewing(id);
          // Paging in the viewer brings that card into view behind it.
          const i = artworks.findIndex((a) => a.id === id);
          if (i >= 0) scrollTo(i);
        }}
        label="Artwork"
        actions={(item) => {
          const on = selected === item.id;
          return (
            <button
              type="button"
              onClick={() => {
                onSelect(item.id);
                setViewing(null);
              }}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-full px-4 text-sm font-medium transition-colors active:scale-95",
                on
                  ? "bg-white/20 text-white"
                  : "bg-white text-black hover:bg-white/90",
              )}
            >
              <Check className="size-4" strokeWidth={3} />
              {on ? "Chosen" : "Choose this one"}
            </button>
          );
        }}
      />
      {artworks.length > 1 && (
        <div className="mt-3 flex justify-center gap-1 sm:hidden" aria-hidden>
          {artworks.map((a, i) => (
            <button
              key={a.id}
              type="button"
              tabIndex={-1}
              onClick={() => scrollTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === active ? "w-5 bg-foreground" : "w-1.5 bg-neutral-5",
              )}
            />
          ))}
        </div>
      )}
    </>
  );
}
