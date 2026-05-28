/**
 * WorkflowSidebar — fixed-width left rail (256px) used on case routes
 * when `FF_STAGE_TAB_BAR` is off. Lists the three workflow stages
 * (Triage → Review Case → Collection) with their dynamic sub-steps
 * underneath.
 *
 * The collapse-to-icons toggle was retired (3B in UX-Polish.md). The rail
 * is now always at 256px when rendered; with `FF_STAGE_TAB_BAR=true` the
 * `<nav>` is hidden entirely by App.tsx and the horizontal StageTabBar
 * takes over.
 */

import React from "react";
import type { SidebarNavState } from "../types/sidebarNav";
import {
  Check,
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

interface WorkflowSidebarProps {
  workflowStage: "triage" | "fulfillment" | "collection";
  stageCompletion?: {
    triage: boolean;
    fulfillment: boolean;
    collection: boolean;
  };
  onNavigateToQueue: () => void;
  onNavigateToTriage?: () => void;
  onNavigateToFulfillment?: () => void;
  onNavigateToCollection?: () => void;
  /** Dynamic sub-step state from the active page */
  navState?: SidebarNavState | null;
  /** Called when user clicks a sub-step in the sidebar */
  onStepClick?: (key: string) => void;
}

const STAGE_META = [
  { id: "triage" as const, label: "Triage", icon: ListChecks },
  { id: "fulfillment" as const, label: "Review Case", icon: ClipboardList },
  { id: "collection" as const, label: "Collection", icon: Database },
];

export function WorkflowSidebar({
  workflowStage,
  stageCompletion = { triage: false, fulfillment: false, collection: false },
  onNavigateToTriage,
  onNavigateToFulfillment,
  onNavigateToCollection,
  navState,
  onStepClick,
}: WorkflowSidebarProps) {
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

  return (
    <div className="bg-white border-r border-[#edebe9] flex flex-col h-full relative z-10 w-64">
      {/* ── Workflow Stage Indicators ── */}
      <div className="border-b border-[#edebe9] px-3 py-3">
        <div className="flex items-center gap-1">
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
                      "w-3 h-px",
                      isComplete || stageCompletion[STAGE_META[idx - 1].id]
                        ? "bg-[#107c10]"
                        : "bg-[#c8c6c4]",
                    )}
                  />
                )}
                <button
                  onClick={canClick ? nav : undefined}
                  disabled={!canClick}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2 py-1.5 transition-colors",
                    isCurrent
                      ? "bg-[#deecf9] text-[#0078d4]"
                      : isComplete
                        ? "text-[#107c10]"
                        : accessible
                          ? "text-[#605e5c] hover:bg-[#f3f2f1] cursor-pointer"
                          : "text-[#a19f9d] cursor-not-allowed",
                  )}
                >
                  {isComplete ? (
                    <Check className="w-3.5 h-3.5 text-[#107c10]" strokeWidth={3} />
                  ) : (
                    <Icon className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs whitespace-nowrap">{stage.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Dynamic Sub-Steps Nav ── */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navState && navState.steps.length > 0 ? (
          <div className="space-y-0.5 px-2">
            {navState.steps.map((step, idx) => {
              const isActive = step.key === navState.activeStepKey;

              return (
                <React.Fragment key={step.key}>
                  {idx > 0 && (
                    <div className="pl-[18px] py-0">
                      <div
                        className={cn(
                          "w-0.5 h-3 ml-px",
                          navState.steps[idx - 1].isComplete
                            ? "bg-[#107c10]"
                            : "bg-[#e1dfdd]",
                        )}
                      />
                    </div>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onStepClick?.(step.key)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-left",
                          isActive
                            ? "bg-[#deecf9] border-l-3 border-l-[#0078d4]"
                            : "hover:bg-[#f3f2f1] cursor-pointer",
                        )}
                      >
                        {/* Step number — always rendered. Completion is
                            still signalled by the green label colour below. */}
                        <span
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0",
                            isActive
                              ? "bg-[#0078d4] text-white"
                              : "bg-[#e1dfdd] text-[#605e5c]",
                          )}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm truncate",
                              isActive
                                ? "text-[#0078d4] font-semibold"
                                : step.isComplete
                                  ? "text-[#107c10]"
                                  : "text-[#323130]",
                            )}
                          >
                            {step.label}
                          </p>
                          {step.description && (
                            <p className="text-[10px] text-[#a19f9d] truncate">
                              {step.description}
                            </p>
                          )}
                        </div>
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
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-[#a19f9d]">No steps available</p>
          </div>
        )}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#edebe9] bg-[#faf9f8]">
        <p className="text-xs text-[#605e5c] text-center">
          Stage{" "}
          {workflowStage === "triage"
            ? "1"
            : workflowStage === "fulfillment"
              ? "2"
              : "3"}{" "}
          of 3
        </p>
      </div>
    </div>
  );
}
