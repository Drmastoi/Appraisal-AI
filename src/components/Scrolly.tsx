"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* ────────────────────────────────────────────────────────────────
   Scroll-scrubbed scrollytelling engine (dependency-free).

   Scroll position IS the timeline: every effect is a pure function
   of scroll position, so motion scrubs forward and backward with
   the wheel/trackpad — no one-shot transitions.

   - One shared ticker (rAF when available + light interval poll for
     webviews that fire neither rAF nor scroll events).
   - Batched layout reads → writes each frame to avoid thrash.
   - ScrollProgress: top progress bar + section rail (2xl+).
   - Reveal: scrubbed entrance — opacity/translate track the
     element's position through the viewport, fully reversible.
   - ScrollySteps: pinned stage; panels cross-fade CONTINUOUSLY with
     scroll (not stepwise), numerals/dots scrub along.
   - HeroScrub: layered parallax departure on the hero children.
   All motion no-ops under prefers-reduced-motion; content is fully
   visible without JS (html.no-js guards initial hidden states).
   ──────────────────────────────────────────────────────────────── */

const EPS = 0.0008;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);

/* ── Shared engine ─────────────────────────────────────────────── */

type Item = {
  measure: () => number; // returns progress 0..1 (layout read)
  apply: (p: number) => void; // writes styles (no reads)
  last: number;
};

const items = new Set<Item>();
let ticking = false;
let frameId = 0;
let pollId: ReturnType<typeof setInterval> | null = null;
let reducedMotion = false;
let rAFSeen = false;

function getScrollY(): number {
  const se = document.scrollingElement;
  return se ? se.scrollTop : window.scrollY || document.documentElement.scrollTop || 0;
}

function tick() {
  // Phase 1 — reads (all rects measured before any writes).
  const jobs: Array<[Item, number]> = [];
  if (!reducedMotion) {
    for (const it of items) {
      const p = it.measure();
      if (Math.abs(p - it.last) > EPS) {
        it.last = p;
        jobs.push([it, p]);
      }
    }
  }
  // Phase 2 — writes.
  for (const [it, p] of jobs) it.apply(p);
}

function frame() {
  if (!ticking) return;
  tick();
  // Schedule next frame — rAF when the host actually fires it, else a cheap timer.
  if (rAFWorks) {
    frameId = requestAnimationFrame(frame);
  } else {
    frameId = window.setTimeout(frame, 32) as unknown as number;
  }
}

let rAFWorks = false;

function ensureLoop() {
  if (ticking) return;
  ticking = true;
  reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  // Detect a live rAF: if the first callback never runs (some embedded
  // webviews register the API but never fire it), fall back to a timer
  // loop that drives the same tick.
  if (typeof requestAnimationFrame === "function") {
    rAFWorks = true;
    requestAnimationFrame(() => {
      rAFSeen = true; // first frame arrived — rAF is live
    });
    window.setTimeout(() => {
      if (rAFWorks && !rAFSeen) {
        rAFWorks = false;
        if (ticking) {
          if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frameId);
          frameId = window.setTimeout(frame, 32) as unknown as number;
        }
      }
    }, 120);
  }
  frame();
  // Some embedded webviews never fire scroll events either; a light poll
  // drives the same tick so scrubbing stays honest everywhere.
  pollId = setInterval(tick, 150);
}

function stopLoop() {
  if (!ticking) return;
  ticking = false;
  if (rAFWorks && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frameId);
  else clearTimeout(frameId);
  if (pollId) clearInterval(pollId);
  pollId = null;
}

/** Measure helpers (pure reads). */
const rectTop = (el: HTMLElement) => el.getBoundingClientRect().top;

/* ── ScrollProgress: bar (direct writes) + rail (rare state) ───── */

const SECTION_LABELS = [
  { id: "hero", label: "Overview" },
  { id: "how", label: "How it works" },
  { id: "features", label: "Platform" },
  { id: "compare", label: "Compare" },
];

export function ScrollProgress() {
  const fillRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    let lastPct = -1;
    let lastActive = "";
    const item: Item = {
      last: 0,
      measure: () => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        return max > 0 ? clamp01(getScrollY() / max) : 0;
      },
      apply: (p) => {
        const pct = Math.round(p * 1000) / 10;
        if (pct !== lastPct) {
          lastPct = pct;
          fill.style.width = `${pct}%`;
        }
        let current = SECTION_LABELS[0].id;
        for (const s of SECTION_LABELS) {
          const el = document.getElementById(s.id);
          if (el && rectTop(el) <= window.innerHeight * 0.45) current = s.id;
        }
        if (current !== lastActive) {
          lastActive = current;
          setActive(current);
        }
      },
    };
    items.add(item);
    ensureLoop();
    return () => {
      items.delete(item);
      if (items.size === 0) stopLoop();
    };
  }, []);

  return (
    <>
      <div className="scrolly-progress" aria-hidden>
        <div ref={fillRef} className="scrolly-progress-fill" style={{ width: "0%" }} />
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

/* ── Reveal: scrubbed, reversible entrance ─────────────────────── */

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  /** trigger offset in ms — shifts the scrub start later for stagger */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "tr";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const elStyle = el.style;
    const item: Item = {
      last: -1,
      measure: () => {
        if (el.offsetParent === null) return it_last(item);
        const vh = window.innerHeight;
        const top = rectTop(el);
        // 0 when the element's top crosses the late line, 1 when it
        // reaches the settle line — a ~22vh scrub window.
        const startLine = vh * 0.94 - delay * 0.25;
        const windowPx = vh * 0.22;
        return clamp01((startLine - top) / windowPx);
      },
      apply: (p) => {
        const e = easeOut(p);
        elStyle.opacity = `${e}`;
        elStyle.transform = `translate3d(0, ${(1 - e) * 30}px, 0)`;
      },
    };
    function it_last(i: Item) {
      return i.last < 0 ? 0 : i.last;
    }
    // No-JS is handled by html.no-js; reduced-motion gets final states.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      elStyle.opacity = "1";
      elStyle.transform = "none";
      return;
    }
    items.add(item);
    ensureLoop();
    return () => {
      items.delete(item);
      if (items.size === 0) stopLoop();
    };
  }, [delay]);

  return (
    <Tag
      // @ts-expect-error – polymorphic ref
      ref={ref}
      className={`reveal ${className}`}
    >
      {children}
    </Tag>
  );
}

