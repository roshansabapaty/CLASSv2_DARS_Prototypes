/**
 * deliveryStatus — helpers for the eEvidence WISP delivery callback
 * lifecycle (DeliveryAcknowledged / Failed-with-retry).
 *
 * Gating: the new states are scoped to `requestType === "eEvidence"`.
 * Other request types (UK COPO, US Search Warrant, Subpoena, etc.)
 * treat `Complete` as the terminal delivery state and never see the
 * Retry / Acknowledged surfaces. Every UI + sim site checks
 * `isEEvidenceDelivery(formData)` before reading or writing the new
 * fields.
 */

import type { FormData, SubCategory } from "../types/caseTypes";

/** True when this case is on the eEvidence WISP delivery-status
 *  callback path. The new Failed-with-Retry + DeliveryAcknowledged
 *  states only surface for these cases. */
export function isEEvidenceDelivery(
  formData: FormData | undefined | null,
): boolean {
  return formData?.requestType === "eEvidence";
}

/** One row in the Retry Delivery dialog — the failed job's full
 *  context so the RS knows what they're retrying. */
export interface FailedDeliveryJob {
  identifierId: string;
  identifierValue: string;
  identifierType: string;
  taskId: string;
  serviceKey: string;
  groupKey: string;
  itemKey: string;
  /** Generated job ID — present on submitted jobs; absent for unsubmitted. */
  jobId?: string;
  /** Delivery job ID (the wire packet's id). */
  deliveryJobId?: string;
  /** WISP error message captured at callback time. */
  deliveryError?: string;
  /** When the Failed status was written. */
  deliveryStatusUpdatedAt?: Date;
  /** True when this is an `additionalJobs[]` entry (re-submission with
   *  a different date range), false for the primary SubCategory. */
  isAdditionalJob: boolean;
  /** When `isAdditionalJob === true`, the entry's index in the parent
   *  category's `additionalJobs` array — caller needs this to mutate
   *  the right entry on Retry commit. */
  additionalJobIndex?: number;
}

/** Iterates every (identifier × service × group × item) job on the
 *  case and returns those whose `deliveryStatus === "Failed"`. Includes
 *  both the primary SubCategory and any additionalJobs entries.
 *
 *  Only returns results for eEvidence cases — non-eEvidence cases
 *  shouldn't have Failed delivery (the auto-sim doesn't produce it
 *  for them), but the gate is enforced here too for defence in depth. */
export function collectFailedDeliveryJobs(
  formData: FormData | undefined | null,
): FailedDeliveryJob[] {
  if (!formData) return [];
  if (!isEEvidenceDelivery(formData)) return [];
  const out: FailedDeliveryJob[] = [];
  for (const identifier of formData.identifiers ?? []) {
    for (const [serviceKey, service] of Object.entries(
      identifier.services ?? {},
    )) {
      const groups = (service as { categoryGroups?: Record<string, unknown> })
        .categoryGroups;
      if (!groups) continue;
      for (const [groupKey, items] of Object.entries(
        groups as Record<string, Record<string, SubCategory>>,
      )) {
        for (const [itemKey, item] of Object.entries(items)) {
          if (!item || typeof item !== "object") continue;
          if (item.deliveryStatus === "Failed") {
            out.push({
              identifierId: identifier.id,
              identifierValue: identifier.value,
              identifierType: identifier.type,
              taskId: identifier.taskId,
              serviceKey,
              groupKey,
              itemKey,
              jobId: item.jobId,
              deliveryJobId: item.deliveryJobId,
              deliveryError: item.deliveryError,
              deliveryStatusUpdatedAt: item.deliveryStatusUpdatedAt,
              isAdditionalJob: false,
            });
          }
          (item.additionalJobs ?? []).forEach((addJob, idx) => {
            if (addJob.deliveryStatus === "Failed") {
              out.push({
                identifierId: identifier.id,
                identifierValue: identifier.value,
                identifierType: identifier.type,
                taskId: identifier.taskId,
                serviceKey,
                groupKey,
                itemKey,
                jobId: addJob.jobId,
                deliveryJobId: addJob.deliveryJobId,
                deliveryError: addJob.deliveryError,
                deliveryStatusUpdatedAt: addJob.deliveryStatusUpdatedAt,
                isAdditionalJob: true,
                additionalJobIndex: idx,
              });
            }
          });
        }
      }
    }
  }
  return out;
}

