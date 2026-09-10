import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  title: z.string().min(2).max(300),
  description: z.string().max(3000).optional(),
  priority: z.number().int().min(0).max(9).optional(),
  carryForwardFrom: z.string().optional(), // previous objective id
  smartSpecific: z.string().max(2000).optional(),
  smartMeasurable: z.string().max(2000).optional(),
  smartAchievable: z.string().max(2000).optional(),
  smartRelevant: z.string().max(2000).optional(),
  smartTimeBound: z.string().max(2000).optional(),
  deadline: z.string().optional(), // ISO date
});

export async function GET() {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    const objectives = appraisal ? await prisma.pDPObjective.findMany({ where: { appraisalId: appraisal.id }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }], include: { previousObjective: true } }) : [];

    const previous = await prisma.appraisal.findUnique({
      where: { doctorId_year: { doctorId: user.id, year: year - 1 } },
      include: { pdpObjectives: true },
    });
    const previousYearObjectives = previous?.pdpObjectives ?? [];
    const carriedIds = new Set(objectives.map((o) => o.previousObjectiveId).filter(Boolean));
    const availableToCarry = previousYearObjectives.filter((o) => !carriedIds.has(o.id));

    return NextResponse.json({ objectives, previousYearObjectives, availableToCarry });
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

    let source = "NEW";
    let title = body.title;
    let description = body.description ?? null;
    let previousObjectiveId: string | null = null;

    if (body.carryForwardFrom) {
      const prev = await prisma.pDPObjective.findUnique({ where: { id: body.carryForwardFrom }, include: { appraisal: true } });
      if (!prev || prev.appraisal.doctorId !== user.id) throw new ApiError(404, "Previous objective not found");
      source = "CARRIED_FORWARD";
      title = prev.title;
      description = prev.description;
      previousObjectiveId = prev.id;
      // Mark the source objective as carried forward rather than simply unachieved.
      await prisma.pDPObjective.update({ where: { id: prev.id }, data: { status: "CARRIED_FORWARD" } });
    }

    const objective = await prisma.pDPObjective.create({
      data: {
        appraisalId: appraisal.id, source, previousObjectiveId, title, description, status: "PROPOSED", priority: body.priority ?? 0,
        smartSpecific: body.smartSpecific ?? null, smartMeasurable: body.smartMeasurable ?? null, smartAchievable: body.smartAchievable ?? null,
        smartRelevant: body.smartRelevant ?? null, smartTimeBound: body.smartTimeBound ?? null,
        deadline: body.deadline ? new Date(body.deadline) : null,
      },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "PDP_OBJECTIVE_CREATE", entityType: "PDPObjective", entityId: objective.id, meta: { source } });
    return NextResponse.json({ ok: true, objective }, { status: 201 });
  });
}
