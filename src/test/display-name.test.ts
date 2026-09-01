import { describe, expect, it } from "vite-plus/test";
import { DEFAULT_DISPLAY_NAME, parseDisplayName } from "../lib/display-name.ts";

describe("parseDisplayName", () => {
  it("uses ゲスト for empty input", () => {
    expect(parseDisplayName("")).toEqual({ ok: true, name: DEFAULT_DISPLAY_NAME });
    expect(parseDisplayName("   ")).toEqual({ ok: true, name: DEFAULT_DISPLAY_NAME });
    expect(parseDisplayName(undefined)).toEqual({ ok: true, name: DEFAULT_DISPLAY_NAME });
  });

  it("accepts 1 to 12 characters", () => {
    expect(parseDisplayName("ひ")).toEqual({ ok: true, name: "ひ" });
    expect(parseDisplayName("あ".repeat(12))).toEqual({ ok: true, name: "あ".repeat(12) });
  });

  it("rejects more than 12 characters", () => {
    expect(parseDisplayName("あ".repeat(13))).toEqual({ ok: false, error: "too_long" });
  });
});
