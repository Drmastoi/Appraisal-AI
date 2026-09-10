"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Row = { id: string; email: string; name: string; role: string; gmcNumber: string | null; designatedBody: string | null; approved: boolean; active: boolean };
type AppraisalLite = { id: string; doctorId: string; year: number; status: string };

export default function UsersTable({
  users,
  appraisers,
  doctorAppraisals,
  activeAssignmentCounts,
}: {
  users: Row[];
  appraisers: { id: string; name: string }[];
  doctorAppraisals: { id: string; appraisals: AppraisalLite[] }[];
  activeAssignmentCounts: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [chosenAppraiser, setChosenAppraiser] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appraisalsByDoctor = new Map(doctorAppraisals.map((d) => [d.id, d.appraisals]));
  const currentYear = new Date().getFullYear();

  async function call(url: string, method: string, body?: unknown, id?: string) {
    setBusyId(id ?? url);
    setError(null);
    setMessage(null);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Action failed");
      return null;
    }
    return data;
  }

  async function toggleUser(row: Row, patch: { approved?: boolean; active?: boolean }) {
    const out = await call(`/api/admin/users/${row.id}`, "PATCH", patch, row.id);
    if (out) {
      setMessage(`${row.name} updated`);
      startTransition(() => router.refresh());
    }
  }

  async function createAppraisal(row: Row) {
    const appraiserId = chosenAppraiser[row.id] || activeAssignmentCounts[row.id] || undefined;
    const out = await call("/api/admin/appraisals", "POST", { doctorId: row.id, appraiserId }, row.id);
    if (out) {
      setMessage(out.existing ? `Appraisal already exists for ${row.name}` : `Appraisal created for ${row.name}`);
      startTransition(() => router.refresh());
    }
  }

  return (
    <div>
      {message && <div className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{message}</div>}
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">GMC</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Appraisals</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const busy = busyId === u.id || pending;
              const list = appraisalsByDoctor.get(u.id) ?? [];
              const thisYear = list.find((a) => a.year === currentYear);
              return (
                <tr key={u.id} className="align-middle">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.role}</td>
                  <td className="px-4 py-3 text-slate-600">{u.gmcNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    {!u.approved ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">awaiting approval</span>
                      : !u.active ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">deactivated</span>
                      : <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">active</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {u.role === "DOCTOR" ? (
                      list.length ? (
                        <div className="space-y-1">
                          {list.slice(-2).map((a) => (
                            <div key={a.id}>
                              {a.year}/{String(a.year + 1).slice(2)} <span className="text-slate-400">· {a.status}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">none</span>
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {!u.approved && (
                        <button disabled={busy} onClick={() => toggleUser(u, { approved: true })} className="chip-primary">
                          Approve
                        </button>
                      )}
                      {u.role !== "ADMIN" && u.active && (
                        <button disabled={busy} onClick={() => toggleUser(u, { active: false })} className="chip-secondary">
                          Deactivate
                        </button>
                      )}
                      {u.role !== "ADMIN" && !u.active && (
                        <button disabled={busy} onClick={() => toggleUser(u, { active: true })} className="chip-secondary">
                          Reactivate
                        </button>
                      )}
                      {u.role === "DOCTOR" && u.approved && (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={chosenAppraiser[u.id] ?? ""}
                            onChange={(e) => setChosenAppraiser((m) => ({ ...m, [u.id]: e.target.value }))}
                            className="field w-auto py-1 text-xs"
                          >
                            <option value="">Assign appraiser…</option>
                            {appraisers.map((a) => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                          <button
                            disabled={busy || !thisYear}
                            title={thisYear ? "This year's appraisal already exists" : `Create ${currentYear}/${String(currentYear + 1).slice(2)} appraisal`}
                            onClick={() => createAppraisal(u)}
                            className="chip-teal-outline"
                          >
                            Create appraisal
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
