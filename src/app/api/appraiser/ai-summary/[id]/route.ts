import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { runAI } from "@/lib/ai/service";
import { appraisalForAppraiser } from "@/lib/appraisal-access";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("APPRAISER");
    if (!rateLimit(`ai:${user.id}:${clientIp(req)}`, 20, 60_000)) {
      return NextResponse.json({ error: "AI rate limit reached, try again shortly" }, { status: 429 });
    }
    const { id } = await params;
    await appraisalForAppraiser(user, id);
    const [cpd, qi, events, pdp, cycles] = await Promise.all([
      prisma.cPDEntry.findMany({ where: { appraisalId: id } }),
      prisma.qIEntry.findMany({ where: { appraisalId: id } }),
      prisma.significantEvent.findMany({ where: { appraisalId: id } }),
      prisma.pDPObjective.findMany({ where: { appraisalId: id } }),
      prisma.feedbackCycle.findMany({ where: { appraisalId: id }, include: { _count: { select: { responses: true } } } }),
    ]);

    const bullets = [
      `${cpd.length} CPD entries (${cpd.reduce((s, e) => s + e.points, 0)} points)`,
      `${qi.length} quality improvement activit(ies)`,
      `${events.filter((e) => e.eventType === "SIGNIFICANT_EVENT").length} significant event(s) declared`,
      `${events.filter((e) => e.eventType === "COMPLAINT").length} complaint(s) declared`,
      `${pdp.length} PDP objective(s) drafted`,
      ...cycles.map((c) => `${c.cycleType.toLowerCase()} feedback cycle: ${c._count.responses} responses`),
    ];

    const result = await runAI({
      kind: "APPRAISAL_SUMMARY",
      userId: user.id,
      appraisalId: id,
      userPrompt: bullets.map((b) => `- ${b}`).join("\n"),
      promptMeta: { cpdCount: cpd.length, qiCount: qi.length, events: events.length },
    });
    return NextResponse.json({ ok: true, ...result });
  });
}
