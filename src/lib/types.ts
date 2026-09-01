export type Mode = "long" | "code";
export type Duration = 180 | 300;

export type Segment = {
  display: string;
  typing: string;
};

export type Problem = {
  id: string;
  mode: Mode;
  source: string;
  displayText: string;
  typingText: string;
  segments: Segment[] | null;
};

export type PlayStats = {
  score: number;
  maxCombo: number;
  perfectCount: number;
  correctCount: number;
  missCount: number;
};

export type RankingRow = {
  rank: number;
  name: string;
  score: number;
};

export type RankingsResponse = {
  top: RankingRow[];
  me: { rank: number | null; name: string; score: number } | null;
};
