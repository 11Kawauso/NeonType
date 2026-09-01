import { applyGain, applyPenalty } from "./score.ts";
import type { Problem } from "./types.ts";

export type EngineState = {
  typingIndex: number;
  displayIndex: number;
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
  return { ...state, typingIndex: 0, displayIndex: 0, perfectEligible: true };
}

function segmentEnds(problem: Problem): number[] {
  if (problem.mode === "code" || !problem.segments) {
    return [...problem.typingText].map((_, i) => i + 1);
  }
  const ends: number[] = [];
  let acc = 0;
  for (const segment of problem.segments) {
    acc += segment.typing.length;
    ends.push(acc);
  }
  return ends;
}

export function expectedChar(problem: Problem, typingIndex: number): string | null {
  return problem.typingText[typingIndex] ?? null;
}

export function handleKey(state: EngineState, problem: Problem, key: string): KeyEvent {
  const expected = expectedChar(problem, state.typingIndex);
  if (expected === null) return { type: "ignore" };
  if (key.length !== 1) return { type: "ignore" };

  if (key !== expected) {
    const penalty = problem.mode === "long" ? 500 : 300;
    const scored = applyPenalty(state.score, penalty);
    const next: EngineState = {
      ...state,
      score: scored.score,
      combo: 0,
      missCount: state.missCount + 1,
      typingIndex: 0,
      displayIndex: 0,
      perfectEligible: false,
    };
    return { type: "miss", state: next, delta: scored.delta };
  }

  const ends = segmentEnds(problem);
  const typingIndex = state.typingIndex + 1;
  const charPoints = problem.mode === "long" ? 100 : 50;
  const afterChar = applyGain(state.score, charPoints, state.combo);
  let displayIndex = state.displayIndex;
  const completedChar = ends[displayIndex] === typingIndex;
  if (completedChar) displayIndex += 1;

  const finished = typingIndex >= problem.typingText.length;
  if (!finished) {
    const next: EngineState = {
      ...state,
      typingIndex,
      displayIndex,
      score: afterChar.score,
      correctCount: state.correctCount + 1,
    };
    return { type: "correct", state: next, delta: afterChar.delta, displayAdvanced: completedChar };
  }

  const combo = state.combo + 1;
  const afterFinish = applyGain(afterChar.score, 1000, combo);
  const perfect = state.perfectEligible;
  const afterPerfect = perfect ? applyGain(afterFinish.score, 1000, combo) : afterFinish;
  const next: EngineState = {
    ...state,
    typingIndex,
    displayIndex,
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
