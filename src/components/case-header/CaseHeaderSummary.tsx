/**
 * CaseHeaderSummary — The merged case info rows for the unified header.
 * Primary row: Case ID, priority, crime badges, status, due date
 * Properties row: 4-col grid with stacked label/value pairs (matches CaseSummaryCard styling)
 * Extended row (collapsible): Additional details in grid layout
 */
import React, { useState } from "react";
import {
  FileText,
  Shield,
  Send,
  AlertTriangle,
  Globe,
  User,
  Scale,
  Building2,
  MapPin,
  Fingerprint,
  Database,
  Calendar,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  CheckCircle2,
  Building,
  Ban,
  PanelRightClose,
  Mail,
  Pause,
  Play,
} from "lucide-react";
import { unreadInboxCount } from "../correspondence/correspondenceEngine";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";
import { CopyableText } from "../CopyButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { format } from "date-fns";
import type { FormData } from "../../types/caseTypes";
import {
  getPriorityConfig,
  isHighPriorityCrime,
  getServicesDisplay,
} from "./caseHeaderUtils";
import { CancellationBadge } from "../cancellation/CancellationBadge";
import { SlaDeadlineChip } from "../sla/SlaDeadlineChip";
import { RetentionClockChip } from "../sla/RetentionClockChip";

interface CaseHeaderSummaryProps {
  formData: FormData;
  onOpenCancellationWorkflow?: () => void;
  cancellationAllStepsComplete?: boolean;
  documentPanelOpen?: boolean;
  onToggleDocumentPanel?: () => void;
  identifierPanelOpen?: boolean;
  onToggleIdentifierPanel?: () => void;
  workflowStage?: "triage" | "fulfillment" | "collection";
  /** Toggle the SLA pause state. When undefined, the toggle button is
   *  hidden (read-only header). */
  onToggleSlaPause?: () => void;
}

