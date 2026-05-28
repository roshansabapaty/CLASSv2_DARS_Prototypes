/**
 * StickyCaseHeader — Unified sticky header that merges the workflow stage banner,
 * case summary card, and action buttons into a single "expanded queue card" experience.
 *
 * Sub-components:
 *  - WorkflowStageBanner (gradient strip for triage/fulfillment/collection)
 *  - CaseHeaderSummary (case ID, priority, properties, collapsible extended details)
 *  - CaseHeaderActions (save, document/identifier panels, close)
 */
import { FormData } from "./DataEntryForm";
import { useEffect, useState } from "react";
import { cn } from "./ui/utils";
import { TooltipProvider } from "./ui/tooltip";
import { WorkflowStageBanner } from "./case-header/WorkflowStageBanner";
import { CaseHeaderSummary } from "./case-header/CaseHeaderSummary";
import { getPriorityConfig } from "./case-header/caseHeaderUtils";
import { currentEscalationChip } from "../utils/escalationHelpers";
import { getActiveAttorneyEscalation } from "../utils/caseEscalation";
import { StageTabBar } from "./layout/StageTabBar";
import { FF_STAGE_TAB_BAR } from "../constants/featureFlags";
import type { SidebarNavState } from "../types/sidebarNav";

interface StickyCaseHeaderProps {
  formData: FormData;
  workflowStage: "triage" | "fulfillment" | "collection";
  onNavigateToTriage?: () => void;
  onNavigateToFulfillment?: () => void;
  onNavigateToQueue?: () => void;
  documentPanelOpen?: boolean;
  onToggleDocumentPanel?: () => void;
  documentPanelWidth?: number;
  identifierPanelOpen?: boolean;
  identifierPanelWidth?: number;
  onToggleIdentifierPanel?: () => void;
  isDirty?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  caseIdentificationCompletionCount?: number;
  isFormValid?: boolean;
  onSubmit?: () => void;
  sidebarCollapsed?: boolean;
  onRefreshPipeline?: () => void;
  isRefreshingPipeline?: boolean;
  onOpenCancellationWorkflow?: () => void;
  cancellationAllStepsComplete?: boolean;
  /** Resolve Case actions on the workflow stage banner. */
  onOpenResolveDialog?: (mode: "resolve" | "edit") => void;
  onReopenCase?: () => void;
  /** Escalate / Update / Resume Escalation action on the banner. */
  onOpenEscalateDialog?: () => void;
  /** Toggle the case's SLA timer pause state. Used by the "Pause SLA" /
   *  "Resume SLA" button rendered next to the SLA chip. */
  onToggleSlaPause?: () => void;
  /** Apply a new assignee from the AssigneeChip in the workflow banner.
   *  When omitted, the chip is not rendered (back-compat). */
  onAssigneeChange?: (next: string) => void;
  /** Pool of Response Specialists shown in the chip's picker. Required for
   *  the chip to render. */
  responseSpecialists?: string[];
  /** Display name of the signed-in user — drives the picker's
   *  "Assign to me" shortcut. */
  currentUser?: string;
  /** Phase 4 (FF_STAGE_TAB_BAR): stage completion + dynamic sub-step state
   *  + navigation callbacks for the horizontal StageTabBar that replaces
   *  the left-edge WorkflowSidebar when the flag is on. Ignored when the
   *  flag is off — the sidebar continues to own this data in App.tsx. */
  stageCompletion?: {
    triage: boolean;
    fulfillment: boolean;
    collection: boolean;
  };
  navState?: SidebarNavState | null;
  onStepClick?: (key: string) => void;
  onNavigateToCollection?: () => void;
}

