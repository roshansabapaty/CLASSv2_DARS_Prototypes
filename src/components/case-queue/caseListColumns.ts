/**
 * Shared column definitions for the Case Queue's Detailed-list view.
 *
 * One source of truth for column id, label, default width, and resize
 * bounds. Both `CaseQueueListHeader` and `CaseQueueListRow` consume
 * this so the grid template stays in sync — re-ordering a column or
 * tweaking its width here updates both surfaces.
 */

import {
  escalationStatusWeight,
  getEscalationSummaryForCase,
  gfrQueueChipForCase,
} from "../../utils/escalationHelpers";
import { getAllSnapshot as getAllCorrespondenceSnapshot } from "../../state/correspondenceStore";
import {
  heldForAttorneyOutbounds,
  unreadInboxCount,
} from "../correspondence/correspondenceEngine";
import { getCaseFormDataById } from "../../utils/caseDataRegistry";

export type ColumnId =
  | "case-id"
  // Atomic operational-signal columns. The original combined
  // "operational-badges" column was split per-signal so each row stays
  // scannable per-column rather than burying chips in a single cell.
  | "unread"
  | "threat-to-life"
  | "enterprise"
  | "gfr-hold"
  | "attorney-review"
  | "ndo-reminder"
  | "priority"
  | "due-date"
  | "country"
  | "identifiers"
  | "services"
  | "internal-escalation"
  | "stage"
  // Attorney Dashboard only — the case's RS assignee surfaced as a
  // dedicated column so attorneys can see who owns the case at a glance.
  | "case-assignee"
  // Attorney Dashboard only — combined {Role} - {Name} string showing
  // who's reviewing the escalation (e.g. "Attorney - Sarah Johnson").
  | "escalation-reviewer"
  // ── Filter-driven synthesised columns (hidden by default) ──────────
  // Each maps 1:1 to a FilterDef in extraFilterCatalog.ts; the
  // FilterColumnSyncDialog auto-mounts them when the user adds the
  // matching filter and confirms.
  | "crime"
  | "request-type"
  | "request-sub-type"
  | "request-origin"
  | "tenant"
  | "agency"
  | "stale-escalation"
  | "recommend-rejection"
  | "identifier-types"
  // Authority columns paired with the multi-role authority filters in
  // `extraFilterCatalog.ts` (agencyName / validatingAuthority /
  // competentAuthority). Hidden by default — the existing "Issuing
  // Authority" column (`agency`) already covers the most common case.
  | "agency-name"
  | "validating-authority"
  | "competent-authority";

export interface ColumnDef {
  id: ColumnId;
  label: string;
  /** Default width in pixels. */
  defaultWidth: number;
  /** Lower bound. The resizer enforces this. */
  minWidth: number;
  /** Upper bound. */
  maxWidth: number;
  /** When true, the column header renders as a click-to-sort button.
   *  UR signal (2026-05): RS / TS sort by Priority, Due Date, and Stage.
   *  Other columns stay label-only — see 3F in UX-Polish.md. */
  sortable?: boolean;
  /** When true, the column is pinned to its current position and
   *  cannot be reordered via drag or the Edit Columns menu. Used to
   *  lock the Case ID column at the leftmost position so the row
   *  identifier always reads first. */
  locked?: boolean;
  /** When true, the column starts in the hidden-set on a fresh load
   *  (no persisted state). Used by the filter-driven synthesised
   *  columns (Crime, Tenant, Issuing Authority, etc.) so they only
   *  appear once the user mounts the matching filter — keeping the
   *  default table to the spec's intended column set. */
  hiddenByDefault?: boolean;
}

// ── Dense grid template (preview-pane mode) ─────────────────────────────
//
// Single source of truth for the dense-mode CSS Grid template, imported
// by BOTH `CaseQueueListHeader` and `CaseQueueListRow`. Lifting it here
// prevents drift — when the two components hold their own copies of the
// same string, a one-character mismatch (an `auto` vs `minmax(0,fr)`,
// an extra fr value, a different order) silently misaligns the header
// from every row.
//
// Two contracts every track must follow to avoid the regressions we've
// hit recently:
//
//   1. Every fr track is wrapped in `minmax(0, Xfr)` so columns can
//      shrink below their intrinsic content width. Bare `Xfr` is shorthand
//      for `minmax(auto, Xfr)`, which refuses to clip — text in narrow
//      columns then overflows into the next column. The matching
//      `min-w-0` chain on the cell wrappers is the inner half of the
//      truncation fix.
//
//   2. NEVER use a literal `auto` for a content track. Auto resolves per
//      grid container, so the header and every row are separate auto-
//      resolves and the tracks drift apart. `auto` is reserved for
//      genuinely fixed-content cells (the leading checkbox), nothing
//      else.
//
// Track order matches DENSE_COLUMN_IDS:
//   (checkbox) | Case ID | Priority | Due Date | Stage | Assigned To |
//   Internal Escalation | Escalated To.
const DENSE_TRACKS =
  "minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)";

