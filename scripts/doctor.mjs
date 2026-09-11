#!/usr/bin/env node
/**
 * Single diagnostic command — `npm run doctor`
 *
 * Answers one question: is this checkout healthy? It checks, in order:
 *   1. Tooling      node version, dependencies, generated Prisma client
 *   2. Environment  .env present, DATABASE_URL / DIRECT_URL / AUTH_SECRET set
 *   3. Postgres     TCP reachable, Prisma can actually query, local cluster note
 *   4. Migrations   prisma/migrations vs the _prisma_migrations table (pending/failed/unknown)
 *   5. Seed         bootstrap admin exists, users by role, appraisal count
 *   6. Dev server   the app answers on the expected port (and looks like the app)
 *
 * Read-only: it never writes to the database, never seeds, never starts a server.
 * Every failure prints the exact command that fixes it.
 *
 * Usage:
 *   npm run doctor                     # all checks, dev server expected on 4321
 *   npm run doctor -- --port 3000      # dev server on another port
 *   npm run doctor -- --no-server      # before the server is started
 *   npm run doctor -- --url https://example.com   # check a deployed URL instead
 *   npm run doctor -- --json           # machine-readable output
 *   npm run doctor -- --quiet          # only failures and the summary
 *
 * Exit code 0 = healthy (warnings allowed), 1 = at least one failure.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEV_PORT = 4321;

/* ── args ──────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const OPT = {
  port: Number(opt("port", DEV_PORT)),
  url: opt("url", null),
  checkServer: !flag("no-server"),
  json: flag("json"),
  quiet: flag("quiet"),
};

/* ── result collection ─────────────────────────────────────────────────── */
const results = [];
let currentGroup = "General";
const record = (level, message, hint) => {
  results.push({ level, group: currentGroup, message, hint: hint ?? null });
  if (OPT.json) return;
  if (OPT.quiet && level !== "fail" && level !== "warn") return;
  const glyph = { ok: "✓", fail: "✗", warn: "!", info: "·" }[level];
  process.stdout.write(`  ${glyph} ${message}${hint ? `\n      → ${hint}` : ""}\n`);
};
const ok = (message, hint) => record("ok", message, hint);
const fail = (message, hint) => record("fail", message, hint);
const warn = (message, hint) => record("warn", message, hint);
const info = (message, hint) => record("info", message, hint);
const group = (title) => {
  currentGroup = title;
  if (!OPT.json && !OPT.quiet) process.stdout.write(`\n${title}\n`);
};

