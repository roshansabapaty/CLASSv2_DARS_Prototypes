/**
 * EndPreservationBanner — top-of-CollectionTracker notice surfaced when
 * the IA has ended the preservation obligation on an EPOC-PR.
 *
 * Self-hides when:
 *   - the case has no `PreservationEnded` audit event yet, or
 *   - the case is not an EPOC-PR.
 *
 * Visual: amber tint (more urgent than the neutral PreservationExtension
 * banner because the 45-day deletion window is running). Surfaces the
 * end date, IA actor, retention expiry, and the IA's stated reason if
 * provided. The granular days-remaining count is carried by the
 * RetentionClockChip in the sticky header — this banner gives the
 * narrative context for why the clock is running.
 */

import * as React from "react";
import { ShieldOff, X } from "lucide-react";
import type { FormData } from "../../types/caseTypes";
import { isEpocPrCase } from "../../utils/eEvidenceHelpers";
import { getRetentionStatus } from "../../utils/retentionClock";

interface EndPreservationBannerProps {
  formData: FormData | null | undefined;
  /** Opens the Documents register focused on the end-of-preservation notice. */
  onViewDocument?: () => void;
}

export function EndPreservationBanner({
  formData,
  onViewDocument,
}: EndPreservationBannerProps): React.ReactElement | null {
  const [dismissed, setDismissed] = React.useState(false);
  if (!formData) return null;
  if (!isEpocPrCase(formData)) return null;
  if (dismissed) return null;

  // Find the most recent PreservationEnded audit event.
  const events = formData.escalationAuditEvents ?? [];
  let latest = null as (typeof events)[number] | null;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].kind === "PreservationEnded") {
      latest = events[i];
      break;
    }
  }
  if (!latest) return null;

  const status = getRetentionStatus(formData);
  const performedAt = latest.performedAt instanceof Date
    ? latest.performedAt
    : new Date(latest.performedAt);
  const expiresAt = status.clock?.expiresAt instanceof Date
    ? status.clock.expiresAt
    : status.clock
      ? new Date(status.clock.expiresAt)
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-[#ca5010]/30 bg-[#fef6ed] px-4 py-3 text-sm text-[#5d3a00]"
    >
      <ShieldOff className="w-5 h-5 mt-0.5 flex-none text-[#ca5010]" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-[#5d3a00]">
          Preservation obligation ended by the Issuing Authority
        </div>
        <div>
          Effective <strong>{performedAt.toLocaleDateString()}</strong> ·{" "}
          {expiresAt ? (
            <>
              45-day deletion window expires{" "}
              <strong>{expiresAt.toLocaleDateString()}</strong>
            </>
          ) : (
            "45-day deletion window started"
          )}
          {" · "}from {latest.actor}
        </div>
        {latest.note && (
          <div className="text-xs text-[#605e5c] truncate" title={latest.note}>
            {latest.note}
          </div>
        )}
        {onViewDocument && (
          <button
            type="button"
            onClick={onViewDocument}
            className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
          >
            View document →
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss end-preservation banner"
        className="flex-none rounded-md p-1 text-[#605e5c] hover:bg-white/60 hover:text-[#5d3a00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ca5010]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
