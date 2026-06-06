/**
 * Pure helpers for the attorney escalation flow.
 *
 *  - `isEnterpriseCase(formData)` — true when either the IA's Form 1
 *    flags or the prototype's check-accounts step classify the case as
 *    Enterprise. Drives the mandatory-attorney-escalation banner.
 *  - `getEnterpriseReasons(formData)` — bullet-friendly list of *why*
 *    the case is Enterprise (each entry only included when its signal
 *    fires). Used by the banner copy.
 *  - `isAttorneyEscalationActive(formData)` — convenience predicate;
 *    true for any non-terminal escalation status.
 *  - `currentEscalationChip(formData)` — returns chip metadata
 *    (label + tier) for the WorkflowStageBanner.
 */

import type {
  AttorneyEscalation,
  AttorneyEscalationStatus,
  EscalationRole,
  FormData,
} from "../types/caseTypes";
import { ESCALATION_DIRECTORY } from "../constants/caseConstants";
import { getCaseFormDataById } from "./caseDataRegistry";
import { gfrChipMeta, type GfrChipMeta } from "./groundsForRefusal";
import { getActiveAttorneyEscalation } from "./caseEscalation";

export function isEnterpriseCase(formData: FormData): boolean {
  // Signal 1: IA reached the "processor route" branch of the
  // UnderlyingConditions tree on EPOC Form 1 — i.e. answered YES to Q2
  // (`addressedToProcessor`) and supplied at least one processor reason.
  const e = formData.eevidenceEnterpriseRequest;
  const iaProcessorRoute =
    e?.addressedToProcessor === true &&
    (e.addressedToProcessorControllerUnidentified === true ||
      e.addressedToProcessorDetrimentalToInvestigation === true);

  // Signal 2: prototype's check-accounts identified any target as Enterprise.
  const anyEnterpriseIdentifier = (formData.identifiers ?? []).some(
    (id) => id.checkAccounts?.accountType === "Enterprise",
  );

  return Boolean(iaProcessorRoute || anyEnterpriseIdentifier);
}

export interface EnterpriseReason {
  key: "iaProcessorRoute" | "checkAccountsEnterprise";
  message: string;
}

export function getEnterpriseReasons(formData: FormData): EnterpriseReason[] {
  const out: EnterpriseReason[] = [];
  const e = formData.eevidenceEnterpriseRequest;
  if (
    e?.addressedToProcessor === true &&
    (e.addressedToProcessorControllerUnidentified === true ||
      e.addressedToProcessorDetrimentalToInvestigation === true)
  ) {
    out.push({
      key: "iaProcessorRoute",
      message:
        "The Issuing Authority addressed Microsoft as the processor on Form 1 (UnderlyingConditions).",
    });
  }
  const enterpriseId = (formData.identifiers ?? []).find(
    (id) => id.checkAccounts?.accountType === "Enterprise",
  );
  if (enterpriseId) {
    out.push({
      key: "checkAccountsEnterprise",
      message: `Target identifier "${enterpriseId.value}" was detected as an Enterprise account during the account-existence check.`,
    });
  }
  return out;
}

/** True when a live escalation exists in a non-terminal status. */
export function isAttorneyEscalationActive(formData: FormData): boolean {
  const status = getActiveAttorneyEscalation(formData)?.status;
  if (!status) return false;
  return status !== "ApprovedForDelivery";
  // Note: ApprovedWithConditions is terminal for the badge but the
  // conditions banner can still be visible until acknowledged. The
  // chip-state helper below handles that nuance.
}

/** Returns the chip variant the WorkflowStageBanner should render for the
 *  current escalation state, or undefined when no chip is warranted. */
export type EscalationChipTier = "alertRed" | "warnAmber" | "infoSlateBlue" | "successGreen";

export interface EscalationChipMeta {
  label: string;
  tier: EscalationChipTier;
}

/** Map a GFR chip's tone onto the existing escalation-chip tier vocabulary
 *  so the sticky-header chip surface can render either an attorney chip
 *  or a GFR chip with consistent styling. `success` tone (EA cleared)
 *  intentionally returns undefined — the green Case Overview panel is
 *  sufficient; a chip would be noise. */
