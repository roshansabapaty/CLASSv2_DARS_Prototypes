/**
 * EndPreservation handler — pure FormData mutation applied by
 * `useInboundEventHandler` when an EndPreservation inbound lands.
 *
 * Per the spec, the IA may end the preservation obligation on an
 * existing EPOC-PR by posting to the WISP endpoint
 * `/eevidence/endpreservation`. From the end date forward, the SP
 * enters the 45-day deletion window (Reg 2023/1543) — at the end of
 * which the held data must be deleted.
 *
 * Effect on the case:
 *   - `formData.retentionClock` is started with `reason =
 *     "PreservationEnded"` anchored to the IA's stated end date (or
 *     the inbound's `createdAt` as fallback). The RetentionClockChip
 *     in StickyCaseHeader picks it up automatically.
 *   - An `PreservationEnded` audit event is appended with the source
 *     documentId for idempotency.
 *
 * Structured payload contract (`structuredForm.values` keys):
 *   preservationEndDate    string (ISO-8601 date) — optional; the
 *                            IA-supplied end date. Falls back to the
 *                            inbound's `createdAt` when absent.
 *   endReason              string                 — optional; surfaced
 *                            in the audit-event note and banner.
 *   issuingAuthorityName   string                 — optional; used as
 *                            the audit-event actor label.
 */

import type {
  EscalationAuditEvent,
  FormData,
} from "../types/caseTypes";
import type { InboundCorrespondenceItem } from "../types/correspondence";
import { startRetentionClock } from "./retentionClock";

interface EndPreservationPayload {
  endDate: Date;
  reason?: string;
  issuingAuthorityName?: string;
}

/** Read the typed payload from the inbound's structured form. The
 *  `preservationEndDate` is optional — falls back to `createdAt`. */
export function parseEndPreservationPayload(
  item: InboundCorrespondenceItem,
): EndPreservationPayload {
  const values = (item.structuredForm?.values ?? {}) as Record<string, unknown>;
  const rawEnd = typeof values.preservationEndDate === "string"
    ? values.preservationEndDate
    : undefined;
  const endDate = rawEnd ? new Date(rawEnd) : (
    item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt)
  );
  const reason = typeof values.endReason === "string" ? values.endReason : undefined;
  const issuingAuthorityName =
    typeof values.issuingAuthorityName === "string"
      ? values.issuingAuthorityName
      : undefined;
  return { endDate, reason, issuingAuthorityName };
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
    (ev) => ev.kind === "PreservationEnded" && ev.documentId === documentId,
  );
}

/** Apply the EndPreservation event. Returns the updated FormData, or
 *  `null` when the inbound has already been applied. Idempotent across
 *  re-mounts via documentId attribution. */
export function applyEndPreservation(
  item: InboundCorrespondenceItem,
  formData: FormData,
): FormData | null {
  if (item.kind !== "EndPreservation") return null;
  const documentId = deriveAuditDocumentId(item);
  if (alreadyApplied(formData.escalationAuditEvents, documentId)) return null;

  const payload = parseEndPreservationPayload(item);

  // Start the 45-day retention clock anchored to the IA's end date.
  // `startRetentionClock` is idempotent — if another terminal event
  // already started the clock (e.g. a prior Form 3 / Full GFR on this
  // case), the original window is preserved and only the audit event
  // is appended below.
  const sourceLabel =
    `EndPreservation doc ${documentId}` +
    (payload.issuingAuthorityName ? ` from ${payload.issuingAuthorityName}` : "");
  const withClock = startRetentionClock(
    formData,
    "PreservationEnded",
    sourceLabel,
    payload.endDate,
  );

  const note =
    `IA ended preservation obligation effective ` +
    `${payload.endDate.toISOString().slice(0, 10)}. ` +
    `45-day retention window started; held data must be deleted by ` +
    `${new Date(payload.endDate.getTime() + 45 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)}.` +
    (payload.reason ? ` Reason: ${payload.reason}` : "");

  const auditEvent: EscalationAuditEvent = {
    id: `audit-pres-end-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "PreservationEnded",
    actor: payload.issuingAuthorityName ?? "Issuing Authority",
    performedAt: payload.endDate,
    note,
    documentId,
  };

  return {
    ...withClock,
    escalationAuditEvents: [
      ...(withClock.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}
