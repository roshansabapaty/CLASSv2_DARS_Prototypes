/**
 * Workflow 8 — IA Withdrawal handler. Applied by `useInboundEventHandler`
 * when a Withdrawal inbound (POST /eevidence/withdrawal) lands.
 *
 * The IA may withdraw an EPOC at any point — preservation order,
 * production order, in-flight delivery, awaiting EA decision, anywhere.
 * The withdrawal supersedes every other workflow state. SP obligations
 * on receipt:
 *   - Cancel any pending delivery (both Started + Ready-to-deliver
 *     jobs — neither should reach the IA after withdrawal).
 *   - Start the 45-day retention clock for data deletion.
 *   - Flip the case to a terminal `Withdrawn` state.
 *   - Record the withdrawal in the audit trail.
 *
 * Structured payload contract (`structuredForm.values` keys):
 *   B_originalEpocReference   string — REQUIRED; the IA's EPOC ref
 *   C_effectiveDate           string (ISO-8601) — optional; anchors
 *                              the retention clock. Falls back to
 *                              `item.createdAt`.
 *   C_withdrawalReason        string — optional; surfaced in audit + banner
 *   issuingAuthorityName      string — optional; audit actor label
 */

import type {
  EscalationAuditEvent,
  FormData,
  AccountIdentifier,
  SubCategory,
  AdditionalJob,
} from "../types/caseTypes";
import type { InboundCorrespondenceItem } from "../types/correspondence";
import { startRetentionClock } from "./retentionClock";

interface WithdrawalPayload {
  effectiveDate: Date;
  originalEpocReference?: string;
  reason?: string;
  issuingAuthorityName?: string;
}

function deriveAuditDocumentId(item: InboundCorrespondenceItem): string {
  return item.documentId ?? `inbound:${item.id}`;
}

function alreadyApplied(
  events: EscalationAuditEvent[] | undefined,
  documentId: string,
): boolean {
  if (!events) return false;
  return events.some(
    (ev) => ev.kind === "EpocWithdrawn" && ev.documentId === documentId,
  );
}

export function parseWithdrawalPayload(
  item: InboundCorrespondenceItem,
): WithdrawalPayload {
  const values = (item.structuredForm?.values ?? {}) as Record<string, unknown>;
  const rawEffective =
    typeof values.C_effectiveDate === "string"
      ? values.C_effectiveDate
      : undefined;
  const effectiveDate = rawEffective
    ? new Date(rawEffective)
    : item.createdAt instanceof Date
      ? item.createdAt
      : new Date(item.createdAt);
  return {
    effectiveDate,
    originalEpocReference:
      typeof values.B_originalEpocReference === "string"
        ? values.B_originalEpocReference
        : undefined,
    reason:
      typeof values.C_withdrawalReason === "string"
        ? values.C_withdrawalReason
        : undefined,
    issuingAuthorityName:
      typeof values.issuingAuthorityName === "string"
        ? values.issuingAuthorityName
        : undefined,
  };
}

/** A delivery job is "pending" when the SP has scheduled or started
 *  delivery but the IA has not yet acknowledged. Cancelled = neither
 *  Complete nor Acknowledged AND the job had been queued or in-flight. */
function isPendingDelivery(status: string | undefined): boolean {
  return status === "Started" || status === "Failed";
}

/** A delivery job is "ready" when publish is complete but delivery
 *  hasn't been submitted yet — the RS would have clicked Submit-to-
 *  Delivery to send it. Withdrawal pre-empts that. */
function isReadyButNotSubmitted(
  publishStatus: string | undefined,
  deliveryStatus: string | undefined,
): boolean {
  if (publishStatus !== "Complete") return false;
  return !deliveryStatus || deliveryStatus === "Not Started";
}

/** Cancel pending + ready-but-not-submitted delivery jobs across all
 *  identifiers + additionalJobs. Returns the count of jobs flipped so
 *  the audit note can report it. */
