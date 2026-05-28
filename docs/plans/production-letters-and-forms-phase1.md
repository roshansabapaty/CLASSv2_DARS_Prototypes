# Production Letters & Forms — Phase 1

**Project:** DARS_EEVIDENCE (`c:\R\DARS_EEVIDENCE`)
**Scope:** New, generic feature available across all request types
**Owner:** lisawu@microsoft.com
**Status:** Planning
**Created:** 2026-05-06

## Context

Today there is no way for an RS user to author and sign template-based correspondence with the law-enforcement authority that submitted a case. The need spans two distinct outbound flows that real RS users do today (often manually, in Word):

- **Production Letters** — outbound demand-acknowledgement / production-confirmation letters.
- **Rejection / Non-Execution Responses** — formal forms returned to the issuing authority when Microsoft cannot comply with an order, cannot meet the deadline, or cannot fulfil exhaustively. Example: **EPOC Form 3** (Annex III of EU Regulation 2023/1543), the non-execution response for European Production / Preservation Orders.

Phase 1 introduces a generic **Forms & Letters** feature inside the case page so that an RS can:

1. Browse a **library** of templates organised by category (Production Letters · Rejection Responses · Notices), scoped to the case's jurisdiction / request type.
2. **Fill out** a selected template using structured fields, with autofill from the current case where applicable. Conditional sections show / hide based on prior answers.
3. **See escalation prompts** — when a chosen value implies a Legal or Legal-Policy review, surface a soft warning banner. (Phase 1 is non-blocking; signing still allowed.)
4. **Sign** the completed form digitally (typed-name + attestation, audit-stamped).
5. **Generate a downloadable PDF** of the filled, signed form to send to the issuing authority via existing channels (out-of-app delivery in Phase 1; "HOW DO WE TRANSMIT THIS?" is a Phase 2 question).

The concrete template fully wired in Phase 1 is **EPOC Form 3 — Non-Execution Response** (EU 2023/1543, Annex III). The user supplied a marked-up PDF that maps reasons to escalation paths (Legal vs. Legal Policy) and to internal LENS / ETSI section codes (`6.4.4-1`, `6.4.4-2`). Those mappings drive the escalation banner logic and template metadata below.

## User-confirmed decisions

- **Entry point:** new accordion section in the case page (alongside Sender Authority, Identifier & Data Services, etc.).
- **Library taxonomy:** distinct categories in a single library — Production Letters, Rejection Responses, Notices. Filterable via a tab or chip group.
- **EPOC variant handling:** single template with conditional sections — Section A (EPOC vs EPOC-PR) drives downstream visibility (Section G shows only for EPOC-PR).
- **Escalation handling:** soft warning banner only — when a Section D reason flagged "Escalate to Legal" / "Escalate to Legal Policy" is selected, render a non-blocking banner. RS may still sign and download. Banner persists in the printable preview.
- **Signing UX:** typed name + attestation checkbox; rendered in a cursive font and stamped with timestamp.
- **Form rendering:** native Fluent fields in a structured panel, with a Preview tab showing the printable layout.
- **Submission scope for Phase 1:** generate a downloadable PDF only. No "Send to LE" status, no Notes/Timeline attachment, no real network delivery.
- **UI library:** Fluent UI v9 + Griffel `makeStyles()` + `tokens.*` for *every new file* (per `docs/UI_LIBRARY_POLICY.md`). No shadcn imports.

## Out of scope (Phase 1)

- Backend persistence — instances live on `formData.formInstances` (in-memory FormData state).
- Real submission to LE (network delivery, audit logs, NDO interplay).
- Auto-attach to NotesTimeline.
- Drawn-signature canvas, uploaded signature image, OAuth-based identity attestation.
- Form versioning / history beyond a single Draft → Signed transition.
- Multi-signer flows.
- Multi-language form variants.

## Approach

### 1. Data model — new file [src/types/formTemplate.ts](src/types/formTemplate.ts)

