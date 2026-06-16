/**
 * Mock account existence check logic.
 * Extracted from DataEntryForm to reduce file size.
 */
import type { FormData, AccountIdentifier, SubCategory, AccountExistenceResult } from "../types/caseTypes";
import { generateJobId } from "./caseFactories";
import { REGION_TO_LOCATION } from "../constants/caseConstants";

/** Helper function to safely extract identifier base */
function getIdentifierBase(value: string): string {
  if (value.includes("@")) {
    return value.split("@")[0];
  }
  return value.replace(/[^a-zA-Z0-9]/g, "_");
}

interface AccountCheckResult {
  status: "success" | "error";
  services?: any;
  error?: string;
  resultCount?: number;
  geoLocation?: string;
  checkAccounts?: {
    dataLocation?: string;
    accountType?: string;
    primaryIdentifier?: string;
    relatedIdentifiers?: string[];
  };
}

/**
 * Simulates an account existence check for all identifiers.
 * Returns a map of identifier ID → check result.
 */
export async function runAccountExistenceCheck(
  identifiers: AccountIdentifier[],
  caseStage: string,
  workflowStage: "triage" | "fulfillment" | "collection",
  /** True when the case is an eEvidence preservation request (EPOC-PR).
   *  Skips the random publish / deliver status writes — those stages
   *  don't run for preservation orders, only Collection. */
  collectionOnly: boolean = false,
): Promise<{
  resultsMap: Map<string, AccountCheckResult>;
  totalResults: number;
  successCount: number;
  errorCount: number;
}> {
  let totalResults = 0;
  let successCount = 0;
  let errorCount = 0;
  const resultsMap = new Map<string, AccountCheckResult>();

  await Promise.all(
    identifiers.map(async (identifier) => {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 500));

        const updatedServices = { ...identifier.services };
        let identifierResults = 0;
        const identifierBase = getIdentifierBase(identifier.value);

        // Decide account type ONCE per identifier.
        //
        // XBOX 5x5 gift-card redemption tokens cannot be resolved by the
        // standard account-existence check — the IA only knows the
        // redemption code, not which MSA redeemed it. Production resolves
        // these through the external XBOX gift-card-registry; the RS then
        // attaches the resolved MSA as a Supplemental identifier and runs
        // Check Accounts on that row. So the token row is always "N/A"
        // here; the per-row Account Check column should stay informational.
        const isTokenLookupOnly = identifier.type === "XBOX 5X5 Token";

        // Honour the mock-seeded `checkAccounts.accountType` first so demo
        // cases can deterministically force Consumer / Enterprise / N/A
        // outcomes (e.g. the LNS-2026-00190 manifest-error scenario seeds
        // Consumer; LNS-2026-00180 seeds Enterprise). Fall back to a random
        // roll for identifiers that don't pre-seed a value.
        // v2.1: `Enterprise-and-Consumer` maps to Consumer for the mock
        // check flow (the dual-account nature is expressed in
        // discoveredAccounts, not in per-service existence).
        const seededAccountType = identifier.checkAccounts?.accountType as
          | "Consumer"
          | "Enterprise"
          | "Enterprise-and-Consumer"
          | "N/A"
          | undefined;
        let identifierAccountType: "Consumer" | "Enterprise" | "N/A";
        if (isTokenLookupOnly) {
          identifierAccountType = "N/A";
        } else if (seededAccountType === "Enterprise-and-Consumer") {
          identifierAccountType = "Consumer";
        } else if (seededAccountType) {
          identifierAccountType = seededAccountType;
        } else {
          const identifierAccountRoll = Math.random();
          const isConsumer = identifierAccountRoll < 0.5;
          const isEnterprise = !isConsumer && identifierAccountRoll < 0.85;
          identifierAccountType = isConsumer
            ? "Consumer"
            : isEnterprise
              ? "Enterprise"
              : "N/A";
        }
        const identifierIsConsumer = identifierAccountType === "Consumer";
        const identifierIsEnterprise = identifierAccountType === "Enterprise";

        // ── Per-identifier CLASS lookup data (generated ONCE per identifier) ──
        // These values represent the per-identifier-level result (account type,
        // mailbox / data location, primary identifier, related identifiers).
        // They are independent of which internal services happen to be enabled
        // at the moment of the check — fresh LE-submitted state may have zero
        // enabled services, but the case-form per-identifier display still
        // needs these values populated.
        //
        // Per-service `accountExistence` blocks below reuse these so all
        // services on a single identifier report a consistent picture.
        // Storage boundaries — full canonical list sourced from
        // `REGION_TO_LOCATION` (constants/caseConstants.ts), the same
        // map the Storage Boundary column on Step 3 of the Fulfillment
        // Wizard renders against. Previously this was a hand-rolled
        // 4-entry pool that drifted when the Content Boundary controls
        // were removed; using the constant keeps the simulated check
        // and the displayed list in sync.
        const storageLocationsPool = Object.keys(REGION_TO_LOCATION);
        const identifierStorageLocation = identifierAccountType !== "N/A"
          ? storageLocationsPool[Math.floor(Math.random() * storageLocationsPool.length)]
          : undefined;
        const identifierPrimaryId =
          identifierAccountType === "Consumer"
            ? identifier.type === "Email Address"
              ? identifier.value
              : `consumer_${identifierBase}@outlook.com`
            : identifierAccountType === "Enterprise"
              ? identifier.type === "Email Address"
                ? identifier.value
                : `ent_${identifierBase}@contoso.com`
              : undefined;
        // Simulated related-identifier pool. CLASS routinely returns
        // 8–20 aliases per consumer account (email + phone + Skype +
        // gamertag + recovery addresses), so the pool is deliberately
        // wide enough to exercise the per-row Related Identifiers
        // scrollable list (max 5 visible, scroll for the rest). The
        // type chip is inferred from the value pattern at render time.
        const consumerRelatedPool = [
          `${identifierBase}-alias1@outlook.com`,
          `${identifierBase}-alias2@hotmail.com`,
          `${identifierBase}-recovery@gmail.com`,
          `${identifierBase}-old@live.com`,
          `${identifierBase}.gaming@outlook.com`,
          `live:.cid.${identifierBase.padEnd(12, "f").slice(0, 12)}`,
          `+1-206-555-${(1000 + (identifierBase.length * 37) % 9000).toString().padStart(4, "0")}`,
          `+44-20-7946-${(1000 + (identifierBase.length * 41) % 9000).toString().padStart(4, "0")}`,
          `${identifierBase}_xbl`,
          `${identifierBase}.skype@outlook.com`,
          `${identifierBase}-archive@outlook.com`,
          `${identifierBase}.work-backup@outlook.com`,
        ];
        const enterpriseRelatedPool = [
          `${identifierBase}.work@company.com`,
          `${identifierBase}.alt@contoso.com`,
          `${identifierBase}@fabrikam.onmicrosoft.com`,
          `${identifierBase}.svc@contoso.com`,
          `${identifierBase}.aad@contoso.com`,
        ];
        const identifierRelatedIdentifiers =
          identifierAccountType === "Consumer"
            // 6–12 entries — enough to exercise the scroll on most cases.
            ? consumerRelatedPool.slice(
                0,
                6 + Math.floor(Math.random() * 7),
              )
            : identifierAccountType === "Enterprise"
              ? enterpriseRelatedPool.slice(
                  0,
                  2 + Math.floor(Math.random() * 4),
                )
              : undefined;

        (Object.keys(updatedServices) as Array<keyof typeof updatedServices>).forEach((serviceName) => {
          if (updatedServices[serviceName].enabled) {
            updatedServices[serviceName] = {
              ...updatedServices[serviceName],
              categoryGroups: JSON.parse(JSON.stringify((updatedServices[serviceName] as any).categoryGroups || {})),
            };
            const categoryGroups = (updatedServices[serviceName] as any).categoryGroups;
            const results: AccountExistenceResult[] = [];

            if (!categoryGroups || typeof categoryGroups !== "object") {
              console.warn(`No data categories found for service: ${serviceName}`);
              return;
            }

            Object.entries(categoryGroups).forEach(([groupKey, group]: [string, any]) => {
              Object.entries(group || {}).forEach(([itemKey, categoryData]: [string, any]) => {
              const subCategory = categoryData as SubCategory;
              if (subCategory.enabled && subCategory.taskId) {
                const categoryKey = `${groupKey}:${itemKey}`;
                const categoryName = itemKey
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (str) => str.toUpperCase());

                const provisioned = Math.random() > 0.2;
                const associatedCount = provisioned ? Math.floor(Math.random() * 3) + 1 : 0;

                results.push({
                  taskId: subCategory.taskId,
                  categoryName,
                  accountProvisioned: provisioned,
                  accountType: provisioned ? identifierAccountType : "N/A",
                  associatedAccounts: provisioned
                    ? Array.from({ length: associatedCount }, (_, i) =>
                        `${identifierBase}-assoc-${i + 1}@example.com`
                      )
                    : [],
                });
              }
              }); // end Object.entries(group)
            }); // end Object.entries(categoryGroups)

            updatedServices[serviceName].existenceResults = results;

            // Generate service-level account existence data.
            // Reuse the per-identifier CLASS lookup values so every service
            // on this identifier reports a consistent picture.
            const consumerExists = identifierIsConsumer;
            const enterpriseExists = identifierIsEnterprise;
            const orgId = enterpriseExists ? `org-${Math.random().toString(36).substring(2, 9)}` : undefined;

            updatedServices[serviceName].accountExistence = {
              consumerExists,
              consumerAccounts: consumerExists
                ? Array.from({ length: Math.floor(Math.random() * 2) + 1 }, (_, i) =>
                    `${identifierBase}-consumer-${i + 1}@outlook.com`
                  )
                : undefined,
              consumerStorageLocation: consumerExists ? identifierStorageLocation : undefined,
              consumerPrimaryId: consumerExists ? identifierPrimaryId : undefined,
              consumerRelatedIdentifiers: consumerExists ? identifierRelatedIdentifiers : undefined,
              enterpriseExists,
              enterpriseAccounts: enterpriseExists
                ? Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) =>
                    `${identifierBase}-ent-${i + 1}@contoso.com`
                  )
                : undefined,
              enterpriseStorageLocation: enterpriseExists ? identifierStorageLocation : undefined,
              enterprisePrimaryId: enterpriseExists ? identifierPrimaryId : undefined,
              enterpriseRelatedIdentifiers: enterpriseExists ? identifierRelatedIdentifiers : undefined,
              enterpriseOrganizationId: orgId,
            };

            // Generate Background Data
            if (consumerExists || enterpriseExists) {
              const accountStatuses: Array<"Active" | "Soft-Deleted" | "Deleted"> = [
                "Active",
                "Active",
                "Active",
                "Soft-Deleted",
                "Deleted",
              ];
              const selectedAccountStatus = accountStatuses[Math.floor(Math.random() * accountStatuses.length)];
              const sizeInGB = (Math.random() * 50 + 0.5).toFixed(2);
              const accountUsedPercent = Math.floor(Math.random() * 90 + 10);
              const itemCount = Math.floor(Math.random() * 50000) + 100;

              const consumerAliasTemplates = ["personal", "home", "backup", "mobile", "tablet"];
              const enterpriseAliasTemplates = ["work", "corporate", "admin", "sales", "support"];

              const geoLocations = [
                "North America - East US 2",
                "North America - West US",
                "Europe - West Europe",
                "Europe - North Europe",
                "Asia Pacific - Southeast Asia",
                "Asia Pacific - East Asia",
              ];
              const selectedGeoLocation = geoLocations[Math.floor(Math.random() * geoLocations.length)];

              const isOutlook = serviceName === "outlook";

              updatedServices[serviceName].backgroundData = {
                volumeData: isOutlook
                  ? {
                      mailboxSize: `${sizeInGB} GB`,
                      mailboxCount: itemCount,
                    }
                  : {
                      fileSize: `${sizeInGB} GB`,
                      fileCount: itemCount,
                      accountSizeUsed: `${accountUsedPercent}%`,
                      accountSizeRemaining: `${100 - accountUsedPercent}%`,
                    },
                consumerAliases: consumerExists
                  ? consumerAliasTemplates
                      .slice(0, Math.floor(Math.random() * 3) + 1)
                      .map(
                        (alias) =>
                          `${alias}.${identifier.value.split("@")[0]}@${identifier.value.split("@")[1] || "outlook.com"}`
                      )
                  : undefined,
                enterpriseAliases: enterpriseExists
                  ? enterpriseAliasTemplates
                      .slice(0, Math.floor(Math.random() * 3) + 1)
                      .map(
                        (alias) =>
                          `${identifier.value.split("@")[0]}.${alias}@${identifier.value.split("@")[1] || "company.com"}`
                      )
                  : undefined,
                accountStatus: selectedAccountStatus,
                creationDate: new Date(Date.now() - Math.floor(Math.random() * 730) * 24 * 60 * 60 * 1000),
                geoLocation: selectedGeoLocation,
                ...(isOutlook && {
                  archiveEnabled: Math.random() > 0.5,
                  lockboxEnabled: Math.random() > 0.5,
                }),
              };
            }

            // Update data categories with job IDs and statuses
            const shouldGenerateStatuses =
              caseStage === "Triage Complete" || caseStage === "In Review" || workflowStage === "collection";

            if (shouldGenerateStatuses) {
              Object.entries(categoryGroups).forEach(([groupKey, group]: [string, any]) => {
                Object.keys(group || {}).forEach((itemKey) => {
                  const catKey = `${groupKey}:${itemKey}`;
                  const category = categoryGroups[groupKey][itemKey] as SubCategory;
                  if (category.enabled) {
                    const collectionStatus = ["Not Started", "Started", "Complete", "No Data"][
                      Math.floor(Math.random() * 4)
                    ] as any;
                    const jobId =
                      collectionStatus === "Started" || collectionStatus === "Complete"
                        ? generateJobId()
                        : undefined;
                    // EPOC-PR (preservation) cases skip the Packaging and
                    // Delivery stages entirely — those stay "Not Started"
                    // and never auto-advance. The mock check still walks
                    // the Collection branch normally.
                    const publishStatus = collectionOnly
                      ? ("Not Started" as any)
                      : collectionStatus === "Complete" || collectionStatus === "No Data"
                        ? (["Not Started", "Started", "Complete"][Math.floor(Math.random() * 3)] as any)
                        : "Not Started";
                    const deliveryStatus = collectionOnly
                      ? ("Not Started" as any)
                      : publishStatus === "Complete"
                        ? (["Not Started", "Started", "Complete"][Math.floor(Math.random() * 3)] as any)
                        : "Not Started";
                    const publishJobId =
                      !collectionOnly &&
                      (publishStatus === "Started" || publishStatus === "Complete")
                        ? `PUB-${jobId || generateJobId()}`
                        : undefined;
                    const deliveryJobId =
                      !collectionOnly &&
                      (deliveryStatus === "Started" || deliveryStatus === "Complete")
                        ? `DEL-${jobId || generateJobId()}`
                        : undefined;

                    let startDate = category.startDate;
                    let endDate = category.endDate;
                    if (collectionStatus === "Started" || collectionStatus === "Complete") {
                      const daysBack = Math.floor(Math.random() * 61) + 30;
                      endDate = new Date();
                      startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
                    }

                    categoryGroups[groupKey][itemKey] = {
                      ...category,
                      jobId,
                      collectionStatus,
                      publishStatus,
                      deliveryStatus,
                      publishJobId,
                      deliveryJobId,
                      startDate,
                      endDate,
                    };
                  }
                });
              });
            }

            identifierResults += results.length;
          }
        });

        // Generate geo location
        const geoLocations = [
          "United States (North America)",
          "United Kingdom (Europe)",
          "Germany (Europe)",
          "France (Europe)",
          "Canada (North America)",
          "Australia (Asia Pacific)",
          "Japan (Asia Pacific)",
          "Singapore (Asia Pacific)",
          "Brazil (South America)",
          "India (Asia Pacific)",
        ];

        // Per-identifier checkAccounts is built directly from the per-identifier
        // CLASS lookup values generated above — independent of which internal
        // services are currently enabled. This ensures the case-form
        // per-identifier display populates Account Type, Mailbox Location,
        // Primary Identifier, and Related Identifiers even when the LE
        // submission used LE-facing names and no internal services have been
        // configured yet.
        const checkAccountsData =
          identifierAccountType !== "N/A"
            ? {
                dataLocation: identifierStorageLocation,
                accountType: seededAccountType === "Enterprise-and-Consumer"
                  ? "Enterprise-and-Consumer"
                  : identifierAccountType,
                primaryIdentifier: identifier.checkAccounts?.primaryIdentifier ?? identifierPrimaryId,
                relatedIdentifiers: identifier.checkAccounts?.relatedIdentifiers ?? identifierRelatedIdentifiers,
                // v2.1: preserve structured per-account data when pre-seeded
                ...(identifier.checkAccounts?.discoveredAccounts && {
                  discoveredAccounts: identifier.checkAccounts.discoveredAccounts,
                  category: identifier.checkAccounts.category,
                  disclosureRelevance: identifier.checkAccounts.disclosureRelevance,
                  disclosureProcess: identifier.checkAccounts.disclosureProcess,
                }),
                // Preserve enterprise tenant context when pre-seeded
                ...(identifier.checkAccounts?.tenantId && {
                  tenantId: identifier.checkAccounts.tenantId,
                  parentTpid: identifier.checkAccounts.parentTpid,
                  tenantPrimaryDomain: identifier.checkAccounts.tenantPrimaryDomain,
                  tenantAdminName: identifier.checkAccounts.tenantAdminName,
                  tenantAdminEmail: identifier.checkAccounts.tenantAdminEmail,
                  tenantAdminPhone: identifier.checkAccounts.tenantAdminPhone,
                }),
              }
            : undefined;

        resultsMap.set(identifier.id, {
          status: "success",
          services: updatedServices,
          resultCount: identifierResults,
          geoLocation: geoLocations[Math.floor(Math.random() * geoLocations.length)],
          checkAccounts: checkAccountsData,
        });

        totalResults += identifierResults;
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error(`Account check failed for identifier ${identifier.value}:`, error);
        resultsMap.set(identifier.id, {
          status: "error",
          error: errorMessage,
        });
        errorCount++;
      }
    })
  );

  return { resultsMap, totalResults, successCount, errorCount };
}

