import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import NotificationsList from "@/app/shared/NotificationsList";

export default async function AppraiserNotifications() {
  const user = await getSessionUser();
  if (!user || user.role !== "APPRAISER") redirect("/login");
  return (
    <div>
      <PageHeader title="Notifications" />
      <NotificationsList />
    </div>
  );
}
