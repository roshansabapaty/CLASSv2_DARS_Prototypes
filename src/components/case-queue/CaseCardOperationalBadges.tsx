/**
 * CaseCardOperationalBadges — Row 1 of the redesigned queue card.
 *
 * Renders 4 categorized badge groups in a contained row:
 *   Cat 1: Urgency Signals (P-level + high-priority crimes + emergency request type)
 *   Cat 2: Identifier Count
 *   Cat 3: Services Requested (Azure prioritized with accent styling)
 *   Cat 4: Account Type (Enterprise only, post Check Accounts)
 *
 * Option C applied: P-badge is the primary accessible priority indicator.
 */

import { Badge } from "../ui/badge";
import {
  Shield,
  Users,
  Building2,
  AlertCircle,
  Cloud,
  Scale,
  MailWarning,
  Gavel,
} from "lucide-react";
import { cn } from "../ui/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { CaseQueueItem, PriorityConfig } from "./case-queue-types";
import { SERVICE_ICONS } from "./case-queue-types";
import {
  escalationBadgeLabelForCase,
  escalationBadgeTierForCase,
  getEscalationSummaryForCase,
  gfrQueueChipForCase,
} from "../../utils/escalationHelpers";
import { useCorrespondenceNotifications } from "../../hooks/useCorrespondenceNotifications";

interface CaseCardOperationalBadgesProps {
  caseItem: CaseQueueItem;
  priorityConfig: PriorityConfig;
  highPriorityCrimes: string[];
}

