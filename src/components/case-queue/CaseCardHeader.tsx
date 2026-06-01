/**
 * CaseCardHeader — Title row of the redesigned queue card.
 *
 * Displays: Case ID (copyable) + Blocked-by-LE badge
 *           | right-aligned: Case Stage badge + Due Date
 *
 * Option C applied: P-level badge and priority label removed from header.
 * Priority signals now consolidated in CaseCardOperationalBadges (Row 1).
 */

import { Badge } from "../ui/badge";
import {
  Send,
  Ban,
  Mail,
  Clock,
  Hourglass,
  Scale,
} from "lucide-react";
import { CopyableText } from "../CopyButton";
import { TruncatedText } from "../ui/truncated-text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { CaseQueueItem } from "./case-queue-types";
import { SlaDeadlineChip } from "../sla/SlaDeadlineChip";
import { isCaseSlaPausedById } from "../../utils/slaTimer";
import { useCorrespondenceNotifications } from "../../hooks/useCorrespondenceNotifications";
import {
  daysLeftForInboundRfi,
  resolveReplyWindow,
  bucketLabel,
} from "../../utils/rfiReplyWindow";

interface CaseCardHeaderProps {
  caseItem: CaseQueueItem;
}

// EPOC Form 3 — Non-Execution Response. Per EU Reg 2023/1543 the IA has
// 5 days from acknowledgement to issue a reply. Used by the "awaiting
// reply" badge to compute days-left.
const FORM3_REPLY_WINDOW_DAYS = 5;

