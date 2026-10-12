"use client";
// RefineFrame from React Bits, ported to TypeScript. The media resolves from a
// coarse mosaic to full detail as the status advances, with a soft sweep while
// it works and a small chip naming the stage.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CheckIcon,
  Loader2Icon,
  RefreshCwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import "./refine-frame.css";

export type RefineStatus =
  "queued" | "generating" | "refining" | "complete" | "error";

const STAGES: Record<
  RefineStatus,
  { blur: number; sat: number; scale: number; opacity: number }
> = {
  queued: { blur: 4, sat: 0.6, scale: 1.04, opacity: 0.55 },
  generating: { blur: 1.5, sat: 0.8, scale: 1.02, opacity: 0.85 },
  refining: { blur: 0.5, sat: 0.95, scale: 1.005, opacity: 1 },
  complete: { blur: 0, sat: 1, scale: 1, opacity: 1 },
  error: { blur: 2, sat: 0.5, scale: 1, opacity: 0.28 },
};
const TARGET: Partial<Record<RefineStatus, number>> = {
  queued: 0,
  generating: 0.5,
  refining: 0.875,
  complete: 1,
};
const LEVELS = [48, 32, 20, 12, 8, 5, 3, 2, 1];
const EDGE = 28;
const STRIPS = 14;
const DEFAULT_LABELS: Record<RefineStatus, string> = {
  queued: "Queued",
  generating: "Generating",
  refining: "Refining",
  complete: "Ready",
  error: "Failed",
};
const ACTIVE = new Set<RefineStatus>(["queued", "generating", "refining"]);

type Sim = {
  p: number;
  raf: number;
  last: number;
  key: string;
  w: number;
  h: number;
  // Each mosaic level as a small canvas, enlarged only when shown; null for
  // the sharp level, drawn from the image itself.
  small: (HTMLCanvasElement | null)[];
  img: HTMLImageElement | null;
  crop: [number, number, number, number];
  // Two full-size canvases, reused: the level on screen and the next one.
  // iOS Safari caps the memory canvases may hold, and frees a dropped canvas
  // late, so a frame keeps two and never allocates more.
  slots: { canvas: HTMLCanvasElement; level: number }[];
  glint: CanvasGradient | null;
  sent: boolean;
};

// Gives a canvas's memory back now, rather than whenever it is collected.
const release = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
};

// The full-size picture of one mosaic level, drawn into its slot if the slot
// holds another level.
const level = (s: Sim, i: number) => {
  const slot = s.slots[i % 2];
  if (slot.level !== i) {
    slot.level = i;
    const ctx = slot.canvas.getContext("2d");
    const small = s.small[i];
    if (ctx && small) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, s.w, s.h);
    } else if (ctx && s.img) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(s.img, ...s.crop, 0, 0, s.w, s.h);
    }
  }
  return slot.canvas;
};

const build = (
  s: Sim,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  dpr: number,
) => {
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(1, Math.round(rect.width * dpr));
  const H = Math.max(1, Math.round(rect.height * dpr));
  const key = `${img.currentSrc}|${W}x${H}`;
  if (s.key === key) return;
  s.key = key;
  s.w = W;
  s.h = H;
  canvas.width = W;
  canvas.height = H;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const cover = Math.max(W / iw, H / ih);
  const sw = W / cover;
  const sh = H / cover;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  const glint =
    canvas.getContext("2d")?.createLinearGradient(0, 0, W, 0) ?? null;
  if (glint) {
    for (const [at, a] of [
      [0, 0],
      [0.08, 0.1],
      [0.2, 0.7],
      [0.32, 1],
      [0.68, 1],
      [0.8, 0.7],
      [0.92, 0.1],
      [1, 0],
    ]) {
      glint.addColorStop(at, `rgba(255, 255, 255, ${a})`);
    }
  }
  s.glint = glint;
  s.img = img;
  s.crop = [sx, sy, sw, sh];
  s.small.forEach(release);
  s.small = LEVELS.map((block) => {
    if (block === 1) return null;
    const b = Math.max(2, Math.round(block * dpr));
    const small = document.createElement("canvas");
    small.width = Math.max(1, Math.round(W / b));
    small.height = Math.max(1, Math.round(H / b));
    const sc = small.getContext("2d");
    if (sc) {
      sc.imageSmoothingEnabled = true;
      sc.imageSmoothingQuality = "high";
      sc.drawImage(img, sx, sy, sw, sh, 0, 0, small.width, small.height);
    }
    return small;
  });
  if (!s.slots.length)
    s.slots = [0, 1].map(() => ({
      canvas: document.createElement("canvas"),
      level: -1,
    }));
  for (const slot of s.slots) {
    slot.canvas.width = W;
    slot.canvas.height = H;
    slot.level = -1;
  }
};