```ts
export type FormCategory =
  | "ProductionLetter"
  | "RejectionResponse"
  | "Notice"
  | "Other";

export type FormFieldType =
  | "text" | "textarea" | "date" | "select" | "radio"
  | "checkbox"        // single boolean
  | "multi-checkbox"  // multi-select with options[]
  | "case-reference"
  | "identifier-list";

export type EscalationLevel = "Legal" | "LegalPolicy";

export interface EscalationTrigger {
  level: EscalationLevel;
  /** Human-readable rationale shown in the soft warning banner. */
  message: string;
  /** Optional cross-reference to an internal spec, e.g. "ETSI 6.4.4-1". */
  specRef?: string;
}

export interface FormFieldOption {
  value: string;
  label: string;
  /** When this option is selected, the form surfaces a soft escalation
   *  warning banner. Phase 1: warning only — does NOT block signing. */
  escalation?: EscalationTrigger;
}

/** Predicate for showing/hiding a field or section based on other field values
 *  in the same form instance. Resolved against `instance.values`. */
export interface VisibilityPredicate {
  field: string;
  /** True if the referenced field's value strictly equals this. */
  equals?: unknown;
  /** For multi-checkbox parents, true if any of these option values are checked. */
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
  /** Width hint for the rendered Fluent Field. */
  span?: "half" | "full";
  /** Hide the field unless the predicate passes. */
  visibleWhen?: VisibilityPredicate;
  /** For multi-checkbox, "atLeastOne" = at least one option must be checked. */
  validation?: "atLeastOne";
}

export interface FormTemplate {
  id: string;                 // e.g. "EPOC_FORM_3"
  name: string;               // e.g. "EPOC Form 3 — Non-Execution Response"
  category: FormCategory;
  description: string;
  /** Free-form regulatory anchor (e.g. "EU Regulation 2023/1543, Annex III"). */
  regulatoryAnchor?: string;
  jurisdiction?: string[];    // optional filter, e.g. ["EU"]
  requestTypes?: string[];    // optional filter
  sections: FormSection[];
  fields: FormField[];
}

export type FormInstanceStatus = "Draft" | "Signed";

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
```

Extend `FormData` in [src/types/caseTypes.ts](src/types/caseTypes.ts) with one new field:

```ts
formInstances?: CaseFormInstance[];
```

### 1a. Helper utilities — `src/components/forms-library/formEngine.ts`

Pure functions consumed by the filler, preview, and PDF generator:

- `isFieldVisible(field, values) => boolean` — evaluates `visibleWhen`.
- `isSectionVisible(section, values) => boolean` — same for sections.
- `collectEscalations(template, values) => EscalationTrigger[]` — walks every selected option across every field and returns the unique escalation triggers, sorted by level.
- `validateInstance(template, values) => { ok: boolean; missingFieldIds: string[] }` — required + `atLeastOne`.
- `resolveAutofill(template, formData) => Record<string, unknown>` — dot-path lookup against case FormData when an instance is created.

### 2. Template library — new file [src/config/formTemplates.ts](src/config/formTemplates.ts)

A declarative array of `FormTemplate`. Phase 1 ships:

- **`EPOC_FORM_3`** — fully fielded (schema below). Category: `RejectionResponse`. `regulatoryAnchor: "EU Regulation 2023/1543, Annex III"`. `jurisdiction: ["EU"]`.
- **`STANDARD_PRODUCTION_LETTER`** — stub, category `ProductionLetter`. ~5 fields (To, Re, Acknowledgement Date, Body, Signer). Demonstrates Phase 1 supports more than just rejection.
- **`EMERGENCY_DISCLOSURE_NOTICE`** — stub, category `Notice`. ~4 fields. Same purpose: prove the library scales.

Helper exports:
- `getTemplatesForCase(formData) => FormTemplate[]` — applies `jurisdiction` / `requestTypes` filtering against the current case.
- `getTemplatesByCategory(templates, category) => FormTemplate[]` — used by the picker's category filter.

