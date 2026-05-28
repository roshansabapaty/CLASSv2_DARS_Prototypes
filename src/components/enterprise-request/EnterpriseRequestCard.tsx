/**
 * EnterpriseRequestCard — eEvidence UnderlyingConditions decision flow.
 *
 * Renders the IA's path through the ETSI UnderlyingConditions dictionary
 * (Table 5.3.3-11 / 12) as a read-only display of what the Issuing
 * Authority submitted in the eEvidence envelope, plus the cascading
 * processor-notification fields that depend on the IA's answers.
 *
 * Top-level questions (Q1, Q2) are IA-provided and read-only:
 *  - Q1: addressedToController          — shown only when YES
 *  - Q2: addressedToProcessor           — shown only when YES
 *
 * When Q2 = YES, the IA must provide one or both of the processor reasons:
 *  - AddressedToProcessorControllerUnidentified
 *  - AddressedToProcessorDetrimentalToInvestigation
 *
 * Notification details — always rendered. Two checkboxes mirror the
 * IA's permission stance on whether Microsoft can (or cannot) notify
 * the controller about this disclosure:
 *  - processorShallInformController     → "Permission to notify controller"
 *  - processorShallNotInformController  → "Permission to NOT notify controller"
 *
 * Justification + Relevant Information are free-text envelope fields
 * surfaced beneath when the IA actually wrote prose for them.
 *
 * The card is mounted as the first card under Step 4 ("Identifier & Data
 * Services") and is hidden entirely when neither Q1 nor Q2 is YES.
 */

import * as React from "react";
import {
  Card,
  Body1,
  Checkbox,
  Textarea,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { AlertCircle, Info } from "lucide-react";
import type { EEvidenceEnterpriseRequest } from "../../types/caseTypes";

const useStyles = makeStyles({
  card: {
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    paddingLeft: tokens.spacingHorizontalL,
    paddingRight: tokens.spacingHorizontalL,
    marginTop: tokens.spacingVerticalM,
  },
  header: {
    display: "flex",
    flexDirection: "column",
    marginBottom: tokens.spacingVerticalS,
  },
  level: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalXS,
    paddingLeft: tokens.spacingHorizontalM,
    borderLeftWidth: "3px",
    borderLeftStyle: "solid",
    borderLeftColor: tokens.colorBrandStroke2,
    marginTop: tokens.spacingVerticalS,
  },
  levelHeader: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontSize: tokens.fontSizeBase100,
    marginBottom: tokens.spacingVerticalXXS,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
  },
  // Paper-form layout — two columns per row: indicator-only Checkbox
  // pinned to a fixed-width LEFT column so a quick vertical scan reads
  // selected vs unselected at a glance, then the question text + helper
  // + IA-provenance caption fill the right column. Stable column widths
  // mean the boxes line up across rows like a physical survey sheet.
  checkboxField: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    columnGap: tokens.spacingHorizontalM,
    alignItems: "start",
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    // Hairline separator between rows reinforces the form-row feel.
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke3,
  },
  // First row in the card drops the top border so the header sits flush.
  checkboxFieldFirst: {
    borderTopWidth: 0,
  },
  // Right column — question text + helper + IA-provenance caption,
  // stacked vertically. (Sits to the right of the checkbox indicator.)
  labelColumn: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  // Left column — wraps the standalone Checkbox. Centered horizontally
  // so the indicator sits roughly under the column-header text rather
  // than stranded at the column's left edge. Vertical scan across rows
  // still reads as a clean column of selections.
  checkboxColumn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "24px",
    paddingTop: "2px",
  },
  // The Checkbox itself — we pass no label, so only the indicator
  // renders. Override Fluent's disabled dimming so a ticked box still
  // reads as "the IA selected this option" rather than "unavailable".
  checkboxIndicatorOnly: {
    "& .fui-Checkbox__indicator": {
      opacity: 1,
      marginRight: 0,
    },
  },
  // Column headers — same grid template as `checkboxField` so the
  // two header cells sit directly above the checkbox / question columns.
  // No top border, no IA-provenance caption: it's a label row, not data.
  columnHeaderRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    columnGap: tokens.spacingHorizontalM,
    alignItems: "end",
    paddingBottom: tokens.spacingVerticalXXS,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  columnHeaderText: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontSize: tokens.fontSizeBase100,
  },
  // Info-icon trigger sits inline at the end of the question text so it
  // trails the last word on whichever line the sentence ends on, rather
  // than reserving its own row in a flex container.
  infoTrigger: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    verticalAlign: "middle",
    marginLeft: tokens.spacingHorizontalXXS,
    color: tokens.colorNeutralForeground3,
    cursor: "help",
    border: "none",
    background: "transparent",
    padding: 0,
    "&:hover, &:focus-visible": {
      color: tokens.colorBrandForeground1,
    },
  },
  questionText: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  error: {
    color: tokens.colorStatusDangerForeground1,
    fontSize: tokens.fontSizeBase200,
    display: "flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalXS,
  },
  required: {
    color: tokens.colorStatusDangerForeground1,
    marginLeft: tokens.spacingHorizontalXXS,
  },
});