/* ── ScrollySteps: pinned stage, continuously scrubbed panels ──── */

type Step = { n: string; title: string; body: string };

export function ScrollySteps({ steps }: { steps: Step[] }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const numeralRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dotRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = wrap?.querySelector(".scrolly-stage") as HTMLElement | null;
    if (!wrap || !stage) return;
    let lastStep = -1;

    const item: Item = {
      last: -1,
      measure: () => {
        // Mobile fallback: stage hidden → hold current state.
        if (stage.offsetParent === null) return item.last < 0 ? 0 : item.last;
        const vh = window.innerHeight;
        const rect = wrap.getBoundingClientRect();
        const y = getScrollY();
        const stickyTop = parseFloat(getComputedStyle(stage).top) || 88;
        const absTop = rect.top + y;
        const start = absTop - stickyTop; // pin engages
        const end = absTop + rect.height - vh; // wrapper bottom reaches viewport bottom
        const span = end - start;
        return span > 0 ? clamp01((y - start) / span) : 0;
      },
      apply: (p) => {
        const n = steps.length;
        for (let i = 0; i < n; i++) {
          const panel = panelRefs.current[i];
          if (!panel) continue;
          // Tight symmetric dissolve: each panel rises over the first
          // 0.3 of its slot, holds solid, then hands off over the last
          // 0.3. Weight = min(rise, fall) keeps neighbouring panels
          // complementary — combined opacity is always 1 (no dip, no
          // double-exposure at the handover).
          const pos = p * n - i;
          const wIn = smooth(clamp01((pos + 0.15) / 0.3));
          const wOut = 1 - smooth(clamp01((pos - 0.85) / 0.3));
          const w = Math.min(wIn, wOut);
          const panelStyle = panel.style;
          panelStyle.opacity = `${w}`;
          panelStyle.transform = `translate3d(0, ${(1 - w) * 26}px, 0)`;
          panelStyle.pointerEvents = w > 0.5 ? "auto" : "none";
          const numeral = numeralRefs.current[i];
          if (numeral) {
            numeral.style.opacity = `${0.18 + 0.82 * w}`;
            numeral.style.transform = `scale(${(0.92 + 0.08 * w).toFixed(3)})`;
          }
        }
        const s = Math.min(n - 1, Math.round(p * (n - 1)));
        if (s !== lastStep) {
          lastStep = s;
          setStep(s);
          dotRefs.current.forEach((d, di) => {
            d?.classList.toggle("scrolly-dot-on", di === s);
          });
        }
      },
    };
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      items.add(item);
      ensureLoop();
    } else {
      item.apply(0);
    }
    return () => {
      items.delete(item);
      if (items.size === 0) stopLoop();
    };
  }, [steps.length]);

  return (
    <div ref={wrapRef} className="scrolly-steps lg:h-[300vh]">
      {/* Pinned stage — desktop */}
      <div className="scrolly-stage hidden lg:block">
        <div className="relative border border-[var(--nhs-border-grey)] bg-white p-8 shadow-sm">
          {steps.map((s, i) => (
            <div
              key={s.n}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              className="scrolly-panel grid grid-cols-[96px_1fr] gap-6"
            >
              <div
                ref={(el) => {
                  numeralRefs.current[i] = el;
                }}
                className={`font-display text-[64px] leading-none tracking-[-0.04em] ${
                  i === step ? "text-[var(--nhs-blue)]" : "text-[var(--nhs-blue)]/25"
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
                      ref={(el) => {
                        if (i === 0) dotRefs.current[d] = el;
                      }}
                      className={`scrolly-dot h-1 w-8 ${d === step ? "scrolly-dot-on" : ""}`}
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

/* ── HeroScrub: layered parallax departure ─────────────────────── */
/* Children tagged with data-scrub depart at different speeds:
     data-scrub="<depth>"  vertical drift multiplier (0..1)
     data-fade             additionally fades out with scroll
   Scrubs over the hero's own height as it leaves the viewport. */

export function HeroScrub({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(el.querySelectorAll<HTMLElement>("[data-scrub]"));
    if (targets.length === 0) return;

    const item: Item = {
      last: -1,
      measure: () => {
        const top = rectTop(el);
        const h = el.offsetHeight;
        // 0 at rest; 1 when the hero has fully left the viewport.
        return clamp01(-top / Math.max(1, h));
      },
      apply: (p) => {
        if (p <= 0) {
          for (const t of targets) {
            t.style.transform = "";
            t.style.opacity = "";
          }
          return;
        }
        const e = easeOut(p);
        for (const t of targets) {
          const depth = parseFloat(t.dataset.scrub || "0.5") || 0.5;
          const drift = e * 130 * depth;
          // Slight push-back scale adds depth separation between layers.
          t.style.transform = `translate3d(0, ${-drift}px, 0) scale(${(1 - e * 0.04 * depth).toFixed(4)})`;
          if (t.hasAttribute("data-fade")) t.style.opacity = `${clamp01(1 - p * 1.5)}`;
        }
      },
    };
    items.add(item);
    ensureLoop();
    return () => {
      items.delete(item);
      if (items.size === 0) stopLoop();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
