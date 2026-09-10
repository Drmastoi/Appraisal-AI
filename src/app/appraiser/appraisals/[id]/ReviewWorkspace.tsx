"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAG_SECTIONS } from "@/lib/appraisal";
import { GMP_DOMAINS, GMP_THEMES_2024, parseSectionData } from "@/lib/sections";
import { SectionEditor } from "@/app/doctor/appraisal/MagForm";

type Comment = { id: string; sectionKey: string; body: string; resolved: boolean; createdAt: Date | string; parentId: string | null; author: { id: string; name: string; role: string } };
type Pdp = { id: string; title: string; description: string | null; status: string; source: string; progressNote: string | null; previousObjective?: { title: string } | null };
type Cycle = { id: string; cycleType: string; status: string; minResponses: number; responseCount: number };

export default function ReviewWorkspace(props: {
  appraisalId: string;
  status: string;
  doctorName: string;
  doctorId: string;
  sections: { sectionKey: string; data: string }[];
  cpd: { id: string; date: Date; title: string; activityType: string; points: number; reflection: string | null; impactOnPractice: string | null }[];
  qi: { id: string; date: Date; title: string; entryType: string; description: string; outcome: string | null }[];
  events: { id: string; date: Date; title: string; eventType: string; description: string; reflection: string | null; outcome: string | null }[];
  pdp: Pdp[];
  cycles: Cycle[];
  attachments: { id: string; filename: string }[];
  initialComments: Comment[];
  currentUserId: string;
  signedOffAt: Date | null;
  meetingDate: Date | null;
}) {
  const router = useRouter();
  const [openKey, setOpenKey] = useState<string | null>("doctor_details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignoff, setShowSignoff] = useState(false);

  async function action(url: string, body: unknown, method = "POST") {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError([data.error, ...(data.details ?? [])].filter(Boolean).join(" — ") || "Action failed");
      return false;
    }
    router.refresh();
    return true;
  }

  const isSubmitted = props.status === "SUBMITTED";
  const inReview = props.status === "IN_REVIEW";
  const signed = props.status === "SIGNED_OFF";

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-sm text-slate-600">Workflow:</span>
        {(isSubmitted || inReview) && <AiSummaryButton appraisalId={props.appraisalId} />}
        {isSubmitted && (
          <>
            <button onClick={() => action(`/api/appraiser/appraisals/${props.appraisalId}/review`, { action: "START_REVIEW" })} disabled={busy} className="btn-primary">Start review</button>
            <button onClick={() => action(`/api/appraiser/appraisals/${props.appraisalId}/review`, { action: "REQUEST_CHANGES" })} disabled={busy} className="btn-secondary text-amber-700 hover:bg-amber-50 hover:text-amber-800">Request changes</button>
          </>
        )}
        {inReview && (
          <>
            <button onClick={() => setShowSignoff((v) => !v)} className="btn-primary">Sign off appraisal</button>
            <button onClick={() => action(`/api/appraiser/appraisals/${props.appraisalId}/review`, { action: "REQUEST_CHANGES" })} disabled={busy} className="btn-secondary text-amber-700 hover:bg-amber-50 hover:text-amber-800">Request changes</button>
          </>
        )}
        {signed && <span className="text-sm font-medium text-green-700">Signed off{props.signedOffAt ? ` on ${new Date(props.signedOffAt).toLocaleDateString("en-GB")}` : ""} — locked</span>}
        {!isSubmitted && !inReview && !signed && <span className="text-sm text-slate-500">Waiting for the doctor to submit.</span>}
      </div>

      {showSignoff && inReview && <SignoffPanel appraisalId={props.appraisalId} onDone={() => { setShowSignoff(false); router.refresh(); }} />}

      <div className="space-y-2">
        {MAG_SECTIONS.map((section) => {
          const isOpen = openKey === section.key;
          const isAppraiserSection = section.owner === "APPRAISER";
          const sectionComments = props.initialComments.filter((c) => c.sectionKey === section.key);
          return (
            <div key={section.key} className="card overflow-hidden">
              <button onClick={() => setOpenKey(isOpen ? null : section.key)} className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-800">{section.title}</span>
                  {isAppraiserSection && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">YOURS TO COMPLETE</span>}
                  {sectionComments.some((c) => !c.resolved) && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{sectionComments.filter((c) => !c.resolved).length} OPEN</span>}
                </div>
                <span className="text-slate-400">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="space-y-4 border-t border-slate-100 px-5 py-4">
                  <SectionData sectionKey={section.key} data={props.sections.find((s) => s.sectionKey === section.key)?.data ?? "{}"} cpd={props.cpd} qi={props.qi} events={props.events} pdp={props.pdp} cycles={props.cycles} />

                  {(inReview || isSubmitted || signed) && (
                    <CommentThread
                      appraisalId={props.appraisalId}
                      sectionKey={section.key}
                      comments={sectionComments}
                      currentUserId={props.currentUserId}
                      disabled={signed}
                    />
                  )}

                  {isAppraiserSection && section.key === "appraiser_summary" && inReview && (
                    <AppraiserSummaryEditor appraisalId={props.appraisalId} initial={parseSectionData("appraiser_summary", props.sections.find((s) => s.sectionKey === "appraiser_summary")?.data ?? "{}")} />
                  )}
                  {isAppraiserSection && section.key !== "appraiser_summary" && inReview && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50/20 p-3">
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-800">{section.shortTitle} — appraiser to complete</h4>
                      <SectionEditor
                        sectionKey={section.key}
                        initial={parseSectionData(section.key, props.sections.find((s) => s.sectionKey === section.key)?.data ?? "{}")}
                        doctorName={props.doctorName}
                        gmcNumber=""
                        onSave={async (data) => action(`/api/appraiser/appraisals/${props.appraisalId}/sections/${section.key}`, { data }, "PUT")}
                      />
                    </div>
                  )}
                  {isAppraiserSection && !inReview && !signed && <p className="text-sm text-slate-400">Available once you start the review — {section.shortTitle}.</p>}
                  {!isAppraiserSection && inReview && (
                    <details className="rounded-xl border border-slate-200 px-4 py-2">
                      <summary className="cursor-pointer text-sm font-medium text-slate-600">Edit section (tracked — recorded in version history)</summary>
                      <div className="pt-3">
                        <SectionEditor
                          sectionKey={section.key}
                          initial={parseSectionData(section.key, props.sections.find((s) => s.sectionKey === section.key)?.data ?? "{}")}
                          doctorName={props.doctorName}
                          gmcNumber=""
                          onSave={async (data) => action(`/api/appraiser/appraisals/${props.appraisalId}/sections/${section.key}`, { data }, "PUT")}
                        />
                      </div>
                    </details>
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

function SectionData({ sectionKey, data, cpd, qi, events, pdp, cycles }: {
  sectionKey: string; data: string;
  cpd: { id: string; date: Date; title: string; activityType: string; points: number; reflection: string | null; impactOnPractice: string | null }[];
  qi: { id: string; date: Date; title: string; entryType: string; description: string; outcome: string | null }[];
  events: { id: string; date: Date; title: string; eventType: string; description: string; reflection: string | null; outcome: string | null }[];
  pdp: Pdp[]; cycles: Cycle[];
}) {
  if (sectionKey === "cpd") {
    const total = cpd.reduce((s, e) => s + e.points, 0);
    return (
      <div className="text-sm text-slate-700">
        <p className="mb-2 font-medium">{cpd.length} entr(ies) · {total} points</p>
        {cpd.length === 0 ? <p className="text-slate-400">No CPD logged.</p> : (
          <ul className="space-y-2">
            {cpd.map((e) => (
              <li key={e.id} className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="font-medium">{e.title} <span className="text-xs text-slate-400">{new Date(e.date).toLocaleDateString("en-GB")} · {e.activityType} · {e.points} pts</span></div>
                {e.reflection && <p className="mt-0.5 text-slate-600">Reflection: {e.reflection}</p>}
                {e.impactOnPractice && <p className="text-slate-500">Impact: {e.impactOnPractice}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (sectionKey === "quality_improvement") {
    return (
      <ul className="space-y-2 text-sm text-slate-700">
        {qi.length === 0 ? <p className="text-slate-400">No QI activity.</p> : qi.map((e) => (
          <li key={e.id} className="rounded-xl border border-slate-200 px-3 py-2">
            <div className="font-medium">{e.title} <span className="text-xs text-slate-400">{new Date(e.date).toLocaleDateString("en-GB")} · {e.entryType.replace(/_/g, " ")}</span></div>
            <p className="text-slate-600">{e.description}</p>
            {e.outcome && <p className="text-slate-500">Outcome: {e.outcome}</p>}
          </li>
        ))}
      </ul>
    );
  }
  if (sectionKey === "significant_events" || sectionKey === "complaints") {
    const filtered = events.filter((e) => (sectionKey === "complaints" ? e.eventType === "COMPLAINT" : e.eventType === "SIGNIFICANT_EVENT"));
    return (
      <ul className="space-y-2 text-sm text-slate-700">
        {filtered.length === 0 ? <p className="text-slate-400">Nothing declared.</p> : filtered.map((e) => (
          <li key={e.id} className="rounded-xl border border-slate-200 px-3 py-2">
            <div className="font-medium">{e.title} <span className="text-xs text-slate-400">{new Date(e.date).toLocaleDateString("en-GB")}</span></div>
            <p className="text-slate-600">{e.description}</p>
            {e.reflection && <p className="text-slate-500">Reflection: {e.reflection}</p>}
            {e.outcome && <p className="text-slate-500">Outcome: {e.outcome}</p>}
          </li>
        ))}
      </ul>
    );
  }
  if (sectionKey === "colleague_feedback" || sectionKey === "patient_feedback") {
    const filtered = cycles.filter((c) => c.cycleType === (sectionKey === "colleague_feedback" ? "COLLEAGUE" : "PATIENT"));
    return (
      <ul className="space-y-2 text-sm text-slate-700">
        {filtered.length === 0 ? <p className="text-slate-400">No feedback cycles.</p> : filtered.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 px-3 py-2">
            {c.status} cycle · {c.responseCount} response(s) (minimum {c.minResponses})
          </li>
        ))}
      </ul>
    );
  }
  if (sectionKey === "pdp_review" || sectionKey === "new_pdp") {
    const filtered = sectionKey === "pdp_review"
      ? pdp.filter((o) => o.status === "ACHIEVED" || o.status === "NOT_ACHIEVED" || o.status === "CARRIED_FORWARD" || o.source === "CARRIED_FORWARD")
      : pdp;
    return (
      <ul className="space-y-2 text-sm text-slate-700">
        {filtered.length === 0 ? <p className="text-slate-400">No objectives.</p> : filtered.map((o) => (
          <li key={o.id} className="rounded-xl border border-slate-200 px-3 py-2">
            <div className="font-medium">{o.title} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{o.status.replace(/_/g, " ")}</span></div>
            {o.description && <p className="text-slate-600">{o.description}</p>}
            {o.progressNote && <p className="text-slate-500">Note: {o.progressNote}</p>}
          </li>
        ))}
      </ul>
    );
  }
  const parsed = parseSectionData(sectionKey, data);
  const entries2 = Object.entries(parsed).filter(([, v]) => {
    if (typeof v === "string") return v.trim() !== "";
    if (typeof v === "boolean") return v === true;
    if (Array.isArray(v)) return v.length > 0;
    return false;
  });
  if (entries2.length === 0) return <p className="text-sm text-slate-400">Nothing recorded in this section yet.</p>;
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {entries2.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k.replace(/([A-Z])/g, " $1")}</dt>
          <dd className="whitespace-pre-wrap text-slate-700">{typeof v === "boolean" ? "Yes" : Array.isArray(v) ? `${v.length} item(s)` : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function CommentThread({ appraisalId, sectionKey, comments, currentUserId, disabled }: {
  appraisalId: string; sectionKey: string; comments: Comment[]; currentUserId: string; disabled: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function post() {
    if (!body.trim()) return;
    setBusy(true);
    await fetch(`/api/appraiser/appraisals/${appraisalId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionKey, body }),
    });
    setBody("");
    setBusy(false);
    router.refresh();
  }

  async function toggleResolve(id: string, resolved: boolean) {
    setBusy(true);
    await fetch(`/api/appraiser/appraisals/${appraisalId}/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-md bg-slate-50 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Discussion ({comments.length})</h4>
      <ul className="space-y-2">
        {comments.map((c) => (
          <li key={c.id} className={`rounded-xl border px-3 py-2 text-sm ${c.resolved ? "border-slate-200 bg-white opacity-70" : "border-teal-200 bg-white"}`}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-800">{c.author.name} <span className="text-xs font-normal text-slate-400">{c.author.role} · {new Date(c.createdAt).toLocaleString("en-GB")}</span></span>
              {c.author.id === currentUserId && !disabled && (
                <button onClick={() => toggleResolve(c.id, !c.resolved)} disabled={busy} className="text-xs text-teal-700 hover:underline disabled:opacity-50">
                  {c.resolved ? "Reopen" : "Resolve"}
                </button>
              )}
            </div>
            <p className="mt-1 text-slate-700">{c.body}</p>
          </li>
        ))}
      </ul>
      {!disabled && (
        <div className="mt-2 flex gap-2">
          <input
            className="field min-w-0 flex-1"
            placeholder="Add a comment for the doctor (or reply)…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && post()}
          />
          <button onClick={post} disabled={busy || !body.trim()} className="chip-dark">Send</button>
        </div>
      )}
    </div>
  );
}

function AppraiserSummaryEditor({ appraisalId, initial }: { appraisalId: string; initial: Record<string, unknown> }) {
  const router = useRouter();
  const [data, setData] = useState({
    discussionSummary: (initial.discussionSummary as string) ?? "",
    agreements: (initial.agreements as string) ?? "",
    outputs: (initial.outputs as string) ?? "",
    pdpAgreed: (initial.pdpAgreed as boolean) ?? false,
    mirroredSectionComments: (initial.mirroredSectionComments as Record<string, string>) ?? {},
    gmpDomains: (initial.gmpDomains as string[]) ?? [],
    gmpThemes: (initial.gmpThemes as string[]) ?? [],
    wellbeingDiscussion: (initial.wellbeingDiscussion as string) ?? "",
  });
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [sectionNoteKey, setSectionNoteKey] = useState<string>(MAG_SECTIONS.find((s) => s.owner === "DOCTOR")?.key ?? "doctor_details");
  const [sectionNote, setSectionNote] = useState("");

  async function save(next: typeof data) {
    setData(next);
    const res = await fetch(`/api/appraiser/appraisals/${appraisalId}/sections/appraiser_summary`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: next }),
    });
    setState(res.ok ? "saved" : "error");
    if (res.ok) router.refresh();
  }

  function toggle(arr: string[], value: string, field: "gmpDomains" | "gmpThemes") {
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    save({ ...data, [field]: next });
  }

  function saveSectionNote() {
    if (!sectionNote.trim()) return;
    const next = { ...data.mirroredSectionComments, [sectionNoteKey]: sectionNote.trim() };
    setSectionNote("");
    save({ ...data, mirroredSectionComments: next });
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
      <h4 className="mb-3 text-sm font-semibold text-violet-900">Appraiser&apos;s summary — GMP 2024 + per-section mirrored comments</h4>
      <div className="space-y-4">
        <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Summary of the appraisal discussion</span>
          <textarea rows={5} className="field" value={data.discussionSummary} onChange={(e) => save({ ...data, discussionSummary: e.target.value })} />
        </label>

        <div className="rounded-xl border border-violet-200 bg-white/80 p-3">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-violet-800">Per-section mirrored discussion notes</h5>
          <p className="mt-1 text-xs text-slate-500">Record what was discussed for each MAG section — mirrored into the summary and the PDF/RO bundle.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
            <select className="field" value={sectionNoteKey} onChange={(e) => { setSectionNoteKey(e.target.value); setSectionNote(data.mirroredSectionComments[e.target.value] ?? ""); }}>
              {MAG_SECTIONS.filter((s) => s.owner === "DOCTOR").map((s) => (<option key={s.key} value={s.key}>{s.title}</option>))}
            </select>
            <button type="button" onClick={saveSectionNote} className="btn-secondary">Save section note</button>
          </div>
          <textarea rows={3} className="field mt-2" value={sectionNote} onChange={(e) => setSectionNote(e.target.value)} placeholder="What was discussed / agreed for this section…" />
          {Object.keys(data.mirroredSectionComments).length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {Object.entries(data.mirroredSectionComments).map(([k, v]) => (
                <li key={k} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <span><span className="font-semibold">{k.replace(/_/g, " ")}:</span> {String(v).slice(0, 120)}{String(v).length > 120 ? "…" : ""}</span>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => { const c = { ...data.mirroredSectionComments }; delete c[k]; save({ ...data, mirroredSectionComments: c }); }}>Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-600">GMP 2024 — 4 domains</h5>
            <div className="mt-2 space-y-1.5">
              {GMP_DOMAINS.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={data.gmpDomains.includes(d)} onChange={() => toggle(data.gmpDomains, d, "gmpDomains")} /><span>{d}</span></label>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-600">GMP 2024 — 5 themes</h5>
            <div className="mt-2 space-y-1.5">
              {GMP_THEMES_2024.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={data.gmpThemes.includes(t)} onChange={() => toggle(data.gmpThemes, t, "gmpThemes")} /><span>{t}</span></label>
              ))}
            </div>
          </div>
        </div>

        <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Health &amp; wellbeing discussion</span>
          <textarea rows={3} className="field" value={data.wellbeingDiscussion} onChange={(e) => save({ ...data, wellbeingDiscussion: e.target.value })} placeholder="Record the wellbeing conversation, support needs and any actions." />
        </label>

        <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Agreements reached</span>
          <textarea rows={3} className="field" value={data.agreements} onChange={(e) => save({ ...data, agreements: e.target.value })} />
        </label>
        <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">Appraisal outputs (e.g. PDP agreed, feedback reviewed)</span>
          <textarea rows={3} className="field" value={data.outputs} onChange={(e) => save({ ...data, outputs: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={data.pdpAgreed} onChange={(e) => save({ ...data, pdpAgreed: e.target.checked })} />
          The PDP has been discussed and agreed with the doctor
        </label>
        {state === "saved" && <p className="text-xs text-green-700">Saved</p>}
        {state === "error" && <p className="text-xs text-red-700">Save failed</p>}
      </div>
    </div>
  );
}

function AiSummaryButton({ appraisalId }: { appraisalId: string }) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/appraiser/ai-summary/${appraisalId}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "AI summary failed");
      return;
    }
    setText(data.text as string);
  }

  return (
    <div className="w-full">
      <button onClick={generate} disabled={busy} className="chip-ai">
        {busy ? "Summarising…" : "✦ AI pre-appraisal summary"}
      </button>
      {error && <span className="ml-2 text-xs text-red-700">{error}</span>}
      {text && (
        <div className="mt-3 w-full rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-sm text-slate-700">
          <p className="whitespace-pre-wrap">{text}</p>
          <p className="mt-2 text-[11px] text-slate-400">AI-generated draft — verify against the portfolio before relying on it.</p>
        </div>
      )}
    </div>
  );
}

function SignoffPanel({ appraisalId, onDone }: { appraisalId: string; onDone: () => void }) {
  const [statement, setStatement] = useState("I confirm this appraisal took place, that the summary and agreed PDP accurately record the discussion, and that I have no unresolved concerns about the doctor's practice.");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sign() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/appraiser/appraisals/${appraisalId}/signoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement, meetingDate }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError([data.error, ...(data.details ?? [])].filter(Boolean).join(" — "));
      return;
    }
    onDone();
  }

  return (
    <div className="rounded-2xl border-2 border-teal-600 bg-teal-50/50 p-5 shadow-md">
      <h3 className="text-sm font-bold text-teal-900">Electronic sign-off</h3>
      <p className="mt-1 text-xs text-teal-800">Signing locks the appraisal, records your e-signature, and seeds next year&apos;s appraisal with the agreed PDP.</p>
      <label className="mt-3 block text-sm"><span className="mb-1 block font-medium text-slate-700">Declaration</span>
        <textarea rows={3} className="field" value={statement} onChange={(e) => setStatement(e.target.value)} />
      </label>
      <label className="mt-3 block text-sm"><span className="mb-1 block font-medium text-slate-700">Appraisal meeting date</span>
        <input type="date" className="field w-auto" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
      </label>
      {error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button onClick={sign} disabled={busy} className="btn-primary mt-4 px-5 py-2.5">
        {busy ? "Signing…" : "Sign and lock appraisal"}
      </button>
    </div>
  );
}
