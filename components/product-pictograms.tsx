"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import type { ProductKind } from "@/lib/products/catalog";
import { cn } from "@/lib/utils";

// Little stickers of each product, drawn on a 64 × 64 grid. Every one sits on
// a white copy of its own outline, stroked wide, so it reads as a die-cut
// sticker on any surface. The colours belong to the artwork, not the theme:
// they are the product, the way a photo would be. `rotation` is the tilt it
// settles at; neighbours lean opposite ways so the swap reads as a flip.
const OUTLINE = {
  fill: "white",
  stroke: "white",
  strokeWidth: 7.5,
  strokeLinejoin: "round",
} as const;

function Sticker({
  outline,
  children,
}: {
  outline: ReactNode;
  children: ReactNode;
}) {
  return (
    <svg viewBox="0 0 64 64" className="size-full overflow-visible" aria-hidden>
      <g {...OUTLINE}>{outline}</g>
      {children}
    </svg>
  );
}

// A print taped up: a landscape with a sun, and a caption line underneath.
const poster = (
  <Sticker
    outline={
      <>
        <rect x="12" y="7" width="40" height="51" rx="3" />
        <rect x="25" y="3" width="14" height="8" rx="1.5" />
      </>
    }
  >
    <rect x="12" y="7" width="40" height="51" rx="3" fill="#FFFDF7" />
    <rect x="17" y="13" width="30" height="33" rx="1.5" fill="#9ED6FF" />
    <circle cx="38" cy="22" r="5" fill="#FFC93C" />
    <path d="M17 46V35q7.5-8 15-1 7.5-7 15 0v12z" fill="#3DBB6E" />
    <path d="M17 46v-5q15-7 30 0v5z" fill="#279553" />
    <rect x="17" y="50" width="16" height="3" rx="1.5" fill="#D9D4C5" />
    <rect
      x="25"
      y="3"
      width="14"
      height="8"
      rx="1.5"
      fill="#FFD9A0"
      opacity=".9"
    />
  </Sticker>
);

// A dark frame around a cream mat and a small portrait.
const framed = (
  <Sticker outline={<rect x="9" y="6" width="46" height="52" rx="5" />}>
    <rect x="9" y="6" width="46" height="52" rx="5" fill="#2B2B2E" />
    <rect
      x="11.5"
      y="8.5"
      width="41"
      height="47"
      rx="3"
      fill="none"
      stroke="#45454B"
      strokeWidth="1.5"
    />
    <rect x="15" y="12" width="34" height="40" rx="1.5" fill="#F6F1E7" />
    <rect x="21" y="18" width="22" height="28" rx="1" fill="#FF8A65" />
    <path d="M24 46q8-14 16 0z" fill="#3949AB" />
    <circle cx="32" cy="29" r="5" fill="#5B3A29" />
  </Sticker>
);

// A small photo print held up by a round fridge magnet, with a wide bottom
// border like an instant photo.
const print = (
  <Sticker
    outline={
      <>
        <rect x="15" y="13" width="34" height="44" rx="2.5" />
        <circle cx="32" cy="12" r="7" />
      </>
    }
  >
    <rect x="15" y="13" width="34" height="44" rx="2.5" fill="#FFFDF7" />
    <rect x="19" y="17" width="26" height="28" rx="1" fill="#FFC2B4" />
    <circle cx="37" cy="25" r="4" fill="#FFF0A8" />
    <path d="M19 45V36q6-7 13-1 6-6 13 1v9z" fill="#7C5CFF" />
    <circle cx="32" cy="12" r="6" fill="#FF4F4F" />
    <circle cx="30" cy="10" r="1.8" fill="white" opacity=".7" />
  </Sticker>
);

// A stretched canvas, its side edge showing so it has depth, painted in
// three loose strokes.
const canvas = (
  <Sticker outline={<path d="M10 10h40l6 4v44H16l-6-4z" />}>
    <path d="M50 10l6 4v44l-6-4z" fill="#CDBD9C" />
    <path d="M10 54l6 4h40l-6-4z" fill="#B7A685" />
    <rect x="10" y="10" width="40" height="44" rx="1.5" fill="#FFF4D6" />
    <g fill="none" strokeLinecap="round">
      <path d="M17 21q9-6 18 0t9 1" stroke="#FF5E7E" strokeWidth="7" />
      <path d="M16 33q11-5 22 1" stroke="#5B7BFF" strokeWidth="7" />
      <path d="M19 45q9-4 24-1" stroke="#FFC23C" strokeWidth="6" />
    </g>
  </Sticker>
);

