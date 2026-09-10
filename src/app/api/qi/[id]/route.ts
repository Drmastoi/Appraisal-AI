import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const { id } = await params;
    const entry = await prisma.qIEntry.findUnique({ where: { id }, include: { appraisal: true } });
    if (!entry) throw new ApiError(404, "Entry not found");
    if (entry.appraisal.doctorId !== user.id) throw new ApiError(403, "Not your entry");
    if (entry.appraisal.status !== "DRAFT") throw new ApiError(409, "Appraisal is locked after submission");
    await prisma.qIEntry.delete({ where: { id } });
    await audit({ actorId: user.id, actorRole: user.role, action: "QI_DELETE", entityType: "QIEntry", entityId: id });
    return NextResponse.json({ ok: true });
  });
}
