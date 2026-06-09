/**
 * CustomViewPanel — the unified canvas for everything that turns the
 * Case Queue's default list into a personalised slice. Surfaces three
 * stacked sections in a single right-side Sheet:
 *
 *   1. **Filters** — the active extra-filters bag. Each active filter
 *      renders a row with its value control inline, plus a "+ Add
 *      filter" affordance so users don't need to jump back to the
 *      toolbar's +Add filter menu. Filter remove still fires the
 *      FilterColumnSyncDialog (the dialog is owned by CaseQueue, not
 *      the panel, so it pops over both).
 *
 *   2. **Sort** — primary sort + up to 2 tiebreakers. The primary mirrors
 *      what the toolbar Sort dropdown sets; the tiebreakers are managed
 *      here only (no toolbar surface). Comparator in `caseListColumns.ts`
 *      walks the list in order so ties on the primary fall through to
 *      tiebreaker 1, then tiebreaker 2, then the case-id stable sort.
 *
 *   3. **Columns** — the full ordered list with show/hide checkboxes
 *      and up/down arrows. Mirrors the in-table Edit Columns menu but
 *      stays visible while users tweak the other sections so they can
 *      see the table re-flow in real time.
 *
 * Everything is **live applied** — the panel is a view over the host's
 * state, not a draft buffer. Closing the panel doesn't commit anything;
 * Save as view captures the current snapshot through the existing
 * SaveViewDialog (mounted by CaseQueue).
 *
 * Discovery: the panel can be opened from
 *   - the toolbar's "Customize view" button (new), or
 *   - a "Customize view…" CTA pinned at the bottom of each of the
 *     three legacy menus (+Add filter, Sort, Edit columns).
 *
 * The legacy menus stay as quick-access shortcuts for one-shot tweaks;
 * the panel is the place to dial in a complete view in one go.
 */
import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  ChevronDown,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../ui/utils";
import {
  FILTER_CATALOG,
  getFilterDef,
  type FilterDef,
  type FilterGroup,
} from "./extraFilterCatalog";
import {
  CASE_LIST_COLUMNS,
  reorderColumn,
  type ColumnDef,
  type ColumnId,
  type SortState,
} from "./caseListColumns";
import { FilterValueControl } from "./ExtraFilterChip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";

const GROUP_ORDER: FilterGroup[] = [
  "People",
  "Case meta",
  "Dates",
  "Workflow",
  "Signals",
  "Tenant",
  "Escalation",
  "Intake",
];

export interface CustomViewPanelProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  // ── Filters ──────────────────────────────────────────────────────────
  extraFilters: Record<string, unknown>;
  onAddFilter: (id: string) => void;
  onRemoveFilter: (id: string) => void;
  onChangeFilterValue: (id: string, value: unknown) => void;
  // ── Sort ─────────────────────────────────────────────────────────────
  primarySort: SortState | null;
  onChangePrimarySort: (next: SortState | null) => void;
  /** Up to 2 entries (panel enforces). When the primary sort ties, the
   *  comparator falls through these in order. */
  sortTiebreakers: SortState[];
  onChangeSortTiebreakers: (next: SortState[]) => void;
  // ── Columns ──────────────────────────────────────────────────────────
  /** Full ordered list (visible + hidden). */
  allColumns: ColumnDef[];
  hiddenColumnIds: ColumnId[];
  onToggleColumnHidden: (id: ColumnId, nextHidden: boolean) => void;
  onReorderColumns: (next: ColumnId[]) => void;
  // ── Value-control options (threaded straight through) ────────────────
  assigneeOptions: string[];
  crimeOptions: string[];
  caseStatusOptions: string[];
  countryOptions: string[];
  jurisdictionOptions: string[];
  requestTypeOptions: string[];
  requestSubTypeOptions?: string[];
  servicesOptions?: string[];
  tenantOptions?: string[];
  agencyOptions?: string[];
  requestOriginOptions?: string[];
  identifierTypeOptions?: string[];
  agencyNameOptions?: string[];
  validatingAuthorityOptions?: string[];
  competentAuthorityOptions?: string[];
  // ── Bottom-bar actions ───────────────────────────────────────────────
  onSaveAsView: () => void;
  onResetToDefault: () => void;
}

// Sortable columns surfaced in the Sort section's column picker.
const SORTABLE_COLUMNS = CASE_LIST_COLUMNS.filter((c) => c.sortable);

