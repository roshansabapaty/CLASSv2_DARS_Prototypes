/**
 * Soft (non-blocking) escalation warning banner shown above the FormFiller
 * and FormPreview surfaces when one or more selected option values carry an
 * EscalationTrigger.
 *
 * The trigger's `specRef` (e.g. "ETSI 6.4.4-2") is shown as a Tooltip on a
 * small Info icon in the live filler. In `printable` mode (preview tab and
 * generated PDF where hover is unavailable), the same ref renders inline
 * in parentheses next to the message.
 */

import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Info } from "lucide-react";
import type { EscalationTrigger } from "../../types/formTemplate";

const useStyles = makeStyles({
  list: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalXS,
  },
  row: {
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
  },
  level: {
    fontWeight: tokens.fontWeightSemibold,
    marginRight: tokens.spacingHorizontalXS,
  },
  infoBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: tokens.colorNeutralForeground3,
    cursor: "help",
    border: "none",
    backgroundColor: "transparent",
    padding: tokens.spacingHorizontalXXS,
    borderRadius: tokens.borderRadiusSmall,
    ":focus-visible": {
      outlineWidth: "2px",
      outlineStyle: "solid",
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "1px",
    },
  },
  inlineRef: {
    color: tokens.colorNeutralForeground3,
    marginLeft: tokens.spacingHorizontalXS,
  },
});

const LEVEL_LABEL: Record<EscalationTrigger["level"], string> = {
  Legal: "Escalate to Legal",
  LegalPolicy: "Escalate to Legal Policy",
};

export interface EscalationBannerProps {
  triggers: EscalationTrigger[];
  /** When true, render `specRef` inline parenthetically (for printable
   *  preview / generated PDF where Tooltip hover is unavailable). */
  printable?: boolean;
}

export function EscalationBanner({ triggers, printable = false }: EscalationBannerProps) {
  const styles = useStyles();
  if (!triggers.length) return null;

  return (
    <MessageBar intent="warning">
      <MessageBarBody>
        <MessageBarTitle>
          {triggers.length === 1
            ? "Review required before transmission"
            : `${triggers.length} review items before transmission`}
        </MessageBarTitle>
        <div className={styles.list}>
          {triggers.map((t, idx) => (
            <div key={`${t.level}-${idx}`} className={styles.row}>
              <span className={styles.level}>{LEVEL_LABEL[t.level]} —</span>
              <span>{t.message}</span>
              {t.specRef && !printable && (
                <Tooltip content={`Spec reference: ${t.specRef}`} relationship="description">
                  <button className={styles.infoBtn} aria-label={`Spec reference ${t.specRef}`} type="button">
                    <Info size={14} />
                  </button>
                </Tooltip>
              )}
              {t.specRef && printable && (
                <span className={styles.inlineRef}>({t.specRef})</span>
              )}
            </div>
          ))}
        </div>
      </MessageBarBody>
    </MessageBar>
  );
}
