import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, Card } from "@/components/ui";
import MagForm from "@/app/doctor/appraisal/MagForm";
import AttachmentsPanel from "@/app/doctor/appraisal/AttachmentsPanel";
import ChecklistPanel from "@/app/doctor/appraisal/ChecklistPanel";

export default async function DoctorAppraisalPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "DOCTOR") redirect("/login");

  const year = new Date().getFullYear();
  let appraisal = await prisma.appraisal.findUnique({
    where: { doctorId_year: { doctorId: user.id, year } },
    include: { appraiser: true, sections: true },
  });
  if (!appraisal) {
    appraisal = await prisma.appraisal.create({
      data: { doctorId: user.id, year },
      include: { appraiser: true, sections: true },
    });
    // sections rows created lazily by the editor; ensure defaults exist:
    await prisma.$transaction(
      (["doctor_details", "scope_of_work", "record_of_appraisals", "wellbeing", "achievements", "additional_info", "academic_leadership", "probity", "health", "indemnity", "agreed_pdp", "appraisal_outputs", "appraiser_checklist", "appraiser_summary"] as const).map((sectionKey) =>
        prisma.appraisalSection.upsert({
          where: { appraisalId_sectionKey: { appraisalId: appraisal!.id, sectionKey } },
          update: {},
          create: { appraisalId: appraisal!.id, sectionKey, data: "{}" },
        })
      )
    );
  }

  const [cpd, qi, events, pdp, cycles] = await Promise.all([
    prisma.cPDEntry.count({ where: { appraisalId: appraisal.id } }),
    prisma.qIEntry.count({ where: { appraisalId: appraisal.id } }),
    prisma.significantEvent.count({ where: { appraisalId: appraisal.id } }),
    prisma.pDPObjective.count({ where: { appraisalId: appraisal.id } }),
    prisma.feedbackCycle.findMany({ where: { appraisalId: appraisal.id }, select: { cycleType: true } }),
  ]);

  const counts = {
    cpd,
    qi,
    events,
    pdp,
    colleagueCycles: cycles.filter((c) => c.cycleType === "COLLEAGUE").length,
    patientCycles: cycles.filter((c) => c.cycleType === "PATIENT").length,
  };

  return (
    <div>
      <PageHeader
        title={`MAG appraisal form ${year}/${String(year + 1).slice(2)}`}
        subtitle={appraisal.appraiser ? `Appraiser: ${appraisal.appraiser.name}` : "No appraiser assigned yet — an administrator will assign one"}
        action={<StatusBadge status={appraisal.status} />}
      />
      <div className="mb-6">
        <ChecklistPanel sections={appraisal.sections.map((s) => ({ sectionKey: s.sectionKey, data: s.data }))} counts={counts} locked={appraisal.status !== "DRAFT"} />
      </div>

      <MagForm
        appraisalId={appraisal.id}
        status={appraisal.status}
        doctorName={user.name}
        gmcNumber={user.gmcNumber ?? ""}
        sections={appraisal.sections.map((s) => ({ sectionKey: s.sectionKey, data: s.data }))}
        counts={counts}
      />

      <div className="mt-6">
        <Card title="Supporting documents (certificates, audit write-ups, feedback reports)">
          <AttachmentsPanel locked={appraisal.status !== "DRAFT"} />
        </Card>
      </div>
    </div>
  );
}
