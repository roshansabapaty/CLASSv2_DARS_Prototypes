/**
 * TransmissionStepper — visual lifecycle for an outbound correspondence item.
 *
 * Shows the canonical happy path:
 *   Draft → Sent → Delivered → Acknowledged → Responded
 *
 * The current step pulls from `item.transmission.status`. Steps preceding
 * the current step render as done (green check). Future steps render as
 * pending (grey). Failed status replaces the future chain with a red
 * "Failed" marker and surfaces the failure reason below.
 *
 * Each completed step shows its timestamp + actor where available.
 */

import * as React from "react";
import {
  Body1,
  Caption1,
  Caption2,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  tokens,
} from "@fluentui/react-components";
import {
  CheckmarkCircle20Filled,
  Circle20Regular,
  ErrorCircle20Filled,
} from "@fluentui/react-icons";
import type {
  OutboundCorrespondenceItem,
  OutboundTransmissionStatus,
} from "../../types/correspondence";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
  },
  row: {
    display: "flex",
    alignItems: "flex-start",
    columnGap: tokens.spacingHorizontalM,
  },
  iconCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    minWidth: "20px",
  },
  connector: {
    flex: "1 1 auto",
    width: "2px",
    minHeight: "16px",
    marginTop: "2px",
    marginBottom: "2px",
    backgroundColor: tokens.colorNeutralStroke2,
  },
  connectorDone: { backgroundColor: tokens.colorPaletteGreenBorderActive },
  connectorPending: { backgroundColor: tokens.colorNeutralStroke3 },
  body: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalM,
    minWidth: 0,
  },
  doneIcon: { color: tokens.colorPaletteGreenForeground1 },
  pendingIcon: { color: tokens.colorNeutralForeground3 },
  failedIcon: { color: tokens.colorPaletteRedForeground1 },
  meta: {
    color: tokens.colorNeutralForeground3,
  },
});

interface StepDef {
  status: OutboundTransmissionStatus;
  label: string;
}

const STEPS: StepDef[] = [
  { status: "Draft", label: "Draft" },
  { status: "Sent", label: "Sent" },
  { status: "Delivered", label: "Delivered" },
  { status: "Acknowledged", label: "Acknowledged" },
  { status: "Responded", label: "Responded" },
];

const STATUS_RANK: Record<OutboundTransmissionStatus, number> = {
  Draft: 0,
  Sent: 1,
  Delivered: 2,
  Acknowledged: 3,
  Responded: 4,
  Failed: -1,
};

function formatTimestamp(d: Date | string | undefined): string | undefined {
  if (!d) return undefined;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timestampFor(
  status: OutboundTransmissionStatus,
  item: OutboundCorrespondenceItem,
): { ts?: string; actor?: string; refLine?: string } {
  const t = item.transmission;
  switch (status) {
    case "Draft":
      return { ts: formatTimestamp(item.createdAt) };
    case "Sent":
      return { ts: formatTimestamp(t.sentAt), actor: t.sentBy };
    case "Delivered":
      return {
        ts: formatTimestamp(t.deliveredAt),
        actor: t.deliveryConfirmedBy ? `via ${t.deliveryConfirmedBy}` : undefined,
      };
    case "Acknowledged":
      return {
        ts: formatTimestamp(t.acknowledgedAt),
        refLine: t.acknowledgementRef ? `Ref: ${t.acknowledgementRef}` : undefined,
      };
    case "Responded":
      return { ts: formatTimestamp(t.respondedAt) };
    default:
      return {};
  }
}

export interface TransmissionStepperProps {
  item: OutboundCorrespondenceItem;
}

export function TransmissionStepper({ item }: TransmissionStepperProps) {
  const styles = useStyles();
  const currentRank = STATUS_RANK[item.transmission.status];
  const isFailed = item.transmission.status === "Failed";

  return (
    <div className={styles.root}>
      {isFailed && (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Transmission failed</MessageBarTitle>
            {item.transmission.failureReason ?? "No further details available."}
          </MessageBarBody>
        </MessageBar>
      )}
      {STEPS.map((step, idx) => {
        const stepRank = STATUS_RANK[step.status];
        const isDone = !isFailed && stepRank <= currentRank;
        const isCurrent = !isFailed && stepRank === currentRank;
        const isLast = idx === STEPS.length - 1;
        const stamp = timestampFor(step.status, item);
        return (
          <div key={step.status} className={styles.row}>
            <div className={styles.iconCol}>
              {isDone ? (
                <CheckmarkCircle20Filled className={styles.doneIcon} />
              ) : (
                <Circle20Regular className={styles.pendingIcon} />
              )}
              {!isLast && (
                <div
                  className={`${styles.connector} ${
                    stepRank < currentRank
                      ? styles.connectorDone
                      : styles.connectorPending
                  }`}
                />
              )}
            </div>
            <div className={styles.body}>
              <Body1>
                <strong>{step.label}</strong>
                {isCurrent && (
                  <Caption1 className={styles.meta}> · current</Caption1>
                )}
              </Body1>
              {stamp.ts && (
                <Caption2 className={styles.meta}>
                  {stamp.ts}
                  {stamp.actor ? ` · ${stamp.actor}` : ""}
                </Caption2>
              )}
              {stamp.refLine && (
                <Caption2 className={styles.meta}>{stamp.refLine}</Caption2>
              )}
            </div>
          </div>
        );
      })}
      {isFailed && (
        <div className={styles.row}>
          <div className={styles.iconCol}>
            <ErrorCircle20Filled className={styles.failedIcon} />
          </div>
          <div className={styles.body}>
            <Body1>
              <strong>Failed</strong>
            </Body1>
            {item.transmission.failedAt && (
              <Caption2 className={styles.meta}>
                {formatTimestamp(item.transmission.failedAt)}
              </Caption2>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
