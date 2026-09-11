import { describe, expect, it } from "vitest";
import {
  AUTOSAVE_DEBOUNCE_MS,
  backoffDelayMs,
  DRAFT_VERSION,
  draftStorageKey,
  hashData,
  MAX_BACKOFF_MS,
  parseDraft,
  readDraft,
  removeDraft,
  shouldRestoreDraft,
  stableStringify,
  writeDraft,
  type Draft,
  type DraftStorage,
} from "@/lib/drafts";
import { isSectionMeaningful } from "@/lib/sections";

function fakeStorage(): DraftStorage & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
}

function draftFor(data: Record<string, unknown>): Draft {
  return { version: DRAFT_VERSION, baseHash: hashData({ name: "Dr A" }), data, savedAt: new Date().toISOString() };
}

describe("draft hashing", () => {
  it("is independent of key order but sensitive to content", () => {
    expect(hashData({ a: "1", b: "2" })).toBe(hashData({ b: "2", a: "1" }));
    expect(hashData({ a: "1" })).not.toBe(hashData({ a: "2" }));
    // Nested arrays/objects must participate in the hash too.
    expect(hashData({ roles: [{ role: "GP" }] })).not.toBe(hashData({ roles: [{ role: "Consultant" }] }));
  });

  it("serializes deterministically and ignores undefined values", () => {
    expect(stableStringify({ b: 1, a: [{ y: true, x: null }] })).toBe('{"a":[{"x":null,"y":true}],"b":1}');
    expect(stableStringify({ a: 1, b: undefined })).toBe(stableStringify({ a: 1 }));
  });
});

describe("draft parsing", () => {
  it("round-trips a valid draft and rejects anything unexpected", () => {
    const draft = draftFor({ notes: "hello" });
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);

    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("")).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ ...draft, version: DRAFT_VERSION + 1 }))).toBeNull();
    expect(parseDraft(JSON.stringify({ ...draft, data: "oops" }))).toBeNull();
    expect(parseDraft(JSON.stringify({ ...draft, data: [] }))).toBeNull();
    expect(parseDraft(JSON.stringify({ version: DRAFT_VERSION, data: {} }))).toBeNull(); // no baseHash
  });
});

describe("draft recovery", () => {
  it("restores only when the server still holds the content the draft was typed from", () => {
    const serverData = { name: "Dr A" };
    const draft = draftFor({ notes: "half-typed" });

    expect(shouldRestoreDraft(draft, serverData)).toBe(true);
    // Someone saved newer content in the meantime: the draft is stale.
    expect(shouldRestoreDraft(draft, { name: "Dr A", notes: "saved elsewhere" })).toBe(false);
    expect(shouldRestoreDraft(null, serverData)).toBe(false);
  });
});

describe("retry backoff", () => {
  it("doubles up to a cap", () => {
    expect(backoffDelayMs(0)).toBe(1000);
    expect(backoffDelayMs(1)).toBe(2000);
    expect(backoffDelayMs(2)).toBe(4000);
    expect(backoffDelayMs(3)).toBe(8000);
    expect(backoffDelayMs(10)).toBe(MAX_BACKOFF_MS);
    expect(backoffDelayMs(-5)).toBe(1000);
    expect(backoffDelayMs(Number.NaN)).toBe(1000);
  });

  it("debounces for under a second so typing is not chatty", () => {
    expect(AUTOSAVE_DEBOUNCE_MS).toBeGreaterThan(0);
    expect(AUTOSAVE_DEBOUNCE_MS).toBeLessThan(2000);
  });
});

describe("draft storage", () => {
  it("writes, reads and removes a draft", () => {
    const storage = fakeStorage();
    const key = draftStorageKey("appraisal-1", "cpd");
    expect(key).toBe("appraisal-draft:appraisal-1:cpd");

    const draft = draftFor({ title: "Course" });
    writeDraft(storage, key, draft);
    expect(readDraft(storage, key)).toEqual(draft);

    removeDraft(storage, key);
    expect(readDraft(storage, key)).toBeNull();
  });

  it("survives storage that throws (private mode / quota)", () => {
    const throwing: DraftStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(readDraft(throwing, "k")).toBeNull();
    expect(() => writeDraft(throwing, "k", draftFor({ a: 1 }))).not.toThrow();
    expect(() => removeDraft(throwing, "k")).not.toThrow();
  });
});

describe("isSectionMeaningful", () => {
  it("counts typed content but not defaults", () => {
    expect(isSectionMeaningful({})).toBe(false);
    expect(isSectionMeaningful({ details: "   " })).toBe(false);
    expect(isSectionMeaningful({ declarations: false })).toBe(false);
    expect(isSectionMeaningful({ roles: [] })).toBe(false);
    expect(isSectionMeaningful({ scale1to10: 7 })).toBe(false); // numbers are UI defaults
    expect(isSectionMeaningful({ details: "a" })).toBe(true);
    expect(isSectionMeaningful({ declarations: true })).toBe(true);
    expect(isSectionMeaningful({ roles: [{ role: "GP" }] })).toBe(true);
  });
});
