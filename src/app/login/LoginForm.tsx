"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Sign-in failed");
      setBusy(false);
      return;
    }
    const next = params.get("next");
    const home = data.role === "ADMIN" ? "/admin" : data.role === "APPRAISER" ? "/appraiser" : "/doctor";
    router.push(next && next.startsWith("/") && !next.startsWith("/login") ? next : home);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_1.1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <div className="dot-grid absolute inset-0 opacity-[0.15]" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-sm font-black text-slate-950">A</span>
            <span className="text-lg font-bold tracking-tight">
              Appraisal<span className="text-teal-400">Portal</span> <span className="align-super text-[10px] font-semibold text-teal-500">UK</span>
            </span>
          </Link>
          <div className="max-w-sm">
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
              Your appraisal year, <span className="text-gradient">in one place.</span>
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {["MAG 2022 form with autosaving sections", "Anonymous 360° colleague & patient feedback", "AI-drafted reflections — approved by you", "PDP that carries forward automatically"].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0 text-teal-400"><path d="m5 13 4 4L19 7" /></svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-500">Confidential · Audited · UK GDPR compliant</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="card p-8 shadow-lg sm:p-9">
            <div className="lg:hidden">
              <div className="text-xl font-bold tracking-tight text-teal-800">
                Appraisal<span className="text-slate-900">Portal</span> <span className="align-super text-[10px] text-teal-600">UK</span>
              </div>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 lg:mt-0">Sign in</h1>
            <p className="mt-1.5 text-sm text-slate-500">Welcome back — your portfolio is waiting.</p>
            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <label className="label" htmlFor="email">Email</label>
                <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="name@nhs.net" />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="field" />
              </div>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
              )}
              <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-500">
              No account? <Link href="/register" className="font-semibold text-teal-700 hover:underline">Register</Link>
            </p>
          </div>
          <p className="mt-5 text-center text-xs leading-relaxed text-slate-400">
            Demo: <code>doctor@portal.nhs.uk / Doctor123!</code> · <code>appraiser@portal.nhs.uk / Appraiser123!</code> · <code>admin@portal.nhs.uk / Admin123!</code>
          </p>
        </div>
      </div>
    </div>
  );
}
