/**
 * Factory functions for generating IDs and creating default data structures.
 * Extracted from DataEntryForm.tsx for reuse across components.
 */
import type {
  AccountIdentifier,
  NonDisclosureOrder,
  SubCategory,
} from "../types/caseTypes";
import { createDefaultIdentifierServices } from "../config/lensServicesConfig";

// ── ID Generators ──────────────────────────────────────────────────────────────

export const generateCaseId = (): string => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CASE-${year}-${timestamp}${random}`;
};

export const generateCaseNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000) + 100000; // Generate 6-digit number between 100000-999999
  return `LNS-${year}-${random}`;
};

export const generateJobId = (): string => {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 900000) + 100000; // Generate 6-digit number between 100000-999999
  return `JOB-${year}${month}-${random}`;
};

export const generateIdentifierId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `ID-${timestamp}-${random}`.toUpperCase();
};

export const generateAgentId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `AGT-${timestamp}-${random}`.toUpperCase();
};

export const generateNDOId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `NDO-${timestamp}-${random}`.toUpperCase();
};

export const generateTaskId = (service: string, category: string): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 5);
  return `${service.substring(0, 3).toUpperCase()}-${category.substring(0, 3).toUpperCase()}-${timestamp}-${random}`.toUpperCase();
};

export const generateIdentifierTaskId = (): string => {
  const taskIdTypes: Array<"LDID" | "LIID" | "LPID"> = ["LDID", "LIID", "LPID"];
  const selectedTaskIdType = taskIdTypes[Math.floor(Math.random() * taskIdTypes.length)];
  const taskIdNumber = Math.floor(Math.random() * 900000) + 100000;
  return `${selectedTaskIdType}-${taskIdNumber}`;
};

// ── Default SubCategory Factory ────────────────────────────────────────────────

export const createDefaultSubCategory = (): SubCategory => ({
  enabled: false,
  taskId: "",
  startDate: undefined,
  endDate: undefined,
  status: "Not started",
  collectionStatusUpdatedAt: undefined,
  publishStatusUpdatedAt: undefined,
  deliveryStatusUpdatedAt: undefined,
});

// ── Entity Factories ───────────────────────────────────────────────────────────

export const createNewNDO = (): NonDisclosureOrder => ({
  id: generateNDOId(),
  name: "",
  status: "",
  statusReason: "",
  exclusionReason: "",
  temporaryNDO: false,
  startDate: undefined,
  durationDays: undefined,
  expirationDate: undefined,
  createdBy: "",
  createdOn: new Date(),
  relatedCases: [],
});

export const createNewIdentifier = (
  /** When supplied, scoped services (e.g. Production Letters on UK COPO
   *  cases where requestType === "COPO Order") get auto-enabled on the
   *  new identifier — see `createDefaultIdentifierServices`. */
  requestType?: string,
): AccountIdentifier => ({
  id: generateIdentifierId(),
  value: "",
  type: "",
  taskId: generateIdentifierTaskId(),
  taskStatus: "New",
  createdBy: "LE Agency", // Default for identifiers from original request
  services: createDefaultIdentifierServices(requestType),
});

// ── SLA / Date Calculations ────────────────────────────────────────────────────

export const calculateSLADays = (casePriority: "Emergency" | "Urgent" | "Priority" | "Routine" | "Standard", country: string): number => {
  // India always gets 3 days SLA regardless of priority
  if (country === "India") {
    return 3;
  }
  
  // Brazil always gets 3 days SLA
  if (country === "Brazil") {
    return 3;
  }
  
  // Priority-based SLA (Emergency note: 2-3 hours, but we use days for consistency)
  switch (casePriority) {
    case "Emergency":
      return 1; // Emergency: acknowledge within 20 min, complete in 2-3 hours (using 1 day for system)
    case "Urgent":
      return 3;
    case "Priority":
      return 3;
    case "Routine":
      return 10;
    case "Standard":
    default:
      return 10;
  }
};

export const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  
  return result;
};

export const calculateDueDate = (createDate: Date, casePriority: "Emergency" | "Urgent" | "Priority" | "Routine" | "Standard", country: string): Date => {
  const slaDays = calculateSLADays(casePriority, country);
  const dueDate = new Date(createDate);
  dueDate.setDate(dueDate.getDate() + slaDays);
  return dueDate;
};
