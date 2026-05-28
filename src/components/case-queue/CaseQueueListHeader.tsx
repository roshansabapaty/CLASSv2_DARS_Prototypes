/**
 * CaseQueueListHeader — column-header row for the Detailed-list view of
 * the Case Queue.
 *
 * Two jobs:
 *   1. **Visible column labels** so users know what each column means
 *      (without the labels, the row's badges + chips were unlabelled
 *      data with no context).
 *   2. **Discoverable select-all** — a checkbox at the start of the
 *      header row toggles the entire visible set. Supports the
 *      indeterminate state (some-but-not-all selected) via Radix's
 *      built-in checkbox semantics.
 *
 * Each column boundary has a thin draggable handle (`<ColumnResizer>`)
 * that lets users widen / narrow individual columns. Widths are owned
 * by the parent (`CaseQueue`) and persisted in localStorage so the
 * layout survives reloads.
 */

import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { ColumnResizer } from "./ColumnResizer";
import { cn } from "../ui/utils";
import {
  CASE_LIST_COLUMNS,
  type ColumnDef,
  type ColumnId,
  type ColumnWidths,
  type SortState,
  buildGridTemplate,
} from "./caseListColumns";

interface CaseQueueListHeaderProps {
  /** Total visible (filtered) case count — drives the select-all
   *  checkbox state + aria-label. Required when `bulkSelectable` is true. */
  totalCount?: number;
  /** How many of the visible cases are currently selected. */
  selectedCount?: number;
  /** Toggle: select all visible / clear selection. */
  onToggleSelectAll?: () => void;
  /** Current per-column pixel widths. Required when `density === "full"`
   *  so the header lines up with the inline-grid Detailed-list rows. Not
   *  used in dense mode (the rows use a Tailwind `fr`-based template
   *  instead — see the matching template below). */
  columnWidths?: ColumnWidths;
  /** Fires while the user drags a column boundary. Resizers are only
   *  rendered in `density === "full"`. */
  onColumnResize?: (columnId: ColumnId, nextWidth: number) => void;
  /** When true (default) the header renders a leading select-all checkbox
   *  column matching the bulk-selectable rows below it. Surfaces like the
   *  Attorney Dashboard that don't bulk-select pass `false` so the column
   *  collapses out of the grid template and no misleading affordance
   *  appears. MUST match the `bulkSelectable` flag the paired
   *  `<CaseQueueListRow>` uses — otherwise the header / row grid columns
   *  desync.
   */
  bulkSelectable?: boolean;
  /** Match the row density. `"full"` (default) keeps all 7 columns +
   *  resize handles + inline grid template. `"dense"` drops Country,
   *  Identifiers, and Services to match the dense `<CaseQueueListRow>`
   *  used by the preview-pane lists (main queue + Attorney Dashboard
   *  preview view). MUST match the `density` prop on the paired rows.
   */
  density?: "full" | "dense";
  /** 3F (UX-Polish): click-to-sort state. When provided alongside
   *  `onSort`, headers for sortable columns render as buttons with a
   *  chevron indicator + `aria-sort` reflecting the active state. When
   *  omitted, headers render label-only (back-compat). */
  sortState?: SortState | null;
  onSort?: (columnId: ColumnId) => void;
  /** Column definitions to render. Defaults to `CASE_LIST_COLUMNS` (the
   *  main Case Queue's 8-column layout). The Attorney Dashboard passes
   *  `ATTORNEY_DASHBOARD_COLUMNS` to surface Case Assignee + Escalation
   *  Reviewer alongside the standard set. MUST match the `columns`
   *  prop on the paired `<CaseQueueListRow>`. */
  columns?: ColumnDef[];
}

// Columns that survive density="dense" — derived from inspecting
// CaseQueueListRow's dense render (Case ID / Priority / Due Date /
// Stage). Per-signal operational columns (unread, threat-to-life,
// enterprise, gfr-hold, attorney-review, ndo-reminder) are dropped in
// dense mode so the preview pane's narrow column stays scannable.
const DENSE_COLUMN_IDS: ReadonlyArray<ColumnId> = [
  "case-id",
  "priority",
  "due-date",
  "stage",
  "case-assignee",
  "internal-escalation",
  "escalation-reviewer",
];

