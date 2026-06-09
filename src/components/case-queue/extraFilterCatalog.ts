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
import {
  getEscalationSummaryForCase,
  caseHasUnreadInboundFromAuthority,
} from "../../utils/escalationHelpers";
import { getCaseFormDataById } from "../../utils/caseDataRegistry";
import type { AttorneyEscalationStatus } from "../../types/caseTypes";

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
  "Emergency" | "Urgent" | "Expedite" | "Standard" | "Routine"
>;
// Operational-badge filter — formerly its own standalone popover in
// the toolbar. Now part of the catalog so it lives alongside every
// other "+ Add filter" entry.
export interface BadgesValue {
  selected: OperationalBadgeId[];
  mode: BadgeMatchMode;
}

// ── Persona-specific filters (Phase 2 — 8 additions) ────────────────────
// Each value type matches the storage shape that the catalog's
// `predicate` and `summary` callbacks read.

/** Attorney-dashboard pair — escalation sub-state (multi-select over
 *  the post-pull-model status enum) + specific assigned attorney
 *  (single-select; "any" = no narrowing). */
export type EscalationStatusValue = AttorneyEscalationStatus[];
export type SpecificAttorneyValue = string; // ATT-NNN id | "any"

/** RS pair — multi-select tenant display names + boolean toggle for
 *  unread inbound correspondence from IA / EA. The toggle stores
 *  "any" | "yes" | "no" so users can also negate. */
export type TenantValue = string[];
export type UnreadInboundValue = "any" | "yes" | "no";

/** TS pair — multi-select issuing-authority / agency name + multi-
 *  select intake channel. */
export type AgencyValue = string[];
export type RequestOriginValue = string[];

/** LENS-lead pair — stale-escalation threshold (number of days) and
 *  recommend-rejection toggle. */
export interface StaleEscalationValue {
  /** Threshold in days. 0 (or undefined) = no narrowing. */
  days: number;
}
export type RecommendRejectionValue = "any" | "yes" | "no";

/** Identifier-type multi-select. Values are the keys of
 *  `CaseQueueItem.identifierTypes` (e.g. "email", "phone",
 *  "ipAddress"). A case matches when ANY of its identifier-type keys
 *  is in the selected list. */
export type IdentifierTypeValue = string[];

/** Due Date Range — same shape as `DateRangeValue` but the axis is
 *  always `due`. Kept as a separate filter from `dateRange` because
 *  the latter defaults to `created`; users who want to scope by Due
 *  Date specifically shouldn't have to flip a sub-field every time. */
export interface DueDateRangeValue {
  start: string;
  end: string;
}

/** Three role-aware authority filters paired with the existing
 *  "Issuing Authority" filter (catalog id "agency"). All three are
 *  multi-select over canonical agency names — same any-of
 *  semantics as Crime / Services.
 *
 *  Why split them out instead of one combined "Any authority" filter:
 *  in the EU eEvidence / ETSI flow, Issuing / Validating / Competent
 *  are distinct procedural roles with different downstream
 *  obligations, and operations leads need to scope each independently
 *  (e.g., "show me every case where DE's BMJ is the Competent
 *  Authority" is a different question from "show me every case where
 *  they're the Issuing Authority"). */
export type AgencyNameValue = string[];
export type ValidatingAuthorityValue = string[];
export type CompetentAuthorityValue = string[];

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
  | BadgesValue
  | EscalationStatusValue
  | SpecificAttorneyValue
  | TenantValue
  | UnreadInboundValue
  | AgencyValue
  | RequestOriginValue
  | StaleEscalationValue
  | RecommendRejectionValue
  | IdentifierTypeValue
  | DueDateRangeValue
  | AgencyNameValue
  | ValidatingAuthorityValue
  | CompetentAuthorityValue;

// ---------------------------------------------------------------------------
// Catalog entry
// ---------------------------------------------------------------------------

