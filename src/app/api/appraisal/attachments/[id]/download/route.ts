import { requireUser, ApiError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const attachment = await prisma.attachment.findUnique({ where: { id }, include: { appraisal: true } });
    if (!attachment) throw new ApiError(404, "Attachment not found");
    const isOwner = user.role === "DOCTOR" && attachment.appraisal.doctorId === user.id;
    const isAssignedAppraiser = user.role === "APPRAISER" && attachment.appraisal.appraiserId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAssignedAppraiser && !isAdmin) throw new ApiError(403, "Not permitted");

    await audit({ actorId: user.id, actorRole: user.role, action: "ATTACHMENT_DOWNLOAD", entityType: "Attachment", entityId: id, meta: { filename: attachment.filename } });
    const body = new Uint8Array(attachment.data);
    return new Response(body, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename="${attachment.filename.replace(/"/g, "")}"`,
        "Content-Length": String(attachment.size),
      },
    });
  });
}
