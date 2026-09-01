import { describe, expect, it } from "vite-plus/test";
import { PROBLEMS } from "../data/problems.ts";

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

  it("keeps coding problems ASCII-only", () => {
    const offenders = PROBLEMS.filter(
      (p) =>
        p.mode === "code" &&
        [...`${p.displayText}${p.typingText}`].some((ch) => ch.charCodeAt(0) > 127),
    );
    expect(offenders.map((p) => p.id)).toEqual([]);
  });
});
