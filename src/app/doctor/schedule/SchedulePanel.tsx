"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Meeting = { id: string; scheduledAt: string; location: string | null; notes: string | null };

export default function SchedulePanel({ meetings }: { meetings: Meeting[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ date: "", time: "", location: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date || !form.time) { setError("Date and time required"); return; }
    setBusy(true);
    setError(null);
    const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
    const res = await fetch("/api/appraisal/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduledAt, location: form.location || undefined, notes: form.notes || undefined }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Could not schedule"); return; }
    setForm({ date: "", time: "", location: "", notes: "" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-3">
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Date</span><input required type="date" className="field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Time</span><input required type="time" className="field" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
        <label className="text-sm"><span className="mb-1 block font-medium text-slate-700">Location / channel</span><input className="field" placeholder="e.g. Room 2B or MS Teams" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <label className="text-sm sm:col-span-3"><span className="mb-1 block font-medium text-slate-700">Notes (optional)</span><textarea rows={2} className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-3">{error}</div>}
        <div className="sm:col-span-3"><button type="submit" disabled={busy} className="btn-primary">{busy ? "Scheduling…" : "Schedule meeting"}</button><span className="ml-2 text-xs text-slate-400">Your appraiser is notified automatically.</span></div>
      </form>
      {meetings.length === 0 ? <p className="text-sm text-slate-400">No meeting scheduled yet — pick a date above.</p> : (
        <ul className="space-y-2">{meetings.map((m) => (<li key={m.id} className="rounded-xl border border-slate-200 px-4 py-3 text-sm"><div className="font-medium text-slate-800">{new Date(m.scheduledAt).toLocaleString("en-GB")} · {m.location ?? "—"}</div>{m.notes && <p className="mt-1 text-slate-500">{m.notes}</p>}</li>))}</ul>
      )}
    </div>
  );
}
