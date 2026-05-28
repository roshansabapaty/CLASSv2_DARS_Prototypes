/**
 * leBaseline — frontend-only provenance layer for Step 2 Services Configuration.
 *
 * The `SubCategory` type on `identifier.services[...]` is serialized, so we do NOT
 * extend it. Instead we snapshot the LE-original state once per session and compute
 * provenance at render time by comparing current wizard state against that snapshot.
 */

import type { ItemSelectionState } from "../../utils/categoryUtils";
import {
  resolveIdentifierExternalServices,
  isAccountNotFound,
} from "../../utils/resolveExternalServices";
import { getServiceCategoryGroups } from "../../config/lensServicesConfig";

export type LEIdentifierBaseline = {
  services: string[];
  items: ItemSelectionState;
  /** LE-requested dates keyed as "svcKey:groupKey:itemKey". Only entries for
   *  items that LE actually provided a non-empty start/end go in. */
  categoryDates: Record<string, { start: string; end: string }>;
  /** External-service resolution results that did NOT resolve cleanly.
   *  Drives the LE Review panel's Mapping issues pane (Phase 5b). */
  externalUnresolved?: import("../../utils/resolveExternalServices").ResolvedService[];
  /** True when the identifier's account check returned "no account exists"
   *  (accountType === "N/A" + status === "success"). Phase 5c.1 surfaces a
   *  short-circuit banner instead of running mapping resolution. */
  accountNotFound?: boolean;
};

/** Normalize Date | string | undefined into a YYYY-MM-DD string (or empty). */
function normalizeDate(d: Date | string | undefined): string {
  if (!d) return "";
  if (typeof d === "string") {
    // Already YYYY-MM-DD → pass through; otherwise parse.
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
  }
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  }
  return "";
}

/** Read the LE-requested date for one category, or undefined if LE didn't set one. */
export function getBaselineDate(
  baseline: LEIdentifierBaseline | undefined,
  serviceKey: string,
  groupKey: string,
  itemKey: string,
): { start: string; end: string } | undefined {
  return baseline?.categoryDates?.[`${serviceKey}:${groupKey}:${itemKey}`];
}

export type LEBaseline = Record<string, LEIdentifierBaseline>;

export type Provenance =
  | "le"           // LE-requested, unchanged
  | "le-modified"  // LE-requested, user changed scope/dates
  | "le-removed"   // LE-requested, user removed
  | "added"        // User-added, not in LE request
  | "bulk-added";  // Added via a bulk action (subset of 'added')

/** Snapshot identifier.services[].enabled tree into a baseline entry.
 *
 *  When the identifier carries `leExternalServices` (Phase 1 — UK COPO style),
 *  this function ALSO resolves those external names into internal keys via
 *  the resolver and merges them into the baseline. Resolved services are
 *  added to the baseline's `services` array (so the LE Review panel renders
 *  them) and unresolved entries land in `externalUnresolved` for the
 *  Mapping issues pane to consume.
 */
