import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, StatusBadge, Card } from "@/components/ui";
import ReviewWorkspace from "./ReviewWorkspace";

export default async function AppraiserReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "APPRAISER") redirect("/login");
  const { id } = await params;

  const appraisal = await prisma.appraisal.findUnique({
    where: { id },
    include: { doctor: true, appraiser: true, sections: true, signatures: true },
  });
  if (!appraisal || appraisal.appraiserId !== user.id) redirect("/appraiser");

  const [cpd, qi, events, pdp, cycles, comments] = await Promise.all([
    prisma.cPDEntry.findMany({ where: { appraisalId: id }, orderBy: { date: "asc" } }),
    prisma.qIEntry.findMany({ where: { appraisalId: id }, orderBy: { date: "asc" } }),
    prisma.significantEvent.findMany({ where: { appraisalId: id }, orderBy: { date: "asc" } }),
    prisma.pDPObjective.findMany({ where: { appraisalId: id }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }], include: { previousObjective: true } }),
    prisma.feedbackCycle.findMany({ where: { appraisalId: id }, include: { _count: { select: { responses: true } } } }),
    prisma.appraiserComment.findMany({ where: { appraisalId: id }, include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } }),
  ]);

  const attachments = await prisma.attachment.findMany({
    where: { appraisalId: id },
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title={`Review: ${appraisal.doctor.name}`}
        subtitle={`GMC ${appraisal.doctor.gmcNumber ?? "—"} · ${appraisal.year}/${String(appraisal.year + 1).slice(2)} · designated body: ${appraisal.doctor.designatedBody ?? "—"}`}
        action={<StatusBadge status={appraisal.status} />}
      />

      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <a href={`/api/appraisals/${id}/export`} className="btn-secondary">
          Download MAG PDF
        </a>
      </div>

      <ReviewWorkspace
        appraisalId={appraisal.id}
        status={appraisal.status}
        doctorName={appraisal.doctor.name}
        doctorId={appraisal.doctorId}
        sections={appraisal.sections.map((s) => ({ sectionKey: s.sectionKey, data: s.data }))}
        cpd={cpd}
        qi={qi}
        events={events}
        pdp={pdp}
        cycles={cycles.map((c) => ({ id: c.id, cycleType: c.cycleType, status: c.status, minResponses: c.minResponses, responseCount: c._count.responses }))}
        attachments={attachments}
        initialComments={comments}
        currentUserId={user.id}
        signedOffAt={appraisal.signedOffAt}
        meetingDate={appraisal.appraisalMeetingDate}
      />

      <div className="mt-6">
        <Card title="Supporting documents">
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-400">No supporting documents attached by the doctor.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{a.filename}</span>
                  <a href={`/api/appraisal/attachments/${a.id}/download`} className="chip-secondary">Download</a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
