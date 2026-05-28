/**
 * ConditionsBanner — rendered when the escalation status is
 * `ApprovedWithConditions` and the Specialist hasn't yet acknowledged
 * the conditions. Shows the attorney's conditions text + an Acknowledge
 * button that closes the banner and appends an `Acknowledged` audit
 * event.
 *
 * Conditions are advisory in the prototype — the banner is read-only
 * text + an acknowledgement; nothing programmatic is enforced.
 */

import * as React from "react";
import { CheckCircle2, ScrollText } from "lucide-react";
import { Button } from "../ui/button";
import { CURRENT_USER } from "../../constants/caseConstants";
import type {
  AttorneyEscalation,
  EscalationAuditEvent,
  FormData,
} from "../../types/caseTypes";
import { getActiveAttorneyEscalation } from "../../utils/caseEscalation";

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface ConditionsBannerProps {
  formData: FormData;
  /** Caller applies the acknowledgement + audit event to FormData. */
  onAcknowledge: (next: {
    auditEvent: EscalationAuditEvent;
    statusPatch: Partial<AttorneyEscalation>;
  }) => void;
}

export function ConditionsBanner({
  formData,
  onAcknowledge,
}: ConditionsBannerProps) {
  const esc = getActiveAttorneyEscalation(formData);
  if (!esc) return null;
  if (esc.status !== "ApprovedWithConditions") return null;
  if (esc.conditionsAcknowledgedAt) return null;
  if (!esc.conditionsNote) return null;

  const handleAcknowledge = () => {
    const now = new Date();
    onAcknowledge({
      auditEvent: {
        id: genId("audit"),
        kind: "Acknowledged",
        actor: CURRENT_USER,
        performedAt: now,
        note: "Specialist acknowledged the attorney's conditions.",
      },
      statusPatch: {
        conditionsAcknowledgedAt: now,
        conditionsAcknowledgedBy: CURRENT_USER,
      },
    });
  };

  return (
    <div
      role="status"
      className="rounded-md border border-[#5c2d91]/40 bg-[#f3f0fa] p-4 flex items-start gap-3"
    >
      <ScrollText
        className="w-5 h-5 text-[#5c2d91] flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 space-y-2">
        <div className="font-semibold text-[#3a1d61]">
          Approved with Conditions — acknowledge to proceed
        </div>
        <p className="text-sm text-[#323130] whitespace-pre-wrap">
          {esc.conditionsNote}
        </p>
        <p className="text-xs text-[#605e5c]">
          Conditions are advisory — your continued actions are logged in
          the case audit. Acknowledge to hide this banner.
        </p>
        <div className="pt-1">
          <Button
            type="button"
            onClick={handleAcknowledge}
            className="gap-1.5 bg-[#5c2d91] hover:bg-[#4b1f78] text-white h-8 px-3 text-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Acknowledge conditions
          </Button>
        </div>
      </div>
    </div>
  );
}
