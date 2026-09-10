"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import FeedbackReport from "./FeedbackReport";

type Cycle = { id: string; cycleType: string; status: string; minResponses: number; createdAt: Date; _count: { invites: number; responses: number } };

export default function FeedbackManager({ cycles, locked }: { cycles: Cycle[]; locked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCycle, setOpenCycle] = useState<string | null>(null);
  const [reportCycle, setReportCycle] = useState<string | null>(null);
  const [inviteCount, setInviteCount] = useState("10");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function createCycle(cycleType: string) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/feedback/cycles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cycleType }) });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not create cycle");
      return;
    }
    router.refresh();
  }

  async function loadInvites(cycleId: string) {
    const res = await fetch(`/api/feedback/cycles/${cycleId}`);
    const d = await res.json();
    return d.invites ?? [];
  }

  async function toggleCycle(cycleId: string) {
    if (openCycle === cycleId) {
      setOpenCycle(null);
      return;
    }
    setOpenCycle(cycleId);
  }

  async function addInvites(cycleId: string) {
    setBusy(true);
    setError(null);
    const n = Math.max(1, Math.min(60, Number(inviteCount) || 10));
    const res = await fetch(`/api/feedback/cycles/${cycleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invites: Array.from({ length: n }, () => ({})) }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not create invites");
      return;
    }
    router.refresh();
  }

  async function closeCycle(cycleId: string) {
    setBusy(true);
    await fetch(`/api/feedback/cycles/${cycleId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "CLOSE" }) });
    setBusy(false);
    router.refresh();
  }

  async function remind(cycleId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/feedback/cycles/${cycleId}/remind`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    setError(d.note ?? d.error ?? (res.ok ? "Reminders sent" : "Could not send reminders"));
    router.refresh();
  }

  async function copyAllLinks(cycleId: string) {
    const invites = await loadInvites(cycleId);
    const urls = invites.map((i: { url: string }) => `${window.location.origin}${i.url}`).join("\n");
    await navigator.clipboard.writeText(urls);
    setCopiedId(cycleId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {!locked && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => createCycle("COLLEAGUE")} disabled={busy} className="btn-primary">New colleague feedback cycle</button>
          <button onClick={() => createCycle("PATIENT")} disabled={busy} className="btn-secondary">New patient feedback cycle</button>
        </div>
      )}

      {cycles.length === 0 ? (
        <p className="text-sm text-slate-400">No feedback cycles yet.</p>
      ) : (
        <ul className="space-y-3">
          {cycles.map((c) => (
            <li key={c.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {c.cycleType === "COLLEAGUE" ? "Colleague feedback (MSF)" : "Patient feedback"}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "OPEN" ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"}`}>{c.status}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {c._count.responses} response(s) · {c._count.invites} invite(s) · minimum {c.minResponses} for unblinding · created {new Date(c.createdAt).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => toggleCycle(c.id)} className="chip-secondary">{openCycle === c.id ? "Hide invites" : "Manage invites"}</button>
                  <button onClick={() => setReportCycle(reportCycle === c.id ? null : c.id)} className="chip-dark">Report</button>
                  {c.status === "OPEN" && !locked && c._count.responses < c.minResponses && <button onClick={() => remind(c.id)} disabled={busy} className="chip-amber">Remind</button>}
                  {c.status === "OPEN" && !locked && (
                    <button onClick={() => closeCycle(c.id)} disabled={busy} className="chip-amber">Close</button>
                  )}
                </div>
              </div>

              {openCycle === c.id && (
                <div className="border-t border-slate-100 px-4 py-3">
                  {!locked && c.status === "OPEN" && (
                    <div className="mb-3 flex items-center gap-2">
                      <label className="text-sm text-slate-600">Number of invite links:</label>
                      <input type="number" min={1} max={60} value={inviteCount} onChange={(e) => setInviteCount(e.target.value)} className="field w-20" />
                      <button onClick={() => addInvites(c.id)} disabled={busy} className="chip-primary">Generate links</button>
                      <button onClick={() => copyAllLinks(c.id)} className="chip-secondary">{copiedId === c.id ? "Copied ✓" : "Copy all links"}</button>
                    </div>
                  )}
                  <InviteList cycleId={c.id} />
                </div>
              )}

              {reportCycle === c.id && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <FeedbackReport cycleId={c.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InviteList({ cycleId }: { cycleId: string }) {
  const [invites, setInvites] = useState<{ id: string; url: string; recipientName: string | null; relationship: string | null; completed: boolean }[] | null>(null);

  useState(() => {
    loadInvitesProxy(cycleId).then(setInvites);
  });

  if (invites === null) return <p className="text-sm text-slate-400">Loading invites…</p>;
  if (invites.length === 0) return <p className="text-sm text-slate-400">No invite links yet — generate some above.</p>;
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {invites.map((i) => (
        <li key={i.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
          <div className="min-w-0">
            <span className="font-mono text-xs text-slate-500">{i.url}</span>
            {i.recipientName && <span className="ml-2 text-xs text-slate-400">{i.recipientName}</span>}
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${i.completed ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>{i.completed ? "completed" : "pending"}</span>
        </li>
      ))}
    </ul>
  );
}

async function loadInvitesProxy(cycleId: string) {
  const res = await fetch(`/api/feedback/cycles/${cycleId}`);
  const d = await res.json();
  return d.invites ?? [];
}
