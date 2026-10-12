// Flappy Bird as pure state: no DOM, no timers. The world is the unit
// square, y pointing down, so the canvas only scales it to its size.
export const FLAPPY = {
  birdX: 0.3,
  radius: 0.036,
  // Collisions use a slightly smaller bird than the one drawn: a graze that
  // looks like a miss counts as one.
  hitbox: 0.8,
  gravity: 2.4, // per second²
  lift: -0.74, // the speed a flap sets, per second
  maxFall: 1.25,
  speed: 0.3, // pipes, per second
  pipeWidth: 0.15,
  // Space between pipes, and the opening in each: it narrows as you go.
  spacing: 0.58,
  gap: 0.3,
  minGap: 0.235,
  ground: 0.86,
  // The first pipe comes in from off screen, giving time to find the rhythm.
  firstPipe: 1.25,
};

export type Pipe = {
  x: number;
  gapY: number;
  gapSize: number;
  scored: boolean;
};
export type FlappyState = {
  y: number;
  vy: number;
  pipes: Pipe[];
  score: number;
  // How far the world has scrolled, for the ground and the clouds.
  distance: number;
};

export const gapFor = (score: number) =>
  Math.max(FLAPPY.minGap, FLAPPY.gap - score * 0.004);

// Openings sit anywhere that leaves a little pipe above and below them.
function pipeAt(x: number, score: number, rng: () => number): Pipe {
  const gapSize = gapFor(score);
  const margin = 0.07 + gapSize / 2;
  return {
    x,
    gapY: margin + rng() * (FLAPPY.ground - margin * 2),
    gapSize,
    scored: false,
  };
}

export function createFlappy(rng: () => number): FlappyState {
  return {
    y: 0.42,
    vy: 0,
    pipes: [pipeAt(FLAPPY.firstPipe, 0, rng)],
    score: 0,
    distance: 0,
  };
}

export const flap = (s: FlappyState): FlappyState => ({
  ...s,
  vy: FLAPPY.lift,
});

export function stepFlappy(
  s: FlappyState,
  dt: number,
  rng: () => number,
): { state: FlappyState; scored: boolean; dead: boolean } {
  const vy = Math.min(s.vy + FLAPPY.gravity * dt, FLAPPY.maxFall);
  let y = s.y + vy * dt;
  // The sky is a ceiling, not a wall: the bird bumps it and falls back.
  const top = FLAPPY.radius;
  const capped = y < top;
  if (capped) y = top;
  const shift = FLAPPY.speed * dt;
  let scored = false;
  let score = s.score;
  const pipes = s.pipes
    .map((p) => {
      const moved = { ...p, x: p.x - shift };
      if (!moved.scored && moved.x + FLAPPY.pipeWidth < FLAPPY.birdX) {
        moved.scored = true;
        scored = true;
        score += 1;
      }
      return moved;
    })
    .filter((p) => p.x + FLAPPY.pipeWidth > -0.2);
  const last = pipes.at(-1);
  if (!last || last.x < 1 + 0.2 - FLAPPY.spacing)
    pipes.push(pipeAt((last?.x ?? 1) + FLAPPY.spacing, score, rng));
  const r = FLAPPY.radius * FLAPPY.hitbox;
  const hitPipe = pipes.some(
    (p) =>
      FLAPPY.birdX + r > p.x &&
      FLAPPY.birdX - r < p.x + FLAPPY.pipeWidth &&
      (y - r < p.gapY - p.gapSize / 2 || y + r > p.gapY + p.gapSize / 2),
  );
  const dead = hitPipe || y + r >= FLAPPY.ground;
  return {
    state: {
      y,
      vy: capped ? Math.max(vy, 0) : vy,
      pipes,
      score,
      distance: s.distance + shift,
    },
    scored,
    dead,
  };
}
