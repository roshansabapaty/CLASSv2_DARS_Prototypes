/**
 * SlaDeadlineChip — coloured chip showing how a case sits against its SLA.
 *
 * Three states:
 *   OnTrack     → green     "Due Apr 22"
 *   Approaching → amber     "Due in 2h 15m"   (≤ 25% of window remaining)
 *   Overdue     → red       "Overdue 1d 4h"
 *
 * Live: subscribes to `useCountdownTick` for once-a-minute refreshes. The
 * caller passes the case's tier ("Emergency"/"Urgent"/…), `dueDate`, and
 * (optional) `dateReceived` — the chip computes everything else.
 *
 * Per docs/UI_LIBRARY_POLICY.md — Fluent v9 + Griffel only.
 */

import * as React from "react";
import {
  Badge,
  Tooltip,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import {
  Clock20Regular,
  Warning20Regular,
  ErrorCircle20Regular,
  Pause20Regular,
} from "@fluentui/react-icons";
import {
  computeCountdown,
  getSlaConfig,
  type CountdownState,
} from "../../constants/slaConstants";
import { useCountdownTick } from "../../hooks/useCountdownTick";
import { isSlaPaused } from "../../utils/slaTimer";

const useStyles = makeStyles({
  onTrackChip: {
    backgroundColor: tokens.colorPaletteGreenBackground2,
    color: tokens.colorPaletteGreenForeground1,
    ...shorthands.borderColor(tokens.colorPaletteGreenBorder1),
  },
  approachingChip: {
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorPaletteDarkOrangeForeground1,
    ...shorthands.borderColor(tokens.colorPaletteYellowBorder1),
  },
  overdueChip: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
    ...shorthands.borderColor(tokens.colorPaletteRedBorder1),
  },
  pausedChip: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    ...shorthands.borderColor(tokens.colorNeutralStroke1),
  },
  pausedRow: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
  },
  // Plain variant: same coloured text + icon as the chip, but no
  // background fill / no border. Used in list-row cells to reduce the
  // pill-density of each row.
  plain: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXXS,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  plainOnTrack: { color: tokens.colorPaletteGreenForeground1 },
  plainApproaching: { color: tokens.colorPaletteDarkOrangeForeground1 },
  plainOverdue: { color: tokens.colorPaletteRedForeground1 },
  plainPaused: { color: tokens.colorNeutralForeground2 },
});

export interface SlaDeadlineChipProps {
  /** Case tier (`casePriority`). Drives total-window fallback + tooltip copy. */
  tier: string | undefined;
  /** Case due date — countdown anchor. */
  dueDate: Date | string | undefined | null;
  /** When the case was received. Used to compute the SLA window for the
   *  "Approaching" threshold. Falls back to tier duration if missing. */
  dateReceived?: Date | string | null;
  /** Compact = no icon, smaller font. Used in dense queue cards. */
  size?: "compact" | "default";
  /** When true, render a small "SLA paused" pill alongside the normal
   *  countdown chip. The countdown still shows the intended deadline so
   *  the RS can see what the impending due date would be if the timer
   *  restarted. Source: `formData.slaPausedAt` on the case form side;
   *  the registry's `isCaseSlaPausedById` on the queue side. */
  paused?: boolean;
  /** Visual variant. Default `"chip"` renders the filled coloured pill;
   *  `"plain"` drops the background / border and renders just a coloured
   *  icon + text so dense list rows don't pile pill-on-pill. */
  variant?: "chip" | "plain";
}

