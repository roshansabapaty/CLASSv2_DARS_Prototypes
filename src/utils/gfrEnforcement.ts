/**
 * GFR enforcement — RS/TS-initiated block on a Full or Partial GFR.
 *
 * Receipt of a GFR is informational; the EA's decision does not
 * automatically gate delivery. The RS/TS reads the panel, optionally
 * confers with attorney/legal, and clicks "Block Delivery" to enforce.
 * That click is captured here:
 *   - sets `eevidenceGroundsForRefusal.enforcementApplied = true`
 *   - stamps `enforcementAppliedAt` / `enforcementAppliedBy`
 *   - records a `GfrEnforced` audit event with the user's rationale
 *
 * Idempotent — a second click after enforcement is in effect is a no-op
 * (no duplicate audit). The reverse action (releasing the enforcement
 * back to proceed-anyway) is deliberately not modelled here; it would
 * be a separate workflow with its own audit semantics.
 */

import { CURRENT_USER } from "../constants/caseConstants";
import type {
  EscalationAuditEvent,
  FormData,
} from "../types/caseTypes";
import { currentDecision, gfrBlock } from "./groundsForRefusal";

interface ApplyGfrEnforcementArgs {
  /** Optional free-text rationale captured from the RS. Surfaced on the
   *  audit event note + persisted on `enforcementNote`. */
  note?: string;
  /** Override for the timestamp / actor. Both default to `new Date()`
   *  and `CURRENT_USER`. */
  now?: Date;
  actor?: string;
}

/** Apply the user's choice to enforce the EA's GFR by blocking delivery.
 *  Idempotent: returns the same FormData when enforcement is already in
 *  effect. */
export function applyGfrEnforcement(
  formData: FormData,
  args: ApplyGfrEnforcementArgs = {},
): FormData {
  const block = gfrBlock(formData);
  if (!block) return formData;
  if (block.enforcementApplied) return formData;

  const decision = currentDecision(formData);
  const decisionKind = decision?.kind ?? "Unknown";
  const decidedAt = args.now ?? new Date();
  const actor = args.actor ?? CURRENT_USER;

  // Build an audit note that explicitly names the scope of the block
  // so the trail captures what was enforced — not just that enforcement
  // happened.
  const scopeLabel =
    decision?.kind === "Partial"
      ? `${decision.blockedTaskObjectIds.length} target identifier${
          decision.blockedTaskObjectIds.length === 1 ? "" : "s"
        }`
      : "case-wide";
  const auditNote =
    `RS blocked delivery in response to ${decisionKind} GFR (` +
    `scope: ${scopeLabel}).` +
    (args.note ? ` Rationale: ${args.note}` : "");

  const auditEvent: EscalationAuditEvent = {
    id: `audit-gfr-enforced-${decidedAt.getTime().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    kind: "GfrEnforced",
    actor,
    actorRole: "ResponseSpecialist",
    performedAt: decidedAt,
    note: auditNote,
  };

  return {
    ...formData,
    eevidenceGroundsForRefusal: {
      ...block,
      enforcementApplied: true,
      enforcementAppliedAt: decidedAt,
      enforcementAppliedBy: actor,
      enforcementNote: args.note,
    },
    escalationAuditEvents: [
      ...(formData.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}

interface ReleaseGfrEnforcementArgs {
  /** Optional rationale captured from the RS — e.g. "Clicked Block Delivery
   *  by accident" or "Attorney advised proceeding despite the EA's
   *  decision". Surfaced on the release audit event note. */
  note?: string;
  now?: Date;
  actor?: string;
}

/** Reverse a prior `applyGfrEnforcement`. Clears `enforcementApplied`
 *  and the related stamps, appends a `GfrEnforcementReleased` audit
 *  event. Idempotent — calling when no enforcement is in effect is a
 *  no-op and returns the same FormData reference.
 *
 *  The original `GfrEnforced` audit event stays in the log — releases
 *  add a new event rather than rewriting history, so the trail shows
 *  both the original block and the subsequent release. */
export function releaseGfrEnforcement(
  formData: FormData,
  args: ReleaseGfrEnforcementArgs = {},
): FormData {
  const block = gfrBlock(formData);
  if (!block) return formData;
  if (!block.enforcementApplied) return formData;

  const decision = currentDecision(formData);
  const decisionKind = decision?.kind ?? "Unknown";
  const decidedAt = args.now ?? new Date();
  const actor = args.actor ?? CURRENT_USER;

  const auditNote =
    `RS released the prior GFR enforcement ` +
    `(${decisionKind} GFR; original block by ` +
    `${block.enforcementAppliedBy ?? "Unknown"}).` +
    (args.note ? ` Rationale: ${args.note}` : "");

  const auditEvent: EscalationAuditEvent = {
    id: `audit-gfr-released-${decidedAt.getTime().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    kind: "GfrEnforcementReleased",
    actor,
    actorRole: "ResponseSpecialist",
    performedAt: decidedAt,
    note: auditNote,
  };

  // Clear the enforcement stamp fields. We intentionally drop them
  // (not just flip `enforcementApplied`) so a future re-enforcement
  // gets fresh timestamps rather than carrying stale ones.
  const {
    enforcementApplied: _drop1,
    enforcementAppliedAt: _drop2,
    enforcementAppliedBy: _drop3,
    enforcementNote: _drop4,
    ...blockWithoutEnforcement
  } = block;

  return {
    ...formData,
    eevidenceGroundsForRefusal: blockWithoutEnforcement,
    escalationAuditEvents: [
      ...(formData.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}
