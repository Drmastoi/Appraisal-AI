/**
 * Long-running local development Postgres (persistent across restarts).
 * Data lives in .localdb/postgres — safe to kill and restart, data survives.
 * Connection: postgresql://postgres:postgres@127.0.0.1:5434/appraisal_dev
 *
 * Requires: npm install --no-save embedded-postgres (real Postgres binary).
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = 5434;
const DB = "appraisal_dev";
const USER = "postgres";
const PASSWORD = "postgres";
const DATA_DIR = join(process.cwd(), ".localdb", "postgres");

const fresh = !existsSync(join(DATA_DIR, "PG_VERSION"));
console.log(fresh ? `Initialising new cluster at ${DATA_DIR}` : `Reusing existing cluster at ${DATA_DIR}`);

mkdirSync(DATA_DIR, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

try {
  if (fresh) await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(DB);
    console.log(`Created database ${DB}`);
  } catch {
    console.log(`Database ${DB} already exists`);
  }
  console.log(`Postgres ready: postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB}`);
  console.log("Holding open — press Ctrl+C to stop (data persists).");
  const shutdown = async () => {
    try { await pg.stop(); } catch {}
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  setInterval(() => {}, 1 << 30);
} catch (err) {
  console.error("Failed to start:", err?.message ?? err);
  process.exit(1);
}
