import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

const createSchema = z.object({
  doctorId: z.string(),
  appraisalYear: z.number().int(),
  recommendation: z.enum(["POSITIVE", "DEFERRED", "NEGATIVE"]),
  note: z.string().max(4000).optional(),
});

export async function GET() {
  return handleApi(async () => {
    await requireRole("ADMIN");
    const recommendations = await prisma.rORecommendation.findMany({
      include: { doctor: { select: { name: true, gmcNumber: true } }, madeBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ recommendations });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const admin = await requireRole("ADMIN");
    const body = createSchema.parse(await req.json());
    const doctor = await prisma.user.findFirst({ where: { id: body.doctorId, role: "DOCTOR" } });
    if (!doctor) throw new ApiError(404, "Doctor not found");

    const existing = await prisma.rORecommendation.findFirst({
      where: { doctorId: body.doctorId, appraisalYear: body.appraisalYear },
    });
    const recommendation = existing
      ? await prisma.rORecommendation.update({ where: { id: existing.id }, data: { recommendation: body.recommendation, note: body.note ?? null, madeById: admin.id } })
      : await prisma.rORecommendation.create({
          data: {
            doctorId: body.doctorId,
            appraisalYear: body.appraisalYear,
            recommendation: body.recommendation,
            note: body.note ?? null,
            madeById: admin.id,
          },
        });

    await notify(doctor.id, "Revalidation recommendation recorded", `A ${body.recommendation.toLowerCase()} recommendation was recorded for your ${body.appraisalYear}/${String(body.appraisalYear + 1).slice(2)} appraisal.`, "/doctor");
    await audit({
      actorId: admin.id, actorRole: admin.role, action: existing ? "RO_RECOMMENDATION_UPDATE" : "RO_RECOMMENDATION_CREATE",
      entityType: "RORecommendation", entityId: recommendation.id, meta: { recommendation: body.recommendation, year: body.appraisalYear },
    });
    return NextResponse.json({ ok: true, recommendation: { id: recommendation.id, recommendation: recommendation.recommendation } });
  });
}
