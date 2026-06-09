/**
 * Saved Views — multi-property filter combinations a user can name,
 * save, and restore later. Mounted in both the main Case Queue and the
 * Attorney Dashboard via the shared `SavedViewsMenu` component.
 *
 * What gets captured in a view:
 *  - quickFilter (the active tab)
 *  - column sort state
 *  - extraFilters bag (every catalog filter currently active —
 *    assignee / crime / account type / date range / workflow stage /
 *    case status / country / request type / SLA tier / operational
 *    badges; see `extraFilterCatalog.ts`)
 *
 * What is *not* captured: the search box (treated as a transient
 * lookup, not a persistent slice) and the view-mode toggle (cards /
 * list / preview is a layout preference, not a filter).
 *
 * Persistence: localStorage, scoped per surface
 * (`dars.savedViews.queue` / `dars.savedViews.attorneyDashboard`).
 *
 * Built-in system views: ship 3 per surface, marked `isSystem: true`
 * so the UI can suppress edit / delete. Users can stack any number
 * of their own views on top.
 */

import type { ColumnId, SortState } from "./caseListColumns";

export type SavedViewSurface = "queue" | "attorneyDashboard";

/** Filter snapshot common to both surfaces. The badges filter (and the
 *  four formerly-standalone toolbar dropdowns) live inside
 *  `extraFilters` now — keyed by `FilterDef.id` (see
 *  `extraFilterCatalog.ts`). */
export interface CommonViewFilters {
  quickFilter: string;
  sortState: SortState | null;
  /** Extra filters mounted via the "+ Add filter" menu. Optional for
   *  back-compat with views saved before the catalog shipped. */
  extraFilters?: Record<string, unknown>;
  /** Page-level scope. "active" = non-resolved cases only (default);
   *  "all" = include resolved cases. Optional for back-compat with
   *  views saved before the scope toggle shipped — readers should
   *  treat `undefined` as `"active"`. A re-opened case naturally
   *  re-enters Active because the predicate compares against the
   *  case's *current* stage, not its history. */
  caseScope?: "active" | "all";
  /** Up to 2 sort tiebreakers managed via the CustomViewPanel.
   *  Walked in order when the primary `sortState` ties. Optional for
   *  back-compat — legacy views had no concept of multi-key sort,
   *  so readers treat `undefined` as an empty list. */
  sortTiebreakers?: SortState[];
}

/** Case Queue view — same shape as common today now that Case Status /
 *  Country / Request Type / SLA Tier moved into the
 *  catalog-driven `extraFilters` bag. Kept as a named alias for
 *  forward-compatibility (queue-only extension points may land here). */
export interface QueueViewFilters extends CommonViewFilters {}

/** Attorney Dashboard captures the common set only (no granular
 *  dropdowns on that surface today). */
export type AttorneyDashboardViewFilters = CommonViewFilters;

export interface SavedView<F = CommonViewFilters> {
  id: string;
  name: string;
  /** When `true`, the view is shipped by the prototype and cannot be
   *  renamed or deleted from the menu. */
  isSystem: boolean;
  filters: F;
}

// ---------------------------------------------------------------------------
// System defaults — frozen views that ship with the prototype.
// ---------------------------------------------------------------------------

export const SYSTEM_QUEUE_VIEWS: SavedView<QueueViewFilters>[] = [
  {
    id: "sys-queue-all",
    name: "All cases",
    isSystem: true,
    filters: { quickFilter: "all", sortState: null },
  },
  {
    id: "sys-queue-emergency",
    name: "Emergency / Urgent",
    isSystem: true,
    filters: {
      quickFilter: "emergency",
      sortState: { columnId: "due-date" as ColumnId, direction: "asc" },
    },
  },
  {
    id: "sys-queue-overdue",
    name: "Overdue",
    isSystem: true,
    filters: {
      quickFilter: "overdue",
      sortState: { columnId: "due-date" as ColumnId, direction: "asc" },
    },
  },
];