function cancelPendingDelivery(
  identifiers: AccountIdentifier[],
  now: Date,
): { identifiers: AccountIdentifier[]; cancelledCount: number } {
  let cancelledCount = 0;
  const cancelDeliveryFields = {
    deliveryStatus: "Cancelled",
    deliveryStatusUpdatedAt: now.toISOString(),
  } as const;

  const nextIdentifiers = identifiers.map((ident) => {
    const services = ident.services ? { ...ident.services } : ident.services;
    if (!services) return ident;
    for (const serviceKey of Object.keys(services)) {
      const service = (services as Record<string, any>)[serviceKey];
      if (!service?.categoryGroups) continue;
      const nextGroups = { ...service.categoryGroups };
      let serviceTouched = false;
      for (const groupKey of Object.keys(nextGroups)) {
        const group = nextGroups[groupKey];
        if (!group || typeof group !== "object") continue;
        const nextGroup = { ...group };
        let groupTouched = false;
        for (const itemKey of Object.keys(nextGroup)) {
          const category = nextGroup[itemKey] as SubCategory | undefined;
          if (!category || typeof category !== "object" || !("enabled" in category))
            continue;
          if (!category.enabled) continue;
          const delStatus = category.deliveryStatus;
          const pubStatus = category.publishStatus;
          const shouldCancelMain =
            isPendingDelivery(delStatus) ||
            isReadyButNotSubmitted(pubStatus, delStatus);
          let mainPatch: Record<string, unknown> | null = null;
          if (shouldCancelMain) {
            mainPatch = { ...cancelDeliveryFields };
            cancelledCount++;
          }
          // Walk additionalJobs once, tracking how many we flipped so we
          // know whether the array reference actually needs to change.
          // `.map()` ALWAYS returns a fresh array, so the previous
          // `updatedAdditional === category.additionalJobs` check at this
          // site could never short-circuit — that triggered a deep clone
          // of every category in the case for nothing.
          let addCancelledThisCategory = 0;
          const updatedAdditional = (category.additionalJobs ?? []).map(
            (addJob: AdditionalJob) => {
              const shouldCancelAdd =
                isPendingDelivery(addJob.deliveryStatus) ||
                isReadyButNotSubmitted(
                  addJob.publishStatus,
                  addJob.deliveryStatus,
                );
              if (!shouldCancelAdd) return addJob;
              addCancelledThisCategory++;
              return { ...addJob, ...cancelDeliveryFields };
            },
          );
          cancelledCount += addCancelledThisCategory;
          if (!mainPatch && addCancelledThisCategory === 0) {
            continue;
          }
          nextGroup[itemKey] = {
            ...category,
            ...(mainPatch ?? {}),
            ...(addCancelledThisCategory > 0
              ? { additionalJobs: updatedAdditional }
              : {}),
          };
          groupTouched = true;
        }
        if (groupTouched) {
          nextGroups[groupKey] = nextGroup;
          serviceTouched = true;
        }
      }
      if (serviceTouched) {
        (services as Record<string, any>)[serviceKey] = {
          ...service,
          categoryGroups: nextGroups,
        };
      }
    }
    return { ...ident, services };
  });

  return { identifiers: nextIdentifiers, cancelledCount };
}

/** Apply the Workflow 8 withdrawal. Returns the updated FormData, or
 *  `null` when the inbound has already been processed. Idempotent
 *  across re-mounts via documentId attribution. */
export function applyWithdrawal(
  item: InboundCorrespondenceItem,
  formData: FormData,
): FormData | null {
  if (item.kind !== "Withdrawal") return null;
  const documentId = deriveAuditDocumentId(item);
  if (alreadyApplied(formData.escalationAuditEvents, documentId)) return null;

  const payload = parseWithdrawalPayload(item);

  // 1. Start the retention clock anchored to the IA's effective date.
  //    Idempotent — if a clock from a prior terminal event is already
  //    running, the original window is preserved.
  const sourceLabel =
    `EPOC withdrawal doc ${documentId}` +
    (payload.issuingAuthorityName ? ` from ${payload.issuingAuthorityName}` : "");
  let next = startRetentionClock(
    formData,
    "Withdrawal",
    sourceLabel,
    payload.effectiveDate,
  );

  // 2. Cancel pending + ready-to-deliver jobs across all identifiers.
  const cancellation = cancelPendingDelivery(
    next.identifiers ?? [],
    payload.effectiveDate,
  );

  // 3. Flip the case to a terminal Withdrawn state.
  const cancelledCount = cancellation.cancelledCount;
  const note =
    `IA withdrew the EPOC` +
    (payload.originalEpocReference ? ` (ref ${payload.originalEpocReference})` : "") +
    `, effective ${payload.effectiveDate.toISOString().slice(0, 10)}. ` +
    (cancelledCount > 0
      ? `Cancelled ${cancelledCount} pending delivery ` +
        `${cancelledCount === 1 ? "job" : "jobs"}. `
      : "") +
    `45-day retention window started; held data must be deleted by ` +
    `${new Date(payload.effectiveDate.getTime() + 45 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)}.` +
    (payload.reason ? ` Reason: ${payload.reason}` : "");

  const auditEvent: EscalationAuditEvent = {
    id: `audit-withdrawn-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    kind: "EpocWithdrawn",
    actor: payload.issuingAuthorityName ?? "Issuing Authority",
    performedAt: payload.effectiveDate,
    note,
    documentId,
  };

  next = {
    ...next,
    identifiers: cancellation.identifiers,
    // Case-level terminal state flags. The existing
    // `gfrApplies()` already short-circuits on either of these so
    // GFR Panel + delivery gates lift automatically.
    authorizationDesiredStatus: "Withdrawn",
    authorizationStatusUpdatedAt: payload.effectiveDate,
    authorizationStatusUpdatedBy: payload.issuingAuthorityName ?? "Issuing Authority",
    caseStage: "Withdrawn",
    escalationAuditEvents: [
      ...(next.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };

  return next;
}

/** Read-side: returns true when the case has been withdrawn by the IA.
 *  Detected via either an `EpocWithdrawn` audit event OR the terminal
 *  caseStage / authorizationDesiredStatus signal. The banner uses this
 *  to render the dedicated withdrawal surface. */
export function isCaseWithdrawn(formData: FormData | null | undefined): boolean {
  if (!formData) return false;
  if (
    formData.authorizationDesiredStatus === "Withdrawn" ||
    formData.caseStage === "Withdrawn"
  ) {
    return true;
  }
  const events = formData.escalationAuditEvents ?? [];
  return events.some((ev) => ev.kind === "EpocWithdrawn");
}
