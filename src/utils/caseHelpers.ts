import type { TaskStatus } from "../types/caseTypes";
import { TASK_STATUS_CONFIG, IDENTIFIER_FORMAT_RULES, REGION_TO_LOCATION } from "../constants/caseConstants";

// Map stored casePriority values to their display labels
// The underlying values ("Emergency", "Urgent") remain unchanged for backward compatibility
export const getPriorityDisplayName = (priority: string): string => {
  switch (priority) {
    case "Emergency":
      return "Emergency - No Legal Demand";
    case "Urgent":
      return "Emergency - Legal Demand Attached";
    default:
      return priority;
  }
};

// Helper function to safely get task status config with fallback
export const getTaskStatusConfig = (status: TaskStatus | undefined) => {
  return status && TASK_STATUS_CONFIG[status] 
    ? TASK_STATUS_CONFIG[status]
    : TASK_STATUS_CONFIG.New; // Default to "New" if undefined or invalid
};

// Helper function to get contact status badge styling
export const getContactStatusBadge = (status: string) => {
  const statusMap: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    "Awaiting Review": { color: "#8a6d3b", bgColor: "#fff4ce", borderColor: "#8a6d3b" },
    "Escalation": { color: "#d13438", bgColor: "#fde7e9", borderColor: "#d13438" },
    "Approved": { color: "#107c10", bgColor: "#dff6dd", borderColor: "#107c10" },
    "Rejected": { color: "#a4262c", bgColor: "#fde7e9", borderColor: "#a4262c" },
  };
  return statusMap[status] || { color: "#605e5c", bgColor: "#f3f2f1", borderColor: "#8a8886" };
};

// Validate identifier value based on type
export const validateIdentifierFormat = (value: string, type: string): { valid: boolean; message?: string; example?: string } => {
  if (!value || !type) {
    return { valid: true };
  }
  
  const rule = IDENTIFIER_FORMAT_RULES[type];
  if (!rule) {
    return { valid: true }; // No validation rule for this type
  }
  
  let isValid = true;
  
  if (rule.pattern) {
    isValid = rule.pattern.test(value);
  } else if (rule.validate) {
    isValid = rule.validate(value);
  }
  
  if (!isValid) {
    return {
      valid: false,
      message: rule.description,
      example: rule.example
    };
  }
  
  return { valid: true };
};

// Helper function to format storage location with country
export const formatStorageLocation = (location: string): string => {
  const locationInfo = REGION_TO_LOCATION[location];
  if (locationInfo) {
    return `${locationInfo.region}, ${locationInfo.country}`;
  }
  // If not in mapping, return as-is
  return location;
};

// Helper function to check if storage location country matches case country
export const doesStorageCountryMatch = (storageLocation: string, caseCountry: string): boolean => {
  const locationInfo = REGION_TO_LOCATION[storageLocation];
  if (!locationInfo) return true; // If we can't determine, assume it matches (no false warning)
  return locationInfo.country === caseCountry;
};

