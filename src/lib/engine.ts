import { progressFor } from "./romaji.ts";
import { applyGain, applyPenalty } from "./score.ts";
import type { Problem } from "./types.ts";

export type EngineState = {
  typingIndex: number;
  displayIndex: number;
  typed: string;
  combo: number;
  maxCombo: number;
  score: number;
  perfectEligible: boolean;
  correctCount: number;
  missCount: number;
  perfectCount: number;
};

export type KeyEvent =
  | { type: "ignore" }
  | { type: "correct"; state: EngineState; delta: number; displayAdvanced: boolean }
  | {
      type: "complete";
      state: EngineState;
      delta: number;
      perfect: boolean;
    }
  | { type: "miss"; state: EngineState; delta: number };

export function createEngineState(): EngineState {
  return {
    typingIndex: 0,
    displayIndex: 0,
    typed: "",
    combo: 0,
    maxCombo: 0,
    score: 0,
    perfectEligible: true,
    correctCount: 0,
    missCount: 0,
    perfectCount: 0,
  };
}

export function resetProblemProgress(state: EngineState): EngineState {
  return { ...state, typingIndex: 0, displayIndex: 0, typed: "", perfectEligible: true };
}

export function visibleTyping(problem: Problem, state: EngineState): string {
  if (problem.mode !== "long" || !problem.segments) return problem.typingText;
  return progressFor(problem, state.typed)?.visible ?? problem.typingText;
}

export function expectedChar(problem: Problem, state: EngineState): string | null {
  if (problem.mode === "code" || !problem.segments) {
    return problem.typingText[state.typingIndex] ?? null;
  }
  const visible = visibleTyping(problem, state);
  return visible[state.typingIndex] ?? null;
}

function missEvent(state: EngineState, problem: Problem): KeyEvent {
  const penalty = problem.mode === "long" ? 500 : 300;
  const scored = applyPenalty(state.score, penalty);
  const next: EngineState = {
    ...state,
    score: scored.score,
    combo: 0,
    missCount: state.missCount + 1,
    typingIndex: 0,
    displayIndex: 0,
    typed: "",
    perfectEligible: false,
  };
  return { type: "miss", state: next, delta: scored.delta };
}

function applyDisplayGains(
  score: number,
  count: number,
  points: number,
  combo: number,
): { score: number; delta: number } {
  let next = score;
  let delta = 0;
  for (let i = 0; i < count; i += 1) {
    const gained = applyGain(next, points, combo);
    next = gained.score;
    delta += gained.delta;
  }
  return { score: next, delta };
}

function handleCodeKey(state: EngineState, problem: Problem, key: string): KeyEvent {
  const expected = problem.typingText[state.typingIndex];
  if (expected === undefined) return { type: "ignore" };
  if (key.length !== 1) return { type: "ignore" };
  if (key !== expected) return missEvent(state, problem);

  const typingIndex = state.typingIndex + 1;
  const displayIndex = state.displayIndex + 1;
  const afterChar = applyGain(state.score, 50, state.combo);
  const finished = typingIndex >= problem.typingText.length;
  if (!finished) {
    const next: EngineState = {
      ...state,
      typingIndex,
      displayIndex,
      typed: state.typed + key,
      score: afterChar.score,
      correctCount: state.correctCount + 1,
    };
    return { type: "correct", state: next, delta: afterChar.delta, displayAdvanced: true };
  }

  const combo = state.combo + 1;
  const afterFinish = applyGain(afterChar.score, 1000, combo);
  const perfect = state.perfectEligible;
  const afterPerfect = perfect ? applyGain(afterFinish.score, 1000, combo) : afterFinish;
  const next: EngineState = {
    ...state,
    typingIndex,
    displayIndex,
    typed: state.typed + key,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    score: afterPerfect.score,
    correctCount: state.correctCount + 1,
    perfectCount: state.perfectCount + (perfect ? 1 : 0),
    perfectEligible: true,
  };
  return {
    type: "complete",
    state: next,
    delta: afterPerfect.score - state.score,
    perfect,
  };
}

function handleLongKey(state: EngineState, problem: Problem, key: string): KeyEvent {
  if (key.length !== 1) return { type: "ignore" };
  const current = progressFor(problem, state.typed);
  if (current?.complete) return { type: "ignore" };

  const typed = state.typed + key;
  const progress = progressFor(problem, typed);
  if (!progress) return missEvent(state, problem);

  const gainedChars = progress.displayIndex - state.displayIndex;
  const afterChar = applyDisplayGains(state.score, gainedChars, 100, state.combo);
  if (!progress.complete) {
    const next: EngineState = {
      ...state,
      typed,
      typingIndex: typed.length,
      displayIndex: progress.displayIndex,
      score: afterChar.score,
      correctCount: state.correctCount + 1,
    };
    return {
      type: "correct",
      state: next,
      delta: afterChar.delta,
      displayAdvanced: gainedChars > 0,
    };
  }

  const combo = state.combo + 1;
  const afterFinish = applyGain(afterChar.score, 1000, combo);
  const perfect = state.perfectEligible;
  const afterPerfect = perfect ? applyGain(afterFinish.score, 1000, combo) : afterFinish;
  const next: EngineState = {
    ...state,
    typed,
    typingIndex: typed.length,
    displayIndex: progress.displayIndex,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    score: afterPerfect.score,
    correctCount: state.correctCount + 1,
    perfectCount: state.perfectCount + (perfect ? 1 : 0),
    perfectEligible: true,
  };
  return {
    type: "complete",
    state: next,
    delta: afterPerfect.score - state.score,
    perfect,
  };
}

export function handleKey(state: EngineState, problem: Problem, key: string): KeyEvent {
  if (problem.mode === "code" || !problem.segments) {
    return handleCodeKey(state, problem, key);
  }
  return handleLongKey(state, problem, key);
}
