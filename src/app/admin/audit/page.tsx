import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";

export default async function AdminAuditPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const logs = await prisma.auditLog.findMany({
    include: { actor: { select: { name: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <PageHeader title="Audit log" subtitle="Append-only record of every significant action (latest 200)" />
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{l.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  <td className="px-3 py-2 text-slate-700">{l.actor?.name ?? "system"} <span className="text-xs text-slate-400">{l.actorRole ?? ""}</span></td>
                  <td className="px-3 py-2 font-medium text-slate-800">{l.action}</td>
                  <td className="px-3 py-2 text-slate-600">{l.entityType}{l.entityId ? <span className="text-xs text-slate-400"> · {l.entityId.slice(-8)}</span> : null}</td>
                  <td className="max-w-md truncate px-3 py-2 text-xs text-slate-500">{l.meta ?? ""}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No audit entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
