import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { runAI } from "@/lib/ai/service";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    if (!rateLimit(`ai:${user.id}:${clientIp(req)}`, 20, 60_000)) {
      return NextResponse.json({ error: "AI rate limit reached, try again shortly" }, { status: 429 });
    }
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({
      where: { doctorId_year: { doctorId: user.id, year } },
      include: { cpdEntries: true, qiEntries: true, pdpObjectives: true },
    });
    if (!appraisal) throw new ApiError(404, "Create your appraisal first");

    // Inputs are the doctor's own portfolio themes — no patient-identifiable data.
    const cpdThemes = Array.from(new Set(appraisal.cpdEntries.map((e) => e.category).filter(Boolean))) as string[];
    const unachieved = appraisal.pdpObjectives.filter((o) => o.status === "NOT_ACHIEVED" || o.status === "CARRIED_FORWARD").map((o) => o.title);
    const qiTypes = Array.from(new Set(appraisal.qiEntries.map((q) => q.entryType)));

    const prompt = [
      "Suggest 3-5 PDP objectives for the next appraisal year based on:",
      cpdThemes.length ? `- CPD themes this year: ${cpdThemes.join(", ")}` : "- CPD themes: none recorded yet",
      qiTypes.length ? `- QI activity types: ${qiTypes.join(", ").toLowerCase()}` : "- QI activity: none recorded yet",
      unachieved.length ? `- Unachieved objectives to consider carrying forward: ${unachieved.join("; ")}` : "- No unachieved objectives",
    ].join("\n");

    const result = await runAI({
      kind: "PDP_SUGGESTION",
      userId: user.id,
      appraisalId: appraisal.id,
      userPrompt: prompt,
      promptMeta: { cpdThemes, unachievedCount: unachieved.length },
    });
    return NextResponse.json({ ok: true, ...result });
  });
}
