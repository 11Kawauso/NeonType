import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PROBLEMS } from "../src/data/problems.ts";

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const rows = PROBLEMS.map((problem) => {
  const segments = problem.segments ? sqlString(JSON.stringify(problem.segments)) : "NULL";
  return `(${[
    sqlString(problem.id),
    sqlString(problem.mode),
    sqlString(problem.source),
    sqlString(problem.displayText),
    sqlString(problem.typingText),
    segments,
  ].join(", ")})`;
});

const sql = `DELETE FROM problems;
INSERT INTO problems (id, mode, source, display_text, typing_text, segments) VALUES
${rows.join(",\n")};
`;

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "seeds", "seed.sql");
writeFileSync(out, sql);
console.log(`wrote ${PROBLEMS.length} problems to ${out}`);
