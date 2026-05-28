/**
 * ExtraFilterChip — single chip in the active-filters row. Click the
 * chip body to open a Popover with the value control for that filter
 * kind; click the ✕ to remove the filter entirely.
 *
 * The control mounted inside the popover is keyed by `def.id` — each
 * filter kind has its own small control component below. Adding a
 * new filter kind to the catalog means adding a new case to
 * `FilterValueControl`.
 */

import * as React from "react";
import { X, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { cn } from "../ui/utils";
import type {
  FilterDef,
  AssigneeValue,
  CrimeValue,
  AccountTypeValue,
  DateRangeValue,
  WorkflowStageValue,
  CaseStatusValue,
  CountryValue,
  RequestTypeValue,
  RequestSubTypeValue,
  ServicesValue,
  SlaTierValue,
  BadgesValue,
} from "./extraFilterCatalog";
import {
  OPERATIONAL_BADGES,
  type BadgeMatchMode,
  type OperationalBadgeId,
} from "./operationalBadgeFilters";
import { Badge } from "../ui/badge";

export interface ExtraFilterChipProps {
  def: FilterDef;
  value: unknown;
  onChange: (next: unknown) => void;
  onRemove: () => void;
  /** Runtime catalog data the controls need (distinct assignees, distinct
   *  crimes, distinct case statuses / countries / request types). Passed
   *  in so the chip stays presentation-only. */
  assigneeOptions: string[];
  crimeOptions: string[];
  caseStatusOptions: string[];
  countryOptions: string[];
  requestTypeOptions: string[];
  requestSubTypeOptions?: string[];
  servicesOptions?: string[];
  /** When true, the popover opens by default (used when a chip was just
   *  added via the menu so the user lands on the value control). */
  defaultOpen?: boolean;
}

export function ExtraFilterChip({
  def,
  value,
  onChange,
  onRemove,
  assigneeOptions,
  crimeOptions,
  caseStatusOptions,
  countryOptions,
  requestTypeOptions,
  requestSubTypeOptions = [],
  servicesOptions = [],
  defaultOpen = false,
}: ExtraFilterChipProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const isActive = def.isActive(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "inline-flex items-center rounded-md border text-xs h-7",
          isActive
            ? "border-[#0078d4] bg-[#deecf9]/40 text-[#323130]"
            : "border-[#e1dfdd] bg-white text-[#605e5c]",
        )}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 hover:bg-[#f3f2f1]/60 rounded-l-md focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0078d4]",
            )}
            aria-label={`${def.label}: ${def.summary(value)}`}
          >
            <span
              className={cn(
                "font-semibold",
                isActive ? "text-[#0078d4]" : "text-[#605e5c]",
              )}
            >
              {def.label}:
            </span>
            <span className="truncate max-w-[180px]">{def.summary(value)}</span>
            <ChevronDown className="w-3 h-3 opacity-60" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <button
          type="button"
          onClick={onRemove}
          className="px-1.5 py-1 text-[#605e5c] hover:text-[#a4262c] hover:bg-[#fde7e9]/60 rounded-r-md border-l border-[#e1dfdd] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#a4262c]"
          aria-label={`Remove ${def.label} filter`}
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
      <PopoverContent className="w-72 p-3 z-50" align="start">
        <FilterValueControl
          def={def}
          value={value}
          onChange={onChange}
          assigneeOptions={assigneeOptions}
          crimeOptions={crimeOptions}
          caseStatusOptions={caseStatusOptions}
          countryOptions={countryOptions}
          requestTypeOptions={requestTypeOptions}
          requestSubTypeOptions={requestSubTypeOptions}
          servicesOptions={servicesOptions}
        />
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Value controls — one branch per filter kind
// ---------------------------------------------------------------------------

interface FilterValueControlProps {
  def: FilterDef;
  value: unknown;
  onChange: (next: unknown) => void;
  assigneeOptions: string[];
  crimeOptions: string[];
  caseStatusOptions: string[];
  countryOptions: string[];
  requestTypeOptions: string[];
  requestSubTypeOptions?: string[];
  servicesOptions?: string[];
}

