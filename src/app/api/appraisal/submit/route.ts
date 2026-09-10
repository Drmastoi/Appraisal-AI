import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { validateForSubmission } from "@/lib/submission";

export async function POST() {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({
      where: { doctorId_year: { doctorId: user.id, year } },
      include: { sections: true, cpdEntries: { select: { id: true } }, qiEntries: { select: { id: true } }, pdpObjectives: true },
    });
    if (!appraisal) throw new ApiError(404, "No appraisal found for the current year");
    if (appraisal.status !== "DRAFT") throw new ApiError(409, "Appraisal has already been submitted");

    const missing = validateForSubmission({
      appraiserId: appraisal.appraiserId,
      sections: appraisal.sections.map((s) => ({ sectionKey: s.sectionKey, data: s.data })),
      cpdCount: appraisal.cpdEntries.length,
      qiCount: appraisal.qiEntries.length,
      newPdpCount: appraisal.pdpObjectives.filter((o) => o.source === "NEW").length,
    });

    if (missing.length > 0) {
      return NextResponse.json({ error: "The appraisal is not ready to submit:", details: missing }, { status: 422 });
    }

    // B-2: auto-copy PDP proposals to agreed_pdp unless the appraiser has already edited it
    const agreedSection = appraisal.sections.find((s) => s.sectionKey === "agreed_pdp");
    const isAgreedEmpty = !agreedSection || agreedSection.data === "{}" || (() => { try { const p = JSON.parse(agreedSection.data) as { items?: unknown[] }; return !p.items?.length; } catch { return true; } })();
    if (isAgreedEmpty) {
      const proposed = appraisal.pdpObjectives.filter((o) => o.source === "NEW");
      if (proposed.length > 0) {
        const items = proposed.map((o) => ({
          title: o.title,
          actionOrGoal: o.description ?? "",
          targetDate: o.deadline ? o.deadline.toISOString().slice(0, 10) : "",
          evidence: o.progressNote ?? "",
        }));
        await prisma.appraisalSection.upsert({
          where: { appraisalId_sectionKey: { appraisalId: appraisal.id, sectionKey: "agreed_pdp" } },
          update: { data: JSON.stringify({ items, notes: "" }) },
          create: { appraisalId: appraisal.id, sectionKey: "agreed_pdp", data: JSON.stringify({ items, notes: "" }) },
        });
      }
    }

    const updated = await prisma.appraisal.update({
      where: { id: appraisal.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    if (appraisal.appraiserId) {
      await notify(
        appraisal.appraiserId,
        "Appraisal submitted for review",
        `${user.name} submitted their ${year}/${String(year + 1).slice(2)} appraisal for review.`,
        `/appraiser/appraisals/${appraisal.id}`
      );
    }
    await audit({ actorId: user.id, actorRole: user.role, action: "APPRAISAL_SUBMIT", entityType: "Appraisal", entityId: appraisal.id, meta: { year } });
    return NextResponse.json({ ok: true, status: updated.status });
  });
}
