import { describe, expect, it } from "vite-plus/test";
import { PROBLEMS } from "../data/problems.ts";
import { createEngineState, visibleTyping } from "../lib/engine.ts";

const KANA = /[\u3040-\u309F\u30A0-\u30FF]/u;
const KANJI = /[\u4E00-\u9FFF]/u;
const SMALL = new Set([
  "ぁ",
  "ぃ",
  "ぅ",
  "ぇ",
  "ぉ",
  "ゃ",
  "ゅ",
  "ょ",
  "ァ",
  "ィ",
  "ゥ",
  "ェ",
  "ォ",
  "ャ",
  "ュ",
  "ョ",
]);

function letterCore(typing: string): string {
  return typing.replace(/[^a-zA-Z']/g, "");
}

describe("problem data", () => {
  it("has about 30 long and 30 code problems", () => {
    const long = PROBLEMS.filter((p) => p.mode === "long");
    const code = PROBLEMS.filter((p) => p.mode === "code");
    expect(long.length).toBeGreaterThanOrEqual(28);
    expect(code.length).toBeGreaterThanOrEqual(28);
  });

  it("keeps display/typing/segments aligned", () => {
    for (const problem of PROBLEMS) {
      if (problem.mode === "long") {
        expect(problem.segments).not.toBeNull();
        const chars = [...problem.displayText];
        expect(chars.length).toBeGreaterThanOrEqual(30);
        expect(chars.length).toBeLessThanOrEqual(60);
        expect(problem.segments!.map((s) => s.display).join("")).toBe(problem.displayText);
        expect(problem.segments!.map((s) => s.typing).join("")).toBe(problem.typingText);
        expect(problem.segments!.every((s) => s.typing.length > 0)).toBe(true);
      } else {
        expect(problem.displayText).toBe(problem.typingText);
        expect(problem.segments).toBeNull();
      }
    }
  });

  it("covers the six coding languages", () => {
    const sources = new Set(PROBLEMS.filter((p) => p.mode === "code").map((p) => p.source));
    expect(sources).toEqual(
      new Set(["HTMLより", "CSSより", "JavaScriptより", "Javaより", "C#より", "C++より"]),
    );
  });

  it("uses wo for を and ha for は as canonical typing", () => {
    const offenders: string[] = [];
    for (const problem of PROBLEMS.filter((item) => item.mode === "long")) {
      for (const segment of problem.segments ?? []) {
        if (
          (segment.display === "を" || segment.display === "ヲ") &&
          !segment.typing.startsWith("wo")
        ) {
          offenders.push(`${problem.id}:${segment.display}:${segment.typing}`);
        }
        if (
          (segment.display === "は" || segment.display === "ハ") &&
          !segment.typing.startsWith("ha")
        ) {
          offenders.push(`${problem.id}:${segment.display}:${segment.typing}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("maps 終わらせて to owarasete and never emits owawa", () => {
    const problem = PROBLEMS.find((item) => item.id === "long-11");
    expect(problem).toBeDefined();
    if (!problem) return;
    const visible = visibleTyping(problem, createEngineState());
    expect(problem.typingText).toContain("owarasete");
    expect(problem.typingText).not.toContain("owawa");
    expect(visible).toContain("owarasete");
    expect(visible).not.toContain("owawa");
    const end = problem.segments?.find((segment) => segment.display === "終");
    const wa = problem.segments?.find((segment) => segment.display === "わ");
    expect(end?.typing).toBe("o");
    expect(wa?.typing).toBe("wa");
    for (const item of PROBLEMS.filter((row) => row.mode === "long")) {
      expect(item.typingText.includes("owawa"), item.id).toBe(false);
      expect(visibleTyping(item, createEngineState()).includes("owawa"), item.id).toBe(false);
    }
  });

  it("does not stack okurigana onto a kanji reading", () => {
    const offenders: string[] = [];
    for (const problem of PROBLEMS.filter((item) => item.mode === "long")) {
      const segments = problem.segments ?? [];
      for (let i = 0; i < segments.length - 1; i += 1) {
        const current = segments[i]!;
        const next = segments[i + 1]!;
        if (!KANJI.test(current.display) || !KANA.test(next.display)) continue;
        if (SMALL.has(next.display) || next.display === "っ" || next.display === "ッ") continue;
        const kanji = letterCore(current.typing);
        const okuri = letterCore(next.typing);
        if (okuri && kanji.endsWith(okuri)) {
          offenders.push(
            `${problem.id}:${current.display}=${current.typing}+${next.display}=${next.typing}`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps coding problems ASCII-only", () => {
    const offenders = PROBLEMS.filter(
      (p) =>
        p.mode === "code" &&
        [...`${p.displayText}${p.typingText}`].some((ch) => ch.charCodeAt(0) > 127),
    );
    expect(offenders.map((p) => p.id)).toEqual([]);
  });
});