export function RefineFrame({
  status = "generating",
  children,
  aspectRatio = "4 / 3",
  width = 320,
  radius = 16,
  background = "var(--neutral-10)",
  color = "var(--neutral-1)",
  stageDuration = 400,
  sweep = true,
  showStatus = true,
  hideAfter = 1200,
  labels = DEFAULT_LABELS,
  retryLabel = "Retry",
  onRetry,
  className = "",
}: {
  status?: RefineStatus;
  children?: React.ReactNode;
  aspectRatio?: string;
  width?: number;
  radius?: number;
  background?: string;
  color?: string;
  stageDuration?: number;
  sweep?: boolean;
  showStatus?: boolean;
  hideAfter?: number;
  labels?: Partial<Record<RefineStatus, string>>;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const stage = STAGES[status] ?? STAGES.generating;
  const active = ACTIVE.has(status);
  const text = { ...DEFAULT_LABELS, ...labels };
  const printRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sim = useRef<Sim>({
    p: 0,
    raf: 0,
    last: 0,
    key: "",
    w: 0,
    h: 0,
    small: [],
    img: null,
    crop: [0, 0, 0, 0],
    slots: [],
    glint: null,
    sent: false,
  });
  const live = useRef({ status, stageDuration, sweep, reduce: false });
  useLayoutEffect(() => {
    Object.assign(live.current, { status, stageDuration, sweep });
  });
  const [mosaic, setMosaic] = useState(false);
  const [resolved, setResolved] = useState(false);

  // The chip fades a moment after completion and comes back with the next
  // stage, so the fade is reset whenever the status changes.
  const [faded, setFaded] = useState(false);
  const [shownFor, setShownFor] = useState(status);
  if (shownFor !== status) {
    setShownFor(status);
    setFaded(false);
  }
  useEffect(() => {
    if (status !== "complete" || hideAfter <= 0) return undefined;
    const timer = setTimeout(() => setFaded(true), hideAfter);
    return () => clearTimeout(timer);
  }, [status, hideAfter]);
  const chip = showStatus && !faded;

  // Kept in a ref so the animation loop can schedule itself without being a
  // dependency of the effects that wake it.
  const tickRef = useRef<(now: number) => void>(() => {});
  useLayoutEffect(() => {
    tickRef.current = (now: number) => {
      const s = sim.current;
      const c = live.current;
      const canvas = canvasRef.current;
      const img = printRef.current?.querySelector("img");
      // A still-loading image (complete is false while its src changes) has
      // nothing to draw yet; drawing it would leave the mosaic blank.
      if (!canvas || !img || !img.complete || !img.naturalWidth) {
        s.raf = 0;
        return;
      }
      const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 0.016);
      s.last = now;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      build(s, canvas, img, dpr);
      const n = LEVELS.length - 1;
      const target = TARGET[c.status] ?? s.p;
      const rate = c.reduce ? 1e9 : 1 / (n * (c.stageDuration / 1000));
      const step = rate * dt;
      if (target < s.p) s.p = target;
      else if (target - s.p <= step) s.p = target;
      else s.p += step;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const L = s.p * n;
        const i = Math.min(n, Math.floor(L + 1e-6));
        const frac = L - i;
        ctx.globalAlpha = 1;
        ctx.drawImage(level(s, i), 0, 0);
        if (i < n && frac > 0) {
          const edge = EDGE * dpr;
          const front = frac * (s.h + edge) - edge / 2;
          const top = Math.max(0, Math.floor(front - edge / 2));
          if (top > 0)
            ctx.drawImage(level(s, i + 1), 0, 0, s.w, top, 0, 0, s.w, top);
          const sh = edge / STRIPS;
          for (let k = 0; k < STRIPS; k += 1) {
            const y = front - edge / 2 + k * sh;
            if (y + sh <= 0 || y >= s.h) continue;
            const t = 1 - (k + 0.5) / STRIPS;
            ctx.globalAlpha = t * t * (3 - 2 * t);
            const y0 = Math.max(0, y);
            const h0 = Math.min(s.h, y + sh) - y0;
            if (h0 > 0)
              ctx.drawImage(level(s, i + 1), 0, y0, s.w, h0, 0, y0, s.w, h0);
          }
          ctx.globalAlpha = 1;
          if (c.sweep && !c.reduce && s.glint && front > 0 && front < s.h) {
            ctx.fillStyle = s.glint;
            ctx.globalAlpha = 0.12;
            ctx.fillRect(0, front - 2 * dpr, s.w, 4 * dpr);
            ctx.globalAlpha = 0.3;
            ctx.fillRect(0, front - dpr, s.w, 2 * dpr);
            ctx.globalAlpha = 1;
          }
        }
      }
      const done = s.p >= 1;
      if (done !== s.sent) {
        s.sent = done;
        setResolved(done);
      }
      // Run until the target is actually reached: stopping just short of 1
      // would leave the frame unresolved and the sharp print never shown.
      const keep = (!c.reduce && ACTIVE.has(c.status)) || s.p !== target;
      s.raf = keep ? requestAnimationFrame((t) => tickRef.current(t)) : 0;
      if (!keep) s.last = 0;
    };
  });
  const wake = () => {
    const s = sim.current;
    if (!s.raf) s.raf = requestAnimationFrame((t) => tickRef.current(t));
  };

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      live.current.reduce = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const img = printRef.current?.querySelector("img");
    if (!img) {
      setMosaic(false);
      return undefined;
    }
    let gone = false;
    const start = () => {
      if (gone) return;
      setMosaic(true);
      wake();
    };
    if (img.complete && img.naturalWidth) start();
    else img.addEventListener("load", start, { once: true });
    return () => {
      gone = true;
      img.removeEventListener("load", start);
    };
  }, [children, status]);

  useEffect(() => {
    wake();
  }, [status, width, aspectRatio]);

  useEffect(() => {
    const s = sim.current;
    // Clearing the id matters: a stale one makes wake() believe a loop is
    // still running, and Strict Mode's remount would then never draw, leaving
    // the print hidden behind a blank mosaic.
    return () => {
      cancelAnimationFrame(s.raf);
      s.raf = 0;
      s.last = 0;
      // Strict Mode remounts with this same state: everything is rebuilt on
      // the next draw, since the key no longer matches.
      s.small.forEach(release);
      s.slots.forEach((slot) => release(slot.canvas));
      s.small = [];
      s.slots = [];
      s.key = "";
    };
  }, []);

  return (
    <div
      className={`refine-frame${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={text[status] ?? status}
      aria-busy={active || undefined}
      data-status={status}
      data-active={active ? "" : undefined}
      data-sweep={sweep && active ? "" : undefined}
      data-mosaic={mosaic ? "" : undefined}
      data-resolved={mosaic && resolved ? "" : undefined}
      style={
        {
          "--rf-w": `${width}px`,
          "--rf-aspect": aspectRatio,
          "--rf-radius": `${radius}px`,
          "--rf-bg": background,
          "--rf-ink": color,
          "--rf-stage": `${stageDuration}ms`,
          "--rf-blur": `${mosaic ? 0 : stage.blur}px`,
          "--rf-sat": stage.sat,
          "--rf-scale": mosaic ? 1 : stage.scale,
          "--rf-opacity": stage.opacity,
        } as React.CSSProperties
      }
    >
      <div className="refine-frame__media" aria-hidden="true">
        <div ref={printRef} className="refine-frame__print">
          {children}
        </div>
        <canvas ref={canvasRef} className="refine-frame__mosaic" />
      </div>
      <div className="refine-frame__sweep" aria-hidden="true" />
      {chip ? (
        <div className="refine-frame__chip" aria-hidden="true">
          <span
            className="refine-frame__mark"
            data-kind={active ? "spin" : status}
          >
            {status === "complete" ? (
              <CheckIcon size={13} strokeWidth={2.5} />
            ) : status === "error" ? (
              <TriangleAlertIcon size={13} strokeWidth={2.2} />
            ) : (
              <Loader2Icon size={13} strokeWidth={2.2} />
            )}
          </span>
          <span key={status} className="refine-frame__label">
            {text[status] ?? status}
          </span>
        </div>
      ) : null}
      {status === "error" && onRetry ? (
        <button type="button" className="refine-frame__retry" onClick={onRetry}>
          <RefreshCwIcon size={14} strokeWidth={2.2} />
          <span>{retryLabel}</span>
        </button>
      ) : null}
      <span className="refine-frame__sr" role="status">
        {text[status] ?? status}
      </span>
    </div>
  );
}
