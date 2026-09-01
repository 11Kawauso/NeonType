import { Hono } from "hono";
import { parseDisplayName } from "../src/lib/display-name.ts";
import type { Env } from "./env.ts";

const MODES = new Set(["long", "code"]);
const DURATIONS = new Set([180, 300]);

function isMode(value: string | undefined): value is "long" | "code" {
  return value === "long" || value === "code";
}

function isDuration(value: number): value is 180 | 300 {
  return DURATIONS.has(value);
}

function isNonNegInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export function createApp() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/api/problems", async (c) => {
    const mode = c.req.query("mode");
    if (!isMode(mode)) return c.json({ error: "invalid mode" }, 400);
    const { results } = await c.env.DB.prepare(
      "SELECT id, mode, source, display_text, typing_text, segments FROM problems WHERE mode = ?",
    )
      .bind(mode)
      .all();
    return c.json({ problems: results });
  });

  app.post("/api/results", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const anonId = typeof body.anonId === "string" ? body.anonId : "";
    const mode = typeof body.mode === "string" ? body.mode : "";
    const duration = typeof body.duration === "number" ? body.duration : NaN;
    if (!anonId || !MODES.has(mode) || !isDuration(duration)) {
      return c.json({ error: "invalid body" }, 400);
    }
    if (
      !isNonNegInt(body.score) ||
      !isNonNegInt(body.maxCombo) ||
      !isNonNegInt(body.perfectCount) ||
      !isNonNegInt(body.correctCount) ||
      !isNonNegInt(body.missCount)
    ) {
      return c.json({ error: "invalid body" }, 400);
    }
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO results
        (id, anon_id, mode, duration, score, max_combo, perfect_count, correct_count, miss_count, name, registered_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
    )
      .bind(
        id,
        anonId,
        mode,
        duration,
        body.score,
        body.maxCombo,
        body.perfectCount,
        body.correctCount,
        body.missCount,
        createdAt,
      )
      .run();
    return c.json({ id }, 201);
  });

  app.post("/api/results/:id/register", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<Record<string, unknown>>();
    const anonId = typeof body.anonId === "string" ? body.anonId : "";
    const row = await c.env.DB.prepare(
      "SELECT id, anon_id, registered_at FROM results WHERE id = ?",
    )
      .bind(id)
      .first<{ id: string; anon_id: string; registered_at: string | null }>();
    if (!row) return c.json({ error: "not found" }, 404);
    if (row.anon_id !== anonId) return c.json({ error: "forbidden" }, 403);
    if (row.registered_at) return c.json({ error: "already registered" }, 409);

    const existing = await c.env.DB.prepare(
      `SELECT name FROM results
        WHERE anon_id = ? AND registered_at IS NOT NULL
        ORDER BY registered_at DESC
        LIMIT 1`,
    )
      .bind(anonId)
      .first<{ name: string }>();

    let name: string;
    if (existing?.name) {
      name = existing.name;
    } else {
      const parsed = parseDisplayName(body.name);
      if (!parsed.ok) return c.json({ error: "invalid name" }, 400);
      name = parsed.name;
    }

    const registeredAt = new Date().toISOString();
    await c.env.DB.prepare("UPDATE results SET name = ?, registered_at = ? WHERE id = ?")
      .bind(name, registeredAt, id)
      .run();
    return c.json({ ok: true, name });
  });

  app.put("/api/name", async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const anonId = typeof body.anonId === "string" ? body.anonId : "";
    if (!anonId) return c.json({ error: "invalid body" }, 400);
    const parsed = parseDisplayName(body.name);
    if (!parsed.ok) return c.json({ error: "invalid name" }, 400);
    const updated = await c.env.DB.prepare(
      "UPDATE results SET name = ? WHERE anon_id = ? AND registered_at IS NOT NULL",
    )
      .bind(parsed.name, anonId)
      .run();
    return c.json({ name: parsed.name, updated: updated.meta.changes ?? 0 });
  });

  app.get("/api/rankings", async (c) => {
    const mode = c.req.query("mode");
    const durationRaw = Number(c.req.query("duration"));
    const anonId = c.req.query("anonId") ?? "";
    if (!isMode(mode) || !isDuration(durationRaw)) {
      return c.json({ error: "invalid query" }, 400);
    }
    const { results } = await c.env.DB.prepare(
      `SELECT name, score, anon_id FROM results
        WHERE mode = ? AND duration = ? AND registered_at IS NOT NULL
        ORDER BY score DESC, registered_at ASC
        LIMIT 10`,
    )
      .bind(mode, durationRaw)
      .all<{ name: string; score: number; anon_id: string }>();

    const top = results.map((row, index) => ({
      rank: index + 1,
      name: row.name,
      score: row.score,
    }));

    let me: { rank: number | null; name: string; score: number } | null = null;
    if (anonId) {
      const best = await c.env.DB.prepare(
        `SELECT name, score, registered_at FROM results
          WHERE mode = ? AND duration = ? AND anon_id = ?
          ORDER BY CASE WHEN registered_at IS NOT NULL THEN 0 ELSE 1 END, score DESC, created_at ASC
          LIMIT 1`,
      )
        .bind(mode, durationRaw, anonId)
        .first<{ name: string | null; score: number; registered_at: string | null }>();
      if (best) {
        const inTop = results.findIndex(
          (row) => row.anon_id === anonId && row.score === best.score,
        );
        if (inTop === -1) {
          me = {
            rank: best.registered_at ? null : null,
            name: best.name ?? "あなた（未登録）",
            score: best.score,
          };
        }
      }
    }

    return c.json({ top, me });
  });

  return app;
}
