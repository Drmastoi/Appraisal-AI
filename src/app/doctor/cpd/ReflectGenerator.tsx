"use client";
import { useState } from "react";

const PROMPTS = [
  "What was the learning need you identified, and why?",
  "What does this tell you about what you do well and where you could improve?",
  "How will this change your practice or approach to patients?",
  "What will you do next — and when will you review whether it worked?",
];

export default function ReflectGenerator({ title, onInsert }: { title: string; onInsert: (text: string) => void }) {
  const [answers, setAnswers] = useState<string[]>(Array(PROMPTS.length).fill(""));
  function build() {
    const lines = ["GMC-aligned reflective note — edit before saving:", ""];
    if (title.trim()) lines.push(`Learning: ${title.trim()}`);
    for (let i = 0; i < PROMPTS.length; i++) {
      const a = answers[i]?.trim();
      if (a) { lines.push("", `Q: ${PROMPTS[i]}`, `A: ${a}`); }
    }
    onInsert(lines.join("\n"));
  }
  return (
    <details className="rounded-xl border border-teal-200 bg-teal-50/40 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-teal-800">GMC-aligned reflection prompts</summary>
      <p className="mt-2 text-xs text-slate-500">Answer the prompts, then insert the draft into your reflection field and refine it — reflections must be your own.</p>
      <div className="mt-3 space-y-3">
        {PROMPTS.map((p, i) => (
          <label key={i} className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{i + 1}. {p}</span><textarea className="field text-xs" rows={2} value={answers[i]} onChange={(e) => { const v = [...answers]; v[i] = e.target.value; setAnswers(v); }} /></label>
        ))}
        <button type="button" onClick={build} className="btn-primary text-xs">Insert into reflection</button>
      </div>
    </details>
  );
}
