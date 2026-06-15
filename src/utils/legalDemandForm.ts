/**
 * legalDemandForm — builds a read-only "completed form" instance for the
 * inbound IA legal demand on an eEvidence case, so the open-docs / review-
 * legal-demands surfaces can render it via <FormPreviewPanel>.
 *
 * For an EPOC-ER (production) case → EPOC Form 1.
 * For an EPOC-PR (preservation) case → EPOC Form 2.
 *
 * Why a dedicated builder (vs. the template `defaultValueFrom` autofill):
 * the autofill resolver (`resolveAutofill`) only walks scalar dot-paths and
 * cannot traverse the per-identifier arrays (services × categories × date
 * ranges) a Form 1 needs. This builder constructs the `values` map directly
 * and pre-formats the repeating data into bullet/multi-line strings that
 * FormPreviewPanel renders as-is.
 *
 * PROTOTYPE NOTE: Form 1 has no raw "as-submitted" ETSI payload bag on the
 * case — we derive its fields from the normalized FormData envelope. In
 * production this builder would read the raw ETSI fields retrieved from the
 * LENS-CMS backend. See docs/plans/inbound-eevidence-form-views.md.
 */

import { format, isValid } from "date-fns";
import type { AccountIdentifier, FormData } from "../types/caseTypes";
import type { CaseFormInstance, FormTemplate } from "../types/formTemplate";
import type { CorrespondenceItem } from "../types/correspondence";
import { getTemplateById } from "../config/formTemplates";

export interface LegalDemandForm {
  template: FormTemplate;
  instance: CaseFormInstance;
}

// ── formatting helpers ──────────────────────────────────────────────────

function fmtDate(value?: string | Date | null): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? format(d, "MMM d, yyyy") : String(value);
}

