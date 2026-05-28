/**
 * useCorrespondenceNotifications — cross-case aggregator.
 *
 * Subscribes to the `correspondenceStore` and computes:
 *  - totalUnread: sum of unread inbound items across all cases (or filtered).
 *  - totalPending: sum of outbound items in Sent/Delivered status.
 *  - perCase: per-case counts for queue card badges.
 *  - recentInbound: the newest 5 unread inbound items for the AppHeader
 *    dropdown. Each entry carries `caseId` so a click can navigate.
 *
 * Filtering:
 *  - When `filter.assigneeName` is set, the aggregator only counts cases
 *    in MOCK_CASES whose `assigneeName` matches. This is what the
 *    AppHeader bell uses (counts the current user's queue, not the world).
 */

import * as React from "react";
import {
  getAllSnapshot,
  subscribe,
} from "../state/correspondenceStore";
import {
  awaitingAuthorityReplyOutbounds,
  awaitingOurReplyInbounds,
  heldForAttorneyOutbounds,
  inboundItems,
  pendingOutboxCount,
  unreadInboxCount,
} from "../components/correspondence/correspondenceEngine";
import { MOCK_CASES } from "../components/case-queue/case-queue-types";
import { getCaseFormDataById } from "../utils/caseDataRegistry";
import type {
  CorrespondenceItem,
  InboundCorrespondenceItem,
  OutboundCorrespondenceItem,
} from "../types/correspondence";

export interface RecentInboundEntry {
  caseId: string;
  /** Snapshot of the inbound item — caller must not mutate. */
  item: InboundCorrespondenceItem;
}

export interface PerCaseCorrespondenceCounts {
  unread: number;
  pending: number;
  /** Outbounds the authority has acknowledged but not yet responded to.
   *  Drives the queue card's "Form 3 awaiting reply — Nd" badge. The
   *  oldest such outbound's acknowledgedAt is exposed via
   *  `oldestAwaitingReply` so the badge can compute days-left. */
  awaitingReply: number;
  oldestAwaitingReply?: OutboundCorrespondenceItem;
  /** Outbounds held under the Attorney Escalation toggle. Drives the
   *  queue card's "Attorney review required" badge. */
  heldForAttorney: number;
  /** Inbound RFIs from the authority we haven't replied to yet. Drives
   *  the queue card's "RFI reply due — Nd" badge. The oldest such
   *  inbound is exposed so the badge can compute days-left against
   *  `followUp.requiredBy`. */
  awaitingOurReply: number;
  oldestAwaitingOurReply?: InboundCorrespondenceItem;
  /** Inbound items on a case with an active attorney escalation that
   *  haven't been read yet — these effectively need the attorney's
   *  eyes before the RS can sensibly act on them. Drives the
   *  Attorney Dashboard's "N inbound awaiting review" chip (Gap 3).
   *  Returns 0 for cases with no active escalation or no unread
   *  inbound traffic. */
  inboundAwaitingAttorney: number;
}

export interface CorrespondenceNotifications {
  totalUnread: number;
  totalPending: number;
  perCase: Map<string, PerCaseCorrespondenceCounts>;
  recentInbound: RecentInboundEntry[];
}

export interface UseCorrespondenceNotificationsFilter {
  /** When set, only cases assigned to this user contribute to totals. */
  assigneeName?: string;
  /** Soft cap on `recentInbound` length. Default 5. */
  recentLimit?: number;
}

const EMPTY: CorrespondenceNotifications = {
  totalUnread: 0,
  totalPending: 0,
  perCase: new Map(),
  recentInbound: [],
};

