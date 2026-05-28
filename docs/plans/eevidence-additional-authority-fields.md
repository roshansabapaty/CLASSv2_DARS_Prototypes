# eEvidence — Additional Issuing / Validating / Enforcing Authority Fields + ETSI AuthorisationTypeOfCase

**Project:** DARS_EEVIDENCE (`c:\R\DARS_EEVIDENCE`)
**Scope:** Extend the case form to capture the full set of authority-side fields
required by the EU eEvidence regulation (Reg. 2023/1543). Adds 3 new
subsections to **Authorization Details** (Issuing / Validating / Enforcing
Authority), changes the **Request Type** card's Country field to source from
the Issuing Authority, adds the ETSI `AuthorisationTypeOfCase` dictionary
values to the Nature of Crime picker (eEvidence-tagged), adds an
**Enterprise Request** card to the Request Type section that captures the
ETSI UnderlyingConditions decision flow via progressive disclosure, adds a
**Related Case(s)** structured summary block to the Case Identification card
(eEvidence-only), and ships the supporting type + mock fields.
**Status:** Ready to implement
**Created:** 2026-05-12
**Applies to:** Cases where `requestType === "eEvidence"`. Non-eEvidence cases
are unchanged.

## Context

Today the case form stores authority context in two places:

- A **flat** group of legacy fields on `FormData` — `country`, `jurisdiction`,
  `agency`, `agencyPhone`, `agencyAddress`, `agents[]`, plus a single
  approver block (`approverName`, `approverRole`, `approverEmail`,
  `approverPhoneNumber`, `approverAlternateName`).