export const DENSE_GRID_COLS_WITH_CHECKBOX = `grid-cols-[auto_${DENSE_TRACKS}]`;
export const DENSE_GRID_COLS_NO_CHECKBOX = `grid-cols-[${DENSE_TRACKS}]`;

export function getDenseGridColsClass(bulkSelectable: boolean): string {
  return bulkSelectable
    ? DENSE_GRID_COLS_WITH_CHECKBOX
    : DENSE_GRID_COLS_NO_CHECKBOX;
}

export const CASE_LIST_COLUMNS: ColumnDef[] = [
  // Case ID — locked at position 0. The Edit Columns menu hides the
  // Move Up / Move Down items for locked columns, and the drag
  // reorder handlers no-op when the source or target is locked.
  { id: "case-id",              label: "Case ID",              defaultWidth: 160, minWidth: 120, maxWidth: 280, sortable: true, locked: true },
  // Atomic operational columns — replaced the bundled "Badges" cell.
  // Each surfaces a single operational signal so the table stays
  // scannable per-column. All columns are sortable; the comparator
  // ranks present-signal rows above em-dash rows for the operational
  // chips (Unread / Threat / Enterprise / GFR / Attorney-Review / NDO).
  { id: "unread",               label: "Unread",               defaultWidth: 90,  minWidth: 70,  maxWidth: 140, sortable: true },
  { id: "threat-to-life",       label: "Threat to Life",       defaultWidth: 110, minWidth: 90,  maxWidth: 160, sortable: true },
  { id: "enterprise",           label: "Enterprise",           defaultWidth: 110, minWidth: 90,  maxWidth: 160, sortable: true },
  { id: "gfr-hold",             label: "GFR Hold",             defaultWidth: 120, minWidth: 90,  maxWidth: 180, sortable: true },
  { id: "attorney-review",      label: "Attorney Review",      defaultWidth: 140, minWidth: 110, maxWidth: 200, sortable: true },
  { id: "ndo-reminder",         label: "NDO Reminder",         defaultWidth: 130, minWidth: 100, maxWidth: 200, sortable: true },
  { id: "priority",             label: "Priority",             defaultWidth: 140, minWidth: 110, maxWidth: 200, sortable: true },
  { id: "due-date",             label: "Due Date",             defaultWidth: 140, minWidth: 110, maxWidth: 220, sortable: true },
  { id: "country",              label: "Country / Jurisdiction", defaultWidth: 180, minWidth: 120, maxWidth: 280, sortable: true },
  { id: "identifiers",          label: "Identifiers",          defaultWidth: 96,  minWidth: 72,  maxWidth: 160, sortable: true },
  { id: "services",             label: "Services",             defaultWidth: 240, minWidth: 140, maxWidth: 480, sortable: true },
  { id: "stage",                label: "Stage",                defaultWidth: 140, minWidth: 100, maxWidth: 240, sortable: true },
  // People + escalation columns — the RS who owns the case, the
  // active SP-side escalation role chip (Attorney / Peer / LENS Lead),
  // and the named reviewer assigned to that escalation. Internal
  // Escalation sits between Assigned To and Escalated To so the role
  // chip + reviewer name read together as a single phrase, removing
  // the need to repeat the role prefix inside the reviewer cell.
  // Assigned To and Escalated To both sort alphabetically by the
  // person's name (unassigned / no-escalation rows bucket to the bottom).
  { id: "case-assignee",        label: "Assigned To",          defaultWidth: 160, minWidth: 120, maxWidth: 240, sortable: true },
  // "Internal Escalation" — SP-side escalation only (Attorney, Peer,
  // LENS Lead). External-driven signals (GFR, LE Cancellation /
  // Withdrawn, AuthorizationDesiredStatus updates) are surfaced
  // separately as chips on the Badges column.
  { id: "internal-escalation",  label: "Internal Escalation",  defaultWidth: 180, minWidth: 120, maxWidth: 260, sortable: true },
  { id: "escalation-reviewer",  label: "Escalated To",         defaultWidth: 200, minWidth: 140, maxWidth: 320, sortable: true },
  // ── Filter-driven synthesised columns (hidden by default) ───────────
  // Each of these mirrors a filter in `extraFilterCatalog.ts` that
  // didn't have a matching native column. They start hidden so the
  // default table stays focused on the spec's intended columns; the
  // user mounts them by adding the filter (the FilterColumnSyncDialog
  // confirms before flipping the visibility) or by toggling the
  // checkbox in the Edit Columns menu. Sortable so the "Sort by what
  // I'm filtering on" loop closes in one stroke.
  { id: "crime",                label: "Nature of Crime",      defaultWidth: 180, minWidth: 120, maxWidth: 320, sortable: true, hiddenByDefault: true },
  { id: "request-type",         label: "Request Type",         defaultWidth: 140, minWidth: 100, maxWidth: 240, sortable: true, hiddenByDefault: true },
  { id: "request-sub-type",     label: "Request Sub-Type",     defaultWidth: 150, minWidth: 110, maxWidth: 240, sortable: true, hiddenByDefault: true },
  { id: "request-origin",       label: "Request Origin",       defaultWidth: 130, minWidth: 100, maxWidth: 220, sortable: true, hiddenByDefault: true },
  { id: "tenant",               label: "Tenant",               defaultWidth: 180, minWidth: 120, maxWidth: 280, sortable: true, hiddenByDefault: true },
  { id: "agency",               label: "Issuing Authority",    defaultWidth: 200, minWidth: 140, maxWidth: 320, sortable: true, hiddenByDefault: true },
  { id: "stale-escalation",     label: "Escalation Age",       defaultWidth: 130, minWidth: 100, maxWidth: 200, sortable: true, hiddenByDefault: true },
  { id: "recommend-rejection",  label: "Reco Rejection",       defaultWidth: 140, minWidth: 110, maxWidth: 200, sortable: true, hiddenByDefault: true },
  { id: "identifier-types",     label: "Identifier Types",     defaultWidth: 200, minWidth: 140, maxWidth: 320, sortable: true, hiddenByDefault: true },
  { id: "agency-name",          label: "Agency Name",          defaultWidth: 220, minWidth: 140, maxWidth: 340, sortable: true, hiddenByDefault: true },
  { id: "validating-authority", label: "Validating Authority", defaultWidth: 220, minWidth: 140, maxWidth: 340, sortable: true, hiddenByDefault: true },
  { id: "competent-authority",  label: "Competent Authority",  defaultWidth: 220, minWidth: 140, maxWidth: 340, sortable: true, hiddenByDefault: true },
];

