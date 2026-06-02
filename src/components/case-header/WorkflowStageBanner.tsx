/**
 * WorkflowStageBanner — Thin gradient strip showing current workflow stage.
 * Rendered at the very top of the unified case header.
 */
import React from "react";
import {
  Clock,
  CheckCircle2,
  Database,
  RefreshCw,
  Save,
  Loader2,
  Check,
  X,
  ChevronDown,
  RotateCcw,
  Pencil,
  Scale,
  PanelLeftOpen,
  ChevronRight,
  Send,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../ui/utils";
import { CopyableText } from "../CopyButton";
import { getPriorityConfig } from "./caseHeaderUtils";
import {
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from "@fluentui/react-components";
import { isClosureStage } from "../../constants/caseConstants";
import { FF_NAV_V2_LIST_PANE } from "../../constants/featureFlags";
import type { EscalationChipMeta } from "../../utils/escalationHelpers";
import { AssigneeChip } from "../assignee/AssigneeChip";

interface WorkflowStageBannerProps {
  workflowStage: "triage" | "fulfillment" | "collection";
  caseIdentificationCompletionCount?: number;
  onRefreshPipeline?: () => void;
  isRefreshingPipeline?: boolean;
  // Save
  isDirty?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  // Close
  onNavigateToQueue?: () => void;
  // Case info
  caseNumber?: string;
  caseId?: string;
  casePriority?: string;
  // Assignee chip (Surface B of the AssignedTo migration)
  /** Current assignee. Undefined / "" renders the Unassigned state. */
  assigneeName?: string;
  /** Apply a new assignee. Pass "" to clear. */
  onAssigneeChange?: (next: string) => void;
  /** Full list of pickable Response Specialists. */
  responseSpecialists?: string[];
  /** Display name of the signed-in user (drives "Assign to me"). */
  currentUser?: string;
  // Resolve Case (Phase 5c.5+)
  /** Current case stage — drives the Resolve vs. Edit/Re-open UI. */
  caseStage?: string;
  /** Open the shared ResolveCaseDialog. `mode` is "resolve" before the
   *  case is closed and "edit" once it has been. */
  onOpenResolveDialog?: (mode: "resolve" | "edit") => void;
  /** Re-open a closed case. Pushes the current resolution into
   *  `resolutionHistory[]`, clears the live resolution fields, and resets
   *  `caseStage` to "In Progress". */
  onReopenCase?: () => void;
  // ── Attorney escalation chip + action ────────────────────────────────
  /** Chip metadata for the active escalation, if any. `undefined` hides
   *  the chip slot. */
  escalationChip?: EscalationChipMeta;
  /** Verb for the escalation action button, derived by the parent from
   *  the current `attorneyEscalation.status`. */
  escalationActionLabel?: "Escalate" | "Update Escalation" | "Resume Escalation";
  /** Open the EscalateToAttorneyDialog in the appropriate mode. */
  onOpenEscalateDialog?: () => void;

  // ── WorkflowListPane visibility re-anchor (Teams hide-entirely pattern) ──
  /** Whether the WorkflowListPane is currently visible. When false, the
   *  banner surfaces a "Show workflow" button + breadcrumb pill so the user
   *  doesn't lose stage / sub-step orientation while the pane is hidden.
   *  Undefined → assume visible (original behaviour). */
  workflowPaneVisible?: boolean;
  /** Re-show the WorkflowListPane. Wired to the Show-workflow button that
   *  surfaces in the banner when `workflowPaneVisible === false`. */
  onShowWorkflowPane?: () => void;
  /** Active sub-step label inside the current stage — drives the breadcrumb
   *  pill ("Triage › Identifier & Data Services"). Only surfaces when the
   *  pane is hidden; the pane itself owns sub-step display when visible. */
  workflowActiveStepLabel?: string;

  // ── Submit-when-pane-hidden plumbing ──────────────────────────────────
  /** Submit handler. Surfaced as a banner button when the pane is hidden
   *  (or when FF_NAV_V2_LIST_PANE is off) so the user can submit without
   *  re-expanding the pane. */
  onSubmit?: () => void;
  /** True when every required field for the current stage is valid. */
  canSubmit?: boolean;
  /** Spinner state while submit is in flight. */
  isSubmitting?: boolean;
  /** Names of fields blocking submit — shown in the disabled-Submit tooltip. */
  blockingFieldLabels?: string[];
}

export function WorkflowStageBanner({
  workflowStage,
  caseIdentificationCompletionCount = 0,
  onRefreshPipeline,
  isRefreshingPipeline = false,
  isDirty = false,
  onSave,
  isSaving = false,
  lastSaved,
  onNavigateToQueue,
  caseNumber,
  caseId,
  casePriority,
  caseStage,
  onOpenResolveDialog,
  onReopenCase,
  escalationChip,
  escalationActionLabel,
  onOpenEscalateDialog,
  assigneeName,
  onAssigneeChange,
  responseSpecialists,
  currentUser,
  workflowPaneVisible,
  onShowWorkflowPane,
  workflowActiveStepLabel,
  onSubmit,
  canSubmit,
  isSubmitting,
  blockingFieldLabels,
}: WorkflowStageBannerProps) {
  const priorityConfig = casePriority ? getPriorityConfig(casePriority) : null;
  const displayCaseNumber = caseNumber || caseId || "—";

  // Map the escalation chip's tier to a tailwind class palette. Tiers
  // come from `currentEscalationChip(formData)` in escalationHelpers.
  const escalationChipClasses: Record<string, string> = {
    alertRed:
      "bg-[#fef0f0] text-[#c50f1f] border border-[#c50f1f]/50",
    warnAmber:
      "bg-[#fff4ce] text-[#7a3a00] border border-[#ca5010]/50",
    infoSlateBlue:
      "bg-[#eaf0f7] text-[#385575] border border-[#486991]/50",
    successGreen:
      "bg-[#dff6dd] text-[#0b6a0b] border border-[#107c10]/50",
  };
  const escalationChipNode = escalationChip ? (
    <div
      className={cn(
        "inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-semibold uppercase tracking-wide flex-shrink-0",
        escalationChipClasses[escalationChip.tier] ??
          escalationChipClasses.infoSlateBlue,
      )}
      role="status"
      aria-label={escalationChip.label}
    >
      <Scale className="w-3 h-3" />
      {escalationChip.label}
    </div>
  ) : null;

  const showAssigneeChip =
    !!onAssigneeChange && !!responseSpecialists && responseSpecialists.length > 0;

  const caseInfo = (
    <>
      <div className="h-4 w-px bg-white/30 mx-0.5" />
      <CopyableText text={displayCaseNumber} copyLabel="Copy case number">
        <span className="font-mono text-sm text-white/90">{displayCaseNumber}</span>
      </CopyableText>
    </>
  );

  // ── WorkflowListPane "hide-entirely" re-anchor (Teams pattern) ────────
  // When the pane is hidden, surface (a) a Show-workflow button at the left
  // edge of the banner and (b) a breadcrumb pill showing the active stage +
  // sub-step. Together they keep the user oriented without consuming any
  // workspace width. Both are no-ops when `onShowWorkflowPane` is not wired,
  // so this is backwards-compatible with banner callers that don't yet care
  // about pane visibility.
  const paneHidden = workflowPaneVisible === false;

  const stageLabelMap: Record<typeof workflowStage, string> = {
    triage: "Triage",
    fulfillment: "Review Case",
    collection: "Collection",
  };

  const showPaneButton =
    paneHidden && onShowWorkflowPane ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onShowWorkflowPane}
            aria-label="Show workflow pane (Ctrl+Shift+W)"
            aria-pressed="false"
            className={cn(
              "inline-flex items-center justify-center h-7 w-7 rounded-md flex-shrink-0",
              "bg-white/15 hover:bg-white/30 text-white border border-white/25",
              "transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85",
            )}
          >
            <PanelLeftOpen className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Show workflow pane{" "}
            <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono">
              Ctrl+Shift+W
            </kbd>
          </p>
        </TooltipContent>
      </Tooltip>
    ) : null;

  const paneBreadcrumb =
    paneHidden && workflowActiveStepLabel ? (
      <div
        className="inline-flex items-center gap-1 h-6 px-2 rounded bg-white/15 border border-white/25 text-[11px] text-white/95 flex-shrink-0 max-w-[320px]"
        role="status"
        aria-label={`Active step: ${stageLabelMap[workflowStage]} › ${workflowActiveStepLabel}`}
      >
        <span className="font-semibold uppercase tracking-wide">
          {stageLabelMap[workflowStage]}
        </span>
        <ChevronRight className="w-3 h-3 text-white/60 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{workflowActiveStepLabel}</span>
      </div>
    ) : null;

  // Assignee chip lives in the action cluster on the right so it sits with
  // other CTAs (Escalate / Resolve / Save), not with passive metadata badges
  // on the left. This also lets keyboard users tab through all banner actions
  // in one logical group.
  const assigneeChipNode = showAssigneeChip ? (
    <AssigneeChip
      value={assigneeName}
      onChange={onAssigneeChange!}
      specialists={responseSpecialists!}
      currentUser={currentUser}
      caseId={displayCaseNumber}
      variant="header"
    />
  ) : null;

  // ── Resolve / Edit-resolution / Re-open actions ────────────────────────
  // Two visual states keyed off `caseStage`:
  //   * Not in a closure stage → single "Resolve Case" pill that opens the
  //     shared ResolveCaseDialog in resolve mode (no preselected reason).
  //   * In a closure stage → "Manage resolution" pill with a Fluent Menu
  //     surfacing "Edit resolution" (opens dialog in edit mode, prefilled)
  //     and "Re-open case" (pushes prior to history, clears live fields,
  //     resets stage to In Progress).
  const isResolved = isClosureStage(caseStage);

  // Shared visual treatment for every actionable button in the workflow
  // banner (Escalate, Resolve, Save, Assignee chip). The goal is to make all
  // CTAs distinct from passive status badges (which use bg-white/15 or
  // bg-white/20) and discoverable as interactive surfaces:
  //   * bg-white/25 + hover:bg-white/35   → brighter than passive badges
  //   * border-white/45                    → thicker, more visible boundary
  //   * shadow-sm                          → slight elevation cues "pressable"
  //   * focus-visible ring-white/85        → bright halo on the blue *or*
  //                                          purple banner (no banner-color
  //                                          offset so it works on Collection's
  //                                          purple gradient too)
  const resolveButtonBase =
    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs transition-all duration-200 bg-white/25 hover:bg-white/35 text-white border border-white/45 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85";

  const resolveActions = onOpenResolveDialog ? (
    !isResolved ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onOpenResolveDialog("resolve")}
            className={resolveButtonBase}
            aria-label="Resolve case"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Resolve Case</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Close this case with a reason and notes. Available at any stage.
          </p>
        </TooltipContent>
      </Tooltip>
    ) : (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button
            type="button"
            className={resolveButtonBase}
            aria-label="Manage resolution"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Manage resolution</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem
              icon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => onOpenResolveDialog("edit")}
            >
              Edit resolution
            </MenuItem>
            <MenuItem
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={() => onReopenCase?.()}
              disabled={!onReopenCase}
            >
              Re-open case
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    )
  ) : null;

  // ── Escalate / Update / Resume action ─────────────────────────────────
  const escalationAction = onOpenEscalateDialog ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onOpenEscalateDialog}
          className={resolveButtonBase}
          aria-label={escalationActionLabel ?? "Escalate"}
        >
          <Scale className="w-3 h-3" />
          <span>{escalationActionLabel ?? "Escalate"}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {escalationActionLabel === "Resume Escalation"
            ? "Re-open the escalation after responding to the reviewer's information request."
            : escalationActionLabel === "Update Escalation"
              ? "Adjust the role / assignee / reason on the active escalation."
              : "Send this case to an attorney or peer reviewer."}
        </p>
      </TooltipContent>
    </Tooltip>
  ) : null;

  const saveCloseButtons = (
    <div
      className="flex items-center gap-1.5 ml-auto flex-shrink-0"
      role="group"
      aria-label="Case actions"
    >
      {assigneeChipNode}
      {assigneeChipNode && (escalationAction || resolveActions) && (
        <div
          className="h-4 w-px bg-white/30 mx-0.5"
          role="separator"
          aria-orientation="vertical"
        />
      )}
      {/* Case-level actions (Escalate, Resolve, Save) hide here when
          FF_NAV_V2_LIST_PANE is on — they live in the WorkflowListPane's
          scope-header overflow menu (Escalate / Resolve) and pane footer
          (Save) instead. Keeps single-home for each action. */}
      {(!FF_NAV_V2_LIST_PANE || workflowPaneVisible === false) && escalationAction}
      {(!FF_NAV_V2_LIST_PANE || workflowPaneVisible === false) && resolveActions}
      {(!FF_NAV_V2_LIST_PANE || workflowPaneVisible === false) && onSave && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSave}
              disabled={!isDirty || isSaving}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85",
                isDirty && !isSaving
                  ? "bg-white/25 hover:bg-white/35 text-white border border-white/45 shadow-sm"
                  : isSaving
                    ? "bg-white/15 text-white/70 border border-white/20"
                    : "text-white/60 cursor-default"
              )}
              aria-label={
                isSaving
                  ? "Saving changes..."
                  : isDirty
                    ? "Save changes (Ctrl+S)"
                    : "All changes saved"
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving</span>
                </>
              ) : isDirty ? (
                <>
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                  <kbd className="hidden lg:inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono bg-white/15 text-white/70">
                    ⌘S
                  </kbd>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  <span>Saved</span>
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              {isSaving ? (
                <p>Saving your changes...</p>
              ) : isDirty ? (
                <p>
                  You have unsaved changes.{" "}
                  <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono">
                    Ctrl+S
                  </kbd>
                </p>
              ) : lastSaved ? (
                <p>
                  All changes saved ·{" "}
                  {lastSaved.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              ) : (
                <p>No unsaved changes</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      {/* Submit button — surfaces here when the WorkflowListPane is
          hidden (or FF_NAV_V2_LIST_PANE is off) so the user can still
          submit without re-expanding the pane. Disabled-state tooltip
          lists the blocking fields, same shape as the pane footer. */}
      {(!FF_NAV_V2_LIST_PANE || workflowPaneVisible === false) && onSubmit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
              className={cn(
                "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85",
                canSubmit && !isSubmitting
                  ? "bg-[#107c10] hover:bg-[#0e6b0e] text-white border border-[#0a5b0a] shadow-sm"
                  : isSubmitting
                    ? "bg-white/15 text-white/70 border border-white/20"
                    : "bg-white/15 text-white/60 border border-white/20 cursor-not-allowed",
              )}
              aria-label={
                isSubmitting
                  ? "Submitting case..."
                  : canSubmit
                    ? "Submit case"
                    : "Submit disabled — required fields missing"
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Submitting</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Submit</span>
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs max-w-[280px]">
              {isSubmitting ? (
                <p>Submitting your case...</p>
              ) : canSubmit ? (
                <p>Submit this case for review.</p>
              ) : blockingFieldLabels && blockingFieldLabels.length > 0 ? (
                <div className="space-y-1">
                  <p className="font-semibold">
                    {blockingFieldLabels.length} required field
                    {blockingFieldLabels.length === 1 ? "" : "s"} missing:
                  </p>
                  <ul className="list-disc list-inside text-white/90">
                    {blockingFieldLabels.slice(0, 5).map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                    {blockingFieldLabels.length > 5 && (
                      <li className="italic text-white/70">
                        + {blockingFieldLabels.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              ) : (
                <p>Fill in all required fields to enable submit.</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      {onNavigateToQueue && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onNavigateToQueue}
              className="inline-flex items-center justify-center w-7 h-7 text-white/70 hover:text-white hover:bg-white/20 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85"
              aria-label="Close case view (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Close case view{" "}
              <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono">
                Esc
              </kbd>
            </p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  if (workflowStage === "triage") {
    return (
      <div className="bg-gradient-to-r from-[#0078d4] to-[#106ebe] py-1.5 px-4">
        <div className="flex items-center gap-3 text-white">
          {showPaneButton}
          <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <h2 className="text-sm">Triage</h2>
          {paneBreadcrumb}
          {caseInfo}
          {escalationChipNode}
          {saveCloseButtons}
        </div>
      </div>
    );
  }

  if (workflowStage === "fulfillment") {
    return (
      <div className="bg-gradient-to-r from-[#0078d4] to-[#106ebe] py-1.5 px-4 border-l-4 border-l-[#107c10]">
        <div className="flex items-center gap-3 text-white">
          {showPaneButton}
          <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h2 className="text-sm">Review Case</h2>
          {paneBreadcrumb}
          {caseInfo}
          {escalationChipNode}
          <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
            {caseIdentificationCompletionCount} Identifier{caseIdentificationCompletionCount !== 1 ? "s" : ""} Active
          </Badge>
          {saveCloseButtons}
        </div>
      </div>
    );
  }

  // collection
  return (
    <div className="bg-gradient-to-r from-[#8764b8] to-[#7253a8] py-1.5 px-4">
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          {showPaneButton}
          <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center flex-shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <h2 className="text-sm">Collection</h2>
          {paneBreadcrumb}
          {caseInfo}
          {escalationChipNode}
          <Badge variant="outline" className="bg-white/20 text-white border-white/30 text-xs">
            Data Gathering
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {onRefreshPipeline && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRefreshPipeline();
                  }}
                  disabled={isRefreshingPipeline}
                  className={cn(
                    "h-8 px-3 text-white border text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-lg",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/85",
                    isRefreshingPipeline
                      ? "bg-white/20 border-white/30"
                      : "bg-white/25 hover:bg-white/35 border-white/45 hover:border-white/65 hover:shadow-[0_0_16px_rgba(255,255,255,0.25)]"
                  )}
                >
                  <span className="relative flex items-center gap-2">
                    {!isRefreshingPipeline && (
                      <span className="absolute -left-1 -top-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffd335] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffd335]" />
                      </span>
                    )}
                    <RefreshCw className={cn("w-3.5 h-3.5 ml-1.5", isRefreshingPipeline && "animate-spin")} />
                    {isRefreshingPipeline ? "Checking..." : "Check Jobs"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[260px] text-center bg-[#323130] text-white px-3 py-2">
                <p className="text-xs">Fetches the latest status for all Collection, Package, and Delivery jobs.</p>
              </TooltipContent>
            </Tooltip>
          )}
          {saveCloseButtons}
        </div>
      </div>
    </div>
  );
}