export interface EnterpriseRequestCardProps {
  value: EEvidenceEnterpriseRequest | undefined;
  /** Validation errors keyed by field name on the enterprise request block. */
  errors?: Partial<Record<keyof EEvidenceEnterpriseRequest, string>>;
}

/** Read-only IA-provided answer row, laid out as a paper-form grid:
 *  question text on the left, indicator-only checkbox pinned to a
 *  fixed-width right column so the boxes vertically align across rows.
 *  The IA's perspective on each field is binary — they either ticked
 *  the checkbox on their envelope or they didn't:
 *    - `value === true`                      → checked
 *    - `value === false` or `undefined`      → unchecked
 *  A subtle caption under the label flags the row as IA-provided +
 *  read-only. `first` drops the top border so the first row sits
 *  flush against the card header. */
function ReadOnlyAnswerRow({
  label,
  helper,
  value,
  first = false,
}: {
  label: string;
  helper?: string;
  value: boolean | undefined;
  first?: boolean;
}) {
  const styles = useStyles();
  const isChecked = value === true;
  return (
    <div
      className={
        first
          ? `${styles.checkboxField} ${styles.checkboxFieldFirst}`
          : styles.checkboxField
      }
    >
      <div className={styles.checkboxColumn}>
        <Checkbox
          checked={isChecked}
          disabled
          className={styles.checkboxIndicatorOnly}
          aria-readonly="true"
          aria-label={`${label} — Issuing Authority Response: ${
            isChecked ? "selected" : "not selected"
          }`}
        />
      </div>
      <div className={styles.labelColumn}>
        <Body1 className={styles.questionText}>
          {label}
          {helper && (
            <Tooltip
              content={helper}
              relationship="description"
              withArrow
              positioning="above"
            >
              <button
                type="button"
                className={styles.infoTrigger}
                aria-label="More information about this condition"
                tabIndex={0}
              >
                <Info size={14} aria-hidden="true" />
              </button>
            </Tooltip>
          )}
        </Body1>
      </div>
    </div>
  );
}