#### EPOC Form 3 — concrete schema

Section IDs and field IDs are keyed to the source PDF (Annex III of Regulation EU 2023/1543) plus the user's marked-up routing annotations.

**Sections**

| id | Title | `visibleWhen` |
|---|---|---|
| `A` | Section A: Certificate concerned | always |
| `B` | Section B: Relevant authority(ies) | always |
| `C` | Section C: Addressee of the EPOC/EPOC-PR | always |
| `D` | Section D: Reasons for non-execution | always |
| `E` | Section E: Conflicting obligations arising from the law of a third country | `D_reasons` includes `"thirdCountryConflict"` |
| `F` | Section F: Request for additional information/clarification | always (optional content) |
| `G` | Section G: Preservation of data | `A_certificateType === "EPOC_PR"` |
| `H` | Section H: Contact details + signature | always |

**Fields (abbreviated; full set in implementation)**

| id | section | type | label | required | autofill / notes |
|---|---|---|---|---|---|
| `A_certificateType` | A | radio | Certificate concerned | yes | options: `EPOC` ("European Production Order Certificate"), `EPOC_PR` ("European Preservation Order Certificate"). |
| `B_issuingAuthority` | B | text | Issuing authority | yes | `legalContext.primaryIssuingAuthority.name` |
| `B_issuingFileNumber` | B | text | File number of the issuing authority | yes | `caseNumber` |
| `B_validatingAuthority` | B | text | If applicable, validating authority | no | — |
| `B_validatingFileNumber` | B | text | If applicable, file number of validating authority | no | — |
| `B_dateOfIssue` | B | date | Date of issue of the EPOC/EPOC-PR | yes | `dateServed` |
| `B_dateOfReceipt` | B | date | Date of receipt of the EPOC/EPOC-PR | yes | `dateReceived` |
| `B_enforcingAuthority` | B | text | If applicable, enforcing authority | no | `legalContext.primaryEnforcingAuthority.name` |
| `B_enforcingFileNumber` | B | text | If available, file number of enforcing authority | no | — |
| `C_addressee` | C | text | Addressee of the EPOC/EPOC-PR | yes | (configurable; defaults to the MS legal entity for the case jurisdiction) |
| `C_addresseeFileNumber` | C | text | File number of the addressee | no | `caseId` |
| `D_reasons` | D | multi-checkbox | Reason(s) for non-execution | yes (`atLeastOne`) | options below |
| `D_explanation` | D | textarea | Please explain further (and any other reasons) | no | — |
| `E_lawTitle` | E | text | Title of the law(s) of the third country | yes (when E visible) | — |
| `E_statutoryProvision` | E | textarea | Applicable statutory provision(s) and relevant text | yes | — |
| `E_natureOfObligation` | E | multi-checkbox | Nature of conflicting obligation | yes | options: `fundamentalRights`, `nationalSecurity`, `other` |
| `E_natureOther` | E | textarea | Specify "other interests" | no | `visibleWhen: { field: "E_natureOfObligation", includesAny: ["other"] }` |
| `E_whyApplicable` | E | textarea | Why the law is applicable in this case | yes | — |
| `E_whyConflict` | E | textarea | Why a conflict exists in this case | yes | — |
| `E_providerLink` | E | textarea | Link between service provider and the third country | yes | — |
| `E_consequences` | E | textarea | Possible consequences and penalties for the addressee | yes | — |
| `E_additional` | E | textarea | Any other relevant information | no | — |
| `F_clarificationRequest` | F | textarea | Information required from issuing authority | no | helper: "Optional — fill only if Section F applies." |
| `G_preservationStatus` | G | radio | Preservation status of the requested data | yes (when G visible) | options below |
| `H_legalRepresentative` | H | text | Designated establishment / legal representative | yes | (default Microsoft legal-rep entity) |
| `H_contactName` | H | text | Name of the contact person | yes | `assigneeName` |
| `H_postHeld` | H | text | Post held | no | "Response Specialist" |
| `H_address` | H | textarea | Address | no | (default MS address) |
| `H_telNo` | H | text | Tel. No (with country code) | no | — |
| `H_faxNo` | H | text | Fax No (with country code) | no | — |
| `H_email` | H | text | Email | no | (assignee email) |
| `H_authorisedName` | H | text | Name of the authorised person | yes | `assigneeName` |
| `H_date` | H | date | Date | yes | (today, set on instance create) |
| `H_signature` | H | (rendered by SignaturePanel — not a stored field) | Signature | yes | — |

