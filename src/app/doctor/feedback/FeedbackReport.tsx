"use client";

import { useEffect, useState } from "react";
import { LIKERT_LABELS } from "@/lib/feedback";

type Report = {
  cycleType: "COLLEAGUE" | "PATIENT";
  status: string;
  totalResponses: number;
  minimum: number;
  thresholdMet: boolean;
  unblinded: boolean;
  overallMean: number | null;
  perQuestion: { questionId: string; text: string; domain: string; mean: number | null; count: number; distribution: number[] }[];
  domains?: { domain: string; mean: number | null; questions: number; responses: number }[];
  previousYear?: { year: number; overallMean: number | null } | null;
  freeText: Record<string, string>[] | null;
};

export default function FeedbackReport({ cycleId }: { cycleId: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/feedback/cycles/${cycleId}/report`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load report");
        return d;
      })
      .then((d) => !cancelled && setReport(d))
      .catch((e) => !cancelled && setError(String(e.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [cycleId]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!report) return <p className="text-sm text-slate-400">Loading report…</p>;

  const progress = Math.min(100, Math.round((report.totalResponses / report.minimum) * 100));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{report.totalResponses}</span> response(s) · minimum {report.minimum} for unblinding
        </div>
        {report.overallMean !== null && <div className="text-sm text-slate-600">Overall mean: <span className="font-semibold text-slate-800">{report.overallMean}</span> / 5</div>}
      </div>

      {!report.thresholdMet && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-teal-600" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{report.unblinded ? "Results visible to your appraiser; free text unblinds at the threshold." : `Collect ${report.minimum - report.totalResponses} more response(s) to unblind your report.`}</p>
        </div>
      )}

      {report.domains && report.domains.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Domain-based scoring</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {report.domains.map((d) => (
              <div key={d.domain} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{d.domain.replace(/_/g, " ")}</div>
                <div className="mt-1 flex items-baseline gap-2"><span className="text-lg font-bold text-slate-800">{d.mean ?? "—"}</span><span className="text-xs text-slate-400">/ 5 · {d.questions} question(s)</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${d.mean ? (d.mean / 5) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.previousYear && report.previousYear.overallMean !== null && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">Previous year ({report.previousYear.year}) overall mean: <span className="font-semibold">{report.previousYear.overallMean}</span> / 5 → this year <span className="font-semibold">{report.overallMean ?? "—"}</span> {report.overallMean !== null && report.previousYear.overallMean !== null ? (report.overallMean >= report.previousYear.overallMean ? "▲" : "▼") : ""}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Question</th>
              <th className="px-3 py-2">Mean</th>
              <th className="px-3 py-2">n</th>
              <th className="px-3 py-2">Distribution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {report.perQuestion.map((q) => (
              <tr key={q.questionId}>
                <td className="px-3 py-2 text-slate-700">{q.text}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{q.mean ?? "—"}</td>
                <td className="px-3 py-2 text-slate-500">{q.count}</td>
                <td className="px-3 py-2">
                  <div className="flex h-4 items-end gap-0.5" title={q.distribution.map((d, i) => `${LIKERT_LABELS[i]}: ${d}`).join(", ")}>
                    {q.distribution.map((d, i) => (
                      <div key={i} className="w-3 rounded-sm bg-teal-600/80" style={{ height: `${Math.max(2, d * 4)}px` }} />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report.freeText && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-800">Written comments (anonymous)</h4>
          {report.freeText.length === 0 ? <p className="text-sm text-slate-400">No written comments.</p> : (
            <ul className="space-y-2">
              {report.freeText.map((ft, idx) =>
                Object.entries(ft).map(([qid, text]) =>
                  text.trim() ? (
                    <li key={`${idx}-${qid}`} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-700">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{qid}</span>
                      <p className="mt-0.5">{text}</p>
                    </li>
                  ) : null
                )
              )}
            </ul>
          )}
        </div>
      )}

      <p className="rounded-xl bg-teal-50 px-3 py-2.5 text-xs leading-relaxed text-teal-800">
        Remember to add a written reflection on your feedback before your appraisal discussion — your appraiser will look for your interpretation, not just the scores.
      </p>
    </div>
  );
}
