import { createEngineState, handleKey, type EngineState, type KeyEvent } from "./engine.ts";
import type { Problem } from "./types.ts";

export type PlayPhase = "armed" | "countdown" | "playing";

export const START_HINT = "スペースを押してスタート";
export const COUNTDOWN_MS = 3000;
export const RING_LENGTH = 603;

export type PlaySession = {
  phase: PlayPhase;
  remain: number;
  engine: EngineState;
};

export type StartKeyEvent = { type: "countdown-start" } | { type: "blocked" } | KeyEvent;

export function initialPlayPhase(): PlayPhase {
  return "armed";
}

export function createPlaySession(remain: number): PlaySession {
  return { phase: initialPlayPhase(), remain, engine: createEngineState() };
}

export function shouldRunTimer(phase: PlayPhase): boolean {
  return phase === "playing";
}

export function shouldJudgeTyping(phase: PlayPhase): boolean {
  return phase === "playing";
}

export function showStartHint(phase: PlayPhase): boolean {
  return phase === "armed";
}

/** 課題文・出典・次キーハイライトはカウント終了後だけ出す */
export function showProblemText(phase: PlayPhase): boolean {
  return phase === "playing";
}

export function applyStartKey(phase: PlayPhase, key: string): PlayPhase {
  if (phase === "armed" && key === " ") return "countdown";
  return phase;
}

export function finishStartCountdown(phase: PlayPhase): PlayPhase {
  return phase === "countdown" ? "playing" : phase;
}

export function tickTimer(session: PlaySession): PlaySession {
  if (!shouldRunTimer(session.phase)) return session;
  return { ...session, remain: Math.max(0, session.remain - 1) };
}

export function completeStartCountdown(session: PlaySession): PlaySession {
  return { ...session, phase: finishStartCountdown(session.phase) };
}

export function handlePlayKey(
  session: PlaySession,
  problem: Problem,
  key: string,
): { session: PlaySession; event: StartKeyEvent } {
  const nextPhase = applyStartKey(session.phase, key);
  if (nextPhase !== session.phase) {
    return { session: { ...session, phase: nextPhase }, event: { type: "countdown-start" } };
  }
  if (!shouldJudgeTyping(session.phase)) {
    return { session, event: { type: "blocked" } };
  }
  const event = handleKey(session.engine, problem, key);
  if (event.type === "ignore") return { session, event };
  return { session: { ...session, engine: event.state }, event };
}

export function ringCountdown(elapsedMs: number, durationMs = COUNTDOWN_MS) {
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const left = 3 - Math.floor(t * 3);
  return {
    offset: RING_LENGTH * t,
    count: left > 0 ? left : 1,
    done: t >= 1,
  };
}
