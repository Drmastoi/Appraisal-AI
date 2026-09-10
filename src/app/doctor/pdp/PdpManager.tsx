"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AiSuggestButton from "@/app/doctor/pdp/AiSuggestButton";

type Objective = {
  id: string; source: string; title: string; description: string | null; status: string;
  progressNote: string | null; priority: number; previousObjectiveId: string | null;
  smartSpecific: string | null; smartMeasurable: string | null; smartAchievable: string | null;
  smartRelevant: string | null; smartTimeBound: string | null; deadline: Date | string | null;
  previousObjective?: { title: string } | null;
};

const STATUS_FLOW: Record<string, string[]> = {
  PROPOSED: ["AGREED"],
  AGREED: ["ACHIEVED", "NOT_ACHIEVED"],
  ACHIEVED: [],
  NOT_ACHIEVED: [],
  CARRIED_FORWARD: [],
};

const inputCls = "field";

export default function PdpManager({
  objectives,
  availableToCarry,
  locked,
}: {
  objectives: Objective[];
  availableToCarry: { id: string; title: string; description: string | null; status: string }[];
  locked: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "0" });
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Action failed");
      return false;
    }
    router.refresh();
    return true;
  }

  const [smart, setSmart] = useState({ specific: "", measurable: "", achievable: "", relevant: "", timeBound: "", deadline: "" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call("/api/pdp", "POST", {
      title: form.title, description: form.description || undefined, priority: Number(form.priority),
      smartSpecific: smart.specific || undefined, smartMeasurable: smart.measurable || undefined, smartAchievable: smart.achievable || undefined,
      smartRelevant: smart.relevant || undefined, smartTimeBound: smart.timeBound || undefined,
      deadline: smart.deadline || undefined,
    });
    if (ok) { setForm({ title: "", description: "", priority: "0" }); setSmart({ specific: "", measurable: "", achievable: "", relevant: "", timeBound: "", deadline: "" }); }
  }

  async function setStatus(id: string, status: string) {
    await call(`/api/pdp/${id}`, "PATCH", { status, ...(notes[id] ? { progressNote: notes[id] } : {}) });
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {availableToCarry.length > 0 && !locked && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <h3 className="text-sm font-semibold text-amber-900">Carry forward from last year ({availableToCarry.length})</h3>
          <p className="mt-1 text-xs text-amber-800">Objectives from your previous PDP not yet completed. Carry them into this year&apos;s plan.</p>
          <ul className="mt-3 space-y-2">
            {availableToCarry.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-800">{o.title}</div>
                  <div className="text-xs text-slate-400">status: {o.status.replace(/_/g, " ").toLowerCase()}</div>
                </div>
                <button onClick={() => call("/api/pdp", "POST", { title: o.title, carryForwardFrom: o.id })} disabled={busy} className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
                  Carry forward →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">This year&apos;s PDP</h3>
          {!locked && <AiSuggestButton />}
        </div>
        {!locked && (
          <form onSubmit={add} className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-3">
            <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Objective</span><input required minLength={2} className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Complete minor surgery update and log 10 procedures" /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Priority (0–9)</span><input type="number" min={0} max={9} className={inputCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></label>
            <label className="text-sm sm:col-span-3"><span className="mb-1 block font-medium text-slate-700">Description / how you&apos;ll know it&apos;s achieved (optional)</span><textarea rows={2} className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <details className="sm:col-span-3 rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-teal-800">SMART breakdown (optional — recommended for MAG)</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Specific</span><input className={inputCls} value={smart.specific} onChange={(e) => setSmart({ ...smart, specific: e.target.value })} placeholder="Exactly what will you do?" /></label>
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Measurable</span><input className={inputCls} value={smart.measurable} onChange={(e) => setSmart({ ...smart, measurable: e.target.value })} placeholder="How will you measure it?" /></label>
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Achievable</span><input className={inputCls} value={smart.achievable} onChange={(e) => setSmart({ ...smart, achievable: e.target.value })} placeholder="Resources / support needed?" /></label>
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Relevant</span><input className={inputCls} value={smart.relevant} onChange={(e) => setSmart({ ...smart, relevant: e.target.value })} placeholder="Why this matters to your scope." /></label>
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Time-bound</span><input className={inputCls} value={smart.timeBound} onChange={(e) => setSmart({ ...smart, timeBound: e.target.value })} placeholder="e.g. Within 6 months / by Q4" /></label>
                <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Deadline</span><input type="date" className={inputCls} value={smart.deadline} onChange={(e) => setSmart({ ...smart, deadline: e.target.value })} /></label>
              </div>
            </details>
            <div className="sm:col-span-3"><button type="submit" disabled={busy} className="btn-primary">{busy ? "Adding…" : "Add objective"}</button></div>
          </form>
        )}

        {objectives.length === 0 ? (
          <p className="text-sm text-slate-400">No objectives yet — add one, or carry one forward from last year.</p>
        ) : (
          <ul className="space-y-3">
            {objectives.map((o) => (
              <li key={o.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {o.title}
                      {o.source === "CARRIED_FORWARD" && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">CARRIED FORWARD</span>}
                    </div>
                    {o.description && <p className="mt-0.5 text-sm text-slate-500">{o.description}</p>}
                    {(o.smartSpecific || o.smartMeasurable || o.deadline) && (
                      <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><summary className="cursor-pointer text-xs font-semibold text-slate-600">SMART details</summary>
                        <dl className="mt-2 space-y-1 text-xs text-slate-600">{[["Specific", o.smartSpecific],["Measurable", o.smartMeasurable],["Achievable", o.smartAchievable],["Relevant", o.smartRelevant],["Time-bound", o.smartTimeBound],["Deadline", o.deadline ? new Date(o.deadline).toLocaleDateString("en-GB") : null]].filter(([,v])=>v).map(([k,v])=><div key={k}><dt className="font-semibold">{k}:</dt><dd className="ml-1">{v as string}</dd></div>)}</dl>
                      </details>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${o.status === "ACHIEVED" || o.status === "AGREED" ? "bg-green-100 text-green-800" : o.status === "NOT_ACHIEVED" ? "bg-red-100 text-red-800" : o.status === "CARRIED_FORWARD" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                    {o.status.replace(/_/g, " ")}
                  </span>
                </div>
                {!locked && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    {(STATUS_FLOW[o.status] ?? []).map((next) => (
                      <button key={next} onClick={() => setStatus(o.id, next)} disabled={busy} className="chip-secondary">
                        Mark {next.replace(/_/g, " ").toLowerCase()}
                      </button>
                    ))}
                    <input
                      className="field min-w-0 flex-1 py-1 text-xs"
                      placeholder="How achieved, or why not (included at appraisal)"
                      onChange={(e) => setNotes((n) => ({ ...n, [o.id]: e.target.value }))}
                    />
                    <button onClick={() => setStatus(o.id, o.status)} disabled={busy || !notes[o.id]} className="chip-dark">
                      Save note
                    </button>
                    {o.status === "PROPOSED" && (
                      <button onClick={() => call(`/api/pdp/${o.id}`, "DELETE")} disabled={busy} className="chip-danger">
                        Delete
                      </button>
                    )}
                  </div>
                )}
                {locked && o.progressNote && <p className="mt-2 text-sm text-slate-600"><span className="font-medium">Note:</span> {o.progressNote}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
