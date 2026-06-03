/**
 * Case Queue Component
 *
 * Orchestrates the case queue list view. Card rendering is delegated to
 * sub-components in /components/case-queue/ to stay within Babel limits:
 *
 *   case-queue-types.ts              — types, mock data, helper functions
 *   CaseCardHeader.tsx               — Title row: Case ID + Blocked by LE + Stage + Due Date
 *   CaseCardOperationalBadges.tsx    — Row 1: Urgency | Identifiers | Services | Enterprise
 *   CaseCardDetails.tsx              — Row 2-3: property grid + crime tags + metadata
 *   CaseCardActions.tsx              — Right column: contextual action buttons
 *
 * Option C applied: uniform border-l-4, P-badge as primary accessible signal.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  FileText,
  AlertTriangle,
  AlertCircle,
  Shield,
  Building2,
  Globe,
  UserCheck,
  UserX,
  Clock,
  Scale,
  Search,
} from "lucide-react";
import { cn } from "./ui/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

// Sub-components
import { CaseCardHeader } from "./case-queue/CaseCardHeader";
import { CaseCardDetails } from "./case-queue/CaseCardDetails";
import { CaseCardActions } from "./case-queue/CaseCardActions";
import { CaseCardOperationalBadges } from "./case-queue/CaseCardOperationalBadges";
import {
  CaseQueueViewToggle,
  type CaseListViewMode,
  VIEW_MODE_LABEL,
} from "./case-queue/CaseQueueViewToggle";
import { CaseQueueListRow } from "./case-queue/CaseQueueListRow";
import { CaseQueueListHeader } from "./case-queue/CaseQueueListHeader";
import {
  defaultColumnWidths,
  sanitizeColumnWidths,
  buildSortComparator,
  type ColumnId,
  type ColumnWidths,
  type SortState,
} from "./case-queue/caseListColumns";
import { CaseQueueBulkActionsBar } from "./case-queue/CaseQueueBulkActionsBar";
import { BulkAssignDialog } from "./assignee/BulkAssignDialog";
import { RESPONSE_SPECIALISTS } from "../constants/caseConstants";
import { getCaseIdentifierValues } from "../utils/caseDataRegistry";
// BadgeFilterPopover removed — operational-badges filter now mounted
// through the catalog-driven "+ Add filter" menu (`extraFilterCatalog`).
import { SavedViewsMenu } from "./case-queue/SavedViewsMenu";
import { CaseQueueSortByMenu } from "./case-queue/CaseQueueSortByMenu";
import { SaveViewDialog } from "./case-queue/SaveViewDialog";
import { AddFilterMenu } from "./case-queue/AddFilterMenu";
import { ExtraFilterChip } from "./case-queue/ExtraFilterChip";
import { AdvancedFiltersPanel } from "./case-queue/AdvancedFiltersPanel";
import {
  FILTER_CATALOG,
  caseMatchesExtraFilters,
  distinctAssignees,
  distinctCrimes,
  getFilterDef,
} from "./case-queue/extraFilterCatalog";
import {
  SYSTEM_QUEUE_VIEWS,
  generateViewId,
  loadUserSavedViews,
  writeUserSavedViews,
  readSelectedViewId,
  writeSelectedViewId,
  queueViewMatchesCurrent,
  type SavedView,
  type QueueViewFilters,
} from "./case-queue/savedViews";
import { PageContainer } from "./layout/PageContainer";
import { CaseQueuePreviewPane } from "./case-queue/CaseQueuePreviewPane";
import { toast } from "sonner@2.0.3";
import { useStatusAnnouncer } from "./StatusAnnouncer";

// Shared types & helpers
import {
  CURRENT_USER,
  MOCK_CASES,
  getPriorityConfig,
  getNextAction,
  getWorkflowStageFromCaseStage,
  isHighPriorityCrime,
  getAccountExistenceFlags,
} from "./case-queue/case-queue-types";
import type { CaseQueueItem } from "./case-queue/case-queue-types";
// SLA tier sort removed — SLA Deadline is a filter now (see slaTierFilter).

// Re-export for external consumers
export { getAccountExistenceFlags };

// ── Quick-filter tabs (Outlook / Teams view-tab pattern) ─────────────────
// Mutually exclusive saved views above the search row. Exactly one tab is
// active at any time. The leftmost tab ("All") is the no-filter default;
// picking another tab replaces the active view.
type QuickFilter =
  | "all"
  | "myCases"
  | "unassigned"
  | "emergency"
  | "overdue"
  | "escalated";

/** Urgency tier drives the count chip + leading icon colour:
 *  - "alert" → red (Emergency, Overdue) — operational red-flag attention
 *  - "warn"  → amber (Escalated) — needs review but not code-red
 *  - "info"  → neutral (All, My Cases, Unassigned) — informational only */
type QuickFilterUrgency = "alert" | "warn" | "info";

interface QuickFilterTab {
  key: QuickFilter;
  label: string;
  /** Returns true when the case matches this tab's predicate.
   *  For the "all" tab the predicate always returns true. */
  predicate: (c: CaseQueueItem) => boolean;
  urgency: QuickFilterUrgency;
  /** Optional leading icon — present on the three needs-attention tabs. */
  icon?: typeof AlertTriangle;
}

