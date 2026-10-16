"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  ImagePlus,
  Loader2,
  Trash2,
  X,
  ZoomIn,
} from "lucide-react";
import { uploadExamplePair } from "@/lib/client-upload";
import { post } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { MAX_EXAMPLES as MAX, type Example } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { move } from "@dnd-kit/helpers";
import { PointerSensor } from "@dnd-kit/dom";
import { BeforeAfterCard } from "./before-after-card";
import { PreviewViewer, VIEWER_CONTROL } from "./preview-viewer";

// How long a removed example can still be brought back before it is deleted.
const UNDO_MS = 6000;

// Before/after pairs for the storefront, as a row of thumbnails inside the
// store form: each opens full size in the same viewer as style previews, with
// the photo one toggle away, and the last tile adds another. Dragging a
// thumbnail sets the order the storefront shows them in.
export function ExampleArtwork({
  examples,
  onChange,
}: {
  examples: Example[];
  onChange: () => void;
}) {
  const router = useRouter();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [adding, setAdding] = useState(false),
    // A fresh dialog, with nothing chosen, each time it opens.
    [session, setSession] = useState(0),
    [removing, setRemoving] = useState<string[]>([]),
    [viewing, setViewing] = useState<string | null>(null),
    // The order just dragged into, shown at once while it saves; examples
    // added since go after it.
    [order, setOrder] = useState<string[] | null>(null);
  const ids = examples.map((e) => e.id);
  const ordered = order
    ? [
        ...order.filter((id) => ids.includes(id)),
        ...ids.filter((id) => !order.includes(id)),
      ]
    : ids;
  const byId = new Map(examples.map((e) => [e.id, e]));
  const visible = ordered
    .map((id) => byId.get(id)!)
    .filter((e) => !removing.includes(e.id));
  function reorder(next: string[]) {
    if (next.join() === visible.map((e) => e.id).join()) return;
    const previous = order;
    // Examples waiting out their undo come back at the end.
    setOrder([...next, ...removing]);
    post("/api/creator/examples/order", { ids: next })
      .then(() => {
        router.refresh();
        onChange();
      })
      .catch(() => {
        setOrder(previous);
        toast.error("Could not save the new order. Try again.");
      });
  }
  // Removals still waiting out their undo window go through if the page is
  // left, rather than being silently dropped.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const [id, timer] of pending) {
        clearTimeout(timer);
        void post("/api/creator/examples", { id });
      }
    };
  }, []);
  function remove(example: Example) {
    setViewing(null);
    setRemoving((current) => [...current, example.id]);
    timers.current.set(
      example.id,
      setTimeout(async () => {
        timers.current.delete(example.id);
        try {
          await post("/api/creator/examples", { id: example.id });
          router.refresh();
          onChange();
        } catch {
          setRemoving((current) => current.filter((i) => i !== example.id));
          toast.error("Could not remove that example. Try again.");
        }
      }, UNDO_MS),
    );
    toast("Example removed", {
      duration: UNDO_MS,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timers.current.get(example.id));
          timers.current.delete(example.id);
          setRemoving((current) => current.filter((i) => i !== example.id));
        },
      },
    });
  }
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">Before and after</p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {visible.length} of {MAX}
        </p>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        A photo and the artwork made from it, so customers see what happens to
        theirs. Drag to change the order. You can also publish a style preview
        from{" "}
        <Link
          href="/dashboard/store/reference-images"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Reference images
        </Link>
        .
      </p>
      <DragDropProvider
        sensors={(defaults) => [
          ...defaults.filter((sensor) => sensor !== PointerSensor),
          PointerSensor.configure({ preventActivation: startsOnRemove }),
        ]}
        onDragEnd={(event) => {
          if (!event.canceled)
            reorder(
              move(
                visible.map((e) => e.id),
                event,
              ),
            );
        }}
      >
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {visible.map((example, i) => (
            <SortableExample key={example.id} id={example.id} index={i}>
              <button
                type="button"
                onClick={() => setViewing(example.id)}
                aria-label={`View example ${i + 1} full size`}
                className="group/view relative block w-full cursor-zoom-in rounded-xl outline-offset-2"
              >
                <BeforeAfterCard
                  artUrl={example.image_url}
                  sourceUrl={example.source_url}
                  alt={example.caption}
                  compact
                  className="aspect-[4/5] w-full rounded-xl"
                />
                <span className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover/view:opacity-100 group-focus-visible/view:opacity-100 motion-small">
                  <span className="grid size-8 scale-90 place-items-center rounded-full bg-foreground/40 text-background backdrop-blur-sm transition-transform group-hover/view:scale-100 motion-small">
                    <ZoomIn className="size-4" />
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => remove(example)}
                aria-label={`Remove example ${i + 1}`}
                data-no-drag
                className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-foreground/35 text-background opacity-0 transition-opacity hover:bg-foreground/60 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 motion-small"
              >
                <X className="size-3.5" />
              </button>
            </SortableExample>
          ))}
          {visible.length < MAX && (
            <button
              type="button"
              onClick={() => {
                setSession((n) => n + 1);
                setAdding(true);
              }}
              className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-5 bg-background text-xs font-medium text-muted-foreground transition-colors hover:border-neutral-6 hover:text-foreground"
            >
              <ImagePlus className="size-5" />
              Add
            </button>
          )}
        </div>
      </DragDropProvider>
      <AddPair
        key={session}
        open={adding}
        onOpenChange={setAdding}
        onAdded={() => {
          setAdding(false);
          toast("Example added to your storefront");
          router.refresh();
          onChange();
        }}
      />
      <PreviewViewer
        label="Example"
        items={visible.map((e) => ({
          id: e.id,
          url: e.image_url,
          sampleUrl: e.source_url,
        }))}
        openId={viewing}
        onOpenChange={setViewing}
        actions={(item) => {
          const example = visible.find((e) => e.id === item.id);
          return (
            example && (
              <button
                type="button"
                onClick={() => remove(example)}
                className={cn(VIEWER_CONTROL, "flex h-9 gap-2 px-4")}
              >
                <Trash2 className="size-4" />
                <span className="text-xs font-medium">
                  Remove from storefront
                </span>
              </button>
            )
          );
        }}
      />
    </div>
  );
}

