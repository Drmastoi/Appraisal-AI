import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import UsersTable from "@/app/admin/users/UsersTable";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: [{ approved: "asc" }, { role: "asc" }, { name: "asc" }],
    select: { id: true, email: true, name: true, role: true, gmcNumber: true, designatedBody: true, approved: true, active: true },
  });
  const appraisers = users.filter((u) => u.role === "APPRAISER" && u.approved);
  const doctors = users.filter((u) => u.role === "DOCTOR");
  const appraisals = await prisma.appraisal.findMany({ select: { id: true, doctorId: true, year: true, status: true } });
  const assignments = await prisma.assignment.findMany({ where: { active: true } });

  return (
    <div>
      <PageHeader title="Users" subtitle="Approve accounts, manage access, and create appraisals" />
      <UsersTable users={users} appraisers={appraisers.map((a) => ({ id: a.id, name: a.name }))} doctorAppraisals={doctors.map((d) => ({ id: d.id, appraisals }))} activeAssignmentCounts={Object.fromEntries(assignments.map((a) => [a.doctorId, a.appraiserId]))} />
    </div>
  );
}