// Phone number formatting utility
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-numeric characters except '+'
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // If empty, return empty
  if (!cleaned) return '';
  
  // If starts with '+', format as international
  if (cleaned.startsWith('+')) {
    const countryCode = cleaned.slice(1, 2); // Simplified - assumes 1 digit country code
    const number = cleaned.slice(2);
    
    if (countryCode === '1') {
      // North American format: +1 (XXX) XXX-XXXX
      const digits = number.replace(/\D/g, '');
      if (digits.length === 0) return '+1';
      if (digits.length <= 3) return `+1 (${digits}`;
      if (digits.length <= 6) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else {
      // Generic international format: +XX XXX XXX XXXX
      const digits = number.replace(/\D/g, '');
      if (digits.length === 0) return `+${countryCode}`;
      if (digits.length <= 3) return `+${countryCode} ${digits}`;
      if (digits.length <= 6) return `+${countryCode} ${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `+${countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    }
  }
  
  // US format without country code
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

// Phone number formatting utility with country code support
export const formatPhoneWithCountryCode = (value: string, countryCode: string): string => {
  // Remove all non-numeric characters
  const number = value.replace(/\D/g, '');
  
  // If empty, return with just country code prefix
  if (!number) return `+${countryCode}`;
  
  if (countryCode === '1') {
    // North American format: +1 (XXX) XXX-XXXX
    const digits = number.replace(/\D/g, '');
    if (digits.length === 0) return '+1';
    if (digits.length <= 3) return `+1 (${digits}`;
    if (digits.length <= 6) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  } else {
    // Generic international format: +XX XXX XXX XXXX
    const digits = number.replace(/\D/g, '');
    if (digits.length === 0) return `+${countryCode}`;
    if (digits.length <= 3) return `+${countryCode} ${digits}`;
    if (digits.length <= 6) return `+${countryCode} ${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `+${countryCode} ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }
};

// Mock Agencies - Previously used agencies in the system
export const MOCK_AGENCIES = [
  {
    id: "agency-001",
    name: "FBI - Federal Bureau of Investigation",
    phone: "+1 (202) 324-3000",
    address: {
      number: "935 Pennsylvania Avenue NW",
      city: "Washington",
      stateProvince: "DC",
      postalCode: "20535"
    },
    lastUsed: "2026-01-10"
  },
  {
    id: "agency-002",
    name: "NYPD - New York Police Department",
    phone: "+1 (646) 610-5000",
    address: {
      number: "1 Police Plaza",
      city: "New York",
      stateProvince: "NY",
      postalCode: "10038"
    },
    lastUsed: "2026-01-08"
  },
  {
    id: "agency-003",
    name: "LAPD - Los Angeles Police Department",
    phone: "+1 (213) 486-0150",
    address: {
      number: "100 W 1st Street",
      city: "Los Angeles",
      stateProvince: "CA",
      postalCode: "90012"
    },
    lastUsed: "2026-01-05"
  },
  {
    id: "agency-004",
    name: "DEA - Drug Enforcement Administration",
    phone: "+1 (202) 307-1000",
    address: {
      number: "8701 Morrissette Drive",
      city: "Springfield",
      stateProvince: "VA",
      postalCode: "22152"
    },
    lastUsed: "2025-12-28"
  },
  {
    id: "agency-005",
    name: "Chicago Police Department",
    phone: "+1 (312) 746-6000",
    address: {
      number: "3510 S Michigan Avenue",
      city: "Chicago",
      stateProvince: "IL",
      postalCode: "60653"
    },
    lastUsed: "2025-12-20"
  }
];

// Mock Contacts - Previously used contacts in the system
export const MOCK_CONTACTS = [
  {
    id: "contact-001",
    name: "Sarah Mitchell",
    title: "Supervisory Special Agent",
    email: "sarah.mitchell@fbi.gov",
    phone: "+1 (202) 324-5500",
    languages: "en - English, es - Spanish",
    role: "Affiant",
    agency: "FBI - Federal Bureau of Investigation",
    lastUsed: "2026-01-10"
  },
  {
    id: "contact-002",
    name: "Michael Chen",
    title: "Detective First Grade",
    email: "michael.chen@nypd.org",
    phone: "+1 (646) 610-7200",
    languages: "en - English, zh - Chinese",
    role: "Affiant",
    agency: "NYPD - New York Police Department",
    lastUsed: "2026-01-08"
  },
  {
    id: "contact-003",
    name: "Jessica Rodriguez",
    title: "Senior Lead Officer",
    email: "j.rodriguez@lapd.lacity.org",
    phone: "+1 (213) 486-8200",
    languages: "en - English, es - Spanish",
    role: "Case Officer",
    agency: "LAPD - Los Angeles Police Department",
    lastUsed: "2026-01-05"
  },
  {
    id: "contact-004",
    name: "David Kim",
    title: "Special Agent",
    email: "david.kim@dea.gov",
    phone: "+1 (202) 307-4500",
    languages: "en - English, ko - Korean",
    role: "Affiant",
    agency: "DEA - Drug Enforcement Administration",
    lastUsed: "2025-12-28"
  },
  {
    id: "contact-005",
    name: "Lisa Thompson",
    title: "Assistant District Attorney",
    email: "lisa.thompson@cookcountyil.gov",
    phone: "+1 (312) 603-8600",
    languages: "en - English",
    role: "Attorney",
    agency: "Cook County State's Attorney's Office",
    lastUsed: "2025-12-15"
  },
  {
    id: "contact-006",
    name: "Robert Johnson",
    title: "Sergeant",
    email: "r.johnson@chicagopolice.org",
    phone: "+1 (312) 746-8300",
    languages: "en - English",
    role: "Case Officer",
    agency: "Chicago Police Department",
    lastUsed: "2025-12-20"
  },
  {
    id: "contact-007",
    name: "Amanda Williams",
    title: "Special Agent in Charge",
    email: "amanda.williams@fbi.gov",
    phone: "+1 (202) 324-7800",
    languages: "en - English, fr - French",
    role: "Recipient",
    agency: "FBI - Federal Bureau of Investigation",
    lastUsed: "2026-01-21"
  }
];

// Internal Contacts - For case escalation
export const INTERNAL_CONTACTS = [
  {
    id: "internal-001",
    displayName: "Jennifer Adams",
    role: "Attorney"
  },
  {
    id: "internal-002",
    displayName: "David Thompson",
    role: "Attorney"
  },
  {
    id: "internal-003",
    displayName: "Maria Santos",
    role: "Country Contact"
  },
  {
    id: "internal-004",
    displayName: "John Park",
    role: "Country Contact"
  },
  {
    id: "internal-005",
    displayName: "Lisa Chen",
    role: "Country Contact"
  },
  {
    id: "internal-006",
    displayName: "Michael Brown",
    role: "Operations Manager"
  },
  {
    id: "internal-007",
    displayName: "Sarah Williams",
    role: "Operations Manager"
  },
  {
    id: "internal-008",
    displayName: "Robert Martinez",
    role: "Attorney"
  },
  {
    id: "internal-009",
    displayName: "Emily Davis",
    role: "Country Contact"
  },
  {
    id: "internal-010",
    displayName: "James Wilson",
    role: "Operations Manager"
  }
];