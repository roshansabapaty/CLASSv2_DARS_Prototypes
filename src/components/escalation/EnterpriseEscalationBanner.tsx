/**
 * EnterpriseEscalationBanner — mandatory attorney-escalation prompt
 * surfaced when the case is classified as Enterprise and the RS hasn't
 * yet opened an escalation.
 *
 * Two signals make a case Enterprise (see `isEnterpriseCase`):
 *   1. The IA's EPOC Form 1 reached the "processor route" branch
 *      (`addressedToProcessor` + at least one processor-reason flag), or
 *   2. The prototype's check-accounts step found at least one identifier
 *      classified as `Enterprise`.
 *
 * The banner lists only the signals that actually fired and offers an
 * **Escalate to Attorney** CTA that opens the existing dialog with the
 * Attorney role pre-selected. It self-hides as soon as
 * `formData.attorneyEscalation` is set — at which point the
 * `AttorneyReviewPanel` + escalation chip take over.
 *
 * Mounted above the Operational Case Review section on the case body
 * (alongside `ConditionsBanner` / `AttorneyReviewPanel` / `PeerReviewPanel`).
 */

import * as React from "react";
import { ShieldAlert, Scale } from "lucide-react";
import { Button } from "../ui/button";
import { isEnterpriseCase, getEnterpriseReasons } from "../../utils/escalationHelpers";
import { getActiveAttorneyEscalation } from "../../utils/caseEscalation";
import type { FormData } from "../../types/caseTypes";

export interface EnterpriseEscalationBannerProps {
  formData: FormData;
  /** Opens the `EscalateToAttorneyDialog`. The parent owns dialog state;
   *  the banner just triggers it. The dialog defaults to the Attorney
   *  role so the RS doesn't have to pick — this is the safest default
   *  for an Enterprise case. */
  onOpenEscalateDialog: () => void;
}

export function EnterpriseEscalationBanner({
  formData,
  onOpenEscalateDialog,
}: EnterpriseEscalationBannerProps) {
  if (getActiveAttorneyEscalation(formData)) return null;
  if (!isEnterpriseCase(formData)) return null;

  const reasons = getEnterpriseReasons(formData);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-[#a4262c]/50 bg-[#fde7e9] p-4 flex items-start gap-3"
    >
      <ShieldAlert
        className="w-5 h-5 text-[#a4262c] flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 space-y-2">
        <div className="font-semibold text-[#7a1219]">
          Enterprise case — attorney escalation required
        </div>
        {reasons.length > 0 && (
          <ul className="text-sm text-[#323130] list-disc pl-5 space-y-1">
            {reasons.map((r) => (
              <li key={r.key}>{r.message}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-[#323130]">
          Escalate this case for attorney review before proceeding with
          collection, correspondence, or Form 3 signing.
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
