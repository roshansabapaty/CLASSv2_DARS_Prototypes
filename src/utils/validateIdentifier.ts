/**
 * validateIdentifier — single source of truth for Step 2 validation.
 *
 * Composes 12 small per-identifier checks (Phase 6 of the plan) into a single
 * `{ blocking, informational }` result. Step 2 banners + Step 3 readiness
 * gate consume the same function so the views stay consistent.
 *
 * All checks are pure: identifier + LE baseline + current config in, issues out.
 */

import type {
  AccountIdentifier,
  IdentifierServices,
} from "../types/caseTypes";
import {
  LENS_SERVICE_MAP,
  getServiceCategoryGroups,
} from "../config/lensServicesConfig";
import type { LEIdentifierBaseline } from "../components/fulfillment-wizard/leBaseline";
import type { ItemSelectionState } from "./categoryUtils";
import { isRejected } from "./identifierRejection";

export type ValidationSeverity = "blocking" | "informational";

export type ValidationCode =
  | "rejected"
  | "account-check-not-run"
  | "account-check-errored"
  | "account-check-na"
  | "le-service-incompatible"
  | "le-service-unmapped"
  | "le-category-unmapped"
  | "no-services-configured"
  | "full-le-removal-unconfirmed"
  | "manual-collection-items"
  | "le-date-modified"
  // ── Phase 7: external-service mapping resolver outcomes (LE_EXTERNAL_SERVICE_MAPPING) ──
  | "external-unmapped"
  | "external-account-type-pending"
  | "external-wrong-account-type"
  | "external-internal-key-missing";

export interface ValidationIssue {
  code: ValidationCode;
  severity: ValidationSeverity;
  /** Title shown in MessageBar / readiness gate. */
  title: string;
  /** Optional details: longer body text or list of offending keys. */
  detail?: string;
  /** Action key the surface can wire to a handler (run-check, retry, reject…). */
  action?:
    | "run-account-check"
    | "retry-account-check"
    | "reject-identifier"
    | "configure-services"
    | "confirm-no-data";
  /** Service / item references for surfaces that want to render details. */
  refs?: string[];
}

export interface ValidationResult {
  blocking: ValidationIssue[];
  informational: ValidationIssue[];
}

export interface ValidationContext {
  identifier: AccountIdentifier;
  baseline: LEIdentifierBaseline | undefined;
  /** Current per-identifier service selection (groupKey → itemKey[]) keyed by service. */
  current: ItemSelectionState[string] | undefined;
  /** Currently-enabled services for this identifier. */
  enabledServices: string[];
  /** True when the user has explicitly confirmed "no data to collect" for this identifier. */
  confirmedNoData?: boolean;
}

function pushBlocking(out: ValidationResult, issue: ValidationIssue) {
  out.blocking.push(issue);
}
function pushInformational(out: ValidationResult, issue: ValidationIssue) {
  out.informational.push(issue);
}

/** Account-check edge cases: cases 2, 3, 4 of the validation walkthrough. */
function checkAccountState(ctx: ValidationContext, out: ValidationResult) {
  const { identifier } = ctx;
  if (isRejected(identifier)) return; // not relevant; case 1 handled separately
  const status = identifier.accountExistenceStatus;
  if (!status || status === "not-checked") {
    pushBlocking(out, {
      code: "account-check-not-run",
      severity: "blocking",
      title: "Run the account check on this identifier before configuring services.",
      action: "run-account-check",
    });
    return;
  }
  if (status === "error") {
    pushBlocking(out, {
      code: "account-check-errored",
      severity: "blocking",
      title: "Account check failed.",
      detail: identifier.accountExistenceError ?? "Unknown error",
      action: "retry-account-check",
    });
    return;
  }
  if (status === "success" && identifier.checkAccounts?.accountType === "N/A") {
    pushBlocking(out, {
      code: "account-check-na",
      severity: "blocking",
      title: "No Microsoft account exists for this identifier.",
      detail: "Reject this identifier or remove it from the request.",
      action: "reject-identifier",
    });
  }
}

