import { describe, expect, it } from "vite-plus/test";
import { createApp } from "../../worker/app.ts";
import { createFakeDb, type ResultRow } from "./fake-d1.ts";

const app = createApp();

function env(db: ReturnType<typeof createFakeDb>) {
  return { DB: db as unknown as D1Database };
}

describe("Hono API", () => {
  it("returns problems for a valid mode", async () => {
    const db = createFakeDb([
      {
        id: "long-01",
        mode: "long",
        source: "日常会話より",
        display_text: "あ".repeat(30) + "。",
        typing_text: "a".repeat(30) + ".",
        segments: "[]",
      },
    ]);
    const res = await app.request("/api/problems?mode=long", {}, env(db));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { problems: unknown[] };
    expect(body.problems).toHaveLength(1);
  });

  it("rejects an invalid mode", async () => {
    const res = await app.request("/api/problems?mode=other", {}, env(createFakeDb()));
    expect(res.status).toBe(400);
  });

  it("saves a result and registers a name once", async () => {
    const db = createFakeDb();
    const created = await app.request(
      "/api/results",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonId: "anon-1",
          mode: "long",
          duration: 180,
          score: 1000,
          maxCombo: 2,
          perfectCount: 1,
          correctCount: 10,
          missCount: 0,
        }),
      },
      env(db),
    );
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const registered = await app.request(
      `/api/results/${id}/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId: "anon-1", name: "" }),
      },
      env(db),
    );
    expect(registered.status).toBe(200);
    expect(await registered.json()).toMatchObject({ name: "ゲスト" });
    const again = await app.request(
      `/api/results/${id}/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId: "anon-1", name: "NEON" }),
      },
      env(db),
    );
    expect(again.status).toBe(409);
  });

  it("returns top 10 and an out-of-rank preview", async () => {
    const results: ResultRow[] = Array.from({ length: 11 }, (_, i) => ({
      id: `r${i}`,
      anon_id: `a${i}`,
      mode: "code",
      duration: 300,
      score: 1000 - i,
      max_combo: 1,
      perfect_count: 0,
      correct_count: 1,
      miss_count: 0,
      name: `N${i}`,
      registered_at: `2026-09-01T00:00:${String(i).padStart(2, "0")}Z`,
      created_at: `2026-09-01T00:00:${String(i).padStart(2, "0")}Z`,
    }));
    const db = createFakeDb([], results);
    const res = await app.request("/api/rankings?mode=code&duration=300&anonId=a10", {}, env(db));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { top: { name: string }[]; me: { score: number } | null };
    expect(body.top).toHaveLength(10);
    expect(body.me?.score).toBe(990);
  });
});
