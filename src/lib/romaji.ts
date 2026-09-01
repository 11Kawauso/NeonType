import type { Problem, Segment } from "./types.ts";

export type Progress = {
  visible: string;
  displayIndex: number;
  complete: boolean;
};

type Token =
  | { kind: "kana"; kana: string }
  | { kind: "sokuon"; cons: string }
  | { kind: "n" }
  | { kind: "lit"; text: string };

type Spelling = {
  text: string;
  splits: number[];
};

type Chunk = {
  displayChars: number;
  canonical: string;
  spellings: Spelling[];
};

type Cand = {
  chosen: string[];
  chunkIndex: number;
  current: string | null;
  prefix: string;
  displayIndex: number;
};

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

const PARSE_FIRST: [string, string][] = [
  ["wa", "わ"],
  ["o", "お"],
  ["e", "え"],
  ["ha", "は"],
  ["he", "へ"],
  ["wo", "を"],
];

const BASIC: [string, string[]][] = [
  ["あ", ["a"]],
  ["い", ["i", "yi"]],
  ["う", ["u", "wu"]],
  ["え", ["e"]],
  ["お", ["o"]],
  ["か", ["ka", "ca"]],
  ["き", ["ki"]],
  ["く", ["ku", "cu", "qu"]],
  ["け", ["ke"]],
  ["こ", ["ko", "co"]],
  ["さ", ["sa"]],
  ["し", ["shi", "si", "ci"]],
  ["す", ["su"]],
  ["せ", ["se", "ce"]],
  ["そ", ["so"]],
  ["た", ["ta"]],
  ["ち", ["chi", "ti"]],
  ["つ", ["tsu", "tu"]],
  ["て", ["te"]],
  ["と", ["to"]],
  ["な", ["na"]],
  ["に", ["ni"]],
  ["ぬ", ["nu"]],
  ["ね", ["ne"]],
  ["の", ["no"]],
  ["は", ["ha", "wa"]],
  ["ひ", ["hi"]],
  ["ふ", ["fu", "hu"]],
  ["へ", ["he", "e"]],
  ["ほ", ["ho"]],
  ["ま", ["ma"]],
  ["み", ["mi"]],
  ["む", ["mu"]],
  ["め", ["me"]],
  ["も", ["mo"]],
  ["や", ["ya"]],
  ["ゆ", ["yu"]],
  ["よ", ["yo"]],
  ["ら", ["ra"]],
  ["り", ["ri"]],
  ["る", ["ru"]],
  ["れ", ["re"]],
  ["ろ", ["ro"]],
  ["わ", ["wa"]],
  ["を", ["wo", "o"]],
  ["が", ["ga"]],
  ["ぎ", ["gi"]],
  ["ぐ", ["gu"]],
  ["げ", ["ge"]],
  ["ご", ["go"]],
  ["ざ", ["za"]],
  ["じ", ["ji", "zi"]],
  ["ず", ["zu", "du"]],
  ["ぜ", ["ze"]],
  ["ぞ", ["zo"]],
  ["だ", ["da"]],
  ["ぢ", ["di"]],
  ["づ", ["du"]],
  ["で", ["de"]],
  ["ど", ["do"]],
  ["ば", ["ba"]],
  ["び", ["bi"]],
  ["ぶ", ["bu"]],
  ["べ", ["be"]],
  ["ぼ", ["bo"]],
  ["ぱ", ["pa"]],
  ["ぴ", ["pi"]],
  ["ぷ", ["pu"]],
  ["ぺ", ["pe"]],
  ["ぽ", ["po"]],
  ["ぁ", ["xa", "la"]],
  ["ぃ", ["xi", "li", "xyi", "lyi"]],
  ["ぅ", ["xu", "lu"]],
  ["ぇ", ["xe", "le", "xye", "lye"]],
  ["ぉ", ["xo", "lo"]],
  ["ゃ", ["xya", "lya"]],
  ["ゅ", ["xyu", "lyu"]],
  ["ょ", ["xyo", "lyo"]],
  ["ゎ", ["xwa", "lwa"]],
];

function yoon(
  kana: string,
  contracted: string[],
  bases: string[],
  small: string,
): [string, string[]] {
  const extra = bases.flatMap((base) => [`${base}x${small}`, `${base}l${small}`]);
  return [kana, [...contracted, ...extra]];
}

