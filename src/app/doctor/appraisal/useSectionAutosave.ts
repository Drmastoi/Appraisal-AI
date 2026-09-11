"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AUTOSAVE_DEBOUNCE_MS,
  backoffDelayMs,
  draftStorageKey,
  hashData,
  readDraft,
  removeDraft,
  safeLocalStorage,
  shouldRestoreDraft,
  writeDraft,
} from "@/lib/drafts";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

export type SectionSync = {
  state: SaveState;
  /** ISO timestamp of the last successful write, for "Saved 12:04". */
  savedAt?: string;
  attempts: number;
  /** True until the doctor accepts or discards content recovered from a draft. */
  restored?: boolean;
};

type Options = {
  appraisalId: string;
  /** Server content per section, parsed — also the base for draft hashes. */
  serverData: Record<string, Record<string, unknown>>;
  /** Autosave only while the appraisal is editable. */
  enabled: boolean;
};

const IDLE: SectionSync = { state: "idle", attempts: 0 };

/** Attempts per write before handing back to the next trigger (1s, 2s, 4s). */
const SAVE_ATTEMPTS = 3;

export function sectionStatusLabel(sync: SectionSync | undefined): { text: string; tone: string } | null {
  if (!sync) return null;
  switch (sync.state) {
    case "saving":
      return { text: "Saving…", tone: "text-slate-400" };
    case "pending":
      return { text: sync.restored ? "Recovered draft" : "Unsaved changes", tone: "text-amber-600" };
    case "error":
      return { text: "Save failed · retrying", tone: "text-red-700" };
    case "saved":
      return { text: "Saved", tone: "text-emerald-600" };
    default:
      return null;
  }
}

/**
 * Autosave engine for the MAG form.
 *
 * Guarantees:
 *  - writes are debounced while typing, then flushed on blur, section close,
 *    tab hide, route change and unload (`sendBeacon`, so it survives navigation)
 *  - writes are chained per section, so a slow save can never be overtaken by a
 *    newer one and revert content; each write sends the freshest payload
 *  - content that is already stored is skipped, so blur-without-edits causes no
 *    request and no audit entry
 *  - a failed write is retried with backoff, kept in memory, mirrored to a
 *    localStorage draft, and retried again when the browser comes back online
 *  - `flushAll()` lets Submit refuse to proceed until everything is persisted
 */
