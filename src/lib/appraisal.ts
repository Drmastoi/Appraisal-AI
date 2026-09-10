// The MAG (Medical Appraisal Guide 2022) form mapped to portal sections.
// Ownership controls who may edit each section; the appraiser may edit
// doctor-owned sections during review (tracked in SectionVersion history).

export type SectionOwner = "DOCTOR" | "APPRAISER";

export type MagSection = {
  key: string;
  title: string;
  shortTitle: string;
  owner: SectionOwner;
  description: string;
};

export const MAG_SECTIONS: MagSection[] = [
  { key: "doctor_details", title: "Section 1 · Doctor's details", shortTitle: "Doctor's details", owner: "DOCTOR", description: "Name, GMC number, postgraduate qualifications and contact details." },
  { key: "scope_of_work", title: "Section 2 · Scope of work", shortTitle: "Scope of work", owner: "DOCTOR", description: "All roles and places of work across your whole scope of practice, with typical sessions. Categories: clinical / educational / managerial / other, plus relationships & conflicts." },
  { key: "record_of_appraisals", title: "Section 3 · Record of appraisals", shortTitle: "Record of appraisals", owner: "DOCTOR", description: "Dates and outcomes of previous appraisals, and your revalidation cycle position." },
  { key: "cpd", title: "Section 4 · Continuing professional development", shortTitle: "CPD", owner: "DOCTOR", description: "CPD record for the appraisal year — internal and external learning with reflection. Managed on the CPD page." },
  { key: "quality_improvement", title: "Section 5 · Quality improvement activity", shortTitle: "Quality improvement", owner: "DOCTOR", description: "Audit, QI projects, teaching with feedback, CBDs and formal reflections." },
  { key: "significant_events", title: "Section 6 · Significant events", shortTitle: "Significant events", owner: "DOCTOR", description: "Significant events you were personally involved in, with reflection and outcomes." },
  { key: "colleague_feedback", title: "Section 8 · Feedback from colleagues", shortTitle: "Colleague feedback", owner: "DOCTOR", description: "MSF colleague feedback (at least once per revalidation cycle). Managed on the 360 feedback page." },
  { key: "patient_feedback", title: "Section 9 · Feedback from patients", shortTitle: "Patient feedback", owner: "DOCTOR", description: "Patient feedback exercise (at least once per revalidation cycle). Managed on the 360 feedback page." },
  // L2P-aligned sections not in the 2022 numbered MAG model but required by named bodies
  { key: "wellbeing", title: "Personal & professional wellbeing", shortTitle: "Wellbeing", owner: "DOCTOR", description: "1–10 scale for how you are, impact since last appraisal, maintaining health, support needed. Supporting documents optional." },
  { key: "complaints", title: "Complaints & compliments", shortTitle: "Complaints & compliments", owner: "DOCTOR", description: "Complaints and compliments you have been named in / received — reflection and outcome. Includes compliments register." },
  { key: "achievements", title: "Achievements, challenges & aspirations", shortTitle: "Achievements", owner: "DOCTOR", description: "Not mandatory for revalidation but formative — achievements, challenges, aspirations and any additional discussion items." },
  { key: "pdp_review", title: "Section 10 · Review of last year's PDP", shortTitle: "PDP review", owner: "DOCTOR", description: "For each previous objective: achieved (how) or not achieved (why). Managed on the PDP page." },
  { key: "new_pdp", title: "Section 11 · Personal development plan", shortTitle: "New PDP", owner: "DOCTOR", description: "Proposed objectives for the coming year, agreed at appraisal. Managed on the PDP page." },
  { key: "probity", title: "Section 12 · Statement of probity", shortTitle: "Probity", owner: "DOCTOR", description: "Declaration on probity, suspensions/restrictions/investigations, and information requested by the organisation/RO." },
  { key: "health", title: "Section 13 · Statement of health", shortTitle: "Health", owner: "DOCTOR", description: "Declaration that you are fit to practise, or details of any relevant health matters." },
  { key: "indemnity", title: "Section 14 · Indemnity cover", shortTitle: "Indemnity", owner: "DOCTOR", description: "Confirmation of appropriate medical indemnity arrangements for all roles (8.4 — required for non-NHS/private work)." },
  { key: "additional_info", title: "Additional information (mandatory training, job plan)", shortTitle: "Additional info", owner: "DOCTOR", description: "Organisation-specific mandatory information — e.g. mandatory training records, job plan." },
  { key: "academic_leadership", title: "Academic, teaching, research, leadership & innovation", shortTitle: "Academic & leadership", owner: "DOCTOR", description: "Only if applicable: academic appointments, teaching/research, leadership/management/innovation activity and personal participation." },
  { key: "agreed_pdp", title: "Agreed personal development plan (post-meeting)", shortTitle: "Agreed PDP", owner: "APPRAISER", description: "Post-meeting agreed PDP — auto-copied from proposals on submit unless the appraiser has already edited it. Locked after sign-off." },
  { key: "appraisal_outputs", title: "Appraisal outputs — 5 RO statements", shortTitle: "Outputs (5 statements)", owner: "APPRAISER", description: "The 5 GMC revalidation statements to the Responsible Officer plus reasons and other RO-relevant issues." },
  { key: "appraiser_checklist", title: "Appraiser's checklist", shortTitle: "Appraiser checklist", owner: "APPRAISER", description: "Appraiser confirmation that the clinician's checklist has been verified and exceptions noted." },
  { key: "appraiser_summary", title: "Discussion summary — GMP 2024 + per-section mirrored comments", shortTitle: "Appraiser's summary", owner: "APPRAISER", description: "Appraiser's record of the discussion, per-section summaries, GMP 2024 5 themes / 4 domains, agreements and appraisal outputs." },
];

export const DEFAULT_SECTIONS = MAG_SECTIONS.map((s) => s.key);

export function sectionTitle(key: string): string {
  return MAG_SECTIONS.find((s) => s.key === key)?.title ?? key;
}

export function sectionOwner(key: string): SectionOwner {
  return MAG_SECTIONS.find((s) => s.key === key)?.owner ?? "DOCTOR";
}
