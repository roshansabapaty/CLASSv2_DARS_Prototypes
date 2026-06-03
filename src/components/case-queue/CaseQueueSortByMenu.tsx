/**
 * CaseQueueSortByMenu — dropdown that drives the case-queue `sortState`.
 *
 * Card view doesn't have clickable column headers to set a sort, so this
 * menu surfaces the same sort options the Detailed-list view exposes via
 * the Priority / Due Date / Stage / Assignee / NDO Reminder column
 * headers — plus the Internal Escalation sort — in a single picker. The
 * menu is mounted next to SavedViewsMenu + AddFilterMenu in the queue
 * header so it's reachable from every view mode.
 *
 * State model:
 *   - `sortState = null` → "Default" — the queue falls back to its
 *     due-date-ascending tiebreaker (most-urgent due first).
 *   - `sortState = { columnId, direction }` → the chosen field + order.
 *     The same shape the column-header click writes, so picking from
 *     this menu and clicking a header are interchangeable.
 */
import * as React from "react";
import { ArrowDownUp, Check } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../ui/utils";
import {
  CASE_LIST_COLUMNS,
  type ColumnId,
  type SortState,
} from "./caseListColumns";

interface SortOption {
  columnId: ColumnId;
  direction: "asc" | "desc";
  label: string;
}

// Per-column direction labels — each entry maps `asc` / `desc` to a
// human-friendly phrase that reflects what the column actually orders
// by (e.g., Priority is a weight, so "Most urgent first" reads more
// naturally than "Z to A"). Columns without an entry fall back to
// `DEFAULT_LABELS` which assume alphabetical ordering.
const DIRECTION_LABELS: Partial<Record<ColumnId, { asc: string; desc: string }>> = {
  // People / text columns
  "case-id":             { asc: "A to Z", desc: "Z to A" },
  "case-assignee":       { asc: "A to Z", desc: "Z to A" },
  "escalation-reviewer": { asc: "A to Z", desc: "Z to A" },
  "country":             { asc: "A to Z", desc: "Z to A" },
  // Date / chronological columns
  "due-date":     { asc: "Soonest first", desc: "Latest first" },
  "ndo-reminder": { asc: "Soonest first", desc: "Latest first" },
  // Weighted / urgency columns
  "priority":            { asc: "Least urgent first", desc: "Most urgent first" },
  "internal-escalation": { asc: "Least urgent first", desc: "Most urgent first" },
  "gfr-hold":            { asc: "Lowest tier first",  desc: "Highest tier first" },
  // Workflow ordering
  "stage": { asc: "Workflow order", desc: "Reverse workflow order" },
  // Boolean flag columns — flagged rows treated as "on"
  "threat-to-life": { asc: "Unflagged first",     desc: "Flagged first" },
  "enterprise":     { asc: "Non-Enterprise first", desc: "Enterprise first" },
  // Numeric count columns
  "unread":          { asc: "Fewest first", desc: "Most first" },
  "attorney-review": { asc: "Fewest first", desc: "Most first" },
  "identifiers":     { asc: "Fewest first", desc: "Most first" },
  "services":        { asc: "Fewest first", desc: "Most first" },
};

const DEFAULT_LABELS = { asc: "Ascending", desc: "Descending" };

// Derive the dropdown's groups dynamically from CASE_LIST_COLUMNS so
// every column that's clickable-to-sort in the header also shows up in
// the menu — and any future column added to caseListColumns.ts with
// `sortable: true` lands here automatically. No drift between the two
// sort surfaces.
const SORT_GROUPS: Array<{ heading: string; options: SortOption[] }> =
  CASE_LIST_COLUMNS.filter((c) => c.sortable).map((col) => {
    const labels = DIRECTION_LABELS[col.id] ?? DEFAULT_LABELS;
    return {
      heading: col.label,
      options: [
        // For weighted / numeric / boolean / urgency columns the
        // user almost always wants the "high end" first (most urgent,
        // most threats, most identifiers) — surface that ordering at
        // the top of each group so it reads naturally.
        { columnId: col.id, direction: "desc", label: labels.desc },
        { columnId: col.id, direction: "asc",  label: labels.asc },
      ],
    };
  });

function findActiveOption(state: SortState | null): SortOption | null {
  if (!state) return null;
  for (const group of SORT_GROUPS) {
    const hit = group.options.find(
      (o) => o.columnId === state.columnId && o.direction === state.direction,
    );
    if (hit) return hit;
  }
  return null;
}

export interface CaseQueueSortByMenuProps {
  sortState: SortState | null;
  onChange: (next: SortState | null) => void;
}

export function CaseQueueSortByMenu({
  sortState,
  onChange,
}: CaseQueueSortByMenuProps) {
  const active = findActiveOption(sortState);
  const activeGroup = active
    ? SORT_GROUPS.find((g) => g.options.some((o) => o === active))
    : null;
  const triggerLabel = active
    ? `${activeGroup?.heading ?? ""} · ${active.label}`
    : "Default";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-1.5 text-xs",
            // Subtle accent when a non-default sort is active so the user
            // sees at a glance that the queue order is custom.
            active && "border-[#0078d4] text-[#0078d4]",
          )}
          aria-label={`Sort: ${triggerLabel}`}
        >
          <ArrowDownUp className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="font-medium">Sort:</span>
          <span className="truncate max-w-[180px]">{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-[#605e5c]">
          Sort cases by
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onChange(null)}
          className={cn(
            "cursor-pointer flex items-center justify-between",
            !active && "bg-[#f3f2f1]",
          )}
        >
          <span>Default (due-date tiebreaker)</span>
          {!active && (
            <Check className="w-3.5 h-3.5 text-[#0078d4]" aria-hidden="true" />
          )}
        </DropdownMenuItem>
        {SORT_GROUPS.map((group) => (
          <React.Fragment key={group.heading}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-[#605e5c]">
              {group.heading}
            </DropdownMenuLabel>
            {group.options.map((opt) => {
              const isActive =
                active?.columnId === opt.columnId &&
                active.direction === opt.direction;
              return (
                <DropdownMenuItem
                  key={`${opt.columnId}-${opt.direction}`}
                  onClick={() =>
                    onChange({
                      columnId: opt.columnId,
                      direction: opt.direction,
                    })
                  }
                  className={cn(
                    "cursor-pointer flex items-center justify-between",
                    isActive && "bg-[#f3f2f1]",
                  )}
                >
                  <span>{opt.label}</span>
                  {isActive && (
                    <Check
                      className="w-3.5 h-3.5 text-[#0078d4]"
                      aria-hidden="true"
                    />
                  )}
                </DropdownMenuItem>
              );
            })}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
