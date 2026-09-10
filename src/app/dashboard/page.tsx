import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function HomeRedirect() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin");
  if (user.role === "APPRAISER") redirect("/appraiser");
  redirect("/doctor");
}
