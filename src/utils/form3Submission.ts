/**
 * Form 3 (EPOC Non-Execution Response) submission side-effects.
 *
 * Called from the correspondence send path whenever an outbound carrying
 * the EPOC_FORM_3 template is sent. Applies two case-state mutations
 * that universally follow a Form 3 send:
 *
 *   1. Appends a `Form3Submitted` audit event so the audit thread
 *      captures the workflow trigger (separate from the SLA pause's
 *      `SLAStopped` event, which is a side-effect).
 *   2. Starts the 45-day retention clock with reason
 *      "Form3NonExecution". Applies regardless of whether the case is
 *      preservation (EPOC-PR) or production (EPOC-ER) — both require
 *      45-day deletion of any held data when the SP refuses execution.
 *
 * Both writes are idempotent: re-calling on a case that already has
 * the audit event + clock returns the FormData unchanged. Idempotency
 * keys: the outbound's `documentId` for the audit, and the existing
 * retention-clock presence check inside `startRetentionClock`.
 */

import { CURRENT_USER } from "../constants/caseConstants";
import type {
  EscalationAuditEvent,
  FormData,
} from "../types/caseTypes";
import { startRetentionClock } from "./retentionClock";

interface ApplyForm3SubmissionArgs {
  /** Stable identifier for the sent Form 3 — ideally the outbound's
   *  `documentId`, falling back to `outbound:${item.id}` so the audit
   *  event can dedupe re-renders / re-mounts. */
  documentId: string;
  /** When the Form 3 was actually sent. Anchors the retention clock
   *  and the audit event timestamp. */
  sentAt: Date;
  /** Free-text source attribution (e.g. "Form 3 doc MS-LNS-2026-00255-OUT-04").
   *  Surfaced on the retention-clock chip tooltip. */
  source?: string;
}

/** Apply the universal Form 3 send side-effects. Returns the updated
 *  FormData. Caller passes the result to `setFormData`. */
export function applyForm3Submission(
  formData: FormData,
  { documentId, sentAt, source }: ApplyForm3SubmissionArgs,
): FormData {
  const events = formData.escalationAuditEvents ?? [];
  const alreadyAudited = events.some(
    (ev) => ev.kind === "Form3Submitted" && ev.documentId === documentId,
  );

  // Idempotent retention-clock start (helper preserves original startedAt
  // when a clock is already present).
  const sourceLabel = source ?? `Form 3 doc ${documentId}`;
  const withClock = startRetentionClock(
    formData,
    "Form3NonExecution",
    sourceLabel,
    sentAt,
  );

  if (alreadyAudited) return withClock;

  const auditEvent: EscalationAuditEvent = {
    id: `audit-form3-sent-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    kind: "Form3Submitted",
    actor: CURRENT_USER,
    actorRole: "ResponseSpecialist",
    performedAt: sentAt,
    note:
      "Form 3 — Non-Execution Response sent to the Issuing Authority. " +
      "45-day retention clock started; held data must be deleted by " +
      `${new Date(sentAt.getTime() + 45 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)}.`,
    documentId,
  };

  return {
    ...withClock,
    escalationAuditEvents: [...(withClock.escalationAuditEvents ?? []), auditEvent],
  };
}
