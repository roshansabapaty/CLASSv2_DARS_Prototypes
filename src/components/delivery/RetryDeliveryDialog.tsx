/**
 * RetryDeliveryDialog — hybrid bulk / per-job Retry Delivery flow for
 * eEvidence cases. Opened when the RS clicks Retry from either the
 * top-of-CollectionTracker banner or the per-job Retry button on a
 * failed delivery row.
 *
 * Behaviour:
 *   - When opened from the banner (no `initialSelectedJobId`), all
 *     failed jobs are pre-selected for bulk retry.
 *   - When opened from a per-job button, only that one job is
 *     pre-selected. The RS can expand the selection to bulk if they
 *     decide to retry more in one go.
 *   - An optional Reason field is captured in the audit event so the
 *     reason for retry is traceable.
 *   - Confirm flips the selected jobs' `deliveryStatus` from "Failed"
 *     back to "Started" so the auto-sim's next cycle takes another
 *     swing; clears each job's `deliveryError`.
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
import { Checkbox } from "../ui/checkbox";
import { Textarea } from "../ui/textarea";
import { RotateCcw, AlertOctagon } from "lucide-react";
import type {
  FailedDeliveryJob,
  RetryDeliverySelector,
} from "../../utils/deliveryStatus";

export interface RetryDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  failedJobs: FailedDeliveryJob[];
  /** When set, the dialog opens with ONLY this job pre-selected. The
   *  composite key is built the same way as the helper builds it. */
  initialSelectedKey?: string;
  /** Caller commits the retry: flips the matching jobs' deliveryStatus
   *  back to "Started" + clears their deliveryError. The note is for
   *  the audit trail. */
  onConfirm: (
    selectors: RetryDeliverySelector[],
    reasonNote: string,
  ) => void;
}

/** Composite key — matches the encoding the dialog uses to track
 *  per-row selection. Exported so the banner / per-row button can
 *  derive the same key when pre-selecting. */
export function jobKey(j: FailedDeliveryJob): string {
  return `${j.identifierId}|${j.serviceKey}|${j.groupKey}|${j.itemKey}|${j.additionalJobIndex ?? "-"}`;
}

export function RetryDeliveryDialog({
  open,
  onOpenChange,
  failedJobs,
  initialSelectedKey,
  onConfirm,
}: RetryDeliveryDialogProps) {
  // Re-seed the selection set every time the dialog opens. When opened
  // from a per-job button, only that one key starts ticked; when opened
  // from the banner with no initial key, all keys start ticked (bulk
  // default).
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [reasonNote, setReasonNote] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    const keys = failedJobs.map(jobKey);
    if (initialSelectedKey && keys.includes(initialSelectedKey)) {
      setSelected(new Set([initialSelectedKey]));
    } else {
      setSelected(new Set(keys));
    }
    setReasonNote("");
  }, [open, initialSelectedKey, failedJobs]);

  const allKeys = failedJobs.map(jobKey);
  const allSelected =
    allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const anySelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allKeys));
  };
  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirm = () => {
    const selectors: RetryDeliverySelector[] = failedJobs
      .filter((j) => selected.has(jobKey(j)))
      .map((j) => ({
        identifierId: j.identifierId,
        serviceKey: j.serviceKey,
        groupKey: j.groupKey,
        itemKey: j.itemKey,
        additionalJobIndex: j.additionalJobIndex,
      }));
    onConfirm(selectors, reasonNote.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#a4262c]">
            <AlertOctagon className="w-5 h-5 text-[#a4262c]" aria-hidden="true" />
            Retry Delivery
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-[#605e5c] space-y-2 mt-1">
              <p>
                The WISP <code className="font-mono text-[#323130]">/eevidence/deliverystatus</code>{" "}
                callback reported an <strong>Error</strong> for the
                jobs below. Retrying re-submits the selected package(s)
                for delivery; the next refresh cycle will pick up the
                new attempt's outcome.
              </p>
              <p>
                Use the checkbox to retry a single job, several jobs,
                or all failed jobs in one go.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="border border-[#edebe9] rounded-md overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#faf9f8] border-b border-[#edebe9]">
            <Checkbox
              id="retry-toggle-all"
              checked={allSelected}
              onCheckedChange={toggleAll}
            />
            <label
              htmlFor="retry-toggle-all"
              className="text-xs text-[#605e5c] cursor-pointer select-none"
              style={{ fontWeight: 600 }}
            >
              {allSelected ? "Clear selection" : "Select all"}
              <span className="ml-2 text-[#a19f9d]">
                ({selected.size} of {failedJobs.length} selected)
              </span>
            </label>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {failedJobs.map((j) => {
              const k = jobKey(j);
              const isChecked = selected.has(k);
              return (
                <li
                  key={k}
                  className="flex items-start gap-2 px-3 py-2 border-b border-[#edebe9] last:border-b-0 hover:bg-[#faf9f8]"
                >
                  <Checkbox
                    id={`retry-${k}`}
                    checked={isChecked}
                    onCheckedChange={() => toggle(k)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`retry-${k}`}
                    className="flex-1 min-w-0 cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-mono text-[10px] bg-[#f3f2f1] text-[#605e5c] border border-[#c8c6c4] rounded px-1.5 py-0.5"
                        style={{ fontWeight: 600 }}
                      >
                        {j.taskId}
                      </span>
                      <span className="text-[#323130]" style={{ fontWeight: 600 }}>
                        {j.identifierValue}
                      </span>
                      <span className="text-[#605e5c]">· {j.identifierType}</span>
                      {j.isAdditionalJob && (
                        <span className="text-[10px] bg-[#deecf9] text-[#0078d4] border border-[#0078d4]/40 rounded px-1.5 py-0.5">
                          Additional submission
                        </span>
                      )}
                    </div>
                    <div className="text-[#605e5c] mt-0.5">
                      Service: <span className="text-[#323130]">{j.serviceKey}</span>
                      {" · "}
                      Category: <span className="text-[#323130]">{j.groupKey} / {j.itemKey}</span>
                      {j.deliveryJobId && (
                        <>
                          {" · "}
                          Delivery job: <span className="font-mono text-[#323130]">{j.deliveryJobId}</span>
                        </>
                      )}
                    </div>
                    {j.deliveryError && (
                      <p className="mt-1 text-[11px] text-[#a4262c] bg-[#fde7e9] border border-[#a4262c]/30 rounded px-2 py-1">
                        WISP: {j.deliveryError}
                      </p>
                    )}
                  </label>
                </li>
              );
            })}
            {failedJobs.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-[#a19f9d]">
                No failed deliveries on this case.
              </li>
            )}
          </ul>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="retry-reason"
            className="text-xs text-[#323130]"
            style={{ fontWeight: 600 }}
          >
            Reason for retry (optional)
          </label>
          <Textarea
            id="retry-reason"
            value={reasonNote}
            onChange={(e) => setReasonNote(e.target.value)}
            placeholder="e.g. WISP endpoint was returning 503 — IA confirmed receiver is back online."
            rows={2}
            className="text-sm"
          />
          <p className="text-[11px] text-[#605e5c]">
            Captured in the case Audit Thread alongside the retry event.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!anySelected}
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white disabled:bg-[#f3f2f1] disabled:text-[#a19f9d]"
          >
            <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
            Retry {selected.size} delivery{selected.size === 1 ? "" : " jobs"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
