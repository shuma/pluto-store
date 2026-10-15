"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Example } from "@/lib/domain";
import { BeforeAfterCard } from "./before-after-card";
// The store's examples, one before/after at a time. Swiping is the browser's
// own scroll snapping, so it feels native on a phone; the dots follow the
// scroll and jump to a slide, and arrows appear only where there is a pointer
// to hover with.
export function ExampleCarousel({ examples }: { examples: Example[] }) {
  const rail = useRef<HTMLUListElement | null>(null);
  const [active, setActive] = useState(0);
  if (!examples.length) return null;
  const many = examples.length > 1;
  const go = (index: number) => {
    const el = rail.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  };
  const arrow =
    "absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground opacity-0 shadow-sm ring-1 ring-neutral-6-transparent backdrop-blur-md transition-[opacity,transform] group-hover/carousel:opacity-100 focus-visible:opacity-100 active:scale-95 disabled:pointer-events-none disabled:opacity-0! [@media(hover:none)]:hidden motion-small";
  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Examples"
      // Set on the same paper as the photo preview and the poster pages, so a
      // portrait leaves a mat around it rather than bare white gutters. The
      // mat runs edge to edge in its card rather than as a box inside a box.
      className="group/carousel relative bg-paper-shell p-4"
    >
      <ul
        ref={rail}
        onScroll={(e) => {
          const el = e.currentTarget;
          setActive(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {examples.map((example, i) => (
          <li
            key={example.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${examples.length}`}
            // Every slide is the same height, so the rail doesn't jump between
            // pictures of different shapes; each card is as wide as its own
            // picture needs and centred in the slide.
            className="flex h-[min(20rem,38svh)] sm:h-[min(26rem,60svh)] w-full shrink-0 snap-center snap-always justify-center"
          >
            <BeforeAfterCard
              artUrl={example.image_url}
              sourceUrl={example.source_url}
              alt={example.caption}
              natural
              className="h-full w-fit max-w-full rounded-lg shadow-md"
            />
          </li>
        ))}
      </ul>
      {many && (
        <>
          <button
            type="button"
            onClick={() => go(active - 1)}
            disabled={active === 0}
            aria-label="Previous example"
            className={cn(arrow, "left-3")}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            disabled={active === examples.length - 1}
            aria-label="Next example"
            className={cn(arrow, "right-3")}
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="mt-4 flex justify-center gap-1.5">
            {examples.map((example, i) => (
              <button
                key={example.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show example ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] motion-small",
                  i === active
                    ? "w-4 bg-foreground"
                    : "w-1.5 bg-neutral-5 hover:bg-neutral-6",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