**Section D — `D_reasons` options (escalation rules baked in)**

| value | label | escalation | specRef |
|---|---|---|---|
| `incomplete` | It is incomplete | — | ETSI 6.4.4-1 |
| `manifestErrors` | It contains manifest errors (addressed to wrong company) | — | ETSI 6.4.4-1 |
| `insufficientInformation` | It does not contain sufficient information (unable to identify unique user) | — | ETSI 6.4.4-1 |
| `notDataController` | Data is not stored by/on behalf of the service provider (NSU or not data controller) | — | ETSI 6.4.4-1 |
| `deFactoImpossibility` | Other reasons of *de facto* impossibility (not technically feasible) | **LegalPolicy** — "Technical-feasibility rejections must be reviewed by Legal Policy before transmission." | ETSI 6.4.4-2 |
| `notValidIssuingAuthority` | Order not issued/validated by a valid issuing authority (Art. 4) | **Legal** — "Authority-validity rejections require Legal review." | ETSI 6.4.4-2 |
| `wrongOffenceCategory` | Order issued for an offence not covered by Article 5(4) | — | ETSI 6.4.4-2 |
| `serviceNotCovered` | Service is not covered by Regulation (EU) 2023/1543 | **Legal** — "Out-of-scope rejections require Legal review." | ETSI 6.4.4-2 |
| `protectedData` | Data protected by immunities/privileges (lawyer, journalist, doctor, govt, intl org) | **Legal** — "Privilege-based rejections require Legal review." | ETSI 6.4.4-2 |
| `thirdCountryConflict` | Compliance would conflict with the law of a third country (also fill Section E) | **Legal** — "Conflict-of-law rejections require Legal review." | ETSI 6.4.4-2 |

**Section G — `G_preservationStatus` options**

| value | label |
|---|---|
| `preserved` | Are being preserved until produced or until the issuing authority informs preservation is no longer needed |
| `notPreserved` | Are not being preserved (exceptional — e.g., service provider does not have the data or cannot identify it sufficiently) |

The "HOW DO WE TRANSMIT THIS?" question from the source PDF is documented in Phase 2 — Phase 1 transmission is "RS downloads PDF and sends via existing email/portal channel."

### 3. New components — `src/components/forms-library/`

All Fluent v9 + Griffel. No shadcn imports.