/** Back-compat alias — same shape as `CASE_LIST_COLUMNS` now that the
 *  two people columns are part of the default set. Kept exported so
 *  existing imports don't break; new callers should prefer
 *  `CASE_LIST_COLUMNS` directly. */
export const ATTORNEY_DASHBOARD_COLUMNS: ColumnDef[] = CASE_LIST_COLUMNS;

// ── Sort plumbing for 3F (UX-Polish) ──────────────────────────────────────
// Each surface that renders the header passes `sortState` + `onSort` to
// drive click-to-sort. The comparator lives here so CaseQueue and
// AttorneyDashboard apply identical ordering.

export type SortDirection = "asc" | "desc";

export interface SortState {
  columnId: ColumnId;
  direction: SortDirection;
}

/** Priority tiers map to numeric weights so "Emergency > Urgent > Routine"
 *  sorts correctly in either direction. Higher = more urgent. */
const PRIORITY_WEIGHT: Record<string, number> = {
  Emergency: 3,
  Urgent: 2,
  Routine: 1,
};

/** Canonical case-stage ordering. Earlier = earlier in the workflow. */
const STAGE_WEIGHT: Record<string, number> = {
  "Waiting on Triage": 1,
  "Triage Complete": 2,
  "Recommend Rejection": 3,
  "In Review": 4,
  "In Progress": 5,
  "No Data Provided": 6,
  "Cancelled": 7,
  "Rejected": 8,
  "Resolved": 9,
};

// ── Per-case lookups used by the operational-signal comparators ──────
// Each helper reads from a module-level store so the comparator stays a
// pure (a, b) -> number function. Identical to what the row components
// pull at render time — sort by what the user is actually looking at.

/** Unread inbox count for the case. Returns 0 when no correspondence
 *  has been recorded for it. */
function unreadCountForCase(caseId: string): number {
  const items = getAllCorrespondenceSnapshot().get(caseId);
  if (!items) return 0;
  return unreadInboxCount(items);
}

/** Held-for-attorney outbound count for the case. Approximation of the
 *  "Attorney Review" column (which also folds in unread inbound items
 *  on an active escalation; that side requires registry materialisation
 *  and is intentionally skipped here to keep sorting cheap). */
function attorneyReviewCountForCase(caseId: string): number {
  const items = getAllCorrespondenceSnapshot().get(caseId);
  if (!items) return 0;
  return heldForAttorneyOutbounds(items).length;
}

/** Primary Enterprise tenant display name for the case. Reads from
 *  the same registry the Tenant filter's predicate uses. Returns the
 *  empty string when the case has no enterpriseContext. */
function primaryTenantForCase(caseId: string): string {
  const ec = getCaseFormDataById(caseId)?.enterpriseContext;
  if (!ec) return "";
  if (ec.orgs?.length) {
    for (const o of ec.orgs) {
      if (o.tenantDisplayName) return o.tenantDisplayName;
    }
    return "";
  }
  return ec.org?.tenantDisplayName ?? "";
}

/** Primary issuing-authority name for the case. Reads from the same
 *  source the Agency filter's predicate uses (structured
 *  legalContext, then legacy agency string). */
function primaryAgencyForCase(caseId: string): string {
  const fd = getCaseFormDataById(caseId);
  return fd?.legalContext?.primaryIssuingAuthority?.name ?? fd?.agency ?? "";
}

