/**
 * useOutboundAutoSim — App-level hook that simulates the post-send half of
 * the outbound transmission lifecycle.
 *
 *   Sent          ── after ~SENT_TO_DELIVERED_MS ──→ Delivered
 *   Delivered     ── after ~DELIVERED_TO_ACK_MS   ──→ Acknowledged (with
 *                                                     a synthesised
 *                                                     "AUTO-…" reference)
 *
 * Acknowledged → Responded is NOT auto-driven (it requires synthesising
 * an inbound reply, which DemoControlsPanel handles).
 *
 * The hook subscribes to the cross-case correspondence store; when an
 * outbound item lands in Sent or Delivered, it schedules a timeout. On
 * fire, it transitions the item via `transitionOutbound` + writes back
 * to the store. Re-renders for the active case happen via the
 * active-case sync useEffect; queue / bell counts update from the same
 * store change.
 *
 * Disable behaviour: set `enabled = false` to pause the simulator. The
 * DemoControlsPanel writes a localStorage toggle that this hook reads
 * (read once on mount); the hook re-reads when `tick` increments via the
 * exported `bumpAutoSimDisabledFlag` setter.
 */

import * as React from "react";
import {
  getAllSnapshot,
  set as setCorrespondenceForCase,
  subscribe as subscribeToStore,
} from "../state/correspondenceStore";
import {
  transitionOutbound,
} from "../components/correspondence/correspondenceEngine";
import {
  isOutbound,
  type CorrespondenceItem,
  type OutboundCorrespondenceItem,
} from "../types/correspondence";

const SENT_TO_DELIVERED_MS = 10_000;
const DELIVERED_TO_ACK_MS = 10_000; // 20s total from Sent → Acknowledged

const LS_DISABLE_KEY = "dars.outbound.autoSim.disabled";

/** Public toggle. Default = enabled. */
export function isAutoSimDisabled(): boolean {
  try {
    return localStorage.getItem(LS_DISABLE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setAutoSimDisabled(disabled: boolean): void {
  try {
    if (disabled) localStorage.setItem(LS_DISABLE_KEY, "true");
    else localStorage.removeItem(LS_DISABLE_KEY);
  } catch {
    /* noop */
  }
  // Bump the in-memory revision so the hook reactively flips state.
  AUTO_SIM_REV++;
  AUTO_SIM_LISTENERS.forEach((fn) => fn());
}

let AUTO_SIM_REV = 0;
const AUTO_SIM_LISTENERS = new Set<() => void>();

function subscribeAutoSim(fn: () => void): () => void {
  AUTO_SIM_LISTENERS.add(fn);
  return () => AUTO_SIM_LISTENERS.delete(fn);
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Compute the next scheduled transition for a Sent / Delivered item.
 * Returns the delay in ms from `now` until the next transition should
 * fire, or null if nothing further is automated.
 */
function nextAutoTransition(
  item: OutboundCorrespondenceItem,
  now: number,
): { atMs: number; next: "Delivered" | "Acknowledged" } | null {
  const t = item.transmission;
  // Outbounds composed with the "Attorney Escalation" toggle on stay in
  // Draft until the attorney releases the case-level escalation. Skip
  // auto-sim for those — the parent's Release handler is responsible for
  // flipping them to Sent and clearing `pendingAttorneyReview`, at which
  // point this hook re-evaluates and schedules the Sent → Delivered hop.
  if (t.pendingAttorneyReview) return null;
  if (t.status === "Sent" && t.sentAt) {
    const due = new Date(t.sentAt).getTime() + SENT_TO_DELIVERED_MS;
    return { atMs: Math.max(0, due - now), next: "Delivered" };
  }
  if (t.status === "Delivered" && t.deliveredAt) {
    const due = new Date(t.deliveredAt).getTime() + DELIVERED_TO_ACK_MS;
    return { atMs: Math.max(0, due - now), next: "Acknowledged" };
  }
  return null;
}

export function useOutboundAutoSim(): void {
  const [, force] = React.useReducer((n: number) => n + 1, 0);
  // Re-render this hook when the disabled toggle flips.
  React.useEffect(() => subscribeAutoSim(force), []);

  // Subscribe to the correspondence store changes.
  const snapshot = React.useSyncExternalStore(
    subscribeToStore,
    getAllSnapshot,
    getAllSnapshot,
  );

  React.useEffect(() => {
    if (isAutoSimDisabled()) return;
    if (!snapshot || snapshot.size === 0) return;

    const now = Date.now();
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    snapshot.forEach((items, caseId) => {
      (items as CorrespondenceItem[]).forEach((item) => {
        if (!isOutbound(item)) return;
        const plan = nextAutoTransition(item, now);
        if (!plan) return;

        timers.push(
          setTimeout(() => {
            // Re-read the latest items at fire time — the user may have
            // manually stamped in the meantime.
            const latest = getAllSnapshot().get(caseId);
            if (!latest) return;
            const current = latest.find((i) => i.id === item.id);
            if (!current || !isOutbound(current)) return;

            // Bail if the status has changed since we scheduled.
            const expectedFrom =
              plan.next === "Delivered" ? "Sent" : "Delivered";
            if (current.transmission.status !== expectedFrom) return;

            const nextNow = new Date();
            const audit =
              plan.next === "Delivered"
                ? {
                    deliveredAt: nextNow,
                    deliveryConfirmedBy: "AutoSim" as const,
                  }
                : {
                    acknowledgedAt: nextNow,
                    acknowledgementRef: `AUTO-${shortId()}`,
                  };
            const updated = transitionOutbound(
              latest as CorrespondenceItem[],
              item.id,
              plan.next,
              audit,
            );
            setCorrespondenceForCase(caseId, updated);
          }, plan.atMs),
        );
      });
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [snapshot]);
}