| File | Purpose |
|---|---|
| `FormsLibrarySection.tsx` | The accordion-section content. Shows a list of existing instances on the case (Draft/Signed badges, last-updated, signer) plus a primary "New form" `Button` that opens the template picker. |
| `TemplatePickerDialog.tsx` | Fluent `Dialog` with category tabs (`TabList` + `Tab`): **Production Letters · Rejection Responses · Notices · All**. Below the tabs, a list of templates filtered by both the active category and the case's jurisdiction/requestType. Each row: name, regulatory anchor (small subtle text), description, jurisdiction `Badge`, "Open" `Button`. Selecting creates a new draft instance and opens the filler. |
| `FormFillerDialog.tsx` | Large Fluent `Dialog` with two `Tab`s: **Fill** and **Preview**. The Fill tab iterates `template.sections.filter(isSectionVisible)` and within each section renders `template.fields.filter(f => f.sectionId === section.id && isFieldVisible(f))` as Fluent `Field` + the appropriate input. Multi-checkbox uses `Checkbox` × N with `validation: "atLeastOne"` enforced at submit. Header hosts the `EscalationBanner`. Footer: Save Draft, Continue to Sign. Autosaves to `formInstances`. |
| `EscalationBanner.tsx` | Fluent `MessageBar` (intent `warning`) shown above the fill area and above the preview when `collectEscalations(template, values)` returns a non-empty list. Each trigger row: `{level} — {message}` followed by a small Fluent `Info` icon that opens a `Tooltip` containing the ETSI / spec ref (e.g. "ETSI 6.4.4-2"). In the printable / PDF surface (where hover is unavailable), the same spec ref renders inline parenthetically. **Non-blocking** — informational only. |
| `SignaturePanel.tsx` | Typed-name `Input` + attestation `Checkbox` + a live preview rendered in the Segoe Script → Caveat → `cursive` font stack (see Resolved decisions). Disabled until both fields are filled. Sets `signature` and flips status to Signed. |
| `FormPreviewPanel.tsx` | Read-only printable layout — letterhead, regulatory anchor, sections (with `isSectionVisible` applied), filled values, escalation banner inline (when present), and (when signed) the signature block with audit line. Used by the Preview tab and by the PDF generator. |
| `FormStatusBadge.tsx` | Fluent `Badge` mapping `FormInstanceStatus` to color + label. |
| `pdfGenerator.ts` | Phase 1 implementation: opens `window.open()` with a print-styled HTML render of `FormPreviewPanel` and triggers `window.print()`. Browser's native "Save as PDF" handles the actual PDF. **Zero new dependencies.** A later phase can swap in `pdf-lib` for true headless generation. |

### 4. State plumbing

The case-level state owner is [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx). Add:

- `handleCreateFormInstance(templateId)` — pushes a new `CaseFormInstance` into `formData.formInstances`.
- `handleUpdateFormInstance(instanceId, partial)` — patches values / status / signature.
- `handleDeleteFormInstance(instanceId)` — Draft only.
- Pass these as props through `CaseSummaryAndTabs` to `FormsLibrarySection`.

### 5. Wire-up in [src/components/CaseSummaryAndTabs.tsx](src/components/CaseSummaryAndTabs.tsx)

Add a new section to the `list` at line 114-121:

```ts
{ key: "forms", label: "Forms & Letters", icon: FileSignature, content: formsLibraryContent, collapsedSummary: buildSectionStatus("forms") },
```

Position: between "notification" and "review" so it sits at the bottom of the case workflow. Add a corresponding `formsLibraryContent: React.ReactNode` prop to the component's props interface and threading it from `DataEntryForm`.

### 6. Autofill examples (EPOC Form 3, illustrative)

| Field | `defaultValueFrom` |
|---|---|
| Case reference | `caseId` |
| Issuing authority country | `legalContext.country.countryName` |
| Issuing authority name | `legalContext.primaryIssuingAuthority.name` |
| Date of issue | (today, set on instance create) |
| Subject identifiers list | `identifiers` (rendered as a list field via `type: "identifier-list"`) |

The `resolveAutofill` helper does dot-path lookup; missing paths leave the field blank for the user to fill.

## Files to create

1. `src/types/formTemplate.ts` — types.
2. `src/config/formTemplates.ts` — template library with full EPOC_FORM_3 + 2 stubs.
3. `src/config/microsoftLegalReps.ts` — per-region `MicrosoftLegalRep` lookup feeding Section H autofill.
4. `src/components/forms-library/formEngine.ts` — pure helpers: `isFieldVisible`, `isSectionVisible`, `collectEscalations`, `validateInstance`, `resolveAutofill`.
5. `src/components/forms-library/FormsLibrarySection.tsx`
6. `src/components/forms-library/TemplatePickerDialog.tsx` — with category tabs.
7. `src/components/forms-library/FormFillerDialog.tsx`
8. `src/components/forms-library/EscalationBanner.tsx`
9. `src/components/forms-library/SignaturePanel.tsx`
10. `src/components/forms-library/FormPreviewPanel.tsx`
11. `src/components/forms-library/FormStatusBadge.tsx`
12. `src/components/forms-library/pdfGenerator.ts`
13. `src/components/forms-library/index.ts` — barrel exports.

