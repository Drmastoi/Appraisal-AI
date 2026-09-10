import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import AssignmentsManager from "./AssignmentsManager";

export default async function AdminAssignmentsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [doctors, appraisers, assignments] = await Promise.all([
    prisma.user.findMany({ where: { role: "DOCTOR", approved: true }, orderBy: { name: "asc" }, select: { id: true, name: true, gmcNumber: true } }),
    prisma.user.findMany({ where: { role: "APPRAISER", approved: true }, orderBy: { name: "asc" }, select: { id: true, name: true, gmcNumber: true } }),
    prisma.assignment.findMany({
      where: { active: true },
      include: { doctor: { select: { name: true, gmcNumber: true } }, appraiser: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Appraiser assignments" subtitle="Each doctor has one active appraiser; reassigning retires the previous pairing" />
      <div className="mb-6">
        <Card title="Current assignments">
          {assignments.length === 0 ? (
            <p className="text-sm text-slate-400">No active assignments yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-700">
                    <span className="font-medium">{a.doctor.name}</span> <span className="text-slate-400">GMC {a.doctor.gmcNumber ?? "—"}</span>
                    <span className="mx-2 text-slate-300">→</span>
                    <span className="font-medium">{a.appraiser.name}</span>
                  </span>
                  <span className="text-xs text-slate-400">since {a.createdAt.toLocaleDateString("en-GB")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <AssignmentsManager doctors={doctors} appraisers={appraisers} />
    </div>
  );
}
