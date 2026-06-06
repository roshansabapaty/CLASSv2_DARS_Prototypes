/**
 * Operational-badge filter definitions — drives the multi-select badge
 * filter on the Case Queue and Attorney Dashboard toolbars.
 *
 * Each entry maps a queue-card "operational badge" (rendered by
 * `CaseCardOperationalBadges`) to a stable filter ID, the icon + chip
 * styling that should appear in the popover preview, and a predicate
 * the filter uses to test cases.
 *
 * The badges deliberately mirror the chips users already see on the
 * queue cards / list rows, so the filter reads as "narrow to cases
 * that have *this* badge" rather than introducing a new vocabulary.
 */

import {
  Shield,
  AlertCircle,
  Building2,
  Cloud,
  Scale,
  Gavel,
  BellRing,
  HandHelping,
  type LucideIcon,
} from "lucide-react";
import type { CaseQueueItem } from "./case-queue-types";
import { isHighPriorityCrime } from "./case-queue-types";
import {
  caseHasActiveGfrHold,
  caseNeedsSpecialistAttention,
  escalationBadgeLabelForCase,
} from "../../utils/escalationHelpers";

export type OperationalBadgeId =
  | "threat-to-life"
  | "emergency-request"
  | "enterprise"
  | "azure"
  | "gfr-hold"
  | "internal-escalation"
  | "needs-my-action"
  | "ndo-reminder";

export interface OperationalBadgeDef {
  id: OperationalBadgeId;
  /** Short label rendered in the popover row. */
  label: string;
  /** One-line tooltip / helper text explaining what the badge means. */
  description: string;
  icon: LucideIcon;
  /** Tailwind classes for the chip preview in the popover row, so the
   *  user sees the same visual chip they'd spot on the case card. */
  chipClasses: string;
  /** Returns true when the case currently displays this badge. */
  predicate: (c: CaseQueueItem) => boolean;
}

export const OPERATIONAL_BADGES: OperationalBadgeDef[] = [
  {
    id: "threat-to-life",
    label: "Threat to life",
    description:
      "Case is flagged as a Threat to Life or carries a high-priority crime (CSE, terrorism, kidnapping, human trafficking).",
    icon: Shield,
    chipClasses: "bg-red-50 text-red-700 border-red-300",
    predicate: (c) =>
      c.isThreatToLife === true ||
      c.natureOfCrime.some((crime) => isHighPriorityCrime(crime)),
  },
  {
    id: "emergency-request",
    label: "Emergency request",
    description:
      "Request type is Emergency Request or Emergency Disclosure — separate from the SLA Priority tier.",
    icon: AlertCircle,
    chipClasses: "bg-amber-50 text-amber-700 border-amber-300",
    predicate: (c) =>
      c.requestType === "Emergency Request" ||
      c.requestType === "Emergency Disclosure",
  },
  {
    id: "enterprise",
    label: "Enterprise account",
    description:
      "Check Accounts has resolved an Enterprise tenant on at least one identifier. Requires the case has been checked.",
    icon: Building2,
    chipClasses: "bg-purple-50 text-purple-700 border-purple-300",
    predicate: (c) =>
      Boolean(c.accountExistenceChecked && c.hasEnterpriseAccounts),
  },
  {
    id: "azure",
    label: "Azure service",
    description:
      "Azure is one of the services the issuing authority requested on this case.",
    icon: Cloud,
    chipClasses: "bg-sky-50 text-sky-700 border-sky-300",
    predicate: (c) => c.servicesRequested.includes("Azure"),
  },
  {
    id: "gfr-hold",
    label: "On GFR hold",
    description:
      "EU eEvidence Grounds for Refusal is in an actionable state — Full, Partial, Reviewing, Lapsed, or Form3-reject.",
    icon: Gavel,
    chipClasses: "bg-red-50 text-red-700 border-red-300",
    predicate: (c) => caseHasActiveGfrHold(c.caseId),
  },
  {
    id: "internal-escalation",
    label: "Internal escalation",
    description:
      "Case has an active SP-side escalation (Attorney / Peer / LENS Lead) — not the LE-side escalatedToLE flag.",
    icon: Scale,
    chipClasses: "bg-[#f3f0fa] text-[#5c2d91] border-[#8764b8]/40",
    predicate: (c) => Boolean(escalationBadgeLabelForCase(c.caseId)),
  },
  {
    id: "needs-my-action",
    label: "Needs my action",
    description:
      "Pull-model filter — the attorney has done something on this case that needs an RS / TS follow-up: requested more info, requested redirect, marked the case reviewed, completed the escalation (pending acknowledgement), OR there's unread inbound correspondence from the IA / EA waiting to be triaged.",
    icon: HandHelping,
    chipClasses: "bg-[#fff4e6] text-[#7a3a00] border-[#ca5010]/40",
    predicate: (c) => caseNeedsSpecialistAttention(c.caseId),
  },
  {
    id: "ndo-reminder",
    label: "NDO reminder",
    description:
      "Temporary Non-Disclosure Order has a scheduled reminder so the RS re-checks the NDO's status before it expires.",
    icon: BellRing,
    chipClasses: "bg-[#fff4ce] text-[#7a4f00] border-[#a26a00]/40",
    predicate: (c) => !!c.nextNdoReminderAt,
  },
];

export type BadgeMatchMode = "any" | "all";

export interface BadgeFilterState {
  selected: Set<OperationalBadgeId>;
  mode: BadgeMatchMode;
}

export const EMPTY_BADGE_FILTER: BadgeFilterState = {
  selected: new Set(),
  mode: "any",
};

/** Apply the badge filter to a single case. When no badges are
 *  selected, every case passes. With selections, "any" matches cases
 *  that satisfy *any* selected badge's predicate; "all" requires every
 *  selected badge to match. */
export function caseMatchesBadgeFilter(
  c: CaseQueueItem,
  state: BadgeFilterState,
): boolean {
  if (state.selected.size === 0) return true;
  const predicates = OPERATIONAL_BADGES.filter((b) => state.selected.has(b.id))
    .map((b) => b.predicate);
  if (state.mode === "all") return predicates.every((p) => p(c));
  return predicates.some((p) => p(c));
}