// ── Mutually-exclusive account-type invariant ───────────────────────
// "An account can only be Consumer OR Enterprise, never both."
//
// The two helpers below defend the invariant defensively at the seams
// where data flows back into FormData. The check function above (per
// the per-identifier `identifierAccountType` derivation at lines 76-90)
// already produces XOR results, but seeded mock data or future writers
// could drift — these guards normalize + warn so the UI never has to
// branch on the contradictory case.

/** Per-block normalizer: when a single `accountExistence` block has
 *  both `consumerExists` and `enterpriseExists` set true, Enterprise
 *  wins (matches the convention the check function uses internally:
 *  `consumerExists = identifierIsConsumer; enterpriseExists =
 *  identifierIsEnterprise`, which can't both be true). Consumer fields
 *  are stripped in the returned block. Emits a dev-mode console.warn
 *  so the seed / writer is fixed at the source. */
export function normalizeAccountExistence<
  T extends {
    consumerExists?: boolean;
    enterpriseExists?: boolean;
    consumerAccounts?: any;
    consumerStorageLocation?: any;
    consumerPrimaryId?: any;
    consumerRelatedIdentifiers?: any;
  } | undefined,
>(existence: T): T {
  if (!existence) return existence;
  if (existence.consumerExists && existence.enterpriseExists) {
    if (typeof console !== "undefined") {
      console.warn(
        "[accountExistence] consumerExists + enterpriseExists both true; " +
          "coercing to Enterprise (mutually-exclusive invariant).",
      );
    }
    return {
      ...existence,
      consumerExists: false,
      consumerAccounts: undefined,
      consumerStorageLocation: undefined,
      consumerPrimaryId: undefined,
      consumerRelatedIdentifiers: undefined,
    };
  }
  return existence;
}

