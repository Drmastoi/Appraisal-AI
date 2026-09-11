"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MAG_SECTIONS } from "@/lib/appraisal";
import { computeSectionStatuses, parseSectionData } from "@/lib/sections";
import { sectionStatusLabel, useSectionAutosave } from "@/app/doctor/appraisal/useSectionAutosave";

type Counts = { cpd: number; qi: number; events: number; pdp: number; colleagueCycles: number; patientCycles: number };

export default function MagForm({
  appraisalId,
  status,
  doctorName,
  gmcNumber,
  sections,
  counts,
}: {
  appraisalId: string;
  status: string;
  doctorName: string;
  gmcNumber: string;
  sections: { sectionKey: string; data: string }[];
  counts: Counts;
}) {
  const router = useRouter();
  const [openKey, setOpenKey] = useState<string | null>("doctor_details");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const locked = status !== "DRAFT";

  // Server content, parsed — the baseline for both the form and draft recovery.
  const serverData = useMemo(() => {
    const m: Record<string, Record<string, unknown>> = {};
    for (const section of MAG_SECTIONS) {
      m[section.key] = parseSectionData(section.key, sections.find((x) => x.sectionKey === section.key)?.data ?? "{}");
    }
    return m;
  }, [sections]);

  // Autosave owns the form's live content: typing is held in memory, written
  // debounced, flushed on blur/close/hide/unload and retried with backoff.
  const { data: formData, sync, counts: saveCounts, restoredSections, epoch, update, flush, flushAll, saveNow, discardDraft } =
    useSectionAutosave({ appraisalId, serverData, enabled: !locked });

  // Completion ticks follow the live content, so they update as the doctor types.
  const statuses = useMemo(
    () =>
      computeSectionStatuses(
        MAG_SECTIONS.map((section) => ({ sectionKey: section.key, data: JSON.stringify(formData[section.key] ?? {}) })),
        counts
      ),
    [formData, counts]
  );

  const sectionTitle = (key: string) => MAG_SECTIONS.find((s) => s.key === key)?.title ?? key;
  const savedTime = saveCounts.lastSavedAt ? new Date(saveCounts.lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  function toggleSection(key: string) {
    const isOpen = openKey === key;
    // Closing a section must never discard what was typed in it.
    if (isOpen && !locked) void flush(key);
    setOpenKey(isOpen ? null : key);
  }

  async function submit() {
    setBusy(true);
    setSubmitError(null);
    // Never submit stale content: persist every outstanding section first.
    const saved = await flushAll();
    if (!saved) {
      setBusy(false);
      setSubmitError("Some sections could not be saved. Check your connection — your answers are kept, and saving will retry.");
      return;
    }
    const res = await fetch("/api/appraisal/submit", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setSubmitError(data.error ?? "Submission failed");
      return;
    }
    router.refresh();
    router.push("/doctor");
  }

  return (
    <div>
      <div className="card mb-4 space-y-3 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600" aria-live="polite">
            {saveCounts.saving > 0 && <span className="text-slate-400">Saving…</span>}
            {saveCounts.saving === 0 && saveCounts.failed > 0 && (
              <span className="text-red-700">
                {saveCounts.failed} section{saveCounts.failed === 1 ? "" : "s"} not saved — retrying automatically. Your answers are kept.
              </span>
            )}
            {saveCounts.saving === 0 && saveCounts.failed === 0 && saveCounts.unsaved > 0 && (
              <span className="text-amber-700">
                {saveCounts.unsaved} section{saveCounts.unsaved === 1 ? "" : "s"} with unsaved changes — saving as you type
              </span>
            )}
            {saveCounts.saving === 0 && saveCounts.unsaved === 0 && (
              <span className="text-emerald-700">
                {savedTime ? `All changes saved · ${savedTime}` : "Complete each section — your answers save automatically"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!locked && (
              <button onClick={saveNow} className="btn-secondary" title="Save now (⌘S / Ctrl+S)">Save now</button>
            )}
            {!locked && (
              <button onClick={submit} disabled={busy} className="btn-primary">{busy ? "Submitting…" : "Submit to appraiser"}</button>
            )}
          </div>
        </div>
      </div>

      {restoredSections.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Unsaved answers were recovered from this device</p>
          <p className="mt-1">
            {restoredSections.map(sectionTitle).join(", ")} — these had not reached the server when this page was last closed. Review and
            save them, or discard to return to the stored version.
          </p>
          <div className="mt-2 flex gap-2">
            <button className="btn-secondary" onClick={saveNow}>Save recovered answers</button>
            <button className="text-xs font-semibold text-amber-900 underline" onClick={() => restoredSections.forEach(discardDraft)}>
              Discard them
            </button>
          </div>
        </div>
      )}
      {submitError && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}

      <div className="space-y-2">
        {MAG_SECTIONS.map((section, idx) => {
          const isOpen = openKey === section.key;
          const done = statuses[section.key];
          const isAppraiserSection = section.owner === "APPRAISER";
          const label = locked ? null : sectionStatusLabel(sync[section.key]);
          const dirty = !locked && (sync[section.key]?.state === "pending" || sync[section.key]?.state === "error");
          return (
            <div key={section.key} className="card overflow-hidden" onBlur={() => !locked && void flush(section.key)}>
              <button
                onClick={() => toggleSection(section.key)}
                className="flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left transition-all hover:bg-slate-50/80"
              >
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ring-inset ${done ? "bg-emerald-50 text-emerald-600 ring-emerald-200" : "bg-slate-50 text-slate-500 ring-slate-200"}`}>
                    {done ? "✓" : idx + 1}
                  </span>
                  <div>
                    <span className="text-sm font-semibold tracking-tight text-slate-800">{section.title}</span>
                    {isAppraiserSection && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-inset ring-violet-200">APPRAISER</span>}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-3">
                  {label && <span className={`whitespace-nowrap text-[11px] font-semibold ${label.tone}`}>{label.text}</span>}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${dirty ? "text-amber-500" : "text-slate-400"}`}><path d="m6 9 6 6 6-6" /></svg>
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="mb-4 text-xs text-slate-500">{section.description}</p>
                  {isAppraiserSection ? (
                    <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm leading-relaxed text-violet-800">
                      This section is completed by your appraiser during review{locked && status === "SIGNED_OFF" ? " — see the signed-off summary" : ""}.
                    </p>
                  ) : locked ? (
                    <SectionView data={formData[section.key] ?? {}} />
                  ) : (
                    <SectionEditor
                      key={`${section.key}:${epoch}`}
                      sectionKey={section.key}
                      data={formData[section.key] ?? {}}
                      doctorName={doctorName}
                      gmcNumber={gmcNumber}
                      onChange={(next) => update(section.key, next)}
                    />
                  )}
                  {(section.key === "cpd" || section.key === "colleague_feedback" || section.key === "patient_feedback" || section.key === "pdp_review" || section.key === "new_pdp" || section.key === "quality_improvement" || section.key === "significant_events") && (
                    <p className="mt-3 rounded-xl bg-teal-50 px-3.5 py-2.5 text-xs leading-relaxed text-teal-800">
                      This section is managed on its dedicated page (CPD, 360 feedback or PDP in the navigation) — entries appear here automatically.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "field";

/**
 * Renders one MAG section. It is deliberately stateless: the parent owns the
 * live content (so a half-typed answer survives closing or reopening the
 * section) and schedules the debounced autosave.
 */
export function SectionEditor({
  sectionKey,
  data,
  doctorName,
  gmcNumber,
  onChange,
}: {
  sectionKey: string;
  data: Record<string, unknown>;
  doctorName: string;
  gmcNumber: string;
  onChange: (data: Record<string, unknown>) => void;
}) {
  function update(key: string, next: unknown) {
    onChange({ ...data, [key]: next });
  }

  function replaceRow(key: string, rows: Record<string, string>[], index: number, patch: Partial<Record<string, string>>) {
    update(
      key,
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function addRow(key: string, rows: Record<string, string>[], blank: Record<string, string>) {
    update(key, [...rows, { ...blank }]);
  }

  if (sectionKey === "doctor_details") {
    const d = data as { fullName?: string; gmcNumber?: string; qualifications?: string; contactEmail?: string; contactPhone?: string };
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input className={inputCls} defaultValue={d.fullName || doctorName} onChange={(e) => update("fullName", e.target.value)} />
        </Field>
        <Field label="GMC number">
          <input className={inputCls} defaultValue={d.gmcNumber || gmcNumber} onChange={(e) => update("gmcNumber", e.target.value)} />
        </Field>
        <Field label="Postgraduate qualifications">
          <input className={inputCls} defaultValue={d.qualifications ?? ""} onChange={(e) => update("qualifications", e.target.value)} placeholder="e.g. MRCGP, MRCP" />
        </Field>
        <Field label="Contact email">
          <input className={inputCls} defaultValue={d.contactEmail ?? ""} onChange={(e) => update("contactEmail", e.target.value)} />
        </Field>
      </div>
    );
  }

  if (sectionKey === "scope_of_work") {
    const roles = (data.roles as Record<string, unknown>[]) ?? [];
    return (
      <div>
        {roles.map((role, i) => (
          <div key={i} className="mb-3 grid gap-3 rounded-xl border border-slate-200 p-3.5 sm:grid-cols-2">
            <Field label="Organisation"><input className={inputCls} value={(role.organisation as string) ?? ""} onChange={(e) => replaceRow("roles", roles as unknown as Record<string, string>[], i, { organisation: e.target.value })} /></Field>
            <Field label="Role"><input className={inputCls} value={(role.role as string) ?? ""} onChange={(e) => replaceRow("roles", roles as unknown as Record<string, string>[], i, { role: e.target.value })} /></Field>
            <Field label="Start date"><input className={inputCls} type="date" value={(role.startDate as string) ?? ""} onChange={(e) => replaceRow("roles", roles as unknown as Record<string, string>[], i, { startDate: e.target.value })} /></Field>
            <Field label="Sessions per week"><input className={inputCls} value={(role.sessionsPerWeek as string) ?? ""} onChange={(e) => replaceRow("roles", roles as unknown as Record<string, string>[], i, { sessionsPerWeek: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm text-slate-700"><span className="text-xs font-medium text-slate-700">Category</span><select className={inputCls} value={(role.roleCategory as string) ?? "CLINICAL"} onChange={(e) => replaceRow("roles", roles as unknown as Record<string, string>[], i, { roleCategory: e.target.value })}><option value="CLINICAL">Clinical</option><option value="EDUCATIONAL">Educational</option><option value="MANAGERIAL">Managerial</option><option value="OTHER">Other</option></select></label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(role.isPrivatePractice)} onChange={(e) => replaceRow("roles", roles as unknown as Record<string, string>[], i, { isPrivatePractice: e.target.checked as unknown as string })} /><span>Private practice</span></label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={Boolean(role.hasOnCallCommitment)} onChange={(e) => replaceRow("roles", roles as unknown as Record<string, string>[], i, { hasOnCallCommitment: e.target.checked as unknown as string })} /><span>On-call commitment</span></label>
            {Boolean(role.hasOnCallCommitment) && <Field label="On-call details" wide><textarea className={inputCls} rows={2} value={(role.onCallDetails as string) ?? ""} onChange={(e) => replaceRow("roles", roles as unknown as Record<string, string>[], i, { onCallDetails: e.target.value })} placeholder="e.g. 1:8 on-call, weekend ward cover" /></Field>}
            <Field label="Extended duties" wide><input className={inputCls} value={(role.extendedDuties as string) ?? ""} onChange={(e) => replaceRow("roles", roles as unknown as Record<string, string>[], i, { extendedDuties: e.target.value })} placeholder="e.g. teaching lead, governance lead" /></Field>
          </div>
        ))}
        <button onClick={() => addRow("roles", roles as unknown as Record<string, string>[], { organisation: "", role: "", roleCategory: "CLINICAL", startDate: "", sessionsPerWeek: "", notes: "", onCallDetails: "", extendedDuties: "" })} className="btn-secondary">
          + Add role
        </button>
        <div className="mt-4 grid gap-3">
          <Field label="Relationships between roles & conflicts of interest (how you manage them)" wide><textarea className={inputCls} rows={3} value={(data.scopeRelationships as string) ?? ""} onChange={(e) => update("scopeRelationships", e.target.value)} placeholder="e.g. MedCo work is independent/private; managed per GMC conflicts-of-interest guidance." /></Field>
          <Field label="Changes to scope since last appraisal" wide><textarea className={inputCls} rows={2} value={(data.scopeChangesSinceLastAppraisal as string) ?? ""} onChange={(e) => update("scopeChangesSinceLastAppraisal", e.target.value)} /></Field>
          <Field label="Envisaged changes in the next year" wide><textarea className={inputCls} rows={2} value={(data.scopeChangesEnvisagedNextYear as string) ?? ""} onChange={(e) => update("scopeChangesEnvisagedNextYear", e.target.value)} /></Field>
        </div>
      </div>
    );
  }

  if (sectionKey === "record_of_appraisals") {
    const rows = (data.previousAppraisals as Record<string, string>[]) ?? [];
    return (
      <div>
        <Field label="Revalidation cycle position" wide>
          <input className={inputCls} defaultValue={(data.revalidationCyclePosition as string) ?? ""} onChange={(e) => update("revalidationCyclePosition", e.target.value)} placeholder="e.g. Year 2 of 5 — last full feedback 2024" />
        </Field>
        <div className="mt-4 space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-3.5 sm:grid-cols-3">
              <Field label="Date"><input className={inputCls} type="date" value={row.date ?? ""} onChange={(e) => replaceRow("previousAppraisals", rows, i, { date: e.target.value })} /></Field>
              <Field label="Outcome"><input className={inputCls} value={row.outcome ?? ""} onChange={(e) => replaceRow("previousAppraisals", rows, i, { outcome: e.target.value })} /></Field>
              <Field label="Appraiser"><input className={inputCls} value={row.appraiser ?? ""} onChange={(e) => replaceRow("previousAppraisals", rows, i, { appraiser: e.target.value })} /></Field>
            </div>
          ))}
        </div>
        <button onClick={() => addRow("previousAppraisals", rows, { date: "", outcome: "", appraiser: "" })} className="btn-secondary mt-3">
          + Add previous appraisal
        </button>
      </div>
    );
  }

  if (sectionKey === "wellbeing") {
    return (
      <div className="space-y-4">
        <Field label="On a scale of 1 (most negative) to 10 (most positive), how are you?" wide>
          <input type="range" min={1} max={10} value={(data.scale1to10 as number) ?? 7} onChange={(e) => update("scale1to10", Number(e.target.value))} className="w-full accent-teal-600" />
          <div className="mt-1 flex justify-between text-[11px] text-slate-400"><span>1 (most negative)</span><span className="font-semibold text-slate-700">{(data.scale1to10 as number) ?? 7}</span><span>10 (most positive)</span></div>
        </Field>
        <Field label="How has the period since your last appraisal impacted you?" wide><textarea rows={3} className={inputCls} defaultValue={(data.periodImpact as string) ?? ""} onChange={(e) => update("periodImpact", e.target.value)} /></Field>
        <Field label="How have you maintained your health and wellbeing? What will you do differently?" wide><textarea rows={3} className={inputCls} defaultValue={(data.healthAndWellbeing as string) ?? ""} onChange={(e) => update("healthAndWellbeing", e.target.value)} /></Field>
        <Field label="Have you needed support and was it available?" wide><textarea rows={3} className={inputCls} defaultValue={(data.supportNeeded as string) ?? ""} onChange={(e) => update("supportNeeded", e.target.value)} /></Field>
      </div>
    );
  }

  if (sectionKey === "achievements") {
    return (
      <div className="grid gap-4">
        <Field label="Achievements and challenges (formative)" wide><textarea rows={3} className={inputCls} defaultValue={(data.achievementsAndChallenges as string) ?? ""} onChange={(e) => update("achievementsAndChallenges", e.target.value)} placeholder="Notable achievements or challenges across all practice" /></Field>
        <Field label="Aspirations (career direction, next year)" wide><textarea rows={3} className={inputCls} defaultValue={(data.aspirations as string) ?? ""} onChange={(e) => update("aspirations", e.target.value)} /></Field>
        <Field label="Anything else to discuss with your appraiser" wide><textarea rows={3} className={inputCls} defaultValue={(data.additionalItems as string) ?? ""} onChange={(e) => update("additionalItems", e.target.value)} /></Field>
      </div>
    );
  }

  if (sectionKey === "additional_info") {
    return <div><Field label="Organisation-specific information (e.g. mandatory training, job plan)" wide><textarea rows={5} className={inputCls} defaultValue={(data.organisationSpecificInfo as string) ?? ""} onChange={(e) => update("organisationSpecificInfo", e.target.value)} /></Field></div>;
  }

  if (sectionKey === "academic_leadership") {
    const appl = Boolean(data.isApplicable);
    return (
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={appl} onChange={(e) => update("isApplicable", e.target.checked)} /><span>Applicable to me this year</span></label>
        {appl && (<>
          <Field label="Teaching / research / leadership activity" wide><textarea rows={4} className={inputCls} defaultValue={(data.details as string) ?? ""} onChange={(e) => update("details", e.target.value)} /></Field>
          <Field label="Personal participation and learning" wide><textarea rows={3} className={inputCls} defaultValue={(data.personalParticipation as string) ?? ""} onChange={(e) => update("personalParticipation", e.target.value)} /></Field>
        </>)}
      </div>
    );
  }

  if (sectionKey === "probity" || sectionKey === "health") {
    const isProbity = sectionKey === "probity";
    const flagKey = isProbity ? "declarations" : "fitToPractise";
    const label = isProbity
      ? "I confirm that I have read and agree to the GMC's good medical practice framework, my immunisations and venepuncture technique are up to date, and there are no ongoing investigations relating to my practice (or details below)."
      : "I confirm that I am fit to practise, and that any health conditions that may affect my practice are appropriately managed (or details below).";
    return (
      <div className="space-y-4">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
          <input type="checkbox" className="mt-1" defaultChecked={(data[flagKey] as boolean) ?? false} onChange={(e) => update(flagKey, e.target.checked)} />
          <span>{label}</span>
        </label>
        <Field label="Details (if applicable)" wide>
          <textarea className={inputCls} rows={4} defaultValue={(data.details as string) ?? ""} onChange={(e) => update("details", e.target.value)} />
        </Field>
        {isProbity && (<>
          <Field label="Suspensions, restrictions on practice or investigations since last appraisal (if any)" wide><textarea rows={3} className={inputCls} defaultValue={(data.suspensionsOrRestrictions as string) ?? ""} onChange={(e) => update("suspensionsOrRestrictions", e.target.value)} /></Field>
          <Field label="Specific information requested by your organisation or responsible officer" wide><textarea rows={2} className={inputCls} defaultValue={(data.requestedInfoByOrganisationOrRO as string) ?? ""} onChange={(e) => update("requestedInfoByOrganisationOrRO", e.target.value)} /></Field>
        </>)}
      </div>
    );
  }

  if (sectionKey === "indemnity") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Indemnity provider"><input className={inputCls} defaultValue={(data.provider as string) ?? ""} onChange={(e) => update("provider", e.target.value)} placeholder="e.g. MDU, MPS, MDDUS — required for non-NHS/private work" /></Field>
        <Field label="Policy / membership number"><input className={inputCls} defaultValue={(data.policyNumber as string) ?? ""} onChange={(e) => update("policyNumber", e.target.value)} /></Field>
        <label className="flex items-center gap-3 text-sm text-slate-700 sm:col-span-2">
          <input type="checkbox" defaultChecked={(data.coversAllRoles as boolean) ?? false} onChange={(e) => update("coversAllRoles", e.target.checked)} />
          Cover extends to every role in my scope of work
        </label>
        <Field label="Notes" wide><textarea className={inputCls} rows={2} defaultValue={(data.notes as string) ?? ""} onChange={(e) => update("notes", e.target.value)} /></Field>
      </div>
    );
  }

  if (sectionKey === "agreed_pdp") {
    const items = (data.items as { title: string; actionOrGoal: string; targetDate: string; evidence: string }[]) ?? [];
    return (
      <div>
        <p className="mb-3 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800">Post-meeting agreed PDP. On submission your proposals are auto-copied here unless the appraiser has already edited this section.</p>
        {items.length === 0 ? <p className="text-sm text-slate-400">No agreed items yet.</p> : (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                <Field label="Need"><input className={inputCls} value={it.title ?? ""} onChange={(e) => { const n=[...items]; n[i]={...n[i], title: e.target.value}; update("items", n);} } /></Field>
                <Field label="Action / goal"><input className={inputCls} value={it.actionOrGoal ?? ""} onChange={(e) => { const n=[...items]; n[i]={...n[i], actionOrGoal: e.target.value}; update("items", n);} } /></Field>
                <Field label="Target date"><input type="date" className={inputCls} value={it.targetDate ?? ""} onChange={(e) => { const n=[...items]; n[i]={...n[i], targetDate: e.target.value}; update("items", n);} } /></Field>
                <Field label="How demonstrated"><input className={inputCls} value={it.evidence ?? ""} onChange={(e) => { const n=[...items]; n[i]={...n[i], evidence: e.target.value}; update("items", n);} } /></Field>
              </div>
            ))}
          </div>
        )}
        <button className="btn-secondary mt-3" onClick={() => update("items", [...items, { title: "", actionOrGoal: "", targetDate: "", evidence: "" }])}>+ Add agreed item</button>
      </div>
    );
  }

  if (sectionKey === "appraisal_outputs") {
    const labels = ["1", "2", "3", "4", "5"] as const;
    const texts: Record<string, string> = {
      "1": "An appraisal has taken place that reflects the whole scope and the principles & values of Good Medical Practice.",                      "2": "Appropriate supporting information per the GMP framework has been presented and reflects the nature & scope of work.",
      "3": "A review that demonstrates progress against last year's PDP has taken place.",
      "4": "An agreement has been reached about a new PDP and associated actions for the coming year.",
      "5": "No information has been presented or discussed that raises a concern about fitness to practise.",
    };
    return (
      <div className="space-y-4">
        {(labels as readonly string[]).map((n) => (
          <label key={n} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={Boolean(data[(`statement${n}` as string)] )} onChange={(e) => update(`statement${n}`, e.target.checked)} /><span><span className="font-semibold">{n}.</span> {texts[n]}</span></label>
        ))}
        <Field label="Reasons for these statements (for the RO)" wide><textarea rows={3} className={inputCls} value={(data.reasonsForStatements as string) ?? ""} onChange={(e) => update("reasonsForStatements", e.target.value)} /></Field>
        <Field label="Other issues the RO should be aware of" wide><textarea rows={3} className={inputCls} value={(data.otherIssuesForRO as string) ?? ""} onChange={(e) => update("otherIssuesForRO", e.target.value)} /></Field>
        <Field label="Clinician response (visible to RO)" wide><textarea rows={2} className={inputCls} value={(data.clinicianResponse as string) ?? ""} onChange={(e) => update("clinicianResponse", e.target.value)} /></Field>
      </div>
    );
  }

  if (sectionKey === "appraiser_checklist") {
    return (
      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={Boolean(data.agreedPdpDescribesNeeds)} onChange={(e) => update("agreedPdpDescribesNeeds", e.target.checked)} /><span>The agreed PDP describes learning needs, how they will be achieved and how they will be demonstrated.</span></label>
        <Field label="Completeness / exceptions" wide><textarea rows={3} className={inputCls} value={(data.completenessComments as string) ?? ""} onChange={(e) => update("completenessComments", e.target.value)} /></Field>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700"><input type="checkbox" checked={Boolean(data.verifiedCliniciansChecklist)} onChange={(e) => update("verifiedCliniciansChecklist", e.target.checked)} /><span>I have verified the clinician&apos;s checklist and commented on completeness / exceptions.</span></label>
      </div>
    );
  }

  return <p className="text-sm text-slate-400">This section is managed on its dedicated page.</p>;
}

function SectionView({ data }: { data: Record<string, unknown> }) {
  const fmt: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === "boolean") fmt[k] = v ? "Yes" : "No";
    else if (Array.isArray(v)) fmt[k] = v.length ? JSON.stringify(v, null, 1) : "(none)";
    else if (typeof v === "string" && v.trim()) fmt[k] = v;
  }
  const entries = Object.entries(fmt);
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {entries.length === 0 && <p className="text-sm text-slate-400">No data recorded for this section.</p>}
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k.replace(/([A-Z])/g, " $1")}</dt>
          <dd className="whitespace-pre-wrap text-sm text-slate-700">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