/** Joined list of every agency name on the case (any role).
 *  Backing read for the synthesised `agency-name` column. */
function allAgencyNamesForCase(caseId: string): string {
  const fd = getCaseFormDataById(caseId);
  const names = new Set<string>();
  for (const ar of fd?.legalContext?.agencies ?? []) {
    if (ar.agency?.name) names.add(ar.agency.name);
  }
  if (names.size === 0 && fd?.agency) names.add(fd.agency);
  return Array.from(names).sort().join(", ");
}

/** Primary validating-authority name for the case (EU eEvidence).
 *  Falls back to walking the agencies array when the derived
 *  accessor isn't populated. */
function validatingAuthorityForCase(caseId: string): string {
  const fd = getCaseFormDataById(caseId);
  if (fd?.legalContext?.primaryValidatingAuthority?.name) {
    return fd.legalContext.primaryValidatingAuthority.name;
  }
  for (const ar of fd?.legalContext?.agencies ?? []) {
    if (ar.role === "ValidatingAuthority" && ar.agency?.name) {
      return ar.agency.name;
    }
  }
  return "";
}

/** Primary competent-authority name for the case (EU eEvidence
 *  enforcing-side). Same accessor pattern as validating. */
function competentAuthorityForCase(caseId: string): string {
  const fd = getCaseFormDataById(caseId);
  if (fd?.legalContext?.primaryCompetentAuthority?.name) {
    return fd.legalContext.primaryCompetentAuthority.name;
  }
  for (const ar of fd?.legalContext?.agencies ?? []) {
    if (ar.role === "CompetentAuthority" && ar.agency?.name) {
      return ar.agency.name;
    }
  }
  return "";
}

/** Days since the last attorney-side activity on an active escalation,
 *  or `null` when no active escalation exists. Mirrors the
 *  staleEscalation filter's predicate so sorting matches filtering. */
function escalationAgeDaysForCase(caseId: string): number | null {
  const esc = getCaseFormDataById(caseId)?.attorneyEscalation;
  if (!esc) return null;
  const isTerminal =
    esc.status === "ApprovedForDelivery" ||
    esc.status === "ApprovedWithConditions";
  if (isTerminal) return null;
  let lastActivity = new Date(esc.escalatedAt).getTime();
  for (const a of esc.actions ?? []) {
    const t = new Date(a.performedAt).getTime();
    if (Number.isFinite(t) && t > lastActivity) lastActivity = t;
  }
  if (!Number.isFinite(lastActivity)) return null;
  const ageMs = Date.now() - lastActivity;
  return Math.max(0, Math.floor(ageMs / (24 * 60 * 60 * 1000)));
}

/** Tier weight for the GFR Hold chip — higher = more urgent. Cases
 *  without a GFR chip return 0 (sort to the bottom on asc, top on
 *  desc per the comparator's flip below). */
function gfrTierWeightForCase(caseId: string): number {
  const chip = gfrQueueChipForCase(caseId);
  if (!chip) return 0;
  switch (chip.tier) {
    case "alertRed":     return 4;
    case "warnAmber":    return 3;
    case "successGreen": return 2;
    case "brand":        return 1;
    default:             return 0;
  }
}

/** Build a `(a, b) => number` comparator for the given sort state.
 *  The `item` shape is `CaseQueueItem` — we use a structural subset so
 *  consumers don't have to import the full type. */
