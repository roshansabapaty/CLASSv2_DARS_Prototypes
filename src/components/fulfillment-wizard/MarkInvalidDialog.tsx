/**
 * MarkInvalidDialog — Fluent Dialog for capturing the reason an RS marked
 * a target identifier as invalid (Phase 5c.2).
 *
 * Distinct from RejectIdentifierDialog in semantics: a Rejected identifier
 * means the RS rejected the legal demand for it; an Invalid identifier
 * means the identifier value itself is bad (typo, malformed, wrong
 * subscriber). Both behave the same for routing / submission (skipped).
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
  makeStyles,
  tokens,
} from "@fluentui/react-components";

export interface MarkInvalidDialogProps {
  open: boolean;
  identifierLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
});

export function MarkInvalidDialog({
  open,
  identifierLabel,
  onCancel,
  onConfirm,
}: MarkInvalidDialogProps) {
  const styles = useStyles();
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onCancel(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Mark identifier as invalid — {identifierLabel}</DialogTitle>
          <DialogContent className={styles.body}>
            <p style={{ margin: 0, color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase200 }}>
              Marking this identifier invalid means the value itself is
              bad — typo, malformed, or wrong subscriber. The identifier
              is skipped from service mapping and submission. You can
              restore it later if needed.
            </p>
            <Field label="Reason" required>
              <Textarea
                value={reason}
                onChange={(_, data) => setReason(data.value)}
                rows={4}
                placeholder="e.g., Email format invalid, typo in domain"
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
            <Button
              appearance="primary"
              disabled={reason.trim().length === 0}
              onClick={() => onConfirm(reason.trim())}
            >
              Mark invalid
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
