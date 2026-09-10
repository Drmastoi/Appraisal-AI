import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, StatusBadge } from "@/components/ui";
import { parseSectionData } from "@/lib/sections";
import Link from "next/link";

export default async function TimelinePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "DOCTOR") redirect("/login");
  const appraisals = await prisma.appraisal.findMany({
    where: { doctorId: user.id },
    include: { appraiser: true, cpdEntries: true, pdpObjectives: true, feedbackCycles: { include: { responses: true } }, sections: true },
    orderBy: { year: "desc" },
    take: 5,
  });
  return (
    <div>
      <PageHeader title="Portfolio timeline" subtitle="Multi-year view — CPD, PDP, and feedback year-on-year. The last 5 appraisal years are shown." />
      {appraisals.length === 0 ? (
        <Card title="No appraisals yet">
          <p className="text-sm text-slate-500">Start your first appraisal to build the timeline.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {appraisals.map((a) => {
            const cpdPoints = a.cpdEntries.reduce((s, e) => s + e.points, 0);
            const pdpCount = a.pdpObjectives.length;
            const feedbackCount = a.feedbackCycles.flatMap((c) => c.responses).length;
            const wellbeing = (() => { try { const raw = a.sections.find((s) => s.sectionKey === "wellbeing")?.data ?? "{}"; const v = parseSectionData("wellbeing", raw) as { scale1to10?: number }; return typeof v.scale1to10 === "number" ? v.scale1to10 : null; } catch { return null; } })();
            const gmp = (() => { try { const raw = a.sections.find((s) => s.sectionKey === "appraiser_summary")?.data ?? "{}"; const v = parseSectionData("appraiser_summary", raw) as { gmpDomains?: string[] }; return v.gmpDomains?.length ?? 0; } catch { return 0; } })();
            return (
              <Link key={a.id} href="/doctor/appraisal" className="card block px-5 py-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-slate-800">{a.year}/{String(a.year + 1).slice(2)}</span>
                    <span className="ml-2 text-xs text-slate-500">{a.appraiser?.name ?? "no appraiser"} · {feedbackCount} feedback response(s)</span>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{cpdPoints} CPD pts</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{pdpCount} PDP objective(s)</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{a.cpdEntries.length} CPD entries</span>
                  {wellbeing !== null && <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-700 ring-1 ring-teal-200">Wellbeing {wellbeing}/10</span>}
                  {gmp > 0 && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700 ring-1 ring-violet-200">{gmp} GMP domain(s)</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
