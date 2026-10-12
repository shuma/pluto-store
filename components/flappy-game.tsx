"use client";
import { useEffect, useRef, useState } from "react";
import { Pointer } from "lucide-react";
import {
  BOARD,
  BoardOverlay,
  buzz,
  fitCanvas,
  usePauseWhenAway,
  type GamePhase,
  type GameProps,
} from "./game-shell";
import {
  FLAPPY,
  createFlappy,
  flap,
  stepFlappy,
  type FlappyState,
} from "@/lib/games/flappy";

/* ─────────────────────────────────────────────────────────
 * FLAPPY
 *
 * Physics steps at a fixed 120 per second (lib/games/flappy), drawn every
 * frame in the page's own colours: ink pipes on a paper sky.
 *
 *   ready    bird bobs mid-air, wings beating, ground scrolling
 *   tap      first tap starts and flaps; every tap after flaps
 *   flap     bird tilts up, a puff of feathers drifts off behind
 *   fall     bird noses down the faster it falls
 *   pass     score in the sky ticks up
 *   crash    white flash, board shakes, bird drops to the ground,
 *            score card fades in once it lands
 * ───────────────────────────────────────────────────────── */
const DT = 1 / 120;
const TIMING = {
  flash: 160,
  shake: 320,
  puff: 380,
  // Taps right after a crash are the flap that crashed, not a new game.
  restartGuard: 600,
};
export const BIRD = {
  body: "#f6b913",
  belly: "#ffe08a",
  wing: "#fff4cf",
  beak: "#ff7a1a",
  // Outline for the bird drawn off the board (the invitation), where the
  // page ink may be light.
  ink: "#1c1a17",
};

type Puff = { x: number; y: number; born: number; drift: number };
type Sim = {
  s: FlappyState;
  carry: number;
  diedAt: number;
  flappedAt: number;
  puffs: Puff[];
};
const fresh = (): Sim => ({
  s: createFlappy(Math.random),
  carry: 0,
  diedAt: 0,
  flappedAt: 0,
  puffs: [],
});

export function FlappyGame({ paused, heldOverlay, best, onScore }: GameProps) {
  const board = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim | null>(null);
  const phaseRef = useRef<GamePhase>("ready");
  const pausedRef = useRef(paused);
  const onScoreRef = useRef(onScore);
  const bestAtStart = useRef(best);
  const [phase, setPhaseState] = useState<GamePhase>("ready");
  const [result, setResult] = useState({ score: 0, newBest: false });
  const setPhase = (next: GamePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  };
  useEffect(() => {
    pausedRef.current = paused;
    onScoreRef.current = onScore;
  });

  const doFlap = () => {
    const g = (sim.current ??= fresh());
    g.s = flap(g.s);
    g.flappedAt = performance.now();
    g.puffs.push(
      ...[0, 1, 2].map((i) => ({
        x: FLAPPY.birdX - FLAPPY.radius * 0.8,
        y: g.s.y + (i - 1) * FLAPPY.radius * 0.5,
        born: g.flappedAt,
        drift: 0.4 + Math.random() * 0.5,
      })),
    );
  };
  const start = () => {
    sim.current = fresh();
    bestAtStart.current = best;
    onScore(0);
    setPhase("running");
    doFlap();
  };
  // Tap, click, space or up: whatever the phase, the one action.
  const act = () => {
    if (pausedRef.current) return;
    const now = phaseRef.current;
    if (now === "ready") start();
    else if (now === "over") {
      if (performance.now() - (sim.current?.diedAt ?? 0) > TIMING.restartGuard)
        start();
    } else {
      if (now === "paused") setPhase("running");
      doFlap();
    }
  };
  const actRef = useRef(act);
  useEffect(() => {
    actRef.current = act;
  });

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    sim.current ??= fresh();
    let frame = 0,
      last = performance.now();
    const tick = (now: number) => {
      const g = sim.current!;
      const dt = Math.min(now - last, 250) / 1000;
      last = now;
      const phase = phaseRef.current;
      if (phase === "running" && !pausedRef.current) {
        g.carry += dt;
        while (g.carry >= DT) {
          g.carry -= DT;
          const r = stepFlappy(g.s, DT, Math.random);
          g.s = r.state;
          if (r.scored) {
            buzz(6);
            onScoreRef.current(r.state.score);
          }
          if (r.dead) {
            g.diedAt = now;
            g.carry = 0;
            buzz(40);
            setResult({
              score: g.s.score,
              newBest: g.s.score > bestAtStart.current,
            });
            setPhase("over");
            break;
          }
        }
      } else if (phase === "over") {
        // The crash plays out: the bird drops to the ground and stays.
        const floor = FLAPPY.ground - FLAPPY.radius;
        const vy = Math.min(g.s.vy + FLAPPY.gravity * dt * 1.4, 1.6);
        g.s = { ...g.s, vy, y: Math.min(g.s.y + vy * dt, floor) };
      } else if (phase === "ready") {
        g.s = { ...g.s, distance: g.s.distance + FLAPPY.speed * dt };
      }
      draw(ctx, el, g, now, phase);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const unfit = fitCanvas(el);
    board.current?.focus({ preventScroll: true });
    return () => {
      cancelAnimationFrame(frame);
      unfit();
    };
  }, []);

  usePauseWhenAway(() => {
    if (phaseRef.current === "running") setPhase("paused");
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (!e.repeat) actRef.current();
      } else if (e.key.toLowerCase() === "p") {
        if (phaseRef.current === "running") setPhase("paused");
        else if (phaseRef.current === "paused") setPhase("running");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={board}
      tabIndex={-1}
      role="application"
      aria-label="Flappy. Tap, or press space, to flap."
      className={BOARD}
      // On press, not release: a flap that waits for the finger to lift
      // feels late.
      onPointerDown={act}
    >
      <canvas ref={canvas} className="block size-full" />
      <BoardOverlay
        phase={phase}
        held={paused}
        heldOverlay={heldOverlay}
        howTo={<HowToPlay />}
        result={result}
        unit={["pipe", "pipes"]}
        onAgain={start}
      />
    </div>
  );
}

