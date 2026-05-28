/**
 * useInboundEventHandler — generic seam that watches a case's inbound
 * correspondence and applies per-kind FormData mutations.
 *
 * Why this exists: the correspondence store captures inbound items but
 * does not mutate the case's FormData on receipt. The eEvidence workflow
 * needs the opposite — when the IA sends a Form 6 (PreservationExtension),
 * the case's `desiredPreservationExpiration` should bump; when an
 * EndPreservation lands, the 45-day retention clock should start; when an
 * inbound triggers Form 3 obligation, the SP should be prompted. This
 * hook is the seam that closes that gap.
 *
 * Design:
 *  - Caller supplies a `handlers` object keyed by `InboundKind`.
 *  - Each handler receives `(item, formData)` and returns a partial
 *    FormData mutation (or `null` to skip).
 *  - Idempotency: before running a handler, the hook checks whether an
 *    `EscalationAuditEvent` already exists with `kind === auditKind &&
 *    documentId === item.documentId`. If so, the handler is skipped.
 *    Handlers MUST append an audit event with the document attribution
 *    so re-runs after re-mount don't double-apply.
 *  - The hook subscribes to the correspondence store directly; callers
 *    don't need to wire it.
 */

import { useEffect, useRef } from "react";
import {
  get as getCorrespondenceForCase,
  subscribe as subscribeToCorrespondenceStore,
} from "../state/correspondenceStore";
import type { FormData, EscalationAuditEvent } from "../types/caseTypes";
import type {
  CorrespondenceItem,
  InboundCorrespondenceItem,
  InboundKind,
} from "../types/correspondence";

/** Each handler returns the updated FormData (or null to skip the item).
 *  Handlers MUST append at least one EscalationAuditEvent carrying
 *  `documentId === item.documentId` so the idempotency check can detect
 *  the prior run. */
export type InboundEventHandler = (
  item: InboundCorrespondenceItem,
  formData: FormData,
) => FormData | null;

/** Registry of handlers — kind -> handler. */
export type InboundEventHandlerRegistry = Partial<
  Record<InboundKind, InboundEventHandler>
>;

interface UseInboundEventHandlerArgs {
  formData: FormData | null | undefined;
  setSharedFormData: ((next: FormData) => void) | undefined;
  handlers: InboundEventHandlerRegistry;
}

/** Has this inbound already been processed by a handler? Detected by
 *  presence of an audit event referencing the same documentId. */
function isAlreadyProcessed(
  item: InboundCorrespondenceItem,
  events: EscalationAuditEvent[] | undefined,
): boolean {
  if (!item.documentId) {
    // Without a documentId we can't dedupe reliably — fall back to a
    // stable per-id check on the item.id, which is always present.
    if (!events) return false;
    return events.some(
      (ev) => ev.documentId === item.id || ev.documentId === `inbound:${item.id}`,
    );
  }
  if (!events) return false;
  return events.some((ev) => ev.documentId === item.documentId);
}

export function useInboundEventHandler({
  formData,
  setSharedFormData,
  handlers,
}: UseInboundEventHandlerArgs): void {
  // Keep a stable ref to the latest formData + handlers so the store
  // subscription closure doesn't need to re-subscribe per render.
  const formDataRef = useRef(formData);
  const handlersRef = useRef(handlers);
  const setFormDataRef = useRef(setSharedFormData);
  formDataRef.current = formData;
  handlersRef.current = handlers;
  setFormDataRef.current = setSharedFormData;

  useEffect(() => {
    const tick = () => {
      const fd = formDataRef.current;
      const setFd = setFormDataRef.current;
      const hs = handlersRef.current;
      if (!fd || !setFd) return;
      const caseId = fd.caseId;
      if (!caseId) return;
      const items = getCorrespondenceForCase(caseId) as CorrespondenceItem[];
      // Find inbound items whose kind has a registered handler and
      // which haven't been processed yet.
      let next: FormData = fd;
      let changed = false;
      for (const item of items) {
        if (item.direction !== "Inbound") continue;
        const handler = hs[item.kind];
        if (!handler) continue;
        if (isAlreadyProcessed(item, next.escalationAuditEvents)) continue;
        const result = handler(item, next);
        if (result && result !== next) {
          next = result;
          changed = true;
        }
      }
      if (changed) {
        setFd(next);
      }
    };

    // Run once on mount to catch pre-seeded inbounds that arrived
    // before the hook attached.
    tick();
    const unsub = subscribeToCorrespondenceStore(tick);
    return unsub;
  }, []);
}
