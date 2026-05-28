/**
 * BadgeFilterPopover — multi-select popover that filters the case list
 * by one or more operational badges (Threat to Life, Enterprise, Azure,
 * GFR Hold, etc.). A small Any / All segmented control toggles the
 * match semantics when 2+ badges are selected.
 *
 * Mounted in both the main Case Queue toolbar and the Attorney
 * Dashboard toolbar so the same filter UX is available on both views.
 */

import * as React from "react";
import { Filter } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { cn } from "../ui/utils";
import {
  OPERATIONAL_BADGES,
  type BadgeFilterState,
  type BadgeMatchMode,
  type OperationalBadgeId,
} from "./operationalBadgeFilters";

export interface BadgeFilterPopoverProps {
  value: BadgeFilterState;
  onChange: (next: BadgeFilterState) => void;
  /** Optional className applied to the trigger button — lets callers
   *  match the trigger's height / spacing to their toolbar. */
  className?: string;
}

export function BadgeFilterPopover({
  value,
  onChange,
  className,
}: BadgeFilterPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const count = value.selected.size;

  const toggleBadge = (id: OperationalBadgeId) => {
    const next = new Set(value.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ selected: next, mode: value.mode });
  };

  const setMode = (mode: BadgeMatchMode) => {
    onChange({ selected: value.selected, mode });
  };

  const clear = () => {
    onChange({ selected: new Set(), mode: value.mode });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={
            count === 0
              ? "Filter by operational badges"
              : `Filter by operational badges (${count} selected)`
          }
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium border",
            count > 0
              ? "border-[#0078d4] text-[#0078d4] bg-[#deecf9]/40"
              : "bg-white text-[#323130] border-[#e1dfdd] hover:bg-[#f3f2f1]",
            className,
          )}
        >
          <Filter className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Badges</span>
          {count > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] bg-white text-[#0078d4] border border-[#0078d4]/40"
              aria-hidden="true"
            >
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 z-50" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#605e5c]">
              Filter by operational badges
            </span>
            {count > 0 && (
              <button
                type="button"
                onClick={clear}
                className="text-[11px] text-[#0078d4] hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0078d4] rounded px-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-1">
            {OPERATIONAL_BADGES.map((badge) => {
              const Icon = badge.icon;
              const checked = value.selected.has(badge.id);
              return (
                <label
                  key={badge.id}
                  className={cn(
                    "flex items-start gap-2 px-1.5 py-1.5 rounded cursor-pointer",
                    "hover:bg-[#f3f2f1]",
                    checked && "bg-[#deecf9]/30",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleBadge(badge.id)}
                    className="mt-0.5"
                    aria-label={badge.label}
                  />
                  <div className="flex-1 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5",
                        badge.chipClasses,
                      )}
                      style={{ fontWeight: 600 }}
                    >
                      <Icon className="w-3 h-3 mr-1" aria-hidden="true" />
                      {badge.label}
                    </Badge>
                    <p className="text-[11px] text-[#605e5c] leading-tight mt-1">
                      {badge.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Any / All toggle — only visible when 2+ badges are
              selected, since the choice is meaningless with one. */}
          {count > 1 && (
            <div className="border-t border-[#edebe9] pt-2.5">
              <div className="text-[11px] uppercase tracking-wide text-[#605e5c] mb-1.5 font-semibold">
                Match
              </div>
              <div
                role="radiogroup"
                aria-label="Badge filter match mode"
                className="inline-flex border border-[#e1dfdd] rounded-md p-0.5 bg-white"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={value.mode === "any"}
                  onClick={() => setMode("any")}
                  className={cn(
                    "px-3 py-1 text-xs rounded transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]",
                    value.mode === "any"
                      ? "bg-[#0078d4] text-white"
                      : "text-[#605e5c] hover:text-[#323130]",
                  )}
                >
                  Any (OR)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={value.mode === "all"}
                  onClick={() => setMode("all")}
                  className={cn(
                    "px-3 py-1 text-xs rounded transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]",
                    value.mode === "all"
                      ? "bg-[#0078d4] text-white"
                      : "text-[#605e5c] hover:text-[#323130]",
                  )}
                >
                  All (AND)
                </button>
              </div>
              <p className="text-[11px] text-[#605e5c] mt-1.5">
                {value.mode === "any"
                  ? "Show cases that have any of the selected badges."
                  : "Show cases that have every selected badge."}
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
