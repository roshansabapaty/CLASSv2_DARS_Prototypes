/**
 * FormPreviewPanel — read-only printable layout for a form instance.
 * Used by the Preview tab inside FormFillerDialog and consumed by the
 * pdfGenerator (which serialises the rendered HTML for window.print()).
 *
 * The layout is intentionally print-friendly: fixed width, clean
 * typography, and an inline (non-tooltip) escalation banner so the same
 * source document is legible on screen and on paper.
 */

import { format, isValid } from "date-fns";
import { makeStyles, tokens } from "@fluentui/react-components";
import type {
  CaseFormInstance,
  FormField,
  FormTemplate,
} from "../../types/formTemplate";
import {
  collectEscalations,
  isFieldVisible,
  isSectionVisible,
} from "./formEngine";
import { EscalationBanner } from "./EscalationBanner";

const useStyles = makeStyles({
  page: {
    backgroundColor: tokens.colorNeutralBackground1,
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    paddingLeft: tokens.spacingHorizontalXXL,
    paddingRight: tokens.spacingHorizontalXXL,
    maxWidth: "780px",
    marginLeft: "auto",
    marginRight: "auto",
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
  },
  letterhead: {
    borderBottomWidth: "2px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke1,
    paddingBottom: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalL,
  },
  productLine: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: tokens.spacingVerticalXXS,
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  anchor: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
  },
  section: {
    marginTop: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalL,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    marginTop: 0,
    marginBottom: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  sectionDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalM,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: tokens.spacingHorizontalL,
    rowGap: tokens.spacingVerticalM,
  },
  fieldFull: {
    gridColumn: "1 / -1",
  },
  fieldLabel: {
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    marginBottom: tokens.spacingVerticalXXS,
  },
  fieldValue: {
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
    whiteSpace: "pre-wrap",
    minHeight: "1em",
  },
  fieldEmpty: {
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
  optionList: {
    listStyle: "none",
    paddingLeft: 0,
    margin: 0,
  },
  optionRow: {
    fontSize: tokens.fontSizeBase300,
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
  },
  optionChecked: {
    fontWeight: tokens.fontWeightSemibold,
  },
  signature: {
    marginTop: tokens.spacingVerticalXXL,
    paddingTop: tokens.spacingVerticalL,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: tokens.colorNeutralStroke2,
  },
  signatureRendered: {
    fontFamily: '"Segoe Script", "Caveat", cursive',
    fontSize: "32px",
    color: tokens.colorNeutralForeground1,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
  },
  signatureMeta: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  signaturePending: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
});

export interface FormPreviewPanelProps {
  template: FormTemplate;
  instance: CaseFormInstance;
}

function formatValue(field: FormField, value: unknown): React.ReactNode {
  if (value === undefined || value === null || value === "") return null;

  if (field.type === "date" && typeof value === "string") {
    const d = new Date(value);
    if (isValid(d)) return format(d, "MMM d, yyyy");
    return value;
  }

  if (field.type === "radio" || field.type === "select") {
    const opt = field.options?.find((o) => o.value === value);
    return opt ? opt.label : String(value);
  }

  if (field.type === "checkbox") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    // Resolve to option labels where possible.
    const labels = value.map((v) => {
      const opt = field.options?.find((o) => o.value === v);
      return opt ? opt.label : String(v);
    });
    return labels;
  }

  return String(value);
}

function FieldRow({ field, value }: { field: FormField; value: unknown }) {
  const styles = useStyles();
  const formatted = formatValue(field, value);
  const empty = formatted === null || formatted === undefined;

  if (field.type === "multi-checkbox" && field.options) {
    const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className={field.span === "half" ? undefined : styles.fieldFull}>
        <div className={styles.fieldLabel}>{field.label}</div>
        <ul className={styles.optionList}>
          {field.options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <li
                key={opt.value}
                className={`${styles.optionRow}${checked ? " " + styles.optionChecked : ""}`}
              >
                {checked ? "☑" : "☐"} {opt.label}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className={field.span === "half" ? undefined : styles.fieldFull}>
      <div className={styles.fieldLabel}>{field.label}</div>
      <div className={`${styles.fieldValue}${empty ? " " + styles.fieldEmpty : ""}`}>
        {empty
          ? "—"
          : Array.isArray(formatted)
          ? formatted.map((s, i) => <div key={i}>• {s}</div>)
          : formatted}
      </div>
    </div>
  );
}

export function FormPreviewPanel({ template, instance }: FormPreviewPanelProps) {
  const styles = useStyles();
  const triggers = collectEscalations(template, instance.values);

  return (
    <div className={styles.page} data-form-preview>
      <div className={styles.letterhead}>
        <div className={styles.productLine}>{template.category}</div>
        <h1 className={styles.title}>{template.name}</h1>
        {template.regulatoryAnchor && (
          <div className={styles.anchor}>{template.regulatoryAnchor}</div>
        )}
      </div>

      {triggers.length > 0 && (
        <EscalationBanner triggers={triggers} printable />
      )}

      {template.sections
        .filter((s) => isSectionVisible(s, instance.values))
        .map((section) => {
          const fields = template.fields
            .filter((f) => f.sectionId === section.id)
            .filter((f) => isFieldVisible(f, instance.values));
          if (fields.length === 0) return null;
          return (
            <section key={section.id} className={styles.section}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              {section.description && (
                <div className={styles.sectionDescription}>{section.description}</div>
              )}
              <div className={styles.fieldGrid}>
                {fields.map((field) => (
                  <FieldRow key={field.id} field={field} value={instance.values[field.id]} />
                ))}
              </div>
            </section>
          );
        })}

      <div className={styles.signature}>
        <div className={styles.fieldLabel}>Signature</div>
        {instance.signature ? (
          <>
            <div className={styles.signatureRendered}>{instance.signature.signerName}</div>
            <div className={styles.signatureMeta}>
              Signed by <strong>{instance.signature.signerName}</strong> on{" "}
              {format(new Date(instance.signature.signedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </>
        ) : (
          <div className={styles.signaturePending}>Pending — this form has not been signed yet.</div>
        )}
      </div>
    </div>
  );
}
