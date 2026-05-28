/**
 * resolveExternalServices — translate LE-supplied external service names to
 * internal LENS service keys, disambiguated by the identifier's account
 * check result.
 *
 * Five resolution statuses cover every failure mode:
 *   - resolved              : success
 *   - unmapped-name         : external name not in LE_EXTERNAL_SERVICE_MAP
 *   - missing-account-type  : account check hasn't run yet (transient)
 *   - wrong-account-type    : external is Consumer-only but identifier is
 *                             Enterprise (or vice versa)
 *   - internal-key-missing  : map says map-to-X but X is gone from catalog
 *
 * The N/A account-check case (account confirmed missing) is handled by the
 * caller — see `accountNotFound` in leBaseline. The resolver still returns
 * `missing-account-type` for N/A; the caller short-circuits to a different
 * UX path (Phase 5c.1).
 */

import type { AccountIdentifier } from "../types/caseTypes";
import {
  findExternalMapping,
  type ExternalAccountType,
} from "../config/leExternalServiceMap";
import { LENS_SERVICE_MAP } from "../config/lensServicesConfig";

export type ResolutionStatus =
  | "resolved"
  | "unmapped-name"
  | "missing-account-type"
  | "wrong-account-type"
  | "internal-key-missing";

export interface ResolvedService {
  /** The LE-supplied external name, verbatim (preserves whatever case / whitespace LE submitted). */
  externalName: string;
  /** The catalog key when resolved; null otherwise. */
  internalKey: string | null;
  status: ResolutionStatus;
  /** Human-readable reason for surfaces (banner / pane). */
  reason?: string;
  /** When wrong-account-type, list which account types DO support this external name. */
  supportedAccountTypes?: ExternalAccountType[];
  /** Per-external date range from `leExternalServiceDates`, threaded through. */
  dateRange?: { start: string; end: string };
}

/** Resolve one external name + account-type combination. Pure function. */
export function mapExternalToInternal(
  externalName: string,
  accountType: ExternalAccountType | "N/A" | undefined,
  dateRange?: { start: string; end: string }
): ResolvedService {
  const found = findExternalMapping(externalName);
  if (!found) {
    return {
      externalName,
      internalKey: null,
      status: "unmapped-name",
      reason: `"${externalName}" is not a known external service. Either an external name typo or a service we don't support yet.`,
      dateRange,
    };
  }
  const { canonicalName, mapping } = found;
  if (!accountType || accountType === "N/A") {
    return {
      externalName,
      internalKey: null,
      status: "missing-account-type",
      reason: `Run the account check to resolve "${canonicalName}".`,
      dateRange,
    };
  }
  const internalKey = mapping[accountType];
  if (!internalKey) {
    const supported = Object.keys(mapping) as ExternalAccountType[];
    return {
      externalName,
      internalKey: null,
      status: "wrong-account-type",
      reason: `"${canonicalName}" only supports ${supported.join(" or ")}; this identifier is ${accountType}.`,
      supportedAccountTypes: supported,
      dateRange,
    };
  }
  if (!LENS_SERVICE_MAP[internalKey]) {
    return {
      externalName,
      internalKey: null,
      status: "internal-key-missing",
      reason: `"${canonicalName}" maps to "${internalKey}", which is no longer in the LENS catalog. Escalate to mapping owner.`,
      dateRange,
    };
  }
  return {
    externalName,
    internalKey,
    status: "resolved",
    dateRange,
  };
}

/** Resolve every external service on an identifier. Returns one entry per
 *  `leExternalServices` array element (preserves order, including duplicates
 *  if any). When `leExternalServices` is undefined or empty, returns []. */
export function resolveIdentifierExternalServices(
  identifier: AccountIdentifier
): ResolvedService[] {
  const externals = identifier.leExternalServices ?? [];
  if (externals.length === 0) return [];
  const at = identifier.checkAccounts?.accountType as
    | ExternalAccountType
    | "N/A"
    | undefined;
  const dates = identifier.leExternalServiceDates ?? {};
  return externals.map((name) =>
    mapExternalToInternal(name, at, dates[name] ?? undefined)
  );
}

/** Convenience: only the keys that resolved successfully. */
export function resolvedInternalKeys(identifier: AccountIdentifier): string[] {
  return resolveIdentifierExternalServices(identifier)
    .filter((r) => r.status === "resolved" && r.internalKey)
    .map((r) => r.internalKey!) as string[];
}

/** Convenience: only the entries that did NOT resolve. */
export function unresolvedExternalServices(
  identifier: AccountIdentifier
): ResolvedService[] {
  return resolveIdentifierExternalServices(identifier).filter(
    (r) => r.status !== "resolved"
  );
}

/** True when the identifier's account-check returned "no account found"
 *  ("N/A"). Phase 5c.1 short-circuits the entire mapping flow in this case. */
export function isAccountNotFound(identifier: AccountIdentifier): boolean {
  return (
    identifier.accountExistenceStatus === "success" &&
    identifier.checkAccounts?.accountType === "N/A"
  );
}