const KEYCAP =
  "grid h-8 w-28 place-items-center rounded-md bg-background text-xs font-medium text-muted-foreground ring-1 ring-border [animation:key-press_1.1s_ease-in-out_infinite]";
function HowToPlay() {
  return (
    <>
      <div className="[@media(hover:hover)]:hidden">
        <div className="relative mx-auto grid size-20 place-items-center">
          <span
            className="absolute size-12 rounded-full ring-2 ring-foreground [animation:tap-ripple_1.1s_ease-out_infinite]"
            aria-hidden
          />
          <Pointer
            className="relative mt-6 ml-3 size-9 fill-background text-foreground drop-shadow-sm [animation:tap-hand_1.1s_ease-in-out_infinite]"
            strokeWidth={1.6}
            aria-hidden
          />
        </div>
        <p className="mt-1 font-semibold">Tap to flap</p>
      </div>
      <div className="hidden [@media(hover:hover)]:block">
        <div className="mx-auto w-fit py-2" aria-hidden>
          <span className={KEYCAP}>space</span>
        </div>
        <p className="mt-1 font-semibold">Press space to flap</p>
      </div>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        Fly through the gaps. Don’t touch the pipes or the ground.
      </p>
    </>
  );
}

function draw(
  ctx: CanvasRenderingContext2D,
  el: HTMLCanvasElement,
  g: Sim,
  now: number,
  phase: GamePhase,
) {
  const W = el.width;
  const css = getComputedStyle(el);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const ink = token("--foreground");
  const paper = token("--background");
  const shell = token("--paper-shell");
  const { s } = g;
  const groundY = FLAPPY.ground * W;

  ctx.save();
  if (g.diedAt) {
    const k = (now - g.diedAt) / TIMING.shake;
    if (k < 1) {
      const a = (1 - k) * W * 0.012;
      ctx.translate((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a);
    }
  }

  // Sky, deepening a touch towards the top.
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, shell);
  sky.addColorStop(1, paper);
  ctx.fillStyle = sky;
  ctx.fillRect(-W, -W, W * 3, W * 3);

  // Clouds drift at a quarter of the pipes' pace, so the sky has depth.
  ctx.fillStyle = paper;
  for (const [i, cx] of [0.1, 0.55, 0.95, 1.35].entries()) {
    const x = ((((cx - s.distance * 0.25) % 1.6) + 1.6) % 1.6) - 0.3;
    const y = 0.12 + (i % 2) * 0.14;
    const r = 0.045 + (i % 3) * 0.01;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(x * W, y * W, r * W, 0, Math.PI * 2);
    ctx.arc((x + r * 1.1) * W, (y + r * 0.25) * W, r * 0.8 * W, 0, Math.PI * 2);
    ctx.arc((x - r * 1.0) * W, (y + r * 0.3) * W, r * 0.7 * W, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Pipes: ink columns with a lip at the opening and a soft highlight.
  const pw = FLAPPY.pipeWidth * W;
  const lipH = W * 0.04;
  const lipOut = pw * 0.1;
  for (const p of s.pipes) {
    const x = p.x * W;
    const top = (p.gapY - p.gapSize / 2) * W;
    const bottom = (p.gapY + p.gapSize / 2) * W;
    ctx.fillStyle = ink;
    ctx.fillRect(x, -W, pw, top + W);
    ctx.fillRect(x, bottom, pw, groundY - bottom);
    ctx.beginPath();
    ctx.roundRect(x - lipOut, top - lipH, pw + lipOut * 2, lipH, lipH * 0.25);
    ctx.roundRect(x - lipOut, bottom, pw + lipOut * 2, lipH, lipH * 0.25);
    ctx.fill();
    ctx.fillStyle = paper;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(x + pw * 0.16, -W, pw * 0.12, top - lipH + W);
    ctx.fillRect(
      x + pw * 0.16,
      bottom + lipH,
      pw * 0.12,
      groundY - bottom - lipH,
    );
    ctx.globalAlpha = 1;
  }

  // Ground, its stripes scrolling with the pipes.
  ctx.fillStyle = shell;
  ctx.fillRect(-W, groundY, W * 3, W);
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.07;
  const stripe = W * 0.05;
  const off = -((s.distance * W) % stripe);
  for (let x = off - stripe; x < W + stripe; x += stripe) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x + stripe * 0.5, groundY);
    ctx.lineTo(x + stripe * 0.2, groundY + W * 0.03);
    ctx.lineTo(x - stripe * 0.3, groundY + W * 0.03);
    ctx.fill();
  }
  ctx.globalAlpha = 0.18;
  ctx.fillRect(-W, groundY - W * 0.004, W * 3, W * 0.006);
  ctx.globalAlpha = 1;

  // Feathers from the last flaps.
  g.puffs = g.puffs.filter((p) => now - p.born < TIMING.puff);
  for (const p of g.puffs) {
    const k = (now - p.born) / TIMING.puff;
    ctx.globalAlpha = 0.6 * (1 - k);
    ctx.fillStyle = BIRD.wing;
    ctx.strokeStyle = ink;
    ctx.lineWidth = W * 0.003;
    ctx.beginPath();
    ctx.arc(
      (p.x - k * 0.06 * p.drift) * W,
      (p.y + k * 0.03) * W,
      FLAPPY.radius * 0.28 * (1 - k * 0.5) * W,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // The bird, bobbing on a resting board.
  const y = phase === "ready" ? s.y + Math.sin(now / 300) * 0.012 : s.y;
  drawBird(ctx, FLAPPY.birdX * W, y * W, FLAPPY.radius * W, {
    ink,
    tilt:
      phase === "ready"
        ? 0
        : Math.max(-0.45, Math.min(s.vy * 1.1, g.diedAt ? 1.5 : 1.25)),
    // Wings beat while climbing or resting, and fold in a dive.
    wing:
      g.diedAt || (phase !== "ready" && s.vy > 0.5)
        ? 0.2
        : Math.sin(now / 55) * 0.6,
    dead: Boolean(g.diedAt),
  });

  // The score, big in the sky, while flying.
  if (phase === "running" || phase === "paused") {
    ctx.font = `700 ${W * 0.11}px ${css.fontFamily}`;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.lineWidth = W * 0.012;
    ctx.strokeStyle = ink;
    ctx.fillStyle = paper;
    ctx.strokeText(String(s.score), W / 2, W * 0.17);
    ctx.fillText(String(s.score), W / 2, W * 0.17);
  }

  // The flash of the crash.
  if (g.diedAt && now - g.diedAt < TIMING.flash) {
    ctx.globalAlpha = 0.85 * (1 - (now - g.diedAt) / TIMING.flash);
    ctx.fillStyle = paper;
    ctx.fillRect(-W, -W, W * 3, W * 3);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  R: number,
  o: { ink: string; tilt: number; wing: number; dead: boolean },
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.tilt);
  ctx.lineWidth = R * 0.14;
  ctx.strokeStyle = o.ink;
  ctx.lineJoin = "round";

  // Body and belly, outlined together.
  ctx.fillStyle = BIRD.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 1.15, R, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = BIRD.belly;
  ctx.beginPath();
  ctx.ellipse(R * 0.05, R * 0.55, R * 0.8, R * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 1.15, R, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Beak.
  ctx.fillStyle = BIRD.beak;
  ctx.beginPath();
  ctx.moveTo(R * 0.8, -R * 0.12);
  ctx.quadraticCurveTo(R * 1.75, R * 0.05, R * 0.8, R * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye: wide and white, or crossed out.
  const ex = R * 0.42,
    ey = -R * 0.32;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(ex, ey, R * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (o.dead) {
    const k = R * 0.16;
    ctx.lineWidth = R * 0.12;
    ctx.beginPath();
    ctx.moveTo(ex - k, ey - k);
    ctx.lineTo(ex + k, ey + k);
    ctx.moveTo(ex + k, ey - k);
    ctx.lineTo(ex - k, ey + k);
    ctx.stroke();
  } else {
    ctx.fillStyle = o.ink;
    ctx.beginPath();
    ctx.arc(ex + R * 0.13, ey + R * 0.02, R * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wing, beating about its shoulder.
  ctx.lineWidth = R * 0.14;
  ctx.save();
  ctx.translate(-R * 0.3, R * 0.05);
  ctx.rotate(o.wing);
  ctx.fillStyle = BIRD.wing;
  ctx.beginPath();
  ctx.ellipse(-R * 0.15, 0, R * 0.55, R * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
