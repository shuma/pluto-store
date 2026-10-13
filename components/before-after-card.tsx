import { cn } from "@/lib/utils";
// An example as customers read it: the artwork large, and the photo it was
// made from tucked into the corner like a print laid on top, with a drawn arrow
// from one to the other. `compact` is for thumbnails, where the arrow would be
// too small to read.
export function BeforeAfterCard({
  artUrl,
  sourceUrl,
  alt,
  compact = false,
  natural = false,
  className,
}: {
  artUrl: string;
  sourceUrl: string;
  alt: string;
  compact?: boolean;
  // Sized by the artwork's own shape from the card's height, so the whole
  // picture shows; otherwise it fills the card's box and crops to fit.
  natural?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-neutral-6-transparent",
        className,
      )}
    >
      <img
        src={artUrl}
        alt={alt}
        draggable={false}
        className={cn(
          "select-none",
          natural
            ? "h-full w-auto max-w-full object-contain"
            : // Anchored to the top: a card shorter than the portrait print
              // should lose its bottom edge rather than the subject's head.
              "size-full object-cover object-top",
        )}
      />
      {/* The arrow rides on the photo, so it stays just above it whatever the
          card's shape. */}
      <div className="absolute bottom-[5%] left-[5%] w-[28%]">
        <img
          src={sourceUrl}
          alt="The original photo"
          draggable={false}
          className={cn(
            "aspect-[3/4] w-full -rotate-6 select-none bg-muted object-cover shadow-md",
            compact
              ? "rounded-md ring-2 ring-background"
              : "rounded-xl ring-4 ring-background",
          )}
        />
        {!compact && (
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="absolute bottom-[calc(100%+var(--space-xs))] left-[36%] w-[46%] text-white drop-shadow-sm"
          >
            <path d="M8 44C5 35 8 27 16 27c7 0 6 9 0 8-7-1-4-17 22-25" />
            <path d="M30 7l8 3-4 7" />
          </svg>
        )}
      </div>
    </div>
  );
}
