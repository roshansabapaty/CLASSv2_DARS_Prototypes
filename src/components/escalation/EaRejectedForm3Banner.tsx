/**
 * EaRejectedForm3Banner — pinned banner at the top of the Correspondence
 * Hub thread when the EA has rejected an SP-submitted Form 3.
 *
 * Surfaces the high-stakes "EA rejected — production required" state
 * + the Retract Form 3 CTA directly in the conversation context. The
 * GFR Panel on the Case Overview surfaces the same signal; rendering
 * here means the RS sees it the moment they open the Correspondence
 * Hub to look at the Form 3 they sent.
 *
 * Self-hides when the gate doesn't apply (no GFR, EA hasn't rejected,
 * Form 3 already retracted). When the retract is gated by attorney
 * review the button disables + the gate reason is shown.
 */

import * as React from "react";
import { AlertOctagon, Undo2 } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import type { FormData } from "../../types/caseTypes";
import {
  isForm3RejectedByEa,
  isForm3Retracted,
  canRetractForm3,
  retractGateReason,
  gfrBlock,
} from "../../utils/groundsForRefusal";
import { cn } from "../ui/utils";

export interface EaRejectedForm3BannerProps {
  formData: FormData | undefined | null;
  onRetractForm3?: () => void;
}

export function EaRejectedForm3Banner({
  formData,
  onRetractForm3,
}: EaRejectedForm3BannerProps) {
  if (!formData) return null;
  if (!isForm3RejectedByEa(formData)) return null;
  if (isForm3Retracted(formData)) return null;

  const block = gfrBlock(formData);
  const referencedForm3Id = block?.referencedForm3Id;
  const retractAllowed = canRetractForm3(formData);
  const gateReason = retractGateReason(formData);

  return (
    <div className="mx-4 mt-3 mb-2 border border-[#ca5010]/40 bg-[#fff8f3] rounded-md p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-[#fff4e6] border border-[#ca5010]/30 flex items-center justify-center flex-shrink-0">
          <AlertOctagon
            className="w-4 h-4 text-[#ca5010]"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-sm text-[#7a3a00]"
              style={{ fontWeight: 700 }}
            >
              EA rejected your Form 3 — production required
            </span>
            {referencedForm3Id && (
              <Badge
                variant="outline"
                className="bg-white text-[#7a3a00] border-[#ca5010]/40 text-[10px] font-mono"
              >
                {referencedForm3Id}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#605e5c] mt-1">
            The Enforcing Authority reviewed the Form 3 and issued
            <strong> No Grounds for Refusal</strong>. Retract the
            Form 3 to resume production. The original Form 3 stays in
            the Audit Thread for the trail.
          </p>
          {onRetractForm3 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={onRetractForm3}
                disabled={!retractAllowed}
                className={cn(
                  "h-8 text-xs",
                  retractAllowed
                    ? "bg-[#ca5010] hover:bg-[#a34108] text-white"
                    : "bg-[#f3f2f1] text-[#a19f9d] cursor-not-allowed hover:bg-[#f3f2f1]",
                )}
              >
                <Undo2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                Retract Form 3
              </Button>
              {gateReason && (
                <span className="text-[11px] text-[#7a3a00] bg-white border border-[#ca5010]/30 rounded px-2 py-1">
                  {gateReason}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
