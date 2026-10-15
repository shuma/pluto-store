"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { calcGeneratorDuration, spring } from "motion";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { TextMorph } from "torph/react";
import type { ProductKind } from "@/lib/products/catalog";
import { PICTOGRAMS } from "./product-pictograms";

/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 * Every 1800ms (or on tap) the pill moves to the next product:
 *    0ms   old sticker shrinks to 0.5, tips past its tilt, fades (200ms)
 *    0ms   word morphs letter by letter into the next (200ms)
 *    0ms   pill width springs to fit the new word
 *    0ms   new sticker pops from 0.4, swung 16° back from its tilt
 *  400ms   …overshoots to 1.2 and 5° past its tilt
 *  600ms   …springs back to rest
 *
 * Paused while hovered, while the tab is hidden, and with reduced motion.
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  hold: 1800, // how long each product stays before the next
  enter: 0.6, // sticker pop, start to rest (s)
  morph: 200, // word morph (ms)
};

const STICKER = {
  fromScale: 0.4,
  overshoot: 1.2,
  exitScale: 0.5,
  swingBack: 16, // degrees behind its resting tilt as it arrives
  swingPast: 5, // degrees past its resting tilt at the overshoot
};

const WIDTH_SPRING = {
  type: "spring",
  visualDuration: 0.24,
  bounce: 0.2,
} as const;
const EXIT_SPRING = {
  type: "spring",
  visualDuration: 0.2,
  bounce: 0.2,
} as const;

// Fast in, then a springy settle from the overshoot back to rest.
const POP_EASE = [0.16, 0.55, 0.3, 1] as const;
const SETTLE_EASE = (() => {
  const settle = spring({
    keyframes: [0, 1],
    visualDuration: 0.18,
    bounce: 0.47,
  });
  const length = calcGeneratorDuration(settle);
  return (t: number) => settle.next(t * length).value;
})();

// Sizes in em so the pill scales with whatever heading it sits in. A heading
// can set `--sticker-scale` to let the sticker outgrow the pill, the way a
// sticker overhangs whatever it is stuck to, where 1em is too small to read,
// and `--sticker-nudge` to push it out past the pill's left edge.
const PILL =
  "relative isolate [--sticker:calc(0.94em*var(--sticker-scale,1))] inline-block whitespace-nowrap pr-[0.28em] pl-[0.1em] text-left align-baseline before:absolute before:inset-x-0 before:top-1/2 before:-z-10 before:h-[1.1em] before:-translate-y-[calc(50%-0.045em)] before:rounded-full before:bg-neutral-4 before:transition-colors before:motion-small";
const INSET = "pl-[calc(var(--sticker)+0.16em-var(--sticker-nudge,0em))]"; // room for the sticker before the word
const STICKER_BOX =
  "absolute top-[calc(50%+0.045em)] left-0 grid size-(--sticker) -translate-y-1/2 place-items-center drop-shadow-[0_0.02em_0.025em_rgb(0_0_0/0.08)]";

type Kind = { kind: ProductKind; label: string };

// The product word in "Turn your photo into a ___": a pill with a sticker of
// the product, cycling through what this store sells. It only shows the
// range; the visitor picks the actual product after their artwork is made.
// Screen readers get the whole list once instead of every change.
export function ProductToken({ kinds }: { kinds: Kind[] }) {
  const list = new Intl.ListFormat("en", { type: "disjunction" }).format(
    kinds.map((k) => k.label),
  );
  if (kinds.length < 2) {
    const only = kinds[0] ?? { kind: "poster", label: "poster" };
    return (
      <span>
        <span className={PILL}>
          <span className={INSET}>{only.label}</span>
          <span
            className="pointer-events-none absolute inset-y-0 left-[calc(0.1em-var(--sticker-nudge,0em))] w-(--sticker)"
            aria-hidden
          >
            <span
              className={STICKER_BOX}
              style={{ rotate: `${PICTOGRAMS[only.kind].rotation}deg` }}
            >
              {PICTOGRAMS[only.kind].artwork}
            </span>
          </span>
        </span>
      </span>
    );
  }
  return (
    <>
      <span className="sr-only">{list}</span>
      {/* Its own line, so a long word like "digital download" can't make the
          heading wrap differently from one product to the next. */}
      <span className="block">
        <Cycle kinds={kinds} />
      </span>
    </>
  );
}

