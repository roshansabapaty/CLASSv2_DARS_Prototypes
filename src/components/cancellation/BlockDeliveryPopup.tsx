/**
 * BlockDeliveryPopup — Reusable Block Delivery confirmation dialog.
 *
 * Shared between:
 *  - CollectionTracker pipeline page (existing usage)
 *  - CancellationWorkflowDialog (new cancellation flow)
 *
 * When confirmed, sets deliveryBlocked=true which prevents any pending
 * or new jobs from reaching the Delivery stage. Already-delivered jobs
 * are unaffected (irreversible for those).
 */
import { ShieldBan, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface BlockDeliveryPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** Whether this is triggered from the cancellation workflow (adds extra context) */
  isCancellationContext?: boolean;
}

export function BlockDeliveryPopup({
  open,
  onOpenChange,
  onConfirm,
  isCancellationContext = false,
}: BlockDeliveryPopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#a4262c]">
            <ShieldBan className="w-5 h-5" />
            Block Delivery
          </DialogTitle>
          <DialogDescription className="text-[#605e5c]">
            This will stop delivery for any jobs that have{" "}
            <span className="font-semibold text-[#323130]">
              not yet completed delivery
            </span>{" "}
            and prevent any new jobs from starting delivery. Jobs that have
            already been delivered will not be affected.
          </DialogDescription>
        </DialogHeader>

        {isCancellationContext && (
          <div className="bg-[#fff4ce] border border-[#f7dba7] rounded-md p-3 text-xs text-[#8a6d3b] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Cancellation context: </span>
              <span>
                Blocking delivery is a critical step in the case cancellation
                workflow. In-flight Collection jobs cannot be stopped, but this
                action prevents any collected data from being delivered to
                authorized legal contacts.
              </span>
            </div>
          </div>
        )}

        {!isCancellationContext && (
          <div className="bg-[#fff4ce] border border-[#f7dba7] rounded-md p-3 text-xs text-[#8a6d3b] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              You can unblock delivery later by clicking the "Delivery Blocked"
              button.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-[#a4262c] hover:bg-[#8a2121] text-white"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            <ShieldBan className="w-4 h-4 mr-2" />
            Confirm Block
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
