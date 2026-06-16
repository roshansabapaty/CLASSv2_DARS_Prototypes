// Shared utilities for IdentifierTable components

import { MICROSOFT_SERVICES_CONFIG, getServiceDisplayName } from "../../config/microsoftServices";

// Task status styling
export const TASK_STATUS_MAP: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  'New': { label: 'New', color: '#0078d4', bgColor: '#deecf9', borderColor: '#0078d4' },
  'InProgress': { label: 'In Progress', color: '#8a6d3b', bgColor: '#fff4ce', borderColor: '#8a6d3b' },
  // Purple — matches the attorney/legal accent used throughout the
  // Attorney Dashboard (e.g. AttorneyDashboard.tsx Scale icon color).
  'AttorneyReview': { label: 'Attorney Review', color: '#5c2d91', bgColor: '#f3f0fa', borderColor: '#8764b8' },
  'Rejected': { label: 'Rejected', color: '#a4262c', bgColor: '#fde7e9', borderColor: '#a4262c' },
  'Cancelled': { label: 'Cancelled', color: '#605e5c', bgColor: '#f3f2f1', borderColor: '#8a8886' },
  'DisclosureNotAvailable': { label: 'Disclosure Not Available', color: '#605e5c', bgColor: '#f3f2f1', borderColor: '#8a8886' },
  'Disclosed': { label: 'Disclosed', color: '#107c10', bgColor: '#dff6dd', borderColor: '#107c10' },
};

export function getTaskStatusStyle(status: string) {
  return TASK_STATUS_MAP[status] || TASK_STATUS_MAP['New'];
}

// Data category labels
export const DATA_CATEGORY_LABELS = [
  "Basic Subscriber",
  "Authentication Logs",
  "Service Telemetry",
  "Content",
  "Transactional Logs",
];

// Service labels from config
export const SERVICE_LABELS: Record<string, string> = Object.entries(MICROSOFT_SERVICES_CONFIG).reduce(
  (acc, [key, service]) => {
    acc[key] = key === "xbox" ? "XBOX" : service.name;
    return acc;
  },
  {} as Record<string, string>
);

// Get enabled services for an identifier
export function getEnabledServices(identifier: any): string[] {
  if (identifier.fulfillmentPlan?.services) {
    return Object.keys(identifier.fulfillmentPlan.services);
  }
  return Object.keys(identifier.services || {}).filter(
    (key) => identifier.services[key]?.enabled
  );
}

// Get storage location for a service
export function getStorageLocation(identifier: any, serviceId: string): string {
  if (identifier.fulfillmentPlan?.services?.[serviceId]?.dataCenterLocation) {
    return identifier.fulfillmentPlan.services[serviceId].dataCenterLocation;
  }
  const service = identifier.services?.[serviceId];
  if (service?.accountExistence?.consumerStorageLocation) {
    return service.accountExistence.consumerStorageLocation;
  }
  if (service?.accountExistence?.enterpriseStorageLocation) {
    return service.accountExistence.enterpriseStorageLocation;
  }
  return "";
}

// Get data categories for an identifier's service
export function getDataCategories(identifier: any, serviceId: string): string[] {
  if (identifier.fulfillmentPlan?.services?.[serviceId]?.dataCategories) {
    return identifier.fulfillmentPlan.services[serviceId].dataCategories;
  }
  return [];
}

// Derive account info from services, with a fallback to the per-identifier
// `checkAccounts` block so a freshly-submitted LE identifier (no internal
// services enabled yet) still reflects the account-existence check result
// instead of rendering as "Not Found".
export function getAccountInfo(identifier: any) {
  const hasConsumerFromServices = Object.values(identifier.services || {}).some(
    (svc: any) => svc.accountExistence?.consumerExists
  );
  const hasEnterpriseFromServices = Object.values(identifier.services || {}).some(
    (svc: any) => svc.accountExistence?.enterpriseExists
  );

  // Fallback: when no service-level `accountExistence` exists (e.g. fresh
  // LE submission before service mapping, or any case where Check Accounts
  // ran but no services were enabled), use the per-identifier
  // `checkAccounts.accountType` populated by `runAccountExistenceCheck`.
  const ckAccountType = identifier.checkAccounts?.accountType;
  const hasConsumer = hasConsumerFromServices || ckAccountType === "Consumer" || ckAccountType === "Enterprise-and-Consumer";
  const hasEnterprise = hasEnterpriseFromServices || ckAccountType === "Enterprise" || ckAccountType === "Enterprise-and-Consumer";
  const hasAccount = hasConsumer || hasEnterprise;

  const storageLocations = new Set<string>();
  Object.values(identifier.services || {}).forEach((svc: any) => {
    if (svc.accountExistence?.consumerStorageLocation) storageLocations.add(svc.accountExistence.consumerStorageLocation);
    if (svc.accountExistence?.enterpriseStorageLocation) storageLocations.add(svc.accountExistence.enterpriseStorageLocation);
  });
  // Same fallback for storage location — surface the per-identifier
  // `dataLocation` when no per-service value is available.
  if (storageLocations.size === 0 && identifier.checkAccounts?.dataLocation) {
    storageLocations.add(identifier.checkAccounts.dataLocation);
  }

  const enabledWithResults = Object.values(identifier.services || {}).filter(
    (svc: any) => svc.enabled && svc.accountExistence
  ).length;

  return { hasConsumer, hasEnterprise, hasAccount, storageLocations, enabledWithResults };
}

/**
 * Derive the LE-requested date range for a single service on an identifier.
 *
 * Preference order:
 *   1. Service-level `startDate` / `endDate` if both are set (the explicit LE request)
 *   2. min(startDate) / max(endDate) across every enabled category underneath the service
 *   3. undefined if neither source yields a complete range
 *
 * Used by IdentifierTableRow.tsx to display "LE requested: MMM/dd/yyyy – MMM/dd/yyyy"
 * beneath each enabled service in the expanded row.
 */
export function deriveServiceDateRange(service: any): { start: Date; end: Date } | undefined {
  if (service?.startDate && service?.endDate) {
    const s = new Date(service.startDate);
    const e = new Date(service.endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) return { start: s, end: e };
  }

  let minStart: Date | undefined;
  let maxEnd: Date | undefined;
  Object.values(service?.categoryGroups || {}).forEach((group: any) => {
    Object.values(group || {}).forEach((item: any) => {
      if (!item?.enabled) return;
      if (item.startDate) {
        const d = new Date(item.startDate);
        if (!isNaN(d.getTime()) && (!minStart || d < minStart)) minStart = d;
      }
      if (item.endDate) {
        const d = new Date(item.endDate);
        if (!isNaN(d.getTime()) && (!maxEnd || d > maxEnd)) maxEnd = d;
      }
    });
  });

  return minStart && maxEnd ? { start: minStart, end: maxEnd } : undefined;
}
