import { describe, expect, it } from "vite-plus/test";
import { applyGain, applyPenalty, comboMultiplier, ratePercent } from "../lib/score.ts";

describe("comboMultiplier", () => {
  it("starts at 1.0 and caps at 1.5", () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(1)).toBe(1.1);
    expect(comboMultiplier(5)).toBe(1.5);
    expect(comboMultiplier(9)).toBe(1.5);
  });
});

describe("score math", () => {
  it("matches the spec example for a 40-character perfect long text", () => {
    let score = 0;
    for (let i = 0; i < 40; i += 1) {
      score = applyGain(score, 100, 0).score;
    }
    score = applyGain(score, 1000, 1).score;
    score = applyGain(score, 1000, 1).score;
    expect(score).toBe(6200);
  });

  it("rounds gains and never goes below 0", () => {
    expect(applyGain(0, 100, 1).delta).toBe(110);
    expect(applyPenalty(200, 500)).toEqual({ score: 0, delta: -200 });
  });

  it("returns 0% when there are no inputs", () => {
    expect(ratePercent(0, 0)).toBe(0);
    expect(ratePercent(1, 3)).toBe(33.3);
  });
});
