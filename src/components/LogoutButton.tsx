"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      disabled={busy}
      className="border border-white bg-white px-3 py-1.5 text-sm font-semibold text-[var(--nhs-blue)] hover:bg-[var(--nhs-light-grey)]"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
