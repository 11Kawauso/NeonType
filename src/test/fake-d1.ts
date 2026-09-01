type ProblemRow = {
  id: string;
  mode: string;
  source: string;
  display_text: string;
  typing_text: string;
  segments: string | null;
};

export type ResultRow = {
  id: string;
  anon_id: string;
  mode: string;
  duration: number;
  score: number;
  max_combo: number;
  perfect_count: number;
  correct_count: number;
  miss_count: number;
  name: string | null;
  registered_at: string | null;
  created_at: string;
};

export function createFakeDb(problems: ProblemRow[] = [], results: ResultRow[] = []) {
  return {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async all() {
              if (sql.includes("FROM problems")) {
                return { results: problems.filter((row) => row.mode === params[0]) };
              }
              if (
                sql.includes("registered_at IS NOT NULL") &&
                sql.includes("ORDER BY score DESC")
              ) {
                const rows = results
                  .filter(
                    (row) =>
                      row.mode === params[0] && row.duration === params[1] && row.registered_at,
                  )
                  .toSorted(
                    (a, b) =>
                      b.score - a.score ||
                      (a.registered_at ?? "").localeCompare(b.registered_at ?? ""),
                  )
                  .slice(0, 10);
                return { results: rows };
              }
              return { results: [] };
            },
            async first() {
              if (sql.includes("FROM results WHERE id = ?")) {
                return results.find((row) => row.id === params[0]) ?? null;
              }
              if (
                sql.includes("WHERE anon_id = ? AND registered_at IS NOT NULL") &&
                sql.includes("ORDER BY registered_at DESC")
              ) {
                const matches = results
                  .filter((row) => row.anon_id === params[0] && row.registered_at)
                  .toSorted((a, b) => (b.registered_at ?? "").localeCompare(a.registered_at ?? ""));
                return matches[0] ?? null;
              }
              if (sql.includes("anon_id = ?")) {
                const matches = results
                  .filter(
                    (row) =>
                      row.mode === params[0] &&
                      row.duration === params[1] &&
                      row.anon_id === params[2],
                  )
                  .toSorted((a, b) => {
                    const ar = a.registered_at ? 0 : 1;
                    const br = b.registered_at ? 0 : 1;
                    return ar - br || b.score - a.score;
                  });
                return matches[0] ?? null;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT INTO results")) {
                results.push({
                  id: String(params[0]),
                  anon_id: String(params[1]),
                  mode: String(params[2]),
                  duration: Number(params[3]),
                  score: Number(params[4]),
                  max_combo: Number(params[5]),
                  perfect_count: Number(params[6]),
                  correct_count: Number(params[7]),
                  miss_count: Number(params[8]),
                  name: null,
                  registered_at: null,
                  created_at: String(params[9]),
                });
                return { success: true, meta: { changes: 1 } };
              }
              if (sql.includes("UPDATE results SET name = ? WHERE anon_id")) {
                let changes = 0;
                for (const row of results) {
                  if (row.anon_id === params[1] && row.registered_at) {
                    row.name = String(params[0]);
                    changes += 1;
                  }
                }
                return { success: true, meta: { changes } };
              }
              if (sql.includes("UPDATE results SET name")) {
                const row = results.find((item) => item.id === params[2]);
                if (row) {
                  row.name = String(params[0]);
                  row.registered_at = String(params[1]);
                  return { success: true, meta: { changes: 1 } };
                }
              }
              return { success: true, meta: { changes: 0 } };
            },
          };
        },
      };
    },
  };
}
