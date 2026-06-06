/**
 * ReviewRequiredAlertBanner — compact one-line alert that surfaces an
 * active attorney or peer review **outside** the Case Overview
 * accordion. The full review surface (AttorneyReviewPanel /
 * PeerReviewPanel) still lives inside Case Overview; this banner sits
 * in the page-top alert zone next to the Correspondence Hub banner so
 * collapsing Case Overview doesn't hide the alert.
 *
 * Clicking "Review now" expands Case Overview (if collapsed) and
 * scrolls the corresponding panel into view — the expand-and-scroll
 * effect is owned by the host (DataEntryForm) and passed in as
 * `onReview`.
 *
 * Mounted alongside relocated escalation banners (GFR, RFI,
 * Conditions, etc.) on Triage + Review Case pages — see
 * `DataEntryForm.tsx`.
 */

import * as React from "react";
import { Scale, Users, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import type { AttorneyEscalationStatus } from "../../types/caseTypes";

/** Friendly labels for the escalation status chip — same wording the
 *  AttorneyReviewPanel header uses, kept in sync via this lookup. */
const STATUS_LABEL: Record<AttorneyEscalationStatus, string> = {
  Pending: "Pending review",
  InformationRequested: "Info requested",
  RedirectRequested: "Redirect requested",
  Reviewed: "Reviewed",
  Blocked: "Blocked",
  ApprovedWithConditions: "Approved with conditions",
  ApprovedForDelivery: "Approved",
};

export interface ReviewRequiredAlertBannerProps {
  /** Drives the icon, headline copy, and accent colour palette.
   *   - `"attorney"` → purple Scale, "Attorney review required"
   *   - `"peer"`     → blue Users, "Peer review required" */
  role: "attorney" | "peer";
  /** Current escalation status — surfaced as a compact chip. */
  status: AttorneyEscalationStatus;
  /** Resolved name or "Any {Role}" fallback when the escalation hasn't
   *  been claimed by a specific reviewer yet. Comes from
   *  `getEscalationSummaryForCase().assigneeLabel`. */
  assigneeLabel: string;
  /** Host-supplied callback that expands Case Overview and scrolls the
   *  full review panel into view. */
  onReview: () => void;
}

export function ReviewRequiredAlertBanner({
  role,
  status,
  assigneeLabel,
  onReview,
}: ReviewRequiredAlertBannerProps) {
  const isAttorney = role === "attorney";
  const Icon = isAttorney ? Scale : Users;
  const headline = isAttorney
    ? "Attorney review required"
    : "Peer review required";
  // Accent palette per role — purple for attorney (matches
  // AttorneyReviewPanel's own header colour), blue for peer (matches
  // PeerReviewPanel's left-border accent).
  const accentClasses = isAttorney
    ? {
        container: "border-[#8764b8]/40 bg-[#f3f0fa]",
        icon: "text-[#5c2d91]",
        chip: "bg-[#5c2d91]/10 text-[#5c2d91] border-[#5c2d91]/30",
        cta: "bg-[#5c2d91] hover:bg-[#4b1f78] text-white",
      }
    : {
        container: "border-[#486991]/40 bg-[#f4f7fb]",
        icon: "text-[#486991]",
        chip: "bg-[#486991]/10 text-[#486991] border-[#486991]/30",
        cta: "bg-[#486991] hover:bg-[#3a5577] text-white",
      };

  const isUnassigned = assigneeLabel.startsWith("Any ");

  // Audit P1 #6: slimmed to one line. Removed the inline status chip
  // (e.g. "Pending review") because the StickyCaseHeader already
  // surfaces the escalation status chip and the AttorneyReviewPanel
  // body shows it again. The banner's job here is to flag the
  // ESCALATION EXISTS + give a quick jump-to-panel CTA — the chip
  // was a duplicate signal. `status` is kept on the prop signature
  // (callers still pass it) so we can surface it in the
  // aria-label / tooltip without rendering a separate visual pill.
  const statusLabel = STATUS_LABEL[status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-md border ${accentClasses.container} px-4 py-2 flex items-center gap-3`}
    >
      <Icon
        className={`w-5 h-5 ${accentClasses.icon} flex-shrink-0`}
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span
          className="font-semibold text-[#323130] text-sm"
          title={`Status: ${statusLabel}`}
        >
          {headline}
        </span>
        <span className="text-xs text-[#605e5c]">
          <span className="text-[#605e5c]">Assigned to: </span>
          <span
            className={isUnassigned ? "italic text-[#605e5c]" : "text-[#323130]"}
          >
            {isUnassigned ? "Unassigned" : assigneeLabel}
          </span>
        </span>
      </div>
      <Button
        type="button"
        onClick={onReview}
        className={`gap-1.5 h-8 px-3 text-xs ${accentClasses.cta}`}
        aria-label={`Open the ${headline.toLowerCase()} panel — status: ${statusLabel}`}
      >
        Review now
        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
