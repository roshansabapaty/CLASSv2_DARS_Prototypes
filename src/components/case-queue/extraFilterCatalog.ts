/**
 * Extra Filter Catalog — config-driven registry of "additional" filter
 * properties that aren't surfaced as default toolbar controls. Users
 * mount these via the **+ Add filter** menu; each picked filter
 * renders as a removable chip (compact mode) or as a row in the
 * **Advanced filters** side panel (power-user mode). Saved Views
 * capture the active set + each filter's value so the slice
 * round-trips between sessions.
 *
 * Adding a new filterable field is a single entry in `FILTER_CATALOG`
 * — the menu, chips, panel, and saved-view bag are all data-driven
 * from this list.
 *
 * Pilot v1 ships 5 fields:
 *   • Assignee (People)
 *   • Crime / Nature of Crime (Case meta)
 *   • Account Type (Case meta)
 *   • Date Range — Created / Due (Dates)
 *   • Workflow Stage (Workflow)
 */

import type { CaseQueueItem } from "./case-queue-types";
import { getWorkflowStageFromCaseStage } from "./case-queue-types";
import {
  OPERATIONAL_BADGES,
  caseMatchesBadgeFilter,
  type OperationalBadgeId,
  type BadgeMatchMode,
} from "./operationalBadgeFilters";

// ---------------------------------------------------------------------------
// Value shapes — one per filter kind. Stored as `unknown` in saved views;
// each control unpacks its own shape through the catalog's `predicate`.
// ---------------------------------------------------------------------------

export type AssigneeValue = string; // "any" | "unassigned" | <name>
export type CrimeValue = string[]; // selected crime keys; empty = no narrowing
export type AccountTypeValue = Array<"Consumer" | "Enterprise" | "Unchecked">;
export interface DateRangeValue {
  field: "created" | "due";
  start: string; // YYYY-MM-DD, empty = open-ended
  end: string; // YYYY-MM-DD, empty = open-ended
}
export type WorkflowStageValue = Array<"triage" | "fulfillment" | "collection">;
// Catalog absorbed the formerly-standalone toolbar dropdowns so the
// toolbar has one unified "+ Add filter" entry point. Each is a
// multi-select to match the chip pattern used by Crime / Account Type.
export type CaseStatusValue = string[]; // queue item caseStage values
export type CountryValue = string[];
export type JurisdictionValue = string[]; // e.g. "Federal", "State", "National"
export type RequestTypeValue = string[];
export type RequestSubTypeValue = string[];
export type ServicesValue = string[];
export type SlaTierValue = Array<
  "Emergency" | "Urgent" | "Expedite" | "Routine"
>;
// Operational-badge filter — formerly its own standalone popover in
// the toolbar. Now part of the catalog so it lives alongside every
// other "+ Add filter" entry.
export interface BadgesValue {
  selected: OperationalBadgeId[];
  mode: BadgeMatchMode;
}

export type ExtraFilterValue =
  | AssigneeValue
  | CrimeValue
  | AccountTypeValue
  | DateRangeValue
  | WorkflowStageValue
  | CaseStatusValue
  | CountryValue
  | JurisdictionValue
  | RequestTypeValue
  | RequestSubTypeValue
  | ServicesValue
  | SlaTierValue
  | BadgesValue;

// ---------------------------------------------------------------------------
// Catalog entry
// ---------------------------------------------------------------------------

export type FilterGroup =
  | "People"
  | "Case meta"
  | "Dates"
  | "Workflow"
  | "Signals"
  | "Tenant";

