import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, generateToken, hashToken, safeEqual } from "@/lib/auth-core";
import { generateInviteToken, rateLimit } from "@/lib/ratelimit";
import { isAppraisalStatus, isRole } from "@/lib/roles";

describe("password hashing", () => {
  it("round-trips a correct password", () => {
    const hash = hashPassword("Sup3rSecret!");
    expect(verifyPassword("Sup3rSecret!", hash)).toBe(true);
  });
  it("rejects a wrong password", () => {
    const hash = hashPassword("Sup3rSecret!");
    expect(verifyPassword("wrong", hash)).toBe(false);
  });
  it("produces unique salts", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });
});

describe("session tokens", () => {
  it("generates unpredictable tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).toHaveLength(64);
    expect(a).not.toBe(b);
  });
  it("hashes tokens deterministically for storage", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("safeEqual", () => {
  it("matches identical strings and rejects others", () => {
    expect(safeEqual("one", "one")).toBe(true);
    expect(safeEqual("one", "two")).toBe(false);
    expect(safeEqual("one", "one1")).toBe(false);
  });
});

describe("role validation", () => {
  it("accepts the three portal roles", () => {
    expect(isRole("DOCTOR")).toBe(true);
    expect(isRole("APPRAISER")).toBe(true);
    expect(isRole("ADMIN")).toBe(true);
  });
  it("rejects unknown roles", () => {
    expect(isRole("SUPERUSER")).toBe(false);
    expect(isRole("")).toBe(false);
  });
});

describe("appraisal status validation", () => {
  it("accepts workflow statuses", () => {
    for (const s of ["DRAFT", "SUBMITTED", "IN_REVIEW", "SIGNED_OFF"]) expect(isAppraisalStatus(s)).toBe(true);
  });
  it("rejects unknown statuses", () => {
    expect(isAppraisalStatus("ARCHIVED")).toBe(false);
  });
});

describe("rate limiter", () => {
  it("allows within limit and blocks beyond", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
  });
});

describe("invite tokens", () => {
  it("are url-safe and unique", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).toMatch(/^[a-zA-Z0-9]+$/);
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(20);
  });
});
