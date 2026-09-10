import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateInviteToken } from "@/lib/ratelimit";

const prisma = new PrismaClient();

const FEEDBACK_LIKERT_IDS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"];

// A rating profile is the 1–5 score given for each of the 10 colleague
// Likert questions. Profiles vary so the report looks like real MSF data.
function colleagueProfile(base: number, dips: Record<string, number> = {}): Record<string, number> {
  const r: Record<string, number> = {};
  for (const id of FEEDBACK_LIKERT_IDS) r[id] = dips[id] ?? base;
  return r;
}

const COLLEAGUE_RATINGS: Record<string, number>[] = [
  // Mostly excellent colleagues…
  ...Array.from({ length: 6 }, () => colleagueProfile(5)),
  colleagueProfile(5, { c10: 4 }), // teaching slightly lower
  colleagueProfile(5, { c10: 4 }),
  colleagueProfile(5, { c9: 4 }),
  colleagueProfile(4),
  colleagueProfile(4),
  colleagueProfile(4, { c5: 3 }), // availability flagged once
  colleagueProfile(4, { c2: 3, c3: 4 }), // evidence-based practice flagged
  colleagueProfile(4, { c3: 3, c4: 4 }),
  colleagueProfile(4, { c10: 3 }),
];

const COLLEAGUE_FREETEXT: (Record<string, string> | null)[] = [
  { cf1: "Excellent communication with the ward team; always approachable for advice." },
  null,
  null,
  { cf1: "Very reliable on call with good clinical judgement." },
  null,
  { cf2: "Could delegate more to the junior team to support their development." },
  null,
  { cf1: "Clear, structured ward rounds and great teaching on the job." },
  null,
  null,
  { cf1: "Kind and respectful with patients and families." },
  null,
  null,
  { cf2: "Would benefit from more visible presence at MDT meetings." },
  { cf1: "Consistently thorough documentation and handover." },
];

const COLLEAGUE_INVITES: { name: string; relationship: string }[] = [
  { name: "Dr A Patel", relationship: "Consultant colleague" },
  { name: "Dr M Okafor", relationship: "Consultant colleague" },
  { name: "Dr R Singh", relationship: "GP colleague" },
  { name: "Dr L Chen", relationship: "Registrar" },
  { name: "Dr T Wilson", relationship: "Registrar" },
  { name: "Dr K Ahmed", relationship: "Specialty doctor" },
  { name: "Sister J Hughes", relationship: "Ward sister" },
  { name: "Nurse S O'Brien", relationship: "Specialist nurse" },
  { name: "Nurse D Patel", relationship: "Staff nurse" },
  { name: "Mr P Thompson", relationship: "Pharmacist" },
  { name: "Ms F Garcia", relationship: "Physiotherapist" },
  { name: "Mr G Jones", relationship: "Practice manager" },
  { name: "Dr N Hussain", relationship: "Consultant colleague" },
  { name: "Ms R Clarke", relationship: "Occupational therapist" },
  { name: "Mr S Brown", relationship: "Hospital manager" },
  { name: "Dr E White", relationship: "GP colleague" },
  { name: "Ms H Ali", relationship: "Staff nurse" },
  { name: "Mr J Davies", relationship: "Clinical coder" },
];

