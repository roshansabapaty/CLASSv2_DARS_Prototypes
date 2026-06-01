/**
 * correspondenceEngine — pure helpers for the Phase 2 correspondence loop.
 *
 * No React, no side effects. Consumed by the inbox/outbox surfaces and the
 * cross-case notification hook. Keeps the component code dumb and testable.
 */

import {
  isInbound,
  isOutbound,
  type CorrespondenceItem,
  type InboundCorrespondenceItem,
  type OutboundCorrespondenceItem,
  type OutboundTransmissionStatus,
} from "../../types/correspondence";

/**
 * Count of unread inbound items in the given correspondence list. Used by
 * the AppHeader bell, queue card badges, sticky case chip, and the inline
 * unread MessageBar. Items without `readAt` are unread.
 */
export function unreadInboxCount(
  items: CorrespondenceItem[] | undefined,
): number {
  if (!items) return 0;
  let n = 0;
  for (const item of items) {
    if (isInbound(item) && !item.readAt) n++;
  }
  return n;
}

/**
 * Count of outbound items currently in a "pending" transmission state —
 * sent or delivered but not yet acknowledged or responded to. Drives the
 * "⏳ Acknowledgement pending" queue card badge.
 */
export function pendingOutboxCount(
  items: CorrespondenceItem[] | undefined,
): number {
  if (!items) return 0;
  let n = 0;
  for (const item of items) {
    if (isOutbound(item)) {
      const s = item.transmission.status;
      if (s === "Sent" || s === "Delivered") n++;
    }
  }
  return n;
}

/**
 * Outbound items that the authority has already acknowledged, but for
 * which no response has come back. These are sitting inside the reply
 * window the regulation grants the authority (e.g. 5 days for an EPOC
 * Form 3 — Non-Execution Response). Drives the queue card "Form 3
 * awaiting reply — Nd" badge and the panel's "Awaiting reply" caption.
 *
 * Note: the per-form reply window is *not* enforced here — callers
 * compute days-left from `transmission.acknowledgedAt` against the
 * applicable regulation. This helper only identifies the candidates.
 */
export function awaitingAuthorityReplyOutbounds(
  items: CorrespondenceItem[] | undefined,
): OutboundCorrespondenceItem[] {
  if (!items) return [];
  const out: OutboundCorrespondenceItem[] = [];
  for (const item of items) {
    if (!isOutbound(item)) continue;
    const t = item.transmission;
    if (t.status !== "Acknowledged") continue;
    if (t.respondedAt) continue;
    out.push(item);
  }
  return out;
}

/**
 * Inbound `RequestAdditionalInformation` items the authority sent us
 * that we haven't yet replied to. "Not yet replied" = the inbound's
 * `respondedByOutboundId` is unset. Drives the queue card "RFI reply
 * due — Nd" badge.
 *
 * Note: like `awaitingAuthorityReplyOutbounds`, the per-jurisdiction
 * reply window isn't enforced here — callers compute days-left from
 * `followUp.requiredBy` (or the inbound's `createdAt` + a default
 * window) themselves.
 */
export function awaitingOurReplyInbounds(
  items: CorrespondenceItem[] | undefined,
): InboundCorrespondenceItem[] {
  if (!items) return [];
  const out: InboundCorrespondenceItem[] = [];
  for (const item of items) {
    if (!isInbound(item)) continue;
    if (item.kind !== "RequestAdditionalInformation") continue;
    if (item.respondedByOutboundId) continue;
    out.push(item);
  }
  return out;
}

/**
 * Outbound items currently held under the "Attorney Escalation" toggle —
 * `transmission.status === "Draft"` with `pendingAttorneyReview === true`.
 * Drives the queue card "Attorney review required" badge.
 */
export function heldForAttorneyOutbounds(
  items: CorrespondenceItem[] | undefined,
): OutboundCorrespondenceItem[] {
  if (!items) return [];
  const out: OutboundCorrespondenceItem[] = [];
  for (const item of items) {
    if (!isOutbound(item)) continue;
    if (item.transmission.pendingAttorneyReview) out.push(item);
  }
  return out;
}

/**
 * Inbound items only, sorted newest-first. Used by the case-page
 * accordion summary + AppHeader's "recent inbound" dropdown.
 */
export function inboundItems(
  items: CorrespondenceItem[] | undefined,
): InboundCorrespondenceItem[] {
  if (!items) return [];
  return items.filter(isInbound).sort(byCreatedAtDesc);
}

/**
 * Outbound items only, sorted newest-first. Used by the case-page
 * accordion summary.
 */
