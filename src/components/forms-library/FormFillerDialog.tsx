/**
 * FormFillerDialog — large modal for authoring + signing a CaseFormInstance.
 *
 * Two tabs: "Fill" (sectioned inputs, autosaved on every keystroke) and
 * "Preview" (read-only printable layout). Header hosts the EscalationBanner.
 * Footer: Save Draft + Sign. Signing transitions through SignaturePanel.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Radio,
  RadioGroup,
  Tab,
  TabList,
  Textarea,
  makeStyles,
  tokens,
  type TabValue,
} from "@fluentui/react-components";
import { CheckCircle2, Download, Save } from "lucide-react";
import type {
  CaseFormInstance,
  FormField,
  FormInstanceSignature,
  FormTemplate,
} from "../../types/formTemplate";
import {
  collectEscalations,
  isFieldVisible,
  isSectionVisible,
  validateInstance,
} from "./formEngine";
import { EscalationBanner } from "./EscalationBanner";
import { FormPreviewPanel } from "./FormPreviewPanel";
import { SignaturePanel } from "./SignaturePanel";
import { generateFormPdf } from "./pdfGenerator";

const useStyles = makeStyles({
  surface: {
    width: "min(95vw, 1080px)",
    maxWidth: "1080px",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalM,
    minHeight: "60vh",
    maxHeight: "78vh",
    overflowY: "auto",
  },
  fillBody: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalL,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalM,
    borderBottomWidth: "1px",
    borderBottomStyle: "solid",
    borderBottomColor: tokens.colorNeutralStroke2,
  },
  sectionTitle: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    margin: 0,
  },
  sectionDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: tokens.spacingHorizontalM,
    rowGap: tokens.spacingVerticalS,
  },
  fieldFull: { gridColumn: "1 / -1" },
  multiCheckboxGroup: {
    display: "flex",
    flexDirection: "column",
    rowGap: tokens.spacingVerticalXS,
  },
  optionEscalation: {
    display: "block",
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteDarkOrangeBackground3,
    marginLeft: "26px",
    marginTop: tokens.spacingVerticalXXS,
  },
  signingPanel: {
    paddingTop: tokens.spacingVerticalL,
  },
  validationHint: {
    display: "inline-flex",
    alignItems: "center",
    columnGap: tokens.spacingHorizontalS,
    marginRight: "auto",  // push the hint left, leaving Save/Continue at right
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteRedForeground1,
  },
  showMissingLink: {
    background: "none",
    borderWidth: 0,
    padding: 0,
    color: tokens.colorBrandForeground1,
    textDecorationLine: "underline",
    cursor: "pointer",
    fontSize: tokens.fontSizeBase200,
  },
  fieldAnchor: {
    scrollMarginTop: tokens.spacingVerticalXXL,
  },
});

export interface FormFillerDialogProps {
  open: boolean;
  template: FormTemplate;
  instance: CaseFormInstance;
  onUpdate: (instanceId: string, partial: Partial<CaseFormInstance>) => void;
  onClose: () => void;
}

type Mode = "fill-or-preview" | "sign";

export function FormFillerDialog({
  open,
  template,
  instance,
  onUpdate,
  onClose,
}: FormFillerDialogProps) {
  const styles = useStyles();
  const [activeTab, setActiveTab] = useState<TabValue>("fill");
  const [mode, setMode] = useState<Mode>("fill-or-preview");
  // Pending field id to scroll-into-view + focus once the Fill tab commits.
  // Used by the "Show missing" link in the dialog footer.
  const [pendingScrollFieldId, setPendingScrollFieldId] = useState<
    string | null
  >(null);

  const triggers = useMemo(
    () => collectEscalations(template, instance.values),
    [template, instance.values],
  );

  const validation = useMemo(
    () => validateInstance(template, instance.values, "fill"),
    [template, instance.values],
  );

  // After the user clicks "Show missing", the request is captured in
  // `pendingScrollFieldId`. This effect runs after React commits — including
  // any tab switch from Preview → Fill — so the field is guaranteed to be
  // in the DOM by the time we look it up.
  useEffect(() => {
    if (!pendingScrollFieldId) return;
    if (activeTab !== "fill") return;
    const el = document.getElementById(`fillerfield-${pendingScrollFieldId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Prefer the first interactive control; fall back to the wrapper itself
    // (Fluent's Field renders the input as a deeper child than a direct
    // Input/Textarea, so include common containers and inputs of any type).
    const focusable = el.querySelector<HTMLElement>(
      'input:not([type="hidden"]), textarea, select, [role="radio"], [role="checkbox"], button:not([disabled])',
    );
    (focusable ?? el).focus({ preventScroll: true });
    setPendingScrollFieldId(null);
  }, [pendingScrollFieldId, activeTab]);

  const setValue = (fieldId: string, value: unknown) => {
    onUpdate(instance.instanceId, {
      values: { ...instance.values, [fieldId]: value },
      updatedAt: new Date(),
    });
  };

  const handleSign = (signerName: string) => {
    const now = new Date();
    const todayIso = now.toISOString().slice(0, 10);
    // Backfill any `signingTime` fields with what we know at sign time so
    // the printed form / PDF carries the signer name + date even when the
    // user advanced through the Fill page without filling them in.
    const signingTimePatch: Record<string, unknown> = {};
    for (const field of template.fields) {
      if (!field.signingTime) continue;
      const existing = instance.values[field.id];
      const isEmpty =
        existing === undefined ||
        existing === null ||
        existing === "" ||
        (Array.isArray(existing) && existing.length === 0);
      if (!isEmpty) continue;
      if (field.type === "date") {
        signingTimePatch[field.id] = todayIso;
      } else {
        signingTimePatch[field.id] = signerName;
      }
    }
    const signature: FormInstanceSignature = {
      signerName,
      signedAt: now,
      attestation: true,
    };
    onUpdate(instance.instanceId, {
      status: "Signed",
      signature,
      values: { ...instance.values, ...signingTimePatch },
      updatedAt: now,
    });
    setMode("fill-or-preview");
    setActiveTab("preview");
  };

  const isSigned = instance.status === "Signed";

  return (
    <Dialog open={open} onOpenChange={(_e, data) => !data.open && onClose()}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogContent className={styles.body}>
            {triggers.length > 0 && <EscalationBanner triggers={triggers} />}

            {/* Unresolved-placeholder soft warning. Only populated when
             *  the template carries `flagUnresolvedPlaceholders` (RFI /
             *  PAI letter scaffolds). Soft warning — does NOT block the
             *  Sign action; the Specialist can proceed at their
             *  discretion. Clicking "Show me where" scrolls to the
             *  first unresolved field and focuses it. */}
            {validation.unresolvedPlaceholders &&
              validation.unresolvedPlaceholders.length > 0 && (
                <MessageBar intent="warning">
                  <MessageBarBody>
                    <MessageBarTitle>
                      {validation.unresolvedPlaceholders.length === 1
                        ? "Unresolved placeholder in the body"
                        : `${validation.unresolvedPlaceholders.length} unresolved placeholders in the body`}
                    </MessageBarTitle>
                    <div>
                      The letter still contains <code>[bracketed]</code>{" "}
                      placeholders that haven't been filled in. You can sign
                      anyway, but reviewers expect these to be replaced
                      with the case-specific text before transmission.
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <Button
                        size="small"
                        appearance="secondary"
                        onClick={() => {
                          const first = validation.unresolvedPlaceholders?.[0];
                          if (!first) return;
                          if (activeTab !== "fill") setActiveTab("fill");
                          setPendingScrollFieldId(first);
                        }}
                      >
                        Show me where
                      </Button>
                    </div>
                  </MessageBarBody>
                </MessageBar>
              )}

            <TabList
              selectedValue={activeTab}
              onTabSelect={(_e, data) => setActiveTab(data.value)}
            >
              <Tab value="fill">Fill</Tab>
              <Tab value="preview">Preview</Tab>
            </TabList>

            {mode === "sign" ? (
              <div className={styles.signingPanel}>
                <SignaturePanel
                  defaultSignerName={
                    typeof instance.values.H_authorisedName === "string"
                      ? (instance.values.H_authorisedName as string)
                      : ""
                  }
                  onCancel={() => setMode("fill-or-preview")}
                  onSign={handleSign}
                />
              </div>
            ) : activeTab === "fill" ? (
              <div className={styles.fillBody}>
                {template.sections
                  .filter((s) => isSectionVisible(s, instance.values))
                  .map((section) => {
                    const fields = template.fields
                      .filter((f) => f.sectionId === section.id)
                      .filter((f) => isFieldVisible(f, instance.values));
                    if (fields.length === 0) return null;
                    return (
                      <div key={section.id} className={styles.section}>
                        <h3 className={styles.sectionTitle}>{section.title}</h3>
                        {section.description && (
                          <div className={styles.sectionDescription}>{section.description}</div>
                        )}
                        <div className={styles.fieldGrid}>
                          {fields.map((field) => (
                            <div
                              key={field.id}
                              id={`fillerfield-${field.id}`}
                              className={styles.fieldAnchor}
                              style={
                                field.span === "half"
                                  ? undefined
                                  : { gridColumn: "1 / -1" }
                              }
                            >
                              <FieldInput
                                field={field}
                                value={instance.values[field.id]}
                                onChange={(v) => setValue(field.id, v)}
                                isMissing={validation.missingFieldIds.includes(field.id)}
                                readOnly={isSigned}
                                styles={styles}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <FormPreviewPanel template={template} instance={instance} />
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Close
            </Button>
            {isSigned ? (
              <Button
                appearance="primary"
                icon={<Download size={16} />}
                onClick={() => generateFormPdf(template, instance)}
              >
                Download PDF
              </Button>
            ) : (
              <>
                {!validation.ok && (
                  <span className={styles.validationHint}>
                    {validation.missingFieldIds.length} required field
                    {validation.missingFieldIds.length === 1 ? "" : "s"} remaining
                    <button
                      type="button"
                      className={styles.showMissingLink}
                      onClick={() => {
                        const firstId = validation.missingFieldIds[0];
                        if (!firstId) return;
                        // Switch back to Fill so the field is mounted. The
                        // scroll/focus is handled by the effect on
                        // `pendingScrollFieldId` after React commits the
                        // tab change.
                        if (activeTab !== "fill") setActiveTab("fill");
                        setPendingScrollFieldId(firstId);
                      }}
                    >
                      Show missing
                    </button>
                  </span>
                )}
                <Button
                  appearance="secondary"
                  icon={<Save size={16} />}
                  onClick={onClose}
                >
                  Save Draft
                </Button>
                <Button
                  appearance="primary"
                  icon={<CheckCircle2 size={16} />}
                  disabled={!validation.ok}
                  onClick={() => setMode("sign")}
                >
                  Continue to Sign
                </Button>
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

// ── Field input renderer ─────────────────────────────────────────────────

interface FieldInputProps {
  field: FormField;
  value: unknown;
  onChange: (v: unknown) => void;
  isMissing: boolean;
  readOnly: boolean;
  styles: ReturnType<typeof useStyles>;
}

function FieldInput({ field, value, onChange, isMissing, readOnly, styles }: FieldInputProps) {
  const containerClass = field.span === "half" ? undefined : styles.fieldFull;
  const validationState: "error" | "none" = isMissing ? "error" : "none";
  const validationMessage = isMissing
    ? field.validation === "atLeastOne"
      ? "Select at least one option."
      : "This field is required."
    : undefined;
  const required = !!field.required || field.validation === "atLeastOne";

  switch (field.type) {
    case "text":
      return (
        <div className={containerClass}>
          <Field
            label={field.label}
            required={required}
            hint={field.helperText}
            validationState={validationState}
            validationMessage={validationMessage}
          >
            <Input
              value={(value as string) ?? ""}
              onChange={(_e, data) => onChange(data.value)}
              placeholder={field.placeholder}
              disabled={readOnly}
            />
          </Field>
        </div>
      );

    case "textarea":
      return (
        <div className={containerClass}>
          <Field
            label={field.label}
            required={required}
            hint={field.helperText}
            validationState={validationState}
            validationMessage={validationMessage}
          >
            <Textarea
              value={(value as string) ?? ""}
              onChange={(_e, data) => onChange(data.value)}
              placeholder={field.placeholder}
              disabled={readOnly}
              rows={3}
            />
          </Field>
        </div>
      );

    case "date":
      return (
        <div className={containerClass}>
          <Field
            label={field.label}
            required={required}
            hint={field.helperText}
            validationState={validationState}
            validationMessage={validationMessage}
          >
            <Input
              type="date"
              value={(value as string) ?? ""}
              onChange={(_e, data) => onChange(data.value)}
              disabled={readOnly}
            />
          </Field>
        </div>
      );

    case "radio":
      return (
        <div className={containerClass}>
          <Field
            label={field.label}
            required={required}
            hint={field.helperText}
            validationState={validationState}
            validationMessage={validationMessage}
          >
            <RadioGroup
              value={(value as string) ?? ""}
              onChange={(_e, data) => onChange(data.value)}
              disabled={readOnly}
            >
              {(field.options ?? []).map((opt) => (
                <Radio key={opt.value} value={opt.value} label={opt.label} />
              ))}
            </RadioGroup>
          </Field>
        </div>
      );

    case "multi-checkbox": {
      const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className={containerClass}>
          <Field
            label={field.label}
            required={required}
            hint={field.helperText}
            validationState={validationState}
            validationMessage={validationMessage}
          >
            <div className={styles.multiCheckboxGroup}>
              {(field.options ?? []).map((opt) => {
                const checked = selected.includes(opt.value);
                return (
                  <div key={opt.value}>
                    <Checkbox
                      label={opt.label}
                      checked={checked}
                      disabled={readOnly}
                      onChange={(_e, data) => {
                        const next = data.checked
                          ? Array.from(new Set([...selected, opt.value]))
                          : selected.filter((v) => v !== opt.value);
                        onChange(next);
                      }}
                    />
                    {opt.escalation && checked && (
                      <span className={styles.optionEscalation}>
                        ⚠ {opt.escalation.message}
                        {opt.escalation.specRef ? ` (${opt.escalation.specRef})` : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Field>
        </div>
      );
    }

    case "checkbox":
      return (
        <div className={containerClass}>
          <Checkbox
            label={field.label}
            checked={!!value}
            disabled={readOnly}
            onChange={(_e, data) => onChange(!!data.checked)}
          />
          {field.helperText && (
            <div style={{ fontSize: 12, color: "var(--colorNeutralForeground3)" }}>
              {field.helperText}
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className={containerClass}>
          <Field label={field.label} hint={`(unsupported field type: ${field.type})`}>
            <Input value={(value as string) ?? ""} disabled />
          </Field>
        </div>
      );
  }
}