/** Per-identifier normalizer: walks every service block and applies
 *  `normalizeAccountExistence`. Also catches cross-service drift — if
 *  one service says Consumer and another says Enterprise on the same
 *  identifier, the first non-N/A type seen wins and subsequent blocks
 *  are coerced. Returns a new identifier; safe to call on already-
 *  consistent data (no-op). */
export function normalizeIdentifierAccountType(
  identifier: AccountIdentifier,
): AccountIdentifier {
  const services = identifier.services as any;
  if (!services) return identifier;
  let resolved: "Consumer" | "Enterprise" | null = null;
  let mutated = false;
  const nextServices: any = { ...services };
  for (const key of Object.keys(services)) {
    const svc = services[key];
    if (!svc) continue;
    const exNormalized = normalizeAccountExistence(svc.accountExistence);
    if (exNormalized !== svc.accountExistence) {
      nextServices[key] = { ...svc, accountExistence: exNormalized };
      mutated = true;
    }
    if (exNormalized?.enterpriseExists) {
      if (resolved === "Consumer") {
        if (typeof console !== "undefined") {
          console.warn(
            `[accountExistence] identifier ${identifier.id} mixes Consumer + ` +
              `Enterprise across services; first type wins (Consumer).`,
          );
        }
        nextServices[key] = {
          ...nextServices[key],
          accountExistence: {
            ...exNormalized,
            enterpriseExists: false,
            enterpriseAccounts: undefined,
            enterpriseStorageLocation: undefined,
            enterprisePrimaryId: undefined,
            enterpriseRelatedIdentifiers: undefined,
            enterpriseOrganizationId: undefined,
          },
        };
        mutated = true;
      } else if (resolved === null) {
        resolved = "Enterprise";
      }
    } else if (exNormalized?.consumerExists) {
      if (resolved === "Enterprise") {
        if (typeof console !== "undefined") {
          console.warn(
            `[accountExistence] identifier ${identifier.id} mixes Consumer + ` +
              `Enterprise across services; first type wins (Enterprise).`,
          );
        }
        nextServices[key] = {
          ...nextServices[key],
          accountExistence: {
            ...exNormalized,
            consumerExists: false,
            consumerAccounts: undefined,
            consumerStorageLocation: undefined,
            consumerPrimaryId: undefined,
            consumerRelatedIdentifiers: undefined,
          },
        };
        mutated = true;
      } else if (resolved === null) {
        resolved = "Consumer";
      }
    }
  }
  return mutated ? { ...identifier, services: nextServices } : identifier;
}

