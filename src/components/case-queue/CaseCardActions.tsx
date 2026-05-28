/**
 * CaseCardActions — Right column of the queue card.
 *
 * Shows contextual action buttons based on assignment state:
 * - Unassigned → "Start Triage" primary button
 * - Assigned to me → "Continue Work" primary button + active indicator
 * - Assigned to other → "View Details" outline button + read-only label
 * - Resolved → resolved badge
 */

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  FileText,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import type { CaseQueueItem } from "./case-queue-types";
import { CURRENT_USER } from "./case-queue-types";

interface CaseCardActionsProps {
  caseItem: CaseQueueItem;
  nextAction: string;
  workflowStage: "triage" | "fulfillment" | "collection";
  isUnassigned: boolean;
  isAssignedToMe: boolean;
  isAssignedToOther: boolean;
  onCaseSelect: (caseId: string, workflowStage?: "triage" | "fulfillment" | "collection") => void;
}

export function CaseCardActions({
  caseItem,
  nextAction,
  workflowStage,
  isUnassigned,
  isAssignedToMe,
  isAssignedToOther,
  onCaseSelect,
}: CaseCardActionsProps) {
  return (
    <div className="flex flex-col justify-center gap-2 w-44">
      {isUnassigned && (
        <div className="space-y-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toast.success(`Case ${caseItem.caseId} assigned to ${CURRENT_USER}`);
              onCaseSelect(caseItem.caseId, "triage");
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 w-full h-9 font-medium"
          >
            <PlayCircle className="w-4 h-4 mr-1.5" />
            {nextAction}
          </Button>
          <p className="text-[11px] text-slate-500 text-center leading-tight">
            Click to assign &amp; open
          </p>
        </div>
      )}

      {isAssignedToMe && caseItem.caseStage !== "Resolved" && (
        <div className="space-y-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCaseSelect(caseItem.caseId, workflowStage);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 w-full h-9 font-medium"
          >
            <ChevronRight className="w-4 h-4 mr-1.5" />
            {nextAction}
          </Button>
          <div className="flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[11px] text-blue-600 font-semibold text-center leading-tight">
              Your active case
            </p>
          </div>
        </div>
      )}

      {isAssignedToOther && caseItem.caseStage !== "Resolved" && (
        <div className="space-y-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCaseSelect(caseItem.caseId);
            }}
            className="border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 w-full h-9 font-medium"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            {nextAction}
          </Button>
          <p className="text-[11px] text-slate-500 text-center leading-tight">
            Read-only access
          </p>
        </div>
      )}

      {caseItem.caseStage === "Resolved" && (
        <div className="space-y-2">
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-500 border-slate-300 text-xs font-medium w-full justify-center py-1.5"
          >
            ✓ Resolved
          </Badge>
          <p className="text-[11px] text-slate-400 text-center leading-tight">
            Click to review
          </p>
        </div>
      )}
    </div>
  );
}