export function outboundItems(
  items: CorrespondenceItem[] | undefined,
): OutboundCorrespondenceItem[] {
  if (!items) return [];
  return items.filter(isOutbound).sort(byCreatedAtDesc);
}

/**
 * Resolve a thread for the selected item: returns the linked counterpart
 * (the outbound it replies to, or any inbound items that reply to it),
 * sorted oldest-first. Used by the chat-thread side panel + helpers.
 */
export function getThread(
  items: CorrespondenceItem[] | undefined,
  selected: CorrespondenceItem,
): CorrespondenceItem[] {
  if (!items) return [selected];
  const thread: CorrespondenceItem[] = [];
  // Find the root: walk inReplyToId chain up.
  let root: CorrespondenceItem = selected;
  const seen = new Set<string>();
  while (root.inReplyToId && !seen.has(root.id)) {
    seen.add(root.id);
    const parent = items.find((i) => i.id === root.inReplyToId);
    if (!parent) break;
    root = parent;
  }
  thread.push(root);
  // Find all descendants (transitive).
  const queue: string[] = [root.id];
  const reachable = new Set<string>([root.id]);
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const child of items) {
      if (child.inReplyToId === parentId && !reachable.has(child.id)) {
        reachable.add(child.id);
        thread.push(child);
        queue.push(child.id);
      }
    }
  }
  return thread.sort(byCreatedAtAsc);
}

/**
 * Link an inbound reply to a parent outbound item. Returns a new
 * correspondence array; does not mutate. Used when:
 *  - Demo Controls "Trigger Responded" synthesises a reply.
 *  - The chat-thread side panel records a manual reply link.
 *
 * Side-effects on the linked outbound:
 *  - transmission.status → "Responded"
 *  - transmission.respondedAt → inbound.createdAt
 *  - transmission.respondedInboundId → inbound.id
 */
export function linkInbound(
  items: CorrespondenceItem[],
  outboundId: string,
  inbound: InboundCorrespondenceItem,
): CorrespondenceItem[] {
  return items.map((item) => {
    if (item.id === outboundId && isOutbound(item)) {
      return {
        ...item,
        transmission: {
          ...item.transmission,
          status: "Responded",
          respondedAt: inbound.createdAt,
          respondedInboundId: inbound.id,
        },
      };
    }
    if (item.id === inbound.id && isInbound(item)) {
      return { ...item, inReplyToId: outboundId };
    }
    return item;
  });
}

/**
 * Transition an outbound item to a new transmission status with audit data.
 * Returns a new correspondence array.
 */
export function transitionOutbound(
  items: CorrespondenceItem[],
  outboundId: string,
  next: OutboundTransmissionStatus,
  audit: Partial<OutboundCorrespondenceItem["transmission"]> = {},
): CorrespondenceItem[] {
  return items.map((item) => {
    if (item.id !== outboundId || !isOutbound(item)) return item;
    return {
      ...item,
      transmission: {
        ...item.transmission,
        ...audit,
        status: next,
      },
    };
  });
}

/**
 * ETSI-compliant document reference resolution.
 *
 * Each correspondence document carries a unique `documentId` so
 * eEvidence cases can satisfy EU Reg 2023/1543 + ETSI 5.5 traceability.
 * When the field is missing (legacy mock data, older seeded items),
 * derive a stable id deterministically from the item's existing fields:
 *
 *  Outbound, acknowledged → use the authority's `acknowledgementRef`
 *    (this is the reference the IA has accepted as the document id).
 *  Outbound, no ack yet   → `MS-{caseId}-OUT-{item.id-tail}`
 *  Inbound, has ack ref   → `acknowledgementRef` (rare; IA-supplied)
 *  Inbound, default       → `IA-{caseId}-IN-{item.id-tail}`
 *
 * `id-tail` = the last segment of the item's `id` so the resolved
 * document id stays case-scoped + unique without leaking the full
 * randomised id.
 */
export function resolveDocumentId(item: CorrespondenceItem): string {
  if (item.documentId) return item.documentId;
  const tail = item.id.includes("-") ? item.id.split("-").slice(-1)[0] : item.id;
  if (isOutbound(item)) {
    const ack = item.transmission.acknowledgementRef;
    if (ack) return ack;
    return `MS-${item.caseId}-OUT-${tail}`;
  }
  // Inbound — no `acknowledgementRef` on inbound shape; default to the
  // IA-prefixed reference. If a structured form carries a `templateId`
  // in its values map, we could later extend this to surface that too.
  return `IA-${item.caseId}-IN-${tail}`;
}

/**
 * Group items into thread buckets (root id → ordered chain). Used for an
 * optional "by thread" view in the Hub. Items without an inReplyToId are
 * their own roots; chains are sorted oldest → newest.
 */