export function snapshotIdentifierBaseline(identifier: any): LEIdentifierBaseline {
  const services: string[] = [];
  const items: ItemSelectionState = {};
  const categoryDates: Record<string, { start: string; end: string }> = {};
  Object.entries(identifier.services || {}).forEach(([serviceId, service]: [string, any]) => {
    if (!service?.enabled) return;
    const svcItems: Record<string, string[]> = {};
    Object.entries(service.categoryGroups || {}).forEach(([groupKey, groupData]: [string, any]) => {
      const enabledItemKeys: string[] = [];
      Object.entries(groupData || {}).forEach(([itemKey, itemData]: [string, any]) => {
        if (!itemData?.enabled) return;
        enabledItemKeys.push(itemKey);
        const start = normalizeDate(itemData.startDate);
        const end = normalizeDate(itemData.endDate);
        if (start && end) {
          categoryDates[`${serviceId}:${groupKey}:${itemKey}`] = { start, end };
        }
      });
      if (enabledItemKeys.length > 0) svcItems[groupKey] = enabledItemKeys;
    });
    if (Object.keys(svcItems).length > 0) {
      services.push(serviceId);
      items[serviceId] = svcItems;
    }
  });

  // ── External LE service mapping (Phase 4 of LE_EXTERNAL_SERVICE_MAPPING) ──
  const accountNotFound: boolean = isAccountNotFound(identifier);
  const resolved = resolveIdentifierExternalServices(identifier);
  const externalUnresolved = resolved.filter((r: any) => r.status !== "resolved");

  // Merge resolved external services into the baseline. Each resolved entry
  // adds its internal key to `services` (if not already there) and seeds
  // any default-selected items so the LE Review panel renders the service
  // tree without needing the user to manually flip flags.
  for (const r of resolved) {
    if (r.status !== "resolved" || !r.internalKey) continue;
    if (!services.includes(r.internalKey)) services.push(r.internalKey);
    if (!items[r.internalKey]) items[r.internalKey] = {};
    const groups = getServiceCategoryGroups(r.internalKey);
    for (const group of groups) {
      const seeded = group.items
        .filter((i: any) => i.defaultSelected || i.locked)
        .map((i: any) => i.key);
      if (seeded.length > 0 && !items[r.internalKey][group.key]) {
        items[r.internalKey][group.key] = seeded;
      }
      // If LE provided a per-external date range, write it onto every seeded item.
      if (r.dateRange?.start && r.dateRange?.end) {
        for (const itemKey of seeded) {
          const ref = `${r.internalKey}:${group.key}:${itemKey}`;
          if (!categoryDates[ref]) {
            categoryDates[ref] = { start: r.dateRange.start, end: r.dateRange.end };
          }
        }
      }
    }
  }

  return {
    services,
    items,
    categoryDates,
    externalUnresolved: externalUnresolved.length > 0 ? externalUnresolved : undefined,
    accountNotFound: accountNotFound || undefined,
  };
}

/** Snapshot every identifier's LE state. Call once on mount. */
export function snapshotLEBaseline(identifiers: any[]): LEBaseline {
  const baseline: LEBaseline = {};
  identifiers.forEach((id) => {
    baseline[id.id] = snapshotIdentifierBaseline(id);
  });
  return baseline;
}

/** Was this item in the LE baseline? */
export function isInBaseline(
  baseline: LEIdentifierBaseline | undefined,
  serviceKey: string,
  groupKey: string,
  itemKey: string,
): boolean {
  return !!baseline?.items[serviceKey]?.[groupKey]?.includes(itemKey);
}

/** Was this service in the LE baseline? */
export function isServiceInBaseline(
  baseline: LEIdentifierBaseline | undefined,
  serviceKey: string,
): boolean {
  return !!baseline?.services.includes(serviceKey);
}

/**
 * Compute the single best provenance tag for a category row.
 *
 * Resolution order:
 *   - isRemoved  → "le-removed"  (only meaningful for items that were in baseline)
 *   - in baseline + dates/scope changed → "le-modified"
 *   - in baseline → "le"
 *   - added via bulk action  → "bulk-added"
 *   - otherwise → "added"
 */