export type FilterGroup =
  | "People"
  | "Case meta"
  | "Dates"
  | "Workflow"
  | "Signals"
  | "Tenant"
  | "Escalation"
  | "Intake";

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
  /** Id of the column whose value this filter narrows on. Used by the
   *  FilterColumnSyncDialog to offer the user a one-click "show me
   *  the X column too" when they add this filter, and a paired
   *  "hide it again" when they remove it. Filters that span multiple
   *  columns (e.g. badges, which expand into atomic columns) leave
   *  this unset — the dialog suppresses itself. Filters whose linked
   *  column doesn't fully match the filter dimension (e.g. caseStatus
   *  filter ↔ stage column, where both narrow on the same field) are
   *  also valid pointers; the dialog text says "the X column" so the
   *  user only sees the column label, not the filter id. */
  columnId?: string;
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
    columnId: "case-assignee",
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
    columnId: "crime",
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
    // Partial match: the Enterprise column surfaces the same field
    // (accountExistenceChecked && hasEnterpriseAccounts) but doesn't
    // split Consumer / Unchecked. Linking it anyway so the user sees
    // *something* relevant when they turn this filter on.
    columnId: "enterprise",
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
    // Due Date is the column the filter narrows on when field="due".
    // For field="created" there's no column today; the dialog still
    // surfaces Due Date so the user can correlate at least one date.
    columnId: "due-date",
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
    columnId: "stage",
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
    columnId: "stage",
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
    columnId: "country",
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
    // Country / Jurisdiction column folds both axes — sufficient for
    // the user to verify which jurisdiction the row carries.
    columnId: "country",
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
    columnId: "request-type",
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
    columnId: "request-sub-type",
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
    columnId: "services",
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
    columnId: "priority",
    defaultValue: [] as SlaTierValue,
    isActive: (value) => (value as SlaTierValue).length > 0,
    predicate: (c, value) => {
      const selected = value as SlaTierValue;
      if (selected.length === 0) return true;
      // "Standard" is now a proper P3 (5-day) tier, no longer a legacy
      // Routine alias — direct lookup hits the right row.
      return selected.includes(c.casePriority as SlaTierValue[number]);
    },
    summary: (value) => {
      const v = value as SlaTierValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return v.join(", ");
    },
  } as FilterDef<SlaTierValue>,

  // ── Phase 2 persona-specific filters — Attorney, RS, TS, LENS lead.
  // ── Attorney Dashboard: Escalation sub-state (pull-model status) ────
  {
    id: "escalationStatus",
    label: "Escalation status",
    group: "Escalation",
    columnId: "internal-escalation",
    defaultValue: [] as EscalationStatusValue,
    isActive: (value) => (value as EscalationStatusValue).length > 0,
    predicate: (c, value) => {
      const selected = value as EscalationStatusValue;
      if (selected.length === 0) return true;
      const summary = getEscalationSummaryForCase(c.caseId);
      if (!summary) return false;
      return selected.includes(summary.status);
    },
    summary: (value) => {
      const v = value as EscalationStatusValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} statuses`;
    },
  } as FilterDef<EscalationStatusValue>,

  // ── Attorney Dashboard: Specific assigned attorney ──────────────────
  {
    id: "specificAttorney",
    label: "Assigned attorney",
    group: "Escalation",
    columnId: "escalation-reviewer",
    defaultValue: "any" as SpecificAttorneyValue,
    isActive: (value) => (value as SpecificAttorneyValue) !== "any",
    predicate: (c, value) => {
      const v = value as SpecificAttorneyValue;
      if (v === "any") return true;
      const esc = getCaseFormDataById(c.caseId)?.attorneyEscalation;
      if (!esc) return false;
      if (v === "unassigned")
        return esc.role === "Attorney" && !esc.assignedAttorneyId;
      return esc.assignedAttorneyId === v;
    },
    summary: (value) => {
      const v = value as SpecificAttorneyValue;
      if (v === "any") return "Anyone";
      if (v === "unassigned") return "Unassigned attorney";
      return v;
    },
  } as FilterDef<SpecificAttorneyValue>,

  // ── RS: Tenant (Enterprise display name) ────────────────────────────
  {
    id: "tenant",
    label: "Tenant",
    group: "Tenant",
    columnId: "tenant",
    defaultValue: [] as TenantValue,
    isActive: (value) => (value as TenantValue).length > 0,
    predicate: (c, value) => {
      const selected = value as TenantValue;
      if (selected.length === 0) return true;
      const ec = getCaseFormDataById(c.caseId)?.enterpriseContext;
      if (!ec) return false;
      const tenants = ec.orgs?.length
        ? ec.orgs.map((o) => o.tenantDisplayName)
        : [ec.org?.tenantDisplayName].filter(Boolean);
      return tenants.some((t) => t && selected.includes(t));
    },
    summary: (value) => {
      const v = value as TenantValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} tenants`;
    },
  } as FilterDef<TenantValue>,

  // ── RS: Has unread inbound correspondence from IA / EA ──────────────
  {
    id: "unreadInbound",
    label: "Unread inbound (IA/EA)",
    group: "Signals",
    columnId: "unread",
    defaultValue: "any" as UnreadInboundValue,
    isActive: (value) => (value as UnreadInboundValue) !== "any",
    predicate: (c, value) => {
      const v = value as UnreadInboundValue;
      if (v === "any") return true;
      const has = caseHasUnreadInboundFromAuthority(c.caseId);
      return v === "yes" ? has : !has;
    },
    summary: (value) => {
      const v = value as UnreadInboundValue;
      if (v === "any") return "Any";
      return v === "yes" ? "Has unread" : "No unread";
    },
  } as FilterDef<UnreadInboundValue>,

  // ── TS: Issuing Authority / Agency ──────────────────────────────────
  {
    id: "agency",
    label: "Issuing Authority",
    group: "Intake",
    columnId: "agency",
    defaultValue: [] as AgencyValue,
    isActive: (value) => (value as AgencyValue).length > 0,
    predicate: (c, value) => {
      const selected = value as AgencyValue;
      if (selected.length === 0) return true;
      const fd = getCaseFormDataById(c.caseId);
      const agency =
        fd?.legalContext?.primaryIssuingAuthority?.name ?? fd?.agency;
      if (!agency) return false;
      return selected.includes(agency);
    },
    summary: (value) => {
      const v = value as AgencyValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} agencies`;
    },
  } as FilterDef<AgencyValue>,

  // ── TS: Request Origin / intake channel ─────────────────────────────
  {
    id: "requestOrigin",
    label: "Request Origin",
    group: "Intake",
    columnId: "request-origin",
    defaultValue: [] as RequestOriginValue,
    isActive: (value) => (value as RequestOriginValue).length > 0,
    predicate: (c, value) => {
      const selected = value as RequestOriginValue;
      if (selected.length === 0) return true;
      if (!c.requestOrigin) return false;
      return selected.includes(c.requestOrigin);
    },
    summary: (value) => {
      const v = value as RequestOriginValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} channels`;
    },
  } as FilterDef<RequestOriginValue>,

  // ── LENS Lead: Stale escalation (escalated > N days, no recent
  //    activity). "Stale" = the case has an active escalation whose
  //    most recent attorney action (or initial escalatedAt when no
  //    actions yet) is older than N days.
  {
    id: "staleEscalation",
    label: "Stale escalation",
    group: "Escalation",
    columnId: "stale-escalation",
    defaultValue: { days: 0 } as StaleEscalationValue,
    isActive: (value) => ((value as StaleEscalationValue).days ?? 0) > 0,
    predicate: (c, value) => {
      const v = value as StaleEscalationValue;
      if (!v.days || v.days <= 0) return true;
      const esc = getCaseFormDataById(c.caseId)?.attorneyEscalation;
      if (!esc) return false;
      // Active escalations only — terminal statuses don't need
      // "stale" follow-up.
      const isTerminal =
        esc.status === "ApprovedForDelivery" ||
        esc.status === "ApprovedWithConditions";
      if (isTerminal) return false;
      let lastActivity = new Date(esc.escalatedAt).getTime();
      for (const a of esc.actions ?? []) {
        const t = new Date(a.performedAt).getTime();
        if (Number.isFinite(t) && t > lastActivity) lastActivity = t;
      }
      const ageMs = Date.now() - lastActivity;
      const thresholdMs = v.days * 24 * 60 * 60 * 1000;
      return ageMs >= thresholdMs;
    },
    summary: (value) => {
      const v = value as StaleEscalationValue;
      if (!v.days || v.days <= 0) return "Any";
      return `> ${v.days} days`;
    },
  } as FilterDef<StaleEscalationValue>,

  // ── LENS Lead: Recommend Rejection candidates ───────────────────────
  {
    id: "recommendRejection",
    label: "Recommend Rejection",
    group: "Escalation",
    columnId: "recommend-rejection",
    defaultValue: "any" as RecommendRejectionValue,
    isActive: (value) => (value as RecommendRejectionValue) !== "any",
    predicate: (c, value) => {
      const v = value as RecommendRejectionValue;
      if (v === "any") return true;
      const matches = c.caseStage === "Recommend Rejection";
      return v === "yes" ? matches : !matches;
    },
    summary: (value) => {
      const v = value as RecommendRejectionValue;
      if (v === "any") return "Any";
      return v === "yes" ? "Recommended" : "Not recommended";
    },
  } as FilterDef<RecommendRejectionValue>,

  // ── Identifier Types ────────────────────────────────────────────────
  // Multi-select over the distinct identifier-type keys present in the
  // queue (email, phone, ipAddress, …). A case matches when ANY of its
  // identifier-type keys is in the selected list — mirrors the Crime
  // and Services filters' "any-of" semantics.
  {
    id: "identifierType",
    label: "Identifier Types",
    group: "Case meta",
    columnId: "identifier-types",
    defaultValue: [] as IdentifierTypeValue,
    isActive: (value) => (value as IdentifierTypeValue).length > 0,
    predicate: (c, value) => {
      const selected = value as IdentifierTypeValue;
      if (selected.length === 0) return true;
      const keys = Object.keys(c.identifierTypes ?? {});
      return keys.some((k) => selected.includes(k));
    },
    summary: (value) => {
      const v = value as IdentifierTypeValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} types`;
    },
  } as FilterDef<IdentifierTypeValue>,

  // ── Due Date Range ──────────────────────────────────────────────────
  // Scoped to the due-date axis only — separate from the generic
  // `dateRange` filter (which defaults to "created" and requires the
  // user to flip a sub-field). The dueDate is what most workflow-
  // pressured filtering centres on, so giving it a dedicated entry
  // shortens the path. Links to the existing Due Date column so the
  // sync dialog already has a column to surface.
  {
    id: "dueDateRange",
    label: "Due Date Range",
    group: "Dates",
    columnId: "due-date",
    defaultValue: { start: "", end: "" } as DueDateRangeValue,
    isActive: (value) => {
      const v = value as DueDateRangeValue;
      return !!v.start || !!v.end;
    },
    predicate: (c, value) => {
      const v = value as DueDateRangeValue;
      if (!v.start && !v.end) return true;
      const t = Date.parse(c.dueDate);
      if (!Number.isFinite(t)) return false;
      const startMs = v.start ? Date.parse(`${v.start}T00:00:00`) : -Infinity;
      const endMs = v.end ? Date.parse(`${v.end}T23:59:59`) : Infinity;
      return t >= startMs && t <= endMs;
    },
    summary: (value) => {
      const v = value as DueDateRangeValue;
      const fmt = (s: string) =>
        s
          ? new Date(`${s}T00:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "—";
      if (!v.start && !v.end) return "Any";
      return `${fmt(v.start)} – ${fmt(v.end)}`;
    },
  } as FilterDef<DueDateRangeValue>,

  // ── Agency Name (multi-match across ALL agency roles on the case) ──
  // Matches when any agency on the case — regardless of role — has a
  // canonical name in the selected list. Reads from the structured
  // `legalContext.agencies[]` array, falling back to the legacy flat
  // `agency` string when the structured context isn't seeded.
  {
    id: "agencyName",
    label: "Agency Name",
    group: "Intake",
    columnId: "agency-name",
    defaultValue: [] as AgencyNameValue,
    isActive: (value) => (value as AgencyNameValue).length > 0,
    predicate: (c, value) => {
      const selected = value as AgencyNameValue;
      if (selected.length === 0) return true;
      const fd = getCaseFormDataById(c.caseId);
      const names = new Set<string>();
      for (const ar of fd?.legalContext?.agencies ?? []) {
        if (ar.agency?.name) names.add(ar.agency.name);
      }
      if (names.size === 0 && fd?.agency) names.add(fd.agency);
      for (const sel of selected) if (names.has(sel)) return true;
      return false;
    },
    summary: (value) => {
      const v = value as AgencyNameValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} agencies`;
    },
  } as FilterDef<AgencyNameValue>,

  // ── Validating Authority (EU eEvidence) ─────────────────────────────
  // Matches when the case has an agency in the `ValidatingAuthority`
  // role and that agency's name is in the selected list. Empty for
  // non-EU eEvidence cases.
  {
    id: "validatingAuthority",
    label: "Validating Authority",
    group: "Intake",
    columnId: "validating-authority",
    defaultValue: [] as ValidatingAuthorityValue,
    isActive: (value) => (value as ValidatingAuthorityValue).length > 0,
    predicate: (c, value) => {
      const selected = value as ValidatingAuthorityValue;
      if (selected.length === 0) return true;
      const fd = getCaseFormDataById(c.caseId);
      // Prefer the derived primaryValidatingAuthority accessor; fall
      // back to walking the agencies array for cases where the
      // accessor wasn't computed.
      const primary = fd?.legalContext?.primaryValidatingAuthority?.name;
      if (primary && selected.includes(primary)) return true;
      for (const ar of fd?.legalContext?.agencies ?? []) {
        if (
          ar.role === "ValidatingAuthority" &&
          ar.agency?.name &&
          selected.includes(ar.agency.name)
        ) {
          return true;
        }
      }
      return false;
    },
    summary: (value) => {
      const v = value as ValidatingAuthorityValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} authorities`;
    },
  } as FilterDef<ValidatingAuthorityValue>,

  // ── Competent Authority Name (EU eEvidence enforcing-side) ──────────
  // Matches when the case has an agency in the `CompetentAuthority`
  // role and that agency's name is in the selected list. Used by the
  // enforcing-side workflow to scope cases to the central authority
  // handling them in the receiving member state.
  {
    id: "competentAuthority",
    label: "Competent Authority Name",
    group: "Intake",
    columnId: "competent-authority",
    defaultValue: [] as CompetentAuthorityValue,
    isActive: (value) => (value as CompetentAuthorityValue).length > 0,
    predicate: (c, value) => {
      const selected = value as CompetentAuthorityValue;
      if (selected.length === 0) return true;
      const fd = getCaseFormDataById(c.caseId);
      const primary = fd?.legalContext?.primaryCompetentAuthority?.name;
      if (primary && selected.includes(primary)) return true;
      for (const ar of fd?.legalContext?.agencies ?? []) {
        if (
          ar.role === "CompetentAuthority" &&
          ar.agency?.name &&
          selected.includes(ar.agency.name)
        ) {
          return true;
        }
      }
      return false;
    },
    summary: (value) => {
      const v = value as CompetentAuthorityValue;
      if (v.length === 0) return "Any";
      if (v.length === 1) return v[0];
      return `${v.length} authorities`;
    },
  } as FilterDef<CompetentAuthorityValue>,

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

