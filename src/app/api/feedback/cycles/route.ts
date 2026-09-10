import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { minimumResponses } from "@/lib/feedback";

const createSchema = z.object({ cycleType: z.enum(["COLLEAGUE", "PATIENT"]), minResponses: z.number().int().min(5).max(100).optional() });

export async function GET() {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) return NextResponse.json({ cycles: [] });
    const cycles = await prisma.feedbackCycle.findMany({
      where: { appraisalId: appraisal.id },
      include: { _count: { select: { invites: true, responses: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ cycles });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const body = createSchema.parse(await req.json());
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) throw new ApiError(404, "Create your appraisal first");
    if (appraisal.status !== "DRAFT") throw new ApiError(409, "Appraisal is locked after submission");
    const open = await prisma.feedbackCycle.findFirst({ where: { appraisalId: appraisal.id, cycleType: body.cycleType, status: "OPEN" } });
    if (open) throw new ApiError(409, `You already have an open ${body.cycleType.toLowerCase()} feedback cycle`);

    const cycle = await prisma.feedbackCycle.create({
      data: { appraisalId: appraisal.id, cycleType: body.cycleType, minResponses: body.minResponses ?? minimumResponses(body.cycleType) },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "FEEDBACK_CYCLE_CREATE", entityType: "FeedbackCycle", entityId: cycle.id, meta: { cycleType: cycle.cycleType } });
    return NextResponse.json({ ok: true, cycle }, { status: 201 });
  });
}
