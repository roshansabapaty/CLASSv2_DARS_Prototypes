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
import { ChevronDown, ChevronUp, ChevronsUpDown, SlidersHorizontal } from "lucide-react";
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
  getDenseGridTemplate,
  type ColumnDef,
  type ColumnId,
  type ColumnWidths,
  type SortState,
  buildGridTemplate,
  reorderColumn,
} from "./caseListColumns";
// Fluent v9 components used for the column-reorder Settings menu — the
// a11y-first non-mouse path. Drag-and-drop on the header cell is the
// mouse-first path; both write through the same `onReorder` callback.
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuPopover,
  MenuTrigger,
  tokens,
} from "@fluentui/react-components";
import {
  TableColumnTopBottomEditRegular,
  ArrowUpRegular,
  ArrowDownRegular,
  LockClosedRegular,
} from "@fluentui/react-icons";

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
  /** Fires when the user reorders columns — either by dragging a header
   *  cell onto a new position, or by clicking Move Up / Move Down in the
   *  Fluent "Edit columns" Menu. Receives the new order as an array of
   *  ColumnIds matching the visible column count. Parents persist this
   *  to localStorage and thread it back via `columns` (which the parent
   *  should compute via `applyColumnOrder`). When omitted, the header
   *  renders read-only (no drag handles, no Settings menu).
   */
  onReorder?: (nextOrder: ColumnId[]) => void;
  /** Full ordered column list — includes columns the user has hidden.
   *  Drives the Edit Columns menu so the user can un-hide a column from
   *  there. When omitted, the menu walks `columns` (back-compat). */
  allColumns?: ColumnDef[];
  /** Column ids the user has hidden. Drives the Edit Columns menu's
   *  per-row checkbox state. Passed alongside `allColumns` so the menu
   *  can render every column with the right initial state. */
  hiddenColumnIds?: ColumnId[];
  /** Fires when the user toggles the show/hide checkbox for a column
   *  in the Edit Columns menu. Locked columns never fire this — the
   *  checkbox renders disabled. When omitted, the show/hide checkboxes
   *  are not rendered (back-compat). */
  onToggleColumnHidden?: (columnId: ColumnId, nextHidden: boolean) => void;
  /** Deep-link to the unified CustomViewPanel from the Edit Columns
   *  menu. Pinned at the bottom of the menu's scroll region as a
   *  "Customize view…" CTA matching the same pattern on the Sort
   *  and +Add filter menus. */
  onOpenCustomize?: () => void;
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
  onReorder,
  allColumns,
  hiddenColumnIds,
  onToggleColumnHidden,
  onOpenCustomize,
}: CaseQueueListHeaderProps) {
  // The Edit Columns menu lists EVERY known column (visible or hidden)
  // so the user can un-hide one. Falls back to `columns` when the
  // parent hasn't wired the full list yet (back-compat: no hidden
  // columns surface in the menu, matching today's no-hide behaviour).
  const menuColumns = allColumns ?? columns;
  const hiddenSet = React.useMemo(
    () => new Set(hiddenColumnIds ?? []),
    [hiddenColumnIds],
  );
  // ── Column drag-and-drop state ────────────────────────────────────
  // dragIndex: which visible column is being dragged (null when idle)
  // dropTargetIndex: where the dragged column would land if released now
  //   (used to paint the Fluent-brand vertical drop indicator)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = React.useState<number | null>(null);
  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    if (!onReorder) return;
    // Locked columns refuse to be picked up — Case ID stays at the
    // leftmost position regardless of user drag attempts.
    if (columns[idx]?.locked) {
      e.preventDefault();
      return;
    }
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    // Some browsers refuse to start a drag without dataTransfer data set.
    try { e.dataTransfer.setData("text/plain", String(idx)); } catch { /* noop */ }
  };
  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    if (dragIndex === null) return;
    // Refuse to highlight a locked column as a drop target — the
    // dropped column can't displace a locked one.
    if (columns[idx]?.locked) return;
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = "move";
    if (dropTargetIndex !== idx) setDropTargetIndex(idx);
  };
  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    if (dragIndex === null || !onReorder) return;
    if (columns[idx]?.locked) return;
    e.preventDefault();
    const currentOrder = columns.map((c) => c.id);
    const next = reorderColumn(currentOrder, dragIndex, idx);
    if (next !== currentOrder) onReorder(next);
    setDragIndex(null);
    setDropTargetIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDropTargetIndex(null);
  };
  const moveColumn = (fromIndex: number, toIndex: number) => {
    if (!onReorder) return;
    // Lock-aware: source and target both must be unlocked.
    if (columns[fromIndex]?.locked || columns[toIndex]?.locked) return;
    const currentOrder = columns.map((c) => c.id);
    const next = reorderColumn(currentOrder, fromIndex, toIndex);
    if (next !== currentOrder) onReorder(next);
  };
  // Reorder against the FULL column list (visible + hidden). Used by
  // the Edit Columns menu so the persisted order keeps hidden columns
  // in place — re-showing one later lands it back where it was.
  const moveMenuColumn = (fromIndex: number, toIndex: number) => {
    if (!onReorder) return;
    if (menuColumns[fromIndex]?.locked || menuColumns[toIndex]?.locked) return;
    const currentOrder = menuColumns.map((c) => c.id);
    const next = reorderColumn(currentOrder, fromIndex, toIndex);
    if (next !== currentOrder) onReorder(next);
  };
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

  // Dense template — single source of truth lives in
  // `caseListColumns.ts` so the header and row CAN'T drift apart.
  // Applied as an inline `gridTemplateColumns` style (NOT a Tailwind
  // class) — see the contract comment at `DENSE_TRACKS`.
  const denseGridTemplate = getDenseGridTemplate(bulkSelectable);

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
      )}
      style={
        isDense
          ? { gridTemplateColumns: denseGridTemplate }
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
        const isDragging = dragIndex === idx;
        const isDropTarget = dropTargetIndex === idx && dragIndex !== idx;
        return (
          <React.Fragment key={col.id}>
            <div
              role="columnheader"
              aria-sort={ariaSort}
              className={cn(
                "truncate select-none relative",
                onReorder && "cursor-grab active:cursor-grabbing",
                isDragging && "opacity-40",
                // Drop indicator — a 2 px brand-blue vertical bar
                // painted on whichever edge of the target column the
                // drag would land. dragIndex < idx → bar on the right
                // edge; dragIndex > idx → bar on the left edge.
                isDropTarget &&
                  (dragIndex! < idx
                    ? "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-[2px] after:bg-[#0078d4]"
                    : "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-[#0078d4]"),
              )}
              draggable={!!onReorder}
              onDragStart={onReorder ? handleDragStart(idx) : undefined}
              onDragOver={onReorder ? handleDragOver(idx) : undefined}
              onDrop={onReorder ? handleDrop(idx) : undefined}
              onDragEnd={onReorder ? handleDragEnd : undefined}
              title={onReorder ? `${col.label} — drag to reorder` : undefined}
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

      {/* Fluent Edit Columns menu — accessibility-first alternative to
          drag-and-drop. Lives anchored to the rightmost column header
          cell so it doesn't steal a grid slot. Each Move Up / Move Down
          item fires the same `onReorder` callback the drag handlers do.
          Self-hides when onReorder is omitted (matches read-only mode). */}
      {onReorder && (
        <div
          role="columnheader"
          aria-label="Edit column order"
          className="absolute right-0 top-0 bottom-0 px-1 flex items-center bg-[#faf9f8]/95 backdrop-blur-[2px] border-l border-[#edebe9]"
        >
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <MenuButton
                appearance="subtle"
                size="small"
                icon={<TableColumnTopBottomEditRegular />}
                aria-label="Edit column order"
                title="Edit column order"
                style={{ minWidth: 0, height: 28 }}
              />
            </MenuTrigger>
            <MenuPopover>
              {/* Single-level reorder list — each row is the column
                  name + trailing up / down icon buttons. The previous
                  per-column flyout submenu was a click-through cost
                  for what's a simple two-direction shuffle; arrow
                  buttons sitting next to the name make the action
                  visible without an extra hover. Locked columns
                  (Case ID) get a lock glyph + disabled arrows so the
                  pinning is clearly communicated, not just enforced. */}
              <MenuList>
                <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide font-semibold text-[color:var(--colorNeutralForeground3)]">
                  Show / reorder columns
                </div>
                {/* 10-row scroll cap — matches the AddFilterMenu and
                    Sort menu pattern so heavy column catalogs stay
                    scannable. Pin the Customize view CTA below. */}
                <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {menuColumns.map((col, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === menuColumns.length - 1;
                  const locked = !!col.locked;
                  const hidden = hiddenSet.has(col.id);
                  // Up is also disabled when the column directly above
                  // is locked (can't displace it). Same for Down.
                  const upBlocked =
                    isFirst || locked || !!menuColumns[idx - 1]?.locked;
                  const downBlocked =
                    isLast || locked || !!menuColumns[idx + 1]?.locked;
                  return (
                    <div
                      key={col.id}
                      className="flex items-center gap-2 px-3 py-1"
                      style={{ minWidth: 280 }}
                    >
                      {/* Show / hide toggle. Locked columns render the
                          checkbox disabled + always-checked so the
                          pinning is visible, not just enforced. When
                          `onToggleColumnHidden` isn't wired (back-compat)
                          the checkbox is omitted entirely. */}
                      {onToggleColumnHidden && (
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
                      )}
                      <span
                        className="flex-1 text-sm"
                        style={{
                          color: locked || hidden
                            ? tokens.colorNeutralForeground3
                            : tokens.colorNeutralForeground1,
                        }}
                      >
                        {col.label}
                      </span>
                      {locked && (
                        <LockClosedRegular
                          aria-label="Locked"
                          title="This column is locked and cannot be moved or hidden"
                          style={{
                            fontSize: 14,
                            color: tokens.colorNeutralForeground3,
                          }}
                        />
                      )}
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<ArrowUpRegular />}
                        aria-label={`Move ${col.label} up`}
                        title={
                          locked
                            ? "Locked column — cannot move"
                            : isFirst
                              ? "Already at the top"
                              : menuColumns[idx - 1]?.locked
                                ? "Blocked by a locked column above"
                                : "Move up"
                        }
                        disabled={upBlocked}
                        onClick={() => moveMenuColumn(idx, idx - 1)}
                      />
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<ArrowDownRegular />}
                        aria-label={`Move ${col.label} down`}
                        title={
                          locked
                            ? "Locked column — cannot move"
                            : isLast
                              ? "Already at the bottom"
                              : menuColumns[idx + 1]?.locked
                                ? "Blocked by a locked column below"
                                : "Move down"
                        }
                        disabled={downBlocked}
                        onClick={() => moveMenuColumn(idx, idx + 1)}
                      />
                    </div>
                  );
                })}
                </div>
                {onOpenCustomize && (
                  <div
                    style={{
                      borderTopWidth: 1,
                      borderTopStyle: "solid",
                      borderTopColor: tokens.colorNeutralStroke2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={onOpenCustomize}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#0078d4",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <SlidersHorizontal style={{ width: 14, height: 14 }} aria-hidden="true" />
                      Customize view…
                    </button>
                  </div>
                )}
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      )}
    </div>
  );
}
