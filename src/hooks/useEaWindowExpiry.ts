/**
 * useEaWindowExpiry — auto-fires EA-review-window lifecycle events on the
 * active case form.
 *
 * Watches the case's GFR block against the live wall-clock tick and
 * dispatches three lifecycle effects that the spec requires (Workflow 2 /
 * Art. 8 + 10(2) Reg. 2023/1543) but that nothing else in the codebase
 * currently triggers:
 *
 *   1. Day-10 lapse: when `eaReviewWindowExpiresAt` passes with no
 *      decision and no `windowLapsed` flag yet → sets `windowLapsed: true`,
 *      stamps `windowLapsedAt`, and appends an `EaWindowExpired` audit
 *      event.
 *
 *   2. EA cleared (Form1Review path): when an inbound GFR with
 *      `decision.kind === "None"` and `trigger === "Form1Review"` lands
 *      and no `GfrCleared` audit has been written yet → appends the
 *      `GfrCleared` audit event so the trail captures the moment.
 *
 * Both writes are idempotent: re-mounting the hook or re-running the
 * effect after the audit is already present is a no-op. The dispatcher
 * dedupes by inspecting `escalationAuditEvents` before appending.
 *
 * The hook ticks at the same cadence as the SLA chip (1/min via
 * `useCountdownTick`), which is enough for a 10-day window.
 */

import { useEffect, useRef } from "react";
import { CURRENT_USER } from "../constants/caseConstants";
import type {
  EscalationAuditEvent,
  FormData,
} from "../types/caseTypes";
import { useCountdownTick } from "./useCountdownTick";
import {
  gfrApplies,
  gfrBlock,
  currentDecision,
  gfrTrigger,
} from "../utils/groundsForRefusal";

interface UseEaWindowExpiryArgs {
  formData: FormData | null | undefined;
  setSharedFormData: ((next: FormData) => void) | undefined;
}

