"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ImageUp,
  Loader2,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PANEL_INSET, PanelSection } from "@/components/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewViewer } from "@/components/preview-viewer";
import type { RefineStatus } from "@/components/refine-frame";
import { LiveFrame } from "@/components/live-frame";
import { post } from "@/lib/client-api";
import { uploadCreatorAsset } from "@/lib/client-upload";
import {
  stylePreviewQuery,
  type PreviewCard,
  type StylePreview as Preview,
} from "@/lib/queries/style-preview";
// Every card, filled or empty, shares this box so the row never shifts as
// cards run, resolve or are added.
// Compact, so the results sit under the board without crowding it; the
// full-size viewer is where a preview is looked at closely.
const TILE = "w-40 sm:w-48";
const TILE_PX = 192;
const DEFAULT_SAMPLE = "/demo/sample-photo.svg";
const del = async (url: string, body?: unknown) => {
  const response = await fetch(url, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const next = await response.json();
  if (!response.ok)
    throw new Error(next.error ?? "Something went wrong. Please try again.");
  return next as Preview;
};
// The frame follows the run as the server reports it: queued until the inputs
// are gathered, generating while the image model works, refining while the
// result is sized and stored. A click shows as queued before the server has
// even answered. Null is a card that has never run: it shows an empty slot.
function frameStatus(card: PreviewCard, queued: boolean): RefineStatus | null {
  if (queued) return "queued";
  if (card.status === "running") return card.stage ?? "queued";
  if (card.status === "failed") return "error";
  return card.url ? "complete" : null;
}
// Signed URLs are re-signed every few minutes; the path is the image itself.
const pathOf = (url: string) => url.split("?")[0];
const WORKING = new Set<RefineStatus>(["queued", "generating", "refining"]);
// The refine effect is for watching a run, not for every visit. A card that
// is already settled when the section appears loads like the board's images:
// a skeleton, then a quiet fade. Only once a card starts working while it is
// on screen does it hand over to RefineFrame, and it keeps it from then on so
// the result can resolve in when it lands.
function CardFrame({
  src,
  status,
  alt,
  retry,
}: {
  src: string;
  status: RefineStatus;
  alt: string;
  // Null when there is no preview left today to retry with.
  retry: (() => void) | null;
}) {
  const [watched, setWatched] = useState(WORKING.has(status));
  if (WORKING.has(status) && !watched) setWatched(true);
  if (status === "error") return <FailedFrame src={src} retry={retry} />;
  return watched ? (
    <LiveFrame src={src} status={status} alt={alt} width={TILE_PX} />
  ) : (
    <SettledFrame src={src} alt={alt} />
  );
}
// A failed run shows the photo that went in, so it reads as "this one did not
// come out" rather than as an image that failed to load, with the way forward
// on top of it. Out of previews, it says so instead of offering a retry that
// could only be refused.
function FailedFrame({
  src,
  retry,
}: {
  src: string;
  retry: (() => void) | null;
}) {
  return (
    <div className="relative aspect-[.707] w-full overflow-hidden rounded-2xl bg-paper-shell shadow-sm ring-1 ring-neutral-6-transparent">
      <img
        src={src}
        alt="The sample that did not finish"
        className="size-full object-cover opacity-45 saturate-50"
      />
      <div className="absolute inset-0 grid place-items-center p-3">
        <div className="flex flex-col items-center gap-2 rounded-xl bg-background/85 px-3 py-3 text-center shadow-sm ring-1 ring-neutral-6-transparent backdrop-blur-md">
          <p className="text-xs font-medium">This one didn’t finish</p>
          {retry ? (
            <Button size="sm" variant="outline" onClick={retry}>
              <RotateCw data-icon="inline-start" />
              Try again
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">No tries left today</p>
          )}
        </div>
      </div>
    </div>
  );
}
// Same treatment as the reference board: the skeleton holds the tile until the
// image can paint, then the image fades in over it.
function SettledFrame({ src, alt }: { src: string; alt: string }) {
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const settle = () => setLoadedPath(pathOf(src));
  const ready = loadedPath === pathOf(src);
  return (
    <div className="relative aspect-[.707] w-full">
      {!ready && (
        <Skeleton className="absolute inset-0 rounded-2xl bg-neutral-3 shadow-sm ring-1 ring-neutral-6-transparent" />
      )}
      <img
        src={src}
        alt={alt}
        ref={(node) => {
          // A cached image can finish before React attaches onLoad, and that
          // load event is gone for good: check on mount instead.
          if (node?.complete) settle();
        }}
        onLoad={settle}
        // An expired or broken signed URL must not leave the card under a
        // skeleton for good.
        onError={settle}
        className={cn(
          "size-full rounded-2xl object-cover shadow-sm ring-1 ring-neutral-6-transparent transition-opacity motion-large",
          !ready && "opacity-0",
        )}
      />
    </div>
  );
}
export function StylePreview() {
  const query = stylePreviewQuery();
  const { data, error } = useQuery(query);
  const queryClient = useQueryClient();
  const settle = (next: Preview) =>
    queryClient.setQueryData(query.queryKey, next);
  // No id runs every card; an id runs just that one.
  const run = useMutation({
    mutationFn: (id?: string) =>
      post<Preview>("/api/creator/preview", id ? { id } : {}),
    onSuccess: settle,
  });
  const input = useRef<HTMLInputElement | null>(null);
  // Which card the file picker is choosing for; undefined adds a new card.
  const target = useRef<string | undefined>(undefined);
  // Replacing a card's sample only swaps its input; running it is still an
  // explicit, rate-limited click, and the card reads as out of date until
  // then. A new card was added to be tried, so it runs straight away.
  const upload = useMutation({
    mutationFn: ({ file, id }: { file: File; id?: string }) =>
      uploadCreatorAsset("sample", file, id),
    onSuccess: async ({ previewId }, { id }) => {
      await queryClient.invalidateQueries(query);
      if (!id && previewId) {
        run.mutate(previewId);
        // The new card lands at the end of the rail, which may be scrolled
        // elsewhere; bring it into view so the run can be watched.
        requestAnimationFrame(() =>
          rail.current?.scrollTo({
            left: rail.current.scrollWidth,
            behavior: "smooth",
          }),
        );
      }
    },
  });
  const reset = useMutation({
    mutationFn: (id: string) => del("/api/creator/preview/sample", { id }),
    onSuccess: settle,
  });
  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/creator/preview/${id}`),
    onSuccess: settle,
  });
  // Removal is deferred rather than undone, as on the board: the card and its
  // files are only deleted once the undo window closes, and leaving the page
  // inside that window deletes straight away.
  const [removing, setRemoving] = useState<string[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const scheduled = timers.current;
    return () => {
      scheduled.forEach((timer, id) => {
        clearTimeout(timer);
        void fetch(`/api/creator/preview/${id}`, {
          method: "DELETE",
          keepalive: true,
        });
      });
      scheduled.clear();
    };
  }, []);
  const restore = (id: string) =>
    setRemoving((current) => current.filter((i) => i !== id));
  function removeCard(id: string) {
    setRemoving((current) => [...current, id]);
    timers.current.set(
      id,
      setTimeout(() => {
        timers.current.delete(id);
        remove.mutate(id, { onSettled: () => restore(id) });
      }, 6000),
    );
    toast("Sample removed", {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timers.current.get(id));
          timers.current.delete(id);
          restore(id);
        },
      },
    });
  }
  const all = data?.cards ?? [];
  const cards = all.filter((c) => !removing.includes(c.id));
  // Like the board, only what arrives while the section is open animates in;
  // the cards and add tile that were there on arrival just appear.
  const [present] = useState(
    () =>
      new Set([
        ...all.map((c) => c.id),
        all.length < (data?.maxCards ?? 0) ? "add" : "",
      ]),
  );
  const enter = (id: string) =>
    !present.has(id) &&
    "animate-in fade-in zoom-in-95 slide-in-from-bottom-2 fill-mode-both motion-large";
  const running = cards.some((c) => c.status === "running") || run.isPending;
  const adding = upload.isPending && !upload.variables?.id;
  const swapping =
    (upload.isPending && !adding) || reset.isPending || remove.isPending;
  const busy = (id: string) =>
    (upload.isPending && upload.variables?.id === id) ||
    (reset.isPending && reset.variables === id);
  const empty = data?.referenceCount === 0;
  const ran = cards.some((c) => c.url);
  const budget = data?.budget;
  const spent = budget?.remaining === 0;
  // What "refresh all" will spend: every card not already running.
  const cost = cards.filter((c) => c.status !== "running").length;
  const resetsAt = budget?.resetsAt
    ? new Date(budget.resetsAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const message =
    // Out of previews, the refusal is already said plainly below; it is not
    // an error to show in red.
    (spent ? null : run.error?.message) ??
    upload.error?.message ??
    reset.error?.message ??
    remove.error?.message ??
    error?.message ??
    "";
  // Only finished previews open full size; one that starts running again while
  // open drops out of the list, which closes the viewer.
  const [viewing, setViewing] = useState<string | null>(null);
  const viewable = cards.flatMap((c, i) =>
    c.url &&
    c.status === "ready" &&
    !(run.isPending && (run.variables === undefined || run.variables === c.id))
      ? [
          {
            id: c.id,
            url: c.url,
            sampleUrl: c.sampleUrl ?? DEFAULT_SAMPLE,
            stale: c.stale,
            download: {
              href: `/api/creator/preview/${c.id}`,
              filename: `style-preview-${i + 1}.png`,
            },
          },
        ]
      : [],
  );
  const pick = (id?: string) => {
    target.current = id;
    input.current?.click();
  };
  // The rail scrolls sideways once the cards outgrow the panel; the arrows
  // and edge fades only appear on a side that has more to show.
  const rail = useRef<HTMLUListElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const measure = () => {
    const el = rail.current;
    if (!el) return;
    const start = el.scrollLeft > 4;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setEdges((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  };
  const count = cards.length;
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    // Fires once on observe, and again whenever the rail or a card resizes.
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, [count]);
  const page = (direction: 1 | -1) => {
    const el = rail.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    el.scrollBy({
      left: direction * (card.offsetWidth + 24),
      behavior: "smooth",
    });
  };
  const caption = (
    <p
      role={message ? "alert" : undefined}
      className={cn(
        "text-xs",
        message ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {message ||
        (empty
          ? "Put at least one image in use to preview your style."
          : running
            ? "This takes a few minutes. You can leave this page and come back."
            : spent
              ? `You’ve used today’s ${budget?.limit} tries.${resetsAt ? ` More from ${resetsAt}.` : ""}`
              : swapping || adding
                ? "Updating your samples…"
                : cards.some((c) => c.stale)
                  ? "Previews marked out of date were made before your latest board or sample changes. Refresh one from its card, or all of them at once."
                  : "Each photo is redrawn with the references in use. Tap a thumbnail to swap the photo.")}
    </p>
  );
  return (
    // A section of the board's own panel: what the board above produces. The
    // top margin is the only separation from the canvas, so it has to be
    // generous enough to read as a new part of the panel.
    <div className="mt-4 sm:mt-6">
      <PanelSection
        title="Try your style"
        actions={
          <>
            {budget && !empty && (
              <span
                className="text-xs text-muted-foreground tabular-nums"
                // The reset time is formatted in the viewer's own timezone.
                suppressHydrationWarning
              >
                {spent
                  ? resetsAt
                    ? `Resets at ${resetsAt}`
                    : "None left today"
                  : `${budget.remaining} of ${budget.limit} tries left today`}
              </span>
            )}
            <Button
              variant="outline"
              disabled={running || empty || swapping || adding || spent}
              onClick={() => run.mutate(undefined)}
            >
              <Sparkles data-icon="inline-start" />
              {running
                ? "Making samples…"
                : spent
                  ? "No tries left"
                  : ran
                    ? "Refresh all"
                    : "Preview my style"}
              {/* What the click will spend, where the click is. */}
              {!running && !spent && ran && (
                <span
                  aria-label={`uses ${Math.min(cost, budget?.remaining ?? cost)} previews`}
                  className="-mr-1 ml-1 rounded-md bg-muted px-2 py-1 text-2xs leading-none text-muted-foreground tabular-nums"
                >
                  {Math.min(cost, budget?.remaining ?? cost)}
                </span>
              )}
            </Button>
          </>
        }
        footer={caption}
      >
        {/* Same frame and surface as the board above: this is the board, rendered. */}
        <div className={cn(PANEL_INSET, "relative")}>
          <ul
            ref={rail}
            onScroll={measure}
            aria-label="Style previews"
            className="flex snap-x snap-mandatory scroll-px-6 justify-center-safe gap-4 overflow-x-auto overscroll-x-contain p-6 [scrollbar-width:none] sm:scroll-px-10 sm:gap-6 sm:px-12 sm:py-8 [&::-webkit-scrollbar]:hidden"
          >
            {cards.map((card) => {
              const queued =
                run.isPending &&
                card.status !== "running" &&
                (run.variables === undefined || run.variables === card.id);
              const status = frameStatus(card, queued);
              const sample = card.sampleUrl ?? DEFAULT_SAMPLE;
              const locked = card.status === "running" || queued;
              // While it runs, the sample is what is being worked on; a failure
              // shows the sample too; otherwise the latest result.
              const shown =
                locked || !card.url || card.status === "failed"
                  ? sample
                  : card.url;
              const cardBusy = busy(card.id);
              // The first card always stays and can only go back to the
              // built-in sample; the ones added after it can be taken away.
              const first = card.id === all[0]?.id;
              const alt = locked
                ? "The sample being previewed"
                : "The sample image in your style";
              const frame = status ? (
                <CardFrame
                  src={shown}
                  status={status}
                  alt={alt}
                  retry={spent ? null : () => run.mutate(card.id)}
                />
              ) : (
                <div className="grid aspect-[.707] w-full place-items-center rounded-2xl border border-dashed border-neutral-5 p-6 text-center text-xs text-muted-foreground">
                  Nothing previewed yet
                </div>
              );
              return (
                <li
                  key={card.id}
                  className={cn(
                    "group/card relative shrink-0 snap-start",
                    enter(card.id),
                    TILE,
                  )}
                >
                  <figure className="relative">
                    {viewable.some((v) => v.id === card.id) ? (
                      <button
                        type="button"
                        onClick={() => setViewing(card.id)}
                        aria-label="View this preview full size"
                        className="group/view relative block w-full cursor-zoom-in rounded-2xl outline-offset-2"
                      >
                        {frame}
                        <span className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover/view:opacity-100 group-focus-visible/view:opacity-100 motion-small">
                          <span className="grid size-9 scale-90 place-items-center rounded-full bg-foreground/40 text-background backdrop-blur-sm transition-transform group-hover/view:scale-100 motion-small">
                            <ZoomIn className="size-4" />
                          </span>
                        </span>
                      </button>
                    ) : (
                      frame
                    )}
                    {card.stale && !locked && card.status === "ready" && (
                      <button
                        type="button"
                        disabled={spent}
                        onClick={() => run.mutate(card.id)}
                        aria-label={
                          spent
                            ? "Out of date"
                            : "Out of date. Refresh this preview"
                        }
                        className="group/stale absolute top-2 left-2 flex h-6 items-center gap-1 rounded-full bg-background/85 px-3 text-2xs font-medium text-foreground shadow-sm ring-1 ring-neutral-6-transparent backdrop-blur-md transition-[background-color,transform] hover:bg-background active:scale-95 disabled:pointer-events-none motion-small"
                      >
                        <RotateCw className="size-3 transition-transform group-hover/stale:rotate-180 group-disabled/stale:hidden motion-large" />
                        Out of date
                      </button>
                    )}
                    <div className="absolute right-2 bottom-2 w-[30%]">
                      <button
                        type="button"
                        disabled={locked || cardBusy}
                        onClick={() => pick(card.id)}
                        aria-label={
                          card.sampleUrl
                            ? "Change this sample photo"
                            : "Use your own sample photo"
                        }
                        className="group/sample relative block w-full overflow-hidden rounded-lg shadow-md ring-2 ring-background outline-offset-2 disabled:cursor-not-allowed"
                      >
                        <img
                          src={sample}
                          alt="The sample image"
                          className={cn(
                            "aspect-[.707] w-full object-cover transition-opacity",
                            cardBusy && "opacity-50",
                          )}
                        />
                        <span className="absolute inset-0 grid place-items-center bg-foreground/45 text-background opacity-0 transition-opacity group-hover/sample:opacity-100 group-focus-visible/sample:opacity-100 group-disabled/sample:hidden [@media(hover:none)]:hidden motion-small">
                          <ImageUp className="size-4" />
                        </span>
                      </button>
                      {first && card.sampleUrl && !cardBusy && !locked && (
                        <button
                          type="button"
                          onClick={() => reset.mutate(card.id)}
                          aria-label="Go back to the built-in sample"
                          className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background shadow-sm transition-colors hover:bg-foreground/80"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>
                  </figure>
                  {/* Deleting a card throws away a paid-for result, so it gets
                    its own glyph, unlike the thumbnail's reversible X. */}
                  {!first && !locked && !cardBusy && (
                    <button
                      type="button"
                      onClick={() => removeCard(card.id)}
                      aria-label="Remove this sample"
                      className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-background text-muted-foreground opacity-0 shadow-sm ring-1 ring-neutral-6-transparent transition-[opacity,transform,color] group-focus-within/card:opacity-100 group-hover/card:opacity-100 hover:text-destructive active:scale-90 [@media(hover:none)]:opacity-100 motion-small"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
            {data && all.length < data.maxCards && (
              <li className={cn("shrink-0 snap-start", enter("add"), TILE)}>
                <button
                  type="button"
                  disabled={adding || running || empty || spent}
                  onClick={() => pick()}
                  aria-label="Add another sample photo"
                  className="group/add grid aspect-[.707] w-full place-items-center rounded-2xl border border-dashed border-neutral-5 bg-neutral-2 text-muted-foreground outline-offset-2 transition-[border-color,background-color,color,transform] hover:border-neutral-6 hover:bg-neutral-3 hover:text-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:text-neutral-6 disabled:hover:border-neutral-5 disabled:hover:bg-neutral-2 disabled:hover:text-muted-foreground motion-small"
                >
                  <span className="flex flex-col items-center gap-2 px-4 text-center">
                    <span className="grid size-9 place-items-center rounded-full bg-background shadow-sm ring-1 ring-neutral-6-transparent transition-transform group-hover/add:scale-110 group-hover/add:rotate-90 group-disabled/add:scale-100 group-disabled/add:rotate-0 motion-large">
                      {adding ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Plus className="size-5" />
                      )}
                    </span>
                    <span className="text-xs font-medium">
                      {adding
                        ? "Adding your photo…"
                        : spent
                          ? "No tries left today"
                          : "Try another photo"}
                    </span>
                  </span>
                </button>
              </li>
            )}
          </ul>
          {(
            [
              ["start", -1, ChevronLeft, "left-0 bg-gradient-to-r", "left-3"],
              ["end", 1, ChevronRight, "right-0 bg-gradient-to-l", "right-3"],
            ] as const
          ).map(([edge, direction, Icon, fade, side]) => (
            <div key={edge} aria-hidden={!edges[edge]}>
              <div
                className={cn(
                  "pointer-events-none absolute inset-y-0 w-12 from-paper to-transparent transition-opacity motion-small",
                  fade,
                  edges[edge] ? "opacity-100" : "opacity-0",
                )}
              />
              <button
                type="button"
                tabIndex={edges[edge] ? 0 : -1}
                onClick={() => page(direction)}
                aria-label={
                  direction < 0 ? "Previous previews" : "More previews"
                }
                className={cn(
                  "absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background text-foreground shadow-md ring-1 ring-neutral-6-transparent transition-[opacity,transform] hover:scale-105 active:scale-95 motion-small",
                  side,
                  edges[edge]
                    ? "opacity-100"
                    : "pointer-events-none scale-90 opacity-0",
                )}
              >
                <Icon className="size-4" />
              </button>
            </div>
          ))}
          <PreviewViewer
            items={viewable}
            openId={viewing}
            onOpenChange={setViewing}
          />
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload.mutate({ file, id: target.current });
            }}
          />
        </div>
      </PanelSection>
    </div>
  );
}
