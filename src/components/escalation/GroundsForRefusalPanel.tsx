/**
 * GroundsForRefusalPanel — EU eEvidence GFR surface (ETSI TS 104 144 §5.5).
 *
 * Renders at the top of the Case Overview banner stack on cases where
 * `gfrApplies(formData)` is true — i.e. Appendix F Workflows 2 /
 * 5-international / 6 with a GFR record present.
 *
 * Render branches (post-Phase B):
 *   - `decision === undefined`     → purple "EA reviewing — Nd remaining" countdown
 *   - `decision.kind === "Full"`   → red GFR HOLD panel
 *   - `decision.kind === "Partial"`→ amber panel listing the blocked LDTask
 *                                    Objects (target identifiers) + reason
 *                                    chips; non-listed identifiers shown
 *                                    inline as "Production continues"
 *   - `decision.kind === "None"`
 *       × Form1Review trigger      → green "EA cleared" confirmation
 *       × Form3Response trigger    → orange "EA rejected your Form 3 —
 *                                    production required" with a "Retract
 *                                    Form 3" CTA (stub in Phase B; full
 *                                    flow lands in Phase D)
 *   - Lapsed window lands in Phase E.
 */

import * as React from "react";
import {
  Scale,
  CircleCheck,
  Hourglass,
  CalendarClock,
  AlertOctagon,
  Undo2,
  CheckCircle2,
  ShieldCheck,
  Send,
  ShieldBan,
} from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CopyableText } from "../CopyButton";
import { cn } from "../ui/utils";
import type {
  FormData,
  RefusalReason,
} from "../../types/caseTypes";
import {
  gfrApplies,
  gfrBlock,
  currentDecision,
  daysLeftEaReview,
  canRetractForm3,
  retractGateReason,
  isWindowLapsed,
} from "../../utils/groundsForRefusal";

// Reg 2023/1543 Art. 12 reason labels (RS-readable).
const REASON_LABELS: Record<RefusalReason, string> = {
  ImmunitiesOrPrivileges: "Immunities or privileges",
  ConflictWithThirdCountryLaw: "Conflict with third-country law",
  ManifestBreachOfFundamentalRights:
    "Manifest breach of fundamental rights",
  ManifestlyDisproportionate: "Manifestly disproportionate",
};

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface GroundsForRefusalPanelProps {
  formData: FormData;
  /** Stub handler fired when the RS clicks Retract Form 3 from the
   *  Form3Response + None variant. Phase B parent appends a
   *  `Form3Retracted` audit event; full confirmation-dialog flow +
   *  Form 3 status flip lands in Phase D. */
  onRetractForm3?: () => void;
  /** Handler fired when the RS clicks Resume Delivery after the 10-day
   *  EA review window has lapsed without a decision (Art. 8 + 10(2)).
   *  Parent flips `manualDeliveryResumed` + appends
   *  `GfrDeliveryResumedManually`. When omitted, the CTA self-hides. */
  onResumeDelivery?: () => void;
  /** Handler fired when the RS clicks "Block Delivery" on a Full or
   *  Partial GFR. Parent calls `applyGfrEnforcement(formData)` to
   *  persist the choice and append the `GfrEnforced` audit event.
   *  The button self-hides once enforcement is in effect. */
  onBlockDelivery?: () => void;
  /** Handler fired when the RS clicks "Undo" on the enforced
   *  confirmation state — covers accidental clicks AND deliberate
   *  release after re-evaluation. Parent calls
   *  `releaseGfrEnforcement(formData)` to clear the enforcement
   *  stamps + append a `GfrEnforcementReleased` audit event. The
   *  button self-hides while enforcement is not in effect. */
  onUndoBlockDelivery?: () => void;
}

