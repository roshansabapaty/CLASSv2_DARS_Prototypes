/**
 * categoryUtils.ts
 *
 * Central helpers for iterating and displaying service category group jobs.
 * All components that previously called Object.entries(service.dataCategories)
 * should use these functions instead, so iteration logic lives in one place.
 */
import type { SubCategory, IdentifierServiceConfig, IdentifierServices } from "../types/caseTypes";
import {
  LENS_SERVICE_MAP,
  getGroupName,
  getItemName,
  getServiceName,
} from "../config/lensServicesConfig";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ServiceJobEntry {
  serviceKey: string;
  serviceName: string;
  groupKey: string;
  groupName: string;
  itemKey: string;
  itemName: string;
  job: SubCategory;
}

// ── Iteration helpers ─────────────────────────────────────────────────────────

/**
 * Flatten all items (enabled or not) for a single service into a list.
 * Pass `enabledOnly: true` to filter to only enabled (submitted/active) jobs.
 */
export function getServiceJobs(
  serviceKey: string,
  service: IdentifierServiceConfig,
  enabledOnly = false
): ServiceJobEntry[] {
  const serviceName = getServiceName(serviceKey);
  const entries: ServiceJobEntry[] = [];

  // Walk the actual data shape (not a config tree) so this handles per-service
  // category configs with bespoke items.
  for (const [groupKey, groupItems] of Object.entries(service.categoryGroups ?? {})) {
    if (!groupItems) continue;
    for (const [itemKey, job] of Object.entries(groupItems)) {
      if (!job) continue;
      if (enabledOnly && !job.enabled) continue;
      entries.push({
        serviceKey,
        serviceName,
        groupKey,
        groupName: getGroupName(groupKey, serviceKey),
        itemKey,
        itemName: getItemName(groupKey, itemKey, serviceKey),
        job,
      });
    }
  }
  return entries;
}

/**
 * Flatten all enabled jobs across all services on an identifier.
 */
export function getAllIdentifierJobs(
  services: IdentifierServices,
  enabledOnly = true
): ServiceJobEntry[] {
  const entries: ServiceJobEntry[] = [];
  for (const [serviceKey, service] of Object.entries(services)) {
    if (!service.enabled && enabledOnly) continue;
    entries.push(...getServiceJobs(serviceKey, service, enabledOnly));
  }
  return entries;
}

// ── Display helpers ───────────────────────────────────────────────────────────

/**
 * Returns "Group Name — Item Name", e.g. "Subscriber Data — Date of Birth"
 * Use wherever a single category label was previously shown.
 */
export function formatJobLabel(
  entry: Pick<ServiceJobEntry, "groupName" | "itemName">
): string {
  return `${entry.groupName} — ${entry.itemName}`;
}

/**
 * Short item-only label, e.g. "Date of Birth"
 * Use in dense tables where the group is shown as a header row.
 */
export function formatItemLabel(
  entry: Pick<ServiceJobEntry, "itemName">
): string {
  return entry.itemName;
}

/**
 * Build a flat label from raw keys (for places that only have keys, not config objects).
 * Falls back gracefully if keys are not found.
 */
export function formatJobLabelFromKeys(groupKey: string, itemKey: string): string {
  const groupName = getGroupName(groupKey);
  const itemName = getItemName(groupKey, itemKey);
  return `${groupName} — ${itemName}`;
}

// ── Selection state helpers ───────────────────────────────────────────────────

/**
 * Selection state shape for the fulfillment wizard:
 * serviceKey → groupKey → itemKey[]
 */
export type ItemSelectionState = Record<string, Record<string, string[]>>;

/** Toggle an item in the selection state (immutable) */
export function toggleItemSelection(
  state: ItemSelectionState,
  serviceKey: string,
  groupKey: string,
  itemKey: string
): ItemSelectionState {
  const serviceGroups = state[serviceKey] ?? {};
  const currentItems = serviceGroups[groupKey] ?? [];
  const newItems = currentItems.includes(itemKey)
    ? currentItems.filter((k) => k !== itemKey)
    : [...currentItems, itemKey];
  return {
    ...state,
    [serviceKey]: {
      ...serviceGroups,
      [groupKey]: newItems,
    },
  };
}

/** Return true if an item is selected */
export function isItemSelected(
  state: ItemSelectionState,
  serviceKey: string,
  groupKey: string,
  itemKey: string
): boolean {
  return state[serviceKey]?.[groupKey]?.includes(itemKey) ?? false;
}

/** Count total selected items across all services */
export function countSelectedItems(state: ItemSelectionState): number {
  let count = 0;
  for (const groups of Object.values(state)) {
    for (const items of Object.values(groups)) {
      count += items.length;
    }
  }
  return count;
}
