/**
 * StageTabBar — horizontal replacement for the left-edge `WorkflowSidebar`.
 *
 * Renders directly under `StickyCaseHeader` on case routes when
 * `FF_STAGE_TAB_BAR` is on (see `src/constants/featureFlags.ts`).
 *
 * Layout (Option B from the Phase 4 design pass — confirmed by the user):
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ [ ✓ Triage ]    [ ◐ Review Case ]    [ ○ Collection ]            │  ← stage tabs row
 *   ├──────────────────────────────────────────────────────────────────┤
 *   │ ① Overview   ② Authority   ③ Identifiers   ④ Notif   ⑤ Review   │  ← sub-step row
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * The bar stays full-bleed (same as the rest of the case-header chrome) so
 * the eye lands on stage progress at the screen edge. Body content beneath
 * still flows through `<PageContainer>` at the centered 1280px column.
 *
 * Behavior mirrors `WorkflowSidebar`:
 *  - Stage navigation gated by `stageCompletion` (you can't jump forward
 *    until the previous stage is complete).
 *  - Sub-step navigation driven by the same `SidebarNavState` payload the
 *    sidebar consumes today, so individual pages don't need new APIs.
 */
import * as React from "react";
import type { SidebarNavState } from "../../types/sidebarNav";
import {
  Check,
  ListChecks,
  ClipboardList,
  Database,
} from "lucide-react";
import { cn } from "../ui/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

export interface StageTabBarProps {
  workflowStage: "triage" | "fulfillment" | "collection";
  stageCompletion?: {
    triage: boolean;
    fulfillment: boolean;
    collection: boolean;
  };
  onNavigateToTriage?: () => void;
  onNavigateToFulfillment?: () => void;
  onNavigateToCollection?: () => void;
  /** Dynamic sub-step state from the active page. Null/empty → sub-step row
   *  is hidden so the bar collapses to a single row. */
  navState?: SidebarNavState | null;
  /** Called when user clicks a sub-step pill. */
  onStepClick?: (key: string) => void;
}

const STAGE_META = [
  { id: "triage" as const, label: "Triage", icon: ListChecks },
  { id: "fulfillment" as const, label: "Review Case", icon: ClipboardList },
  { id: "collection" as const, label: "Collection", icon: Database },
];

export function StageTabBar({
  workflowStage,
  stageCompletion = { triage: false, fulfillment: false, collection: false },
  onNavigateToTriage,
  onNavigateToFulfillment,
  onNavigateToCollection,
  navState,
  onStepClick,
}: StageTabBarProps) {
  const stageNav = (stageId: "triage" | "fulfillment" | "collection") => {
    if (stageId === "triage") return onNavigateToTriage;
    if (stageId === "fulfillment") return onNavigateToFulfillment;
    return onNavigateToCollection;
  };

  const isStageAccessible = (stageId: "triage" | "fulfillment" | "collection") => {
    if (stageId === "triage") return true;
    if (stageId === "fulfillment") return stageCompletion.triage;
    return stageCompletion.fulfillment;
  };

  const hasSubSteps = !!navState && navState.steps.length > 0;

  return (
    <div
      className="bg-white border-b border-[#edebe9] flex-shrink-0"
      role="navigation"
      aria-label="Workflow stages"
    >
      {/* ── Row 1: Stage tabs ───────────────────────────────────────── */}
      <div className="px-[var(--page-gutter-x)] py-2 flex items-center gap-1 overflow-x-auto">
        {STAGE_META.map((stage, idx) => {
          const isCurrent = workflowStage === stage.id;
          const isComplete = stageCompletion[stage.id];
          const accessible = isStageAccessible(stage.id);
          const nav = stageNav(stage.id);
          const canClick = !isCurrent && accessible && !!nav;
          const Icon = stage.icon;

          return (
            <React.Fragment key={stage.id}>
              {idx > 0 && (
                <div
                  className={cn(
                    "w-4 h-px flex-shrink-0",
                    isComplete || stageCompletion[STAGE_META[idx - 1].id]
                      ? "bg-[#107c10]"
                      : "bg-[#c8c6c4]",
                  )}
                  aria-hidden="true"
                />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={canClick ? nav : undefined}
                    disabled={!canClick}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-3 py-1.5 transition-colors text-sm whitespace-nowrap",
                      isCurrent
                        ? "bg-[#deecf9] text-[#0078d4] font-semibold"
                        : isComplete
                          ? "text-[#107c10] hover:bg-[#f3f2f1]"
                          : accessible
                            ? "text-[#605e5c] hover:bg-[#f3f2f1] cursor-pointer"
                            : "text-[#a19f9d] cursor-not-allowed",
                    )}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4 text-[#107c10]" strokeWidth={3} />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span>{stage.label}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>
                    {isCurrent
                      ? `Current stage: ${stage.label}`
                      : isComplete
                        ? `${stage.label} (complete)`
                        : accessible
                          ? `Go to ${stage.label}`
                          : `${stage.label} (locked — finish previous stage first)`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Row 2: Sub-steps (dynamic per page) ─────────────────────── */}
      {hasSubSteps && (
        <div
          className="border-t border-[#edebe9] bg-[#faf9f8] px-[var(--page-gutter-x)] py-1.5 flex items-center gap-1 overflow-x-auto"
          aria-label="Sub-steps"
        >
          {navState!.steps.map((step, idx) => {
            const isActive = step.key === navState!.activeStepKey;
            return (
              <React.Fragment key={step.key}>
                {idx > 0 && (
                  <div
                    className={cn(
                      "w-3 h-px flex-shrink-0",
                      navState!.steps[idx - 1].isComplete
                        ? "bg-[#107c10]"
                        : "bg-[#e1dfdd]",
                    )}
                    aria-hidden="true"
                  />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onStepClick?.(step.key)}
                      aria-current={isActive ? "step" : undefined}
                      className={cn(
                        "flex items-center gap-1.5 rounded px-2 py-1 transition-colors text-xs whitespace-nowrap",
                        isActive
                          ? "bg-[#deecf9] text-[#0078d4] font-semibold"
                          : step.isComplete
                            ? "text-[#107c10] hover:bg-white"
                            : "text-[#605e5c] hover:bg-white cursor-pointer",
                      )}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0",
                          isActive
                            ? "bg-[#0078d4] text-white"
                            : step.isComplete
                              ? "bg-[#107c10] text-white"
                              : "bg-[#e1dfdd] text-[#605e5c]",
                        )}
                      >
                        {step.isComplete ? (
                          <Check className="w-2.5 h-2.5" strokeWidth={3} />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span>{step.label}</span>
                    </button>
                  </TooltipTrigger>
                  {step.description && (
                    <TooltipContent side="bottom">
                      <p>{step.description}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}
