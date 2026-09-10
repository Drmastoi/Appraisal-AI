import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApi } from "@/lib/api";
import { requireRole, ApiError } from "@/lib/auth";
import { audit } from "@/lib/audit";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

export async function POST(req: Request) {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const form = await req.formData();
    const file = form.get("file");
    const sectionKey = (form.get("sectionKey") as string) || null;
    if (!(file instanceof File)) throw new ApiError(422, "No file provided");
    if (file.size === 0 || file.size > MAX_SIZE) throw new ApiError(413, "File must be between 1 byte and 10 MB");
    if (!ALLOWED.has(file.type)) throw new ApiError(415, `Unsupported file type: ${file.type || "unknown"}`);

    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) throw new ApiError(404, "No appraisal found for the current year");
    if (appraisal.status !== "DRAFT") throw new ApiError(409, "Attachments cannot be changed after submission");

    const issuer = (form.get("issuer") as string)?.slice(0, 200) || null;
    const issuedAtRaw = form.get("issuedAt") as string | null;
    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await prisma.attachment.create({
      data: {
        appraisalId: appraisal.id,
        sectionKey,
        filename: file.name.slice(0, 200),
        mimeType: file.type,
        size: file.size,
        data: buffer,
        uploadedById: user.id,
        issuer,
        issuedAt: issuedAtRaw ? new Date(issuedAtRaw) : null,
      },
    });
    await audit({ actorId: user.id, actorRole: user.role, action: "ATTACHMENT_UPLOAD", entityType: "Attachment", entityId: attachment.id, meta: { filename: attachment.filename, size: file.size } });
    return NextResponse.json({ ok: true, id: attachment.id }, { status: 201 });
  });
}

export async function GET() {
  return handleApi(async () => {
    const user = await requireRole("DOCTOR");
    const year = new Date().getFullYear();
    const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
    if (!appraisal) return NextResponse.json({ attachments: [] });
    const attachments = await prisma.attachment.findMany({
      where: { appraisalId: appraisal.id },
      select: { id: true, filename: true, mimeType: true, size: true, sectionKey: true, createdAt: true, issuer: true, issuedAt: true, verified: true, verifiedAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ attachments });
  });
}