/** Cases 5, 6, 7: LE service / category compatibility + mapping. */
function checkLEMapping(ctx: ValidationContext, out: ValidationResult) {
  const { identifier, baseline } = ctx;
  if (!baseline) return;
  const accountType = identifier.checkAccounts?.accountType;

  for (const svcKey of baseline.services) {
    const svc = LENS_SERVICE_MAP[svcKey];
    if (!svc) {
      pushInformational(out, {
        code: "le-service-unmapped",
        severity: "informational",
        title: `LE service "${svcKey}" is not in the LENS catalog.`,
        refs: [svcKey],
      });
      continue;
    }
    // Compatibility check (only when account type is known + not N/A).
    if (
      svc.accountType &&
      accountType &&
      accountType !== "N/A" &&
      svc.accountType !== accountType
    ) {
      pushInformational(out, {
        code: "le-service-incompatible",
        severity: "informational",
        title: `LE requested ${svc.name} but the account checked as ${accountType}.`,
        detail: `${svc.name} requires ${svc.accountType}; the LE row will be auto-disabled in the workspace.`,
        refs: [svcKey],
      });
    }
    // Category mapping check.
    const groups = getServiceCategoryGroups(svcKey);
    const baselineGroups = baseline.items[svcKey] ?? {};
    for (const [groupKey, itemKeys] of Object.entries(baselineGroups)) {
      const group = groups.find((g) => g.key === groupKey);
      if (!group) {
        pushInformational(out, {
          code: "le-category-unmapped",
          severity: "informational",
          title: `LE data category "${groupKey}" is not in the catalog for ${svc.name}.`,
          refs: [`${svcKey}:${groupKey}`],
        });
        continue;
      }
      for (const itemKey of itemKeys) {
        if (!group.items.find((i) => i.key === itemKey)) {
          pushInformational(out, {
            code: "le-category-unmapped",
            severity: "informational",
            title: `LE data type "${itemKey}" is not in the catalog for ${svc.name} → ${group.name}.`,
            refs: [`${svcKey}:${groupKey}:${itemKey}`],
          });
        }
      }
    }
  }
}

/** Case 8: zero services configured after RS edits. */
function checkServicesConfigured(ctx: ValidationContext, out: ValidationResult) {
  const { enabledServices } = ctx;
  if (enabledServices.length === 0) {
    pushBlocking(out, {
      code: "no-services-configured",
      severity: "blocking",
      title: "No services configured for this identifier.",
      detail: "Configure at least one service or reject this identifier.",
      action: "configure-services",
    });
  }
}

/** Case 9: RS removed every LE-requested service and hasn't confirmed. */
function checkFullLERemoval(ctx: ValidationContext, out: ValidationResult) {
  const { baseline, enabledServices, confirmedNoData } = ctx;
  if (!baseline || baseline.services.length === 0) return;
  // All LE-requested services have been removed if none of the currently
  // enabled services overlap with the baseline AND no Added services exist.
  const enabledSet = new Set(enabledServices);
  const allRemoved = baseline.services.every((s) => !enabledSet.has(s));
  if (allRemoved && enabledServices.length === 0 && !confirmedNoData) {
    pushBlocking(out, {
      code: "full-le-removal-unconfirmed",
      severity: "blocking",
      title: "You have removed every LE-requested service.",
      detail: "Confirm 'No data to collect' for this identifier or reject it.",
      action: "confirm-no-data",
    });
  }
}

/** Case 10: any selected items require manual collection. */
function checkManualCollection(ctx: ValidationContext, out: ValidationResult) {
  const { current, enabledServices } = ctx;
  if (!current) return;
  const manualHits: string[] = [];
  for (const svcKey of enabledServices) {
    const groups = getServiceCategoryGroups(svcKey);
    const svcCurrent = current[svcKey] ?? {};
    for (const [groupKey, itemKeys] of Object.entries(svcCurrent)) {
      const group = groups.find((g) => g.key === groupKey);
      if (!group) continue;
      for (const itemKey of itemKeys) {
        const item = group.items.find((i) => i.key === itemKey);
        if (item && item.automated === false) {
          manualHits.push(`${svcKey}:${groupKey}:${itemKey}`);
        }
      }
    }
  }
  if (manualHits.length > 0) {
    pushInformational(out, {
      code: "manual-collection-items",
      severity: "informational",
      title: `${manualHits.length} item${manualHits.length === 1 ? "" : "s"} require manual collection.`,
      refs: manualHits,
    });
  }
}

/** Phase 7: Cases 13–16 — external-service mapping resolver outcomes.
 *
 * Severity escalates from informational → blocking when the unresolved entry
 * has no RS-configured substitute (per plan §5b.6 permissive-with-conscious-
 * override). Already-substituted externals (logged in
 * `identifier.externalSubstitutions`) are excluded.
 */
