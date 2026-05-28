/**
 * Form 2 / PreservationOrder receipt handler — pure FormData mutation
 * applied by `useInboundEventHandler` when a PreservationOrder inbound
 * lands on an EPOC-PR case.
 *
 * The arrival doesn't change any identifier-level state (the case
 * already carries the IA-provided `desiredPreservationExpiration` from
 * the EPOC-PR envelope at creation), but it DOES anchor the audit
 * trail for the start of the preservation obligation. Without an
 * explicit "received" event, the audit log otherwise jumps straight
 * from case creation to the first downstream action (Form 5 / Form 6 /
 * EndPreservation), which loses the receipt timestamp.
 *
 * Structured payload contract (`structuredForm.values` keys):
 *   B_preservationOrderReference   string — REQUIRED; the IA's PR ref
 *   B_initialPreservationExpiration string (ISO-8601) — optional;
 *                                    surfaced in audit note
 *   issuingAuthorityName           string — optional; audit actor label
 */

import type {
  EscalationAuditEvent,
  FormData,
} from "../types/caseTypes";
import type { InboundCorrespondenceItem } from "../types/correspondence";

function deriveAuditDocumentId(item: InboundCorrespondenceItem): string {
  return item.documentId ?? `inbound:${item.id}`;
}

function alreadyApplied(
  events: EscalationAuditEvent[] | undefined,
  documentId: string,
): boolean {
  if (!events) return false;
  return events.some(
    (ev) => ev.kind === "PreservationOrderReceived" && ev.documentId === documentId,
  );
}

/** Apply the Form 2 receipt event. Returns the updated FormData, or
 *  `null` when the inbound has already been processed. Idempotent. */
export function applyPreservationOrderReceipt(
  item: InboundCorrespondenceItem,
  formData: FormData,
): FormData | null {
  if (item.kind !== "PreservationOrder") return null;
  const documentId = deriveAuditDocumentId(item);
  if (alreadyApplied(formData.escalationAuditEvents, documentId)) return null;

  const values = (item.structuredForm?.values ?? {}) as Record<string, unknown>;
  const orderRef =
    typeof values.B_preservationOrderReference === "string"
      ? values.B_preservationOrderReference
      : undefined;
  const initialExpiry =
    typeof values.B_initialPreservationExpiration === "string"
      ? values.B_initialPreservationExpiration
      : undefined;
  const issuingAuthorityName =
    typeof values.issuingAuthorityName === "string"
      ? values.issuingAuthorityName
      : undefined;

  const note =
    `EPOC-PR (Form 2) received from the Issuing Authority` +
    (orderRef ? ` (ref ${orderRef})` : "") +
    `. Preservation obligation is now in effect per ` +
    `Reg 2023/1543 Art. 6` +
    (initialExpiry
      ? ` with initial expiration ${initialExpiry}.`
      : ".");

  const auditEvent: EscalationAuditEvent = {
    id: `audit-pres-recv-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    kind: "PreservationOrderReceived",
    actor: issuingAuthorityName ?? "Issuing Authority",
    performedAt:
      item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt),
    note,
    documentId,
  };

  return {
    ...formData,
    escalationAuditEvents: [
      ...(formData.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}

/** Pure helper used by the PreservationOrderActiveBanner's "Acknowledge
 *  Receipt" CTA when the SP-side outbound has been sent. Appends a
 *  `PreservationOrderAcknowledged` audit event. Idempotent — re-calling
 *  after the audit is present returns the formData unchanged. */
export function applyPreservationOrderAcknowledged(
  formData: FormData,
  args: { documentId: string; sentAt: Date; actor: string },
): FormData {
  const events = formData.escalationAuditEvents ?? [];
  const already = events.some(
    (ev) =>
      ev.kind === "PreservationOrderAcknowledged" &&
      ev.documentId === args.documentId,
  );
  if (already) return formData;
  const audit: EscalationAuditEvent = {
    id: `audit-pres-ack-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    kind: "PreservationOrderAcknowledged",
    actor: args.actor,
    actorRole: "ResponseSpecialist",
    performedAt: args.sentAt,
    note:
      "Microsoft confirmed receipt of the EPOC-PR to the Issuing " +
      "Authority. Preservation obligation acknowledged per " +
      "Reg 2023/1543 Art. 6.",
    documentId: args.documentId,
  };
  return {
    ...formData,
    escalationAuditEvents: [...events, audit],
  };
}

/** Read-side: returns true when the case has at least one
 *  `PreservationOrderAcknowledged` audit event. The banner uses this to
 *  swap the "Acknowledge Receipt" CTA for a confirmation line. */
export function hasPreservationOrderBeenAcknowledged(
  formData: FormData | null | undefined,
): boolean {
  if (!formData) return false;
  const events = formData.escalationAuditEvents ?? [];
  return events.some((ev) => ev.kind === "PreservationOrderAcknowledged");
}
