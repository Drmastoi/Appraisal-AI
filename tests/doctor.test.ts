import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";

/**
 * Guards the `npm run doctor` diagnostic. DB-free and deterministic: it drives the
 * script against a deliberately unreachable database/host so it exercises the
 * failure paths (the healthy path needs a live Postgres, and is covered manually
 * and by the preview run doc).
 */
const SCRIPT = path.join(process.cwd(), "scripts", "doctor.mjs");
const DEAD_PORT = 5999;
const DEAD_URL = `postgresql://postgres:postgres@127.0.0.1:${DEAD_PORT}/doctor_test`;

type Check = { level: "ok" | "fail" | "warn" | "info"; group: string; message: string; hint: string | null };
type Report = {
  healthy: boolean;
  failures: number;
  warnings: number;
  durationMs: number;
  port: number;
  url: string | null;
  checks: Check[];
};

function runDoctor(args: string[]): { status: number | null; report: Report } {
  const res = spawnSync(process.execPath, [SCRIPT, ...args, "--json"], {
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, DATABASE_URL: DEAD_URL, DIRECT_URL: DEAD_URL },
  });
  expect(res.stderr, `doctor stderr: ${res.stderr}`).not.toMatch(/TypeError|ReferenceError|SyntaxError/);
  try {
    return { status: res.status, report: JSON.parse(res.stdout) as Report };
  } catch {
    throw new Error(`doctor did not emit JSON.\nstdout: ${res.stdout}\nstderr: ${res.stderr}`);
  }
}

describe("npm run doctor", () => {
  it("reports unhealthy and localises an unreachable database", () => {
    const { status, report } = runDoctor(["--no-server"]);

    expect(status).toBe(1);
    expect(report.healthy).toBe(false);
    expect(report.failures).toBeGreaterThanOrEqual(2);

    // It must catch the TCP failure and the Prisma failure separately.
    const pgFailures = report.checks.filter((c) => c.level === "fail" && c.group === "Postgres");
    expect(pgFailures.map((c) => c.message).join(" ")).toContain(String(DEAD_PORT));
    expect(pgFailures.some((c) => /Prisma/i.test(c.message))).toBe(true);

    // Environment still inspected before the DB, so the report names the target.
    expect(report.checks.some((c) => c.group === "Environment" && /DATABASE_URL/.test(c.message))).toBe(true);
  });

  it("gives every failure an actionable hint and skips the server on request", () => {
    const { report } = runDoctor(["--no-server"]);

    for (const failure of report.checks.filter((c) => c.level === "fail")) {
      expect(failure.hint, `failure without a hint: ${failure.message}`).toBeTruthy();
    }
    const server = report.checks.filter((c) => c.group === "Dev server");
    expect(server.some((c) => c.level === "info" && /skipped/.test(c.message))).toBe(true);
  });

  it("detects a site that is not answering when given --url", () => {
    const { status, report } = runDoctor(["--url", `http://127.0.0.1:${DEAD_PORT}`]);

    expect(status).toBe(1);
    const serverFailure = report.checks.find((c) => c.level === "fail" && c.group === "Deployed site");
    expect(serverFailure?.message).toMatch(/did not answer/);
  });

  it("emits a machine-readable summary", () => {
    const { report } = runDoctor(["--no-server"]);

    expect(typeof report.durationMs).toBe("number");
    expect(report.port).toBe(4321);
    expect(report.url).toBeNull();
    expect(report.checks.length).toBeGreaterThanOrEqual(8);
    for (const check of report.checks) {
      expect(["ok", "fail", "warn", "info"]).toContain(check.level);
      expect(check.group).toBeTruthy();
      expect(check.message).toBeTruthy();
    }
  });
});
