"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AiReflectButton from "@/app/doctor/cpd/AiReflectButton";
import ReflectGenerator from "@/app/doctor/cpd/ReflectGenerator";

type Entry = {
  id: string; date: Date; title: string; activityType: string; category: string | null;
  provider: string | null; points: number; reflection: string | null; learningNeeds: string | null;
  impactOnPractice: string | null; aiAssisted: boolean;
};

const inputCls = "field";

export default function CpdManager({ entries, locked }: { entries: Entry[]; locked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ date: "", title: "", activityType: "EXTERNAL", category: "", provider: "", points: "1", reflection: "", learningNeeds: "", impactOnPractice: "" });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/cpd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date, title: form.title, activityType: form.activityType,
        category: form.category || undefined, provider: form.provider || undefined,
        points: Number(form.points), reflection: form.reflection || undefined,
        learningNeeds: form.learningNeeds || undefined, impactOnPractice: form.impactOnPractice || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not add entry");
      return;
    }
    setForm({ date: "", title: "", activityType: form.activityType, category: "", provider: "", points: "1", reflection: "", learningNeeds: "", impactOnPractice: "" });
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/cpd/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!locked && (
        <form onSubmit={add} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Date</span><input required type="date" className={inputCls} value={form.date} onChange={(e) => set("date", e.target.value)} /></label>
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Type</span>
            <select className={inputCls} value={form.activityType} onChange={(e) => set("activityType", e.target.value)}>
              <option value="EXTERNAL">External</option>
              <option value="INTERNAL">Internal</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Title</span><input required minLength={2} className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Red Whale update course — cardiology day" /></label>
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Category</span><input className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="course, conference, e-learning…" /></label>
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Points</span><input required type="number" min={0} max={100} className={inputCls} value={form.points} onChange={(e) => set("points", e.target.value)} /></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1 block font-medium text-slate-700">Reflection — what did you learn?</span><textarea rows={2} className={inputCls} value={form.reflection} onChange={(e) => set("reflection", e.target.value)} /></label>
          <div className="sm:col-span-2 -mt-2 flex flex-wrap items-start gap-2">
            <AiReflectButton title={form.title} category={form.category} onDraft={(text) => set("reflection", text)} />
          </div>
          <div className="sm:col-span-2">
            <ReflectGenerator title={form.title} onInsert={(t) => set("reflection", t)} />
          </div>
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Learning needs identified (optional)</span><textarea rows={2} className={inputCls} value={form.learningNeeds} onChange={(e) => set("learningNeeds", e.target.value)} /></label>
          <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Impact on practice (optional)</span><textarea rows={2} className={inputCls} value={form.impactOnPractice} onChange={(e) => set("impactOnPractice", e.target.value)} /></label>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</div>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className="btn-primary">{busy ? "Adding…" : "Add CPD entry"}</button>
          </div>
        </form>
      )}
      {locked && <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">The appraisal is submitted — CPD is read-only until next year&apos;s appraisal opens.</p>}

      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">No CPD logged yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {entries.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {e.title} <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${e.activityType === "INTERNAL" ? "bg-sky-100 text-sky-800" : "bg-violet-100 text-violet-800"}`}>{e.activityType}</span>
                    {e.aiAssisted && <span className="ml-1 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">AI-DRAFTED</span>}
                  </div>
                  <div className="text-xs text-slate-400">{new Date(e.date).toLocaleDateString("en-GB")} · {e.points} point(s){e.category ? ` · ${e.category}` : ""}{e.provider ? ` · ${e.provider}` : ""}</div>
                  {e.reflection && <p className="mt-1 text-sm text-slate-600"><span className="font-medium">Reflection:</span> {e.reflection}</p>}
                  {e.impactOnPractice && <p className="mt-0.5 text-sm text-slate-500"><span className="font-medium">Impact:</span> {e.impactOnPractice}</p>}
                </div>
                {!locked && (
                  <button onClick={() => remove(e.id)} disabled={busy} className="chip-danger">Delete</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
