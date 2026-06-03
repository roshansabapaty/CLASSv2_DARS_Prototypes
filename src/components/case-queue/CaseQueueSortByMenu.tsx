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
import type { ColumnId, SortState } from "./caseListColumns";

interface SortOption {
  columnId: ColumnId;
  direction: "asc" | "desc";
  label: string;
}

// Curated list — matches the sortable columns in caseListColumns.ts.
// Each field gets the two most useful orderings (e.g., Priority surfaces
// "Most urgent first" and "Least urgent first" rather than raw asc/desc).
const SORT_GROUPS: Array<{ heading: string; options: SortOption[] }> = [
  {
    heading: "Priority",
    options: [
      { columnId: "priority", direction: "desc", label: "Most urgent first" },
      { columnId: "priority", direction: "asc", label: "Least urgent first" },
    ],
  },
  {
    heading: "Due Date",
    options: [
      { columnId: "due-date", direction: "asc", label: "Soonest first" },
      { columnId: "due-date", direction: "desc", label: "Latest first" },
    ],
  },
  {
    heading: "Stage",
    options: [
      { columnId: "stage", direction: "asc", label: "Workflow order" },
      { columnId: "stage", direction: "desc", label: "Reverse workflow order" },
    ],
  },
  {
    heading: "Assignee",
    options: [
      { columnId: "case-assignee", direction: "asc", label: "A to Z" },
      { columnId: "case-assignee", direction: "desc", label: "Z to A" },
    ],
  },
  {
    heading: "NDO Reminder",
    options: [
      { columnId: "ndo-reminder", direction: "asc", label: "Soonest first" },
      { columnId: "ndo-reminder", direction: "desc", label: "Latest first" },
    ],
  },
  {
    heading: "Internal Escalation",
    options: [
      {
        columnId: "internal-escalation",
        direction: "asc",
        label: "Most urgent first",
      },
      {
        columnId: "internal-escalation",
        direction: "desc",
        label: "Least urgent first",
      },
    ],
  },
];

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