export function CaseCardOperationalBadges({
  caseItem,
  priorityConfig,
  highPriorityCrimes,
}: CaseCardOperationalBadgesProps) {
  const isEmergencyType =
    caseItem.requestType === "Emergency Request" ||
    caseItem.requestType === "Emergency Disclosure";

  // Sort services: Azure first when present
  const sortedServices = [...caseItem.servicesRequested].sort((a, b) => {
    if (a === "Azure") return -1;
    if (b === "Azure") return 1;
    return 0;
  });

  // Gap 1 — escalation context. The literal copy `<Role> Escalated`
  // (e.g. "Attorney Escalated") tells the RS why the case surfaced in
  // the Escalated quick filter without opening the case.
  const escalationLabel = escalationBadgeLabelForCase(caseItem.caseId);
  const escalationSummary = getEscalationSummaryForCase(caseItem.caseId);
  const escalationTier = escalationBadgeTierForCase(caseItem.caseId);
  // GFR chip — derived from the case's EEvidenceGroundsForRefusal block
  // via the registry. Self-suppresses for non-applicable workflows + for
  // `None` decisions on Form1Review (panel-only signal).
  const gfrChip = gfrQueueChipForCase(caseItem.caseId);
  // Gap 3 — correspondence awaiting attorney review. Combines held
  // outbounds + unread inbound on the active escalation. Single chip
  // covers both signals so the queue card doesn't bloat further.
  const { perCase } = useCorrespondenceNotifications();
  const corr = perCase.get(caseItem.caseId);
  const heldForAttorney = corr?.heldForAttorney ?? 0;
  const inboundAwaitingAttorney = corr?.inboundAwaitingAttorney ?? 0;
  const attorneyReviewTotal = heldForAttorney + inboundAwaitingAttorney;

  // Audit P0 #3 — hierarchy between Alert badges (legal-veto + urgency
  // signals the user must act on) and Property badges (case metadata
  // like identifier count + services). When any Alert is present on a
  // card, Property badges dim to opacity-60 so the eye lands on the
  // alerts first. Property badges remain readable for context, just
  // visually demoted. Alert badges also gain font-bold + slightly
  // heavier saturation than the previous outline treatment so they
  // read as the primary focal point at a glance.
  const isUrgentPriority =
    caseItem.casePriority === "Emergency" ||
    caseItem.casePriority === "Urgent";
  const hasAnyAlert =
    isUrgentPriority ||
    highPriorityCrimes.length > 0 ||
    isEmergencyType ||
    !!gfrChip ||
    !!escalationLabel ||
    attorneyReviewTotal > 0;
  const propertyDimClass = hasAnyAlert ? "opacity-60" : "";

  return (
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
                <div style={{ fontWeight: 600 }}>
                  {priorityConfig.label} Priority
                </div>
                <div className="text-slate-400 mt-0.5">
                  {caseItem.casePriority === "Emergency" &&
                    "2-3 hours response time"}
                  {caseItem.casePriority === "Urgent" &&
                    "3 days response time"}
                  {caseItem.casePriority === "Routine" &&
                    "10 days response time"}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {highPriorityCrimes.map((crime) => (
          <Badge
            key={crime}
            variant="outline"
            className="bg-red-100 text-red-800 border-red-400 border-[1.5px] text-xs shadow-sm cursor-default font-bold"
          >
            <Shield className="w-3 h-3 mr-1" />
            {crime}
          </Badge>
        ))}

        {isEmergencyType && (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-800 border-amber-400 border-[1.5px] text-xs cursor-default font-bold"
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            {caseItem.requestType}
          </Badge>
        )}
      </div>

      {/* Divider */}
      <span className="text-slate-200 text-sm select-none">|</span>

      {/* Cat 2: Identifier Count (property — dims when alerts present) */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "bg-indigo-50 text-indigo-700 border-indigo-200 text-xs cursor-help",
                propertyDimClass,
              )}
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
              {caseItem.identifierTypes &&
                Object.keys(caseItem.identifierTypes).length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-600/30 space-y-0.5">
                    {Object.entries(caseItem.identifierTypes).map(
                      ([type, count]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between gap-4"
                        >
                          <span className="text-slate-300 capitalize">
                            {type}
                          </span>
                          <span className="text-slate-100" style={{ fontWeight: 600 }}>
                            {count}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Divider */}
      <span className="text-slate-200 text-sm select-none">|</span>

      {/* Cat 3: Services Requested (Azure prioritized) — property, dims */}
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
                        : "bg-slate-50 text-slate-600 border-slate-200",
                      propertyDimClass,
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
                      {isAzure
                        ? "Azure Service (Priority)"
                        : `${service} Service`}
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

      {/* Cat 4: Account Type — Enterprise only (post Check Accounts) — property, dims */}
      {caseItem.accountExistenceChecked && caseItem.hasEnterpriseAccounts && (
        <>
          <span className="text-slate-200 text-sm select-none">|</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "bg-purple-50 text-purple-700 border-purple-300 text-xs cursor-help",
                    propertyDimClass,
                  )}
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


      {/* Cat 7: GFR — EA legal veto. Rendered BEFORE the attorney
          escalation chip so the highest-stakes signal reads first.
          Tier colours mirror EscalationChipMeta: alertRed for Full,
          warnAmber for Partial/lapsed/Form3-reject, infoSlateBlue for
          the pre-decision countdown. Suppressed for `None` Form1Review
          (the panel inside the case is enough). */}
      {gfrChip && (
        <>
          <span className="text-slate-200 text-sm select-none">|</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs cursor-help",
                    gfrChip.tier === "alertRed"
                      ? "bg-[#fde7e9] text-[#a4262c] border-[#a4262c]/40"
                      : gfrChip.tier === "warnAmber"
                        ? "bg-[#fff4e6] text-[#7a3a00] border-[#ca5010]/40"
                        : gfrChip.tier === "successGreen"
                          ? "bg-[#dff6dd] text-[#0b6a0b] border-[#107c10]/40"
                          : "bg-[#f3f0fa] text-[#5c2d91] border-[#8764b8]/40",
                  )}
                  style={{ fontWeight: 600 }}
                  aria-label={gfrChip.label}
                >
                  <Gavel className="w-3 h-3 mr-1" aria-hidden="true" />
                  {gfrChip.label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <div style={{ fontWeight: 600 }}>{gfrChip.label}</div>
                  <div className="text-slate-300">
                    EU eEvidence — Grounds for Refusal (ETSI 5.5)
                  </div>
                  <div className="text-slate-300">
                    Open the case for the EA's reasons + next steps.
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      {/* Cat 5: Escalation type — tells the RS at a glance why this
          case is in the Escalated quick filter. Hidden for non-
          escalated cases and for cases in terminal status (cleared). */}
      {escalationLabel && (
        <>
          <span className="text-slate-200 text-sm select-none">|</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs cursor-help",
                    // Per-tier styling drives the visual urgency of the
                    // escalation badge. Pull-model surfaces use this so
                    // RS / TS can scan the queue and find cases where
                    // the attorney has done something requiring them.
                    escalationTier === "blocked"
                      ? "bg-[#fde7e9] text-[#a4262c] border-[#a4262c]/40"
                      : escalationTier === "info-requested"
                        ? "bg-[#fff4ce] text-[#7a4f00] border-[#a26a00]/40"
                        : escalationTier === "redirect"
                          ? "bg-[#fff4e6] text-[#7a3a00] border-[#ca5010]/40"
                          : escalationTier === "reviewed"
                            // Audit P1 #7: was infoSlateBlue, which read
                            // as "FYI" rather than "needs your action."
                            // Saturated amber/orange signals the
                            // pickup-required state distinctly from
                            // info-requested (lighter amber) and
                            // redirect (lighter peach).
                            ? "bg-[#fcd5b5] text-[#7a3a00] border-[#ca5010]/60"
                            : escalationTier === "complete"
                              ? "bg-[#dff6dd] text-[#0b6a0b] border-[#107c10]/40"
                              : "bg-[#f3f0fa] text-[#5c2d91] border-[#8764b8]/40",
                  )}
                  style={{ fontWeight: 600 }}
                >
                  <Scale className="w-3 h-3 mr-1" aria-hidden="true" />
                  {escalationLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <div style={{ fontWeight: 600 }}>{escalationLabel}</div>
                  {escalationSummary && (
                    <>
                      <div className="text-slate-300">
                        Status: {escalationSummary.status}
                      </div>
                      <div className="text-slate-300">
                        Assignee: {escalationSummary.assigneeLabel}
                      </div>
                      <div className="text-slate-300">
                        Escalated by {escalationSummary.escalatedBy}
                      </div>
                    </>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}

      {/* Cat 6: Correspondence awaiting attorney review. Surfaces only
          on cases with an active escalation, so attorneys can spot
          which of their cases have new traffic to act on. */}
      {attorneyReviewTotal > 0 && escalationLabel && (
        <>
          <span className="text-slate-200 text-sm select-none">|</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="bg-[#fff4ce] text-[#7a4f00] border-[#a26a00]/40 text-xs cursor-help"
                  style={{ fontWeight: 600 }}
                  aria-label={`${attorneyReviewTotal} correspondence item${attorneyReviewTotal === 1 ? "" : "s"} awaiting attorney review`}
                >
                  <MailWarning className="w-3 h-3 mr-1" aria-hidden="true" />
                  {heldForAttorney > 0 && inboundAwaitingAttorney > 0
                    ? `${heldForAttorney} outbound · ${inboundAwaitingAttorney} inbound`
                    : heldForAttorney > 0
                      ? `${heldForAttorney} outbound awaiting review`
                      : `${inboundAwaitingAttorney} inbound awaiting review`}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  <div style={{ fontWeight: 600 }}>
                    Correspondence awaiting attorney review
                  </div>
                  {heldForAttorney > 0 && (
                    <div className="text-slate-300">
                      {heldForAttorney} outbound message
                      {heldForAttorney === 1 ? "" : "s"} held in Draft
                    </div>
                  )}
                  {inboundAwaitingAttorney > 0 && (
                    <div className="text-slate-300">
                      {inboundAwaitingAttorney} inbound item
                      {inboundAwaitingAttorney === 1 ? "" : "s"} unread on the
                      active escalation
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  );
}