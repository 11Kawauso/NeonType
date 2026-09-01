import { describe, expect, it } from "vite-plus/test";
import { pickNextId } from "../lib/picker.ts";

describe("pickNextId", () => {
  it("never returns the last id when another exists", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      seen.add(pickNextId(["a", "b", "c"], "a", () => 0));
    }
    expect(seen.has("a")).toBe(false);
    expect(seen.has("b")).toBe(true);
  });

  it("falls back to the only problem when the pool has one item", () => {
    expect(pickNextId(["only"], "only")).toBe("only");
  });
});
