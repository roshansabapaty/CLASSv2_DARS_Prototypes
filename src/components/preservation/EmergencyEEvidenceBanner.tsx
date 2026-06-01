/**
 * EmergencyEEvidenceBanner — Workflow 3 surface.
 *
 * Renders on eEvidence cases that are flagged Emergency under Reg
 * 2023/1543 Art. 9(2). Surfaces the IA's stated emergency category
 * + justification note + the 8-hour SLA window so the Specialist
 * sees the urgency before scrolling through other case context.
 *
 * Self-hides when:
 *   - the case is not an eEvidence Workflow 3 case, OR
 *   - the case is withdrawn (WithdrawalBanner supersedes).
 *
 * The 8h SLA itself is enforced via `getSlaConfig(tier, ctx)` —
 * this banner just gives the urgency a visible identity beyond the
 * sticky-header SLA chip.
 */

import * as React from "react";
import { AlertOctagon, X } from "lucide-react";
import type { FormData } from "../../types/caseTypes";
import { isCaseWithdrawn } from "../../utils/withdrawal";

const CATEGORY_LABEL: Record<string, string> = {
  DangerToLife: "Imminent danger to life",
  DangerOfInjury: "Imminent danger of serious physical or psychological injury",
  CriticalInfrastructure: "Imminent danger of damage to critical infrastructure",
};

interface EmergencyEEvidenceBannerProps {
  formData: FormData | null | undefined;
}

function isEmergencyWorkflow3(formData: FormData): boolean {
  if (formData.requestType !== "eEvidence") return false;
  if (formData.eevidenceWorkflow !== 3) return false;
  return formData.casePriority === "Emergency";
}

export function EmergencyEEvidenceBanner({
  formData,
}: EmergencyEEvidenceBannerProps): React.ReactElement | null {
  const [dismissed, setDismissed] = React.useState(false);
  if (!formData) return null;
  if (!isEmergencyWorkflow3(formData)) return null;
  if (isCaseWithdrawn(formData)) return null;
  if (dismissed) return null;

  const justification = formData.eevidenceAuthorisationFlags?.emergencyJustification;
  const categoryLabel = justification
    ? CATEGORY_LABEL[justification.category] ?? justification.category
    : "Emergency production declared (no category specified)";

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
