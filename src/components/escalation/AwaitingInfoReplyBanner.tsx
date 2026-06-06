/**
 * AwaitingInfoReplyBanner — surfaces on the case overview when the
 * attorney has bounced the case back with `InformationRequested` AND
 * the authority has subsequently replied with one or more Provide
 * Additional Information inbounds. The RS now has the info the
 * attorney asked for (or knows the reply is inadequate); the banner
 * prompts them to Resume Escalation, or to send another RFI if the
 * authority's reply didn't satisfy the attorney's question.
 *
 * Per Edge Case 3 decisions (see
 * `docs/RFI_PAI_Edge_Cases_For_Review.md`):
 *  - Resume is **manual** — the RS reads the PAI and adds commentary
 *    via the EscalateToAttorneyDialog in resume mode.
 *  - When multiple PAIs have landed since the InformationRequested
 *    event, the banner reads "N replies received, most recent: …".
 *  - A secondary "Send another RFI" link covers the inadequate-PAI
 *    case without trapping the RS in the Resume path.
 *  - An × dismiss button hides the banner for the page session and
 *    writes a `PaiPromptDismissed` audit event so the RS's
 *    deliberate not-now is captured in the AuditThread.
 */

import * as React from "react";
import { Inbox, ChevronRight, X } from "lucide-react";
import { Button } from "../ui/button";
import { isInbound } from "../../types/correspondence";
import type {
  CorrespondenceItem,
  InboundCorrespondenceItem,
} from "../../types/correspondence";
import type { FormData } from "../../types/caseTypes";
import { getActiveAttorneyEscalation } from "../../utils/caseEscalation";

export interface AwaitingInfoReplyBannerProps {
  formData: FormData;
  /** Opens the EscalateToAttorneyDialog. The parent's existing
   *  `escalateDialogMode` derivation (status === "InformationRequested"
   *  → "resume") routes it correctly. */
  onOpenEscalateDialog: () => void;
  /** Opens the composer with an unsolicited RFI template attached —
   *  used when the authority's PAI didn't satisfy the attorney's
   *  question and the RS needs to ask for more. Distinct from
   *  replying to an inbound RFI: this RFI is NOT in reply to
   *  anything, so the send handler should NOT write an RfiReplied
   *  audit event. The parent handler owns this distinction. */
  onSendAnotherRfi?: () => void;
  /** Called when the RS dismisses the banner via the × button.
   *  Caller writes a `PaiPromptDismissed` audit event with the
   *  reply count + newest subject for the AuditThread. */
  onDismiss?: (replyCount: number, newestSubject: string) => void;
}

export function findFreshPaiInbounds(
  correspondence: CorrespondenceItem[] | undefined,
  informationRequestedAt: Date | undefined,
): InboundCorrespondenceItem[] {
  if (!correspondence) return [];
  const cutoff = informationRequestedAt
    ? new Date(informationRequestedAt).getTime()
    : 0;
  const out: InboundCorrespondenceItem[] = [];
  for (const item of correspondence) {
    if (!isInbound(item)) continue;
    if (item.kind !== "ProvideAdditionalInformation") continue;
    const ts = new Date(item.createdAt).getTime();
    if (ts < cutoff) continue;
    out.push(item);
  }
  // Newest first.
  out.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return out;
}

function relativeAge(d: Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AwaitingInfoReplyBanner({
  formData,
  onOpenEscalateDialog,
  onSendAnotherRfi,
  onDismiss,
}: AwaitingInfoReplyBannerProps) {
  // Page-session dismissal — once the RS clicks ×, the banner stays
  // hidden until the next page load. Per Edge Case 3 decision 4 the
  // dismissal does NOT persist across page loads; it just spares the
  // RS the prompt for the current session while the audit event
  // logs the deliberate not-now decision.
  const [dismissed, setDismissed] = React.useState(false);

  const esc = getActiveAttorneyEscalation(formData);
  if (!esc) return null;
  if (esc.status !== "InformationRequested") return null;
  if (dismissed) return null;

  // Find the most recent attorney `InformationRequested` audit event so
  // we only count PAI inbounds that landed after the ask. Avoids the
  // banner firing on stale PAI traffic that predated the escalation.
  const lastInfoRequestedAt = (() => {
    const events = formData.escalationAuditEvents ?? [];
    let latest: Date | undefined;
    for (const e of events) {
      if (e.kind !== "InformationRequested") continue;
      const ts = new Date(e.performedAt);
      if (!latest || ts > latest) latest = ts;
    }
    return latest;
  })();

  const fresh = findFreshPaiInbounds(
    formData.correspondence,
    lastInfoRequestedAt,
  );
  if (fresh.length === 0) return null;
  const newest = fresh[0];
  const total = fresh.length;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.(total, newest.subject);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-[#0078d4]/40 bg-[#deecf9] p-4 flex items-start gap-3"
    >
      <Inbox
        className="w-5 h-5 text-[#005a9e] flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="font-semibold text-[#003b6b] min-w-0">
            Authority replied to your information request — ready to resume
            escalation
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss prompt (logged to audit thread)"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[#605e5c] hover:bg-[#0078d4]/10 hover:text-[#005a9e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1 flex-shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p className="text-sm text-[#323130] truncate">
          {total > 1 ? (
            <>
              <span className="font-medium">{total} replies received</span>
              <span className="text-[#605e5c]">, most recent: </span>
              <span className="font-medium">{newest.subject}</span>
              <span className="text-[#605e5c]">
                {" "}— received {relativeAge(newest.createdAt)}
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">{newest.subject}</span>
              <span className="text-[#605e5c]">
                {" "}— received {relativeAge(newest.createdAt)}
              </span>
            </>
          )}
        </p>
        <p className="text-xs text-[#605e5c]">
          Click "Resume Escalation" to forward the authority's reply back
          to the attorney with your own commentary. If the reply didn't
          satisfy the attorney's question, send another RFI before
          resuming.
        </p>
        <div className="pt-1 flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            onClick={onOpenEscalateDialog}
            className="gap-1.5 bg-[#0078d4] hover:bg-[#106ebe] text-white h-8 px-3 text-sm"
          >
            Resume Escalation
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          {onSendAnotherRfi && (
            <button
              type="button"
              onClick={onSendAnotherRfi}
              className="text-sm text-[#0078d4] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1 rounded-sm"
            >
              Send another RFI
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