export const SYSTEM_ATTORNEY_VIEWS: SavedView<AttorneyDashboardViewFilters>[] = [
  {
    id: "sys-att-all",
    name: "All escalations",
    isSystem: true,
    filters: { quickFilter: "all", sortState: null },
  },
  {
    id: "sys-att-my-cases",
    name: "My cases",
    isSystem: true,
    filters: { quickFilter: "myCases", sortState: null },
  },
  {
    id: "sys-att-threat-to-life",
    name: "Threat to life",
    isSystem: true,
    filters: {
      quickFilter: "threatToLife",
      sortState: { columnId: "due-date" as ColumnId, direction: "asc" },
    },
  },
];

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY: Record<SavedViewSurface, string> = {
  queue: "dars.savedViews.queue",
  attorneyDashboard: "dars.savedViews.attorneyDashboard",
};

const SELECTED_KEY: Record<SavedViewSurface, string> = {
  queue: "dars.savedViews.queue.selected",
  attorneyDashboard: "dars.savedViews.attorneyDashboard.selected",
};

/** Read the user's saved views (NOT including system defaults). */
export function loadUserSavedViews<F = CommonViewFilters>(
  surface: SavedViewSurface,
): SavedView<F>[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY[surface]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedView<F>[];
  } catch {
    return [];
  }
}

export function writeUserSavedViews<F = CommonViewFilters>(
  surface: SavedViewSurface,
  views: SavedView<F>[],
): void {
  try {
    localStorage.setItem(STORAGE_KEY[surface], JSON.stringify(views));
  } catch {
    /* localStorage may be blocked or full */
  }
}

export function readSelectedViewId(
  surface: SavedViewSurface,
): string | undefined {
  try {
    return localStorage.getItem(SELECTED_KEY[surface]) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeSelectedViewId(
  surface: SavedViewSurface,
  id: string | undefined,
): void {
  try {
    if (id) localStorage.setItem(SELECTED_KEY[surface], id);
    else localStorage.removeItem(SELECTED_KEY[surface]);
  } catch {
    /* localStorage may be blocked */
  }
}

// ---------------------------------------------------------------------------
// Helpers — capture current state into a view, apply view onto runtime
// ---------------------------------------------------------------------------

/** Generate a stable ID for a freshly-saved view. */
export function generateViewId(): string {
  return `view-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/** Deep-equality check used to detect when the current runtime state
 *  has drifted away from a saved view — drives the "(modified)" tag
 *  in the SavedViewsMenu. */
export function viewMatchesCurrent(
  view: SavedView<CommonViewFilters>,
  current: CommonViewFilters,
): boolean {
  const v = view.filters;
  if (v.quickFilter !== current.quickFilter) return false;
  const vs = v.sortState;
  const cs = current.sortState;
  if (vs || cs) {
    if (!vs || !cs) return false;
    if (vs.columnId !== cs.columnId || vs.direction !== cs.direction) return false;
  }
  // Extra-filter bag — shallow equality on stringified entries. Keeps
  // the saved view "(modified)" tag accurate when a user mounts /
  // removes / tweaks any extra filter (badges, assignee, etc.).
  const ve = v.extraFilters ?? {};
  const ce = current.extraFilters ?? {};
  const vKeys = Object.keys(ve).sort();
  const cKeys = Object.keys(ce).sort();
  if (vKeys.length !== cKeys.length) return false;
  for (let i = 0; i < vKeys.length; i++) {
    if (vKeys[i] !== cKeys[i]) return false;
    if (JSON.stringify(ve[vKeys[i]]) !== JSON.stringify(ce[cKeys[i]])) {
      return false;
    }
  }
  return true;
}

/** Queue variant of the equality check — currently identical to the
 *  common check because the formerly-explicit dropdown fields moved
 *  into the `extraFilters` bag. Kept as a separate export so the
 *  CaseQueue can extend it with queue-only comparisons later. */
export function queueViewMatchesCurrent(
  view: SavedView<QueueViewFilters>,
  current: QueueViewFilters,
): boolean {
  return viewMatchesCurrent(view as SavedView<CommonViewFilters>, current);
}