export function CaseQueueListHeader({
  totalCount = 0,
  selectedCount = 0,
  onToggleSelectAll,
  columnWidths,
  onColumnResize,
  bulkSelectable = true,
  density = "full",
  sortState,
  onSort,
  columns = CASE_LIST_COLUMNS,
}: CaseQueueListHeaderProps) {
  // Tri-state checkbox: empty → indeterminate → checked. Radix's
  // Checkbox accepts `checked="indeterminate"` directly. Only computed
  // when the checkbox column is active.
  const checkboxChecked: boolean | "indeterminate" =
    selectedCount === 0
      ? false
      : selectedCount >= totalCount
        ? true
        : "indeterminate";

  const checkboxLabel =
    selectedCount === 0
      ? `Select all ${totalCount} visible case${totalCount === 1 ? "" : "s"}`
      : `Clear selection of ${selectedCount} case${selectedCount === 1 ? "" : "s"}`;

  // Two render modes:
  //   * density="full"  → inline-grid template via buildGridTemplate, all 7
  //                       columns + draggable resizers. Mirrors the
  //                       Detailed-list row's `useInlineGrid` path.
  //   * density="dense" → Tailwind fr-based template matching the row's
  //                       `denseGridCols`. No resizers, no priority rail
  //                       (dense rows don't render the rail either).
  const isDense = density === "dense";

  // Tailwind dense template matches `denseGridCols` in
  // CaseQueueListRow.tsx. When bulkSelectable is true, the leading `auto`
  // is the checkbox column. The remaining `fr` slots are Case ID,
  // Priority, Due Date, Stage, Assigned To, Internal Escalation,
  // Escalated To — same order as DENSE_COLUMN_IDS. (Per-signal columns
  // are dropped in dense mode.)
  const denseGridCols = bulkSelectable
    ? "grid-cols-[auto_1.1fr_auto_1fr_0.9fr_1fr_1.2fr_1.2fr]"
    : "grid-cols-[1.1fr_auto_1fr_0.9fr_1fr_1.2fr_1.2fr]";

  // Columns to render labels for. Dense mode drops everything except
  // DENSE_COLUMN_IDS to mirror the row.
  const visibleColumns = isDense
    ? columns.filter((c) => DENSE_COLUMN_IDS.includes(c.id))
    : columns;

  return (
    <div
      role="row"
      aria-rowindex={1}
      className={cn(
        "grid items-stretch bg-[#faf9f8] border-b border-[#edebe9] sticky top-0 z-10 text-[11px] uppercase tracking-wide font-semibold text-[#605e5c]",
        isDense && denseGridCols,
      )}
      style={
        isDense
          ? undefined
          : {
              gridTemplateColumns: buildGridTemplate(
                columnWidths ?? ({} as ColumnWidths),
                bulkSelectable,
                true,
                columns,
              ),
            }
      }
    >
      {/* Priority rail column — empty in the header. Rows paint their
          priority colour into the same grid slot so the rail aligns
          header → row down to the pixel. Only present in full-density
          mode (the rail is part of the inline-grid template, not the
          dense Tailwind template). */}
      {!isDense && <span aria-hidden="true" />}

      {/* 0. Select-all checkbox — `role="columnheader"` so the table
          semantics still hold; the cell is interactive via the inner
          checkbox. Skipped entirely when bulkSelectable is false (the
          grid template above also omits the 36px checkbox slot). */}
      {bulkSelectable && (
        <div role="columnheader" className="px-3 py-2 flex items-center justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Checkbox
                    checked={checkboxChecked}
                    onCheckedChange={onToggleSelectAll}
                    aria-label={checkboxLabel}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{checkboxLabel}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Column labels + (full-density only) resize handles, driven by
          the shared CASE_LIST_COLUMNS definition so the order / labels
          stay in sync with the row component. In dense mode the
          resizers are dropped (the dense template uses fr units), and
          the column set is narrowed to DENSE_COLUMN_IDS. Sortable
          columns (Priority / Due Date / Stage — UR signal 2026-05)
          render as buttons with a chevron + aria-sort. */}
      {visibleColumns.map((col, idx) => {
        const canSort = !!col.sortable && !!onSort;
        const isActiveSort = canSort && sortState?.columnId === col.id;
        const direction = isActiveSort ? sortState!.direction : null;
        const ariaSort: "ascending" | "descending" | "none" =
          direction === "asc"
            ? "ascending"
            : direction === "desc"
              ? "descending"
              : "none";
        return (
          <React.Fragment key={col.id}>
            <div
              role="columnheader"
              aria-sort={ariaSort}
              className="truncate select-none"
            >
              {canSort ? (
                <button
                  type="button"
                  onClick={() => onSort!(col.id)}
                  className={cn(
                    "w-full h-full flex items-center gap-1 px-3 py-2",
                    "text-left text-[11px] uppercase tracking-wide font-semibold text-[#605e5c]",
                    "hover:bg-[#f3f2f1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-inset",
                    isActiveSort && "text-[#0078d4]",
                  )}
                  aria-label={`Sort by ${col.label}${
                    direction === "asc"
                      ? " (currently ascending — click for descending)"
                      : direction === "desc"
                        ? " (currently descending — click to clear)"
                        : ""
                  }`}
                >
                  <span className="truncate">{col.label}</span>
                  {direction === "asc" ? (
                    <ChevronUp className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  ) : direction === "desc" ? (
                    <ChevronDown className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronsUpDown
                      className="w-3 h-3 flex-shrink-0 text-[#a19f9d]"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ) : (
                <div className="px-3 py-2 truncate">{col.label}</div>
              )}
            </div>
            {!isDense &&
              columnWidths &&
              idx < visibleColumns.length - 1 &&
              (onColumnResize ? (
                <ColumnResizer
                  columnId={col.id}
                  columnLabel={col.label}
                  currentWidth={columnWidths[col.id]}
                  minWidth={col.minWidth}
                  maxWidth={col.maxWidth}
                  onResize={(next) => onColumnResize(col.id, next)}
                />
              ) : (
                // No resizer wired (e.g. Attorney Dashboard) — render an
                // empty placeholder so the 4 px resizer slot in the inline
                // grid template stays occupied. Without this, the next
                // column's label collapses into the 4 px slot and every
                // header cell after the first shifts one column to the
                // left of its row.
                <span aria-hidden="true" />
              ))}
          </React.Fragment>
        );
      })}
    </div>
  );
}