// A tee with a small print on the chest.
const TEE = "M22 8l-10 5-7 12 8 5 4-4v30h30V26l4 4 8-5-7-12-10-5q-10 8-20 0z";
const tshirt = (
  <Sticker outline={<path d={TEE} />}>
    <path
      d={TEE}
      fill="#5B8CFF"
      stroke="#5B8CFF"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M24 9q8 6 16 0"
      fill="none"
      stroke="#3D6BE6"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <rect x="25" y="25" width="14" height="17" rx="2" fill="#FFFDF7" />
    <circle cx="34.5" cy="30" r="2.5" fill="#FFC93C" />
    <path d="M27 40v-3q5-5 10 0v3z" fill="#3DBB6E" />
  </Sticker>
);

// An image file with a download badge on its corner.
const digital = (
  <Sticker
    outline={
      <>
        <rect x="8" y="7" width="40" height="46" rx="7" />
        <circle cx="46" cy="46" r="12" />
      </>
    }
  >
    <rect x="8" y="7" width="40" height="46" rx="7" fill="#F1EEFF" />
    <rect x="13" y="12" width="30" height="26" rx="4" fill="#B9A8FF" />
    <circle cx="35" cy="20" r="4" fill="#FFF6C2" />
    <path
      d="M13 34v-4q7.5-7 15 0 7.5-6 15 0v4a4 4 0 0 1-4 4H17a4 4 0 0 1-4-4z"
      fill="#7A5CFF"
    />
    <rect x="13" y="43" width="16" height="3" rx="1.5" fill="#CFC7F5" />
    <circle cx="46" cy="46" r="12" fill="#22C55E" />
    <path
      d="M46 39v10m-5-5 5 5 5-5m-10 9h10"
      fill="none"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Sticker>
);

export const PICTOGRAMS: Record<
  ProductKind,
  { artwork: ReactNode; rotation: number }
> = {
  poster: { artwork: poster, rotation: -9 },
  print: { artwork: print, rotation: 6 },
  framed: { artwork: framed, rotation: 8 },
  canvas: { artwork: canvas, rotation: -6 },
  tshirt: { artwork: tshirt, rotation: 7 },
  digital: { artwork: digital, rotation: -8 },
};

/* ─────────────────────────────────────────────────────────
 * STICKER IN A LIST
 *
 * hover     leans 8° further and lifts 2px, scale 1.1 (spring)
 * select      0ms  squashes to 0.9
 *           150ms  pops to 1.2, swung 10° the other way
 *           450ms  springs back to rest
 * ───────────────────────────────────────────────────────── */

const LIST = {
  hoverLean: 8, // degrees past its resting tilt
  hoverLift: -2, // px
  hoverScale: 1.1,
  popScale: [1, 0.9, 1.2, 1],
  popSwing: 10, // degrees, against its tilt
  popDuration: 0.45,
};
const LIST_SPRING = {
  type: "spring",
  visualDuration: 0.25,
  bounce: 0.4,
} as const;

// A product's sticker on its own, for lists where it marks what each row is.
// The box keeps its size so rows line up; `size` (0–1) shrinks the sticker
// inside it, so a smaller print gets a smaller sticker. It leans when an
// ancestor with `whileHover="hover"` is hovered, and pops when `selected`
// turns on.
export function ProductSticker({
  kind,
  size = 1,
  selected = false,
  className,
}: {
  kind: ProductKind;
  size?: number;
  selected?: boolean;
  className?: string;
}) {
  const { artwork, rotation } = PICTOGRAMS[kind];
  const sign = Math.sign(rotation);
  const reduce = useReducedMotion() ?? false;
  const [pop, animate] = useAnimate<HTMLSpanElement>();
  const was = useRef(selected);
  useEffect(() => {
    const turnedOn = selected && !was.current;
    was.current = selected;
    if (!turnedOn || reduce) return;
    void animate(
      pop.current,
      {
        scale: LIST.popScale,
        rotate: [0, 0, -LIST.popSwing * sign, 0],
      },
      {
        duration: LIST.popDuration,
        times: [0, 0.33, 0.66, 1],
        ease: "easeOut",
      },
    );
  }, [selected, reduce, sign, animate, pop]);
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center drop-shadow-[0_1px_1px_rgb(0_0_0/0.08)]",
        className,
      )}
    >
      <motion.span
        className="grid size-full place-items-center"
        variants={{
          rest: { rotate: rotation, scale: size, y: 0 },
          hover: reduce
            ? { rotate: rotation, scale: size, y: 0 }
            : {
                rotate: rotation + LIST.hoverLean * sign,
                scale: size * LIST.hoverScale,
                y: LIST.hoverLift,
              },
        }}
        initial={false}
        transition={reduce ? { duration: 0 } : LIST_SPRING}
      >
        <span ref={pop} className="grid size-full place-items-center">
          {artwork}
        </span>
      </motion.span>
    </span>
  );
}
