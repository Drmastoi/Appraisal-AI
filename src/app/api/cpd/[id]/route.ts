import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const updateSchema = z.object({
  date: z.string().optional(),
  title: z.string().min(2).max(300).optional(),
  activityType: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  category: z.string().max(120).nullable().optional(),
  provider: z.string().max(200).nullable().optional(),
  points: z.number().int().min(0).max(100).optional(),
  reflection: z.string().max(5000).nullable().optional(),
  learningNeeds: z.string().max(2000).nullable().optional(),
  impactOnPractice: z.string().max(2000).nullable().optional(),
});

async function ownedEntry(userId: string, id: string) {
  const entry = await prisma.cPDEntry.findUnique({ where: { id }, include: { appraisal: true } });
  if (!entry) throw new ApiError(404, "CPD entry not found");
  if (entry.appraisal.doctorId !== userId) throw new ApiError(403, "Not your CPD entry");
  if (entry.appraisal.status !== "DRAFT") throw new ApiError(409, "Appraisal is locked after submission");
  return entry;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    await ownedEntry(user.id, id);
    const body = updateSchema.parse(await req.json());
    const entry = await prisma.cPDEntry.update({
      where: { id },
      data: {
        ...(body.date ? { date: new Date(body.date) } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.activityType !== undefined ? { activityType: body.activityType } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.provider !== undefined ? { provider: body.provider } : {}),
        ...(body.points !== undefined ? { points: body.points } : {}),
        ...(body.reflection !== undefined ? { reflection: body.reflection } : {}),
        ...(body.learningNeeds !== undefined ? { learningNeeds: body.learningNeeds } : {}),
        ...(body.impactOnPractice !== undefined ? { impactOnPractice: body.impactOnPractice } : {}),
      },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "CPD_UPDATE", entityType: "CPDEntry", entityId: id });
    return NextResponse.json({ ok: true, entry });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    await ownedEntry(user.id, id);
    await prisma.cPDEntry.delete({ where: { id } });
    await audit({ actorId: user.id, actorRole: user.role, action: "CPD_DELETE", entityType: "CPDEntry", entityId: id });
    return NextResponse.json({ ok: true });
  });
}
