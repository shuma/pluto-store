import { describe, expect, it } from "vitest";
import {
  FLAPPY,
  createFlappy,
  flap,
  stepFlappy,
  type FlappyState,
} from "@/lib/games/flappy";

const mid = () => 0.5;
const DT = 1 / 120;
// A sky with one far-off pipe, so only the bird's own motion matters.
const open = (patch: Partial<FlappyState> = {}): FlappyState => ({
  ...createFlappy(mid),
  pipes: [{ x: 5, gapY: 0.4, gapSize: 0.3, scored: false }],
  ...patch,
});
const run = (s: FlappyState, seconds: number) => {
  let r = { state: s, scored: false, dead: false };
  for (let t = 0; t < seconds && !r.dead; t += DT)
    r = stepFlappy(r.state, DT, mid);
  return r;
};

describe("flappy", () => {
  it("falls under gravity", () => {
    const s = open();
    const { state } = stepFlappy(s, 0.1, mid);
    expect(state.y).toBeGreaterThan(s.y);
    expect(state.vy).toBeGreaterThan(0);
  });

  it("rises after a flap", () => {
    const s = open();
    expect(stepFlappy(flap(s), DT, mid).state.y).toBeLessThan(s.y);
  });

  it("dies on the ground", () => {
    expect(run(open(), 3).dead).toBe(true);
    expect(run(open(), 3).state.y).toBeGreaterThan(FLAPPY.ground - 0.1);
  });

  it("bumps the sky without dying", () => {
    const s = open({ y: FLAPPY.radius + 0.001, vy: -1 });
    const { state, dead } = stepFlappy(s, 0.05, mid);
    expect(dead).toBe(false);
    expect(state.y).toBe(FLAPPY.radius);
    expect(state.vy).toBeGreaterThanOrEqual(0);
  });

  it("dies flying into a pipe", () => {
    const s = open({
      y: 0.1,
      pipes: [
        { x: FLAPPY.birdX + 0.01, gapY: 0.5, gapSize: 0.2, scored: false },
      ],
    });
    expect(stepFlappy(s, DT, mid).dead).toBe(true);
  });

  it("scores once for each pipe it clears", () => {
    const s = open({
      y: 0.5,
      vy: 0,
      pipes: [
        {
          x: FLAPPY.birdX - FLAPPY.pipeWidth + 0.001,
          gapY: 0.5,
          gapSize: 0.5,
          scored: false,
        },
      ],
    });
    const one = stepFlappy(s, DT, mid);
    expect(one.scored).toBe(true);
    expect(one.state.score).toBe(1);
    const two = stepFlappy(one.state, DT, mid);
    expect(two.scored).toBe(false);
    expect(two.state.score).toBe(1);
  });

  it("keeps pipes coming, evenly spaced", () => {
    let s = createFlappy(mid);
    for (let i = 0; i < 2000; i++) s = flap(stepFlappy(s, DT, mid).state);
    expect(s.pipes.length).toBeGreaterThan(1);
    for (let i = 1; i < s.pipes.length; i++)
      expect(s.pipes[i].x - s.pipes[i - 1].x).toBeCloseTo(FLAPPY.spacing);
  });
});
