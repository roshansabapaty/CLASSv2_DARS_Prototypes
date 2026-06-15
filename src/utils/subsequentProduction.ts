/**
 * Subsequent Production (eEvidence Workflow 5) — when an EPOC-ER (EPOC
 * Disclosure) case follows a prior EPOC-PR (preservation) case, seed the
 * EPOC-ER's Collection jobs from the parent's PRESERVED data so the case
 * skips fresh collection and goes straight to package + delivery.
 *
 * Prototype: the "preserved snapshot" is the parent case's collected jobs,
 * cloned at case-open. In production this scope would come from LENS-CMS.
 * See docs/plans/subsequent-production-preserved-data.md.
 */

import type {
  AccountIdentifier,
  EEvidenceRelatedCase,
  FormData,
} from "../types/caseTypes";
import { getCaseFormDataById } from "./caseDataRegistry";

/** The related EPOC-PR this case (an EPOC-ER) follows, if any. */
export function getPreservationParentRef(
  formData: FormData | null | undefined,
): EEvidenceRelatedCase | undefined {
  return (formData?.eevidenceRelatedCases ?? []).find(
    (rc) => (rc.requestSubType ?? "").toUpperCase().includes("PR"),
  );
}

/** True when this is an eEvidence EPOC-ER that follows a prior EPOC-PR. */
export function isSubsequentProduction(
  formData: FormData | null | undefined,
): boolean {
  if (!formData || formData.requestType !== "eEvidence") return false;
  // The preservation order itself is never a subsequent production.
  if ((formData.requestSubType ?? "").toUpperCase().includes("PR")) return false;
  return !!getPreservationParentRef(formData);
}

/** Walk every enabled job in a cloned services map and mark it preserved +
 *  collection-complete, ready to publish. Mutates the clone in place. The
 *  nested category-group structure is a dynamic Record, so the walk is
 *  intentionally loose. */
function normalizePreservedServices(services: unknown, parentCaseId: string): void {
  const now = new Date();
  const markJob = (job: Record<string, unknown>): void => {
    job.collectionStatus = "Complete";
    job.collectionStatusUpdatedAt = job.collectionStatusUpdatedAt ?? now;
    job.publishStatus = "Not Started";
    job.deliveryStatus = "Not Started";
    delete job.collectionError;
    delete job.publishError;
    delete job.deliveryError;
  };
  for (const service of Object.values((services ?? {}) as Record<string, any>)) {
    const groups = service?.categoryGroups as Record<string, any> | undefined;
    if (!groups) continue;
    for (const group of Object.values(groups)) {
      for (const item of Object.values(group as Record<string, any>)) {
        if (!item || !item.enabled) continue;
        markJob(item);
        item.preservedFromCaseId = parentCaseId;
        for (const aj of (item.additionalJobs ?? []) as Record<string, unknown>[]) {
          markJob(aj);
        }
      }
    }
  }
}

/**
 * Seed an EPOC-ER's identifier jobs from a parent EPOC-PR's preserved
 * scope. Matches identifiers by `value`; clones the parent identifier's
 * services and normalizes them to collection-`Complete` + preserved.
 * Returns a new FormData; identifiers with no parent match are untouched.
 */
export function seedPreservedJobs(epocEr: FormData, parent: FormData): FormData {
  const parentByValue = new Map<string, AccountIdentifier>(
    parent.identifiers.map((p) => [p.value.toLowerCase(), p]),
  );
  const identifiers = epocEr.identifiers.map((id) => {
    const match = parentByValue.get(id.value.toLowerCase());
    if (!match) return id;
    const services = structuredClone(match.services);
    normalizePreservedServices(services, parent.caseId);
    return { ...id, services };
  });
  return { ...epocEr, identifiers };
}

/**
 * Apply subsequent-production seeding to a freshly-built case. Fetches the
 * linked parent EPOC-PR and seeds the preserved jobs. No-op for cases that
 * aren't an EPOC-ER following an EPOC-PR.
 */
export function applySubsequentProduction(formData: FormData): FormData {
  if (!isSubsequentProduction(formData)) return formData;
  const parentRef = getPreservationParentRef(formData);
  if (!parentRef) return formData;
  const parent = getCaseFormDataById(parentRef.darsCaseNumber);
  if (!parent) return formData;
  return seedPreservedJobs(formData, parent);
}
