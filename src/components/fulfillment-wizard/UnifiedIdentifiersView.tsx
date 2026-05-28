/**
 * UnifiedIdentifiersView — per-identifier list for Step 2.
 *
 * Each identifier renders as an IdentifierAccordion (header with Target identifier /
 * Type / Task ID / Created by / Account / N configured / Status / N blocking labels)
 * whose expansion is a SplitPane:
 *   - LEFT: LEReviewPanel (read-only "what LE submitted" + validation banners)
 *   - RIGHT: RSEditPanel wrapping the existing ServiceDropdownSelector +
 *     ServiceCategoryTable workspace (per-category date editing preserved).
 *
 * Rejected identifiers render the RejectedIdentifierCard instead of the split.
 *
 * Props additions in this graduation:
 *   - onRejectIdentifier / onRestoreIdentifier — for the rejection flow.
 *   - onConfirmNoData / confirmedNoDataIds — for the full-LE-removal confirm banner.
 *   - onResetIdentifierToLE — per-identifier "Reset to LE" link.
 *   All are OPTIONAL so existing callers keep working; missing handlers are no-ops.
 */

import React from "react";
import {
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ServiceDropdownSelector } from "./ServiceDropdownSelector";
import { ServiceCategoryTable } from "./ServiceCategoryTable";
import { IdentifierAccordion } from "./IdentifierAccordion";
import {
  LENS_SERVICES,
  getServiceCategoryGroups,
  type CategoryGroupConfig,
} from "../../config/lensServicesConfig";
import type { ItemSelectionState } from "../../utils/categoryUtils";
import { resolveProvenance, getBaselineDate, type LEBaseline } from "./leBaseline";
import {
  validateIdentifier,
  extractCurrent,
} from "../../utils/validateIdentifier";
import { isRejected, markRejected, restore as restoreRejection } from "../../utils/identifierRejection";
import type { AccountIdentifier } from "../../types/caseTypes";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
});

export interface UnifiedIdentifiersViewProps {
  identifiers: AccountIdentifier[];
  selectedIdentifierIds: Set<string>;
  onToggleIdentifierSelect: (id: string, checked: boolean) => void;

  /** Per-identifier → serviceKey → groupKey → itemKey[] */
  perIdentifierItems: Record<string, ItemSelectionState>;
  perIdentifierServices: Record<string, string[]>;
  onUpdateIdentifier: (identifierId: string, services: string[], items: ItemSelectionState) => void;

  /** Identifier-level date range state (one per identifier, applied to all its categories) */
  identifierDateRanges: Record<string, { start: string; end: string }>;
  onUpdateDateRange: (identifierId: string, start: string, end: string) => void;

  /** Category-level date range state ("idId:svcKey:groupKey:itemKey") */
  categoryDateRanges: Record<string, { start: string; end: string }>;
  onUpdateCategoryDate: (identifierId: string, svcKey: string, groupKey: string, itemKey: string, field: "start" | "end", value: string) => void;

  /** LE baseline (read-only) for computing provenance */
  leBaseline: LEBaseline;

  /** Keys added via bulk actions (format: "idId:svc:group:item") */
  bulkTouched?: Set<string>;

  /** Reset a specific item's dates back to LE baseline */
  onResetItemToLE?: (identifierId: string, svcKey: string, groupKey: string, itemKey: string) => void;

  // ── New (Step 2 redesign) — optional ──────────────────────────────────────

