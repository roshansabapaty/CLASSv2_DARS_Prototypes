/**
 * Form Template + Case Form Instance types — Phase 1 of the Production
 * Letters & Forms feature. Templates are declarative (ship with the app);
 * instances are per-case authored documents that progress Draft → Signed.
 */

export type FormCategory =
  | "ProductionLetter"
  | "RejectionResponse"
  | "Notice"
  | "Other";

export type FormFieldType =
  | "text"
  | "textarea"
  | "date"
  | "select"
  | "radio"
  | "checkbox"        // single boolean
  | "multi-checkbox"  // multi-select with options[]
  | "case-reference"
  | "identifier-list";

export type EscalationLevel = "Legal" | "LegalPolicy";

export interface EscalationTrigger {
  level: EscalationLevel;
  /** Human-readable rationale shown in the soft warning banner. */
  message: string;
  /** Optional cross-reference to an internal spec, e.g. "ETSI 6.4.4-2".
   *  Surfaced via tooltip in live filler banner; rendered inline in
   *  printable preview / PDF where hover is unavailable. */
  specRef?: string;
}

export interface FormFieldOption {
  value: string;
  label: string;
  /** When this option is selected, the form surfaces a soft escalation
   *  warning banner. Phase 1: warning only — does NOT block signing. */
  escalation?: EscalationTrigger;
}

/** Predicate for showing/hiding a field or section based on other field
 *  values in the same form instance. Resolved against `instance.values`. */
export interface VisibilityPredicate {
  field: string;
  /** True if the referenced field's value strictly equals this. */
  equals?: unknown;
  /** For multi-checkbox parents, true if any of these option values are
   *  checked. */
  includesAny?: string[];
}

export interface FormSection {
  id: string;
  title: string;            // e.g. "Section A: Certificate concerned"
  description?: string;
  /** When provided, the whole section is hidden unless the predicate passes. */
  visibleWhen?: VisibilityPredicate;
}

export interface FormField {
  id: string;
  sectionId: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  /** For select / radio / multi-checkbox. */
  options?: FormFieldOption[];
  placeholder?: string;
  helperText?: string;
  /** Dot-path into FormData to autofill from at instance-create time
   *  (e.g. "caseId", "legalContext.country.countryName"). */
  defaultValueFrom?: string;
  /** Static default content. May contain `{{dotPath}}` autofill tokens
   *  (resolved at instance-create time) and `[…]` placeholders left
   *  visible for the Specialist to replace before signing. Used by the
   *  RFI/PAI letter templates where the body is a multi-paragraph
   *  scaffold rather than a single autofill source. */
  defaultValue?: string;
  /** Width hint for the rendered Fluent Field. */
  span?: "half" | "full";
  /** Hide the field unless the predicate passes. */
  visibleWhen?: VisibilityPredicate;
  /** For multi-checkbox: "atLeastOne" = at least one option must be checked. */
  validation?: "atLeastOne";
  /** Phase 1 signing model — when true, the field is only required at
   *  signing time (e.g. signer name, signing date). The "Continue to Sign"
   *  button on the Fill page does NOT block on these; the SignaturePanel
   *  collects + validates them as part of the sign step. */
  signingTime?: boolean;
}

export interface FormTemplate {
  id: string;                 // e.g. "EPOC_FORM_3"
  name: string;               // e.g. "EPOC Form 3 — Non-Execution Response"
  category: FormCategory;
  description: string;
  /** Free-form regulatory anchor (e.g. "EU Regulation 2023/1543, Annex III"). */
  regulatoryAnchor?: string;
  /** Optional jurisdiction filter (e.g. ["EU"]). Empty/undefined = all. */
  jurisdiction?: string[];
  /** Optional request-type filter. Empty/undefined = all. */
  requestTypes?: string[];
  sections: FormSection[];
  fields: FormField[];
  /** When true, `validateInstance` scans textarea fields for un-replaced
   *  `[…]` placeholder tokens and surfaces them as soft warnings. Used
   *  by the RFI / PAI letter templates whose body scaffolds carry
   *  visible cues like `[describe the missing information]`. */
  flagUnresolvedPlaceholders?: boolean;
  /** Stamped onto `OutboundCorrespondenceItem.documentKind` when this
   *  template is sent. Lets the inbox routing recognise RFI / PAI flows
   *  regardless of whether the body went out as a structured form or a
   *  free-text letter. */
  outboundDocumentKind?:
    | "RequestAdditionalInformation"
    | "ProvideAdditionalInformation";
}

export type FormInstanceStatus = "Draft" | "Signed" | "Sent";

export interface FormInstanceSignature {
  signerName: string;
  signedAt: Date;
  attestation: true;
}

export interface CaseFormInstance {
  instanceId: string;         // crypto.randomUUID()
  templateId: string;
  caseId: string;
  status: FormInstanceStatus;
  values: Record<string, unknown>;
  signature?: FormInstanceSignature;
  createdAt: Date;
  updatedAt: Date;
}
