"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, PANEL_INSET } from "@/components/panel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { post } from "@/lib/client-api";
import { uploadCreatorAsset } from "@/lib/client-upload";
export type CanvasReference = {
  id: string;
  url: string;
  x: number | null;
  y: number | null;
  rotation: number;
  z: number;
  active: boolean;
  // Measured at upload. Null for rows that predate the measurement, which fall
  // back to the deterministic guess below.
  aspect: number | null;
};
// Cards vary in area, not in width: sizing by width alone made a 2:3 portrait
// three times the area of a 3:2 landscape, which read as a hierarchy nobody
// asked for.
const AREAS = [42000, 52000, 38000, 56000, 46000, 50000, 40000, 54000];
const RATIOS = [1, 0.72, 1.3, 1, 0.8, 1.25, 1, 0.75];
const GOLDEN = 0.6180339887;
// Stable per-id pseudo-randomness: the same board renders identically on the
// server and the client, so an unplaced image never jumps on hydration.
// Shifts must be unsigned: hash() fills all 32 bits, and a signed >> turns the
// top half negative, which indexes these tables out of bounds.
function hash(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
function shape(id: string, aspect?: number) {
  const h = hash(id);
  const area = AREAS[h % AREAS.length];
  const ratio = aspect ?? RATIOS[(h >>> 3) % RATIOS.length];
  return {
    width: Math.round(Math.sqrt(area * ratio)),
    height: Math.round(Math.sqrt(area / ratio)),
  };
}
// Scatter for images that have never been dragged. A golden-ratio walk spreads
// them across the full width instead of clustering on one diagonal, and the row
// alternates so the board fills top and bottom.
function placed(reference: CanvasReference, index: number) {
  const h = hash(reference.id);
  return {
    x: reference.x ?? (index * GOLDEN + ((h % 7) / 7) * 0.05) % 1,
    y: reference.y ?? (index % 2 === 0 ? 0.08 : 0.58) + ((h >>> 5) % 5) / 40,
    rotation:
      reference.x === null ? (((h >>> 9) % 9) - 4) * 0.9 : reference.rotation,
  };
}
const clamp = (v: number) => Math.min(1, Math.max(0, v));
export function ReferenceCanvas({
  references,
  max,
  children,
}: {
  references: CanvasReference[];
  max: number;
  // What the board produces, shown in the same shell below the canvas.
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const canvas = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState(() =>
    references.map((r, i) => ({ ...r, ...placed(r, i) })),
  );
  const [drag, setDrag] = useState<{
    id: string;
    dx: number;
    dy: number;
  } | null>(null);
  const [aspects, setAspects] = useState<Record<string, number>>({});
  // A card is only shown once its image is decoded: until then the box is a
  // guessed shape holding a signed URL that has not arrived yet.
  const [loaded, setLoaded] = useState<string[]>([]);
  const [entering, setEntering] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // Removal is deferred rather than undone: the row and the storage object are
  // only deleted once the undo window closes, so "undo" restores nothing
  // because nothing was destroyed yet.
  const [removing, setRemoving] = useState<string[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const scheduled = timers.current;
    return () => {
      scheduled.forEach((timer, id) => {
        clearTimeout(timer);
        void post("/api/creator/references", { id, action: "remove" });
      });
      scheduled.clear();
    };
  }, []);
  const signature = references.map((r) => r.id).join(",");
  const [synced, setSynced] = useState(signature);
  if (synced !== signature) {
    setSynced(signature);
    const current = new Map(items.map((i) => [i.id, i]));
    const next = references
      .filter((r) => !removing.includes(r.id))
      .map((r, index) => current.get(r.id) ?? { ...r, ...placed(r, index) });
    setItems(next);
    setEntering(next.filter((i) => !current.has(i.id)).map((i) => i.id));
  }
  const top = items.reduce((m, i) => Math.max(m, i.z), 0);
  // Only active images reach the model, and they reach it in board reading
  // order, so number those and leave the hidden ones unnumbered.
  const active = [...items]
    .filter((i) => i.active)
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
  const order = new Map(active.map((i, index) => [i.id, index + 1]));
  const hidden = items.length - active.length;
  function save(item: (typeof items)[number]) {
    void post("/api/creator/references", {
      id: item.id,
      action: "position",
      x: item.x,
      y: item.y,
      rotation: item.rotation,
      z: item.z,
    }).catch(() => setMessage("Could not save that position."));
  }
  // Reading order on the board is the order the references reach the model, so
  // any move rewrites sort_order for the whole set.
  function arrange(next: typeof items) {
    const order = [...next]
      .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
      .map((i) => i.id);
    void post("/api/creator/references", { action: "arrange", order })
      .then(() => router.refresh())
      .catch(() => setMessage("Could not save the order."));
  }
  function move(id: string, nextX: number, nextY: number) {
    let saved: (typeof items)[number] | undefined;
    let next: typeof items = [];
    setItems((current) => {
      next = current.map((i) => {
        if (i.id !== id) return i;
        saved = { ...i, x: clamp(nextX), y: clamp(nextY) };
        return saved;
      });
      return next;
    });
    if (saved) {
      save(saved);
      arrange(next);
    }
  }
  // Both the load event and the already-cached path go through here. Reading
  // the size only in onLoad left cached images on the stored or guessed ratio,
  // which cropped the artwork on every visit after the first.
  function settle(id: string, image?: HTMLImageElement) {
    setLoaded((current) => (current.includes(id) ? current : [...current, id]));
    const { naturalWidth = 0, naturalHeight = 0 } = image ?? {};
    if (!naturalWidth || !naturalHeight) return;
    setAspects((current) =>
      current[id]
        ? current
        : { ...current, [id]: naturalWidth / naturalHeight },
    );
  }
  function toggleActive(id: string, next: boolean) {
    setItems((current) =>
      current.map((i) => (i.id === id ? { ...i, active: next } : i)),
    );
    void post("/api/creator/references", {
      id,
      action: next ? "activate" : "deactivate",
    })
      .then(() => router.refresh())
      .catch(() => setMessage("Could not change that image."));
  }
  function remove(item: (typeof items)[number]) {
    setItems((current) => current.filter((i) => i.id !== item.id));
    setRemoving((current) => [...current, item.id]);
    timers.current.set(
      item.id,
      setTimeout(() => {
        timers.current.delete(item.id);
        void post("/api/creator/references", {
          id: item.id,
          action: "remove",
        })
          .then(() => {
            setRemoving((current) => current.filter((i) => i !== item.id));
            router.refresh();
          })
          .catch(() => setMessage("Could not remove that image."));
      }, 6000),
    );
    toast("Reference image removed", {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: () => {
          const timer = timers.current.get(item.id);
          if (timer) clearTimeout(timer);
          timers.current.delete(item.id);
          setRemoving((current) => current.filter((i) => i !== item.id));
          setItems((current) => [...current, item].sort((a, b) => a.z - b.z));
        },
      },
    });
  }
  return (
    <Panel
      title="Your style board"
      actions={
        <>
          <p className="text-sm tabular-nums text-muted-foreground">
            {active.length} of {max} references in use
            {hidden > 0 && ` · ${hidden} hidden`}
            {items.length >= max && " · hide or remove one to add another"}
          </p>
          <Button
            variant="outline"
            disabled={busy || items.length >= max}
            onClick={() => input.current?.click()}
          >
            <Plus data-icon="inline-start" />
            {busy ? "Adding…" : "Add a reference image"}
          </Button>
        </>
      }
    >
      <div
        ref={canvas}
        // `isolate` keeps the cards' stacking inside the board. Bringing a
        // card forward keeps raising its z-index, and without this a card
        // moved often enough rose above the full-screen preview viewer.
        className={cn(
          PANEL_INSET,
          "relative isolate aspect-[4/5] max-h-[38rem] min-h-[26rem] w-full p-6 sm:aspect-[16/9] sm:p-8",
        )}
        style={{
          backgroundImage:
            "radial-gradient(circle, color-mix(in oklch, var(--foreground) 14%, transparent) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          backgroundPosition: "14px 14px",
        }}
      >
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Add a reference image"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setMessage("");
            try {
              await uploadCreatorAsset("reference", file);
              router.refresh();
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Upload failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
        {items.map((item) => {
          const { width, height } = shape(
            item.id,
            aspects[item.id] ?? item.aspect ?? undefined,
          );
          const dragging = drag?.id === item.id;
          const ready = loaded.includes(item.id);
          const position = order.get(item.id);
          return (
            <div
              key={item.id}
              tabIndex={0}
              role="group"
              aria-label={
                position
                  ? `Reference image ${position} of ${active.length}. Use the arrow keys to move it.`
                  : "Reference image, not in use. Use the arrow keys to move it."
              }
              className={`group absolute touch-none rounded-2xl outline-offset-4 ${dragging ? "cursor-grabbing" : "cursor-grab"} ${entering.includes(item.id) ? "animate-in fade-in zoom-in-90 motion-large" : ""}`}
              style={{
                width,
                height,
                left: `calc((100% - ${width}px) * ${item.x})`,
                top: `calc((100% - ${height}px) * ${item.y})`,
                // Hidden cards sit behind every card in use, so a glance at the
                // board shows what the model will actually read.
                zIndex: dragging ? 998 : item.active ? item.z + 1 : 0,
                transform: `rotate(${item.rotation}deg)${dragging ? ` translate(${drag.dx}px, ${drag.dy}px)` : ""}`,
                // The card is sized from the image's real aspect ratio, which
                // is only known once it decodes. Easing the correction keeps it
                // from reading as a jump; left and top ride along because both
                // derive from the card's size.
                transition: dragging
                  ? "none"
                  : "transform var(--motion-duration) var(--motion-easing), width var(--motion-large-duration) var(--motion-large-easing), height var(--motion-large-duration) var(--motion-large-easing), left var(--motion-large-duration) var(--motion-large-easing), top var(--motion-large-duration) var(--motion-large-easing)",
              }}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                setItems((current) =>
                  current.map((i) =>
                    i.id === item.id ? { ...i, z: top + 1 } : i,
                  ),
                );
                setDrag({ id: item.id, dx: 0, dy: 0 });
              }}
              onPointerMove={(e) => {
                if (!dragging) return;
                setDrag({
                  id: item.id,
                  dx: drag.dx + e.movementX,
                  dy: drag.dy + e.movementY,
                });
              }}
              onPointerUp={(e) => {
                if (!dragging) return;
                e.currentTarget.releasePointerCapture(e.pointerId);
                const box = canvas.current?.getBoundingClientRect();
                const spanX = (box?.width ?? 1) - width;
                const spanY = (box?.height ?? 1) - height;
                move(
                  item.id,
                  item.x + drag.dx / Math.max(spanX, 1),
                  item.y + drag.dy / Math.max(spanY, 1),
                );
                setDrag(null);
              }}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 0.08 : 0.02;
                const by: Record<string, [number, number]> = {
                  ArrowLeft: [-step, 0],
                  ArrowRight: [step, 0],
                  ArrowUp: [0, -step],
                  ArrowDown: [0, step],
                };
                const delta = by[e.key];
                if (!delta) return;
                e.preventDefault();
                move(item.id, item.x + delta[0], item.y + delta[1]);
              }}
            >
              {!ready && (
                <Skeleton className="absolute inset-0 rounded-2xl bg-neutral-3 shadow-sm ring-1 ring-neutral-6-transparent" />
              )}
              <img
                src={item.url}
                alt={
                  position
                    ? `Reference image ${position} of ${active.length}`
                    : "Reference image, not in use"
                }
                draggable={false}
                ref={(node) => {
                  // A cached image can finish before React attaches onLoad, and
                  // that load event is gone for good: check on mount instead.
                  if (node?.complete) settle(item.id, node);
                }}
                onLoad={(e) => settle(item.id, e.currentTarget)}
                // An expired or broken signed URL must not leave the card under a
                // skeleton for good.
                onError={() => settle(item.id)}
                className={`size-full select-none rounded-2xl object-cover shadow-sm ring-1 ring-neutral-6-transparent transition-[filter,opacity] motion-large ${ready ? (item.active ? "" : "opacity-50 grayscale") : "opacity-0"}`}
              />
              {ready && position && (
                <span className="pointer-events-none absolute left-2 top-2 grid size-6 place-items-center rounded-full bg-background/90 text-2xs font-medium tabular-nums shadow-sm">
                  {position}
                </span>
              )}
              {/* Excluded images say so plainly: this is the most consequential
                state on the board, and opacity alone did not carry it. */}
              {!item.active && (
                <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-1 text-2xs font-medium text-muted-foreground">
                  Not in use
                </span>
              )}
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 motion-small">
                <button
                  type="button"
                  aria-label={
                    item.active
                      ? "Stop using this reference image"
                      : "Use this reference image"
                  }
                  aria-pressed={item.active}
                  className="grid size-7 place-items-center rounded-full bg-foreground/35 text-background transition-colors hover:bg-foreground/60 focus-visible:opacity-100"
                  onClick={() => toggleActive(item.id, !item.active)}
                >
                  {item.active ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <EyeOff className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Remove this reference image"
                  className="grid size-7 place-items-center rounded-full bg-foreground/35 text-background transition-colors hover:bg-foreground/60 focus-visible:opacity-100"
                  onClick={() => {
                    setMessage("");
                    remove(item);
                  }}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
            Add a reference image to start your board.
          </p>
        )}
        <p
          role="status"
          className="absolute bottom-4 left-6 text-xs text-destructive"
        >
          {message}
        </p>
      </div>
      {children}
    </Panel>
  );
}
