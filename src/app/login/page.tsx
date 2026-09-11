import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import { absoluteUrl, pageOpenGraph } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in — AppraisalPortal UK",
  description: "Sign in to your UK medical appraisal portfolio: MAG 2022 form, CPD, 360° feedback and PDP.",
  alternates: { canonical: absoluteUrl("/login") },
  openGraph: pageOpenGraph("/login"),
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
