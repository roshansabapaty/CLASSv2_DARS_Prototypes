/**
 * Helpers for the prior-tenant-history lookup feature.
 *
 * Phase 4 of the prototype-to-prod merge — ported from the prototype's
 * `src/helpers/priorTenantLookup.ts`. Production wires this through
 * CLASS / LERS; the prototype reads from `data/mockPriorHistory.ts`.
 *
 * Pinned follow-up #5 — production swap-out architecture
 * ──────────────────────────────────────────────────────
 * The synchronous mock backend reads from `MOCK_PRIOR_HISTORY` and
 * `MOCK_ORGS` at module load. Production needs to swap that for a
 * CLASS Org Profile + LERS prior-tenant query — same helper
 * signatures, async data source, cache layer.
 *
 * `PriorTenantLookupSource` is the swap-out seam. The default export
 * is wired to the in-memory mock; production wires the interface to
 * an HTTP client. Every helper in this file consumes the source via
 * the `lookupSource` indirection so the production swap is a single
 * import or one `setPriorTenantLookupSource(...)` call at app boot.
 *
 * Async note: production lookups will be async (network round-trip).
 * The helpers below stay synchronous because every reader today
 * expects sync values; the production swap will need to layer a
 * cache + `useSyncExternalStore` (or React Query) on top. That
 * caching layer lives outside this file — these helpers stay pure.
 */

import type { EnterpriseOrgContext, PriorCase } from "../types/caseTypes";
import { MOCK_PRIOR_HISTORY } from "../data/mockPriorHistory";
import { MOCK_ORGS } from "../data/mockOrgs";

/**
 * Production swap-out seam — implementations of this interface back
 * the lookup helpers in this file. The mock implementation reads from
 * `MOCK_PRIOR_HISTORY` + `MOCK_ORGS`; the production implementation
 * will read from CLASS + LERS via a cached HTTP client.
 *
 *   - `getPriorCasesByTenantId(tenantId)` — analog of the LERS
 *     "prior cases for tenant T" query.
 *   - `getAllTenants()` — analog of the CLASS Org Profile "every org"
 *     enumeration. Used to resolve TPID rollups (find every tenant
 *     whose `parentTpid` matches).
 *
 *  Production may want a richer `getTenantsByParentTpid(tpid)` to
 *  push the filter to the backend instead of materialising every
 *  tenant. Add it as a separate method when wiring; the helpers
 *  below check for it on the source and fall through to the
 *  client-side filter when absent.
 */
export interface PriorTenantLookupSource {
  getPriorCasesByTenantId(tenantId: string): PriorCase[];
  getAllTenants(): EnterpriseOrgContext[];
  /** Optional — when present, the source is asked to filter server-
   *  side; otherwise the helpers walk `getAllTenants()`. */
  getTenantsByParentTpid?(parentTpid: string): EnterpriseOrgContext[];
}

const mockSource: PriorTenantLookupSource = {
  getPriorCasesByTenantId: (tenantId) => MOCK_PRIOR_HISTORY[tenantId] ?? [],
  getAllTenants: () => Object.values(MOCK_ORGS),
};

let lookupSource: PriorTenantLookupSource = mockSource;

/** App-boot hook for production wiring. Swap the in-memory mock with
 *  a CLASS / LERS-backed implementation in one call. */
export function setPriorTenantLookupSource(
  source: PriorTenantLookupSource,
): void {
  lookupSource = source;
}

/** Restore the mock source. Useful in tests + after swap-out
 *  regression checks. */
export function resetPriorTenantLookupSource(): void {
  lookupSource = mockSource;
}

export function getPriorCasesForTenant(tenantId: string): PriorCase[] {
  return lookupSource.getPriorCasesByTenantId(tenantId);
}

export function getPriorCaseById(caseId: string): PriorCase | undefined {
  for (const org of lookupSource.getAllTenants()) {
    const hit = lookupSource
      .getPriorCasesByTenantId(org.tenantId)
      .find((p) => p.caseId === caseId);
    if (hit) return hit;
  }
  return undefined;
}

