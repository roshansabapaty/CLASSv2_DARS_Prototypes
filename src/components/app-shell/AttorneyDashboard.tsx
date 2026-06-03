/**
 * AttorneyDashboard — filtered case-list view scoped to cases the RS / TS
 * has flagged for Internal Escalation or Lawyer Assignment.
 *
 * Intent: give attorneys a focused queue of work that requires their
 * attention, separate from the general Case Queue that mixes everything.
 *
 * Filter rule (first cut): a case appears here when ANY of:
 *   - `assignedToLawyer === true` (new explicit flag on the queue item)
 *   - `escalatedToLE === true` (existing internal-escalation signal)
 *   - `isThreatToLife === true` (high-priority cases always surface here)
 *
 * Real content (case-specific escalation notes, lawyer assignment timeline,
 * etc.) lands in a follow-up. This first cut reuses the existing
 * CaseCardHeader / CaseCardDetails composition with a stripped-down action
 * column so the page reads as a peer of the main queue.
 */

import * as React from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Scale,
  AlertTriangle,
  ChevronRight,
  Clock,
  Search,
  UserMinus,
  Skull,
  UserCheck,
} from "lucide-react";
import { CURRENT_USER, RESPONSE_SPECIALISTS } from "../../constants/caseConstants";
import { toast } from "sonner@2.0.3";
import { CaseQueueBulkActionsBar } from "../case-queue/CaseQueueBulkActionsBar";
import { BulkAssignDialog } from "../assignee/BulkAssignDialog";
import { cn } from "../ui/utils";
import {
  MOCK_CASES,
  getPriorityConfig,
  type CaseQueueItem,
} from "../case-queue/case-queue-types";
import {
  CaseQueueViewToggle,
  type CaseListViewMode,
  VIEW_MODE_LABEL,
} from "../case-queue/CaseQueueViewToggle";
import { CaseQueueListRow } from "../case-queue/CaseQueueListRow";
import { CaseQueueListHeader } from "../case-queue/CaseQueueListHeader";
import { CaseQueuePreviewPane } from "../case-queue/CaseQueuePreviewPane";
import {
  ATTORNEY_DASHBOARD_COLUMNS,
  defaultColumnWidths,
  buildSortComparator,
  defaultColumnOrder,
  sanitizeColumnOrder,
  applyColumnOrder,
  type ColumnId,
  type ColumnOrder,
  type SortState,
} from "../case-queue/caseListColumns";

import { useDragAutoScroll } from "../../hooks/useDragAutoScroll";

// Per-surface column order storage. The Attorney Dashboard maintains
// its own order independent of the main Case Queue (see CaseQueue.tsx).
const COLUMN_ORDER_STORAGE_KEY = "dars.attorneyDashboard.columnOrder";

function readPersistedColumnOrder(): ColumnOrder {
  try {
    const raw = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!raw) return defaultColumnOrder(ATTORNEY_DASHBOARD_COLUMNS);
    return sanitizeColumnOrder(JSON.parse(raw), ATTORNEY_DASHBOARD_COLUMNS);
  } catch {
    return defaultColumnOrder(ATTORNEY_DASHBOARD_COLUMNS);
  }
}
import { useStatusAnnouncer } from "../StatusAnnouncer";
import {
  getEscalationSummaryForCase,
  isAttorneyAssignedForCase,
  isUnassignedAttorneyEscalation,
  escalationStatusWeight,
  caseHasActiveGfrHold,
  type EscalationDashboardSummary,
} from "../../utils/escalationHelpers";
import {
  getCaseFormDataById,
  getCaseIdentifierValues,
} from "../../utils/caseDataRegistry";
import { EscalationReasonBadges } from "../attorney-escalation/EscalationReasonBadges";
import {
  isCaseInAttorneyQueue,
  getPerIdentifierEscalationSummary,
} from "../../utils/caseEscalation";
// BadgeFilterPopover removed — operational-badges filter now mounted
// through the catalog-driven "+ Add filter" menu.
import { SavedViewsMenu } from "../case-queue/SavedViewsMenu";
import { SaveViewDialog } from "../case-queue/SaveViewDialog";
import { AddFilterMenu } from "../case-queue/AddFilterMenu";
import { ExtraFilterChip } from "../case-queue/ExtraFilterChip";
import { AdvancedFiltersPanel } from "../case-queue/AdvancedFiltersPanel";
import {
  FILTER_CATALOG,
  caseMatchesExtraFilters,
  distinctAssignees,
  distinctCrimes,
  getFilterDef,
} from "../case-queue/extraFilterCatalog";
import {
  SYSTEM_ATTORNEY_VIEWS,
  generateViewId,
  loadUserSavedViews,
  writeUserSavedViews,
  readSelectedViewId,
  writeSelectedViewId,
  viewMatchesCurrent,
  type SavedView,
  type AttorneyDashboardViewFilters,
} from "../case-queue/savedViews";