function gfrToneToTier(
  tone: GfrChipMeta["tone"],
): EscalationChipTier | undefined {
  switch (tone) {
    case "danger":
      return "alertRed";
    case "warn":
    case "amber":
      return "warnAmber";
    case "info":
      return "infoSlateBlue";
    case "success":
      return "successGreen";
  }
}

/** Returns the GFR chip mapped to the EscalationChipMeta shape, or
 *  undefined when no chip should render. Exported so the sticky header
 *  can compose it explicitly when desired. */
export function currentGfrChip(
  formData: FormData,
): EscalationChipMeta | undefined {
  const meta = gfrChipMeta(formData);
  if (!meta) return undefined;
  const tier = gfrToneToTier(meta.tone);
  if (!tier) return undefined;
  return { label: meta.label, tier };
}

/** Queue-side accessor: returns the GFR chip for a case by ID, reading
 *  from the central registry. Returns undefined when the case has no
 *  GFR record (or doesn't have a dedicated builder yet). Used by
 *  CaseCardOperationalBadges + CaseQueueListRow + Attorney Dashboard. */
export function gfrQueueChipForCase(
  caseId: string,
): EscalationChipMeta | undefined {
  const formData = getCaseFormDataById(caseId);
  if (!formData) return undefined;
  return currentGfrChip(formData);
}

/** Queue-side helper: does this case have ANY GFR chip to display,
 *  including the cleared (None Form1Review) green chip? Used by
 *  surfaces that want to surface the cleared state too — e.g. the
 *  card / list chip set. */
export function caseHasGfrChip(caseId: string): boolean {
  return gfrQueueChipForCase(caseId) !== undefined;
}

/** Queue-side helper: does this case have an ACTIONABLE GFR signal
 *  worth ranking above non-GFR cases on the Attorney Dashboard?
 *  True for Reviewing / Full / Partial / Form3Reject / Lapsed.
 *  FALSE for None decisions on Form1Review (cleared — not actionable)
 *  and non-applicable workflows. Used by the Attorney Dashboard
 *  filter / sort. */
export function caseHasActiveGfrHold(caseId: string): boolean {
  const formData = getCaseFormDataById(caseId);
  if (!formData) return false;
  const block = formData.eevidenceGroundsForRefusal;
  if (!block) return false;
  const decision = block.decision;
  // Form1Review + None = EA explicitly cleared the case → not actionable.
  if (decision?.kind === "None" && block.trigger === "Form1Review") {
    return false;
  }
  // Otherwise, if a GFR chip would render, the case is actionable.
  return gfrQueueChipForCase(caseId) !== undefined;
}

export function currentEscalationChip(
  formData: FormData,
): EscalationChipMeta | undefined {
  // GFR takes precedence over attorney escalation when both are active
  // — an EA legal veto is the higher-stakes signal at the case-header
  // chip level. The Attorney chip remains visible on its own surfaces
  // (AttorneyReviewPanel etc.).
  const gfrChip = currentGfrChip(formData);
  if (gfrChip) return gfrChip;

  const esc = getActiveAttorneyEscalation(formData);
  if (!esc) return undefined;

  const isAttorney = esc.role === "Attorney";

  const mapAttorney: Record<AttorneyEscalationStatus, EscalationChipMeta | undefined> = {
    Pending: { label: "Attorney Review Required", tier: "alertRed" },
    ApprovedForDelivery: undefined, // chip cleared on Release
    ApprovedWithConditions: undefined, // chip cleared; conditions banner shows
    InformationRequested: { label: "Info Requested", tier: "warnAmber" },
    RedirectRequested: { label: "Redirect Requested", tier: "warnAmber" },
    Reviewed: { label: "Attorney Reviewed", tier: "infoSlateBlue" },
    Blocked: { label: "Awaiting Attorney Review Before Delivery", tier: "alertRed" },
  };

  const mapPeer: Record<AttorneyEscalationStatus, EscalationChipMeta | undefined> = {
    Pending: { label: "Review Requested", tier: "infoSlateBlue" },
    ApprovedForDelivery: undefined,
    ApprovedWithConditions: undefined,
    InformationRequested: { label: "Info Requested", tier: "warnAmber" },
    RedirectRequested: { label: "Redirect Requested", tier: "warnAmber" },
    Reviewed: { label: "Reviewer Reviewed", tier: "infoSlateBlue" },
    Blocked: { label: "Reviewer Hold", tier: "alertRed" },
  };

  return (isAttorney ? mapAttorney : mapPeer)[esc.status];
}