function daysLeftFromAck(ackAt: Date | undefined): number | undefined {
  if (!ackAt) return undefined;
  const ackTime = new Date(ackAt).getTime();
  const deadline = ackTime + FORM3_REPLY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const diffMs = deadline - Date.now();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

// Per-jurisdiction RFI reply windows live in `utils/rfiReplyWindow.ts`.
// The badge calls `daysLeftForInboundRfi(inbound, caseCountry)` which
// applies the authority-provided deadline when present and falls back
// to a jurisdiction-specific default otherwise.

export function CaseCardHeader({
  caseItem,
}: CaseCardHeaderProps) {
  // Phase 2: per-case correspondence counts. The hook is a no-op
  // re-renderer when the store hasn't changed, so per-card mounting is fine.
  const { perCase } = useCorrespondenceNotifications();
  const correspondence = perCase.get(caseItem.caseId);
  const unread = correspondence?.unread ?? 0;
  const pending = correspondence?.pending ?? 0;
  const awaitingReply = correspondence?.awaitingReply ?? 0;
  const heldForAttorney = correspondence?.heldForAttorney ?? 0;
  const oldestAwaitingReply = correspondence?.oldestAwaitingReply;
  const replyDaysLeft = daysLeftFromAck(
    oldestAwaitingReply?.transmission.acknowledgedAt,
  );
  const awaitingOurReply = correspondence?.awaitingOurReply ?? 0;
  const oldestAwaitingOurReply = correspondence?.oldestAwaitingOurReply;
  const rfiReplyDaysLeft = daysLeftForInboundRfi(
    oldestAwaitingOurReply,
    caseItem.country,
  );
  const rfiReplyWindow = resolveReplyWindow(
    oldestAwaitingOurReply,
    caseItem.country,
  );

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <CopyableText text={caseItem.caseId} copyLabel="Copy case ID">
          <TruncatedText
            className="font-mono text-base text-slate-900 truncate min-w-0 max-w-[280px]"
            style={{ fontWeight: 600 }}
            tooltipText={caseItem.caseId}
          >
            {caseItem.caseId}
          </TruncatedText>
        </CopyableText>

        {/* Phase 2: unread inbound correspondence */}
        {unread > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="bg-[#deecf9] text-[#0078d4] border-[#0078d4] text-xs cursor-help"
                  style={{ fontWeight: 500 }}
                >
                  <Mail className="w-3 h-3 mr-1" />
                  {unread} new
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs" style={{ fontWeight: 600 }}>
                  {unread} unread inbound message{unread === 1 ? "" : "s"} from
                  the issuing or enforcing authority
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Phase 2: outbound awaiting acknowledgement */}
        {pending > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825] text-xs cursor-help"
                  style={{ fontWeight: 500 }}
                  aria-label={`${pending} outbound message${pending === 1 ? "" : "s"} awaiting authority acknowledgement`}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Acknowledgement pending
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs" style={{ fontWeight: 600 }}>
                  {pending} outbound item{pending === 1 ? "" : "s"} awaiting
                  acknowledgement from the authority
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Outbound Form 3 acknowledged by IA — awaiting their substantive
            reply within the 5-day Reg 2023/1543 window. The badge ticks
            down to 0 and flips amber → red when the window is breached. */}
        {awaitingReply > 0 && replyDaysLeft !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={
                    replyDaysLeft <= 0
                      ? "bg-[#fde7e9] text-[#a4262c] border-[#a4262c] text-xs cursor-help"
                      : replyDaysLeft <= 1
                        ? "bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825] text-xs cursor-help"
                        : "bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825]/60 text-xs cursor-help"
                  }
                  style={{ fontWeight: 500 }}
                  aria-label={
                    replyDaysLeft <= 0
                      ? `Form 3 reply overdue by ${Math.abs(replyDaysLeft)} day${Math.abs(replyDaysLeft) === 1 ? "" : "s"}`
                      : `Form 3 awaiting reply: ${replyDaysLeft} day${replyDaysLeft === 1 ? "" : "s"} remaining${replyDaysLeft <= 1 ? " (due soon)" : ""}`
                  }
                >
                  <Hourglass className="w-3 h-3 mr-1" />
                  {replyDaysLeft <= 0
                    ? `Form 3 reply overdue${
                        replyDaysLeft < 0
                          ? ` • ${Math.abs(replyDaysLeft)}d`
                          : ""
                      }`
                    : `Form 3 awaiting reply • ${replyDaysLeft}d${
                        replyDaysLeft <= 1 ? " (due soon)" : ""
                      }`}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <p style={{ fontWeight: 600 }}>
                    {replyDaysLeft <= 0
                      ? "Form 3 reply window breached"
                      : "Awaiting Form 3 reply from issuing authority"}
                  </p>
                  <p className="text-slate-300">
                    Form 3 acknowledged by IA on{" "}
                    {oldestAwaitingReply?.transmission.acknowledgedAt
                      ? new Date(
                          oldestAwaitingReply.transmission.acknowledgedAt,
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                    . Per Reg 2023/1543, the IA has 5 days from
                    acknowledgement to reply.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Inbound RFI from the authority that we haven't replied to.
            Countdown computed from the inbound's followUp.requiredBy
            (or fallback 5d after receipt). Flips amber → red as the
            window closes. */}
        {awaitingOurReply > 0 && rfiReplyDaysLeft !== undefined && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={
                    rfiReplyDaysLeft <= 0
                      ? "bg-[#fde7e9] text-[#a4262c] border-[#a4262c] text-xs cursor-help"
                      : rfiReplyDaysLeft <= 1
                        ? "bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825] text-xs cursor-help"
                        : "bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825]/60 text-xs cursor-help"
                  }
                  style={{ fontWeight: 500 }}
                  aria-label={
                    rfiReplyDaysLeft <= 0
                      ? `RFI reply overdue by ${Math.abs(rfiReplyDaysLeft)} day${Math.abs(rfiReplyDaysLeft) === 1 ? "" : "s"}`
                      : `RFI reply due in ${rfiReplyDaysLeft} day${rfiReplyDaysLeft === 1 ? "" : "s"}${rfiReplyDaysLeft <= 1 ? " (due soon)" : ""}`
                  }
                >
                  <Hourglass className="w-3 h-3 mr-1" />
                  {rfiReplyDaysLeft <= 0
                    ? `RFI reply overdue${
                        rfiReplyDaysLeft < 0
                          ? ` • ${Math.abs(rfiReplyDaysLeft)}d`
                          : ""
                      }`
                    : `RFI reply due • ${rfiReplyDaysLeft}d${
                        rfiReplyDaysLeft <= 1 ? " (due soon)" : ""
                      }`}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <p style={{ fontWeight: 600 }}>
                    {rfiReplyDaysLeft <= 0
                      ? "RFI reply window breached"
                      : "Authority awaiting our reply to an RFI"}
                  </p>
                  <p className="text-slate-300">
                    {awaitingOurReply} inbound Request for Additional
                    Information item{awaitingOurReply === 1 ? "" : "s"}
                    {" "}
                    {awaitingOurReply === 1 ? "is" : "are"} pending a Provide
                    Additional Information reply from us.
                  </p>
                  {rfiReplyWindow && (
                    <p className="text-slate-400">
                      Window: {rfiReplyWindow.days} day
                      {rfiReplyWindow.days === 1 ? "" : "s"} ·{" "}
                      {rfiReplyWindow.source === "metadata"
                        ? "authority-set deadline"
                        : `default for ${bucketLabel(rfiReplyWindow.bucket ?? "__fallback")}`}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Outbound held under the Attorney Escalation toggle. Red urgent
            badge — the case is blocked behind attorney review. */}
        {heldForAttorney > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="bg-[#fde7e9] text-[#a4262c] border-[#a4262c] text-xs cursor-help"
                  style={{ fontWeight: 600 }}
                  aria-label={`Attorney review required: ${heldForAttorney} outbound message${heldForAttorney === 1 ? "" : "s"} held in Draft`}
                >
                  <Scale className="w-3 h-3 mr-1" />
                  Attorney review required
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs" style={{ fontWeight: 600 }}>
                  {heldForAttorney} outbound message
                  {heldForAttorney === 1 ? "" : "s"} held in Draft pending
                  attorney review before transmission
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Blocked by Issuing/Enforcing Authority */}
        {caseItem.escalatedToLE && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="bg-[#fde7e9] text-[#d13438] border-[#d13438] text-xs cursor-help"
                  style={{ fontWeight: 500 }}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Blocked by Issuing/Enforcing Authority
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs" style={{ fontWeight: 600 }}>
                  Case escalated to issuing/enforcing authority — awaiting response
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Authorization Cancellation / Withdrawal — LE-driven terminal state.
            Phase 5c.5: extended to cover Withdrawn so RS can spot terminal
            cases from the queue before opening them. */}
        {(caseItem.authorizationDesiredStatus === "Cancelled" ||
          caseItem.authorizationDesiredStatus === "Withdrawn") && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825] text-xs cursor-help animate-pulse"
                  style={{ fontWeight: 500 }}
                >
                  <Ban className="w-3 h-3 mr-1" />
                  LE {caseItem.authorizationDesiredStatus}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs" style={{ fontWeight: 600 }}>
                  Sending authority has marked this authorization as
                  {" "}{caseItem.authorizationDesiredStatus} — action required
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Right side: Case Stage + Due Date */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="text-xs px-2.5 py-0.5 cursor-help bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
              >
                {caseItem.caseStage}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs" style={{ fontWeight: 600 }}>Case Status</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <span className="text-slate-400 text-xs">&bull;</span>

        {/* SLA Deadline chip — replaces the plain due-date string. Live-ticks
            once a minute and flips colour as the case approaches/exceeds SLA. */}
        <SlaDeadlineChip
          tier={caseItem.casePriority}
          dueDate={caseItem.dueDate}
          dateReceived={caseItem.createDate}
          paused={isCaseSlaPausedById(caseItem.caseId)}
        />
      </div>
    </div>
  );
}
