import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    const event = await prisma.significantEvent.findUnique({ where: { id }, include: { appraisal: true } });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.appraisal.doctorId !== user.id) throw new ApiError(403, "Not your event");
    if (event.appraisal.status !== "DRAFT") throw new ApiError(409, "Appraisal is locked after submission");
    await prisma.significantEvent.delete({ where: { id } });
    await audit({ actorId: user.id, actorRole: user.role, action: "EVENT_DELETE", entityType: "SignificantEvent", entityId: id });
    return NextResponse.json({ ok: true });
  });
}