- A **structured** [`legalContext`](src/types/caseTypes.ts#L362-L381)
  block — `country`, `jurisdiction`, `agencies[CaseAgencyRole]`, with derived
  `primaryIssuingAuthority` / `primaryEnforcingAuthority`. Already supports
  multiple agencies; the missing piece is the *role-specific contact metadata*
  the EU eEvidence envelope carries.

The eEvidence regulation requires the case to capture three separate
authorities, each with its own country, approver, contact, and reference
metadata:

| Authority | What it is | Required for eEvidence? |
|---|---|---|
| **Issuing Authority (IA)** | Court / Prosecutor / Other Competent Authority that issued the EPOC. | Always |
| **Validating Authority (VA)** | When the IA isn't a judge, a separate Judge/Prosecutor that validated the order. | Conditional — present when the IA is "Other Competent Authority" |
| **Enforcing Authority (EA)** | The Member State authority that transmits/enforces the order under Reg. 2023/1543. | When transmission goes through the enforcing-state route |

The current `legalContext.primaryIssuingAuthority` and `primaryEnforcingAuthority`
fields are `Agency` references (registry lookups). They don't carry the
*per-case* contact details the IA/VA/EA blocks need (signer, multiple
reference numbers, fax with country/area codes, languages spoken). This plan
adds those.

Mock case data lives in
[src/utils/mockCaseDataLENS202600150.ts](src/utils/mockCaseDataLENS202600150.ts).

## User-confirmed decisions

- **Country on Request Type card**: for eEvidence cases, the existing Country
  field surfaces the **Issuing Authority country**. The Validating Authority
  has its own country shown inside the **Authorization Details → Validating
  Authority** subsection.
- **Approval Role enum** (IA + VA): `"JudgeCourtOrInvestigatingJudge"` |
  `"PublicProsecutor"`. Issuing Authority *additionally* supports
  `"OtherCompetentAuthority"`. Validating Authority does NOT support that
  third value (a validator is, by definition, a judge or prosecutor).
- **Approval Reference Number is now multi-value** (array). The existing flat
  `approvalReferenceNumber: string` stays; we add the array alongside.
- **Per-authority approver block** (IA + VA): each authority carries its own
  approver name + address + fax (with country and area/city codes) +
  languages. The existing top-level `approverName` / `approverRole` /
  `approverEmail` / `approverPhoneNumber` fields are kept for back-compat
  but become derived views over the IA approver on eEvidence cases.
- **Central Authority** (optional): an additional contact block for the
  Member State's central authority *when it differs from the IA*. Same shape
  as the IA contact block. Hidden when not provided.
- **Enforcing Authority** has its own simpler contact block — Name, Address,
  Tel, Fax, Email — no approver/role.

## Approach

### 1. Type extensions — [src/types/caseTypes.ts](src/types/caseTypes.ts)

Add three new interfaces, then attach them to `FormData`. All eEvidence-only;
on non-eEvidence cases the fields remain `undefined`.

```ts
/** EU eEvidence — Approval Role enum for IA + VA. */
export type EEvidenceApprovalRole =
  | "JudgeCourtOrInvestigatingJudge"
  | "PublicProsecutor"
  /** Issuing Authority only — never applies to a Validating Authority. */
  | "OtherCompetentAuthority";

/** Per-case approver block shared by Issuing + Validating Authority.
 *  Each authority captures its own approver — the regulator + the validator
 *  are typically different officials, sometimes in different jurisdictions. */
export interface EEvidenceAuthorityApprover {
  name: string;
  /** Where the approver is reached — typically a court / prosecutor's
   *  office street address. Multi-line; \n preserved in rendering. */
  address?: string;
  /** Phone as a single canonical string, e.g. "+49 69 1367-2424". Parsed
   *  into { countryCode, areaCode, number } only at render time (e.g. when
   *  populating the EPOC PDF's country/area/number columns). See
   *  `parsePhoneParts()` in formEngine.ts. */
  tel?: string;
  /** Fax as a single canonical string. Same shape + parser as `tel`. */
  fax?: string;
  email?: string;
  /** Free-form languages list, e.g. "de - German, en - English". */
  languagesSpoken?: string;
}

/** Issuing Authority block — issuer of the EPOC. */
export interface EEvidenceIssuingAuthority {
  /** Issuing-authority identifier number from the eEvidence envelope. */
  idNumber?: string;
  /** Canonical name (free text — distinct from the Agency registry name). */
  name: string;
  /** "Court" | "Prosecutor's Office" | "Police" | ... (free string for
   *  prototype; constrained to enum if/when downstream consumers need it). */
  issuingAuthorityRole?: string;
  /** Country the Issuing Authority sits in. */
  country: CaseCountry;
  approvalRole: EEvidenceApprovalRole;
  /** One or more reference numbers — the EPOC can carry multiple. */
  approvalReferenceNumbers: string[];
  approver?: EEvidenceAuthorityApprover;
  /** Optional Central Authority contact block, used when the Member State
   *  routes through a Central Authority distinct from the IA itself. Same
   *  shape as the approver block so the UI can render with one component. */
  centralAuthorityContact?: EEvidenceAuthorityApprover;
}

/** Validating Authority block — present when IA is "OtherCompetentAuthority"
 *  and an external Judge / Prosecutor validated the order. */
export interface EEvidenceValidatingAuthority {
  idNumber?: string;
  /** VA can be in a different country from the IA (e.g. IA = regional
   *  police, VA = federal court). */
  country: CaseCountry;
  approvalRole: Exclude<EEvidenceApprovalRole, "OtherCompetentAuthority">;
  approvalReferenceNumbers: string[];
  approver?: EEvidenceAuthorityApprover;
}

/** Enforcing Authority — Member State agency that transmits / enforces the
 *  order. Lighter shape than IA/VA: contact info only, no approver, no
 *  languages (per Reg. 2023/1543 Annex schema). */
export interface EEvidenceEnforcingAuthority {
  name: string;
  address?: string;
  tel?: string;   // canonical single string, same convention as approver tel
  fax?: string;
  email?: string;
}

// Extend FormData:
interface FormData {
  // ...
  /** eEvidence-only. When `requestType === "eEvidence"`, populated from the
   *  Decentralised IT System submission envelope. Drives the new
   *  Authorization Details subsections + the Request Type card's Country. */
  eevidenceIssuingAuthority?: EEvidenceIssuingAuthority;
  eevidenceValidatingAuthority?: EEvidenceValidatingAuthority;
  eevidenceEnforcingAuthority?: EEvidenceEnforcingAuthority;
}
```

**Note**: keeping these as a separate `eevidence*` namespace avoids polluting
`legalContext` (which is generic across regions) and makes the eEvidence-only
nature obvious to readers. We can fold them back into `legalContext` later
if other regions need similar role-specific blocks.

### 2. Request Type card — surface IA Country when eEvidence

[src/components/DataEntryForm.tsx:2766-2810](src/components/DataEntryForm.tsx#L2766)

When `requestType === "eEvidence"` AND `eevidenceIssuingAuthority?.country` is
set, the **Country** field reads from `eevidenceIssuingAuthority.country.countryName`
and labels itself as **"Issuing Authority Country"**. For non-eEvidence
cases the existing behavior (free `formData.country` selection) is unchanged.

```jsx
<Label>
  {formData.requestType === "eEvidence"
    ? "Issuing Authority Country"
    : "Country"}{" "}
  <span className="text-[#d13438]">*</span>
</Label>
```

Selection updates *both* `formData.country` (back-compat) AND
`formData.eevidenceIssuingAuthority.country` on eEvidence cases. The VA's
country is *not* shown here — it surfaces in the VA subsection only.

### 3. Authorization Details — 3 new subsections — [src/components/tabs/SenderAuthorityTab.tsx:710](src/components/tabs/SenderAuthorityTab.tsx#L710)

The existing **Authorization Details** card stays. Below the current
**Approval Details** subsection, gate three new subsections on
`formData.requestType === "eEvidence"`:

```
┌─ Authorization Details ───────────────────────────────────────┐
│  (existing: Desired Status, Start, Expiration)               │
│  (existing: Approval Details — Show more / Show less)        │
│                                                                │
│  ── only when requestType === "eEvidence" ──                  │
│                                                                │
│  ▼ Issuing Authority                                          │
│      ID Number ........... [IA-DE-FFM-001]                    │
│      Name ................ Public Prosecutor's Office …       │
│      Issuing Authority Role  Prosecutor's Office              │
│      Country ............. Germany                            │
│      Approval Role ....... Public Prosecutor                  │
│      Approval Reference #(s)  EPOC-DE-FFM-2026-0150 [+]       │
│      ─ Approver ──────────                                    │
│        Name, Address, Tel, Fax, Email, Languages Spoken       │
│      ─ Central Authority Contact (optional, when different) ─ │
│        Name, Address, Tel, Fax, Email                         │
│                                                                │
│  ▼ Validating Authority (when IA role = OtherCompetentAuth)   │
│      ID Number                                                 │
│      Country ............. (own value — may differ from IA)   │
│      Approval Role ....... Judge / Court / Investigating J.   │
│      Approval Reference #(s)                                  │
│      ─ Approver ──────────                                    │
│        same shape as IA approver                              │
│                                                                │
│  ▼ Enforcing Authority                                        │
│      Name                                                      │
│      Address                                                   │
│      Tel No (Country / Area Code / Number)                    │
│      Fax No (Country / Area Code / Number)                    │
│      Email                                                     │
└────────────────────────────────────────────────────────────────┘
```

Implementation pattern: each subsection is a small subcomponent
(`IssuingAuthorityDetails`, `ValidatingAuthorityDetails`,
`EnforcingAuthorityDetails`) inside `SenderAuthorityTab.tsx`. Each receives
its slice of `formData` and an `onChange` callback. They render as collapsible
sub-cards consistent with the existing **Approval Details** styling.

**VA visibility rule:** the Validating Authority block is shown when
`eevidenceIssuingAuthority?.approvalRole === "OtherCompetentAuthority"`. When
the IA is a Judge or Prosecutor, validation is implicit and the VA block
stays hidden (matching the regulation).

**Approval Reference Numbers — multi-value input:** a Fluent `Input` with a
"+ Add" button next to it. Existing numbers render as removable chips above
the input. Mirrors the pattern used for the EPOC Form 3 multi-checkbox where
each chip can be deleted independently.

### 4. Mock data — [src/utils/mockCaseDataLENS202600150.ts](src/utils/mockCaseDataLENS202600150.ts)

Populate the three new blocks on the EU eEvidence mock so the demo shows
real values immediately:

```ts
eevidenceIssuingAuthority: {
  idNumber: "IA-DE-FFM-001",
  name: "Public Prosecutor's Office of Frankfurt am Main",
  issuingAuthorityRole: "Prosecutor's Office (Staatsanwaltschaft)",
  country: germany,
  approvalRole: "PublicProsecutor",
  approvalReferenceNumbers: ["EPOC-DE-FFM-2026-0150", "STA-FFM-2026-CY-0150"],
  approver: {
    name: "Oberstaatsanwältin Anja Becker",
    address: "Konrad-Adenauer-Str. 20\n60313 Frankfurt am Main\nGermany",
    tel: "+49 69 1367-2424",
    fax: "+49 69 1367-2999",
    email: "a.becker@sta-frankfurt.justiz.hessen.de",
    languagesSpoken: "de - German, en - English",
  },
  // Central authority contact omitted — IA is itself the contact for this case.
},

// VA omitted — IA is a PublicProsecutor, no separate validator needed.

eevidenceEnforcingAuthority: {
  name: "Bundesamt für Justiz (Federal Office of Justice)",
  address: "Adenauerallee 99-103\n53113 Bonn\nGermany",
  tel: "+49 228 99-410-40",
  fax: "+49 228 99-410-5050",
  email: "eevidence@bfj.bund.de",
},
```

A second mock case **LENS-2026-00180** (new builder) should exercise the
**Other Competent Authority → Validating Authority** path so the conditional
VA block has somewhere to render. Suggest: a Spanish case where a regional
police body issues the EPOC and an Investigating Judge validates it.

### 5. Cascading effects — EPOC Form 3 autofill

The EPOC Form 3 template
([src/config/formTemplates.ts](src/config/formTemplates.ts)) reads from the
existing `defaultValueFrom` paths. With the new fields available, the
autofill paths should migrate to the eEvidence blocks so the form is correct:

| Field | Current path | Migrated path |
|---|---|---|
| `B_issuingAuthority` | `legalContext.primaryIssuingAuthority.name` | `eevidenceIssuingAuthority.name` |
| `B_issuingFileNumber` | `caseNumber` | `eevidenceIssuingAuthority.approvalReferenceNumbers[0]` |
| `B_validatingAuthority` | (none) | `eevidenceValidatingAuthority` ? "(name)" : "" |
| `B_validatingFileNumber` | (none) | `eevidenceValidatingAuthority.approvalReferenceNumbers[0]` |
| `B_enforcingAuthority` | `legalContext.primaryEnforcingAuthority.name` | `eevidenceEnforcingAuthority.name` |
| (Section H email/fax/tel/address) | currently hard-coded to `__msLegalRep`; unchanged | unchanged — Section H is the **Microsoft** designated establishment, not the Authority |

The `resolveAutofill` helper already handles nested dot-paths; no engine
changes needed beyond updating the template `defaultValueFrom` strings.

### 6. Nature of Crime — merge ETSI `AuthorisationTypeOfCase` values

ETSI TS 103 120 defines an `AuthorisationTypeOfCase` dictionary that the
Issuing Authority sends in the eEvidence envelope. Rather than introduce a
separate eEvidence-only field, we **merge** these classifications into the
existing **Nature of Crime** multi-select on the Request Type card and tag
each ETSI-sourced option with a small **"eEvidence"** badge in the picker.

**Constants** — [src/constants/caseConstants.ts:60](src/constants/caseConstants.ts#L60)

The flat `NATURE_OF_CRIMES: string[]` becomes a structured list keyed by
`value` (the ETSI camelCase enum), with `label` (friendly English) and
`source` (`"eEvidence"` when the entry comes from the ETSI dictionary):

```ts
export interface NatureOfCrimeOption {
  /** Canonical storage value. Existing entries keep their current string
   *  (e.g. "Cybercrime"); ETSI additions use the ETSI camelCase key
   *  (e.g. "ChildExploitationOrChildSexualAbuse"). */
  value: string;
  /** Display label shown in the picker + chips. */
  label: string;
  /** When set, the picker renders a small badge next to the label so the
   *  TS / RS knows the value maps to the ETSI eEvidence dictionary. */
  source?: "eEvidence";
}

export const NATURE_OF_CRIMES: NatureOfCrimeOption[] = [
  // ── ETSI AuthorisationTypeOfCase dictionary (eEvidence) ─────────────
  // These values are canonical for the prototype: the four ETSI keys that
  // overlap with prior generic entries (Cybercrime, HumanTrafficking,
  // MoneyLaundering, Theft) REPLACE the generic versions — one row each,
  // badged. Storage uses the ETSI camelCase key.
  { value: "ChildExploitationOrChildSexualAbuse", label: "Child Exploitation or Child Sexual Abuse", source: "eEvidence" },
  { value: "Corruption", label: "Corruption", source: "eEvidence" },
  { value: "Cybercrime", label: "Cybercrime", source: "eEvidence" },
  { value: "Defamation", label: "Defamation", source: "eEvidence" },
  { value: "DrugsOrDrugTrafficking", label: "Drugs or Drug Trafficking", source: "eEvidence" },
  { value: "HarassmentOrThreatToPersonalSafety", label: "Harassment or Threat to Personal Safety", source: "eEvidence" },
  { value: "HateSpeech", label: "Hate Speech", source: "eEvidence" },
  { value: "HumanTrafficking", label: "Human Trafficking", source: "eEvidence" },
  { value: "MissingPerson", label: "Missing Person", source: "eEvidence" },
  { value: "MoneyLaundering", label: "Money Laundering", source: "eEvidence" },
  { value: "OtherFinancialCrimeOrFraud", label: "Other Financial Crime or Fraud", source: "eEvidence" },
  { value: "SexualAbuseOrExploitation", label: "Sexual Abuse or Exploitation", source: "eEvidence" },
  { value: "Theft", label: "Theft", source: "eEvidence" },
  { value: "TerrorismOrThreatToPublicSafety", label: "Terrorism or Threat to Public Safety", source: "eEvidence" },
  { value: "ViolenceOrCrimeAgainstAPerson", label: "Violence or Crime Against a Person", source: "eEvidence" },
  { value: "Other", label: "Other", source: "eEvidence" },
  { value: "NotSpecified", label: "Not Specified", source: "eEvidence" },

  // ── Generic Nature of Crime values kept for non-eEvidence cases ─────
  // These have no ETSI equivalent (or carry semantics narrower / broader
  // than any ETSI entry). Picker shows them without a badge.
  { value: "Terrorism", label: "Terrorism" }, // narrower than ETSI's TerrorismOrThreatToPublicSafety
  { value: "Child Exploitation", label: "Child Exploitation" },
  { value: "Child Sexual Abuse Material (CSAM)", label: "Child Sexual Abuse Material (CSAM)" },
  { value: "Drug Trafficking", label: "Drug Trafficking" }, // narrower than ETSI's DrugsOrDrugTrafficking
  { value: "Weapons Trafficking", label: "Weapons Trafficking" },
  { value: "Organized Crime", label: "Organized Crime" },
  { value: "Fraud", label: "Fraud" },
  { value: "Identity Theft", label: "Identity Theft" },
  { value: "Extortion", label: "Extortion" },
  { value: "Kidnapping", label: "Kidnapping" },
  { value: "Murder/Homicide", label: "Murder/Homicide" },
  { value: "Assault", label: "Assault" },
  { value: "Robbery", label: "Robbery" },
  { value: "Burglary", label: "Burglary" },
  { value: "Sexual Assault", label: "Sexual Assault" },
  { value: "Stalking/Harassment", label: "Stalking/Harassment" },
];
```

**Migration for existing mocks.** Four mock cases currently store
`natureOfCrimes` values that are now ETSI-keyed:

| Existing string | New ETSI value |
|---|---|
| `"Cybercrime"` | `"Cybercrime"` (no change — string matches) |
| `"Human Trafficking"` | `"HumanTrafficking"` |
| `"Money Laundering"` | `"MoneyLaundering"` |
| `"Theft"` | `"Theft"` (no change — string matches) |

Add a one-shot rename pass in the existing mock builders (or a `migrate()`
helper called from `App.tsx` when loading the case). The same map can also
back-fill any old persisted draft data in localStorage if the prototype ever
grows persistence.

**FormData** — already `natureOfCrimes: string[]`. No type change needed;
just store the `value` of each picked option. The legacy entries
("Cybercrime", "Theft", etc.) keep their existing string values to preserve
back-compat with mocks already in the queue.

**"Other" → requires a description.** Per the Reg. 2023/1543 Annex schema,
selecting **"Other"** must be accompanied by a free-text rationale. Add an
eEvidence-only field on `FormData`:

```ts
/** Free-text rationale required when `natureOfCrimes` includes the ETSI
 *  "Other" value on an eEvidence case. Renders inline below the chip
 *  picker when applicable. */
eevidenceAuthorisationTypeOfCaseOtherDescription?: string;
```

The Request Type card renders this Textarea inline below the chip picker
when `formData.requestType === "eEvidence"` AND the picked values contain
`"Other"`. Save is gated on the description being non-empty in that case
(same validation pattern used by the "Other" Request Type today).

**Picker rendering** — [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx)
(the multi-select / Popover + Command list for Nature of Crime). Wherever the
picker currently maps `NATURE_OF_CRIMES` to `<CommandItem>`, change the
mapping to render the label + an optional small badge:

```jsx
<CommandItem key={opt.value} value={opt.value} onSelect={…}>
  <Check className={cn("mr-2 h-4 w-4", picked ? "opacity-100" : "opacity-0")} />
  <span>{opt.label}</span>
  {opt.source === "eEvidence" && (
    <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0">
      eEvidence
    </Badge>
  )}
</CommandItem>
```

Selected chips render the friendly label (plus the eEvidence badge inline
when applicable) so the case header / collapsed summary stays readable.

**Mock** — populate `LENS-2026-00150.natureOfCrimes` with two ETSI values to
demo the badge:
`["MoneyLaundering", "OtherFinancialCrimeOrFraud"]`.

### 7. "Enterprise Request" card — UnderlyingConditions decision flow (eEvidence-only)

**ETSI source:** Table 5.3.3-11 (UnderlyingConditions) + Table 5.3.3-12
(EPOCUnderlyingCondition DictionaryEntries). The Issuing Authority captures
*why* the production order is being addressed to the processor (Microsoft)
versus the data controller (the enterprise customer), and whether Microsoft
must / must not inform the controller after disclosure. The card surfaces
the IA's path through that decision tree.

Rendered as a new collapsible Fluent `Card` inside the existing Request Type
accordion section, **after the Nature of Crime field**, gated on
`requestType === "eEvidence"`. Header: **"Enterprise Request"**, sub-line
"ETSI UnderlyingConditions — addressed-to flow + Microsoft notification
obligation."

#### Decision tree

```
            ┌─────────────────────────────────────────┐
            │ AddressedToController?                  │
            │   (Order addressed to the controller?)  │
            └────────────────┬────────────────────────┘
                             │
                ┌────────────┴──────────────┐
                ▼                           ▼
               No                          Yes
               │                            │
               │                            ▼
               │   ┌───────────────────────────────────────────────────────┐
               │   │ Why also addressed to the processor (Microsoft)?      │
               │   │   AddressedToProcessor·ControllerUnidentified?  Y/N   │
               │   │   AddressedToProcessor·DetrimentalToInvestigation? Y/N│
               │   └────────────────┬──────────────────────────────────────┘
               │                    │
               │     ┌──────────────┴───────────────┐
               │     ▼                              ▼
               │   Both = No                     Either = Yes
               │     │                              │
               │     │ (stop — IA chose             ▼
               │     │  controller route only)   ┌────────────────────────────┐
               │     │                           │ Notification obligation:   │
               │     │                           │   ProcessorShallInform·    │
               │     │                           │     Controller?     Y/N    │
               │     │                           │   ProcessorShallNot·       │
               │     │                           │     InformController? Y/N  │
               │     │                           └────────────┬───────────────┘
               │     │                                        │
               │     │                          ┌─────────────┴────────────┐
               │     │                          ▼                          ▼
               │     │                       Both = No                 Either = Yes
               │     │                          │                          │
               │     │                          │ (stop — no obligation    ▼
               │     │                          │  captured)        ┌────────────────────┐
               │     │                          │                   │ Required:          │
               │     │                          │                   │   Justification    │
               │     │                          │                   │   Relevant Info    │
               │     │                          │                   └────────────────────┘
               ▼     ▼                          ▼
              (card collapsed to summary chip in all "stop" branches)
```

#### Data model — [src/types/caseTypes.ts](src/types/caseTypes.ts)

```ts
/** eEvidence Enterprise Request — captures the IA's path through the ETSI
 *  UnderlyingConditions dictionary (Table 5.3.3-11/12). All fields are
 *  optional / undefined until the IA's response cascades down the tree;
 *  validation rules below gate "required" status based on the path. */
export interface EEvidenceEnterpriseRequest {
  /** Is the order addressed to the data controller? */
  addressedToController?: boolean;

  // ── Visible only when addressedToController === true ────────────────
  /** Reason 1 to also address the processor: the controller cannot be
   *  identified from the available information. */
  addressedToProcessorControllerUnidentified?: boolean;
  /** Reason 2 to also address the processor: contacting the controller
   *  would be detrimental to the investigation. */
  addressedToProcessorDetrimentalToInvestigation?: boolean;

  // ── Visible only when either of the two above === true ──────────────
  /** Microsoft (as processor) shall inform the controller after disclosure. */
  processorShallInformController?: boolean;
  /** Microsoft shall NOT inform the controller after disclosure.
   *  (Treated as mutually exclusive with the above in practice; the data
   *  model keeps them independent because the ETSI dictionary defines them
   *  as two separate flags.) */
  processorShallNotInformController?: boolean;

  // ── Visible only when either notification flag === true ─────────────
  /** Short rationale for the IA's notification choice. Required when the
   *  notification leg is reached. Maps to the EPOC envelope's short
   *  justification field. */
  justification?: string;
  /** Additional relevant information — maps to ETSI's
   *  `AdditionalUnderlyingConditionsInformation` (Table 5.3.3-11 row 3).
   *  Required when the notification leg is reached. */
  relevantInformation?: string;
}

// Extend FormData:
interface FormData {
  // ...
  /** eEvidence-only. Captures the IA's UnderlyingConditions path. Stays
   *  undefined for non-eEvidence cases. */
  eevidenceEnterpriseRequest?: EEvidenceEnterpriseRequest;
}
```

#### UI rendering — [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx)

Each boolean renders as a Fluent `RadioGroup` (Yes / No) inline with its
label. Helper text under each radio group explains the legal context in
one sentence. Render only the next layer of fields when the gating
condition is met (true progressive disclosure — `null` rather than disabled
controls — so the card stays scannable).

```
┌─ Enterprise Request ──────────────────────────────────────────┐
│ ETSI UnderlyingConditions — addressed-to flow + MS            │
│ notification obligation                                       │
│                                                                │
│ Is the order addressed to the data controller?  ( ) Yes ( ) No│
│   Helper: "The controller is the enterprise customer that     │
│   contracted with Microsoft for the affected service."        │
│                                                                │
│ ── only when AddressedToController = Yes ─────────────────    │
│                                                                │
│ Why is the order also addressed to Microsoft (the processor)? │
│                                                                │
│   Controller cannot be identified                ( ) Yes ( ) No│
│   Helper: "IA was unable to identify the controlling          │
│   organisation from the available information."               │
│                                                                │
│   Contacting the controller would be detrimental ( ) Yes ( ) No│
│   to the investigation                                        │
│   Helper: "Notifying the controller would compromise the      │
│   investigation (e.g., risk of evidence destruction)."        │
│                                                                │
│ ── only when either above = Yes ──────────────────────────    │
│                                                                │
│ Microsoft's notification obligation:                          │
│                                                                │
│   Microsoft shall inform the controller          ( ) Yes ( ) No│
│   Microsoft shall NOT inform the controller      ( ) Yes ( ) No│
│   Helper: "Pick one. The two flags are mutually exclusive in  │
│   practice."                                                  │
│                                                                │
│ ── only when either notification flag = Yes ──────────────    │
│                                                                │
│ Please provide a short justification: *                       │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ [Textarea, required]                                      │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                                │
│ Relevant Information: *                                       │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ [Textarea, required]                                      │ │
│ └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

#### Validation rules

| Condition | Gated field becomes required |
|---|---|
| `addressedToController === true` | At least one of `addressedToProcessorControllerUnidentified` / `addressedToProcessorDetrimentalToInvestigation` must be explicitly answered (Yes or No, not undefined). |
| Either AddressedToProcessor flag === true | At least one of `processorShallInformController` / `processorShallNotInformController` must be explicitly answered. |
| Either notification flag === true | `justification` AND `relevantInformation` both required, non-empty. |

Validation surfaces on the existing form-level error map (same `errors` state
shared by Request Type / Request Sub-Type errors). A `formData.requestType
=== "eEvidence"` check gates whether this validator runs at all.

#### Collapsed-card summary

When the Enterprise Request card is collapsed, render a single-line chip
summarising the IA's path so the RS can read it without expanding:

- *no addressedToController set* → `[Enterprise Request: not provided]`
- `addressedToController = false` → `[Enterprise Request: Controller route]`
- `addressedToController = true`, both processor flags false → `[Enterprise Request: Controller addressed, no processor route]`
- processor route + ShallInform = true → `[Enterprise Request: Processor route, MS shall inform controller]`
- processor route + ShallNotInform = true → `[Enterprise Request: Processor route, MS shall NOT inform controller]`

#### Mock data — [src/utils/mockCaseDataLENS202600150.ts](src/utils/mockCaseDataLENS202600150.ts)

```ts
eevidenceEnterpriseRequest: {
  addressedToController: true,
  addressedToProcessorControllerUnidentified: false,
  addressedToProcessorDetrimentalToInvestigation: true,
  processorShallInformController: false,
  processorShallNotInformController: true,
  justification:
    "Notifying the enterprise customer (controller) at this stage would " +
    "alert the subject employee — under active financial fraud investigation " +
    "— and risk destruction of business records held in the Microsoft 365 " +
    "tenant.",
  relevantInformation:
    "Order issued under §100a StPO. Investigating prosecutor has obtained " +
    "a judicial preservation hold (LENS-2025-00280) on the same Microsoft " +
    "account; the present EPOC requests production of the preserved data. " +
    "Controller notification is suspended pending charges, expected Q3 2026.",
},
```

This drives the demo down the deepest branch of the decision tree, showing
all four cascading sections expanded with realistic German-jurisdiction
prose.

#### Decision/state diagram (text form)

```
  state CardClosed { }
  state AddressedToController_None { }
  state AddressedToController_Yes_Q2 { }     // shows Q2 row
  state AddressedToProcessor_Either_Q3 { }   // shows Q3 row
  state ProcessorObligation_Either_Q4 { }    // shows Q4 row (text inputs)

  Initial            --> CardClosed
  CardClosed         --> AddressedToController_None : (RS expands card)
  AddressedToController_None
                     --> CollapsedSummary("Controller route") : selects No
                     --> AddressedToController_Yes_Q2 : selects Yes
  AddressedToController_Yes_Q2
                     --> CollapsedSummary("Yes, no processor route") : both Q2 = No
                     --> AddressedToProcessor_Either_Q3 : either Q2 = Yes
  AddressedToProcessor_Either_Q3
                     --> CollapsedSummary("Processor route, no MS obligation") : both Q3 = No
                     --> ProcessorObligation_Either_Q4 : either Q3 = Yes
  ProcessorObligation_Either_Q4
                     --> [validation requires justification + relevantInformation]
                     --> CollapsedSummary("Processor route, MS shall (not) inform controller")
```

### 8. Case Identification card — "Related Case(s)" summary block (eEvidence-only)

[src/components/DataEntryForm.tsx:2385-2488](src/components/DataEntryForm.tsx#L2385-L2488)

Today the Case Identification card has a flat free-text **Related DARS Cases**
input (`relatedCaseNumbers: string`, comma-separated). For eEvidence cases the
Issuing Authority can reference one or more existing DARS cases, and the RS
needs to see the *details* of those cases without leaving the form. Add a
structured **Related Case(s)** block that renders below the existing inputs
on the Case Identification card, gated on `requestType === "eEvidence"`.

**Data shape** — [src/types/caseTypes.ts](src/types/caseTypes.ts)

```ts
/** Summary of an existing DARS case the Issuing Authority cross-referenced
 *  in the eEvidence envelope. Read-only in the form — populated either from
 *  the envelope itself or, in the prototype, from a mock fetch keyed by the
 *  DARS case number. */
export interface EEvidenceRelatedCase {
  /** Canonical DARS / LENS case number (e.g. "LENS-2025-00280"). */
  darsCaseNumber: string;
  /** Echoes the related case's request type — expected to be "eEvidence",
   *  shown so the RS can confirm at a glance. */
  requestType: string;
  /** eEvidence subtype on the related case. */
  requestSubType?: "None" | "EPOC-PR";
  /** Issuing Authority's display name on the related case. */
  issuingAuthorityName: string;
  /** One or more IA reference numbers — multiple is allowed because the EPOC
   *  envelope itself can carry multiple reference numbers per case. */
  issuingAuthorityReferenceNumbers: string[];
  /** When the related case was transmitted to Microsoft. ISO-8601 string;
   *  same semantic + shape as `FormData.dateOfTransmission` on the current
   *  case. Datetime when the source carries time ("2025-11-15T10:42:00"),
   *  date-only when it doesn't ("2025-11-15"). Render-side decides format. */
  dateOfTransmission?: string;
  /** Service provider responsible for fulfilling the related case
   *  (e.g. "Microsoft Ireland Operations Limited"). */
  serviceProviderName?: string;
  /** Free-text rationale or context provided by the IA. */
  additionalInformation?: string;

  // ── EPOC-PR-only fields ───────────────────────────────────────────────
  // The four fields below are populated AND rendered only when
  // `requestSubType === "EPOC-PR"`. For an EPOC (non-PR) related case they
  // remain undefined and the summary card hides the corresponding rows.
  /** When the preservation order's preserved-data window ends (i.e. when
   *  the order lapses unless renewed). ISO-8601 date. */
  preservationEndDate?: string;
  /** Scheduled date for destruction of the preserved data — typically
   *  preservation end + a regulatory retention window. ISO-8601 date. */
  dataDestructionDate?: string;
  /** Case stage of the related case (free string, same convention as
   *  `FormData.caseStage` — "Resolved" | "In Progress" | "No Data Provided"
   *  | etc.). */
  requestStatus?: string;
  /** Resolution reason when the related case is closed. Uses the same
   *  `ResolutionReason` enum the live case form uses (so labels render via
   *  `RESOLUTION_REASON_META`). Undefined while the case is still open. */
  resolutionReason?: ResolutionReason;
}

// Extend FormData:
interface FormData {
  // ...
  /** eEvidence-only. Read-only summary blocks the IA cross-referenced.
   *  Rendered below the Case Identification card's existing inputs. */
  eevidenceRelatedCases?: EEvidenceRelatedCase[];
}
```

**Rendering** — below the existing "Related DARS Cases" text input, add an
inline header **"Related Case(s)"** and a stacked column of summary cards,
one per `eevidenceRelatedCases[]` entry:

```
┌─ Related Case(s) ─────────────────────────────────────────────┐
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ LENS-2025-00280  [eEvidence]  [Subtype: EPOC-PR]          │ │
│ │ ─────────────────────────────────────────────────         │ │
│ │ Issuing Authority   Public Prosecutor's Office of …       │ │
│ │ Reference #(s)      EPOC-DE-FFM-2025-0280                 │ │
│ │                     STA-FFM-2025-CY-0280                  │ │
│ │ Transmitted         15 Nov 2025, 10:42 CET                │ │
│ │ Service Provider    Microsoft Ireland Operations Ltd.     │ │
│ │ ── EPOC-PR ──────────────────────────────────────         │ │
│ │ Preservation End    15 May 2026                           │ │
│ │ Data Destruction    15 Aug 2026                           │ │
│ │ Request Status      Resolved                              │ │
│ │ Resolution Reason   Preserved                             │ │
│ │ ─────────────────────────────────────────────────         │ │
│ │ Any other relevant information:                           │ │
│ │ "Continuation case — preservation order placed first …"   │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ LENS-2025-00295  [eEvidence]  [Subtype: None]             │ │
│ │ (EPOC-PR rows hidden — subtype is None)                   │ │
│ │ … (same layout, EPOC-PR-only rows hidden)                 │ │
│ └───────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

Implementation pattern: a small subcomponent `RelatedCaseSummaryCard`
(inside `DataEntryForm.tsx`, or extracted to
`src/components/case-related/RelatedCaseSummaryCard.tsx` if it grows) that
takes a single `EEvidenceRelatedCase` and renders the layout above. The
parent maps `formData.eevidenceRelatedCases?.map(c => <RelatedCaseSummaryCard
key={c.darsCaseNumber} data={c} />)`.

**Visual treatment**: each summary card is a Fluent `Card` with neutral
background, a header row containing the case number + small inline chips
for request type + subtype, a definition-list body for the metadata pairs,
and a separator above the "Any other relevant information" footer. Multiple
reference numbers render as a stacked list (one per line) since reference
strings are long enough that wrapping chips would look noisy. Read-only —
no edit affordance in this iteration.

**EPOC-PR sub-block**: when `requestSubType === "EPOC-PR"` on a related
case, the card grows a small "EPOC-PR" sub-section between the
Service Provider row and the "Any other relevant information" footer. The
four EPOC-PR-only rows render in the same definition-list style:
**Preservation End** (date), **Data Destruction** (date),
**Request Status** (string), **Resolution Reason** (formatted via
`RESOLUTION_REASON_META[reason].label` for friendliness). For non-PR
related cases (subtype = "None"), this sub-section is hidden entirely.

**Empty state**: when `requestType === "eEvidence"` AND
`eevidenceRelatedCases` is empty / undefined, render a single muted line
under the "Related Case(s)" header — e.g. *"No related cases referenced in
the eEvidence envelope."* — so the section header still anchors visually but
doesn't add visual weight.

**Non-eEvidence regression**: the existing flat `relatedCaseNumbers` text
input stays on the Case Identification card for all request types. The new
"Related Case(s)" block is *additional* on eEvidence cases — it never
replaces the flat field, so non-eEvidence cases see exactly today's UI.

**Mock data** — populate on `LENS-2026-00150`:

```ts
eevidenceRelatedCases: [
  {
    darsCaseNumber: "LENS-2025-00280",
    requestType: "eEvidence",
    requestSubType: "EPOC-PR",
    issuingAuthorityName: "Public Prosecutor's Office of Frankfurt am Main",
    issuingAuthorityReferenceNumbers: [
      "EPOC-PR-DE-FFM-2025-0280",
      "STA-FFM-2025-CY-0280",
    ],
    dateOfTransmission: "2025-11-15T10:42:00",
    serviceProviderName: "Microsoft Ireland Operations Limited",
    additionalInformation:
      "Continuation case — preservation order placed first against the same " +
      "subject Microsoft account in November 2025. This EPOC requests " +
      "production of the data preserved under that earlier order.",
    // EPOC-PR-only metadata about the prior preservation order:
    preservationEndDate: "2026-05-15",
    dataDestructionDate: "2026-08-15",
    requestStatus: "Resolved",
    resolutionReason: "Preserved",
  },
],
```

Adding two related cases on a second mock case would also demo the
multi-card stacking pattern; defer until a clear need.

### 9. ReadOnlyReviewForm + collapsed summary surfaces

[src/components/ReadOnlyReviewForm.tsx:291](src/components/ReadOnlyReviewForm.tsx#L291)
renders an "Authorization Details" mirror used at signing / review time.
Add a `data-section="eevidence-authorities"` block there that prints the
same three subsections in read-only mode. The collapsed-section summary on
the parent accordion should show e.g. `"IA · VA · EA"` chip when all three
blocks are populated.

## Files modified

1. [src/types/caseTypes.ts](src/types/caseTypes.ts) — new types + `FormData` extension (IA/VA/EA blocks, `eevidenceAuthorisationTypeOfCaseOtherDescription`, `EEvidenceEnterpriseRequest`, `EEvidenceRelatedCase[]`).
2. [src/constants/caseConstants.ts](src/constants/caseConstants.ts) — `NATURE_OF_CRIMES` reshape from `string[]` to `NatureOfCrimeOption[]` with ETSI entries appended.
3. [src/components/tabs/SenderAuthorityTab.tsx](src/components/tabs/SenderAuthorityTab.tsx) — 3 new IA/VA/EA subsections + small subcomponents.
4. [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx) — Country field re-labelling + dual-write on eEvidence; Nature of Crime picker rendering update (badge + new option shape); "Other" description Textarea gating; **Enterprise Request card with the progressive-disclosure UnderlyingConditions flow**; **Related Case(s) summary block on the Case Identification card**; pre-fill IA block when the user picks "eEvidence" from scratch.
5. **New file (optional)** `src/components/enterprise-request/EnterpriseRequestCard.tsx` — extracted if the inline implementation grows beyond ~150 lines (the progressive-disclosure radios + helper text + validation hooks); otherwise stays inline in `DataEntryForm.tsx`.
6. **New file** `src/components/case-related/RelatedCaseSummaryCard.tsx` — small read-only summary card subcomponent (only extracted if it grows beyond ~100 lines; otherwise inline in DataEntryForm).
7. [src/components/ReadOnlyReviewForm.tsx](src/components/ReadOnlyReviewForm.tsx) — read-only mirror (IA/VA/EA blocks + Enterprise Request decision path + Related Case(s) summary).
8. [src/utils/mockCaseDataLENS202600150.ts](src/utils/mockCaseDataLENS202600150.ts) — populate IA + EA blocks (no VA); update `natureOfCrimes` to use 2 ETSI values to demo the badge; populate `eevidenceEnterpriseRequest` along the deepest tree branch (so the demo shows justification + relevantInformation); populate `eevidenceRelatedCases` with one entry referencing LENS-2025-00280 (preservation continuation case).
9. **New file** `src/utils/mockCaseDataLENS202600180.ts` — Spanish "Other Competent Authority" case that exercises the VA path. New entry in `MOCK_CASES` + routing in `App.tsx`.
10. [src/config/formTemplates.ts](src/config/formTemplates.ts) — migrate `defaultValueFrom` paths on EPOC Form 3 to the new structured fields.

## Verification

1. `npm run dev` → open `LENS-2026-00150`.
2. **Request Type card** — Country label reads "Issuing Authority Country", value reads "Germany". Switch the case to a non-eEvidence one (LENS-2026-00170 UK COPO) and the label/value revert to "Country".
3. **Authorization Details** — three new collapsible subsections render below Approval Details, each populated. No VA subsection (IA is a Public Prosecutor).
4. **Multi-value reference numbers** — IA shows two chips ("EPOC-DE-FFM-2026-0150", "STA-FFM-2026-CY-0150"). Click the "×" on a chip → it disappears. Click "+ Add" → input grows a new chip.
5. **VA path** — open `LENS-2026-00180` (new mock). IA approval role is "Other Competent Authority"; VA subsection now renders with its own (Spanish judge) details.
6. **EPOC Form 3 autofill** — open EPOC Form 3 from the Hub Compose on LENS-2026-00150. Section B fields read the new structured paths: `B_issuingAuthority` = "Public Prosecutor's Office of Frankfurt am Main", `B_issuingFileNumber` = "EPOC-DE-FFM-2026-0150", `B_enforcingAuthority` = "Bundesamt für Justiz". On LENS-2026-00180, `B_validatingAuthority` is now populated too.
7. **Nature of Crime — ETSI merge.** On LENS-2026-00150, the Nature of Crime field shows two chips, each labelled with a small "eEvidence" badge. Click the picker → existing generic crimes appear without a badge, ETSI entries appear with the badge. Picking "Other" → a Textarea labelled "Describe the case classification" appears inline below the chips and is required for save.
8. **Enterprise Request — full path expanded.** On `LENS-2026-00150`, Request Type accordion section → the new "Enterprise Request" card. Card shows all four cascading layers because the mock walks the deepest branch: AddressedToController = Yes; AddressedToProcessor·DetrimentalToInvestigation = Yes (other false); ProcessorShallNotInformController = Yes (other false); Justification + Relevant Information textareas populated with the German prose from the mock.
9. **Enterprise Request — progressive disclosure regression.** Reset AddressedToController to No on the card → all subsequent rows collapse instantly (Q2, Q3, Q4 disappear). Re-set to Yes, set both Q2 booleans to No → Q3/Q4 disappear; collapsed-summary chip reads "Enterprise Request: Yes, no processor route". Set one Q2 to Yes, both Q3 to No → Q4 disappears; chip reads "Enterprise Request: Processor route, no MS obligation". Set ProcessorShallInformController to Yes → Q4 textareas appear; they show validation-required asterisks. Try saving with one of them blank → form save is blocked with an inline error on the empty field.
10. **Related Case(s) — eEvidence.** On `LENS-2026-00150`, scroll to the Case Identification card. The existing "Related DARS Cases" text input remains. Below it, a "Related Case(s)" header introduces a summary card for `LENS-2025-00280` showing: case number with `[eEvidence]` + `[EPOC-PR]` chips, IA name, two stacked reference numbers, transmitted date/time, service provider name, **and (because subtype = EPOC-PR) a sub-block with Preservation End ("May 15, 2026"), Data Destruction ("Aug 15, 2026"), Request Status ("Resolved"), and Resolution Reason ("Preserved")**, with the "Any other relevant information" paragraph at the bottom. Read-only — no edit buttons.
11. **Related Case(s) — empty state.** On a hypothetical eEvidence case with `eevidenceRelatedCases = []`, the section header renders with a muted *"No related cases referenced in the eEvidence envelope."* line.
12. **Non-eEvidence regression** — open `LENS-2026-00170` (UK COPO). The new IA / VA / EA subsections are hidden. The Enterprise Request card is hidden. The Related Case(s) summary block is hidden (only the flat `relatedCaseNumbers` input remains visible). Authorization Details renders exactly as today. The Nature of Crime picker still shows the merged list (ETSI options are pickable everywhere, just badged) — confirm RS can pick a generic value without seeing eEvidence-specific fields appear.
13. **Read-only review** — navigate to ReadOnlyReviewForm (sign / review stage). The three IA / VA / EA blocks are printed inline; the Enterprise Request decision path is printed as a labelled key/value list (only the populated rungs); the Related Case(s) summary cards are printed inline; Nature of Crime chips include the eEvidence badge.
14. `npx vite build` clean.

## Confirmed decisions

1. **Tel / Fax shape — canonical string, parsed at render time.** Stored as a single string (`"+49 69 1367-2424"`). A helper `parsePhoneParts(s)` in `formEngine.ts` splits into `{ countryCode, areaCode, number }` when the EPOC PDF needs separate columns. Keeps RS input fast (paste any format) and avoids tuple-construction friction in mocks; the parse is one-way and only matters at render.
2. **Languages Spoken — IA + VA approvers only.** Per Reg. 2023/1543 Annex schema. EA is a contact-only endpoint with no languages field.
3. **Country dropdown for IA / VA — existing `JURISDICTIONS` list, EU/EEA pinned to top.** Reuses the same dataset the Request Type card already uses. When `requestType === "eEvidence"`, sort the EU/EEA country group above all others so the common selection is one click.
4. **Non-eEvidence cases — fields fully hidden.** Subsections + the Request Type card relabel only render when `requestType === "eEvidence"`. Easy to broaden later (e.g. UK COPO, 2703(d)) by renaming the namespace if needed.
5. **Legacy approver fields — kept as derived views over the IA approver.** On eEvidence cases, the existing flat `approverName` / `approverRole` / `approverEmail` / `approverPhoneNumber` read from `eevidenceIssuingAuthority.approver` (so anything consuming them — read-only display, EPOC autofill — keeps working unchanged). On non-eEvidence cases they remain editable independent fields as today.
6. **ETSI `AuthorisationTypeOfCase` — merged into Nature of Crime, not a separate field.** The 17 ETSI dictionary values are added to the `NATURE_OF_CRIMES` list, each tagged `source: "eEvidence"` and rendered with a small "eEvidence" badge in the picker + on chips. Friendly English labels (e.g. "Drugs or Drug Trafficking"); ETSI camelCase keys are the canonical storage value. Picking "Other" reveals a required free-text description field below the picker.
7. **Overlap with existing entries — ETSI version replaces generic.** Where an ETSI key has the same label as a prior generic entry (Cybercrime, Human Trafficking, Money Laundering, Theft), the ETSI-badged row is the single source of truth. The four older mock-data strings are migrated in-place via a static rename map.
8. **Related Case(s) summary cards — read-only, eEvidence-only.** New structured `EEvidenceRelatedCase[]` block on `FormData`. Renders below (not in place of) the existing flat `relatedCaseNumbers` text input on the Case Identification card. One stacked Fluent `Card` per related case showing DARS number + request type/subtype chips, Issuing Authority name, all reference numbers (stacked, not comma-joined since they're long), transmitted date/time, service provider, and an "Any other relevant information" footer. **When `requestSubType === "EPOC-PR"` on a related case, the card adds an EPOC-PR sub-block with `preservationEndDate`, `dataDestructionDate`, `requestStatus`, and `resolutionReason` (rendered via `RESOLUTION_REASON_META[...].label`). On EPOC (non-PR) related cases the sub-block is hidden entirely.** Hidden entirely for non-eEvidence cases. No add/remove UI in this iteration — data comes from the envelope / mock fetch.
9. **`dateOfTransmission` — unified field name + datetime precision across current case and related cases.** The current-case Request Type field (`FormData.dateOfTransmission`) and the related-case summary field both use the **same name** and the **same ISO-8601 string shape**, accepting either a date-only value (`"2025-11-15"`) or a full datetime (`"2025-11-15T10:42:00"`). The renderer formats based on whether a `T` component is present — date-only stays "Nov 15, 2025"; datetime renders "Nov 15, 2025, 10:42 CET". The `<Input type="date">` editor on the current case still produces date-only; the related-case datetime values come pre-populated from the (mocked) envelope fetch.
10. **Enterprise Request card — progressive disclosure, eEvidence-only.** New `EEvidenceEnterpriseRequest` block on `FormData`. Captures the IA's path through the ETSI UnderlyingConditions decision tree as a chain of Yes/No radios with cascading reveals: AddressedToController → AddressedToProcessor·{ControllerUnidentified, DetrimentalToInvestigation} → ProcessorShall·{Inform, NotInform}Controller → Justification + Relevant Information textareas. Each layer only renders when its gate evaluates true (or "either of N children = true"). Justification + Relevant Information are required *only* when the deepest branch is reached. Card collapses to a single-line chip summarising the IA's path. Hidden entirely for non-eEvidence cases.

## Risks

- **Field count.** Authorization Details already has a "Show more / Show less" affordance because it's dense. Three new subsections push it further — mitigated by making each subsection independently collapsible and defaulting them to **collapsed** for non-eEvidence cases.
- **Mock vs. registry split.** `legalContext.primaryIssuingAuthority` is an `Agency` registry entry. The new `eevidenceIssuingAuthority` is a per-case envelope record. They will look similar but serve different roles; risk that someone reads from the wrong one. Mitigation: doc-comments on both fields; type names disambiguate.
- **Reference-number array migration.** Existing cases set `approvalReferenceNumber` (single string). Old data won't auto-populate the new array. Acceptable for the prototype; a migration helper in `formEngine` could backfill if real data shows up.
- **EU eEvidence specificity bleeding into UK / non-EU paths.** Risk that adding "Validating Authority" tempts future work to put non-eEvidence validators here. Mitigation: every gate is `requestType === "eEvidence"`; clear doc-comments.
- **Related Case(s) — flat input vs. structured block divergence.** The existing flat `relatedCaseNumbers` text input and the new structured `eevidenceRelatedCases[]` aren't synced — the RS could type a number in one and have it not appear in the other. For the prototype the structured block is purely fetched / pre-populated (read-only), so this is acceptable; a future iteration may want a parser that splits the text field and looks up each id, or replace the text field entirely on eEvidence cases.
- **Enterprise Request — `ShallInform` / `ShallNotInform` modelled as two independent booleans.** The ETSI dictionary defines them as two separate flags but in practice they're mutually exclusive. The radio-group UI lets the RS pick "Yes" on both, which is semantically meaningless. Mitigation: in the onChange handler for each radio, when one is set to true, force the other to false. Document this as a UI convention with a comment in the code; no schema-level constraint. If the IA envelope ever ships with both = true (unlikely but possible), the form preserves the data and the collapsed-summary chip reads "Processor route, conflicting notification flags" so it's visible for triage.
