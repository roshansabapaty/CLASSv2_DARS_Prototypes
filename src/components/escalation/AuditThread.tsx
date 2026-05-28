/**
 * AuditThread — dedicated audit log surface for escalation events.
 * Renders `formData.escalationAuditEvents[]` chronologically (newest
 * first) with kind-aware icons + tinting. Separate from the case's
 * NotesTimeline (which stays focused on free-text RS notes).
 *
 * Mounts below the case body's Operational Case Review section.
 * Self-hides when there are no audit events.
 */

import * as React from "react";
import { Card } from "../ui/card";
import {
  Scale,
  CircleCheck,
  CheckCircle2,
  MessageCircleQuestion,
  Ban,
  Play,
  ThumbsUp,
  CornerUpLeft,
  Bell,
  Timer,
  CircleDot,
  Hourglass,
  Gavel,
  AlarmClock,
  ShieldCheck,
  KeyRound,
  Undo2,
} from "lucide-react";
import { cn } from "../ui/utils";
import { ESCALATION_ROLES } from "../../constants/caseConstants";
import type {
  EscalationAuditEvent,
  FormData,
} from "../../types/caseTypes";

function formatTimestamp(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface KindMeta {
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: string }>;
  label: string;
  tone: "purple" | "green" | "warn" | "danger" | "slate" | "blue";
}

const KIND_META: Record<EscalationAuditEvent["kind"], KindMeta> = {
  Escalated: { Icon: Scale, label: "Escalated", tone: "purple" },
  Released: {
    Icon: CircleCheck,
    label: "Released / Approved for Delivery",
    tone: "green",
  },
  ApprovedWithConditions: {
    Icon: CheckCircle2,
    label: "Approved with Conditions",
    tone: "purple",
  },
  InformationRequested: {
    Icon: MessageCircleQuestion,
    label: "Information Requested",
    tone: "warn",
  },
  Blocked: { Icon: Ban, label: "Blocked", tone: "danger" },
  Resumed: { Icon: Play, label: "Escalation Resumed", tone: "blue" },
  Acknowledged: { Icon: ThumbsUp, label: "Acknowledged", tone: "blue" },
  ReassignedToSpecialist: {
    Icon: CornerUpLeft,
    label: "Reassigned to Specialist",
    tone: "blue",
  },
  LeadNotified: { Icon: Bell, label: "LENS Lead notified", tone: "warn" },
  SLAStopped: { Icon: Timer, label: "SLA timer stopped", tone: "slate" },
  SLAResumed: { Icon: Play, label: "SLA timer resumed", tone: "blue" },
  RfiReplyOverdue: {
    Icon: Hourglass,
    label: "RFI reply window breached",
    tone: "danger",
  },
  RfiReplied: {
    Icon: CornerUpLeft,
    label: "RFI reply sent",
    tone: "blue",
  },
  PaiPromptDismissed: {
    Icon: CircleDot,
    label: "PAI prompt dismissed",
    tone: "slate",
  },
  GfrReceived: {
    Icon: Gavel,
    label: "Grounds for Refusal received",
    tone: "danger",
  },
  EaWindowExpired: {
    Icon: AlarmClock,
    label: "EA review window expired",
    tone: "warn",
  },
  GfrCleared: {
    Icon: ShieldCheck,
    label: "Grounds for Refusal cleared",
    tone: "green",
  },
  GfrDeliveryResumedManually: {
    Icon: KeyRound,
    label: "Delivery manually resumed after EA window lapse",
    tone: "warn",
  },
  Form3Retracted: {
    Icon: Undo2,
    label: "Form 3 retracted by Specialist",
    tone: "warn",
  },
};

const toneClasses: Record<KindMeta["tone"], { icon: string; chip: string }> = {
  purple: {
    icon: "text-[#5c2d91] bg-[#f3f0fa] border-[#5c2d91]/30",
    chip: "text-[#5c2d91]",
  },
  green: {
    icon: "text-[#107c10] bg-[#f3faf2] border-[#107c10]/30",
    chip: "text-[#107c10]",
  },
  warn: {
    icon: "text-[#ca5010] bg-[#fff4e6] border-[#ca5010]/30",
    chip: "text-[#7a3a00]",
  },
  danger: {
    icon: "text-[#c50f1f] bg-[#fef0f0] border-[#c50f1f]/30",
    chip: "text-[#c50f1f]",
  },
  slate: {
    icon: "text-[#605e5c] bg-[#f3f2f1] border-[#8a8886]/30",
    chip: "text-[#605e5c]",
  },
  blue: {
    icon: "text-[#0078d4] bg-[#deecf9] border-[#0078d4]/30",
    chip: "text-[#0078d4]",
  },
};

export interface AuditThreadProps {
  formData: FormData;
}

export function AuditThread({ formData }: AuditThreadProps) {
  const events = formData.escalationAuditEvents ?? [];
  if (events.length === 0) return null;

  // Newest first — sort defensively in case callers appended out of order.
  const ordered = [...events].sort(
    (a, b) =>
      new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
  );

  return (
    <Card className="p-4 border border-[#e1dfdd] shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <CircleDot className="w-4 h-4 text-[#5c2d91]" aria-hidden="true" />
        <h3 className="text-base font-semibold text-[#323130]">Audit Thread</h3>
        <span className="text-xs text-[#605e5c]">
          {events.length} event{events.length === 1 ? "" : "s"}
        </span>
      </div>

      <ol className="space-y-3">
        {ordered.map((evt) => {
          const meta = KIND_META[evt.kind] ?? {
            Icon: CircleDot,
            label: evt.kind,
            tone: "slate" as const,
          };
          const tone = toneClasses[meta.tone];
          const roleLabel = evt.actorRole
            ? ESCALATION_ROLES.find((r) => r.value === evt.actorRole)?.label
            : undefined;
          return (
            <li key={evt.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0",
                  tone.icon,
                )}
              >
                <meta.Icon className="w-3.5 h-3.5" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={cn("text-sm font-semibold", tone.chip)}>
                    {meta.label}
                  </span>
                  <span className="text-xs text-[#605e5c]">
                    {evt.actor}
                    {roleLabel && ` · ${roleLabel}`}
                  </span>
                  <span className="text-xs text-[#a19f9d]">
                    {formatTimestamp(evt.performedAt)}
                  </span>
                </div>
                {evt.note && (
                  <p className="text-sm text-[#323130] whitespace-pre-wrap mt-0.5">
                    {evt.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