## Files to modify

1. [src/types/caseTypes.ts](src/types/caseTypes.ts) — add `formInstances?: CaseFormInstance[]` to `FormData`.
2. [src/components/CaseSummaryAndTabs.tsx](src/components/CaseSummaryAndTabs.tsx) — add `formsLibraryContent` prop + new "Forms & Letters" section in the `list`.
3. [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx) — add the three handlers, render `<FormsLibrarySection>` in the new prop.
4. `index.html` — add the Caveat web-font fallback `<link>` tag for the typed-signature preview (see Signature font decision below).

## Resolved decisions (round 2)

### Signature font — Segoe Script (Microsoft) with Caveat fallback

**Microsoft's own e-signing handwriting font is `Segoe Script`** — designed by Carl Crossgrove, based on Brian Allen's handwriting, shipped with Windows and the M365 font suite. It's the natural choice for an MS-built case-management app: connected cursive, polished, contemporary, and matches the Fluent design system's typographic family (Segoe).

Caveat: Segoe Script ships with Windows but **not** macOS or Linux. To stay platform-portable (RS users may print PDFs from any environment), use a CSS font stack:

```css
font-family: "Segoe Script", "Caveat", cursive;
```

- **Windows** users render the MS-canonical font instantly (no network).
- **Non-Windows** users fall through to Caveat (Google Fonts, lightweight, free) loaded via `<link>` in `index.html`. Caveat → system `cursive` if Google Fonts is blocked.

Apply this stack in `SignaturePanel` (live preview) and `FormPreviewPanel` (printable / PDF render) so the rendered signature is consistent with what M365 / Word would produce.

### Section H defaults — per-jurisdiction lookup table

`src/config/microsoftLegalReps.ts` (new file) ships a small const map keyed by case region:

```ts
export const MICROSOFT_LEGAL_REPS: Record<CaseRegion, MicrosoftLegalRep> = {
  EU:    { /* MS Ireland Operations Limited — values TBD by user */ },
  EEA:   { /* same as EU per ePrivacy/eEvidence designation */ },
  UK:    { /* MS UK entity */ },
  US:    { /* Microsoft Corporation, Redmond */ },
  APAC:  { /* MS Asia */ },
  LATAM: { /* MS regional rep */ },
  ROW:   { /* MS Corporation fallback */ },
};

interface MicrosoftLegalRep {
  designatedEstablishment: string;  // e.g. "Microsoft Ireland Operations Limited"
  contactName?: string;             // Designated person (often left for RS)
  postHeld?: string;
  address: string;                  // multi-line address
  telNo?: string;
  faxNo?: string;
  email: string;
}
```

`resolveAutofill` for EPOC Form 3 looks up `legalContext.country.region` and pulls the matching rep into Section H's `H_legalRepresentative` / `H_address` / `H_email` (etc.) fields when the instance is created. RS can edit any value before signing.

**Open sub-item:** user (lisawu@microsoft.com) to paste the actual entity values for at least the EU row before EPOC Form 3 ships. Other regions can stay as `TBD` placeholders for Phase 1.

### ETSI section refs — progressive disclosure (tooltip / "Details" link)

Don't dump raw ETSI codes into the banner copy. Instead:

- `EscalationBanner` renders each trigger as: `{message}` + a small `Info` icon at the end of the line.
- Hovering / focusing the icon opens a Fluent `Tooltip` containing the ETSI section reference (e.g. "ETSI 6.4.4-2"). For touch devices and the printable PDF, a "Details" link expands the same content inline.
- In `FormPreviewPanel` / printed PDF (no hover available), the spec ref renders inline parenthetically after the message — same source data, different surface treatment.

