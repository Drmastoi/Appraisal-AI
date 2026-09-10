import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireUser, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const { verified } = (await req.json()) as { verified: boolean };
    const att = await prisma.attachment.findUnique({ where: { id }, include: { appraisal: true } });
    if (!att) throw new ApiError(404, "Attachment not found");
    const isOwner = user.role === "DOCTOR" && att.appraisal.doctorId === user.id;
    const isAppraiser = user.role === "APPRAISER" && att.appraisal.appraiserId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAppraiser && !isAdmin) throw new ApiError(403, "Not permitted");
    if (isOwner && att.appraisal.status !== "DRAFT") throw new ApiError(409, "Locked after submission");
    const updated = await prisma.attachment.update({
      where: { id },
      data: { verified: Boolean(verified), verifiedAt: verified ? new Date() : null, verifiedById: verified ? user.id : null },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: verified ? "ATTACHMENT_VERIFY" : "ATTACHMENT_UNVERIFY", entityType: "Attachment", entityId: id });
    return NextResponse.json({ ok: true, verified: updated.verified });
  });
}