function fmtRange(r?: { start: string; end: string }): string {
  if (!r) return "";
  const s = fmtDate(r.start);
  const e = fmtDate(r.end);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

function joinRefs(refs?: string[]): string {
  return (refs ?? []).filter(Boolean).join(", ");
}

/** Normalize a Date | ISO-string | undefined to a date-only ISO string so
 *  the `date`-typed preview fields (which only format strings) render it. */
function toIso(value?: Date | string | null): string {
  if (!value) return "";
  if (value instanceof Date) {
    return isValid(value) ? value.toISOString().slice(0, 10) : "";
  }
  return value;
}

/** Multi-line contact block from an authority approver/contact. */
function contactBlock(c?: {
  name?: string;
  email?: string;
  address?: string;
  tel?: string;
  fax?: string;
}): string {
  if (!c) return "";
  return [
    c.name,
    c.email,
    c.address,
    c.tel ? `Tel: ${c.tel}` : "",
    c.fax ? `Fax: ${c.fax}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** One "value (type) · taskId" line per target identifier. */
function identifierLines(identifiers: AccountIdentifier[]): string[] {
  return identifiers.map((id) => {
    const bits = [`${id.value} (${id.type})`];
    if (id.taskId) bits.push(id.taskId);
    return bits.join(" · ");
  });
}

/** Per-identifier requested-data block: service → categories (date range). */
function requestedDataBlock(identifiers: AccountIdentifier[]): string {
  const blocks: string[] = [];
  for (const id of identifiers) {
    const services = id.leExternalServices ?? [];
    if (services.length === 0) continue;
    const lines: string[] = [`${id.value}:`];
    for (const svc of services) {
      const cats = id.leExternalCategoryRequests?.[svc] ?? [];
      const svcRange = id.leExternalServiceDates?.[svc];
      if (cats.length > 0) {
        for (const cat of cats) {
          const range = fmtRange(cat.dateRange ?? svcRange);
          const items = cat.items?.length ? `: ${cat.items.join(", ")}` : "";
          lines.push(
            `  • ${svc} → ${cat.groupName}${items}${range ? ` (${range})` : ""}`,
          );
        }
      } else {
        const range = fmtRange(svcRange);
        lines.push(`  • ${svc}${range ? ` (${range})` : ""}`);
      }
    }
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}

const EMERGENCY_CATEGORY_LABEL: Record<string, string> = {
  DangerToLife: "Imminent danger to life",
  DangerOfInjury: "Imminent danger of serious injury",
  CriticalInfrastructure: "Threat to critical infrastructure",
};

// ── builders ────────────────────────────────────────────────────────────

function buildForm1Values(formData: FormData): Record<string, unknown> {
  const ia = formData.eevidenceIssuingAuthority;
  const va = formData.eevidenceValidatingAuthority;
  const ca = formData.eevidenceCompetentAuthority;
  const ea = formData.eevidenceEnforcingAuthority;
  const ids = formData.identifiers ?? [];
  const emergency = formData.eevidenceAuthorisationFlags?.emergencyJustification;
  const ent = formData.eevidenceEnterpriseRequest;

  const offence = [
    (formData.natureOfCrimes ?? []).join(", "),
    formData.eevidenceAuthorisationTypeOfCaseOtherDescription,
  ]
    .filter(Boolean)
    .join(" — ");

  const additionalInfo = [
    formData.additionalCaseInformation,
    ...ids
      .filter((i) => i.issuingAuthorityNotes)
      .map((i) => `${i.value}: ${i.issuingAuthorityNotes}`),
  ]
    .filter(Boolean)
    .join("\n");

  const values: Record<string, unknown> = {
    // Section A — Issuing authority
    A_issuingAuthority: ia?.name ?? "",
    A_issuingAuthorityRole: ia?.issuingAuthorityRole ?? "",
    A_issuingAuthorityCountry: ia?.country?.countryName ?? "",
    A_issuingApprovalRole: ia?.approvalRole ?? "",
    A_issuingFileNumbers: joinRefs(ia?.approvalReferenceNumbers),
    A_issuingContact: contactBlock(ia?.approver) || contactBlock(ia?.centralAuthorityContact),
    // Section D — Enforcing authority
    D_enforcingAuthority: ea?.name ?? "",
    D_enforcingContact: contactBlock({
      name: ea?.contactName,
      email: ea?.email,
      address: ea?.address,
      tel: ea?.tel,
      fax: ea?.fax,
    }),
    // Section E — Target identifiers
    E_targetIdentifiers: identifierLines(ids),
    // Section F — Requested data
    F_requestedData: requestedDataBlock(ids),
    // Section G — Offence
    G_offence: offence,
    // Section H — Dates & deadlines
    H_dateOfIssuance: formData.dateOfIssuance ?? "",
    H_dateOfTransmission: formData.dateOfTransmission ?? "",
    H_dateServed: formData.dateServed ?? "",
    H_dateReceived: formData.dateReceived ?? "",
    H_authorizationStartDate: toIso(formData.authorizationStartDate),
    H_authorizationExpirationDate: toIso(formData.authorizationExpirationDate),
    H_dueDate: toIso(formData.dueDate),
    H_priority: formData.casePriority ?? "",
    // Section B — Validating authority
    B_validatingAuthority: va?.name ?? "",
    B_validatingAuthorityRole: va?.authorityRole ?? "",
    B_validatingAuthorityCountry: va?.country?.countryName ?? "",
    B_validatingFileNumbers: joinRefs(va?.approvalReferenceNumbers),
    // Section C — Competent authority
    C_competentAuthority: ca?.name ?? "",
    C_competentAuthorityCountry: ca?.country?.countryName ?? "",
    C_competentFileNumbers: joinRefs(ca?.approvalReferenceNumbers),
    // Section I — Enterprise request (ETSI UnderlyingConditions). Booleans
    // pass through (true → Yes, false → No, undefined → "—").
    I_addressedToController: ent?.addressedToController,
    I_addressedToProcessor: ent?.addressedToProcessor,
    I_processorControllerUnidentified: ent?.addressedToProcessorControllerUnidentified,
    I_processorDetrimental: ent?.addressedToProcessorDetrimentalToInvestigation,
    I_processorShallInformController: ent?.processorShallInformController,
    I_processorShallNotInformController: ent?.processorShallNotInformController,
    I_permissionToNotifyUser: ent?.permissionToNotifyUser,
    I_justification: ent?.justification ?? "",
    I_relevantInformation: ent?.relevantInformation ?? "",
    // Section J — Emergency justification
    J_emergencyCategory: emergency
      ? EMERGENCY_CATEGORY_LABEL[emergency.category] ?? emergency.category
      : "",
    J_emergencyNote: emergency?.note ?? "",
    // Section K — Additional information
    K_additionalInformation: additionalInfo,
  };

  return values;
}

function buildForm2Values(formData: FormData): Record<string, unknown> {
  const ia = formData.eevidenceIssuingAuthority;
  const ids = formData.identifiers ?? [];
  const ref = joinRefs(ia?.approvalReferenceNumbers);

  // Earliest per-identifier preservation expiry anchors the order window.
  const expirations = ids
    .map((i) => i.desiredPreservationExpiration)
    .filter((v): v is string => !!v)
    .sort();
  const initialExpiry = expirations[0] ?? "";

  const dataDescription = requestedDataBlock(ids) ||
    ids.map((i) => `${i.value} (${i.type})`).join("\n");

  return {
    A_issuingAuthority: ia?.name ?? "",
    A_issuingFileNumber: (ia?.approvalReferenceNumbers ?? [])[0] ?? "",
    A_dateOfIssue: formData.dateOfIssuance ?? "",
    B_preservationOrderReference: ref,
    B_preservationDuration: initialExpiry ? `Until ${fmtDate(initialExpiry)}` : "",
    B_initialPreservationExpiration: initialExpiry,
    C_offenceCategory: (formData.natureOfCrimes ?? []).join(", "),
    C_dataDescription: dataDescription,
  };
}

// ── public API ──────────────────────────────────────────────────────────

/** True when this case has an inbound IA legal demand we can render. */
export function hasLegalDemandForm(formData: FormData | null | undefined): boolean {
  return !!formData && formData.requestType === "eEvidence";
}

/** Is this a preservation (EPOC-PR) case rather than a production (EPOC-ER) one? */
function isPreservation(formData: FormData): boolean {
  return (formData.requestSubType ?? "").toUpperCase().includes("PR");
}

/**
 * Build the read-only legal-demand form for an eEvidence case, or null when
 * the case isn't eEvidence (callers fall back to the existing legal docs).
 */
export function buildLegalDemandInstance(
  formData: FormData | null | undefined,
): LegalDemandForm | null {
  if (!formData || formData.requestType !== "eEvidence") return null;

  const preservation = isPreservation(formData);
  const template = getTemplateById(preservation ? "EPOC_FORM_2" : "EPOC_FORM_1");
  if (!template) return null;

  const values = preservation
    ? buildForm2Values(formData)
    : buildForm1Values(formData);

  const ia = formData.eevidenceIssuingAuthority;
  const signedAt = formData.dateOfIssuance
    ? new Date(formData.dateOfIssuance)
    : formData.createDate ?? new Date();

  const instance: CaseFormInstance = {
    instanceId: `legal-demand-${formData.caseId}`,
    templateId: template.id,
    caseId: formData.caseId,
    status: "Signed",
    values,
    signature: {
      signerName: ia?.name ?? "Issuing Authority",
      signedAt: isValid(signedAt) ? signedAt : new Date(),
      attestation: true,
    },
    createdAt: signedAt,
    updatedAt: signedAt,
  };

  return { template, instance };
}

// ── Documents register ──────────────────────────────────────────────────

/** A single reviewable inbound document on the case, rendered (boxed +
 *  PDF) in the Legal Document Review Panel register. */
export interface LegalDemandDoc {
  /** Stable id for tab selection. */
  id: string;
  /** Short tab label, e.g. "Form 1", "Withdrawal". */
  shortLabel: string;
  /** Full document name (the template name). */
  label: string;
  /** Secondary line, e.g. "Legal demand" or "Received Jun 9, 2026". */
  sublabel: string;
  template: FormTemplate;
  instance: CaseFormInstance;
}

const DOC_SHORT_LABEL: Record<string, string> = {
  EPOC_FORM_1: "Form 1",
  EPOC_FORM_2: "Form 2",
  EPOC_FORM_5: "Form 5",
  EPOC_FORM_6: "Form 6",
  EPOC_END_PRESERVATION: "End preservation",
  EPOC_WITHDRAWAL: "Withdrawal",
  EPOC_PRESERVATION_ACK: "Preservation ack",
};

function shortLabelFor(template: FormTemplate): string {
  return DOC_SHORT_LABEL[template.id] ?? template.name;
}

/**
 * Aggregate every inbound formal document on an eEvidence case for the
 * Legal Document Review Panel register:
 *   - the primary legal demand (Form 1 / Form 2) from the ETSI envelope, and
 *   - each inbound correspondence item carrying a `structuredForm`
 *     (Form 5 / Form 6 / End-of-Preservation / Withdrawal, …).
 * Returns [] for non-eEvidence cases.
 */
export function buildCaseLegalDocuments(
  formData: FormData | null | undefined,
  items: ReadonlyArray<CorrespondenceItem>,
): LegalDemandDoc[] {
  const docs: LegalDemandDoc[] = [];

  // 1. Primary legal demand (Form 1 / Form 2).
  const primary = buildLegalDemandInstance(formData);
  if (primary) {
    docs.push({
      id: `primary-${primary.instance.caseId}`,
      shortLabel: shortLabelFor(primary.template),
      label: primary.template.name,
      sublabel: "Legal demand",
      template: primary.template,
      instance: primary.instance,
    });
  }

  // 2. Inbound structured-form documents from correspondence. Skip any that
  //    reuse the primary's template (e.g. an EPOC-PR also arrives as a
  //    PreservationOrder item) so the legal demand isn't listed twice.
  const primaryTemplateId = primary?.template.id;
  for (const item of items) {
    if (item.direction !== "Inbound") continue;
    if (!item.structuredForm) continue;
    if (item.structuredForm.templateId === primaryTemplateId) continue;
    const template = getTemplateById(item.structuredForm.templateId);
    if (!template) continue;
    const createdAt = new Date(item.createdAt);
    const validDate = isValid(createdAt);
    const when = validDate ? createdAt : new Date();
    docs.push({
      id: `inbound-${item.id}`,
      shortLabel: shortLabelFor(template),
      label: template.name,
      sublabel: validDate ? `Received ${format(createdAt, "MMM d, yyyy")}` : "Received",
      template,
      instance: {
        instanceId: `inbound-${item.id}`,
        templateId: template.id,
        caseId: formData?.caseId ?? "",
        status: "Signed",
        values: item.structuredForm.values,
        createdAt: when,
        updatedAt: when,
        signature: {
          signerName: "Issuing Authority",
          signedAt: when,
          attestation: true,
        },
      },
    });
  }

  return docs;
}
