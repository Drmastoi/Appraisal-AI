"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AiSuggestButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/ai/pdp-suggestions", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "AI suggestions failed");
      return;
    }
    const lines = (data.text as string).split("\n").map((l: string) => l.replace(/^\d+\.\s*/, "").trim()).filter((l: string) => l.length > 10);
    setSuggestions(lines.length ? lines : [data.text as string]);
  }

  async function addToPdp(objective: string) {
    setBusy(true);
    await fetch("/api/pdp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: objective.slice(0, 300), description: "Added from AI suggestion — edit to make it yours." }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="chip-ai"
      >
        {busy ? "Thinking…" : "✦ Suggest objectives with AI"}
      </button>
      {error && <span className="ml-2 text-xs text-red-700">{error}</span>}
      {suggestions && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s, i) => (
            <li key={i} className="flex items-start justify-between gap-2 rounded-md border border-teal-200 bg-teal-50/40 px-3 py-2 text-sm text-slate-700">
              <span>{s}</span>
              <button onClick={() => addToPdp(s)} disabled={busy} className="chip-primary shrink-0">
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[11px] text-slate-400">Suggestions are drafts informed by your portfolio — choose and edit them to fit your development needs.</p>
    </div>
  );
}
