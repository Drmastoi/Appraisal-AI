"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "DOCTOR", gmcNumber: "", designatedBody: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        gmcNumber: form.gmcNumber || undefined,
        designatedBody: form.designatedBody || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Registration failed");
      setBusy(false);
      return;
    }
    setDone(true);
    setBusy(false);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="card w-full max-w-md p-8 text-center shadow-lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7"><path d="m5 13 4 4L19 7" /></svg>
          </span>
          <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">Account created</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            An administrator must approve your account before you can sign in. You&apos;ll be able to log in once approved.
          </p>
          <Link href="/login" className="btn-primary mt-6 w-full">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-lg">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-1.5 text-sm text-slate-500">For doctors and appraisers. Administrator approval is required before first sign-in.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" required minLength={2} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" required type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password (min 8 characters)</label>
              <input id="password" required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="role">I am a…</label>
              <select id="role" value={form.role} onChange={(e) => set("role", e.target.value)} className="field">
                <option value="DOCTOR">Doctor (appraisee)</option>
                <option value="APPRAISER">Appraiser</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="gmc">GMC number</label>
                <input id="gmc" value={form.gmcNumber} onChange={(e) => set("gmcNumber", e.target.value)} className="field" placeholder="optional" />
              </div>
              <div>
                <label className="label" htmlFor="body">Designated body</label>
                <input id="body" value={form.designatedBody} onChange={(e) => set("designatedBody", e.target.value)} className="field" placeholder="e.g. NHS ICB" />
              </div>
            </div>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>}
            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">{busy ? "Creating…" : "Create account"}</button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            Already registered? <Link href="/login" className="font-semibold text-teal-700 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
