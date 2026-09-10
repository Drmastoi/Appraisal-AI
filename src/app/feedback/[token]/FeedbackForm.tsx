"use client";

import { useState } from "react";
import { cycleQuestions, LIKERT_LABELS } from "@/lib/feedback";

export default function FeedbackForm({ cycleType, token }: { cycleType: "COLLEAGUE" | "PATIENT"; token: string }) {
  const { likert, freeText } = cycleQuestions(cycleType);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [relationship, setRelationship] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answeredAll = likert.every((q) => ratings[q.id]);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/feedback/public/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings, freeText: answers, relationship: relationship || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Submission failed");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-6 rounded-md bg-green-50 px-4 py-6 text-center">
        <p className="text-sm font-medium text-green-800">Thank you — your feedback has been submitted anonymously.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {cycleType === "COLLEAGUE" ? "How would you describe your working relationship with this doctor?" : "Optional: your relationship to the doctor"}
        </label>
        <input
          className="field"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder={cycleType === "COLLEAGUE" ? "e.g. nursing colleague, manager, GP registrar" : "e.g. patient, carer"}
        />
      </div>

      <div className="space-y-4">
        {likert.map((q) => (
          <div key={q.id} className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-800">{q.text}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LIKERT_LABELS.map((label, idx) => (
                <label key={label} className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition-colors ${ratings[q.id] === idx + 1 ? "border-teal-600 bg-teal-50 font-semibold text-teal-800 ring-1 ring-teal-600" : "border-slate-300 text-slate-600 hover:bg-slate-50"}`}>
                  <input type="radio" name={q.id} className="sr-only" checked={ratings[q.id] === idx + 1} onChange={() => setRatings((r) => ({ ...r, [q.id]: idx + 1 }))} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {freeText.map((q) => (
          <label key={q.id} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{q.text}</span>
            <textarea
              rows={3}
              className="field"
              placeholder={q.placeholder}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            />
          </label>
        ))}
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <button onClick={submit} disabled={!answeredAll || busy} className="btn-primary w-full py-2.5">
        {busy ? "Submitting…" : answeredAll ? "Submit anonymous feedback" : "Answer all rating questions to submit"}
      </button>
    </div>
  );
}
