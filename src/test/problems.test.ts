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
});
