/**
 * FilterColumnSyncDialog — small confirmation popup that fires when the
 * user adds or removes a catalogue filter whose matching column would
 * change visibility as a result.
 *
 * The product loop the dialog closes:
 *
 *   1. User picks a filter from the **+ Add filter** menu (or removes
 *      a chip from the active-filter strip).
 *   2. If the filter has a `columnId` AND that column's visibility is
 *      about to change (was hidden → would auto-show on add, was shown
 *      → would auto-hide on remove), the dialog asks for one click of
 *      confirmation.
 *   3. Confirm → CaseQueue flips the column's visibility, so the user
 *      can immediately see and sort by the dimension they're filtering
 *      on. Skip → the filter still mounts/unmounts, but the column
 *      stays in its current state. (Lets users decline the column
 *      change without abandoning the filter change.)
 *
 * The dialog suppresses itself when:
 *   - The filter has no `columnId` (e.g. `badges`, which fans out into
 *     several atomic columns — no single column to show/hide).
 *   - The column is locked (e.g. `case-id`) — locks always win.
 *   - The column is already in the desired state (no-op).
 *
 * Saved Views skip the dialog entirely — applying a view is a single
 * bulk action and the user has already trusted that view's slice.
 */
import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export type FilterColumnSyncDirection = "add" | "remove";

export interface FilterColumnSyncRequest {
  /** "add" → the filter was just added; we're asking whether to SHOW
   *  the linked column. "remove" → the filter was just removed; we're
   *  asking whether to HIDE the linked column. */
  direction: FilterColumnSyncDirection;
  filterId: string;
  filterLabel: string;
  columnId: string;
  columnLabel: string;
}

export interface FilterColumnSyncDialogProps {
  request: FilterColumnSyncRequest | null;
  /** Confirm — flip the column visibility per `direction`. */
  onConfirm: (request: FilterColumnSyncRequest) => void;
  /** Skip — leave the column in its current state. The filter change
   *  is independent and has already been applied by the caller. */
  onCancel: () => void;
}

export function FilterColumnSyncDialog({
  request,
  onConfirm,
  onCancel,
}: FilterColumnSyncDialogProps) {
  const open = request !== null;
  const isAdd = request?.direction === "add";
  const title = isAdd
    ? `Show the ${request?.columnLabel} column?`
    : `Hide the ${request?.columnLabel} column?`;
  const body = isAdd
    ? `You just added the ${request?.filterLabel} filter. Showing the ${request?.columnLabel} column lets you see and sort by the values you're filtering on.`
    : `You just removed the ${request?.filterLabel} filter. Do you also want to hide the ${request?.columnLabel} column from the table?`;
  const confirmLabel = isAdd ? "Show column" : "Hide column";
  const cancelLabel = isAdd ? "Keep hidden" : "Keep visible";
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (request) onConfirm(request);
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
