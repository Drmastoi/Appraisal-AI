import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { DEFAULT_SECTIONS } from "@/lib/appraisal";

const schema = z.object({
  doctorId: z.string().min(1),
  year: z.number().int().optional(),
  appraiserId: z.string().optional(),
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const admin = await requireRole("ADMIN");
    const body = schema.parse(await req.json());
    const doctor = await prisma.user.findFirst({ where: { id: body.doctorId, role: "DOCTOR" } });
    if (!doctor) throw new ApiError(404, "Doctor not found");
    const year = body.year ?? new Date().getFullYear();
    const existing = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: doctor.id, year } } });
    if (existing) return NextResponse.json({ ok: true, appraisalId: existing.id, existing: true });

    const appraisal = await prisma.appraisal.create({
      data: {
        doctorId: doctor.id,
        appraiserId: body.appraiserId ?? null,
        year,
        sections: { create: DEFAULT_SECTIONS.map((sectionKey) => ({ sectionKey, data: "{}" })) },
      },
    });
    await audit({
      actorId: admin.id, actorRole: admin.role, action: "APPRAISAL_CREATE",
      entityType: "Appraisal", entityId: appraisal.id, meta: { doctorId: doctor.id, year },
    });
    return NextResponse.json({ ok: true, appraisalId: appraisal.id }, { status: 201 });
  });
}
