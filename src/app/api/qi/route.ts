import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  date: z.string().min(4),
  title: z.string().min(2).max(300),
  entryType: z.enum(["AUDIT", "QI_PROJECT", "TEACHING_FEEDBACK", "CBD", "REFLECTION", "OTHER"]),
  description: z.string().min(2).max(5000),
  outcome: z.string().max(3000).optional(),
});

export async function GET() {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) return NextResponse.json({ entries: [] });
    const entries = await prisma.qIEntry.findMany({ where: { appraisalId: appraisal.id }, orderBy: { date: "desc" } });
    return NextResponse.json({ entries });
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
    const entry = await prisma.qIEntry.create({
      data: {
        appraisalId: appraisal.id,
        date: new Date(body.date),
        title: body.title,
        entryType: body.entryType,
        description: body.description,
        outcome: body.outcome ?? null,
      },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "QI_CREATE", entityType: "QIEntry", entityId: entry.id, meta: { entryType: entry.entryType } });
    return NextResponse.json({ ok: true, entry }, { status: 201 });
  });
}
