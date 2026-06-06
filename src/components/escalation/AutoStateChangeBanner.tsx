/**
 * AutoStateChangeBanner — pull-model surface for system-derived case
 * state changes.
 *
 * When the system mutates case state without an explicit user click
 * (e.g. the EA review window lapses on the 10-day clock), the case
 * needs a visible signal at the next time the Specialist opens it.
 * DARS is a pull-model app — no toasts, no push — so the auto-event
 * surfaces here as a banner with an explicit Acknowledge affordance.
 *
 * Acknowledging stamps the relevant `*AcknowledgedAt / By` field on
 * the case, appends an audit event recording the human acknowledgement
 * (so the audit trail captures BOTH the auto-event and the
 * acknowledgement), and clears the case from the queue's "Needs my
 * action" filter.
 *
 * Currently handles:
 *   - EA review window lapse (Workflow 2, Art. 8 + 10(2), EU Reg.
 *     2023/1543) — the case's `eevidenceGroundsForRefusal.windowLapsed`
 *     flag flips true automatically when the 10-day window passes
 *     with no GFR decision. Specialist sees this banner on next open.
 *
 * Architecturally a sibling of EscalationCompleteBanner — same
 * mounting strategy (page-top zone + Collection view), same
 * registry write-through.
 */

import { useCallback, useState } from "react";
import { CURRENT_USER } from "../../constants/caseConstants";
import type {
  EscalationAuditEvent,
  FormData,
} from "../../types/caseTypes";
import { setCaseFormDataInRegistry } from "../../utils/caseDataRegistry";
import { AlarmClock } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface Props {
  formData: FormData;
  setFormData: (updater: (prev: FormData) => FormData) => void;
}

export function AutoStateChangeBanner({ formData, setFormData }: Props) {
  const block = formData.eevidenceGroundsForRefusal;
  const [busy, setBusy] = useState(false);

  // EA review-window lapse: surface until the Specialist acknowledges.
  const showEaLapse =
    block?.windowLapsed === true && !block.windowLapseAcknowledgedAt;

  if (!showEaLapse) return null;

  const acknowledgeEaLapse = useCallback(() => {
    if (!block) return;
    setBusy(true);
    const now = new Date();
    setFormData((prev) => {
      const prevBlock = prev.eevidenceGroundsForRefusal;
      if (!prevBlock) return prev;
      const ackAudit: EscalationAuditEvent = {
        id: `audit-ea-lapse-ack-${Date.now().toString(36)}`,
        kind: "EaWindowLapseAcknowledged",
        actor: CURRENT_USER,
        actorRole: "ResponseSpecialist",
        performedAt: now,
        note:
          "Specialist acknowledged the auto-derived EA window lapse. " +
          "Delivery remains permitted under Art. 8 + 10(2); resume via " +
          "the GFR panel when ready.",
      };
      const next: FormData = {
        ...prev,
        eevidenceGroundsForRefusal: {
          ...prevBlock,
          windowLapseAcknowledgedAt: now,
          windowLapseAcknowledgedBy: CURRENT_USER,
        },
        escalationAuditEvents: [
          ...(prev.escalationAuditEvents ?? []),
          ackAudit,
        ],
      };
      // Round-trip to the registry so the queue's "Needs my action"
      // count + this case's badge clear on next render.
      setCaseFormDataInRegistry(prev.caseId, next);
      return next;
    });
  }, [block, setFormData]);

  // Format the lapse timestamp for the banner copy.
  const lapsedAt = block.windowLapsedAt
    ? new Date(block.windowLapsedAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-md border-l-4 px-4 py-3 mb-3",
        "bg-[#fff4ce] border-[#a26a00] text-[#7a4f00]",
      )}
    >
      <AlarmClock className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">
          System detected: EA review window expired — delivery now permitted
        </div>
        <div className="text-xs mt-0.5 opacity-90">
          The 10-day EA review window{lapsedAt ? ` lapsed on ${lapsedAt}` : " has lapsed"}{" "}
          with no decision. Under Art. 8 + 10(2), EU Reg. 2023/1543, the
          hold is automatically cleared and delivery is permitted. Use
          the GFR panel below to resume delivery when ready. Acknowledge
          to confirm you've seen this auto-event.
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={acknowledgeEaLapse}
        disabled={busy}
        className="shrink-0 bg-white"
      >
        Acknowledge
      </Button>
    </div>
  );
}
