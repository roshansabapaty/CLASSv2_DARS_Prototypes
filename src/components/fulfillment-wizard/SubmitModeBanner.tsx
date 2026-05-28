/**
 * SubmitModeBanner — Fluent v9 MessageBar at top of Step 3 explaining what
 * clicking Submit will actually do, given:
 *   - fresh submission (no in-flight jobs) → info
 *   - in-flight edit with changes           → warning
 *   - in-flight edit with no changes        → success
 */

import React from "react";
import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import type { ActionTotals } from "./leBaseline";

const useStyles = makeStyles({
  banner: {
    marginBottom: tokens.spacingVerticalM,
  },
});

export type SubmitMode = "fresh" | "in-flight-changes" | "in-flight-no-changes";

export interface SubmitModeBannerProps {
  mode: SubmitMode;
  identifierCount: number;
  createCount: number;      // total new jobs to be created at submit
  actionTotals: ActionTotals;
}

export function SubmitModeBanner({
  mode,
  identifierCount,
  createCount,
  actionTotals,
}: SubmitModeBannerProps) {
  const styles = useStyles();

  if (mode === "fresh") {
    return (
      <MessageBar intent="info" className={styles.banner}>
        <MessageBarBody>
          <MessageBarTitle>First fulfillment submission</MessageBarTitle>
          {" "}
          {createCount} collection job{createCount === 1 ? "" : "s"} will be created across {identifierCount} identifier{identifierCount === 1 ? "" : "s"} when you click Submit.
        </MessageBarBody>
      </MessageBar>
    );
  }

  if (mode === "in-flight-no-changes") {
    return (
      <MessageBar intent="success" className={styles.banner}>
        <MessageBarBody>
          <MessageBarTitle>All running jobs match the LE request</MessageBarTitle>
          {" "}
          {actionTotals.noChange} job{actionTotals.noChange === 1 ? " is" : "s are"} already in flight and the current plan matches what was requested. Submit will confirm no changes.
        </MessageBarBody>
      </MessageBar>
    );
  }

  // in-flight-changes
  const { creates, updates, cancels } = actionTotals;
  const parts: string[] = [];
  if (creates > 0) parts.push(`${creates} new job${creates === 1 ? "" : "s"}`);
  if (updates > 0) parts.push(`${updates} date-range update${updates === 1 ? "" : "s"}`);
  if (cancels > 0) parts.push(`${cancels} job cancellation${cancels === 1 ? "" : "s"}`);

  return (
    <MessageBar intent="warning" className={styles.banner}>
      <MessageBarBody>
        <MessageBarTitle>Changes to an in-flight fulfillment</MessageBarTitle>
        {" "}
        Submit will: {parts.join(" · ")}.
      </MessageBarBody>
    </MessageBar>
  );
}