const YOUON: [string, string[]][] = [
  yoon("きゃ", ["kya"], ["ki"], "ya"),
  yoon("きぃ", ["kyi"], ["ki"], "i"),
  yoon("きゅ", ["kyu"], ["ki"], "yu"),
  yoon("きぇ", ["kye"], ["ki"], "e"),
  yoon("きょ", ["kyo"], ["ki"], "yo"),
  yoon("ぎゃ", ["gya"], ["gi"], "ya"),
  yoon("ぎゅ", ["gyu"], ["gi"], "yu"),
  yoon("ぎぇ", ["gye"], ["gi"], "e"),
  yoon("ぎょ", ["gyo"], ["gi"], "yo"),
  yoon("しゃ", ["sha", "sya"], ["shi", "si", "ci"], "ya"),
  yoon("しゅ", ["shu", "syu"], ["shi", "si", "ci"], "yu"),
  yoon("しぇ", ["she", "sye"], ["shi", "si", "ci"], "e"),
  yoon("しょ", ["sho", "syo"], ["shi", "si", "ci"], "yo"),
  yoon("じゃ", ["ja", "jya", "zya"], ["ji", "zi"], "ya"),
  yoon("じゅ", ["ju", "jyu", "zyu"], ["ji", "zi"], "yu"),
  yoon("じぇ", ["je", "jye", "zye"], ["ji", "zi"], "e"),
  yoon("じょ", ["jo", "jyo", "zyo"], ["ji", "zi"], "yo"),
  yoon("ちゃ", ["cha", "tya", "cya"], ["chi", "ti"], "ya"),
  yoon("ちゅ", ["chu", "tyu", "cyu"], ["chi", "ti"], "yu"),
  yoon("ちぇ", ["che", "tye", "cye"], ["chi", "ti"], "e"),
  yoon("ちょ", ["cho", "tyo", "cyo"], ["chi", "ti"], "yo"),
  yoon("にゃ", ["nya"], ["ni"], "ya"),
  yoon("にゅ", ["nyu"], ["ni"], "yu"),
  yoon("にょ", ["nyo"], ["ni"], "yo"),
  yoon("ひゃ", ["hya"], ["hi"], "ya"),
  yoon("ひゅ", ["hyu"], ["hi"], "yu"),
  yoon("ひょ", ["hyo"], ["hi"], "yo"),
  yoon("びゃ", ["bya"], ["bi"], "ya"),
  yoon("びゅ", ["byu"], ["bi"], "yu"),
  yoon("びょ", ["byo"], ["bi"], "yo"),
  yoon("ぴゃ", ["pya"], ["pi"], "ya"),
  yoon("ぴゅ", ["pyu"], ["pi"], "yu"),
  yoon("ぴょ", ["pyo"], ["pi"], "yo"),
  yoon("みゃ", ["mya"], ["mi"], "ya"),
  yoon("みゅ", ["myu"], ["mi"], "yu"),
  yoon("みょ", ["myo"], ["mi"], "yo"),
  yoon("りゃ", ["rya"], ["ri"], "ya"),
  yoon("りゅ", ["ryu"], ["ri"], "yu"),
  yoon("りょ", ["ryo"], ["ri"], "yo"),
  yoon("ふぁ", ["fa", "hua"], ["fu", "hu"], "a"),
  yoon("ふぃ", ["fi", "hui"], ["fu", "hu"], "i"),
  yoon("ふぇ", ["fe", "hue"], ["fu", "hu"], "e"),
  yoon("ふぉ", ["fo", "huo"], ["fu", "hu"], "o"),
  yoon("ふゃ", ["fya"], ["fu", "hu"], "ya"),
  yoon("ふゅ", ["fyu"], ["fu", "hu"], "yu"),
  yoon("ふょ", ["fyo"], ["fu", "hu"], "yo"),
];

const KANA_SPELLINGS = new Map<string, string[]>();
const PARSE: { spelling: string; kana: string }[] = [];

function addKana(kana: string, spellings: string[]) {
  const prev = KANA_SPELLINGS.get(kana) ?? [];
  const merged = [...new Set([...prev, ...spellings])];
  KANA_SPELLINGS.set(kana, merged);
}

