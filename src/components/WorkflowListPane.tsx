/**
 * WorkflowListPane — Teams-style list pane for the case-form workflow nav.
 *
 * Replaces `WorkflowSidebar` when `FF_NAV_V2_LIST_PANE` is on. Implements
 * Path A of dars-workflow-nav-listpane-rfc.md:
 *
 *   ┌────────────────────────────────┐
 *   │ STAGES         📄  👥  ⋯       │  ← <CaseScopeHeader>
 *   │ LNS-2026-00200  Routine · …    │
 *   ├────────────────────────────────┤
 *   │ ▼ TRIAGE                       │  ← active stage expanded
 *   │    ✓ Case Identification       │
 *   │    ✓ Legal & Compliance        │
 *   │    ● Identifier & Data Svcs    │
 *   │    ○ Non-Disclosure Workflow   │
 *   │                                │
 *   │ ▶ REVIEW CASE                  │  ← inactive stage (click to navigate)
 *   │ ▶ COLLECTION                   │
 *   ├────────────────────────────────┤
 *   │  [ Save Draft ]   [ Submit ]   │  ← <WorkflowListPaneFooter>
 *   └────────────────────────────────┘
 *
 * Notes:
 *   - Only the currently-active stage's sub-steps are rendered. Inactive
 *     stages are navigable headers (click to jump to that stage). This
 *     matches today's data model where DataEntryForm emits navState.steps
 *     for the active stage only. An accordion that exposes sub-steps for
 *     ALL stages would require extending the data model; deferred per the
 *     RFC's pragmatic scoping.
 *   - Pane width: 280 px (§4.2 of the RFC).
 *   - Sub-step status icons follow §4.7 — ✓ complete (green), ● active
 *     (blue + bold), ○ future (numbered empty circle).
 */

import * as React from "react";
import type { SidebarNavState } from "../types/sidebarNav";
import {
  Check,
  Circle,
  CheckCircle2,
  ListChecks,
  ClipboardList,
  Database,
} from "lucide-react";
import { cn } from "./ui/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  CaseScopeHeader,
  type PriorityLabel,
} from "./workflow-nav/CaseScopeHeader";
import { WorkflowListPaneFooter } from "./workflow-nav/WorkflowListPaneFooter";
import { useResizablePaneWidth } from "../hooks/useResizablePaneWidth";

const PANE_MIN_WIDTH = 240;
const PANE_MAX_WIDTH = 480;
const PANE_DEFAULT_WIDTH = 280;

type WorkflowStage = "triage" | "fulfillment" | "collection";

const STAGE_META: Array<{ id: WorkflowStage; label: string; icon: typeof ListChecks }> = [
  { id: "triage", label: "Triage", icon: ListChecks },
  { id: "fulfillment", label: "Review Case", icon: ClipboardList },
  { id: "collection", label: "Collection", icon: Database },
];

export interface WorkflowListPaneProps {
  // ── Workflow stage state ────────────────────────────────────────────────
  workflowStage: WorkflowStage;
  stageCompletion?: {
    triage: boolean;
    fulfillment: boolean;
    collection: boolean;
  };
  onNavigateToQueue?: () => void;
  onNavigateToTriage?: () => void;
  onNavigateToFulfillment?: () => void;
  onNavigateToCollection?: () => void;
  /** Dynamic sub-step state for the active stage. */
  navState?: SidebarNavState | null;
  /** Click handler for sub-steps. */
  onStepClick?: (key: string) => void;

  // ── Case scope (forwarded to <CaseScopeHeader>) ─────────────────────────
  caseId: string;
  priorityLabel: PriorityLabel;
  assigneeName: string;

  // ── Action icons in scope header ────────────────────────────────────────
  documentPanelOpen?: boolean;
  onToggleDocumentPanel?: () => void;
  identifierPanelOpen?: boolean;
  onToggleIdentifierPanel?: () => void;
  escalationActionLabel?: string;
  onEscalate?: () => void;
  onOpenResolveDialog?: (mode: "resolve" | "edit") => void;
  isResolved?: boolean;
  onReopenCase?: () => void;

