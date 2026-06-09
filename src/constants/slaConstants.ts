/**
 * SLA Deadline tiers — canonical 5-tier table.
 *
 * The case's `casePriority` field is unchanged in the data model; this module
 * adds:
 *  - A canonical 5-tier table:
 *      P0 Emergency (3h, no legal demand)
 *      P1 Urgent    (3h, legal demand attached)
 *      P2 Expedite  (3 days)
 *      P3 Standard  (5 days)
 *      P4 Routine   (10 days)
 *  - Per-tier deadline duration in milliseconds (drives auto due-date set)
 *  - Display metadata (label, P-level, description) used by chips + form
 *  - Pure helpers `computeSlaDueDate` + `computeCountdown`
 *
 * Tier history: `Expedite` previously meant 5 days at P2; the 5-day slot
 * is now called `Standard` (P3) and `Expedite` has been re-pointed to a
 * new 3-day slot at P2. Old cases stamped `Expedite` will now resolve to
 * the faster 3-day SLA — a deliberate semantic shift.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type SlaTier = "Emergency" | "Urgent" | "Expedite" | "Standard" | "Routine";

export interface SlaTierConfig {
  /** Tier value as stored on `casePriority`. */
  tier: SlaTier;
  /** Short label for chips / dropdowns ("Emergency"). */
  label: string;
  /** P-level used in the existing copy ("P0" / "P1" / "P2" / "P3"). */
  pLevel: "P0" | "P1" | "P2" | "P3";
  /** Long-form description (sub-line / tooltip / sort menu). */
  description: string;
  /** Total SLA window from `dateReceived` until `dueDate`, in ms. */
  durationMs: number;
  /** Human duration string for display ("3 hours", "10 days"). */
  durationLabel: string;
}

/**
 * Canonical SLA tier table. Order is significant: highest urgency first.
 * Used for sort key generation.
 */
export const SLA_TIER_CONFIGS: SlaTierConfig[] = [
  {
    tier: "Emergency",
    label: "Emergency",
    pLevel: "P0",
    description: "Emergency — no legal demand attached",
    durationMs: 3 * HOUR,
    durationLabel: "3 hours",
  },
  {
    tier: "Urgent",
    label: "Urgent",
    pLevel: "P1",
    description: "Emergency — legal demand attached",
    durationMs: 3 * HOUR,
    durationLabel: "3 hours",
  },
  // P2 — Expedite (3 days). Added between Urgent and the legacy 5-day
  // tier so the queue has a slot for "high-priority production" cases
  // that aren't true emergencies but need faster turnaround than the
  // 5-day Standard tier. The `Expedite` identifier was previously bound
  // to the 5-day duration; that 5-day slot has been renamed to `Standard`
  // (next config below) and the `Expedite` label now means 3 days.
  {
    tier: "Expedite",
    label: "Expedite",
    pLevel: "P2",
    description: "Expedite — 3 days",
    durationMs: 3 * DAY,
    durationLabel: "3 days",
  },
  // P3 — Standard (5 days). Repurposed from the legacy "Standard" alias
  // (which previously collapsed to Routine). The 5-day duration was
  // previously named "Expedite" at P2; the rename + tier shift keeps a
  // 5-day slot in the table without breaking the new Expedite (3 days)
  // tier's pLevel.
  {
    tier: "Standard",
    label: "Standard",
    pLevel: "P3",
    description: "Standard — 5 days",
    durationMs: 5 * DAY,
    durationLabel: "5 days",
  },
  {
    tier: "Routine",
    label: "Routine",
    pLevel: "P4",
    description: "Routine — 10 days",
    durationMs: 10 * DAY,
    durationLabel: "10 days",
  },
];

const TIER_INDEX: Record<string, number> = SLA_TIER_CONFIGS.reduce(
  (acc, cfg, idx) => {
    acc[cfg.tier] = idx;
    return acc;
  },
  {} as Record<string, number>,
);

/** Context that overrides the static tier config for spec-mandated
 *  variants. Today this is only used by Reg 2023/1543 Art. 9(2)
 *  Emergency Production — an eEvidence Emergency case under Workflow 3
 *  has an 8-hour SLA window instead of the standard 3-hour Emergency
 *  window. Other variants can plug into the same shim later. */
export interface SlaContext {
  requestType?: string;
  eevidenceWorkflow?: number;
}

/** Spec-mandated 8h window for eEvidence Emergency Production. */
const EEVIDENCE_EMERGENCY_8H: SlaTierConfig = {
  tier: "Emergency",
  label: "Emergency",
  pLevel: "P0",
  description:
    "Emergency Production — Reg 2023/1543 Art. 9(2) (8h SLA)",
  durationMs: 8 * HOUR,
  durationLabel: "8 hours",
};

/** True when the case's context maps to the spec's 8h Emergency tier
 *  (Reg 2023/1543 Art. 9(2)). Public so callers can branch on the
 *  variant without duplicating the predicate.
 *
 *  The 8h SLA applies whenever an eEvidence case is marked Emergency —
 *  the spec does not require the case to also carry the explicit
 *  `eevidenceWorkflow: 3` discriminator. Legacy + new seeds both get
 *  the 8h treatment as long as `requestType === "eEvidence"` and the
 *  tier is `"Emergency"`. */
