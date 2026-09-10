import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Stat } from "@/components/ui";
import CpdManager from "./CpdManager";

export default async function DoctorCpdPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "DOCTOR") redirect("/login");

  const year = new Date().getFullYear();
  const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
  const entries = appraisal
    ? await prisma.cPDEntry.findMany({ where: { appraisalId: appraisal.id }, orderBy: { date: "desc" } })
    : [];
  const totals = {
    internal: entries.filter((e) => e.activityType === "INTERNAL").reduce((s, e) => s + e.points, 0),
    external: entries.filter((e) => e.activityType === "EXTERNAL").reduce((s, e) => s + e.points, 0),
    all: entries.reduce((s, e) => s + e.points, 0),
  };

  return (
    <div>
      <PageHeader title="Continuing professional development" subtitle={`Appraisal year ${year}/${String(year + 1).slice(2)} — log learning across your whole scope of work`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total points" value={totals.all} hint="RCGP guidance: a reflected sample, ~50 commonly cited" />
        <Stat label="Internal" value={totals.internal} hint="In-practice learning, MDTs, teaching" />
        <Stat label="External" value={totals.external} hint="Courses, conferences, webinars" />
      </div>
      <div className="mt-6">
        <Card title="CPD log">
          <CpdManager entries={entries} locked={appraisal ? appraisal.status !== "DRAFT" : true} />
        </Card>
      </div>
    </div>
  );
}
