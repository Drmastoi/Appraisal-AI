import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser, ApiError } from "@/lib/auth";
import { aggregateRatings, cycleQuestions, domainSummaries, meetsThreshold } from "@/lib/feedback";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const cycle = await prisma.feedbackCycle.findUnique({ where: { id }, include: { appraisal: true, responses: true } });
    if (!cycle) throw new ApiError(404, "Feedback cycle not found");

    const isOwner = user.role === "DOCTOR" && cycle.appraisal.doctorId === user.id;
    const isAppraiser = user.role === "APPRAISER" && cycle.appraisal.appraiserId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAppraiser && !isAdmin) throw new ApiError(403, "Not permitted");

    const cycleType = cycle.cycleType as "COLLEAGUE" | "PATIENT";
    const { likert } = cycleQuestions(cycleType);
    const agg = aggregateRatings(cycle.responses, likert);

    // Free-text answers are only shown unblinded to the appraiser/admin or
    // once the threshold is met; below threshold the doctor sees counts only.
    const unblinded = isAppraiser || isAdmin || meetsThreshold(cycleType, agg.totalResponses);
    const freeText = unblinded
      ? cycle.responses.map((r) => {
          try {
            return JSON.parse(r.freeText) as Record<string, string>;
          } catch {
            return {};
          }
        })
      : null;

    // Domain roll-up + previous-year comparison for analytics (non-blocking best-effort)
    const domains = domainSummaries(agg.perQuestion);
    let previousYear: { year: number; overallMean: number | null } | null = null;
    try {
      const prevAppraisal = await prisma.appraisal.findFirst({ where: { doctorId: cycle.appraisal.doctorId, year: cycle.appraisal.year - 1 }, select: { id: true, year: true } });
      if (prevAppraisal) {
        const prevCycles = await prisma.feedbackCycle.findMany({ where: { appraisalId: prevAppraisal.id, cycleType }, include: { responses: true } });
        const prevAgg = aggregateRatings(prevCycles.flatMap((c) => c.responses), likert);
        previousYear = { year: prevAppraisal.year, overallMean: prevAgg.overallMean };
      }
    } catch {}

    return NextResponse.json({
      cycleType,
      status: cycle.status,
      totalResponses: agg.totalResponses,
      minimum: cycle.minResponses,
      thresholdMet: meetsThreshold(cycleType, agg.totalResponses),
      unblinded,
      overallMean: agg.overallMean,
      perQuestion: agg.perQuestion,
      domains,
      previousYear,
      freeText,
    });
  });
}
