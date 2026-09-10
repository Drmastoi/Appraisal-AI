import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { runAI } from "@/lib/ai/service";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const schema = z.object({
  title: z.string().min(2).max(300),
  category: z.string().max(120).optional(),
  keyPoints: z.string().max(2000).optional(),
  entryId: z.string().optional(), // when re-drafting for an existing entry
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    if (!rateLimit(`ai:${user.id}:${clientIp(req)}`, 20, 60_000)) {
      return NextResponse.json({ error: "AI rate limit reached, try again shortly" }, { status: 429 });
    }
    const body = schema.parse(await req.json());
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) throw new ApiError(404, "Create your appraisal first");
    if (appraisal.status !== "DRAFT") throw new ApiError(409, "Appraisal is locked after submission");

    const prompt = [
      `Title: ${body.title}`,
      body.category ? `Category: ${body.category}` : "",
      body.keyPoints ? `Key points from the activity: ${body.keyPoints}` : "",
      "Context: UK medical appraisal CPD entry.",
    ].filter(Boolean).join("\n");

    const result = await runAI({
      kind: "CPD_REFLECTION",
      userId: user.id,
      appraisalId: appraisal.id,
      userPrompt: prompt,
      promptMeta: { title: body.title, category: body.category ?? null },
    });

    // If drafting for an existing entry, mark it AI-assisted immediately.
    if (body.entryId) {
      const entry = await prisma.cPDEntry.findUnique({ where: { id: body.entryId }, include: { appraisal: true } });
      if (entry && entry.appraisal.doctorId === user.id) {
        await prisma.cPDEntry.update({ where: { id: entry.id }, data: { aiAssisted: true } });
      }
    }
    return NextResponse.json({ ok: true, ...result });
  });
}
