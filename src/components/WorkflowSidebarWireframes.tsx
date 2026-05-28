import React from "react";
import { Check, ListChecks, ClipboardList, Database, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./ui/utils";

interface WireframeScenario {
  title: string;
  description: string;
  isCollapsed: boolean;
  workflowStage: "triage" | "fulfillment" | "collection";
  stageCompletion: {
    triage: boolean;
    fulfillment: boolean;
    collection: boolean;
  };
  showTooltip?: boolean;
  tooltipStage?: "triage" | "fulfillment" | "collection";
}

const scenarios: WireframeScenario[] = [
  {
    title: "Expanded - Triage Active",
    description: "User starts new case review, triage stage in progress",
    isCollapsed: false,
    workflowStage: "triage",
    stageCompletion: { triage: false, fulfillment: false, collection: false },
  },
  {
    title: "Expanded - Fulfillment Active",
    description: "Triage complete, user selecting data for fulfillment",
    isCollapsed: false,
    workflowStage: "fulfillment",
    stageCompletion: { triage: true, fulfillment: false, collection: false },
  },
  {
    title: "Expanded - Collection Active",
    description: "All stages unlocked, tracking job submission",
    isCollapsed: false,
    workflowStage: "collection",
    stageCompletion: { triage: true, fulfillment: true, collection: false },
  },
  {
    title: "Collapsed - Triage Active",
    description: "Icon-only view with triage in progress",
    isCollapsed: true,
    workflowStage: "triage",
    stageCompletion: { triage: false, fulfillment: false, collection: false },
  },
  {
    title: "Collapsed - Fulfillment Active",
    description: "Compact view showing fulfillment stage progress",
    isCollapsed: true,
    workflowStage: "fulfillment",
    stageCompletion: { triage: true, fulfillment: false, collection: false },
  },
  {
    title: "Collapsed - Collection Active",
    description: "Minimal sidebar with all stages complete",
    isCollapsed: true,
    workflowStage: "collection",
    stageCompletion: { triage: true, fulfillment: true, collection: false },
  },
  {
    title: "Collapsed with Tooltip",
    description: "User hovers over fulfillment stage icon",
    isCollapsed: true,
    workflowStage: "triage",
    stageCompletion: { triage: true, fulfillment: false, collection: false },
    showTooltip: true,
    tooltipStage: "fulfillment",
  },
  {
    title: "Expanded - All Complete",
    description: "All workflow stages completed successfully",
    isCollapsed: false,
    workflowStage: "collection",
    stageCompletion: { triage: true, fulfillment: true, collection: true },
  },
];

function SidebarWireframe({ scenario }: { scenario: WireframeScenario }) {
  const { isCollapsed, workflowStage, stageCompletion, showTooltip, tooltipStage } = scenario;

  const getStageIcon = (stage: "triage" | "fulfillment" | "collection", isComplete: boolean) => {
    if (isComplete) {
      return <Check className="w-4 h-4 text-white" strokeWidth={3} />;
    }
    if (stage === "triage") return <ListChecks className="w-4 h-4 text-white" />;
    if (stage === "fulfillment") return <ClipboardList className="w-4 h-4 text-white" />;
    return <Database className="w-4 h-4 text-white" />;
  };

  const getStageStatus = (stage: "triage" | "fulfillment" | "collection") => {
    if (workflowStage === stage) return "In progress";
    if (stageCompletion[stage]) return "Complete";
    if (stage === "fulfillment" && stageCompletion.triage) return "Select data";
    if (stage === "collection" && stageCompletion.fulfillment) return "View progress";
    return "Not available";
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "bg-white border-2 border-[#edebe9] flex flex-col",
          isCollapsed ? "w-16" : "w-64"
        )}
        style={{ height: "400px" }}
      >
        {/* Toggle Button */}
        <div
          className={cn(
            "border-b border-[#edebe9] flex items-center bg-white",
            isCollapsed ? "justify-center py-3" : "justify-end p-3"
          )}
        >
          <button type="button" className="p-1.5 hover:bg-[#f3f2f1] rounded transition-colors">
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[#605e5c]" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-[#605e5c]" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 pt-5 overflow-hidden">
          <div className={cn("space-y-0.5", isCollapsed ? "px-1" : "px-2")}>
            {/* Triage */}
            <button
              className={cn(
                "w-full flex items-center rounded-md transition-all text-left relative",
                isCollapsed ? "justify-center py-2" : "gap-3 px-3 py-3",
                workflowStage === "triage"
                  ? "bg-[#deecf9] border-l-4 border-l-[#0078d4] shadow-sm"
                  : "hover:bg-[#f3f2f1]"
              )}
            >
              {stageCompletion.triage ? (
                <div className="w-8 h-8 rounded-full bg-[#107c10] flex items-center justify-center flex-shrink-0">
                  {getStageIcon("triage", true)}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#0078d4] flex items-center justify-center flex-shrink-0">
                  {getStageIcon("triage", false)}
                </div>
              )}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      workflowStage === "triage"
                        ? "text-[#0078d4]"
                        : stageCompletion.triage
                        ? "text-[#107c10]"
                        : "text-[#323130]"
                    )}
                  >
                    Triage
                  </p>
                  <p className="text-xs text-[#605e5c]">{getStageStatus("triage")}</p>
                </div>
              )}
              {showTooltip && isCollapsed && tooltipStage === "triage" && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#323130] text-white px-3 py-2 rounded shadow-lg whitespace-nowrap z-50">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#323130] rotate-45"></div>
                  <p className="font-semibold text-sm">Triage</p>
                  <p className="text-xs opacity-90">{getStageStatus("triage")}</p>
                </div>
              )}
            </button>

            {/* Connecting Line */}
            {!isCollapsed && (
              <div className="pl-7 py-1">
                <div
                  className={cn(
                    "w-0.5 h-6 ml-0.5",
                    stageCompletion.triage ? "bg-[#107c10]" : "bg-[#e1dfdd]"
                  )}
                ></div>
              </div>
            )}

            {/* Fulfillment */}
            <button
              disabled={!stageCompletion.triage && workflowStage !== "fulfillment"}
              className={cn(
                "w-full flex items-center rounded-md transition-all text-left relative",
                isCollapsed ? "justify-center py-2" : "gap-3 px-3 py-3",
                workflowStage === "fulfillment"
                  ? "bg-[#deecf9] border-l-4 border-l-[#0078d4] shadow-sm"
                  : stageCompletion.triage
                  ? "hover:bg-[#f3f2f1]"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              {stageCompletion.fulfillment ? (
                <div className="w-8 h-8 rounded-full bg-[#107c10] flex items-center justify-center flex-shrink-0">
                  {getStageIcon("fulfillment", true)}
                </div>
              ) : workflowStage === "fulfillment" ? (
                <div className="w-8 h-8 rounded-full bg-[#0078d4] flex items-center justify-center flex-shrink-0">
                  {getStageIcon("fulfillment", false)}
                </div>
              ) : (
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0",
                    stageCompletion.triage
                      ? "bg-[#edebe9] border-[#c8c6c4]"
                      : "bg-[#f3f2f1] border-[#e1dfdd]"
                  )}
                >
                  <ClipboardList
                    className={cn(
                      "w-4 h-4",
                      stageCompletion.triage ? "text-[#605e5c]" : "text-[#a19f9d]"
                    )}
                  />
                </div>
              )}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      workflowStage === "fulfillment"
                        ? "text-[#0078d4]"
                        : stageCompletion.fulfillment
                        ? "text-[#107c10]"
                        : stageCompletion.triage
                        ? "text-[#323130]"
                        : "text-[#a19f9d]"
                    )}
                  >
                    Review Case
                  </p>
                  <p className="text-xs text-[#605e5c]">{getStageStatus("fulfillment")}</p>
                </div>
              )}
              {showTooltip && isCollapsed && tooltipStage === "fulfillment" && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#323130] text-white px-3 py-2 rounded shadow-lg whitespace-nowrap z-50">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#323130] rotate-45"></div>
                  <p className="font-semibold text-sm">Review Case</p>
                  <p className="text-xs opacity-90">{getStageStatus("fulfillment")}</p>
                </div>
              )}
            </button>

            {/* Connecting Line */}
            {!isCollapsed && (
              <div className="pl-7 py-1">
                <div
                  className={cn(
                    "w-0.5 h-6 ml-0.5",
                    stageCompletion.fulfillment ? "bg-[#107c10]" : "bg-[#e1dfdd]"
                  )}
                ></div>
              </div>
            )}

            {/* Collection */}
            <button
              disabled={!stageCompletion.fulfillment && workflowStage !== "collection"}
              className={cn(
                "w-full flex items-center rounded-md transition-all text-left relative",
                isCollapsed ? "justify-center py-2" : "gap-3 px-3 py-3",
                workflowStage === "collection"
                  ? "bg-[#deecf9] border-l-4 border-l-[#0078d4] shadow-sm"
                  : stageCompletion.fulfillment
                  ? "hover:bg-[#f3f2f1]"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  workflowStage === "collection"
                    ? "bg-[#0078d4]"
                    : stageCompletion.fulfillment
                    ? "bg-[#edebe9] border border-[#c8c6c4]"
                    : "bg-[#f3f2f1] border border-[#e1dfdd]"
                )}
              >
                <Database
                  className={cn(
                    "w-4 h-4",
                    workflowStage === "collection"
                      ? "text-white"
                      : stageCompletion.fulfillment
                      ? "text-[#605e5c]"
                      : "text-[#a19f9d]"
                  )}
                />
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      workflowStage === "collection"
                        ? "text-[#0078d4]"
                        : stageCompletion.fulfillment
                        ? "text-[#323130]"
                        : "text-[#a19f9d]"
                    )}
                  >
                    Collection
                  </p>
                  <p className="text-xs text-[#605e5c]">{getStageStatus("collection")}</p>
                </div>
              )}
              {showTooltip && isCollapsed && tooltipStage === "collection" && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#323130] text-white px-3 py-2 rounded shadow-lg whitespace-nowrap z-50">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-[#323130] rotate-45"></div>
                  <p className="font-semibold text-sm">Collection</p>
                  <p className="text-xs opacity-90">{getStageStatus("collection")}</p>
                </div>
              )}
            </button>
          </div>
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-[#edebe9] bg-[#faf9f8]">
            <p className="text-xs text-[#605e5c] text-center">
              Stage{" "}
              {workflowStage === "triage" ? "1" : workflowStage === "fulfillment" ? "2" : "3"} of 3
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface WorkflowSidebarWireframesProps {
  onClose?: () => void;
}

export function WorkflowSidebarWireframes({ onClose }: WorkflowSidebarWireframesProps = {}) {
  return (
    <div className="min-h-screen bg-[#faf9f8] p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#323130] mb-2">
            Workflow Sidebar - All Scenarios
          </h1>
          <p className="text-[#605e5c] text-lg">
            Comprehensive wireframe reference showing all possible states of the collapsible workflow
            navigation sidebar
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wireframes"
            className="h-9 w-9 flex items-center justify-center rounded text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130] flex-shrink-0"
          >
            <span aria-hidden="true" className="text-2xl leading-none">×</span>
          </button>
        )}
      </div>

      {/* Wireframe Grid */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {scenarios.map((scenario, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 border border-[#edebe9]">
              {/* Scenario Info */}
              <div className="mb-4">
                <h3 className="font-semibold text-[#323130] text-base mb-1">{scenario.title}</h3>
                <p className="text-sm text-[#605e5c] mb-3">{scenario.description}</p>
                
                {/* Metadata Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-[#f3f2f1] text-[#323130] text-xs rounded">
                    {scenario.isCollapsed ? "Collapsed (64px)" : "Expanded (256px)"}
                  </span>
                  <span className="px-2 py-0.5 bg-[#deecf9] text-[#0078d4] text-xs rounded font-medium">
                    {scenario.workflowStage.charAt(0).toUpperCase() + scenario.workflowStage.slice(1)}
                  </span>
                </div>

                {/* Completion Status */}
                <div className="text-xs text-[#605e5c] space-y-1">
                  <div className="flex items-center gap-2">
                    {scenario.stageCompletion.triage ? (
                      <Check className="w-3 h-3 text-[#107c10]" strokeWidth={3} />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-[#e1dfdd]" />
                    )}
                    <span>Triage {scenario.stageCompletion.triage ? "Complete" : "Incomplete"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {scenario.stageCompletion.fulfillment ? (
                      <Check className="w-3 h-3 text-[#107c10]" strokeWidth={3} />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-[#e1dfdd]" />
                    )}
                    <span>Fulfillment {scenario.stageCompletion.fulfillment ? "Complete" : "Incomplete"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {scenario.stageCompletion.collection ? (
                      <Check className="w-3 h-3 text-[#107c10]" strokeWidth={3} />
                    ) : (
                      <div className="w-3 h-3 rounded-full border border-[#e1dfdd]" />
                    )}
                    <span>Collection {scenario.stageCompletion.collection ? "Complete" : "Incomplete"}</span>
                  </div>
                </div>
              </div>

              {/* Wireframe Preview */}
              <div className="flex justify-center">
                <SidebarWireframe scenario={scenario} />
              </div>

              {/* Additional Notes */}
              {scenario.showTooltip && (
                <div className="mt-3 p-2 bg-[#fff4ce] border border-[#8a6d3b] rounded text-xs text-[#323130]">
                  <strong>Note:</strong> Tooltip appears on hover in collapsed state
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Design Specifications */}
      <div className="max-w-7xl mx-auto mt-12 bg-white rounded-lg shadow-md p-8 border border-[#edebe9]">
        <h2 className="text-2xl font-bold text-[#323130] mb-6">Design Specifications</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Dimensions */}
          <div>
            <h3 className="font-semibold text-[#323130] mb-3 text-lg">Dimensions</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[#edebe9]">
                <span className="text-[#605e5c]">Expanded Width:</span>
                <code className="bg-[#f3f2f1] px-2 py-1 rounded">256px (w-64)</code>
              </div>
              <div className="flex justify-between py-2 border-b border-[#edebe9]">
                <span className="text-[#605e5c]">Collapsed Width:</span>
                <code className="bg-[#f3f2f1] px-2 py-1 rounded">64px (w-16)</code>
              </div>
              <div className="flex justify-between py-2 border-b border-[#edebe9]">
                <span className="text-[#605e5c]">Icon Size:</span>
                <code className="bg-[#f3f2f1] px-2 py-1 rounded">32px (w-8 h-8)</code>
              </div>
              <div className="flex justify-between py-2 border-b border-[#edebe9]">
                <span className="text-[#605e5c]">Transition Duration:</span>
                <code className="bg-[#f3f2f1] px-2 py-1 rounded">300ms</code>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div>
            <h3 className="font-semibold text-[#323130] mb-3 text-lg">Fluent UI Colors</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-[#edebe9]">
                <span className="text-[#605e5c]">Primary Blue:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#0078d4]" />
                  <code className="bg-[#f3f2f1] px-2 py-1 rounded">#0078d4</code>
                </div>
              </div>
              <div className="flex justify-between py-2 border-b border-[#edebe9]">
                <span className="text-[#605e5c]">Success Green:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#107c10]" />
                  <code className="bg-[#f3f2f1] px-2 py-1 rounded">#107c10</code>
                </div>
              </div>
              <div className="flex justify-between py-2 border-b border-[#edebe9]">
                <span className="text-[#605e5c]">Active Background:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#deecf9] border border-[#edebe9]" />
                  <code className="bg-[#f3f2f1] px-2 py-1 rounded">#deecf9</code>
                </div>
              </div>
              <div className="flex justify-between py-2 border-b border-[#edebe9]">
                <span className="text-[#605e5c]">Hover Background:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#f3f2f1] border border-[#edebe9]" />
                  <code className="bg-[#f3f2f1] px-2 py-1 rounded">#f3f2f1</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interaction States */}
        <div className="mt-8">
          <h3 className="font-semibold text-[#323130] mb-3 text-lg">Interaction States</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#f3f2f1] rounded">
              <h4 className="font-semibold text-sm text-[#323130] mb-2">Active Stage</h4>
              <ul className="text-xs text-[#605e5c] space-y-1">
                <li>• Blue background (#deecf9)</li>
                <li>• Blue left border (4px)</li>
                <li>• Blue icon circle</li>
                <li>• Shadow effect</li>
              </ul>
            </div>
            <div className="p-4 bg-[#f3f2f1] rounded">
              <h4 className="font-semibold text-sm text-[#323130] mb-2">Completed Stage</h4>
              <ul className="text-xs text-[#605e5c] space-y-1">
                <li>• Green icon circle (#107c10)</li>
                <li>• White checkmark</li>
                <li>• Green text for title</li>
                <li>• Clickable when not active</li>
              </ul>
            </div>
            <div className="p-4 bg-[#f3f2f1] rounded">
              <h4 className="font-semibold text-sm text-[#323130] mb-2">Disabled Stage</h4>
              <ul className="text-xs text-[#605e5c] space-y-1">
                <li>• 50% opacity</li>
                <li>• Gray icon circle</li>
                <li>• Not clickable</li>
                <li>• Gray text</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Accessibility */}
        <div className="mt-8">
          <h3 className="font-semibold text-[#323130] mb-3 text-lg">Accessibility Features</h3>
          <ul className="space-y-2 text-sm text-[#605e5c]">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#107c10] mt-0.5 flex-shrink-0" />
              <span><strong>Keyboard Navigation:</strong> Full keyboard support with focus indicators</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#107c10] mt-0.5 flex-shrink-0" />
              <span><strong>ARIA Labels:</strong> Toggle button includes descriptive aria-label</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#107c10] mt-0.5 flex-shrink-0" />
              <span><strong>Tooltips:</strong> Rich tooltips in collapsed state provide full context</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#107c10] mt-0.5 flex-shrink-0" />
              <span><strong>Visual States:</strong> Clear visual distinction between active, complete, and disabled states</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#107c10] mt-0.5 flex-shrink-0" />
              <span><strong>Color + Icons:</strong> Never relying on color alone - icons reinforce meaning</span>
            </li>
          </ul>
        </div>

        {/* User Behaviors */}
        <div className="mt-8">
          <h3 className="font-semibold text-[#323130] mb-3 text-lg">User Behaviors</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 border border-[#edebe9] rounded">
              <h4 className="font-semibold text-sm text-[#0078d4] mb-2">✓ Can Do</h4>
              <ul className="text-xs text-[#605e5c] space-y-1">
                <li>• Toggle sidebar expand/collapse at any time</li>
                <li>• Navigate to completed stages</li>
                <li>• Hover collapsed icons for details</li>
                <li>• View current progress in footer</li>
              </ul>
            </div>
            <div className="p-4 border border-[#edebe9] rounded">
              <h4 className="font-semibold text-sm text-[#a4262c] mb-2">✗ Cannot Do</h4>
              <ul className="text-xs text-[#605e5c] space-y-1">
                <li>• Cannot skip to locked stages</li>
                <li>• Cannot navigate away from active stage to itself</li>
                <li>• Cannot resize sidebar beyond two fixed widths</li>
                <li>• Cannot complete stages out of order</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
