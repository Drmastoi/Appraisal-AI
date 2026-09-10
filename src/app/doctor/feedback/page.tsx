import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui";
import FeedbackManager from "./FeedbackManager";

export default async function DoctorFeedbackPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "DOCTOR") redirect("/login");

  const year = new Date().getFullYear();
  const appraisal = await prisma.appraisal.findUnique({ where: { doctorId_year: { doctorId: user.id, year } } });
  const cycles = appraisal
    ? await prisma.feedbackCycle.findMany({
        where: { appraisalId: appraisal.id },
        include: { _count: { select: { invites: true, responses: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="360° multi-source feedback"
        subtitle="Colleague (MSF) and patient feedback — required at least once per 5-year revalidation cycle"
      />
      <Card title="How it works">
        <ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">
          <li>Create a colleague or patient feedback cycle.</li>
          <li>Generate anonymous invite links and share them (email, SMS or printed cards).</li>
          <li>Respondents answer anonymously — links are single-use and responses carry no names.</li>
          <li>Results unblind to you once the response threshold is met (15 colleagues / 34 patients); reflect before your appraisal.</li>
        </ol>
      </Card>
      <div className="mt-6">
        <FeedbackManager cycles={cycles} locked={appraisal ? appraisal.status !== "DRAFT" : true} />
      </div>
    </div>
  );
}