  /** Mark the identifier rejected (sets `identifier.rejection`). */
  onRejectIdentifier?: (identifierId: string, reason: string, documentRef?: string) => void;
  /** Restore a rejected identifier (clears `identifier.rejection`). */
  onRestoreIdentifier?: (identifierId: string) => void;
  /** Per-identifier "Reset to LE" link in the RS workspace header. */
  onResetIdentifierToLE?: (identifierId: string) => void;
  /** Confirm "no data to collect" for an identifier (clears the full-LE-removal banner). */
  onConfirmNoData?: (identifierId: string) => void;
  /** Identifiers for which the user has confirmed "no data to collect". */
  confirmedNoDataIds?: Set<string>;
  /** Run the account check for an identifier (typically bounces to Step 1). */
  onRunCheckRequested?: (identifierId: string) => void;
  /** Acknowledge a per-identifier ETSI Cancelled / Withdrawn (Phase 5c.4) —
   *  cascades the value to the identifier's `taskStatus`. */
  onAcknowledgeETSI?: (identifierId: string) => void;
  /** Acknowledge "no Microsoft account exists" — flips taskStatus to
   *  "Not Found" (Phase 5c.1). */
  onAcknowledgeNotFound?: (identifierId: string) => void;
  /** Mark this identifier invalid (Phase 5c.2). */
  onMarkInvalid?: (identifierId: string, reason: string) => void;
  /** Restore an identifier previously marked invalid (Phase 5c.2). */
  onRestoreInvalid?: (identifierId: string) => void;
  /** True when the wizard was re-entered from the Collection page to amend
   *  an in-flight plan. Drives the `+ Add Additional Date Range` affordance
   *  (Phase 9) and `submittedData` rendering on already-submitted rows. */
  isEditingCollectionScope?: boolean;
  /** Per-identifier additional date ranges keyed by "svcKey:groupKey:itemKey".
   *  Each entry is the list of supplemental jobs to create on submit (Phase 9). */
  additionalDateRangesByIdentifier?: Record<string, Record<string, Array<{ start: string; end: string }>>>;
  /** Add a new draft additional date range entry for a submitted row. */
  onAddInlineDateRange?: (identifierId: string, svcKey: string, groupKey: string, itemKey: string) => void;
  /** Update one field of one draft additional range. */
  onUpdateInlineAdditionalDateRange?: (identifierId: string, svcKey: string, groupKey: string, itemKey: string, idx: number, field: "start" | "end", value: string) => void;
  /** Remove a draft additional range. */
  onRemoveInlineDateRange?: (identifierId: string, svcKey: string, groupKey: string, itemKey: string, idx: number) => void;
  /** Commit a Replace-with-internal-service substitution (Phase 5b.4). */
  onCommitSubstitution?: (identifierId: string, externalName: string, internalKey: string, reason?: string) => void;
}

