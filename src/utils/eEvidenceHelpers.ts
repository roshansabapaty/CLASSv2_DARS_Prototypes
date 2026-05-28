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
