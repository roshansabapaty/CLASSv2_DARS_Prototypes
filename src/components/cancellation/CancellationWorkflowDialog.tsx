/**
 * CancellationWorkflowDialog — Step-by-step guided workflow for case cancellation.
 *
 * Triggered when Authorization Desired Status = "Cancelled".
 * Guides users through:
 *  1. Review cancellation scope (which identifiers/services are affected)
 *  2. Block Delivery (prevent data from reaching LE contacts)
 *  3. Set identifier task statuses to "Cancelled"
 *  4. Set Case Status to "Cancelled"
 *
 * Constraints communicated:
 *  - In-flight Collection jobs CANNOT be stopped
 *  - New Collection, Preparation, and Delivery jobs CAN be prevented
 *  - Already-delivered data is irreversible
 */
import React, { useState, useMemo } from "react";
import {
  Ban,
  ShieldBan,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Loader2,
  XCircle,
  ArrowRight,
  CircleDot,
  Info,
  Package,
  Truck,
  Database,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "../ui/utils";
import { CopyableIdentifier } from "../CopyableIdentifier";
import type { AccountIdentifier, TaskStatus } from "../../types/caseTypes";
import { TASK_STATUS_CONFIG } from "../../constants/caseConstants";
import { getServiceDisplayName } from "../../config/microsoftServices";
import {
  CancellationStatusIndicator,
  type CancellationJobState,
} from "./CancellationStatusIndicator";
import { BlockDeliveryPopup } from "./BlockDeliveryPopup";

interface CancellationWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identifiers: AccountIdentifier[];
  caseStage: string;
  deliveryBlocked: boolean;
  onBlockDelivery: () => void;
  onSetIdentifierTaskStatus: (identifierId: string, status: TaskStatus) => void;
  onSetCaseStage: (stage: string) => void;
}

type WorkflowStep = 1 | 2 | 3 | 4;

const STEP_LABELS: Record<WorkflowStep, string> = {
  1: "Review Scope",
  2: "Block Delivery",
  3: "Cancel Identifier Tasks",
  4: "Cancel Case",
};

