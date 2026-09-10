"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RecommendForm({ doctorId, year, disabled }: { doctorId: string; year: number; disabled: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!value) return;
    setBusy(true);
    await fetch("/api/admin/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, appraisalYear: year, recommendation: value }),
    });
    setBusy(false);
    router.refresh();
  }

  if (disabled) return <span className="text-xs text-slate-400">appraisal not signed off</span>;

  return (
    <div className="flex items-center gap-1.5">
      <select value={value} onChange={(e) => setValue(e.target.value)} className="field w-auto py-1 text-xs">
        <option value="">Record…</option>
        <option value="POSITIVE">Positive</option>
        <option value="DEFERRED">Deferred</option>
        <option value="NEGATIVE">Negative</option>
      </select>
      <button onClick={submit} disabled={busy || !value} className="chip-dark">Save</button>
    </div>
  );
}