for (const [kana, spellings] of YOUON) addKana(kana, spellings);
for (const [kana, spellings] of BASIC) {
  if (spellings.length > 0) addKana(kana, spellings);
}

{
  const seen = new Set<string>();
  for (const [spelling, kana] of PARSE_FIRST) {
    seen.add(spelling);
    PARSE.push({ spelling, kana });
  }
  const rows: { spelling: string; kana: string }[] = [];
  for (const [kana, spellings] of KANA_SPELLINGS) {
    for (const spelling of spellings) rows.push({ spelling, kana });
  }
  rows.sort(
    (a, b) => b.spelling.length - a.spelling.length || a.spelling.localeCompare(b.spelling),
  );
  for (const row of rows) {
    if (seen.has(row.spelling)) continue;
    seen.add(row.spelling);
    PARSE.push(row);
  }
  PARSE.sort((a, b) => b.spelling.length - a.spelling.length);
}

function toHiragana(ch: string): string {
  const code = ch.codePointAt(0);
  if (code === undefined) return ch;
  if (code >= 0x30a1 && code <= 0x30f6) return String.fromCodePoint(code - 0x60);
  return ch;
}

function isLetter(ch: string): boolean {
  return /[a-z']/i.test(ch);
}

function isConsonant(ch: string): boolean {
  return /[bcdfghjklmprstvwxyz]/i.test(ch);
}

function unique(list: string[]): string[] {
  return [...new Set(list)];
}

function cartesian(parts: string[][]): string[] {
  return parts.reduce<string[]>(
    (acc, list) => acc.flatMap((head) => list.map((item) => head + item)),
    [""],
  );
}

function nSpellings(): string[] {
  return ["n", "nn", "n'", "xn"];
}

function sokuonSpellings(cons: string): string[] {
  return unique([cons, "xtu", "ltu", "xtsu", "ltsu"]);
}

function kanaSpellings(kana: string): string[] {
  return KANA_SPELLINGS.get(kana) ?? [kana];
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (!isLetter(ch)) {
      tokens.push({ kind: "lit", text: ch });
      i += 1;
      continue;
    }
    if (isConsonant(ch) && ch !== "n" && input[i + 1] === ch) {
      tokens.push({ kind: "sokuon", cons: ch });
      i += 1;
      continue;
    }
    let matched: { spelling: string; kana: string } | null = null;
    for (const row of PARSE) {
      if (input.startsWith(row.spelling, i)) {
        matched = row;
        break;
      }
    }
    if (matched) {
      tokens.push({ kind: "kana", kana: matched.kana });
      i += matched.spelling.length;
      continue;
    }
    if (ch === "n") {
      if (input[i + 1] === "'") {
        tokens.push({ kind: "n" });
        i += 2;
        continue;
      }
      if (input[i + 1] === "n") {
        tokens.push({ kind: "n" });
        i += 2;
        continue;
      }
      tokens.push({ kind: "n" });
      i += 1;
      continue;
    }
    tokens.push({ kind: "lit", text: ch });
    i += 1;
  }
  return tokens;
}

function tokenSpellings(token: Token): string[] {
  if (token.kind === "lit") return [token.text];
  if (token.kind === "sokuon") return sokuonSpellings(token.cons);
  if (token.kind === "n") return nSpellings();
  return kanaSpellings(token.kana);
}

function expandTokens(tokens: Token[]): string[] {
  if (tokens.length === 0) return [""];
  return cartesian(tokens.map(tokenSpellings));
}

function orderTexts(texts: string[], canonical: string): string[] {
  const items = unique([canonical, ...texts.filter((text) => text !== canonical)]);
  return items;
}

function chunkOf(
  displayChars: number,
  canonical: string,
  texts: string[],
  splitOf: (text: string) => number[],
): Chunk {
  return {
    displayChars,
    canonical,
    spellings: orderTexts(texts, canonical).map((text) => ({ text, splits: splitOf(text) })),
  };
}

function oneSplit(text: string): number[] {
  return [text.length];
}

function trailOf(typing: string, core: RegExp): string {
  const match = typing.match(core);
  return match ? typing.slice(match[0].length) : "";
}