export function groupByThread(
  items: CorrespondenceItem[] | undefined,
): Array<{ rootId: string; items: CorrespondenceItem[] }> {
  if (!items || items.length === 0) return [];
  const seen = new Set<string>();
  const groups: Array<{ rootId: string; items: CorrespondenceItem[] }> = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    const thread = getThread(items, item);
    for (const t of thread) seen.add(t.id);
    groups.push({ rootId: thread[0].id, items: thread });
  }
  return groups;
}

// ── Chat-thread grouping (Hub redesign) ─────────────────────────────────

/** Visual key used to choose a tab icon. */
export type CorrespondenceThreadIconKey =
  | "form3"
  | "form5"
  | "request-info"
  | "ack"
  | "withdrawal"
  | "free-text"
  | "attachment"
  | "other";

/** A single conversation thread, derived from `inReplyToId` chains. The
 *  side-panel tab strip renders one tab per thread. */
export interface CorrespondenceThreadGroup {
  rootId: string;
  rootItem: CorrespondenceItem;
  /** Human-readable tab label derived from document type / kind / subject. */
  label: string;
  /** Tab icon key — drives an iconographic recognition cue per tab. */
  iconKey: CorrespondenceThreadIconKey;
  /** All items in this thread, sorted by `createdAt` ascending. */
  items: CorrespondenceItem[];
  /** Unread inbound count within the thread (drives the amber dot). */
  unreadInboundCount: number;
  /** Outbound items in Sent / Delivered / Draft-with-pending-attorney-review. */
  pendingOutboundCount: number;
  /** True when the latest message in the thread is from the authority and
   *  is `RequestAdditionalInformation` or carries a `followUp` block —
   *  surfaces an "Awaiting reply" caption on the tab. */
  awaitingReply: boolean;
  /** Timestamp of the latest item, for tab sort + auto-select on open. */
  latestAt: Date;
  /** Created timestamp of the thread's root item — drives the
   *  "Created Date" sort option in the picker. */
  createdAt: Date;
  /** Timestamp of the most recent INBOUND item in the thread, or
   *  `undefined` when the thread has no inbound traffic yet. Drives the
   *  "Received Date" sort option in the picker so the RS can surface
   *  threads where the authority has recently replied. */
  lastReceivedAt?: Date;
}

/** Helper — friendly label for a known signed-form template id. Drops
 *  back to the bare templateId when unknown. */
function friendlyFormName(templateId: string | undefined): string {
  if (!templateId) return "Signed Form";
  // Keep this list minimal; expand as more templates land.
  if (/form[\s_-]*3/i.test(templateId)) return "Form 3 — Non-Execution Response";
  if (/epoc[\s_-]*pr/i.test(templateId)) return "EPOC-PR — Preservation Request";
  if (/epoc[\s_-]*er/i.test(templateId)) return "EPOC-ER — Production Order";
  if (/epoc/i.test(templateId)) return "EPOC Form";
  return templateId;
}

