/**
 * EmergencyEEvidenceBanner — Art. 9(2) emergency surface.
 *
 * Renders on eEvidence cases that are flagged Emergency under Reg
 * 2023/1543 Art. 9(2). Surfaces the IA's stated emergency category
 * + justification note + the 8-hour SLA window so the Specialist
 * sees the urgency before scrolling through other case context.
 *
 * Self-hides when:
 *   - the case is not an eEvidence Emergency case (per
 *     `isEEvidenceArt92Emergency`), OR
 *   - the case is withdrawn (WithdrawalBanner supersedes).
 *
 * Note: the explicit `eevidenceWorkflow: 3` discriminator is helpful
 * metadata when present but NOT required — the spec triggers the 8h
 * SLA whenever an eEvidence case is marked Emergency, with or without
 * the explicit workflow tag. The banner mirrors that gate so the
 * chip + banner can never disagree.
 *
 * The 8h SLA itself is enforced via `getSlaConfig(tier, ctx)` —
 * this banner just gives the urgency a visible identity beyond the
 * sticky-header SLA chip.
 */

import * as React from "react";
import { AlertOctagon, X } from "lucide-react";
import type { FormData } from "../../types/caseTypes";
import { isCaseWithdrawn } from "../../utils/withdrawal";
import { isEEvidenceArt92Emergency } from "../../utils/eEvidenceHelpers";

const CATEGORY_LABEL: Record<string, string> = {
  DangerToLife: "Imminent danger to life",
  DangerOfInjury: "Imminent danger of serious physical or psychological injury",
  CriticalInfrastructure: "Imminent danger of damage to critical infrastructure",
};

/** Defensive: a seed using `as any` could slip an unknown category
 *  through TypeScript. If that happens, render a generic fallback
 *  instead of leaking the internal enum identifier into the UI. */
function resolveCategoryLabel(rawCategory: string | undefined): string {
  if (!rawCategory) {
    return "Emergency production declared (no category specified)";
  }
  const label = CATEGORY_LABEL[rawCategory];
  if (label) return label;
  return "Emergency production declared (unrecognised category)";
}

interface EmergencyEEvidenceBannerProps {
  formData: FormData | null | undefined;
}

export function EmergencyEEvidenceBanner({
  formData,
}: EmergencyEEvidenceBannerProps): React.ReactElement | null {
  const [dismissed, setDismissed] = React.useState(false);
  if (!formData) return null;
  // Single Art. 9(2) predicate shared with the SLA-tier shim — chip + banner
  // can't disagree about whether the 8h emergency window applies.
  if (!isEEvidenceArt92Emergency(formData)) return null;
  if (isCaseWithdrawn(formData)) return null;
  if (dismissed) return null;

  const justification = formData.eevidenceAuthorisationFlags?.emergencyJustification;
  const categoryLabel = resolveCategoryLabel(justification?.category);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-[#a4262c]/60 bg-[#fde7e9] px-4 py-3 text-sm text-[#5a0c12]"
    >
      <AlertOctagon className="w-5 h-5 mt-0.5 flex-none text-[#a4262c]" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-[#5a0c12]">
          Emergency Production — 8-hour SLA (Reg 2023/1543 Art. 9(2))
        </div>
        <div>
          {categoryLabel}
        </div>
        {justification?.note && (
          <div className="text-xs text-[#323130] whitespace-pre-wrap bg-white border border-[#a4262c]/30 rounded p-2 mt-1">
            {justification.note}
          </div>
        )}
        <div className="text-xs text-[#605e5c] mt-1">
          The SLA chip in the sticky header uses the 8-hour window per
          Art. 9(2). All collection, package + delivery actions remain
          available; prioritise dispatch.
        </div>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss emergency-production banner"
        className="flex-none rounded-md p-1 text-[#605e5c] hover:bg-white/60 hover:text-[#5a0c12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a4262c]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