export function buildSortComparator(
  sortState: SortState | null,
): <T extends {
  caseId: string;
  casePriority: string;
  dueDate: string;
  caseStage: string;
  assigneeName?: string;
  nextNdoReminderAt?: string;
  country?: string;
  jurisdiction?: string;
  isThreatToLife?: boolean;
  hasEnterpriseAccounts?: boolean;
  accountExistenceChecked?: boolean;
  identifierCount?: number;
  servicesRequested?: string[];
  natureOfCrime?: string[];
  requestType?: string;
  requestSubType?: string;
  requestOrigin?: string;
  identifierTypes?: Record<string, number>;
}>(a: T, b: T) => number {
  if (!sortState) {
    return () => 0;
  }
  const dir = sortState.direction === "asc" ? 1 : -1;
  return (a, b) => {
    let cmp = 0;
    switch (sortState.columnId) {
      case "priority": {
        const aw = PRIORITY_WEIGHT[a.casePriority] ?? 0;
        const bw = PRIORITY_WEIGHT[b.casePriority] ?? 0;
        // "asc" → least urgent first (Routine → Emergency); flip so the
        // first click on the Priority header surfaces the urgent cases.
        cmp = aw - bw;
        break;
      }
      case "due-date": {
        const at = new Date(a.dueDate).getTime();
        const bt = new Date(b.dueDate).getTime();
        cmp = (Number.isFinite(at) ? at : Infinity) - (Number.isFinite(bt) ? bt : Infinity);
        break;
      }
      case "stage": {
        const aw = STAGE_WEIGHT[a.caseStage] ?? 99;
        const bw = STAGE_WEIGHT[b.caseStage] ?? 99;
        cmp = aw - bw;
        break;
      }
      case "case-assignee": {
        // Alphabetical by assignee name. Unassigned rows always bucket
        // to the bottom so an asc sort surfaces the named owners first
        // and unassigned work clusters at the end regardless of direction.
        const an = a.assigneeName?.trim() ?? "";
        const bn = b.assigneeName?.trim() ?? "";
        if (!an && !bn) cmp = 0;
        else if (!an) return 1;
        else if (!bn) return -1;
        else cmp = an.localeCompare(bn);
        break;
      }
      case "internal-escalation": {
        // Primary key: status weight (Pending / InfoRequested / Blocked
        // at the top, terminal / no-escalation at the bottom).
        // Secondary key: role label (alpha) so same-status rows group
        // by who's reviewing (Attorney, Peer, etc.). Cases without any
        // active internal escalation sort to the very bottom regardless
        // of direction.
        const sa = getEscalationSummaryForCase(a.caseId);
        const sb = getEscalationSummaryForCase(b.caseId);
        const aw = escalationStatusWeight(sa?.status);
        const bw = escalationStatusWeight(sb?.status);
        cmp = aw - bw;
        if (cmp === 0) {
          const ra = sa?.role ?? "";
          const rb = sb?.role ?? "";
          cmp = ra.localeCompare(rb);
        }
        break;
      }
      case "ndo-reminder": {
        // Sort by reminder date ascending → cases needing re-check
        // soonest float to the top. Cases without any reminder bucket
        // to the bottom regardless of direction.
        const ar = a.nextNdoReminderAt;
        const br = b.nextNdoReminderAt;
        if (!ar && !br) cmp = 0;
        else if (!ar) return 1;
        else if (!br) return -1;
        else {
          const at = Date.parse(ar);
          const bt = Date.parse(br);
          cmp = (Number.isFinite(at) ? at : Infinity) - (Number.isFinite(bt) ? bt : Infinity);
        }
        break;
      }
      case "escalation-reviewer": {
        // Alphabetical by the reviewer's display name. Cases without
        // any active internal escalation bucket to the bottom in either
        // direction (same convention as case-assignee).
        const sa = getEscalationSummaryForCase(a.caseId);
        const sb = getEscalationSummaryForCase(b.caseId);
        const ra = sa?.assigneeLabel?.trim() ?? "";
        const rb = sb?.assigneeLabel?.trim() ?? "";
        if (!ra && !rb) cmp = 0;
        else if (!ra) return 1;
        else if (!rb) return -1;
        else cmp = ra.localeCompare(rb);
        break;
      }
      case "case-id": {
        // Lexicographic on the LNS-YYYY-NNNN case id.
        cmp = a.caseId.localeCompare(b.caseId);
        break;
      }
      case "unread": {
        // Numeric on unread inbox count. Em-dash (count = 0) rows go
        // to the bottom on asc and the top on desc — matches the
        // pattern: clicking asc surfaces the loudest cases first, the
        // chevron flip below handles the rest.
        cmp = unreadCountForCase(a.caseId) - unreadCountForCase(b.caseId);
        break;
      }
      case "threat-to-life": {
        // Boolean — flagged cases (true) sort below unflagged (false)
        // on asc; the chevron flips for desc. Net effect of the first
        // click is "show me the threats", same as Priority.
        cmp = (a.isThreatToLife ? 1 : 0) - (b.isThreatToLife ? 1 : 0);
        break;
      }
      case "enterprise": {
        // Boolean — Enterprise resolved (via Check Accounts) ranks
        // above N/A. Mirrors the threat-to-life pattern.
        const aw = a.accountExistenceChecked && a.hasEnterpriseAccounts ? 1 : 0;
        const bw = b.accountExistenceChecked && b.hasEnterpriseAccounts ? 1 : 0;
        cmp = aw - bw;
        break;
      }
      case "gfr-hold": {
        // Tier weight (alertRed > warnAmber > successGreen > brand) so
        // the loudest GFR signal floats to the top on desc. No-chip
        // cases weight 0 and bucket to the bottom on asc.
        cmp = gfrTierWeightForCase(a.caseId) - gfrTierWeightForCase(b.caseId);
        break;
      }
      case "attorney-review": {
        cmp =
          attorneyReviewCountForCase(a.caseId) -
          attorneyReviewCountForCase(b.caseId);
        break;
      }
      case "country": {
        // Country/Jurisdiction is rendered as `${country} · ${jurisdiction}`
        // so sort by that concatenation alphabetically. Empty values
        // bucket to the bottom.
        const aLabel = `${a.country ?? ""}${a.jurisdiction ? " " + a.jurisdiction : ""}`.trim();
        const bLabel = `${b.country ?? ""}${b.jurisdiction ? " " + b.jurisdiction : ""}`.trim();
        if (!aLabel && !bLabel) cmp = 0;
        else if (!aLabel) return 1;
        else if (!bLabel) return -1;
        else cmp = aLabel.localeCompare(bLabel);
        break;
      }
      case "identifiers": {
        cmp = (a.identifierCount ?? 0) - (b.identifierCount ?? 0);
        break;
      }
      case "services": {
        // Numeric on service count. The cell renders chips with
        // overflow ("+N more"), so count is the most intuitive sort
        // key. Cases with 0 services bucket to the bottom on asc.
        cmp = (a.servicesRequested?.length ?? 0) - (b.servicesRequested?.length ?? 0);
        break;
      }
      // ── Filter-driven synthesised columns ──────────────────────────
      // Each mirrors the predicate side of its matching FilterDef so a
      // user filtering on Crime and then clicking the Crime header
      // sees the rows that survived the filter sorted by the same
      // dimension. Cases with no value bucket to the bottom on asc.
      case "crime": {
        const aLabel = [...(a.natureOfCrime ?? [])].sort().join(", ");
        const bLabel = [...(b.natureOfCrime ?? [])].sort().join(", ");
        if (!aLabel && !bLabel) cmp = 0;
        else if (!aLabel) return 1;
        else if (!bLabel) return -1;
        else cmp = aLabel.localeCompare(bLabel);
        break;
      }
      case "request-type": {
        cmp = (a.requestType ?? "").localeCompare(b.requestType ?? "");
        break;
      }
      case "request-sub-type": {
        const av = a.requestSubType ?? "";
        const bv = b.requestSubType ?? "";
        if (!av && !bv) cmp = 0;
        else if (!av) return 1;
        else if (!bv) return -1;
        else cmp = av.localeCompare(bv);
        break;
      }
      case "request-origin": {
        const av = a.requestOrigin ?? "";
        const bv = b.requestOrigin ?? "";
        if (!av && !bv) cmp = 0;
        else if (!av) return 1;
        else if (!bv) return -1;
        else cmp = av.localeCompare(bv);
        break;
      }
      case "tenant": {
        const at = primaryTenantForCase(a.caseId);
        const bt = primaryTenantForCase(b.caseId);
        if (!at && !bt) cmp = 0;
        else if (!at) return 1;
        else if (!bt) return -1;
        else cmp = at.localeCompare(bt);
        break;
      }
      case "agency": {
        const ag = primaryAgencyForCase(a.caseId);
        const bg = primaryAgencyForCase(b.caseId);
        if (!ag && !bg) cmp = 0;
        else if (!ag) return 1;
        else if (!bg) return -1;
        else cmp = ag.localeCompare(bg);
        break;
      }
      case "stale-escalation": {
        // Numeric on days-since-last-activity. Cases with no active
        // escalation (or terminal status) bucket to the bottom on
        // both directions — same convention as ndo-reminder.
        const ad = escalationAgeDaysForCase(a.caseId);
        const bd = escalationAgeDaysForCase(b.caseId);
        if (ad === null && bd === null) cmp = 0;
        else if (ad === null) return 1;
        else if (bd === null) return -1;
        else cmp = ad - bd;
        break;
      }
      case "recommend-rejection": {
        // Boolean — Recommend Rejection stage above other stages on
        // desc; chevron flip handles asc.
        const aw = a.caseStage === "Recommend Rejection" ? 1 : 0;
        const bw = b.caseStage === "Recommend Rejection" ? 1 : 0;
        cmp = aw - bw;
        break;
      }
      case "identifier-types": {
        // Sort by the sorted list of types so "email, phone" groups
        // alphabetically before "email, sms". Cases with no
        // identifierTypes map bucket to the bottom.
        const aKeys = Object.keys(a.identifierTypes ?? {}).sort().join(", ");
        const bKeys = Object.keys(b.identifierTypes ?? {}).sort().join(", ");
        if (!aKeys && !bKeys) cmp = 0;
        else if (!aKeys) return 1;
        else if (!bKeys) return -1;
        else cmp = aKeys.localeCompare(bKeys);
        break;
      }
      case "agency-name": {
        const an = allAgencyNamesForCase(a.caseId);
        const bn = allAgencyNamesForCase(b.caseId);
        if (!an && !bn) cmp = 0;
        else if (!an) return 1;
        else if (!bn) return -1;
        else cmp = an.localeCompare(bn);
        break;
      }
      case "validating-authority": {
        const av = validatingAuthorityForCase(a.caseId);
        const bv = validatingAuthorityForCase(b.caseId);
        if (!av && !bv) cmp = 0;
        else if (!av) return 1;
        else if (!bv) return -1;
        else cmp = av.localeCompare(bv);
        break;
      }
      case "competent-authority": {
        const ac = competentAuthorityForCase(a.caseId);
        const bc = competentAuthorityForCase(b.caseId);
        if (!ac && !bc) cmp = 0;
        else if (!ac) return 1;
        else if (!bc) return -1;
        else cmp = ac.localeCompare(bc);
        break;
      }
      default:
        cmp = 0;
    }
    if (cmp !== 0) return cmp * dir;
    // Stable secondary sort: case ID (string compare). Keeps row order
    // deterministic when the primary key ties.
    return a.caseId.localeCompare(b.caseId);
  };
}

