/**
 * Phase 0.5 — session-scoped autosave of the case-list view shape.
 *
 * See `docs/case-list-view-controls-spec.md` §5.7 for the full spec.
 *
 * Two surfaces, two `sessionStorage` keys, identical mechanics:
 *
 *   - On mount, the surface reads `readSessionViewSnapshot(surface)`
 *     synchronously and uses the result to seed every captured
 *     useState's lazy initializer (with fallback through localStorage
 *     defaults to surface hardcoded defaults).
 *
 *   - Every render, the surface calls `useSessionViewAutosave` with
 *     the current captured snapshot. The hook fingerprint-compares,
 *     debounces 200ms, and writes to `sessionStorage`. Errors
 *     (quota, disabled storage, private browsing) are caught and
 *     logged but never thrown.
 *
 *   - On Reset (Customize view panel footer), the surface calls
 *     `clearSessionViewSnapshot(surface)` so the next reload starts
 *     genuinely pristine rather than restoring the just-reset state.
 *
 * The snapshot lives in `sessionStorage` so it dies with the tab —
 * matching the "navigate away from these pages" semantic. Saved Views
 * (server-side, named, durable) is the path for cross-tab/device
 * continuity; this hook is the path for cross-reload continuity
 * within one tab.
 *
 * What's captured: quickFilter, primarySort, sortTiebreakers,
 * extraFilters, caseScope, columnOrder, columnHidden, viewMode,
 * appliedViewId.
 *
 * What's NOT captured: search term (PII; transient lookup),
 * pagination cursor, preview-pane selection, bulk selection,
 * per-column widths (these live in localStorage user defaults).
 */
import { useEffect, useRef } from "react";
import type {
  ColumnOrder,
  ColumnVisibility,
  SortState,
} from "./caseListColumns";

export type SessionViewSurface = "queue" | "attorneyDashboard";

const SESSION_VIEW_KEY: Record<SessionViewSurface, string> = {
  queue: "dars.caseQueue.sessionView",
  attorneyDashboard: "dars.attorneyDashboard.sessionView",
};

const SCHEMA_VERSION = 1 as const;
const DEBOUNCE_MS = 200;

/** The fields captured by the autosave. Identical to the spec's
 *  `SessionViewSnapshot.filters` block plus `appliedViewId`. */
export interface SessionViewSnapshotFields {
  quickFilter: string;
  primarySort: SortState | null;
  sortTiebreakers: SortState[];
  extraFilters: Record<string, unknown>;
  caseScope: "active" | "all";
  columnOrder: ColumnOrder;
  columnHidden: ColumnVisibility;
  viewMode: "cards" | "list" | "preview";
  appliedViewId: string | null;
}

/** Persisted shape. Adds the metadata wrapper around
 *  `SessionViewSnapshotFields`. */
export interface SessionViewSnapshot extends SessionViewSnapshotFields {
  schemaVersion: typeof SCHEMA_VERSION;
  capturedAt: string;
  surface: SessionViewSurface;
}

/** Synchronous read on mount. Returns null when:
 *   - sessionStorage is unavailable / blocked,
 *   - the entry is absent,
 *   - the payload is malformed JSON,
 *   - the payload's `surface` doesn't match (defensive — a bad write
 *     could mix surfaces),
 *   - the payload's `schemaVersion` differs from the current build
 *     and no transformer is registered (Phase 0.5 has no
 *     transformers yet).
 *
 * The caller decides what to do on null — typically fall through to
 * the localStorage user defaults, then the surface's hardcoded
 * defaults. */
export function readSessionViewSnapshot(
  surface: SessionViewSurface,
): SessionViewSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SESSION_VIEW_KEY[surface]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionViewSnapshot> | null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.schemaVersion !== SCHEMA_VERSION ||
      parsed.surface !== surface
    ) {
      return null;
    }
    return parsed as SessionViewSnapshot;
  } catch {
    return null;
  }
}

/** Explicit clear. Used by the Customize view panel's "Reset to
 *  default" footer so the next reload starts pristine instead of
 *  restoring the just-reset state. */
export function clearSessionViewSnapshot(
  surface: SessionViewSurface,
): void {
  try {
    sessionStorage.removeItem(SESSION_VIEW_KEY[surface]);
  } catch {
    /* sessionStorage may be blocked — silent degrade per spec §9.9 */
  }
}

function writeSessionViewSnapshot(
  surface: SessionViewSurface,
  fields: SessionViewSnapshotFields,
): void {
  try {
    const payload: SessionViewSnapshot = {
      schemaVersion: SCHEMA_VERSION,
      capturedAt: new Date().toISOString(),
      surface,
      ...fields,
    };
    sessionStorage.setItem(
      SESSION_VIEW_KEY[surface],
      JSON.stringify(payload),
    );
  } catch {
    /* Quota exceeded or sessionStorage blocked. Per spec §9.9 we
       silently degrade — the in-memory state still works, and the
       previous successful write (if any) survives. */
  }
}

/** Debounced autosave hook.
 *
 * The hook fingerprints `fields` via JSON.stringify so it can ignore
 * the new-object-every-render dependency churn that would otherwise
 * fire the effect on every parent rerender. When the fingerprint
 * actually changes, a 200ms timer schedules the write; if another
 * change arrives before the timer fires, the previous timer is
 * cleared and a fresh one is scheduled. This is the standard
 * trailing-edge debounce pattern.
 *
 * The hook reads from a ref at fire time rather than the captured
 * `fields` closure so the latest value wins even if React's render
 * cadence skipped an intermediate state. */
export function useSessionViewAutosave(
  surface: SessionViewSurface,
  fields: SessionViewSnapshotFields,
): void {
  const fingerprint = JSON.stringify(fields);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  useEffect(() => {
    const handle = setTimeout(() => {
      writeSessionViewSnapshot(surface, fieldsRef.current);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [surface, fingerprint]);
}
