/**
 * identifierRejection — helpers for the per-identifier terminal states that
 * skip mapping resolution and Step 3 submission. There are several such
 * states; they all behave the same for routing/submission purposes:
 *
 *   - rejection            — RS rejected the legal demand for this identifier
 *   - invalid              — RS marked the identifier invalid (Phase 5c.2)
 *   - account-not-found    — account-existence check returned N/A (Phase 5c.1)
 *   - ETSI Cancelled       — LE submitted a per-identifier ETSI status (Phase 5c.4)
 *   - ETSI Withdrawn       — same
 *
 * `isSkippedFromSubmission` returns true for any of the above; bulk-action
 * scoping and Step 3 readiness use it to exclude the identifier.
 */

import type { AccountIdentifier, IdentifierRejection } from "../types/caseTypes";

export function isRejected(id: AccountIdentifier): boolean {
  return id.rejection?.rejected === true;
}

export function markRejected(
  id: AccountIdentifier,
  reason: string,
  rejectedBy: string,
  documentRef?: string
): AccountIdentifier {
  const rejection: IdentifierRejection = {
    rejected: true,
    rejectedAt: new Date(),
    rejectedBy,
    reason,
    documentRef,
  };
  return { ...id, rejection };
}

export function restore(id: AccountIdentifier): AccountIdentifier {
  if (!id.rejection) return id;
  const { rejection: _drop, ...rest } = id;
  return rest as AccountIdentifier;
}

// ── Phase 5c.2: RS Mark Invalid ─────────────────────────────────────────────

export function isInvalid(id: AccountIdentifier): boolean {
  return !!id.invalidReason || id.taskStatus === "Invalid";
}

export function markInvalid(
  id: AccountIdentifier,
  reason: string,
  by: string,
): AccountIdentifier {
  return {
    ...id,
    taskStatus: "Invalid",
    invalidReason: reason,
    invalidatedAt: new Date(),
    invalidatedBy: by,
  };
}

export function clearInvalid(id: AccountIdentifier): AccountIdentifier {
  if (!isInvalid(id)) return id;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { invalidReason, invalidatedAt, invalidatedBy, ...rest } = id;
  return {
    ...rest,
    // Reset taskStatus only if it was set to Invalid by us; otherwise leave it.
    taskStatus: id.taskStatus === "Invalid" ? "InProgress" : id.taskStatus,
  } as AccountIdentifier;
}

// ── Phase 5c.1: Account-not-found ───────────────────────────────────────────

/** True when the identifier's account-existence check returned N/A. The RS
 *  must Acknowledge (→ taskStatus "Not Found") or Reject. */
export function isAccountNotFound(id: AccountIdentifier): boolean {
  return (
    id.accountExistenceStatus === "success" &&
    id.checkAccounts?.accountType === "N/A"
  );
}

// ── Phase 5c.4: Per-identifier ETSI Cancelled / Withdrawn ───────────────────

export function isETSITerminal(id: AccountIdentifier): boolean {
  const s = id.etsiDesiredStatus;
  return s === "Cancelled" || s === "Withdrawn";
}

/** Whether this identifier should be skipped from bulk-action scope and
 *  Step 3 submission. Covers all terminal per-identifier states. */
export function isSkippedFromSubmission(id: AccountIdentifier): boolean {
  return (
    isRejected(id) ||
    isInvalid(id) ||
    isETSITerminal(id) ||
    id.taskStatus === "Not Found" ||
    id.taskStatus === "Withdrawn" ||
    id.taskStatus === "Cancelled"
  );
}