const DEMO_SECTION_DATA: Record<string, Record<string, unknown>> = {
  doctor_details: {
    fullName: "Dr James Doctor",
    gmcNumber: "7400002",
    qualifications: "MBBS, MRCP(UK)",
    contactEmail: "doctor@portal.nhs.uk",
    contactPhone: "01234 567890",
  },
  scope_of_work: {
    roles: [
      {
        organisation: "NHS Demo Trust",
        role: "Consultant Physician",
        roleCategory: "CLINICAL",
        startDate: "2018-04-01",
        sessionsPerWeek: "8",
        isPrivatePractice: false,
        hasOnCallCommitment: true,
        onCallDetails: "1:8 on-call, weekend ward cover",
        extendedDuties: "Clinical governance lead",
        notes: "Acute medicine ward rounds, outpatient clinics, on-call commitment.",
      },
    ],
    scopeRelationships: "NHS and private work managed per GMC conflicts-of-interest guidance.",
    scopeChangesSinceLastAppraisal: "No material change.",
    scopeChangesEnvisagedNextYear: "Possible additional teaching sessions.",
  },
  record_of_appraisals: {
    previousAppraisals: [
      { date: "2024-05-14", outcome: "Satisfactory", appraiser: "Dr S Appraiser" },
      { date: "2023-05-02", outcome: "Satisfactory", appraiser: "Dr S Appraiser" },
    ],
    revalidationCyclePosition: "Year 3 of 5-year cycle — revalidation due March 2027.",
  },
  wellbeing: {
    scale1to10: 7,
    periodImpact: "Steady clinical year; winter pressures were demanding but manageable.",
    healthAndWellbeing: "Regular exercise, peer support, protected admin time.",
    supportNeeded: "No additional support needed; aware of Practitioner Health and trust wellbeing offer.",
  },
  achievements: {
    achievementsAndChallenges: "Led VTE audit improvement (72% → 94%); delivered FY1 teaching rated 4.8/5.",
    aspirations: "Develop sepsis QI programme and formalise educational supervision.",
    additionalItems: "Happy to discuss rota / teaching balance at appraisal.",
  },
  additional_info: {
    organisationSpecificInfo: "Mandatory training up to date; job plan on file with trust medical staffing.",
  },
  academic_leadership: {
    isApplicable: false,
    details: "",
    personalParticipation: "",
  },
  probity: {
    declarations: true,
    details: "No matters to declare.",
    suspensionsOrRestrictions: "",
    requestedInfoByOrganisationOrRO: "",
  },
  health: { fitToPractise: true, details: "Fit to practise." },
  indemnity: {
    provider: "Medical Protection Society",
    policyNumber: "MPS-882134",
    coversAllRoles: true,
    notes: "Covers all roles in scope of work.",
  },
  agreed_pdp: { items: [], notes: "" },
  appraisal_outputs: {
    statement1: false,
    statement2: false,
    statement3: false,
    statement4: false,
    statement5: false,
    reasonsForStatements: "",
    otherIssuesForRO: "",
    clinicianResponse: "",
  },
  appraiser_checklist: {
    agreedPdpDescribesNeeds: false,
    completenessComments: "",
    verifiedCliniciansChecklist: false,
  },
  appraiser_summary: {
    discussionSummary: "",
    agreements: "",
    outputs: "",
    pdpAgreed: false,
    mirroredSectionComments: {},
    gmpDomains: [],
    gmpThemes: [],
    wellbeingDiscussion: "",
  },
};

