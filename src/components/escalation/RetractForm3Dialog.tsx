/**
 * RetractForm3Dialog — Phase D confirmation dialog for the
 * "Retract Form 3" flow on the GroundsForRefusalPanel.
 *
 * Triggered when the Specialist clicks "Retract Form 3" on the
 * orange Form3Response + None panel variant ("EA rejected your
 * Form 3 — production required"). The retraction is the
 * strict-legal acknowledgement that the EA overruled the SP's
 * non-execution claim; capturing it explicitly preserves the
 * audit trail.
 *
 * The dialog requires an "I acknowledge" checkbox before the
 * primary action enables — same posture as the day-10 lapse
 * "Resume delivery" confirm flow (Phase E).
 *
 * On confirm: caller patches the GFR block's `form3RetractedAt`
 * / `form3RetractedBy` and appends a `Form3Retracted` audit
 * event.
 */

import * as React from "react";
import { Undo2, AlertOctagon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";

export interface RetractForm3DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: the referenced Form 3 ID, shown in the body copy
   *  so the RS sees exactly which Form 3 is being retracted. */
  referencedForm3Id?: string;
  /** Fired after the RS ticks the acknowledgement checkbox and
   *  clicks the destructive primary action. */
  onConfirm: () => void;
}

export function RetractForm3Dialog({
  open,
  onOpenChange,
  referencedForm3Id,
  onConfirm,
}: RetractForm3DialogProps) {
  const [acknowledged, setAcknowledged] = React.useState(false);

  // Reset the checkbox state every time the dialog opens so a prior
  // tick doesn't carry over and let the user click through too fast.
  React.useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open]);

  const handleConfirm = () => {
    if (!acknowledged) return;
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#7a3a00]">
            <AlertOctagon className="w-5 h-5 text-[#ca5010]" aria-hidden="true" />
            Retract Form 3
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-[#605e5c] space-y-2 mt-1">
              <p>
                The Enforcing Authority reviewed your Form 3
                {referencedForm3Id ? (
                  <>
                    {" "}
                    (<span className="font-mono text-[#323130]">
                      {referencedForm3Id}
                    </span>)
                  </>
                ) : null}
                {" "}and issued <strong>No Grounds for Refusal</strong>,
                rejecting the SP's non-execution claim. Retracting the
                Form 3 acknowledges the EA's decision and resumes
                production.
              </p>
              <p>
                This action is logged in the case Audit Thread and
                cannot be undone. If you have grounds the EA hasn't
                considered, escalate to Attorney review BEFORE
                retracting.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <label
          className="flex items-start gap-2 px-1 py-2 cursor-pointer select-none"
          htmlFor="retract-ack"
        >
          <Checkbox
            id="retract-ack"
            checked={acknowledged}
            onCheckedChange={(v) => setAcknowledged(v === true)}
          />
          <span className="text-sm text-[#323130] leading-snug">
            I acknowledge the EA's decision and confirm that production
            will resume. No EA approval beyond the No-GFR finding is
            implied.
          </span>
        </label>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!acknowledged}
            className="bg-[#ca5010] hover:bg-[#a34108] text-white disabled:bg-[#f3f2f1] disabled:text-[#a19f9d]"
          >
            <Undo2 className="w-4 h-4 mr-2" aria-hidden="true" />
            Retract Form 3
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