function Cycle({ kinds }: { kinds: Kind[] }) {
  const reduce = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0),
    [hovered, setHovered] = useState(false);
  const current = kinds[index % kinds.length];
  const next = () => setIndex((i) => (i + 1) % kinds.length);
  const button = useRef<HTMLButtonElement>(null),
    measures = useRef<HTMLSpanElement>(null);
  const widths = useLabelWidths(kinds, button, measures);

  useEffect(() => {
    if (reduce || hovered) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      if (!document.hidden) timer = setTimeout(next, TIMING.hold);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
    // `index` restarts the hold after every change, tapped or timed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, reduce, hovered]);

  const { rotation } = PICTOGRAMS[current.kind];
  const sign = Math.sign(rotation);
  const still = { duration: 0 };
  return (
    <motion.button
      ref={button}
      type="button"
      // Decorative: the list above carries the meaning, so it stays out of
      // the tab order and the accessibility tree. Tapping just skips ahead.
      tabIndex={-1}
      aria-hidden
      onClick={next}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      initial={false}
      animate={
        widths[current.label] ? { width: widths[current.label] } : undefined
      }
      transition={{ width: reduce ? still : WIDTH_SPRING }}
      className={`${PILL} hover:before:bg-neutral-5 active:before:bg-neutral-6`}
    >
      {/* In flow for the first paint, before the widths are measured. */}
      <span className={`invisible block ${INSET}`}>{current.label}</span>
      <span className="pointer-events-none absolute inset-y-0 left-[calc(0.1em-var(--sticker-nudge,0em))] w-(--sticker)">
        <AnimatePresence initial={false}>
          <motion.span
            key={current.kind}
            className={`${STICKER_BOX} will-change-transform`}
            initial={{
              opacity: 0,
              scale: STICKER.fromScale,
              rotate: rotation - STICKER.swingBack * sign,
            }}
            animate={{
              opacity: 1,
              scale: reduce ? 1 : [STICKER.fromScale, STICKER.overshoot, 1],
              rotate: reduce
                ? rotation
                : [
                    rotation - STICKER.swingBack * sign,
                    rotation + STICKER.swingPast * sign,
                    rotation,
                  ],
            }}
            exit={{
              opacity: 0,
              scale: STICKER.exitScale,
              rotate: rotation + STICKER.swingPast * sign,
              transition: {
                scale: reduce ? still : EXIT_SPRING,
                rotate: reduce ? still : { duration: 0.2 },
                opacity: reduce ? still : { duration: 0.2, ease: "easeOut" },
              },
            }}
            transition={{
              scale: reduce
                ? still
                : {
                    duration: TIMING.enter,
                    times: [0, 2 / 3, 1],
                    ease: [POP_EASE, SETTLE_EASE],
                  },
              rotate: reduce
                ? still
                : {
                    duration: TIMING.enter,
                    times: [0, 2 / 3, 1],
                    ease: [POP_EASE, SETTLE_EASE],
                  },
              opacity: reduce ? still : { duration: 0.18, ease: "easeOut" },
            }}
          >
            {PICTOGRAMS[current.kind].artwork}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="pointer-events-none absolute inset-y-0 right-[0.28em] left-[calc(0.26em+var(--sticker)-var(--sticker-nudge,0em))] whitespace-nowrap">
        <TextMorph duration={TIMING.morph} disabled={reduce}>
          {current.label}
        </TextMorph>
      </span>
      <span
        ref={measures}
        className="invisible pointer-events-none fixed top-0 left-0 h-0 w-max overflow-hidden"
      >
        {kinds.map((k) => (
          <span
            key={k.label}
            data-label={k.label}
            className={`block w-max ${INSET}`}
          >
            {k.label}
          </span>
        ))}
      </span>
    </motion.button>
  );
}

// The pill's width for each label, measured from hidden copies in the same
// font, and measured again when fonts finish loading or anything resizes.
function useLabelWidths(
  kinds: Kind[],
  ref: RefObject<HTMLButtonElement | null>,
  measures: RefObject<HTMLSpanElement | null>,
) {
  const [of, setOf] = useState<Record<string, number>>({});
  const key = kinds.map((k) => k.label).join("|");
  useLayoutEffect(() => {
    const button = ref.current,
      box = measures.current;
    if (!button || !box) return;
    const items = Array.from(box.querySelectorAll<HTMLElement>("[data-label]"));
    let gone = false;
    const measure = () => {
      if (gone) return;
      const style = getComputedStyle(button);
      const padding =
        (parseFloat(style.paddingLeft) || 0) +
        (parseFloat(style.paddingRight) || 0);
      const next: Record<string, number> = {};
      for (const item of items) {
        const width = item.getBoundingClientRect().width;
        if (width <= 0) return;
        next[item.dataset.label!] = Math.ceil(width + padding);
      }
      setOf((prev) =>
        items.every((i) => prev[i.dataset.label!] === next[i.dataset.label!])
          ? prev
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    items.forEach((i) => observer.observe(i));
    void document.fonts?.ready.then(measure);
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      gone = true;
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [key, ref, measures]);
  return of;
}
