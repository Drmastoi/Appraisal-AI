import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import QiEventsManager from "./QiEventsManager";

export default async function DoctorQiPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "DOCTOR") redirect("/login");

  const year = new Date().getFullYear();
  const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
  const [qi, events] = appraisal
    ? await Promise.all([
        prisma.qIEntry.findMany({ where: { appraisalId: appraisal.id }, orderBy: { date: "desc" } }),
        prisma.significantEvent.findMany({ where: { appraisalId: appraisal.id }, orderBy: { date: "desc" } }),
      ])
    : [[], []];

  return (
    <div>
      <PageHeader title="Quality improvement, events & complaints" subtitle="Audit, QI projects, teaching, case-based discussions — plus significant events and complaints with reflection" />
      <QiEventsManager qi={qi} events={events} locked={appraisal ? appraisal.status !== "DRAFT" : true} />
      <div className="mt-4">
        <Card title="What counts as quality improvement activity?">
          <p className="text-sm text-slate-600">
            Include one or more of: an audit (what you audited, findings, changes made), a QI project, teaching with feedback,
            2–3 case-based discussions on a CBD proforma, or formal written reflections. Quality and impact matter more than volume.
          </p>
        </Card>
      </div>
    </div>
  );
}
