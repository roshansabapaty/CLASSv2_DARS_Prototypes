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

/** Mark a job entry preserved-ready: collection-`Complete`, publish/delivery
 *  reset to "Not Started", errors cleared. */
function markPreservedJob(job: Record<string, any>, now: Date): void {
  job.collectionStatus = "Complete";
  job.collectionStatusUpdatedAt = job.collectionStatusUpdatedAt ?? now;
  job.publishStatus = "Not Started";
  job.deliveryStatus = "Not Started";
  delete job.collectionError;
  delete job.publishError;
  delete job.deliveryError;
}

/**
 * Overlay the parent EPOC-PR's preserved (enabled) jobs onto the EPOC-ER's
 * OWN services map (mutates `target`). For each enabled parent item, the
 * matching item in `target` is replaced with the preserved job (collection-
 * `Complete` + `preservedFromCaseId`). The EPOC-ER's own NEW jobs — items
 * enabled in `target` that the parent didn't preserve — are left untouched,
 * so they still need fresh collection. This supports a mixed case: linked
 * preserved jobs ready to package alongside new jobs to collect.
 */
function overlayPreservedServices(target: any, source: any, parentCaseId: string): void {
  const now = new Date();
  for (const [svcKey, srcSvc] of Object.entries((source ?? {}) as Record<string, any>)) {
    const srcGroups = srcSvc?.categoryGroups as Record<string, any> | undefined;
    if (!srcGroups) continue;
    let tgtSvc = target[svcKey];
    if (!tgtSvc) {
      target[svcKey] = structuredClone(srcSvc);
      tgtSvc = target[svcKey];
    }
    tgtSvc.enabled = true;
    if (srcSvc.includeConsumerAccount !== undefined) tgtSvc.includeConsumerAccount = srcSvc.includeConsumerAccount;
    if (srcSvc.includeEnterpriseAccount !== undefined) tgtSvc.includeEnterpriseAccount = srcSvc.includeEnterpriseAccount;
    tgtSvc.categoryGroups = tgtSvc.categoryGroups ?? {};
    for (const [groupKey, srcGroup] of Object.entries(srcGroups)) {
      const tgtGroup = tgtSvc.categoryGroups[groupKey] ?? (tgtSvc.categoryGroups[groupKey] = {});
      for (const [itemKey, srcItem] of Object.entries((srcGroup ?? {}) as Record<string, any>)) {
        if (!srcItem || !srcItem.enabled) continue; // only overlay preserved (enabled) parent jobs
        const item = structuredClone(srcItem);
        markPreservedJob(item, now);
        item.enabled = true;
        item.preservedFromCaseId = parentCaseId;
        for (const aj of (item.additionalJobs ?? []) as Record<string, any>[]) {
          markPreservedJob(aj, now);
        }
        tgtGroup[itemKey] = item;
      }
    }
  }
}

/**
 * Seed an EPOC-ER's identifier jobs from a parent EPOC-PR's preserved
 * scope. Matches identifiers by `value`; overlays the parent's preserved
 * jobs onto the EPOC-ER's own services (so any NEW jobs the EPOC-ER adds are
 * kept and still need fresh collection). Returns a new FormData; identifiers
 * with no parent match are untouched.
 */
export function seedPreservedJobs(epocEr: FormData, parent: FormData): FormData {
  const parentByValue = new Map<string, AccountIdentifier>(
    parent.identifiers.map((p) => [p.value.toLowerCase(), p]),
  );
  const identifiers = epocEr.identifiers.map((id) => {
    const match = parentByValue.get(id.value.toLowerCase());
    if (!match) return id;
    const services = structuredClone(id.services);
    overlayPreservedServices(services, match.services, parent.caseId);
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