export function SlaDeadlineChip({
  tier,
  dueDate,
  dateReceived,
  size = "default",
  paused = false,
  variant = "chip",
}: SlaDeadlineChipProps) {
  const styles = useStyles();
  const now = useCountdownTick();
  const cfg = getSlaConfig(tier);

  // Defensive: also treat the legacy sentinel-`dueDate` shape as paused
  // for any caller still emitting it. New callers should set `paused`
  // explicitly from `formData.slaPausedAt`.
  const sentinelPaused = isSlaPaused(dueDate ? new Date(dueDate) : undefined);
  const isPaused = paused || sentinelPaused;

  const countdown = React.useMemo(
    () => computeCountdown(tier, dueDate, dateReceived, now),
    [tier, dueDate, dateReceived, now],
  );

  const className = chipClassName(countdown.state, styles);
  const Icon = ICONS[countdown.state];
  const tooltipContent = `${cfg.pLevel} ${cfg.label} — SLA ${cfg.durationLabel}. ${countdown.label}.`;
  const pausedTooltip = `${cfg.pLevel} ${cfg.label} — SLA paused after Form 3 — Non-Execution Response submission. The countdown shows the intended deadline if the timer were to restart.`;

  // When the dueDate is the legacy sentinel (epoch), there's no useful
  // countdown to render alongside the paused pill — render only the pill.
  if (sentinelPaused) {
    if (variant === "plain") {
      return (
        <Tooltip content={pausedTooltip} relationship="label" withArrow>
          <span
            className={`${styles.plain} ${styles.plainPaused}`}
            aria-label={pausedTooltip}
          >
            <Pause20Regular />
            SLA paused
          </span>
        </Tooltip>
      );
    }
    return (
      <Tooltip content={pausedTooltip} relationship="label" withArrow>
        <Badge
          className={styles.pausedChip}
          size={size === "compact" ? "small" : "medium"}
          appearance="outline"
          shape="rounded"
          icon={size === "compact" ? undefined : <Pause20Regular />}
          aria-label={pausedTooltip}
        >
          SLA paused
        </Badge>
      </Tooltip>
    );
  }

  const countdownChip = variant === "plain" ? (
    <Tooltip content={tooltipContent} relationship="label" withArrow>
      <span
        className={`${styles.plain} ${plainStateClass(countdown.state, styles)}`}
        aria-label={tooltipContent}
      >
        <Icon />
        {countdown.label}
      </span>
    </Tooltip>
  ) : (
    <Tooltip content={tooltipContent} relationship="label" withArrow>
      <Badge
        className={className}
        size={size === "compact" ? "small" : "medium"}
        appearance="outline"
        shape="rounded"
        icon={size === "compact" ? undefined : <Icon />}
        aria-label={tooltipContent}
      >
        {countdown.label}
      </Badge>
    </Tooltip>
  );

  if (!isPaused) return countdownChip;

  // Paused: show the intended-deadline countdown AND a small paused pill
  // beside it so the RS can see both the would-be deadline and the
  // halted state at a glance.
  return (
    <span className={styles.pausedRow}>
      {countdownChip}
      <Tooltip content={pausedTooltip} relationship="label" withArrow>
        <Badge
          className={styles.pausedChip}
          size="small"
          appearance="outline"
          shape="rounded"
          icon={<Pause20Regular />}
          aria-label={pausedTooltip}
        >
          SLA paused
        </Badge>
      </Tooltip>
    </span>
  );
}

const ICONS: Record<CountdownState, React.ComponentType> = {
  OnTrack: Clock20Regular,
  Approaching: Warning20Regular,
  Overdue: ErrorCircle20Regular,
};

function chipClassName(
  state: CountdownState,
  styles: ReturnType<typeof useStyles>,
): string {
  switch (state) {
    case "Overdue":
      return styles.overdueChip;
    case "Approaching":
      return styles.approachingChip;
    case "OnTrack":
    default:
      return styles.onTrackChip;
  }
}

function plainStateClass(
  state: CountdownState,
  styles: ReturnType<typeof useStyles>,
): string {
  switch (state) {
    case "Overdue":
      return styles.plainOverdue;
    case "Approaching":
      return styles.plainApproaching;
    case "OnTrack":
    default:
      return styles.plainOnTrack;
  }
}