export function StickyCaseHeader({
  formData,
  workflowStage,
  onNavigateToTriage,
  onNavigateToFulfillment,
  onNavigateToQueue,
  documentPanelOpen,
  onToggleDocumentPanel,
  documentPanelWidth = 600,
  identifierPanelOpen,
  identifierPanelWidth = 650,
  onToggleIdentifierPanel,
  isDirty = false,
  onSave,
  isSaving = false,
  lastSaved,
  caseIdentificationCompletionCount = 0,
  isFormValid = false,
  onSubmit,
  sidebarCollapsed,
  onRefreshPipeline,
  isRefreshingPipeline = false,
  onOpenCancellationWorkflow,
  cancellationAllStepsComplete,
  onOpenResolveDialog,
  onReopenCase,
  onOpenEscalateDialog,
  onToggleSlaPause,
  onAssigneeChange,
  responseSpecialists,
  currentUser,
  stageCompletion,
  navState,
  onStepClick,
  onNavigateToCollection,
}: StickyCaseHeaderProps) {
  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (onSave && isDirty && !isSaving) {
          onSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, isDirty, isSaving]);

  // Keyboard shortcut: Esc to return to queue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onNavigateToQueue) {
        const openDialog = document.querySelector(
          '[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper], .fixed[data-state="open"]'
        );
        if (openDialog) return;

        const activeEl = document.activeElement;
        if (
          activeEl?.closest(
            '[role="listbox"], [role="menu"], [role="combobox"][aria-expanded="true"]'
          )
        ) {
          return;
        }

        e.preventDefault();
        onNavigateToQueue();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNavigateToQueue]);

  const priorityConfig = getPriorityConfig(formData.casePriority);

  return (
    <TooltipProvider>
      <div className="z-[55] shadow-sm flex-shrink-0">
        {/* Workflow Stage Strip */}
        <WorkflowStageBanner
          workflowStage={workflowStage}
          caseIdentificationCompletionCount={caseIdentificationCompletionCount}
          onRefreshPipeline={onRefreshPipeline}
          isRefreshingPipeline={isRefreshingPipeline}
          isDirty={isDirty}
          onSave={onSave}
          isSaving={isSaving}
          lastSaved={lastSaved}
          onNavigateToQueue={onNavigateToQueue}
          caseNumber={formData.caseNumber}
          caseId={formData.caseId}
          casePriority={formData.casePriority}
          caseStage={formData.caseStage}
          onOpenResolveDialog={onOpenResolveDialog}
          onReopenCase={onReopenCase}
          escalationChip={currentEscalationChip(formData)}
          escalationActionLabel={(() => {
            const activeEsc = getActiveAttorneyEscalation(formData);
            return activeEsc?.status === "InformationRequested"
              ? "Resume Escalation"
              : activeEsc
                ? "Update Escalation"
                : "Escalate";
          })()}
          onOpenEscalateDialog={onOpenEscalateDialog}
          assigneeName={formData.assigneeName}
          onAssigneeChange={onAssigneeChange}
          responseSpecialists={responseSpecialists}
          currentUser={currentUser}
        />

        {/* Unified Case Card Header — priority border + summary + actions */}
        <div
          className={cn(
            "bg-white",
            priorityConfig.color
          )}
          style={{ borderBottom: "1px solid #e1dfdd" }}
        >
          {/* Case summary content */}
          <CaseHeaderSummary
            formData={formData}
            onOpenCancellationWorkflow={onOpenCancellationWorkflow}
            cancellationAllStepsComplete={cancellationAllStepsComplete}
            documentPanelOpen={documentPanelOpen}
            onToggleDocumentPanel={onToggleDocumentPanel}
            identifierPanelOpen={identifierPanelOpen}
            onToggleIdentifierPanel={onToggleIdentifierPanel}
            workflowStage={workflowStage}
            onToggleSlaPause={onToggleSlaPause}
          />
        </div>

        {/* Phase 4 (FF_STAGE_TAB_BAR): horizontal workflow nav replaces
            the left-edge WorkflowSidebar. Renders directly under the
            case-header chrome so stages + sub-steps stay full-bleed. */}
        {FF_STAGE_TAB_BAR && (
          <StageTabBar
            workflowStage={workflowStage}
            stageCompletion={stageCompletion}
            onNavigateToTriage={onNavigateToTriage}
            onNavigateToFulfillment={onNavigateToFulfillment}
            onNavigateToCollection={onNavigateToCollection}
            navState={navState}
            onStepClick={onStepClick}
          />
        )}
      </div>
    </TooltipProvider>
  );
}