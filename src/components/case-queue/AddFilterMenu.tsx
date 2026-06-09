/**
 * AddFilterMenu — "+ Add filter" trigger that opens a popover listing
 * every filter in `FILTER_CATALOG` that isn't already mounted as an
 * active chip. Picking one fires `onAdd(filterId)` so the host can
 * seed the chip with its default value.
 *
 * Also exposes a secondary "Advanced filters…" CTA at the bottom that
 * opens the side-panel compose UI (`AdvancedFiltersPanel`). The host
 * owns the panel-open state and supplies the callback.
 */

import * as React from "react";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { cn } from "../ui/utils";
import { FILTER_CATALOG, type FilterDef, type FilterGroup } from "./extraFilterCatalog";

export interface AddFilterMenuProps {
  /** IDs of filters already mounted as chips — these are excluded
   *  from the menu so the user can't double-mount the same filter. */
  activeFilterIds: string[];
  onAdd: (filterId: string) => void;
  onOpenAdvanced: () => void;
  /** Deep-link to the unified CustomViewPanel. Pinned below the
   *  scroll-capped list as a secondary CTA next to the existing
   *  "Advanced filters…" entry, so users can promote a one-shot pick
   *  into the full view-editor without re-opening the toolbar. */
  onOpenCustomize?: () => void;
  className?: string;
}

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

export function AddFilterMenu({
  activeFilterIds,
  onAdd,
  onOpenAdvanced,
  onOpenCustomize,
  className,
}: AddFilterMenuProps) {
  const [open, setOpen] = React.useState(false);

  const available = FILTER_CATALOG.filter(
    (f) => !activeFilterIds.includes(f.id),
  );
  const byGroup = React.useMemo(() => {
    const m = new Map<FilterGroup, FilterDef[]>();
    for (const f of available) {
      const list = m.get(f.group) ?? [];
      list.push(f);
      m.set(f.group, list);
    }
    return m;
  }, [available]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label="Add filter"
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border bg-white text-[#323130] border-[#e1dfdd] hover:bg-[#f3f2f1]",
            className,
          )}
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add filter</span>
        </Button>
      </PopoverTrigger>
      {/* Widened from w-64 → w-80 so labels can breathe inside the
          30px side padding that now matches the AdvancedFiltersPanel.
          The list region caps at ~10 rows via max-h on the inner
          scroll wrapper so the popover stays compact even with the
          full catalog (8 groups, 22 filters). Advanced CTA stays
          outside the scroll region so it's always visible. */}
      <PopoverContent className="w-80 p-0 z-50" align="start">
        <div className="py-1">
          {available.length === 0 ? (
            <div className="px-[30px] py-3 text-xs text-[#605e5c] italic">
              All available filters are already added.
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {GROUP_ORDER.map((group) => {
                const items = byGroup.get(group);
                if (!items || items.length === 0) return null;
                return (
                  <div key={group}>
                    <div className="px-[30px] pt-2 pb-1 text-[10px] uppercase tracking-wide font-semibold text-[#605e5c]">
                      {group}
                    </div>
                    {items.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          onAdd(f.id);
                          setOpen(false);
                        }}
                        className="w-full text-left px-[30px] py-1.5 text-xs text-[#323130] hover:bg-[#f3f2f1] focus:outline-none focus-visible:bg-[#f3f2f1]"
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-[#edebe9] mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenAdvanced();
              }}
              className="w-full text-left px-[30px] py-2 text-xs text-[#0078d4] font-semibold hover:bg-[#f3f9ff] focus:outline-none focus-visible:bg-[#f3f9ff] flex items-center gap-2"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              Advanced filters…
            </button>
            {onOpenCustomize && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenCustomize();
                }}
                className="w-full text-left px-[30px] py-2 text-xs text-[#0078d4] font-semibold hover:bg-[#f3f9ff] focus:outline-none focus-visible:bg-[#f3f9ff] flex items-center gap-2"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                Customize view…
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
