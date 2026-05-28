/**
 * CaseQueueBulkActionsBar — selection toolbar that appears at the top of
 * the list container when one or more rows are selected. Follows the
 * Outlook / Gmail / GitHub command-bar pattern: hidden when selection
 * count is zero, slides in and stays sticky at the top of the
 * scrollable list as the user scrolls.
 *
 * Surfaces three batch actions:
 *   - **Assign all to me**: assigns every selected case to the
 *     current user.
 *   - **Release all**: clears the assignee on every selected case.
 *   - **Assign…**: opens a small picker dialog to assign all selected
 *     cases to a specific RS.
 *
 * Plus a "Clear selection" link that empties the selection set.
 *
 * Visual: stays pinned to the top of the parent scroll container via
 * `sticky top-0`. Subtle drop shadow on the bottom edge so it looks
 * like it's floating above the list rows. Has its own focus ring +
 * aria-label announcing the count for screen readers.
 */

import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { CheckSquare, UserCheck, UserMinus, UserPlus, X } from "lucide-react";

interface CaseQueueBulkActionsBarProps {
  /** Number of cases currently selected. The bar self-hides when zero. */
  selectedCount: number;
  /** Total number of cases visible under the current filter / sort.
   *  Drives the "Select all N" affordance — when all visible cases are
   *  already selected, the button hides and the count line reads
   *  "All N selected". */
  totalCount: number;
  /** Select every visible case (Gmail / Outlook "Select all" pattern). */
  onSelectAll: () => void;
  /** Pick (assign-to-me) every selected case. */
  onPickAll: () => void;
  /** Release every selected case (clear assignee). */
  onReleaseAll: () => void;
  /** Open the bulk-assign picker. */
  onAssignAll: () => void;
  /** Empty the selection. */
  onClear: () => void;
}

export function CaseQueueBulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onPickAll,
  onReleaseAll,
  onAssignAll,
  onClear,
}: CaseQueueBulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      role="region"
      aria-label={`Bulk actions for ${selectedCount} selected case${selectedCount === 1 ? "" : "s"}`}
      className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-b-2 border-[#0078d4] shadow-[0_4px_8px_-2px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#0078d4]">
          {selectedCount === totalCount && totalCount > 0
            ? `All ${totalCount} selected`
            : `${selectedCount} selected`}
        </span>
        {/* "Select all N cases" — closes the gap between the user's
            partial selection and the full visible set. Hides itself
            once every visible row is already checked. Standard Gmail /
            Outlook command-bar pattern. */}
        {selectedCount < totalCount && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#0078d4] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1 rounded"
                  aria-label={`Select all ${totalCount} visible case${totalCount === 1 ? "" : "s"}`}
                >
                  <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
                  Select all {totalCount}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Select every case currently visible under the filters
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-[#605e5c] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1 rounded"
          aria-label={`Clear selection of ${selectedCount} case${selectedCount === 1 ? "" : "s"}`}
        >
          Clear selection
        </button>
      </div>

      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onPickAll}
                className="h-8 gap-1.5 border-[#0078d4] text-[#0078d4] hover:bg-[#f3f9fd]"
              >
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                Assign all to me
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Assign the {selectedCount} selected case
                {selectedCount === 1 ? "" : "s"} to you
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onReleaseAll}
                className="h-8 gap-1.5"
              >
                <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                Release all
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Clear the assignee on the {selectedCount} selected case
                {selectedCount === 1 ? "" : "s"}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={onAssignAll}
                className="h-8 gap-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white"
              >
                <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
                Assign…
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Reassign the {selectedCount} selected case
                {selectedCount === 1 ? "" : "s"} to a specific specialist
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                className="h-8 w-8 p-0 text-[#605e5c] hover:bg-[#f3f2f1]"
                aria-label="Close bulk actions bar"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Close</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
