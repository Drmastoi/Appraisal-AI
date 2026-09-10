import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { appraisalForAppraiser } from "@/lib/appraisal-access";
import { parseSectionData } from "@/lib/sections";
import { DEFAULT_SECTIONS } from "@/lib/appraisal";

const schema = z.object({
  statement: z.string().min(20, "The sign-off statement must be reviewed and confirmed"),
  meetingDate: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("APPRAISER");
    const { id } = await params;
    const appraisal = await appraisalForAppraiser(user, id);
    if (appraisal.status === "SIGNED_OFF") throw new ApiError(409, "Already signed off");
    if (appraisal.status !== "IN_REVIEW") throw new ApiError(409, "Start the review before signing off");
    const body = schema.parse(await req.json());

    // Validate the appraiser-completed sections
    const summarySection = await prisma.appraisalSection.findUnique({
      where: { appraisalId_sectionKey: { appraisalId: id, sectionKey: "appraiser_summary" } },
    });
    const outputsSection = await prisma.appraisalSection.findUnique({
      where: { appraisalId_sectionKey: { appraisalId: id, sectionKey: "appraisal_outputs" } },
    });
    const checklistSection = await prisma.appraisalSection.findUnique({
      where: { appraisalId_sectionKey: { appraisalId: id, sectionKey: "appraiser_checklist" } },
    });
    const summary = parseSectionData("appraiser_summary", summarySection?.data ?? "{}") as {
      discussionSummary?: string;
      agreements?: string;
      outputs?: string;
      pdpAgreed?: boolean;
    };
    const outputs = parseSectionData("appraisal_outputs", outputsSection?.data ?? "{}") as {
      statement1?: boolean; statement2?: boolean; statement3?: boolean; statement4?: boolean; statement5?: boolean;
    };
    const checklist = parseSectionData("appraiser_checklist", checklistSection?.data ?? "{}") as {
      verifiedCliniciansChecklist?: boolean;
    };
    const missing: string[] = [];
    if (!summary.discussionSummary?.trim()) missing.push("Appraiser's summary of the discussion is required");
    if (!summary.pdpAgreed) missing.push("Confirm that the PDP has been agreed with the doctor");
    if (!outputs.statement1 || !outputs.statement2 || !outputs.statement3 || !outputs.statement4 || !outputs.statement5) {
      missing.push("Complete all 5 RO statements (Appraisal outputs) — they are the revalidation recommendation to the RO");
    }
    if (!checklist.verifiedCliniciansChecklist) missing.push("Confirm the appraiser's checklist — verify the clinician's checklist has been checked");
    const unresolved = await prisma.appraiserComment.count({ where: { appraisalId: id, resolved: false } });
    if (unresolved > 0) missing.push(`${unresolved} unresolved comment thread(s) must be resolved before sign-off`);
    if (missing.length) return NextResponse.json({ error: "Sign-off requirements not met:", details: missing }, { status: 422 });

    const meetingDate = body.meetingDate ? new Date(body.meetingDate) : new Date();

    await prisma.$transaction([
      prisma.signature.create({
        data: {
          appraisalId: id,
          signerId: user.id,
          signerRole: "APPRAISER",
          statement: body.statement,
        },
      }),
      prisma.appraisal.update({
        where: { id },
        data: { status: "SIGNED_OFF", signedOffAt: new Date(), appraisalMeetingDate: meetingDate },
      }),
      // Doctor's acknowledgement signature is implied at submission; record it for the export bundle.
      prisma.signature.upsert({
        where: { appraisalId_signerRole: { appraisalId: id, signerRole: "DOCTOR" } },
        update: {},
        create: { appraisalId: id, signerId: appraisal.doctorId, signerRole: "DOCTOR", statement: "Submitted by doctor on " + (appraisal.submittedAt?.toISOString() ?? new Date().toISOString()) },
      }),
    ]);

    // Yearly PDP carry-forward: seed next year's appraisal with AGREED objectives.
    const nextYear = appraisal.year + 1;
    const existingNext = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: appraisal.doctorId, year: nextYear } } });
    if (!existingNext) {
      const next = await prisma.appraisal.create({
        data: { doctorId: appraisal.doctorId, appraiserId: appraisal.appraiserId, year: nextYear, sections: { create: DEFAULT_SECTIONS.map((sectionKey) => ({ sectionKey, data: "{}" })) } },
      });
      const agreed = await prisma.pDPObjective.findMany({ where: { appraisalId: id, status: "AGREED" } });
      await prisma.pDPObjective.createMany({
        data: agreed.map((o) => ({
          appraisalId: next.id,
          source: "CARRIED_FORWARD",
          previousObjectiveId: o.id,
          title: o.title,
          description: o.description,
          status: "PROPOSED",
          priority: o.priority,
        })),
      });
      await notify(
        appraisal.doctorId,
        `Your ${nextYear}/${String(nextYear + 1).slice(2)} appraisal is ready`,
        `${agreed.length} objective(s) carried forward from your signed-off PDP.`,
        "/doctor/appraisal"
      );
    }

    const admins = await prisma.user.findMany({ where: { role: "ADMIN", active: true }, select: { id: true } });
    await Promise.all(
      admins.map((a) => notify(a.id, "Appraisal signed off", `${user.name} signed off ${appraisal.doctor.name}'s ${appraisal.year}/${String(appraisal.year + 1).slice(2)} appraisal.`, "/admin"))
    );
    await notify(appraisal.doctorId, "Appraisal signed off", `Your ${appraisal.year}/${String(appraisal.year + 1).slice(2)} appraisal has been signed off by ${user.name}.`, "/doctor/appraisal");

    await audit({
      actorId: user.id, actorRole: user.role, action: "APPRAISAL_SIGNOFF", entityType: "Appraisal", entityId: id,
      meta: { doctorId: appraisal.doctorId, year: appraisal.year, meetingDate: meetingDate.toISOString() },
    });
    return NextResponse.json({ ok: true, status: "SIGNED_OFF" });
  });
}
