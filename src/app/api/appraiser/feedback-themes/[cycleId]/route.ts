import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { runAI } from "@/lib/ai/service";
import { aggregateRatings, cycleQuestions } from "@/lib/feedback";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request, { params }: { params: Promise<{ cycleId: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("APPRAISER");
    if (!rateLimit(`ai:${user.id}:${clientIp(req)}`, 20, 60_000)) {
      return NextResponse.json({ error: "AI rate limit reached, try again shortly" }, { status: 429 });
    }
    const { cycleId } = await params;
    const cycle = await prisma.feedbackCycle.findUnique({ where: { id: cycleId }, include: { appraisal: true, responses: true } });
    if (!cycle) throw new ApiError(404, "Feedback cycle not found");
    if (cycle.appraisal.appraiserId !== user.id) throw new ApiError(403, "Not your appraisal's feedback cycle");

    const cycleType = cycle.cycleType as "COLLEAGUE" | "PATIENT";
    const agg = aggregateRatings(cycle.responses, cycleQuestions(cycleType).likert);
    const bullets = agg.perQuestion
      .filter((q) => q.mean !== null)
      .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))
      .slice(0, 5)
      .map((q) => `${q.text} (mean ${q.mean}/5)`);

    const result = await runAI({
      kind: "FEEDBACK_THEMES",
      userId: user.id,
      appraisalId: cycle.appraisalId,
      userPrompt: bullets.map((b) => `- ${b}`).join("\n") || "No quantitative data available.",
      promptMeta: { cycleType, responses: agg.totalResponses },
    });
    return NextResponse.json({ ok: true, ...result });
  });
}