const VIEW_MODE_STORAGE_KEY = "dars.attorneyDashboard.viewMode";
const QUICK_FILTER_STORAGE_KEY = "dars.attorneyDashboard.quickFilter";
const PREVIEW_PANE_WIDTH_KEY = "dars.attorneyDashboard.previewPaneWidth";

function readPersistedViewMode(): CaseListViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (v === "cards" || v === "list" || v === "preview") return v;
  } catch {
    /* localStorage may be blocked */
  }
  return "cards";
}

function readPersistedPreviewWidth(): number {
  try {
    const v = localStorage.getItem(PREVIEW_PANE_WIDTH_KEY);
    if (v) {
      const n = parseInt(v, 10);
      if (Number.isFinite(n) && n >= 420 && n <= 720) return n;
    }
  } catch {
    /* localStorage may be blocked */
  }
  return 480;
}

// Quick filter set — narrower than the All Cases page. The "Escalated"
// tab is intentionally dropped (the dashboard IS the escalated view).
// "Unassigned" is the critical addition the attorney requested:
// escalations targeted at the Attorney role with no specific assignee
// set, so any attorney can pick the case up. "My cases" matches the
// signed-in user against either the case-level RS assignee OR the
// escalation reviewer assignee — works for attorneys reviewing their
// own escalations and for other roles (e.g., LENS Lead) using this
// dashboard.
type DashboardQuickFilter =
  | "all"
  | "myCases"
  | "unassigned"
  | "threatToLife";

interface DashboardQuickFilterTab {
  key: DashboardQuickFilter;
  label: string;
  predicate: (c: CaseQueueItem) => boolean;
  urgency: "alert" | "warn" | "info";
  icon?: typeof AlertTriangle;
}

/** "My cases" predicate — true when the signed-in user owns the case
 *  as either the RS assignee OR the named escalation reviewer.
 *  Designed for attorneys reviewing their own escalations, but works
 *  for any role using this dashboard (LENS Lead, peer reviewer). */
function matchesMyCases(c: CaseQueueItem): boolean {
  if (c.assigneeName && c.assigneeName === CURRENT_USER) return true;
  const summary = getEscalationSummaryForCase(c.caseId);
  // assigneeLabel is "Any <Role>" for unassigned escalations — those
  // never match a specific user. Otherwise it's the actual name.
  if (
    summary?.assigneeLabel &&
    !summary.assigneeLabel.startsWith("Any ") &&
    summary.assigneeLabel === CURRENT_USER
  ) {
    return true;
  }
  return false;
}

const DASHBOARD_QUICK_FILTERS: DashboardQuickFilterTab[] = [
  { key: "all", label: "All", predicate: () => true, urgency: "info" },
  {
    key: "myCases",
    label: "My cases",
    predicate: matchesMyCases,
    urgency: "info",
    icon: UserCheck,
  },
  {
    key: "unassigned",
    label: "Unassigned",
    predicate: (c) => isUnassignedAttorneyEscalation(c.caseId),
    urgency: "warn",
    icon: UserMinus,
  },
  {
    key: "threatToLife",
    label: "Threat to Life",
    predicate: (c) => c.isThreatToLife === true,
    urgency: "alert",
    icon: Skull,
  },
  // "On GFR Hold" quick-filter removed — the same filter is now
  // available via the operational-badges Badges filter in the toolbar.
];

function readPersistedQuickFilter(): DashboardQuickFilter {
  try {
    const v = localStorage.getItem(QUICK_FILTER_STORAGE_KEY);
    if (
      v === "all" ||
      v === "myCases" ||
      v === "unassigned" ||
      v === "threatToLife"
    ) return v;
  } catch {
    /* localStorage may be blocked */
  }
  return "all";
}

// Legacy FocusReason / "Lawyer assigned" / "Internal escalation" /
// "Threat to life" badges were dropped in favour of the structured
// `<Role> Escalated` chip (via `EscalationSummaryStrip` on each card)
// + the dedicated Threat-to-Life badge below. The static
// `assignedToLawyer` queue flag is still consulted by `isAttorneyFocus`
// for legacy seed compatibility, but it no longer drives its own badge.

function isAttorneyFocus(item: CaseQueueItem): boolean {
  // Combine the legacy queue-row flags with the derived check against the
  // central case-data registry, so escalations created in the case form
  // surface here without needing the queue mock to be hand-edited.
  //
  // GFR-held cases (EU eEvidence — EA legal veto) are surfaced here too:
  // they're high legal stakes by definition and the attorney typically
  // wants visibility even when no attorney escalation has been opened.
  //
  // Phase 2 attorney-escalation merge: `isCaseInAttorneyQueue` is the
  // per-identifier check (any identifier with Pending /
  // InformationRequested attorney escalation). OR'd in so cases that
  // were escalated at the identifier level — without the legacy
  // case-level signals — also surface here.
  const fd = getCaseFormDataById(item.caseId);
  return Boolean(
    isAttorneyAssignedForCase(item.caseId, item.assignedToLawyer) ||
      item.escalatedToLE ||
      item.isThreatToLife ||
      caseHasActiveGfrHold(item.caseId) ||
      (fd ? isCaseInAttorneyQueue(fd) : false),
  );
}

