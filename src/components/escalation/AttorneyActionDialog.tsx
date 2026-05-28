/**
 * AttorneyActionDialog — generic confirmation dialog for the three
 * note-required attorney actions: Approve with Conditions, Request More
 * Information, Block. Also used by the Peer panel's Reassign action.
 *
 * The dialog is config-driven (label + body copy + required-note prompt
 * + optional acknowledgement checkbox). The caller wires the submit
 * handler to the matching state mutation + audit event.
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import { AlertCircle } from "lucide-react";
import { cn } from "../ui/utils";

export interface AttorneyActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  /** Label rendered above the textarea. */
  notePromptLabel: string;
  /** Placeholder shown inside the textarea. */
  notePlaceholder: string;
  /** Minimum non-whitespace characters required before submit enables.
   *  Default 5. Pass 0 to make the note optional. */
  minNoteLength?: number;
  /** Optional acknowledgement checkbox (used by Block). */
  acknowledgementText?: string;
  /** Confirm button label. */
  confirmLabel: string;
  /** Tier — drives the confirm-button colour. */
  tier?: "primary" | "danger" | "warn";
  onConfirm: (note: string) => void;
}

export function AttorneyActionDialog({
  open,
  onOpenChange,
  title,
  description,
  notePromptLabel,
  notePlaceholder,
  minNoteLength = 5,
  acknowledgementText,
  confirmLabel,
  tier = "primary",
  onConfirm,
}: AttorneyActionDialogProps) {
  const [note, setNote] = React.useState("");
  const [ack, setAck] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setNote("");
      setAck(false);
      setTouched(false);
    }
  }, [open]);

  const trimmed = note.trim();
  const noteOk = trimmed.length >= minNoteLength;
  const ackOk = !acknowledgementText || ack;
  const canConfirm = noteOk && ackOk;
  const showNoteError =
    touched && minNoteLength > 0 && !noteOk
      ? `Please provide a note (at least ${minNoteLength} characters).`
      : undefined;

  const handleConfirm = () => {
    setTouched(true);
    if (!canConfirm) return;
    onConfirm(trimmed);
    onOpenChange(false);
  };

  const confirmClasses = cn(
    "h-10 text-white disabled:opacity-50",
    tier === "danger" && "bg-[#c50f1f] hover:bg-[#a00e1c]",
    tier === "warn" && "bg-[#ca5010] hover:bg-[#a8420d]",
    tier === "primary" && "bg-[#5c2d91] hover:bg-[#4b1f78]",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] !top-[5rem] !translate-y-0 !z-[60]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label className="text-[#323130] font-semibold">
              {notePromptLabel}
              {minNoteLength > 0 && <span className="text-[#d13438]"> *</span>}
            </Label>
            <Textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (!touched) setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              placeholder={notePlaceholder}
              className="min-h-[100px] border-[#c8c6c4] focus:border-[#8764b8] transition-colors bg-white resize-y"
            />
            {showNoteError && (
              <p className="text-[#d13438] text-sm flex items-center gap-1.5" role="alert">
                <AlertCircle className="w-3.5 h-3.5" />
                {showNoteError}
              </p>
            )}
          </div>

          {acknowledgementText && (
            <div className="flex items-start gap-2 rounded-md bg-[#fef0f0] border border-[#d13438]/30 p-3">
              <Checkbox
                checked={ack}
                onCheckedChange={(v) => setAck(v === true)}
                id="attorney-action-ack"
                className="mt-0.5"
              />
              <Label
                htmlFor="attorney-action-ack"
                className="text-sm text-[#605e5c] leading-snug cursor-pointer"
              >
                {acknowledgementText}
              </Label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#edebe9]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10"
          >
            Cancel
          </Button>
          <Button
            disabled={!canConfirm}
            onClick={handleConfirm}
            className={confirmClasses}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