export interface FilterDef<V = unknown> {
  id: string;
  label: string;
  group: FilterGroup;
  /** Picked when a chip is first mounted. Should be a no-op narrowing
   *  (so adding the filter doesn't immediately hide rows). */
  defaultValue: V;
  /** True when the value actually narrows the case list. False when
   *  the value is empty / "any" — chip renders muted. */
  isActive: (value: V) => boolean;
  /** Returns true when the case passes the filter. */
  predicate: (c: CaseQueueItem, value: V) => boolean;
  /** Short label for the chip body and panel summary
   *  (e.g. "Nicole Garcia", "3 crimes", "Created Mar 1 – Today"). */
  summary: (value: V) => string;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

const ASSIGNEE_ANY: AssigneeValue = "any";
const ASSIGNEE_UNASSIGNED: AssigneeValue = "unassigned";

const ACCOUNT_TYPE_LABELS: Record<AccountTypeValue[number], string> = {
  Consumer: "Consumer",
  Enterprise: "Enterprise",
  Unchecked: "Unchecked",
};

const WORKFLOW_STAGE_LABELS: Record<WorkflowStageValue[number], string> = {
  triage: "Triage",
  fulfillment: "Review Case",
  collection: "Collection",
};

export const FILTER_CATALOG: ReadonlyArray<FilterDef> = [
  // ── Assignee ────────────────────────────────────────────────────────
  {
    id: "assignee",
    label: "Assignee",
    group: "People",
    defaultValue: ASSIGNEE_ANY as AssigneeValue,
    isActive: (value) => (value as AssigneeValue) !== ASSIGNEE_ANY,
    predicate: (c, value) => {
      const v = value as AssigneeValue;
      if (v === ASSIGNEE_ANY) return true;
      if (v === ASSIGNEE_UNASSIGNED) return !c.assigneeName;
      return c.assigneeName === v;
    },
    summary: (value) => {
      const v = value as AssigneeValue;
      if (v === ASSIGNEE_ANY) return "Anyone";
      if (v === ASSIGNEE_UNASSIGNED) return "Unassigned";
      return v;
    },
  } as FilterDef<AssigneeValue>,

  // ── Crime / Nature of Crime ─────────────────────────────────────────
  {
    id: "crime",
    label: "Crime / Nature",
    group: "Case meta",
    defaultValue: [] as CrimeValue,
    isActive: (value) => (value as CrimeValue).length > 0,
    predicate: (c, value) => {
      const selected = value as CrimeValue;
      if (selected.length === 0) return true;
      return c.natureOfCrime.some((crime) => selected.includes(crime));
    },
    summary: (value) => {
      const v = value as CrimeValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} selected`;
    },
  } as FilterDef<CrimeValue>,

  // ── Account Type ─────────────────────────────────────────────────────
  {
    id: "accountType",
    label: "Account Type",
    group: "Case meta",
    defaultValue: [] as AccountTypeValue,
    isActive: (value) => (value as AccountTypeValue).length > 0,
    predicate: (c, value) => {
      const selected = value as AccountTypeValue;
      if (selected.length === 0) return true;
      // Queue items carry boolean flags rather than per-identifier
      // account type. Map each selection onto the queue-level flag.
      for (const kind of selected) {
        if (kind === "Enterprise") {
          if (c.accountExistenceChecked && c.hasEnterpriseAccounts) return true;
        } else if (kind === "Consumer") {
          if (
            c.accountExistenceChecked &&
            !c.hasEnterpriseAccounts
          ) {
            return true;
          }
        } else if (kind === "Unchecked") {
          if (!c.accountExistenceChecked) return true;
        }
      }
      return false;
    },
    summary: (value) => {
      const v = value as AccountTypeValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return ACCOUNT_TYPE_LABELS[v[0]];
      return v.map((k) => ACCOUNT_TYPE_LABELS[k]).join(", ");
    },
  } as FilterDef<AccountTypeValue>,

  // ── Date Range ───────────────────────────────────────────────────────
  {
    id: "dateRange",
    label: "Date Range",
    group: "Dates",
    defaultValue: { field: "created", start: "", end: "" } as DateRangeValue,
    isActive: (value) => {
      const v = value as DateRangeValue;
      return !!v.start || !!v.end;
    },
    predicate: (c, value) => {
      const v = value as DateRangeValue;
      if (!v.start && !v.end) return true;
      const raw = v.field === "created" ? c.createDate : c.dueDate;
      const t = Date.parse(raw);
      if (!Number.isFinite(t)) return false;
      const startMs = v.start ? Date.parse(`${v.start}T00:00:00`) : -Infinity;
      const endMs = v.end ? Date.parse(`${v.end}T23:59:59`) : Infinity;
      return t >= startMs && t <= endMs;
    },
    summary: (value) => {
      const v = value as DateRangeValue;
      const fieldLabel = v.field === "created" ? "Created" : "Due";
      const fmt = (s: string) =>
        s ? new Date(`${s}T00:00:00`).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }) : "—";
      if (!v.start && !v.end) return `${fieldLabel}: Any`;
      return `${fieldLabel}: ${fmt(v.start)} – ${fmt(v.end)}`;
    },
  } as FilterDef<DateRangeValue>,

  // ── Workflow Stage ───────────────────────────────────────────────────
  {
    id: "workflowStage",
    label: "Workflow Stage",
    group: "Workflow",
    defaultValue: [] as WorkflowStageValue,
    isActive: (value) => (value as WorkflowStageValue).length > 0,
    predicate: (c, value) => {
      const selected = value as WorkflowStageValue;
      if (selected.length === 0) return true;
      const stage = getWorkflowStageFromCaseStage(c.caseStage);
      return selected.includes(stage);
    },
    summary: (value) => {
      const v = value as WorkflowStageValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return WORKFLOW_STAGE_LABELS[v[0]];
      return v.map((k) => WORKFLOW_STAGE_LABELS[k]).join(", ");
    },
  } as FilterDef<WorkflowStageValue>,

  // ── Case Status (moved out of the toolbar dropdown row) ─────────────
  {
    id: "caseStatus",
    label: "Case Status",
    group: "Case meta",
    defaultValue: [] as CaseStatusValue,
    isActive: (value) => (value as CaseStatusValue).length > 0,
    predicate: (c, value) => {
      const selected = value as CaseStatusValue;
      if (selected.length === 0) return true;
      return selected.includes(c.caseStage);
    },
    summary: (value) => {
      const v = value as CaseStatusValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} selected`;
    },
  } as FilterDef<CaseStatusValue>,

