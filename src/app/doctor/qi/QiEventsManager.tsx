"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Qi = { id: string; date: Date; title: string; entryType: string; description: string; outcome: string | null };
type Ev = { id: string; date: Date; title: string; eventType: string; description: string; reflection: string | null; outcome: string | null };

const inputCls = "field";
const TYPE_LABELS: Record<string, string> = {
  AUDIT: "Audit", QI_PROJECT: "QI project", TEACHING_FEEDBACK: "Teaching with feedback", CBD: "Case-based discussion", REFLECTION: "Formal reflection", OTHER: "Other",
  SIGNIFICANT_EVENT: "Significant event", COMPLAINT: "Complaint", COMPLIMENT: "Compliment",
};

export default function QiEventsManager({ qi, events, locked }: { qi: Qi[]; events: Ev[]; locked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qiForm, setQiForm] = useState({ date: "", title: "", entryType: "AUDIT", description: "", outcome: "" });
  const [evForm, setEvForm] = useState({ date: "", title: "", eventType: "SIGNIFICANT_EVENT", description: "", reflection: "", outcome: "" });
  const [showEvForm, setShowEvForm] = useState(false);

  async function addQi(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/qi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...qiForm, outcome: qiForm.outcome || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not add entry");
      return;
    }
    setQiForm({ date: "", title: "", entryType: qiForm.entryType, description: "", outcome: "" });
    router.refresh();
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...evForm, reflection: evForm.reflection || undefined, outcome: evForm.outcome || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not add event");
      return;
    }
    setEvForm({ date: "", title: "", eventType: evForm.eventType, description: "", reflection: "", outcome: "" });
    setShowEvForm(false);
    router.refresh();
  }

  async function remove(kind: "qi" | "events", id: string) {
    setBusy(true);
    await fetch(`/api/${kind}/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Quality improvement activity</h2>
        {!locked && (
          <form onSubmit={addQi} className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Date</span><input required type="date" className={inputCls} value={qiForm.date} onChange={(e) => setQiForm({ ...qiForm, date: e.target.value })} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Type</span>
              <select className={inputCls} value={qiForm.entryType} onChange={(e) => setQiForm({ ...qiForm, entryType: e.target.value })}>
                {["AUDIT", "QI_PROJECT", "TEACHING_FEEDBACK", "CBD", "REFLECTION", "OTHER"].map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Title</span><input required className={inputCls} value={qiForm.title} onChange={(e) => setQiForm({ ...qiForm, title: e.target.value })} /></label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Description (what you did and your role)</span><textarea required rows={3} className={inputCls} value={qiForm.description} onChange={(e) => setQiForm({ ...qiForm, description: e.target.value })} /></label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Outcome / changes made</span><textarea rows={2} className={inputCls} value={qiForm.outcome} onChange={(e) => setQiForm({ ...qiForm, outcome: e.target.value })} /></label>
            <div className="sm:col-span-2"><button type="submit" disabled={busy} className="btn-primary">{busy ? "Adding…" : "Add activity"}</button></div>
          </form>
        )}
        {qi.length === 0 ? <p className="text-sm text-slate-400">No QI activity recorded.</p> : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {qi.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{e.title} <span className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">{TYPE_LABELS[e.entryType] ?? e.entryType}</span></div>
                  <div className="text-xs text-slate-400">{new Date(e.date).toLocaleDateString("en-GB")}</div>
                  <p className="mt-1 text-sm text-slate-600">{e.description}</p>
                  {e.outcome && <p className="mt-0.5 text-sm text-slate-500"><span className="font-medium">Outcome:</span> {e.outcome}</p>}
                </div>
                {!locked && <button onClick={() => remove("qi", e.id)} disabled={busy} className="chip-danger">Delete</button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Significant events & complaints</h2>
          {!locked && (
            <button onClick={() => setShowEvForm((v) => !v)} className="chip-teal-outline">
              {showEvForm ? "Cancel" : "+ Declare an event or complaint"}
            </button>
          )}
        </div>
        {showEvForm && !locked && (
          <form onSubmit={addEvent} className="mb-4 grid gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:grid-cols-2">
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Date</span><input required type="date" className={inputCls} value={evForm.date} onChange={(e) => setEvForm({ ...evForm, date: e.target.value })} /></label>
            <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Type</span>
              <select className={inputCls} value={evForm.eventType} onChange={(e) => setEvForm({ ...evForm, eventType: e.target.value })}>
                <option value="SIGNIFICANT_EVENT">Significant event</option>
                <option value="COMPLAINT">Complaint</option>
                <option value="COMPLIMENT">Compliment</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Title</span><input required className={inputCls} value={evForm.title} onChange={(e) => setEvForm({ ...evForm, title: e.target.value })} /></label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">What happened (you were personally involved and formally notified)</span><textarea required rows={3} className={inputCls} value={evForm.description} onChange={(e) => setEvForm({ ...evForm, description: e.target.value })} /></label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Reflection — what did you learn?</span><textarea rows={3} className={inputCls} value={evForm.reflection} onChange={(e) => setEvForm({ ...evForm, reflection: e.target.value })} /></label>
            <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Outcome / actions taken</span><textarea rows={2} className={inputCls} value={evForm.outcome} onChange={(e) => setEvForm({ ...evForm, outcome: e.target.value })} /></label>
            <div className="sm:col-span-2"><button type="submit" disabled={busy} className="btn-primary">Save declaration</button></div>
          </form>
        )}
        {events.length === 0 ? <p className="text-sm text-slate-400">Nothing declared. (Only events you were personally involved in and formally notified about need to be declared.)</p> : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{e.title} <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${e.eventType === "COMPLAINT" ? "bg-red-100 text-red-800" : e.eventType === "COMPLIMENT" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{TYPE_LABELS[e.eventType] ?? e.eventType}</span></div>
                  <div className="text-xs text-slate-400">{new Date(e.date).toLocaleDateString("en-GB")}</div>
                  <p className="mt-1 text-sm text-slate-600">{e.description}</p>
                  {e.reflection && <p className="mt-0.5 text-sm text-slate-500"><span className="font-medium">Reflection:</span> {e.reflection}</p>}
                  {e.outcome && <p className="mt-0.5 text-sm text-slate-500"><span className="font-medium">Outcome:</span> {e.outcome}</p>}
                </div>
                {!locked && <button onClick={() => remove("events", e.id)} disabled={busy} className="chip-danger">Delete</button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
