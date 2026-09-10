"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ────────────────────────────────────────────────────────────────
   Scrollytelling primitives (dependency-free).
   - ScrollProgress: NHS-yellow progress bar + section rail (2xl+)
   - Reveal: IntersectionObserver fade/rise, no-JS & reduced-motion safe
   - ScrollySteps: pinned "How it works" stage driven by scroll position
   All motion is disabled under prefers-reduced-motion; content is fully
   visible when JS is off (html.no-js guards the hidden initial states).
   ──────────────────────────────────────────────────────────────── */

const SECTION_LABELS = [
  { id: "hero", label: "Overview" },
  { id: "how", label: "How it works" },
  { id: "features", label: "Platform" },
  { id: "compare", label: "Compare" },
];

export function ScrollProgress() {
  const [pct, setPct] = useState(0);
  const [active, setActive] = useState("hero");

  useEffect(() => {
    let last = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setPct(max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0);
      // Active section = last one whose top is above the viewport midline.
      let current = SECTION_LABELS[0].id;
      for (const s of SECTION_LABELS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) current = s.id;
      }
      setActive(current);
    };
    // Throttled direct update. Some embedded webviews fire neither rAF nor
    // scroll events, so a light poll keeps the indicator honest everywhere.
    const onScroll = () => {
      const now = performance.now();
      if (now - last > 50) {
        last = now;
        update();
      }
    };
    const poll = setInterval(update, 200);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      clearInterval(poll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      <div className="scrolly-progress" aria-hidden>
        <div className="scrolly-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <nav className="scrolly-rail" aria-label="Page progress">
        {SECTION_LABELS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            data-active={active === s.id}
            className="scrolly-rail-item"
            aria-current={active === s.id ? "true" : undefined}
          >
            <span className="scrolly-rail-dot" />
            <span className="scrolly-rail-label">{s.label}</span>
          </a>
        ))}
      </nav>
    </>
  );
}

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  /** stagger delay in ms */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "tr";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.shown = "true";
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error – polymorphic ref
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

type Step = { n: string; title: string; body: string };

export function ScrollySteps({ steps }: { steps: Step[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let last = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      // progress 0..1 through the pinned region
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      const i = Math.min(steps.length - 1, Math.floor(p * steps.length));
      setIdx(i);
    };
    // Throttled update + light poll (scroll events/rAF unreliable in webviews).
    const onScroll = () => {
      const now = performance.now();
      if (now - last > 50) {
        last = now;
        update();
      }
    };
    const poll = setInterval(update, 200);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      clearInterval(poll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [steps.length]);

  return (
    <div ref={wrapRef} className="scrolly-steps lg:h-[280vh]">
      {/* Pinned stage — desktop */}
      <div className="scrolly-stage hidden lg:block">
        <div className="relative border border-[var(--nhs-border-grey)] bg-white p-8 shadow-sm">
          {steps.map((s, i) => (
            <div key={s.n} data-active={i === idx} className="scrolly-panel grid grid-cols-[96px_1fr] gap-6">
              <div
                className={`font-display text-[64px] leading-none tracking-[-0.04em] transition-colors duration-500 ${
                  i === idx ? "text-[var(--nhs-blue)]" : "text-[var(--nhs-blue)]/20"
                }`}
              >
                {s.n}
              </div>
              <div>
                <h3 className="text-[20px] font-bold tracking-tight text-[var(--nhs-black)]">{s.title}</h3>
                <p className="mt-3 max-w-[52ch] text-[15px] leading-7 text-[var(--nhs-dark-grey)]">{s.body}</p>
                <div className="mt-6 flex gap-1.5" aria-hidden>
                  {steps.map((_, d) => (
                    <span
                      key={d}
                      className={`h-1 w-8 transition-colors duration-300 ${d === idx ? "bg-[var(--nhs-blue)]" : "bg-[var(--nhs-border-grey)]"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile / reduced-motion fallback — plain stacked cards */}
      <div className="grid gap-6 pt-6 sm:grid-cols-3 lg:hidden">
        {steps.map((s) => (
          <div key={s.n} className="border border-[var(--nhs-border-grey)] bg-white p-6">
            <div className="font-display text-[40px] leading-none tracking-[-0.04em] text-[var(--nhs-blue)]/25">{s.n}</div>
            <h3 className="mt-2 text-[16px] font-bold tracking-tight text-[var(--nhs-black)]">{s.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--nhs-dark-grey)]">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
