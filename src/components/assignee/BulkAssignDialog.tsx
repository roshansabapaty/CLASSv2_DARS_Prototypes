/**
 * BulkAssignDialog — Surface E of the AssignedTo migration.
 *
 * Opens from the queue's bulk-actions toolbar when ≥1 cases are selected.
 * Shows:
 *   - A summary of the selected cases (case ID + current assignee), broken
 *     down by current-assignment state so the user can sanity-check the
 *     batch before committing.
 *   - The shared <AssigneePicker /> at the top to choose a target RS.
 *   - "Apply to N cases" primary action that fans the choice out across
 *     every selected case via the caller's `onApply` callback.
 *
 * Idempotent: cases already assigned to the chosen RS are listed under a
 * "No change" group and skipped on commit. Cases newly assigned, reassigned,
 * or unassigned land in the corresponding groups.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Users } from "lucide-react";
import { AssigneePicker } from "./AssigneePicker";

export interface BulkAssignDialogCase {
  caseId: string;
  currentAssignee?: string;
}

export interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cases to act on. Order is preserved in the preview list. */
  cases: BulkAssignDialogCase[];
  /** Specialist directory for the inner picker. */
  specialists: string[];
  /** Signed-in user — drives the picker's "Assign to me" shortcut. */
  currentUser?: string;
  /** Caller commits the batch. `next === ""` clears every assignment. */
  onApply: (next: string, targetIds: string[]) => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  cases,
  specialists,
  currentUser,
  onApply,
}: BulkAssignDialogProps) {
  const [target, setTarget] = React.useState<string | undefined>(undefined);

  // Reset target whenever the dialog opens so the preview starts clean.
  React.useEffect(() => {
    if (open) setTarget(undefined);
  }, [open]);

  const normalizedTarget = (target ?? "").trim();
  const hasTarget = !!normalizedTarget;

  // Partition the selected cases into three groups based on what will happen
  // to them when the user hits Apply. Empty target → all cases get cleared.
  const grouped = React.useMemo(() => {
    const noChange: BulkAssignDialogCase[] = [];
    const willAssign: BulkAssignDialogCase[] = [];
    const willReassign: BulkAssignDialogCase[] = [];
    const willClear: BulkAssignDialogCase[] = [];
    for (const c of cases) {
      const cur = (c.currentAssignee ?? "").trim();
      if (!hasTarget) {
        // Clearing — only cases that currently have someone change.
        if (cur) willClear.push(c);
        else noChange.push(c);
        continue;
      }
      if (cur === normalizedTarget) {
        noChange.push(c);
      } else if (!cur) {
        willAssign.push(c);
      } else {
        willReassign.push(c);
      }
    }
    return { noChange, willAssign, willReassign, willClear };
  }, [cases, normalizedTarget, hasTarget]);

  const changeCount =
    grouped.willAssign.length +
    grouped.willReassign.length +
    grouped.willClear.length;

  const applyDisabled = target === undefined || changeCount === 0;

  const handleApply = () => {
    if (applyDisabled) return;
    // Cases skipped (no-change) are filtered out so the audit trail records
    // only real reassignments. The hook's per-case toast is suppressed by the
    // caller (it shows a single batch toast instead) — see CaseQueue wiring.
    const targetIds = [
      ...grouped.willAssign,
      ...grouped.willReassign,
      ...grouped.willClear,
    ].map((c) => c.caseId);
    onApply(normalizedTarget, targetIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0078d4]" />
            Reassign {cases.length} case{cases.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Pick a Response Specialist below. Selected cases already assigned
            to the chosen specialist are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Picker — shared with every other assignment surface so the
              keyboard model and "Assign to me" shortcut are consistent. */}
          <div className="border border-[#edebe9] rounded-md overflow-hidden">
            <AssigneePicker
              specialists={specialists}
              value={target}
              currentUser={currentUser}
              onPick={(name) => setTarget(name)}
              onClear={() => setTarget("")}
              className="w-full"
            />
          </div>

          {/* Preview — three sub-lists for the post-commit grouping. */}
          <div className="space-y-3">
            {hasTarget && grouped.willReassign.length > 0 && (
              <PreviewGroup
                label={`Will reassign to ${normalizedTarget}`}
                tone="brand"
                cases={grouped.willReassign}
              />
            )}
            {hasTarget && grouped.willAssign.length > 0 && (
              <PreviewGroup
                label={`Will assign to ${normalizedTarget}`}
                tone="brand"
                cases={grouped.willAssign}
              />
            )}
            {!hasTarget && target === "" && grouped.willClear.length > 0 && (
              <PreviewGroup
                label="Will clear the assignment"
                tone="warning"
                cases={grouped.willClear}
              />
            )}
            {grouped.noChange.length > 0 && (
              <PreviewGroup
                label={
                  hasTarget
                    ? `No change (already assigned to ${normalizedTarget})`
                    : "No change (already unassigned)"
                }
                tone="muted"
                cases={grouped.noChange}
              />
            )}
            {target === undefined && (
              <p className="text-xs text-[#605e5c] italic">
                Pick a specialist to see a preview of the batch.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={applyDisabled}
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white"
          >
            {target === ""
              ? `Clear ${changeCount} case${changeCount === 1 ? "" : "s"}`
              : `Apply to ${changeCount} case${changeCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PreviewGroupProps {
  label: string;
  tone: "brand" | "warning" | "muted";
  cases: BulkAssignDialogCase[];
}

function PreviewGroup({ label, tone, cases }: PreviewGroupProps) {
  const toneClasses =
    tone === "brand"
      ? "border-[#0078d4]/40 bg-[#f3f9fd]"
      : tone === "warning"
        ? "border-[#ca5010]/40 bg-[#fef9f5]"
        : "border-[#edebe9] bg-[#faf9f8]";
  return (
    <div className={`rounded-md border ${toneClasses} p-3`}>
      <div className="text-xs font-semibold text-[#323130] mb-2">
        {label} ({cases.length})
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {cases.map((c) => (
          <li key={c.caseId}>
            <Badge
              variant="outline"
              className="text-[11px] font-mono bg-white"
              title={
                c.currentAssignee
                  ? `Currently assigned to ${c.currentAssignee}`
                  : "Currently unassigned"
              }
            >
              {c.caseId}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
