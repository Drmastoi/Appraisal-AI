"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AssignmentsManager({
  doctors,
  appraisers,
}: {
  doctors: { id: string; name: string; gmcNumber: string | null }[];
  appraisers: { id: string; name: string; gmcNumber: string | null }[];
}) {
  const router = useRouter();
  const [doctorId, setDoctorId] = useState("");
  const [appraiserId, setAppraiserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function assign(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, appraiserId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Assignment failed");
      return;
    }
    setMessage("Assignment saved");
    router.refresh();
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Assign an appraiser</h2>
      <form onSubmit={assign} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Doctor</span>
          <select required value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="field w-64">
            <option value="">Select doctor…</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} {d.gmcNumber ? `(${d.gmcNumber})` : ""}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Appraiser</span>
          <select required value={appraiserId} onChange={(e) => setAppraiserId(e.target.value)} className="field w-64">
            <option value="">Select appraiser…</option>
            {appraisers.map((a) => <option key={a.id} value={a.id}>{a.name} {a.gmcNumber ? `(${a.gmcNumber})` : ""}</option>)}
          </select>
        </label>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save assignment"}
        </button>
      </form>
      {message && <div className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{message}</div>}
      {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </div>
  );
}
