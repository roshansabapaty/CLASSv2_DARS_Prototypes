/**
 * ResolveCaseDialog — shared, enum-backed Resolve Case flow.
 *
 * Used from the collection-page resolve bar, the case-header Resolve /
 * Edit-resolution split button, the AuthorizationStatusBanner secondary
 * CTA, and any future entry. Single source of truth for the picker so
 * adding a new reason in caseConstants flows everywhere.
 *
 * Mode:
 *  - "resolve" (default) — title reads "Resolve Case"; submit "Resolve Case".
 *  - "edit" — title reads "Edit resolution"; submit "Save changes".
 *
 * No-preselect: when `defaultReason` is omitted, the picker opens with
 * nothing selected and the submit button is disabled until the RS picks
 * a reason. When provided, the dialog prefills (used by the collection
 * bar's contextual defaults and the edit-mode flow).
 */

import * as React from "react";
import { Textarea } from "@fluentui/react-components";
import { CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  RESOLUTION_REASON_META,
  RESOLUTION_REASON_ORDER,
} from "../../constants/caseConstants";
import type { ResolutionReason } from "../../types/caseTypes";

export interface ResolveCasePipelineSummary {
  /** "X / Y" — collected jobs over total category jobs. */
  collection: { numerator: number; denominator: number };
  /** "X / Y" — packaged jobs over publish-submitted. */
  packaged: { numerator: number; denominator: number };
  /** "X / Y" — delivered jobs over packaged. */
  delivered: { numerator: number; delivered?: number; denominator: number };
}

export type ResolveCaseDialogMode = "resolve" | "edit";

export interface ResolveCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  /** Reason pre-selected when dialog opens. Omit for "no preselect" — the
   *  picker opens empty and submit is disabled until the RS picks. */
  defaultReason?: ResolutionReason;
  /** Initial notes value (used in edit mode to prefill the previous notes). */
  defaultNotes?: string;
  /** "resolve" (default) or "edit". Edit mode changes the title + submit copy. */
  mode?: ResolveCaseDialogMode;
  /** Optional 3-stat pipeline panel rendered at the top of the dialog. */
  pipelineSummary?: ResolveCasePipelineSummary;
  /** Optional warning rendered below the picker (e.g. incomplete pipeline). */
  warningMessage?: React.ReactNode;
  onResolve: (reason: ResolutionReason, notes: string) => void;
}

export function ResolveCaseDialog({
  open,
  onOpenChange,
  caseId,
  defaultReason,
  defaultNotes = "",
  mode = "resolve",
  pipelineSummary,
  warningMessage,
  onResolve,
}: ResolveCaseDialogProps) {
  const [reason, setReason] = React.useState<ResolutionReason | undefined>(
    defaultReason,
  );
  const [notes, setNotes] = React.useState(defaultNotes);

  React.useEffect(() => {
    if (open) {
      setReason(defaultReason);
      setNotes(defaultNotes);
    }
  }, [open, defaultReason, defaultNotes]);

  const meta = reason ? RESOLUTION_REASON_META[reason] : undefined;
  const targetStage = meta?.stage;

  const isEdit = mode === "edit";
  const titleText = isEdit ? "Edit resolution" : "Resolve Case";
  const submitText = isEdit ? "Save changes" : "Resolve Case";
  const TitleIcon = isEdit ? Pencil : CheckCircle2;

  const canSubmit = !!reason;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[calc(100vh-8rem)] overflow-y-auto !top-[5rem] !translate-y-0 !z-[60]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TitleIcon className="w-5 h-5 text-[#8764b8]" />
            {titleText}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update the closure reason and notes for Case ${caseId}. The prior resolution will be kept in the case's history.`
              : `Select a closure reason and provide notes for Case ${caseId}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {pipelineSummary && (
            <div className="p-3 bg-[#f3f2f1] rounded-lg">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-[#605e5c]">Collection</p>
                  <p className="text-sm font-medium text-[#0078d4]">
                    {pipelineSummary.collection.numerator}/
                    {pipelineSummary.collection.denominator}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#605e5c]">Packaged</p>
                  <p className="text-sm font-medium text-[#107c10]">
                    {pipelineSummary.packaged.numerator}/
                    {pipelineSummary.packaged.denominator || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#605e5c]">Delivered</p>
                  <p className="text-sm font-medium text-[#ca5010]">
                    {pipelineSummary.delivered.numerator}/
                    {pipelineSummary.delivered.denominator || 0}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="resolve-reason-trigger"
              className={cn(
                "text-sm font-medium",
                !reason ? "text-[#a4262c]" : "text-[#323130]",
              )}
            >
              Closure Reason {!reason && <span className="text-[#a4262c]" aria-hidden="true">*</span>}
              {!reason && <span className="sr-only"> (required)</span>}
            </label>
            <Select
              value={reason ?? ""}
              onValueChange={(v) =>
                setReason(v ? (v as ResolutionReason) : undefined)
              }
            >
              <SelectTrigger
                id="resolve-reason-trigger"
                className={cn(
                  "w-full",
                  !reason && "border-[#a4262c] focus-visible:ring-[#a4262c]",
                )}
                aria-invalid={!reason}
                aria-describedby="resolve-reason-help"
              >
                <SelectValue placeholder="Select a closure reason…" />
              </SelectTrigger>
              <SelectContent className="!z-[70]">
                {RESOLUTION_REASON_ORDER.map((r) => {
                  const m = RESOLUTION_REASON_META[r];
                  return (
                    <SelectItem key={r} value={r}>
                      <span className="font-medium">{m.label}</span>
                      <span className="text-[#605e5c]"> — {m.description}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {meta ? (
              <p id="resolve-reason-help" className="text-xs text-[#605e5c]">
                {meta.description}{" "}
                <span className="text-[#605e5c]">
                  Will set case stage to: <b>{targetStage}</b>
                </span>
              </p>
            ) : (
              <p id="resolve-reason-help" className="text-xs text-[#a4262c]">
                A closure reason is required.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#323130]">
              Resolution Notes
            </label>
            <Textarea
              resize="none"
              style={{ minHeight: "6rem", width: "100%" }}
              placeholder="Provide any additional resolution details..."
              value={notes}
              onChange={(_ev, data) => setNotes(data.value)}
            />
          </div>

          {warningMessage && (
            <div className="flex items-start gap-2 p-3 bg-[#fff4ce] border border-[#8a6d3b]/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-[#8a6d3b] mt-0.5 flex-shrink-0" />
              <div className="text-xs text-[#605e5c]">{warningMessage}</div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#edebe9]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 border-[#c8c6c4] hover:bg-[#f3f2f1]"
          >
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!reason) return;
              onResolve(reason, notes);
            }}
            className="h-10 bg-[#8764b8] hover:bg-[#7553a8] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {submitText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
