import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const schema = z.object({ doctorId: z.string(), appraiserId: z.string() });

export async function POST(req: Request) {
  return handleApi(async () => {
    const admin = await requireRole("ADMIN");
    const body = schema.parse(await req.json());
    const [doctor, appraiser] = await Promise.all([
      prisma.user.findFirst({ where: { id: body.doctorId, role: "DOCTOR" } }),
      prisma.user.findFirst({ where: { id: body.appraiserId, role: "APPRAISER" } }),
    ]);
    if (!doctor || !appraiser) throw new ApiError(404, "Doctor or appraiser not found");

    const assignment = await prisma.assignment.upsert({
      where: { doctorId_appraiserId: { doctorId: doctor.id, appraiserId: appraiser.id } },
      update: { active: true },
      create: { doctorId: doctor.id, appraiserId: appraiser.id, active: true },
    });
    // One active assignment per doctor: retire other pairings.
    await prisma.assignment.updateMany({ where: { doctorId: doctor.id, id: { not: assignment.id } }, data: { active: false } });
    await audit({ actorId: admin.id, actorRole: admin.role, action: "ASSIGNMENT_SET", entityType: "Assignment", entityId: assignment.id, meta: { doctorId: doctor.id, appraiserId: appraiser.id } });
    return NextResponse.json({ ok: true, assignmentId: assignment.id });
  });
}
