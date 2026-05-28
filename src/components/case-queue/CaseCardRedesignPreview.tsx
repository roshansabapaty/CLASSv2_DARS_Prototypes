/**
 * CaseCardRedesignPreview — Interactive preview of the proposed queue card
 * redesign with corrected category definitions.
 *
 * New layout:
 *   Title Header: Case ID (title) + Case Stage + Due Date
 *   Row 1 — Operational Badges (4 categories):
 *     Cat 1: Urgency Signals (P-level + high-priority crimes + emergency request type)
 *     Cat 2: Identifier Count
 *     Cat 3: Services Requested (Azure prioritized when present)
 *     Cat 4: Account Type (Enterprise only — Azure removed from this category)
 *   Row 2 — Case Properties (Option 2A labeled grid)
 *   Row 3 — Regular crime tags + metadata
 */

import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import {
  FileText,
  Shield,
  Clock,
  Send,
  Globe,
  User,
  Calendar,
  Building2,
  Users,
  Mail,
  MessageSquare,
  Cloud,
  HardDrive,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { CopyableText } from "../CopyButton";
import { cn } from "../ui/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

// ---------------------------------------------------------------------------
// Extended mock data with new fields
// ---------------------------------------------------------------------------

interface PreviewCaseItem {
  caseId: string;
  createDate: string;
  requestType: string;
  /** Sub-type within the request type — surfaced next to `requestType`
   *  in the preview card so EPOC-PR cases are visible at a glance. */
  requestSubType?: string;
  requestOrigin?: string;
  caseStage: string;
  country: string;
  jurisdiction: string;
  natureOfCrime: string[];
  isThreatToLife: boolean;
  casePriority: "Emergency" | "Urgent" | "Routine";
  dueDate: string;
  assigneeName: string;
  // New fields
  identifierCount: number;
  servicesRequested: string[];
  hasEnterpriseAccounts: boolean;
  accountExistenceChecked: boolean;
  escalatedToLE?: boolean;
}

const HIGH_PRIORITY_CRIMES = [
  "Threat to Life",
  "Child Safety",
  "Terrorism",
  "Human Trafficking",
  "Kidnapping",
];

const PREVIEW_CASES: PreviewCaseItem[] = [
  {
    caseId: "LNS-2025-00142",
    createDate: "Jan 19, 2025",
    requestType: "Emergency Request",
    requestOrigin: "LE Portal",
    caseStage: "Waiting on Triage",
    country: "United States",
    jurisdiction: "Federal",
    natureOfCrime: ["Threat to Life", "Kidnapping"],
    isThreatToLife: true,
    casePriority: "Emergency",
    dueDate: "Jan 20, 2025 2:00 PM",
    assigneeName: "",
    identifierCount: 3,
    servicesRequested: ["Outlook", "Teams", "Azure"],
    hasEnterpriseAccounts: false,
    accountExistenceChecked: false,
  },
  {
    caseId: "LNS-2025-00138",
    createDate: "Jan 18, 2025",
    requestType: "Emergency Disclosure",
    requestOrigin: "LE Portal",
    caseStage: "In Progress",
    country: "Canada",
    jurisdiction: "Provincial",
    natureOfCrime: ["Child Safety"],
    isThreatToLife: false,
    casePriority: "Emergency",
    dueDate: "Jan 21, 2025",
    assigneeName: "Nicole Garcia",
    identifierCount: 2,
    servicesRequested: ["Outlook", "OneDrive/SharePoint"],
    hasEnterpriseAccounts: true,
    accountExistenceChecked: true,
    escalatedToLE: true,
  },
  {
    caseId: "LNS-2025-00125",
    createDate: "Jan 15, 2025",
    requestType: "Preservation Request",
    requestOrigin: "Email forward",
    caseStage: "In Review",
    country: "United Kingdom",
    jurisdiction: "National",
    natureOfCrime: ["Fraud", "Identity Theft"],
    isThreatToLife: false,
    casePriority: "Routine",
    dueDate: "Jan 25, 2025",
    assigneeName: "Michael Chen",
    identifierCount: 1,
    servicesRequested: ["Outlook"],
    hasEnterpriseAccounts: true,
    accountExistenceChecked: true,
  },
  {
    caseId: "LNS-2025-00119",
    createDate: "Jan 14, 2025",
    requestType: "Emergency Request",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "Germany",
    jurisdiction: "Federal",
    natureOfCrime: ["Terrorism", "Threat to Life"],
    isThreatToLife: true,
    casePriority: "Emergency",
    dueDate: "Jan 14, 2025 6:00 PM",
    assigneeName: "",
    identifierCount: 5,
    servicesRequested: ["Outlook", "Teams", "Azure", "OneDrive/SharePoint"],
    hasEnterpriseAccounts: false,
    accountExistenceChecked: false,
  },
  {
    caseId: "LNS-2025-00151",
    createDate: "Jan 22, 2025",
    requestType: "Search Warrant",
    requestOrigin: "LEAPI",
    caseStage: "In Progress",
    country: "United States",
    jurisdiction: "Federal",
    natureOfCrime: ["Wire Fraud", "Conspiracy"],
    isThreatToLife: false,
    casePriority: "Urgent",
    dueDate: "Feb 5, 2025",
    assigneeName: "Nicole Garcia",
    identifierCount: 8,
    servicesRequested: ["Outlook", "Teams", "Azure", "OneDrive/SharePoint"],
    hasEnterpriseAccounts: true,
    accountExistenceChecked: true,
  },
];

// ---------------------------------------------------------------------------
// Service icon map
// ---------------------------------------------------------------------------

const SERVICE_ICONS: Record<string, typeof Mail> = {
  Outlook: Mail,
  Teams: MessageSquare,
  Azure: Cloud,
  "OneDrive/SharePoint": HardDrive,
};

// ---------------------------------------------------------------------------
// Priority config
// ---------------------------------------------------------------------------

function getPriorityConfig(priority: "Emergency" | "Urgent" | "Routine") {
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
    case "Routine":
      return {
        label: "Routine",
        level: "P2",
        color: "border-l-blue-500 border-l-4",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
        icon: FileText,
      };
  }
}