  // ── Footer Save / Submit ────────────────────────────────────────────────
  isDirty: boolean;
  isSaving?: boolean;
  lastSavedAt?: Date | null;
  onSave: () => void;
  canSubmit: boolean;
  isSubmitting?: boolean;
  onSubmit: () => void;
  blockingFieldLabels?: string[];
  onGoToBlockingField?: (label: string) => void;
}

/** Sub-step status icon — green ✓ when complete, blue filled disc when
 *  active, neutral numbered empty circle otherwise. */
function SubStepStatusIcon({
  index,
  isActive,
  isComplete,
}: {
  index: number;
  isActive: boolean;
  isComplete: boolean;
}) {
  if (isComplete) {
    return (
      <CheckCircle2
        className="w-4 h-4 text-[#107c10] flex-shrink-0"
        aria-hidden="true"
      />
    );
  }
  if (isActive) {
    return (
      <span
        className="w-4 h-4 rounded-full bg-[#0078d4] flex items-center justify-center flex-shrink-0"
        aria-hidden="true"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
      </span>
    );
  }
  return (
    <span
      className="w-4 h-4 rounded-full border border-[#c8c6c4] flex items-center justify-center text-[9px] text-[#605e5c] flex-shrink-0"
      aria-hidden="true"
    >
      {index + 1}
    </span>
  );
}

