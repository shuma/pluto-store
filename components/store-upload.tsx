"use client";
import { useRef } from "react";
import { ArrowRight, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Example } from "@/lib/domain";
import { usePhotoUpload } from "./upload-flow";
import { ExampleCarousel } from "./example-carousel";

// The store's one action. Tapping it opens the photo picker straight away;
// once a photo is chosen the card shows it, and one more tap starts the
// artwork. No separate upload page in between. While a photo is chosen the
// section carries `data-chosen`, which the store page's header reads (via
// `:has`) to step back so the photo and its button stay on screen.
export function StoreUpload({
  slug,
  examples,
}: {
  slug: string;
  // Before/after pairs in the creator's style, shown until a photo is chosen.
  examples: Example[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const { file, preview, busy, error, choose, submit } = usePhotoUpload(slug);
  const pick = () => input.current?.click();
  return (
    <section
      aria-label="Make your artwork"
      data-chosen={file ? "" : undefined}
      className="overflow-hidden rounded-4xl bg-background shadow-sm ring-1 ring-neutral-6-transparent"
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose a photo"
        onChange={(e) => choose(e.target.files?.[0])}
        disabled={busy}
      />
      {preview ? (
        <div className="grid place-items-center bg-paper-shell p-4">
          <img
            src={preview}
            alt="Your photo"
            className="max-h-80 rounded-lg object-contain"
          />
        </div>
      ) : (
        <ExampleCarousel examples={examples} />
      )}
      {file && (
        <h2 className="px-5 pt-4 pb-1 text-center text-base font-semibold min-[380px]:text-ml">
          Happy with this photo?
        </h2>
      )}
      {error && (
        <p
          role="alert"
          className="px-5 pt-3 text-center text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="space-y-1 p-3">
        {file ? (
          <>
            <Button
              size="lg"
              className="h-13 w-full rounded-2xl text-base"
              disabled={busy}
              onClick={submit}
            >
              {busy ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Preparing your photo…
                </>
              ) : (
                <>
                  Create my artwork
                  <ArrowRight aria-hidden />
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-full rounded-2xl text-muted-foreground"
              disabled={busy}
              onClick={pick}
            >
              Choose a different photo
            </Button>
          </>
        ) : (
          <Button
            size="lg"
            className="h-13 w-full rounded-2xl text-base"
            onClick={pick}
          >
            <ImagePlus aria-hidden />
            Upload a photo
          </Button>
        )}
      </div>
    </section>
  );
}