/** Per-column current widths. Persisted to localStorage. */
export type ColumnWidths = Record<ColumnId, number>;

// ── Column ordering ──────────────────────────────────────────────────
// Users can reorder columns by dragging headers or via the Fluent
// MenuButton at the right edge of the header row. Each surface (Cases,
// Attorney Dashboard) owns its own order; they persist separately so
// the two pages can drift independently.

/** Ordered list of column ids. Persisted to localStorage. */
export type ColumnOrder = ColumnId[];

/** Default column order — matches the source order of `CASE_LIST_COLUMNS`
 *  so a never-customised user sees the spec's intended ordering. */
export function defaultColumnOrder(
  columns: ColumnDef[] = CASE_LIST_COLUMNS,
): ColumnOrder {
  return columns.map((c) => c.id);
}

/** Validate + sanitize a deserialised order array so a hand-edited
 *  localStorage value (or a stale value from an older build) can't crash
 *  render. Unknown ids are dropped; missing ids are appended at the end
 *  so newly-added columns are forward-compatible. */
export function sanitizeColumnOrder(
  raw: unknown,
  knownColumns: ColumnDef[] = CASE_LIST_COLUMNS,
): ColumnOrder {
  const known = new Set(knownColumns.map((c) => c.id));
  const seen = new Set<ColumnId>();
  const out: ColumnOrder = [];
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (typeof id === "string" && known.has(id as ColumnId) && !seen.has(id as ColumnId)) {
        out.push(id as ColumnId);
        seen.add(id as ColumnId);
      }
    }
  }
  // Forward-compat: append any known columns the persisted order missed
  // (e.g. brand-new column shipped after the user last saved).
  for (const col of knownColumns) {
    if (!seen.has(col.id)) {
      out.push(col.id);
      seen.add(col.id);
    }
  }
  return out;
}