This keeps the live filler banner scannable while preserving full traceability for the Legal reviewer who receives the printed/preview artifact.

## Verification

1. `npm run dev` in `c:\R\DARS_EEVIDENCE` and open an EU case from the queue.
2. Scroll to the new **Forms & Letters** accordion section. Confirm the empty state with a "New form" button.
3. Click **New form** → picker opens. Confirm category tabs (**Production Letters · Rejection Responses · Notices · All**). Switch to **Rejection Responses** → EPOC Form 3 is listed with its regulatory anchor.
4. Pick EPOC Form 3 → filler opens. Section A appears first; Section G is **hidden**. Section E is **hidden** until conflict-of-law reason is checked.
5. Pick `EPOC_PR` in Section A → confirm Section G appears. Toggle back to `EPOC` → Section G hides.
6. In Section D, check `thirdCountryConflict` → Section E reveals; an `EscalationBanner` appears with a warning intent listing Legal-level escalation message + "ETSI 6.4.4-2".
7. Check `notValidIssuingAuthority` (also Legal escalation) → banner now lists both triggers. Sign button remains enabled.
8. Fill required fields including Section E → **Continue to Sign** enables. Click → `SignaturePanel` renders.
9. Type signer name, check attestation, confirm. Status badge in the section list flips Draft → Signed.
10. Open the Signed instance → Preview tab shows the printable layout with the escalation banner inline + signature block + audit line.
11. Click **Download PDF** → browser print dialog opens with the print-styled layout. Save as PDF works; the escalation banner is visible on the printed page.
12. Re-open the same case → instance persists in `formData.formInstances` (in-memory).
13. Create a second instance from `STANDARD_PRODUCTION_LETTER` (Production Letters tab) → both instances show in the section list with their category and status badges.
14. Open the picker on a non-EU case → EPOC Form 3 is filtered out (`jurisdiction: ["EU"]`).

## Risks and mitigations

- **Print-to-PDF parity** — different browsers paginate differently. Mitigate by using a fixed-width print stylesheet (`@page { size: letter; margin: 0.75in }`) and minimal images.
- **Conditional-visibility complexity** — Section E + Section G + per-option escalation rules add real logic. Keep it pure in `formEngine.ts` and unit-test the predicates if a test harness exists; otherwise verify manually using the cases in the Verification section.
- **Autofill drift** — if a case is edited later, a draft's autofilled values won't update. Acceptable for Phase 1; document the behaviour in the filler header ("Values captured on {createdAt}").
- **Cursive font load** — if the network blocks Google Fonts, signature preview falls back to system `cursive`. Acceptable visual degradation.
- **Pre-commit hook** — `scripts/check-no-new-shadcn-imports.sh` will reject any new file that imports from `src/components/ui/*`. All new components must use Fluent v9 imports only.

## Phase 2 (not in this plan, for context)

- **"HOW DO WE TRANSMIT THIS?"** — real transmission channel for signed forms (decentralised IT system per Reg 2023/1543, secure email, LE portal, or per-jurisdiction route). Includes the official-stamp / electronic-seal / equivalent-authentication requirement called out in the EPOC Form 3 footnote.
- **Blocking escalation gate** — option to require Legal/Legal Policy sign-off before signing for the flagged Section D reasons (graduating Phase 1's soft warning to a hard gate).
- Auto-attach signed form to NotesTimeline.
- Backend persistence (CaseFormInstance → API).
- Drawn-signature option.
- Multi-signer / approval routing.
- Versioned templates with effective dates; multi-language variants.
- Additional EU-eEvidence templates: EPOC Form 1, EPOC-PR Form 2, plus jurisdiction-specific production letters (US, UK, etc.).
