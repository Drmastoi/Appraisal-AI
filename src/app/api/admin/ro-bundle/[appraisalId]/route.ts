import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { parseSectionData } from "@/lib/sections";

export async function GET(_req: Request, { params }: { params: Promise<{ appraisalId: string }> }) {
  return handleApi(async () => {
    const admin = await requireRole("ADMIN");
    const { appraisalId } = await params;
    const appraisal = await prisma.appraisal.findUnique({
      where: { id: appraisalId },
      include: {
        doctor: true,
        appraiser: true,
        signatures: true,
        pdpObjectives: true,
        cpdEntries: true,
        feedbackCycles: { include: { _count: { select: { responses: true } } } },
      },
    });
    if (!appraisal) throw new ApiError(404, "Appraisal not found");
    if (appraisal.status !== "SIGNED_OFF") throw new ApiError(409, "Only signed-off appraisals can be exported for the RO");

    const bundle = {
      documentType: "MEDICAL_APPRAISAL_OUTPUT",
      schemaVersion: "1.0",
      generatedAt: new Date().toISOString(),
      doctor: {
        name: appraisal.doctor.name,
        gmcNumber: appraisal.doctor.gmcNumber,
        designatedBody: appraisal.doctor.designatedBody,
        revalidationDueDate: appraisal.doctor.revalidationDueDate,
      },
      appraisal: {
        year: appraisal.year,
        appraisalYearLabel: `${appraisal.year}/${String(appraisal.year + 1).slice(2)}`,
        status: appraisal.status,
        appraisalMeetingDate: appraisal.appraisalMeetingDate,
        signedOffAt: appraisal.signedOffAt,
        appraiser: appraisal.appraiser ? { name: appraisal.appraiser.name, gmcNumber: appraisal.appraiser.gmcNumber } : null,
      },
      sections: {
        appraisalOutputs: parseSectionData("appraisal_outputs", (await prisma.appraisalSection.findUnique({ where: { appraisalId_sectionKey: { appraisalId, sectionKey: "appraisal_outputs" } } }))?.data ?? "{}"),
        appraiserChecklist: parseSectionData("appraiser_checklist", (await prisma.appraisalSection.findUnique({ where: { appraisalId_sectionKey: { appraisalId, sectionKey: "appraiser_checklist" } } }))?.data ?? "{}"),
        agreedPdp: parseSectionData("agreed_pdp", (await prisma.appraisalSection.findUnique({ where: { appraisalId_sectionKey: { appraisalId, sectionKey: "agreed_pdp" } } }))?.data ?? "{}"),
        appraiserSummary: parseSectionData("appraiser_summary", (await prisma.appraisalSection.findUnique({ where: { appraisalId_sectionKey: { appraisalId, sectionKey: "appraiser_summary" } } }))?.data ?? "{}"),
      },
      statements: {
        probityDeclared: true,
        healthDeclared: true,
        indemnityConfirmed: true,
      },
      supportingInformation: {
        cpdEntries: appraisal.cpdEntries.length,
        cpdPointsTotal: appraisal.cpdEntries.reduce((s, e) => s + e.points, 0),
        feedbackCycles: appraisal.feedbackCycles.map((c) => ({ type: c.cycleType, responses: c._count.responses, status: c.status })),
        pdpObjectives: appraisal.pdpObjectives.map((o) => ({
          title: o.title,
          status: o.status,
          carriedForwardFromPreviousYear: o.source === "CARRIED_FORWARD",
        })),
      },
      signatures: appraisal.signatures.map((s) => ({ role: s.signerRole, signedAt: s.signedAt, statement: s.statement })),
      responsibleOfficerRecommendation: {
        // The RO records their recommendation after reviewing this bundle.
        toBeCompletedBy: "RESPONSIBLE_OFFICER",
        gmcConnectSubmission: "MANUAL_UPLOAD",
      },
    };

    await audit({ actorId: admin.id, actorRole: admin.role, action: "RO_BUNDLE_EXPORT", entityType: "Appraisal", entityId: appraisalId });
    return new Response(JSON.stringify(bundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="ro-bundle-${appraisal.year}-${(appraisal.doctor.gmcNumber ?? appraisal.doctor.id).replace(/\W/g, "")}.json"`,
      },
    });
  });
}
