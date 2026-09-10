import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, StatusBadge, EmptyState } from "@/components/ui";
import DownloadReportButton from "@/components/DownloadReportButton";
import Link from "next/link";

export default async function AppraiserDashboard() {
  const user = await getSessionUser();
  if (!user || user.role !== "APPRAISER") redirect("/login");

  const appraisals = await prisma.appraisal.findMany({
    where: { appraiserId: user.id },
    include: { doctor: true, sections: true, comments: true },
    orderBy: { updatedAt: "desc" },
  });

  const awaiting = appraisals.filter((a) => a.status === "SUBMITTED");
  const inReview = appraisals.filter((a) => a.status === "IN_REVIEW");
  const signedOff = appraisals.filter((a) => a.status === "SIGNED_OFF");

  return (
    <div>
      <PageHeader title="Appraiser workspace" subtitle={`${appraisals.length} appraisal(s) assigned to you`} />

      {!appraisals.length ? (
        <EmptyState message="No appraisals assigned yet. Administrators assign doctors to you, and submitted appraisals will appear here." />
      ) : (
        <div className="space-y-4">
          {[
            { title: "Awaiting first review (submitted)", list: awaiting },
            { title: "In review", list: inReview },
            { title: "Signed off", list: signedOff },
          ].map((group) =>
            group.list.length ? (
              <Card key={group.title} title={group.title}>
                <ul className="divide-y divide-slate-100">
                  {group.list.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-3">
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {a.doctor.name} <span className="text-slate-400">· GMC {a.doctor.gmcNumber ?? "—"}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {a.year}/{String(a.year + 1).slice(2)} · {a.sections.filter((s) => s.data !== "{}").length}/{a.sections.length} sections started · {a.comments.length} comment(s)
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={a.status} />
                        <DownloadReportButton
                          appraisalId={a.id}
                          filename={`appraisal-${a.year}-${(a.doctor.gmcNumber ?? a.doctor.id).replace(/\W/g, "")}.pdf`}
                          className="chip-secondary"
                        />
                        <Link href={`/appraiser/appraisals/${a.id}`} className="chip-primary">
                          Review
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