function isHighPriorityCrime(crime: string) {
  return HIGH_PRIORITY_CRIMES.includes(crime);
}

// ---------------------------------------------------------------------------
// Redesigned Card Component
// ---------------------------------------------------------------------------

function RedesignedCard({ caseItem }: { caseItem: PreviewCaseItem }) {
  const priorityConfig = getPriorityConfig(caseItem.casePriority);
  const highPriorityCrimes = caseItem.natureOfCrime.filter(isHighPriorityCrime);
  const regularCrimes = caseItem.natureOfCrime.filter((c) => !isHighPriorityCrime(c));
  const hasAzureService = caseItem.servicesRequested.includes("Azure");

  // Sort services: Azure first when present (priority treatment)
  const sortedServices = [...caseItem.servicesRequested].sort((a, b) => {
    if (a === "Azure") return -1;
    if (b === "Azure") return 1;
    return 0;
  });

  const isEmergencyType =
    caseItem.requestType === "Emergency Request" ||
    caseItem.requestType === "Emergency Disclosure";

  return (
    <Card
      className={cn(
        "p-0 overflow-hidden bg-white border-l-4 hover:shadow-lg transition-all duration-200",
        priorityConfig.color
      )}
    >
      <div className="p-4 space-y-3">
        {/* ── Title Header: Case ID + Stage + Due Date ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CopyableText text={caseItem.caseId} copyLabel="Copy case ID">
              <span className="font-mono text-base text-slate-900" style={{ fontWeight: 600 }}>
                {caseItem.caseId}
              </span>
            </CopyableText>

            {caseItem.escalatedToLE && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="bg-[#fde7e9] text-[#d13438] border-[#d13438] text-xs cursor-help"
                      style={{ fontWeight: 500 }}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Blocked by Issuing/Enforcing Authority
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs" style={{ fontWeight: 600 }}>
                      Case escalated to LE contact — awaiting response
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              variant="outline"
              className="text-xs px-2.5 py-0.5 bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
            >
              {caseItem.caseStage}
            </Badge>
            <span className="text-slate-400 text-xs">&bull;</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-600" style={{ fontWeight: 500 }}>
                {caseItem.dueDate}
              </span>
            </div>
          </div>
        </div>

        {/* ── Row 1 — Operational Signal Badges ── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2 px-3 bg-slate-50/80 rounded-md border border-slate-100">
          {/* Cat 1: Urgency Signals */}
          <div className="flex items-center gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-mono border-2 cursor-help",
                      priorityConfig.badge
                    )}
                    style={{ fontWeight: 700 }}
                  >
                    {priorityConfig.icon && (
                      <priorityConfig.icon className="w-3 h-3 mr-1" />
                    )}
                    {priorityConfig.level}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div style={{ fontWeight: 600 }}>{priorityConfig.label} Priority</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {highPriorityCrimes.map((crime) => (
              <Badge
                key={crime}
                variant="outline"
                className="bg-red-50 text-red-700 border-red-300 text-xs shadow-sm cursor-default"
                style={{ fontWeight: 600 }}
              >
                <Shield className="w-3 h-3 mr-1" />
                {crime}
              </Badge>
            ))}

            {isEmergencyType && (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-300 text-xs cursor-default"
                style={{ fontWeight: 600 }}
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                {caseItem.requestType}
              </Badge>
            )}
          </div>

          {/* Divider */}
          <span className="text-slate-200 text-sm select-none">|</span>

          {/* Cat 2: Identifier Count */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs cursor-help"
                  style={{ fontWeight: 500 }}
                >
                  <Users className="w-3 h-3 mr-1" />
                  {caseItem.identifierCount}{" "}
                  {caseItem.identifierCount === 1 ? "Identifier" : "Identifiers"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div style={{ fontWeight: 600 }}>Target Identifiers</div>
                  <div className="text-slate-400 mt-0.5">
                    {caseItem.identifierCount} identifier
                    {caseItem.identifierCount !== 1 ? "s" : ""} in this case
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Divider */}
          <span className="text-slate-200 text-sm select-none">|</span>

          {/* Cat 3: Services Requested (Azure prioritized) */}
          <div className="flex items-center gap-1">
            {sortedServices.map((service) => {
              const Icon = SERVICE_ICONS[service] || Cloud;
              const isAzure = service === "Azure";
              return (
                <TooltipProvider key={service}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs cursor-help",
                          isAzure
                            ? "bg-sky-50 text-sky-700 border-sky-300 ring-1 ring-sky-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        )}
                        style={{ fontWeight: isAzure ? 600 : 400 }}
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {service}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <div style={{ fontWeight: 600 }}>
                          {isAzure ? "Azure Service (Priority)" : `${service} Service`}
                        </div>
                        {isAzure && (
                          <div className="text-slate-400 mt-0.5">
                            Azure cases may require additional collection workflows
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {/* Cat 4: Account Type — Enterprise only (post Check Accounts) */}
          {caseItem.accountExistenceChecked && caseItem.hasEnterpriseAccounts && (
            <>
              <span className="text-slate-200 text-sm select-none">|</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="bg-purple-50 text-purple-700 border-purple-300 text-xs cursor-help"
                      style={{ fontWeight: 600 }}
                    >
                      <Building2 className="w-3 h-3 mr-1" />
                      Enterprise
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div style={{ fontWeight: 600 }}>Enterprise Account Type</div>
                      <div className="text-slate-400 mt-0.5">
                        Enterprise accounts discovered via Check Accounts action.
                        May require different collection workflows and approvals.
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>

        {/* ── Row 2 — Case Properties Grid (Option 2A) ── */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
              Request Type
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-slate-900" style={{ fontWeight: 500 }}>
                {caseItem.requestType}
                {caseItem.requestSubType &&
                  caseItem.requestSubType !== "None" && (
                    <>
                      {" / "}
                      <span className="text-slate-700">{caseItem.requestSubType}</span>
                    </>
                  )}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
              Country / Jurisdiction
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-slate-900" style={{ fontWeight: 500 }}>
                {caseItem.country}
                {caseItem.jurisdiction && (
                  <span className="text-slate-500" style={{ fontWeight: 400 }}>
                    {" "}
                    &mdash; {caseItem.jurisdiction}
                  </span>
                )}
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
                className={`text-sm ${
                  caseItem.assigneeName
                    ? "text-slate-900"
                    : "text-slate-400 italic"
                }`}
                style={{ fontWeight: caseItem.assigneeName ? 500 : 400 }}
              >
                {caseItem.assigneeName || "Unassigned"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Row 3 — Regular Crime Tags + Metadata ── */}
        {(regularCrimes.length > 0 || caseItem.requestOrigin || caseItem.createDate) && (
          <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              {regularCrimes.map((crime) => (
                <Badge
                  key={crime}
                  variant="outline"
                  className="text-xs bg-slate-50 text-slate-700 border-slate-200"
                >
                  {crime}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{caseItem.createDate}</span>
              </div>
              {caseItem.requestOrigin && (
                <Badge
                  variant="outline"
                  className="bg-slate-50 text-slate-600 border-slate-200 text-xs"
                >
                  {caseItem.requestOrigin}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Preview Page
// ---------------------------------------------------------------------------

interface CaseCardRedesignPreviewProps {
  onClose?: () => void;
}

export function CaseCardRedesignPreview({ onClose }: CaseCardRedesignPreviewProps) {
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-slate-900 mb-1">Queue Card Redesign Preview</h1>
              <p className="text-sm text-slate-600">
                Proposed information density rebalance with corrected category definitions
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 rounded-md p-2.5 border border-slate-200">
              <div className="text-slate-900 mb-1" style={{ fontWeight: 600 }}>
                Cat 1 — Urgency Signals
              </div>
              <div className="text-slate-500">
                P-level + high-priority crimes + emergency request type
              </div>
            </div>
            <div className="bg-indigo-50 rounded-md p-2.5 border border-indigo-200">
              <div className="text-indigo-900 mb-1" style={{ fontWeight: 600 }}>
                Cat 2 — Identifier Count
              </div>
              <div className="text-indigo-600">
                Number of target identifiers in the case
              </div>
            </div>
            <div className="bg-sky-50 rounded-md p-2.5 border border-sky-200">
              <div className="text-sky-900 mb-1" style={{ fontWeight: 600 }}>
                Cat 3 — Services Requested
              </div>
              <div className="text-sky-600">
                Azure prioritized with accent styling when present
              </div>
            </div>
            <div className="bg-purple-50 rounded-md p-2.5 border border-purple-200">
              <div className="text-purple-900 mb-1" style={{ fontWeight: 600 }}>
                Cat 4 — Account Type
              </div>
              <div className="text-purple-600">
                Enterprise only (from Check Accounts). Azure removed.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto space-y-4">
        {PREVIEW_CASES.map((caseItem) => (
          <RedesignedCard key={caseItem.caseId} caseItem={caseItem} />
        ))}
      </div>

      {/* Annotation */}
      <div className="max-w-5xl mx-auto mt-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-sm text-slate-700 space-y-3">
          <h2 className="text-slate-900">Key Changes from Current Layout</h2>
          <ul className="space-y-2 text-slate-600 list-disc pl-5">
            <li>
              <span style={{ fontWeight: 600 }}>Case ID elevated to title header</span> — no longer
              competes with badges for attention in the same row
            </li>
            <li>
              <span style={{ fontWeight: 600 }}>New operational badge row</span> — 4 categorized
              badge groups separated by pipe dividers, only rendering when data exists
            </li>
            <li>
              <span style={{ fontWeight: 600 }}>Azure removed from Account Type</span> — Azure is
              now exclusively a service in Cat 3 with priority styling (sky-blue accent + ring)
            </li>
            <li>
              <span style={{ fontWeight: 600 }}>Enterprise badge (Cat 4)</span> — only appears
              after Check Accounts completes, now styled in purple to differentiate from services
            </li>
            <li>
              <span style={{ fontWeight: 600 }}>Identifier Count (Cat 2)</span> — new signal showing
              case scope at a glance, previously invisible at the queue level
            </li>
            <li>
              <span style={{ fontWeight: 600 }}>Services Requested (Cat 3)</span> — surfaces what
              data systems are involved without opening the case. Azure renders first with accent.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
