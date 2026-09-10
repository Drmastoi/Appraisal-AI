"use client";

import { useState } from "react";

/**
 * Fetches the branded appraisal PDF inline (blob download, no page navigation)
 * from GET /api/appraisals/[id]/export. Shows a busy state while generating
 * and a retry-on-error state if the fetch fails.
 */
export default function DownloadReportButton({
  appraisalId,
  filename,
  className = "chip-primary",
  label = "Download report",
}: {
  appraisalId: string;
  /** Suggested download filename, e.g. appraisal-2026-7400002.pdf */
  filename?: string;
  className?: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function download() {
    setState("busy");
    try {
      const res = await fetch(`/api/appraisals/${appraisalId}/export`, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? "appraisal-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2500);
    }
  }

  return (
    <button type="button" onClick={download} disabled={state === "busy"} className={className}>
      {state === "busy" ? "Preparing…" : state === "error" ? "Failed — retry" : label}
    </button>
  );
}
