import type { Duration, Mode, Problem, RankingsResponse } from "./types.ts";

type ProblemRow = {
  id: string;
  mode: Mode;
  source: string;
  display_text: string;
  typing_text: string;
  segments: string | null;
};

export async function fetchProblems(mode: Mode): Promise<Problem[]> {
  const res = await fetch(`/api/problems?mode=${mode}`);
  if (!res.ok) throw new Error("問題の取得に失敗しました");
  const data = (await res.json()) as { problems: ProblemRow[] };
  return data.problems.map((row) => ({
    id: row.id,
    mode: row.mode,
    source: row.source,
    displayText: row.display_text,
    typingText: row.typing_text,
    segments: row.segments ? (JSON.parse(row.segments) as Problem["segments"]) : null,
  }));
}

export async function fetchRankings(
  mode: Mode,
  duration: Duration,
  anonId: string,
): Promise<RankingsResponse> {
  const params = new URLSearchParams({ mode, duration: String(duration), anonId });
  const res = await fetch(`/api/rankings?${params}`);
  if (!res.ok) throw new Error("ランキングの取得に失敗しました");
  return (await res.json()) as RankingsResponse;
}

export async function saveResult(body: {
  anonId: string;
  mode: Mode;
  duration: Duration;
  score: number;
  maxCombo: number;
  perfectCount: number;
  correctCount: number;
  missCount: number;
}): Promise<string> {
  const res = await fetch("/api/results", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("結果の保存に失敗しました");
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function registerResult(id: string, anonId: string, name: string): Promise<string> {
  const res = await fetch(`/api/results/${id}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonId, name }),
  });
  if (!res.ok) throw new Error("登録に失敗しました");
  const data = (await res.json()) as { name: string };
  return data.name;
}
