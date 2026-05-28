/**
 * RedirectToEnterpriseDialog — composes the outbound letter that
 * redirects the requesting agency to the tenant admin contact.
 *
 * Phase 4 of the prototype-to-prod merge. The dialog drafts a
 * production-letter preview and bubbles it back via the parent's
 * action callback. The parent decides what "send" actually does
 * (typically: append to the case's correspondence list as a Draft).
 */

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Text,
  Textarea,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useState } from "react";
import { CURRENT_USER } from "../../../constants/caseConstants";
import type { FormData } from "../../../types/caseTypes";
import type { EnterpriseCtaAction } from "../enterpriseCtaTypes";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
    minWidth: "480px",
  },
  preview: {
    paddingTop: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    paddingBottom: tokens.spacingHorizontalM,
    paddingLeft: tokens.spacingHorizontalM,
    backgroundColor: tokens.colorNeutralBackground2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    whiteSpace: "pre-wrap",
  },
});

interface Props {
  case: FormData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (a: EnterpriseCtaAction) => void;
}

export function RedirectToEnterpriseDialog({
  case: c,
  open,
  onOpenChange,
  onAction,
}: Props) {
  const styles = useStyles();
  const [notes, setNotes] = useState("");

  const org = c.enterpriseContext?.org;
  const preview = `Dear ${c.agency ?? "[Agency]"},

Microsoft has received your request under case ${c.caseId}. The targeted account belongs to an enterprise customer (${org?.tenantDisplayName ?? "—"}). Pursuant to our process, please redirect this request to:

  ${org?.adminContact?.name ?? "Tenant Admin"}
  ${org?.adminContact?.email ?? "—"}
  ${org?.adminContact?.phone ?? "—"}

Sincerely,
Microsoft LERS`;

  const send = () => {
    const now = new Date();
    onAction({
      kind: "redirectToEnterprise",
      correspondenceBody: preview + (notes ? `\n\nNotes:\n${notes}` : ""),
      audit: {
        id: `audit-redirect-${Date.now().toString(36)}`,
        kind: "RedirectedToEnterprise",
        actor: CURRENT_USER,
        actorRole: "Attorney",
        performedAt: now,
        note: notes || "Redirect production letter drafted.",
      },
    });
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, d) => onOpenChange(d.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Redirect to Enterprise</DialogTitle>
          <DialogContent className={styles.body}>
            <Text>
              Draft an outbound letter back to the requesting agency
              pointing them at the tenant admin contact.
            </Text>
            <div className={styles.preview}>{preview}</div>
            <Field label="Additional notes (optional)">
              <Textarea
                rows={3}
                value={notes}
                onChange={(_, d) => setNotes(d.value)}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Cancel</Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={send}>
              Create draft
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
