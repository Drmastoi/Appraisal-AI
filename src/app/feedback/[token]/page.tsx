import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import FeedbackForm from "./FeedbackForm";

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.feedbackInvite.findUnique({
    where: { token },
    include: { cycle: true },
  });
  if (!invite || invite.completed || invite.cycle.status !== "OPEN") notFound();

  return (
    <div className="dot-grid min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="card p-8 shadow-md">
          <h1 className="text-xl font-bold text-slate-900">
            {invite.cycle.cycleType === "COLLEAGUE" ? "Colleague feedback" : "Patient feedback"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You have been invited to give confidential feedback about a doctor&apos;s practice. Your responses are anonymous —
            your name is never shown with your answers, and the doctor only sees results once enough responses have arrived.
          </p>
          <p className="mt-1 text-xs text-slate-400">It takes about 5 minutes.</p>
          <FeedbackForm cycleType={invite.cycle.cycleType as "COLLEAGUE" | "PATIENT"} token={token} />
        </div>
      </div>
    </div>
  );
}