export function resolveProvenance(params: {
  baseline: LEIdentifierBaseline | undefined;
  serviceKey: string;
  groupKey: string;
  itemKey: string;
  isCurrentlySelected: boolean;
  isRemoved: boolean;
  currentDate?: { start: string; end: string };
  baselineDate?: { start: string; end: string };
  bulkTouched: Set<string>; // keys of form "svc:group:item"
  identifierId: string;
}): Provenance {
  const { baseline, serviceKey, groupKey, itemKey, isCurrentlySelected, isRemoved,
    currentDate, baselineDate, bulkTouched, identifierId } = params;
  const inBaseline = isInBaseline(baseline, serviceKey, groupKey, itemKey);
  const bulkKey = `${identifierId}:${serviceKey}:${groupKey}:${itemKey}`;

  if (inBaseline && isRemoved) return "le-removed";
  if (inBaseline && isCurrentlySelected) {
    // Modified iff dates differ from baseline. Only compare when the user has
    // actually set a non-empty current date — otherwise the baseline is
    // effectively in effect and the row is unchanged.
    const currentHasDates = !!(currentDate && currentDate.start && currentDate.end);
    const baselineHasDates = !!(baselineDate && baselineDate.start && baselineDate.end);
    if (currentHasDates && baselineHasDates) {
      const changed =
        currentDate!.start !== baselineDate!.start ||
        currentDate!.end !== baselineDate!.end;
      if (changed) return "le-modified";
    }
    return "le";
  }
  if (isCurrentlySelected && bulkTouched.has(bulkKey)) return "bulk-added";
  return "added";
}

/**
 * Action to be taken on a category row when the fulfillment plan is submitted.
 * Used by Step 3 to preview what clicking "Submit" will actually do.
 */
export type RowAction =
  | "create-job"    // New category, no existing job — will create a collection job
  | "no-change"     // LE-requested, dates unchanged, job already running — leave alone
  | "update-dates"  // LE-requested, dates changed — push new date range to existing job
  | "cancel-job"    // LE-requested but user removed — cancel the existing job
  | "skip";         // No action applicable (e.g., removed row with no existing job)

const TERMINAL_STATUSES = new Set(["Complete", "Failed", "Cancelled"]);

/**
 * Given a row's provenance + existing job state, compute what Submit will do.
 * Rules:
 *   - LE-removed + has jobId + non-terminal status → cancel-job
 *   - LE-removed + no jobId (or terminal) → skip
 *   - Has non-terminal jobId + dates unchanged → no-change
 *   - Has non-terminal jobId + LE-modified (dates changed) → update-dates
 *   - No jobId (or terminal) + selected → create-job
 */
export function resolveRowAction(params: {
  provenance: Provenance;
  existingJobId?: string;
  collectionStatus?: string;
}): RowAction {
  const { provenance, existingJobId, collectionStatus } = params;
  const jobInFlight = !!existingJobId && !TERMINAL_STATUSES.has(collectionStatus || "");

  if (provenance === "le-removed") {
    return jobInFlight ? "cancel-job" : "skip";
  }
  if (jobInFlight) {
    if (provenance === "le-modified") return "update-dates";
    return "no-change";
  }
  // No in-flight job (or terminal): anything still selected gets a new job.
  return "create-job";
}

/** Count of each RowAction type across all identifiers — for banner + submit button. */
export type ActionTotals = {
  creates: number;
  updates: number;
  cancels: number;
  noChange: number;
  total: number; // creates + updates + cancels (excludes no-change and skip)
};

export function emptyActionTotals(): ActionTotals {
  return { creates: 0, updates: 0, cancels: 0, noChange: 0, total: 0 };
}

export function addAction(totals: ActionTotals, action: RowAction): ActionTotals {
  switch (action) {
    case "create-job":   return { ...totals, creates: totals.creates + 1, total: totals.total + 1 };
    case "update-dates": return { ...totals, updates: totals.updates + 1, total: totals.total + 1 };
    case "cancel-job":   return { ...totals, cancels: totals.cancels + 1, total: totals.total + 1 };
    case "no-change":    return { ...totals, noChange: totals.noChange + 1 };
    case "skip":         return totals;
  }
}

/** Diff stats for the ChangesSummary panel. */
export type DiffStats = {
  servicesAddedCount: number;
  servicesRemovedCount: number;
  categoriesAdded: Array<{ identifierId: string; serviceKey: string; groupKey: string; itemKey: string }>;
  categoriesRemoved: Array<{ identifierId: string; serviceKey: string; groupKey: string; itemKey: string; reason?: string }>;
  categoriesModified: Array<{ identifierId: string; serviceKey: string; groupKey: string; itemKey: string }>;
};

