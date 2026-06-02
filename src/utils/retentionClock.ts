/**
 * Retention clock helpers — pure functions over `FormData.retentionClock`.
 *
 * The 45-day retention window (Reg 2023/1543) opens on any path that
 * terminates the case while data was held: IA EndPreservation, Full GFR
 * rejection, Form 3 non-execution, IA withdrawal, or post-delivery close.
 * Once the window expires, the SP is obligated to delete the held data.
 *
 * Design notes:
 *  - All functions are idempotent. Calling `startRetentionClock` twice
 *    with the same `reason` returns the **first** start time — the clock
 *    starts when the terminating event happens, not when the handler runs.
 *  - Re-keying the reason (e.g. Form 3 lands first, then a later GFR
 *    Full rejection arrives) preserves the original `startedAt` —
 *    retention is a single window per case, not per event.
 *  - Time is injected via `now` so callers can deterministic-test.
 */

import type {
  FormData,
  RetentionClock,
  RetentionClockReason,
} from "../types/caseTypes";

/** The statutory window length in days (Reg 2023/1543). */
export const RETENTION_WINDOW_DAYS = 45;

/** Compute the expiry timestamp for a retention window opened at `startedAt`.
 *  Uses UTC millisecond math so DST transitions inside the 45-day window
 *  don't shift the wall-clock expiration time by ±1 hour relative to the
 *  start. `setDate` in local time would otherwise drift across the DST
 *  boundary; the regulation pins the duration, not the local clock. */
export function computeRetentionExpiry(startedAt: Date): Date {
  return new Date(
    startedAt.getTime() + RETENTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
}

/** Return a new FormData with the retention clock started, or the existing
 *  formData unchanged if a clock is already running. Idempotent. */
export function startRetentionClock(
  formData: FormData,
  reason: RetentionClockReason,
  source?: string,
  now: Date = new Date(),
): FormData {
  if (formData.retentionClock) {
    // Already running — preserve original startedAt + expiresAt.
    // Only update `source` if the caller passed a new one and the
    // existing record had none (best-effort attribution backfill).
    if (source && !formData.retentionClock.source) {
      return {
        ...formData,
        retentionClock: { ...formData.retentionClock, source },
      };
    }
    return formData;
  }
  const clock: RetentionClock = {
    startedAt: now,
    expiresAt: computeRetentionExpiry(now),
    reason,
    source,
  };
  return { ...formData, retentionClock: clock };
}

/** Clear the retention clock — used when a case is reopened or when an
 *  early terminating event is reverted (rare; mainly for tests + manual
 *  fixups). */
export function clearRetentionClock(formData: FormData): FormData {
  if (!formData.retentionClock) return formData;
  const { retentionClock: _drop, ...rest } = formData;
  return rest as FormData;
}

/** Snapshot of the retention clock relative to `now`. */
export interface RetentionStatus {
  active: boolean;
  expired: boolean;
  /** Days remaining (rounded down to whole days). Zero when expired today,
   *  negative when past expiry. */
  daysRemaining: number;
  /** Hours remaining — useful for sub-day precision on the final day. */
  hoursRemaining: number;
  clock?: RetentionClock;
}

export function getRetentionStatus(
  formData: FormData | null | undefined,
  now: Date = new Date(),
): RetentionStatus {
  const clock = formData?.retentionClock;
  if (!clock) {
    return { active: false, expired: false, daysRemaining: 0, hoursRemaining: 0 };
  }
  const expiresAt = clock.expiresAt instanceof Date
    ? clock.expiresAt
    : new Date(clock.expiresAt);
  const msRemaining = expiresAt.getTime() - now.getTime();
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
  return {
    active: msRemaining > 0,
    expired: msRemaining <= 0,
    daysRemaining,
    hoursRemaining,
    clock,
  };
}

/** Short human label for the chip ("Retention: 32d left" / "Retention expired"). */
export function formatRetentionShortLabel(status: RetentionStatus): string {
  if (!status.clock) return "";
  if (status.expired) return "Retention expired";
  if (status.daysRemaining >= 1) {
    return `Retention: ${status.daysRemaining}d left`;
  }
  return `Retention: <1d left`;
}

/** Long-form reason text for the chip tooltip. */
export function formatRetentionReason(reason: RetentionClockReason): string {
  switch (reason) {
    case "PreservationEnded":
      return "IA ended preservation obligation";
    case "GfrFullRejection":
      return "EA returned Full Grounds for Refusal — delivery cancelled";
    case "Form3NonExecution":
      return "Microsoft submitted Form 3 (non-execution)";
    case "Withdrawal":
      return "IA withdrew the EPOC";
    case "Delivered":
      return "Production delivered — case closed";
    case "Other":
      return "Other terminal event";
  }
}