// ---------------------------------------------------------------------------
// Dashboard-side derivation — reads the central case-data registry rather
// than relying on the static `assignedToLawyer` flag hand-set on each
// MOCK_CASES row. Lets the Attorney Dashboard react to live escalation
// state (an RS escalating in the case form surfaces the case here on the
// next render) without needing the queue rows to be kept in sync by hand.
// ---------------------------------------------------------------------------

/** Summary used by the Attorney Dashboard card. Built from a case's live
 *  attorneyEscalation if one exists; undefined otherwise. */
export interface EscalationDashboardSummary {
  status: AttorneyEscalationStatus;
  role: EscalationRole;
  /** Resolved display name for the assigned reviewer when set; falls back
   *  to `Any <role>` when the escalation is open to any holder of the
   *  targeted role. */
  assigneeLabel: string;
  /** Specialist who initiated the escalation. */
  escalatedBy: string;
  escalatedAt: Date;
  /** When the RS / TS clicked Acknowledge on the "Attorney escalation
   *  complete" badge. Drives the pull-model surfaces — a terminal
   *  status with no rsAcknowledgedAt still surfaces in the "Needs my
   *  action" filter as a Complete-unacknowledged case. */
  rsAcknowledgedAt?: Date;
}

const ROLE_LABEL: Record<EscalationRole, string> = {
  Attorney: "Attorney",
  LensLeadOrManager: "LENS Lead / Manager",
  ResponseSpecialist: "Response Specialist",
  TriageSpecialist: "Triage Specialist",
};

function resolveAssigneeLabel(esc: AttorneyEscalation): string {
  if (esc.assignedAttorneyId) {
    const hit = ESCALATION_DIRECTORY.find((d) => d.id === esc.assignedAttorneyId);
    if (hit) return hit.name;
  }
  return `Any ${ROLE_LABEL[esc.role]}`;
}

export function getEscalationSummaryForCase(
  caseId: string,
): EscalationDashboardSummary | undefined {
  try {
    const formData = getCaseFormDataById(caseId);
    const esc = formData?.attorneyEscalation;
    if (!esc) return undefined;
    return {
      status: esc.status,
      role: esc.role,
      assigneeLabel: resolveAssigneeLabel(esc),
      escalatedBy: esc.escalatedBy,
      escalatedAt: esc.escalatedAt,
      rsAcknowledgedAt: esc.rsAcknowledgedAt,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[getEscalationSummaryForCase] failed for",
      caseId,
      err,
    );
    return undefined;
  }
}

/** True when the case has a live attorney-targeted escalation that
 *  warrants the Attorney Dashboard surfacing the case. Combines the
 *  static `assignedToLawyer` queue-item flag (legacy) with a derived
 *  check against the registry. */
export function isAttorneyAssignedForCase(
  caseId: string,
  staticFlag?: boolean,
): boolean {
  if (staticFlag) return true;
  const esc = getCaseFormDataById(caseId)?.attorneyEscalation;
  if (!esc) return false;
  if (esc.role !== "Attorney") return false;
  // Terminal statuses (ApprovedForDelivery / ApprovedWithConditions)
  // clear the dashboard chip — the case still appears in the queue but
  // doesn't need attorney attention.
  return (
    esc.status === "Pending" ||
    esc.status === "InformationRequested" ||
    esc.status === "Blocked"
  );
}

/** Sort weight for an escalation status — higher means "needs attention
 *  sooner". Used by the Attorney Dashboard to order cards: Pending +
 *  InformationRequested at the top, Blocked next, terminal statuses last. */
