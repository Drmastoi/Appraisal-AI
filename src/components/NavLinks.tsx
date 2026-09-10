"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ items }: { items: { href: string; label: string; badge?: number }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-0.5">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative px-3 py-1.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-white text-[var(--nhs-blue)]"
                : "text-white/90 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
            {item.badge ? (
              <span className="ml-1.5 inline-flex h-4.5 min-w-4.5 items-center justify-center bg-[var(--nhs-warm-yellow)] px-1 text-[10px] font-bold text-[var(--nhs-black)]">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