/** Project a column-definitions list into the user's preferred order.
 *  Unknown order entries are dropped (filtered through the known
 *  columns set); known columns missing from the order are appended at
 *  the end (forward-compat for newly-added columns). */
export function applyColumnOrder(
  columns: ColumnDef[],
  order: ColumnOrder | undefined,
): ColumnDef[] {
  if (!order || order.length === 0) return columns;
  const byId = new Map(columns.map((c) => [c.id, c]));
  const out: ColumnDef[] = [];
  const seen = new Set<ColumnId>();
  for (const id of order) {
    const col = byId.get(id);
    if (col && !seen.has(id)) {
      out.push(col);
      seen.add(id);
    }
  }
  for (const col of columns) {
    if (!seen.has(col.id)) {
      out.push(col);
      seen.add(col.id);
    }
  }
  return out;
}

// ── Column visibility (hide / show) ─────────────────────────────────────
//
// The queue surfaces every column in `CASE_LIST_COLUMNS` by default.
// `ColumnVisibility` is the OPT-OUT set of column ids the current user
// has hidden via the Edit Columns menu (or that were auto-hidden when a
// linked filter was removed — see `extraFilterCatalog.ts`).
//
// Modelled as a hide-list rather than a show-list so that newly-added
// columns shipped in a later build are visible by default — exactly
// the forward-compat behaviour `sanitizeColumnOrder` already gives us
// for ordering. A persisted hide-list from an older build that names a
// column we since removed simply drops on sanitize.
//
// Locked columns (`ColumnDef.locked === true`) can never be hidden —
// `setColumnHidden` and `sanitizeColumnVisibility` both filter them
// out. Same invariant the reorder handlers already enforce.

/** Set of column ids the user has hidden. Persisted to localStorage. */
export type ColumnVisibility = ColumnId[];

/** Default hidden-set — every column marked `hiddenByDefault: true`.
 *  Lets the filter-driven synthesised columns (Crime, Tenant, …) start
 *  invisible without the queue needing a separate first-run hook. */
export function defaultColumnVisibility(
  knownColumns: ColumnDef[] = CASE_LIST_COLUMNS,
): ColumnVisibility {
  return knownColumns
    .filter((c) => c.hiddenByDefault && !c.locked)
    .map((c) => c.id);
}

/** Sanitize a deserialised hidden-set. Drops unknown ids and any id
 *  pointing at a locked column. Forward-appends any `hiddenByDefault`
 *  column the persisted set is missing so brand-new synthesised
 *  columns shipped in a later build stay hidden for existing users.
 *  Pass `migrate: false` to skip the migration pass (useful in tests
 *  / when an explicit empty hidden-set is meaningful). */
