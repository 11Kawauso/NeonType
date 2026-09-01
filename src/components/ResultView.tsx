import { useState } from "react";
import { getAnonId } from "../lib/anon.ts";
import { registerResult } from "../lib/api.ts";
import { inputCount, ratePercent } from "../lib/score.ts";
import type { Duration, Mode, PlayStats } from "../lib/types.ts";

type Props = {
  mode: Mode;
  duration: Duration;
  stats: PlayStats;
  resultId: string | null;
  onBack: () => void;
};

export function ResultView({ mode, duration, stats, resultId, onBack }: Props) {
  const [name, setName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const total = inputCount(stats);

  async function onRegister() {
    if (!resultId || registered) return;
    try {
      const saved = await registerResult(resultId, getAnonId(), name);
      setRegistered(true);
      setMessage(`${saved} で登録しました`);
    } catch {
      setMessage("登録に失敗しました");
    }
  }

  return (
    <div className="wrap">
      <div className="result-card">
        <h2>RESULT</h2>
        <div className="stat">
          <span>部門</span>
          <b>
            {mode === "long" ? "長文" : "コーディング"} {duration / 60}分
          </b>
        </div>
        <div className="stat">
          <span>合計スコア</span>
          <b>{stats.score.toLocaleString()}</b>
        </div>
        <div className="stat">
          <span>最大コンボ数</span>
          <b>{stats.maxCombo}</b>
        </div>
        <div className="stat">
          <span>Perfect数</span>
          <b>{stats.perfectCount}</b>
        </div>
        <div className="stat">
          <span>打った文字数</span>
          <b>{total}</b>
        </div>
        <div className="stat">
          <span>正しく打てた数</span>
          <b>{stats.correctCount}</b>
        </div>
        <div className="stat">
          <span>間違えた数</span>
          <b>{stats.missCount}</b>
        </div>
        <div className="stat">
          <span>正タイプ率</span>
          <b>{ratePercent(stats.correctCount, total).toFixed(1)}%</b>
        </div>
        <div className="stat">
          <span>誤タイプ率</span>
          <b>{ratePercent(stats.missCount, total).toFixed(1)}%</b>
        </div>
        <input
          className="name-input"
          maxLength={12}
          placeholder="名前（未入力はゲスト）"
          value={name}
          disabled={registered || !resultId}
          onChange={(event) => setName(event.target.value)}
        />
        <div className="actions">
          <button
            className="primary"
            type="button"
            disabled={!resultId || registered}
            onClick={() => void onRegister()}
          >
            ランキング登録
          </button>
          <button className="ghost" type="button" onClick={onBack}>
            スタートへ戻る
          </button>
        </div>
        {message ? <p>{message}</p> : null}
        {!resultId ? <p className="error">結果の保存に失敗したため、登録できません。</p> : null}
      </div>
    </div>
  );
}
