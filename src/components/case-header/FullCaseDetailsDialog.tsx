/**
 * FullCaseDetailsDialog — opt-in deep view of every case-summary field.
 *
 * Triggered by the "Full details" button in `CaseHeaderSummary`. The dialog
 * body is the existing `CaseSummaryCard` render (case ID + priority + crimes
 * + status + due date in Row 1, then a 4-col property grid in Row 2 and an
 * extended-properties grid in Row 3). Read-only — every field has an edit
 * path elsewhere (sticky-header chips, form sections), this is a scan
 * surface only.
 *
 * Mounted alongside the workflow banner + case-header summary in
 * `StickyCaseHeader`. State ownership lives in `StickyCaseHeader` so the
 * trigger button (inside `CaseHeaderSummary`) and the dialog don't need
 * sibling context.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { CaseSummaryCard } from "../CaseSummaryCard";
import type { FormData } from "../../types/caseTypes";

export interface FullCaseDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
}

export function FullCaseDetailsDialog({
  open,
  onOpenChange,
  formData,
}: FullCaseDetailsDialogProps) {
  const caseIdLabel = formData.caseNumber || formData.caseId || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Wider than the default to fit the 4-col grid without wrapping; tall
        // enough to scroll on smaller viewports without clipping content.
        className="sm:max-w-[720px] max-h-[80vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Full case details · {caseIdLabel}</DialogTitle>
          <DialogDescription>
            Read-only snapshot of the case metadata. Edits happen on the case
            form sections or the action chips in the sticky header.
          </DialogDescription>
        </DialogHeader>

        {/* CaseSummaryCard already provides the full grid. Rendered inline so
            the dialog inherits the card's responsive 4-col layout for free. */}
        <CaseSummaryCard formData={formData} />
      </DialogContent>
    </Dialog>
  );
}