export function escalationStatusWeight(
  status: AttorneyEscalationStatus | undefined,
): number {
  switch (status) {
    case "Pending":
      return 4;
    case "InformationRequested":
      return 3;
    case "Blocked":
      return 2;
    case "ApprovedWithConditions":
      return 1;
    case "ApprovedForDelivery":
      return 0;
    default:
      return -1;
  }
}

/** Display label for an escalation role — short form used by badges
 *  and chips. Keeps the wording consistent across surfaces (queue
 *  badges, dashboard cards, preview pane). */
export const ESCALATION_ROLE_BADGE_LABEL: Record<EscalationRole, string> = {
  Attorney: "Attorney",
  LensLeadOrManager: "LENS Lead/Manager",
  ResponseSpecialist: "Response Specialist",
  TriageSpecialist: "Triage Specialist",
};

/** Per-state badge label — communicates WHAT the attorney has done
 *  since the case was escalated, so the RS / TS can scan the queue
 *  and find the cases that need them. Pull-model surface.
 *
 *  States:
 *    Pending              → "<Role> Escalated"            (waiting on reviewer)
 *    InformationRequested → "<Role> Requests More Information"
 *    RedirectRequested    → "<Role> Requests Redirect"
 *    Reviewed             → "<Role> Reviewed"             (decision drafted, RS pickup)
 *    ApprovedForDelivery
 *      / ApprovedWithConditions
 *      / Blocked          → "<Role> Escalation Complete"  (until rsAcknowledged)
 *    (any terminal + acknowledged → undefined, badge hides) */
export function escalationBadgeLabelForCase(
  caseId: string,
): string | undefined {
  try {
    const summary = getEscalationSummaryForCase(caseId);
    if (!summary) return undefined;
    const roleLabel = ESCALATION_ROLE_BADGE_LABEL[summary.role];
    switch (summary.status) {
      case "Pending":
        return `${roleLabel} Escalated`;
      case "InformationRequested":
        return `${roleLabel} Requests More Information`;
      case "RedirectRequested":
        return `${roleLabel} Requests Redirect`;
      case "Reviewed":
        return `${roleLabel} Reviewed`;
      case "ApprovedForDelivery":
      case "ApprovedWithConditions":
      case "Blocked":
        // Terminal — show "Complete" until RS / TS acknowledges so the
        // pull-model surfaces flag the case for pickup. Once
        // acknowledged the badge disappears (the case has been picked
        // up; no longer pending RS / TS action).
        if (summary.rsAcknowledgedAt) return undefined;
        return `${roleLabel} Escalation Complete`;
      default:
        return undefined;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[escalationBadgeLabelForCase] failed for",
      caseId,
      err,
    );
    return undefined;
  }
}

/** Colour tier for the badge — communicates urgency / call-to-action
 *  weight at a glance. Pull-model surfaces use this to draw the eye
 *  to cases where the attorney has done something RS / TS needs to
 *  act on. */
export type EscalationBadgeTier =
  | "pending"          // neutral — attorney has the case
  | "info-requested"   // amber — attorney needs RS / TS to provide info
  | "redirect"         // orange — attorney wants the case redirected
  | "reviewed"         // saturated amber — decision drafted, RS / TS pickup
  | "complete"         // green — terminal, RS / TS acknowledge to clear
  | "blocked";         // red — attorney blocked, RS / TS must address

export function escalationBadgeTierForCase(
  caseId: string,
): EscalationBadgeTier | undefined {
  const summary = getEscalationSummaryForCase(caseId);
  if (!summary) return undefined;
  switch (summary.status) {
    case "Pending":
      return "pending";
    case "InformationRequested":
      return "info-requested";
    case "RedirectRequested":
      return "redirect";
    case "Reviewed":
      return "reviewed";
    case "ApprovedForDelivery":
    case "ApprovedWithConditions":
      if (summary.rsAcknowledgedAt) return undefined;
      return "complete";
    case "Blocked":
      if (summary.rsAcknowledgedAt) return undefined;
      return "blocked";
    default:
      return undefined;
  }
}

