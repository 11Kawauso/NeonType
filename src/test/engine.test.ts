import { describe, expect, it } from "vite-plus/test";
import { createEngineState, handleKey } from "../lib/engine.ts";
import type { Problem } from "../lib/types.ts";

const long: Problem = {
  id: "t1",
  mode: "long",
  source: "test",
  displayText: "あ。",
  typingText: "a.",
  segments: [
    { display: "あ", typing: "a" },
    { display: "。", typing: "." },
  ],
};

const code: Problem = {
  id: "c1",
  mode: "code",
  source: "JSより",
  displayText: "ab",
  typingText: "ab",
  segments: null,
};

describe("typing engine", () => {
  it("advances one key and one Japanese character together", () => {
    const result = handleKey(createEngineState(), long, "a");
    expect(result.type).toBe("correct");
    if (result.type !== "correct") return;
    expect(result.state.typingIndex).toBe(1);
    expect(result.state.displayIndex).toBe(1);
    expect(result.displayAdvanced).toBe(true);
    expect(result.state.score).toBe(100);
  });

  it("resets progress and combo on miss, and marks Perfect ineligible", () => {
    const afterHit = handleKey(createEngineState(), long, "a");
    expect(afterHit.type).toBe("correct");
    if (afterHit.type !== "correct") return;
    const miss = handleKey(afterHit.state, long, "x");
    expect(miss.type).toBe("miss");
    if (miss.type !== "miss") return;
    expect(miss.state.combo).toBe(0);
    expect(miss.state.typingIndex).toBe(0);
    expect(miss.state.displayIndex).toBe(0);
    expect(miss.state.perfectEligible).toBe(false);
    expect(miss.state.score).toBe(0);
    expect(miss.delta).toBe(-100);
  });

  it("gives finish and Perfect bonuses after combo increments", () => {
    let state = createEngineState();
    const first = handleKey(state, long, "a");
    expect(first.type).toBe("correct");
    if (first.type !== "correct") return;
    const done = handleKey(first.state, long, ".");
    expect(done.type).toBe("complete");
    if (done.type !== "complete") return;
    expect(done.perfect).toBe(true);
    expect(done.state.combo).toBe(1);
    expect(done.state.perfectCount).toBe(1);
    expect(done.state.score).toBe(200 + 1100 + 1100);
  });

  it("does not award Perfect after a miss on that problem", () => {
    const miss = handleKey(createEngineState(), code, "x");
    expect(miss.type).toBe("miss");
    if (miss.type !== "miss") return;
    const a = handleKey(miss.state, code, "a");
    expect(a.type).toBe("correct");
    if (a.type !== "correct") return;
    const done = handleKey(a.state, code, "b");
    expect(done.type).toBe("complete");
    if (done.type !== "complete") return;
    expect(done.perfect).toBe(false);
    expect(done.state.perfectCount).toBe(0);
  });
});
