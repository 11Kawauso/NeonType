import { useEffect, useState } from "react";
import { getAnonId } from "../lib/anon.ts";
import { fetchRankings } from "../lib/api.ts";
import type { Duration, Mode, RankingsResponse } from "../lib/types.ts";

const BOARDS: { key: string; mode: Mode; duration: Duration; label: string }[] = [
  { key: "l3", mode: "long", duration: 180, label: "長文 3分" },
  { key: "l5", mode: "long", duration: 300, label: "長文 5分" },
  { key: "c3", mode: "code", duration: 180, label: "コード 3分" },
  { key: "c5", mode: "code", duration: 300, label: "コード 5分" },
];

type Props = {
  onStart: (mode: Mode, duration: Duration) => void;
};

export function StartView({ onStart }: Props) {
  const [board, setBoard] = useState(BOARDS[0]!);
  const [rankings, setRankings] = useState<RankingsResponse>({ top: [], me: null });

  useEffect(() => {
    let cancelled = false;
    fetchRankings(board.mode, board.duration, getAnonId())
      .then((data) => {
        if (!cancelled) setRankings(data);
      })
      .catch(() => {
        if (!cancelled) setRankings({ top: [], me: null });
      });
    return () => {
      cancelled = true;
    };
  }, [board]);

  return (
    <div className="wrap">
      <header>
        <div>
          <div className="brand">
            <small>TYPING ARCADE // MVP</small>
            <h1>
              NEON<span>TYPE</span>
            </h1>
          </div>
          <p className="lead">
            制限時間内に課題文を打ち続け、スコアとコンボを伸ばすタイピングゲーム。
            長文は日本語をローマ字で、コーディングはよく使う 1 行をそのまま打つ。 1
            文字でも間違えると 3 秒後にその文は最初からやり直し。
          </p>
          <div className="chip-row">
            <span className="chip">NO MISS = PERFECT</span>
            <span className="chip">COMBO x1.5 MAX</span>
            <span className="chip">RANKING x4</span>
          </div>
        </div>
      </header>
      <div className="layout">
        <section>
          <p className="sec-title">SELECT MODE</p>
          <div className="modes">
            <button className="mode" type="button" onClick={() => onStart("long", 180)}>
              <div className="kicker">LONG TEXT</div>
              <h2>長文モード</h2>
              <p>30〜60文字の日本語をローマ字で打つ。日常会話や物語の一文。</p>
              <div className="time">3:00</div>
            </button>
            <button className="mode" type="button" onClick={() => onStart("long", 300)}>
              <div className="kicker">LONG TEXT</div>
              <h2>長文モード</h2>
              <p>同じルールで制限時間だけが長い。高スコア向き。</p>
              <div className="time">5:00</div>
            </button>
            <button className="mode" type="button" onClick={() => onStart("code", 180)}>
              <div className="kicker">CODING</div>
              <h2>コーディング</h2>
              <p>HTML / CSS / JS / Java / C# / C++ の頻出 1 行。空白も入力。</p>
              <div className="time">3:00</div>
            </button>
            <button className="mode" type="button" onClick={() => onStart("code", 300)}>
              <div className="kicker">CODING</div>
              <h2>コーディング</h2>
              <p>コード行を打ち続けてコンボを伸ばす 5 分戦。</p>
              <div className="time">5:00</div>
            </button>
          </div>
        </section>
        <section className="rank">
          <p className="sec-title">RANKING</p>
          <div className="tabs">
            {BOARDS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === board.key ? "tab on" : "tab"}
                onClick={() => setBoard(item)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {rankings.top.map((row) => (
            <div className="row" key={`${row.rank}-${row.name}-${row.score}`}>
              <b>{String(row.rank).padStart(2, "0")}</b>
              <span>{row.name}</span>
              <span>{row.score.toLocaleString()}</span>
            </div>
          ))}
          {rankings.me ? (
            <div className="me">
              <small>OUT OF RANK</small>
              <div className="row" style={{ border: 0, padding: 0 }}>
                <b>--</b>
                <span>{rankings.me.name}</span>
                <span>{rankings.me.score.toLocaleString()}</span>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