export function UnifiedIdentifiersView({
  identifiers,
  selectedIdentifierIds,
  onToggleIdentifierSelect,
  perIdentifierItems,
  perIdentifierServices,
  onUpdateIdentifier,
  identifierDateRanges,
  onUpdateDateRange: _onUpdateDateRange,
  categoryDateRanges,
  onUpdateCategoryDate,
  leBaseline,
  bulkTouched,
  onResetItemToLE,
  onRejectIdentifier,
  onRestoreIdentifier,
  onResetIdentifierToLE,
  onConfirmNoData,
  confirmedNoDataIds,
  onRunCheckRequested,
  onAcknowledgeETSI,
  onAcknowledgeNotFound,
  onMarkInvalid,
  onRestoreInvalid,
  isEditingCollectionScope = false,
  additionalDateRangesByIdentifier = {},
  onAddInlineDateRange,
  onUpdateInlineAdditionalDateRange,
  onRemoveInlineDateRange,
  onCommitSubstitution,
}: UnifiedIdentifiersViewProps) {
  const styles = useStyles();

  const ALL_MICROSOFT_SERVICES = LENS_SERVICES.map((svc) => ({
    id: svc.key,
    name: svc.name,
    icon: svc.icon || "📦",
    accountType: svc.accountType,
  }));

  return (
    <div className={styles.container}>
      {identifiers.map((identifier) => {
        const svcKeys = perIdentifierServices[identifier.id] || [];
        const items = perIdentifierItems[identifier.id] || {};
        const enabledServiceCount = svcKeys.filter((svc) => {
          const groups = items[svc] ?? {};
          return Object.values(groups).some((arr) => arr.length > 0);
        }).length;
        const isChecked = selectedIdentifierIds.has(identifier.id);
        const baseline = leBaseline[identifier.id];
        const validation = validateIdentifier({
          identifier,
          baseline,
          current: items as any,
          enabledServices: svcKeys,
          confirmedNoData: confirmedNoDataIds?.has(identifier.id) ?? false,
        });
        const blocked = validation.blocking.some(
          (b) =>
            b.code === "account-check-not-run" ||
            b.code === "account-check-errored" ||
            b.code === "account-check-na"
        );
        const showFullRemovalConfirm = validation.blocking.some(
          (b) => b.code === "full-le-removal-unconfirmed"
        );

        // Strict accountType filter for the per-identifier picker.
        const detectedAT = identifier.checkAccounts?.accountType;
        const MICROSOFT_SERVICES = ALL_MICROSOFT_SERVICES.filter((svc) => {
          if (!svc.accountType) return true;
          if (!detectedAT || detectedAT === "N/A") return true;
          return svc.accountType === detectedAT;
        });

        const availableGroups: Record<string, CategoryGroupConfig[]> = Object.fromEntries(
          MICROSOFT_SERVICES.map((s) => [s.id, getServiceCategoryGroups(s.id)]),
        );

        const idPrefix = `${identifier.id}:`;

        // The right-pane workspace is the existing ServiceDropdownSelector +
        // ServiceCategoryTable tree, wired exactly as it was pre-graduation.
        const workspace = (
          <ServiceDropdownSelector
            label="Microsoft Services"
            services={MICROSOFT_SERVICES}
            availableGroups={availableGroups}
            selectedServices={svcKeys}
            selectedItems={items}
            showCard={false}
            identifierId={identifier.id}
            identifierLabel={identifier.value}
            identifierAccountType={identifier.checkAccounts?.accountType}
            onSelectionChange={(newServices, newItems) => {
              const seededItems: ItemSelectionState = { ...newItems };
              newServices.forEach((svcId) => {
                if (svcKeys.includes(svcId)) return;
                getServiceCategoryGroups(svcId).forEach((group) => {
                  const defaults = group.items
                    .filter((i) => i.defaultSelected && i.locked)
                    .map((i) => i.key);
                  if (defaults.length === 0) return;
                  if (!seededItems[svcId]) seededItems[svcId] = {};
                  const existing = seededItems[svcId][group.key] || [];
                  const merged = [...existing];
                  defaults.forEach((k) => { if (!merged.includes(k)) merged.push(k); });
                  seededItems[svcId][group.key] = merged;
                });
              });
              onUpdateIdentifier(identifier.id, newServices, seededItems);
            }}
            renderBody={(serviceId) => {
              const svcGroups = getServiceCategoryGroups(serviceId);
              const svcPrefix = `${idPrefix}${serviceId}:`;
              const svcDateRanges = Object.fromEntries(
                Object.entries(categoryDateRanges)
                  .filter(([k]) => k.startsWith(svcPrefix))
                  .map(([k, v]) => [k.slice(svcPrefix.length), v]),
              );
              // Per-(identifier, service) slice of additional date ranges,
              // keyed by "groupKey:itemKey" (the table expects that shape).
              const allAdds = additionalDateRangesByIdentifier[identifier.id] || {};
              const svcAddPrefix = `${serviceId}:`;
              const svcAddRanges: Record<string, Array<{ start: string; end: string }>> = {};
              Object.entries(allAdds).forEach(([k, v]) => {
                if (k.startsWith(svcAddPrefix)) svcAddRanges[k] = v;
              });
              // Compute submittedData for this (identifier, service) on the
              // fly from `identifier.services[serviceId].categoryGroups` —
              // each item's enabled+jobId tells the table the row is submitted.
              const svcRecord = (identifier.services as any)?.[serviceId];
              const submittedData: Record<string, Record<string, any>> | undefined =
                isEditingCollectionScope && svcRecord?.categoryGroups
                  ? Object.fromEntries(
                      Object.entries(svcRecord.categoryGroups).map(
                        ([groupKey, groupData]: [string, any]) => [
                          groupKey,
                          Object.fromEntries(
                            Object.entries(groupData || {}).map(
                              ([itemKey, item]: [string, any]) => [
                                itemKey,
                                {
                                  enabled: item.enabled,
                                  collectionStatus: item.collectionStatus,
                                  startDate: item.startDate,
                                  endDate: item.endDate,
                                  jobId: item.jobId,
                                },
                              ],
                            ),
                          ),
                        ],
                      ),
                    )
                  : undefined;
              return (
                <ServiceCategoryTable
                  serviceId={serviceId}
                  groups={svcGroups}
                  selectedItems={items[serviceId] || {}}
                  categoryDateRanges={svcDateRanges}
                  additionalDateRanges={svcAddRanges}
                  submittedData={submittedData}
                  isEditingCollectionScope={isEditingCollectionScope}
                  onToggleItem={(groupKey, itemKey) => {
                    const group = svcGroups.find((g) => g.key === groupKey);
                    const item = group?.items.find((i) => i.key === itemKey);
                    const currentlySelected = (items[serviceId]?.[groupKey] || []).includes(itemKey);
                    if (item?.locked && currentlySelected) return;
                    const svcItems = items[serviceId] || {};
                    const groupItems = svcItems[groupKey] || [];
                    const idx = groupItems.indexOf(itemKey);
                    const newGroupItems =
                      idx >= 0
                        ? groupItems.filter((k) => k !== itemKey)
                        : [...groupItems, itemKey];
                    const nextItems: ItemSelectionState = {
                      ...items,
                      [serviceId]: { ...svcItems, [groupKey]: newGroupItems },
                    };
                    onUpdateIdentifier(identifier.id, svcKeys, nextItems);
                  }}
                  onDateChange={(groupKey, itemKey, field, value) =>
                    onUpdateCategoryDate(identifier.id, serviceId, groupKey, itemKey, field, value)
                  }
                  onAddDateRange={(groupKey, itemKey) =>
                    onAddInlineDateRange?.(identifier.id, serviceId, groupKey, itemKey)
                  }
                  onRemoveDateRange={(groupKey, itemKey, idx) =>
                    onRemoveInlineDateRange?.(identifier.id, serviceId, groupKey, itemKey, idx)
                  }
                  onUpdateAdditionalDateRange={(groupKey, itemKey, idx, field, value) =>
                    onUpdateInlineAdditionalDateRange?.(identifier.id, serviceId, groupKey, itemKey, idx, field, value)
                  }
                  bulkDateRange={identifierDateRanges[identifier.id]}
                  getProvenance={(groupKey, itemKey) => {
                    const selected = (items[serviceId]?.[groupKey] || []).includes(itemKey);
                    if (!selected) return null;
                    const key = `${identifier.id}:${serviceId}:${groupKey}:${itemKey}`;
                    const curDate =
                      categoryDateRanges[key] ||
                      identifierDateRanges[identifier.id];
                    const baseDate = getBaselineDate(baseline, serviceId, groupKey, itemKey);
                    return resolveProvenance({
                      baseline,
                      serviceKey: serviceId,
                      groupKey,
                      itemKey,
                      isCurrentlySelected: true,
                      isRemoved: false,
                      currentDate: curDate,
                      baselineDate: baseDate,
                      bulkTouched: bulkTouched || new Set<string>(),
                      identifierId: identifier.id,
                    });
                  }}
                  getBaselineDate={(groupKey, itemKey) =>
                    getBaselineDate(baseline, serviceId, groupKey, itemKey)
                  }
                  onResetItemToLE={(groupKey, itemKey) =>
                    onResetItemToLE?.(identifier.id, serviceId, groupKey, itemKey)
                  }
                />
              );
            }}
          />
        );

        return (
          <IdentifierAccordion
            key={identifier.id}
            identifier={identifier}
            baseline={baseline}
            validation={validation}
            enabledServiceCount={enabledServiceCount}
            selected={isChecked}
            onSelectChange={(next) => onToggleIdentifierSelect(identifier.id, next)}
            onRunCheck={() => onRunCheckRequested?.(identifier.id)}
            onRetryCheck={() => onRunCheckRequested?.(identifier.id)}
            onOpenReject={() => {
              // Defer to the wired handler; if absent, no-op (the dialog
              // inside RSEditPanel will handle the actual reason capture).
            }}
            onRestore={() => onRestoreIdentifier?.(identifier.id)}
            onAcknowledgeETSI={() => onAcknowledgeETSI?.(identifier.id)}
            onAcknowledgeNotFound={() => onAcknowledgeNotFound?.(identifier.id)}
            onMarkInvalid={(reason) => onMarkInvalid?.(identifier.id, reason)}
            onRestoreInvalid={() => onRestoreInvalid?.(identifier.id)}
            onCommitSubstitution={(externalName, internalKey, reason) =>
              onCommitSubstitution?.(identifier.id, externalName, internalKey, reason)
            }
            rsEdit={{
              disabled: blocked,
              showFullRemovalConfirm,
              confirmedNoData: confirmedNoDataIds?.has(identifier.id) ?? false,
              onConfirmNoData: () => onConfirmNoData?.(identifier.id),
              onResetToLE: () => onResetIdentifierToLE?.(identifier.id),
              onRejectIdentifier: (reason, ref) =>
                onRejectIdentifier?.(identifier.id, reason, ref),
              workspace,
            }}
          />
        );
      })}
    </div>
  );
}
