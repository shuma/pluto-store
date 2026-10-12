"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Trash2, X, ZoomIn } from "lucide-react";
import { uploadCreatorAsset } from "@/lib/client-upload";
import { post } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { PreviewViewer, VIEWER_CONTROL } from "./preview-viewer";

// The storefront shows the first 12, so more would upload and never appear.
const MAX = 12;
// How long a removed example can still be brought back before it is deleted.
const UNDO_MS = 6000;

type Example = { id: string; image_url: string; caption: string };

// Finished pieces for the storefront, as a row of thumbnails inside the store
// form: each opens full size in the same viewer as style previews, and the
// last tile adds another.
export function ExampleArtwork({
  examples,
  onChange,
}: {
  examples: Example[];
  onChange: () => void;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [busy, setBusy] = useState(false),
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
          toast.error("Could not remove that artwork. Try again.");
        }
      }, UNDO_MS),
    );
    toast("Artwork removed", {
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
        <p className="text-sm font-medium">Example artwork</p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {visible.length} of {MAX}
        </p>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Finished pieces that show customers what to expect. Your reference
        images stay private.
      </p>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {visible.map((example, i) => (
          <div key={example.id} className="group relative">
            <button
              type="button"
              onClick={() => setViewing(example.id)}
              aria-label={`View example artwork ${i + 1} full size`}
              className="group/view relative block w-full cursor-zoom-in rounded-xl outline-offset-2"
            >
              <img
                src={example.image_url}
                alt={example.caption}
                className="aspect-[.707] w-full rounded-xl object-cover shadow-sm ring-1 ring-neutral-6-transparent"
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
              aria-label={`Remove example artwork ${i + 1}`}
              className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-foreground/35 text-background opacity-0 transition-opacity hover:bg-foreground/60 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 motion-small"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {visible.length < MAX && (
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="flex aspect-[.707] w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-5 bg-background text-xs font-medium text-muted-foreground transition-colors hover:border-neutral-6 hover:text-foreground disabled:cursor-progress"
          >
            <ImagePlus className={cn("size-5", busy && "animate-pulse")} />
            {busy ? "Adding…" : "Add"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="Add example artwork"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            await uploadCreatorAsset("example", file);
            toast("Artwork added to your storefront");
            router.refresh();
            onChange();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Upload failed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      <PreviewViewer
        label="Example artwork"
        items={visible.map((e) => ({ id: e.id, url: e.image_url }))}
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
