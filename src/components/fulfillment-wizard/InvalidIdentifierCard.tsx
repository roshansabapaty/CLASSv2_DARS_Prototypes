/**
 * InvalidIdentifierCard — replaces the LE-Review | RS-Workspace split when
 * the RS has marked the identifier as Invalid (Phase 5c.2). Wraps the
 * shared `IdentifierStatusSummary` chrome (2A in UX-Polish) with
 * Invalid-specific copy and the Restore action.
 */

import * as React from "react";
import { Button } from "@fluentui/react-components";
import { Ban, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { AccountIdentifier } from "../../types/caseTypes";
import { IdentifierStatusSummary } from "./IdentifierStatusSummary";

export interface InvalidIdentifierCardProps {
  identifier: AccountIdentifier;
  onRestore: () => void;
}

export function InvalidIdentifierCard({
  identifier,
  onRestore,
}: InvalidIdentifierCardProps) {
  const at = identifier.invalidatedAt;
  const by = identifier.invalidatedBy;
  const reason = identifier.invalidReason;
  const hasMeta = !!at || !!by;

  return (
    <IdentifierStatusSummary
      tone="warning"
      icon={<Ban size={20} aria-hidden="true" />}
      title="Identifier marked invalid — no data will be collected"
      meta={
        hasMeta ? (
          <>
            Marked invalid
            {by && <> by <b>{by}</b></>}
            {at && <> on {format(new Date(at), "yyyy-MM-dd HH:mm")}</>}
            .
          </>
        ) : undefined
      }
      details={reason ? <>"{reason}"</> : undefined}
      actions={
        <Button
          appearance="secondary"
          size="small"
          icon={<RotateCcw size={14} />}
          onClick={onRestore}
        >
          Restore identifier
        </Button>
      }
    />
  );
}