/** Tenant catalog — distinct Enterprise tenant display names across
 *  every case's `enterpriseContext.orgs[]` (or single `org` for back-
 *  compat). Used by the Tenant filter so RS / Attorney can scope to
 *  one or more specific tenants. Cases without an enterpriseContext
 *  contribute nothing. */
export function distinctTenants(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) {
    const ec = getCaseFormDataById(c.caseId)?.enterpriseContext;
    if (!ec) continue;
    if (ec.orgs?.length) {
      for (const o of ec.orgs) {
        if (o.tenantDisplayName) set.add(o.tenantDisplayName);
      }
    } else if (ec.org?.tenantDisplayName) {
      set.add(ec.org.tenantDisplayName);
    }
  }
  return Array.from(set).sort();
}

/** Issuing-Authority catalog — distinct primary agency names from
 *  each case's `legalContext.primaryIssuingAuthority.name` (or the
 *  legacy `agency` string when the structured context isn't seeded). */
export function distinctAgencies(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) {
    const fd = getCaseFormDataById(c.caseId);
    const name = fd?.legalContext?.primaryIssuingAuthority?.name ?? fd?.agency;
    if (name) set.add(name);
  }
  return Array.from(set).sort();
}

/** Agency-name catalog — every distinct agency name appearing on any
 *  case in any role. Backs the multi-role "Agency Name" filter so the
 *  picker covers every agency the user might be asked to scope on,
 *  not just primary issuing authorities. */
