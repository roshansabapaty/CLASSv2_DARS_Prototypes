/**
 * RfiReplyOverdueBanner — surfaces on the case form when an inbound
 * `RequestAdditionalInformation` from the authority has passed its
 * per-jurisdiction reply window without a `ProvideAdditionalInformation`
 * outbound being sent. Nudges the RS to consider an attorney
 * escalation before the breach widens.
 *
 * Decision lineage: see Edge Case 1 in
 * `docs/RFI_PAI_Edge_Cases_For_Review.md`. The breach is also logged
 * to the AuditThread via a `RfiReplyOverdue` event written by an
 * auto-fire effect in DataEntryForm — independent of whether the RS
 * interacts with this banner.
 */

import * as React from "react";
import { Hourglass, Scale } from "lucide-react";
import { Button } from "../ui/button";
import {
  daysLeftForInboundRfi,
  resolveReplyWindow,
  bucketLabel,
} from "../../utils/rfiReplyWindow";
import type {
  CorrespondenceItem,
  InboundCorrespondenceItem,
} from "../../types/correspondence";
import type { FormData } from "../../types/caseTypes";

export interface RfiReplyOverdueBannerProps {
  formData: FormData;
  /** Opens the EscalateToAttorneyDialog. The case form already owns
   *  this handler; we just trigger it. */
  onOpenEscalateDialog: () => void;
}

export function findBreachedRfi(
  correspondence: CorrespondenceItem[] | undefined,
  caseCountry: string | undefined,
): InboundCorrespondenceItem | undefined {
  if (!correspondence) return undefined;
  let oldest: InboundCorrespondenceItem | undefined;
  for (const item of correspondence) {
    if (item.direction !== "Inbound") continue;
    if (item.kind !== "RequestAdditionalInformation") continue;
    if (item.respondedByOutboundId) continue;
    const remaining = daysLeftForInboundRfi(item, caseCountry);
    if (remaining === undefined || remaining > 0) continue;
    if (
      !oldest ||
      new Date(item.createdAt).getTime() < new Date(oldest.createdAt).getTime()
    ) {
      oldest = item;
    }
  }
  return oldest;
}

export function RfiReplyOverdueBanner({
  formData,
  onOpenEscalateDialog,
}: RfiReplyOverdueBannerProps) {
  const breached = findBreachedRfi(formData.correspondence, formData.country);
  if (!breached) return null;
  const daysLate = Math.abs(
    daysLeftForInboundRfi(breached, formData.country) ?? 0,
  );
  const window = resolveReplyWindow(breached, formData.country);
  const windowSource =
    window?.source === "metadata"
      ? "authority-set deadline"
      : `default for ${bucketLabel(window?.bucket ?? "__fallback")}`;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-md border border-[#a4262c]/50 bg-[#fde7e9] p-4 flex items-start gap-3"
    >
      <Hourglass
        className="w-5 h-5 text-[#a4262c] flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="font-semibold text-[#7a1219]">
          RFI reply window breached — consider escalating to attorney for
          review
        </div>
        <p className="text-sm text-[#323130] truncate">
          <span className="font-medium">{breached.subject}</span>
          <span className="text-[#605e5c]">
            {" "}— overdue by {daysLate} day{daysLate === 1 ? "" : "s"} ·{" "}
            {window?.days ?? 0}-day window ({windowSource})
          </span>
        </p>
        <p className="text-xs text-[#605e5c]">
          The system has logged a breach event to the case Audit Thread.
          Open an attorney escalation if the delay needs review, or send
          the Provide Additional Information reply to close the loop.
        </p>
        <div className="pt-1">
          <Button
            type="button"
            onClick={onOpenEscalateDialog}
            className="gap-1.5 bg-[#5c2d91] hover:bg-[#4b1f78] text-white h-8 px-3 text-sm"
          >
            <Scale className="w-3.5 h-3.5" />
            Escalate to Attorney
          </Button>
        </div>
      </div>
    </div>
  );
}
