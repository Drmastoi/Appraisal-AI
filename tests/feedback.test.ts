import { describe, expect, it } from "vitest";
import { aggregateRatings, meetsThreshold, minimumResponses, cycleQuestions, COLLEAGUE_LIKERT, PATIENT_LIKERT } from "@/lib/feedback";

describe("rating aggregation", () => {
  it("computes per-question means and overall mean", () => {
    const responses = [
      { ratings: JSON.stringify({ c1: 5, c2: 4 }) },
      { ratings: JSON.stringify({ c1: 4, c2: 4 }) },
      { ratings: JSON.stringify({ c1: 5 }) },
    ];
    const agg = aggregateRatings(responses, COLLEAGUE_LIKERT);
    expect(agg.totalResponses).toBe(3);
    const c1 = agg.perQuestion.find((q) => q.questionId === "c1");
    expect(c1?.mean).toBeCloseTo(4.67, 1);
    expect(c1?.count).toBe(3);
    expect(c1?.distribution).toEqual([0, 0, 0, 1, 2]);
    expect(agg.overallMean).not.toBeNull();
  });

  it("handles malformed rating payloads defensively", () => {
    const agg = aggregateRatings([{ ratings: "not-json" }, { ratings: "{}" }], COLLEAGUE_LIKERT);
    expect(agg.totalResponses).toBe(2);
    expect(agg.overallMean).toBeNull();
    expect(agg.perQuestion.every((q) => q.mean === null)).toBe(true);
  });

  it("returns null means with no responses", () => {
    const agg = aggregateRatings([], PATIENT_LIKERT);
    expect(agg.totalResponses).toBe(0);
    expect(agg.overallMean).toBeNull();
  });
});

describe("response thresholds", () => {
  it("requires 15 colleague and 34 patient responses", () => {
    expect(minimumResponses("COLLEAGUE")).toBe(15);
    expect(minimumResponses("PATIENT")).toBe(34);
    expect(meetsThreshold("COLLEAGUE", 14)).toBe(false);
    expect(meetsThreshold("COLLEAGUE", 15)).toBe(true);
    expect(meetsThreshold("PATIENT", 33)).toBe(false);
    expect(meetsThreshold("PATIENT", 34)).toBe(true);
  });
});

describe("question sets", () => {
  it("provides distinct colleague and patient questionnaires with unique ids", () => {
    expect(cycleQuestions("COLLEAGUE").likert.length).toBeGreaterThanOrEqual(10);
    expect(cycleQuestions("PATIENT").likert.length).toBeGreaterThanOrEqual(8);
    const ids = [...COLLEAGUE_LIKERT, ...PATIENT_LIKERT].map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
