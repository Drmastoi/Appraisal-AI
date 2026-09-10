import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AttachmentList from "@/app/doctor/appraisal/AttachmentList";

export default async function AttachmentsPanel({ locked }: { locked: boolean }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const year = new Date().getFullYear();
  const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
  if (!appraisal) return <p className="text-sm text-slate-400">Create your appraisal to attach documents.</p>;
  const attachments = await prisma.attachment.findMany({
    where: { appraisalId: appraisal.id },
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true, issuer: true, issuedAt: true, verified: true, verifiedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return <AttachmentList items={attachments} locked={locked} />;
}
