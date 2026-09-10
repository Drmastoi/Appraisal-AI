import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const attachment = await prisma.attachment.findUnique({ where: { id }, include: { appraisal: true } });
    if (!attachment) throw new ApiError(404, "Attachment not found");
    const isOwner = user.role === "DOCTOR" && attachment.appraisal.doctorId === user.id;
    const isAssignedAppraiser = user.role === "APPRAISER" && attachment.appraisal.appraiserId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAssignedAppraiser && !isAdmin) throw new ApiError(403, "Not permitted");
    if (isOwner && attachment.appraisal.status !== "DRAFT") throw new ApiError(409, "Locked after submission");
    if (isAssignedAppraiser) throw new ApiError(403, "Appraisers cannot delete doctor evidence");

    await prisma.attachment.delete({ where: { id } });
    await audit({ actorId: user.id, actorRole: user.role, action: "ATTACHMENT_DELETE", entityType: "Attachment", entityId: id, meta: { filename: attachment.filename } });
    return NextResponse.json({ ok: true });
  });
}
