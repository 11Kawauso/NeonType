import { describe, expect, it } from "vite-plus/test";
import { PROBLEMS } from "../data/problems.ts";
import { createEngineState, visibleTyping } from "../lib/engine.ts";
import { furiganaOf, isKanji, typingToHiragana } from "../lib/romaji.ts";

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
  it("converts kanji romaji into hiragana furigana", () => {
    expect(typingToHiragana("ame ")).toBe("あめ");
    expect(typingToHiragana("fu")).toBe("ふ");
    expect(typingToHiragana("ssho ")).toBe("っしょ");
    expect(typingToHiragana("ppou ")).toBe("っぽう");
    expect(typingToHiragana("kkou ")).toBe("っこう");
    expect(typingToHiragana("owara")).not.toBe("おわ");
    expect(typingToHiragana("o")).toBe("お");
  });

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
        const reading = furiganaOf(current);
        const okuriHira = typingToHiragana(next.typing);
        if (reading && okuriHira && reading.endsWith(okuriHira)) {
          offenders.push(
            `${problem.id}:${current.display}=${reading}+${next.display}=${okuriHira}`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("puts hiragana furigana on every kanji and nowhere else", () => {
    const offenders: string[] = [];
    for (const problem of PROBLEMS.filter((item) => item.mode === "long")) {
      const kanjiCount = [...problem.displayText].filter((ch) => isKanji(ch)).length;
      const rubyCount = (problem.segments ?? []).filter((seg) => furiganaOf(seg)).length;
      if (kanjiCount !== rubyCount) {
        offenders.push(`${problem.id}: kanji ${kanjiCount} != ruby ${rubyCount}`);
      }
      for (const segment of problem.segments ?? []) {
        const furi = furiganaOf(segment);
        if (isKanji(segment.display)) {
          if (!furi || !/^[\u3040-\u309F]+$/u.test(furi)) {
            offenders.push(`${problem.id}:${segment.display}=${segment.typing}/${furi ?? "none"}`);
          }
        } else if (furi) {
          offenders.push(`${problem.id}: extra ruby ${segment.display}=${furi}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses the sentence reading for the umbrella example", () => {
    const problem = PROBLEMS.find((item) => item.id === "long-07");
    expect(problem).toBeDefined();
    if (!problem?.segments) return;
    const readings = Object.fromEntries(
      problem.segments
        .filter((seg) => isKanji(seg.display))
        .map((seg) => [seg.display, furiganaOf(seg)]),
    );
    expect(readings).toMatchObject({
      雨: "あめ",
      降: "ふ",
      折: "お",
      傘: "かさ",
      入: "い",
    });
    expect(furiganaOf(problem.segments.find((seg) => seg.display === "り")!)).toBeNull();
    expect(furiganaOf(problem.segments.find((seg) => seg.display === "を")!)).toBeNull();
  });

  it("keeps 終わらせて as お + わらせて and 明日 as あ + した", () => {
    const homework = PROBLEMS.find((item) => item.id === "long-11");
    expect(homework?.segments?.find((seg) => seg.display === "終")).toMatchObject({
      typing: "o",
      reading: "お",
    });
    expect(homework?.segments?.find((seg) => seg.display === "わ")?.typing).toBe("wa");
    const asu = homework?.segments ?? [];
    const first = asu[0];
    const second = asu[1];
    expect(first).toMatchObject({ display: "明", typing: "a", reading: "あ" });
    expect(second).toMatchObject({ display: "日", typing: "shita ", reading: "した" });
  });

  it("uses しんごう and しょうがっこう", () => {
    const signal = PROBLEMS.find((item) => item.id === "long-10");
    const gou = signal?.segments?.find((seg) => seg.display === "号");
    expect(signal?.typingText).toContain("shingou");
    expect(gou ? furiganaOf(gou) : null).toBe("ごう");
    const school = PROBLEMS.find((item) => item.id === "long-27");
    expect(school?.typingText).toContain("shougakkou");
    expect(school?.typingText).not.toContain("gakukou");
    const gaku = school?.segments?.find((seg) => seg.display === "学");
    const kou = school?.segments?.find((seg) => seg.display === "校");
    expect(gaku ? furiganaOf(gaku) : null).toBe("が");
    expect(kou ? furiganaOf(kou) : null).toBe("っこう");
  });

  it("keeps literary readings for the quoted passages", () => {
    const reading = (id: string, kanji: string) => {
      const problem = PROBLEMS.find((item) => item.id === id);
      const segment = problem?.segments?.find((item) => item.display === kanji);
      return segment ? furiganaOf(segment) : null;
    };
    expect(reading("long-16", "吾")).toBe("わが");
    expect(reading("long-16", "生")).toBe("うま");
    expect(reading("long-18", "暮")).toBe("くれ");
    expect(reading("long-23", "蓮")).toBe("はす");
    expect(reading("long-25", "投")).toBe("な");
    expect(reading("long-26", "生")).toBe("は");
    expect(reading("long-27", "供")).toBe("ども");
    expect(reading("long-30", "明")).toBe("あ");
  });

  it("does not attach furigana on coding problems", () => {
    for (const problem of PROBLEMS.filter((item) => item.mode === "code")) {
      expect(problem.segments).toBeNull();
    }
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
