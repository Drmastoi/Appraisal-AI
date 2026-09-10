import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const createSchema = z.object({
  date: z.string().min(4),
  title: z.string().min(2).max(300),
  eventType: z.enum(["SIGNIFICANT_EVENT", "COMPLAINT", "COMPLIMENT"]),
  description: z.string().min(2).max(5000),
  reflection: z.string().max(5000).optional(),
  outcome: z.string().max(3000).optional(),
});

export async function GET() {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) return NextResponse.json({ events: [] });
    const events = await prisma.significantEvent.findMany({ where: { appraisalId: appraisal.id }, orderBy: { date: "desc" } });
    return NextResponse.json({ events });
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
    const event = await prisma.significantEvent.create({
      data: {
        appraisalId: appraisal.id,
        date: new Date(body.date),
        title: body.title,
        eventType: body.eventType,
        description: body.description,
        reflection: body.reflection ?? null,
        outcome: body.outcome ?? null,
      },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "EVENT_CREATE", entityType: "SignificantEvent", entityId: event.id, meta: { eventType: event.eventType } });
    return NextResponse.json({ ok: true, event }, { status: 201 });
  });
}
