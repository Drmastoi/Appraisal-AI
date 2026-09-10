import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, StatusBadge } from "@/components/ui";
import RecommendForm from "./RecommendForm";
import Link from "next/link";

export default async function AdminCompliancePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const year = new Date().getFullYear();
  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR", approved: true },
    include: {
      appraisals: { where: { year }, include: { appraiser: true, _count: { select: { comments: true } } } },
      roRecommendations: { where: { appraisalYear: year } },
    },
    orderBy: { name: "asc" },
  });

  const detailed = await prisma.appraisal.findMany({
    where: { year },
    include: { sections: true, cpdEntries: true, qiEntries: true, significantEvents: true, feedbackCycles: true },
  });
  const byDoctor = new Map(detailed.map((a) => [a.doctorId, a]));

  const rows = doctors.map((d) => {
    const appraisal = d.appraisals[0];
    const detail = appraisal ? byDoctor.get(appraisal.id) ?? null : null;
    // Missing-evidence: mirror validateForSubmission + counts
    let missing: string[] = [];
    if (detail) {
      const hasScope = (() => { try { const raw = detail.sections.find((s) => s.sectionKey === "scope_of_work")?.data ?? "{}"; const v = JSON.parse(raw) as { roles?: unknown[] }; return Boolean(v.roles?.length); } catch { return false; } })();
      if (!hasScope) missing.push("Scope of work");
      if (detail.cpdEntries.length === 0) missing.push("CPD");
      if (detail.qiEntries.length === 0) missing.push("QI");
      if (!detail.sections.find((s) => s.sectionKey === "probity")?.data.includes("true")) missing.push("Probity");
      if (!detail.sections.find((s) => s.sectionKey === "health")?.data.includes("true")) missing.push("Health");
      if (detail.feedbackCycles.length === 0) missing.push("Feedback");
    } else if (appraisal === undefined) {
      // no appraisal row at all
      missing = ["No appraisal"];
    }
    // Revalidation countdown — server component is not a React render purity boundary; suppress false positive.
    const due = d.revalidationDueDate ? new Date(d.revalidationDueDate) : null;
    // eslint-disable-next-line react-hooks/purity
    const daysLeft = due ? Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    let revalTone: "green" | "amber" | "red" | "none" = "none";
    if (daysLeft !== null) {
      if (daysLeft < 0) revalTone = "red";
      else if (daysLeft <= 30) revalTone = "red";
      else if (daysLeft <= 90) revalTone = "amber";
      else revalTone = "green";
    }
    return { doctor: d, appraisal, recommendation: d.roRecommendations[0] ?? null, missing, daysLeft, revalTone, due };
  });

  const counts = {
    signedOff: rows.filter((r) => r.appraisal?.status === "SIGNED_OFF").length,
    inProgress: rows.filter((r) => r.appraisal && r.appraisal.status !== "SIGNED_OFF").length,
    none: rows.filter((r) => !r.appraisal).length,
  };

  return (
    <div>
      <PageHeader title={`Compliance ${year}/${String(year + 1).slice(2)}`} subtitle="Appraisal completion and revalidation recommendations across the designated body" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card title="Signed off"><p className="text-2xl font-bold text-green-700">{counts.signedOff}</p></Card>
        <Card title="In progress"><p className="text-2xl font-bold text-amber-600">{counts.inProgress}</p></Card>
        <Card title="No appraisal yet"><p className="text-2xl font-bold text-red-600">{counts.none}</p></Card>
      </div>

      <Card title="Doctors">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Doctor</th>
                <th className="px-3 py-2">Appraiser</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Revalidation</th>
                <th className="px-3 py-2">Missing evidence</th>
                <th className="px-3 py-2">Recommendation</th>
                <th className="px-3 py-2">Outputs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ doctor, appraisal, recommendation, missing, daysLeft, revalTone, due }) => (
                <tr key={doctor.id}>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800">{doctor.name}</div>
                    <div className="text-xs text-slate-400">GMC {doctor.gmcNumber ?? "—"}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{appraisal?.appraiser?.name ?? "—"}</td>
                  <td className="px-3 py-3">{appraisal ? <StatusBadge status={appraisal.status} /> : <span className="text-xs text-slate-400">none</span>}</td>
                  <td className="px-3 py-3 text-xs">{due ? (<span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${revalTone === "red" ? "bg-red-50 text-red-700 ring-red-200" : revalTone === "amber" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200"}`}>{daysLeft !== null && daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`} · {due.toISOString().slice(0, 10)}</span>) : <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-3 text-xs">{missing.length ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{missing.join(", ")}</span> : <span className="text-slate-400">—</span>}</td>
                  <td className="px-3 py-3">
                    {recommendation ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${recommendation.recommendation === "POSITIVE" ? "bg-green-100 text-green-800" : recommendation.recommendation === "NEGATIVE" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                        {recommendation.recommendation}{recommendation.submittedToGmc ? " · submitted" : ""}
                      </span>
                    ) : (
                      <RecommendForm doctorId={doctor.id} year={year} disabled={!appraisal || appraisal.status !== "SIGNED_OFF"} />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {appraisal?.status === "SIGNED_OFF" ? (
                      <div className="flex gap-2">
                        <a href={`/api/appraisals/${appraisal.id}/export`} className="chip-secondary">MAG PDF</a>
                        <a href={`/api/admin/ro-bundle/${appraisal.id}`} className="chip-teal-outline">RO bundle</a>
                      </div>
                    ) : (
                      <Link href={appraisal ? `/admin` : "/admin/users"} className="text-xs text-slate-400">—</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