/* ── .env loading (no dependency; never overwrites real env) ───────────── */
function loadEnvFile(path) {
  if (!existsSync(path)) return false;
  for (const rawLine of readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
  return true;
}

/* ── small helpers ─────────────────────────────────────────────────────── */
const maskUrl = (url) => {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? "…@" : ""}${u.host}${u.pathname}${u.search}`;
  } catch {
    return "<unparseable>";
  }
};

function tcpCheck(host, port, timeout = 2500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done({ ok: true }));
    socket.once("timeout", () => done({ ok: false, error: `timed out after ${timeout}ms` }));
    socket.once("error", (err) => done({ ok: false, error: err.code ?? err.message }));
  });
}

async function httpCheck(url, timeout = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "manual" });
    const body = res.status < 400 ? await res.text().catch(() => "") : "";
    return { ok: true, status: res.status, body };
  } catch (err) {
    const cause = err?.cause?.code ? ` (${err.cause.code})` : "";
    return { ok: false, error: `${err?.name === "AbortError" ? `timed out after ${timeout}ms` : err?.message}${cause}` };
  } finally {
    clearTimeout(timer);
  }
}

/* Pull the informative line out of a Prisma error (the first line is often
   just "Invalid `prisma.x()` invocation:"). */
function prismaErrorSummary(err) {
  const lines = String(err?.message ?? err)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const interesting = lines.find((l) =>
    /can't reach|authentication|does not exist|denied|timed out|ECONNREFUSED|ENOTFOUND|P1000|P1001|P1003|P1017|P2021|P3005/i.test(l),
  );
  return (interesting ?? lines[0] ?? "unknown error").replace(/\s+/g, " ").slice(0, 200);
}

/* ── 1. tooling ────────────────────────────────────────────────────────── */
function checkTooling() {
  group("Tooling");
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 20) ok(`node ${process.versions.node}`);
  else fail(`node ${process.versions.node} is too old`, "install Node 20 or newer");

  const deps = [
    ["dependencies installed", existsSync(join(ROOT, "node_modules/next")), "npm install"],
    [
      "prisma CLI present",
      existsSync(join(ROOT, "node_modules/prisma")),
      "npm install",
    ],
    [
      "embedded-postgres present (local dev DB)",
      existsSync(join(ROOT, "node_modules/embedded-postgres")),
      "npm install --no-save embedded-postgres",
    ],
    [
      "Prisma client generated",
      existsSync(join(ROOT, "node_modules/.prisma/client")),
      "npx prisma generate",
    ],
  ];
  for (const [label, present, hint] of deps) {
    if (present) ok(label);
    else fail(`${label} — not found`, hint);
  }
  return deps.every(([, present]) => present);
}

/* ── 2. environment ────────────────────────────────────────────────────── */
function checkEnv() {
  group("Environment");
  const envPath = join(ROOT, ".env");
  const loaded = loadEnvFile(envPath);
  if (loaded) ok(".env found and loaded");
  else warn(".env not found", "cp .env.example .env  (see .freebuff/run.md §1)");

  for (const key of ["DATABASE_URL", "DIRECT_URL", "AUTH_SECRET"]) {
    const value = process.env[key];
    if (!value) {
      fail(`${key} is not set`, key === "AUTH_SECRET" ? 'set AUTH_SECRET="<random string>" in .env' : "set it in .env (see .env.example)");
    } else if (key === "DATABASE_URL" || key === "DIRECT_URL") {
      ok(`${key} = ${maskUrl(value)}`);
    } else {
      ok(`${key} is set`);
    }
  }

  const dbUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  if (dbUrl && directUrl && dbUrl !== directUrl) {
    const sameHost = maskUrl(dbUrl).split("@").pop() === maskUrl(directUrl).split("@").pop();
    info(
      sameHost
        ? "DATABASE_URL and DIRECT_URL share a host (pooled vs direct endpoint) — expected for Neon-like setups"
        : "DATABASE_URL and DIRECT_URL point at different hosts — double-check the target",
    );
  }

  const provider = process.env.AI_PROVIDER ?? "mock";
  ok(`AI_PROVIDER = ${provider}${provider === "mock" ? " (offline drafts only)" : ""}`);
  if (provider === "mock") {
    info("AI runs in mock mode — swap to a UK-region endpoint before real data (docs/DEPLOYMENT.md)");
  }

  return Boolean(dbUrl);
}

/* ── 3–5. database: connect, migrations, seed ──────────────────────────── */
async function checkDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  group("Postgres");

  let target;
  try {
    target = new URL(dbUrl);
  } catch {
    fail("DATABASE_URL is not a valid URL", "expected postgresql://user:pass@host:port/db");
    return;
  }
  const host = target.hostname;
  const port = Number(target.port || 5432);
  const local = host === "127.0.0.1" || host === "localhost" || host === "::1";

  const tcp = await tcpCheck(host, port);
  if (tcp.ok) {
    ok(`TCP reachable — ${host}:${port}`);
    if (local) {
      const cluster = join(ROOT, ".localdb/postgres");
      if (existsSync(join(cluster, "PG_VERSION"))) info(`local cluster data at .localdb/postgres (persists across restarts)`);
      else info("no .localdb/postgres cluster yet — scripts/dev-postgres.mjs initialises one on first run");
    }
  } else {
    fail(`cannot connect to ${host}:${port} — ${tcp.error}`, local ? "npm run dev:db   (or: node scripts/dev-postgres.mjs)" : "check the host/port and your network or Neon project status");
  }

  // Prisma client — proves auth + TLS + schema visibility, not just an open port.
  let prisma;
  try {
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    ok("Prisma connected and ran a query");
  } catch (err) {
    fail(`Prisma query failed — ${prismaErrorSummary(err)}`, "npx prisma generate && npx prisma migrate deploy");
    try {
      await prisma?.$disconnect();
    } catch {}
    return;
  }

  /* 4. migrations */
  group("Migrations");
  let applied = [];
  let tableMissing = false;
  try {
    applied = await prisma.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations`;
  } catch {
    tableMissing = true;
  }

  const localMigrations = existsSync(join(ROOT, "prisma/migrations"))
    ? readdirSync(join(ROOT, "prisma/migrations"), { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort()
    : [];

  if (tableMissing) {
    fail("no _prisma_migrations table — the database has never been migrated", "npx prisma migrate deploy");
  } else {
    const appliedNames = applied.map((m) => m.migration_name);
    const pending = localMigrations.filter((m) => !appliedNames.includes(m));
    const failed = applied.filter((m) => m.finished_at == null || m.rolled_back_at != null).map((m) => m.migration_name);
    const unknown = appliedNames.filter((m) => !localMigrations.includes(m));

    if (failed.length) {
      fail(`failed/rolled-back migration(s): ${failed.join(", ")}`, "npx prisma migrate status, then resolve before deploying");
    } else if (pending.length) {
      fail(`pending migration(s) not applied: ${pending.join(", ")}`, "npx prisma migrate deploy");
    } else {
      ok(`${appliedNames.length} migration(s) applied, none pending`);
    }
    if (unknown.length) {
      warn(`database has migration(s) absent from prisma/migrations: ${unknown.join(", ")}`, "you may be pointed at another branch/environment");
    }
  }

  /* 5. seed */
  group("Seed / data");
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@portal.nhs.uk").toLowerCase();
  let users = [];
  let appraisals = 0;
  try {
    users = await prisma.user.findMany({ select: { role: true, email: true, approved: true, active: true } });
    appraisals = await prisma.appraisal.count();
  } catch (err) {
    fail(`cannot read tables — ${prismaErrorSummary(err)}`, "npx prisma migrate deploy, then npm run db:seed");
    await prisma.$disconnect();
    return;
  }

  if (!users.length) {
    fail("no users at all — nobody can sign in", "SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD='…' npm run db:seed");
  } else {
    const byRole = users.reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] ?? 0) + 1 }), {});
    const roleSummary = Object.entries(byRole)
      .map(([role, count]) => `${count} ${role.toLowerCase()}${count > 1 ? "s" : ""}`)
      .join(" · ");
    ok(`${users.length} user(s): ${roleSummary}`);
  }

  const admin = users.find((u) => u.email.toLowerCase() === adminEmail);
  if (!admin) {
    const anyAdmin = users.some((u) => u.role === "ADMIN");
    if (anyAdmin) warn(`bootstrap admin ${adminEmail} not found (another admin exists)`, "SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD='…' npm run db:seed");
    else fail("no ADMIN account — new registrations can never be approved", "SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD='…' npm run db:seed");
  } else {
    if (!admin.approved) fail(`admin ${admin.email} is not approved — sign-in will be refused`, "approve it, or re-run the seed");
    else if (!admin.active) fail(`admin ${admin.email} is deactivated — sign-in will be refused`, "reactivate it under Admin → Users");
    else ok(`bootstrap admin ready (${admin.email})`);
  }

  const pendingApproval = users.filter((u) => !u.approved && u.active).length;
  if (pendingApproval) info(`${pendingApproval} account(s) awaiting approval under Admin → Users`);

  if (appraisals === 0) {
    info("no appraisals yet — expected on a fresh install; the admin creates the first one");
  } else {
    ok(`${appraisals} appraisal(s) in the database`);
  }

  await prisma.$disconnect();
}

