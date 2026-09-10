import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, StatusBadge, EmptyState } from "@/components/ui";
import DownloadReportButton from "@/components/DownloadReportButton";

const QUICK_ACTIONS = [
  { href: "/doctor/appraisal", label: "MAG form", desc: "Sections & declarations" },
  { href: "/doctor/cpd", label: "Log CPD", desc: "Learning & reflections" },
  { href: "/doctor/feedback", label: "360 feedback", desc: "Colleagues & patients" },
  { href: "/doctor/pdp", label: "PDP", desc: "Review & plan" },
  { href: "/doctor/timeline", label: "Timeline", desc: "Multi-year comparison" },
  { href: "/doctor/schedule", label: "Schedule", desc: "Appraisal meeting" },
];

export default async function DoctorDashboard() {
  const user = await getSessionUser();
  if (!user || user.role !== "DOCTOR") redirect("/login");

  const year = new Date().getFullYear();
  const appraisal = await prisma.appraisal.findUnique({
    where: { doctorId_year: { doctorId: user.id, year } },
    include: { appraiser: true, cpdEntries: true, pdpObjectives: true, feedbackCycles: true },
  });

  const cpdPoints = appraisal?.cpdEntries.reduce((sum, e) => sum + e.points, 0) ?? 0;
  const openCycles = appraisal?.feedbackCycles.filter((c) => c.status === "OPEN").length ?? 0;
  // Missing-evidence banner
  const full = appraisal ? await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } }, include: { sections: true, cpdEntries: true, qiEntries: true, significantEvents: true, feedbackCycles: true } }) : null;
  const missing: string[] = [];
  if (full) {
    const hasScope = (() => { try { const raw = full.sections.find((s) => s.sectionKey === "scope_of_work")?.data ?? "{}"; const v = JSON.parse(raw) as { roles?: unknown[] }; return Boolean(v.roles?.length); } catch { return false; } })();
    if (!hasScope) missing.push("Scope of work");
    if (full.cpdEntries.length === 0) missing.push("CPD");
    if (full.qiEntries.length === 0) missing.push("QI activity");
    if (!full.sections.find((s) => s.sectionKey === "probity")?.data.includes("true")) missing.push("Probity declaration");
    if (!full.sections.find((s) => s.sectionKey === "health")?.data.includes("true")) missing.push("Health declaration");
    if (full.feedbackCycles.length === 0) missing.push("360° feedback");
  }

  return (
    <div>
      {/* Welcome banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white sm:px-8">
        <div className="dot-grid absolute inset-0 opacity-[0.12]" />
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-teal-500/25 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">
            Appraisal year {year}/{String(year + 1).slice(2)}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user.name.replace(/^Dr\s+/i, "Dr ")}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-slate-300">
            {appraisal?.appraiser
              ? `Your appraiser is ${appraisal.appraiser.name}. `
              : "No appraiser assigned yet — an administrator will assign one. "}
            {user.designatedBody ? `Designated body: ${user.designatedBody}.` : ""}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/doctor/appraisal" className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-teal-50">
              Open MAG form
            </Link>
            <Link href="/doctor/cpd" className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10">
              Log CPD
            </Link>
            {appraisal && (
              <DownloadReportButton
                appraisalId={appraisal.id}
                filename={`appraisal-${appraisal.year}-${(user.gmcNumber ?? user.id).replace(/\W/g, "")}.pdf`}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10 disabled:opacity-60"
              />
            )}
          </div>
        </div>
      </div>

      {!appraisal ? (
        <EmptyState
          message="No appraisal exists yet for this year — an administrator will create one, or you can start it now."
          ctaHref="/doctor/appraisal"
          ctaLabel="Start my appraisal"
        />
      ) : (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Appraisal status</div>
              <div className="mt-2.5"><StatusBadge status={appraisal.status} /></div>
              <div className="mt-1 text-xs text-slate-400">{appraisal.appraiser ? appraisal.appraiser.name : "No appraiser yet"}</div>
            </div>
            <div className="card px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">CPD points logged</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900">{cpdPoints}</span>
                <span className="text-xs font-medium text-slate-400">/ ~50 target</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all" style={{ width: `${Math.min(100, (cpdPoints / 50) * 100)}%` }} />
              </div>
            </div>
            <div className="card px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">PDP objectives</div>
              <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{appraisal.pdpObjectives.length}</div>
              <div className="mt-1 text-xs text-slate-400">Proposed + agreed</div>
            </div>
            <div className="card px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Open 360 cycles</div>
              <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{openCycles}</div>
              <div className="mt-1 text-xs text-slate-400">Colleague & patient feedback</div>
            </div>
          </div>

      {appraisal?.status === "DRAFT" && missing.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3"><p className="text-sm font-semibold text-amber-900">Missing evidence — complete before submission</p><p className="mt-1 text-xs text-amber-800">{missing.join(" · ")}</p></div>
      )}

          {/* Quick actions */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="card group flex items-center justify-between px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800 group-hover:text-teal-800">{a.label}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{a.desc}</div>
                </div>
                <span className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600">→</span>
              </Link>
            ))}
          </div>

          {/* Guidance */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card title="Appraisal progress">
              <ul className="space-y-2.5 text-sm text-slate-600">
                {[
                  "Complete each MAG section — entries save automatically.",
                  "Log CPD, QI and significant events under Supporting information.",
                  "Review last year's PDP and draft this year's objectives.",
                  "Submit when ready — your appraiser is notified and takes over review.",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Revalidation">
              <p className="text-sm leading-relaxed text-slate-600">
                A positive RO recommendation follows a signed-off appraisal. Your whole scope of work must be
                covered across the 5-year cycle, with formal feedback at least once.
              </p>
              <div className="mt-4 rounded-lg bg-teal-50 px-3.5 py-2.5 text-xs leading-relaxed text-teal-800">
                After sign-off, your agreed PDP seeds next year&apos;s appraisal automatically — nothing to carry over by hand.
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
