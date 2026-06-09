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
  AlertTriangle,
  BookmarkPlus,
  ChevronRight,
  Clock,
  Scale,
  Search,
  UserMinus,
  Skull,
  UserCheck,
} from "lucide-react";
// Fluent v9 — matches the LeftNav rail's Attorney Dashboard entry
// (`Scales24Filled` when active). 32-sized variant for the page header
// so the icon scales with the bumped h1 typography. Mirrors the
// Cases-page swap from lucide → Fluent for app-bar / page-header parity.
import { Scales32Filled } from "@fluentui/react-icons";
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
import { PageContainer } from "../layout/PageContainer";
import { CaseQueuePreviewPane } from "../case-queue/CaseQueuePreviewPane";
import {
  ATTORNEY_DASHBOARD_COLUMNS,
  CASE_LIST_COLUMNS,
  defaultColumnWidths,
  buildSortComparator,
  defaultColumnOrder,
  sanitizeColumnOrder,
  applyColumnOrder,
  defaultColumnVisibility,
  sanitizeColumnVisibility,
  setColumnHidden,
  filterVisibleColumns,
  type ColumnId,
  type ColumnOrder,
  type ColumnVisibility,
  type SortState,
} from "../case-queue/caseListColumns";

import { useDragAutoScroll } from "../../hooks/useDragAutoScroll";

// Per-surface column order storage. The Attorney Dashboard maintains
// its own order independent of the main Case Queue (see CaseQueue.tsx).
const COLUMN_ORDER_STORAGE_KEY = "dars.attorneyDashboard.columnOrder";
const COLUMN_HIDDEN_STORAGE_KEY = "dars.attorneyDashboard.columnHidden";
const CASE_SCOPE_STORAGE_KEY = "dars.attorneyDashboard.caseScope";

type CaseScope = "active" | "all";

function readPersistedColumnOrder(): ColumnOrder {
  try {
    const raw = localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!raw) return defaultColumnOrder(ATTORNEY_DASHBOARD_COLUMNS);
    return sanitizeColumnOrder(JSON.parse(raw), ATTORNEY_DASHBOARD_COLUMNS);
  } catch {
    return defaultColumnOrder(ATTORNEY_DASHBOARD_COLUMNS);
  }
}

function readPersistedColumnHidden(): ColumnVisibility {
  try {
    const raw = localStorage.getItem(COLUMN_HIDDEN_STORAGE_KEY);
    if (!raw) return defaultColumnVisibility(ATTORNEY_DASHBOARD_COLUMNS);
    return sanitizeColumnVisibility(
      JSON.parse(raw),
      ATTORNEY_DASHBOARD_COLUMNS,
    );
  } catch {
    return defaultColumnVisibility(ATTORNEY_DASHBOARD_COLUMNS);
  }
}

function readPersistedCaseScope(): CaseScope {
  try {
    const raw = localStorage.getItem(CASE_SCOPE_STORAGE_KEY);
    if (raw === "active" || raw === "all") return raw;
  } catch {
    /* localStorage may be blocked */
  }
  return "active";
}

/** Active = the case isn't currently Resolved. A re-opened case
 *  (moved back from Resolved to any other stage) re-enters Active
 *  automatically because the predicate reads the case's CURRENT
 *  stage, not its history. Identical semantics to the Case Queue
 *  surface so personas who move between pages see consistent
 *  behavior. */
