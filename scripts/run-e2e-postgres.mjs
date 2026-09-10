/**
 * Proves the Postgres migrations + full appraisal lifecycle end-to-end:
 *   1. Boots a real (embedded) PostgreSQL server on a scratch data directory
 *   2. Runs `prisma migrate deploy` against it — validates prisma/migrations/0_init
 *   3. Runs the e2e lifecycle test (tests/e2e-lifecycle.test.ts) against it
 *   4. Stops the server and deletes the data directory
 *
 * Usage:
 *   npm install --no-save embedded-postgres   # one-time, pulls your platform's real Postgres binary
 *   node scripts/run-e2e-postgres.mjs
 */
import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PORT = 5433;
const DB = "appraisal_e2e";
const USER = "postgres";
const PASSWORD = "e2e-only-password";
const DATA_DIR = join(tmpdir(), `appraisal-e2e-pg-${process.pid}`);
const URL_BASE = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB}`;

function step(msg) {
  console.log(`\n=== ${msg} ===`);
}

rmSync(DATA_DIR, { recursive: true, force: true });

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: false,
});

let exitCode = 1;
try {
  step("1/4 Starting embedded PostgreSQL");
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);
  console.log(`Postgres listening on 127.0.0.1:${PORT} (data: ${DATA_DIR})`);

  step("2/4 prisma migrate deploy (validates prisma/migrations/0_init)");
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: URL_BASE, DIRECT_URL: URL_BASE },
  });

  step("3/4 e2e lifecycle test (assign → complete → submit → review → sign off → export)");
  execSync("npx vitest run tests/e2e-lifecycle.test.ts", {
    stdio: "inherit",
    env: { ...process.env, TEST_DATABASE_URL: URL_BASE },
  });

  step("4/4 Result");
  console.log("PASS — migrations deploy cleanly and the full lifecycle works on real Postgres.");
  exitCode = 0;
} catch (err) {
  console.error("\nE2E FAILED:", err?.message ?? err);
  process.exitCode = 1;
} finally {
  try {
    await pg.stop();
  } catch {}
  rmSync(DATA_DIR, { recursive: true, force: true });
  console.log("\nEmbedded Postgres stopped, scratch data removed.");
}
process.exit(exitCode);
