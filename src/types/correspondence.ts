/**
 * Correspondence types — Phase 2 inbound/outbound communication loop with
 * the issuing or enforcing authority.
 *
 * Mental model:
 *  - Outbound items are things the RS sends out (a signed Phase 1 form, a
 *    free-text letter, an attachment-only correspondence). They progress
 *    through a transmission state machine: Draft → Sent → Delivered →
 *    Acknowledged → Responded (or → Failed).
 *  - Inbound items are things the issuing/enforcing authority sends back
 *    to the RS — typed by `kind` so the UI can render them appropriately
 *    (free text, attachment-only, structured form like a corrected EPOC,
 *    formal acknowledgement, or a withdrawal/amendment notice).
 *  - Items can carry an optional `inReplyToId` so the chat-thread side
 *    panel can group replies into the same conversation tab as their
 *    parent. Unsolicited inbound items have no parent and form their
 *    own root thread.
 *
 * Persistence in the prototype: items live on `FormData.correspondence`
 * (in-memory, per case). No backend.
 */

// ── Direction + counterparty ────────────────────────────────────────────

export type CorrespondenceDirection = "Inbound" | "Outbound";

/** Which authority on the case is the counterparty for this item.
 *  Mirrors the Phase 1 `AuthorityRole` shape but narrowed — for Phase 2
 *  outbound + inbound, only the issuing/enforcing pair are relevant. */
export type AuthorityRole = "IssuingAuthority" | "EnforcingAuthority";

/** Channel the item was transmitted through (or simulated through). */
export type CorrespondenceChannel =
  | "Email"
  | "DecentralisedITSystem" // EU eEvidence official channel (Reg 2023/1543)
  | "AuthorityPortal"
  | "PostalMail"
  | "Other";

// ── Outbound transmission state machine ────────────────────────────────

export type OutboundTransmissionStatus =
  | "Draft" // not yet sent (covers the Phase 1 Signed-but-not-Sent state)
  | "Sent" // RS has dispatched it via the chosen channel
  | "Delivered" // delivery confirmed (manually or auto-simulated)
  | "Acknowledged" // authority formally acknowledged receipt
  | "Responded" // authority sent a response (creates a linked Inbound)
  | "Failed"; // mock — delivery failed

// ── Inbound classification ─────────────────────────────────────────────

export type InboundKind =
  | "Text" // free-text letter or email body
  | "Attachment" // attached document(s) only, no body
  | "StructuredForm" // authority-submitted form (e.g. corrected EPOC, EPOC-PR companion)
  | "Acknowledgement" // formal receipt confirmation, often with reference number
  | "WithdrawalAmendment" // authority withdraws or amends an earlier order
  | "RequestAdditionalInformation" // authority asks MS to clarify (we reply with ProvideAdditionalInformation)
  | "ProvideAdditionalInformation" // authority's reply to our outbound RequestAdditionalInformation
  | "Form5_ConfirmationOfIssuance" // IA confirms a follow-on EPOC-ER will be issued for an existing EPOC-PR; triggers linkage
  | "PreservationOrder" // Form 2 — original EPOC-PR (preservation order) arrival; handler appends PreservationOrderReceived audit + drives the active-banner / Acknowledge CTA
  | "PreservationExtension" // Form 6 (POST /eevidence/preservationextension) — IA extends preservation period; handler bumps AccountIdentifier.desiredPreservationExpiration
  | "EndPreservation" // POST /eevidence/endpreservation — IA ends the preservation obligation; handler starts the 45-day retention clock
  | "Withdrawal" // POST /eevidence/withdrawal — IA withdraws the EPOC (Workflow 8); handler cancels pending delivery + starts retention clock + auto-flips caseStage
  | "GroundsForRefusal"; // EA's GFR message (ETSI 5.5) — None/Full/Partial decision; renders as GFR bubble

/** Classifies an outbound correspondence record by document type, so the
 *  outbox can filter / label / chip them. `FreeText` and `SignedForm`
 *  cover the existing free-text + signed-template flows; the two
 *  AdditionalInformation kinds carry the eEvidence info-exchange loop. */
export type OutboundDocumentKind =
  | "FreeText"
  | "SignedForm"
  | "RequestAdditionalInformation"
  | "ProvideAdditionalInformation"
  | "PreservationAcknowledged"; // SP's outbound confirming receipt of an EPOC-PR (Form 2) to the IA

// ── Attachments ─────────────────────────────────────────────────────────

export interface CorrespondenceAttachment {
  id: string;
  name: string;
  size: number; // bytes
  type: string; // MIME
  url?: string; // ObjectURL in the prototype
}

// ── Common envelope ────────────────────────────────────────────────────

interface CorrespondenceBase {
  id: string;
  /** ETSI-compliant document reference for the correspondence record.
   *  Each correspondence document (every CorrespondenceItem) gets its
   *  own `documentId` so eEvidence cases can satisfy the EU Reg
   *  2023/1543 + ETSI 5.5 traceability requirement that every exchanged
   *  artefact carry a unique identifier traceable across the case.
   *
   *  Format conventions (prototype):
   *   - Outbound: `MS-{caseId}-OUT-{seq}` — Microsoft-side generated when
   *     the RS composes / sends.
   *   - Inbound: prefers the authority's own reference when present
   *     (e.g. `acknowledgementRef`), else `IA-{caseId}-IN-{seq}` so the
   *     prototype always shows a stable id.
   *
   *  Optional on the type to keep legacy mock data valid; consumers
   *  should use `resolveDocumentId(item)` from `correspondenceEngine.ts`
   *  which deterministically derives a stable id when this field is
   *  missing. New writes (composer, mock seeds, outbound auto-sim)
   *  populate the field directly. */
  documentId?: string;
  caseId: string;
  direction: CorrespondenceDirection;
  counterparty: AuthorityRole;
  channel: CorrespondenceChannel;
  /** Cross-link to a parent (the outbound this replies to, or vice versa).
   *  Drives the chat-thread side panel's per-tab grouping. */
  inReplyToId?: string;
  subject: string;
  createdAt: Date;
}

