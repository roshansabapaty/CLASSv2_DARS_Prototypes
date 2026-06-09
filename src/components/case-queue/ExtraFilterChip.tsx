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
  JurisdictionValue,
  RequestTypeValue,
  RequestSubTypeValue,
  ServicesValue,
  SlaTierValue,
  BadgesValue,
  EscalationStatusValue,
  SpecificAttorneyValue,
  TenantValue,
  UnreadInboundValue,
  AgencyValue,
  RequestOriginValue,
  IdentifierTypeValue,
  DueDateRangeValue,
  AgencyNameValue,
  ValidatingAuthorityValue,
  CompetentAuthorityValue,
  StaleEscalationValue,
  RecommendRejectionValue,
} from "./extraFilterCatalog";
import { ESCALATION_DIRECTORY } from "../../constants/caseConstants";
import type { AttorneyEscalationStatus } from "../../types/caseTypes";
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
  jurisdictionOptions: string[];
  requestTypeOptions: string[];
  requestSubTypeOptions?: string[];
  servicesOptions?: string[];
  // Persona-specific filter options.
  tenantOptions?: string[];
  agencyOptions?: string[];
  requestOriginOptions?: string[];
  identifierTypeOptions?: string[];
  agencyNameOptions?: string[];
  validatingAuthorityOptions?: string[];
  competentAuthorityOptions?: string[];
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
  jurisdictionOptions,
  requestTypeOptions,
  requestSubTypeOptions = [],
  servicesOptions = [],
  tenantOptions = [],
  agencyOptions = [],
  requestOriginOptions = [],
  identifierTypeOptions = [],
  agencyNameOptions = [],
  validatingAuthorityOptions = [],
  competentAuthorityOptions = [],
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
          jurisdictionOptions={jurisdictionOptions}
          requestTypeOptions={requestTypeOptions}
          requestSubTypeOptions={requestSubTypeOptions}
          servicesOptions={servicesOptions}
          tenantOptions={tenantOptions}
          agencyOptions={agencyOptions}
          requestOriginOptions={requestOriginOptions}
          identifierTypeOptions={identifierTypeOptions}
          agencyNameOptions={agencyNameOptions}
          validatingAuthorityOptions={validatingAuthorityOptions}
          competentAuthorityOptions={competentAuthorityOptions}
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
  jurisdictionOptions: string[];
  requestTypeOptions: string[];
  requestSubTypeOptions?: string[];
  servicesOptions?: string[];
  tenantOptions?: string[];
  agencyOptions?: string[];
  requestOriginOptions?: string[];
  identifierTypeOptions?: string[];
  agencyNameOptions?: string[];
  validatingAuthorityOptions?: string[];
  competentAuthorityOptions?: string[];
}

