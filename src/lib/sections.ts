import { z } from "zod";
import { MAG_SECTIONS } from "@/lib/appraisal";

export const doctorDetailsSchema = z.object({
  fullName: z.string().default(""),
  gmcNumber: z.string().default(""),
  qualifications: z.string().default(""),
  contactEmail: z.string().default(""),
  contactPhone: z.string().default(""),
});

export const scopeOfWorkSchema = z.object({
  roles: z
    .array(
      z.object({
        organisation: z.string().default(""),
        role: z.string().default(""),
        roleCategory: z.enum(["CLINICAL", "EDUCATIONAL", "MANAGERIAL", "OTHER"]).default("CLINICAL"),
        startDate: z.string().default(""),
        sessionsPerWeek: z.string().default(""),
        isPrivatePractice: z.boolean().default(false),
        hasOnCallCommitment: z.boolean().default(false),
        onCallDetails: z.string().default(""),
        extendedDuties: z.string().default(""),
        notes: z.string().default(""),
      })
    )
    .default([]),
  scopeRelationships: z.string().default(""),
  scopeChangesSinceLastAppraisal: z.string().default(""),
  scopeChangesEnvisagedNextYear: z.string().default(""),
});

export const recordOfAppraisalsSchema = z.object({
  previousAppraisals: z
    .array(z.object({ date: z.string().default(""), outcome: z.string().default(""), appraiser: z.string().default("") }))
    .default([]),
  revalidationCyclePosition: z.string().default(""),
});

export const probitySchema = z.object({
  declarations: z.boolean().default(false),
  details: z.string().default(""),
  suspensionsOrRestrictions: z.string().default(""),
  requestedInfoByOrganisationOrRO: z.string().default(""),
});

export const healthSchema = z.object({
  fitToPractise: z.boolean().default(false),
  details: z.string().default(""),
});

export const indemnitySchema = z.object({
  provider: z.string().default(""),
  policyNumber: z.string().default(""),
  coversAllRoles: z.boolean().default(false),
  notes: z.string().default(""),
});

export const appraiserSummarySchema = z.object({
  discussionSummary: z.string().default(""),
  agreements: z.string().default(""),
  outputs: z.string().default(""),
  pdpAgreed: z.boolean().default(false),
  // L2P-aligned: mirrored per-section comments (ReviewWorkspace writes these)
  mirroredSectionComments: z.record(z.string(), z.string()).default({}),
  // GMP 2024 — 4 domains + 5 themes (optional tags per appraisal)
  gmpDomains: z.array(z.string()).default([]),
  gmpThemes: z.array(z.string()).default([]),
  wellbeingDiscussion: z.string().default(""),
});

export const wellbeingSchema = z.object({
  scale1to10: z.number().int().min(1).max(10).default(7),
  periodImpact: z.string().default(""),
  healthAndWellbeing: z.string().default(""),
  supportNeeded: z.string().default(""),
});

export const achievementsSchema = z.object({
  achievementsAndChallenges: z.string().default(""),
  aspirations: z.string().default(""),
  additionalItems: z.string().default(""),
});

export const additionalInfoSchema = z.object({
  organisationSpecificInfo: z.string().default(""),
});

export const academicLeadershipSchema = z.object({
  isApplicable: z.boolean().default(false),
  details: z.string().default(""),
  personalParticipation: z.string().default(""),
});

export const appraisalOutputsSchema = z.object({
  statement1: z.boolean().default(false),
  statement2: z.boolean().default(false),
  statement3: z.boolean().default(false),
  statement4: z.boolean().default(false),
  statement5: z.boolean().default(false),
  reasonsForStatements: z.string().default(""),
  otherIssuesForRO: z.string().default(""),
  clinicianResponse: z.string().default(""),
});

export const appraiserChecklistSchema = z.object({
  agreedPdpDescribesNeeds: z.boolean().default(false),
  completenessComments: z.string().default(""),
  verifiedCliniciansChecklist: z.boolean().default(false),
});

export const agreedPdpSchema = z.object({
  items: z.array(z.object({ title: z.string(), actionOrGoal: z.string().default(""), targetDate: z.string().default(""), evidence: z.string().default("") })).default([]),
  notes: z.string().default(""),
});

export const GMP_DOMAINS = [
  "Knowledge, skills and development",
  "Patients, partnership and communication",
  "Colleagues, culture and safety",
  "Trust and professionalism",
] as const;

export const GMP_THEMES_2024 = [
  "The duties of a doctor",
  "Working with colleagues",
  "Working with patients",
  "Leadership and management",
  "Education and training",
] as const;

const textSectionSchemas: Record<string, z.ZodTypeAny> = {
  doctor_details: doctorDetailsSchema,
  scope_of_work: scopeOfWorkSchema,
  record_of_appraisals: recordOfAppraisalsSchema,
  wellbeing: wellbeingSchema,
  achievements: achievementsSchema,
  additional_info: additionalInfoSchema,
  academic_leadership: academicLeadershipSchema,
  probity: probitySchema,
  health: healthSchema,
  indemnity: indemnitySchema,
  agreed_pdp: agreedPdpSchema,
  appraisal_outputs: appraisalOutputsSchema,
  appraiser_checklist: appraiserChecklistSchema,
  appraiser_summary: appraiserSummarySchema,
};

export function parseSectionData(sectionKey: string, raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    const schema = textSectionSchemas[sectionKey];
    if (schema) return schema.parse(parsed ?? {}) as Record<string, unknown>;
    return (parsed ?? {}) as Record<string, unknown>;
  } catch {
    const schema = textSectionSchemas[sectionKey];
    if (schema) return schema.parse({}) as Record<string, unknown>;
    return {};
  }
}

export function emptySectionData(sectionKey: string): Record<string, unknown> {
  const schema = textSectionSchemas[sectionKey];
  return schema ? (schema.parse({}) as Record<string, unknown>) : {};
}

// A section counts as started when any meaningful value has been entered.
export function computeSectionStatuses(
  sections: { sectionKey: string; data: string }[],
  counts: { cpd: number; qi: number; events: number; pdp: number; colleagueCycles: number; patientCycles: number }
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const byKey = new Map(sections.map((s) => [s.sectionKey, s.data]));

  for (const section of MAG_SECTIONS) {
    const raw = byKey.get(section.key);
    if (!raw) {
      out[section.key] = false;
      continue;
    }
    const data = parseSectionData(section.key, raw);
    const values = Object.values(data).filter((v) => {
      if (typeof v === "string") return v.trim() !== "";
      if (typeof v === "boolean") return v === true;
      if (Array.isArray(v)) return v.length > 0;
      return false;
    });
    out[section.key] = values.length > 0;
  }

  out.cpd = counts.cpd > 0;
  out.quality_improvement = counts.qi > 0;
  out.significant_events = counts.events > 0;
  // Complaints may legitimately be "none declared" — handled at submit gating.
  out.complaints = counts.events >= 0; // placeholder; complaints uses its own flow
  out.colleague_feedback = counts.colleagueCycles > 0;
  out.patient_feedback = counts.patientCycles > 0;
  out.pdp_review = counts.pdp > 0;
  out.new_pdp = counts.pdp > 0;

  return out;
}
