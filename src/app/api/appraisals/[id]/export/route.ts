import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { MAG_SECTIONS } from "@/lib/appraisal";
import { parseSectionData } from "@/lib/sections";
import { buildAppraisalPdf, flattenSectionData } from "@/lib/pdf";
import { aggregateRatings, cycleQuestions, domainSummaries } from "@/lib/feedback";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const appraisal = await prisma.appraisal.findUnique({
      where: { id },
      include: { doctor: true, appraiser: true, sections: true, signatures: true },
    });
    if (!appraisal) throw new ApiError(404, "Appraisal not found");
    const isDoctor = user.role === "DOCTOR" && appraisal.doctorId === user.id;
    const isAppraiser = user.role === "APPRAISER" && appraisal.appraiserId === user.id;
    if (!isDoctor && !isAppraiser && user.role !== "ADMIN") throw new ApiError(403, "Not permitted");

    const sectionsPdf = [];
    const entries = await prisma.cPDEntry.findMany({ where: { appraisalId: id }, orderBy: { date: "asc" } });
    const qi = await prisma.qIEntry.findMany({ where: { appraisalId: id }, orderBy: { date: "asc" } });
    const events = await prisma.significantEvent.findMany({ where: { appraisalId: id }, orderBy: { date: "asc" } });
    const pdp = await prisma.pDPObjective.findMany({ where: { appraisalId: id }, orderBy: { priority: "desc" } });
    const cycles = await prisma.feedbackCycle.findMany({ where: { appraisalId: id }, include: { responses: true } });
    const comments = await prisma.appraiserComment.findMany({ where: { appraisalId: id }, include: { author: { select: { name: true, role: true } } }, orderBy: { createdAt: "asc" } });

    const byKey = new Map(appraisal.sections.map((s) => [s.sectionKey, s]));
    for (const section of MAG_SECTIONS) {
      if (section.key === "cpd") {
        sectionsPdf.push({
          title: section.title,
          lines: entries.flatMap((e) => [
            `## ${new Date(e.date).toISOString().slice(0, 10)} — ${e.title} (${e.activityType}, ${e.points} pts)`,
            ...(e.reflection ? [`Reflection: ${e.reflection}`] : []),
            ...(e.impactOnPractice ? [`Impact: ${e.impactOnPractice}`] : []),
          ]),
        });
        continue;
      }
      if (section.key === "quality_improvement") {
        sectionsPdf.push({
          title: section.title,
          lines: qi.flatMap((e) => [
            `## ${new Date(e.date).toISOString().slice(0, 10)} — ${e.title} (${e.entryType.replace(/_/g, " ")})`,
            e.description,
            ...(e.outcome ? [`Outcome: ${e.outcome}`] : []),
          ]),
        });
        continue;
      }
      if (section.key === "significant_events" || section.key === "complaints") {
        const filtered = events.filter((e) => (section.key === "complaints" ? e.eventType === "COMPLAINT" : e.eventType === "SIGNIFICANT_EVENT"));
        sectionsPdf.push({
          title: section.title,
          lines: filtered.flatMap((e) => [
            `## ${new Date(e.date).toISOString().slice(0, 10)} — ${e.title}`,
            e.description,
            ...(e.reflection ? [`Reflection: ${e.reflection}`] : []),
            ...(e.outcome ? [`Outcome: ${e.outcome}`] : []),
          ]),
        });
        continue;
      }
      if (section.key === "colleague_feedback" || section.key === "patient_feedback") {
        const type = section.key === "colleague_feedback" ? "COLLEAGUE" : "PATIENT";
        const typeCycles = cycles.filter((c) => c.cycleType === type);
        const agg = aggregateRatings(typeCycles.flatMap((c) => c.responses), cycleQuestions(type).likert);
        sectionsPdf.push({
          title: section.title,
          lines:
            typeCycles.length === 0
              ? ["(no feedback cycle completed)"]
              : [
                  `Cycles: ${typeCycles.length}. Responses: ${agg.totalResponses}. Overall mean: ${agg.overallMean ?? "—"}/5.`,
                  ...agg.perQuestion.filter((q) => q.mean !== null).map((q) => `${q.text}: ${q.mean}/5 (n=${q.count})`),
                ],
        });
        continue;
      }
      if (section.key === "pdp_review" || section.key === "new_pdp") {
        const filtered = section.key === "pdp_review"
          ? pdp.filter((o) => o.status === "ACHIEVED" || o.status === "NOT_ACHIEVED" || o.status === "CARRIED_FORWARD" || o.source === "CARRIED_FORWARD")
          : pdp;
        const lines: string[] = filtered.length === 0 ? ["(no objectives recorded)"] : filtered.flatMap((o) => [
          `## ${o.title}`,
          `Status: ${o.status.replace(/_/g, " ")}${o.source === "CARRIED_FORWARD" ? " (carried forward from previous year)" : ""}`,
          ...(o.description ? [o.description] : []),
          ...(o.progressNote ? [`Note: ${o.progressNote}`] : []),
        ]);
        sectionsPdf.push({ title: section.title, lines });
        continue;
      }

      const stored = byKey.get(section.key);
      const data = parseSectionData(section.key, stored?.data ?? "{}");
      sectionsPdf.push({ title: section.title, lines: flattenSectionData(section.key, data) });
    }

    // Appraiser summary extras: GMP domains/themes, wellbeing discussion, mirrored per-section notes
    const summaryData = parseSectionData("appraiser_summary", byKey.get("appraiser_summary")?.data ?? "{}") as {
      gmpDomains?: string[]; gmpThemes?: string[]; wellbeingDiscussion?: string;
      mirroredSectionComments?: Record<string, string>;
    };
    const mirrorCount = summaryData.mirroredSectionComments ? Object.keys(summaryData.mirroredSectionComments).length : 0;
    const gmpLines: string[] = [];
    if (summaryData.gmpDomains?.length) gmpLines.push(`GMP 2024 domains: ${summaryData.gmpDomains.join(", ")}`);
    if (summaryData.gmpThemes?.length) gmpLines.push(`GMP 2024 themes: ${summaryData.gmpThemes.join(", ")}`);
    if (summaryData.wellbeingDiscussion?.trim()) gmpLines.push(`Wellbeing discussion: ${summaryData.wellbeingDiscussion.trim()}`);
    if (mirrorCount > 0) {
      for (const [k, v] of Object.entries(summaryData.mirroredSectionComments ?? {})) {
        if (typeof v === "string" && v.trim()) gmpLines.push(`## Discussed — ${k.replace(/_/g, " ")}`, v.trim());
      }
    }
    if (gmpLines.length) {
      sectionsPdf.push({ title: "Appraiser discussion — GMP 2024, wellbeing, per-section mirrored notes", lines: gmpLines });
    }

    if (comments.length) {
      sectionsPdf.push({
        title: "Appraiser comments and discussion record",
        lines: comments.map((c) => `## ${c.sectionKey.replace(/_/g, " ")} — ${c.author.name} (${c.author.role})${c.resolved ? " [resolved]" : ""}`).flatMap((header, i) => [header, comments[i].body]),
      });
    }

    if (appraisal.signatures.length) {
      sectionsPdf.push({
        title: "Signatures",
        lines: appraisal.signatures.map((s) => `${s.signerRole}: ${s.signerRole === "APPRAISER" ? appraisal.appraiser?.name ?? "appraiser" : appraisal.doctor.name} — signed ${s.signedAt.toISOString().slice(0, 10)}`).concat(
          appraisal.signatures.map((s) => `Statement: ${s.statement}`)
        ),
      });
    }

    // ── Chart data: CPD by category + GMP domain means ────────────────────
    const byCategory = new Map<string, number>();
    for (const e of entries) {
      const cat = (e.category ?? "Uncategorised").trim() || "Uncategorised";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + e.points);
    }
    const cpdByCategory = Array.from(byCategory.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const domainOf = (type: "COLLEAGUE" | "PATIENT") => {
      const typeCycles = cycles.filter((c) => c.cycleType === type);
      const agg = aggregateRatings(typeCycles.flatMap((c) => c.responses), cycleQuestions(type).likert);
      return {
        responses: agg.totalResponses,
        domains: domainSummaries(agg.perQuestion)
          .filter((d): d is typeof d & { mean: number } => d.mean !== null)
          .map((d) => ({ label: d.domain, value: d.mean })),
      };
    };
    const colleague = domainOf("COLLEAGUE");
    const patient = domainOf("PATIENT");

    const bytes = await buildAppraisalPdf({
      title: "Medical Appraisal Record (MAG 2022 form mapped)",
      doctorName: appraisal.doctor.name,
      gmcNumber: appraisal.doctor.gmcNumber ?? "",
      appraiserName: appraisal.appraiser?.name ?? null,
      year: appraisal.year,
      status: appraisal.status,
      meetingDate: appraisal.appraisalMeetingDate,
      signedOffAt: appraisal.signedOffAt,
      designatedBody: appraisal.doctor.designatedBody,
      revalidationDueDate: appraisal.doctor.revalidationDueDate,
      charts: {
        cpdTotal: entries.reduce((s, e) => s + e.points, 0),
        cpdEntries: entries.length,
        cpdByCategory,
        colleagueResponses: colleague.responses,
        patientResponses: patient.responses,
        colleagueDomains: colleague.domains,
        patientDomains: patient.domains,
      },
      sections: sectionsPdf,
    });

    await audit({ actorId: user.id, actorRole: user.role, action: "APPRAISAL_PDF_EXPORT", entityType: "Appraisal", entityId: id });
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="appraisal-${appraisal.year}-${(appraisal.doctor.gmcNumber ?? appraisal.doctor.id).replace(/\W/g, "")}.pdf"`,
      },
    });
  });
}
