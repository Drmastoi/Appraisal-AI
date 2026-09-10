import Link from "next/link";
import { Reveal, ScrollySteps } from "@/components/Scrolly";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--nhs-light-grey)] text-[var(--nhs-black)] selection:bg-[var(--nhs-blue)] selection:text-white">
      {/* ── Sticky masthead — NHS Blue ── */}
      <header className="sticky top-0 z-30 border-b-4 border-[var(--nhs-dark-blue)] bg-[var(--nhs-blue)] text-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-6 py-3.5 lg:px-8">
          <Link href="/" className="flex items-baseline gap-2.5">
            <span className="font-display text-[22px] leading-none tracking-[-0.02em] text-white">Appraisal</span>
            <span className="hidden h-4 w-px self-center bg-white/25 sm:block" aria-hidden />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 sm:inline">
              UK · MAG 2022
            </span>
            <span className="rounded-full border border-white/30 bg-white px-2 py-0.5 text-[10px] font-bold tracking-[0.08em] text-[var(--nhs-blue)]">
              EST. 2026
            </span>
          </Link>
          <div className="hidden items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80 lg:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--nhs-warm-yellow)]" />
              GMC revalidation · NHS England
            </span>
            <span>GDPR · DPIA · CQC</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-none border border-white bg-white px-4 py-2 text-sm font-semibold tracking-tight text-[var(--nhs-blue)] transition hover:bg-[var(--nhs-light-grey)]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="hidden border border-white bg-transparent px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-[var(--nhs-blue)] sm:inline-flex"
            >
              Create account
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero: editorial split — big type left, dossier right ── */}
      <main>
        <section id="hero" className="mx-auto max-w-[1280px] px-6 pt-8 lg:px-8 lg:pt-10">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            {/* Left — wordmark + headline */}
            <div className="relative">
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 border border-[var(--nhs-border-grey)] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--nhs-dark-grey)]">
                  <span className="inline-flex h-5 items-center bg-[var(--nhs-blue)] px-2 text-[10px] font-bold tracking-[0.08em] text-white">
                    MAG 2022
                  </span>
                  Model form · validated sections
                </div>
                <div className="inline-flex items-center gap-1.5 border border-[var(--nhs-blue)]/20 bg-[#e8f1fc] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--nhs-blue)]">
                  <span aria-hidden>✦</span> Integrated AI — gated &amp; audited
                </div>
              </div>

              <h1 className="font-display mt-5 text-balance text-[42px] font-normal leading-[0.96] tracking-[-0.03em] text-[var(--nhs-black)] sm:text-[54px] lg:text-[64px]">
                Medical Appraisal,
                <br />
                <span className="italic text-[var(--nhs-blue)]">without</span> the
                <br />
                drag.
              </h1>

              <p className="mt-3 max-w-[52ch] text-pretty text-[16px] leading-6 text-[var(--nhs-dark-grey)]">
                One secure portal for the <em className="font-semibold not-italic text-[var(--nhs-black)]">whole scope</em>{" "}
                — MAG form, 360° feedback, CPD &amp; PDP that carries forward year to year. Built for doctors, appraisers
                and Responsible Officers, <span className="font-semibold text-[var(--nhs-black)]">audited end-to-end.</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-l-4 border-[var(--nhs-blue)] bg-[#e8f1fc] px-3 py-2.5">
                <p className="text-[13px] font-medium leading-5 text-[var(--nhs-black)]">
                  <span className="font-bold text-[var(--nhs-blue)]">AI drafts where you work:</span> CPD reflections, SMART PDP
                  suggestions &amp; appraisal summaries — <span className="font-semibold">draft → human approval → audit log</span>.
                  No patient-identifiable data leaves your trust.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-[var(--nhs-blue)] px-6 py-3 text-[16px] font-semibold text-white transition hover:bg-[var(--nhs-dark-blue)] focus:outline-none focus:ring-4 focus:ring-[var(--nhs-yellow)] focus:ring-offset-0"
                >
                  Sign in to your portfolio
                  <span aria-hidden className="text-white/80">
                    →
                  </span>
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 border-2 border-[var(--nhs-blue)] bg-white px-6 py-3 text-[16px] font-semibold text-[var(--nhs-blue)] transition hover:bg-[var(--nhs-light-grey)]"
                >
                  Create an account
                </Link>
              </div>

              {/* Trust bar */}
              <div className="mt-8 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--nhs-mid-grey)]">
                <span>Trusted for revalidation</span>
                <span className="h-1 w-1 rounded-full bg-[var(--nhs-border-grey)]" />
                <span className="border border-[var(--nhs-border-grey)] bg-white px-2.5 py-1 normal-case tracking-normal text-[var(--nhs-dark-grey)]">
                  GMC · RO bundle · PDF export
                </span>
                <span className="border border-[var(--nhs-border-grey)] bg-white px-2.5 py-1 normal-case tracking-normal text-[var(--nhs-dark-grey)]">
                  Version history · Audit log
                </span>
              </div>

              {/* Access note — no public credentials */}
              <div className="mt-6 border border-[var(--nhs-border-grey)] bg-white p-4 shadow-sm">
                <p className="text-[13px] leading-5 text-[var(--nhs-dark-grey)]">
                  <span className="font-bold text-[var(--nhs-black)]">Access is by invitation of your designated body.</span> Registered
                  accounts are approved by the Responsible Officer before sign-in. Ask your appraisal lead to arrange access, or{" "}
                  <Link href="/register" className="font-semibold text-[var(--nhs-blue)] underline hover:no-underline">request an account</Link>.
                </p>
              </div>
            </div>

            {/* Right — \"dossier\" paper stack */}
            <div className="relative lg:pl-6">
              {/* paper behind */}
              <div className="absolute inset-0 -z-10 hidden translate-x-3 translate-y-3 border border-[var(--nhs-border-grey)] bg-white lg:block" />
              <div className="absolute inset-0 -z-10 hidden translate-x-1.5 translate-y-1.5 border border-[var(--nhs-border-grey)] bg-[#e8edf0] lg:block" />
              <div className="relative overflow-hidden border border-[var(--nhs-border-grey)] bg-white shadow-sm">
                {/* dossier header — NHS Blue */}
                <div className="flex items-center justify-between border-b-4 border-[var(--nhs-dark-blue)] bg-[var(--nhs-blue)] px-6 py-4 text-white">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center bg-white text-sm font-black text-[var(--nhs-blue)]">
                      A
                    </span>
                    <div>
                      <div className="text-sm font-bold tracking-tight text-white">Appraisal dossier</div>
                      <div className="text-[11px] font-medium text-white/80">Year 2025–26 · Dr J. Doctor · GMC 7400002</div>
                    </div>
                  </div>
                  <span className="bg-[var(--nhs-warm-yellow)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--nhs-black)]">
                    Signed off
                  </span>
                </div>

                {/* timeline rail */}
                <div className="grid grid-cols-[168px_1fr] gap-0">
                  <div className="border-r border-[var(--nhs-border-grey)] bg-[var(--nhs-light-grey)] px-4 py-5">
                    <div className="space-y-4">
                      {[
                        { k: "MAG", v: "14/14", ok: true },
                        { k: "CPD", v: "9 pts", ok: true },
                        { k: "MSF", v: "15/15", ok: true },
                        { k: "PDP", v: "2 new", ok: true },
                      ].map((s) => (
                        <div key={s.k} className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${s.ok ? "bg-[var(--nhs-green)]" : "bg-[var(--nhs-warm-yellow)]"}`} />
                          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--nhs-dark-grey)]">{s.k}</span>
                          <span className="ml-auto whitespace-nowrap font-mono text-xs font-semibold text-[var(--nhs-black)]">{s.v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 border border-[var(--nhs-border-grey)] bg-white px-3 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--nhs-mid-grey)]">Revalidation</div>
                      <div className="whitespace-nowrap font-mono text-sm font-bold text-[var(--nhs-black)]">Due Mar 2027</div>
                      <div className="text-[11px] text-[var(--nhs-dark-grey)]">Year 3 of 5</div>
                    </div>
                  </div>
                  <div className="px-6 py-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--nhs-mid-grey)]">Sections</div>
                    <ul className="mt-3 space-y-2.5">
                      {[
                        "Doctor's details & scope of work",
                        "CPD · internal & external with reflection",
                        "Quality improvement & significant events",
                        "Colleague & patient feedback (MSF)",
                        "PDP review → new PDP (SMART)",
                        "Probity · Health · Indemnity",
                      ].map((t) => (
                        <li key={t} className="flex items-start gap-2 text-sm leading-5 text-[var(--nhs-black)]">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nhs-blue)]" />
                          {t}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 border-l-4 border-[var(--nhs-green)] bg-[#eaf5ec] px-4 py-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[#00401a]">
                        <span className="flex h-6 w-6 items-center justify-center bg-[var(--nhs-green)] text-white">✓</span>
                        Appraiser signed · RO bundle ready
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#00401a]/80">
                        Version history is immutable. Every edit and AI draft is logged for the audit trail.
                      </p>
                    </div>
                  </div>
                </div>

                {/* footer strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--nhs-border-grey)] bg-[var(--nhs-light-grey)] px-6 py-3 text-[11px] text-[var(--nhs-dark-grey)]">
                  <span>Next appraisal meeting · 12 Sept 2026</span>
                  <span className="border border-[var(--nhs-border-grey)] bg-white px-2.5 py-1 font-medium text-[var(--nhs-blue)]">
                    Export PDF · Share with GMC →
                  </span>
                </div>
              </div>

              {/* floating badge — NHS Dark Blue, square */}
              <div className="pointer-events-none absolute -bottom-4 -right-2 hidden rotate-[-1deg] border-2 border-[var(--nhs-dark-blue)] bg-[var(--nhs-dark-blue)] px-4 py-3 text-white shadow-lg lg:flex lg:items-center lg:gap-3">
                <span className="flex h-8 w-8 items-center justify-center bg-white/15 text-sm">✦</span>
                <div className="pr-1 text-left leading-tight">
                  <div className="text-xs font-bold tracking-tight">Gated AI, not bolted on</div>
                  <div className="text-[11px] text-white/70">Drafts · human approval · fully logged</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Approach — three columns with oversized numerals ── */}
        <section id="how" className="mx-auto max-w-[1280px] px-6 pt-14 lg:px-8">
          <Reveal className="flex items-end justify-between gap-4 border-b-2 border-[var(--nhs-border-grey)] pb-4">
            <h2 className="font-display text-[28px] leading-none tracking-[-0.02em] text-[var(--nhs-black)]">How it works</h2>
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--nhs-mid-grey)] sm:inline">
              Doctor → Appraiser → Responsible Officer
            </span>
          </Reveal>
          <ScrollySteps
            steps={[
              {
                n: "01",
                title: "Doctor completes the MAG",
                body: "Validated, autosaving sections with SMART PDP support. CPD, QI, events and feedback live in their own pages and flow back into the form.",
              },
              {
                n: "02",
                title: "Appraiser reviews & signs",
                body: "Comment per section, make tracked edits, and e-sign off. The appraisal locks — version history and signatures are immutable.",
              },
              {
                n: "03",
                title: "RO & admin have oversight",
                body: "Compliance views, assignment, revalidation countdown and a structured export bundle for the GMC recommendation.",
              },
            ]}
          />
        </section>

        {/* ── Features — staggered bento ── */}
        <section id="features" className="mx-auto max-w-[1280px] px-6 pt-10 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
            <div className="h-full border border-[var(--nhs-border-grey)] bg-white p-7">
              <div className="inline-flex items-center gap-2 bg-[var(--nhs-light-grey)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--nhs-dark-grey)]">
                MAG 2022
              </div>
              <h3 className="font-display mt-3 text-[26px] leading-none tracking-[-0.02em] text-[var(--nhs-black)]">
                The model form, actually mapped
              </h3>
              <p className="mt-2 max-w-[48ch] text-sm leading-6 text-[var(--nhs-dark-grey)]">
                Every section as validated, autosaving fields — doctor details, scope of work (clinical / educational /
                managerial / other), CPD with internal vs external, QI, significant events, feedback, PDP, probity and
                health declarations.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                {["Validations per section", "SMART PDP builder", "Wellbeing & achievements", "Probity & indemnity"].map(
                  (t) => (
                    <span
                      key={t}
                      className="border border-[var(--nhs-border-grey)] bg-[var(--nhs-light-grey)] px-3 py-2 text-center text-xs font-semibold text-[var(--nhs-dark-grey)]"
                    >
                      {t}
                    </span>                ))}
              </div>
            </div>
            </Reveal>
            <Reveal delay={90} className="lg:col-span-5">
            <div className="h-full border border-[var(--nhs-dark-blue)] bg-[var(--nhs-blue)] p-7 text-white">
              <div className="inline-flex bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                360° feedback
              </div>
              <h3 className="font-display mt-3 text-[26px] leading-none tracking-tight text-white">Anonymous MSF, done properly</h3>
              <p className="mt-2 text-sm leading-6 text-white/80">
                Colleague and patient cycles with single-use tokenised links, response thresholds, domain-weighted
                reports and reflection prompts. Anonymous by design.
              </p>
              <div className="mt-5 flex gap-2">
                <span className="bg-white px-3 py-2 text-xs font-bold text-[var(--nhs-blue)]">Thresholds</span>
                <span className="border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white">Reports</span>
                <span className="border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white">Reflection</span>
              </div>
            </div>
            </Reveal>

            <Reveal delay={180} className="lg:col-span-5">
            <div className="h-full border border-[var(--nhs-border-grey)] bg-[#e8f1fc] p-7">
              <h3 className="font-display text-[22px] leading-none tracking-tight text-[var(--nhs-black)]">PDP that carries forward</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--nhs-dark-grey)]">
                Signed-off objectives seed next year&apos;s appraisal. Achieved / not-achieved review is required before
                sign-off — no gaps, no retyping.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-[var(--nhs-dark-grey)]">
                <span className="h-2 w-2 rounded-full bg-[var(--nhs-green)]" />
                Year 2024 → 2025 → 2026 continuity
              </div>
            </div>
            </Reveal>
            <Reveal delay={270} className="lg:col-span-7">
            <div className="h-full border border-[var(--nhs-border-grey)] bg-white p-7">
              <h3 className="font-display text-[22px] leading-none tracking-tight text-[var(--nhs-black)]">
                Appraiser workflow, with receipts
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--nhs-dark-grey)]">
                Review per section, comment threads, tracked edits with version history, and e-signatures that lock the
                appraisal. Every action is audit-logged — export the bundle for the RO and GMC.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="bg-[var(--nhs-blue)] px-3 py-2 font-semibold text-white">Comments</span>
                <span className="border border-[var(--nhs-border-grey)] bg-[var(--nhs-light-grey)] px-3 py-2 font-semibold text-[var(--nhs-black)]">
                  Version history
                </span>
                <span className="border border-[var(--nhs-border-grey)] bg-[var(--nhs-light-grey)] px-3 py-2 font-semibold text-[var(--nhs-black)]">
                  Sign-off &amp; lock
                </span>
              </div>
            </div>
            </Reveal>

            <Reveal delay={360} className="lg:col-span-12">
            <div className="h-full border-2 border-[var(--nhs-blue)] bg-[var(--nhs-blue)] p-7 text-white">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <div className="inline-flex bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                    Integrated AI — approval-gated
                  </div>
                  <h3 className="font-display mt-3 max-w-[20ch] text-[26px] leading-none tracking-tight text-white">
                    AI drafts inside the workflow — never instead of it.
                  </h3>
                </div>
                <p className="max-w-[44ch] text-sm leading-6 text-white/80">
                  Reflection drafts for CPD, PDP suggestions and appraisal summaries are generated in-flow, marked as
                  drafts, and require human approval. No patient-identifiable data is sent; every use is logged.
                </p>
              </div>
            </div>
            </Reveal>
          </div>
        </section>

        {/* ── Comparison — minimal, compact matrix (NHS + SEO) ── */}
        <section id="compare" aria-labelledby="compare-heading" className="mx-auto max-w-[1280px] px-6 pt-10 lg:px-8">
          <div className="max-w-[760px]">
            <h2
              id="compare-heading"
              className="font-display text-[22px] leading-none tracking-[-0.02em] text-[var(--nhs-black)] sm:text-[26px]"
            >
              UK medical appraisal software comparison
            </h2>
            <p className="mt-2 text-[13px] leading-5 text-[var(--nhs-dark-grey)]">
              <strong className="font-semibold text-[var(--nhs-black)]">AppraisalPortal UK</strong> vs{" "}
              <span className="font-medium text-[var(--nhs-black)]">FourteenFish</span> ·{" "}
              <span className="font-medium text-[var(--nhs-black)]">Clarity</span> ·{" "}
              <span className="font-medium text-[var(--nhs-black)]">L2P / Improval</span> — GMC revalidation: MAG 2022,
              lock-on-sign-off, 360° MSF, PDP, RO oversight &amp; audit.
            </p>
          </div>

          <Reveal className="mt-4 border border-[var(--nhs-border-grey)] bg-white">
            <div className="flex items-center justify-between border-b border-[var(--nhs-border-grey)] bg-[var(--nhs-light-grey)] px-3 py-1.5 text-[11px] text-[var(--nhs-dark-grey)] sm:hidden">
              <span className="font-medium">← Swipe to compare →</span>
              <span className="font-semibold text-[var(--nhs-mid-grey)]">4 products</span>
            </div>
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[640px] border-collapse text-left"
                aria-label="UK medical appraisal software comparison: AppraisalPortal UK vs FourteenFish vs Clarity vs L2P"
              >
                <caption className="sr-only">
                  Comparison of UK medical appraisal software for GMC revalidation — AppraisalPortal UK versus
                  FourteenFish, Agilio Clarity and L2P/Improval across MAG 2022, lock-on-sign-off, appraiser workflow,
                  360 feedback, PDP carry-forward, RO oversight, GMC export, AI and audit.
                </caption>
                <thead>
                  <tr className="border-b border-[var(--nhs-border-grey)] text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--nhs-mid-grey)]">
                    <th scope="col" className="w-[30%] px-3 py-2 font-bold">
                      Capability
                    </th>
                    <th scope="col" className="px-2 py-2 text-center font-bold">
                      FourteenFish
                    </th>
                    <th scope="col" className="px-2 py-2 text-center font-bold">
                      Clarity
                    </th>
                    <th scope="col" className="px-2 py-2 text-center font-bold">
                      L2P
                    </th>
                    <th scope="col" className="w-[22%] border-l border-[var(--nhs-blue)] bg-[var(--nhs-blue)] px-2 py-2 text-center font-bold text-white">
                      AppraisalPortal UK
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--nhs-border-grey)]/70 text-[12px] leading-none">
                  {[
                    { cap: "MAG 2022", fish: "Yes" as const, clarity: "Yes" as const, l2p: "Toolkit" as const, us: "Native" },
                    { cap: "Lock on sign-off", fish: "—" as const, clarity: "Partial" as const, l2p: "—" as const, us: "Locked" },
                    { cap: "Appraiser workflow", fish: "Partial" as const, clarity: "Basic" as const, l2p: "Email" as const, us: "Versioned" },
                    { cap: "360° feedback", fish: "Add-on" as const, clarity: "Separate" as const, l2p: "—" as const, us: "Integrated" },
                    { cap: "PDP carry-forward", fish: "Manual" as const, clarity: "Manual" as const, l2p: "Manual" as const, us: "Auto-carry" },
                    { cap: "RO oversight", fish: "Limited" as const, clarity: "Admin" as const, l2p: "—" as const, us: "Compliance" },
                    { cap: "GMC / RO export", fish: "PDF" as const, clarity: "PDF" as const, l2p: "Export" as const, us: "Bundle + PDF" },
                    { cap: "AI in workflow", fish: "—" as const, clarity: "Bolted on" as const, l2p: "—" as const, us: "Gated" },
                    { cap: "Audit & IG", fish: "Log" as const, clarity: "Log" as const, l2p: "Limited" as const, us: "Full trail" },
                  ].map((r) => (
                    <tr key={r.cap} className="hover:bg-[var(--nhs-light-grey)]/50">
                      <th scope="row" className="px-3 py-2 text-left align-middle text-[12px] font-semibold text-[var(--nhs-black)]">
                        {r.cap}
                      </th>
                      {[r.fish, r.clarity, r.l2p].map((v, i) => {
                        const isYes = v === "Yes";
                        const isNo = v === "—";
                        return (
                          <td key={i} className="px-2 py-2 text-center align-middle">
                            <span
                              className={
                                isYes
                                  ? "text-[12px] font-semibold text-[#006747]"
                                  : isNo
                                    ? "text-[12px] font-medium text-[var(--nhs-mid-grey)]"
                                    : "text-[12px] font-medium text-[#7a4d00]"
                              }
                            >
                              <span aria-hidden className="mr-1 text-[11px]">
                                {isYes ? "✓" : isNo ? "—" : "◐"}
                              </span>
                              {v}
                            </span>
                          </td>
                        );
                      })}
                      <td className="border-l border-[var(--nhs-blue)]/10 bg-[#e8f1fc] px-2 py-2 text-center align-middle">
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--nhs-blue)]">
                          <span aria-hidden className="text-[11px]">
                            ✓
                          </span>
                          {r.us}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--nhs-border-grey)] bg-[var(--nhs-light-grey)] px-3 py-1.5 text-[11px] leading-none text-[var(--nhs-mid-grey)]">
              <span className="inline-flex items-center gap-2">
                <span className="font-semibold text-[var(--nhs-black)]">✓</span> Full ·
                <span className="font-semibold text-[#7a4d00]">◐</span> Partial ·
                <span className="font-semibold">—</span> No
              </span>
              <span>Mar 2026 · not a procurement comparison</span>
            </div>
          </Reveal>
          <p className="mt-2 max-w-[72ch] text-[12px] leading-4 text-[var(--nhs-dark-grey)]">
            FourteenFish remains editable after submission; Clarity&apos;s AI sits outside the workflow; toolkit products
            leave the RO to reconcile. This portal locks on sign-off, versions every edit and gates AI in-workflow — so
            revalidation doesn&apos;t live in inboxes.
          </p>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: "UK medical appraisal software comparison for GMC revalidation",
                description:
                  "Comparison of AppraisalPortal UK versus FourteenFish, Agilio Clarity and L2P/Improval for MAG 2022, 360 MSF feedback, PDP, RO oversight and audit.",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    item: {
                      "@type": "SoftwareApplication",
                      name: "AppraisalPortal UK",
                      applicationCategory: "MedicalApplication",
                      operatingSystem: "Web",
                      description:
                        "MAG 2022-native appraisal portal with lock-on-sign-off, integrated 360 MSF feedback and RO compliance centre for GMC revalidation.",
                    },
                  },
                  { "@type": "ListItem", position: 2, item: { "@type": "SoftwareApplication", name: "FourteenFish" } },
                  { "@type": "ListItem", position: 3, item: { "@type": "SoftwareApplication", name: "Agilio Clarity" } },
                  { "@type": "ListItem", position: 4, item: { "@type": "SoftwareApplication", name: "L2P / Improval" } },
                ],
              }),
            }}
          />
        </section>

        {/* ── Final CTA — NHS Blue ── */}
        <section className="mx-auto max-w-[1280px] px-6 pb-12 pt-10 lg:px-8">
          <Reveal className="border-2 border-[var(--nhs-dark-blue)] bg-[var(--nhs-blue)] px-6 py-8 text-white sm:px-8 sm:py-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-[28px] leading-none tracking-tight text-white sm:text-[32px]">
                  Ready when your appraisal is.
                </h2>
                <p className="mt-2 max-w-[52ch] text-sm leading-6 text-white/80">
                  Create an account, pick your designated body, and start the MAG form. Your appraiser and RO get the
                  right access automatically.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="bg-white px-6 py-3 text-sm font-bold text-[var(--nhs-blue)] transition hover:bg-[var(--nhs-light-grey)]"
                >
                  Create an account
                </Link>
                <Link
                  href="/login"
                  className="border border-white bg-transparent px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t-4 border-[var(--nhs-blue)] bg-white py-6">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 text-xs text-[var(--nhs-mid-grey)] lg:px-8">
          <span>Appraisal data is confidential and audited. AI output is draft-only and requires human approval.</span>
          <Link href="/privacy" className="font-semibold text-[var(--nhs-blue)] underline-offset-4 hover:underline">
            Privacy at a glance →
          </Link>
        </div>
      </footer>
    </div>
  );
}