export function sanitizeColumnVisibility(
  raw: unknown,
  knownColumns: ColumnDef[] = CASE_LIST_COLUMNS,
  migrate = true,
): ColumnVisibility {
  const lockedIds = new Set(
    knownColumns.filter((c) => c.locked).map((c) => c.id),
  );
  const known = new Set(knownColumns.map((c) => c.id));
  const seen = new Set<ColumnId>();
  const out: ColumnVisibility = [];
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (
        typeof id === "string" &&
        known.has(id as ColumnId) &&
        !lockedIds.has(id as ColumnId) &&
        !seen.has(id as ColumnId)
      ) {
        out.push(id as ColumnId);
        seen.add(id as ColumnId);
      }
    }
  }
  if (migrate) {
    for (const col of knownColumns) {
      if (col.hiddenByDefault && !col.locked && !seen.has(col.id)) {
        out.push(col.id);
        seen.add(col.id);
      }
    }
  }
  return out;
}

/** True when the column should render. Locked columns are always
 *  visible regardless of what's in `hidden`. */
export function isColumnVisible(
  columnId: ColumnId,
  hidden: ColumnVisibility,
  columns: ColumnDef[] = CASE_LIST_COLUMNS,
): boolean {
  const def = columns.find((c) => c.id === columnId);
  if (def?.locked) return true;
  return !hidden.includes(columnId);
}

/** Returns a new hidden-set with `columnId` toggled. No-op (returns
 *  `hidden` as-is) when the column is locked. */
export function setColumnHidden(
  hidden: ColumnVisibility,
  columnId: ColumnId,
  nextHidden: boolean,
  columns: ColumnDef[] = CASE_LIST_COLUMNS,
): ColumnVisibility {
  const def = columns.find((c) => c.id === columnId);
  if (def?.locked) return hidden;
  const has = hidden.includes(columnId);
  if (nextHidden && !has) return [...hidden, columnId];
  if (!nextHidden && has) return hidden.filter((id) => id !== columnId);
  return hidden;
}

/** Filter a column-definitions list down to the columns that should
 *  render, given the user's hidden-set. Locked columns survive. */
export function filterVisibleColumns(
  columns: ColumnDef[],
  hidden: ColumnVisibility,
): ColumnDef[] {
  if (hidden.length === 0) return columns;
  const hide = new Set(hidden);
  return columns.filter((c) => c.locked || !hide.has(c.id));
}

/** Move a column id from one index to another. Returns a fresh array;
 *  no-ops when from === to or either index is out of range. */
export function reorderColumn(
  order: ColumnOrder,
  fromIndex: number,
  toIndex: number,
): ColumnOrder {
  if (
    fromIndex < 0 ||
    fromIndex >= order.length ||
    toIndex < 0 ||
    toIndex >= order.length ||
    fromIndex === toIndex
  ) {
    return order;
  }
  const next = order.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Build the default `columnWidths` map. Defaults to the main Case
 *  Queue's column set; pass `ATTORNEY_DASHBOARD_COLUMNS` (or any
 *  subset/superset) when seeding widths for a different surface. */
export function defaultColumnWidths(
  columns: ColumnDef[] = CASE_LIST_COLUMNS,
): ColumnWidths {
  return Object.fromEntries(
    columns.map((c) => [c.id, c.defaultWidth]),
  ) as ColumnWidths;
}

/** Validate + sanitize a partially-deserialised widths map so a
 *  hand-edited localStorage value can't crash render. Unknown keys are
 *  dropped; out-of-range values clamp to bounds. */
export function sanitizeColumnWidths(
  raw: Partial<ColumnWidths> | null | undefined,
): ColumnWidths {
  const out = defaultColumnWidths();
  if (!raw || typeof raw !== "object") return out;
  for (const col of CASE_LIST_COLUMNS) {
    const v = raw[col.id];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[col.id] = Math.max(col.minWidth, Math.min(v, col.maxWidth));
    }
  }
  return out;
}

/** Compose the CSS `grid-template-columns` value the table needs.
 *
 *  Structure (full template):
 *    4px [priority rail] | 36px [checkbox] | W1 | 4px [resizer] | W2 | 4px | ... | Wn
 *
 *  • The leading 4 px column is the priority rail. The header keeps it
 *    transparent; each row paints its priority-tier colour into the
 *    same column so the rail aligns with header / row borders down
 *    to the pixel.
 *  • The 4 px columns between content cells host the draggable resize
 *    handles (in the header) and act as inter-cell spacing (in the
 *    rows).
 *  • The final column has no trailing resizer — it sits flush with
 *    the table's right edge.
 *
 *  Both `withRail` and `withCheckbox` MUST match across the header
 *  and its rows. The CaseQueue table passes `true` for both. */
export function buildGridTemplate(
  widths: ColumnWidths,
  withCheckbox: boolean,
  withRail = true,
  columns: ColumnDef[] = CASE_LIST_COLUMNS,
): string {
  const parts: string[] = [];
  if (withRail) parts.push("4px");
  if (withCheckbox) parts.push("36px");
  columns.forEach((col, idx) => {
    parts.push(`${widths[col.id] ?? col.defaultWidth}px`);
    if (idx < columns.length - 1) {
      parts.push("4px");
    }
  });
  return parts.join(" ");
}
