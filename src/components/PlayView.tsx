import { useEffect, useMemo, useRef, useState } from "react";
import { getAnonId } from "../lib/anon.ts";
import { fetchProblems, saveResult } from "../lib/api.ts";
import {
  createEngineState,
  expectedChar,
  handleKey,
  resetProblemProgress,
  visibleTyping,
  type EngineState,
} from "../lib/engine.ts";
import { pickNextId } from "../lib/picker.ts";
import {
  applyStartKey,
  initialPlayPhase,
  RING_LENGTH,
  ringCountdown,
  shouldJudgeTyping,
  shouldRunTimer,
  showProblemText,
  showStartHint,
  START_HINT,
  type PlayPhase,
} from "../lib/play-phase.ts";
import { furiganaOf } from "../lib/romaji.ts";
import type { Duration, Mode, PlayStats, Problem, Segment } from "../lib/types.ts";
import { acceptTypingKeydown, releaseTypingKey } from "../lib/held-keys.ts";
import { Keyboard } from "./Keyboard.tsx";

type Props = {
  mode: Mode;
  duration: Duration;
  onFinish: (stats: PlayStats, resultId: string | null) => void;
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function chClass(index: number, current: number): string {
  if (index < current) return "ch done";
  if (index === current) return "ch cur";
  return "ch";
}

function Chars({ text, index, className }: { text: string; index: number; className: string }) {
  return (
    <div className={className}>
      {[...text].map((ch, i) => (
        <span key={`${i}-${ch}`} className={chClass(i, index)}>
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </div>
  );
}

function CountRing({ offset, count, neon }: { offset: number; count: number; neon?: boolean }) {
  return (
    <div className="ring-wrap">
      <svg width="220" height="220" viewBox="0 0 220 220">
        <circle
          cx="110"
          cy="110"
          r="96"
          stroke={neon ? "rgba(0,246,255,.22)" : "rgba(255,255,255,.15)"}
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="110"
          cy="110"
          r="96"
          stroke={neon ? "#00f6ff" : "#fff"}
          strokeWidth="10"
          fill="none"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="count">{count}</div>
    </div>
  );
}

function JapaneseChars({ segments, index }: { segments: Segment[]; index: number }) {
  return (
    <div className="jp">
      {segments.map((seg, i) => {
        const cls = chClass(i, index);
        const furi = furiganaOf(seg);
        if (furi) {
          return (
            <ruby key={`${i}-${seg.display}`} className={cls}>
              <span className="rb">{seg.display}</span>
              <rt>{furi}</rt>
            </ruby>
          );
        }
        return (
          <span key={`${i}-${seg.display}`} className={cls}>
            {seg.display === " " ? "\u00a0" : seg.display}
          </span>
        );
      })}
    </div>
  );
}

export function PlayView({ mode, duration, onFinish }: Props) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [engine, setEngine] = useState<EngineState>(createEngineState);
  const [remain, setRemain] = useState<number>(duration);
  const [phase, setPhase] = useState<PlayPhase>(initialPlayPhase);
  const [readyCount, setReadyCount] = useState(3);
  const [readyOffset, setReadyOffset] = useState(0);
  const [missing, setMissing] = useState(false);
  const [missCount, setMissCount] = useState(3);
  const [missOffset, setMissOffset] = useState(0);
  const [delta, setDelta] = useState<{ n: number; id: number } | null>(null);
  const [perfect, setPerfect] = useState(false);
  const [comboGrow, setComboGrow] = useState(false);
  const [lit, setLit] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const finished = useRef(false);
  const engineRef = useRef(engine);
  const problemRef = useRef<Problem | null>(null);
  const lastId = useRef<string | null>(null);
  const deltaId = useRef(0);
  const heldKeys = useRef(new Set<string>());
  const phaseRef = useRef(phase);
  const rafRef = useRef(0);

  engineRef.current = engine;
  problemRef.current = problem;

  const ids = useMemo(() => problems.map((item) => item.id), [problems]);

  function showDelta(n: number) {
    if (n === 0) return;
    deltaId.current += 1;
    setDelta({ n, id: deltaId.current });
  }

  function nextProblem(pool: Problem[], currentLast: string | null) {
    const nextId = pickNextId(
      pool.map((item) => item.id),
      currentLast,
    );
    const next = pool.find((item) => item.id === nextId);
    if (!next) return;
    lastId.current = next.id;
    setProblem(next);
    setEngine((prev) => resetProblemProgress(prev));
  }

  useEffect(() => {
    let cancelled = false;
    fetchProblems(mode)
      .then((list) => {
        if (cancelled) return;
        if (list.length === 0) {
          setLoadError("問題がありません");
          return;
        }
        setProblems(list);
        nextProblem(list, null);
      })
      .catch(() => {
        if (!cancelled) setLoadError("問題の取得に失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function runRing(onFrame: (frame: ReturnType<typeof ringCountdown>) => void, onDone: () => void) {
    const started = performance.now();
    const tick = (now: number) => {
      if (finished.current) return;
      const frame = ringCountdown(now - started);
      onFrame(frame);
      if (!frame.done) rafRef.current = requestAnimationFrame(tick);
      else onDone();
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function startReadyCountdown() {
    setPhase("countdown");
    setReadyCount(3);
    setReadyOffset(0);
    runRing(
      (frame) => {
        setReadyOffset(frame.offset);
        setReadyCount(frame.count);
      },
      () => {
        phaseRef.current = "playing";
        setPhase("playing");
      },
    );
  }

  useEffect(() => {
    if (!shouldRunTimer(phase)) return;
    const timer = window.setInterval(() => {
      if (finished.current) return;
      setRemain((prev) => {
        if (prev <= 1) {
          void endPlay();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  async function endPlay() {
    if (finished.current) return;
    finished.current = true;
    const stats: PlayStats = {
      score: engineRef.current.score,
      maxCombo: engineRef.current.maxCombo,
      perfectCount: engineRef.current.perfectCount,
      correctCount: engineRef.current.correctCount,
      missCount: engineRef.current.missCount,
    };
    let resultId: string | null = null;
    try {
      resultId = await saveResult({
        anonId: getAnonId(),
        mode,
        duration,
        ...stats,
      });
    } catch {
      resultId = null;
    }
    onFinish(stats, resultId);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.length !== 1) return;
      event.preventDefault();
      if (!acceptTypingKeydown(event, heldKeys.current)) return;
      if (finished.current) return;
      const nextPhase = applyStartKey(phaseRef.current, event.key);
      if (nextPhase !== phaseRef.current) {
        phaseRef.current = nextPhase;
        startReadyCountdown();
        return;
      }
      if (!shouldJudgeTyping(phaseRef.current) || missing) return;
      const current = problemRef.current;
      if (!current) return;
      setLit(event.key);
      window.setTimeout(() => setLit(null), 160);
      const result = handleKey(engineRef.current, current, event.key);
      if (result.type === "ignore") return;
      setEngine(result.state);
      showDelta(result.delta);
      if (result.type === "miss") {
        setMissing(true);
        setMissCount(3);
        setMissOffset(0);
        runRing(
          (frame) => {
            setMissOffset(frame.offset);
            setMissCount(frame.count);
          },
          () => setMissing(false),
        );
        return;
      }
      if (result.type === "complete") {
        if (result.perfect) {
          setPerfect(true);
          window.setTimeout(() => setPerfect(false), 1000);
        }
        setComboGrow(true);
        window.setTimeout(() => setComboGrow(false), 280);
        if (ids.length > 0) nextProblem(problems, lastId.current);
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      releaseTypingKey(event, heldKeys.current);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [missing, problems, ids.length]);

  if (loadError) {
    return (
      <div className="wrap">
        <p className="error">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="hud">
      <div className={remain <= 10 ? "timer warn" : "timer"}>{formatTime(remain)}</div>
      <div className="right-top">
        <button
          className="end"
          type="button"
          onClick={() => {
            if (window.confirm("プレイを終了しますか？")) void endPlay();
          }}
        >
          END
        </button>
        <div className="score-wrap">
          <div className="score-label">SCORE</div>
          <div className="score">{engine.score.toLocaleString()}</div>
          {delta ? (
            <div key={delta.id} className={delta.n >= 0 ? "delta plus" : "delta minus"}>
              {delta.n >= 0 ? "+" : ""}
              {delta.n}pt
            </div>
          ) : null}
        </div>
      </div>

      <div className="stage">
        {problem && showProblemText(phase) ? (
          <>
            <div className="source">{problem.source}</div>
            {mode === "long" ? (
              <>
                {problem.segments ? (
                  <JapaneseChars segments={problem.segments} index={engine.displayIndex} />
                ) : (
                  <Chars text={problem.displayText} index={engine.displayIndex} className="jp" />
                )}
                <Chars
                  text={visibleTyping(problem, engine)}
                  index={engine.typingIndex}
                  className="roma"
                />
              </>
            ) : (
              <Chars text={problem.displayText} index={engine.displayIndex} className="code-line" />
            )}
          </>
        ) : null}
        {showStartHint(phase) ? <p className="start-hint">{START_HINT}</p> : null}
      </div>

      <div className="combo">
        {perfect ? <div className="perfect">Perfect!</div> : null}
        {engine.combo > 0 ? (
          <>
            <div
              className={`combo-num${engine.combo >= 5 ? " hot" : ""}${comboGrow ? " grow" : ""}`}
            >
              {engine.combo}
            </div>
            <div className="combo-label">コンボ</div>
          </>
        ) : null}
      </div>

      <Keyboard
        lit={lit}
        next={problem && showProblemText(phase) ? expectedChar(problem, engine) : null}
      />

      <div className={missing ? "miss show" : "miss"}>
        <CountRing offset={missOffset} count={missCount} />
      </div>
      <div className={phase === "countdown" ? "ready show" : "ready"}>
        <CountRing offset={readyOffset} count={readyCount} neon />
      </div>
    </div>
  );
}
