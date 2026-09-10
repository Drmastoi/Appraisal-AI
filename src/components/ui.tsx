import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  title,
  children,
  action,
  className,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className ?? ""}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          {title ? <h2 className="text-sm font-semibold tracking-tight text-slate-800">{title}</h2> : <span />}
          {action}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-300/60",
  SUBMITTED: "bg-blue-50 text-blue-700 ring-blue-300/60",
  IN_REVIEW: "bg-amber-50 text-amber-800 ring-amber-300/60",
  SIGNED_OFF: "bg-emerald-50 text-emerald-700 ring-emerald-300/60",
  OPEN: "bg-sky-50 text-sky-700 ring-sky-300/60",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-300/60",
  REPORTED: "bg-violet-50 text-violet-700 ring-violet-300/60",
  PROPOSED: "bg-slate-100 text-slate-700 ring-slate-300/60",
  AGREED: "bg-emerald-50 text-emerald-700 ring-emerald-300/60",
  ACHIEVED: "bg-emerald-50 text-emerald-700 ring-emerald-300/60",
  NOT_ACHIEVED: "bg-red-50 text-red-700 ring-red-300/60",
  CARRIED_FORWARD: "bg-amber-50 text-amber-800 ring-amber-300/60",
};

const STATUS_DOTS: Record<string, string> = {
  DRAFT: "bg-slate-400",
  SUBMITTED: "bg-blue-500",
  IN_REVIEW: "bg-amber-500",
  SIGNED_OFF: "bg-emerald-500",
  OPEN: "bg-sky-500",
  PROPOSED: "bg-slate-400",
  AGREED: "bg-emerald-500",
  ACHIEVED: "bg-emerald-500",
  NOT_ACHIEVED: "bg-red-500",
  CARRIED_FORWARD: "bg-amber-500",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-300/60";
  const dot = STATUS_DOTS[status] ?? "bg-slate-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${style}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  message,
  ctaHref,
  ctaLabel,
}: {
  message: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="dot-grid rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center">
      <p className="mx-auto max-w-md text-sm text-slate-500">{message}</p>
      {ctaHref && ctaLabel && (
        <Link href={ctaHref} className="btn-primary mt-4">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="card group px-5 py-4 transition-shadow hover:shadow-md">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
