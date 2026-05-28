/**
 * ServiceCategoryTable
 *
 * Compact table for category selection + date range configuration
 * within a service accordion body.
 *
 * Displays Category Groups as section headers, with individual
 * Data Category Items as selectable rows underneath each group.
 *
 * Three visual row states:
 *   • In Collection — green left border, disabled checkbox, read-only dates
 *   • New (selected) — blue left border, editable dates
 *   • Available — no border, empty checkbox
 */

import React, { useState, useRef, useEffect } from "react";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { CheckCircle2, Info, Lock, Plus, Search, X } from "lucide-react";
import { cn } from "../ui/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { CategoryGroupConfig, CategoryItemConfig } from "../../config/lensServicesConfig";
import type { Provenance } from "./leBaseline";
import { ProvenanceTag } from "./ProvenanceTag";
import { formatDateToMMM } from "../../utils/fulfillmentWizardHelpers";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubmittedItemData {
  enabled: boolean;
  collectionStatus?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  jobId?: string;
}

export interface ServiceCategoryTableProps {
  serviceId: string;
  /** Category groups to display (from STANDARD_CATEGORY_GROUPS) */
  groups: CategoryGroupConfig[];
  /** Selected items per group: groupKey → itemKey[] */
  selectedItems: Record<string, string[]>;
  /** Date ranges per item: "groupKey:itemKey" → { start, end } */
  categoryDateRanges: Record<string, { start: string; end: string }>;
  /** Additional job date ranges: "serviceId:groupKey:itemKey" → [{ start, end }] */
  additionalDateRanges: Record<string, Array<{ start: string; end: string }>>;
  /** Submitted job data: groupKey → itemKey → data */
  submittedData?: Record<string, Record<string, SubmittedItemData>>;
  isEditingCollectionScope: boolean;
  onToggleItem: (groupKey: string, itemKey: string) => void;
  onDateChange: (groupKey: string, itemKey: string, field: "start" | "end", value: string) => void;
  onAddDateRange: (groupKey: string, itemKey: string) => void;
  onRemoveDateRange: (groupKey: string, itemKey: string, index: number) => void;
  onUpdateAdditionalDateRange: (
    groupKey: string,
    itemKey: string,
    index: number,
    field: "start" | "end",
    value: string
  ) => void;
  /** When set, all selected items show this date range as read-only (bulk mode) */
  bulkDateRange?: { start: string; end: string };
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  showDaysBackShortcut?: boolean;
  onApplyServiceDateRange?: (start: string, end: string) => void;