// ── Outbound ───────────────────────────────────────────────────────────

export interface OutboundCorrespondenceItem extends CorrespondenceBase {
  direction: "Outbound";
  /** Reference to a Phase 1 form instance (when the outbound is a signed
   *  EPOC Form 3 / production letter / etc.). When set, the item's body is
   *  rendered via `FormPreviewPanel(template, instance)`. */
  formInstanceId?: string;
  /** Free-text body, used for non-form outbound (letters, replies). */
  body?: string;
  attachments?: CorrespondenceAttachment[];
  /** Additional inbound RFIs this single outbound closes — populated
   *  when the composer's "Mark these as also-replied" sidebar
   *  surfaces sibling RFIs from the same authority and the RS ticks
   *  some of them. Each id gets the same `respondedByOutbound` stamp
   *  as `inReplyToId`. Empty / unset for normal single-target replies. */
  additionalRespondedInboundIds?: string[];
  /** Document classification — drives the outbox row chip + filter. When
   *  unset, the row falls back to the existing free-text / signed-form
   *  display rules. */
  documentKind?: OutboundDocumentKind;
  transmission: {
    status: OutboundTransmissionStatus;
    sentAt?: Date;
    sentBy?: string;
    deliveredAt?: Date;
    /** Provenance of the Delivered transition. */
    deliveryConfirmedBy?: "RS" | "AutoSim" | "AuthorityCallback";
    acknowledgedAt?: Date;
    /** Authority's reference number on receipt (e.g. "AUTO-abc123"). */
    acknowledgementRef?: string;
    respondedAt?: Date;
    /** When `status === "Responded"`, points at the linked inbound reply. */
    respondedInboundId?: string;
    failedAt?: Date;
    failureReason?: string;
    /** True when the outbound was composed with the "Attorney Escalation"
     *  toggle on. The outbound persists in `Draft` status, the auto-sim
     *  cascade skips it, and the case's `formData.attorneyEscalation`
     *  carries this outbound's id in `relatedOutboundIds`. When the
     *  attorney releases the hold (Release / ApproveWithConditions), the
     *  flag is cleared, the status flips to `Sent`, and the auto-sim
     *  cascade picks back up. */
    pendingAttorneyReview?: boolean;
  };
}

// ── Inbound ────────────────────────────────────────────────────────────

export interface InboundCorrespondenceItem extends CorrespondenceBase {
  direction: "Inbound";
  kind: InboundKind;
  /** Free-text content for `Text` and `Acknowledgement` kinds. */
  body?: string;
  attachments?: CorrespondenceAttachment[];
  /** For `StructuredForm` — references a Phase 1 template id + filled values
   *  so the existing `FormPreviewPanel` can render it. */
  structuredForm?: {
    templateId: string;
    values: Record<string, unknown>;
  };
  /** Read state. Unread items surface in the AppHeader bell, queue card
   *  badge, sticky chip, and inline alert. */
  readAt?: Date;
  /** RS-set follow-up reminder. */
  followUp?: {
    requiredBy?: Date;
    note?: string;
    completedAt?: Date;
  };
  /** Set when an outbound has been sent in reply to this inbound (e.g.
   *  a PAI letter in reply to an inbound RFI). Mirrors the outbound's
   *  `inReplyToId` so the conversation thread can be walked from either
   *  direction. Carries a `status` so a cancelled reply keeps the
   *  back-link visible (the bubble surfaces "Replied (cancelled)" and
   *  the per-jurisdiction breach countdown resumes). When `status` is
   *  `"sent"` the inline CTA collapses to a "Replied ✓" chip; when
   *  `"cancelled"` the conversation is considered re-opened. */
  respondedByOutbound?: {
    outboundId: string;
    status: "sent" | "cancelled";
  };
  /** Deprecated string form kept for backwards compatibility with any
   *  data persisted before the structured field landed. New writes
   *  should populate `respondedByOutbound` instead. Read paths should
   *  prefer the structured form; the bubble has a fallback that
   *  treats a bare string id as `{ outboundId, status: "sent" }`. */
  respondedByOutboundId?: string;
}

/** Reader helper — collapses the structured `respondedByOutbound` and
 *  the legacy `respondedByOutboundId` string into a single shape. Use
 *  this everywhere the UI / engine needs to ask "did we already reply
 *  to this inbound, and is that reply still live?". */
export function readRespondedByOutbound(
  inbound: InboundCorrespondenceItem,
): { outboundId: string; status: "sent" | "cancelled" } | undefined {
  if (inbound.respondedByOutbound) return inbound.respondedByOutbound;
  if (inbound.respondedByOutboundId) {
    return { outboundId: inbound.respondedByOutboundId, status: "sent" };
  }
  return undefined;
}

// ── Discriminated union ────────────────────────────────────────────────

export type CorrespondenceItem =
  | OutboundCorrespondenceItem
  | InboundCorrespondenceItem;

// ── Type guards ────────────────────────────────────────────────────────

export function isOutbound(
  item: CorrespondenceItem,
): item is OutboundCorrespondenceItem {
  return item.direction === "Outbound";
}

export function isInbound(
  item: CorrespondenceItem,
): item is InboundCorrespondenceItem {
  return item.direction === "Inbound";
}
