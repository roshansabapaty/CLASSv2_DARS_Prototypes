/**
 * EscalationCompleteBanner — RS / TS pull-model affordance.
 *
 * Renders inside the case form when the attorney escalation is in a
 * terminal state (Approved for Delivery / Approved with Conditions /
 * Blocked) but the RS / TS has not yet acknowledged it. Clicking
 * Acknowledge stamps `rsAcknowledgedAt` + `rsAcknowledgedBy` on the
 * escalation and clears the "Attorney Escalation Complete" badge from
 * the queue.
 *
 * Sits at the top of the case form (above the IA-provided cards) so
 * the RS sees it first when they open a case that surfaced in the
 * "Needs my action" filter.
 */

import { useCallback, useState } from "react";
import { CURRENT_USER } from "../../constants/caseConstants";
import type { FormData } from "../../types/caseTypes";
import { acknowledgeAttorneyDecision } from "../../utils/caseEscalation";
import { setCaseFormDataInRegistry } from "../../utils/caseDataRegistry";
import { CheckCircle2, Gavel, Info } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface Props {
  formData: FormData;
  setFormData: (updater: (prev: FormData) => FormData) => void;
}

export function EscalationCompleteBanner({ formData, setFormData }: Props) {
  const esc = formData.attorneyEscalation;
  const [ackInProgress, setAckInProgress] = useState(false);

  const shouldShow =
    esc &&
    (esc.status === "ApprovedForDelivery" ||
      esc.status === "ApprovedWithConditions" ||
      esc.status === "Blocked") &&
    !esc.rsAcknowledgedAt;

  const acknowledge = useCallback(() => {
    if (!esc) return;
    setAckInProgress(true);
    const now = new Date();
    setFormData((prev) => {
      const next = acknowledgeAttorneyDecision(
        prev,
        { kind: "all" },
        {
          at: now,
          by: CURRENT_USER,
          auditEvent: {
            id: `audit-esc-ack-${Date.now().toString(36)}`,
            kind: "EscalationAcknowledged",
            actor: CURRENT_USER,
            actorRole: "ResponseSpecialist",
            performedAt: now,
            note: `Acknowledged ${esc.status} attorney decision.`,
          },
        },
      );
      // Round-trip to the case-data registry so the queue / attorney
      // dashboard pick up the ack on next render (badge clears).
      setCaseFormDataInRegistry(prev.caseId, next);
      return next;
    });
  }, [esc, setFormData]);

  if (!shouldShow || !esc) return null;

  const tone =
    esc.status === "Blocked"
      ? "danger"
      : esc.status === "ApprovedWithConditions"
        ? "warn"
        : "success";

  const outcomeLabel =
    esc.status === "ApprovedForDelivery"
      ? "Approved for delivery"
      : esc.status === "ApprovedWithConditions"
        ? "Approved with conditions"
        : "Blocked";

  const Icon =
    esc.status === "Blocked" ? Gavel : esc.status === "ApprovedWithConditions" ? Info : CheckCircle2;

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-md border-l-4 px-4 py-3 mb-3",
        tone === "danger" && "bg-[#fde7e9] border-[#a4262c] text-[#a4262c]",
        tone === "warn" && "bg-[#fff4ce] border-[#a26a00] text-[#7a4f00]",
        tone === "success" && "bg-[#dff6dd] border-[#107c10] text-[#0b6a0b]",
      )}
    >
      <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">
          Attorney escalation complete — {outcomeLabel}
        </div>
        <div className="text-xs mt-0.5 opacity-90">
          {esc.escalatedBy} escalated this case; the assigned attorney has
          finished their review. Acknowledge to clear the badge from the
          queue and confirm you've picked up the case.
        </div>
        {esc.status === "ApprovedWithConditions" && esc.conditionsNote && (
          <div className="text-xs mt-1 opacity-90">
            <span className="font-semibold">Conditions:</span> {esc.conditionsNote}
          </div>
        )}
        {esc.status === "Blocked" && esc.blockingNote && (
          <div className="text-xs mt-1 opacity-90">
            <span className="font-semibold">Blocking note:</span> {esc.blockingNote}
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={acknowledge}
        disabled={ackInProgress}
        className="shrink-0 bg-white"
      >
        Acknowledge
      </Button>
    </div>
  );
}
