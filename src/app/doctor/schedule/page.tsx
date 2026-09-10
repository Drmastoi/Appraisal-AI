import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import SchedulePanel from "./SchedulePanel";

export default async function SchedulePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "DOCTOR") redirect("/login");
  const year = new Date().getFullYear();
  const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
  const meetings = appraisal ? await prisma.appraisalMeeting.findMany({ where: { appraisalId: appraisal.id }, orderBy: { scheduledAt: "asc" } }) : [];
  return (
    <div>
      <PageHeader title={`Appraisal meeting ${year}/${String(year + 1).slice(2)}`} subtitle="Schedule your appraisal discussion. A notification and audit event are created when you save." />
      <Card title="Schedule your meeting"><SchedulePanel meetings={meetings.map((m) => ({ id: m.id, scheduledAt: m.scheduledAt.toISOString(), location: m.location, notes: m.notes }))} /></Card>
      {appraisal?.appraisalMeetingDate && <p className="mt-3 text-xs text-slate-400">Appraisal meeting date on record: {new Date(appraisal.appraisalMeetingDate).toLocaleDateString("en-GB")}</p>}
    </div>
  );
}