export function FilterValueControl({
  def,
  value,
  onChange,
  assigneeOptions,
  crimeOptions,
  caseStatusOptions,
  countryOptions,
  requestTypeOptions,
  requestSubTypeOptions = [],
  servicesOptions = [],
}: FilterValueControlProps) {
  switch (def.id) {
    case "assignee":
      return (
        <AssigneeControl
          value={value as AssigneeValue}
          onChange={onChange}
          options={assigneeOptions}
        />
      );
    case "crime":
      return (
        <MultiCheckControl
          label="Crime / Nature of Crime"
          value={value as CrimeValue}
          onChange={onChange}
          options={crimeOptions.map((c) => ({ key: c, label: c }))}
        />
      );
    case "accountType":
      return (
        <MultiCheckControl
          label="Account Type"
          value={value as AccountTypeValue}
          onChange={onChange}
          options={[
            { key: "Consumer", label: "Consumer" },
            { key: "Enterprise", label: "Enterprise" },
            { key: "Unchecked", label: "Not yet checked" },
          ]}
        />
      );
    case "dateRange":
      return (
        <DateRangeControl value={value as DateRangeValue} onChange={onChange} />
      );
    case "workflowStage":
      return (
        <MultiCheckControl
          label="Workflow Stage"
          value={value as WorkflowStageValue}
          onChange={onChange}
          options={[
            { key: "triage", label: "Triage" },
            { key: "fulfillment", label: "Review Case" },
            { key: "collection", label: "Collection" },
          ]}
        />
      );
    case "caseStatus":
      return (
        <MultiCheckControl
          label="Case Status"
          value={value as CaseStatusValue}
          onChange={onChange}
          options={caseStatusOptions.map((s) => ({ key: s, label: s }))}
        />
      );
    case "country":
      return (
        <MultiCheckControl
          label="Country"
          value={value as CountryValue}
          onChange={onChange}
          options={countryOptions.map((c) => ({ key: c, label: c }))}
        />
      );
    case "requestType":
      return (
        <MultiCheckControl
          label="Request Type"
          value={value as RequestTypeValue}
          onChange={onChange}
          options={requestTypeOptions.map((r) => ({ key: r, label: r }))}
        />
      );
    case "requestSubType":
      return (
        <MultiCheckControl
          label="Request Sub-Type"
          value={value as RequestSubTypeValue}
          onChange={onChange}
          options={requestSubTypeOptions.map((s) => ({ key: s, label: s }))}
        />
      );
    case "services":
      return (
        <MultiCheckControl
          label="Services"
          value={value as ServicesValue}
          onChange={onChange}
          options={servicesOptions.map((s) => ({ key: s, label: s }))}
        />
      );
    case "slaTier":
      return (
        <MultiCheckControl
          label="SLA Deadline"
          value={value as SlaTierValue}
          onChange={onChange}
          options={[
            { key: "Emergency", label: "P0 — Emergency (no legal demand)" },
            { key: "Urgent", label: "P1 — Urgent (legal demand attached)" },
            { key: "Expedite", label: "P2 — Expedite (5 days)" },
            { key: "Routine", label: "P3 — Routine (10 days)" },
          ]}
        />
      );
    case "badges":
      return (
        <BadgesControl value={value as BadgesValue} onChange={onChange} />
      );
    default:
      return (
        <div className="text-xs text-[#605e5c] italic">
          No control configured for {def.id}.
        </div>
      );
  }
}

// ── Assignee ────────────────────────────────────────────────────────────
function AssigneeControl({
  value,
  onChange,
  options,
}: {
  value: AssigneeValue;
  onChange: (next: unknown) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[#323130]">Assignee</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AssigneeValue)}
        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
        aria-label="Assignee filter value"
      >
        <option value="any">Anyone</option>
        <option value="unassigned">Unassigned</option>
        {options.length > 0 && (
          <optgroup label="People">
            {options.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

// ── Multi-check (Crime, Account Type, Workflow Stage) ──────────────────
function MultiCheckControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T[];
  onChange: (next: unknown) => void;
  options: Array<{ key: T; label: string }>;
}) {
  const toggle = (key: T) => {
    const next = value.includes(key)
      ? value.filter((k) => k !== key)
      : [...value, key];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-[#323130]">{label}</div>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] text-[#0078d4] hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
        {options.map((opt) => (
          <label
            key={opt.key}
            className="flex items-center gap-2 text-xs text-[#323130] py-1 px-1.5 rounded hover:bg-[#f3f2f1] cursor-pointer"
          >
            <Checkbox
              checked={value.includes(opt.key)}
              onCheckedChange={() => toggle(opt.key)}
              aria-label={opt.label}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Date Range ─────────────────────────────────────────────────────────
function DateRangeControl({
  value,
  onChange,
}: {
  value: DateRangeValue;
  onChange: (next: unknown) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[#323130]">Date Range</div>
      <select
        value={value.field}
        onChange={(e) =>
          onChange({ ...value, field: e.target.value as DateRangeValue["field"] })
        }
        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
        aria-label="Date field to filter by"
      >
        <option value="created">Created date</option>
        <option value="due">Due date</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-[#605e5c] block mb-0.5">
            From
          </label>
          <Input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-[#605e5c] block mb-0.5">
            To
          </label>
          <Input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      </div>
      {(value.start || value.end) && (
        <button
          type="button"
          onClick={() => onChange({ ...value, start: "", end: "" })}
          className="text-[10px] text-[#0078d4] hover:underline"
        >
          Clear range
        </button>
      )}
    </div>
  );
}

// ── Operational Badges ─────────────────────────────────────────────────
// Mirrors the body of the former standalone BadgeFilterPopover so the
// chip control looks and feels the same when the user opens it.
function BadgesControl({
  value,
  onChange,
}: {
  value: BadgesValue;
  onChange: (next: unknown) => void;
}) {
  const toggleBadge = (id: OperationalBadgeId) => {
    const next = value.selected.includes(id)
      ? value.selected.filter((k) => k !== id)
      : [...value.selected, id];
    onChange({ ...value, selected: next });
  };
  const setMode = (mode: BadgeMatchMode) => onChange({ ...value, mode });
  const clear = () => onChange({ ...value, selected: [] });
  const count = value.selected.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-[#323130]">
          Operational badges
        </div>
        {count > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-[10px] text-[#0078d4] hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {OPERATIONAL_BADGES.map((badge) => {
          const Icon = badge.icon;
          const checked = value.selected.includes(badge.id);
          return (
            <label
              key={badge.id}
              className={cn(
                "flex items-start gap-2 px-1.5 py-1.5 rounded cursor-pointer hover:bg-[#f3f2f1]",
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

      {count > 1 && (
        <div className="border-t border-[#edebe9] pt-2">
          <div className="text-[10px] uppercase tracking-wide text-[#605e5c] mb-1 font-semibold">
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
                "px-2.5 py-1 text-[11px] rounded transition-colors",
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
                "px-2.5 py-1 text-[11px] rounded transition-colors",
                value.mode === "all"
                  ? "bg-[#0078d4] text-white"
                  : "text-[#605e5c] hover:text-[#323130]",
              )}
            >
              All (AND)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
