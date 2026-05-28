/**
 * groundsForRefusal — read-side helpers for the EU eEvidence GFR feature.
 *
 * All helpers are pure functions over FormData. Tied to the GFR Panel
 * (Case Overview), the queue-card badges, the sticky-header chip, and
 * delivery gates in CollectionTracker.
 *
 * Render gate: the GFR Panel is only rendered when `gfrApplies(formData)`
 * is true — i.e. the case is on an EA-leg workflow (Appendix F 2 /
 * 5-international / 6) AND not withdrawn.
 *
 * SLA model (per RS guidance 2026-05-21):
 *   - Pre-decision EA review → SLA ticks normally; `eaReviewWindowExpiresAt`
 *     is operational tracking only, not SLA-driving.
 *   - Full decision      → case SLA pauses entirely.
 *   - Partial decision   → case SLA continues; block scoped to LDTask IDs.
 *   - None decision      → no SLA change.
 *   - Window lapsed      → SLA still ticking; RS decides next step.
 */

import type {
  FormData,
  EEvidenceGroundsForRefusal,
  GfrDecisionPayload,
} from "../types/caseTypes";
import { getActiveAttorneyEscalation } from "./caseEscalation";

// ─── Render gate ─────────────────────────────────────────────────────────────

/** True when the GFR Panel + chip + queue badge should render for this
 *  case. Per Appendix F: panel only applies to Workflows 2 + 5-international
 *  + 6, and only when the case has not been withdrawn / cancelled.
 *
 *  Withdrawal supersedes GFR (Appendix F Workflow 8). The IA can
 *  withdraw the EPOC at any point; on withdrawal the SP must cancel
 *  delivery and start the 45-day retention clock. The GFR Panel —
 *  along with its delivery gates — must defer to that terminal state.
 */
export function gfrApplies(formData: FormData | undefined | null): boolean {
  if (!formData) return false;
  if (formData.requestType !== "eEvidence") return false;
  // Workflow 8 supersession — driven either by the LE-set
  // authorizationDesiredStatus envelope field OR by a terminal
  // caseStage. Either path hides the GFR Panel + lifts its gates.
  if (
    formData.authorizationDesiredStatus === "Withdrawn" ||
    formData.authorizationDesiredStatus === "Cancelled" ||
    formData.caseStage === "Withdrawn" ||
    formData.caseStage === "Cancelled"
  ) {
    return false;
  }
  const wf = formData.eevidenceWorkflow;
  if (wf === undefined) return false;
  if (wf === 2) return true;
  if (wf === 5 && formData.isInternational === true) return true;
  if (wf === 6) return true;
  return false;
}

// ─── Decision accessors ──────────────────────────────────────────────────────

/** Returns the EA's current decision payload (tagged union per ETSI
 *  5.5.4/5/6) or undefined while the EA is still reviewing. */
export function currentDecision(
  formData: FormData | undefined | null,
): GfrDecisionPayload | undefined {
  return formData?.eevidenceGroundsForRefusal?.decision;
}

/** Convenience accessor for the whole GFR block. Returns undefined if
 *  the case has no GFR record (covers both not-yet-notified cases and
 *  non-applicable workflows). */
export function gfrBlock(
  formData: FormData | undefined | null,
): EEvidenceGroundsForRefusal | undefined {
  return formData?.eevidenceGroundsForRefusal;
}

/** Returns the trigger ("Form1Review" | "Form3Response") for the active
 *  GFR record, or undefined if no GFR block exists. */
export function gfrTrigger(
  formData: FormData | undefined | null,
): EEvidenceGroundsForRefusal["trigger"] | undefined {
  return formData?.eevidenceGroundsForRefusal?.trigger;
}

// ─── 10-day operational countdown (NOT SLA-driving) ──────────────────────────

/** Calendar days remaining in the EA's 10-day review window. Negative
 *  if the window has lapsed. Returns undefined if no GFR block exists
 *  or the EA has already decided (window is moot). */
