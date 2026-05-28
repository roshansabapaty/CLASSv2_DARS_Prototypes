/**
 * SignaturePanel — typed-name + attestation signing UX.
 *
 * Phase 1 signing model:
 *  1. RS types their full name into a Fluent Input.
 *  2. RS checks an attestation Checkbox confirming they intend to sign.
 *  3. The typed name is rendered live in a cursive font stack:
 *       "Segoe Script", "Caveat", cursive
 *     so Windows users get the canonical Microsoft handwriting font and
 *     non-Windows users fall through to Caveat (loaded via index.html).
 *  4. Submit flips the parent form instance's status to Signed and stamps
 *     `signedAt` + `signerName`.
 */

import { useState } from "react";
import {
  Button,
  Checkbox,
  Field,
  Input,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { CheckCircle2 } from "lucide-react";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
  },
  preview: {
    minHeight: "60px",
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingLeft: tokens.spacingHorizontalM,
    paddingRight: tokens.spacingHorizontalM,
    borderTopWidth: "1px",
    borderRightWidth: "1px",
    borderBottomWidth: "1px",
    borderLeftWidth: "1px",
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
    borderRightColor: tokens.colorNeutralStroke2,
    borderBottomColor: tokens.colorNeutralStroke2,
    borderLeftColor: tokens.colorNeutralStroke2,
    borderTopLeftRadius: tokens.borderRadiusMedium,
    borderTopRightRadius: tokens.borderRadiusMedium,
    borderBottomLeftRadius: tokens.borderRadiusMedium,
    borderBottomRightRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
    fontFamily: '"Segoe Script", "Caveat", cursive',
    fontSize: "32px",
    color: tokens.colorNeutralForeground1,
    display: "flex",
    alignItems: "center",
  },
  previewPlaceholder: {
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
    fontSize: tokens.fontSizeBase300,
    fontFamily: tokens.fontFamilyBase,
  },
  audit: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    columnGap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
});

export interface SignaturePanelProps {
  defaultSignerName?: string;
  onCancel: () => void;
  onSign: (signerName: string) => void;
}

export function SignaturePanel({
  defaultSignerName = "",
  onCancel,
  onSign,
}: SignaturePanelProps) {
  const styles = useStyles();
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [attested, setAttested] = useState(false);

  const trimmed = signerName.trim();
  const canSign = trimmed.length > 0 && attested;

  return (
    <div className={styles.root}>
      <Field label="Signer name" required>
        <Input
          value={signerName}
          onChange={(_e, data) => setSignerName(data.value)}
          placeholder="Type your full name"
        />
      </Field>

      <Field label="Signature preview">
        <div className={styles.preview}>
          {trimmed ? (
            trimmed
          ) : (
            <span className={styles.previewPlaceholder}>
              Your typed name will render here in a signature font.
            </span>
          )}
        </div>
      </Field>

      <Checkbox
        checked={attested}
        onChange={(_e, data) => setAttested(!!data.checked)}
        label="I attest that the information in this form is accurate and that I am authorised to sign on behalf of Microsoft."
      />

      <div className={styles.audit}>
        On signing, this form will be stamped with the typed name and the current date and time.
      </div>

      <div className={styles.actions}>
        <Button appearance="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          icon={<CheckCircle2 size={16} />}
          disabled={!canSign}
          onClick={() => canSign && onSign(trimmed)}
        >
          Sign and save
        </Button>
      </div>
    </div>
  );
}
