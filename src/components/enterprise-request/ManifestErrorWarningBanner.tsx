/**
 * ManifestErrorWarningBanner — surfaced on Step 4 ("Identifier & Data
 * Services") when the IA's eEvidence envelope and the account-existence
 * check disagree about whether this is an Enterprise request. There are
 * two mirror-image manifest errors the banner detects:
 *
 *   1. **consumer-detected**
 *      IA ticked at least one Enterprise checkbox (Section g Sub-section
 *      D Q1 or Q2 = YES) BUT Check Accounts returned a Consumer account.
 *      Reads as "addressed to the wrong company" — the EPOC should have
 *      gone to the Enterprise customer that hosts the data.
 *
 *   2. **enterprise-detected**
 *      IA did NOT tick any Enterprise checkbox (Q1 and Q2 both unselected)
 *      BUT Check Accounts returned an Enterprise account. Reads as "the
 *      IA missed flagging this as an Enterprise request" — the EPOC
 *      shouldn't have been routed to Microsoft as the data controller.
 *
 * Either direction points the Response Specialist at outbound Form 3 —
 * Non-Execution Response with the `manifestErrors` reason pre-selected.
 *
 * The banner is purely advisory — it does not gate any UI. The RS still
 * has the option to investigate further before issuing Form 3.
 */

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import type { FormData } from "../../types/caseTypes";

export type ManifestErrorDirection =
  /** IA flagged Enterprise; identifier resolved to Consumer. */
  | "consumer-detected"
  /** IA did NOT flag Enterprise; identifier resolved to Enterprise. */
  | "enterprise-detected";

/** Detects which (if any) manifest-error direction applies. Returns
 *  `undefined` when there is no mismatch. */
export function detectEnterpriseManifestErrorDirection(
  formData: FormData,
): ManifestErrorDirection | undefined {
  const e = formData.eevidenceEnterpriseRequest;
  const iaClaimedEnterprise =
    e?.addressedToController === true || e?.addressedToProcessor === true;
  // "No Enterprise flag selected" means BOTH Q1 and Q2 are not `true`.
  // This includes explicitly `false` and `undefined` — both signal the
  // IA didn't claim Enterprise routing on the envelope.
  const iaDidNotClaimEnterprise = !iaClaimedEnterprise;

  const checked = (formData.identifiers ?? []).filter(
    (id) => id.accountExistenceStatus === "success",
  );
  const anyConsumerDetected = checked.some(
    (id) => id.checkAccounts?.accountType === "Consumer",
  );
  const anyEnterpriseDetected = checked.some(
    (id) => id.checkAccounts?.accountType === "Enterprise",
  );

  if (iaClaimedEnterprise && anyConsumerDetected) {
    return "consumer-detected";
  }
  if (iaDidNotClaimEnterprise && anyEnterpriseDetected) {
    return "enterprise-detected";
  }
  return undefined;
}

/** Convenience boolean form of the selector. Kept for back-compat. */
export function hasEnterpriseConsumerManifestError(
  formData: FormData,
): boolean {
  return detectEnterpriseManifestErrorDirection(formData) !== undefined;
}

/** Names of identifiers whose Check Accounts result triggers the
 *  warning, scoped to the relevant direction. */
function getMismatchedIdentifierValues(
  formData: FormData,
  direction: ManifestErrorDirection,
): string[] {
  const targetType = direction === "consumer-detected" ? "Consumer" : "Enterprise";
  return (formData.identifiers ?? [])
    .filter(
      (id) =>
        id.accountExistenceStatus === "success" &&
        id.checkAccounts?.accountType === targetType,
    )
    .map((id) => id.value);
}

export interface ManifestErrorWarningBannerProps {
  formData: FormData;
  /** Optional — invoked when the RS clicks "Start Form 3". Wire to the
   *  outbound Form 3 compose flow with `manifestErrors` pre-selected. */
  onStartFormThree?: () => void;
}

export function ManifestErrorWarningBanner({
  formData,
  onStartFormThree,
}: ManifestErrorWarningBannerProps) {
  const direction = detectEnterpriseManifestErrorDirection(formData);
  if (!direction) return null;

  const mismatched = getMismatchedIdentifierValues(formData, direction);

  // ── Conditional copy keyed off the mismatch direction ────────────────
  const detectedTypeLabel =
    direction === "consumer-detected" ? "Consumer" : "Enterprise";

  const headline = "Manifest Error — Form 3 (Non-Execution Response) required";

  const explanation =
    direction === "consumer-detected" ? (
      <>
        The Issuing Authority addressed this EPOC as an Enterprise request
        (Section g Sub-section D{" "}
        {formData.eevidenceEnterpriseRequest?.addressedToController === true
          ? "Q1 — controller leg"
          : "Q2 — processor leg"}
        {" "}= Yes), but the account-existence check returned a Consumer
        account
        {mismatched.length > 0 && (
          <>
            {" for "}
            <b>{mismatched.join(", ")}</b>
          </>
        )}
        . This is a textbook "addressed to the wrong company" manifest
        error.
      </>
    ) : (
      <>
        The Issuing Authority <b>did not select</b> any Enterprise flag in
        Section g Sub-section D (Q1 and Q2 both unchecked), but the
        account-existence check returned an <b>Enterprise</b> account
        {mismatched.length > 0 && (
          <>
            {" for "}
            <b>{mismatched.join(", ")}</b>
          </>
        )}
        . The EPOC appears to have missed an Enterprise classification —
        also a manifest error.
      </>
    );

  return (
    <div
      role="alert"
      className="rounded-md border border-[#ca5010]/40 bg-[#fff4e6] p-4 flex items-start gap-3"
      data-mismatch-direction={direction}
    >
      <AlertTriangle
        className="w-5 h-5 text-[#ca5010] flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex-1 space-y-2">
        <div className="font-semibold text-[#7a3a00]">{headline}</div>
        <p className="text-sm text-[#605e5c]">{explanation}</p>
        <p className="text-sm text-[#605e5c]">
          Issue an outbound <b>Form 3 — Non-Execution Response</b> and tick
          <b> "It contains manifest errors (addressed to wrong company)"</b>
          {" "}as the non-execution reason. Submitting Form 3 stops the SLA
          clock on this case.
        </p>
        <p className="text-xs text-[#605e5c]">
          Detected account type:{" "}
          <span className="font-mono">{detectedTypeLabel}</span>
        </p>
        {onStartFormThree && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onStartFormThree}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm bg-[#ca5010] hover:bg-[#a8420d] text-white transition-colors"
            >
              Start Form 3
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
