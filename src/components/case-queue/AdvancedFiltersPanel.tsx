/**
 * AdvancedFiltersPanel — side-panel "power user" filter composer.
 * Opened from `AddFilterMenu`'s "Advanced filters…" CTA. Lets users:
 *   - See every catalogued filter (including ones not yet active)
 *   - Toggle each filter on / off via its row checkbox
 *   - Edit each active filter's value inline (using the same
 *     `FilterValueControl` the chip popover uses)
 *   - Apply or Cancel the composed set
 *
 * Maintains a local draft state while open so the user can stage
 * changes without affecting the live filter chain. Apply commits the
 * draft to the host's `activeFilters`; Cancel discards it.
 */

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "../ui/sheet";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { FILTER_CATALOG, type FilterGroup } from "./extraFilterCatalog";
import { FilterValueControl } from "./ExtraFilterChip";
import { cn } from "../ui/utils";

export interface AdvancedFiltersPanelProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** The host's current active filter bag — used to seed the panel's draft. */
  activeFilters: Record<string, unknown>;
  /** Fires when the user clicks Apply. Replaces the host's bag. */
  onApply: (next: Record<string, unknown>) => void;
  assigneeOptions: string[];
  crimeOptions: string[];
  caseStatusOptions: string[];
  countryOptions: string[];
  requestTypeOptions: string[];
  requestSubTypeOptions?: string[];
  servicesOptions?: string[];
}

const GROUP_ORDER: FilterGroup[] = [
  "People",
  "Case meta",
  "Dates",
  "Workflow",
  "Signals",
  "Tenant",
];

export function AdvancedFiltersPanel({
  open,
  onOpenChange,
  activeFilters,
  onApply,
  assigneeOptions,
  crimeOptions,
  caseStatusOptions,
  countryOptions,
  requestTypeOptions,
  requestSubTypeOptions = [],
  servicesOptions = [],
}: AdvancedFiltersPanelProps) {
  // Local draft — re-seed every time the panel opens so the user
  // starts from the host's current state, not a stale snapshot.
  const [draft, setDraft] = React.useState<Record<string, unknown>>({});
  React.useEffect(() => {
    if (open) setDraft({ ...activeFilters });
  }, [open, activeFilters]);

  const toggleFilter = (id: string, enabled: boolean) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (enabled) {
        const def = FILTER_CATALOG.find((f) => f.id === id);
        next[id] = def?.defaultValue;
      } else {
        delete next[id];
      }
      return next;
    });
  };
  const setValue = (id: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [id]: value }));
  };
  const handleApply = () => {
    onApply(draft);
    onOpenChange(false);
  };
  const handleClearAll = () => setDraft({});

  const activeCount = Object.keys(draft).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Advanced filters</SheetTitle>
          <SheetDescription>
            Compose a multi-property filter set. Each filter you enable
            narrows the case list. Apply commits the set; Cancel
            discards your draft.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between py-2 border-b border-[#edebe9]">
          <span className="text-xs text-[#605e5c]">
            {activeCount === 0
              ? "No filters enabled"
              : `${activeCount} filter${activeCount === 1 ? "" : "s"} enabled`}
          </span>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-[#0078d4] hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-3 space-y-5">
          {GROUP_ORDER.map((group) => {
            const items = FILTER_CATALOG.filter((f) => f.group === group);
            if (items.length === 0) return null;
            return (
              <section key={group}>
                <h3 className="text-[11px] uppercase tracking-wide font-semibold text-[#605e5c] mb-2">
                  {group}
                </h3>
                <div className="space-y-2">
                  {items.map((def) => {
                    const enabled = Object.prototype.hasOwnProperty.call(
                      draft,
                      def.id,
                    );
                    return (
                      <div
                        key={def.id}
                        className={cn(
                          "border rounded-md p-3",
                          enabled
                            ? "border-[#0078d4]/40 bg-[#deecf9]/20"
                            : "border-[#e1dfdd] bg-white",
                        )}
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={enabled}
                            onCheckedChange={(c) =>
                              toggleFilter(def.id, c === true)
                            }
                            aria-label={`Enable ${def.label} filter`}
                          />
                          <span className="text-sm font-semibold text-[#323130]">
                            {def.label}
                          </span>
                        </label>
                        {enabled && (
                          <div className="mt-3 pl-6">
                            <FilterValueControl
                              def={def}
                              value={draft[def.id]}
                              onChange={(v) => setValue(def.id, v)}
                              assigneeOptions={assigneeOptions}
                              crimeOptions={crimeOptions}
                              caseStatusOptions={caseStatusOptions}
                              countryOptions={countryOptions}
                              requestTypeOptions={requestTypeOptions}
                              requestSubTypeOptions={requestSubTypeOptions}
                              servicesOptions={servicesOptions}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <SheetFooter className="border-t border-[#edebe9] pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
          >
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