const STATUS_LABEL: Record<string, string> = {
  Pending: "Pending review",
  InformationRequested: "Info requested from Specialist",
  Blocked: "Blocked",
  ApprovedWithConditions: "Approved with conditions",
  ApprovedForDelivery: "Approved",
};

function relativeAge(escalatedAt: Date): string {
  const ms = Date.now() - escalatedAt.getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export interface AttorneyDashboardProps {
  /** Open the case in the Cases app. The dashboard itself never mutates
   *  case state — clicking a card routes through to the main flow. */
  onOpenCase: (caseId: string) => void;
}

export function AttorneyDashboard({ onOpenCase }: AttorneyDashboardProps) {
  const { announce: announceStatus } = useStatusAnnouncer();
  // Local cases state seeded from MOCK_CASES so bulk Pick / Release /
  // Assign can mutate assignment without writing back to the constant.
  // The Main Case Queue keeps its own copy of state; both surfaces
  // hydrate from MOCK_CASES at mount, but stay independent after that
  // (matches the prototype's session-scoped persistence model).
  const [cases, setCases] = React.useState<CaseQueueItem[]>(MOCK_CASES);
  const baseCases = React.useMemo(
    () =>
      cases.filter(isAttorneyFocus).sort((a, b) => {
        // Threat-to-life always wins. Then GFR-held cases (EA legal
        // veto) outrank attorney-escalation Pending — a Full GFR is
        // a higher-stakes block than a routine attorney review.
        // Then attorney-escalation status weight, then legacy signals
        // (escalatedToLE, assignedToLawyer) as final tiebreakers.
        // Phase 2 merge: when escalation-score ties (two routine
        // Pending cases, say), break by due-date ascending so the
        // soonest-due case floats to the top of the queue — matches
        // the prototype's deadline-first sort.
        const score = (x: CaseQueueItem) => {
          const summary = getEscalationSummaryForCase(x.caseId);
          return (
            (x.isThreatToLife ? 1_000 : 0) +
            (caseHasActiveGfrHold(x.caseId) ? 100 : 0) +
            escalationStatusWeight(summary?.status) * 10 +
            (x.escalatedToLE ? 5 : 0) +
            (x.assignedToLawyer ? 1 : 0)
          );
        };
        const sb = score(b);
        const sa = score(a);
        if (sb !== sa) return sb - sa;
        // Tiebreaker — earliest due date first. Missing dates sink
        // to the bottom of the tier.
        const parseDue = (s: string | undefined): number => {
          if (!s) return Number.POSITIVE_INFINITY;
          const t = Date.parse(s);
          return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
        };
        return parseDue(a.dueDate) - parseDue(b.dueDate);
      }),
    [cases],
  );

  // Search + quick filter state. Mirrors the All Cases page pattern but
  // with a narrower tab set (no Escalated tab — redundant on this view).
  const [searchTerm, setSearchTerm] = React.useState("");
  // Badges filter moved into the catalog-driven "+ Add filter" menu —
  // its value rides in the `extraFilters` bag below.
  const [quickFilter, setQuickFilterRaw] = React.useState<DashboardQuickFilter>(
    () => readPersistedQuickFilter(),
  );
  const setQuickFilter = (next: DashboardQuickFilter) => {
    setQuickFilterRaw(next);
    try {
      localStorage.setItem(QUICK_FILTER_STORAGE_KEY, next);
    } catch {
      /* localStorage may be blocked */
    }
  };

  // Apply search first, then the quick-filter predicate.
  // 3F (UX-Polish): click-to-sort on Priority / Due Date / Stage.
  // Applied on top of the default escalation-weight ordering produced by
  // `baseCases.sort` above — when a column sort is active, it takes
  // precedence; the escalation order falls back as the tiebreaker.
  const [sortState, setSortState] = React.useState<SortState | null>(null);
  // User-customised column order — persisted per-surface so this
  // dashboard's layout doesn't bleed into the main Case Queue.
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrder>(() =>
    readPersistedColumnOrder(),
  );
  const handleReorderColumns = (next: ColumnOrder) => {
    setColumnOrder(next);
    try {
      localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* localStorage may be blocked */
    }
  };
  const orderedColumns = React.useMemo(
    () => applyColumnOrder(ATTORNEY_DASHBOARD_COLUMNS, columnOrder),
    [columnOrder],
  );
  // Auto-scroll the dashboard's detailed-list table while dragging a
  // column past the visible edge. The dense preview-pane mode uses a
  // fr-based grid that doesn't overflow, so no scroll wiring there.
  const listTableRef = React.useRef<HTMLDivElement | null>(null);
  useDragAutoScroll(listTableRef, { axis: "x" });
  const handleColumnSort = (columnId: ColumnId) => {
    setSortState((prev) => {
      if (!prev || prev.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (prev.direction === "asc") return { columnId, direction: "desc" };
      return null;
    });
  };

  // ── Saved Views — same component as the main Case Queue, narrower
  //    field set (Attorney Dashboard has no granular dropdowns). ────
  const [userSavedViews, setUserSavedViews] = React.useState<
    SavedView<AttorneyDashboardViewFilters>[]
  >(() =>
    loadUserSavedViews<AttorneyDashboardViewFilters>("attorneyDashboard"),
  );
  const [currentViewId, setCurrentViewIdRaw] = React.useState<
    string | undefined
  >(
    () =>
      readSelectedViewId("attorneyDashboard") ?? SYSTEM_ATTORNEY_VIEWS[0].id,
  );
  const setCurrentViewId = React.useCallback((id: string | undefined) => {
    setCurrentViewIdRaw(id);
    writeSelectedViewId("attorneyDashboard", id);
  }, []);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = React.useState(false);

  // ── Extra filters (catalogue-driven "+ Add filter" menu) — declared
  //    above `currentDashboardSnapshot` because the snapshot spreads
  //    `extraFilters` into its captured shape. ──────────────────────
  const [extraFilters, setExtraFilters] = React.useState<
    Record<string, unknown>
  >({});
  const [advancedPanelOpen, setAdvancedPanelOpen] = React.useState(false);
  const [newlyAddedFilterId, setNewlyAddedFilterId] = React.useState<
    string | null
  >(null);
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

  const currentDashboardSnapshot: AttorneyDashboardViewFilters = {
    quickFilter,
    sortState,
    extraFilters: { ...extraFilters },
  };
  const currentView = [...SYSTEM_ATTORNEY_VIEWS, ...userSavedViews].find(
    (v) => v.id === currentViewId,
  );
  const isCurrentViewModified = currentView
    ? !viewMatchesCurrent(currentView, currentDashboardSnapshot)
    : false;

  const applySavedView = React.useCallback(
    (view: SavedView<AttorneyDashboardViewFilters>) => {
      const f = view.filters;
      setQuickFilter(f.quickFilter as DashboardQuickFilter);
      setSortState(f.sortState);
      setExtraFilters(f.extraFilters ? { ...f.extraFilters } : {});
      setCurrentViewId(view.id);
    },
    [setCurrentViewId],
  );
  const handleSaveCurrentView = React.useCallback(
    (name: string) => {
      const view: SavedView<AttorneyDashboardViewFilters> = {
        id: generateViewId(),
        name,
        isSystem: false,
        filters: currentDashboardSnapshot,
      };
      const next = [...userSavedViews, view];
      setUserSavedViews(next);
      writeUserSavedViews("attorneyDashboard", next);
      setCurrentViewId(view.id);
    },
    [currentDashboardSnapshot, userSavedViews, setCurrentViewId],
  );
  const handleDeleteSavedView = React.useCallback(
    (view: SavedView<AttorneyDashboardViewFilters>) => {
      const next = userSavedViews.filter((v) => v.id !== view.id);
      setUserSavedViews(next);
      writeUserSavedViews("attorneyDashboard", next);
      if (view.id === currentViewId) {
        setCurrentViewId(SYSTEM_ATTORNEY_VIEWS[0].id);
      }
    },
    [userSavedViews, currentViewId, setCurrentViewId],
  );

  // Bulk-select state + handlers — mirrors the main Case Queue's
  // surface so the same UX is available here. The cases-state mutation
  // path uses the local `setCases` introduced above so Pick / Release /
  // Assign reflect immediately in the dashboard list.
  const [bulkSelectedCaseIds, setBulkSelectedCaseIds] = React.useState<
    Set<string>
  >(() => new Set());
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = React.useState(false);

  const toggleBulkSelected = (caseId: string) => {
    setBulkSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };
  const clearBulkSelection = () => setBulkSelectedCaseIds(new Set());

  // Tri-state header checkbox: 0 → indeterminate → all → cleared.
  // Closure target (sortedCases below) is the visible filtered slice.
  const selectAllVisible = React.useCallback(
    (visible: CaseQueueItem[]) => {
      setBulkSelectedCaseIds(new Set(visible.map((c) => c.caseId)));
      announceStatus(
        `Selected all ${visible.length} visible case${visible.length === 1 ? "" : "s"}.`,
      );
    },
    [announceStatus],
  );
  const toggleSelectAllVisible = React.useCallback(
    (visible: CaseQueueItem[]) => {
      if (
        bulkSelectedCaseIds.size >= visible.length &&
        visible.length > 0
      ) {
        clearBulkSelection();
      } else {
        selectAllVisible(visible);
      }
    },
    [bulkSelectedCaseIds, selectAllVisible],
  );

  // One-shot batch update of `assigneeName` for every selected case.
  // Routes through `setCases` once so there's a single render + a
  // single toast — same pattern the main Case Queue uses.
  const applyBulkAssignment = React.useCallback(
    (next: string, targetIds?: string[]) => {
      const ids = targetIds ?? Array.from(bulkSelectedCaseIds);
      if (ids.length === 0) return;
      const normalized = next.trim();
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
        toast.info(
          `Cleared assignment on ${count} case${count === 1 ? "" : "s"}`,
        );
        announceStatus(`Cleared assignment on ${count} cases.`);
      } else {
        toast.success(
          `Reassigned ${count} case${count === 1 ? "" : "s"} to ${normalized}`,
        );
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

  const filteredCases = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const tabPredicate =
      DASHBOARD_QUICK_FILTERS.find((t) => t.key === quickFilter)?.predicate ??
      (() => true);
    const filtered = baseCases.filter((c) => {
      if (term) {
        const haystack =
          `${c.caseId} ${c.assigneeName ?? ""} ${c.country ?? ""} ${c.jurisdiction ?? ""}`.toLowerCase();
        const identifierHit = getCaseIdentifierValues(c.caseId, c).some((v) =>
          v.toLowerCase().includes(term),
        );
        if (!haystack.includes(term) && !identifierHit) return false;
      }
      if (!caseMatchesExtraFilters(c, extraFilters)) return false;
      return tabPredicate(c);
    });
    if (!sortState) return filtered;
    const cmp = buildSortComparator(sortState);
    return [...filtered].sort(cmp);
  }, [baseCases, searchTerm, quickFilter, sortState, extraFilters]);

  // Per-tab count, computed against the base set (not the filtered set)
  // so the tab chips show their own pool size.
  const tabCounts = React.useMemo(() => {
    const counts: Record<DashboardQuickFilter, number> = {
      all: 0,
      myCases: 0,
      unassigned: 0,
      threatToLife: 0,
    };
    for (const c of baseCases) {
      counts.all += 1;
      if (matchesMyCases(c)) counts.myCases += 1;
      if (isUnassignedAttorneyEscalation(c.caseId)) counts.unassigned += 1;
      if (c.isThreatToLife) counts.threatToLife += 1;
    }
    return counts;
  }, [baseCases]);

  // Persisted view mode. Preview-pane is now enabled with an attorney-
  // flavored content variant (Gap 4).
  const [viewMode, setViewModeRaw] = React.useState<CaseListViewMode>(() =>
    readPersistedViewMode(),
  );
  const setViewMode = (next: CaseListViewMode) => {
    setViewModeRaw(next);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
    } catch {
      /* localStorage may be blocked */
    }
    announceStatus(`Switched to ${VIEW_MODE_LABEL[next]}`);
  };

  // Preview pane state. Resets to null when the active filter takes
  // the selected case out of the visible set.
  const [selectedPreviewCaseId, setSelectedPreviewCaseId] = React.useState<
    string | null
  >(null);
  const [previewPaneWidth, setPreviewPaneWidthRaw] = React.useState<number>(
    () => readPersistedPreviewWidth(),
  );
  const setPreviewPaneWidth = (next: number) => {
    setPreviewPaneWidthRaw(next);
    try {
      localStorage.setItem(PREVIEW_PANE_WIDTH_KEY, String(next));
    } catch {
      /* localStorage may be blocked */
    }
  };
  React.useEffect(() => {
    if (!selectedPreviewCaseId) return;
    if (!filteredCases.some((c) => c.caseId === selectedPreviewCaseId)) {
      setSelectedPreviewCaseId(null);
    }
  }, [filteredCases, selectedPreviewCaseId]);
  const selectedCase =
    filteredCases.find((c) => c.caseId === selectedPreviewCaseId) ?? null;

  return (
    <div
      className={cn(
        "mx-auto px-6 py-6 space-y-4",
        viewMode === "preview" ? "max-w-7xl" : "max-w-5xl",
      )}
    >
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-[#5c2d91]" />
          <h1 className="text-xl font-semibold text-[#323130]">
            Attorney Dashboard
          </h1>
        </div>
        <p className="text-sm text-[#605e5c]">
          Cases flagged by the Response or Triage Specialist for{" "}
          <span className="font-medium text-[#323130]">Internal Escalation</span>{" "}
          or{" "}
          <span className="font-medium text-[#323130]">Lawyer Assignment</span>.
          {" "}This view filters the main queue down to the cases that need
          attorney review or action.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="outline"
            className="text-xs bg-[#f3f0fa] text-[#5c2d91] border-[#8764b8]/40"
          >
            {filteredCases.length} case{filteredCases.length === 1 ? "" : "s"} requiring attorney attention
          </Badge>
        </div>

        {/* Toolbar — same 3-row split as the main Case Queue for
            cross-app consistency:
              Row 1: Quick-filter tabs (left) + View toggle (right)
              Row 2: Search + Saved Views + Add Filter
              Row 3: Active extra-filter chips (conditional) */}

        {/* Row 1 — Quick filter tabs + View toggle */}
        <div className="flex items-center gap-3 flex-wrap pt-2">
          <div
            role="tablist"
            aria-label="Attorney dashboard quick filters"
            className="flex items-center gap-1 flex-wrap flex-1"
          >
            {DASHBOARD_QUICK_FILTERS.map((tab) => {
              const active = quickFilter === tab.key;
              const count = tabCounts[tab.key];
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setQuickFilter(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                    active
                      ? "bg-[#5c2d91] text-white border-[#5c2d91]"
                      : "bg-white text-[#323130] border-[#e1dfdd] hover:bg-[#f3f2f1]",
                  )}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
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
          <CaseQueueViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {/* Row 2 — Search + Saved Views + Add Filter */}
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
              aria-label="Search attorney dashboard"
            />
          </div>

          {/* Saved Views — same component the Case Queue mounts. */}
          <SavedViewsMenu<AttorneyDashboardViewFilters>
            systemViews={SYSTEM_ATTORNEY_VIEWS}
            userViews={userSavedViews}
            currentViewId={currentViewId}
            isModified={isCurrentViewModified}
            onApply={applySavedView}
            onSaveCurrent={() => setSaveViewDialogOpen(true)}
            onDelete={handleDeleteSavedView}
          />

          {/* "+ Add filter" — same catalog the main Case Queue exposes. */}
          <AddFilterMenu
            activeFilterIds={Object.keys(extraFilters)}
            onAdd={handleAddExtraFilter}
            onOpenAdvanced={() => setAdvancedPanelOpen(true)}
          />
        </div>

        {/* Active extra-filter chips — same component the Case Queue
            uses. Rendered below the toolbar row so chips can wrap
            without crowding the quick-filter tabs. */}
        {Object.keys(extraFilters).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
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
      </header>

      {filteredCases.length === 0 ? (
        <Card className="p-8 text-center border-dashed border-[#c8c6c4]">
          {quickFilter === "myCases" ? (
            <>
              <p className="text-sm text-[#605e5c]">
                No cases matched <span className="font-semibold">My cases</span>{" "}
                for{" "}
                <span className="font-semibold text-[#323130]">
                  {CURRENT_USER}
                </span>
                .
              </p>
              <p className="text-xs text-[#a19f9d] mt-2 max-w-md mx-auto">
                "My cases" matches the signed-in user against the{" "}
                <span className="font-semibold">Case Assignee</span> and the{" "}
                <span className="font-semibold">Escalation Reviewer</span>{" "}
                columns. If neither shows your name on any flagged case, this
                tab will stay empty. Switch to <em>All</em> to see every
                attorney-relevant case, or check that the case's escalation has
                been routed to you specifically (not "Any Attorney").
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-[#605e5c]">
                No cases currently flagged for escalation or lawyer assignment.
              </p>
              <p className="text-xs text-[#a19f9d] mt-1">
                The Attorney Dashboard will list cases as the RS or TS flag them
                for review.
              </p>
            </>
          )}
        </Card>
      ) : viewMode === "preview" ? (
        // Pinned follow-up #4 — sticky CTA-footer fix on the dashboard
        // preview pane. `h-[calc(100vh-...)]` bounds the preview
        // container by the viewport so child scroll regions
        // (the list rows + the preview pane body) actually scroll
        // internally instead of pushing the page. `min-h-0` cascades
        // so each flex child can shrink past its intrinsic size and
        // its own `overflow-y-auto` takes effect.
        <div className="flex gap-0 items-stretch h-[calc(100vh-220px)] min-h-[500px] min-h-0">
          {/* Compact list on the left — dense detailed-list rows. Single
              click selects the row (does NOT open the case). The
              preview pane on the right updates with the selected case's
              attorney-flavored summary. */}
          <div
            role="table"
            aria-label="Attorney dashboard — preview list"
            aria-rowcount={filteredCases.length + 1 /* +1 for the header row */}
            aria-colcount={9 /* checkbox + 8 dense content columns */}
            className="flex-1 bg-white border border-[#edebe9] rounded-l-md overflow-y-auto flex flex-col min-h-0"
          >
            {/* Bulk actions bar — sticky at the top of the scroll
                container, hidden when nothing is selected. */}
            <CaseQueueBulkActionsBar
              selectedCount={bulkSelectedCaseIds.size}
              totalCount={filteredCases.length}
              onSelectAll={() => selectAllVisible(filteredCases)}
              onPickAll={handleBulkPick}
              onReleaseAll={handleBulkRelease}
              onAssignAll={handleBulkAssign}
              onClear={clearBulkSelection}
            />
            {/* Column header — bulk-selectable so the leading checkbox
                column lines up with the dense rows' own checkbox. */}
            <CaseQueueListHeader
              totalCount={filteredCases.length}
              selectedCount={bulkSelectedCaseIds.size}
              onToggleSelectAll={() => toggleSelectAllVisible(filteredCases)}
              bulkSelectable
              density="dense"
              sortState={sortState}
              onSort={handleColumnSort}
              columns={orderedColumns}
              onReorder={handleReorderColumns}
            />
            {filteredCases.map((c, idx) => (
              <CaseQueueListRow
                key={c.caseId}
                caseItem={c}
                priorityConfig={getPriorityConfig(c.casePriority)}
                density="dense"
                bulkSelectable
                bulkSelected={bulkSelectedCaseIds.has(c.caseId)}
                onBulkToggle={toggleBulkSelected}
                onOpen={onOpenCase}
                onSelect={(caseId) => setSelectedPreviewCaseId(caseId)}
                selected={selectedPreviewCaseId === c.caseId}
                ariaRowIndex={idx + 2 /* +1 for the header offset */}
                columns={orderedColumns}
              />
            ))}
          </div>
          <CaseQueuePreviewPane
            caseItem={selectedCase}
            width={previewPaneWidth}
            onResize={setPreviewPaneWidth}
            onOpenCase={onOpenCase}
            onClearSelection={() => setSelectedPreviewCaseId(null)}
            attorneyMode
          />
        </div>
      ) : viewMode === "list" ? (
        <div
          ref={listTableRef}
          role="table"
          aria-label="Attorney dashboard — detailed list"
          aria-rowcount={filteredCases.length + 1 /* +1 for the header row */}
          aria-colcount={ATTORNEY_DASHBOARD_COLUMNS.length + 1 /* +1 for the leading checkbox column */}
          className="bg-white border border-[#edebe9] rounded-md overflow-hidden overflow-x-auto"
        >
          {/* Column header — bulk-selectable so the leading checkbox
              column lines up with the rows' bulk-select checkbox. The
              dashboard doesn't currently persist column widths, so a
              fresh `defaultColumnWidths()` is computed per render — the
              same map is threaded into the rows below so the header
              and rows share the identical inline grid template. */}
          {(() => {
            const cols = defaultColumnWidths(ATTORNEY_DASHBOARD_COLUMNS);
            return (
              <>
                <CaseQueueBulkActionsBar
                  selectedCount={bulkSelectedCaseIds.size}
                  totalCount={filteredCases.length}
                  onSelectAll={() => selectAllVisible(filteredCases)}
                  onPickAll={handleBulkPick}
                  onReleaseAll={handleBulkRelease}
                  onAssignAll={handleBulkAssign}
                  onClear={clearBulkSelection}
                />
                <CaseQueueListHeader
                  totalCount={filteredCases.length}
                  selectedCount={bulkSelectedCaseIds.size}
                  onToggleSelectAll={() => toggleSelectAllVisible(filteredCases)}
                  bulkSelectable
                  density="full"
                  columnWidths={cols}
                  sortState={sortState}
                  onSort={handleColumnSort}
                  columns={orderedColumns}
                  onReorder={handleReorderColumns}
                />
                {filteredCases.map((c, idx) => (
                  <CaseQueueListRow
                    key={c.caseId}
                    caseItem={c}
                    priorityConfig={getPriorityConfig(c.casePriority)}
                    density="full"
                    columnWidths={cols}
                    columns={orderedColumns}
                    bulkSelectable
                    bulkSelected={bulkSelectedCaseIds.has(c.caseId)}
                    onBulkToggle={toggleBulkSelected}
                    onOpen={onOpenCase}
                    ariaRowIndex={idx + 2 /* +1 for the header offset */}
                  />
                ))}
              </>
            );
          })()}
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredCases.map((c) => {
            const summary = getEscalationSummaryForCase(c.caseId);
            return (
              <li key={c.caseId}>
                <Card
                  role="button"
                  tabIndex={0}
                  aria-label={`Open case ${c.caseId} for attorney review: ${c.requestType}, ${c.caseStage}${c.isThreatToLife ? ", threat to life" : ""}`}
                  onClick={() => onOpenCase(c.caseId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenCase(c.caseId);
                    }
                  }}
                  className={cn(
                    "p-4 cursor-pointer hover:shadow-md transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-2",
                    "border-l-4 border-l-[#5c2d91]",
                    c.isThreatToLife && "border-l-[#c50f1f] bg-[#fef0f0]",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#0078d4]">
                          {c.caseId}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {c.requestType}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {c.caseStage}
                        </Badge>
                        {/* Phase 2 of the prototype-to-prod merge — Enterprise /
                            Cross-Border / eEvidence / Other categorization.
                            Renders only when the FormData is available in the
                            registry; absent for unseeded mock rows. The
                            "N/M review" chip alongside surfaces partial-
                            escalation cases (e.g. 2 of 3 identifiers in
                            attorney review) so the queue communicates
                            scope at a glance. */}
                        {(() => {
                          const fd = getCaseFormDataById(c.caseId);
                          if (!fd) return null;
                          const summary = getPerIdentifierEscalationSummary(fd);
                          const showCount =
                            summary.totalIdentifiers > 1 &&
                            summary.escalatedCount > 0;
                          return (
                            <>
                              <EscalationReasonBadges case={fd} />
                              {showCount && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-[#f3f0fa] text-[#5c2d91] border-[#8764b8]/40"
                                  title={`${summary.escalatedCount} of ${summary.totalIdentifiers} identifiers awaiting attorney review`}
                                >
                                  {summary.escalatedCount}/
                                  {summary.totalIdentifiers} review
                                </Badge>
                              )}
                            </>
                          );
                        })()}
                        {c.isThreatToLife && (
                          <Badge className="text-[10px] bg-[#c50f1f] text-white border-[#c50f1f] gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Threat to life
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-[#323130]">
                        <span className="font-medium">{c.country}</span> ·{" "}
                        <span className="text-[#605e5c]">{c.jurisdiction}</span>
                        {" · "}
                        <span className="text-[#605e5c]">
                          {c.natureOfCrime.join(", ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-[#605e5c]">
                          Due: <span className="font-medium text-[#323130]">{c.dueDate}</span>
                        </span>
                      </div>
                      {summary && (
                        <EscalationSummaryStrip summary={summary} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCase(c.caseId);
                        }}
                        className="gap-1.5 text-[#0078d4] border-[#0078d4] hover:bg-[#f3f9fd]"
                      >
                        Open case
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Save current view dialog — same component the main Case
          Queue mounts. Captures the dashboard's filter / sort state
          under a user-supplied name and persists to localStorage. */}
      <SaveViewDialog
        open={saveViewDialogOpen}
        onOpenChange={setSaveViewDialogOpen}
        existingNames={[
          ...SYSTEM_ATTORNEY_VIEWS.map((v) => v.name),
          ...userSavedViews.map((v) => v.name),
        ]}
        onSave={handleSaveCurrentView}
      />

      {/* Advanced filters side panel — same component the Case Queue
          mounts. Drafts the filter bag locally so the user can toggle
          / configure many filters at once and Apply atomically. */}
      <AdvancedFiltersPanel
        open={advancedPanelOpen}
        onOpenChange={setAdvancedPanelOpen}
        activeFilters={extraFilters}
        onApply={(next) => setExtraFilters(next)}
        assigneeOptions={distinctAssignees(cases)}
        crimeOptions={distinctCrimes(cases)}
      />

      {/* Bulk Assign Dialog — driven by the bulk-actions toolbar. Same
          component the main Case Queue uses; snapshots the current
          selection into the preview list, then commits via
          `applyBulkAssignment` which fans out through the single
          `setCases` batch update. */}
      <BulkAssignDialog
        open={bulkAssignDialogOpen}
        onOpenChange={(next) => {
          setBulkAssignDialogOpen(next);
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
  );
}

/** Small chip strip rendered on each dashboard card with the live attorney
 *  escalation state — status · role · assignee · escalation age. Reads
 *  from a precomputed `EscalationDashboardSummary` so the card stays a
 *  pure render. */
function EscalationSummaryStrip({
  summary,
}: {
  summary: EscalationDashboardSummary;
}) {
  const statusTone =
    summary.status === "Pending" || summary.status === "Blocked"
      ? "bg-[#fde7e9] text-[#a4262c] border-[#a4262c]/40"
      : summary.status === "InformationRequested"
        ? "bg-[#fff4ce] text-[#7a4f00] border-[#a26a00]/40"
        : "bg-[#dff6dd] text-[#107c10] border-[#107c10]/40";

  return (
    <div className="flex items-center gap-2 flex-wrap pt-1">
      <Badge variant="outline" className={cn("text-[10px] gap-1", statusTone)}>
        <Scale className="w-3 h-3" />
        {STATUS_LABEL[summary.status] ?? summary.status}
      </Badge>
      <span className="text-xs text-[#605e5c]">
        <span className="font-medium text-[#323130]">{summary.role === "Attorney" ? "Attorney" : summary.role}</span>
        {" · "}
        <span className="text-[#323130]">{summary.assigneeLabel}</span>
      </span>
      <span className="text-xs text-[#605e5c] inline-flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Escalated {relativeAge(summary.escalatedAt)} by{" "}
        <span className="text-[#323130]">{summary.escalatedBy}</span>
      </span>
    </div>
  );
}