// Direction labels — same source-of-truth phrasing as
// CaseQueueSortByMenu so the panel and toolbar agree.
const DIRECTION_LABELS: Partial<
  Record<ColumnId, { asc: string; desc: string }>
> = {
  "case-id":             { asc: "A to Z", desc: "Z to A" },
  "case-assignee":       { asc: "A to Z", desc: "Z to A" },
  "escalation-reviewer": { asc: "A to Z", desc: "Z to A" },
  "country":             { asc: "A to Z", desc: "Z to A" },
  "due-date":            { asc: "Soonest first", desc: "Latest first" },
  "ndo-reminder":        { asc: "Soonest first", desc: "Latest first" },
  "priority":            { asc: "Least urgent first", desc: "Most urgent first" },
  "internal-escalation": { asc: "Least urgent first", desc: "Most urgent first" },
  "gfr-hold":            { asc: "Lowest tier first",  desc: "Highest tier first" },
  "stage":               { asc: "Workflow order", desc: "Reverse workflow order" },
  "threat-to-life":      { asc: "Unflagged first", desc: "Flagged first" },
  "enterprise":          { asc: "Non-Enterprise first", desc: "Enterprise first" },
  "unread":              { asc: "Fewest first", desc: "Most first" },
  "attorney-review":     { asc: "Fewest first", desc: "Most first" },
  "identifiers":         { asc: "Fewest first", desc: "Most first" },
  "services":            { asc: "Fewest first", desc: "Most first" },
};
const DEFAULT_DIR_LABELS = { asc: "Ascending", desc: "Descending" };

function describeSort(s: SortState): string {
  const col = SORTABLE_COLUMNS.find((c) => c.id === s.columnId);
  const labels = DIRECTION_LABELS[s.columnId] ?? DEFAULT_DIR_LABELS;
  return `${col?.label ?? s.columnId} · ${labels[s.direction]}`;
}