export function WorkflowListPane({
  workflowStage,
  stageCompletion = { triage: false, fulfillment: false, collection: false },
  onNavigateToTriage,
  onNavigateToFulfillment,
  onNavigateToCollection,
  navState,
  onStepClick,
  caseId,
  priorityLabel,
  assigneeName,
  documentPanelOpen,
  onToggleDocumentPanel,
  identifierPanelOpen,
  onToggleIdentifierPanel,
  escalationActionLabel,
  onEscalate,
  onOpenResolveDialog,
  isResolved,
  onReopenCase,
  isDirty,
  isSaving,
  lastSavedAt,
  onSave,
  canSubmit,
  isSubmitting,
  onSubmit,
  blockingFieldLabels,
  onGoToBlockingField,
}: WorkflowListPaneProps) {
  const stageNav = (stageId: WorkflowStage) => {
    if (stageId === "triage") return onNavigateToTriage;
    if (stageId === "fulfillment") return onNavigateToFulfillment;
    return onNavigateToCollection;
  };

  // Free navigation between stages — once a case is open, the user can move
  // to any stage at will. Previously a forward-only gate based on cumulative
  // completion blocked legitimate "go back to Collection to check job
  // status" navigation after the user dipped into Review Case or Triage.
  // Per UX feedback the gate has been removed; every stage with a handler
  // is navigable from anywhere.

  const [paneWidth, resizeHandlers, resetPaneWidth] = useResizablePaneWidth({
    defaultWidth: PANE_DEFAULT_WIDTH,
    minWidth: PANE_MIN_WIDTH,
    maxWidth: PANE_MAX_WIDTH,
    storageKey: "dars.workflowListPane.width",
  });

  return (
    <nav
      role="navigation"
      aria-label="Case workflow"
      style={{ width: paneWidth }}
      className="bg-white border-r border-[#edebe9] flex flex-col h-full relative z-10 flex-shrink-0"
    >
      {/* ── Scope header (case context + action icons) ─────────────────── */}
      <CaseScopeHeader
        caseId={caseId}
        priorityLabel={priorityLabel}
        assigneeName={assigneeName}
        workflowStage={workflowStage}
        documentPanelOpen={documentPanelOpen}
        onToggleDocumentPanel={onToggleDocumentPanel}
        identifierPanelOpen={identifierPanelOpen}
        onToggleIdentifierPanel={onToggleIdentifierPanel}
        escalationActionLabel={escalationActionLabel}
        onEscalate={onEscalate}
        onOpenResolveDialog={onOpenResolveDialog}
        isResolved={isResolved}
        onReopenCase={onReopenCase}
      />

      {/* ── Stage groups ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {STAGE_META.map((stage) => {
          const isCurrent = workflowStage === stage.id;
          const isComplete = stageCompletion[stage.id];
          const nav = stageNav(stage.id);
          const canClick = !isCurrent && !!nav;
          const Icon = stage.icon;

          return (
            <div key={stage.id}>
              {/* Stage header row */}
              <button
                type="button"
                onClick={canClick ? nav : undefined}
                disabled={!canClick}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                  isCurrent
                    ? "bg-[#deecf9] text-[#0078d4]"
                    : canClick
                      ? "text-[#323130] hover:bg-[#f3f2f1] cursor-pointer"
                      : "text-[#a19f9d] cursor-not-allowed",
                )}
              >
                <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5 text-[#107c10]" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-[0.04em] flex-1",
                    isComplete && !isCurrent && "text-[#107c10]",
                  )}
                >
                  {stage.label}
                </span>
              </button>

              {/* Sub-steps — rendered only for the active stage */}
              {isCurrent && navState && navState.steps.length > 0 && (
                <ul className="mt-1 space-y-0.5 pl-1.5" role="list">
                  {navState.steps.map((step, idx) => {
                    const isActiveStep = step.key === navState.activeStepKey;
                    return (
                      <li key={step.key}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onStepClick?.(step.key)}
                              aria-current={isActiveStep ? "step" : undefined}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                                isActiveStep
                                  ? "bg-[#deecf9] font-semibold text-[#0078d4]"
                                  : step.isComplete
                                    ? "text-[#107c10] hover:bg-[#f3f2f1]"
                                    : "text-[#323130] hover:bg-[#f3f2f1]",
                              )}
                            >
                              <SubStepStatusIcon
                                index={idx}
                                isActive={isActiveStep}
                                isComplete={step.isComplete}
                              />
                              <span className="truncate flex-1">{step.label}</span>
                            </button>
                          </TooltipTrigger>
                          {step.description && (
                            <TooltipContent side="right">
                              <div>
                                <p className="font-semibold">{step.label}</p>
                                <p className="text-xs text-[#605e5c]">
                                  {step.description}
                                </p>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Empty-state caption when active stage has no steps */}
              {isCurrent && (!navState || navState.steps.length === 0) && (
                <p className="px-2 py-2 text-[11px] text-[#a19f9d] italic">
                  No sub-steps available
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Sticky footer (Save Draft + Submit) ────────────────────────── */}
      <WorkflowListPaneFooter
        isDirty={isDirty}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        onSave={onSave}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
        blockingFieldLabels={blockingFieldLabels}
        onGoToBlockingField={onGoToBlockingField}
      />

      {/* ── Resize handle ─────────────────────────────────────────────────
          Thin column on the right edge that the user drags to widen /
          narrow the pane. Double-click resets to the default width.
          Exposes role="separator" so screen-readers announce the resize
          affordance; keyboard arrows shift width when the handle is
          focused (see useResizablePaneWidth). */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize workflow pane"
        aria-valuenow={paneWidth}
        aria-valuemin={PANE_MIN_WIDTH}
        aria-valuemax={PANE_MAX_WIDTH}
        tabIndex={0}
        onPointerDown={resizeHandlers.onPointerDown}
        onKeyDown={resizeHandlers.onKeyDown}
        onDoubleClick={resetPaneWidth}
        title="Drag to resize · double-click to reset"
        className={cn(
          "absolute top-0 right-0 h-full w-1.5 cursor-col-resize",
          "hover:bg-[#0078d4]/30 active:bg-[#0078d4]/50",
          "focus-visible:outline-none focus-visible:bg-[#0078d4]/30",
          "transition-colors",
        )}
      />
    </nav>
  );
}
