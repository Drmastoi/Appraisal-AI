import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  date: z.string().min(4),
  title: z.string().min(2).max(300),
  activityType: z.enum(["INTERNAL", "EXTERNAL"]),
  category: z.string().max(120).optional(),
  provider: z.string().max(200).optional(),
  points: z.number().int().min(0).max(100),
  reflection: z.string().max(5000).optional(),
  learningNeeds: z.string().max(2000).optional(),
  impactOnPractice: z.string().max(2000).optional(),
  aiAssisted: z.boolean().optional(),
});

export async function GET() {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) return NextResponse.json({ entries: [], totals: { internal: 0, external: 0, all: 0 } });
    const entries = await prisma.cPDEntry.findMany({ where: { appraisalId: appraisal.id }, orderBy: { date: "desc" } });
    const totals = {
      internal: entries.filter((e) => e.activityType === "INTERNAL").reduce((s, e) => s + e.points, 0),
      external: entries.filter((e) => e.activityType === "EXTERNAL").reduce((s, e) => s + e.points, 0),
      all: entries.reduce((s, e) => s + e.points, 0),
    };
    return NextResponse.json({ entries, totals });
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

    const entry = await prisma.cPDEntry.create({
      data: {
        appraisalId: appraisal.id,
        date: new Date(body.date),
        title: body.title,
        activityType: body.activityType,
        category: body.category ?? null,
        provider: body.provider ?? null,
        points: body.points,
        reflection: body.reflection ?? null,
        learningNeeds: body.learningNeeds ?? null,
        impactOnPractice: body.impactOnPractice ?? null,
        aiAssisted: body.aiAssisted ?? false,
      },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "CPD_CREATE", entityType: "CPDEntry", entityId: entry.id, meta: { title: entry.title, points: entry.points } });
    return NextResponse.json({ ok: true, entry }, { status: 201 });
  });
}
