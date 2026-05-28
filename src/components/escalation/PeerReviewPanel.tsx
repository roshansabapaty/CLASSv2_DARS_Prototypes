/**
 * PeerReviewPanel — case-body panel rendered when the active escalation
 * targets a non-Attorney role (LENS Lead/Manager, Response Specialist,
 * Triage Specialist) and is in a non-terminal status.
 *
 * Surfaces two actions:
 *   - Acknowledge      — closes the escalation; appends an
 *                        `Acknowledged` audit event.
 *   - Reassign to RS   — opens AttorneyActionDialog for a required note;
 *                        appends a `ReassignedToSpecialist` audit event.
 *
 * The panel mirrors AttorneyReviewPanel's structure but with the
 * lower-stakes Acknowledge / Reassign affordances.
 */

import * as React from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Users, ThumbsUp, CornerUpLeft, Clock } from "lucide-react";
import {
  ESCALATION_DIRECTORY,
  ESCALATION_ROLES,
  CURRENT_USER,
} from "../../constants/caseConstants";
import { AttorneyActionDialog } from "./AttorneyActionDialog";
import { getActiveAttorneyEscalation } from "../../utils/caseEscalation";
import type {
  AttorneyAction,
  AttorneyEscalation,
  EscalationAuditEvent,
  FormData,
} from "../../types/caseTypes";

function formatRelativeAge(d: Date | string): string {
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} hr ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface PeerReviewPanelProps {
  formData: FormData;
  onPeerAction: (next: {
    action: AttorneyAction;
    auditEvent: EscalationAuditEvent;
    statusPatch?: Partial<AttorneyEscalation>;
  }) => void;
  /** Optional DOM id applied to the outer Card. Used by the page-top
   *  `ReviewRequiredAlertBanner` to scroll this panel into view. */
  id?: string;
}

export function PeerReviewPanel({
  formData,
  onPeerAction,
  id = "peer-review-panel",
}: PeerReviewPanelProps) {
  const esc = getActiveAttorneyEscalation(formData);
  const [showReassign, setShowReassign] = React.useState(false);

  if (!esc) return null;
  if (esc.role === "Attorney") return null;
  if (esc.status === "ApprovedForDelivery") return null;

  const roleLabel =
    ESCALATION_ROLES.find((r) => r.value === esc.role)?.label ?? esc.role;
  const assignee = esc.assignedAttorneyId
    ? ESCALATION_DIRECTORY.find((d) => d.id === esc.assignedAttorneyId)
    : undefined;
  const reviewerName = assignee?.name ?? CURRENT_USER;

  const fire = (
    actionType: "Release" | "RequestMoreInformation",
    auditKind: EscalationAuditEvent["kind"],
    note: string | undefined,
    statusPatch: Partial<AttorneyEscalation>,
  ) => {
    const now = new Date();
    const action: AttorneyAction = {
      id: genId("act"),
      action: actionType,
      attorneyName: reviewerName,
      performedAt: now,
      note,
    };
    const auditEvent: EscalationAuditEvent = {
      id: genId("audit"),
      kind: auditKind,
      actor: reviewerName,
      actorRole: esc.role,
      performedAt: now,
      note,
    };
    onPeerAction({ action, auditEvent, statusPatch });
  };

  const handleAcknowledge = () => {
    fire("Release", "Acknowledged", undefined, {
      status: "ApprovedForDelivery",
    });
  };

  return (
    <Card id={id} className="p-4 border-l-4 border-l-[#486991] bg-[#f4f7fb] shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
        <div className="flex items-start gap-2">
          <Users className="w-5 h-5 text-[#486991] mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <h3 className="text-base font-semibold text-[#323130]">
              Review Requested
            </h3>
            <p className="text-xs text-[#605e5c] flex items-center gap-2 flex-wrap">
              <span>
                Escalated by <b>{esc.escalatedBy}</b>
              </span>
              <span className="text-[#a19f9d]">·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatRelativeAge(esc.escalatedAt)}
              </span>
              <span className="text-[#a19f9d]">·</span>
              <span>
                Targeted: <b>{roleLabel}</b>
                {assignee && ` · ${assignee.name}`}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-md bg-white border border-[#e1dfdd] p-3">
        <div className="text-[10px] uppercase tracking-wide text-[#605e5c] font-semibold mb-1">
          Reason for escalation
        </div>
        <p className="text-sm text-[#323130] whitespace-pre-wrap">{esc.reason}</p>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-[#605e5c] font-semibold">
          Take action
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleAcknowledge}
            className="gap-1.5 bg-[#486991] hover:bg-[#385575] text-white"
          >
            <ThumbsUp className="w-4 h-4" />
            Acknowledge
          </Button>
          <Button
            onClick={() => setShowReassign(true)}
            variant="outline"
            className="gap-1.5 border-[#486991] text-[#486991] hover:bg-[#eaf0f7]"
          >
            <CornerUpLeft className="w-4 h-4" />
            Reassign to Specialist…
          </Button>
        </div>
      </div>

      {showReassign && (
        <AttorneyActionDialog
          open={showReassign}
          onOpenChange={setShowReassign}
          title="Reassign to Specialist"
          description="Send this escalation back to the Specialist with a note explaining why. The escalation closes; the Specialist can re-open it after replying."
          notePromptLabel="Note to Specialist"
          notePlaceholder="Explain why you're handing this back to the Specialist..."
          confirmLabel="Reassign"
          tier="primary"
          onConfirm={(note) => {
            fire("RequestMoreInformation", "ReassignedToSpecialist", note, {
              status: "InformationRequested",
              informationRequest: note,
            });
            setShowReassign(false);
          }}
        />
      )}
    </Card>
  );
}