export function CancellationWorkflowDialog({
  open,
  onOpenChange,
  identifiers,
  caseStage,
  deliveryBlocked,
  onBlockDelivery,
  onSetIdentifierTaskStatus,
  onSetCaseStage,
}: CancellationWorkflowDialogProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
  const [showBlockDeliveryPopup, setShowBlockDeliveryPopup] = useState(false);

  // Compute which identifiers have active/in-progress jobs
  const identifierJobSummary = useMemo(() => {
    return identifiers.map((identifier) => {
      const services = Object.entries(identifier.services)
        .filter(([, svc]) => svc.enabled)
        .map(([key, svc]) => {
          const categories = Object.entries(svc.categoryGroups || {}).flatMap(([gKey, group]: [string, any]) =>
            Object.entries(group || {}).map(([iKey, cat]: [string, any]) => [`${gKey}:${iKey}`, cat])
          ).filter(([, cat]: [string, any]) => cat.enabled)
            .map(([catKey, cat]: [string, any]) => {
              let collectionState: CancellationJobState = "not-started";
              if (cat.collectionStatus === "Complete") collectionState = "completed";
              else if (cat.collectionStatus === "Started") collectionState = "in-progress";
              else if (cat.collectionStatus === "Failed") collectionState = "cancelled";

              let prepState: CancellationJobState = "not-started";
              if (cat.publishStatus === "Complete") prepState = "completed";
              else if (cat.publishStatus === "Started") prepState = "in-progress";

              let deliveryState: CancellationJobState = "not-started";
              if (cat.deliveryStatus === "Complete") deliveryState = "completed";
              else if (cat.deliveryStatus === "Started") deliveryState = "in-progress";

              return {
                key: catKey,
                collectionState,
                prepState,
                deliveryState,
                jobId: cat.jobId,
              };
            });

          const hasInFlightCollection = categories.some(
            (c) => c.collectionState === "in-progress"
          );
          const hasCompletedWork = categories.some(
            (c) =>
              c.collectionState === "completed" ||
              c.prepState === "completed" ||
              c.deliveryState === "completed"
          );

          return {
            key,
            displayName: getServiceDisplayName(key),
            categories,
            hasInFlightCollection,
            hasCompletedWork,
          };
        });

      return {
        identifier,
        services,
        hasInFlightWork: services.some((s) => s.hasInFlightCollection),
        hasCompletedWork: services.some((s) => s.hasCompletedWork),
        taskStatus: identifier.taskStatus,
      };
    });
  }, [identifiers]);

  const allIdentifiersCancelled = identifiers.every(
    (id) => id.taskStatus === "Cancelled"
  );
  const isCaseCancelled = caseStage === "Cancelled";

  // Check step completion
  const stepComplete: Record<WorkflowStep, boolean> = {
    1: true, // Review is always "complete" (read-only)
    2: deliveryBlocked,
    3: allIdentifiersCancelled,
    4: isCaseCancelled,
  };

  const allComplete = Object.values(stepComplete).every(Boolean);

  const totalInFlight = identifierJobSummary.filter(
    (s) => s.hasInFlightWork
  ).length;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#a4262c]">
              <Ban className="w-5 h-5" />
              Case Cancellation Workflow
            </DialogTitle>
            <DialogDescription className="text-[#605e5c]">
              The Authorization Desired Status has been set to{" "}
              <span className="font-semibold text-[#a4262c]">Cancelled</span>.
              Follow the steps below to complete the cancellation process.
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator bar */}
          <div className="flex items-center gap-1 py-3 border-b border-[#e1dfdd]">
            {([1, 2, 3, 4] as WorkflowStep[]).map((step) => (
              <React.Fragment key={step}>
                <button
                  onClick={() => setCurrentStep(step)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    currentStep === step
                      ? "bg-[#deecf9] text-[#0078d4] border border-[#0078d4]"
                      : stepComplete[step]
                        ? "bg-[#dff6dd] text-[#107c10] border border-[#107c10] hover:bg-[#c8edc5]"
                        : "bg-[#f3f2f1] text-[#605e5c] border border-transparent hover:bg-[#e1dfdd]"
                  )}
                >
                  {stepComplete[step] ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-current flex items-center justify-center text-[9px]">
                      {step}
                    </span>
                  )}
                  {STEP_LABELS[step]}
                </button>
                {step < 4 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#c8c6c4] flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Step content */}
          <div className="py-3 space-y-4">
            {/* ─── Step 1: Review Scope ─── */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="bg-[#fde7e9] border border-[#d13438] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#a4262c] flex-shrink-0 mt-0.5" />
                    <div className="text-sm space-y-2">
                      <p className="font-semibold text-[#a4262c]">
                        Important Constraints
                      </p>
                      <ul className="space-y-1.5 text-[#605e5c] list-disc pl-4">
                        <li>
                          <span className="font-semibold text-[#323130]">
                            In-flight Collection jobs cannot be stopped.
                          </span>{" "}
                          Jobs already submitted to the Collection pipeline will
                          continue to completion.
                        </li>
                        <li>
                          New jobs can be{" "}
                          <span className="font-semibold text-[#323130]">
                            prevented from entering Collection, Preparation, and
                            Delivery
                          </span>{" "}
                          by blocking delivery.
                        </li>
                        <li>
                          <span className="font-semibold text-[#323130]">
                            Already-delivered data is irreversible
                          </span>{" "}
                          — data that has been delivered to authorized contacts
                          cannot be recalled.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Identifiers summary */}
                <div>
                  <h4 className="text-sm font-semibold text-[#323130] mb-2">
                    Affected Identifiers ({identifiers.length})
                  </h4>
                  <div className="border border-[#e1dfdd] rounded-lg divide-y divide-[#e1dfdd]">
                    {identifierJobSummary.map((item) => {
                      const statusConfig =
                        TASK_STATUS_CONFIG[item.identifier.taskStatus] ??
                        TASK_STATUS_CONFIG["New"];
                      return (
                        <div
                          key={item.identifier.id}
                          className="px-4 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <CopyableIdentifier
                              value={item.identifier.value}
                              type={item.identifier.type}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {item.hasInFlightWork && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-[#fff4ce] text-[#8a6d3b] border-[#c19c00]"
                              >
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                In-flight jobs
                              </Badge>
                            )}
                            {item.hasCompletedWork && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-[#dff6dd] text-[#107c10] border-[#107c10]"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Completed work
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              style={{
                                backgroundColor: statusConfig.bgColor,
                                color: statusConfig.color,
                                borderColor: statusConfig.borderColor,
                              }}
                            >
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {totalInFlight > 0 && (
                  <div className="bg-[#fff4ce] border border-[#f7dba7] rounded-md p-3 text-xs text-[#8a6d3b] flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <span className="font-semibold">{totalInFlight}</span>{" "}
                      identifier{totalInFlight !== 1 ? "s have" : " has"}{" "}
                      in-flight collection jobs that will continue to
                      completion. Block delivery to prevent these from being
                      delivered.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ─── Step 2: Block Delivery ─── */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#fde7e9] flex items-center justify-center flex-shrink-0">
                    <ShieldBan className="w-5 h-5 text-[#a4262c]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#323130]">
                      Block Delivery to Authorized Contacts
                    </h4>
                    <p className="text-xs text-[#605e5c] mt-1">
                      Blocking delivery ensures that no additional jobs —
                      including any currently in Collection or Preparation — can
                      reach the Delivery stage. This is the most critical step
                      in preventing data from being disclosed.
                    </p>
                  </div>
                </div>

                {/* Pipeline visual */}
                <div className="bg-[#faf9f8] border border-[#e1dfdd] rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-medium text-[#605e5c] uppercase tracking-wide">
                      Pipeline Stages
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-center">
                      <div className="w-full bg-[#fff4ce] border border-[#c19c00] rounded-md p-2.5">
                        <Database className="w-4 h-4 text-[#8a6d3b] mx-auto mb-1" />
                        <p className="text-xs font-semibold text-[#8a6d3b]">
                          Collection
                        </p>
                        <p className="text-[10px] text-[#8a6d3b] mt-0.5">
                          Cannot stop in-flight
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#c8c6c4] flex-shrink-0" />
                    <div className="flex-1 text-center">
                      <div
                        className={cn(
                          "w-full border rounded-md p-2.5",
                          deliveryBlocked
                            ? "bg-[#fde7e9] border-[#d13438]"
                            : "bg-white border-[#e1dfdd]"
                        )}
                      >
                        <Package className="w-4 h-4 text-[#605e5c] mx-auto mb-1" />
                        <p className="text-xs font-semibold text-[#605e5c]">
                          Preparation
                        </p>
                        <p className="text-[10px] text-[#605e5c] mt-0.5">
                          {deliveryBlocked ? "Blocked" : "Can be blocked"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#c8c6c4] flex-shrink-0" />
                    <div className="flex-1 text-center">
                      <div
                        className={cn(
                          "w-full border rounded-md p-2.5",
                          deliveryBlocked
                            ? "bg-[#fde7e9] border-[#d13438]"
                            : "bg-white border-[#e1dfdd]"
                        )}
                      >
                        <Truck className="w-4 h-4 text-[#605e5c] mx-auto mb-1" />
                        <p className="text-xs font-semibold text-[#605e5c]">
                          Delivery
                        </p>
                        <p className="text-[10px] text-[#605e5c] mt-0.5">
                          {deliveryBlocked ? "Blocked" : "Can be blocked"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {deliveryBlocked ? (
                  <div className="flex items-center gap-3 bg-[#dff6dd] border border-[#107c10] rounded-lg px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 text-[#107c10] flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-[#107c10]">
                        Delivery is blocked.
                      </span>
                      <span className="text-sm text-[#605e5c] ml-2">
                        No pending or new jobs will be delivered.
                      </span>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full bg-[#a4262c] hover:bg-[#8a2121] text-white"
                    onClick={() => setShowBlockDeliveryPopup(true)}
                  >
                    <ShieldBan className="w-4 h-4 mr-2" />
                    Block Delivery Now
                  </Button>
                )}
              </div>
            )}

            {/* ─── Step 3: Cancel Identifier Tasks ─── */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#f3f2f1] flex items-center justify-center flex-shrink-0">
                    <Ban className="w-5 h-5 text-[#605e5c]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#323130]">
                      Set Identifier Task Status to Cancelled
                    </h4>
                    <p className="text-xs text-[#605e5c] mt-1">
                      Each identifier's Target Task Status must be explicitly
                      set to "Cancelled" to record that the work was halted.
                      This provides a clear audit trail of what was prevented.
                    </p>
                  </div>
                </div>

                <div className="border border-[#e1dfdd] rounded-lg divide-y divide-[#e1dfdd]">
                  {identifierJobSummary.map((item) => {
                    const isCancelled =
                      item.identifier.taskStatus === "Cancelled";
                    const statusConfig =
                      TASK_STATUS_CONFIG[item.identifier.taskStatus] ??
                      TASK_STATUS_CONFIG["New"];

                    return (
                      <div
                        key={item.identifier.id}
                        className={cn(
                          "px-4 py-3 flex items-center justify-between transition-colors",
                          isCancelled && "bg-[#faf9f8]"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CopyableIdentifier
                            value={item.identifier.value}
                            type={item.identifier.type}
                          />
                          <Badge
                            variant="outline"
                            className="text-[10px] flex-shrink-0"
                            style={{
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.color,
                              borderColor: statusConfig.borderColor,
                            }}
                          >
                            {statusConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.hasCompletedWork && (
                            <span className="text-[10px] text-[#107c10] font-medium">
                              Has completed work
                            </span>
                          )}
                          {isCancelled ? (
                            <Badge
                              variant="outline"
                              className="bg-[#dff6dd] text-[#107c10] border-[#107c10] text-xs"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Done
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-[#a4262c] text-[#a4262c] hover:bg-[#fde7e9]"
                              onClick={() =>
                                onSetIdentifierTaskStatus(
                                  item.identifier.id,
                                  "Cancelled"
                                )
                              }
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Cancel Task
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!allIdentifiersCancelled && (
                  <Button
                    variant="outline"
                    className="w-full border-[#a4262c] text-[#a4262c] hover:bg-[#fde7e9]"
                    onClick={() => {
                      identifiers.forEach((id) => {
                        if (id.taskStatus !== "Cancelled") {
                          onSetIdentifierTaskStatus(id.id, "Cancelled");
                        }
                      });
                    }}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Cancel All Identifier Tasks
                  </Button>
                )}

                {allIdentifiersCancelled && (
                  <div className="flex items-center gap-3 bg-[#dff6dd] border border-[#107c10] rounded-lg px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 text-[#107c10] flex-shrink-0" />
                    <span className="text-sm font-semibold text-[#107c10]">
                      All identifier tasks have been cancelled.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ─── Step 4: Cancel Case ─── */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#fde7e9] flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-5 h-5 text-[#a4262c]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#323130]">
                      Set Case Status to Cancelled
                    </h4>
                    <p className="text-xs text-[#605e5c] mt-1">
                      This is the final step. Setting the case status to
                      "Cancelled" records the official cancellation of the
                      authorization and closes the case workflow.
                    </p>
                  </div>
                </div>

                {/* Prerequisites check */}
                <div className="bg-[#faf9f8] border border-[#e1dfdd] rounded-lg p-4 space-y-3">
                  <h5 className="text-xs font-semibold text-[#323130] uppercase tracking-wide">
                    Prerequisites
                  </h5>
                  <div className="space-y-2">
                    <PrerequisiteRow
                      label="Delivery blocked"
                      complete={deliveryBlocked}
                    />
                    <PrerequisiteRow
                      label="All identifier tasks cancelled"
                      complete={allIdentifiersCancelled}
                      note={
                        !allIdentifiersCancelled
                          ? "Will be set automatically when you cancel the case"
                          : undefined
                      }
                    />
                  </div>
                </div>

                {!allIdentifiersCancelled && !isCaseCancelled && (
                  <div className="bg-[#fff4ce] border border-[#f7dba7] rounded-md p-3 text-xs text-[#8a6d3b] flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      <span className="font-semibold">
                        {identifiers.filter((id) => id.taskStatus !== "Cancelled").length}
                      </span>{" "}
                      identifier task{identifiers.filter((id) => id.taskStatus !== "Cancelled").length !== 1 ? "s are" : " is"}{" "}
                      not yet cancelled. Cancelling the case will automatically
                      set all remaining identifier task statuses to "Cancelled."
                    </span>
                  </div>
                )}

                {isCaseCancelled ? (
                  <div className="flex items-center gap-3 bg-[#dff6dd] border border-[#107c10] rounded-lg px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 text-[#107c10] flex-shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-[#107c10]">
                        Case has been cancelled.
                      </span>
                      <span className="text-sm text-[#605e5c] ml-2">
                        All cancellation steps are complete.
                      </span>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full bg-[#a4262c] hover:bg-[#8a2121] text-white"
                    disabled={!deliveryBlocked}
                    onClick={() => {
                      // Auto-cancel all identifier tasks that aren't already cancelled
                      identifiers.forEach((id) => {
                        if (id.taskStatus !== "Cancelled") {
                          onSetIdentifierTaskStatus(id.id, "Cancelled");
                        }
                      });
                      onSetCaseStage("Cancelled");
                    }}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    {allIdentifiersCancelled
                      ? "Set Case Status to Cancelled"
                      : "Cancel All Tasks & Set Case Status to Cancelled"}
                  </Button>
                )}

                {!deliveryBlocked && !isCaseCancelled && (
                  <p className="text-xs text-[#a4262c]">
                    You must block delivery before setting the case status to
                    cancelled.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Navigation footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#e1dfdd]">
            <div className="text-xs text-[#605e5c]">
              {allComplete ? (
                <span className="text-[#107c10] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All steps complete
                </span>
              ) : (
                <span>
                  Step {currentStep} of 4
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentStep(
                      (currentStep - 1) as WorkflowStep
                    )
                  }
                >
                  Previous
                </Button>
              )}
              {currentStep < 4 ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setCurrentStep(
                      (currentStep + 1) as WorkflowStep
                    )
                  }
                  className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {allComplete ? "Done" : "Close"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block delivery sub-dialog */}
      <BlockDeliveryPopup
        open={showBlockDeliveryPopup}
        onOpenChange={setShowBlockDeliveryPopup}
        onConfirm={onBlockDelivery}
        isCancellationContext
      />
    </>
  );
}

function PrerequisiteRow({
  label,
  complete,
  note,
}: {
  label: string;
  complete: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {complete ? (
        <CheckCircle2 className="w-4 h-4 text-[#107c10]" />
      ) : (
        <CircleDot className="w-4 h-4 text-[#c8c6c4]" />
      )}
      <span
        className={cn(
          "text-sm",
          complete ? "text-[#107c10] font-medium" : "text-[#605e5c]"
        )}
      >
        {label}
      </span>
      {note && (
        <span className="text-[#8a6d3b] text-[10px] font-medium">
          ({note})
        </span>
      )}
    </div>
  );
}