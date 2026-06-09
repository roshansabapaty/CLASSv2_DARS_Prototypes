/**
 * Shared utilities for the unified case header system.
 * Used by CaseSummaryCard (legacy/queue) and the new StickyCaseHeader.
 */
import { AlertCircle, AlertTriangle, FileText, type LucideIcon } from "lucide-react";

// -- Priority ----------------------------------------------------------------

export interface PriorityConfig {
  label: string;
  level: string;
  color: string;
  badge: string;
  icon: LucideIcon;
}

export const HIGH_PRIORITY_CRIMES = [
  "Threat to Life",
  "Child Safety",
  "Terrorism",
  "Human Trafficking",
  "Kidnapping",
];

export function isHighPriorityCrime(crime: string): boolean {
  return HIGH_PRIORITY_CRIMES.includes(crime);
}

export function getPriorityConfig(priority: string): PriorityConfig {
  switch (priority) {
    case "Emergency":
      return {
        label: "Emergency - No Legal Demand",
        level: "P0",
        color: "border-l-red-500 border-l-8",
        badge: "bg-red-50 text-red-700 border-red-200",
        icon: AlertCircle,
      };
    case "Urgent":
      return {
        label: "Emergency - Legal Demand Attached",
        level: "P1",
        color: "border-l-orange-500 border-l-6",
        badge: "bg-orange-50 text-orange-700 border-orange-200",
        icon: AlertTriangle,
      };
    case "Expedite":
      return {
        label: "Expedite",
        level: "P2",
        color: "border-l-yellow-500 border-l-6",
        badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
        icon: AlertTriangle,
      };
    case "Standard":
      return {
        label: "Standard",
        level: "P3",
        color: "border-l-teal-500 border-l-4",
        badge: "bg-teal-50 text-teal-700 border-teal-200",
        icon: FileText,
      };
    default:
      return {
        label: "Routine",
        level: "P4",
        color: "border-l-blue-500 border-l-4",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        icon: FileText,
      };
  }
}

// -- Service names -----------------------------------------------------------

const SERVICE_NAMES: Record<string, string> = {
  outlook: "Outlook",
  teams: "Teams",
  azure: "Azure",
  consumerIPHistory: "IP History",
  msaServicesUtilized: "MSA",
  enterprise: "Enterprise",
  oneDriveSharePoint: "OneDrive/SP",
  oneDriveConsumer: "OneDrive",
  skype: "Skype",
  xbox: "Xbox",
};

export function formatServiceName(serviceKey: string): string {
  return SERVICE_NAMES[serviceKey] || serviceKey;
}

// -- Computed helpers --------------------------------------------------------

export function getServicesDisplay(identifiers: Array<{ services: Record<string, { enabled?: boolean }> }>): string {
  const uniqueServices = new Set<string>();
  identifiers.forEach((identifier) => {
    Object.entries(identifier.services).forEach(([serviceKey, service]) => {
      if (service.enabled) uniqueServices.add(serviceKey);
    });
  });
  return Array.from(uniqueServices).map(formatServiceName).join(", ") || "None";
}
