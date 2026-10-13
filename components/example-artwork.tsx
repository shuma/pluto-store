"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Loader2, Plus, Trash2, X, ZoomIn } from "lucide-react";
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
import { BeforeAfterCard } from "./before-after-card";
import { PreviewViewer, VIEWER_CONTROL } from "./preview-viewer";

// How long a removed example can still be brought back before it is deleted.
const UNDO_MS = 6000;

// Before/after pairs for the storefront, as a row of thumbnails inside the
// store form: each opens full size in the same viewer as style previews, with
// the photo one toggle away, and the last tile adds another.
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
    [viewing, setViewing] = useState<string | null>(null);
  const visible = examples.filter((e) => !removing.includes(e.id));
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
        theirs. You can also publish a style preview from{" "}
        <Link
          href="/dashboard/store/reference-images"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Reference images
        </Link>
        .
      </p>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {visible.map((example, i) => (
          <div key={example.id} className="group relative">
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
              className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-foreground/35 text-background opacity-0 transition-opacity hover:bg-foreground/60 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 motion-small"
            >
              <X className="size-3.5" />
            </button>
          </div>
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
            <div className="mt-4">
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
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Slot label="Original photo" url={photoUrl} onPick={setPhoto} />
              <Slot label="Artwork" url={artworkUrl} onPick={setArtwork} />
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
// One image to pick: a large tile until it has one, or a plain text button to
// swap it once the preview card is showing.
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
  const field = (
    <input
      ref={input}
      type="file"
      accept="image/jpeg,image/png,image/webp"
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
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group/slot relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-neutral-5 bg-background text-muted-foreground transition-colors hover:border-neutral-6 hover:text-foreground"
      >
        {url ? (
          <img src={url} alt="" className="size-full object-cover" />
        ) : (
          <Plus className="size-5" />
        )}
      </button>
      <p className="mt-2 text-center text-xs font-medium">{label}</p>
      {field}
    </div>
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