export function computeDiff(
  baseline: LEBaseline,
  current: Record<string, ItemSelectionState>, // identifierId → serviceKey → groupKey → itemKey[]
  removed: Record<string, Set<string>>,         // identifierId → Set<"svc:group:item">
  removalReasons: Record<string, string>,       // "idId:svc:group:item" → reason
  currentDates: Record<string, { start: string; end: string }>, // "idId:svc:group:item"
  baselineDates: Record<string, { start: string; end: string }>,
): DiffStats {
  const stats: DiffStats = {
    servicesAddedCount: 0,
    servicesRemovedCount: 0,
    categoriesAdded: [],
    categoriesRemoved: [],
    categoriesModified: [],
  };

  const allIdentifierIds = new Set<string>([
    ...Object.keys(baseline),
    ...Object.keys(current),
  ]);

  allIdentifierIds.forEach((idId) => {
    const base = baseline[idId];
    const cur = current[idId] || {};
    const rem = removed[idId] || new Set<string>();

    const baseServices = new Set(base?.services || []);
    const curServices = new Set(Object.keys(cur));
    curServices.forEach((s) => { if (!baseServices.has(s)) stats.servicesAddedCount += 1; });
    baseServices.forEach((s) => {
      // Treat a service as "removed" if ALL its baseline categories are in the removed set
      if (!curServices.has(s)) {
        const baseItemCount = Object.values(base?.items[s] || {}).reduce((n, arr) => n + arr.length, 0);
        if (baseItemCount > 0) stats.servicesRemovedCount += 1;
      }
    });

    // Added categories = in current but not in baseline
    Object.entries(cur).forEach(([serviceKey, groups]) => {
      Object.entries(groups).forEach(([groupKey, itemKeys]) => {
        itemKeys.forEach((itemKey) => {
          if (!isInBaseline(base, serviceKey, groupKey, itemKey)) {
            stats.categoriesAdded.push({ identifierId: idId, serviceKey, groupKey, itemKey });
          } else {
            // Check date modification
            const key = `${idId}:${serviceKey}:${groupKey}:${itemKey}`;
            const curD = currentDates[key];
            const baseD = baselineDates[key];
            if (curD && baseD && (curD.start !== baseD.start || curD.end !== baseD.end)) {
              stats.categoriesModified.push({ identifierId: idId, serviceKey, groupKey, itemKey });
            }
          }
        });
      });
    });

    // Removed categories = in removed set
    rem.forEach((key) => {
      const [serviceKey, groupKey, itemKey] = key.split(":");
      const reason = removalReasons[`${idId}:${key}`];
      stats.categoriesRemoved.push({ identifierId: idId, serviceKey, groupKey, itemKey, reason });
    });
  });

  return stats;
}

// ─── Account-type routing for bulk Add Service ─────────────────────────────────

/**
 * Route a set of services to the identifiers in scope based on account type.
 * Returns a map of serviceKey → identifierId[] (only identifiers whose detected
 * accountType matches the service's accountType, or whose service has no accountType,
 * or whose accountType is unknown / "N/A" — in which case the service applies).
 *
 * Used by the bulk Add Service flow to:
 *   1. Filter the menu to services that have ≥ 1 matching identifier
 *   2. Build the preview dialog showing per-service routing
 *   3. Drive the apply step (one apply per service, scoped to its matched subset)
 */
export function routeServicesByAccountType(
  serviceKeys: string[],
  identifiers: Array<{ id: string; checkAccounts?: { accountType?: string } }>,
  serviceAccountType: (svcKey: string) => "Consumer" | "Enterprise" | undefined,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const svcKey of serviceKeys) {
    const required = serviceAccountType(svcKey);
    out[svcKey] = identifiers
      .filter((id) => {
        if (!required) return true; // service is "either"-type
        const detected = id.checkAccounts?.accountType;
        if (!detected || detected === "N/A") return true; // unknown — don't restrict
        return detected === required;
      })
      .map((id) => id.id);
  }
  return out;
}