export function EnterpriseRequestCard({
  value,
  errors,
}: EnterpriseRequestCardProps) {
  const styles = useStyles();
  const v = value ?? {};

  // Q1 / Q2 are checkbox-style flags the IA either selected or didn't.
  // We render both rows unconditionally so the RS can see when the IA
  // submitted neither — that "no Enterprise flag at all" state is itself
  // a signal that drives the manifest-error banner when Check Accounts
  // detects an Enterprise account.
  const q1Checked = v.addressedToController === true;
  const q2Checked = v.addressedToProcessor === true;

  // Processor-reason branch still hangs under Q2 — those are Q2's
  // sub-questions and only make sense when Q2 = YES.
  const showProcessorReasons = q2Checked;

  // Notification details — always rendered alongside Q1 / Q2. The two
  // rows mirror the IA's submitted permissions on whether Microsoft can
  // (or cannot) notify the controller. We always render both so the RS
  // can see the IA's stance even when neither box is ticked — same
  // three-state treatment as Q1 / Q2 at the top of the card.

  // Justification + Relevant Information are free-text envelope fields;
  // surfaced whenever the IA actually wrote prose for them.
  const showJustification = !!v.justification && v.justification.trim().length > 0;
  const showRelevantInformation =
    !!v.relevantInformation && v.relevantInformation.trim().length > 0;
  const showTextInputs = showJustification || showRelevantInformation;

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <h3 className="text-xl font-semibold text-[#323130] m-0">
          EU e-Evidence Microsoft Scope of Application
        </h3>
      </div>

      {/* Column headers — labels the two columns of the paper-form
          grid so the indicator column reads as "the IA's input" and
          the right column reads as the condition being attested to. */}
      <div className={styles.columnHeaderRow}>
        <div
          className={styles.columnHeaderText}
          style={{ textAlign: "center" }}
        >
          IA Response
        </div>
        <div className={styles.columnHeaderText}>
          What Conditions Apply to This Request
        </div>
      </div>

      {/* Q1 — always rendered. The checkbox state mirrors what the
          IA ticked on the envelope; unticked covers both
          explicit-no and field-absent. */}
      <ReadOnlyAnswerRow
        label="This EPOC is addressed to the service provider acting as the controller?"
        helper="Yes means Microsoft is being treated as the controller of the data on this EPOC (rather than the enterprise customer that purchased the service)."
        value={v.addressedToController}
        first
      />

      {/* Q2 — always rendered, same three-state treatment as Q1. */}
      <ReadOnlyAnswerRow
        label="This EPOC applies to the data-processing service provider, or, if the controller is unknown, to the provider acting on their behalf."
        helper="Yes means the IA has also addressed Microsoft as the processor. One or both of the processor-reason fields below must be provided in the envelope."
        value={v.addressedToProcessor}
      />

      {showProcessorReasons && (
        <div className={styles.level}>
          <div className={styles.levelHeader}>
            Reasons addressed to Microsoft (the processor)
          </div>
          {v.addressedToProcessorControllerUnidentified !== undefined && (
            <ReadOnlyAnswerRow
              label="Controller cannot be identified"
              helper="IA was unable to identify the controlling organisation from the available information."
              value={v.addressedToProcessorControllerUnidentified === true}
            />
          )}
          {v.addressedToProcessorDetrimentalToInvestigation !== undefined && (
            <ReadOnlyAnswerRow
              label="Contacting the controller would be detrimental to the investigation"
              helper="Notifying the controller would compromise the investigation (e.g., risk of evidence destruction)."
              value={v.addressedToProcessorDetrimentalToInvestigation === true}
            />
          )}
        </div>
      )}

      {/* Notification details — always rendered. Both checkboxes
          mirror what the IA submitted on the envelope. The two flags
          are mutually exclusive in practice; rendering both gives the
          RS a clear read on the IA's stance even when one or both is
          unticked. */}
      <div className={styles.level}>
        <div className={styles.levelHeader}>Notification details</div>
        <ReadOnlyAnswerRow
          label="Permission to notify controller"
          helper="The IA has authorised Microsoft to inform the controller about this disclosure."
          value={v.processorShallInformController}
        />
        <ReadOnlyAnswerRow
          label="Permission to NOT notify controller"
          helper="The IA has instructed Microsoft NOT to inform the controller. The two flags are mutually exclusive in practice."
          value={v.processorShallNotInformController}
        />
      </div>

      {showTextInputs && (
        <div className={styles.level}>
          {v.justification && (
            <div className={styles.field}>
              <Body1 className={styles.questionText}>Justification:</Body1>
              <Textarea
                value={v.justification}
                readOnly
                resize="vertical"
                style={{ minHeight: "80px" }}
              />
              {errors?.justification && (
                <span className={styles.error}>
                  <AlertCircle size={14} aria-hidden="true" />
                  {errors.justification}
                </span>
              )}
            </div>
          )}

          {v.relevantInformation && (
            <div className={styles.field}>
              <Body1 className={styles.questionText}>Relevant Information:</Body1>
              <Textarea
                value={v.relevantInformation}
                readOnly
                resize="vertical"
                style={{ minHeight: "80px" }}
              />
              {errors?.relevantInformation && (
                <span className={styles.error}>
                  <AlertCircle size={14} aria-hidden="true" />
                  {errors.relevantInformation}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