export function CustomViewPanel({
  open,
  onOpenChange,
  extraFilters,
  onAddFilter,
  onRemoveFilter,
  onChangeFilterValue,
  primarySort,
  onChangePrimarySort,
  sortTiebreakers,
  onChangeSortTiebreakers,
  allColumns,
  hiddenColumnIds,
  onToggleColumnHidden,
  onReorderColumns,
  assigneeOptions,
  crimeOptions,
  caseStatusOptions,
  countryOptions,
  jurisdictionOptions,
  requestTypeOptions,
  requestSubTypeOptions = [],
  servicesOptions = [],
  tenantOptions = [],
  agencyOptions = [],
  requestOriginOptions = [],
  identifierTypeOptions = [],
  agencyNameOptions = [],
  validatingAuthorityOptions = [],
  competentAuthorityOptions = [],
  onSaveAsView,
  onResetToDefault,
}: CustomViewPanelProps) {
  // Section expand/collapse — all start open so the user sees the
  // whole canvas on first view. Persist across opens in component
  // state (cheap; not worth localStorage).
  const [sectionOpen, setSectionOpen] = React.useState({
    filters: true,
    sort: true,
    columns: true,
  });
  const toggleSection = (key: keyof typeof sectionOpen) =>
    setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const activeFilterIds = Object.keys(extraFilters);
  const activeFilterDefs = activeFilterIds
    .map((id) => getFilterDef(id))
    .filter((d): d is FilterDef => !!d);

  const hiddenSet = React.useMemo(
    () => new Set(hiddenColumnIds),
    [hiddenColumnIds],
  );

  const moveColumn = (fromIndex: number, toIndex: number) => {
    if (allColumns[fromIndex]?.locked || allColumns[toIndex]?.locked) return;
    const currentOrder = allColumns.map((c) => c.id);
    const next = reorderColumn(currentOrder, fromIndex, toIndex);
    if (next !== currentOrder) onReorderColumns(next);
  };

  const valueControlProps = {
    assigneeOptions,
    crimeOptions,
    caseStatusOptions,
    countryOptions,
    jurisdictionOptions,
    requestTypeOptions,
    requestSubTypeOptions,
    servicesOptions,
    tenantOptions,
    agencyOptions,
    requestOriginOptions,
    identifierTypeOptions,
    agencyNameOptions,
    validatingAuthorityOptions,
    competentAuthorityOptions,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[420px] sm:max-w-[420px] p-0 flex flex-col"
      >
        <SheetHeader className="px-[30px] pt-[30px] pb-3 border-b border-[#edebe9]">
          <SheetTitle>Customize view</SheetTitle>
          <SheetDescription>
            Filters, sort, and columns — all in one place. Changes apply
            live; save the slice as a named view when you're done.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* ── 1. Filters section ───────────────────────────────── */}
          <Section
            label={`Filters${activeFilterIds.length ? ` (${activeFilterIds.length})` : ""}`}
            open={sectionOpen.filters}
            onToggle={() => toggleSection("filters")}
          >
            {activeFilterDefs.length === 0 ? (
              <div className="px-[30px] py-3 text-xs text-[#605e5c] italic">
                No filters active. Add one to scope the queue.
              </div>
            ) : (
              <div className="space-y-3 px-[30px] py-3">
                {activeFilterDefs.map((def) => {
                  const value = extraFilters[def.id];
                  const isActive = def.isActive(value);
                  return (
                    <div
                      key={def.id}
                      className="border border-[#edebe9] rounded-md p-2.5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              isActive
                                ? "text-[#0078d4]"
                                : "text-[#605e5c]",
                            )}
                          >
                            {def.label}
                          </span>
                          <span className="text-[10px] text-[#a19f9d] uppercase tracking-wide">
                            {def.group}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveFilter(def.id)}
                          className="text-[#605e5c] hover:text-[#a4262c] p-0.5 rounded"
                          aria-label={`Remove ${def.label} filter`}
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <FilterValueControl
                        def={def}
                        value={value}
                        onChange={(next) => onChangeFilterValue(def.id, next)}
                        {...valueControlProps}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-[30px] pb-3">
              <AddFilterDropdown
                activeFilterIds={activeFilterIds}
                onAdd={onAddFilter}
              />
            </div>
          </Section>

          {/* ── 2. Sort section ──────────────────────────────────── */}
          <Section
            label="Sort"
            open={sectionOpen.sort}
            onToggle={() => toggleSection("sort")}
          >
            <div className="space-y-2 px-[30px] py-3">
              <SortRow
                label="Primary"
                value={primarySort}
                onChange={onChangePrimarySort}
                onRemove={() => onChangePrimarySort(null)}
              />
              {sortTiebreakers.map((tb, idx) => (
                <SortRow
                  key={`tb-${idx}`}
                  label={`Tiebreaker ${idx + 1}`}
                  value={tb}
                  onChange={(next) => {
                    const copy = [...sortTiebreakers];
                    if (next) copy[idx] = next;
                    else copy.splice(idx, 1);
                    onChangeSortTiebreakers(copy);
                  }}
                  onRemove={() => {
                    const copy = [...sortTiebreakers];
                    copy.splice(idx, 1);
                    onChangeSortTiebreakers(copy);
                  }}
                />
              ))}
              {sortTiebreakers.length < 2 && primarySort && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs w-full justify-start"
                  onClick={() =>
                    onChangeSortTiebreakers([
                      ...sortTiebreakers,
                      {
                        columnId: SORTABLE_COLUMNS[0]
                          .id as ColumnId,
                        direction: "desc",
                      },
                    ])
                  }
                >
                  <Plus className="w-3 h-3" aria-hidden="true" />
                  Add tiebreaker
                </Button>
              )}
              {!primarySort && (
                <div className="text-xs text-[#605e5c] italic">
                  Default (due-date tiebreaker only). Pick a primary
                  sort to add tiebreakers.
                </div>
              )}
            </div>
          </Section>

          {/* ── 3. Columns section ───────────────────────────────── */}
          <Section
            label={`Columns (${allColumns.length - hiddenSet.size} of ${allColumns.length} shown)`}
            open={sectionOpen.columns}
            onToggle={() => toggleSection("columns")}
          >
            <div className="px-[30px] py-3 space-y-0.5">
              {allColumns.map((col, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === allColumns.length - 1;
                const locked = !!col.locked;
                const hidden = hiddenSet.has(col.id);
                const upBlocked =
                  isFirst || locked || !!allColumns[idx - 1]?.locked;
                const downBlocked =
                  isLast || locked || !!allColumns[idx + 1]?.locked;
                return (
                  <div
                    key={col.id}
                    className="flex items-center gap-2 px-1 py-1 rounded hover:bg-[#faf9f8]"
                  >
                    <Checkbox
                      checked={!hidden}
                      disabled={locked}
                      onCheckedChange={(next) =>
                        onToggleColumnHidden(col.id, !next)
                      }
                      aria-label={
                        locked
                          ? `${col.label} (locked — always visible)`
                          : hidden
                            ? `Show ${col.label} column`
                            : `Hide ${col.label} column`
                      }
                      className="h-4 w-4"
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        locked || hidden
                          ? "text-[#a19f9d]"
                          : "text-[#323130]",
                      )}
                    >
                      {col.label}
                    </span>
                    {locked && (
                      <Lock
                        className="w-3.5 h-3.5 text-[#a19f9d]"
                        aria-label="Locked"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, idx - 1)}
                      disabled={upBlocked}
                      className={cn(
                        "p-1 rounded text-[#605e5c]",
                        upBlocked
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-[#edebe9] hover:text-[#323130]",
                      )}
                      aria-label={`Move ${col.label} up`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(idx, idx + 1)}
                      disabled={downBlocked}
                      className={cn(
                        "p-1 rounded text-[#605e5c]",
                        downBlocked
                          ? "opacity-30 cursor-not-allowed"
                          : "hover:bg-[#edebe9] hover:text-[#323130]",
                      )}
                      aria-label={`Move ${col.label} down`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        <SheetFooter className="border-t border-[#edebe9] px-[30px] py-3 flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetToDefault}
            className="h-8 gap-1.5 text-xs text-[#605e5c]"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Reset to default
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveAsView}
            className="h-8 gap-1.5 text-xs"
          >
            <BookmarkPlus className="w-3.5 h-3.5" aria-hidden="true" />
            Save as view…
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ─── Small subcomponents ──────────────────────────────────────────────

function Section({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[#edebe9]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-[30px] py-3 hover:bg-[#faf9f8] text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-[#323130]">{label}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[#605e5c] transition-transform",
            !open && "-rotate-90",
          )}
          aria-hidden="true"
        />
      </button>
      {open && children}
    </section>
  );
}

function AddFilterDropdown({
  activeFilterIds,
  onAdd,
}: {
  activeFilterIds: string[];
  onAdd: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const activeSet = new Set(activeFilterIds);
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: FILTER_CATALOG.filter(
      (f) => f.group === group && !activeSet.has(f.id),
    ),
  })).filter((g) => g.items.length > 0);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs w-full justify-start"
        >
          <Plus className="w-3 h-3" aria-hidden="true" />
          Add filter
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-50 max-h-[320px] overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="px-3 py-4 text-xs text-[#605e5c] italic">
            Every catalog filter is already active.
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.group} className="py-1">
              <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-[#605e5c] font-semibold">
                {g.group}
              </div>
              {g.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onAdd(item.id);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#323130] hover:bg-[#f3f2f1]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

function SortRow({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: SortState | null;
  onChange: (next: SortState | null) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex items-center gap-2 border border-[#edebe9] rounded-md px-2 py-1.5">
      <span className="text-[10px] uppercase tracking-wide text-[#605e5c] font-semibold w-20 shrink-0">
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex-1 flex items-center justify-between px-2 py-1 text-xs border border-[#e1dfdd] rounded bg-white hover:bg-[#faf9f8] text-left"
          >
            <span className="truncate">
              {value ? describeSort(value) : "Default"}
            </span>
            <ChevronDown
              className="w-3 h-3 opacity-60 ml-1 shrink-0"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-1 z-50 max-h-[320px] overflow-y-auto">
          {SORTABLE_COLUMNS.map((col) => {
            const labels =
              DIRECTION_LABELS[col.id] ?? DEFAULT_DIR_LABELS;
            return (
              <div key={col.id} className="py-1">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-[#605e5c] font-semibold">
                  {col.label}
                </div>
                {(["desc", "asc"] as const).map((dir) => {
                  const selected =
                    value?.columnId === col.id &&
                    value.direction === dir;
                  return (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => {
                        onChange({ columnId: col.id as ColumnId, direction: dir });
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1 text-xs hover:bg-[#f3f2f1] rounded",
                        selected && "bg-[#f3f2f1] font-semibold",
                      )}
                    >
                      {labels[dir]}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          onClick={onRemove}
          className="text-[#605e5c] hover:text-[#a4262c] p-0.5 rounded"
          aria-label={`Clear ${label}`}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