export function GroundsForRefusalPanel({
  formData,
  onRetractForm3,
  onResumeDelivery,
  onBlockDelivery,
  onUndoBlockDelivery,
}: GroundsForRefusalPanelProps) {
  // Render gate: workflow type + request type + not-withdrawn.
  if (!gfrApplies(formData)) return null;

  const block = gfrBlock(formData);
  if (!block) return null;

  const decision = currentDecision(formData);

  // ── Header chrome shared across all branches ────────────────────────
  const triggerBadge = (
    <Badge
      variant="outline"
      className="bg-[#f3f0fa] text-[#5c2d91] border-[#5c2d91]/30 text-[11px]"
      style={{ fontWeight: 600 }}
    >
      <Scale className="w-3 h-3 mr-1" aria-hidden="true" />
      {block.trigger === "Form3Response"
        ? `Reviewing Form 3${block.referencedForm3Id ? ` · ${block.referencedForm3Id}` : ""}`
        : "Reviewing Form 1"}
    </Badge>
  );

  const eaLine = (
    <p className="text-xs text-[#605e5c]">
      Enforcing Authority: <span className="text-[#323130]" style={{ fontWeight: 500 }}>{block.ea.name}</span>
      {block.ea.referenceNumber && (
        <>
          {" "}· Ref{" "}
          <span className="font-mono text-[#323130]">
            {block.ea.referenceNumber}
          </span>
        </>
      )}
    </p>
  );

  // ── Branch 1: EA still reviewing (decision undefined) ───────────────
  if (!decision) {
    // 1a — Window lapsed (Day 10 passed without a decision) AND delivery
    // already resumed manually → green confirmation.
    if (isWindowLapsed(formData) && block.manualDeliveryResumed) {
      return (
        <Card className="p-4 border border-[#107c10]/30 bg-[#f3faf2] shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#dff6dd] border border-[#107c10]/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#107c10]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-sm text-[#107c10]" style={{ fontWeight: 600 }}>
                  EA review window expired — delivery resumed
                </h3>
                {triggerBadge}
              </div>
              {eaLine}
              <p className="text-xs text-[#605e5c] mt-1.5">
                The 10-day window passed with no EA decision; the hold
                lapsed by operation of Art. 8 + 10(2), EU Reg. 2023/1543.
                {block.manualDeliveryResumedAt && (
                  <>
                    {" "}Delivery resumed {formatDate(block.manualDeliveryResumedAt)}
                    {block.manualDeliveryResumedBy && ` by ${block.manualDeliveryResumedBy}`}.
                  </>
                )}
              </p>
            </div>
          </div>
        </Card>
      );
    }

    // 1b — Window lapsed, awaiting RS to resume delivery → green panel
    // with a primary Resume Delivery CTA.
    if (isWindowLapsed(formData)) {
      return (
        <Card className="p-4 border border-[#107c10]/40 bg-[#f3faf2] shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#dff6dd] border border-[#107c10]/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-[#107c10]" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-sm text-[#107c10]" style={{ fontWeight: 700 }}>
                  EA review window expired — delivery is now permitted
                </h3>
                {triggerBadge}
              </div>
              {eaLine}
              <p className="text-xs text-[#605e5c] mt-1.5">
                The 10-day window passed at {formatDate(block.eaReviewWindowExpiresAt)}
                {" "}with no EA decision. By operation of Art. 8 + 10(2),
                EU Reg. 2023/1543, the hold has lapsed. Note: lapse is NOT
                the same as EA approval — proceed at your discretion.
              </p>
              {onResumeDelivery && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={onResumeDelivery}
                    className="h-8 text-xs bg-[#107c10] hover:bg-[#0e6a0e] text-white"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    Resume Delivery
                  </Button>
                  <span className="text-[11px] text-[#605e5c]">
                    Re-enables Submit-to-Delivery on the Collection page.
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>
      );
    }

    // 1c — Active EA REVIEW WINDOW (default during the 10 days).
    const days = daysLeftEaReview(formData);
    return (
      <Card className="p-4 border border-[#5c2d91]/30 bg-[#faf9fd] shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#f3f0fa] border border-[#5c2d91]/30 flex items-center justify-center flex-shrink-0">
            <Hourglass
              className="w-4 h-4 text-[#5c2d91]"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3
                className="text-sm text-[#323130]"
                style={{ fontWeight: 600 }}
              >
                EA REVIEW WINDOW — Enforcing Authority is reviewing
              </h3>
              {triggerBadge}
            </div>
            {eaLine}
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#5c2d91] bg-white border border-[#5c2d91]/20 rounded px-2 py-1">
              <CalendarClock
                className="w-3 h-3"
                aria-hidden="true"
              />
              <span style={{ fontWeight: 600 }}>
                {days !== undefined && days >= 0
                  ? `${days} day${days === 1 ? "" : "s"} remaining`
                  : "Within review window"}
              </span>
              <span className="text-[#605e5c]">
                · operational countdown only — SLA continues
              </span>
            </div>
            <p className="text-xs text-[#605e5c] mt-2">
              The EA has up to 10 calendar days to issue a decision.
              Publish + Deliver actions are blocked until the EA decides
              or the window lapses; collection continues. The case-level
              SLA is unaffected by this window.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // ── Branch 2: Full GFR (case-wide refusal — RS decides) ─────────────
  // The EA's Full refusal is INFORMATIONAL until the RS acts on it. The
  // panel shows the EA's reasons + a "Block Delivery (case-wide)" CTA;
  // once the RS clicks, `enforcementApplied` flips and the panel swaps
  // to a confirmation state. Until then, delivery actions remain
  // available — the RS retains discretion to dispute the refusal and
  // proceed (rare, but legally possible).
  if (decision.kind === "Full") {
    const enforced = block.enforcementApplied === true;
    return (
      <Card className="p-4 border border-[#c50f1f]/40 bg-[#fef0f0] shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#fde7e9] border border-[#c50f1f]/30 flex items-center justify-center flex-shrink-0">
            <Scale
              className="w-4 h-4 text-[#c50f1f]"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3
                className="text-sm text-[#c50f1f]"
                style={{ fontWeight: 700 }}
              >
                {enforced
                  ? "Full Grounds for Refusal — delivery blocked"
                  : "Full Grounds for Refusal — review the EA's decision"}
              </h3>
              {triggerBadge}
            </div>
            {eaLine}
            <p className="text-xs text-[#605e5c] mt-1.5">
              Decision received {formatDate(decision.decidedAt)}
              {decision.decidedBy && ` by ${decision.decidedBy}`}.{" "}
              {enforced
                ? "Case SLA paused; collection jobs continue but nothing may be delivered to the IA."
                : "Receipt does NOT automatically gate delivery — review the reasons below and click Block Delivery to enforce."}
            </p>
            {decision.reasons.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {decision.reasons.map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className="bg-white text-[#c50f1f] border-[#c50f1f]/40 text-[11px]"
                    style={{ fontWeight: 600 }}
                  >
                    {REASON_LABELS[r] ?? r}
                  </Badge>
                ))}
              </div>
            )}
            {decision.reasonSummary && (
              <p className="text-xs text-[#323130] mt-2 whitespace-pre-wrap bg-white border border-[#c50f1f]/20 rounded p-2">
                {decision.reasonSummary}
              </p>
            )}
            {/* RS / TS action — only shown until the block is in effect. */}
            {!enforced && onBlockDelivery && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={onBlockDelivery}
                  className="h-8 text-xs bg-[#c50f1f] hover:bg-[#a00a18] text-white"
                >
                  <ShieldBan className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Block Delivery (case-wide)
                </Button>
                <span className="text-[11px] text-[#605e5c]">
                  Enforces the EA's GFR. The block is auditable and reversible from the Block Delivery banner.
                </span>
              </div>
            )}
            {enforced && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div className="text-[11px] text-[#7a3a00] bg-white border border-[#c50f1f]/30 rounded px-2 py-1 inline-flex items-center gap-1.5">
                  <ShieldBan className="w-3.5 h-3.5" aria-hidden="true" />
                  Delivery blocked
                  {block.enforcementAppliedAt && (
                    <> {formatDate(block.enforcementAppliedAt)}</>
                  )}
                  {block.enforcementAppliedBy && <> by {block.enforcementAppliedBy}</>}
                  .
                </div>
                {onUndoBlockDelivery && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onUndoBlockDelivery}
                    className="h-7 text-xs border-[#c50f1f]/40 text-[#c50f1f] hover:bg-[#fef0f0]"
                  >
                    <Undo2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    Undo
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // ── Branch 3: Partial GFR (per-LDTask block) ────────────────────────
  if (decision.kind === "Partial") {
    const allIdentifiers = formData.identifiers ?? [];
    const blockedSet = new Set(decision.blockedTaskObjectIds);
    const blockedIdentifiers = allIdentifiers.filter((i) =>
      blockedSet.has(i.taskId),
    );
    const nonBlockedIdentifiers = allIdentifiers.filter(
      (i) => !blockedSet.has(i.taskId),
    );
    // Catch IDs the EA named that don't match any identifier on the
    // case — surface them as unresolved so the discrepancy is visible
    // rather than silently dropped.
    const orphanIds = decision.blockedTaskObjectIds.filter(
      (id) => !allIdentifiers.some((i) => i.taskId === id),
    );

    return (
      <Card className="p-4 border border-[#ca5010]/40 bg-[#fff8f3] shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#fff4e6] border border-[#ca5010]/30 flex items-center justify-center flex-shrink-0">
            <AlertOctagon
              className="w-4 h-4 text-[#ca5010]"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3
                className="text-sm text-[#7a3a00]"
                style={{ fontWeight: 700 }}
              >
                Partial Grounds for Refusal —{" "}
                {decision.blockedTaskObjectIds.length} task
                {decision.blockedTaskObjectIds.length === 1 ? "" : "s"} blocked
              </h3>
              {triggerBadge}
            </div>
            {eaLine}
            <p className="text-xs text-[#605e5c] mt-1.5">
              Decision received {formatDate(decision.decidedAt)}
              {decision.decidedBy && ` by ${decision.decidedBy}`}. Case
              SLA continues to tick; only the blocked target identifiers
              are suppressed at delivery.
            </p>

            {decision.reasons.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {decision.reasons.map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className="bg-white text-[#7a3a00] border-[#ca5010]/40 text-[11px]"
                    style={{ fontWeight: 600 }}
                  >
                    {REASON_LABELS[r] ?? r}
                  </Badge>
                ))}
              </div>
            )}

            {decision.reasonSummary && (
              <p className="text-xs text-[#323130] mt-2 whitespace-pre-wrap bg-white border border-[#ca5010]/20 rounded p-2">
                {decision.reasonSummary}
              </p>
            )}

            {/* Blocked LDTask Objects — each maps 1:1 to a target
                identifier on the case. */}
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wide text-[#7a3a00] mb-1.5" style={{ fontWeight: 600 }}>
                Blocked target identifiers
              </p>
              <ul className="space-y-1.5">
                {blockedIdentifiers.map((id) => (
                  <li
                    key={id.taskId}
                    className="flex items-center gap-2 text-xs bg-white border border-[#ca5010]/20 rounded px-2 py-1.5"
                  >
                    <Badge
                      variant="outline"
                      className="bg-[#fff4e6] text-[#7a3a00] border-[#ca5010]/40 text-[10px] font-mono"
                    >
                      {id.taskId}
                    </Badge>
                    <CopyableText
                      text={id.value}
                      copyLabel={`Copy ${id.type}`}
                    >
                      <span className="text-[#323130]" style={{ fontWeight: 500 }}>
                        {id.value}
                      </span>
                    </CopyableText>
                    <span className="text-[#605e5c]">· {id.type}</span>
                  </li>
                ))}
                {orphanIds.map((id) => (
                  <li
                    key={id}
                    className="flex items-center gap-2 text-xs bg-white border border-[#c50f1f]/20 rounded px-2 py-1.5"
                  >
                    <Badge
                      variant="outline"
                      className="bg-[#fde7e9] text-[#c50f1f] border-[#c50f1f]/40 text-[10px] font-mono"
                    >
                      {id}
                    </Badge>
                    <span className="text-[#c50f1f] italic">
                      Not matched to any identifier on this case
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Non-blocked identifiers — explicit "production continues"
                signal so the RS isn't left guessing which IDs are still
                actionable. Suppressed when there are zero. */}
            {nonBlockedIdentifiers.length > 0 && (
              <div className="mt-2.5">
                <p className="text-[11px] uppercase tracking-wide text-[#107c10] mb-1.5" style={{ fontWeight: 600 }}>
                  Production continues
                </p>
                <ul className="space-y-1">
                  {nonBlockedIdentifiers.map((id) => (
                    <li
                      key={id.taskId}
                      className="flex items-center gap-2 text-xs"
                    >
                      <CheckCircle2
                        className="w-3 h-3 text-[#107c10] flex-shrink-0"
                        aria-hidden="true"
                      />
                      <Badge
                        variant="outline"
                        className="bg-white text-[#605e5c] border-[#c8c6c4] text-[10px] font-mono"
                      >
                        {id.taskId}
                      </Badge>
                      <span className="text-[#323130]" style={{ fontWeight: 500 }}>
                        {id.value}
                      </span>
                      <span className="text-[#605e5c]">· {id.type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* RS / TS action — block the listed identifiers' data-type
                jobs. Until the RS acts, the Partial GFR is purely
                informational and the listed identifiers proceed normally
                through delivery. */}
            {(() => {
              const enforced = block.enforcementApplied === true;
              if (enforced) {
                return (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="text-[11px] text-[#7a3a00] bg-white border border-[#ca5010]/40 rounded px-2 py-1 inline-flex items-center gap-1.5">
                      <ShieldBan className="w-3.5 h-3.5" aria-hidden="true" />
                      Delivery blocked for the {decision.blockedTaskObjectIds.length}{" "}
                      listed target identifier
                      {decision.blockedTaskObjectIds.length === 1 ? "" : "s"}
                      {block.enforcementAppliedAt && (
                        <> on {formatDate(block.enforcementAppliedAt)}</>
                      )}
                      {block.enforcementAppliedBy && <> by {block.enforcementAppliedBy}</>}
                      .
                    </div>
                    {onUndoBlockDelivery && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onUndoBlockDelivery}
                        className="h-7 text-xs border-[#ca5010]/40 text-[#ca5010] hover:bg-[#fff4e6]"
                      >
                        <Undo2 className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                        Undo
                      </Button>
                    )}
                  </div>
                );
              }
              if (!onBlockDelivery) return null;
              return (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={onBlockDelivery}
                    className="h-8 text-xs bg-[#ca5010] hover:bg-[#a34108] text-white"
                  >
                    <ShieldBan className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                    Block Delivery for these{" "}
                    {decision.blockedTaskObjectIds.length} identifier
                    {decision.blockedTaskObjectIds.length === 1 ? "" : "s"}
                  </Button>
                  <span className="text-[11px] text-[#605e5c]">
                    Enforces the EA's Partial GFR; non-listed identifiers continue to deliver normally.
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </Card>
    );
  }

  // ── Branch 4: No GFR ────────────────────────────────────────────────
  if (decision.kind === "None") {
    // Form3Response variant: EA REJECTED the SP's Form 3 — production
    // required. Renders amber with a Retract Form 3 CTA. Form1Review
    // variant: EA explicitly cleared — green confirmation.
    const isForm3Reject = block.trigger === "Form3Response";

    if (isForm3Reject) {
      // Phase D — once the Specialist has retracted the Form 3, swap
      // the orange "Retract" CTA panel for a green confirmation that
      // production is proceeding. The retract audit event is still
      // visible in the Audit Thread for the trail.
      const retractedAt = block.form3RetractedAt;
      const retractedBy = block.form3RetractedBy;

      if (retractedAt) {
        return (
          <Card className="p-4 border border-[#107c10]/30 bg-[#f3faf2] shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#dff6dd] border border-[#107c10]/30 flex items-center justify-center flex-shrink-0">
                <CircleCheck
                  className="w-4 h-4 text-[#107c10]"
                  aria-hidden="true"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3
                    className="text-sm text-[#107c10]"
                    style={{ fontWeight: 600 }}
                  >
                    Form 3 retracted — production proceeding
                  </h3>
                  {triggerBadge}
                </div>
                {eaLine}
                <p className="text-xs text-[#605e5c] mt-1.5">
                  EA rejected the Form 3 ({formatDate(decision.decidedAt)}).
                  Retracted {formatDate(retractedAt)}
                  {retractedBy && ` by ${retractedBy}`}. Delivery has
                  resumed; the original Form 3 is preserved in the
                  Audit Thread.
                </p>
              </div>
            </div>
          </Card>
        );
      }

      return (
        <Card className="p-4 border border-[#ca5010]/40 bg-[#fff8f3] shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#fff4e6] border border-[#ca5010]/30 flex items-center justify-center flex-shrink-0">
              <AlertOctagon
                className="w-4 h-4 text-[#ca5010]"
                aria-hidden="true"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3
                  className="text-sm text-[#7a3a00]"
                  style={{ fontWeight: 700 }}
                >
                  EA rejected your Form 3 — production required
                </h3>
                {triggerBadge}
              </div>
              {eaLine}
              <p className="text-xs text-[#605e5c] mt-1.5">
                The Enforcing Authority reviewed the SP's non-execution
                claim and found no grounds for refusal. Decision received{" "}
                {formatDate(decision.decidedAt)}
                {decision.decidedBy && ` by ${decision.decidedBy}`}.
                Retract the Form 3 to resume production.
              </p>
              {decision.note && (
                <p className="text-xs text-[#323130] mt-2 whitespace-pre-wrap bg-white border border-[#ca5010]/20 rounded p-2">
                  {decision.note}
                </p>
              )}
              {onRetractForm3 && (() => {
                const retractAllowed = canRetractForm3(formData);
                const gateReason = retractGateReason(formData);
                return (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
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
                );
              })()}
            </div>
          </div>
        </Card>
      );
    }

    // Form1Review + None — EA explicitly cleared the case.
    return (
      <Card className="p-4 border border-[#107c10]/30 bg-[#f3faf2] shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#dff6dd] border border-[#107c10]/30 flex items-center justify-center flex-shrink-0">
            <CircleCheck
              className="w-4 h-4 text-[#107c10]"
              aria-hidden="true"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3
                className="text-sm text-[#107c10]"
                style={{ fontWeight: 600 }}
              >
                EA cleared this case — production may proceed
              </h3>
              {triggerBadge}
            </div>
            {eaLine}
            <p className="text-xs text-[#605e5c] mt-1.5">
              Decision received {formatDate(decision.decidedAt)}
              {decision.decidedBy && ` by ${decision.decidedBy}`}.
            </p>
            {decision.note && (
              <p className="text-xs text-[#323130] mt-2 whitespace-pre-wrap bg-white border border-[#107c10]/20 rounded p-2">
                {decision.note}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // Exhaustiveness guard — typescript narrows decision.kind to never here.
  return null;
}