function checkExternalResolution(ctx: ValidationContext, out: ValidationResult) {
  const { identifier, baseline, enabledServices } = ctx;
  const unresolved = baseline?.externalUnresolved ?? [];
  if (unresolved.length === 0) return;

  // Filter out externals the RS has already substituted (Phase 5b.4).
  const substitutedSet = new Set(
    (identifier.externalSubstitutions ?? []).map((s) => s.externalName),
  );
  const live = unresolved.filter((r) => !substitutedSet.has(r.externalName));
  if (live.length === 0) return;

  // The "RS has a substitute" escalation rule: if the RS has configured ANY
  // internal service (via Replace dialog or manual Add Service), unresolved
  // entries are informational rather than blocking.
  const hasRSConfiguredService = enabledServices.length > 0;

  // Bucket by status code so we can emit one issue per category.
  const byStatus: Record<string, typeof live> = {};
  for (const r of live) {
    if (!byStatus[r.status]) byStatus[r.status] = [];
    byStatus[r.status].push(r);
  }

  // 13. unmapped-name → blocking when no RS-configured services, else informational
  if (byStatus["unmapped-name"]?.length) {
    const names = byStatus["unmapped-name"].map((r) => r.externalName);
    const blocking = !hasRSConfiguredService;
    const issue: ValidationIssue = {
      code: "external-unmapped",
      severity: blocking ? "blocking" : "informational",
      title: `${names.length} LE service${names.length === 1 ? "" : "s"} not in the LENS catalog: ${names.join(", ")}`,
      detail: blocking
        ? "Replace with an internal service or escalate to mapping owner. No internal services are configured for this identifier yet."
        : "Replace with an internal service or escalate. RS-configured services will be submitted as substitutes.",
      refs: names,
    };
    if (blocking) pushBlocking(out, issue); else pushInformational(out, issue);
  }

  // 14. missing-account-type → blocking when no other resolved externals exist
  if (byStatus["missing-account-type"]?.length) {
    const names = byStatus["missing-account-type"].map((r) => r.externalName);
    const otherResolvedCount = (baseline?.services ?? []).length;
    const blocking = otherResolvedCount === 0;
    const issue: ValidationIssue = {
      code: "external-account-type-pending",
      severity: blocking ? "blocking" : "informational",
      title: `${names.length} LE service${names.length === 1 ? "" : "s"} need an account check to resolve.`,
      detail: "Run the account-existence check for this identifier to resolve the mapping.",
      action: "run-account-check",
      refs: names,
    };
    if (blocking) pushBlocking(out, issue); else pushInformational(out, issue);
  }

  // 15. wrong-account-type → blocking when no RS-configured substitute, else informational
  if (byStatus["wrong-account-type"]?.length) {
    const names = byStatus["wrong-account-type"].map((r) => r.externalName);
    const blocking = !hasRSConfiguredService;
    const issue: ValidationIssue = {
      code: "external-wrong-account-type",
      severity: blocking ? "blocking" : "informational",
      title: `${names.length} LE service${names.length === 1 ? "" : "s"} require a different account type: ${names.join(", ")}`,
      detail: blocking
        ? "Replace with an internal service compatible with this identifier's account type, or reject the identifier."
        : "RS-configured services will be submitted in their place.",
      refs: names,
    };
    if (blocking) pushBlocking(out, issue); else pushInformational(out, issue);
  }

  // 16. internal-key-missing → always blocking (catalog drift; should never happen in prod)
  if (byStatus["internal-key-missing"]?.length) {
    const names = byStatus["internal-key-missing"].map((r) => r.externalName);
    pushBlocking(out, {
      code: "external-internal-key-missing",
      severity: "blocking",
      title: `${names.length} LE service${names.length === 1 ? "" : "s"} map to internal keys no longer in the LENS catalog.`,
      detail: "Catalog drift detected. Escalate to the mapping owner to investigate.",
      refs: names,
    });
  }
}

/** Compose the full result. */
export function validateIdentifier(ctx: ValidationContext): ValidationResult {
  const out: ValidationResult = { blocking: [], informational: [] };
  if (isRejected(ctx.identifier)) {
    // Rejected identifiers are skipped from submission; not strictly "blocking".
    return out;
  }
  checkAccountState(ctx, out);
  checkLEMapping(ctx, out);
  // Only run the configured/full-LE-removal checks when account state is OK,
  // otherwise the user would see noise on top of the more urgent gate.
  const hasAccountBlocker = out.blocking.some(
    (b) =>
      b.code === "account-check-not-run" ||
      b.code === "account-check-errored" ||
      b.code === "account-check-na"
  );
  if (!hasAccountBlocker) {
    checkServicesConfigured(ctx, out);
    checkFullLERemoval(ctx, out);
    checkManualCollection(ctx, out);
  }
  // External-service mapping checks run regardless of account-state so the
  // RS sees mapping issues even while account check is pending. The
  // `missing-account-type` case is itself surfaced here.
  checkExternalResolution(ctx, out);
  return out;
}

/** True when the identifier is ready to submit (no blocking issues + not rejected/skipped). */
export function isReadyForSubmission(
  ctx: ValidationContext
): { ready: boolean; skipped: boolean; result: ValidationResult } {
  if (isRejected(ctx.identifier)) {
    return {
      ready: false,
      skipped: true,
      result: { blocking: [], informational: [] },
    };
  }
  const result = validateIdentifier(ctx);
  return { ready: result.blocking.length === 0, skipped: false, result };
}

/** Helper: derive `enabledServices` + `current` from an identifier's services tree. */
export function extractCurrent(services: IdentifierServices): {
  enabledServices: string[];
  current: ItemSelectionState[string];
} {
  const enabledServices: string[] = [];
  const current: ItemSelectionState[string] = {} as any;
  for (const [svcKey, svc] of Object.entries(services)) {
    if (!svc.enabled) continue;
    enabledServices.push(svcKey);
    const groups: Record<string, string[]> = {};
    for (const [groupKey, items] of Object.entries(svc.categoryGroups)) {
      const enabledItems = Object.entries(items)
        .filter(([, item]) => item.enabled)
        .map(([itemKey]) => itemKey);
      if (enabledItems.length > 0) groups[groupKey] = enabledItems;
    }
    (current as any)[svcKey] = groups;
  }
  return { enabledServices, current };
}