export function useEaWindowExpiry({
  formData,
  setSharedFormData,
}: UseEaWindowExpiryArgs): void {
  const now = useCountdownTick();
  // Stable refs so the effect closure reads the latest props without
  // resubscribing or re-running on each render.
  const formDataRef = useRef(formData);
  const setFormDataRef = useRef(setSharedFormData);
  formDataRef.current = formData;
  setFormDataRef.current = setSharedFormData;

  useEffect(() => {
    const fd = formDataRef.current;
    const setFd = setFormDataRef.current;
    if (!fd || !setFd) return;
    if (!gfrApplies(fd)) return;
    const block = gfrBlock(fd);
    if (!block) return;

    let next: FormData = fd;
    let changed = false;
    const auditEvents = next.escalationAuditEvents ?? [];

    // ── Effect 1: Day-10 lapse ───────────────────────────────────────
    // Dedupe is per-GFR-block via `block.windowLapsed`. The previous
    // belt-and-braces `hasAuditKind(events, "EaWindowExpired")` check
    // would block a fresh window-expiry firing if the case ever
    // received a re-issued EPOC with a new GFR block — the audit from
    // the first block stays in the log forever. The new block carries
    // its own `windowLapsed: false`, so the per-block flag is the
    // correct source of truth.
    const decision = currentDecision(next);
    const expiresAt = new Date(block.eaReviewWindowExpiresAt).getTime();
    const windowHasPassed = expiresAt < now.getTime();
    if (!decision && windowHasPassed && !block.windowLapsed) {
      const lapsedAt = new Date();
      const lapseAudit: EscalationAuditEvent = {
        id: `audit-ea-window-expired-${lapsedAt.getTime().toString(36)}`,
        kind: "EaWindowExpired",
        actor: "System",
        performedAt: lapsedAt,
        note:
          "EA review window expired with no decision. Hold lapsed by " +
          "operation of Art. 8 + 10(2), EU Reg. 2023/1543. Delivery is " +
          "now permitted; Specialist must manually initiate delivery.",
      };
      next = {
        ...next,
        eevidenceGroundsForRefusal: {
          ...block,
          windowLapsed: true,
          windowLapsedAt: lapsedAt,
          // Pull-model surface (audit P0 #2): the auto-derived lapse
          // raises an "unacknowledged auto state change" signal that
          // the Specialist clears via the AutoStateChangeBanner on
          // case open. Cases with unacknowledged lapses surface in the
          // "Needs my action" filter on the queue, so the
          // RS / TS pulls the case rather than waiting on a push.
          windowLapseAcknowledgedAt: undefined,
          windowLapseAcknowledgedBy: undefined,
        },
        escalationAuditEvents: [...auditEvents, lapseAudit],
      };
      changed = true;
    }

    // ── Effect 2: EA cleared (Form1Review + None) ────────────────────
    // Dedupe by matching against the decision's `decidedAt` timestamp
    // rather than the global presence of `GfrCleared`. A case that
    // ever receives a second None decision (e.g. re-issued EPOC) will
    // append a fresh audit event tagged with the new decision's
    // timestamp; the old audit's timestamp stays distinct.
    const trigger = gfrTrigger(next);
    const decisionAfter = currentDecision(next);
    if (decisionAfter?.kind === "None" && trigger === "Form1Review") {
      const clearedAuditAt =
        decisionAfter.decidedAt instanceof Date
          ? decisionAfter.decidedAt
          : new Date(decisionAfter.decidedAt);
      const alreadyFired = (next.escalationAuditEvents ?? []).some((ev) => {
        if (ev.kind !== "GfrCleared") return false;
        const evAt =
          ev.performedAt instanceof Date
            ? ev.performedAt
            : new Date(ev.performedAt);
        return evAt.getTime() === clearedAuditAt.getTime();
      });
      if (!alreadyFired) {
        const clearedAudit: EscalationAuditEvent = {
          id: `audit-gfr-cleared-${Date.now().toString(36)}`,
          kind: "GfrCleared",
          actor: decisionAfter.decidedBy ?? "Enforcing Authority",
          performedAt: clearedAuditAt,
          note:
            "EA confirmed no grounds for refusal (NoGroundsForRefusal). " +
            "Production may proceed.",
        };
        next = {
          ...next,
          escalationAuditEvents: [
            ...(next.escalationAuditEvents ?? []),
            clearedAudit,
          ],
        };
        changed = true;
      }
    }

    if (changed) {
      setFd(next);
    }
    // Re-run on every tick so the window-passed check stays current. The
    // body short-circuits when nothing needs to change, so it's cheap.
  }, [now]);
}

/** Pure helper used by the GFR Panel's Resume Delivery CTA. Sets the
 *  `manualDeliveryResumed` block flags + appends a
 *  `GfrDeliveryResumedManually` audit event. Idempotent — re-calling
 *  after the flag is already set returns the formData unchanged. */
export function applyManualDeliveryResume(formData: FormData): FormData {
  const block = formData.eevidenceGroundsForRefusal;
  if (!block) return formData;
  if (block.manualDeliveryResumed) return formData;
  const now = new Date();
  const audit: EscalationAuditEvent = {
    id: `audit-gfr-resumed-${now.getTime().toString(36)}`,
    kind: "GfrDeliveryResumedManually",
    actor: CURRENT_USER,
    actorRole: "ResponseSpecialist",
    performedAt: now,
    note:
      "Specialist manually resumed delivery after the 10-day EA review " +
      "window lapsed (Art. 8 + 10(2), EU Reg. 2023/1543).",
  };
  return {
    ...formData,
    eevidenceGroundsForRefusal: {
      ...block,
      manualDeliveryResumed: true,
      manualDeliveryResumedAt: now,
      manualDeliveryResumedBy: CURRENT_USER,
    },
    escalationAuditEvents: [
      ...(formData.escalationAuditEvents ?? []),
      audit,
    ],
  };
}