/** Picks a label + icon for a thread group based on its root item. */
function deriveThreadLabel(
  root: CorrespondenceItem,
): { label: string; iconKey: CorrespondenceThreadIconKey } {
  if (isOutbound(root)) {
    if (root.documentKind === "SignedForm") {
      // Try the form template id (formInstanceId is the instance id;
      // template id is carried on the instance in formData — but for the
      // label we fall back to the subject if templateId isn't on the
      // outbound. Subject is generally set on signed-form outbounds.).
      const fromSubject = root.subject?.trim();
      const name = fromSubject || friendlyFormName(undefined);
      // Detect Form 3 / EPOC mention in the subject for the icon.
      const sub = (fromSubject ?? "").toLowerCase();
      const iconKey: CorrespondenceThreadIconKey =
        sub.includes("form 3") || sub.includes("form3") || sub.includes("non-execution")
          ? "form3"
          : sub.includes("epoc")
            ? "form3"
            : "free-text";
      return { label: name, iconKey };
    }
    if (root.documentKind === "RequestAdditionalInformation") {
      return { label: "Request Additional Information", iconKey: "request-info" };
    }
    if (root.documentKind === "ProvideAdditionalInformation") {
      return { label: "Provided Additional Information", iconKey: "request-info" };
    }
    // Free-text / attachment-only outbound — use subject.
    const subject = root.subject?.trim();
    if (subject) {
      const truncated = subject.length > 32 ? `${subject.slice(0, 32)}…` : subject;
      return {
        label: `Outbound: ${truncated}`,
        iconKey: root.attachments && root.attachments.length > 0 ? "attachment" : "free-text",
      };
    }
    return { label: "Outbound message", iconKey: "free-text" };
  }
  // Inbound root.
  if (root.kind === "PreservationOrder") {
    return { label: "Form 2 — Preservation Order", iconKey: "form5" };
  }
  if (root.kind === "Form5_ConfirmationOfIssuance") {
    return { label: "Form 5 — Confirmation of Issuance", iconKey: "form5" };
  }
  if (root.kind === "PreservationExtension") {
    return { label: "Form 6 — Preservation Extension", iconKey: "form5" };
  }
  if (root.kind === "EndPreservation") {
    return { label: "End of Preservation", iconKey: "withdrawal" };
  }
  if (root.kind === "Withdrawal") {
    return { label: "EPOC Withdrawal Notice", iconKey: "withdrawal" };
  }
  if (root.kind === "WithdrawalAmendment") {
    return { label: "Withdrawal / Amendment", iconKey: "withdrawal" };
  }
  if (root.kind === "Acknowledgement") {
    return { label: "Receipt Acknowledgement", iconKey: "ack" };
  }
  if (root.kind === "RequestAdditionalInformation") {
    return { label: "Authority Requested Info", iconKey: "request-info" };
  }
  if (root.kind === "ProvideAdditionalInformation") {
    return { label: "Authority Provided Info", iconKey: "request-info" };
  }
  if (root.kind === "StructuredForm") {
    const subject = root.subject?.trim();
    return {
      label: subject ? `Form — ${subject.slice(0, 24)}` : "Structured Form",
      iconKey: "form3",
    };
  }
  if (root.kind === "Attachment") {
    const subject = root.subject?.trim();
    return {
      label: subject ? `Inbound: ${subject.slice(0, 28)}` : "Attachment received",
      iconKey: "attachment",
    };
  }
  // Text / fallback.
  const subject = root.subject?.trim();
  if (subject) {
    const truncated = subject.length > 32 ? `${subject.slice(0, 32)}…` : subject;
    return { label: `Inbound: ${truncated}`, iconKey: "free-text" };
  }
  return { label: "Inbound message", iconKey: "other" };
}

/** Group correspondence items into per-thread bundles for the chat-thread
 *  side panel. Each thread carries display metadata (label, icon, badge
 *  counts) so the tab strip can render without further computation.
 *
 *  Threads are returned newest-first (most-recent activity at the top). */
export function groupCorrespondenceIntoThreads(
  items: CorrespondenceItem[] | undefined,
): CorrespondenceThreadGroup[] {
  if (!items || items.length === 0) return [];
  const rawGroups = groupByThread(items);
  const groups: CorrespondenceThreadGroup[] = rawGroups.map((g) => {
    const root = g.items[0];
    const { label, iconKey } = deriveThreadLabel(root);
    const sortedItems = [...g.items].sort(byCreatedAtAsc);
    const latest = sortedItems[sortedItems.length - 1];
    let unreadInboundCount = 0;
    let pendingOutboundCount = 0;
    for (const it of sortedItems) {
      if (isInbound(it) && !it.readAt) unreadInboundCount++;
      if (isOutbound(it)) {
        const s = it.transmission.status;
        if (s === "Sent" || s === "Delivered") pendingOutboundCount++;
        if (s === "Draft" && it.transmission.pendingAttorneyReview) pendingOutboundCount++;
      }
    }
    const awaitingReply =
      isInbound(latest) &&
      (latest.kind === "RequestAdditionalInformation" ||
        Boolean(latest.followUp && !latest.followUp.completedAt));
    // Most recent INBOUND timestamp in the thread (for the "Received
    // Date" sort option). When the thread has no inbound items yet,
    // leaves it undefined so the picker can sort those to the bottom.
    let lastReceivedAt: Date | undefined;
    for (let i = sortedItems.length - 1; i >= 0; i--) {
      if (isInbound(sortedItems[i])) {
        lastReceivedAt = new Date(sortedItems[i].createdAt);
        break;
      }
    }
    return {
      rootId: g.rootId,
      rootItem: root,
      label,
      iconKey,
      items: sortedItems,
      unreadInboundCount,
      pendingOutboundCount,
      awaitingReply,
      latestAt: new Date(latest.createdAt),
      createdAt: new Date(root.createdAt),
      lastReceivedAt,
    };
  });
  groups.sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
  return groups;
}

// ── Internal sort helpers ───────────────────────────────────────────────

function byCreatedAtDesc(a: CorrespondenceItem, b: CorrespondenceItem): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function byCreatedAtAsc(a: CorrespondenceItem, b: CorrespondenceItem): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}
