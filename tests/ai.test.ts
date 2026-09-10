import { describe, expect, it } from "vitest";
import { MockAIClient } from "@/lib/ai/provider";

describe("mock AI provider", () => {
  const client = new MockAIClient();

  it("drafts a structured CPD reflection", async () => {
    const res = await client.generate({
      kind: "CPD_REFLECTION",
      systemPrompt: "system",
      userPrompt: "Title: Cardiology update course\n- Arrhythmia guidelines\n- Heart failure pathways",
    });
    expect(res.provider).toBe("mock");
    expect(res.text).toContain("What happened");
    expect(res.text).toContain("Cardiology update course");
    expect(res.text).toContain("requires your review");
  });

  it("produces numbered PDP suggestions from bullets", async () => {
    const res = await client.generate({
      kind: "PDP_SUGGESTION",
      systemPrompt: "system",
      userPrompt: "- hypertension care\n- safeguarding level 3",
    });
    expect(res.text).toMatch(/^\d+\./m);
    expect(res.text).toContain("hypertension care");
  });

  it("drafts an appraisal summary from evidence bullets", async () => {
    const res = await client.generate({
      kind: "APPRAISAL_SUMMARY",
      systemPrompt: "system",
      userPrompt: "- 5 CPD entries (50 points)\n- 1 colleague feedback cycle: 16 responses",
    });
    expect(res.text).toContain("Evidence reviewed");
  });

  it("summarises feedback themes", async () => {
    const res = await client.generate({
      kind: "FEEDBACK_THEMES",
      systemPrompt: "system",
      userPrompt: "- Explains clearly (mean 4.6/5)",
    });
    expect(res.text).toContain("theme");
  });
});
