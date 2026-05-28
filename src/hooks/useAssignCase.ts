/**
 * useAssignCase — centralized hook for reassigning a case to a Response
 * Specialist (or marking it unassigned).
 *
 * Every reassignment surface in the app (queue inline chip, case header chip,
 * bulk dialog) routes its commit through this hook. That gives us one place
 * to:
 *   - write the new assignee on the case form data
 *   - surface a confirmation toast
 *   - extend later: audit-log entries, in-app notifications, SLA recalcs
 *
 * Today the hook accepts a generic `setAssignee` callback so the same primitive
 * works whether the caller mutates a single form's state (case-form path) or
 * patches an item in a list (queue path). Internally we keep the API tiny so
 * the four call sites stay symmetric.
 */

import { useCallback } from "react";
import { toast } from "sonner@2.0.3";

export interface UseAssignCaseOptions {
  /** Current assignee on the case ("" / undefined = Unassigned). */
  currentAssignee: string | undefined;
  /** Apply the new assignee. Pass `""` to clear. */
  setAssignee: (next: string) => void;
  /** Case ID / number — used in the toast wording. Optional. */
  caseId?: string;
}

export interface UseAssignCaseResult {
  /** Apply a new assignee. No-ops when `next === currentAssignee`. */
  reassign: (next: string) => void;
  /** Clear the assignee (mark Unassigned). */
  clearAssignment: () => void;
}

export function useAssignCase(
  options: UseAssignCaseOptions,
): UseAssignCaseResult {
  const { currentAssignee, setAssignee, caseId } = options;

  const reassign = useCallback(
    (next: string) => {
      const normalized = (next ?? "").trim();
      const current = (currentAssignee ?? "").trim();
      if (normalized === current) return;
      setAssignee(normalized);

      const where = caseId ? ` for ${caseId}` : "";
      if (!normalized) {
        toast.info(`Case unassigned${where}.`);
      } else if (!current) {
        toast.success(`Assigned to ${normalized}${where}.`);
      } else {
        toast.success(`Reassigned from ${current} to ${normalized}${where}.`);
      }
    },
    [currentAssignee, setAssignee, caseId],
  );

  const clearAssignment = useCallback(() => reassign(""), [reassign]);

  return { reassign, clearAssignment };
}
