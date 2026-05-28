/**
 * ETSIStatusCard — replaces the LE-Review | RS-Workspace split when LE has
 * sent a per-identifier ETSI Desired Status of "Cancelled" or "Withdrawn".
 * Wraps the shared `IdentifierStatusSummary` chrome (2A in UX-Polish).
 *
 * Coexists with the case-level Authorization workflow (5c.3): both are
 * preserved and additive. Per the precedence in plan §5c.6, case-level wins
 * when both fire, but ETSI's audit fields remain on the identifier so
 * downstream reporting can show the original LE signal.
 */

import * as React from "react";
import { Button } from "@fluentui/react-components";
import { CircleAlert, CircleCheck } from "lucide-react";
import { format } from "date-fns";
import type { AccountIdentifier } from "../../types/caseTypes";
import { IdentifierStatusSummary } from "./IdentifierStatusSummary";

export interface ETSIStatusCardProps {
  identifier: AccountIdentifier;
  /** Acknowledge the LE-submitted ETSI status. Cascades the value to the
   *  identifier's `taskStatus`. */
  onAcknowledge: () => void;
}

export function ETSIStatusCard({ identifier, onAcknowledge }: ETSIStatusCardProps) {
  const status = identifier.etsiDesiredStatus;
  if (status !== "Cancelled" && status !== "Withdrawn") return null;

  const acknowledged = identifier.taskStatus === status;
  const updatedAt = identifier.etsiStatusUpdatedAt;
  const updatedBy = identifier.etsiStatusUpdatedBy;

  return (
    <IdentifierStatusSummary
      tone="danger"
      icon={
        acknowledged ? (
          <CircleCheck size={20} aria-hidden="true" />
        ) : (
          <CircleAlert size={20} aria-hidden="true" />
        )
      }
      title={
        <>
          ETSI status: {status} —{" "}
          {acknowledged ? "acknowledged" : "awaiting acknowledgement"}
        </>
      }
      meta={
        <>
          LE submitted this ETSI Desired Status update
          {updatedAt && <> on {format(new Date(updatedAt), "yyyy-MM-dd HH:mm")}</>}
          {updatedBy && <> by <b>{updatedBy}</b></>}
          .
        </>
      }
      body={
        acknowledged ? (
          <>
            Task status flipped to <b>{status}</b>. No service mapping or job
            submission will run for this identifier. The case continues normally
            for other identifiers.
          </>
        ) : (
          <>
            Acknowledge to set this identifier's internal task status to{" "}
            <b>{status}</b>. Service mapping is bypassed and the identifier is
            excluded from Step 3 submission. The rest of the case continues
            normally.
          </>
        )
      }
      actions={
        !acknowledged ? (
          <Button appearance="primary" size="small" onClick={onAcknowledge}>
            Acknowledge & set task status to {status}
          </Button>
        ) : undefined
      }
    />
  );
}
