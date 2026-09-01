import { describe, expect, it } from "vite-plus/test";
import { PROBLEMS } from "../data/problems.ts";
import { createEngineState, handleKey, visibleTyping } from "../lib/engine.ts";
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

function typeAll(problem: Problem, keys: string) {
  let state = createEngineState();
  const events = [];
  for (const key of keys) {
    const event = handleKey(state, problem, key);
    events.push(event);
    if (event.type === "ignore") continue;
    state = event.state;
  }
  return { state, events };
}

function longProblem(id: string, display: string, parts: string[]): Problem {
  const chars = [...display];
  return {
    id,
    mode: "long",
    source: "test",
    displayText: display,
    typingText: parts.join(""),
    segments: chars.map((displayChar, index) => ({ display: displayChar, typing: parts[index]! })),
  };
}

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
    expect(miss.state.typed).toBe("");
    expect(miss.state.perfectEligible).toBe(false);
    expect(miss.state.score).toBe(0);
    expect(miss.delta).toBe(-100);
  });

  it("gives finish and Perfect bonuses after combo increments", () => {
    const first = handleKey(createEngineState(), long, "a");
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

describe("long-text romaji alternatives", () => {
  const fu = longProblem("fu", "ふ。", ["fu", "."]);
  const ji = longProblem("ji", "じ。", ["ji", "."]);
  const shi = longProblem("shi", "し。", ["shi", "."]);
  const futari = longProblem("futari", "二人", ["futa", "ri"]);

  it("accepts fu and hu for ふ", () => {
    expect(typeAll(fu, "fu.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(fu, "hu.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(fu, "fu.").state.correctCount).toBe(3);
    expect(typeAll(fu, "hu.").state.correctCount).toBe(3);
  });

  it("accepts ji and zi for じ", () => {
    expect(typeAll(ji, "ji.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(ji, "zi.").events.at(-1)?.type).toBe("complete");
  });

  it("accepts shi and si for し, and counts actual keys", () => {
    expect(typeAll(shi, "shi.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(shi, "si.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(shi, "shi.").state.correctCount).toBe(4);
    expect(typeAll(shi, "si.").state.correctCount).toBe(3);
  });

  it("accepts futari and hutari, and rewrites the remaining romaji", () => {
    expect(typeAll(futari, "futari").events.at(-1)?.type).toBe("complete");
    expect(typeAll(futari, "hutari").events.at(-1)?.type).toBe("complete");

    const afterH = handleKey(createEngineState(), futari, "h");
    expect(afterH.type).toBe("correct");
    if (afterH.type !== "correct") return;
    expect(visibleTyping(futari, afterH.state)).toBe("hutari");
    expect(visibleTyping(futari, afterH.state)[afterH.state.typingIndex]).toBe("u");
  });

  it("accepts wo and o for を, n/nn/n' for ん, and xtu for っ", () => {
    const wo = longProblem("wo", "を。", ["o", "."]);
    const n = longProblem("n", "ん。", ["n", "."]);
    const sokuon = longProblem("xtu", "った", ["t", "ta"]);
    expect(typeAll(wo, "o.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(wo, "wo.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(n, "n.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(n, "nn.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(n, "n'.").events.at(-1)?.type).toBe("complete");
    expect(typeAll(sokuon, "tta").events.at(-1)?.type).toBe("complete");
    expect(typeAll(sokuon, "xtuta").events.at(-1)?.type).toBe("complete");
  });

  it("treats a wrong key as a miss", () => {
    const miss = handleKey(createEngineState(), fu, "x");
    expect(miss.type).toBe("miss");
    if (miss.type !== "miss") return;
    expect(miss.state.combo).toBe(0);
    expect(miss.state.displayIndex).toBe(0);
    expect(miss.state.typed).toBe("");
  });

  it("keeps coding mode as exact one-character match", () => {
    const first = handleKey(createEngineState(), code, "a");
    expect(first.type).toBe("correct");
    if (first.type !== "correct") return;
    expect(first.state.displayIndex).toBe(1);
    expect(handleKey(first.state, code, "x").type).toBe("miss");
    expect(handleKey(createEngineState(), code, "b").type).toBe("miss");
  });

  it("completes every shipped long problem along its canonical romaji", () => {
    const failed: string[] = [];
    for (const problem of PROBLEMS.filter((item) => item.mode === "long")) {
      const { events, state } = typeAll(problem, problem.typingText);
      const last = events.at(-1);
      if (last?.type !== "complete" || state.displayIndex !== [...problem.displayText].length) {
        failed.push(problem.id);
      }
    }
    expect(failed).toEqual([]);
  });
});