async function seedAppraisal(doctorId: string, appraiserId: string) {
  const year = new Date().getFullYear();
  const existing = await prisma.appraisal.findFirst({
    where: { doctorId, year },
  });

  let appraisal = existing;

  if (!existing) {
    appraisal = await prisma.appraisal.create({
      data: {
        doctorId,
        appraiserId,
        year,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });
    console.log("Seeded current-year appraisal", appraisal.id);
  } else if (existing.status === "DRAFT") {
    // A previous seed run left a draft — promote it to submitted so the
    // appraiser has something to review immediately.
    appraisal = await prisma.appraisal.update({
      where: { id: existing.id },
      data: { status: "SUBMITTED", submittedAt: existing.submittedAt ?? new Date() },
    });
    console.log("Promoted existing draft appraisal to SUBMITTED", appraisal.id);
  } else {
    console.log("Appraisal already", existing.status, "— leaving as-is");
  }

  if (!appraisal) throw new Error("Failed to obtain appraisal");

  // Fill section data — only where missing or still empty, so reruns don't
  // overwrite anything a user has typed, while repairing previously empty ones.
  const sectionRows = await prisma.appraisalSection.findMany({
    where: { appraisalId: appraisal.id },
  });
  const byKey = new Map(sectionRows.map((s) => [s.sectionKey, s]));
  for (const key of DEFAULT_SECTIONS) {
    const demo = DEMO_SECTION_DATA[key];
    const existing = byKey.get(key);
    const isEmpty = !existing || existing.data === "{}" || existing.data.trim() === "";
    if (isEmpty) {
      await prisma.appraisalSection.upsert({
        where: { appraisalId_sectionKey: { appraisalId: appraisal.id, sectionKey: key } },
        update: { data: JSON.stringify(demo ?? {}) },
        create: { appraisalId: appraisal.id, sectionKey: key, data: JSON.stringify(demo ?? {}) },
      });
    }
  }

  // CPD entries (only if none yet).
  const cpdCount = await prisma.cPDEntry.count({ where: { appraisalId: appraisal.id } });
  if (cpdCount === 0) {
    await prisma.cPDEntry.createMany({
      data: [
        {
          appraisalId: appraisal.id,
          date: new Date(`${year}-03-12`),
          title: "Acute Kidney Injury update — regional study day",
          activityType: "EXTERNAL",
          category: "Conference",
          provider: "Royal College of Physicians",
          points: 6,
          reflection: "Reviewed latest AKI guidance; will apply new staging thresholds in ward practice.",
          learningNeeds: "Fluid management in sepsis",
          impactOnPractice: "Updated local AKI pathway discussions.",
        },
        {
          appraisalId: appraisal.id,
          date: new Date(`${year}-06-20`),
          title: "Simulation: deteriorating patient on the ward",
          activityType: "INTERNAL",
          category: "Simulation",
          provider: "NHS Demo Trust",
          points: 3,
          reflection: "Practised rapid escalation and human factors in a simulated arrest.",
        },
      ],
    });
  }

  // QI entries.
  const qiCount = await prisma.qIEntry.count({ where: { appraisalId: appraisal.id } });
  if (qiCount === 0) {
    await prisma.qIEntry.createMany({
      data: [
        {
          appraisalId: appraisal.id,
          date: new Date(`${year}-02-10`),
          title: "Audit of VTE risk assessment completion on admission",
          entryType: "AUDIT",
          description:
            "Audited 120 admission episodes against NICE guidance; completion was 72%, rising to 94% after staff education and a proforma change.",
          outcome: "Re-audit scheduled for Q4; improvement embedded in clerking proforma.",
        },
        {
          appraisalId: appraisal.id,
          date: new Date(`${year}-05-05`),
          title: "Teaching: FY1 ward-round skills session",
          entryType: "TEACHING_FEEDBACK",
          description: "Delivered small-group teaching to six FY1 doctors; feedback scored 4.8/5.",
          outcome: "Repeated termly.",
        },
      ],
    });
  }

  // PDP objectives — one carried forward (achieved) plus two new proposals.
  const pdpCount = await prisma.pDPObjective.count({ where: { appraisalId: appraisal.id } });
  if (pdpCount === 0) {
    const carried = await prisma.pDPObjective.create({
      data: {
        appraisalId: appraisal.id,
        source: "CARRIED_FORWARD",
        title: "Complete leadership module (e-LfH)",
        description: "Level 2 leadership development programme.",
        status: "ACHIEVED",
        progressNote: "Completed all six modules and reflective log; applied to rota redesign.",
      },
    });
    await prisma.pDPObjective.createMany({
      data: [
        {
          appraisalId: appraisal.id,
          source: "NEW",
          previousObjectiveId: carried.id,
          title: "Develop a sepsis quality improvement project",
          description: "Lead a trust-wide audit of sepsis six bundle compliance, with re-audit.",
          status: "PROPOSED",
          priority: 1,
        },
        {
          appraisalId: appraisal.id,
          source: "NEW",
          title: "Attend a recognised teaching course (e.g. Teach the Teacher)",
          description: "Formalise educational supervision skills for FY trainees.",
          status: "PROPOSED",
          priority: 2,
        },
      ],
    });
  }

  return appraisal;
}

async function seedColleagueFeedback(appraisalId: string) {
  const existing = await prisma.feedbackCycle.findFirst({
    where: { appraisalId, cycleType: "COLLEAGUE" },
    include: { _count: { select: { responses: true } } },
  });
  if (existing && existing._count.responses > 0) {
    console.log("Colleague feedback cycle already has responses — skipping");
    return;
  }

  // Reuse an existing (empty) cycle rather than leaving a stray open one.
  const cycle =
    existing ??
    (await prisma.feedbackCycle.create({
      data: {
        appraisalId,
        cycleType: "COLLEAGUE",
        status: "CLOSED",
        minResponses: 15,
        closedAt: new Date(),
      },
    }));
  if (existing) {
    await prisma.feedbackCycle.update({
      where: { id: existing.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  }

  // 15 completed invites (one per response) + 3 pending (never responded).
  const invites: { id: string }[] = [];
  for (let i = 0; i < COLLEAGUE_INVITES.length; i++) {
    const meta = COLLEAGUE_INVITES[i];
    const completed = i < 15;
    invites.push(
      await prisma.feedbackInvite.create({
        data: {
          cycleId: cycle.id,
          token: generateInviteToken(),
          recipientName: meta.name,
          relationship: meta.relationship,
          completed,
          completedAt: completed ? new Date() : null,
        },
        select: { id: true },
      })
    );
  }

  // One anonymous response per completed invite.
  for (let i = 0; i < COLLEAGUE_RATINGS.length; i++) {
    const ratings = COLLEAGUE_RATINGS[i];
    // Omit one question occasionally so counts vary (realistic partial answers).
    if (i % 5 === 4) delete ratings[FEEDBACK_LIKERT_IDS[i % FEEDBACK_LIKERT_IDS.length]];
    await prisma.feedbackResponse.create({
      data: {
        cycleId: cycle.id,
        inviteId: invites[i].id,
        ratings: JSON.stringify(ratings),
        freeText: JSON.stringify(COLLEAGUE_FREETEXT[i] ?? {}),
        submittedAt: new Date(),
      },
    });
  }

  console.log(`Seeded colleague feedback cycle with ${COLLEAGUE_RATINGS.length} responses`);
}

async function main() {
  const adminHash = await bcrypt.hash("Admin123!", 10);
  const doctorHash = await bcrypt.hash("Doctor123!", 10);
  const appraiserHash = await bcrypt.hash("Appraiser123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@portal.nhs.uk" },
    update: {},
    create: {
      email: "admin@portal.nhs.uk",
      passwordHash: adminHash,
      name: "Portal Admin",
      role: "ADMIN",
      approved: true,
    },
  });

  const appraiser = await prisma.user.upsert({
    where: { email: "appraiser@portal.nhs.uk" },
    update: {},
    create: {
      email: "appraiser@portal.nhs.uk",
      passwordHash: appraiserHash,
      name: "Dr Sarah Appraiser",
      role: "APPRAISER",
      gmcNumber: "7400001",
      designatedBody: "NHS Demo ICB",
      approved: true,
    },
  });

  const doctor = await prisma.user.upsert({
    where: { email: "doctor@portal.nhs.uk" },
    update: {},
    create: {
      email: "doctor@portal.nhs.uk",
      passwordHash: doctorHash,
      name: "Dr James Doctor",
      role: "DOCTOR",
      gmcNumber: "7400002",
      designatedBody: "NHS Demo ICB",
      revalidationDueDate: new Date("2027-03-31"),
      approved: true,
    },
  });

  // Active assignment so admin pages show the linkage.
  await prisma.assignment.upsert({
    where: { doctorId_appraiserId: { doctorId: doctor.id, appraiserId: appraiser.id } },
    update: { active: true },
    create: { doctorId: doctor.id, appraiserId: appraiser.id, active: true },
  });

  const appraisal = await seedAppraisal(doctor.id, appraiser.id);
  await seedColleagueFeedback(appraisal.id);

  // Mirror the real submit flow: notify the appraiser.
  const existingNotification = await prisma.notification.findFirst({
    where: { userId: appraiser.id, title: "Appraisal submitted for review" },
  });
  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: appraiser.id,
        title: "Appraisal submitted for review",
        body: `Dr James Doctor submitted their ${appraisal.year}/${String(appraisal.year + 1).slice(2)} appraisal for review.`,
        link: `/appraiser/appraisals/${appraisal.id}`,
      },
    });
  }

  console.log("Seed complete:", { admin: admin.email, doctor: doctor.email, appraiser: appraiser.email });
}

export const DEFAULT_SECTIONS = [
  "doctor_details",
  "scope_of_work",
  "record_of_appraisals",
  "cpd",
  "quality_improvement",
  "significant_events",
  "colleague_feedback",
  "patient_feedback",
  "wellbeing",
  "complaints",
  "achievements",
  "pdp_review",
  "new_pdp",
  "probity",
  "health",
  "indemnity",
  "additional_info",
  "academic_leadership",
  "agreed_pdp",
  "appraisal_outputs",
  "appraiser_checklist",
  "appraiser_summary",
];

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });