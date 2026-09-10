"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export type AttachmentItem = { id: string; filename: string; mimeType: string; size: number; createdAt: Date; issuer?: string | null; issuedAt?: Date | string | null; verified?: boolean; verifiedAt?: Date | string | null };

async function toggleVerify(id: string, verified: boolean): Promise<void> {
  await fetch(`/api/appraisal/attachments/${id}/verify`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verified }) });
}

export default function AttachmentList({ items, locked }: { items: AttachmentItem[]; locked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const issuerRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const issuer = issuerRef.current?.value.trim();
    if (issuer) form.append("issuer", issuer);
    const issuedAtInput = document.getElementById("attachment-issuedAt") as HTMLInputElement | null;
    if (issuedAtInput?.value) form.append("issuedAt", issuedAtInput.value);
    const res = await fetch("/api/appraisal/attachments", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/appraisal/attachments/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    router.refresh();
  }

  function fmtSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-3">
      {!locked && (
        <div>
          <div className="mb-2 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-600">Certificate issuer (optional)<input ref={issuerRef} className="field mt-1 text-xs" placeholder="e.g. RCP, GMC, university" /></label>
            <label className="text-xs text-slate-600">Issued date (optional)<input id="attachment-issuedAt" type="date" className="field mt-1 text-xs" /></label>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xlsx,.txt,.csv"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            disabled={busy}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-teal-800"
          />
          <p className="mt-1 text-xs text-slate-400">PDF, images, Office documents or text — max 10 MB. Certificates, audit write-ups and feedback reports can be attached here as supporting evidence.</p>
        </div>
      )}
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No supporting documents attached.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-slate-700">{a.filename}{a.verified && <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">✓ verified</span>}</span>
                <span className="ml-2 text-xs text-slate-400">{fmtSize(a.size)} · {new Date(a.createdAt).toLocaleDateString("en-GB")}{a.issuer ? ` · ${a.issuer}` : ""}</span>
              </div>
              <div className="flex gap-2">
                {locked ? null : (
                  <button onClick={async () => { await toggleVerify(a.id, !a.verified); router.refresh(); }} className={`rounded-md border px-2.5 py-1 text-xs ${a.verified ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>{a.verified ? "Verified" : "Verify"}</button>
                )}
                <a href={`/api/appraisal/attachments/${a.id}/download`} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
                  Download
                </a>
                {!locked && (
                  <button onClick={() => remove(a.id)} disabled={busy} className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
