import type { Metadata } from "next";
import { absoluteUrl, pageOpenGraph } from "@/lib/site";

// RegisterPage is a client component, so its metadata is declared here.
export const metadata: Metadata = {
  title: "Request an account — AppraisalPortal UK",
  description:
    "Request access to AppraisalPortal UK. Registration is open to doctors and appraisers; the Responsible Officer approves every account before sign-in.",
  alternates: { canonical: absoluteUrl("/register") },
  openGraph: pageOpenGraph("/register"),
  robots: { index: false, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
