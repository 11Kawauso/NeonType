import type { PlayStats } from "./types.ts";

export function comboMultiplier(combo: number): number {
  if (combo <= 0) return 1;
  return Math.min(1 + combo * 0.1, 1.5);
}

export function applyGain(
  score: number,
  rawPoints: number,
  combo: number,
): { score: number; delta: number } {
  const delta = Math.round(rawPoints * comboMultiplier(combo));
  return { score: Math.max(0, score + delta), delta };
}

export function applyPenalty(score: number, penalty: number): { score: number; delta: number } {
  const next = Math.max(0, score - penalty);
  return { score: next, delta: next - score };
}

export function inputCount(stats: Pick<PlayStats, "correctCount" | "missCount">): number {
  return stats.correctCount + stats.missCount;
}

export function ratePercent(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}