export function daysLeftEaReview(
  formData: FormData | undefined | null,
  now: Date = new Date(),
): number | undefined {
  const block = gfrBlock(formData);
  if (!block) return undefined;
  if (block.decision) return undefined;
  const expires = new Date(block.eaReviewWindowExpiresAt).getTime();
  const ms = expires - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** True once the 10-day EA review window has passed without a decision.
 *  Mirrors the `windowLapsed` flag once it's been auto-set by the
 *  day-10 useEffect, OR computes it on-the-fly if the flag hasn't been
 *  written yet (so first-time-rendered lapsed cases still surface
 *  the warning). */
export function isWindowLapsed(
  formData: FormData | undefined | null,
  now: Date = new Date(),
): boolean {
  const block = gfrBlock(formData);
  if (!block) return false;
  if (block.decision) return false;
  if (block.windowLapsed) return true;
  return new Date(block.eaReviewWindowExpiresAt).getTime() < now.getTime();
}

// ─── Hold + delivery gating ──────────────────────────────────────────────────

/** True when the case is currently on a Full GFR hold (entire delivery
 *  blocked). Partial GFR is NOT a case-level hold — use
 *  `identifierBlockedByPartialGfr` for per-identifier checks. */
export function isCaseOnFullGfrHold(
  formData: FormData | undefined | null,
): boolean {
  return currentDecision(formData)?.kind === "Full";
}

/** True when delivery is gated for the whole case. Composite of:
 *   - Full GFR active
 *   - Window lapsed AND no manual resume yet
 *  For Partial GFR, returns false (case-level delivery allowed; use
 *  the per-identifier helper to gate individual rows). */
export function canDeliver(
  formData: FormData | undefined | null,
): boolean {
  if (!formData) return true;
  if (!gfrApplies(formData)) return true;
  const block = gfrBlock(formData);
  if (!block) return true;
  if (isCaseOnFullGfrHold(formData)) return false;
  if (isWindowLapsed(formData) && !block.manualDeliveryResumed) return false;
  return true;
}

// ─── Form 3 (Workflow 7) ↔ GFR (Workflow 6) interaction ─────────────────

/** True when the active GFR is the EA's rejection of an SP-submitted
 *  Form 3 (trigger === Form3Response, decision === None). */
export function isForm3RejectedByEa(
  formData: FormData | undefined | null,
): boolean {
  const block = gfrBlock(formData);
  if (!block) return false;
  if (block.trigger !== "Form3Response") return false;
  return block.decision?.kind === "None";
}

/** True when the Specialist has already retracted the Form 3 via the
 *  Phase D confirm dialog (form3RetractedAt is set). */
export function isForm3Retracted(
  formData: FormData | undefined | null,
): boolean {
  return Boolean(formData?.eevidenceGroundsForRefusal?.form3RetractedAt);
}

/** Phase D gate: the Specialist can retract the Form 3 only when
 *   1. The EA has rejected the Form 3 (Form3Response + None)
 *   2. The retract hasn't already happened
 *   3. Either no attorney escalation is open, OR the attorney has
 *      explicitly released the hold (status === "ApprovedForDelivery").
 *
 *  In LNS-2026-00265 the EA rejection auto-creates a Pending attorney
 *  escalation. The RS can't retract until the attorney releases — a
 *  retract → production move when the SP previously claimed
 *  third-country conflict is a legal call, not an RS call. */
export function canRetractForm3(
  formData: FormData | undefined | null,
): boolean {
  if (!formData) return false;
  if (!isForm3RejectedByEa(formData)) return false;
  if (isForm3Retracted(formData)) return false;
  const att = getActiveAttorneyEscalation(formData);
  if (!att) return true;
  return att.status === "ApprovedForDelivery";
}

/** Human-readable reason the Retract button is disabled. Returns
 *  undefined when retract is allowed (caller renders the action). */
export function retractGateReason(
  formData: FormData | undefined | null,
): string | undefined {
  if (!formData) return undefined;
  if (!isForm3RejectedByEa(formData)) return undefined;
  if (isForm3Retracted(formData)) return undefined;
  const att = getActiveAttorneyEscalation(formData);
  if (!att) return undefined;
  switch (att.status) {
    case "Pending":
      return "Attorney review required before retraction (auto-escalated on EA rejection).";
    case "InformationRequested":
      return "Attorney has requested more information — respond before retraction.";
    case "Blocked":
      return "Attorney has blocked retraction. See the Attorney Review panel for next steps.";
    default:
      return undefined;
  }
}

/** Returns the LDTask IDs blocked by an active Partial GFR. Empty
 *  array when the decision isn't Partial. */
export function blockedIdentifierIds(
  formData: FormData | undefined | null,
): string[] {
  const dec = currentDecision(formData);
  if (dec?.kind !== "Partial") return [];
  return dec.blockedTaskObjectIds;
}

/** True when the supplied `AccountIdentifier.taskId` is one of the
 *  LDTask IDs blocked by a Partial GFR. Used by CollectionTracker to
 *  cascade row-level greying. */
export function identifierBlockedByPartialGfr(
  formData: FormData | undefined | null,
  taskId: string,
): boolean {
  return blockedIdentifierIds(formData).includes(taskId);
}

// ─── Sticky-header chip metadata ─────────────────────────────────────────────

export interface GfrChipMeta {
  /** Short label shown in the sticky-header chip. */
  label: string;
  /** Hover tooltip elaborating the label. */
  tooltip: string;
  /** Visual tone — picks colour scheme. */
  tone: "danger" | "warn" | "amber" | "success" | "info";
}

/** Returns the sticky-header chip metadata for the active GFR state,
 *  or undefined when no chip should render. Composes alongside the
 *  existing SLA / attorney-escalation chips. */
export function gfrChipMeta(
  formData: FormData | undefined | null,
): GfrChipMeta | undefined {
  if (!gfrApplies(formData)) return undefined;
  const block = gfrBlock(formData);
  if (!block) return undefined;

  const dec = block.decision;
  const trigger = block.trigger;

  // No decision yet: show operational countdown unless lapsed.
  if (!dec) {
    if (isWindowLapsed(formData)) {
      // Differentiated copy depending on whether the RS has resumed
      // delivery yet. Pre-resume: "expired — manual resume required".
      // Post-resume: "expired — delivery resumed manually".
      if (block.manualDeliveryResumed) {
        return {
          label: "EA window lapsed · delivery resumed",
          tooltip:
            "EA review window expired with no decision. Delivery was " +
            "resumed manually (Art. 8 + 10(2), EU Reg. 2023/1543).",
          tone: "success",
        };
      }
      return {
        label: "EA window lapsed · resume delivery",
        tooltip:
          "The 10-day EA review window expired with no decision. Lapse is NOT approval — click Resume Delivery in the GFR panel to proceed.",
        tone: "warn",
      };
    }
    const days = daysLeftEaReview(formData);
    return {
      label: `EA REVIEW WINDOW · ${days ?? "—"}d`,
      tooltip:
        trigger === "Form3Response"
          ? "EA is reviewing the SP's Form 3. Publish + Deliver actions are blocked until the EA decides or the window lapses. Operational countdown only — SLA continues."
          : "EA is reviewing the EPOC. Publish + Deliver actions are blocked until the EA decides or the window lapses. Operational countdown only — SLA continues.",
      tone: "info",
    };
  }

  switch (dec.kind) {
    case "Full":
      // Merged composition per Phase D Q&A: a single chip carries
      // both the SLA-paused state AND the GFR reason, instead of
      // two separate chips. The Full decision implies SLA is paused
      // (Appendix F Workflow 6).
      return {
        label: "SLA paused · EA Hold — Full",
        tooltip:
          trigger === "Form3Response"
            ? "EA backed the SP's Form 3 refusal — case effectively closed. Case SLA paused."
            : "EA blocked the entire EPOC. Delivery suspended; case SLA paused.",
        tone: "danger",
      };
    case "Partial":
      return {
        label: `Partial GFR — ${dec.blockedTaskObjectIds.length} task(s) blocked`,
        tooltip:
          "EA blocked some target identifiers; non-listed identifiers may proceed normally.",
        tone: "amber",
      };
    case "None":
      return trigger === "Form3Response"
        ? {
            label: "EA rejected Form 3",
            tooltip:
              "EA rejected the SP's Form 3 non-execution claim — production required. Retract Form 3 to proceed.",
            tone: "warn",
          }
        : {
            label: "EA cleared",
            tooltip:
              "EA confirmed there are no grounds for refusal. Production may proceed.",
            tone: "success",
          };
  }
}