export function useCorrespondenceNotifications(
  filter: UseCorrespondenceNotificationsFilter = {},
): CorrespondenceNotifications {
  const snapshot = React.useSyncExternalStore(
    subscribe,
    getAllSnapshot,
    getAllSnapshot,
  );

  return React.useMemo(() => {
    if (!snapshot || snapshot.size === 0) return EMPTY;

    // Build the case-id allow-list once per filter change.
    const allowedIds: Set<string> | null = filter.assigneeName
      ? new Set(
          MOCK_CASES.filter((c) => c.assigneeName === filter.assigneeName).map(
            (c) => c.caseId,
          ),
        )
      : null;

    let totalUnread = 0;
    let totalPending = 0;
    const perCase = new Map<string, PerCaseCorrespondenceCounts>();
    const recentBuf: Array<{
      caseId: string;
      item: InboundCorrespondenceItem;
      ts: number;
    }> = [];

    for (const [caseId, items] of snapshot) {
      if (allowedIds && !allowedIds.has(caseId)) continue;
      const caseItems = items as CorrespondenceItem[];
      const unread = unreadInboxCount(caseItems);
      const pending = pendingOutboxCount(caseItems);
      const awaiting = awaitingAuthorityReplyOutbounds(caseItems);
      const held = heldForAttorneyOutbounds(caseItems);
      const ourReplyDue = awaitingOurReplyInbounds(caseItems);
      // Oldest awaiting-reply outbound = the one with the earliest
      // `acknowledgedAt` (the reply clock starts at acknowledgement).
      const oldestAwaitingReply = awaiting.reduce<
        OutboundCorrespondenceItem | undefined
      >((acc, cur) => {
        const at = cur.transmission.acknowledgedAt;
        if (!at) return acc;
        if (!acc?.transmission.acknowledgedAt) return cur;
        return new Date(at) < new Date(acc.transmission.acknowledgedAt)
          ? cur
          : acc;
      }, undefined);
      // Oldest inbound RFI we owe a reply on — earliest `createdAt`.
      const oldestAwaitingOurReply = ourReplyDue.reduce<
        InboundCorrespondenceItem | undefined
      >((acc, cur) => {
        if (!acc) return cur;
        return new Date(cur.createdAt) < new Date(acc.createdAt) ? cur : acc;
      }, undefined);

      // Inbound items that the attorney needs to triage. Active
      // escalation + unread inbound = surface this for the attorney
      // dashboard's "N inbound awaiting review" chip. Terminal
      // statuses clear the count (case no longer needs the attorney).
      // Wrapped in try/catch as a defensive guard — the registry call
      // materialises a full FormData, and any malformed seed would
      // otherwise tank the whole hook (which is consumed by every
      // queue card). Falls back to 0 on any error.
      let inboundAwaitingAttorney = 0;
      try {
        const escStatus = getCaseFormDataById(caseId)?.attorneyEscalation
          ?.status;
        const escalationIsActive =
          escStatus === "Pending" ||
          escStatus === "InformationRequested" ||
          escStatus === "Blocked";
        inboundAwaitingAttorney = escalationIsActive
          ? inboundItems(caseItems).filter((inb) => !inb.readAt).length
          : 0;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          "[useCorrespondenceNotifications] failed to derive inboundAwaitingAttorney for",
          caseId,
          err,
        );
      }

      perCase.set(caseId, {
        unread,
        pending,
        awaitingReply: awaiting.length,
        oldestAwaitingReply,
        heldForAttorney: held.length,
        awaitingOurReply: ourReplyDue.length,
        oldestAwaitingOurReply,
        inboundAwaitingAttorney,
      });
      totalUnread += unread;
      totalPending += pending;

      // Collect unread inbound items for the recent list.
      for (const inb of inboundItems(caseItems)) {
        if (!inb.readAt) {
          recentBuf.push({
            caseId,
            item: inb,
            ts: new Date(inb.createdAt).getTime(),
          });
        }
      }
    }

    recentBuf.sort((a, b) => b.ts - a.ts);
    const recentLimit = filter.recentLimit ?? 5;
    const recentInbound: RecentInboundEntry[] = recentBuf
      .slice(0, recentLimit)
      .map((r) => ({ caseId: r.caseId, item: r.item }));

    return { totalUnread, totalPending, perCase, recentInbound };
  }, [snapshot, filter.assigneeName, filter.recentLimit]);
}