/** Find which tenant a prior case originated under by walking
 *  `MOCK_PRIOR_HISTORY` for the case id. Used by the
 *  `PriorCaseDetailPanel` to surface an "Originating tenant" badge
 *  when the case opened from a TPID rollup view (multi-tenant cases).
 *  Returns the matching `EnterpriseOrgContext` so callers get the
 *  display name + domain in one shot. */
export function getPriorCaseOriginOrg(
  priorCaseId: string,
): { tenantId: string; tenantDisplayName?: string; tenantPrimaryDomain?: string } | undefined {
  for (const org of lookupSource.getAllTenants()) {
    const list = lookupSource.getPriorCasesByTenantId(org.tenantId);
    if (list.some((p) => p.caseId === priorCaseId)) {
      return {
        tenantId: org.tenantId,
        tenantDisplayName: org.tenantDisplayName,
        tenantPrimaryDomain: org.tenantPrimaryDomain,
      };
    }
  }
  return undefined;
}

export function summarizePriorHistory(tenantId: string): {
  count: number;
  redirected: number;
} {
  const prior = getPriorCasesForTenant(tenantId);
  return {
    count: prior.length,
    redirected: prior.filter((p) => p.resolutionStatus === "redirected").length,
  };
}

// ── TPID-aware lookup (multi-tenant rollup) ─────────────────────────
//
// When a case targets identifiers in multiple child tenants under one
// parent TPID, the attorney wants a single rollup view of prior cases
// across every child tenant. These helpers walk MOCK_ORGS to find
// every tenant matching the parent TPID, then aggregate prior cases
// across them.
//
// Production wires this through a CLASS / LERS TPID-keyed lookup.

/** Every tenantId in MOCK_ORGS whose `parentTpid` matches the supplied
 *  TPID. Useful for any rollup feature that wants to span child
 *  tenants (prior history, derogation tracker, RAVE, etc.). */
export function getTenantsForTpid(tpid: string): string[] {
  // Production swap-out — prefer the server-side filter when the
  // source exposes it; fall back to client-side walk of every tenant.
  if (lookupSource.getTenantsByParentTpid) {
    return lookupSource.getTenantsByParentTpid(tpid).map((o) => o.tenantId);
  }
  const out: string[] = [];
  for (const org of lookupSource.getAllTenants()) {
    if (org.parentTpid === tpid) out.push(org.tenantId);
  }
  return out;
}

/** Prior cases across every child tenant under the supplied parent
 *  TPID. Each returned `PriorCase` carries its own `caseId`, so the
 *  detail drawer can resolve back to the originating tenant via
 *  `getPriorCaseById`. Returns the aggregate sorted newest-first by
 *  `dateServed`. */
export function getPriorCasesForTpid(tpid: string): PriorCase[] {
  const out: PriorCase[] = [];
  for (const tenantId of getTenantsForTpid(tpid)) {
    out.push(...lookupSource.getPriorCasesByTenantId(tenantId));
  }
  return out.sort((a, b) => b.dateServed.localeCompare(a.dateServed));
}

/** Rollup summary across every child tenant under the supplied TPID.
 *  Mirrors `summarizePriorHistory` but aggregates across multiple
 *  tenants. */
export function summarizePriorHistoryForTpid(tpid: string): {
  count: number;
  redirected: number;
  tenantCount: number;
} {
  const tenantIds = getTenantsForTpid(tpid);
  let count = 0;
  let redirected = 0;
  for (const tenantId of tenantIds) {
    const prior = lookupSource.getPriorCasesByTenantId(tenantId);
    count += prior.length;
    redirected += prior.filter(
      (p) => p.resolutionStatus === "redirected",
    ).length;
  }
  return { count, redirected, tenantCount: tenantIds.length };
}
