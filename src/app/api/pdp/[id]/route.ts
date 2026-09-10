import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  title: z.string().min(2).max(300).optional(),
  description: z.string().max(3000).nullable().optional(),
  status: z.enum(["PROPOSED", "AGREED", "ACHIEVED", "NOT_ACHIEVED", "CARRIED_FORWARD"]).optional(),
  progressNote: z.string().max(3000).nullable().optional(),
  priority: z.number().int().min(0).max(9).optional(),
  smartSpecific: z.string().max(2000).nullable().optional(),
  smartMeasurable: z.string().max(2000).nullable().optional(),
  smartAchievable: z.string().max(2000).nullable().optional(),
  smartRelevant: z.string().max(2000).nullable().optional(),
  smartTimeBound: z.string().max(2000).nullable().optional(),
  deadline: z.string().nullable().optional(),
});

async function ownedObjective(userId: string, id: string) {
  const objective = await prisma.pDPObjective.findUnique({ where: { id }, include: { appraisal: true } });
  if (!objective) throw new ApiError(404, "Objective not found");
  if (objective.appraisal.doctorId !== userId) throw new ApiError(403, "Not your objective");
  return objective;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    const objective = await ownedObjective(user.id, id);
    if (objective.appraisal.status !== "DRAFT") throw new ApiError(409, "Appraisal is locked after submission");
    const body = updateSchema.parse(await req.json());
    const updated = await prisma.pDPObjective.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.progressNote !== undefined ? { progressNote: body.progressNote } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.smartSpecific !== undefined ? { smartSpecific: body.smartSpecific } : {}),
        ...(body.smartMeasurable !== undefined ? { smartMeasurable: body.smartMeasurable } : {}),
        ...(body.smartAchievable !== undefined ? { smartAchievable: body.smartAchievable } : {}),
        ...(body.smartRelevant !== undefined ? { smartRelevant: body.smartRelevant } : {}),
        ...(body.smartTimeBound !== undefined ? { smartTimeBound: body.smartTimeBound } : {}),
        ...(body.deadline !== undefined ? { deadline: body.deadline ? new Date(body.deadline) : null } : {}),
      },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "PDP_OBJECTIVE_UPDATE", entityType: "PDPObjective", entityId: id, meta: { status: updated.status } });
    return NextResponse.json({ ok: true, objective: updated });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    const objective = await ownedObjective(user.id, id);
    if (objective.appraisal.status !== "DRAFT") throw new ApiError(409, "Appraisal is locked after submission");
    await prisma.pDPObjective.delete({ where: { id } });
    await audit({ actorId: user.id, actorRole: user.role, action: "PDP_OBJECTIVE_DELETE", entityType: "PDPObjective", entityId: id });
    return NextResponse.json({ ok: true });
  });
}