  /** Optional: resolve provenance for each category row (LE / Modified / Added / Bulk Added). */
  getProvenance?: (groupKey: string, itemKey: string) => Provenance | null;
  /** Optional: reset a row's dates back to the LE baseline (shown on `le-modified` rows). */
  onResetItemToLE?: (groupKey: string, itemKey: string) => void;
  /** Optional: the LE-requested date for the row, rendered as "LE requested: …" subtext. */
  getBaselineDate?: (groupKey: string, itemKey: string) => { start: string; end: string } | undefined;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDate = (d: Date | string | undefined): string => {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const statusColor = (status: string | undefined) => {
  switch (status) {
    case "Complete": return "bg-[#dff6dd] text-[#107c10] border-[#107c10]";
    case "Started": return "bg-[#deecf9] text-[#0078d4] border-[#0078d4]";
    case "Failed": return "bg-[#fde7e9] text-[#a4262c] border-[#a4262c]";
    case "No Data": return "bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825]";
    default: return "bg-[#f3f2f1] text-[#605e5c] border-[#c8c6c4]";
  }
};

// ── Group Add Dropdown ────────────────────────────────────────────────────────

interface GroupAddDropdownProps {
  groupName: string;
  /** In "dropdown" mode this is addableItems; in "checkboxList" mode this is ALL group items */
  items: CategoryItemConfig[];
  onAdd: (itemKey: string) => void;
  /** Controls the popover body. Defaults to "dropdown". */
  layout?: "dropdown" | "checkboxList";
  /** Keys currently selected (only used by checkboxList mode) */
  selectedKeys?: string[];
  /** Keys locked because already submitted to collection (only used by checkboxList mode) */
  submittedKeys?: string[];
}

function GroupAddDropdown({
  groupName,
  items,
  onAdd,
  layout = "dropdown",
  selectedKeys = [],
  submittedKeys = [],
}: GroupAddDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && layout === "dropdown") setTimeout(() => searchRef.current?.focus(), 0);
  }, [open, layout]);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (items.length === 0) return null;

  const isCheckboxList = layout === "checkboxList";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1 text-[11px] text-[#0078d4] hover:text-[#106ebe] px-2 py-1 rounded hover:bg-[#deecf9] transition-colors",
          open && "bg-[#deecf9]"
        )}
      >
        <Plus className="w-3 h-3" />
        Add {groupName} category
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-[#c8c6c4] rounded-lg shadow-lg w-[260px]">
          {isCheckboxList ? (
            <div className="py-1 max-h-[260px] overflow-y-auto">
              {items.map((item) => {
                const isSubmitted = submittedKeys.includes(item.key);
                const isChecked = selectedKeys.includes(item.key) || isSubmitted;
                const isLocked = !!item.locked;
                const isDisabled = isSubmitted || isLocked;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { if (!isDisabled) onAdd(item.key); }}
                    disabled={isDisabled}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                      isDisabled ? "cursor-not-allowed" : "hover:bg-[#f3f2f1]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                        isChecked
                          ? isDisabled
                            ? "bg-[#8a8886] border-[#8a8886]"
                            : "bg-[#0078d4] border-[#0078d4]"
                          : "bg-white border-[#8a8886]"
                      )}
                    >
                      {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span
                      className={cn(
                        "text-xs flex-1",
                        isDisabled ? "text-[#8a8886]" : "text-[#323130]"
                      )}
                    >
                      {item.name}
                    </span>
                    {isLocked && (
                      <span className="flex items-center gap-1 text-[10px] text-[#8a8886] flex-shrink-0">
                        <Lock className="w-3 h-3" />
                        Required
                      </span>
                    )}
                    {item.info && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-3 h-3 flex-shrink-0 text-[#a19f9d]" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[220px] text-xs">
                            {item.info}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {items.length > 4 && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[#edebe9]">
                  <Search className="w-3 h-3 text-[#a19f9d] flex-shrink-0" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 text-xs bg-transparent outline-none text-[#323130] placeholder:text-[#a19f9d]"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="text-[#a19f9d] hover:text-[#605e5c]">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
              <div className="max-h-[200px] overflow-y-auto py-1">
                {filtered.length === 0 ? (
                  <div className="px-3 py-3 text-center text-xs text-[#a19f9d]">No matches</div>
                ) : (
                  filtered.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => { onAdd(item.key); setOpen(false); setSearch(""); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#f3f2f1] transition-colors text-left"
                    >
                      <span className="text-xs text-[#323130] flex-1">{item.name}</span>
                      {item.info && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 flex-shrink-0 text-[#a19f9d]" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[200px] text-xs">
                              {item.info}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ServiceCategoryTable({
  serviceId,
  groups,
  selectedItems,
  categoryDateRanges,
  additionalDateRanges,
  submittedData,
  isEditingCollectionScope,
  onToggleItem,
  onDateChange,
  onAddDateRange,
  onRemoveDateRange,
  onUpdateAdditionalDateRange,
  bulkDateRange,
  onSelectAll,
  onDeselectAll,
  showDaysBackShortcut = false,
  onApplyServiceDateRange,
  getProvenance,
  onResetItemToLE,
  getBaselineDate,
}: ServiceCategoryTableProps) {
  const [daysBackEnd, setDaysBackEnd] = useState("");
  const [daysBackValue, setDaysBackValue] = useState<string>("");
  // 2C (UX-Polish): rows that match the service / bulk default render a
  // compact "Same as service" link instead of two date inputs. Clicking
  // the link expands the row's date inputs. Per-row override (the user
  // has typed a real date) skips the link and always shows inputs.
  const [expandedDateRows, setExpandedDateRows] = useState<Set<string>>(
    () => new Set(),
  );
  const expandDateRow = (itemDateKey: string) => {
    setExpandedDateRows((prev) => {
      if (prev.has(itemDateKey)) return prev;
      const next = new Set(prev);
      next.add(itemDateKey);
      return next;
    });
  };

  // Total item counts (submitted items are always locked, don't count as selectable)
  const allItems = groups.flatMap((g) => g.items.map((i) => ({ groupKey: g.key, itemKey: i.key })));
  const isItemSubmitted = (groupKey: string, itemKey: string): boolean => {
    if (!isEditingCollectionScope || !submittedData) return false;
    return !!(submittedData[groupKey]?.[itemKey]?.enabled && submittedData[groupKey]?.[itemKey]?.jobId);
  };
  const nonSubmittedItems = allItems.filter(({ groupKey, itemKey }) => !isItemSubmitted(groupKey, itemKey));
  const totalSelectedCount = Object.values(selectedItems).reduce((acc, keys) => acc + keys.length, 0);
  const allNonSubmittedSelected =
    nonSubmittedItems.length > 0 &&
    nonSubmittedItems.every(({ groupKey, itemKey }) => selectedItems[groupKey]?.includes(itemKey));

  return (
    // `role="table"` connects the existing `role="row"` / `role="columnheader"`
    // descendants into a coherent table semantic group. The aria-label
    // identifies this surface for screen readers.
    <div
      className="border-t border-[#e1dfdd]"
      role="table"
      aria-label="Service categories and date ranges"
    >
      {/* Quick actions */}
      {(onSelectAll || onDeselectAll) && nonSubmittedItems.length > 0 && (
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          {onSelectAll && !allNonSubmittedSelected && (
            <Button variant="ghost" size="sm" onClick={onSelectAll}
              className="h-6 px-2 text-[10px] text-[#0078d4] hover:bg-[#deecf9]">
              Select All
            </Button>
          )}
          {onDeselectAll && totalSelectedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onDeselectAll}
              className="h-6 px-2 text-[10px] text-[#605e5c] hover:bg-[#f3f2f1]">
              Deselect All
            </Button>
          )}
          <span className="text-[10px] text-[#a19f9d] ml-auto">
            {totalSelectedCount}/{nonSubmittedItems.length} selected
          </span>
        </div>
      )}

      {/* Days Back shortcut (per-identifier mode) */}
      {showDaysBackShortcut && !bulkDateRange && onApplyServiceDateRange && (
        <div className="px-3 py-2 bg-[#f5f9fd] border-b border-[#e1dfdd]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-[#323130] whitespace-nowrap">Quick date:</span>
            <Input
              type="date"
              value={daysBackEnd}
              onChange={(e) => {
                setDaysBackEnd(e.target.value);
                if (e.target.value && daysBackValue) {
                  const days = daysBackValue.toLowerCase() === "all" ? -1 : parseInt(daysBackValue);
                  if (days === -1) {
                    onApplyServiceDateRange("1990-01-01", e.target.value);
                  } else if (!isNaN(days) && days > 0) {
                    const end = new Date(e.target.value);
                    const start = new Date(end);
                    start.setDate(start.getDate() - days);
                    onApplyServiceDateRange(start.toISOString().split("T")[0], e.target.value);
                  }
                }
              }}
              className="h-6 text-[10px] px-1.5 w-[110px]"
              placeholder="End date"
              max={new Date().toISOString().split("T")[0]}
            />
            <span className="text-[10px] text-[#605e5c]">−</span>
            <Input
              type="text"
              value={daysBackValue}
              onChange={(e) => {
                setDaysBackValue(e.target.value);
                if (daysBackEnd && e.target.value) {
                  const days = e.target.value.toLowerCase() === "all" ? -1 : parseInt(e.target.value);
                  if (days === -1) {
                    onApplyServiceDateRange("1990-01-01", daysBackEnd);
                  } else if (!isNaN(days) && days > 0) {
                    const end = new Date(daysBackEnd);
                    const start = new Date(end);
                    start.setDate(start.getDate() - days);
                    onApplyServiceDateRange(start.toISOString().split("T")[0], daysBackEnd);
                  }
                }
              }}
              className="h-6 text-[10px] px-1.5 w-[70px]"
              placeholder="Days / All"
              disabled={!daysBackEnd}
            />
            <span className="text-[10px] text-[#a19f9d]">days back</span>
            {daysBackEnd && daysBackValue && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const days = daysBackValue.toLowerCase() === "all" ? -1 : parseInt(daysBackValue);
                  let start = "";
                  if (days === -1) {
                    start = "1990-01-01";
                  } else if (!isNaN(days) && days > 0) {
                    const endD = new Date(daysBackEnd);
                    const startD = new Date(endD);
                    startD.setDate(startD.getDate() - days);
                    start = startD.toISOString().split("T")[0];
                  }
                  if (start) onApplyServiceDateRange(start, daysBackEnd);
                }}
                className="h-6 px-2 text-[10px] text-[#0078d4] hover:bg-[#deecf9]"
              >
                Apply to all new
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table header — unified column template across header, selected rows,
          submitted parent rows, and submitted-job sub-rows so vertical lines
          align. Status auto-sizes (no longer fixed 90px). Date Range column
          fits two date inputs side by side. */}
      <div
        className="grid grid-cols-[28px_minmax(160px,1.5fr)_auto_minmax(240px,1.5fr)_80px] gap-3 px-3 py-2 bg-[#faf9f8] text-xs font-medium text-[#605e5c] uppercase tracking-wider"
        role="row"
      >
        <div role="columnheader"></div>
        <div role="columnheader">Data Type</div>
        <div role="columnheader">Status</div>
        <div role="columnheader">Date Range</div>
        <div role="columnheader" className="text-right">Actions</div>
      </div>

      {/* Groups + item rows */}
      <div className="divide-y divide-[#edebe9]">
        {groups.map((group) => {
          // Items visible as rows: submitted OR selected
          const visibleItems = group.items.filter(
            (item) =>
              isItemSubmitted(group.key, item.key) ||
              (selectedItems[group.key]?.includes(item.key) ?? false)
          );
          // Items available to add: not selected and not submitted
          const addableItems = group.items.filter(
            (item) =>
              !isItemSubmitted(group.key, item.key) &&
              !(selectedItems[group.key]?.includes(item.key) ?? false)
          );

          return (
            <React.Fragment key={group.key}>
              {/* Category Group header */}
              <div className="px-3 py-1 bg-[#f8f7f6] border-b border-[#edebe9]">
                <span className="text-[10px] font-semibold text-[#8a8886] uppercase tracking-wider">
                  {group.name}
                </span>
              </div>

              {/* Selected / submitted item rows */}
              {visibleItems.map((item) => {
                const isSelected = selectedItems[group.key]?.includes(item.key) ?? false;
                const submitted = isItemSubmitted(group.key, item.key);
                const itemDateKey = `${group.key}:${item.key}`;
                const addRangesKey = `${serviceId}:${group.key}:${item.key}`;
                const dateRange = categoryDateRanges[itemDateKey] || { start: "", end: "" };
                const addRanges = additionalDateRanges[addRangesKey] || [];
                const itemData = submittedData?.[group.key]?.[item.key];
                const status = itemData?.collectionStatus;
                const existingJobId = itemData?.jobId || "—";
                const submittedDates = itemData?.startDate || itemData?.endDate
                  ? { start: formatDate(itemData.startDate), end: formatDate(itemData.endDate) }
                  : null;

                // Submitted item: locked row with job sub-table
                if (submitted) {
                  const totalJobs = 1 + addRanges.length;
                  return (
                    <React.Fragment key={`${group.key}:${item.key}`}>
                      <div className="border-l-3 border-l-[#107c10] bg-[#f8fcf8]">
                        <div className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button disabled className="cursor-not-allowed flex-shrink-0">
                              <div className="w-4 h-4 rounded border bg-[#107c10] border-[#107c10] flex items-center justify-center">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            </button>
                            <span className="text-xs font-medium text-[#323130] flex items-center gap-1">
                              {item.name}
                              {item.info && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="w-3 h-3 shrink-0 text-[#a19f9d] hover:text-[#605e5c] cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[240px] text-xs">
                                      {item.info}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-[#dff6dd] text-[#107c10] border-[#107c10]">
                              {totalJobs} job{totalJobs !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          {isEditingCollectionScope && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onAddDateRange(group.key, item.key)}
                              className="h-6 px-1.5 text-[10px] text-[#0078d4] hover:bg-[#deecf9]"
                            >
                              <Plus className="w-3 h-3 mr-0.5" />
                              Add
                            </Button>
                          )}
                        </div>

                        {/* Submitted-job sub-table — uses the same column
                            template as the parent table, so the four data
                            columns (Job/Status/Dates/Actions) align with the
                            outer header. The 28px checkbox column stays empty
                            because submitted rows aren't togglable here. */}
                        <div className="grid grid-cols-[28px_minmax(160px,1.5fr)_auto_minmax(240px,1.5fr)_80px] gap-3 px-3 py-1 bg-[#f0eeec] text-[10px] font-medium text-[#605e5c] uppercase tracking-wider">
                          <div></div>
                          <div>Collection Job ID</div>
                          <div>Collection Status</div>
                          <div>Date Range</div>
                          <div className="text-right">Actions</div>
                        </div>

                        <div className="grid grid-cols-[28px_minmax(160px,1.5fr)_auto_minmax(240px,1.5fr)_80px] gap-3 px-3 py-2 items-center">
                          <div></div>
                          <span className="text-xs font-mono text-[#323130] truncate">{existingJobId}</span>
                          <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 whitespace-nowrap", statusColor(status))}>
                            {status || "Not Started"}
                          </Badge>
                          <span className="text-xs text-[#605e5c]">
                            {submittedDates ? `${submittedDates.start} – ${submittedDates.end}` : "No date range"}
                          </span>
                          <div></div>
                        </div>

                        {addRanges.map((range, idx) => (
                          <div
                            key={`${group.key}:${item.key}-add-${idx}`}
                            className="grid grid-cols-[28px_minmax(160px,1.5fr)_auto_minmax(240px,1.5fr)_80px] gap-3 px-3 py-2 items-center bg-[#fffdf5]"
                          >
                            <div></div>
                            <span className="text-xs font-mono text-[#8a6d3b]">New Job #{idx + 1}</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 whitespace-nowrap bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825]">
                              New Job
                            </Badge>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Input type="date" value={range.start}
                                aria-label={`New job ${idx + 1} start date for ${item.name}`}
                                onChange={(e) => onUpdateAdditionalDateRange(group.key, item.key, idx, "start", e.target.value)}
                                className="h-7 text-xs px-1.5 flex-1 min-w-[120px]" />
                              <span className="text-xs text-[#a19f9d]">–</span>
                              <Input type="date" value={range.end}
                                aria-label={`New job ${idx + 1} end date for ${item.name}`}
                                onChange={(e) => onUpdateAdditionalDateRange(group.key, item.key, idx, "end", e.target.value)}
                                className="h-7 text-xs px-1.5 flex-1 min-w-[120px]" />
                            </div>
                            <div className="text-right">
                              <Button variant="ghost" size="sm"
                                onClick={() => onRemoveDateRange(group.key, item.key, idx)}
                                className="h-7 px-2 text-xs text-[#a4262c] hover:bg-[#fde7e9]"
                                aria-label={`Remove new job ${idx + 1} from ${item.name}`}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </React.Fragment>
                  );
                }

                // Selected non-submitted item: editable row with × deselect
                return (
                  <React.Fragment key={`${group.key}:${item.key}`}>
                    <div className="grid grid-cols-[28px_minmax(160px,1.5fr)_auto_minmax(240px,1.5fr)_80px] gap-3 px-3 py-2 items-center border-l-3 border-l-[#0078d4] bg-[#f5f9fd]">
                      <button
                        onClick={() => onToggleItem(group.key, item.key)}
                        className="flex-shrink-0"
                        role="checkbox"
                        aria-checked="true"
                        aria-label={`Deselect ${item.name}`}
                      >
                        <div className="w-4 h-4 rounded border bg-[#0078d4] border-[#0078d4] flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      </button>

                      <span className="text-xs font-medium text-[#323130] truncate flex items-center gap-1">
                        {item.name}
                        {item.info && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 shrink-0 text-[#a19f9d] hover:text-[#605e5c] cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[240px] text-xs">
                                {item.info}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {(() => {
                          const prov = getProvenance?.(group.key, item.key);
                          return prov ? <ProvenanceTag provenance={prov} /> : null;
                        })()}
                        {(() => {
                          const prov = getProvenance?.(group.key, item.key);
                          if (prov === "le-modified" && onResetItemToLE) {
                            return (
                              <button
                                onClick={() => onResetItemToLE(group.key, item.key)}
                                className="text-[10px] text-[#0078d4] hover:underline ml-1"
                                title="Revert dates to the LE-requested baseline"
                              >
                                Reset to LE
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </span>

                      <div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 whitespace-nowrap bg-[#deecf9] text-[#0078d4] border-[#0078d4]">
                          New
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 min-w-0">
                        {(() => {
                          // Default values: per-category override → identifier-level
                          // bulk range → empty. Editing the input writes back to
                          // categoryDateRanges, creating a per-row override.
                          const startVal = dateRange.start || bulkDateRange?.start || "";
                          const endVal = dateRange.end || bulkDateRange?.end || "";
                          const bd = getBaselineDate?.(group.key, item.key);
                          const baselineLabel =
                            bd && bd.start && bd.end
                              ? `LE requested: ${formatDateToMMM(bd.start)} – ${formatDateToMMM(bd.end)}`
                              : null;

                          // 2C (UX-Polish): collapse to a "Same as service"
                          // link when this row has no per-category override
                          // (so it's purely inheriting from the bulk range)
                          // AND the user hasn't clicked to expand it.
                          const usesServiceDefault =
                            !dateRange.start &&
                            !dateRange.end &&
                            !!bulkDateRange?.start &&
                            !!bulkDateRange?.end;
                          const isExpanded = expandedDateRows.has(itemDateKey);
                          if (usesServiceDefault && !isExpanded) {
                            const summary = `${formatDateToMMM(bulkDateRange!.start)} – ${formatDateToMMM(bulkDateRange!.end)}`;
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => expandDateRow(itemDateKey)}
                                      className="text-xs text-[#0078d4] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1 rounded px-0.5"
                                      aria-label={`Same as service: ${summary}. Click to override for ${item.name}.`}
                                    >
                                      Same as service
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {summary}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }

                          return (
                            <>
                              <Input type="date" value={startVal}
                                aria-label={`Start date for ${item.name}`}
                                onChange={(e) => onDateChange(group.key, item.key, "start", e.target.value)}
                                className="h-7 text-xs px-1.5 flex-1 min-w-[120px]" />
                              <span className="text-xs text-[#a19f9d]">–</span>
                              <Input type="date" value={endVal}
                                aria-label={`End date for ${item.name}`}
                                onChange={(e) => onDateChange(group.key, item.key, "end", e.target.value)}
                                className="h-7 text-xs px-1.5 flex-1 min-w-[120px]" />
                              {baselineLabel && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="flex-shrink-0 p-0.5 rounded hover:bg-[#deecf9] focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
                                        aria-label={baselineLabel}
                                      >
                                        <Info className="w-3.5 h-3.5 text-[#0078d4]" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {baselineLabel}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      <div className="flex justify-end">
                        {item.locked ? (
                          <span className="flex items-center gap-1 text-[10px] text-[#8a8886]" title="Required baseline category">
                            <Lock className="w-3 h-3" />
                            Required
                          </span>
                        ) : (
                          <button
                            onClick={() => onToggleItem(group.key, item.key)}
                            className="p-1 rounded hover:bg-[#fde7e9] transition-colors"
                            aria-label={`Remove ${item.name}`}
                          >
                            <X className="w-3.5 h-3.5 text-[#a19f9d] hover:text-[#d13438]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}

              {/* Add category popover */}
              {(() => {
                const isCheckboxList = group.layout === "checkboxList";
                // checkboxList: always render the button so users can uncheck later;
                // dropdown: only when there are addable items
                if (!isCheckboxList && addableItems.length === 0) return null;
                const popoverItems = isCheckboxList ? group.items : addableItems;
                const selectedKeys = selectedItems[group.key] ?? [];
                const submittedKeys = isCheckboxList
                  ? group.items
                      .filter((i) => isItemSubmitted(group.key, i.key))
                      .map((i) => i.key)
                  : [];
                return (
                  <div className="px-3 py-1.5">
                    <GroupAddDropdown
                      groupName={group.name}
                      items={popoverItems}
                      onAdd={(itemKey) => onToggleItem(group.key, itemKey)}
                      layout={isCheckboxList ? "checkboxList" : "dropdown"}
                      selectedKeys={selectedKeys}
                      submittedKeys={submittedKeys}
                    />
                  </div>
                );
              })()}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