function yoOnTrail(smallTyping: string): string {
  let i = smallTyping.length;
  while (i > 0 && !isLetter(smallTyping[i - 1]!)) i -= 1;
  return smallTyping.slice(i);
}

function firstSplit(text: string, trail: string, baseKana: string): number {
  const core = trail ? text.slice(0, text.length - trail.length) : text;
  const bases = kanaSpellings(baseKana);
  let split = 1;
  let found = false;
  for (const base of bases) {
    if (core.startsWith(base)) {
      found = true;
      if (base.length > split) split = base.length;
    }
  }
  if (!found) split = 1;
  return split;
}

function specialChunk(seg: Segment): Chunk | null {
  const display = seg.display;
  const typing = seg.typing;
  if (display === "っ" || display === "ッ") {
    const cons = typing.match(/[bcdfghjklmprstvwxyz]/i)?.[0] ?? "t";
    const trail = typing.replace(cons, "");
    return chunkOf(
      1,
      typing,
      sokuonSpellings(cons).map((s) => s + trail),
      oneSplit,
    );
  }
  if (display === "ん" || display === "ン") {
    const trail = trailOf(typing, /^(xn|nn|n'|n)/);
    return chunkOf(
      1,
      typing,
      nSpellings().map((s) => s + trail),
      oneSplit,
    );
  }
  if (display === "を" || display === "ヲ") {
    const trail = trailOf(typing, /^(wo|o)/);
    return chunkOf(
      1,
      `wo${trail}`,
      ["wo", "o"].map((s) => s + trail),
      oneSplit,
    );
  }
  if (display === "へ" || display === "ヘ") {
    const trail = trailOf(typing, /^(he|e)/);
    return chunkOf(
      1,
      typing,
      ["e", "he"].map((s) => s + trail),
      oneSplit,
    );
  }
  if (display === "は" || display === "ハ") {
    const trail = trailOf(typing, /^(wa|ha)/);
    return chunkOf(
      1,
      `ha${trail}`,
      ["ha", "wa"].map((s) => s + trail),
      oneSplit,
    );
  }
  if (SMALL.has(display)) {
    const kana = toHiragana(display);
    const trail = yoOnTrail(typing);
    const core = typing.slice(0, typing.length - trail.length);
    return chunkOf(
      1,
      typing,
      unique([core, ...kanaSpellings(kana)].filter((s) => s.length > 0)).map((s) => s + trail),
      oneSplit,
    );
  }
  return null;
}

function yoOnChunk(base: Segment, small: Segment): Chunk {
  const canonical = base.typing + small.typing;
  const baseKana = toHiragana(base.display);
  const smallKana = toHiragana(small.display);
  const kana = baseKana + smallKana;
  const trail = yoOnTrail(small.typing);
  const coreCanon = trail ? canonical.slice(0, canonical.length - trail.length) : canonical;
  const fromTable = KANA_SPELLINGS.get(kana) ?? [];
  const fromParse = expandTokens(tokenize(coreCanon));
  const cores = unique([coreCanon, ...fromTable, ...fromParse]);
  return chunkOf(
    2,
    canonical,
    cores.map((s) => s + trail),
    (text) => [firstSplit(text, trail, baseKana), text.length],
  );
}

function generalChunk(seg: Segment): Chunk {
  const special = specialChunk(seg);
  if (special) return special;
  return chunkOf(1, seg.typing, expandTokens(tokenize(seg.typing)), oneSplit);
}

function canAttachSmall(base: Segment, small: Segment): boolean {
  if (!SMALL.has(small.display)) return false;
  if (SMALL.has(base.display)) return false;
  if (base.display === "っ" || base.display === "ッ") return false;
  if (base.display === "ん" || base.display === "ン") return false;
  return true;
}

export function buildChunks(segments: Segment[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!;
    const next = segments[i + 1];
    if (next && canAttachSmall(seg, next)) {
      chunks.push(yoOnChunk(seg, next));
      i += 1;
      continue;
    }
    chunks.push(generalChunk(seg));
  }
  return chunks;
}

function completedDisplays(sp: Spelling, typedLen: number): number {
  let count = 0;
  for (const split of sp.splits) {
    if (typedLen >= split) count += 1;
    else break;
  }
  return count;
}

function collect(chunks: Chunk[], typed: string): Cand[] {
  const out: Cand[] = [];
  const walk = (chunkIndex: number, offset: number, chosen: string[], displayIndex: number) => {
    if (offset === typed.length) {
      out.push({ chosen, chunkIndex, current: null, prefix: "", displayIndex });
      return;
    }
    const chunk = chunks[chunkIndex];
    if (!chunk) return;
    const rest = typed.slice(offset);
    for (const spelling of chunk.spellings) {
      if (spelling.text.startsWith(rest)) {
        if (rest.length === spelling.text.length) {
          walk(
            chunkIndex + 1,
            offset + spelling.text.length,
            [...chosen, spelling.text],
            displayIndex + chunk.displayChars,
          );
        } else {
          out.push({
            chosen,
            chunkIndex,
            current: spelling.text,
            prefix: rest,
            displayIndex: displayIndex + completedDisplays(spelling, rest.length),
          });
        }
      } else if (rest.startsWith(spelling.text)) {
        walk(
          chunkIndex + 1,
          offset + spelling.text.length,
          [...chosen, spelling.text],
          displayIndex + chunk.displayChars,
        );
      }
    }
  };
  walk(0, 0, [], 0);
  return out;
}

function scoreCand(cand: Cand, chunks: Chunk[]): [number, number, number, number] {
  let canonChosen = 0;
  for (let i = 0; i < cand.chosen.length; i += 1) {
    if (cand.chosen[i] === chunks[i]?.canonical) canonChosen += 1;
  }
  let canonCur = 0;
  if (cand.current) {
    const canonical = chunks[cand.chunkIndex]?.canonical ?? "";
    if (canonical.startsWith(cand.prefix)) canonCur = cand.current === canonical ? 2 : 1;
  } else {
    canonCur = 2;
  }
  return [canonChosen, canonCur, cand.displayIndex, cand.chosen.length];
}

function better(a: [number, number, number, number], b: [number, number, number, number]): boolean {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]! !== b[i]!) return a[i]! > b[i]!;
  }
  return false;
}