// A drag starts anywhere on a thumbnail, its full-size button included,
// except the remove button. The default holds still for a moment (a long
// press on touch) before dragging, so a tap still opens the example.
const startsOnRemove = (event: PointerEvent) =>
  event.target instanceof Element &&
  Boolean(event.target.closest("[data-no-drag]"));

// One thumbnail that can be dragged to a new place. It lifts while held,
// and the others make room for it.
function SortableExample({
  id,
  index,
  children,
}: {
  id: string;
  index: number;
  children: React.ReactNode;
}) {
  const { ref, isDragging } = useSortable({ id, index });
  return (
    <div
      ref={ref}
      className={cn(
        "group relative touch-manipulation rounded-xl transition-[scale,box-shadow] motion-small",
        isDragging && "z-10 scale-105 cursor-grabbing shadow-lg",
      )}
    >
      {children}
    </div>
  );
}

// The two halves of a new example, each chosen on its own, with the finished
// card shown as soon as both are there so the creator sees what customers will.
function AddPair({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [photo, setPhoto] = usePickedImage(),
    [artwork, setArtwork] = usePickedImage(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const photoUrl = photo?.url ?? null,
    artworkUrl = artwork?.url ?? null;
  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <div className="px-6 pt-6 pb-6">
          <DialogTitle className="text-lg font-semibold">
            Add an example
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Both images appear on your storefront, so only use a photo you have
            permission to show.
          </DialogDescription>
          {photoUrl && artworkUrl ? (
            <div className="mt-4 animate-in fade-in-0 zoom-in-95 motion-large">
              <BeforeAfterCard
                artUrl={artworkUrl}
                sourceUrl={photoUrl}
                alt="Your artwork"
                className="aspect-[4/5] w-full"
              />
              <div className="mt-2 flex justify-center gap-2">
                <Slot label="Change photo" disabled={busy} onPick={setPhoto} />
                <Slot
                  label="Change artwork"
                  disabled={busy}
                  onPick={setArtwork}
                />
              </div>
            </div>
          ) : (
            <div className="relative mt-4 grid grid-cols-2 gap-3">
              <Slot label="Original photo" url={photoUrl} onPick={setPhoto} />
              <Slot label="Artwork" url={artworkUrl} onPick={setArtwork} />
              {/* Reads left to right as the photo becoming the artwork. */}
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-popover text-muted-foreground shadow-[inset_0_0_0_var(--border-s)_var(--neutral-4-transparent),var(--shadow-s)]"
              >
                <ArrowRight className="size-4" />
              </span>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 shadow-[inset_0_var(--border-s)_0_var(--border)] bg-neutral-2 px-6 py-4">
          <Button
            variant="ghost"
            className="h-11 rounded-xl px-4"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="h-11 rounded-xl px-6"
            disabled={!photo || !artwork || busy}
            onClick={async () => {
              if (!photo || !artwork) return;
              setBusy(true);
              setError("");
              try {
                await uploadExamplePair(photo.file, artwork.file);
                onAdded();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Upload failed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="animate-spin" aria-hidden />}
            {busy ? "Adding…" : "Add to storefront"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

// One image to pick, by click or drop: a large tile until it has one, or a
// plain text button to swap it once the preview card is showing.
function Slot({
  label,
  url,
  disabled,
  onPick,
}: {
  label: string;
  url?: string | null;
  disabled?: boolean;
  onPick: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const field = (
    <input
      ref={input}
      type="file"
      accept={ACCEPT.join(",")}
      className="sr-only"
      tabIndex={-1}
      aria-label={label}
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) onPick(file);
      }}
    />
  );
  if (url === undefined)
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="text-muted-foreground"
        >
          {label}
        </Button>
        {field}
      </>
    );
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={url ? `Replace ${label.toLowerCase()}` : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file && ACCEPT.includes(file.type)) onPick(file);
        }}
        className={cn(
          "relative flex aspect-[4/5] w-full *:pointer-events-none flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed text-xs font-medium transition-colors",
          dragging
            ? "border-primary bg-accent text-foreground"
            : url
              ? "border-transparent"
              : "border-neutral-5 bg-background text-muted-foreground hover:border-neutral-6 hover:text-foreground",
        )}
      >
        {url ? (
          <img
            src={url}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <>
            <ImagePlus className="size-5" aria-hidden />
            {label}
          </>
        )}
      </button>
      {field}
    </>
  );
}
// A chosen file with a local URL to preview it by. The URL is made when the
// file is picked and released when it is replaced or the dialog goes.
function usePickedImage() {
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(
    null,
  );
  const current = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current);
    },
    [],
  );
  const pick = (file: File) => {
    if (current.current) URL.revokeObjectURL(current.current);
    const url = URL.createObjectURL(file);
    current.current = url;
    setPicked({ file, url });
  };
  return [picked, pick] as const;
}
