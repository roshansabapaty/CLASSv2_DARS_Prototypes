/**
 * AuthorizationStatusBanner — case-level banner shown at the top of Step 2
 * when LE has marked the authorization as Cancelled or Withdrawn (Phase 5c.3).
 *
 * This banner COMPLEMENTS the existing case-level cancellation workflow
 * (the CancellationBadge in CaseHeaderSummary opens a multi-step modal). It
 * is a Step-2-specific reminder so RS configuring services can see and
 * acknowledge the cancellation in-place without leaving the wizard.
 *
 * - Pre-acknowledge: red banner with "Acknowledge & withdraw all targets"
 *   primary action.
 * - Post-acknowledge: same banner reads "Acknowledged on {date} by {who}";
 *   action button disabled.
 */

import * as React from "react";
import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarActions,
  Button,
} from "@fluentui/react-components";
import { format } from "date-fns";

export interface AuthorizationStatusBannerProps {
  /** The current case-level authorization status (e.g. "Cancelled", "Withdrawn"). */
  status: string | undefined;
  /** Timestamp of when LE submitted the status update. */
  updatedAt?: Date;
  /** Actor who submitted the status update (typically "LE Agency"). */
  updatedBy?: string;
  /** Set once the RS has acknowledged the status. After this, the banner
   *  shows the acknowledged state and the Acknowledge button is disabled. */
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  /** Acknowledge action — cascades the case-level status to every
   *  identifier's `taskStatus` and locks the wizard. */
  onAcknowledge: () => void;
  /** Optional. When provided AND the banner is in the post-acknowledged
   *  state, a secondary "Resolve Case" Button is rendered next to the
   *  disabled Acknowledged button. Clicking it should open the shared
   *  ResolveCaseDialog. */
  onResolve?: () => void;
  /** When true, the secondary Resolve CTA is suppressed (e.g. because the
   *  case is already resolved). */
  caseResolved?: boolean;
}

/** True when the case-level status is one this banner should surface. */
export function isAuthorizationStatusTerminal(status: string | undefined): boolean {
  return status === "Cancelled" || status === "Withdrawn";
}

export function AuthorizationStatusBanner({
  status,
  updatedAt,
  updatedBy,
  acknowledgedAt,
  acknowledgedBy,
  onAcknowledge,
  onResolve,
  caseResolved,
}: AuthorizationStatusBannerProps) {
  if (!isAuthorizationStatusTerminal(status)) return null;

  const acknowledged = !!acknowledgedAt;
  return (
    <MessageBar intent="error" style={{ marginBottom: 12 }}>
      <MessageBarBody>
        <MessageBarTitle>
          LE has marked this authorization as {status}
          {updatedAt && (
            <> on {format(new Date(updatedAt), "MMM d, yyyy")}</>
          )}
          {updatedBy && <> by {updatedBy}</>}
          .
        </MessageBarTitle>
        {acknowledged ? (
          <span>
            {" "}
            Acknowledged
            {acknowledgedAt && (
              <> on {format(new Date(acknowledgedAt), "yyyy-MM-dd HH:mm")}</>
            )}
            {acknowledgedBy && <> by <b>{acknowledgedBy}</b></>}
            . The wizard is read-only; no services will be collected for any
            identifier.
          </span>
        ) : (
          <span>
            {" "}No services will be collected for any identifier. Acknowledge
            to set every identifier's task status to <b>{status}</b>.
          </span>
        )}
      </MessageBarBody>
      <MessageBarActions>
        <Button
          appearance="primary"
          size="small"
          onClick={onAcknowledge}
          disabled={acknowledged}
        >
          {acknowledged ? "Acknowledged" : `Acknowledge & withdraw all targets`}
        </Button>
        {acknowledged && onResolve && !caseResolved && (
          <Button
            appearance="secondary"
            size="small"
            onClick={onResolve}
          >
            Resolve Case
          </Button>
        )}
      </MessageBarActions>
    </MessageBar>
  );
}
