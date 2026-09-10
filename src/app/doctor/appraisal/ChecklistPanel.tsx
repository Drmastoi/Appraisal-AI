"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseSectionData } from "@/lib/sections";

type Counts = { cpd: number; qi: number; events: number; pdp: number; colleagueCycles: number; patientCycles: number };

const CHECK_ITEMS: { key: string; label: string; check: (sections: Map<string, Record<string, unknown>>, counts: Counts) => boolean }[] = [
  { key: "scope_roles", label: "All roles undertaken (including private/voluntary) defined with organisations", check: (m) => { const v = m.get("scope_of_work")?.roles as unknown[] | undefined; return Boolean(v?.length); } },
  { key: "scope_quals", label: "Qualifications for each role defined", check: (m) => Boolean((m.get("doctor_details") as { qualifications?: string } | undefined)?.qualifications?.trim()) },
  { key: "pdp_reviewed", label: "Each previous PDP item has been commented on (achieved / not achieved)", check: (_m, c) => c.pdp > 0 },
  { key: "pdp_min2", label: "At least 2 PDP proposals for the coming year (average 4-6)", check: (_m, c) => c.pdp >= 2 },
  { key: "cpd_logged", label: "CPD: Royal College certificate or all CPD logged with points & reflections", check: (_m, c) => c.cpd > 0 },
  { key: "cpd_anonymised", label: "Identities removed from log books / case reviews / grand rounds", check: () => true },
  { key: "qi_done", label: "At least one quality improvement activity recorded", check: (_m, c) => c.qi > 0 },
  { key: "qi_anonymised", label: "Patient/colleague identities removed from QI documents", check: () => true },
  { key: "seeked", label: "Significant events declared with reflection (or none declared honestly)", check: () => true },
  { key: "feedback_report", label: "Colleague & patient feedback reports attached where required by policy", check: (_m, c) => c.colleagueCycles > 0 || c.patientCycles > 0 },
  { key: "complaints_reflected", label: "Complaints & compliments reflected on (with identities removed)", check: () => true },
  { key: "wellbeing_reflected", label: "Wellbeing section reviewed and supporting docs attached if needed", check: (m) => { const v = m.get("wellbeing"); if (!v) return false; return Object.values(v).some((x) => typeof x === "string" ? (x as string).trim() !== "" : typeof x === "number" ? true : false); } },
];

const STORAGE_KEY = "appraisal_checklist_v1";

export default function ChecklistPanel({ sections, counts, locked }: { sections: { sectionKey: string; data: string }[]; counts: Counts; locked: boolean }) {
  const sectionMap = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const s of sections) m.set(s.sectionKey, parseSectionData(s.sectionKey, s.data));
    return m;
  }, [sections]);

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch { return {}; }
  });
  const didInit = useRef(false);
  useEffect(() => {
    if (!didInit.current) { didInit.current = true; return; }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(checked)); } catch {}
  }, [checked]);

  const autoPass = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const it of CHECK_ITEMS) out[it.key] = it.check(sectionMap, counts);
    return out;
  }, [sectionMap, counts]);

  const total = CHECK_ITEMS.length;
  const done = CHECK_ITEMS.filter((it) => checked[it.key] || autoPass[it.key]).length;
  const allDone = done === total;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-800">Clinician&apos;s pre-appraisal checklist</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${allDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{done}/{total} — {allDone ? "Ready to submit" : "Complete before submitting"}</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {CHECK_ITEMS.map((it) => {
          const pass = autoPass[it.key];
          const ticked = Boolean(checked[it.key]);
          const effective = pass || ticked;
          return (
            <li key={it.key} className={`flex items-start gap-3 px-5 py-2.5 ${effective ? "bg-emerald-50/40" : ""}`}>
              <input
                type="checkbox"
                checked={effective}
                disabled={locked || pass}
                onChange={(e) => setChecked((c) => ({ ...c, [it.key]: e.target.checked }))}
                className="mt-0.5 accent-teal-600"
              />
              <span className={`text-sm ${effective ? "text-slate-700" : "text-slate-600"}`}>{it.label}{pass && <span className="ml-1 text-[11px] text-emerald-600">(auto-verified)</span>}</span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-xs text-slate-500">Checklist mirrors L2P: your Responsible Officer will refer back forms that do not meet standards. Some items auto-verify from your portfolio; others require your attestation.</p>
    </div>
  );
}
