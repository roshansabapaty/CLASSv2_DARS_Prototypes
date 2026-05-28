/**
 * CaseCardDetails — Rows 2 & 3 of the queue card.
 *
 * Row 2: Property grid (Request Type, Country/Jurisdiction merged, Assigned To)
 * Row 3: Regular crime badges + account existence indicators | Create Date + Origin
 *
 * Option A cleanup applied:
 * - Merged Country + Jurisdiction into a single cell
 * - Removed duplicate Case Origin from the property grid (kept in metadata row)
 * - Removed "See critical crime badges above" placeholder text
 * - Removed unrelated requestOrigin from Country tooltip
 */

import { Badge } from "../ui/badge";
import {
  FileText,
  Globe,
  Calendar,
  Building2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { CaseQueueItem } from "./case-queue-types";
import { AssigneeChip } from "../assignee/AssigneeChip";
import {
  CURRENT_USER,
  RESPONSE_SPECIALISTS,
} from "../../constants/caseConstants";

interface CaseCardDetailsProps {
  caseItem: CaseQueueItem;
  regularCrimes: string[];
  /** Reassign the case shown in this row. When omitted, the assignee is
   *  rendered as a read-only chip (no popover). */
  onReassign?: (caseId: string, nextAssignee: string) => void;
}

export function CaseCardDetails({
  caseItem,
  regularCrimes,
  onReassign,
}: CaseCardDetailsProps) {
  return (
    <>
      {/* Row 2 — Property Grid (Option A: 3 cols, no duplicates).
          Collapses to a single column on narrow viewports so the labels
          + values don't smash together on tablet portrait / split-screen. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
            Request Type
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-medium text-slate-900 text-sm cursor-help">
                    {caseItem.requestType}
                    {caseItem.requestSubType &&
                      caseItem.requestSubType !== "None" && (
                        <>
                          {" / "}
                          <span className="text-slate-700">{caseItem.requestSubType}</span>
                        </>
                      )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">Request Type</div>
                    {caseItem.requestSubType &&
                      caseItem.requestSubType !== "None" && (
                        <div className="text-slate-500 mt-0.5">
                          Sub-type: {caseItem.requestSubType}
                        </div>
                      )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Country + Jurisdiction merged */}
        <div>
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
            Country / Jurisdiction
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="font-medium text-slate-900 text-sm cursor-help">
                    {caseItem.country}
                    {caseItem.jurisdiction && (
                      <span className="text-slate-500 font-normal">
                        {" "}
                        &mdash; {caseItem.jurisdiction}
                      </span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs">
                    <div className="font-semibold">{caseItem.country}</div>
                    <div className="text-slate-400 mt-0.5">
                      Jurisdiction: {caseItem.jurisdiction}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide">
            Assigned To
          </div>
          {/* Click + key events on the chip must NOT bubble to the parent
              card's onClick (which opens the case). Wrap in a div that stops
              propagation so the popover stays open and the row stays put. */}
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <AssigneeChip
              value={caseItem.assigneeName}
              onChange={(next) => onReassign?.(caseItem.caseId, next)}
              specialists={RESPONSE_SPECIALISTS}
              currentUser={CURRENT_USER}
              caseId={caseItem.caseId}
              variant="inline"
              readOnly={!onReassign}
            />
          </div>
        </div>
      </div>

      {/* Row 3 — Crime tags + Account badges | Metadata */}
      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-slate-100">
        {/* Left: regular crime badges + account indicators */}
        <div className="flex flex-wrap items-center gap-1.5">
          {regularCrimes.length > 0 &&
            regularCrimes.map((crime, index) => (
              <TooltipProvider key={`regular-crime-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="text-xs cursor-help bg-slate-50 text-slate-700 border-slate-200"
                    >
                      {crime}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <div className="font-semibold">Nature of Crime</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}

          {/* Account Type: Enterprise only (from Check Accounts action) */}
          {caseItem.accountExistenceChecked &&
            caseItem.hasEnterpriseAccounts && (
            <>
              {regularCrimes.length > 0 && (
                <span className="text-slate-300 mx-1">|</span>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="bg-purple-50 text-purple-700 border-purple-300 text-xs"
                      style={{ fontWeight: 600 }}
                    >
                      <Building2 className="w-3 h-3 mr-1" />
                      Enterprise
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Enterprise Accounts found via Identifier account
                      look-up (Check Accounts action)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>

        {/* Right: metadata */}
        <div className="flex items-center gap-2.5 text-xs text-slate-600 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{caseItem.createDate}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs font-semibold">Create Date</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {caseItem.requestOrigin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="bg-slate-50 text-slate-600 border-slate-200 text-xs cursor-help"
                  >
                    {caseItem.requestOrigin}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-semibold">Case Origin</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </>
  );
}