/**
 * RejectedIdentifierCard — replaces the split-pane when an identifier has
 * `rejection` set. Wraps the shared `IdentifierStatusSummary` chrome (see
 * 2A in UX-Polish) with the rejection-specific copy and actions.
 */

import * as React from "react";
import { Button } from "@fluentui/react-components";
import { XCircle, FileText, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { AccountIdentifier } from "../../types/caseTypes";
import { IdentifierStatusSummary } from "./IdentifierStatusSummary";

export interface RejectedIdentifierCardProps {
  identifier: AccountIdentifier;
  onRestore: () => void;
  onViewDocument?: () => void;
}

export function RejectedIdentifierCard({
  identifier,
  onRestore,
  onViewDocument,
}: RejectedIdentifierCardProps) {
  const r = identifier.rejection;
  if (!r) return null;

  return (
    <IdentifierStatusSummary
      tone="danger"
      icon={<XCircle size={20} aria-hidden="true" />}
      title="Identifier rejected — no data will be collected"
      meta={
        <>
          Rejected by <b>{r.rejectedBy}</b> on{" "}
          {format(new Date(r.rejectedAt), "yyyy-MM-dd HH:mm")}
          {r.documentRef && <> · ref {r.documentRef}</>}
        </>
      }
      details={<>"{r.reason}"</>}
      actions={
        <>
          {onViewDocument && (
            <Button
              appearance="secondary"
              size="small"
              icon={<FileText size={14} />}
              onClick={onViewDocument}
            >
              View document
            </Button>
          )}
          <Button
            appearance="secondary"
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={onRestore}
          >
            Restore identifier
          </Button>
        </>
      }
    />
  );
}
