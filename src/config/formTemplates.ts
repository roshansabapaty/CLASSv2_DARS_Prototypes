/**
 * Form Template library — declarative definitions of every template the
 * Forms & Letters feature ships with. Keep this file pure (no React, no
 * runtime data); it's consumed by the engine + components.
 *
 * Phase 1 ships:
 *  - EPOC_FORM_3            (fully fielded; EU eEvidence non-execution response)
 *  - STANDARD_PRODUCTION_LETTER (stub, demonstrates ProductionLetter category)
 *  - EMERGENCY_DISCLOSURE_NOTICE (stub, demonstrates Notice category)
 */

import type { FormTemplate } from "../types/formTemplate";

// ─────────────────────────────────────────────────────────────────────────
// EPOC Form 3 — Non-Execution Response (EU Reg 2023/1543, Annex III)
// ─────────────────────────────────────────────────────────────────────────

const EPOC_FORM_3: FormTemplate = {
  id: "EPOC_FORM_3",
  name: "EPOC Form 3 — Non-Execution Response",
  category: "RejectionResponse",
  description:
    "Information on the impossibility of executing an EPOC or EPOC-PR. Sent back to the issuing authority when Microsoft cannot comply with the order, cannot meet the deadline, or cannot fulfil it exhaustively.",
  regulatoryAnchor: "EU Regulation 2023/1543, Annex III",
  // No jurisdiction filter — eEvidence cases may originate from any country
  // that participates in the regulation; the requestType gate alone is the
  // discriminator. Per-request-type sub-types ("None" default, "EPOC ER",
  // "EPOC PR", "EPOC PR Extension") are exposed via the case form.
  requestTypes: ["eEvidence"],
  sections: [
    {
      id: "A",
      title: "Section A: Certificate concerned",
      description: "Indicate which order this response refers to.",
    },
    {
      id: "B",
      title: "Section B: Relevant authority(ies)",
    },
    {
      id: "C",
      title: "Section C: Addressee of the EPOC/EPOC-PR",
    },
    {
      id: "D",
      title: "Section D: Reasons for non-execution",
      description:
        "Tick all reasons that apply. Some reasons require Legal or Legal Policy review before transmission.",
    },
    {
      id: "E",
      title: "Section E: Conflicting obligations arising from the law of a third country",
      description:
        "Complete only when 'compliance would conflict with the applicable law of a third country' is selected in Section D.",
      visibleWhen: { field: "D_reasons", includesAny: ["thirdCountryConflict"] },
    },
    {
      id: "F",
      title: "Section F: Request for additional information / clarification",
      description: "Optional — fill only if further information is required from the issuing authority.",
    },
    {
      id: "G",
      title: "Section G: Preservation of data",
      description: "Required only for EPOC-PR (preservation orders).",
      visibleWhen: { field: "A_certificateType", equals: "EPOC_PR" },
    },
    {
      id: "H",
      title: "Section H: Contact details + signature",
    },
  ],
  fields: [
    // ── Section A ─────────────────────────────────────────────────────
    {
      id: "A_certificateType",
      sectionId: "A",
      label: "Certificate concerned",
      type: "radio",
      required: true,
      options: [
        { value: "EPOC", label: "European Production Order Certificate (EPOC)" },
        { value: "EPOC_PR", label: "European Preservation Order Certificate (EPOC-PR)" },
      ],
      span: "full",
    },
    // ── Section B ─────────────────────────────────────────────────────
    {
      id: "B_issuingAuthority",
      sectionId: "B",
      label: "Issuing authority",
      type: "text",
      required: true,
      // Prefer the structured eEvidence block; readDotPath returns undefined
      // for non-eEvidence cases and the form leaves the field blank for the
      // RS to fill (the original `legalContext.*` path is preserved as the
      // historic fallback for cases that haven't moved to the new schema).
      defaultValueFrom: "eevidenceIssuingAuthority.name",
      span: "full",
    },
    {
      id: "B_issuingFileNumber",
      sectionId: "B",
      label: "File number of the issuing authority",
      type: "text",
      required: true,
      // Multi-value array — autofill picks the first reference number; the
      // RS can edit if a different one applies. Array index works through
      // readDotPath's `p in obj` check since arrays expose numeric keys.
      defaultValueFrom: "eevidenceIssuingAuthority.approvalReferenceNumbers.0",
      span: "half",
    },
    {
      id: "B_validatingAuthority",
      sectionId: "B",
      label: "If applicable, validating authority",
      type: "text",
      // Populates only when the case has a Validating Authority (i.e. the
      // IA was OtherCompetentAuthority). Uses the institution name now that
      // VA carries `name` separately from `approver.name`.
      defaultValueFrom: "eevidenceValidatingAuthority.name",
      span: "half",
    },
    {
      id: "B_validatingFileNumber",
      sectionId: "B",
      label: "If applicable, file number of validating authority",
      type: "text",
      defaultValueFrom: "eevidenceValidatingAuthority.approvalReferenceNumbers.0",
      span: "half",
    },
    {
      id: "B_dateOfIssue",
      sectionId: "B",
      label: "Date of issue of the EPOC/EPOC-PR",
      type: "date",
      required: true,
      defaultValueFrom: "dateServed",
      span: "half",
    },
    {
      id: "B_dateOfReceipt",
      sectionId: "B",
      label: "Date of receipt of the EPOC/EPOC-PR",
      type: "date",
      required: true,
      defaultValueFrom: "dateReceived",
      span: "half",
    },
    {
      id: "B_enforcingAuthority",
      sectionId: "B",
      label: "If applicable, enforcing authority",
      type: "text",
      defaultValueFrom: "eevidenceEnforcingAuthority.name",
      span: "half",
    },
    {
      id: "B_enforcingFileNumber",
      sectionId: "B",
      label: "If available, file number of enforcing authority",
      type: "text",
      span: "half",
    },
    // ── Section C ─────────────────────────────────────────────────────
    {
      id: "C_addressee",
      sectionId: "C",
      label: "Addressee of the EPOC/EPOC-PR",
      type: "text",
      required: true,
      defaultValueFrom: "__msLegalRep.designatedEstablishment",
      helperText: "Defaults to the Microsoft legal entity for this case's region.",
      span: "full",
    },
    {
      id: "C_addresseeFileNumber",
      sectionId: "C",
      label: "File number of the addressee",
      type: "text",
      defaultValueFrom: "caseId",
      span: "half",
    },
    // ── Section D ─────────────────────────────────────────────────────
    {
      id: "D_reasons",
      sectionId: "D",
      label: "Reason(s) for non-execution",
      type: "multi-checkbox",
      required: true,
      validation: "atLeastOne",
      span: "full",
      helperText:
        "Tick one or more reasons that apply — at least one is required.",
      options: [
        {
          value: "incomplete",
          label: "It is incomplete",
        },
        {
          value: "manifestErrors",
          label: "It contains manifest errors (addressed to wrong company)",
        },
        {
          value: "insufficientInformation",
          label: "It does not contain sufficient information (unable to identify unique user)",
        },
        {
          value: "notDataController",
          label:
            "Data is not stored by/on behalf of the service provider (NSU or not data controller)",
        },
        {
          value: "dataNotHeld",
          label:
            "Data is no longer held / cannot be preserved (data was not retained at the time of the order)",
          escalation: {
            level: "LegalPolicy",
            message:
              "Preservation-failure rejections require Legal Policy review before transmission.",
            specRef: "ETSI 6.4.4-2",
          },
        },
        {
          value: "deFactoImpossibility",
          label: "Other reasons of de facto impossibility (not technically feasible)",
          escalation: {
            level: "LegalPolicy",
            message:
              "Technical-feasibility rejections must be reviewed by Legal Policy before transmission.",
            specRef: "ETSI 6.4.4-2",
          },
        },
        {
          value: "notValidIssuingAuthority",
          label: "Order not issued/validated by a valid issuing authority (Art. 4)",
          escalation: {
            level: "Legal",
            message: "Authority-validity rejections require Legal review.",
            specRef: "ETSI 6.4.4-2",
          },
        },
        {
          value: "wrongOffenceCategory",
          label: "Order issued for an offence not covered by Article 5(4)",
        },
        {
          value: "serviceNotCovered",
          label: "Service is not covered by Regulation (EU) 2023/1543",
          escalation: {
            level: "Legal",
            message: "Out-of-scope rejections require Legal review.",
            specRef: "ETSI 6.4.4-2",
          },
        },
        {
          value: "protectedData",
          label:
            "Data protected by immunities/privileges (lawyer, journalist, doctor, govt, intl org)",
          escalation: {
            level: "Legal",
            message: "Privilege-based rejections require Legal review.",
            specRef: "ETSI 6.4.4-2",
          },
        },
        {
          value: "thirdCountryConflict",
          label:
            "Compliance would conflict with the law of a third country (also fill Section E)",
          escalation: {
            level: "Legal",
            message: "Conflict-of-law rejections require Legal review.",
            specRef: "ETSI 6.4.4-2",
          },
        },
      ],
    },
    {
      id: "D_explanation",
      sectionId: "D",
      label: "Please explain further (and any other reasons not listed above)",
      type: "textarea",
      span: "full",
    },
    // ── Section E ─────────────────────────────────────────────────────
    {
      id: "E_lawTitle",
      sectionId: "E",
      label: "Title of the law(s) of the third country",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "E_statutoryProvision",
      sectionId: "E",
      label: "Applicable statutory provision(s) and text of the relevant provision(s)",
      type: "textarea",
      required: true,
      span: "full",
    },
    {
      id: "E_natureOfObligation",
      sectionId: "E",
      label: "Nature of the conflicting obligation",
      type: "multi-checkbox",
      required: true,
      validation: "atLeastOne",
      span: "full",
      options: [
        { value: "fundamentalRights", label: "Fundamental rights of individuals" },
        {
          value: "nationalSecurity",
          label:
            "Fundamental interests of the third country related to national security and defence",
        },
        { value: "other", label: "Other interests" },
      ],
    },
    {
      id: "E_natureOther",
      sectionId: "E",
      label: 'Specify "other interests"',
      type: "textarea",
      visibleWhen: { field: "E_natureOfObligation", includesAny: ["other"] },
      span: "full",
    },
    {
      id: "E_whyApplicable",
      sectionId: "E",
      label: "Why the law is applicable in this case",
      type: "textarea",
      required: true,
      span: "full",
    },
    {
      id: "E_whyConflict",
      sectionId: "E",
      label: "Why a conflict exists in this case",
      type: "textarea",
      required: true,
      span: "full",
    },
    {
      id: "E_providerLink",
      sectionId: "E",
      label: "Link between the service provider and the third country",
      type: "textarea",
      required: true,
      span: "full",
    },
    {
      id: "E_consequences",
      sectionId: "E",
      label: "Possible consequences and penalties for the addressee of complying",
      type: "textarea",
      required: true,
      span: "full",
    },
    {
      id: "E_additional",
      sectionId: "E",
      label: "Any other relevant information",
      type: "textarea",
      span: "full",
    },
    // ── Section F ─────────────────────────────────────────────────────
    {
      id: "F_clarificationRequest",
      sectionId: "F",
      label: "Information required from issuing authority",
      type: "textarea",
      helperText: "Optional — fill only if Section F applies.",
      span: "full",
    },
    // ── Section G ─────────────────────────────────────────────────────
    {
      id: "G_preservationStatus",
      sectionId: "G",
      label: "Preservation status of the requested data",
      type: "radio",
      required: true,
      span: "full",
      options: [
        {
          value: "preserved",
          label:
            "Are being preserved until produced or until the issuing authority informs preservation is no longer needed",
        },
        {
          value: "notPreserved",
          label:
            "Are not being preserved (exceptional — e.g. service provider does not have the data or cannot identify it sufficiently)",
        },
      ],
    },
    // ── Section H ─────────────────────────────────────────────────────
    {
      id: "H_legalRepresentative",
      sectionId: "H",
      label: "Designated establishment / legal representative",
      type: "text",
      required: true,
      defaultValueFrom: "__msLegalRep.designatedEstablishment",
      span: "full",
    },
    {
      id: "H_contactName",
      sectionId: "H",
      label: "Name of the contact person",
      type: "text",
      required: true,
      defaultValueFrom: "assigneeName",
      span: "half",
    },
    {
      id: "H_postHeld",
      sectionId: "H",
      label: "Post held",
      type: "text",
      defaultValueFrom: "__msLegalRep.postHeld",
      span: "half",
    },
    {
      id: "H_address",
      sectionId: "H",
      label: "Address",
      type: "textarea",
      defaultValueFrom: "__msLegalRep.address",
      span: "full",
    },
    {
      id: "H_telNo",
      sectionId: "H",
      label: "Tel. No (with country code)",
      type: "text",
      defaultValueFrom: "__msLegalRep.telNo",
      span: "half",
    },
    {
      id: "H_faxNo",
      sectionId: "H",
      label: "Fax No (with country code)",
      type: "text",
      defaultValueFrom: "__msLegalRep.faxNo",
      span: "half",
    },
    {
      id: "H_email",
      sectionId: "H",
      label: "Email",
      type: "text",
      defaultValueFrom: "__msLegalRep.email",
      span: "half",
    },
    {
      id: "H_authorisedName",
      sectionId: "H",
      label: "Name of the authorised person",
      type: "text",
      required: true,
      signingTime: true,
      defaultValueFrom: "assigneeName",
      span: "half",
    },
    {
      id: "H_date",
      sectionId: "H",
      label: "Date",
      type: "date",
      required: true,
      signingTime: true,
      defaultValueFrom: "__today",
      span: "half",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Stub: Standard Production Letter
// ─────────────────────────────────────────────────────────────────────────

const STANDARD_PRODUCTION_LETTER: FormTemplate = {
  id: "STANDARD_PRODUCTION_LETTER",
  name: "Standard Production Letter",
  category: "ProductionLetter",
  description:
    "Generic outbound production-confirmation letter to the requesting authority. Use when an EPOC-style structured form does not apply.",
  sections: [
    { id: "main", title: "Letter contents" },
    { id: "sign", title: "Signature" },
  ],
  fields: [
    {
      id: "to",
      sectionId: "main",
      label: "To (recipient agency / authority)",
      type: "text",
      required: true,
      defaultValueFrom: "agency",
      span: "full",
    },
    {
      id: "re",
      sectionId: "main",
      label: "Re (subject line)",
      type: "text",
      required: true,
      defaultValueFrom: "caseId",
      span: "full",
    },
    {
      id: "acknowledgementDate",
      sectionId: "main",
      label: "Acknowledgement date",
      type: "date",
      required: true,
      defaultValueFrom: "__today",
      span: "half",
    },
    {
      id: "body",
      sectionId: "main",
      label: "Letter body",
      type: "textarea",
      required: true,
      placeholder: "Dear …,",
      span: "full",
    },
    {
      id: "signerName",
      sectionId: "sign",
      label: "Signer name",
      type: "text",
      required: true,
      signingTime: true,
      defaultValueFrom: "assigneeName",
      span: "half",
    },
    {
      id: "signerTitle",
      sectionId: "sign",
      label: "Signer title",
      type: "text",
      signingTime: true,
      defaultValueFrom: "__msLegalRep.postHeld",
      span: "half",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Stub: Emergency Disclosure Notice
// ─────────────────────────────────────────────────────────────────────────

const EMERGENCY_DISCLOSURE_NOTICE: FormTemplate = {
  id: "EMERGENCY_DISCLOSURE_NOTICE",
  name: "Emergency Disclosure Notice",
  category: "Notice",
  description:
    "Notice acknowledging an emergency disclosure request. Records the trigger event, scope, and contact for the issuing authority.",
  sections: [{ id: "main", title: "Notice content" }],
  fields: [
    {
      id: "issuingAgency",
      sectionId: "main",
      label: "Issuing agency",
      type: "text",
      required: true,
      defaultValueFrom: "agency",
      span: "full",
    },
    {
      id: "triggerEvent",
      sectionId: "main",
      label: "Triggering event / threat description",
      type: "textarea",
      required: true,
      span: "full",
    },
    {
      id: "scope",
      sectionId: "main",
      label: "Disclosure scope",
      type: "textarea",
      required: true,
      span: "full",
    },
    {
      id: "contactDate",
      sectionId: "main",
      label: "Date of contact",
      type: "date",
      required: true,
      defaultValueFrom: "__today",
      span: "half",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Stub: EPOC Form 5 — Confirmation of Issuance
// ─────────────────────────────────────────────────────────────────────────
//
// Read-only renderer for the IA's Form 5 inbound. The form isn't authored
// in Microsoft's forms-library — it arrives as an authority-submitted
// structured payload — but we register it here so the FormPreviewPanel
// can pretty-print the inbound values via the same machinery used for
// outbound forms.

// ─────────────────────────────────────────────────────────────────────────
// EPOC Form 2 — Preservation Order (EPOC-PR)
// ─────────────────────────────────────────────────────────────────────────
//
// Inbound from the Issuing Authority. The original preservation order
// itself — DARS receives this via WISP at case creation. Field IDs
// match the `structuredForm.values` keys produced by mock seeds + the
// PreservationOrder handler in utils/preservationOrderReceipt.ts.

// ─────────────────────────────────────────────────────────────────────────
// EPOC Form 1 — Production Order (the legal demand for EPOC-ER cases)
// ─────────────────────────────────────────────────────────────────────────
//
// Inbound from the Issuing Authority. Unlike Forms 2/5/6 (which arrive as
// correspondence items carrying a `structuredForm.values` bag), the Form 1
// IS the case-creation envelope — its data lives directly on FormData. The
// `buildLegalDemandInstance` helper in src/utils/legalDemandForm.ts hydrates
// a read-only instance of this template from those ETSI envelope fields.
//
// Full-skeleton render: EVERY section and field is always visible so the
// document shows the complete EPOC form. Anything the issuing authority
// left blank renders as "—" (absence) rather than vanishing — see
// buildForm1Values, which sets every field (undefined/"" → "—").

const EPOC_FORM_1: FormTemplate = {
  id: "EPOC_FORM_1",
  name: "EPOC Form 1 — Production Order",
  category: "Notice",
  description:
    "Issuing authority's European Production Order Certificate (EPOC) under Regulation (EU) 2023/1543. Rendered read-only from the ETSI envelope the IA transmitted — the authorities, target identifiers, requested data + date ranges, offence, and deadlines. This is the legal demand for an eEvidence production (EPOC-ER) case.",
  regulatoryAnchor: "EU Regulation 2023/1543, Annex I",
  sections: [
    { id: "A", title: "Section A: Issuing authority" },
    { id: "B", title: "Section B: Validating authority" },
    { id: "C", title: "Section C: Competent authority" },
    { id: "D", title: "Section D: Enforcing authority" },
    { id: "E", title: "Section E: Target identifiers" },
    { id: "F", title: "Section F: Requested data & date ranges" },
    { id: "G", title: "Section G: Offence under investigation" },
    { id: "H", title: "Section H: Key dates & deadlines" },
    { id: "I", title: "Section I: Enterprise request" },
    { id: "J", title: "Section J: Emergency justification (Art. 9(2))" },
    { id: "K", title: "Section K: Additional information from the issuing authority" },
  ],
  fields: [
    // Section A — Issuing authority
    { id: "A_issuingAuthority", sectionId: "A", label: "Issuing authority", type: "text", span: "full" },
    { id: "A_issuingAuthorityRole", sectionId: "A", label: "Type of authority", type: "text", span: "half" },
    { id: "A_issuingAuthorityCountry", sectionId: "A", label: "Country", type: "text", span: "half" },
    { id: "A_issuingApprovalRole", sectionId: "A", label: "Approval role", type: "text", span: "half" },
    { id: "A_issuingFileNumbers", sectionId: "A", label: "File / reference number(s)", type: "text", span: "half" },
    { id: "A_issuingContact", sectionId: "A", label: "Issuing-authority contact", type: "textarea", span: "full" },
    // Section B — Validating authority (conditional)
    { id: "B_validatingAuthority", sectionId: "B", label: "Validating authority", type: "text", span: "full" },
    { id: "B_validatingAuthorityRole", sectionId: "B", label: "Type of authority", type: "text", span: "half" },
    { id: "B_validatingAuthorityCountry", sectionId: "B", label: "Country", type: "text", span: "half" },
    { id: "B_validatingFileNumbers", sectionId: "B", label: "File / reference number(s)", type: "text", span: "full" },
    // Section C — Competent authority (conditional)
    { id: "C_competentAuthority", sectionId: "C", label: "Competent authority", type: "text", span: "full" },
    { id: "C_competentAuthorityCountry", sectionId: "C", label: "Country", type: "text", span: "half" },
    { id: "C_competentFileNumbers", sectionId: "C", label: "File / reference number(s)", type: "text", span: "half" },
    // Section D — Enforcing authority
    { id: "D_enforcingAuthority", sectionId: "D", label: "Enforcing authority", type: "text", span: "full" },
    { id: "D_enforcingContact", sectionId: "D", label: "Enforcing-authority contact", type: "textarea", span: "full" },
    // Section E — Target identifiers
    { id: "E_targetIdentifiers", sectionId: "E", label: "Target identifiers", type: "textarea", span: "full" },
    // Section F — Requested data & date ranges
    { id: "F_requestedData", sectionId: "F", label: "Requested data, by identifier", type: "textarea", span: "full" },
    // Section G — Offence
    { id: "G_offence", sectionId: "G", label: "Offence(s) under investigation", type: "textarea", span: "full" },
    // Section H — Key dates & deadlines
    { id: "H_dateOfIssuance", sectionId: "H", label: "Date of issuance", type: "date", span: "half" },
    { id: "H_dateOfTransmission", sectionId: "H", label: "Date of transmission", type: "date", span: "half" },
    { id: "H_dateServed", sectionId: "H", label: "Date served on Microsoft", type: "date", span: "half" },
    { id: "H_dateReceived", sectionId: "H", label: "Date received", type: "date", span: "half" },
    { id: "H_authorizationStartDate", sectionId: "H", label: "Authorization start", type: "date", span: "half" },
    { id: "H_authorizationExpirationDate", sectionId: "H", label: "Authorization expiry", type: "date", span: "half" },
    { id: "H_dueDate", sectionId: "H", label: "Response deadline (SLA)", type: "date", span: "half" },
    { id: "H_priority", sectionId: "H", label: "Priority", type: "text", span: "half" },
    // Section I — Enterprise request. Each ETSI UnderlyingConditions
    // answer is its own labeled field; all render (full skeleton), with
    // "—" for anything the IA left blank.
    { id: "I_addressedToController", sectionId: "I", label: "Addressed to controller", type: "checkbox", span: "half" },
    { id: "I_addressedToProcessor", sectionId: "I", label: "Addressed to processor", type: "checkbox", span: "half" },
    { id: "I_processorControllerUnidentified", sectionId: "I", label: "Reason: controller cannot be identified", type: "checkbox", span: "half" },
    { id: "I_processorDetrimental", sectionId: "I", label: "Reason: contacting the controller would harm the investigation", type: "checkbox", span: "half" },
    { id: "I_processorShallInformController", sectionId: "I", label: "Processor shall inform the controller", type: "checkbox", span: "half" },
    { id: "I_processorShallNotInformController", sectionId: "I", label: "Processor shall NOT inform the controller", type: "checkbox", span: "half" },
    { id: "I_permissionToNotifyUser", sectionId: "I", label: "Permission to notify the user", type: "checkbox", span: "half" },
    { id: "I_justification", sectionId: "I", label: "Justification", type: "textarea", span: "full" },
    { id: "I_relevantInformation", sectionId: "I", label: "Additional relevant information", type: "textarea", span: "full" },
    // Section J — Emergency justification (conditional)
    { id: "J_emergencyCategory", sectionId: "J", label: "Emergency category", type: "text", span: "half" },
    { id: "J_emergencyNote", sectionId: "J", label: "Justification", type: "textarea", span: "full" },
    // Section K — Additional information (conditional)
    { id: "K_additionalInformation", sectionId: "K", label: "Additional information", type: "textarea", span: "full" },
  ],
};

const EPOC_FORM_2: FormTemplate = {
  id: "EPOC_FORM_2",
  name: "EPOC Form 2 — Preservation Order",
  category: "Notice",
  description:
    "Issuing authority's preservation order under Regulation (EU) 2023/1543 Article 6. The service provider must preserve the specified data until a follow-on production order is issued, the order is extended (Form 6), or the IA ends the preservation obligation.",
  regulatoryAnchor: "EU Regulation 2023/1543, Article 6 (Annex II)",
  sections: [
    { id: "A", title: "Section A: Issuing authority" },
    { id: "B", title: "Section B: Preservation order details" },
    { id: "C", title: "Section C: Targeted data" },
  ],
  fields: [
    {
      id: "A_issuingAuthority",
      sectionId: "A",
      label: "Issuing authority",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "A_issuingFileNumber",
      sectionId: "A",
      label: "File number of the issuing authority",
      type: "text",
      required: true,
      span: "half",
    },
    {
      id: "A_dateOfIssue",
      sectionId: "A",
      label: "Date of Form 2",
      type: "date",
      required: true,
      span: "half",
    },
    {
      id: "B_preservationOrderReference",
      sectionId: "B",
      label: "Preservation Order reference (EPOC-PR)",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "B_preservationDuration",
      sectionId: "B",
      label: "Preservation duration",
      type: "text",
      span: "half",
      helperText:
        "Free-text description of the preservation window the IA requests.",
    },
    {
      id: "B_initialPreservationExpiration",
      sectionId: "B",
      label: "Initial preservation expiration date",
      type: "date",
      required: true,
      span: "half",
      helperText:
        "DARS uses this as the per-identifier desiredPreservationExpiration anchor.",
    },
    {
      id: "C_offenceCategory",
      sectionId: "C",
      label: "Offence under investigation",
      type: "textarea",
      span: "full",
    },
    {
      id: "C_dataDescription",
      sectionId: "C",
      label: "Data to be preserved",
      type: "textarea",
      span: "full",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// EPOC Preservation Acknowledgement — SP's outbound confirming receipt
// ─────────────────────────────────────────────────────────────────────────
//
// Outbound from Microsoft. Composed by the RS from the
// PreservationOrderActiveBanner's "Acknowledge Receipt" CTA. Confirms
// the SP has received the Form 2 and assumed the preservation obligation.

const EPOC_PRESERVATION_ACK: FormTemplate = {
  id: "EPOC_PRESERVATION_ACK",
  name: "Preservation Acknowledgement",
  category: "Notice",
  description:
    "Microsoft's confirmation to the Issuing Authority that the EPOC-PR (Form 2) has been received and the preservation obligation is in effect. Carries the per-identifier preservation expirations DARS has applied.",
  regulatoryAnchor: "EU Regulation 2023/1543, Article 6",
  outboundDocumentKind: "PreservationAcknowledged",
  sections: [
    { id: "A", title: "Section A: Service provider" },
    { id: "B", title: "Section B: Preservation Order reference" },
    { id: "C", title: "Section C: Acknowledgement details" },
  ],
  fields: [
    {
      id: "A_serviceProviderName",
      sectionId: "A",
      label: "Service provider",
      type: "text",
      required: true,
      span: "full",
      defaultValue: "Microsoft Ireland Operations Limited",
    },
    {
      id: "A_caseReference",
      sectionId: "A",
      label: "DARS case reference",
      type: "case-reference",
      required: true,
      span: "half",
      defaultValueFrom: "caseId",
    },
    {
      id: "A_acknowledgedAt",
      sectionId: "A",
      label: "Acknowledgement date",
      type: "date",
      required: true,
      span: "half",
      signingTime: true,
    },
    {
      id: "B_preservationOrderReference",
      sectionId: "B",
      label: "Preservation Order reference",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "C_confirmationStatement",
      sectionId: "C",
      label: "Confirmation",
      type: "textarea",
      span: "full",
      defaultValue:
        "Microsoft Ireland Operations Limited confirms receipt of the " +
        "Preservation Order referenced above and acknowledges the " +
        "preservation obligation per Regulation (EU) 2023/1543 Article 6. " +
        "Data preservation has been applied to the targeted identifiers " +
        "with the expiration dates carried in the order.",
    },
    {
      id: "C_signerName",
      sectionId: "C",
      label: "Signed by",
      type: "text",
      required: true,
      span: "half",
      signingTime: true,
    },
  ],
};

const EPOC_FORM_5: FormTemplate = {
  id: "EPOC_FORM_5",
  name: "EPOC Form 5 — Confirmation of Issuance",
  category: "Notice",
  description:
    "Issuing authority's confirmation that a follow-on European Production Order Certificate (EPOC) will be issued against data preserved under an earlier Preservation Order (EPOC-PR).",
  regulatoryAnchor: "EU Regulation 2023/1543, Article 7(5) (Annex V)",
  sections: [
    { id: "A", title: "Section A: Issuing authority" },
    { id: "B", title: "Section B: Preservation Order reference" },
    { id: "C", title: "Section C: Follow-on Production Order" },
    { id: "D", title: "Section D: Instructions to the service provider" },
  ],
  fields: [
    {
      id: "A_issuingAuthority",
      sectionId: "A",
      label: "Issuing authority",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "A_issuingFileNumber",
      sectionId: "A",
      label: "File number of the issuing authority",
      type: "text",
      required: true,
      span: "half",
    },
    {
      id: "A_dateOfIssue",
      sectionId: "A",
      label: "Date of Form 5",
      type: "date",
      required: true,
      span: "half",
    },
    {
      id: "B_preservationOrderReference",
      sectionId: "B",
      label: "Reference of the related Preservation Order (EPOC-PR)",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "B_preservationServiceProviderRef",
      sectionId: "B",
      label: "Service provider's reference for the preservation order",
      type: "text",
      span: "full",
    },
    {
      id: "C_followOnEpocReference",
      sectionId: "C",
      label: "Reference of the follow-on EPOC (Production Order)",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "C_followOnTransmissionDate",
      sectionId: "C",
      label: "Date the follow-on EPOC was transmitted",
      type: "date",
      required: true,
      span: "half",
    },
    {
      id: "D_continuePreservation",
      sectionId: "D",
      label:
        "Continue to preserve the data under the existing PR until the production order is executed",
      type: "checkbox",
      span: "full",
    },
    {
      id: "D_acknowledgementRequest",
      sectionId: "D",
      label: "Acknowledgement request",
      type: "textarea",
      span: "full",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// EPOC Form 6 — Preservation Extension
// ─────────────────────────────────────────────────────────────────────────
//
// Inbound from the Issuing Authority. Extends the preservation
// obligation under an existing EPOC-PR. Field IDs intentionally match
// the `structuredForm.values` keys produced by mock seeds + future
// WISP POST payloads (see PreservationExtension handler in
// utils/preservationExtension.ts).

const EPOC_FORM_6: FormTemplate = {
  id: "EPOC_FORM_6",
  name: "EPOC Form 6 — Preservation Extension",
  category: "Notice",
  description:
    "Issuing authority's notice extending the preservation obligation under an existing European Preservation Order Certificate (EPOC-PR). DARS bumps the per-identifier desiredPreservationExpiration to the revised date.",
  regulatoryAnchor: "EU Regulation 2023/1543, Article 6",
  sections: [
    { id: "A", title: "Section A: Issuing authority" },
    { id: "B", title: "Section B: Preservation Order reference" },
    { id: "C", title: "Section C: Extension details" },
  ],
  fields: [
    {
      id: "A_issuingAuthority",
      sectionId: "A",
      label: "Issuing authority",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "A_issuingFileNumber",
      sectionId: "A",
      label: "File number of the issuing authority",
      type: "text",
      required: true,
      span: "half",
    },
    {
      id: "A_dateOfIssue",
      sectionId: "A",
      label: "Date of Form 6",
      type: "date",
      required: true,
      span: "half",
    },
    {
      id: "B_preservationOrderReference",
      sectionId: "B",
      label: "Reference of the related Preservation Order (EPOC-PR)",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "B_preservationServiceProviderRef",
      sectionId: "B",
      label: "Service provider's reference for the preservation order",
      type: "text",
      span: "full",
    },
    {
      id: "extendedPreservationExpiration",
      sectionId: "C",
      label: "Revised preservation expiration date",
      type: "date",
      required: true,
      span: "half",
      helperText:
        "DARS replaces the per-identifier desiredPreservationExpiration with this date on case open.",
    },
    {
      id: "extensionReason",
      sectionId: "C",
      label: "Reason for the extension",
      type: "textarea",
      span: "full",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// EPOC End of Preservation — Authority closes the preservation obligation
// ─────────────────────────────────────────────────────────────────────────
//
// Inbound from the Issuing Authority. Ends the preservation obligation
// under an existing EPOC-PR and opens the 45-day retention window.
// Field IDs match `structuredForm.values` produced by the
// EndPreservation handler (see utils/endPreservation.ts).

const EPOC_END_PRESERVATION: FormTemplate = {
  id: "EPOC_END_PRESERVATION",
  name: "End of Preservation",
  category: "Notice",
  description:
    "Issuing authority's notice that the preservation obligation under an existing EPOC-PR is concluded. DARS starts the 45-day retention clock anchored to the effective end date.",
  regulatoryAnchor: "EU Regulation 2023/1543, Article 6(7)",
  sections: [
    { id: "A", title: "Section A: Issuing authority" },
    { id: "B", title: "Section B: Preservation Order reference" },
    { id: "C", title: "Section C: End-of-preservation details" },
  ],
  fields: [
    {
      id: "A_issuingAuthority",
      sectionId: "A",
      label: "Issuing authority",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "A_issuingFileNumber",
      sectionId: "A",
      label: "File number of the issuing authority",
      type: "text",
      required: true,
      span: "half",
    },
    {
      id: "A_dateOfIssue",
      sectionId: "A",
      label: "Date of notice",
      type: "date",
      required: true,
      span: "half",
    },
    {
      id: "B_preservationOrderReference",
      sectionId: "B",
      label: "Reference of the related Preservation Order (EPOC-PR)",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "B_preservationServiceProviderRef",
      sectionId: "B",
      label: "Service provider's reference for the preservation order",
      type: "text",
      span: "full",
    },
    {
      id: "preservationEndDate",
      sectionId: "C",
      label: "Effective end date of the preservation obligation",
      type: "date",
      required: true,
      span: "half",
      helperText:
        "Anchors the 45-day retention clock. After this date + 45 days the held data must be deleted.",
    },
    {
      id: "endReason",
      sectionId: "C",
      label: "Reason for ending preservation",
      type: "textarea",
      span: "full",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// EPOC Withdrawal — IA withdraws the EPOC (Workflow 8)
// ─────────────────────────────────────────────────────────────────────────
//
// Inbound from the Issuing Authority. The IA may withdraw an EPOC at
// any point in its lifecycle (per Appendix F Workflow 8). The handler
// `applyWithdrawal` in utils/withdrawal.ts cancels pending delivery,
// starts the 45-day retention clock, sets authorizationDesiredStatus +
// caseStage to "Withdrawn", and appends an `EpocWithdrawn` audit event.

const EPOC_WITHDRAWAL: FormTemplate = {
  id: "EPOC_WITHDRAWAL",
  name: "EPOC Withdrawal Notice",
  category: "Notice",
  description:
    "Issuing authority's withdrawal of an earlier EPOC under Regulation (EU) 2023/1543. Supersedes all other workflows; the service provider must cancel any pending delivery and delete preserved or held data within 45 days.",
  regulatoryAnchor: "EU Regulation 2023/1543, Article 9(7)",
  sections: [
    { id: "A", title: "Section A: Issuing authority" },
    { id: "B", title: "Section B: Withdrawn EPOC reference" },
    { id: "C", title: "Section C: Withdrawal details" },
  ],
  fields: [
    {
      id: "A_issuingAuthority",
      sectionId: "A",
      label: "Issuing authority",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "A_issuingFileNumber",
      sectionId: "A",
      label: "File number of the issuing authority",
      type: "text",
      required: true,
      span: "half",
    },
    {
      id: "A_dateOfWithdrawal",
      sectionId: "A",
      label: "Date of withdrawal notice",
      type: "date",
      required: true,
      span: "half",
    },
    {
      id: "B_originalEpocReference",
      sectionId: "B",
      label: "Reference of the withdrawn EPOC",
      type: "text",
      required: true,
      span: "full",
    },
    {
      id: "B_originalEpocType",
      sectionId: "B",
      label: "EPOC type",
      type: "select",
      span: "half",
      options: [
        { value: "EPOC_ER", label: "EPOC-ER (Production Order)" },
        { value: "EPOC_PR", label: "EPOC-PR (Preservation Order)" },
      ],
    },
    {
      id: "C_effectiveDate",
      sectionId: "C",
      label: "Effective date of withdrawal",
      type: "date",
      required: true,
      span: "half",
      helperText:
        "Anchors the 45-day retention clock. After this date + 45 days the held data must be deleted.",
    },
    {
      id: "C_withdrawalReason",
      sectionId: "C",
      label: "Reason for withdrawal",
      type: "textarea",
      span: "full",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Request Additional Information — outbound RFI letter
// ─────────────────────────────────────────────────────────────────────────
//
// Composable outbound used when Microsoft needs the IA/EA to clarify
// something about an eEvidence order — typically after an attorney
// review flagged a question. The body is a multi-paragraph scaffold
// with autofill `{{tokens}}` for known facts (authority name, EPOC ref,
// dates) and `[…]` placeholders the Specialist must replace before
// signing. `flagUnresolvedPlaceholders: true` surfaces a soft warning
// for any remaining placeholders at sign-time.

const REQUEST_ADDITIONAL_INFORMATION: FormTemplate = {
  id: "REQUEST_ADDITIONAL_INFORMATION",
  name: "Request Additional Information",
  category: "Other",
  description:
    "Outbound letter asking the Issuing or Enforcing Authority for clarification on an eEvidence order — typically the next step after an attorney flagged a question on the case.",
  requestTypes: ["eEvidence"],
  flagUnresolvedPlaceholders: true,
  outboundDocumentKind: "RequestAdditionalInformation",
  sections: [
    {
      id: "addressing",
      title: "Addressing",
      description: "Who this letter is addressed to.",
    },
    {
      id: "body",
      title: "Body",
      description:
        "The boilerplate is pre-filled. Replace any [bracketed placeholders] with the specifics before signing.",
    },
    { id: "signature", title: "Signature" },
  ],
  fields: [
    {
      id: "recipient",
      sectionId: "addressing",
      label: "Send to",
      type: "radio",
      required: true,
      span: "full",
      options: [
        { value: "IssuingAuthority", label: "Issuing Authority" },
        { value: "EnforcingAuthority", label: "Enforcing Authority" },
      ],
      defaultValueFrom: "__rfiDefaultRecipient",
      helperText:
        "Defaults to the Issuing Authority when set on the case; otherwise the Enforcing Authority.",
    },
    {
      id: "body",
      sectionId: "body",
      label: "Letter body",
      type: "textarea",
      required: true,
      span: "full",
      defaultValue:
        "Dear {{eevidenceIssuingAuthority.name}},\n" +
        "\n" +
        "Further to your eEvidence Production Order " +
        "{{eevidenceIssuingAuthority.approvalReferenceNumbers.0}} transmitted on " +
        "{{dateOfTransmission}}, {{__msLegalRep.designatedEstablishment}} requires " +
        "additional information before proceeding with production of the " +
        "requested data.\n" +
        "\n" +
        "Specifically, we ask that you clarify the following:\n" +
        "\n" +
        "[describe the missing or ambiguous information]\n" +
        "\n" +
        "We would be grateful for your response by [response deadline]. Until " +
        "then, the order remains under review and no data has been produced.\n" +
        "\n" +
        "Yours sincerely,\n" +
        "{{assigneeName}}\n" +
        "Microsoft Response Specialist\n" +
        "{{__msLegalRep.email}}",
    },
    {
      id: "H_signerName",
      sectionId: "signature",
      label: "Signer name",
      type: "text",
      required: true,
      signingTime: true,
      span: "half",
    },
    {
      id: "H_signedDate",
      sectionId: "signature",
      label: "Signed date",
      type: "date",
      required: true,
      signingTime: true,
      defaultValueFrom: "__today",
      span: "half",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Provide Additional Information — outbound reply to an inbound RFI
// ─────────────────────────────────────────────────────────────────────────
//
// Mirror of Request Additional Information, worded as a reply rather
// than an inquiry. The composer opens this template when the RS clicks
// "Reply" on an inbound `RequestAdditionalInformation` correspondence
// item.

const PROVIDE_ADDITIONAL_INFORMATION: FormTemplate = {
  id: "PROVIDE_ADDITIONAL_INFORMATION",
  name: "Provide Additional Information",
  category: "Other",
  description:
    "Outbound letter replying to an Issuing or Enforcing Authority that previously asked Microsoft to clarify or supplement information on an eEvidence order.",
  requestTypes: ["eEvidence"],
  flagUnresolvedPlaceholders: true,
  outboundDocumentKind: "ProvideAdditionalInformation",
  sections: [
    {
      id: "addressing",
      title: "Addressing",
    },
    {
      id: "body",
      title: "Body",
      description:
        "The boilerplate is pre-filled. Replace any [bracketed placeholders] with the specifics before signing.",
    },
    { id: "signature", title: "Signature" },
  ],
  fields: [
    {
      id: "recipient",
      sectionId: "addressing",
      label: "Send to",
      type: "radio",
      required: true,
      span: "full",
      options: [
        { value: "IssuingAuthority", label: "Issuing Authority" },
        { value: "EnforcingAuthority", label: "Enforcing Authority" },
      ],
      defaultValueFrom: "__rfiDefaultRecipient",
    },
    {
      id: "body",
      sectionId: "body",
      label: "Letter body",
      type: "textarea",
      required: true,
      span: "full",
      defaultValue:
        "Dear {{eevidenceIssuingAuthority.name}},\n" +
        "\n" +
        "We refer to your communication of [date of inbound request] in connection " +
        "with eEvidence Production Order " +
        "{{eevidenceIssuingAuthority.approvalReferenceNumbers.0}}.\n" +
        "\n" +
        "Please find below the additional information you requested:\n" +
        "\n" +
        "[describe the response]\n" +
        "\n" +
        "[Attach any supporting documents using the Attachments field on the " +
        "composer.]\n" +
        "\n" +
        "Should you require any further clarification, please contact us at " +
        "{{__msLegalRep.email}}.\n" +
        "\n" +
        "Yours sincerely,\n" +
        "{{assigneeName}}\n" +
        "Microsoft Response Specialist",
    },
    {
      id: "H_signerName",
      sectionId: "signature",
      label: "Signer name",
      type: "text",
      required: true,
      signingTime: true,
      span: "half",
    },
    {
      id: "H_signedDate",
      sectionId: "signature",
      label: "Signed date",
      type: "date",
      required: true,
      signingTime: true,
      defaultValueFrom: "__today",
      span: "half",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────
// Library + helpers
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// EA Grounds for Refusal — the enforcing authority's decision document
// ─────────────────────────────────────────────────────────────────────────
//
// Inbound from the ENFORCING authority (not the IA). Not a fill-in form —
// it's the EA's None / Full / Partial decision under Reg 2023/1543 Art. 12.
// Rendered read-only in the Documents register (full skeleton); built from
// FormData.eevidenceGroundsForRefusal by buildGfrDocument in
// src/utils/legalDemandForm.ts. The actionable surface stays the
// GroundsForRefusalPanel.

const EPOC_GROUNDS_FOR_REFUSAL: FormTemplate = {
  id: "EPOC_GROUNDS_FOR_REFUSAL",
  name: "EA Grounds for Refusal",
  category: "Notice",
  description:
    "The enforcing authority's Grounds-for-Refusal decision on the EPOC under Regulation (EU) 2023/1543 Article 12 — None, Full, or Partial. Read-only; rendered from the EA's decision payload.",
  regulatoryAnchor: "EU Regulation 2023/1543, Article 12 (ETSI 5.5)",
  sections: [
    { id: "A", title: "Section A: Enforcing authority" },
    { id: "B", title: "Section B: Decision" },
    { id: "C", title: "Section C: Grounds for refusal" },
    { id: "D", title: "Section D: Blocked target identifiers" },
    { id: "E", title: "Section E: Review window" },
  ],
  fields: [
    { id: "A_enforcingAuthority", sectionId: "A", label: "Enforcing authority", type: "text", span: "full" },
    { id: "A_referenceNumber", sectionId: "A", label: "EA reference number", type: "text", span: "half" },
    { id: "B_trigger", sectionId: "B", label: "Trigger", type: "text", span: "half" },
    { id: "B_decision", sectionId: "B", label: "Decision", type: "text", span: "half" },
    { id: "B_decidedAt", sectionId: "B", label: "Decided on", type: "date", span: "half" },
    { id: "B_decidedBy", sectionId: "B", label: "Decided by", type: "text", span: "half" },
    { id: "C_reasons", sectionId: "C", label: "Reason(s) for refusal", type: "textarea", span: "full" },
    { id: "C_reasonSummary", sectionId: "C", label: "Summary", type: "textarea", span: "full" },
    { id: "D_blockedIdentifiers", sectionId: "D", label: "Blocked target identifiers", type: "textarea", span: "full" },
    { id: "E_notifiedAt", sectionId: "E", label: "EA notified on", type: "date", span: "half" },
    { id: "E_windowExpiresAt", sectionId: "E", label: "Review window expires", type: "date", span: "half" },
  ],
};

export const FORM_TEMPLATES: FormTemplate[] = [
  EPOC_FORM_1,
  EPOC_GROUNDS_FOR_REFUSAL,
  EPOC_FORM_2,
  EPOC_FORM_3,
  EPOC_FORM_5,
  EPOC_FORM_6,
  EPOC_END_PRESERVATION,
  EPOC_PRESERVATION_ACK,
  EPOC_WITHDRAWAL,
  REQUEST_ADDITIONAL_INFORMATION,
  PROVIDE_ADDITIONAL_INFORMATION,
  STANDARD_PRODUCTION_LETTER,
  EMERGENCY_DISCLOSURE_NOTICE,
];

export function getTemplateById(id: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find((t) => t.id === id);
}