function pickPreferred(cands: Cand[], chunks: Chunk[]): Cand {
  let best = cands[0]!;
  let bestScore = scoreCand(best, chunks);
  for (let i = 1; i < cands.length; i += 1) {
    const cand = cands[i]!;
    const score = scoreCand(cand, chunks);
    if (better(score, bestScore)) {
      best = cand;
      bestScore = score;
    }
  }
  return best;
}

function visibleFrom(cand: Cand, chunks: Chunk[]): string {
  const head = cand.chosen.join("");
  if (cand.current) {
    return (
      head +
      cand.current +
      chunks
        .slice(cand.chunkIndex + 1)
        .map((chunk) => chunk.canonical)
        .join("")
    );
  }
  return (
    head +
    chunks
      .slice(cand.chunkIndex)
      .map((chunk) => chunk.canonical)
      .join("")
  );
}

const chunkCache = new WeakMap<Problem, Chunk[]>();

function chunksFor(problem: Problem): Chunk[] {
  const cached = chunkCache.get(problem);
  if (cached) return cached;
  const chunks = buildChunks(problem.segments ?? []);
  chunkCache.set(problem, chunks);
  return chunks;
}

export function progressFor(problem: Problem, typed: string): Progress | null {
  if (!problem.segments) return null;
  const chunks = chunksFor(problem);
  if (typed.length === 0) {
    return {
      visible: chunks.map((chunk) => chunk.canonical).join(""),
      displayIndex: 0,
      complete: chunks.length === 0,
    };
  }
  const cands = collect(chunks, typed);
  if (cands.length === 0) return null;
  const best = pickPreferred(cands, chunks);
  return {
    visible: visibleFrom(best, chunks),
    displayIndex: best.displayIndex,
    complete: best.chunkIndex >= chunks.length && best.current === null,
  };
}

export function consumeDisplaySpaces(problem: Problem, typed: string): string {
  let current = typed;
  while (true) {
    const progress = progressFor(problem, current);
    if (!progress || progress.complete) return current;
    if (progress.visible[current.length] !== " ") return current;
    const next = `${current} `;
    if (!progressFor(problem, next)) return current;
    current = next;
  }
}