function isActiveCase(c: { caseStage: string }): boolean {
  return c.caseStage !== "Resolved";
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
  FilterColumnSyncDialog,
  type FilterColumnSyncDirection,
  type FilterColumnSyncRequest,
} from "../case-queue/FilterColumnSyncDialog";
import { CustomViewPanel } from "../case-queue/CustomViewPanel";
import { exportCasesToCsv } from "../case-queue/caseListExport";
import { Download, Sliders } from "lucide-react";
import {
  FILTER_CATALOG,
  caseMatchesExtraFilters,
  distinctAssignees,
  distinctCrimes,
  distinctTenants,
  distinctAgencies,
  distinctRequestOrigins,
  distinctIdentifierTypes,
  distinctAgencyNames,
  distinctValidatingAuthorities,
  distinctCompetentAuthorities,
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
  // Multi-key tiebreakers managed via the CustomViewPanel. Walked
  // in order when the primary `sortState` ties; falls through to the
  // dashboard's default escalation-weight ordering as the final tier.
  const [sortTiebreakers, setSortTiebreakers] = React.useState<SortState[]>([]);
  // Page-level scope toggle. "active" hides Resolved cases (the
  // overwhelmingly common attorney workflow — resolved escalations
  // don't need ongoing review); "all" un-hides them. Persisted
  // separately from the Case Queue's scope.
  const [caseScope, setCaseScopeRaw] = React.useState<CaseScope>(() =>
    readPersistedCaseScope(),
  );
  const setCaseScope = (next: CaseScope) => {
    setCaseScopeRaw(next);
    try {
      localStorage.setItem(CASE_SCOPE_STORAGE_KEY, next);
    } catch {
      /* localStorage may be blocked */
    }
  };
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
  // Per-user hide-list. Synthesised columns from the filter→column
  // sync work start hidden by default via `defaultColumnVisibility`.
  const [columnHidden, setColumnHiddenState] =
    React.useState<ColumnVisibility>(() => readPersistedColumnHidden());
  const persistColumnHidden = (next: ColumnVisibility) => {
    setColumnHiddenState(next);
    try {
      localStorage.setItem(COLUMN_HIDDEN_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* localStorage may be blocked */
    }
  };
  const handleToggleColumnHidden = (columnId: ColumnId, nextHidden: boolean) => {
    persistColumnHidden(
      setColumnHidden(
        columnHidden,
        columnId,
        nextHidden,
        ATTORNEY_DASHBOARD_COLUMNS,
      ),
    );
  };
  // Full ordered list (visible + hidden) for the Edit Columns menu /
  // CustomViewPanel; rendering uses the visible subset so the grid
  // template stays aligned with the header.
  const orderedColumns = React.useMemo(
    () => applyColumnOrder(ATTORNEY_DASHBOARD_COLUMNS, columnOrder),
    [columnOrder],
  );
  const visibleOrderedColumns = React.useMemo(
    () => filterVisibleColumns(orderedColumns, columnHidden),
    [orderedColumns, columnHidden],
  );
  // Customize view panel — unified canvas. Opened by the toolbar
  // button and the "Customize view…" CTAs at the bottom of the
  // legacy Sort / +Add filter / Edit columns menus.
  const [customizePanelOpen, setCustomizePanelOpen] = React.useState(false);
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
  // Filter ↔ column sync state. Suppresses for filters with no
  // `columnId`, locked columns, and no-op flips — same rules as the
  // Case Queue surface so behaviour stays consistent.
  const [filterColumnSyncRequest, setFilterColumnSyncRequest] =
    React.useState<FilterColumnSyncRequest | null>(null);
  const maybeRequestColumnSync = (
    direction: FilterColumnSyncDirection,
    filterId: string,
  ) => {
    const def = getFilterDef(filterId);
    if (!def?.columnId) return;
    const col = ATTORNEY_DASHBOARD_COLUMNS.find((c) => c.id === def.columnId);
    if (!col || col.locked) return;
    const isHidden = columnHidden.includes(def.columnId as ColumnId);
    if (direction === "add" && !isHidden) return;
    if (direction === "remove" && isHidden) return;
    setFilterColumnSyncRequest({
      direction,
      filterId,
      filterLabel: def.label,
      columnId: def.columnId,
      columnLabel: col.label,
    });
  };
  const handleAddExtraFilter = (filterId: string) => {
    const def = getFilterDef(filterId);
    if (!def) return;
    setExtraFilters((prev) =>
      Object.prototype.hasOwnProperty.call(prev, filterId)
        ? prev
        : { ...prev, [filterId]: def.defaultValue },
    );
    setNewlyAddedFilterId(filterId);
    maybeRequestColumnSync("add", filterId);
  };
  const handleRemoveExtraFilter = (filterId: string) => {
    setExtraFilters((prev) => {
      const next = { ...prev };
      delete next[filterId];
      return next;
    });
    if (newlyAddedFilterId === filterId) setNewlyAddedFilterId(null);
    maybeRequestColumnSync("remove", filterId);
  };
  const handleColumnSyncConfirm = (req: FilterColumnSyncRequest) => {
    handleToggleColumnHidden(
      req.columnId as ColumnId,
      req.direction === "remove",
    );
    setFilterColumnSyncRequest(null);
  };
  const handleChangeExtraFilter = (filterId: string, value: unknown) => {
    setExtraFilters((prev) => ({ ...prev, [filterId]: value }));
  };

  const currentDashboardSnapshot: AttorneyDashboardViewFilters = {
    quickFilter,
    sortState,
    extraFilters: { ...extraFilters },
    caseScope,
    sortTiebreakers: [...sortTiebreakers],
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
      // Legacy views (saved before the scope toggle / tiebreakers
      // shipped) default to "active" and an empty tiebreaker list —
      // matches page defaults so re-applying an older view doesn't
      // silently broaden scope or revert to single-key sort.
      setCaseScope(f.caseScope ?? "active");
      setSortTiebreakers(f.sortTiebreakers ? [...f.sortTiebreakers] : []);
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

  // Page-level scope runs first so per-tab counts in the quick-
  // filter strip reflect the chosen scope. Resolved cases re-enter
  // Active automatically if their stage flips back.
  const scopedCases = React.useMemo(
    () =>
      caseScope === "active" ? baseCases.filter(isActiveCase) : baseCases,
    [baseCases, caseScope],
  );

  const filteredCases = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const tabPredicate =
      DASHBOARD_QUICK_FILTERS.find((t) => t.key === quickFilter)?.predicate ??
      (() => true);
    const filtered = scopedCases.filter((c) => {
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
    if (!sortState && sortTiebreakers.length === 0) return filtered;
    const primaryCmp = buildSortComparator(sortState);
    const tiebreakerCmps = sortTiebreakers.map((s) => buildSortComparator(s));
    return [...filtered].sort((a, b) => {
      const r = primaryCmp(a, b);
      if (r !== 0) return r;
      for (const cmp of tiebreakerCmps) {
        const t = cmp(a, b);
        if (t !== 0) return t;
      }
      return 0;
    });
  }, [
    scopedCases,
    searchTerm,
    quickFilter,
    sortState,
    sortTiebreakers,
    extraFilters,
  ]);

  // Per-tab count, computed against the SCOPED set (not the
  // search/extras-filtered set). Anchoring on scopedCases means the
  // tab chips reflect the page-level Active/All scope — the
  // "narrowing by scope" axis sits above tabs in the mental model.
  const tabCounts = React.useMemo(() => {
    const counts: Record<DashboardQuickFilter, number> = {
      all: 0,
      myCases: 0,
      unassigned: 0,
      threatToLife: 0,
    };
    for (const c of scopedCases) {
      counts.all += 1;
      if (matchesMyCases(c)) counts.myCases += 1;
      if (isUnassignedAttorneyEscalation(c.caseId)) counts.unassigned += 1;
      if (c.isThreatToLife) counts.threatToLife += 1;
    }
    return counts;
  }, [scopedCases]);

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
    // PageContainer caps body width at --page-max-w
    // (`min(1600px, calc(100vw - 96px))` — see globals.css) and applies
    // the --page-gutter-x horizontal padding, matching the Cases page.
    // Previously the Attorney Dashboard used hardcoded `max-w-5xl`
    // (1024px) / `max-w-7xl` (1280px) wrappers, which left a center-
    // confined column with wide empty margins on full-screen viewports.
    // Switching to PageContainer makes the dashboard grow with the
    // viewport up to 1600px just like the main queue.
    // Explicit 30px gap between the <header> and the case list below
    // it; matches the Cases-page rhythm.
    <PageContainer className="py-6 space-y-[30px]">
      {/* 30px gap between each band inside the header — h1 row → quick-
          filter tabs → filter controls → active-filter chips — so the
          surface reads as a stack of distinct rows instead of a dense
          toolbar. */}
      <header className="space-y-[30px]">
        {/* Page header — matches the Cases page's pattern: 60px of top
            padding separates this band from the app-shell header
            above, the icon is the Fluent variant that matches the
            LeftNav rail's active state (`Scales24Filled`), the h1 is
            bold-large, and the descriptive subtitle paragraph + the
            "N cases requiring attorney attention" count badge that
            used to live here were dropped — counts are visible on each
            tab chip and at the bottom of the list, and the workflow
            context lives in onboarding / docs. */}
        <div className="flex items-center justify-between pt-[60px]">
          <div className="flex items-center gap-3">
            <Scales32Filled primaryFill="#5c2d91" aria-hidden="true" />
            <h1 className="text-3xl font-bold text-[#201f1e] m-0">
              Attorney Dashboard
            </h1>
          </div>
        </div>

        {/* Toolbar — same 3-row split as the main Case Queue for
            cross-app consistency:
              Row 1: Quick-filter tabs (left) + View toggle (right)
              Row 2: Search + Saved Views + Add Filter
              Row 3: Active extra-filter chips (conditional) */}

        {/* Row 1 — Quick filter tabs + View toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Page-level scope toggle. Moved from the page header to
              the leading segment of the quick-filter row so the
              hierarchy "scope → tabs within scope" reads naturally
              left-to-right. Uses the Attorney brand purple for the
              active state to match the surface's tab treatment. */}
          <div
            role="radiogroup"
            aria-label="Case scope"
            className="inline-flex rounded-md border border-[#edebe9] bg-white p-0.5 shrink-0"
          >
            {(["active", "all"] as const).map((scope) => {
              const selected = caseScope === scope;
              const label = scope === "active" ? "Active" : "All";
              const helper =
                scope === "active"
                  ? "Active cases — anything not currently Resolved"
                  : "All cases — including Resolved";
              return (
                <button
                  key={scope}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={helper}
                  title={helper}
                  onClick={() => setCaseScope(scope)}
                  className={cn(
                    "px-3 h-8 text-sm rounded-[5px] transition-colors",
                    selected
                      ? "bg-[#5c2d91] text-white font-semibold"
                      : "text-[#323130] hover:bg-[#f3f2f1]",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div
            aria-hidden="true"
            className="h-6 w-px bg-[#edebe9] shrink-0"
          />
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
                  // Bumped ~15% across the board to match the Cases
                  // page (h-8 → h-9, px-2.5 → px-3, gap-1.5 → gap-2,
                  // text-xs → text-sm). Purple active state preserved
                  // — the Attorney brand color across the app.
                  className={cn(
                    "inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm font-medium border transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5c2d91] focus-visible:ring-offset-1",
                    active
                      ? "bg-[#5c2d91] text-white border-[#5c2d91]"
                      : "bg-white text-[#323130] border-[#e1dfdd] hover:bg-[#f3f2f1]",
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
                  <span>
                    {/* Dynamic label — "All" alone collides with the
                        page-level Active/All scope toggle; rename to
                        clarify what "All" actually means right now. */}
                    {tab.key === "all"
                      ? caseScope === "active"
                        ? "All Active"
                        : "All Cases"
                      : tab.label}
                  </span>
                  <span
                    // Count chip scaled with the tab — 18px → 21px,
                    // 10px → 12px text, px-1 → px-1.5.
                    className={cn(
                      "inline-flex items-center justify-center min-w-[21px] h-[21px] px-1.5 rounded-full text-xs",
                      active
                        ? "bg-white/20 text-white"
                        : count === 0
                          ? "bg-[#f3f2f1] text-[#a19f9d]"
                          : tab.urgency === "alert"
                            ? "bg-[#fde7e9] text-[#a4262c]"
                            : tab.urgency === "warn"
                              ? "bg-[#fff4ce] text-[#7a4f00]"
                              : "bg-[#f3f0fa] text-[#5c2d91]",
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

        {/* Row 2 — View-state controls on the left; Search pushed
            right via `ml-auto` so it aligns above the table's
            rightmost column (the Edit-column-order button anchored at
            the same right edge of the page container below). Matches
            the Cases page toolbar pattern. No standalone Sort button:
            attorneys sort via column-header clicks, so a Sort toolbar
            button would be redundant here. */}
        <div className="flex items-center gap-3 flex-wrap">
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
            onOpenCustomize={() => setCustomizePanelOpen(true)}
          />

          {/* Save current view — lifted to its own toolbar button so
              attorneys can save a fresh view without opening the
              Saved Views menu first. Same dialog the menu's "Save
              current as…" item opens, just one fewer click. */}
          {/* Customize view — opens the unified panel. Sits BEFORE
              Save current view so the toolbar reads "shape the view"
              → "save the view" left-to-right. Legacy menus (Sort /
              +Add filter / Edit columns) each expose a "Customize
              view…" CTA at the bottom of their scroll-capped list as
              a deep link here. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCustomizePanelOpen(true)}
            className="h-9 gap-1.5 text-xs"
            aria-label="Customize view"
          >
            <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-medium">Customize view</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSaveViewDialogOpen(true)}
            className="h-9 gap-1.5 text-xs"
            aria-label="Save current view"
          >
            <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-medium">Save current view</span>
          </Button>

          {/* Export list — same semantics as the Cases page: export
              the on-screen filtered + sorted slice with the user's
              visible columns in their chosen order. Filename
              identifies the surface ("attorney-dashboard") so
              downstream tooling can tell the two surfaces apart. */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              exportCasesToCsv({
                surface: "attorney-dashboard",
                scope: caseScope,
                cases: filteredCases,
                columns: visibleOrderedColumns,
              });
            }}
            className="h-9 gap-1.5 text-xs"
            aria-label="Export list to CSV"
            disabled={filteredCases.length === 0}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-medium">Export list</span>
          </Button>

          {/* Search — right-justified via `ml-auto`. Fixed 360px max-
              width so it doesn't stretch arbitrarily on wide monitors;
              right edge aligns with the table's rightmost column. */}
          <div className="relative ml-auto w-full sm:w-[360px] max-w-[360px]">
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
        </div>

        {/* Active extra-filter chips — same component the Case Queue
            uses. The 30px gap comes from the header's `space-y-[30px]`
            so the chips read as their own row, not crowded onto the
            toolbar above. */}
        {Object.keys(extraFilters).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
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
                // The four below were never plumbed when the dashboard
                // adopted ExtraFilterChip — added now (empty arrays so
                // the catalog filters that need them don't crash, and
                // typecheck stays clean after the chip's interface
                // tightened in the Phase 2 catalog expansion).
                caseStatusOptions={[]}
                countryOptions={[]}
                jurisdictionOptions={[]}
                requestTypeOptions={[]}
                tenantOptions={distinctTenants(cases)}
                agencyOptions={distinctAgencies(cases)}
                requestOriginOptions={distinctRequestOrigins(cases)}
                identifierTypeOptions={distinctIdentifierTypes(cases)}
                agencyNameOptions={distinctAgencyNames(cases)}
                validatingAuthorityOptions={distinctValidatingAuthorities(cases)}
                competentAuthorityOptions={distinctCompetentAuthorities(cases)}
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
              allColumns={orderedColumns}
              hiddenColumnIds={columnHidden}
              onToggleColumnHidden={handleToggleColumnHidden}
              onReorder={handleReorderColumns}
              onOpenCustomize={() => setCustomizePanelOpen(true)}
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
                  columns={visibleOrderedColumns}
                  allColumns={orderedColumns}
                  hiddenColumnIds={columnHidden}
                  onToggleColumnHidden={handleToggleColumnHidden}
                  onReorder={handleReorderColumns}
                  onOpenCustomize={() => setCustomizePanelOpen(true)}
                />
                {filteredCases.map((c, idx) => (
                  <CaseQueueListRow
                    key={c.caseId}
                    caseItem={c}
                    priorityConfig={getPriorityConfig(c.casePriority)}
                    density="full"
                    columnWidths={cols}
                    columns={visibleOrderedColumns}
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
        // The four below were never plumbed when the dashboard adopted
        // AdvancedFiltersPanel — added now (empty arrays so panel
        // typecheck stays clean as the catalog grows).
        caseStatusOptions={[]}
        countryOptions={[]}
        jurisdictionOptions={[]}
        requestTypeOptions={[]}
        tenantOptions={distinctTenants(cases)}
        agencyOptions={distinctAgencies(cases)}
        requestOriginOptions={distinctRequestOrigins(cases)}
      />

      {/* Filter ↔ column sync confirmation — fires from add / remove
          handlers above when a catalogue filter's linked column
          would flip visibility. */}
      <FilterColumnSyncDialog
        request={filterColumnSyncRequest}
        onConfirm={handleColumnSyncConfirm}
        onCancel={() => setFilterColumnSyncRequest(null)}
      />

      {/* Customize view panel — unified canvas for filters + sort +
          columns. Live-applied; "Save as view…" routes through the
          existing SaveViewDialog. */}
      <CustomViewPanel
        open={customizePanelOpen}
        onOpenChange={setCustomizePanelOpen}
        extraFilters={extraFilters}
        onAddFilter={handleAddExtraFilter}
        onRemoveFilter={handleRemoveExtraFilter}
        onChangeFilterValue={handleChangeExtraFilter}
        primarySort={sortState}
        onChangePrimarySort={setSortState}
        sortTiebreakers={sortTiebreakers}
        onChangeSortTiebreakers={setSortTiebreakers}
        allColumns={orderedColumns}
        hiddenColumnIds={columnHidden}
        onToggleColumnHidden={handleToggleColumnHidden}
        onReorderColumns={handleReorderColumns}
        assigneeOptions={distinctAssignees(cases)}
        crimeOptions={distinctCrimes(cases)}
        caseStatusOptions={[]}
        countryOptions={[]}
        jurisdictionOptions={[]}
        requestTypeOptions={[]}
        tenantOptions={distinctTenants(cases)}
        agencyOptions={distinctAgencies(cases)}
        requestOriginOptions={distinctRequestOrigins(cases)}
        identifierTypeOptions={distinctIdentifierTypes(cases)}
        onSaveAsView={() => setSaveViewDialogOpen(true)}
        onResetToDefault={() => {
          setExtraFilters({});
          setSortState(null);
          setSortTiebreakers([]);
          persistColumnHidden(
            defaultColumnVisibility(ATTORNEY_DASHBOARD_COLUMNS),
          );
          handleReorderColumns(defaultColumnOrder(ATTORNEY_DASHBOARD_COLUMNS));
        }}
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
    </PageContainer>
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