export function distinctAgencyNames(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) {
    const fd = getCaseFormDataById(c.caseId);
    for (const ar of fd?.legalContext?.agencies ?? []) {
      if (ar.agency?.name) set.add(ar.agency.name);
    }
    if (fd?.agency) set.add(fd.agency);
  }
  return Array.from(set).sort();
}

/** Validating-Authority catalog — distinct agency names where the
 *  agency holds the `ValidatingAuthority` role on the case (or the
 *  derived `primaryValidatingAuthority` accessor is populated). */
export function distinctValidatingAuthorities(
  cases: CaseQueueItem[],
): string[] {
  const set = new Set<string>();
  for (const c of cases) {
    const fd = getCaseFormDataById(c.caseId);
    if (fd?.legalContext?.primaryValidatingAuthority?.name) {
      set.add(fd.legalContext.primaryValidatingAuthority.name);
    }
    for (const ar of fd?.legalContext?.agencies ?? []) {
      if (ar.role === "ValidatingAuthority" && ar.agency?.name) {
        set.add(ar.agency.name);
      }
    }
  }
  return Array.from(set).sort();
}

/** Competent-Authority catalog — distinct agency names where the
 *  agency holds the `CompetentAuthority` role on the case (or the
 *  derived `primaryCompetentAuthority` accessor is populated). */
