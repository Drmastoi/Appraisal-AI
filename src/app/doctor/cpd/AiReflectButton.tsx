"use client";

import { useState } from "react";

export default function AiReflectButton({
  title,
  category,
  onDraft,
}: {
  title: string;
  category: string;
  onDraft: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!title.trim()) {
      setError("Enter the CPD title first");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/ai/cpd-reflection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category: category || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "AI draft failed");
      return;
    }
    onDraft(data.text as string);
  }

  return (
    <div>
      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="chip-ai"
      >
        {busy ? "Drafting…" : "✦ Draft reflection with AI"}
      </button>
      {error && <span className="ml-2 text-xs text-red-700">{error}</span>}
      <p className="mt-1 text-[11px] text-slate-400">AI drafts are suggestions — edit them so the reflection is genuinely yours. All AI use is logged and approval-recorded.</p>
    </div>
  );
}
