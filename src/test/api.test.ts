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

  it("updates every registered name for the same anon_id", async () => {
    const results: ResultRow[] = [
      registered("r1", "anon-1", "ひ", 34530, "2026-09-01T00:00:01Z"),
      registered("r2", "anon-1", "ひあ", 33570, "2026-09-01T00:00:02Z"),
      registered("r3", "anon-2", "他人", 12000, "2026-09-01T00:00:03Z"),
    ];
    const db = createFakeDb([], results);
    const res = await app.request(
      "/api/name",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId: "anon-1", name: "ネオン" }),
      },
      env(db),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "ネオン", updated: 2 });
    expect(results.map((row) => row.name)).toEqual(["ネオン", "ネオン", "他人"]);
  });

  it("saves an empty name as ゲスト", async () => {
    const results: ResultRow[] = [registered("r1", "anon-1", "ひ", 100, "2026-09-01T00:00:01Z")];
    const db = createFakeDb([], results);
    const res = await app.request(
      "/api/name",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId: "anon-1", name: "   " }),
      },
      env(db),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ name: "ゲスト" });
    expect(results[0]?.name).toBe("ゲスト");
  });

  it("rejects a name longer than 12 characters", async () => {
    const res = await app.request(
      "/api/name",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId: "anon-1", name: "あ".repeat(13) }),
      },
      env(createFakeDb()),
    );
    expect(res.status).toBe(400);
  });

  it("does not let a later result invent a new display name", async () => {
    const db = createFakeDb();
    const firstId = await createResult(db, "anon-1", 1800);
    const secondId = await createResult(db, "anon-1", 2200);
    const first = await app.request(
      `/api/results/${firstId}/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId: "anon-1", name: "ひ" }),
      },
      env(db),
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ name: "ひ" });
    const second = await app.request(
      `/api/results/${secondId}/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId: "anon-1", name: "ひあ" }),
      },
      env(db),
    );
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ name: "ひ" });
  });
});

function registered(
  id: string,
  anonId: string,
  name: string,
  score: number,
  at: string,
): ResultRow {
  return {
    id,
    anon_id: anonId,
    mode: "long",
    duration: 180,
    score,
    max_combo: 1,
    perfect_count: 0,
    correct_count: 1,
    miss_count: 0,
    name,
    registered_at: at,
    created_at: at,
  };
}

async function createResult(
  db: ReturnType<typeof createFakeDb>,
  anonId: string,
  score: number,
): Promise<string> {
  const created = await app.request(
    "/api/results",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonId,
        mode: "long",
        duration: 180,
        score,
        maxCombo: 1,
        perfectCount: 0,
        correctCount: 1,
        missCount: 0,
      }),
    },
    env(db),
  );
  const { id } = (await created.json()) as { id: string };
  return id;
}