/**
 * Applies account existence check results to identifiers.
 * Returns updated identifiers array.
 */
export function applyAccountExistenceResults(
  identifiers: AccountIdentifier[],
  resultsMap: Map<string, AccountCheckResult>,
): AccountIdentifier[] {
  return identifiers.map((identifier) => {
    const result = resultsMap.get(identifier.id);
    if (!result) return identifier;

    if (result.status === "success") {
      // Merge the freshly-computed check result onto any seeded
      // `checkAccounts` fields rather than replacing them outright. The
      // check function returns only the dynamically computed fields
      // (accountType, dataLocation, primaryIdentifier, relatedIdentifiers),
      // but mock cases pre-seed Enterprise Tenant Profile fields
      // (tenantId, tenantPrimaryDomain, tenantAdminName, tenantAdminEmail,
      // tenantAdminPhone) on the identifier so demos can show the
      // "notify the Controller" banner with realistic contact info. The
      // merge keeps those seeded fields intact while still letting the
      // check overwrite the values it owns.
      const mergedCheckAccounts = result.checkAccounts
        ? { ...identifier.checkAccounts, ...result.checkAccounts }
        : identifier.checkAccounts;
      const merged: AccountIdentifier = {
        ...identifier,
        taskStatus: identifier.taskStatus,
        accountExistenceStatus: "success" as const,
        accountExistenceError: undefined,
        geoLocation: result.geoLocation,
        services: result.services,
        checkAccounts: mergedCheckAccounts,
      };
      // Defensive normalization — the check function above already produces
      // XOR results, but apply the invariant guard so any drift from a
      // future writer or merged seed gets caught at this seam.
      return normalizeIdentifierAccountType(merged);
    } else {
      return {
        ...identifier,
        taskStatus: identifier.taskStatus,
        accountExistenceStatus: "error" as const,
        accountExistenceError: result.error,
      };
    }
  });
}
