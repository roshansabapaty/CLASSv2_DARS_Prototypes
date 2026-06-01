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
// StageTabBar / FF_STAGE_TAB_BAR retired in Phase 1.4 of the workflow
// list-pane RFC — superseded by WorkflowListPane mounted at the App level.
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
  // ── WorkflowListPane visibility re-anchor (Teams pattern) ──────────────
  /** When false, the embedded WorkflowStageBanner surfaces a Show-workflow
   *  button + breadcrumb pill so the user keeps stage/sub-step orientation
   *  while the WorkflowListPane is hidden. Undefined → pane assumed visible. */
  workflowPaneVisible?: boolean;
  /** Re-show the WorkflowListPane (wired by App.tsx via usePaneVisibility). */
  onShowWorkflowPane?: () => void;
  /** Active sub-step label inside the current stage. Drives the breadcrumb
   *  pill that surfaces when the pane is hidden. */
  workflowActiveStepLabel?: string;
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
  workflowPaneVisible,
  onShowWorkflowPane,
  workflowActiveStepLabel,
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
          workflowPaneVisible={workflowPaneVisible}
          onShowWorkflowPane={onShowWorkflowPane}
          workflowActiveStepLabel={workflowActiveStepLabel}
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

        {/* StageTabBar render removed — Phase 1.4 of the workflow
            list-pane RFC retired FF_STAGE_TAB_BAR. The Teams-style
            WorkflowListPane mounted at the App level replaces it. */}
      </div>
    </TooltipProvider>
  );
}