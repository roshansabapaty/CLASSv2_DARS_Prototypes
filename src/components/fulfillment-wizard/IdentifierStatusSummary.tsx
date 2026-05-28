/**
 * IdentifierStatusSummary — shared chrome for the four "this identifier is
 * in a terminal state" cards that swap into the accordion body in place of
 * the LE/RS split-pane: Rejected, ETSI Cancelled/Withdrawn, Invalid, and
 * Not Found.
 *
 * Before 2A (UX-Polish), each of those cards re-implemented the same
 * bordered-card chrome with slight tone variations. The four wrappers in
 * this folder now delegate to this one component so the icon + title +
 * "Skipped from submission" tag layout is defined exactly once. Reason /
 * timestamp / actor live behind a "Show details" disclosure to keep the
 * default presentation a short 3-line summary.
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ ⓧ  Identifier rejected — no data will be collected   [Skipped]  │
 *   │ Reason · who · when · ref                                       │
 *   │ [▸ Show details]            [Restore identifier]                │
 *   └─────────────────────────────────────────────────────────────────┘
 */

import * as React from "react";
import {
  Button,
  Tag,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

export type IdentifierStatusTone = "danger" | "warning";

export interface IdentifierStatusSummaryProps {
  tone: IdentifierStatusTone;
  /** Lucide / Fluent icon, ~20px. Caller passes the JSX so colour can be
   *  derived from `tone` inside the component. */
  icon: React.ReactNode;
  /** Short status sentence — e.g., "Identifier rejected — no data will be
   *  collected." Renders as the header row's primary text. */
  title: React.ReactNode;
  /** Right-aligned chip in the header row. Defaults to "Skipped from
   *  submission" — pass `null` to suppress. */
  rightTag?: React.ReactNode;
  /** Optional meta line — e.g., "Rejected by Nicole on 2026-05-22 at 10:14". */
  meta?: React.ReactNode;
  /** Optional body paragraph — explanatory text or instructions for the RS. */
  body?: React.ReactNode;
  /** Optional collapsible details (reason text, full audit trail). When
   *  provided, a "Show details" / "Hide details" toggle is rendered above
   *  the actions row. */
  details?: React.ReactNode;
  /** Optional action buttons (Restore, Acknowledge, View document, …). */
  actions?: React.ReactNode;
}

const useStyles = makeStyles({
  cardBase: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalM,
    paddingRight: tokens.spacingHorizontalL,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "4px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
  },
  cardDanger: {
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderLeftColor: tokens.colorPaletteRedBorderActive,
  },
  cardWarning: {
    backgroundColor: tokens.colorPaletteYellowBackground1,
    borderLeftColor: tokens.colorPaletteDarkOrangeBorderActive,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  headerDanger: { color: tokens.colorPaletteRedForeground1 },
  headerWarning: { color: tokens.colorPaletteDarkOrangeForeground1 },
  meta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  body: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  details: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    paddingTop: tokens.spacingVerticalXS,
  },
  detailsToggleRow: {
    display: "flex",
    justifyContent: "flex-start",
  },
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    flexWrap: "wrap",
  },
});

export function IdentifierStatusSummary({
  tone,
  icon,
  title,
  rightTag,
  meta,
  body,
  details,
  actions,
}: IdentifierStatusSummaryProps) {
  const styles = useStyles();
  const [showDetails, setShowDetails] = React.useState(false);

  const cardClass =
    tone === "danger"
      ? `${styles.cardBase} ${styles.cardDanger}`
      : `${styles.cardBase} ${styles.cardWarning}`;
  const headerClass =
    tone === "danger"
      ? `${styles.header} ${styles.headerDanger}`
      : `${styles.header} ${styles.headerWarning}`;

  const showSkippedDefault = rightTag === undefined;

  return (
    <div className={cardClass}>
      <div className={headerClass}>
        {icon}
        <span style={{ flex: 1 }}>{title}</span>
        {showSkippedDefault ? (
          <Tag appearance="filled" size="small">
            Skipped from submission
          </Tag>
        ) : (
          rightTag
        )}
      </div>
      {meta && <div className={styles.meta}>{meta}</div>}
      {body && <div className={styles.body}>{body}</div>}
      {details && showDetails && <div className={styles.details}>{details}</div>}
      {details && (
        <div className={styles.detailsToggleRow}>
          <Button
            appearance="transparent"
            size="small"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
          >
            {showDetails ? "Hide details" : "Show details"}
          </Button>
        </div>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
