/**
 * Public surface of the forms-library — Phase 1 Production Letters & Forms.
 * The case page mounts <FormsLibrarySection> (returned via the
 * `formsLibraryContent` prop on CaseSummaryAndTabs); everything else is
 * orchestrated internally.
 */

export { FormsLibrarySection } from "./FormsLibrarySection";
export type { FormsLibrarySectionProps } from "./FormsLibrarySection";

export { TemplatePickerDialog } from "./TemplatePickerDialog";
export type { TemplatePickerDialogProps } from "./TemplatePickerDialog";

export { FormFillerDialog } from "./FormFillerDialog";
export type { FormFillerDialogProps } from "./FormFillerDialog";

export { FormPreviewPanel } from "./FormPreviewPanel";
export { FormStatusBadge } from "./FormStatusBadge";
export { EscalationBanner } from "./EscalationBanner";
export { SignaturePanel } from "./SignaturePanel";

export { generateFormPdf } from "./pdfGenerator";

export {
  isFieldVisible,
  isSectionVisible,
  collectEscalations,
  validateInstance,
  resolveAutofill,
  createFormInstance,
} from "./formEngine";
