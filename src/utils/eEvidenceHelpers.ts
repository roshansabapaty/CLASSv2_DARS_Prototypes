/**
 * eEvidence-specific helpers — small predicates that callers across the
 * Collection / Fulfillment surfaces use to gate behaviour by request
 * type + sub-type.
 *
 * Keep these as pure functions of `FormData` so they can be called from
 * components, reducers, and the account-existence/check submission path
 * without any coupling.
 */

import type { FormData } from "../types/caseTypes";

/** True when the case is an eEvidence preservation request
 *  (`requestType === "eEvidence"` and `requestSubType === "EPOC PR"`).
 *
 *  EPOC-PR cases skip the Packaging + Delivery stages of the fulfillment
 *  pipeline — only Collection runs. The Collection page surfaces a
 *  per-identifier `desiredPreservationExpiration` date.
 *
 *  Note: the case-level sub-type uses `"EPOC PR"` (space) to match the
 *  existing `REQUEST_SUB_TYPES_BY_TYPE.eEvidence` allow-list. The
 *  unrelated `EEvidenceRelatedCase.requestSubType` enum uses
 *  `"EPOC-PR"` (hyphen) — those are separate concerns. */
export function isEpocPrCase(formData: FormData): boolean {
  return (
    formData.requestType === "eEvidence" &&
    formData.requestSubType === "EPOC PR"
  );
}

/** True when the case is an eEvidence Emergency Production case per
 *  Reg 2023/1543 Art. 9(2). Drives the 8h SLA tier (via the
 *  `SlaContext` shim in slaConstants) AND the EmergencyEEvidenceBanner.
 *  Both predicates use this single helper so the chip + banner can
 *  never disagree about whether Art. 9(2) applies.
 *
 *  Per spec, the 8h window is triggered by `requestType === "eEvidence"`
 *  plus `casePriority === "Emergency"` — the explicit `eevidenceWorkflow:
 *  3` discriminator is helpful metadata but NOT load-bearing for the
 *  SLA. Legacy and new seeds both qualify. */
export function isEEvidenceArt92Emergency(
  formData: FormData | null | undefined,
): boolean {
  if (!formData) return false;
  return (
    formData.requestType === "eEvidence" &&
    formData.casePriority === "Emergency"
  );
}