export function distinctCompetentAuthorities(
  cases: CaseQueueItem[],
): string[] {
  const set = new Set<string>();
  for (const c of cases) {
    const fd = getCaseFormDataById(c.caseId);
    if (fd?.legalContext?.primaryCompetentAuthority?.name) {
      set.add(fd.legalContext.primaryCompetentAuthority.name);
    }
    for (const ar of fd?.legalContext?.agencies ?? []) {
      if (ar.role === "CompetentAuthority" && ar.agency?.name) {
        set.add(ar.agency.name);
      }
    }
  }
  return Array.from(set).sort();
}

/** Request-Origin catalog — distinct intake-channel strings in the
 *  queue (LE Portal / LEAPI / Email / Manual / etc.). Reads from the
 *  queue item directly since `requestOrigin` already lives on
 *  `CaseQueueItem`. */
export function distinctRequestOrigins(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) if (c.requestOrigin) set.add(c.requestOrigin);
  return Array.from(set).sort();
}

/** Identifier-Type catalog — distinct keys across every case's
 *  `identifierTypes` map (e.g. "email", "phone", "ipAddress"). Used by
 *  the IdentifierType filter so the multi-check picker always reflects
 *  what's actually present in the queue. */
export function distinctIdentifierTypes(cases: CaseQueueItem[]): string[] {
  const set = new Set<string>();
  for (const c of cases) {
    for (const key of Object.keys(c.identifierTypes ?? {})) set.add(key);
  }
  return Array.from(set).sort();
}