/** Auto-derived state changes the Specialist hasn't acknowledged yet.
 *  Pull-model surface — when the system mutates case state without an
 *  explicit user click (e.g. the EA review window lapses on the
 *  10-day clock, GFR clears via inbound Form 1 Review), the case
 *  surfaces in "Needs my action" until the Specialist opens it and
 *  acknowledges the auto-event via the page-top banner. Keeps the
 *  audit trail consistent — every system-side state change has a
 *  human acknowledgement timestamp.
 *
 *  Currently watches:
 *    - EA review window lapsed (windowLapsed && !windowLapseAcknowledgedAt) */
export function caseHasUnacknowledgedAutoStateChange(
  caseId: string,
): boolean {
  try {
    const formData = getCaseFormDataById(caseId);
    const block = formData?.eevidenceGroundsForRefusal;
    if (!block) return false;
    if (block.windowLapsed && !block.windowLapseAcknowledgedAt) return true;
    return false;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[caseHasUnacknowledgedAutoStateChange] failed for",
      caseId,
      err,
    );
    return false;
  }
}

/** Unread inbound correspondence from an external authority (IA / EA)
 *  on this case. Drives the composite "Needs my action" filter alongside
 *  escalation sub-state. Reads correspondence from the case's FormData
 *  in the registry; returns false if the case isn't in the registry. */
export function caseHasUnreadInboundFromAuthority(caseId: string): boolean {
  try {
    const formData = getCaseFormDataById(caseId);
    const corr = formData?.correspondence;
    if (!corr || corr.length === 0) return false;
    for (const item of corr) {
      // Inbound items have a `direction === "Inbound"` and a `readAt`
      // timestamp once the user opens them. We only care about unread
      // inbounds from external authorities (IA / EA) — internal
      // correspondence doesn't drive a pull signal.
      if ((item as { direction?: string }).direction !== "Inbound") continue;
      if ((item as { readAt?: Date }).readAt) continue;
      const counterparty = (item as { counterparty?: string }).counterparty;
      if (
        counterparty === "IssuingAuthority" ||
        counterparty === "EnforcingAuthority"
      ) {
        return true;
      }
    }
    return false;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[caseHasUnreadInboundFromAuthority] failed for",
      caseId,
      err,
    );
    return false;
  }
}

/** Composite "Needs my action" predicate — drives the "Needs my action"
 *  quick-filter tab + the operational-badge filter of the same name.
 *  Pull-model surface: any condition that requires the Specialist to
 *  open the case and take a visible action surfaces here.
 *
 *  Conditions:
 *    - Escalation is in a state requiring Specialist follow-up
 *      (InfoRequested / RedirectRequested / Reviewed / Complete-unacked)
 *    - Unread inbound correspondence from IA / EA
 *    - System auto-derived a state change the Specialist hasn't ack'd
 *      (e.g. EA review window lapsed) */
export function caseNeedsSpecialistAttention(caseId: string): boolean {
  if (escalationNeedsSpecialistAction(caseId)) return true;
  if (caseHasUnreadInboundFromAuthority(caseId)) return true;
  if (caseHasUnacknowledgedAutoStateChange(caseId)) return true;
  return false;
}

/** "Needs RS / TS action" predicate — the composite pull-model filter.
 *  True when the active escalation is in any state requiring a
 *  Specialist follow-up:
 *    - InformationRequested / RedirectRequested  (attorney is waiting)
 *    - Reviewed                                  (decision drafted)
 *    - ApprovedForDelivery / ApprovedWithConditions / Blocked, and
 *      the RS has not yet acknowledged
 *  Composite condition: OR with unread inbound correspondence (from
 *  IA / EA) is applied at the call site since that read requires the
 *  correspondence notification hook. */
export function escalationNeedsSpecialistAction(caseId: string): boolean {
  const summary = getEscalationSummaryForCase(caseId);
  if (!summary) return false;
  switch (summary.status) {
    case "InformationRequested":
    case "RedirectRequested":
    case "Reviewed":
      return true;
    case "ApprovedForDelivery":
    case "ApprovedWithConditions":
    case "Blocked":
      return !summary.rsAcknowledgedAt;
    default:
      return false;
  }
}

