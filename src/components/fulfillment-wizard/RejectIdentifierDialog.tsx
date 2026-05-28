/**
 * RejectIdentifierDialog — Fluent Dialog for capturing a rejection reason.
 *
 * Used from RSEditPanel (and later from a Step 1 legal-demand viewer). The
 * `reason` field is required; the optional `documentRef` lets the RS pin
 * the rejection to a specific section of the LE document.
 */

import * as React from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Field,
  Textarea,
  Input,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

export interface RejectIdentifierDialogProps {
  open: boolean;
  identifierLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string, documentRef?: string) => void;
}

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
});

export function RejectIdentifierDialog({
  open,
  identifierLabel,
  onCancel,
  onConfirm,
}: RejectIdentifierDialogProps) {
  const styles = useStyles();
  const [reason, setReason] = React.useState("");
  const [documentRef, setDocumentRef] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setReason("");
      setDocumentRef("");
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onCancel(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Reject identifier — {identifierLabel}</DialogTitle>
          <DialogContent className={styles.body}>
            <p style={{ margin: 0, color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase200 }}>
              Marking this identifier rejected means no services or data
              categories will be collected or delivered for it. The
              identifier is excluded from submission.
            </p>
            <Field label="Reason" required>
              <Textarea
                value={reason}
                onChange={(_, data) => setReason(data.value)}
                rows={4}
                placeholder="e.g., LE document missing jurisdiction signature"
              />
            </Field>
            <Field label="Document reference (optional)" hint="Section / page in the legal demand document.">
              <Input
                value={documentRef}
                onChange={(_, data) => setDocumentRef(data.value)}
                placeholder="e.g., §3.2 or page 4"
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
            <Button
              appearance="primary"
              disabled={reason.trim().length === 0}
              onClick={() => onConfirm(reason.trim(), documentRef.trim() || undefined)}
            >
              Reject identifier
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
