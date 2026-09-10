import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import NotificationsList from "@/app/shared/NotificationsList";

export default async function DoctorNotifications() {
  const user = await getSessionUser();
  if (!user || user.role !== "DOCTOR") redirect("/login");
  return (
    <div>
      <PageHeader title="Notifications" />
      <NotificationsList />
    </div>
  );
}