export function useSectionAutosave({ appraisalId, serverData, enabled }: Options) {
  const [data, setData] = useState<Record<string, Record<string, unknown>>>(serverData);
  const [sync, setSync] = useState<Record<string, SectionSync>>(() => {
    const initial: Record<string, SectionSync> = {};
    for (const key of Object.keys(serverData)) initial[key] = IDLE;
    return initial;
  });
  const [restoredSections, setRestoredSections] = useState<string[]>([]);
  const [epoch, setEpoch] = useState(0);

  const dataRef = useRef(data);
  const syncRef = useRef(sync);
  const serverRef = useRef(serverData);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inFlight = useRef<Record<string, Promise<boolean>>>({});
  const attempts = useRef<Record<string, number>>({});
  /** Hash of the last successfully stored content, per section. */
  const lastWritten = useRef<Record<string, string>>({});
  /**
   * Sections whose unsaved content we handed to the browser on unload
   * (`sendBeacon`/keepalive). Fire-and-forget: we can never learn the outcome,
   * so they stop counting as dirty — the on-disk draft is their fallback.
   */
  const handedOff = useRef<Set<string>>(new Set());
  const unmounted = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // The server content *is* what is stored, so seed the change-detection
  // baseline from it. Without this, the first flush of an untouched section
  // would look like a change and write it back (plus an audit entry).
  useEffect(() => {
    for (const [key, value] of Object.entries(serverRef.current)) {
      lastWritten.current[key] = hashData(value);
    }
  }, [appraisalId]);

  const patchSync = useCallback((key: string, patch: SectionSync) => {
    if (unmounted.current) return;
    setSync((prev) => ({ ...prev, [key]: patch }));
    syncRef.current = { ...syncRef.current, [key]: patch };
  }, []);

  const storageKey = useCallback((key: string) => draftStorageKey(appraisalId, key), [appraisalId]);

  /** Keep an on-disk copy of unsaved content, so a crash/reload cannot lose it. */
  const persistDraft = useCallback(
    (key: string) => {
      const storage = safeLocalStorage();
      if (!storage) return;
      const base = serverRef.current[key];
      if (!base) return;
      writeDraft(storage, storageKey(key), {
        version: 1,
        baseHash: hashData(base),
        data: dataRef.current[key] ?? {},
        savedAt: new Date().toISOString(),
      });
    },
    [storageKey],
  );

  const clearTimer = useCallback((timers_: { current: Record<string, ReturnType<typeof setTimeout>> }, key: string) => {
    const timer = timers_.current[key];
    if (timer) {
      clearTimeout(timer);
      delete timers_.current[key];
    }
  }, []);

  /** Write one section. Calls are chained, so the last write always wins. */
  const flush = useCallback(
    (key: string, opts?: { beacon?: boolean }): Promise<boolean> => {
      if (!enabled || !dataRef.current[key]) return Promise.resolve(true);
      const url = `/api/appraisal/sections/${key}`;
      clearTimer(timers, key);

      // A flush is only ever a *persist* of unsaved work. A blur can fire without
      // any edit (focus moves, the window is refocused, a section is opened and
      // left untouched), so never issue a write with nothing pending.
      const state = syncRef.current[key]?.state;
      if (!opts?.beacon && state !== "pending" && state !== "saving" && state !== "error") {
        return Promise.resolve(true);
      }

      // Unload path: fire-and-forget, the browser keeps the request alive.
      if (opts?.beacon) {
        const payload = dataRef.current[key] ?? {};
        if (lastWritten.current[key] === hashData(payload)) return Promise.resolve(true);
        handedOff.current.add(key);
        try {
          const body = JSON.stringify({ data: payload });
          const sent =
            typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function"
              ? navigator.sendBeacon(url, new Blob([body], { type: "application/json" }))
              : false;
          if (!sent) void fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
        } catch {
          /* the page is going away — nothing else we can do */
        }
        return Promise.resolve(true);
      }

      const previous = inFlight.current[key] ?? Promise.resolve(true);
      const run = previous.then(async () => {
        // Read the payload now: anything typed while the previous write was in
        // flight is included in this one.
        const payload = dataRef.current[key] ?? {};
        const body = JSON.stringify({ data: payload });
        const hash = hashData(payload);
        const previousSavedAt = syncRef.current[key]?.savedAt;
        const wasRestored = syncRef.current[key]?.restored;

        if (lastWritten.current[key] === hash) {
          // Nothing changed since the last successful write (e.g. blur with no
          // edits) — no request, no audit entry.
          if (syncRef.current[key]?.state === "pending") patchSync(key, { state: "saved", savedAt: previousSavedAt, attempts: 0, restored: wasRestored });
          return true;
        }

        patchSync(key, { state: "saving", attempts: attempts.current[key] ?? 0, savedAt: previousSavedAt, restored: wasRestored });

        for (let attempt = 1; attempt <= SAVE_ATTEMPTS; attempt += 1) {
          try {
            const res = await fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = (await res.json().catch(() => ({}))) as { savedAt?: string };
            lastWritten.current[key] = hash;
            handedOff.current.delete(key); // genuinely stored now
            // What is now on the server becomes the base for any future draft, so
            // a crash *after* an autosave still restores the newest typing rather
            // than being rejected as stale.
            serverRef.current = { ...serverRef.current, [key]: payload };
            attempts.current[key] = 0;
            const storage = safeLocalStorage();
            if (storage) removeDraft(storage, storageKey(key));
            patchSync(key, { state: "saved", savedAt: json.savedAt ?? new Date().toISOString(), attempts: 0, restored: wasRestored });
            return true;
          } catch {
            attempts.current[key] = attempt;
            // Keep the content: on disk for a reload, in memory for the retry.
            persistDraft(key);
            patchSync(key, { state: "error", attempts: attempt, savedAt: previousSavedAt, restored: wasRestored });
            if (attempt < SAVE_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, backoffDelayMs(attempt - 1)));
          }
        }
        return false;
      });

      inFlight.current[key] = run;
      void run.finally(() => {
        if (inFlight.current[key] === run) delete inFlight.current[key];
      });
      return run;
    },
    [clearTimer, enabled, patchSync, persistDraft, storageKey],
  );

  /** Called on every keystroke: keep the value locally, then schedule the write. */
  const update = useCallback(
    (key: string, next: Record<string, unknown>) => {
      dataRef.current = { ...dataRef.current, [key]: next };
      setData(dataRef.current);
      if (!enabled) return;
      handedOff.current.delete(key); // newer typing supersedes any handoff
      persistDraft(key);
      patchSync(key, { state: "pending", attempts: attempts.current[key] ?? 0, savedAt: syncRef.current[key]?.savedAt, restored: syncRef.current[key]?.restored });
      clearTimer(timers, key);
      timers.current[key] = setTimeout(() => void flush(key), AUTOSAVE_DEBOUNCE_MS);
    },
    [clearTimer, enabled, flush, patchSync, persistDraft],
  );

  /** Reset a section to the server content and drop its local draft. */
  const discardDraft = useCallback(
    (key: string) => {
      const storage = safeLocalStorage();
      if (storage) removeDraft(storage, storageKey(key));
      clearTimer(timers, key);
      attempts.current[key] = 0;
      handedOff.current.delete(key);
      lastWritten.current[key] = hashData(serverRef.current[key] ?? {});
      dataRef.current = { ...dataRef.current, [key]: serverRef.current[key] ?? {} };
      setData(dataRef.current);
      patchSync(key, IDLE);
      setRestoredSections((prev) => prev.filter((k) => k !== key));
      setEpoch((e) => e + 1);
    },
    [clearTimer, patchSync, storageKey],
  );

  /** Sections with content that has not reached the server (or been handed off). */
  const pendingKeys = useCallback(
    () =>
      Object.entries(syncRef.current)
        .filter(([key, s]) => !handedOff.current.has(key) && (s.state === "pending" || s.state === "error" || s.state === "saving"))
        .map(([key]) => key),
    [],
  );

  /** Write everything outstanding. Resolves false if any section could not be saved. */
  const flushAll = useCallback(async () => {
    const keys = pendingKeys();
    if (!keys.length) return true;
    const results = await Promise.all(keys.map((key) => flush(key)));
    return results.every(Boolean);
  }, [flush, pendingKeys]);

  const saveNow = useCallback(() => {
    // The doctor has chosen to keep the recovered answers, so the notice has
    // served its purpose; any section that fails to store stays surfaced by the
    // retrying status line and its on-disk draft.
    setRestoredSections([]);
    for (const key of Object.keys(dataRef.current)) {
      clearTimer(timers, key);
      void flush(key);
    }
  }, [clearTimer, flush]);

  // Recover any draft left behind by a crash, reload or closed tab — but only
  // when the server still holds the exact content the draft was typed from.
  useEffect(() => {
    if (!enabled) return;
    const storage = safeLocalStorage();
    if (!storage) return;
    const recovered: string[] = [];
    const nextData = { ...dataRef.current };
    const nextSync = { ...syncRef.current };
    for (const key of Object.keys(serverRef.current)) {
      const draft = readDraft(storage, storageKey(key));
      if (!draft || !shouldRestoreDraft(draft, serverRef.current[key])) continue;
      nextData[key] = draft.data;
      nextSync[key] = { state: "pending", attempts: 0, restored: true };
      recovered.push(key);
    }
    if (!recovered.length) return;
    dataRef.current = nextData;
    syncRef.current = nextSync;
    setData(nextData);
    setSync(nextSync);
    setRestoredSections(recovered);
    setEpoch((e) => e + 1);
  }, [enabled, storageKey]);

  // Flush on tab hide / navigate away / close, warn before discarding, and
  // retry failed sections as soon as the connection returns.
  useEffect(() => {
    if (!enabled) return;
    const flushEverything = (beacon: boolean) => {
      for (const key of pendingKeys()) void flush(key, { beacon });
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushEverything(true);
    };
    const onPageHide = () => flushEverything(true);
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pendingKeys().length === 0) return;
      flushEverything(true);
      event.preventDefault();
      event.returnValue = "";
    };
    const onOnline = () => {
      for (const key of Object.keys(syncRef.current)) {
        if (syncRef.current[key]?.state === "error") void flush(key);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveNow();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("online", onOnline);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      // Route change: this form is unmounting. Persist whatever is outstanding.
      for (const key of pendingKeys()) void flush(key, { beacon: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, flush, pendingKeys, saveNow]);

  useEffect(() => {
    const timerMap = timers.current;
    return () => {
      unmounted.current = true;
      for (const timer of Object.values(timerMap)) clearTimeout(timer);
    };
  }, []);

  const counts = useMemo(() => {
    const states = Object.values(sync);
    return {
      // "pending" includes recovered drafts the doctor has not accepted yet.
      unsaved: states.filter((s) => s.state === "pending" || s.state === "saving" || s.state === "error").length,
      saving: states.filter((s) => s.state === "saving").length,
      failed: states.filter((s) => s.state === "error").length,
      lastSavedAt:
        states
          .map((s) => s.savedAt)
          .filter((value): value is string => Boolean(value))
          .sort()
          .pop() ?? null,
    };
  }, [sync]);

  return { data, sync, counts, restoredSections, epoch, update, flush, flushAll, saveNow, discardDraft };
}
