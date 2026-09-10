import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Stat, StatusBadge } from "@/components/ui";
import Link from "next/link";

export default async function AdminDashboard() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const [pending, doctors, appraisers, appraisals, recentAudit] = await Promise.all([
    prisma.user.count({ where: { approved: false, active: true } }),
    prisma.user.count({ where: { role: "DOCTOR" } }),
    prisma.user.count({ where: { role: "APPRAISER" } }),
    prisma.appraisal.findMany({ include: { doctor: true, appraiser: true }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: true } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Administration"
        subtitle="Designated body oversight — accounts, assignments, compliance and audit"
        action={<Link href="/admin/users" className="btn-primary">Manage users</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Pending approvals" value={pending} hint={pending ? "Action required" : "All clear"} />
        <Stat label="Doctors" value={doctors} />
        <Stat label="Appraisers" value={appraisers} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Recent appraisals">
          {appraisals.length === 0 ? (
            <p className="text-sm text-slate-500">No appraisals yet — create one from a doctor&apos;s row on the Users page.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {appraisals.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{a.doctor.name}</span>
                    <span className="text-slate-400"> · {a.year}/{String(a.year + 1).slice(2)} · {a.appraiser?.name ?? "unassigned"}</span>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent audit activity">
          {recentAudit.length === 0 ? (
            <p className="text-sm text-slate-500">No activity logged yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentAudit.map((e) => (
                <li key={e.id} className="py-2.5 text-sm">
                  <span className="font-medium text-slate-800">{e.action}</span>{" "}
                  <span className="text-slate-500">
                    {e.entityType} · {e.actor?.name ?? "system"} · {e.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
