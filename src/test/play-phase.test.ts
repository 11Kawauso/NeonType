import { describe, expect, it } from "vite-plus/test";
import { createEngineState } from "../lib/engine.ts";
import {
  START_HINT,
  completeStartCountdown,
  createPlaySession,
  handlePlayKey,
  ringCountdown,
  showStartHint,
  tickTimer,
} from "../lib/play-phase.ts";
import type { Problem } from "../lib/types.ts";

const long: Problem = {
  id: "t1",
  mode: "long",
  source: "test",
  displayText: "あ。",
  typingText: "a.",
  segments: [
    { display: "あ", typing: "a" },
    { display: "。", typing: "." },
  ],
};

const code: Problem = {
  id: "c1",
  mode: "code",
  source: "JSより",
  displayText: "ab",
  typingText: "ab",
  segments: null,
};

const codeSpace: Problem = {
  id: "c-space",
  mode: "code",
  source: "JSより",
  displayText: " a",
  typingText: " a",
  segments: null,
};

describe("play start phase", () => {
  it("does not advance the timer until after countdown", () => {
    let session = createPlaySession(180);
    expect(START_HINT).toBe("スペースを押してスタート");
    expect(showStartHint(session.phase)).toBe(true);
    session = tickTimer(session);
    expect(session.remain).toBe(180);

    const started = handlePlayKey(session, long, " ");
    expect(started.event.type).toBe("countdown-start");
    session = started.session;
    expect(session.phase).toBe("countdown");
    expect(showStartHint(session.phase)).toBe(false);
    session = tickTimer(session);
    expect(session.remain).toBe(180);

    session = completeStartCountdown(session);
    expect(session.phase).toBe("playing");
    session = tickTimer(session);
    expect(session.remain).toBe(179);
  });

  it("does not judge keys before the countdown finishes", () => {
    let session = createPlaySession(180);
    const before = handlePlayKey(session, long, "a");
    expect(before.event.type).toBe("blocked");
    expect(before.session.engine).toEqual(createEngineState());

    session = handlePlayKey(session, long, " ").session;
    const during = handlePlayKey(session, long, "a");
    expect(during.event.type).toBe("blocked");
    expect(during.session.engine.typingIndex).toBe(0);
    expect(during.session.engine.score).toBe(0);

    const skip = handlePlayKey(session, long, " ");
    expect(skip.event.type).toBe("blocked");
    expect(skip.session.phase).toBe("countdown");
  });

  it("accepts typing only after countdown", () => {
    let session = completeStartCountdown(handlePlayKey(createPlaySession(180), long, " ").session);
    const hit = handlePlayKey(session, long, "a");
    expect(hit.event.type).toBe("correct");
    expect(hit.session.engine.typingIndex).toBe(1);
    expect(hit.session.engine.score).toBe(100);

    const codePlay = completeStartCountdown(
      handlePlayKey(createPlaySession(180), code, " ").session,
    );
    const codeHit = handlePlayKey(codePlay, code, "a");
    expect(codeHit.event.type).toBe("correct");
    expect(codeHit.session.engine.typingIndex).toBe(1);
  });

  it("keeps long-mode space ignored after start, and judges code space only after start", () => {
    const longPlay = completeStartCountdown(
      handlePlayKey(createPlaySession(180), long, " ").session,
    );
    const longSpace = handlePlayKey(longPlay, long, " ");
    expect(longSpace.event.type).toBe("ignore");
    expect(longSpace.session.engine).toEqual(longPlay.engine);

    const armedCode = handlePlayKey(createPlaySession(180), codeSpace, " ");
    expect(armedCode.event.type).toBe("countdown-start");
    expect(armedCode.session.engine.typingIndex).toBe(0);

    const codePlay = completeStartCountdown(armedCode.session);
    const codeHit = handlePlayKey(codePlay, codeSpace, " ");
    expect(codeHit.event.type).toBe("correct");
    expect(codeHit.session.engine.typingIndex).toBe(1);
  });

  it("counts 3 → 2 → 1 over three seconds", () => {
    expect(ringCountdown(0)).toMatchObject({ count: 3, done: false, offset: 0 });
    expect(ringCountdown(999).count).toBe(3);
    expect(ringCountdown(1000).count).toBe(2);
    expect(ringCountdown(2000).count).toBe(1);
    expect(ringCountdown(2999)).toMatchObject({ count: 1, done: false });
    expect(ringCountdown(3000).done).toBe(true);
  });
});
