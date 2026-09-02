import { describe, expect, it } from "vite-plus/test";
import { createEngineState, handleKey } from "../lib/engine.ts";
import { acceptTypingKeydown, releaseTypingKey } from "../lib/held-keys.ts";
import type { Problem } from "../lib/types.ts";

const longDoubleA: Problem = {
  id: "t-aa",
  mode: "long",
  source: "test",
  displayText: "ああ。",
  typingText: "aa.",
  segments: [
    { display: "あ", typing: "a" },
    { display: "あ", typing: "a" },
    { display: "。", typing: "." },
  ],
};

const codeDoubleA: Problem = {
  id: "c-aa",
  mode: "code",
  source: "JSより",
  displayText: "aa",
  typingText: "aa",
  segments: null,
};

type PlayStroke =
  | { type: "down"; key: string; repeat?: boolean; code?: string }
  | { type: "up"; key: string; code?: string };

function play(problem: Problem, strokes: PlayStroke[]) {
  let state = createEngineState();
  const held = new Set<string>();
  const events = [];
  for (const stroke of strokes) {
    if (stroke.type === "up") {
      releaseTypingKey(stroke, held);
      continue;
    }
    if (!acceptTypingKeydown(stroke, held)) continue;
    const event = handleKey(state, problem, stroke.key);
    events.push(event);
    if (event.type === "ignore") continue;
    state = event.state;
  }
  return { state, events };
}

describe("held keys", () => {
  it("rejects OS key repeat until keyup", () => {
    const held = new Set<string>();
    expect(acceptTypingKeydown({ key: "a", repeat: false }, held)).toBe(true);
    expect(acceptTypingKeydown({ key: "a", repeat: true }, held)).toBe(false);
    expect(acceptTypingKeydown({ key: "a", repeat: false }, held)).toBe(false);
    releaseTypingKey({ key: "a" }, held);
    expect(acceptTypingKeydown({ key: "a", repeat: false }, held)).toBe(true);
  });

  it("does not advance long mode on repeat, then advances after keyup", () => {
    const held = play(longDoubleA, [
      { type: "down", key: "a" },
      { type: "down", key: "a", repeat: true },
      { type: "down", key: "a", repeat: true },
    ]);
    expect(held.state.typingIndex).toBe(1);
    expect(held.state.displayIndex).toBe(1);
    expect(held.events).toHaveLength(1);

    const released = play(longDoubleA, [
      { type: "down", key: "a" },
      { type: "down", key: "a", repeat: true },
      { type: "up", key: "a" },
      { type: "down", key: "a" },
    ]);
    expect(released.state.typingIndex).toBe(2);
    expect(released.state.displayIndex).toBe(2);
    expect(released.events.map((event) => event.type)).toEqual(["correct", "correct"]);
  });

  it("does not advance coding mode on repeat, then advances after keyup", () => {
    const held = play(codeDoubleA, [
      { type: "down", key: "a" },
      { type: "down", key: "a", repeat: true },
    ]);
    expect(held.state.typingIndex).toBe(1);
    expect(held.events).toHaveLength(1);

    const released = play(codeDoubleA, [
      { type: "down", key: "a" },
      { type: "down", key: "a", repeat: true },
      { type: "up", key: "a" },
      { type: "down", key: "a" },
    ]);
    expect(released.state.typingIndex).toBe(2);
    expect(released.events.map((event) => event.type)).toEqual(["correct", "complete"]);
  });
});
