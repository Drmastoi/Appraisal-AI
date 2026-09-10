import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import NavLinks from "@/components/NavLinks";
import LogoutButton from "@/components/LogoutButton";

const NAV_BY_ROLE: Record<string, { href: string; label: string }[]> = {
  DOCTOR: [
    { href: "/doctor", label: "Dashboard" },
    { href: "/doctor/appraisal", label: "My appraisal" },
    { href: "/doctor/cpd", label: "CPD" },
    { href: "/doctor/feedback", label: "360 feedback" },
    { href: "/doctor/pdp", label: "PDP" },
    { href: "/doctor/timeline", label: "Timeline" },
    { href: "/doctor/schedule", label: "Schedule" },
    { href: "/doctor/notifications", label: "Notifications" },
  ],
  APPRAISER: [
    { href: "/appraiser", label: "Dashboard" },
    { href: "/appraiser/notifications", label: "Notifications" },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/assignments", label: "Assignments" },
    { href: "/admin/compliance", label: "Compliance" },
    { href: "/admin/audit", label: "Audit log" },
  ],
};

function initials(name: string): string {
  return name
    .replace(/^Dr\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const unread = await prisma.notification.count({ where: { userId: user.id, read: false } });
  const items = (NAV_BY_ROLE[user.role] ?? []).map((i) =>
    i.label === "Notifications" ? { ...i, badge: unread } : i
  );

  return (
    <div className="min-h-screen bg-[var(--nhs-light-grey)]">
      <header className="sticky top-0 z-20 border-b-4 border-[var(--nhs-dark-blue)] bg-[var(--nhs-blue)] text-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-7">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center bg-white text-sm font-black text-[var(--nhs-blue)]">
                A
              </span>
              <span className="hidden text-base font-bold tracking-tight text-white sm:block">
                Appraisal<span className="font-normal opacity-90">Portal</span>{" "}
                <span className="align-super text-[9px] font-semibold text-white/80">UK</span>
              </span>
            </Link>
            <NavLinks items={items} />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center border border-white/30 bg-white/15 text-xs font-bold text-white">
                {initials(user.name)}
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-[11px] text-white/70">
                  {user.role}
                  {user.gmcNumber ? ` · GMC ${user.gmcNumber}` : ""}
                </div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t-4 border-[var(--nhs-blue)] bg-white py-6">
        <p className="mx-auto max-w-7xl px-4 text-xs text-[var(--nhs-mid-grey)] sm:px-6">
          Appraisal data is confidential and audited · AI features produce drafts that require human review and approval
        </p>
      </footer>
    </div>
  );
}
