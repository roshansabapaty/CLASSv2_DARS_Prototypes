/**
 * FailedDeliveryBanner — pinned banner at the top of CollectionTracker
 * when one or more eEvidence delivery jobs have returned a WISP error.
 *
 * Self-hides when there are zero failed jobs (auto-clear behaviour per
 * Phase D.5 Q&A). Click "Retry Delivery" → opens RetryDeliveryDialog
 * with all failed jobs pre-selected for bulk retry.
 */

import * as React from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";

export interface FailedDeliveryBannerProps {
  /** Count of failed-delivery jobs across the case. 0 = banner hides. */
  failedCount: number;
  /** Opens the RetryDeliveryDialog with all failed jobs pre-selected. */
  onOpenRetryDialog: () => void;
}

export function FailedDeliveryBanner({
  failedCount,
  onOpenRetryDialog,
}: FailedDeliveryBannerProps) {
  if (failedCount === 0) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 bg-[#fde7e9] border border-[#d13438] rounded-lg px-4 py-3"
    >
      <div className="w-8 h-8 rounded-full bg-white border border-[#a4262c]/40 flex items-center justify-center flex-shrink-0">
        <AlertOctagon
          className="w-4 h-4 text-[#a4262c]"
          aria-hidden="true"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm text-[#a4262c]"
          style={{ fontWeight: 700 }}
        >
          {failedCount} delivery {failedCount === 1 ? "error" : "errors"}{" "}
          reported by WISP
        </p>
        <p className="text-xs text-[#605e5c] mt-0.5">
          The IA's receiving endpoint rejected {failedCount === 1 ? "a delivery" : "one or more deliveries"}.
          Open Retry Delivery to pick which jobs to re-submit (single,
          multiple, or all).
        </p>
      </div>
      <Button
        size="sm"
        onClick={onOpenRetryDialog}
        className="h-8 bg-[#a4262c] hover:bg-[#8a2121] text-white text-xs flex-shrink-0"
      >
        <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
        Retry Delivery
      </Button>
    </div>
  );
}