const QUICK_FILTERS: QuickFilterTab[] = [
  {
    key: "all",
    label: "All",
    predicate: () => true,
    urgency: "info",
  },
  {
    key: "myCases",
    label: "My Cases",
    predicate: (c) => c.assigneeName === CURRENT_USER,
    urgency: "info",
  },
  {
    key: "unassigned",
    label: "Unassigned",
    predicate: (c) => !c.assigneeName,
    urgency: "info",
  },
  {
    key: "emergency",
    // Both ETSI tiers P0 (Emergency — no legal demand attached) and P1
    // (Urgent — legal demand attached) qualify as "needs attention now."
    // Users can refine via the granular Request Type / SLA dropdowns.
    label: "Emergency/Urgent",
    predicate: (c) =>
      c.casePriority === "Emergency" || c.casePriority === "Urgent",
    urgency: "alert",
    icon: AlertTriangle,
  },
  {
    key: "overdue",
    label: "Overdue",
    predicate: (c) => {
      const due = new Date(c.dueDate).getTime();
      return Number.isFinite(due) && due < Date.now();
    },
    urgency: "alert",
    icon: Clock,
  },
  {
    key: "escalated",
    label: "Escalated",
    predicate: (c) => Boolean(c.assignedToLawyer || c.escalatedToLE),
    urgency: "warn",
    icon: Scale,
  },
  // "On GFR Hold" quick-filter removed — the same filter is now
  // available via the operational-badges Badges filter, which composes
  // with the rest of the toolbar instead of forcing a tab selection.
];

/** Per-tier chip + icon styles. When count is 0 we override to muted slate
 *  regardless of tier so a quiet day doesn't scream red. */
function chipClassesFor(urgency: QuickFilterUrgency, count: number): string {
  if (count === 0) {
    return "bg-slate-100 text-slate-500 border-slate-200";
  }
  switch (urgency) {
    case "alert":
      return "bg-red-50 text-red-700 border-red-200";
    case "warn":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function iconClassFor(urgency: QuickFilterUrgency, count: number): string {
  if (count === 0) return "text-slate-400";
  if (urgency === "alert") return "text-red-600";
  if (urgency === "warn") return "text-amber-600";
  return "text-slate-500";
}

interface CaseQueueProps {
  onCaseSelect: (caseId: string, workflowStage?: "triage" | "fulfillment" | "collection") => void;
}

// View-mode persistence and viewport-min-width thresholds. The Preview
// pane needs at least ~1024 px so the list + pane + LeftNavRail all fit.
const VIEW_MODE_STORAGE_KEY = "dars.caseQueue.viewMode";
const COLUMN_WIDTHS_STORAGE_KEY = "dars.caseQueue.columnWidths";
const PREVIEW_PANE_MIN_VIEWPORT = 1024;

function readPersistedColumnWidths(): ColumnWidths {
  try {
    const raw = localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
    if (!raw) return defaultColumnWidths();
    return sanitizeColumnWidths(JSON.parse(raw));
  } catch {
    return defaultColumnWidths();
  }
}

function readPersistedViewMode(): CaseListViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (v === "cards" || v === "list" || v === "preview") return v;
  } catch {
    /* localStorage may be blocked (sandboxed iframes etc.) */
  }
  return "cards";
}