/* ── 6. dev server / deployed URL ──────────────────────────────────────── */
async function checkServer() {
  group(OPT.url ? "Deployed site" : "Dev server");
  if (!OPT.checkServer) {
    info("skipped (--no-server)");
    return;
  }
  const base = OPT.url ?? `http://localhost:${OPT.port}`;
  if (!OPT.url) {
    const tcp = await tcpCheck("127.0.0.1", OPT.port, 1500);
    if (!tcp.ok) {
      fail(
        `nothing listening on port ${OPT.port} — ${tcp.error}`,
        `start it detached (see .freebuff/run.md §3), or: node node_modules/next/dist/bin/next dev --port ${OPT.port} --webpack`,
      );
      info("on macOS this project must run with --webpack (Turbopack hits a ~/Downloads permission denial)");
      return;
    }
  }
  const res = await httpCheck(base);
  if (!res.ok) {
    fail(`${base} did not answer — ${res.error}`, "check the server log in .freebuff/");
    return;
  }
  if (res.status >= 400) {
    fail(`${base} answered HTTP ${res.status}`, "it is listening but not serving the app — check the log");
    return;
  }
  const looksLikeApp = /AppraisalPortal|Medical Appraisal|MAG 2022/i.test(res.body);
  if (looksLikeApp) ok(`${base} → HTTP ${res.status}, app markup detected`);
  else warn(`${base} → HTTP ${res.status}, but the response does not look like this app`, "another process may be using this port");
}

/* ── run ───────────────────────────────────────────────────────────────── */
const startedAt = Date.now();
if (!OPT.json) process.stdout.write("AppraisalPortal UK — health check\n");

const toolingOk = checkTooling();
const envOk = checkEnv();
if (envOk) await checkDatabase();
else fail("database checks skipped", "set DATABASE_URL in .env, then re-run npm run doctor");
await checkServer();

const failures = results.filter((r) => r.level === "fail");
const warnings = results.filter((r) => r.level === "warn");
const healthy = failures.length === 0;
const elapsed = Date.now() - startedAt;

if (OPT.json) {
  process.stdout.write(
    JSON.stringify(
      {
        healthy,
        failures: failures.length,
        warnings: warnings.length,
        durationMs: elapsed,
        port: OPT.port,
        url: OPT.url ?? (OPT.checkServer ? `http://localhost:${OPT.port}` : null),
        checks: results,
      },
      null,
      2,
    ) + "\n",
  );
} else {
  process.stdout.write(`\n${"─".repeat(58)}\n`);
  if (healthy && !warnings.length) process.stdout.write(`HEALTHY — every check passed (${elapsed}ms)\n`);
  else if (healthy) process.stdout.write(`HEALTHY — ${warnings.length} warning(s), ${failures.length} failure(s) (${elapsed}ms)\n`);
  else process.stdout.write(`UNHEALTHY — ${failures.length} failure(s), ${warnings.length} warning(s) (${elapsed}ms)\n`);
  for (const r of [...failures, ...warnings]) {
    process.stdout.write(`  ${r.level === "fail" ? "✗" : "!"} ${r.group}: ${r.message}${r.hint ? `\n      → ${r.hint}` : ""}\n`);
  }
}

process.exit(healthy ? 0 : 1);
