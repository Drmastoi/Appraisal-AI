/**
 * Autosave support for the MAG form.
 *
 * A doctor filling a long appraisal must never lose typing. These helpers back
 * three guarantees:
 *   1. Debounced saves while typing (see AUTOSAVE_DEBOUNCE_MS).
 *   2. Retry with backoff when a save fails, so a dropped connection recovers.
 *   3. A localStorage draft per section that survives a crash, reload or
 *      accidental tab close — restored only when it was typed from exactly the
 *      server content that is still there (see shouldRestoreDraft), so a stale
 *      draft can never clobber newer data.
 */

/** Bump when the stored draft shape changes; older drafts are then ignored. */
export const DRAFT_VERSION = 1;

/** Idle time after the last keystroke before a section is written. */
export const AUTOSAVE_DEBOUNCE_MS = 800;

/** Retry ceiling for failed saves. */
export const MAX_BACKOFF_MS = 30_000;

export type Draft = {
  version: number;
  /** Hash of the server content this draft was typed from. */
  baseHash: string;
  data: Record<string, unknown>;
  savedAt: string;
};

/** Minimal slice of the Web Storage API, so this is testable without a DOM. */
export type DraftStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function draftStorageKey(appraisalId: string, sectionKey: string): string {
  return `appraisal-draft:${appraisalId}:${sectionKey}`;
}

/** Deterministic stringify (sorted keys) so equal content always hashes equally. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** FNV-1a, hex. Small, dependency-free, and plenty for change detection. */
export function hashData(data: Record<string, unknown>): string {
  const input = stableStringify(data);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function serializeDraft(draft: Draft): string {
  return JSON.stringify(draft);
}

/** Tolerant of corrupt/hand-edited storage: anything unexpected reads as "no draft". */
export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (typeof parsed.baseHash !== "string") return null;
    if (!parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) return null;
    return {
      version: parsed.version,
      baseHash: parsed.baseHash,
      data: parsed.data as Record<string, unknown>,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Only restore a draft when the server still holds exactly the content it was
 * typed from — otherwise the draft is stale (saved elsewhere since) and would
 * overwrite newer edits.
 */
export function shouldRestoreDraft(draft: Draft | null, serverData: Record<string, unknown>): boolean {
  if (!draft) return false;
  return draft.baseHash === hashData(serverData);
}

/** 1s, 2s, 4s, 8s, 16s, then capped at 30s. */
export function backoffDelayMs(attempt: number): number {
  const safe = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 0;
  return Math.min(MAX_BACKOFF_MS, 1000 * 2 ** safe);
}

export function readDraft(storage: DraftStorage, key: string): Draft | null {
  try {
    return parseDraft(storage.getItem(key));
  } catch {
    return null;
  }
}

export function writeDraft(storage: DraftStorage, key: string, draft: Draft): void {
  try {
    storage.setItem(key, serializeDraft(draft));
  } catch {
    /* quota exceeded or storage disabled — the in-memory copy still protects the session */
  }
}

export function removeDraft(storage: DraftStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

/** localStorage may be unavailable (private mode, SSR). Returns null instead of throwing. */
export function safeLocalStorage(): DraftStorage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const probe = "__appraisal_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
