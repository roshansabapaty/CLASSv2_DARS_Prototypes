/**
 * Form 6 / PreservationExtension handler — pure FormData mutation applied
 * by `useInboundEventHandler` when a PreservationExtension inbound lands.
 *
 * Per the ETSI / Reg 2023/1543 spec, the IA may extend the preservation
 * obligation on an existing EPOC-PR by posting a Form 6 to the WISP
 * endpoint `/eevidence/preservationextension`. The new preservation
 * expiration date carried in the form replaces the prior value on each
 * targeted identifier; the case's retention obligation extends
 * accordingly. The 45-day post-resolution retention clock is NOT affected
 * — that only starts on terminal events (EndPreservation / GFR / Form 3).
 *
 * Structured payload contract (`structuredForm.values` keys):
 *   extendedPreservationExpiration  string (ISO-8601 date) — REQUIRED
 *   identifierIds                   string[]               — optional;
 *                                     when absent, the extension applies
 *                                     to every identifier on the case.
 *   extensionReason                 string                 — optional;
 *                                     surfaced in the audit-event note.
 *   issuingAuthorityName            string                 — optional;
 *                                     used as audit-event actor label.
 */

import type {
  EscalationAuditEvent,
  FormData,
  AccountIdentifier,
} from "../types/caseTypes";
import type { InboundCorrespondenceItem } from "../types/correspondence";

interface PreservationExtensionPayload {
  newExpiration: string;
  identifierIds?: string[];
  reason?: string;
  issuingAuthorityName?: string;
}

/** Read the typed payload from the inbound's `structuredForm.values`.
 *  Returns null when the inbound is malformed (no values, missing
 *  required date). Callers should skip the inbound silently in that case
 *  so a future, well-formed Form 6 can still run. */
export function parsePreservationExtensionPayload(
  item: InboundCorrespondenceItem,
): PreservationExtensionPayload | null {
  const values = item.structuredForm?.values;
  if (!values || typeof values !== "object") return null;
  const raw = values as Record<string, unknown>;
  const newExpiration =
    typeof raw.extendedPreservationExpiration === "string"
      ? raw.extendedPreservationExpiration
      : undefined;
  if (!newExpiration) return null;
  const identifierIds = Array.isArray(raw.identifierIds)
    ? (raw.identifierIds.filter((v) => typeof v === "string") as string[])
    : undefined;
  const reason = typeof raw.extensionReason === "string" ? raw.extensionReason : undefined;
  const issuingAuthorityName =
    typeof raw.issuingAuthorityName === "string" ? raw.issuingAuthorityName : undefined;
  return { newExpiration, identifierIds, reason, issuingAuthorityName };
}

/** Document attribution for the audit event. Prefers the inbound's own
 *  documentId; falls back to a stable id derived from the inbound id so
 *  the seam's idempotency check still works. */
function deriveAuditDocumentId(item: InboundCorrespondenceItem): string {
  return item.documentId ?? `inbound:${item.id}`;
}

/** Whether this audit event has already been written for the given
 *  inbound. The seam's outer hook checks this too, but we re-check here
 *  so the handler is safe to call directly from tests / fixtures. */
function alreadyApplied(
  events: EscalationAuditEvent[] | undefined,
  documentId: string,
): boolean {
  if (!events) return false;
  return events.some(
    (ev) => ev.kind === "PreservationExtended" && ev.documentId === documentId,
  );
}

/** Apply the Form 6 extension to the case. Returns the updated FormData,
 *  or `null` when the inbound is malformed or already-applied (so the
 *  handler stays idempotent across re-mounts). */
export function applyPreservationExtension(
  item: InboundCorrespondenceItem,
  formData: FormData,
): FormData | null {
  if (item.kind !== "PreservationExtension") return null;
  const payload = parsePreservationExtensionPayload(item);
  if (!payload) return null;
  const documentId = deriveAuditDocumentId(item);
  if (alreadyApplied(formData.escalationAuditEvents, documentId)) return null;

  // Per-identifier scope. When `identifierIds` is omitted, the extension
  // applies to every identifier on the case (case-wide Form 6).
  const inScope = (id: string): boolean =>
    !payload.identifierIds || payload.identifierIds.includes(id);

  let bumped = 0;
  const nextIdentifiers: AccountIdentifier[] = formData.identifiers.map((ident) => {
    if (!inScope(ident.id)) return ident;
    if (ident.desiredPreservationExpiration === payload.newExpiration) return ident;
    bumped++;
    return { ...ident, desiredPreservationExpiration: payload.newExpiration };
  });

  if (bumped === 0) {
    // Nothing to update (e.g. identifierIds referenced ids not on the
    // case, or every targeted identifier already carries the new date).
    // Still append the audit event so we don't re-process the inbound.
  }

  const note =
    `IA extended preservation expiration to ${payload.newExpiration}` +
    (payload.identifierIds && payload.identifierIds.length > 0
      ? ` for ${payload.identifierIds.length} identifier${payload.identifierIds.length === 1 ? "" : "s"}`
      : " for the case") +
    (payload.reason ? `. Reason: ${payload.reason}` : ".");

  const auditEvent: EscalationAuditEvent = {
    id: `audit-pres-ext-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind: "PreservationExtended",
    actor: payload.issuingAuthorityName ?? "Issuing Authority",
    performedAt: item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt),
    note,
    documentId,
  };

  return {
    ...formData,
    identifiers: nextIdentifiers,
    escalationAuditEvents: [
      ...(formData.escalationAuditEvents ?? []),
      auditEvent,
    ],
  };
}
