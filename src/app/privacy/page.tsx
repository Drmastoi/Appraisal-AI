import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, pageOpenGraph } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy at a glance — AppraisalPortal UK",
  description:
    "How AppraisalPortal UK handles appraisal data: UK GDPR basis, UK data residency, AI draft-only processing and the audit trail.",
  alternates: { canonical: absoluteUrl("/privacy") },
  openGraph: pageOpenGraph("/privacy"),
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-12">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Privacy at a glance</h1>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
          <p>
            This portal holds your appraisal portfolio — MAG form sections, CPD entries, quality improvement activity, declared
            events, PDP objectives, and supporting documents — on behalf of your designated body.
          </p>
          <p>
            <span className="font-medium text-slate-800">360° feedback is anonymous by design:</span> respondents use single-use
            links, and results only unblind once the response threshold is reached.
          </p>
          <p>
            <span className="font-medium text-slate-800">AI features are optional and approval-gated:</span> AI output is always a
            draft, is never sent patient-identifiable information, and every use is logged with a human approval record.
          </p>
          <p>
            Every action in the portal is captured in an append-only audit log. You can export your data at any time from your
            dashboard.
          </p>
        </div>
        <Link href="/login" className="btn-primary mt-6 inline-block">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