/** Convenience: number of failed deliveries on the case. 0 hides the
 *  CollectionTracker error banner. */
export function failedDeliveryCount(
  formData: FormData | undefined | null,
): number {
  return collectFailedDeliveryJobs(formData).length;
}

/** Commit a Retry on a specific set of (identifier × service × group ×
 *  item × additionalJobIndex?) selectors: flips the matching jobs'
 *  `deliveryStatus` back to "Started" so the next auto-sim cycle takes
 *  another swing at them. Clears `deliveryError`. Returns the updated
 *  FormData; callers wrap with their setFormData / setSharedFormData. */
export interface RetryDeliverySelector {
  identifierId: string;
  serviceKey: string;
  groupKey: string;
  itemKey: string;
  /** Undefined ⇒ primary SubCategory; number ⇒ index in additionalJobs. */
  additionalJobIndex?: number;
}

export function applyRetryDelivery(
  formData: FormData,
  selectors: RetryDeliverySelector[],
  now: Date = new Date(),
): FormData {
  if (!isEEvidenceDelivery(formData)) return formData;
  if (selectors.length === 0) return formData;
  // Build a quick lookup so the nested update is O(1) per node.
  const matchKey = (s: RetryDeliverySelector) =>
    `${s.identifierId}|${s.serviceKey}|${s.groupKey}|${s.itemKey}|${s.additionalJobIndex ?? "-"}`;
  const selected = new Set(selectors.map(matchKey));

  return {
    ...formData,
    identifiers: (formData.identifiers ?? []).map((identifier) => {
      const updatedServices: Record<string, unknown> = {};
      let anyChange = false;
      for (const [serviceKey, service] of Object.entries(
        identifier.services ?? {},
      )) {
        const sv = service as {
          enabled?: boolean;
          categoryGroups?: Record<string, Record<string, SubCategory>>;
          [k: string]: unknown;
        };
        const groups = sv.categoryGroups;
        if (!groups) {
          updatedServices[serviceKey] = service;
          continue;
        }
        const updatedGroups: Record<string, Record<string, SubCategory>> = {};
        for (const [groupKey, items] of Object.entries(groups)) {
          const updatedItems: Record<string, SubCategory> = {};
          for (const [itemKey, item] of Object.entries(items)) {
            const primaryKey = matchKey({
              identifierId: identifier.id,
              serviceKey,
              groupKey,
              itemKey,
            });
            let nextItem: SubCategory = item;
            if (
              selected.has(primaryKey) &&
              item.deliveryStatus === "Failed"
            ) {
              nextItem = {
                ...item,
                deliveryStatus: "Started",
                deliveryError: undefined,
                deliveryStatusUpdatedAt: now,
              };
              anyChange = true;
            }
            const additionalJobs = (item.additionalJobs ?? []).map(
              (addJob, idx) => {
                const key = matchKey({
                  identifierId: identifier.id,
                  serviceKey,
                  groupKey,
                  itemKey,
                  additionalJobIndex: idx,
                });
                if (
                  selected.has(key) &&
                  addJob.deliveryStatus === "Failed"
                ) {
                  anyChange = true;
                  return {
                    ...addJob,
                    deliveryStatus: "Started" as const,
                    deliveryError: undefined,
                    deliveryStatusUpdatedAt: now,
                  };
                }
                return addJob;
              },
            );
            if (item.additionalJobs) {
              nextItem = { ...nextItem, additionalJobs };
            }
            updatedItems[itemKey] = nextItem;
          }
          updatedGroups[groupKey] = updatedItems;
        }
        updatedServices[serviceKey] = { ...sv, categoryGroups: updatedGroups };
      }
      if (!anyChange) return identifier;
      return { ...identifier, services: updatedServices as typeof identifier.services };
    }),
  };
}
