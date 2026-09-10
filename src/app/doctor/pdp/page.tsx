import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import PdpManager from "./PdpManager";

export default async function DoctorPdpPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "DOCTOR") redirect("/login");

  const year = new Date().getFullYear();
  const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
  const objectives = appraisal
    ? await prisma.pDPObjective.findMany({
        where: { appraisalId: appraisal.id },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        include: { previousObjective: true },
      })
    : [];
  const previous = await prisma.appraisal.findUnique({
    where: { doctorId_year: { doctorId: user.id, year: year - 1 } },
    include: { pdpObjectives: true },
  });
  const previousYearObjectives = previous?.pdpObjectives ?? [];
  const carriedIds = new Set(objectives.map((o) => o.previousObjectiveId).filter(Boolean));
  const availableToCarry = previousYearObjectives.filter((o) => !carriedIds.has(o.id));

  return (
    <div>
      <PageHeader title="Personal development plan" subtitle={`Review last year's objectives and draft the PDP for ${year}/${String(year + 1).slice(2)} — agreed at appraisal and carried forward automatically`} />
      <Card title="How the PDP works year to year">
        <p className="text-sm text-slate-600">
          At appraisal you review each previous objective (achieved — how; not achieved — why). Objectives not completed can be
          carried forward into this year&apos;s PDP. After sign-off, the agreed PDP automatically seeds next year&apos;s appraisal.
        </p>
      </Card>
      <div className="mt-6">
        <PdpManager objectives={objectives} availableToCarry={availableToCarry} locked={appraisal ? appraisal.status !== "DRAFT" : true} />
      </div>
    </div>
  );
}