/** "Unassigned" attorney escalation — case targeted at the Attorney
 *  role but no specific assignee set. Drives the Attorney Dashboard's
 *  "Unassigned" quick filter (Gap 2). Terminal statuses excluded. */
export function isUnassignedAttorneyEscalation(caseId: string): boolean {
  const esc = getCaseFormDataById(caseId)?.attorneyEscalation;
  if (!esc) return false;
  if (esc.role !== "Attorney") return false;
  if (esc.assignedAttorneyId) return false;
  return (
    esc.status === "Pending" ||
    esc.status === "InformationRequested" ||
    esc.status === "Blocked"
  );
}

// ---------------------------------------------------------------------------
// Pending action items — derived bullet-point list of outstanding
// attorney decisions on a case. Drives the Attorney Dashboard's
// preview pane content (Gap 4). Order is "most urgent first" so the
// pane reads as a triage checklist.
// ---------------------------------------------------------------------------

export type PendingActionKind =
  | "decision"
  | "correspondence-out"
  | "correspondence-in"
  | "conditions";

export type PendingActionSeverity = "critical" | "warning" | "info";

export interface PendingAction {
  kind: PendingActionKind;
  label: string;
  severity: PendingActionSeverity;
}

export function pendingAttorneyActionsForCase(
  caseId: string,
): PendingAction[] {
  try {
    return computePendingAttorneyActions(caseId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      "[pendingAttorneyActionsForCase] failed for",
      caseId,
      err,
    );
    return [];
  }
}

function computePendingAttorneyActions(caseId: string): PendingAction[] {
  const formData = getCaseFormDataById(caseId);
  if (!formData) return [];
  const actions: PendingAction[] = [];
  const esc = getActiveAttorneyEscalation(formData);

  // 1. Outstanding decision on the escalation itself.
  if (esc?.status === "Pending") {
    actions.push({
      kind: "decision",
      label:
        "Decide: Release · Approve with Conditions · Request More Information · Block",
      severity: "critical",
    });
  } else if (esc?.status === "InformationRequested") {
    actions.push({
      kind: "decision",
      label: "Waiting on Specialist to reply — no attorney action needed yet",
      severity: "info",
    });
  } else if (esc?.status === "Blocked") {
    actions.push({
      kind: "decision",
      label:
        "Re-evaluate Block — the Specialist may have addressed your concerns",
      severity: "warning",
    });
  } else if (esc?.status === "ApprovedWithConditions") {
    actions.push({
      kind: "conditions",
      label:
        "Approved with Conditions — Specialist acknowledgement still pending",
      severity: "info",
    });
  }

  // 2. Held outbounds — drafts pending attorney release. Read from
  //    `attorneyEscalation.relatedOutboundIds` when set (the most
  //    accurate source); fall back to scanning correspondence by the
  //    `pendingAttorneyReview` flag if not.
  const held = (formData.correspondence ?? []).filter(
    (it) =>
      it.direction === "Outbound" &&
      it.transmission.pendingAttorneyReview === true,
  );
  if (held.length > 0) {
    actions.push({
      kind: "correspondence-out",
      label: `${held.length} outbound message${held.length === 1 ? "" : "s"} held for your release`,
      severity: "warning",
    });
  }

  // 3. Inbound items on the active escalation that haven't been read.
  //    Only surface when the escalation is non-terminal.
  const escIsActive =
    esc?.status === "Pending" ||
    esc?.status === "InformationRequested" ||
    esc?.status === "Blocked";
  if (escIsActive) {
    const inboundUnread = (formData.correspondence ?? []).filter(
      (it) => it.direction === "Inbound" && !(it as any).readAt,
    );
    if (inboundUnread.length > 0) {
      actions.push({
        kind: "correspondence-in",
        label: `${inboundUnread.length} authority correspondence item${inboundUnread.length === 1 ? "" : "s"} to review`,
        severity: "info",
      });
    }
  }

  return actions;
}
