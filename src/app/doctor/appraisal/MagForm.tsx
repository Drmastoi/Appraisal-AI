"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MAG_SECTIONS } from "@/lib/appraisal";
import { parseSectionData } from "@/lib/sections";

type Counts = { cpd: number; qi: number; events: number; pdp: number; colleagueCycles: number; patientCycles: number };

function computeStatuses(list: { sectionKey: string; data: string }[], c: Counts): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const section of MAG_SECTIONS) {
    const data = parseSectionData(section.key, list.find((x) => x.sectionKey === section.key)?.data ?? "{}");
    const meaningful = Object.values(data).some((v) => {
      if (typeof v === "string") return v.trim() !== "";
      if (typeof v === "boolean") return v === true;
      if (Array.isArray(v)) return v.length > 0;
      return false;
    });
    out[section.key] = meaningful;
  }
  out.cpd = c.cpd > 0;
  out.quality_improvement = c.qi > 0;
  out.significant_events = c.events > 0;
  out.colleague_feedback = c.colleagueCycles > 0;
  out.patient_feedback = c.patientCycles > 0;
  out.pdp_review = c.pdp > 0;
  out.new_pdp = c.pdp > 0;
  return out;
}

export default function MagForm({
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
  const [statuses, setStatuses] = useState<Record<string, boolean>>(() => computeStatuses(sections, counts));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const locked = status !== "DRAFT";

  const dataMap = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const s of MAG_SECTIONS) m.set(s.key, parseSectionData(s.key, sections.find((x) => x.sectionKey === s.key)?.data ?? "{}"));
    return m;
  }, [sections]);

  async function saveSection(key: string, data: Record<string, unknown>) {
    setSaveState("saving");
    const res = await fetch(`/api/appraisal/sections/${key}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }) });
    if (res.ok) {
      setSaveState("saved");
      setStatuses((s) => ({ ...s, [key]: Object.values(data).some((v) => (typeof v === "string" ? v.trim() !== "" : typeof v === "boolean" ? v === true : Array.isArray(v) ? v.length > 0 : false)) }));
      setTimeout(() => setSaveState("idle"), 1500);
      return true;
    }
    setSaveState("error");
    return false;
  }

  async function submit() {
    setBusy(true);
    setSubmitError(null);
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
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {saveState === "saving" && <span className="text-slate-400">Saving…</span>}
            {saveState === "saved" && <span className="text-green-700">All changes saved</span>}
            {saveState === "error" && <span className="text-red-700">Save failed — check your connection and retry</span>}
            {saveState === "idle" && <span>Complete each section — entries save automatically</span>}
          </div>
          {!locked && (
            <button onClick={submit} disabled={busy} className="btn-primary">{busy ? "Submitting…" : "Submit to appraiser"}</button>
          )}
        </div>
      </div>
      {submitError && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>}

      <div className="space-y-2">
        {MAG_SECTIONS.map((section, idx) => {
          const isOpen = openKey === section.key;
          const done = statuses[section.key];
          const isAppraiserSection = section.owner === "APPRAISER";
          return (
            <div key={section.key} className="card overflow-hidden">
              <button
                onClick={() => setOpenKey(isOpen ? null : section.key)}
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="mb-4 text-xs text-slate-500">{section.description}</p>
                  {isAppraiserSection ? (
                    <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm leading-relaxed text-violet-800">
                      This section is completed by your appraiser during review{locked && status === "SIGNED_OFF" ? " — see the signed-off summary" : ""}.
                    </p>
                  ) : locked ? (
                    <SectionView data={dataMap.get(section.key) ?? {}} />
                  ) : (
                    <SectionEditor
                      sectionKey={section.key}
                      initial={dataMap.get(section.key) ?? {}}
                      doctorName={doctorName}
                      gmcNumber={gmcNumber}
                      onSave={(data) => saveSection(section.key, data)}
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

export function SectionEditor({
  sectionKey,
  initial,
  doctorName,
  gmcNumber,
  onSave,
}: {
  sectionKey: string;
  initial: Record<string, unknown>;
  doctorName: string;
  gmcNumber: string;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
}) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  function update(key: string, value: unknown) {
    const next = { ...data, [key]: value };
    setData(next);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => onSave(next), 700);
    setTimer(t);
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
    const d = initial as { fullName?: string; gmcNumber?: string; qualifications?: string; contactEmail?: string; contactPhone?: string };
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