export function FilterValueControl({
  def,
  value,
  onChange,
  assigneeOptions,
  crimeOptions,
  caseStatusOptions,
  countryOptions,
  jurisdictionOptions,
  requestTypeOptions,
  requestSubTypeOptions = [],
  servicesOptions = [],
  tenantOptions = [],
  agencyOptions = [],
  requestOriginOptions = [],
  identifierTypeOptions = [],
  agencyNameOptions = [],
  validatingAuthorityOptions = [],
  competentAuthorityOptions = [],
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
    case "dueDateRange":
      // Reuses DateRangeControl with the axis dropdown suppressed — the
      // filter is by definition due-date-only.
      return (
        <DateRangeControl
          value={
            {
              field: "due",
              ...(value as DueDateRangeValue),
            } as DateRangeValue
          }
          onChange={(next) => {
            const v = next as DateRangeValue;
            onChange({ start: v.start, end: v.end } satisfies DueDateRangeValue);
          }}
          forceField="due"
        />
      );
    case "identifierType":
      return (
        <MultiCheckControl
          label="Identifier Types"
          value={value as IdentifierTypeValue}
          onChange={onChange}
          options={identifierTypeOptions.map((k) => ({ key: k, label: k }))}
        />
      );
    case "agencyName":
      return (
        <MultiCheckControl
          label="Agency Name"
          value={value as AgencyNameValue}
          onChange={onChange}
          options={agencyNameOptions.map((k) => ({ key: k, label: k }))}
        />
      );
    case "validatingAuthority":
      return (
        <MultiCheckControl
          label="Validating Authority"
          value={value as ValidatingAuthorityValue}
          onChange={onChange}
          options={validatingAuthorityOptions.map((k) => ({
            key: k,
            label: k,
          }))}
        />
      );
    case "competentAuthority":
      return (
        <MultiCheckControl
          label="Competent Authority"
          value={value as CompetentAuthorityValue}
          onChange={onChange}
          options={competentAuthorityOptions.map((k) => ({
            key: k,
            label: k,
          }))}
        />
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
    case "jurisdiction":
      return (
        <MultiCheckControl
          label="Jurisdiction"
          value={value as JurisdictionValue}
          onChange={onChange}
          options={jurisdictionOptions.map((j) => ({ key: j, label: j }))}
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
            { key: "Expedite", label: "P2 — Expedite (3 days)" },
            { key: "Standard", label: "P3 — Standard (5 days)" },
            { key: "Routine", label: "P4 — Routine (10 days)" },
          ]}
        />
      );
    // ── Phase 2 persona-specific filter controls ──────────────────────
    case "escalationStatus":
      return (
        <MultiCheckControl<AttorneyEscalationStatus>
          label="Escalation status"
          value={value as EscalationStatusValue}
          onChange={onChange}
          options={[
            { key: "Pending", label: "Pending" },
            { key: "InformationRequested", label: "Info requested" },
            { key: "RedirectRequested", label: "Redirect requested" },
            { key: "Reviewed", label: "Reviewed (pickup)" },
            { key: "ApprovedForDelivery", label: "Approved for delivery" },
            { key: "ApprovedWithConditions", label: "Approved w/ conditions" },
            { key: "Blocked", label: "Blocked" },
          ]}
        />
      );
    case "specificAttorney":
      return (
        <SpecificAttorneyControl
          value={value as SpecificAttorneyValue}
          onChange={onChange}
        />
      );
    case "tenant":
      return (
        <MultiCheckControl
          label="Tenant"
          value={value as TenantValue}
          onChange={onChange}
          options={tenantOptions.map((t) => ({ key: t, label: t }))}
        />
      );
    case "unreadInbound":
      return (
        <TristateControl
          label="Unread inbound (IA / EA)"
          value={value as UnreadInboundValue}
          onChange={onChange}
          yesLabel="Has unread inbound"
          noLabel="No unread inbound"
        />
      );
    case "agency":
      return (
        <MultiCheckControl
          label="Issuing Authority"
          value={value as AgencyValue}
          onChange={onChange}
          options={agencyOptions.map((a) => ({ key: a, label: a }))}
        />
      );
    case "requestOrigin":
      return (
        <MultiCheckControl
          label="Request Origin"
          value={value as RequestOriginValue}
          onChange={onChange}
          options={requestOriginOptions.map((o) => ({ key: o, label: o }))}
        />
      );
    case "staleEscalation":
      return (
        <StaleEscalationControl
          value={value as StaleEscalationValue}
          onChange={onChange}
        />
      );
    case "recommendRejection":
      return (
        <TristateControl
          label="Recommend Rejection"
          value={value as RecommendRejectionValue}
          onChange={onChange}
          yesLabel="Recommended for rejection"
          noLabel="Not recommended"
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
  forceField,
}: {
  value: DateRangeValue;
  onChange: (next: unknown) => void;
  /** When set, the axis dropdown is suppressed and the value's `field`
   *  is pinned to `forceField`. Used by the dedicated "Due Date Range"
   *  filter so the user doesn't see a meaningless picker. */
  forceField?: DateRangeValue["field"];
}) {
  // If a field is forced, normalise the value's `field` to it so any
  // stale value doesn't drift outside the locked axis.
  const effectiveValue = forceField
    ? { ...value, field: forceField }
    : value;
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[#323130]">
        {forceField === "due"
          ? "Due Date Range"
          : forceField === "created"
            ? "Created Date Range"
            : "Date Range"}
      </div>
      {!forceField && (
        <select
          value={effectiveValue.field}
          onChange={(e) =>
            onChange({
              ...effectiveValue,
              field: e.target.value as DateRangeValue["field"],
            })
          }
          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
          aria-label="Date field to filter by"
        >
          <option value="created">Created date</option>
          <option value="due">Due date</option>
        </select>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-[#605e5c] block mb-0.5">
            From
          </label>
          <Input
            type="date"
            value={effectiveValue.start}
            onChange={(e) =>
              onChange({ ...effectiveValue, start: e.target.value })
            }
            className="h-8 text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-[#605e5c] block mb-0.5">
            To
          </label>
          <Input
            type="date"
            value={effectiveValue.end}
            onChange={(e) =>
              onChange({ ...effectiveValue, end: e.target.value })
            }
            className="h-8 text-xs"
          />
        </div>
      </div>
      {(effectiveValue.start || effectiveValue.end) && (
        <button
          type="button"
          onClick={() => onChange({ ...effectiveValue, start: "", end: "" })}
          className="text-[10px] text-[#0078d4] hover:underline"
        >
          Clear range
        </button>
      )}
    </div>
  );
}

// ── Specific Attorney (Attorney Dashboard) ─────────────────────────────
// Single-select dropdown over the Attorney role of ESCALATION_DIRECTORY,
// plus "Anyone" + "Unassigned attorney" sentinels matching the existing
// Assignee control's pattern.
function SpecificAttorneyControl({
  value,
  onChange,
}: {
  value: SpecificAttorneyValue;
  onChange: (next: unknown) => void;
}) {
  const attorneys = ESCALATION_DIRECTORY.filter((d) => d.role === "Attorney");
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[#323130]">
        Assigned attorney
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SpecificAttorneyValue)}
        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#0078d4]"
        aria-label="Specific attorney filter value"
      >
        <option value="any">Anyone</option>
        <option value="unassigned">Unassigned (Any Attorney)</option>
        {attorneys.length > 0 && (
          <optgroup label="Attorneys">
            {attorneys.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

// ── Tri-state toggle (Unread Inbound, Recommend Rejection) ─────────────
// Three explicit values — "any" / "yes" / "no" — so the user can both
// narrow to + negate the predicate. Avoids the ambiguity of a single
// checkbox where "unchecked" could mean "off" or "no preference."
function TristateControl<T extends "any" | "yes" | "no">({
  label,
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  label: string;
  value: T;
  onChange: (next: unknown) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[#323130]">{label}</div>
      <div
        role="radiogroup"
        aria-label={`${label} filter value`}
        className="inline-flex flex-col gap-1 w-full"
      >
        {(
          [
            { key: "any", label: "Any" },
            { key: "yes", label: yesLabel },
            { key: "no", label: noLabel },
          ] as const
        ).map((opt) => (
          <label
            key={opt.key}
            className={cn(
              "flex items-center gap-2 text-xs text-[#323130] py-1 px-1.5 rounded cursor-pointer",
              value === opt.key ? "bg-[#deecf9]/40" : "hover:bg-[#f3f2f1]",
            )}
          >
            <input
              type="radio"
              checked={value === opt.key}
              onChange={() => onChange(opt.key)}
              className="accent-[#0078d4]"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ── Stale Escalation (LENS Lead) ───────────────────────────────────────
// Number input + quick-pick chips. Threshold of 0 (default) is a no-op
// narrowing — the chip mounts inactive until the lead picks a value.
function StaleEscalationControl({
  value,
  onChange,
}: {
  value: StaleEscalationValue;
  onChange: (next: unknown) => void;
}) {
  const QUICK_PICKS = [3, 5, 7, 14];
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-[#323130]">
        Stale escalation
      </div>
      <p className="text-[11px] text-[#605e5c] leading-tight">
        Cases with an active escalation whose most-recent attorney action (or
        initial escalation timestamp when no actions yet) is older than this
        threshold. Terminal escalations are excluded.
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={1}
          value={value.days ?? 0}
          onChange={(e) =>
            onChange({ days: Math.max(0, Number(e.target.value) || 0) })
          }
          className="h-8 text-xs w-20"
          aria-label="Stale escalation threshold (days)"
        />
        <span className="text-xs text-[#605e5c]">days</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {QUICK_PICKS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange({ days: d })}
            className={cn(
              "px-2 py-0.5 text-[11px] rounded border transition-colors",
              value.days === d
                ? "bg-[#0078d4] text-white border-[#0078d4]"
                : "bg-white text-[#605e5c] border-[#e1dfdd] hover:bg-[#f3f2f1]",
            )}
          >
            {d}d
          </button>
        ))}
        {value.days > 0 && (
          <button
            type="button"
            onClick={() => onChange({ days: 0 })}
            className="text-[10px] text-[#0078d4] hover:underline px-1"
          >
            Clear
          </button>
        )}
      </div>
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
