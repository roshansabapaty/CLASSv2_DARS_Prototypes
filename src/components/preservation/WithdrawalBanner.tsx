/**
 * WithdrawalBanner — terminal-state notice surfaced when the IA has
 * withdrawn the EPOC (Workflow 8). Applies to both EPOC-PR and EPOC-ER
 * because withdrawal can fire at any point in either lifecycle.
 *
 * Self-hides when the case has not been withdrawn (no `EpocWithdrawn`
 * audit event AND no `authorizationDesiredStatus / caseStage === "Withdrawn"`).
 *
 * Visual: red, high-prominence — withdrawal is terminal and the RS must
 * stop work on the case. Surfaces:
 *   - The IA's effective withdrawal date
 *   - The retention expiry date (45 days out)
 *   - The number of pending delivery jobs the handler cancelled
 *   - The IA's stated reason
 *
 * Sits at the top of the banner stack on the Collection page so it's
 * the first thing the RS sees on case open.
 */

import * as React from "react";
import { Ban, X } from "lucide-react";
import type { FormData } from "../../types/caseTypes";
import { isCaseWithdrawn } from "../../utils/withdrawal";
import { getRetentionStatus } from "../../utils/retentionClock";

interface WithdrawalBannerProps {
  formData: FormData | null | undefined;
}

export function WithdrawalBanner({
  formData,
}: WithdrawalBannerProps): React.ReactElement | null {
  const [dismissed, setDismissed] = React.useState(false);
  if (!formData) return null;
  if (!isCaseWithdrawn(formData)) return null;
  if (dismissed) return null;

  // Pull the most recent EpocWithdrawn audit event for the headline copy.
  const events = formData.escalationAuditEvents ?? [];
  let latest = null as (typeof events)[number] | null;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].kind === "EpocWithdrawn") {
      latest = events[i];
      break;
    }
  }

  const status = getRetentionStatus(formData);
  const expiresAt = status.clock?.expiresAt instanceof Date
    ? status.clock.expiresAt
    : status.clock
      ? new Date(status.clock.expiresAt)
      : null;
  const performedAt = latest?.performedAt
    ? latest.performedAt instanceof Date
      ? latest.performedAt
      : new Date(latest.performedAt)
    : formData.authorizationStatusUpdatedAt
      ? formData.authorizationStatusUpdatedAt instanceof Date
        ? formData.authorizationStatusUpdatedAt
        : new Date(formData.authorizationStatusUpdatedAt)
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-[#a4262c]/50 bg-[#fde7e9] px-4 py-3 text-sm text-[#5a0c12]"
    >
      <Ban className="w-5 h-5 mt-0.5 flex-none text-[#a4262c]" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-[#5a0c12]">
          EPOC withdrawn by the Issuing Authority
        </div>
        <div>
          {performedAt && (
            <>
              Effective <strong>{performedAt.toLocaleDateString()}</strong>
            </>
          )}
          {expiresAt && (
            <>
              {performedAt && " · "}
              45-day deletion window expires{" "}
              <strong>{expiresAt.toLocaleDateString()}</strong>
            </>
          )}
          {latest?.actor && (
            <>
              {(performedAt || expiresAt) && " · "}
              from {latest.actor}
            </>
          )}
        </div>
        {latest?.note && (
          <div className="text-xs text-[#605e5c] whitespace-pre-wrap" title={latest.note}>
            {latest.note}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss withdrawal banner"
        className="flex-none rounded-md p-1 text-[#605e5c] hover:bg-white/60 hover:text-[#5a0c12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a4262c]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