  // ── Country (moved out of the toolbar dropdown row) ─────────────────
  {
    id: "country",
    label: "Country",
    group: "Case meta",
    defaultValue: [] as CountryValue,
    isActive: (value) => (value as CountryValue).length > 0,
    predicate: (c, value) => {
      const selected = value as CountryValue;
      if (selected.length === 0) return true;
      return selected.includes(c.country);
    },
    summary: (value) => {
      const v = value as CountryValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} selected`;
    },
  } as FilterDef<CountryValue>,

  // ── Jurisdiction (paired with Country for two-tier geo filtering) ───
  // Sub-property of Country (Federal / State / National / Provincial /
  // Local). Useful for routing splits — e.g. surfacing only Federal
  // cases inside the US bucket, or only Länder/State-level demands.
  {
    id: "jurisdiction",
    label: "Jurisdiction",
    group: "Case meta",
    defaultValue: [] as JurisdictionValue,
    isActive: (value) => (value as JurisdictionValue).length > 0,
    predicate: (c, value) => {
      const selected = value as JurisdictionValue;
      if (selected.length === 0) return true;
      return selected.includes(c.jurisdiction);
    },
    summary: (value) => {
      const v = value as JurisdictionValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} selected`;
    },
  } as FilterDef<JurisdictionValue>,

  // ── Request Type (moved out of the toolbar dropdown row) ────────────
  {
    id: "requestType",
    label: "Request Type",
    group: "Case meta",
    defaultValue: [] as RequestTypeValue,
    isActive: (value) => (value as RequestTypeValue).length > 0,
    predicate: (c, value) => {
      const selected = value as RequestTypeValue;
      if (selected.length === 0) return true;
      return selected.includes(c.requestType);
    },
    summary: (value) => {
      const v = value as RequestTypeValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} selected`;
    },
  } as FilterDef<RequestTypeValue>,

  // ── Request Sub-Type (e.g. EPOC ER / EPOC PR / EPOC PR Extension) ───
  // Sub-type within the request type. Most useful for eEvidence cases
  // where the EPOC flavour determines downstream workflow (preservation
  // vs production, extension request, etc.). Cases without a meaningful
  // sub-type are treated as having no value and won't match any
  // selection.
  {
    id: "requestSubType",
    label: "Request Sub-Type",
    group: "Case meta",
    defaultValue: [] as RequestSubTypeValue,
    isActive: (value) => (value as RequestSubTypeValue).length > 0,
    predicate: (c, value) => {
      const selected = value as RequestSubTypeValue;
      if (selected.length === 0) return true;
      if (!c.requestSubType) return false;
      return selected.includes(c.requestSubType);
    },
    summary: (value) => {
      const v = value as RequestSubTypeValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} selected`;
    },
  } as FilterDef<RequestSubTypeValue>,

  // ── Services (LE-requested services on the case) ────────────────────
  // Multi-select against the case's `servicesRequested`. "Any of the
  // selected services" semantics — matches the pattern used by Crime.
  {
    id: "services",
    label: "Services",
    group: "Case meta",
    defaultValue: [] as ServicesValue,
    isActive: (value) => (value as ServicesValue).length > 0,
    predicate: (c, value) => {
      const selected = value as ServicesValue;
      if (selected.length === 0) return true;
      return c.servicesRequested.some((s) => selected.includes(s));
    },
    summary: (value) => {
      const v = value as ServicesValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} selected`;
    },
  } as FilterDef<ServicesValue>,

  // ── SLA Deadline tier (moved out of the toolbar dropdown row) ───────
  {
    id: "slaTier",
    label: "SLA Deadline",
    group: "Case meta",
    defaultValue: [] as SlaTierValue,
    isActive: (value) => (value as SlaTierValue).length > 0,
    predicate: (c, value) => {
      const selected = value as SlaTierValue;
      if (selected.length === 0) return true;
      // Legacy "Standard" cases collapse to Routine for filter parity
      // with the old standalone dropdown's behavior.
      const tier =
        (c.casePriority as string) === "Standard"
          ? "Routine"
          : (c.casePriority as SlaTierValue[number]);
      return selected.includes(tier);
    },
    summary: (value) => {
      const v = value as SlaTierValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return v.join(", ");
    },
  } as FilterDef<SlaTierValue>,

  // ── Operational badges (formerly its own standalone popover) ────────
  {
    id: "badges",
    label: "Operational badges",
    group: "Signals",
    defaultValue: { selected: [], mode: "any" } as BadgesValue,
    isActive: (value) => (value as BadgesValue).selected.length > 0,
    predicate: (c, value) => {
      const v = value as BadgesValue;
      // Reuse the existing badge-filter predicate by reconstructing the
      // BadgeFilterState shape it expects. Empty selection passes every
      // case, matching the standalone popover's behavior.
      return caseMatchesBadgeFilter(c, {
        selected: new Set(v.selected),
        mode: v.mode,
      });
    },
    summary: (value) => {
      const v = value as BadgesValue;
      if (v.selected.length === 0) return "Any";
      if (v.selected.length === 1) {
        const def = OPERATIONAL_BADGES.find((b) => b.id === v.selected[0]);
        return def?.label ?? v.selected[0];
      }
      const modeLabel = v.mode === "all" ? "all" : "any";
      return `${v.selected.length} badges (${modeLabel})`;
    },
  } as FilterDef<BadgesValue>,
];

export function getFilterDef(id: string): FilterDef | undefined {
  return FILTER_CATALOG.find((f) => f.id === id);
}

/** Active = the case must pass every filter that has a non-empty
 *  value. Inactive filters (chip mounted but value is "any") pass
 *  every case. */
export function caseMatchesExtraFilters(
  c: CaseQueueItem,
  active: Record<string, unknown>,
): boolean {
  for (const [id, value] of Object.entries(active)) {
    const def = getFilterDef(id);
    if (!def) continue;
    if (!def.isActive(value)) continue;
    if (!def.predicate(c, value)) return false;
  }
  return true;
}

/** Crime catalog computed from the queue at runtime — used by the
 *  Crime multi-select control so the options always match the data. */
export function distinctCrimes(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) for (const crime of c.natureOfCrime) set.add(crime);
  return Array.from(set).sort();
}

/** Assignee catalog — distinct non-empty assignees in the queue. */
export function distinctAssignees(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) if (c.assigneeName) set.add(c.assigneeName);
  return Array.from(set).sort();
}

/** Case Status catalog — distinct stage values present in the queue,
 *  ordered by lifecycle (active first, terminal last) to match the
 *  legacy standalone dropdown. */
const CASE_STATUS_ORDER = [
  "Waiting on Triage",
  "In Progress",
  "In Review",
  "Rejected",
  "Cancelled",
  "No Data Provided",
  "Resolved",
];
export function distinctCaseStatuses(cases: CaseQueueItem[]): string[] {
  const present = new Set<string>();
  for (const c of cases) if (c.caseStage) present.add(c.caseStage);
  const ordered = CASE_STATUS_ORDER.filter((s) => present.has(s));
  const trailing = Array.from(present)
    .filter((s) => !CASE_STATUS_ORDER.includes(s))
    .sort();
  return [...ordered, ...trailing];
}

/** Country catalog — distinct country values in the queue. */
export function distinctCountries(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) if (c.country) set.add(c.country);
  return Array.from(set).sort();
}

/** Jurisdiction catalog — distinct jurisdiction values in the queue
 *  (Federal / State / National / Provincial / Local etc.). Ordered
 *  alphabetically since there's no canonical hierarchy that holds
 *  across every country in the catalog. */
export function distinctJurisdictions(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) if (c.jurisdiction) set.add(c.jurisdiction);
  return Array.from(set).sort();
}

/** Request-type catalog — distinct request types in the queue. */
export function distinctRequestTypes(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) if (c.requestType) set.add(c.requestType);
  return Array.from(set).sort();
}

/** Request sub-type catalog — distinct sub-types in the queue. Skips
 *  cases without a meaningful sub-type so "None" doesn't pollute the
 *  picker. */
export function distinctRequestSubTypes(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) {
    if (c.requestSubType && c.requestSubType !== "None") {
      set.add(c.requestSubType);
    }
  }
  return Array.from(set).sort();
}

/** Services catalog — distinct LE-requested services in the queue. */
export function distinctServices(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) for (const s of c.servicesRequested) set.add(s);
  return Array.from(set).sort();
}
