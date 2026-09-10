import { describe, expect, it } from "vitest";
import { validateForSubmission } from "@/lib/submission";

function completeInput(overrides: Partial<Parameters<typeof validateForSubmission>[0]> = {}) {
  return {
    appraiserId: "appraiser-1",
    sections: [
      { sectionKey: "doctor_details", data: JSON.stringify({ fullName: "Dr James Doctor", gmcNumber: "7400002" }) },
      { sectionKey: "scope_of_work", data: JSON.stringify({ roles: [{ organisation: "GP Practice", role: "GP", startDate: "2020-01-01", sessionsPerWeek: "6" }] }) },
      { sectionKey: "probity", data: JSON.stringify({ declarations: true, details: "" }) },
      { sectionKey: "health", data: JSON.stringify({ fitToPractise: true, details: "" }) },
      { sectionKey: "indemnity", data: JSON.stringify({ provider: "MDU", policyNumber: "123", coversAllRoles: true, notes: "" }) },
    ],
    cpdCount: 5,
    qiCount: 2,
    newPdpCount: 3,
    ...overrides,
  };
}

describe("submission validation", () => {
  it("passes a complete submission", () => {
    expect(validateForSubmission(completeInput())).toEqual([]);
  });

  it("blocks when no appraiser is assigned", () => {
    const missing = validateForSubmission(completeInput({ appraiserId: null }));
    expect(missing.some((m) => m.includes("appraiser must be assigned"))).toBe(true);
  });

  it("requires name, GMC number and scope of work", () => {
    const missing = validateForSubmission(
      completeInput({
        sections: completeInput().sections.map((s) =>
          s.sectionKey === "doctor_details"
            ? { sectionKey: s.sectionKey, data: JSON.stringify({ fullName: "", gmcNumber: "" }) }
            : s.sectionKey === "scope_of_work"
              ? { sectionKey: s.sectionKey, data: JSON.stringify({ roles: [] }) }
              : s
        ),
      })
    );
    expect(missing).toHaveLength(3);
  });

  it("requires CPD, QI and a proposed PDP", () => {
    const missing = validateForSubmission(completeInput({ cpdCount: 0, qiCount: 0, newPdpCount: 0 }));
    expect(missing.some((m) => m.startsWith("Section 4"))).toBe(true);
    expect(missing.some((m) => m.startsWith("Section 5"))).toBe(true);
    expect(missing.some((m) => m.startsWith("Section 11"))).toBe(true);
  });

  it("requires probity, health and indemnity declarations", () => {
    const sections = completeInput().sections.map((s) => {
      if (s.sectionKey === "probity") return { sectionKey: s.sectionKey, data: JSON.stringify({ declarations: false }) };
      if (s.sectionKey === "health") return { sectionKey: s.sectionKey, data: JSON.stringify({ fitToPractise: false }) };
      if (s.sectionKey === "indemnity") return { sectionKey: s.sectionKey, data: JSON.stringify({ provider: "", coversAllRoles: false }) };
      return s;
    });
    const missing = validateForSubmission(completeInput({ sections }));
    expect(missing.some((m) => m.startsWith("Section 12"))).toBe(true);
    expect(missing.some((m) => m.startsWith("Section 13"))).toBe(true);
    expect(missing.some((m) => m.startsWith("Section 14"))).toBe(true);
  });
});
