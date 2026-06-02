/**
 * PreservationOrderActiveBanner — top-of-CollectionTracker notice for
 * EPOC-PR cases that are currently preserving data. Surfaces the active
 * preservation obligation, the earliest preservation expiry across all
 * identifiers, and an "Acknowledge Receipt" CTA when Microsoft hasn't
 * yet confirmed the Form 2 back to the IA.
 *
 * Self-hides when:
 *   - the case is not an EPOC-PR
 *   - preservation has ended (an `EndPreservation` audit / event is present)
 *   - the IA has withdrawn the EPOC (Workflow 8 — WithdrawalBanner owns
 *     that terminal state and supersedes preservation messaging)
 *
 * Sits at the top of the preservation banner stack so the chronology
 * reads:
 *   1. Preservation Order in Effect  (this banner)
 *   2. Form 6 — Preservation Extended (PreservationExtensionBanner)
 *   3. End of Preservation            (EndPreservationBanner — terminal)
 *   4. EPOC Withdrawn                 (WithdrawalBanner — terminal, supersedes)
 */

import * as React from "react";
import { ShieldCheck, Send, X } from "lucide-react";
import type { FormData } from "../../types/caseTypes";
import { isEpocPrCase } from "../../utils/eEvidenceHelpers";
import { hasPreservationOrderBeenAcknowledged } from "../../utils/preservationOrderReceipt";
import { isCaseWithdrawn } from "../../utils/withdrawal";

interface PreservationOrderActiveBannerProps {
  formData: FormData | null | undefined;
  /** Click handler for the "Acknowledge Receipt" CTA. Parent opens the
   *  correspondence composer with EPOC_PRESERVATION_ACK pre-attached.
   *  Required (not optional) — the banner's primary action depends on
   *  it, and a forgotten wire-up at a future mount site would silently
   *  hide the CTA. Make every consumer pass it explicitly. */
  onAcknowledgeReceipt: () => void;
}

export function PreservationOrderActiveBanner({
  formData,
  onAcknowledgeReceipt,
}: PreservationOrderActiveBannerProps): React.ReactElement | null {
  const [dismissed, setDismissed] = React.useState(false);
  if (!formData) return null;
  if (!isEpocPrCase(formData)) return null;
  if (dismissed) return null;

  // Hide on any terminal state. EndPreservationBanner and
  // WithdrawalBanner own those surfaces; rendering this banner alongside
  // them would contradict the terminal signal.
  const events = formData.escalationAuditEvents ?? [];
  const preservationEnded = events.some((ev) => ev.kind === "PreservationEnded");
  if (preservationEnded) return null;
  if (isCaseWithdrawn(formData)) return null;

  // Find the earliest preservation expiry across identifiers — the
  // worst-case date the SP must hold the data to.
  const earliestExpiry = (formData.identifiers ?? [])
    .map((i) => i.desiredPreservationExpiration)
    .filter((d): d is string => !!d)
    .sort()[0];

  // Find the receipt event (if the inbound-event handler has fired).
  let receipt: (typeof events)[number] | null = null;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].kind === "PreservationOrderReceived") {
      receipt = events[i];
      break;
    }
  }
  const receivedAt = receipt?.performedAt
    ? receipt.performedAt instanceof Date
      ? receipt.performedAt
      : new Date(receipt.performedAt)
    : null;

  const acknowledged = hasPreservationOrderBeenAcknowledged(formData);

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 rounded-lg border border-[#0078d4]/40 bg-[#f3f9fd] px-4 py-3 text-sm text-[#0a2540]"
    >
      <ShieldCheck className="w-5 h-5 mt-0.5 flex-none text-[#0078d4]" aria-hidden="true" />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-[#0a2540]">
          Preservation Order in Effect
        </div>
        <div>
          {earliestExpiry ? (
            <>
              Earliest preservation expiration:{" "}
              <strong>{new Date(earliestExpiry).toLocaleDateString()}</strong>
              {" · "}
            </>
          ) : null}
          {receivedAt ? (
            <>Received {receivedAt.toLocaleDateString()}{receipt?.actor && ` from ${receipt.actor}`}</>
          ) : (
            <>Preservation obligation active per Reg 2023/1543 Art. 6</>
          )}
        </div>
        {!acknowledged && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAcknowledgeReceipt}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0078d4] px-3 py-1 text-xs font-semibold text-white hover:bg-[#106ebe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              Acknowledge Receipt
            </button>
            <span className="text-[11px] text-[#605e5c]">
              Confirms to the IA that Microsoft has assumed the preservation obligation.
            </span>
          </div>
        )}
        {acknowledged && (
          <div className="mt-1 text-xs text-[#107c10]">
            ✓ Receipt acknowledged to the Issuing Authority.
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss preservation-order banner"
        className="flex-none rounded-md p-1 text-[#605e5c] hover:bg-white/60 hover:text-[#0a2540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4]"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