export function CaseQueue({ onCaseSelect }: CaseQueueProps) {
  const { announce: announceStatus } = useStatusAnnouncer();
  const [searchTerm, setSearchTerm] = useState("");
  const [cases, setCases] = useState<CaseQueueItem[]>(MOCK_CASES);

  // Bulk-assign dialog (Surface E of the AssignedTo migration). Opens from
  // the bulk-actions toolbar's "Assign…" button.
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);

  // Inline queue-row reassignment (Surface A of the AssignedTo migration).
  // Mutates the in-memory list so the chip reflects the change immediately.
  // MOCK_CASES itself stays untouched — the prototype has no persistence
  // layer, so reassignments survive only for the current session.
  const handleQueueReassign = useCallback(
    (caseId: string, nextAssignee: string) => {
      setCases((prev) =>
        prev.map((c) =>
          c.caseId === caseId ? { ...c, assigneeName: nextAssignee } : c,
        ),
      );
    },
    [],
  );

  // ── Outlook-style view mode (Cards / Detailed list / Preview pane) ────
  const [viewMode, setViewModeRaw] = useState<CaseListViewMode>(() =>
    readPersistedViewMode(),
  );
  const [previewPaneWidth, setPreviewPaneWidth] = useState<number>(480);
  // Detailed-list column widths — per-column pixels, persisted to
  // localStorage so the user's layout survives reloads. The Preview-
  // pane dense mode keeps its own fixed grid (no resize).
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() =>
    readPersistedColumnWidths(),
  );
  const setColumnWidth = (columnId: ColumnId, nextWidth: number) => {
    setColumnWidths((prev) => {
      if (prev[columnId] === nextWidth) return prev;
      const next = { ...prev, [columnId]: nextWidth };
      try {
        localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* localStorage may be blocked */
      }
      return next;
    });
  };
  // Multi-select for batch Pick / Release / Assign.
  const [bulkSelectedCaseIds, setBulkSelectedCaseIds] = useState<Set<string>>(
    () => new Set(),
  );
  // Single-select preview (preserved across mode switches so the user
  // can hop Cards ↔ Detailed list ↔ Preview without losing their place).
  const [selectedPreviewCaseId, setSelectedPreviewCaseId] = useState<
    string | null
  >(null);
  // Track viewport width to disable Preview mode on narrow screens.
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerWidth : 1920,
  );
  // Refs we hand to focus restoration when the user opens then returns
  // to a case — the previously-active row's element is preserved here
  // so we can re-focus it.
  const lastOpenedRowRef = useRef<HTMLElement | null>(null);

  const previewPaneDisabled = viewportWidth < PREVIEW_PANE_MIN_VIEWPORT;
  // When the viewport shrinks below the preview-pane minimum, fall back
  // to Detailed list so the user doesn't get a cramped layout. The
  // localStorage preference is preserved — when the viewport widens
  // again, the mode flips back to Preview.
  const effectiveViewMode: CaseListViewMode =
    viewMode === "preview" && previewPaneDisabled ? "list" : viewMode;

  const setViewMode = (next: CaseListViewMode) => {
    setViewModeRaw(next);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
    } catch {
      /* localStorage may be blocked */
    }
    announceStatus(`Switched to ${VIEW_MODE_LABEL[next]}`);
  };

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Ctrl+1 / Ctrl+2 / Ctrl+3 view-mode shortcuts. Skip when a text
  // input has focus so the user can still type "Ctrl+A select-all" etc.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "1") {
        e.preventDefault();
        setViewMode("cards");
      } else if (e.key === "2") {
        e.preventDefault();
        setViewMode("list");
      } else if (e.key === "3" && !previewPaneDisabled) {
        e.preventDefault();
        setViewMode("preview");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPaneDisabled]);

  // Single active quick-filter tab. Default "all" applies no narrowing.
  // Tabs are mutually exclusive — picking another replaces the active view.
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  // Badges filter moved into the catalog-driven "+ Add filter" menu —
  // its value now lives in the `extraFilters` bag below.
  // Note: the four formerly-standalone toolbar dropdown filters
  // (case status / country / request type / SLA tier) moved into the
  // catalog-driven "+ Add filter" menu — their values now live in the
  // `extraFilters` bag below.

  // 3F (UX-Polish): click-to-sort on Priority / Due Date / Stage column
  // headers. Layered on top of the Sort dropdown so the dropdown remains
  // the tiebreaker when no column sort is active.
  const [sortState, setSortState] = useState<SortState | null>(null);
  const handleColumnSort = (columnId: ColumnId) => {
    setSortState((prev) => {
      if (!prev || prev.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (prev.direction === "asc") return { columnId, direction: "desc" };
      return null; // asc → desc → none cycle
    });
  };
  // Redesign Preview + Wireframes state was lifted to App.tsx — both
  // modals are now triggered from the App header's Help & Resources
  // menu so they can fire from any route, not just the case list.

  // ── Saved Views — multi-property filter combinations the user can
  //    name, save, and restore later. System views ship with the
  //    prototype; user views persist to localStorage. Search term is
  //    intentionally NOT captured (treated as a transient lookup). ───
  const [userSavedViews, setUserSavedViews] = useState<
    SavedView<QueueViewFilters>[]
  >(() => loadUserSavedViews<QueueViewFilters>("queue"));
  const [currentViewId, setCurrentViewIdRaw] = useState<string | undefined>(
    () => readSelectedViewId("queue") ?? SYSTEM_QUEUE_VIEWS[0].id,
  );
  const setCurrentViewId = useCallback((id: string | undefined) => {
    setCurrentViewIdRaw(id);
    writeSelectedViewId("queue", id);
  }, []);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);

  // ── Extra filters (catalogue-driven "+ Add filter" menu) — must be
  //    declared above `currentQueueSnapshot` because the snapshot
  //    spreads `extraFilters` into its captured shape. ────────────────
  const [extraFilters, setExtraFilters] = useState<Record<string, unknown>>(
    {},
  );
  const [advancedPanelOpen, setAdvancedPanelOpen] = useState(false);
  const [newlyAddedFilterId, setNewlyAddedFilterId] = useState<string | null>(
    null,
  );
  const handleAddExtraFilter = (filterId: string) => {
    const def = getFilterDef(filterId);
    if (!def) return;
    setExtraFilters((prev) =>
      Object.prototype.hasOwnProperty.call(prev, filterId)
        ? prev
        : { ...prev, [filterId]: def.defaultValue },
    );
    setNewlyAddedFilterId(filterId);
  };
  const handleRemoveExtraFilter = (filterId: string) => {
    setExtraFilters((prev) => {
      const next = { ...prev };
      delete next[filterId];
      return next;
    });
    if (newlyAddedFilterId === filterId) setNewlyAddedFilterId(null);
  };
  const handleChangeExtraFilter = (filterId: string, value: unknown) => {
    setExtraFilters((prev) => ({ ...prev, [filterId]: value }));
  };

  const currentQueueSnapshot: QueueViewFilters = {
    quickFilter,
    sortState,
    extraFilters: { ...extraFilters },
  };
  const currentView = [...SYSTEM_QUEUE_VIEWS, ...userSavedViews].find(
    (v) => v.id === currentViewId,
  );
  const isCurrentViewModified = currentView
    ? !queueViewMatchesCurrent(currentView, currentQueueSnapshot)
    : false;

  const applySavedView = useCallback(
    (view: SavedView<QueueViewFilters>) => {
      const f = view.filters;
      setQuickFilter(f.quickFilter as QuickFilter);
      setSortState(f.sortState);
      setExtraFilters(f.extraFilters ? { ...f.extraFilters } : {});
      setCurrentViewId(view.id);
    },
    [setCurrentViewId],
  );
  const handleSaveCurrentView = useCallback(
    (name: string) => {
      const view: SavedView<QueueViewFilters> = {
        id: generateViewId(),
        name,
        isSystem: false,
        filters: currentQueueSnapshot,
      };
      const next = [...userSavedViews, view];
      setUserSavedViews(next);
      writeUserSavedViews("queue", next);
      setCurrentViewId(view.id);
    },
    [currentQueueSnapshot, userSavedViews, setCurrentViewId],
  );
  const handleDeleteSavedView = useCallback(
    (view: SavedView<QueueViewFilters>) => {
      const next = userSavedViews.filter((v) => v.id !== view.id);
      setUserSavedViews(next);
      writeUserSavedViews("queue", next);
      // If the deleted view was the current one, drop back to the
      // "All cases" system default so the toolbar doesn't read stale.
      if (view.id === currentViewId) {
        setCurrentViewId(SYSTEM_QUEUE_VIEWS[0].id);
      }
    },
    [userSavedViews, currentViewId, setCurrentViewId],
  );

  // Derive the option lists from the actual queue contents so each dropdown
  // only shows values that match real cases — no dead options.
  //
  // Case Status order: active statuses first (Waiting on Triage → In Progress
  // → In Review), then terminal statuses in lifecycle order (Rejected,
  // Cancelled, No Data Provided, Resolved). Any unknown status that shows
  // up in real data falls to the bottom of the list alphabetically.
  const CASE_STATUS_ORDER = [
    "Waiting on Triage",
    "In Progress",
    "In Review",
    "Rejected",
    "Cancelled",
    "No Data Provided",
    "Resolved",
  ];
  const presentStatuses = new Set(
    cases.map((c) => c.caseStage).filter(Boolean),
  );
  const orderedKnownStatuses = CASE_STATUS_ORDER.filter((s) =>
    presentStatuses.has(s),
  );
  const unknownStatuses = Array.from(presentStatuses)
    .filter((s) => !CASE_STATUS_ORDER.includes(s))
    .sort((a, b) => a.localeCompare(b));
  const availableCaseStatuses = [...orderedKnownStatuses, ...unknownStatuses];
  const availableCountries = Array.from(
    new Set(cases.map((c) => c.country).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const availableJurisdictions = Array.from(
    new Set(cases.map((c) => c.jurisdiction).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const availableRequestTypes = Array.from(
    new Set(cases.map((c) => c.requestType).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const availableRequestSubTypes = Array.from(
    new Set(
      cases
        .map((c) => c.requestSubType)
        .filter((s): s is string => !!s && s !== "None"),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const availableServices = Array.from(
    new Set(cases.flatMap((c) => c.servicesRequested).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  // Filter pipeline order (changed in May 2026 to support tab counts):
  // dropdowns first → tab predicate → search. The tab counts reflect the
  // dropdown-filtered slice so picking Country = "United States" shrinks
  // "My Cases" accordingly. The helper-text row below the tabs flags this
  // behavior to the user.

  // The four standalone dropdowns + the badges popover used to filter
  // here. They all live in the catalog-driven "+ Add filter" menu now,
  // so the chain narrows from `cases` directly via the extras bag.
  const extraFilteredCases = cases.filter((c) =>
    caseMatchesExtraFilters(c, extraFilters),
  );

  // Per-tab counts, computed against the extra-filter slice. Drives
  // the count chip next to each tab label.
  const filterCounts = QUICK_FILTERS.reduce(
    (acc, tab) => {
      acc[tab.key] =
        tab.key === "all"
          ? extraFilteredCases.length
          : extraFilteredCases.filter(tab.predicate).length;
      return acc;
    },
    {} as Record<QuickFilter, number>,
  );

  // Apply the active quick-filter tab to the extra-filtered slice.
  const activeQuickFilter =
    QUICK_FILTERS.find((t) => t.key === quickFilter) ?? QUICK_FILTERS[0];
  const quickFilteredCases = extraFilteredCases.filter(
    activeQuickFilter.predicate,
  );

  // Apply search filter — matches across the queue-level fields (case ID,
  // assignee, country, …), the nature-of-crime tags, and the case's
  // identifier values (email addresses, phone numbers, account IDs, etc.)
  // pulled lazily from the same FormData the case form will render.
  const term = searchTerm.trim().toLowerCase();
  const filteredCases = term
    ? quickFilteredCases.filter((c) => {
        const queueFieldHit = Object.entries(c).some(([key, value]) => {
          if (key === "natureOfCrime" && Array.isArray(value)) {
            return value.some((crime) =>
              String(crime).toLowerCase().includes(term),
            );
          }
          if (typeof value === "string") {
            return value.toLowerCase().includes(term);
          }
          return false;
        });
        if (queueFieldHit) return true;
        return getCaseIdentifierValues(c.caseId, c).some((v) =>
          v.toLowerCase().includes(term),
        );
      })
    : quickFilteredCases;

  // Sort cases — column click-to-sort (3F) takes precedence; the toolbar
  // dropdown is the fallback tiebreaker for ties or when no column sort
  // is active.
  const columnComparator = buildSortComparator(sortState);
  const sortedCases = [...filteredCases].sort((a, b) => {
    const colCmp = columnComparator(a, b);
    if (colCmp !== 0) return colCmp;
    // Default tiebreaker — due-date ascending (most-urgent first) when
    // no column sort is active. Replaces the removed Sort By dropdown.
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // ── Selection-state hygiene ──────────────────────────────────────────
  // Drop bulk- or preview-selections that no longer match a visible row
  // (e.g., the user changed a filter that hides the case). This keeps the
  // bulk-actions bar honest and prevents the preview pane from clinging
  // to a hidden case.
  const visibleCaseIds = useMemo(
    () => new Set(sortedCases.map((c) => c.caseId)),
    [sortedCases],
  );
  useEffect(() => {
    setBulkSelectedCaseIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleCaseIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
    if (
      selectedPreviewCaseId &&
      !visibleCaseIds.has(selectedPreviewCaseId)
    ) {
      setSelectedPreviewCaseId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCaseIds]);

  const selectedPreviewCase = useMemo(
    () =>
      selectedPreviewCaseId
        ? sortedCases.find((c) => c.caseId === selectedPreviewCaseId) ?? null
        : null,
    [selectedPreviewCaseId, sortedCases],
  );

  // ── Bulk-action handlers ─────────────────────────────────────────────
  // The prototype's MOCK_CASES is immutable, so these handlers only fire
  // toasts. When the queue starts persisting case mutations, wire each
  // here into the real Pick / Release / Assign paths.
  const toggleBulkSelected = (caseId: string) => {
    setBulkSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };
  const clearBulkSelection = () => setBulkSelectedCaseIds(new Set());
  // Select-all closes the gap between a partial selection and the full
  // visible (filter + sort respected) set. Announces for screen readers
  // so the size jump is audible.
  const selectAllVisible = () => {
    setBulkSelectedCaseIds(new Set(sortedCases.map((c) => c.caseId)));
    announceStatus(
      `Selected all ${sortedCases.length} visible case${sortedCases.length === 1 ? "" : "s"}.`,
    );
  };
  // Tri-state toggle for the header-row checkbox: 0 → all selected;
  // partial → all selected; all → cleared. Mirrors Outlook / Gmail.
  const toggleSelectAllVisible = () => {
    if (bulkSelectedCaseIds.size >= sortedCases.length && sortedCases.length > 0) {
      clearBulkSelection();
    } else {
      selectAllVisible();
    }
  };
  /**
   * Apply a single assignee (or "" to clear) to every selected case in one
   * pass. Routes through `setCases` directly with one batch update — using
   * `handleQueueReassign` per case would call `setCases` N times and
   * re-trigger N renders / N toasts. We want exactly one batch toast.
   */
  const applyBulkAssignment = useCallback(
    (next: string, targetIds?: string[]) => {
      const ids = targetIds ?? Array.from(bulkSelectedCaseIds);
      if (ids.length === 0) return;
      const normalized = next.trim();
      // Filter to cases that actually need to change (idempotency).
      const idSet = new Set(ids);
      const changed: string[] = [];
      setCases((prev) =>
        prev.map((c) => {
          if (!idSet.has(c.caseId)) return c;
          const cur = (c.assigneeName ?? "").trim();
          if (cur === normalized) return c;
          changed.push(c.caseId);
          return { ...c, assigneeName: normalized };
        }),
      );
      const count = changed.length;
      if (count === 0) {
        toast.info("No changes — selected cases already match.");
        announceStatus("No changes to apply.");
        return;
      }
      if (!normalized) {
        toast.info(`Cleared assignment on ${count} case${count === 1 ? "" : "s"}`);
        announceStatus(`Cleared assignment on ${count} cases.`);
      } else {
        toast.success(`Reassigned ${count} case${count === 1 ? "" : "s"} to ${normalized}`);
        announceStatus(`Reassigned ${count} cases to ${normalized}.`);
      }
    },
    [bulkSelectedCaseIds, announceStatus],
  );

  const handleBulkPick = () => {
    applyBulkAssignment(CURRENT_USER);
    clearBulkSelection();
  };
  const handleBulkRelease = () => {
    applyBulkAssignment("");
    clearBulkSelection();
  };
  const handleBulkAssign = () => {
    setBulkAssignDialogOpen(true);
  };

  // Row open handler wraps the parent callback and stashes the row
  // element so focus restores on return. The lastOpenedRowRef is
  // consulted on the next render after the queue re-mounts.
  const handleOpenCase = (caseId: string, ev?: React.MouseEvent<HTMLElement>) => {
    if (ev) lastOpenedRowRef.current = ev.currentTarget;
    const workflowStage = getWorkflowStageFromCaseStage(
      cases.find((c) => c.caseId === caseId)?.caseStage ?? "Waiting on Triage",
    );
    onCaseSelect(caseId, workflowStage);
  };

  return (
    /* Phase 3: PageContainer caps body width at --page-max-w (1280px) and
       applies the --page-gutter-x horizontal padding so the queue route
       centers on wide monitors. The Queue has no sticky case header to
       exclude — the whole route lives inside the container. */
    <PageContainer>
    {/* Queue root vertical rhythm — consumes the Phase 1 spacing token so
        Phase 2's retune (16 → 24px) ripples through here in one diff. */}
    <div className="space-y-[var(--section-gap)]">
      {/* Queue Header. The "Redesign Preview" + "Wireframes" buttons
          moved into the App header's Help & Resources menu so the
          page header stays focused on case-list context only. */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Cases</h1>
          <p className="text-sm text-slate-600 mt-1">
            {filteredCases.length} {filteredCases.length === 1 ? "case" : "cases"} found
          </p>
        </div>
      </div>

      {/* Toolbar — split across three rows:
            Row 1: Quick-filter tabs (left)  ·  View-mode toggle (right)
            Row 2: Search · Saved Views · + Add Filter
            Row 3: Active extra-filter chips (conditional)
          The split groups controls by purpose — "what scope am I
          looking at" up top, "tools for narrowing" in the middle, and
          "what filters are currently active" at the bottom. */}

      {/* Row 1 — Quick filter tabs + View toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          role="tablist"
          aria-label="Quick filters"
          className="flex items-center gap-1 flex-wrap flex-1"
        >
          {QUICK_FILTERS.map((tab) => {
            const active = quickFilter === tab.key;
            const count = filterCounts[tab.key];
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                aria-label={`${tab.label}, ${count} ${count === 1 ? "case" : "cases"}`}
                type="button"
                onClick={() => setQuickFilter(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                  active
                    ? "bg-[#0078d4] text-white border-[#0078d4]"
                    : "bg-white text-[#323130] border-[#e1dfdd] hover:bg-[#f3f2f1]",
                )}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      "w-3.5 h-3.5",
                      active ? "text-white" : iconClassFor(tab.urgency, count),
                    )}
                    aria-hidden="true"
                  />
                )}
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px]",
                    active
                      ? "bg-white/20 text-white"
                      : count === 0
                        ? "bg-[#f3f2f1] text-[#a19f9d]"
                        : tab.urgency === "alert"
                          ? "bg-[#fde7e9] text-[#a4262c]"
                          : tab.urgency === "warn"
                            ? "bg-[#fff4ce] text-[#7a4f00]"
                            : "bg-[#deecf9] text-[#0078d4]",
                  )}
                  aria-hidden="true"
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <CaseQueueViewToggle
          value={effectiveViewMode}
          onChange={setViewMode}
          previewDisabled={previewPaneDisabled}
        />
      </div>

      {/* Row 2 — Search + view-state controls. */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px] max-w-[480px]">
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#605e5c] pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Search by case ID, identifier, assignee, country…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-sm"
            aria-label="Search cases"
          />
        </div>

        {/* Saved Views — multi-property filter combinations the user
            can name, save, and restore. System views ship with the
            prototype; user views persist to localStorage. */}
        <SavedViewsMenu<QueueViewFilters>
          systemViews={SYSTEM_QUEUE_VIEWS}
          userViews={userSavedViews}
          currentViewId={currentViewId}
          isModified={isCurrentViewModified}
          onApply={applySavedView}
          onSaveCurrent={() => setSaveViewDialogOpen(true)}
          onDelete={handleDeleteSavedView}
        />

        {/* "+ Add filter" — catalog of additional filter properties.
            Each picked filter renders on Row 3 below as a removable
            chip with an inline value-control popover. */}
        <AddFilterMenu
          activeFilterIds={Object.keys(extraFilters)}
          onAdd={handleAddExtraFilter}
          onOpenAdvanced={() => setAdvancedPanelOpen(true)}
        />

        {/* Sort By — drives the same `sortState` the Detailed-list
            column headers use. Surfaced here so Card-view / Preview-pane
            users (who have no column headers to click) can still pick a
            sort order. */}
        <CaseQueueSortByMenu sortState={sortState} onChange={setSortState} />
      </div>
      {/* Active extra-filter chips — one chip per filter mounted via
          the "+ Add filter" menu or the Advanced Filters panel. The
          four formerly-standalone toolbar dropdowns (Case Status /
          Country / Request Type / SLA Deadline) are now catalog entries
          that surface here as chips. */}
      {Object.keys(extraFilters).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap -mt-1">
          {FILTER_CATALOG.filter((def) =>
            Object.prototype.hasOwnProperty.call(extraFilters, def.id),
          ).map((def) => (
            <ExtraFilterChip
              key={def.id}
              def={def}
              value={extraFilters[def.id]}
              defaultOpen={newlyAddedFilterId === def.id}
              onChange={(v) => handleChangeExtraFilter(def.id, v)}
              onRemove={() => handleRemoveExtraFilter(def.id)}
              assigneeOptions={distinctAssignees(cases)}
              crimeOptions={distinctCrimes(cases)}
              caseStatusOptions={availableCaseStatuses}
              countryOptions={availableCountries}
              jurisdictionOptions={availableJurisdictions}
              requestTypeOptions={availableRequestTypes}
              requestSubTypeOptions={availableRequestSubTypes}
              servicesOptions={availableServices}
            />
          ))}
          <button
            type="button"
            onClick={() => setExtraFilters({})}
            className="text-[11px] text-[#0078d4] hover:underline px-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* SLA Deadline legend removed — the per-row priority badge in
          the Detailed-list view now carries the P-level + duration as
          helper text beneath the priority label, so the standalone
          legend block became redundant. The Card view keeps the rail +
          tooltip wiring that already explains the same information. */}

      {/* Live Region for Screen Readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {filteredCases.length} {filteredCases.length === 1 ? "case" : "cases"} found
      </div>

      {/* Cases — rendered branch on view mode. Cards = the existing
          rich layout; Detailed list = compact rows + bulk-actions bar;
          Preview pane = dense rows on the left + resizable preview on
          the right. */}
      {sortedCases.length === 0 ? (
        <Card className="p-16 text-center bg-white/80 backdrop-blur-sm shadow-sm border-slate-200/60">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-slate-700">No cases found</p>
          {searchTerm && (
            <p className="text-sm text-slate-500 mt-2">Try adjusting your search criteria</p>
          )}
        </Card>
      ) : effectiveViewMode === "list" ? (
        <div
          role="table"
          aria-label="Case list — detailed"
          aria-rowcount={sortedCases.length + 1 /* +1 for the header row */}
          aria-colcount={12 /* checkbox + 11 content columns */}
          className="bg-white border border-[#edebe9] rounded-md overflow-hidden overflow-x-auto"
        >
          {/* Selection toolbar — sticky top of the list, slides in when
              one or more rows are checked. */}
          <CaseQueueBulkActionsBar
            selectedCount={bulkSelectedCaseIds.size}
            totalCount={sortedCases.length}
            onSelectAll={selectAllVisible}
            onPickAll={handleBulkPick}
            onReleaseAll={handleBulkRelease}
            onAssignAll={handleBulkAssign}
            onClear={clearBulkSelection}
          />
          {/* Column header — labels + select-all + per-column resize
              handles. Sortable columns (Priority / Due Date / Stage) get
              click-to-sort via sortState + onSort. */}
          <CaseQueueListHeader
            totalCount={sortedCases.length}
            selectedCount={bulkSelectedCaseIds.size}
            onToggleSelectAll={toggleSelectAllVisible}
            columnWidths={columnWidths}
            onColumnResize={setColumnWidth}
            sortState={sortState}
            onSort={handleColumnSort}
          />
          {sortedCases.map((caseItem, idx) => {
            const priorityConfig = getPriorityConfig(caseItem.casePriority);
            return (
              <CaseQueueListRow
                key={caseItem.caseId}
                caseItem={caseItem}
                priorityConfig={priorityConfig}
                density="full"
                bulkSelectable
                bulkSelected={bulkSelectedCaseIds.has(caseItem.caseId)}
                onBulkToggle={toggleBulkSelected}
                onOpen={(id) => handleOpenCase(id)}
                ariaRowIndex={idx + 2 /* +1 for the header row offset */}
                columnWidths={columnWidths}
              />
            );
          })}
        </div>
      ) : effectiveViewMode === "preview" ? (
        <div className="flex items-stretch gap-0 bg-white border border-[#edebe9] rounded-md overflow-hidden relative" style={{ minHeight: 480 }}>
          {/* Left: dense list */}
          <div className="flex-1 min-w-0 flex flex-col" style={{ marginRight: previewPaneWidth }}>
            <div
              role="grid"
              aria-label="Case list — preview pane"
              aria-rowcount={sortedCases.length}
              aria-colcount={9 /* checkbox + 8 dense content columns (incl. internal-escalation) */}
              className="flex-1 overflow-y-auto"
            >
              {/* Selection toolbar pinned to the top of the scroll
                  container so it stays visible while the user scrolls
                  the list. */}
              <CaseQueueBulkActionsBar
                selectedCount={bulkSelectedCaseIds.size}
                onPickAll={handleBulkPick}
                onReleaseAll={handleBulkRelease}
                onAssignAll={handleBulkAssign}
                onClear={clearBulkSelection}
              />
              {/* Column header — restored in preview mode so screen
                  readers + sighted users get the column-name context
                  the dense rows below don't repeat. `density="dense"`
                  drops Country/Identifiers/Services to match what the
                  rows show. `bulkSelectable` stays true so the leading
                  checkbox column lines up with the dense rows' own
                  bulk-select checkbox. */}
              <CaseQueueListHeader
                totalCount={sortedCases.length}
                selectedCount={bulkSelectedCaseIds.size}
                onToggleSelectAll={toggleSelectAllVisible}
                bulkSelectable
                density="dense"
                sortState={sortState}
                onSort={handleColumnSort}
              />
              {sortedCases.map((caseItem, idx) => {
                const priorityConfig = getPriorityConfig(caseItem.casePriority);
                return (
                  <CaseQueueListRow
                    key={caseItem.caseId}
                    caseItem={caseItem}
                    priorityConfig={priorityConfig}
                    density="dense"
                    bulkSelectable
                    bulkSelected={bulkSelectedCaseIds.has(caseItem.caseId)}
                    onBulkToggle={toggleBulkSelected}
                    selected={selectedPreviewCaseId === caseItem.caseId}
                    onSelect={(id) => setSelectedPreviewCaseId(id)}
                    onOpen={(id) => handleOpenCase(id)}
                    ariaRowIndex={idx + 2}
                  />
                );
              })}
            </div>
          </div>
          {/* Right: preview pane — absolutely positioned to overlay the
              right edge. The list column shrinks via marginRight so the
              pane never covers content. */}
          <div className="absolute top-0 bottom-0 right-0">
            <CaseQueuePreviewPane
              caseItem={selectedPreviewCase}
              width={previewPaneWidth}
              onResize={setPreviewPaneWidth}
              onOpenCase={(id) => handleOpenCase(id)}
              onClearSelection={() => setSelectedPreviewCaseId(null)}
              onReassign={handleQueueReassign}
            />
          </div>
        </div>
      ) : (
        <ul role="list" className="grid gap-4">
          {sortedCases.map((caseItem) => {
            const priorityConfig = getPriorityConfig(caseItem.casePriority);
            const isAssignedToMe = caseItem.assigneeName === CURRENT_USER;
            const isUnassigned = !caseItem.assigneeName;
            const isAssignedToOther = !isAssignedToMe && !isUnassigned;
            const nextAction = getNextAction(caseItem.caseStage, caseItem.assigneeName);
            const workflowStage = getWorkflowStageFromCaseStage(caseItem.caseStage);
            const highPriorityCrimes = caseItem.natureOfCrime.filter((c) => isHighPriorityCrime(c));
            const regularCrimes = caseItem.natureOfCrime.filter((c) => !isHighPriorityCrime(c));

            return (
              <Card
                key={caseItem.caseId}
                role="button"
                tabIndex={0}
                aria-label={`Open case ${caseItem.caseId}: ${caseItem.requestType}${caseItem.requestSubType ? ` / ${caseItem.requestSubType}` : ""}, ${caseItem.casePriority} priority`}
                className={cn(
                  "p-0 overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 bg-white border-l-4",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-2",
                  priorityConfig.color,
                  isAssignedToMe && "ring-2 ring-blue-100 ring-offset-0"
                )}
                onClick={() => onCaseSelect(caseItem.caseId, workflowStage)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onCaseSelect(caseItem.caseId, workflowStage);
                  }
                }}
              >
                <div className={cn("p-4", caseItem.caseStage === "Resolved" && "opacity-60 grayscale")}>
                  <div className="flex items-start justify-between gap-6">
                    {/* Left Column — Main Info */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <CaseCardHeader
                        caseItem={caseItem}
                      />
                      <CaseCardOperationalBadges
                        caseItem={caseItem}
                        priorityConfig={priorityConfig}
                        highPriorityCrimes={highPriorityCrimes}
                      />
                      <CaseCardDetails
                        caseItem={caseItem}
                        regularCrimes={regularCrimes}
                        onReassign={handleQueueReassign}
                      />
                    </div>

                    {/* Right Column — Contextual Actions */}
                    <CaseCardActions
                      caseItem={caseItem}
                      nextAction={nextAction}
                      workflowStage={workflowStage}
                      isUnassigned={isUnassigned}
                      isAssignedToMe={isAssignedToMe}
                      isAssignedToOther={isAssignedToOther}
                      onCaseSelect={onCaseSelect}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </ul>
      )}

      {/* Wireframes + Redesign Preview modals moved to App.tsx so they
          can fire from any route via the App header Help & Resources
          menu. */}

      {/* Save current view dialog — driven by the Saved Views menu in
          the toolbar. Captures the current filter / sort state under a
          user-supplied name and persists it to localStorage. */}
      <SaveViewDialog
        open={saveViewDialogOpen}
        onOpenChange={setSaveViewDialogOpen}
        existingNames={[
          ...SYSTEM_QUEUE_VIEWS.map((v) => v.name),
          ...userSavedViews.map((v) => v.name),
        ]}
        onSave={handleSaveCurrentView}
      />

      {/* Advanced filters side panel — opened from "+ Add filter →
          Advanced filters…". Drafts the filter bag locally so the
          user can toggle / configure many filters at once and Apply
          atomically. */}
      <AdvancedFiltersPanel
        open={advancedPanelOpen}
        onOpenChange={setAdvancedPanelOpen}
        activeFilters={extraFilters}
        onApply={(next) => setExtraFilters(next)}
        assigneeOptions={distinctAssignees(cases)}
        crimeOptions={distinctCrimes(cases)}
        caseStatusOptions={availableCaseStatuses}
        countryOptions={availableCountries}
        jurisdictionOptions={availableJurisdictions}
        requestTypeOptions={availableRequestTypes}
        requestSubTypeOptions={availableRequestSubTypes}
        servicesOptions={availableServices}
      />

      {/* Bulk Assign Dialog (Surface E) — driven by the bulk-actions toolbar.
          Snapshots the current selection into `cases` for the preview list,
          then commits via `applyBulkAssignment` which fans out through the
          single setCases batch update. */}
      <BulkAssignDialog
        open={bulkAssignDialogOpen}
        onOpenChange={(next) => {
          setBulkAssignDialogOpen(next);
          // Clear the selection after a successful apply (Apply closes the
          // dialog itself). Don't clear on Cancel.
          if (!next && bulkSelectedCaseIds.size === 0) return;
        }}
        cases={cases
          .filter((c) => bulkSelectedCaseIds.has(c.caseId))
          .map((c) => ({ caseId: c.caseId, currentAssignee: c.assigneeName }))}
        specialists={RESPONSE_SPECIALISTS}
        currentUser={CURRENT_USER}
        onApply={(next, targetIds) => {
          applyBulkAssignment(next, targetIds);
          clearBulkSelection();
        }}
      />
    </div>
    </PageContainer>
  );
}