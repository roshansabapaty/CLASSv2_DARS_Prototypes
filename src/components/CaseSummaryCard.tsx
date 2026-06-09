import React from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  User,
  Calendar,
  FileText,
  AlertCircle,
  AlertTriangle,
  Shield,
  Clock,
  Globe,
  Database,
  Send,
  ShieldCheck,
  Fingerprint,
  Scale,
  Building2,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "./ui/utils";
import { CopyableText } from "./CopyButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import type { FormData } from "../types/caseTypes";

interface CaseSummaryCardProps {
  formData: FormData;
}

// -- Helpers ----------------------------------------------------------------

const HIGH_PRIORITY_CRIMES = [
  "Threat to Life",
  "Child Safety",
  "Terrorism",
  "Human Trafficking",
  "Kidnapping",
];

function isHighPriorityCrime(crime: string): boolean {
  return HIGH_PRIORITY_CRIMES.includes(crime);
}

function getPriorityConfig(priority: string) {
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

const formatServiceName = (serviceKey: string): string => {
  const serviceNames: Record<string, string> = {
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
  return serviceNames[serviceKey] || serviceKey;
};

function getAuthStatusStyle(status: string) {
  switch (status) {
    case "Approved":
      return "bg-green-50 text-green-700 border-green-300";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-300";
    case "Cancelled":
      return "bg-slate-100 text-slate-600 border-slate-300";
    case "Suspended":
      return "bg-yellow-50 text-yellow-700 border-yellow-300";
    case "Expired":
    case "Invalid":
      return "bg-red-50 text-red-600 border-red-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

// -- Main component ---------------------------------------------------------

export function CaseSummaryCard({ formData }: CaseSummaryCardProps) {
  const priorityConfig = getPriorityConfig(formData.casePriority);
  const highPriorityCrimes = formData.natureOfCrimes.filter(isHighPriorityCrime);
  const regularCrimes = formData.natureOfCrimes.filter((c) => !isHighPriorityCrime(c));

  const totalIdentifiers = formData.identifiers.length;
  const uniqueServices = new Set<string>();
  formData.identifiers.forEach((identifier) => {
    Object.entries(identifier.services).forEach(([serviceKey, service]) => {
      if (service.enabled) uniqueServices.add(serviceKey);
    });
  });
  const servicesDisplay =
    Array.from(uniqueServices).map(formatServiceName).join(", ") || "None";

  return (
    <Card
      className={cn(
        "p-0 overflow-hidden bg-white border-l-4",
        priorityConfig.color
      )}
    >
      <div className="p-4">
        <div className="space-y-3">
          {/* Row 1: Header — Case ID + Priority + Crime badges + Status + Due */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <CopyableText
                text={formData.caseNumber || formData.caseId || "—"}
                copyLabel="Copy case number"
              >
                <span className="font-mono font-semibold text-slate-900">
                  {formData.caseNumber || formData.caseId || "—"}
                </span>
              </CopyableText>

              {/* Priority Level */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-bold cursor-help font-mono border-2",
                        priorityConfig.badge
                      )}
                    >
                      {priorityConfig.icon && (
                        <priorityConfig.icon className="w-3 h-3 mr-1" />
                      )}
                      {priorityConfig.level}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-semibold">
                        {priorityConfig.label} Priority
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* High Priority Crime Badges */}
              {highPriorityCrimes.map((crime, index) => (
                <Badge
                  key={`hp-crime-${index}`}
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-300 text-xs font-semibold shadow-sm"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {crime}
                </Badge>
              ))}

              {/* Blocked by Issuing/Enforcing Authority */}
              {formData.agents?.some((agent) => agent.escalatedToLE) && (
                <Badge
                  variant="outline"
                  className="bg-[#fde7e9] text-[#d13438] border-[#d13438] text-xs font-medium"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Blocked by Issuing/Enforcing Authority
                </Badge>
              )}

              {/* Legacy "Internal Escalation" badge dropped — see
                  WorkflowStageBanner's structured escalation chip. */}
            </div>

            {/* Right: Status + Due Date */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                variant="outline"
                className="text-xs px-2.5 py-0.5 bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
              >
                {formData.caseStage}
              </Badge>
              <span className="text-slate-400 text-xs">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-xs font-medium text-slate-600">
                  Due Date: {formData.dueDate
                    ? format(formData.dueDate, "MMM d, yyyy")
                    : "No due date"}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Primary Properties — 4 column grid */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Request Type
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-slate-900 text-sm">
                  {formData.requestType || "Not specified"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Country
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-slate-900 text-sm">
                  {formData.country || "Not specified"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Assigned To
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span
                  className={cn(
                    "text-sm",
                    formData.assigneeName
                      ? "font-medium text-slate-900"
                      : "text-slate-400 italic"
                  )}
                >
                  {formData.assigneeName || "Unassigned"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Jurisdiction
              </div>
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-slate-900 text-sm">
                  {formData.jurisdiction || "Not specified"}
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Extended Properties — 4 column grid */}
          <div className="grid grid-cols-4 gap-4 pt-2.5 border-t border-slate-100">
            <div>
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Agency
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-slate-900 text-sm truncate">
                  {formData.agency || "Not specified"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Request Origin
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-slate-900 text-sm">
                  {formData.requestOrigin || "Not specified"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Identifiers
              </div>
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="font-medium text-slate-900 text-sm cursor-help">
                        {totalIdentifiers}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start">
                      <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                        <div className="font-semibold mb-1">Target Identifiers ({totalIdentifiers})</div>
                        {formData.identifiers.map((id, i) => (
                          <div key={i} className="text-slate-300">
                            {id.identifier || `Identifier ${i + 1}`}
                          </div>
                        ))}
                        {totalIdentifiers === 0 && (
                          <div className="text-slate-400 italic">No identifiers</div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Auth. Desired Status
              </div>
              <div className="flex items-center gap-2">
                {formData.authorizationDesiredStatus ? (
                  <Badge
                    variant="outline"
                    className="text-xs font-medium bg-slate-50 text-slate-700 border-slate-300"
                  >
                    {formData.authorizationDesiredStatus}
                  </Badge>
                ) : (
                  <span className="text-sm text-slate-400 italic">Not set</span>
                )}
              </div>
            </div>
          </div>

          {/* Row 4: Services */}
          <div className="grid grid-cols-4 gap-4 pt-2.5 border-t border-slate-100">
            <div className="col-span-2">
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Services
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="font-medium text-slate-900 text-sm truncate">
                  {servicesDisplay}
                </span>
              </div>
            </div>
            {formData.mlat && (
              <div>
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                  MLAT
                </div>
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-300 text-xs font-medium"
                >
                  MLAT Required
                </Badge>
              </div>
            )}
            {formData.createDate && (
              <div>
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                  Created
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {format(formData.createDate, "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Row 5: Nature of Crimes + Authorization Dates */}
          <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              {regularCrimes.length > 0 ? (
                regularCrimes.map((crime, index) => (
                  <Badge
                    key={`crime-${index}`}
                    variant="outline"
                    className="text-xs bg-slate-50 text-slate-700 border-slate-200"
                  >
                    {crime}
                  </Badge>
                ))
              ) : highPriorityCrimes.length > 0 ? (
                <span className="text-xs text-slate-500 italic">
                  See critical crime badges above
                </span>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  No nature of crimes specified
                </span>
              )}
            </div>

            {/* Authorization date range */}
            <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-shrink-0">
              {formData.authorizationStartDate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 cursor-help">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>
                          Auth: {format(formData.authorizationStartDate, "MMM d, yyyy")}
                          {formData.authorizationExpirationDate &&
                            ` – ${format(formData.authorizationExpirationDate, "MMM d, yyyy")}`}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-semibold">
                        Authorization Period
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {formData.requestOrigin && (
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-600 border-slate-200 text-xs"
                >
                  {formData.requestOrigin}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}