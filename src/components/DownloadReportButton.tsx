"use client";

import { useState } from "react";

/**
 * Fetches an appraisal export inline (blob download, no page navigation) and
 * triggers a download. Shows a busy state while generating and a retry-on-error
 * state if the fetch fails.
 *
 * Variants:
 *  - "pdf"       → GET /api/appraisals/[id]/export      (branded PDF, doctor/appraiser/admin)
 *  - "ro-bundle" → GET /api/admin/ro-bundle/[id]        (MAG output JSON, admin only, signed-off only)
 */
export default function DownloadReportButton({
  appraisalId,
  variant = "pdf",
  filename,
  className = "chip-primary",
  label,
}: {
  appraisalId: string;
  variant?: "pdf" | "ro-bundle";
  /** Suggested download filename, e.g. appraisal-2026-7400002.pdf */
  filename?: string;
  className?: string;
  label?: string;
}) {
  const endpoint =
    variant === "ro-bundle" ? `/api/admin/ro-bundle/${appraisalId}` : `/api/appraisals/${appraisalId}/export`;
  const defaultFilename = variant === "ro-bundle" ? "ro-bundle.json" : "appraisal-report.pdf";
  const defaultLabel = variant === "ro-bundle" ? "RO bundle" : "Download report";
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function download() {
    setState("busy");
    try {
      const res = await fetch(endpoint, {
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? defaultFilename;
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
      {state === "busy" ? "Preparing…" : state === "error" ? "Failed — retry" : label ?? defaultLabel}
    </button>
  );
}
