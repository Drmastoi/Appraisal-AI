import { parseSectionData } from "@/lib/sections";

export type SubmissionCheckInput = {
  appraiserId: string | null;
  sections: { sectionKey: string; data: string }[];
  cpdCount: number;
  qiCount: number;
  newPdpCount: number;
};

/**
 * MAG completeness gating applied before an appraisal can be submitted to the
 * appraiser. Returns the list of unmet requirements (empty = ready).
 */
export function validateForSubmission(input: SubmissionCheckInput): string[] {
  const missing: string[] = [];
  if (!input.appraiserId) missing.push("An appraiser must be assigned by an administrator before submission");

  const section = (key: string) => parseSectionData(key, input.sections.find((s) => s.sectionKey === key)?.data ?? "{}");

  const details = section("doctor_details") as { fullName?: string; gmcNumber?: string };
  if (!details.fullName?.trim()) missing.push("Section 1: full name is required");
  if (!details.gmcNumber?.trim()) missing.push("Section 1: GMC number is required");

  const scope = section("scope_of_work") as { roles?: unknown[] };
  if (!scope.roles?.length) missing.push("Section 2: add at least one role in your scope of work");

  if (input.cpdCount === 0) missing.push("Section 4: log at least one CPD entry");
  if (input.qiCount === 0) missing.push("Section 5: add at least one quality improvement activity (audit, QI, teaching, CBD or reflection)");
  if (input.newPdpCount === 0) missing.push("Section 11: propose at least one PDP objective for discussion");

  const probity = section("probity") as { declarations?: boolean };
  if (!probity.declarations) missing.push("Section 12: complete the statement of probity");
  const health = section("health") as { fitToPractise?: boolean };
  if (!health.fitToPractise) missing.push("Section 13: complete the statement of health");
  const indemnity = section("indemnity") as { coversAllRoles?: boolean; provider?: string };
  if (!indemnity.provider?.trim() || !indemnity.coversAllRoles) missing.push("Section 14: confirm indemnity arrangements covering all roles");

  return missing;
}
