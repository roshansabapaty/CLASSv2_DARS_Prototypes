/**
 * Fulfillment Wizard Helper Functions
 * Date formatting, ID generation, and data derivation utilities
 */

import { CURRENT_USER } from "../constants/caseConstants";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";

// ── Locale-safe date display ────────────────────────────────────────────────
// All user-facing dates in the app render in the unambiguous form:
//   "MMM d, yyyy"   →   "Aug 1, 2025"
// (3-letter month name, no leading zero on day, comma + 4-digit year). No
// slashes, no locale-dependent ordering — readable identically in any locale.
//
// `formatDateToMMM` is the single source of truth for the display string and
// accepts the three input shapes we exchange with `<input type="date">` and
// the JS Date API:
//   - "" / undefined     → ""
//   - "yyyy-mm-dd"       → parsed as a *local* calendar date (no TZ shift)
//   - Date | ISO string  → parsed via the platform Date constructor
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDateToMMM(input: string | Date | undefined | null): string {
  if (input == null || input === "") return "";

  if (typeof input === "string") {
    // Treat bare YYYY-MM-DD as a local date (no timezone shift) — the wizard's
    // native <input type="date"> and our days-back arithmetic both operate in
    // local terms, so parsing through `new Date()` (which assumes UTC) would
    // shift by one day in negative-offset timezones.
    const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const monthIndex = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      if (monthIndex < 0 || monthIndex > 11) return "";
      return `${MONTH_NAMES[monthIndex]} ${day}, ${year}`;
    }
  }

  const date = input instanceof Date ? input : new Date(input);
  if (isNaN(date.getTime())) return "";
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Parse a display string produced by `formatDateToMMM` back to ISO
 * `yyyy-mm-dd`. Returns "" if the input doesn't match the expected
 * `"MMM d, yyyy"` shape. Handles single- and double-digit days.
 */
export function parseDateFromMMM(displayValue: string): string {
  if (!displayValue) return "";
  const m = /^([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})$/.exec(displayValue.trim());
  if (!m) return "";
  const monthIndex = MONTH_NAMES.indexOf(m[1]);
  if (monthIndex === -1) return "";
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (day < 1 || day > 31) return "";
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Helper: generate unique identifier ID (mirrors DataEntryForm)
export const generateIdentifierId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ID-${timestamp}-${random}`.toUpperCase();
};

// Helper: generate identifier-level task ID (mirrors DataEntryForm)
export const generateIdentifierTaskId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `TSK-${timestamp}-${random}`.toUpperCase();
};

// Helper: generate task ID for service/category combination
export const generateTaskId = (serviceId: string, categoryKey: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `${serviceId.substring(0, 3).toUpperCase()}-${categoryKey.substring(0, 3).toUpperCase()}-${timestamp}-${random}`.toUpperCase();
};

// Helper: create default sub-category
export const createDefaultSubCategory = () => ({
  enabled: false,
  taskId: "",
  startDate: undefined,
  endDate: undefined,
  status: "Not started" as const,
  collectionStatusUpdatedAt: undefined,
  publishStatusUpdatedAt: undefined,
  deliveryStatusUpdatedAt: undefined,
});

// Helper: create default service categories
export const createDefaultServiceCategories = () => ({
  basicSubscriber: createDefaultSubCategory(),
  authenticationLogs: createDefaultSubCategory(),
  serviceTelemetry: createDefaultSubCategory(),
  content: createDefaultSubCategory(),
  transactionalData: createDefaultSubCategory(),
});

// Helper: create a new identifier with full LENS services structure
export const createWizardIdentifier = () => {
  return {
    id: generateIdentifierId(),
    value: "",
    type: "",
    taskId: generateIdentifierTaskId(),
    taskStatus: "New",
    createdBy: CURRENT_USER,
    accountExistenceStatus: "not-checked" as const,
    services: createDefaultIdentifierServices(),
  };
};

// Data category labels for display
export const DATA_CATEGORY_LABELS = ["Basic Subscriber", "Authentication Logs", "Service Telemetry", "Content", "Transactional Logs"];

/**
 * Helper: derive account check results from identifier objects that already have accountExistence data
 * This reads existing account check data stored in the identifier.services[serviceKey].accountExistence
 * and converts it back into the accountCheckResults format
 */
export function deriveExistingAccountCheckResults(identifiers: any[]): Record<string, any> {
  const existingResults: Record<string, any> = {};

  identifiers.forEach((identifier) => {
    // Check if identifier has accountExistenceStatus field indicating it was checked
    if (identifier.accountExistenceStatus === "success" || identifier.accountExistenceStatus === "not-found") {
      // Look for accountExistence data in the first service
      const serviceKeys = Object.keys(identifier.services || {});
      if (serviceKeys.length > 0) {
        const firstServiceKey = serviceKeys[0];
        const accountExistence = identifier.services[firstServiceKey]?.accountExistence;

        if (accountExistence) {
          const consumer = accountExistence.consumerExists
            ? {
                storageLocation: accountExistence.consumerStorageLocation,
                primaryId: accountExistence.consumerPrimaryId,
                relatedIdentifiers: accountExistence.consumerRelatedIdentifiers || [],
              }
            : null;

          const enterprise = accountExistence.enterpriseExists
            ? {
                storageLocation: accountExistence.enterpriseStorageLocation,
                primaryId: accountExistence.enterprisePrimaryId,
                relatedIdentifiers: accountExistence.enterpriseRelatedIdentifiers || [],
                organizationId: accountExistence.enterpriseOrganizationId || null,
              }
            : null;

          existingResults[identifier.id] = {
            checked: true,
            exists: identifier.accountExistenceStatus === "success",
            accountTypes: [
              ...(accountExistence.consumerExists ? ["Consumer"] : []),
              ...(accountExistence.enterpriseExists ? ["Enterprise"] : []),
            ],
            consumer,
            enterprise,
          };
        }
      }
    }
  });
  return existingResults;
}