export function isEEvidenceEmergency(
  tier: string | undefined,
  ctx?: SlaContext,
): boolean {
  if (tier !== "Emergency") return false;
  if (!ctx) return false;
  return ctx.requestType === "eEvidence";
}

/** Map from tier value (or unknown / "Standard" legacy value) → config.
 *  Optional `ctx` carries case-shape signals (requestType, workflow)
 *  that swap the tier for spec-mandated variants like the eEvidence
 *  Emergency 8h window. Legacy callers omit `ctx` and get the static
 *  tier behaviour. */
/** Default fallback index — Routine sits at the tail of the 5-tier
 *  table. Computed dynamically so future tier inserts/reorders don't
 *  silently shift the fallback to the wrong row. */
const ROUTINE_INDEX = SLA_TIER_CONFIGS.findIndex((c) => c.tier === "Routine");

export function getSlaConfig(
  tier: string | undefined,
  ctx?: SlaContext,
): SlaTierConfig {
  if (isEEvidenceEmergency(tier, ctx)) return EEVIDENCE_EMERGENCY_8H;
  if (!tier) return SLA_TIER_CONFIGS[ROUTINE_INDEX]; // default to Routine
  // "Standard" was historically a legacy alias that collapsed to Routine.
  // It now refers to the proper 5-day P3 tier (see SLA_TIER_CONFIGS).
  // The normal find-by-tier below handles it; no special collapse.
  const cfg = SLA_TIER_CONFIGS.find((c) => c.tier === tier);
  return cfg ?? SLA_TIER_CONFIGS[ROUTINE_INDEX];
}

/** Sort key — lower = more urgent. Stable ordering for the queue's
 *  "Sort by SLA Deadline" option. "Standard" is now a proper tier
 *  (P3, 5 days), so the lookup hits the table directly. */
export function slaTierOrder(tier: string | undefined): number {
  if (!tier) return 99;
  return TIER_INDEX[tier] ?? 99;
}

/** Compute the SLA-derived due date.
 *  - Anchor = max(dateReceived, now) so a missed/back-dated dateReceived
 *    doesn't put the case immediately overdue when the tier is set.
 *  - Returns a Date object. */
export function computeSlaDueDate(
  tier: string | undefined,
  dateReceived?: Date | string | null,
  now: Date = new Date(),
  ctx?: SlaContext,
): Date {
  const cfg = getSlaConfig(tier, ctx);
  const received = dateReceived ? new Date(dateReceived) : null;
  const anchorMs =
    received && !Number.isNaN(received.getTime())
      ? Math.max(received.getTime(), now.getTime())
      : now.getTime();
  return new Date(anchorMs + cfg.durationMs);
}

// ─── Countdown ──────────────────────────────────────────────────────────

export type CountdownState = "OnTrack" | "Approaching" | "Overdue";

export interface Countdown {
  state: CountdownState;
  /** Absolute remaining ms to dueDate (negative when overdue). */
  remainingMs: number;
  /** Total SLA window ms (dueDate − dateReceived). Used to compute the
   *  Approaching threshold. Falls back to tier.durationMs when dateReceived
   *  is missing. */
  totalMs: number;
  /** Short label for chips ("Due Apr 22", "Due in 2h 15m", "Overdue 1d 4h"). */
  label: string;
}

/** Approaching threshold: chip flips to amber when remaining ≤ 25% of total. */
const APPROACHING_RATIO = 0.25;

/** Format milliseconds as compact human-readable duration ("1d 4h", "2h 15m",
 *  "12m", "20s"). Always positive — caller decides sign. */
function humanDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** Format a Date as a short month-day string for OnTrack chips. */
function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function computeCountdown(
  tier: string | undefined,
  dueDate: Date | string | undefined | null,
  dateReceived?: Date | string | null,
  now: Date = new Date(),
  ctx?: SlaContext,
): Countdown {
  const cfg = getSlaConfig(tier, ctx);
  const due = dueDate ? new Date(dueDate) : null;
  if (!due || Number.isNaN(due.getTime())) {
    // No due date set → treat as OnTrack with no label.
    return {
      state: "OnTrack",
      remainingMs: cfg.durationMs,
      totalMs: cfg.durationMs,
      label: "No due date",
    };
  }

  const remainingMs = due.getTime() - now.getTime();

  // Total window: dueDate − dateReceived (preferred), else tier duration.
  let totalMs = cfg.durationMs;
  if (dateReceived) {
    const received = new Date(dateReceived);
    if (!Number.isNaN(received.getTime())) {
      const computed = due.getTime() - received.getTime();
      if (computed > 0) totalMs = computed;
    }
  }

  if (remainingMs <= 0) {
    return {
      state: "Overdue",
      remainingMs,
      totalMs,
      label: `Overdue ${humanDuration(-remainingMs)}`,
    };
  }

  const approachingThreshold = totalMs * APPROACHING_RATIO;
  if (remainingMs <= approachingThreshold) {
    return {
      state: "Approaching",
      remainingMs,
      totalMs,
      label: `Due in ${humanDuration(remainingMs)}`,
    };
  }

  return {
    state: "OnTrack",
    remainingMs,
    totalMs,
    label: `Due ${formatShortDate(due)}`,
  };
}
