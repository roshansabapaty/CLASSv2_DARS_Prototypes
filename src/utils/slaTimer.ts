/**
 * SLA timer helpers — used by the attorney-escalation flow.
 *
 *  - `pauseSlaTimerOnFormThreeSubmission(formData)` halts the case's SLA
 *    countdown when the Specialist sends EPOC Form 3 — Non-Execution
 *    Response. Implementation: sets `slaPausedAt` to the current time
 *    + appends an `SLAStopped` audit event. Crucially, `dueDate` is
 *    PRESERVED so the chip can still render the intended deadline
 *    alongside the "SLA paused" pill — and so the deadline survives a
 *    later resume.
 *  - `isSlaPaused(formData)` reads `slaPausedAt`; used by the SLA chip
 *    to decide whether to render the paused-alongside-countdown layout.
 *  - `isCaseSlaPausedById(caseId)` is the queue-side variant; reads the
 *    central registry so the case list can light up the paused pill
 *    without hand-set queue flags.
 */

import type { EscalationAuditEvent, FormData } from "../types/caseTypes";
import { CURRENT_USER } from "../constants/caseConstants";
import { getCaseFormDataById } from "./caseDataRegistry";

/** Legacy sentinel kept exported for any code that still imports it. New
 *  callers must use `slaPausedAt` on FormData. The sentinel was a Date at
 *  the Unix epoch; pause state is now tracked via the dedicated field. */
export const SLA_PAUSED_SENTINEL = new Date(0);

/** True when the case's SLA is paused. Accepts either the full FormData
 *  or — for the queue chip's plain-Date input — a `Date | undefined`. The
 *  Date-only signature is preserved for backwards compatibility with the
 *  earlier sentinel-based contract; it now returns true only when given
 *  the legacy sentinel value. */
export function isSlaPaused(input: FormData | Date | undefined): boolean {
  if (!input) return false;
  if (input instanceof Date) {
    return input.getTime() === SLA_PAUSED_SENTINEL.getTime();
  }
  return Boolean(input.slaPausedAt);
}

/** Returns a NEW FormData with the SLA timer paused + the audit event
 *  appended. Caller is responsible for calling `setFormData` with the
 *  returned object. Idempotent — calling it twice doesn't append a second
 *  audit event if the SLA is already paused. */
export function pauseSlaTimerOnFormThreeSubmission(
  formData: FormData,
): FormData {
  if (formData.slaPausedAt) return formData;

  const now = new Date();
  const auditEvent: EscalationAuditEvent = {
    id: `audit-sla-${Date.now().toString(36)}`,
    kind: "SLAStopped",
    actor: CURRENT_USER,
    performedAt: now,
    note: "SLA countdown halted by Form 3 — Non-Execution Response submission.",
  };

  return {
    ...formData,
    slaPausedAt: now,
    escalationAuditEvents: [
      ...(formData.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}

/** Queue-side variant: derives the paused state for a `caseId` by reading
 *  the central registry. Lets the case list render the "SLA paused" pill
 *  alongside the countdown without each MOCK_CASES row needing a static
 *  flag in sync with the case-form data. */
export function isCaseSlaPausedById(caseId: string): boolean {
  return isSlaPaused(getCaseFormDataById(caseId));
}

/** Manual pause invoked by the Specialist from the case header. Same
 *  semantics as `pauseSlaTimerOnFormThreeSubmission` but the audit note
 *  is generic (no Form 3 reference) and the actor/reason are optional
 *  inputs so the caller can pass a custom note. Idempotent — calling
 *  while already paused returns the existing FormData unchanged. */
export function pauseSlaTimerManually(
  formData: FormData,
  options?: { actor?: string; note?: string },
): FormData {
  if (formData.slaPausedAt) return formData;

  const now = new Date();
  const auditEvent: EscalationAuditEvent = {
    id: `audit-sla-${Date.now().toString(36)}`,
    kind: "SLAStopped",
    actor: options?.actor ?? CURRENT_USER,
    performedAt: now,
    note:
      options?.note ?? "SLA countdown paused manually by the Specialist.",
  };

  return {
    ...formData,
    slaPausedAt: now,
    escalationAuditEvents: [
      ...(formData.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}

/** Resume a paused SLA. Clears `slaPausedAt` and appends an `SLAResumed`
 *  audit event so the AuditThread shows the lifecycle. Idempotent —
 *  calling while not paused returns the existing FormData unchanged. */
export function resumeSlaTimer(
  formData: FormData,
  options?: { actor?: string; note?: string },
): FormData {
  if (!formData.slaPausedAt) return formData;

  const now = new Date();
  const auditEvent: EscalationAuditEvent = {
    id: `audit-sla-${Date.now().toString(36)}`,
    kind: "SLAResumed",
    actor: options?.actor ?? CURRENT_USER,
    performedAt: now,
    note: options?.note ?? "SLA countdown resumed by the Specialist.",
  };

  return {
    ...formData,
    slaPausedAt: undefined,
    escalationAuditEvents: [
      ...(formData.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}
