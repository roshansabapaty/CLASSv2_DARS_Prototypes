/**
 * PreservationExtensionBanner — top-of-CollectionTracker banner that
 * surfaces the most recent Form 6 (PreservationExtension) the IA has
 * sent for the case. Renders when the audit log contains at least one
 * `PreservationExtended` event, so it appears immediately on case open
 * if a Form 6 has ever landed.
 *
 * Self-hides when:
 *   - the case has no preservation extension history (audit-log empty
 *     for this kind), or
 *   - the case is not an EPOC-PR (the banner is conceptually
 *     preservation-specific and would be noise on other request types).
 *
 * Visual: neutral blue notice with the new expiration date prominent
 * and the IA's stated reason in the secondary line.
 */

import * as React from "react";
import { CalendarClock, X } from "lucide-react";
import type { FormData } from "../../types/caseTypes";
import { isEpocPrCase } from "../../utils/eEvidenceHelpers";

interface PreservationExtensionBannerProps {
  formData: FormData | null | undefined;
  /** Opens the Documents register focused on the Form 6 extension. */
  onViewDocument?: () => void;
}

export function PreservationExtensionBanner({
  formData,
  onViewDocument,
}: PreservationExtensionBannerProps): React.ReactElement | null {
  const [dismissed, setDismissed] = React.useState(false);
  if (!formData) return null;
  if (!isEpocPrCase(formData)) return null;
  if (dismissed) return null;

  // Find the most recent PreservationExtended audit event. The handler
  // appends in chronological order; we scan from the end to grab the
  // latest without sorting.
  const events = formData.escalationAuditEvents ?? [];
  let latest = null as (typeof events)[number] | null;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].kind === "PreservationExtended") {
      latest = events[i];
      break;
    }
  }
  if (!latest) return null;

  // The new expiration date lives on each identifier — surface the
  // earliest one as the banner's headline date (worst-case for the SP).
  const earliestExpiry = formData.identifiers
    .map((i) => i.desiredPreservationExpiration)
    .filter((d): d is string => !!d)
    .sort()[0];

  const performedAt = latest.performedAt instanceof Date
    ? latest.performedAt
    : new Date(latest.performedAt);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-[#0078d4]/30 bg-[#f3f9fd] px-4 py-3 text-sm text-[#243a5e]"
    >
      <CalendarClock className="w-5 h-5 mt-0.5 flex-none text-[#0078d4]" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-[#243a5e]">
          Preservation extended by the Issuing Authority
        </div>
        <div>
          {earliestExpiry ? (
            <>
              New preservation expiration:{" "}
              <strong>{new Date(earliestExpiry).toLocaleDateString()}</strong>
              {" · "}
            </>
          ) : null}
          Received {performedAt.toLocaleDateString()} from {latest.actor}
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
        aria-label="Dismiss preservation extension banner"
        className="flex-none rounded-md p-1 text-[#605e5c] hover:bg-white/60 hover:text-[#243a5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
