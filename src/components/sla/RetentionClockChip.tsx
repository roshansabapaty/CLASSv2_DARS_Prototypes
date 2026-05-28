/**
 * RetentionClockChip — coloured chip showing the 45-day post-resolution
 * retention window (Reg 2023/1543). Mounted in the sticky case header
 * alongside the SLA chip whenever `FormData.retentionClock` is present.
 *
 * Visual states (driven by days remaining):
 *   ≥ 30 days   → neutral (informational; retention just started)
 *   7–29 days   → amber   (approaching delete deadline)
 *   < 7 days    → red     (delete deadline imminent)
 *   ≤ 0 days    → red + "Retention expired" label (SP must delete now)
 *
 * Live-ticks via `useCountdownTick` (1/min) so the chip flips state
 * without the page needing to refresh.
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
  ShieldKeyhole20Regular,
  Warning20Regular,
  ErrorCircle20Regular,
} from "@fluentui/react-icons";
import type { FormData } from "../../types/caseTypes";
import { useCountdownTick } from "../../hooks/useCountdownTick";
import {
  formatRetentionReason,
  formatRetentionShortLabel,
  getRetentionStatus,
} from "../../utils/retentionClock";

const useStyles = makeStyles({
  neutralChip: {
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
    ...shorthands.borderColor(tokens.colorNeutralStroke1),
  },
  approachingChip: {
    backgroundColor: tokens.colorPaletteYellowBackground2,
    color: tokens.colorPaletteDarkOrangeForeground1,
    ...shorthands.borderColor(tokens.colorPaletteYellowBorder1),
  },
  expiredChip: {
    backgroundColor: tokens.colorPaletteRedBackground2,
    color: tokens.colorPaletteRedForeground1,
    ...shorthands.borderColor(tokens.colorPaletteRedBorder1),
  },
  tooltipContent: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
    maxWidth: "320px",
  },
  tooltipHeading: {
    fontWeight: tokens.fontWeightSemibold,
  },
  tooltipMeta: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
});

export interface RetentionClockChipProps {
  formData: FormData;
}

export function RetentionClockChip({ formData }: RetentionClockChipProps): React.ReactElement | null {
  const styles = useStyles();
  const now = useCountdownTick();
  const status = getRetentionStatus(formData, now);
  if (!status.clock) return null;

  // Pick visual + icon based on urgency.
  const urgency: "neutral" | "approaching" | "expired" =
    status.expired
      ? "expired"
      : status.daysRemaining < 7
        ? "expired"
        : status.daysRemaining < 30
          ? "approaching"
          : "neutral";

  const chipClass =
    urgency === "expired"
      ? styles.expiredChip
      : urgency === "approaching"
        ? styles.approachingChip
        : styles.neutralChip;

  const icon =
    urgency === "expired" ? (
      <ErrorCircle20Regular />
    ) : urgency === "approaching" ? (
      <Warning20Regular />
    ) : (
      <ShieldKeyhole20Regular />
    );

  const label = formatRetentionShortLabel(status);
  const expiresAt =
    status.clock.expiresAt instanceof Date
      ? status.clock.expiresAt
      : new Date(status.clock.expiresAt);

  return (
    <Tooltip
      relationship="description"
      content={
        <div className={styles.tooltipContent}>
          <span className={styles.tooltipHeading}>
            45-day retention window (Reg 2023/1543)
          </span>
          <span>{formatRetentionReason(status.clock.reason)}</span>
          <span className={styles.tooltipMeta}>
            Expires {expiresAt.toLocaleDateString()} ·{" "}
            {status.expired
              ? "Delete held data now."
              : `${status.daysRemaining} day${status.daysRemaining === 1 ? "" : "s"} remaining`}
          </span>
          {status.clock.source && (
            <span className={styles.tooltipMeta}>Source: {status.clock.source}</span>
          )}
        </div>
      }
    >
      <Badge
        appearance="outline"
        size="medium"
        icon={icon}
        className={chipClass}
        aria-label={`Retention clock: ${label}. ${formatRetentionReason(status.clock.reason)}`}
      >
        {label}
      </Badge>
    </Tooltip>
  );
}