export function CaseHeaderSummary({ formData, onOpenCancellationWorkflow, cancellationAllStepsComplete, documentPanelOpen, onToggleDocumentPanel, identifierPanelOpen, onToggleIdentifierPanel, workflowStage, onToggleSlaPause }: CaseHeaderSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const priorityConfig = getPriorityConfig(formData.casePriority);
  const highPriorityCrimes = formData.natureOfCrimes.filter(isHighPriorityCrime);
  const regularCrimes = formData.natureOfCrimes.filter((c) => !isHighPriorityCrime(c));
  const totalIdentifiers = formData.identifiers.length;
  const servicesDisplay = getServicesDisplay(formData.identifiers);

  // Determine which identifiers have enterprise accounts
  const hasEnterpriseAccounts = formData.identifiers.some((identifier) =>
    Object.values(identifier.services).some(
      (service: any) => service.accountExistence?.enterpriseExists
    )
  );
  const identifierEnterpriseMap = formData.identifiers.map((identifier) =>
    Object.values(identifier.services).some(
      (service: any) => service.accountExistence?.enterpriseExists
    )
  );

  // NDO expiration computation
  const ndosWithExpiration = (formData.nonDisclosureOrders || []).filter(
    (ndo: any) => ndo.expirationDate
  );
  let ndoInfo: {
    expDate: Date;
    daysUntilExpiry: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
    count: number;
    name: string;
  } | null = null;
  if (ndosWithExpiration.length > 0) {
    const earliestNdo = ndosWithExpiration.reduce((earliest: any, current: any) => {
      return new Date(current.expirationDate!) < new Date(earliest.expirationDate!)
        ? current
        : earliest;
    });
    const expDate = new Date(earliestNdo.expirationDate!);
    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    ndoInfo = {
      expDate,
      daysUntilExpiry,
      isExpired: daysUntilExpiry < 0,
      isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 7,
      count: ndosWithExpiration.length,
      name: earliestNdo.name || "NDO",
    };
  }

  return (
    <div className="px-4 py-2 space-y-2">
      {/* Row 1: Case ID + Priority + Crime badges + Status + Due */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Legacy "Internal Escalation" badge dropped — the
              structured attorney escalation chip (rendered by
              WorkflowStageBanner via `currentEscalationChip(formData)`)
              now carries that signal. */}

          {/* NDO Expiration */}
          {ndoInfo && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs cursor-help",
                      ndoInfo.isExpired
                        ? "bg-[#fde7e9] text-[#d13438] border-[#d13438]"
                        : ndoInfo.isExpiringSoon
                          ? "bg-[#fff4ce] text-[#835c00] border-[#c19c00]"
                          : "bg-[#e8f4fd] text-[#0078d4] border-[#0078d4]"
                    )}
                  >
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    NDO Exp:{" "}
                    {ndoInfo.expDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-semibold mb-1">
                      NDO Expiration
                      {ndoInfo.count > 1 ? ` (${ndoInfo.count} active NDOs)` : ""}
                    </p>
                    <p>
                      {ndoInfo.name}:{" "}
                      {ndoInfo.expDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="mt-1">
                      {ndoInfo.isExpired
                        ? `Expired ${Math.abs(ndoInfo.daysUntilExpiry)} day${Math.abs(ndoInfo.daysUntilExpiry) !== 1 ? "s" : ""} ago`
                        : `${ndoInfo.daysUntilExpiry} day${ndoInfo.daysUntilExpiry !== 1 ? "s" : ""} remaining`}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Right: Status + Due Date + Expand toggle */}
        <div className="flex items-center gap-2.5 flex-1">
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-mono px-2.5 py-0.5",
              priorityConfig.color === "red"
                ? "bg-red-50 text-red-700 border-red-300"
                : priorityConfig.color === "orange"
                  ? "bg-orange-50 text-orange-700 border-orange-300"
                  : priorityConfig.color === "yellow"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                    : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
            )}
          >
            {priorityConfig.icon && (
              <priorityConfig.icon className="w-3 h-3 mr-1" />
            )}
            {priorityConfig.level}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-xs px-2.5 py-0.5",
              formData.caseStage === "Resolved"
                ? "bg-[#dff6dd] text-[#107c10] border-[#107c10]"
                : formData.caseStage === "Cancelled"
                  ? "bg-[#fde7e9] text-[#a4262c] border-[#d13438]"
                  : "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
            )}
          >
            {formData.caseStage === "Resolved" && (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            )}
            {formData.caseStage === "Cancelled" && (
              <Ban className="w-3 h-3 mr-1" />
            )}
            <span className="text-slate-400 mr-1">Status:</span>
            {formData.caseStage || "Not started"}
          </Badge>

          {/* Authorization Cancellation Badge */}
          {formData.authorizationDesiredStatus === "Cancelled" && (
            <CancellationBadge
              onClick={onOpenCancellationWorkflow}
              allStepsComplete={cancellationAllStepsComplete}
            />
          )}

          {/* Phase 5c.5: passive chip showing the case-level
           *  Cancelled / Withdrawn acknowledgment state. Renders as a sibling
           *  to CancellationBadge so the status is visible from any
           *  workflow stage (Triage, Fulfillment, Collection). */}
          {(formData.authorizationDesiredStatus === "Cancelled" ||
            formData.authorizationDesiredStatus === "Withdrawn") &&
            formData.authorizationStatusAcknowledgedAt && (
              <Badge
                variant="outline"
                className="text-xs px-2.5 py-0.5 bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
                title={`Acknowledged ${format(
                  new Date(formData.authorizationStatusAcknowledgedAt),
                  "MMM d, yyyy"
                )}${
                  formData.authorizationStatusAcknowledgedBy
                    ? " by " + formData.authorizationStatusAcknowledgedBy
                    : ""
                }`}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {formData.authorizationDesiredStatus} — acknowledged
              </Badge>
          )}

          {/* Phase 2: unread inbound correspondence chip. Reads directly from
              the case's FormData.correspondence (no cross-case hook needed
              here — we already have the active case in scope). */}
          {(() => {
            const unread = unreadInboxCount(formData.correspondence);
            if (unread === 0) return null;
            return (
              <Badge
                variant="outline"
                className="text-xs px-2.5 py-0.5 bg-[#deecf9] text-[#0078d4] border-[#0078d4]"
                title={`${unread} unread inbound message${unread === 1 ? "" : "s"} from the issuing or enforcing authority`}
              >
                <Mail className="w-3 h-3 mr-1" />
                {unread} unread
              </Badge>
            );
          })()}

          <span className="text-slate-400 text-xs">•</span>
          {/* SLA Deadline chip — replaces the plain due-date label. Live-ticks
              once a minute and flips colour as the case approaches/exceeds SLA. */}
          <SlaDeadlineChip
            tier={formData.casePriority}
            dueDate={formData.dueDate}
            dateReceived={formData.dateReceived ?? formData.createDate}
            paused={!!formData.slaPausedAt}
            requestType={formData.requestType}
            eevidenceWorkflow={formData.eevidenceWorkflow}
          />
          {/* Retention clock chip — renders only when a terminal event
              (EndPreservation / Full GFR / Form 3 / Withdrawal / Delivered)
              has opened the 45-day retention window. */}
          <RetentionClockChip formData={formData} />
          {onToggleSlaPause && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleSlaPause}
                  aria-label={
                    formData.slaPausedAt
                      ? "Resume SLA timer"
                      : "Pause SLA timer"
                  }
                  className={cn(
                    "inline-flex items-center justify-center h-6 w-6 rounded-md border transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                    formData.slaPausedAt
                      ? "border-[#107c10]/40 bg-[#f3faf2] text-[#107c10] hover:bg-[#dff6dd]"
                      : "border-[#605e5c]/30 bg-white text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]",
                  )}
                >
                  {formData.slaPausedAt ? (
                    <Play className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <Pause className="w-3 h-3" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {formData.slaPausedAt
                  ? "Resume the SLA countdown — the case will restart against its intended due date."
                  : "Pause the SLA countdown — record a hold without losing the intended due date."}
              </TooltipContent>
            </Tooltip>
          )}
          {/* Panel Toggle Buttons */}
          <div className="ml-auto flex items-center gap-2.5">
          {onToggleDocumentPanel && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleDocumentPanel}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs transition-all duration-200 border",
                    documentPanelOpen
                      ? "bg-[#e8f4fd] border-[#0078d4] border-l-2 text-[#0078d4] hover:bg-[#d6ecf9]"
                      : "bg-white border-[#e1dfdd] text-[#323130] hover:border-[#0078d4] hover:text-[#0078d4] hover:bg-[#f3f9ff]"
                  )}
                  aria-label={documentPanelOpen ? "Close document panel" : "Open document panel (Alt+D)"}
                  aria-pressed={documentPanelOpen}
                >
                  {documentPanelOpen ? (
                    <PanelRightClose className="w-3.5 h-3.5" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {documentPanelOpen ? "Close Docs" : "Open Docs"}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {documentPanelOpen ? "Close document panel" : "Open document panel"}{" "}
                  <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono">Alt+D</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {/* Open IDs button — surfaced on every case stage where a
              toggle handler is wired (Triage + Review Case). The
              previous `workflowStage === "fulfillment"` gate hid it on
              Triage even though the parent (DataEntryForm) was passing
              the handler. Collection mounts its own identifier surface
              and doesn't pass a handler, so the `onToggleIdentifierPanel`
              guard still suppresses the button there. */}
          {onToggleIdentifierPanel && workflowStage !== "collection" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggleIdentifierPanel}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs transition-all duration-200 border",
                    identifierPanelOpen
                      ? "bg-[#f3eefa] border-[#8764b8] border-l-2 text-[#8764b8] hover:bg-[#ebe0f5]"
                      : "bg-white border-[#e1dfdd] text-[#323130] hover:border-[#8764b8] hover:text-[#8764b8] hover:bg-[#f9f5ff]"
                  )}
                  aria-label={identifierPanelOpen ? "Close fulfillment wizard" : "Open fulfillment wizard (Alt+I)"}
                  aria-pressed={identifierPanelOpen}
                >
                  {identifierPanelOpen ? (
                    <PanelRightClose className="w-3.5 h-3.5" />
                  ) : (
                    <Fingerprint className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {identifierPanelOpen ? "Close IDs" : "Open IDs"}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {identifierPanelOpen ? "Close fulfillment wizard" : "Open fulfillment wizard"}{" "}
                  <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono">Alt+I</kbd>
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          {/* "Full details" popover trigger removed — the inline expand
              chevron next to this slot already reveals the extended
              summary row, which covers the "show me more about this
              case" need without an overlay dialog. */}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="ml-1 inline-flex items-center justify-center w-7 h-7 text-[#605e5c] hover:text-[#323130] hover:bg-[#f3f2f1] rounded-md transition-colors"
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Row 2: Primary Properties — 4-column grid with stacked label/value */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryField
          icon={FileText}
          label="Request Type"
          value={formData.requestType || "Not specified"}
        />
        <SummaryField
          icon={Globe}
          label="Country"
          value={formData.country || "Not specified"}
        />
        <SummaryField
          icon={Scale}
          label="Jurisdiction"
          value={formData.jurisdiction || "Not specified"}
        />
        <SummaryField
          icon={Building2}
          label="Agency"
          value={formData.agency || "Not specified"}
        />
      </div>

      {/* Row 3+: Extended details (collapsible) */}
      {expanded && (
        <div className="space-y-3 animate-in slide-in-from-top-1 duration-150">
          {/* Extended Properties Grid */}
          <div className="grid grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <SummaryField
              icon={MapPin}
              label="Request Origin"
              value={formData.requestOrigin || "Not specified"}
            />
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
                        <div className="font-semibold mb-1">
                          Target Identifiers ({totalIdentifiers})
                        </div>
                        {formData.identifiers.map((id, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-slate-300">
                            <span>{id.identifier || `Identifier ${i + 1}`}</span>
                            {identifierEnterpriseMap[i] && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[10px] font-semibold">
                                <Building className="w-2.5 h-2.5" />
                                Enterprise
                              </span>
                            )}
                          </div>
                        ))}
                        {totalIdentifiers === 0 && (
                          <div className="text-slate-400 italic">
                            No identifiers
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {hasEnterpriseAccounts && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold bg-orange-50 text-orange-700 border-orange-300 px-1.5 py-0"
                  >
                    <Building className="w-3 h-3 mr-0.5" />
                    Enterprise
                  </Badge>
                )}
              </div>
            </div>
            <div>
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

          {/* MLAT + Nature of Crimes + Created + Authorization Duration */}
          <div className="grid grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            <div>
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                Nature of Crimes
              </div>
              <div className="flex items-center gap-1.5">
                {regularCrimes.length > 0 ? (
                  <span className="font-medium text-slate-900 text-sm">
                    {regularCrimes.join(", ")}
                  </span>
                ) : highPriorityCrimes.length > 0 ? (
                  <span className="text-xs text-slate-500 italic">
                    See critical badges above
                  </span>
                ) : (
                  <span className="text-sm text-slate-400 italic">
                    Not specified
                  </span>
                )}
              </div>
            </div>
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
            {formData.authorizationStartDate && (
              <div>
                <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
                  Authorization Duration
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {format(formData.authorizationStartDate, "MMM d, yyyy")}
                    {formData.authorizationExpirationDate &&
                      ` – ${format(formData.authorizationExpirationDate, "MMM d, yyyy")}`}
                  </span>
                </div>
              </div>
            )}
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
          </div>

          {/* Investigators */}
          {formData.investigators && formData.investigators.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <User className="w-3 h-3 text-slate-400" />
                <span>
                  Investigator{formData.investigators.length > 1 ? "s" : ""}:{" "}
                  {formData.investigators.length === 1
                    ? formData.investigators[0].name
                    : `${formData.investigators[0].name} +${formData.investigators.length - 1} more`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -- Sub-component -----------------------------------------------------------

function SummaryField({
  icon: Icon,
  label,
  value,
  muted = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <span
          className={cn(
            "text-sm",
            muted ? "text-slate-400 italic" : "font-medium text-slate-900"
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}