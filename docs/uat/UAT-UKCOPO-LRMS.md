# UAT — UK COPO Coverage Plan (LENS-LRMS WebClient)

**Document owner**: Lisa Wu (PM, DARS / LENS)
**Last updated**: 2026-06-01
**Source environment**: LENS-LRMS WebClient (`C:\R\LENS-LRMS\sources\dev\WebClient`) — local dev build run from that workspace
**Scope**: End-to-end UAT coverage for UK Communications Data Production Order (COPO) cases as modelled in the LENS-LRMS WebClient. LRMS does **not** carry a first-class "UK COPO" request type or AuthorizationType — UK COPO cases are exercised as a regular case with `country = "United Kingdom"` and `authorizationType ∈ {Court Order, Subpoena, Administrative Subpoena}`. UK-specific behaviour surfaces through the country normalization helper (`isUnitedKingdom`), the Regulatory Compliance section, the triage gate in `useWorkflowTransitions`, and the audit-logging spec (`C:\R\LENS-LRMS\Specs\case-stage-state-audit-logging.md`).

This plan supersedes the prototype-focused `docs/uat/UAT-UKCOPO.md` for the LRMS WebClient surface area. Where the prototype models "UK COPO" as a first-class request type with its own banner/chips/state machine, LRMS models the same legal artifact as `country=UK + authorizationType=Court Order` and routes the UK-specific behaviour through `isUnitedKingdom(country)` calls in two places: the triage gate (`useWorkflowTransitions.ts:73-82`) and the EU27 DSA harms guard (`RegulatoryComplianceSection.tsx`). All test steps below point at real files in `C:\R\LENS-LRMS\sources\dev\WebClient`.

---

## 1. Purpose

This UAT plan validates that the LENS-LRMS WebClient correctly handles UK COPO cases end-to-end. It is organised into four capability families:

1. **End-to-end happy paths** per UK-applicable AuthorizationType (Court Order, Subpoena, Administrative Subpoena).
2. **WorkflowState transition matrix** covering every state transition reachable from a UK COPO case, including the destructive / terminal transitions.
3. **UK-specific paths** — country selector, `UK_ALIASES` normalization, Regulatory Compliance card behaviour, EU27 DSA harms guard, Shield Law confirmation gate, supporting-document upload via DocumentPanel, and audit-logging spec coverage.
4. **Smoke tests** — 3–5 quick sanity checks before deeper testing.

Each test below specifies:
- **Capability validated** — what the test proves.
- **Persona** — primary tester (TS = Triage Specialist, RS = Response Specialist).
- **Workflow stage** — `WorkflowStage · WorkflowState` at the start, or an arrow chain when the test spans multiple transitions.
- **Case shape** — country / jurisdiction / authorization · N identifiers · Consumer/Enterprise mix.
- **Preconditions** — seed state required before the tester acts.
- **Test Steps** — granular, click-by-click instructions a first-time LRMS tester can follow without guessing.
- **Expected Results** — Step N keyed bullets, each tied to a specific UI surface, audit entry, or state value.
- **Pass criteria** — single sentence or short bullet list of invariants.

---

## 2. Document conventions

### 2.1 Test ID format

- Per-case test IDs use prefix `UAT-UKCOPO-LRMS-NNN` (three-digit zero-padded). This prefix is distinct from the prototype's `UAT-UKCOPO-NNN` scheme so the two plans can coexist without collisions.
- Smoke tests use single-letter suffix `UAT-UKCOPO-LRMS-SMOKE-X`.
- Numeric blocks are reserved by family:
  - Family 1 (end-to-end): `001–099`
  - Family 2 (transition matrix): `100–199`
  - Family 3 (UK-specific): `200–299`
  - Family 4 (smoke): `SMOKE-A` through `SMOKE-E`
- Synthesised cases use uppercase tokens like `UKCOPO-LRMS-COURT-ORDER-SYNTH`, `UKCOPO-LRMS-SUBPOENA-SYNTH`, `UKCOPO-LRMS-ADMINSUBP-SYNTH`, `UKCOPO-LRMS-EU27-SYNTH`, `UKCOPO-LRMS-ALIAS-SYNTH`.
- Per-case headings concatenate Test ID and Case ID separated by `·` (U+00B7 middle dot) and an em dash `—` before the scenario title.

### 2.2 Persona key

| Code | Persona | Day-to-day responsibility |
|------|---------|---------------------------|
| TS | Triage Specialist | Receives new cases, runs Triage QC, captures regulatory compliance + identifiers, advances case from Triage → Fulfillment |
| RS | Response Specialist | Owns Fulfillment, runs collection / publish / delivery, resolves the case |

### 2.3 Workflow stages

| Stage label | When opened, lands on | Page-level chrome |
|-------------|----------------------|-------------------|
| Triage · Waiting on Triage | `/cases/{id}` → `CaseDetailsComponent` | `WorkflowSidebar` (Triage active), `TriageStepsBanner`, `CaseInfoBar`, Sections 1–6 |
| Triage · In Progress | `/cases/{id}` → `CaseDetailsComponent` | Same as above; banner CTA "Complete Triage" |
| Fulfillment · In Progress | `/cases/{id}` → `CaseDetailsComponent` (Fulfillment-stage view via `FulfillmentCaseDetails`) | `WorkflowSidebar` (Fulfillment active), `CaseInfoBar`, `AccountIdentifiersSection`, `BottomActionBar` |
| Fulfillment · Wizard | `/cases/{id}/fulfillmentwizard` → `FulfillmentWizardView` | `StickyCaseHeader`, `WizardHeader`, `WizardStepIndicator`, `WizardFooter` |
| Publish · PublishInProgress | `/cases/{id}` → `CollectionPrepDeliveryPage` | `WorkflowSidebar` (Collection active), `CollectionPageHeader`, `FulfillmentPipelineCard`, `CollectionTabBar`, `FulfillmentTrackerSection` |
| Publish · DeliveryInProgress / DeliveryComplete / Resolved | Same `CollectionPrepDeliveryPage` | Same chrome; `ResolveCaseDialog` modal launched from `CollectionPageHeader` |

### 2.4 Pass / fail definitions

- **PASS** — every Expected Result is observable without scrolling tricks, console errors, or workaround actions.
- **FAIL (Blocker)** — a required field, banner, button, or state transition does not behave as written; the case cannot advance or the user is blinded to a destructive state.
- **FAIL (Cosmetic)** — wording, colour, icon, or non-essential placement deviates from spec but the underlying state machine still works.
- **N/A** — the test depends on a code path that is currently a stub or feature-flagged off (e.g. `InternationalWizard` is "Under Development" today; tests that exercise the wizard-driven UK intake should record N/A and seed the case from `mockCaseApi` instead).

---

## 3. How to use this document

1. Read §1–§2 once before running any test.
2. Skim §4 (Case index) and pick a test by ID.
3. Read §4.5 (decision tree) to understand which branch the test belongs to and what banner / chip / audit event it must produce.
4. Follow Preconditions, then Test Steps, then verify each Expected Result is present.
5. Record PASS / FAIL (Blocker) / FAIL (Cosmetic) / N/A in the Sign-off sheet (§7).
6. If a test references a file path (e.g. `useWorkflowActions.ts:75-131`) and the behaviour diverges, paste the actual file:line of the divergence into the FAIL note.

---

## 4. Case index

| Test ID | Case ID | Scenario | Stage | Persona |
|---------|---------|----------|-------|---------|
| UAT-UKCOPO-LRMS-001 | LNS-2025-555444 | UK COPO via Court Order — end-to-end Triage → Resolved | Triage → Resolved | TS, RS |
| UAT-UKCOPO-LRMS-002 | UKCOPO-LRMS-SUBPOENA-SYNTH | UK COPO via Subpoena — end-to-end Triage → Resolved | Triage → Resolved | TS, RS |
| UAT-UKCOPO-LRMS-003 | UKCOPO-LRMS-ADMINSUBP-SYNTH | UK COPO via Administrative Subpoena — end-to-end Triage → Resolved | Triage → Resolved | TS, RS |
| UAT-UKCOPO-LRMS-100 | UKCOPO-LRMS-TRANS-100 | Intake/Triage `WaitingOnTriage` → `InProgress` (assign) | Triage · Waiting on Triage | TS |
| UAT-UKCOPO-LRMS-101 | UKCOPO-LRMS-TRANS-101 | Triage `InProgress` → Fulfillment `InProgress` (triageComplete) | Triage · In Progress | TS |
| UAT-UKCOPO-LRMS-102 | UKCOPO-LRMS-TRANS-102 | Triage `InProgress` → Fulfillment `RecommendRejection` | Triage · In Progress | TS |
| UAT-UKCOPO-LRMS-103 | UKCOPO-LRMS-TRANS-103 | Fulfillment `RecommendRejection` → `Rejected` (finalizeRejection) | Fulfillment · RecommendRejection | RS |
| UAT-UKCOPO-LRMS-104 | UKCOPO-LRMS-TRANS-104 | Fulfillment `InProgress` → `Rejected` (direct finalize) | Fulfillment · In Progress | RS |
| UAT-UKCOPO-LRMS-105 | UKCOPO-LRMS-TRANS-105 | Fulfillment `InProgress` → `Withdrawn` | Fulfillment · In Progress | RS |
| UAT-UKCOPO-LRMS-106 | UKCOPO-LRMS-TRANS-106 | Fulfillment `InProgress` → `NoDataProvided` (No Accounts Found) | Fulfillment · In Progress | RS |
| UAT-UKCOPO-LRMS-107 | UKCOPO-LRMS-TRANS-107 | Fulfillment `InProgress` → `PublishInProgress` (submitFulfillment) | Fulfillment · In Progress | RS |
| UAT-UKCOPO-LRMS-108 | UKCOPO-LRMS-TRANS-108 | `PublishInProgress` → `PartiallyPublished` (server-driven) | Publish · PublishInProgress | RS |
| UAT-UKCOPO-LRMS-109 | UKCOPO-LRMS-TRANS-109 | `PublishInProgress` → `DeliveryInProgress` (submitToDelivery) | Publish · PublishInProgress | RS |
| UAT-UKCOPO-LRMS-110 | UKCOPO-LRMS-TRANS-110 | `DeliveryInProgress` → `DeliveryComplete` (server-driven) | Publish · DeliveryInProgress | RS |
| UAT-UKCOPO-LRMS-111 | UKCOPO-LRMS-TRANS-111 | `PublishInProgress` → `Resolved` (ResolveCaseDialog · default) | Publish · PublishInProgress | RS |
| UAT-UKCOPO-LRMS-112 | UKCOPO-LRMS-TRANS-112 | `PublishInProgress` → `NoDataFound` (ResolveCaseDialog) | Publish · PublishInProgress | RS |
| UAT-UKCOPO-LRMS-113 | UKCOPO-LRMS-TRANS-113 | `PublishInProgress` → `Cancelled` (ResolveCaseDialog) | Publish · PublishInProgress | RS |
| UAT-UKCOPO-LRMS-114 | UKCOPO-LRMS-TRANS-114 | `PublishInProgress` → `Invalid` (ResolveCaseDialog) | Publish · PublishInProgress | RS |
| UAT-UKCOPO-LRMS-115 | UKCOPO-LRMS-TRANS-115 | `PublishInProgress` → `Withdrawn` (ResolveCaseDialog) | Publish · PublishInProgress | RS |
| UAT-UKCOPO-LRMS-116 | UKCOPO-LRMS-TRANS-116 | `PublishInProgress` → `Rejected` (ResolveCaseDialog) | Publish · PublishInProgress | RS |
| UAT-UKCOPO-LRMS-117 | UKCOPO-LRMS-TRANS-117 | `PublishInProgress` → `NoDataProvided` (ResolveCaseDialog) | Publish · PublishInProgress | RS |
| UAT-UKCOPO-LRMS-118 | UKCOPO-LRMS-TRANS-118 | `* → WaitingOnTriage` (returnToTriage from Fulfillment) | Fulfillment · In Progress | RS |
| UAT-UKCOPO-LRMS-200 | UKCOPO-LRMS-ALIAS-SYNTH | CountrySelector behaviour for "United Kingdom" + persistence | Intake | TS |
| UAT-UKCOPO-LRMS-201 | UKCOPO-LRMS-ALIAS-SYNTH | `UK_ALIASES` normalization — `gb`, `uk`, `gbr`, `GBR`, `Great Britain` resolve via `isUnitedKingdom()` | Triage | TS |
| UAT-UKCOPO-LRMS-202 | UKCOPO-LRMS-EU27-SYNTH | Regulatory Compliance card under UK — `regulationType`, `applicableLaws`, `reviewStatus`, `reviewedBy`, `reviewDate` | Triage | TS |
| UAT-UKCOPO-LRMS-203 | UKCOPO-LRMS-EU27-SYNTH | EU27 DSA harms field — UK suppression behaviour | Triage | TS |
| UAT-UKCOPO-LRMS-204 | UKCOPO-LRMS-EU27-SYNTH | Shield Law confirmation — UK applicability (off) | Triage | TS |
| UAT-UKCOPO-LRMS-205 | LNS-2025-555444 | DocumentPanel — supporting affidavit attachment + verification | Triage | TS |
| UAT-UKCOPO-LRMS-206 | LNS-2025-555444 | Audit-logging spec coverage — every stage transition leaves a note row | Triage → Resolved | TS, RS |
| UAT-UKCOPO-LRMS-SMOKE-A | LNS-2025-555444 | Open UK seed case, verify UK-specific chrome renders | Triage | TS |
| UAT-UKCOPO-LRMS-SMOKE-B | LNS-2025-555444 | Triage gate refuses to advance without regulatory review | Triage | TS |
| UAT-UKCOPO-LRMS-SMOKE-C | LNS-2025-555444 | Fulfillment wizard Step 2 — bulk services + date range save | Fulfillment · Wizard | RS |
| UAT-UKCOPO-LRMS-SMOKE-D | LNS-2025-555444 | Submit Fulfillment → Publish landing page renders | Fulfillment → Publish | RS |
| UAT-UKCOPO-LRMS-SMOKE-E | LNS-2025-555444 | Resolve Case dialog → Resolved terminal | Publish · PublishInProgress | RS |

---

## 4.5 UK COPO LRMS decision tree

A UK COPO case in LRMS is routed by four variables, evaluated in order: (1) is `country` UK-equivalent (per `isUnitedKingdom()`)? — if not, the case is out of scope for this plan; (2) which `authorizationType` was captured at intake (Court Order, Subpoena, Administrative Subpoena)? — the type does not branch the state machine but it is the canonical place where UK COPO is recorded today; (3) which `WorkflowStage` and `WorkflowState` is the case currently in? — the gate logic in `useWorkflowTransitions.ts` differs at each stage; (4) what trigger does the tester fire? — assign, triageComplete, recommendRejection, finalizeRejection, withdraw, noAccountsFound, returnToTriage, submitFulfillment, resolveCase. Each leaf below tells you what banner/chip the UI shows, what state the case lands in, what audit entry should be written (per the spec), and which UATs walk the path.

```
country resolved by isUnitedKingdom() ?
├── NO  → out of scope (see UAT-MockCases.md / UAT-UKCOPO.md prototype plan)
└── YES → continue
    │
    ├── authorizationType
    │   ├── "Court Order"           → Workflow A — canonical UK COPO         (LNS-2025-555444 seed)
    │   ├── "Subpoena"               → Workflow B — UK COPO via subpoena      (UKCOPO-LRMS-SUBPOENA-SYNTH)
    │   ├── "Administrative Subpoena"→ Workflow C — UK COPO via admin subp.   (UKCOPO-LRMS-ADMINSUBP-SYNTH)
    │   └── other                    → out of scope
    │
    └── workflowStage · workflowState · trigger
        │
        ├── Intake · WaitingOnTriage
        │   └── assign(assigneeName)
        │       ├── Banner: TriageStepsBanner stays "Triage Quick Steps"
        │       ├── Chip:   CaseInfoBar workflow state pill → "In Progress"
        │       ├── State:  Triage · InProgress
        │       ├── Audit:  TriageStarted (note in OperationalReviewCard)
        │       └── UATs:   UAT-UKCOPO-LRMS-100, SMOKE-A
        │
        ├── Triage · InProgress
        │   ├── triageComplete()
        │   │   ├── Gate:  isUnitedKingdom(country) ⇒ requiresRegulatoryReview = true
        │   │   │          regulatoryReviewSatisfied ⇐ reviewStatus set OR eu27DsaHarms>0
        │   │   ├── Banner: TriageStepsBanner → "Fulfillment Steps"
        │   │   ├── State:  Fulfillment · InProgress
        │   │   ├── Audit:  TriageCompleted (TriageCompleteTotalTime starts)
        │   │   └── UATs:   UAT-UKCOPO-LRMS-101, SMOKE-B
        │   ├── recommendRejection(reason)
        │   │   ├── Note:   Rejection note written first
        │   │   ├── Stage:  Triage → Fulfillment
        │   │   ├── State:  Fulfillment · RecommendRejection
        │   │   ├── Audit:  RecommendRejection
        │   │   └── UATs:   UAT-UKCOPO-LRMS-102
        │   └── returnToTriage()
        │       ├── (no-op — already in Triage; canReturnToTriage is false)
        │       └── (covered indirectly by UAT-UKCOPO-LRMS-118)
        │
        ├── Fulfillment · RecommendRejection
        │   └── finalizeRejection(reason)
        │       ├── State:  Fulfillment · Rejected (terminal)
        │       ├── Audit:  RejectionFinalized
        │       └── UATs:   UAT-UKCOPO-LRMS-103
        │
        ├── Fulfillment · InProgress
        │   ├── finalizeRejection(reason)  → Rejected (terminal)     · UAT-UKCOPO-LRMS-104
        │   ├── withdraw()                 → Withdrawn (terminal)    · UAT-UKCOPO-LRMS-105
        │   ├── noAccountsFound()          → NoDataProvided (term.)  · UAT-UKCOPO-LRMS-106
        │   ├── returnToTriage()           → Triage · WaitingOnTriage· UAT-UKCOPO-LRMS-118
        │   └── submitFulfillment()        → PublishInProgress       · UAT-UKCOPO-LRMS-107, SMOKE-D
        │       └── Gate: fulfillmentIdentifierCount > 0 AND
        │                 fulfillmentServiceCount    > 0 AND etag present
        │
        ├── Publish · PublishInProgress
        │   ├── server-driven progress    → PartiallyPublished       · UAT-UKCOPO-LRMS-108
        │   ├── submitToDelivery          → DeliveryInProgress       · UAT-UKCOPO-LRMS-109
        │   └── resolveCase(<terminal>)   → Resolved/NoDataFound/Cancelled/Invalid/Withdrawn/Rejected/NoDataProvided
        │                                 · UAT-UKCOPO-LRMS-111..117, SMOKE-E
        │
        ├── Publish · DeliveryInProgress
        │   └── server-driven delivery completion → DeliveryComplete (terminal) · UAT-UKCOPO-LRMS-110
        │
        └── UK-specific branches (orthogonal to the state machine)
            ├── CountrySelector "United Kingdom"            · UAT-UKCOPO-LRMS-200
            ├── UK_ALIASES normalization                    · UAT-UKCOPO-LRMS-201
            ├── RegulatoryComplianceSection (full card)     · UAT-UKCOPO-LRMS-202
            ├── EU27 DSA harms suppression for UK           · UAT-UKCOPO-LRMS-203
            ├── Shield Law confirmation (US-only gate)      · UAT-UKCOPO-LRMS-204
            ├── DocumentPanel affidavit upload + verify     · UAT-UKCOPO-LRMS-205
            └── Audit-log spec coverage (notes timeline)    · UAT-UKCOPO-LRMS-206
```

### How to read this tree when interpreting a UAT result

- **Banner present?** If the test expects a banner (`TriageStepsBanner` text change, `IdentifierGuard` MessageBar, `CancellationBadge` chip), it must render at the location named in the leaf. A missing banner ≠ a silent state mismatch — it is FAIL (Blocker).
- **Submit-button disabled?** Most disabled states come from `useWorkflowTransitions` capability flags (`canCompleteTriage`, `canSubmitFulfillment`, `canFinalizeRejection`, `canReturnToTriage`, `isReadOnly`). The hover tooltip on the disabled button enumerates the reasons — paste that tooltip text verbatim into the FAIL note if a button refuses to enable.
- **Identifier cascade?** UK COPO does not introduce a per-identifier cascade today (the prototype's `authorizationDesiredTaskStatus` mechanic does not exist in LRMS). All state changes are case-level.
- **Audit event missing?** Per the spec (`case-stage-state-audit-logging.md`), every stage transition should leave an audit trace. **The WebClient does not currently emit auto audit log entries** (grep confirms zero `audit*`, `AuditLog`, or `WorkflowStageChange` writes in `src/`). The closest user-visible surface is the notes timeline in `OperationalReviewCard` (Section 6) — tests in this plan check that section as a proxy and flag the structural gap.

---

## 5. Test cases

> Each test below assumes the tester has opened the LENS-LRMS WebClient in a Chromium browser at `http://localhost:5173` (or whichever local dev port the workspace boots on), is signed in with a TS or RS role, and has the mock backend toggled on (`mockCaseApi` is the data source — there is no real CMS dependency for these tests).

---

## 5.1 Family 1 — End-to-end happy paths per UK-applicable AuthorizationType

### UAT-UKCOPO-LRMS-001 · LNS-2025-555444 — UK COPO via Court Order — end-to-end Triage → Resolved

**Capability validated**: Full LRMS walk for the canonical UK COPO case — country=United Kingdom + `authorizationType="Court Order"` — exercising every WorkflowStage (Triage → Fulfillment → Publish) and every terminal `WorkflowState=Resolved` transition. Verifies the seed mock case (`mockCaseApi.ts` line 849) renders correctly and that each stage advances via the documented trigger.

**Persona**: TS (primary, Triage), RS (secondary, Fulfillment/Publish)

**Workflow stage**: Triage · Waiting on Triage → Fulfillment · InProgress → Publish · PublishInProgress → Publish · Resolved

**Case shape**: United Kingdom / International / Court Order · 1+ Consumer identifier(s) · seeded from `mockCaseApi.MOCK_CASES`

**Preconditions**:
1. Default queue; mock backend on.
2. UK seed case `LNS-2025-555444` is present in `mockCaseApi.MOCK_CASES` with `country="United Kingdom"`, `agency.agencyName="Metropolitan Police Service"`, `authorizations[0].authorizationType="Court Order"`, `authorizations[0].authorizationNumber="UK-2025-CO-789"`, `authorizations[0].issuingAuthority="Westminster Magistrates' Court"`, `regulatoryCompliance.regulationType="CLOUD Act"`, `regulatoryCompliance.applicableLaws=["UK Terrorism Act 2000"]`, `regulatoryCompliance.reviewStatus="Approved"`.

**Test Steps**:

#### Part A — Triage opening + identification

1. From the browser, navigate to `http://localhost:5173/cases`. The Case Queue list renders.
2. In the Case Queue, locate the row whose Case ID column reads `LNS-2025-555444`. Click that row. The Case Details page mounts at `/cases/LNS-2025-555444`.
3. At the top of the page, observe the `WorkflowSidebar` on the left edge (collapsed by default). Click the chevron toggle button at the top of the rail (aria-label "Expand workflow sidebar"). The sidebar expands and shows three stage rows: "Triage" (active), "Fulfillment" (available/disabled), "Collection, Prep & Delivery" (available/disabled).
4. Immediately below the sidebar's top toggle, find the `TriageStepsBanner` at the top of the main content column. Verify the banner title reads `Triage Quick Steps` and a primary action button labelled **Complete Triage** is visible (likely disabled at this point — hover over it to reveal the tooltip listing the unmet gates).
5. Directly below the `TriageStepsBanner`, find the `CaseInfoBar`. Verify the case number reads `LNS-2025-555444`, the agency reads `Metropolitan Police Service`, and the workflow state pill reads `Waiting on Triage`.

#### Part B — Verify UK country + regulatory compliance render

6. In the main content column, scroll until you see the numbered section group `2. Legal & Compliance`. If the group is collapsed (the chevron on the right of the group header points down), click the group header to expand it.
7. Inside Section 2, find the inner `LegalClassificationSection` Accordion (left column of the two-column grid). If its accordion chevron is closed, click the accordion header to open it. Locate the `Country` dropdown. Verify the selected value reads `United Kingdom`.
8. Locate the `Jurisdiction` field directly next to `Country`. Verify it reads `International`.
9. Still in Section 2, scroll past the two-column grid to the full-width `RegulatoryComplianceSection` accordion below. Click its header (GlobeRegular icon) to expand. Verify:
    - `Regulation Type` reads `CLOUD Act`.
    - `Applicable Laws` shows the chip `UK Terrorism Act 2000`.
    - `Review Status` reads `Approved`.
    - The `EU 27 DSA harms` Combobox is **not** visible (UK is treated as non-EU27 by `isUnitedKingdom()`).
    - The `Shield Law Confirmed` Yes/No toggle is **not** visible (US-only gate via `isUnitedStates()`).

#### Part C — Capture identifier + run account check

10. Scroll to the numbered section group `4. Identifier & Data Services`. If collapsed, click the group header chevron to expand it. The inner `AccountIdentifiersSection` accordion (defaultOpenItems=['accountIdentifiers']) should already be open.
11. At the top of the section, find the Add-Identifier form (Identifier Type select, Identifier Value input, **Add** button). Pick `Email` from the Type dropdown, type `cfo@kontoso-uk.example` into the Value input. The required tri-column appears below: pick `cfo@kontoso-uk.example` in the "Linked LE Identifier" dropdown, pick `Outlook` in the "Associated Service" dropdown, pick `Basic Subscriber Info` in the "Data Categories" dropdown. Click **Add**. A toast confirms the identifier was added; the identifiers table at the bottom of the section now shows a new row.
12. Above the identifiers table, click **Check Accounts** (or **Re-check Accounts** if already run). Wait for the per-row Status column to update from `Pending` to `Found` (or `Blocked` if the mock returns a CLASS hit). For UK COPO, expect `Found`. The button text flips to **Re-check**.
13. Click the chevron on the right edge of the row for `cfo@kontoso-uk.example`. The row expands inline showing a Consumer profile bar (country, email, displayName) and a services sub-table. Verify the services sub-table contains an `Outlook` row with a Categories count of `1`.

#### Part D — Advance Triage → Fulfillment

14. Scroll back up to the `TriageStepsBanner`. Hover over the **Complete Triage** button. If the tooltip lists unmet gates (assignee, priority, nature of crime, regulatory review), resolve each one:
    - Section 1 → expand → `AssignedToCard` → click **Assign to me** (sets `assigneeName`).
    - Section 1 → `Case Priority` dropdown → select `High` (or any non-empty value).
    - Section 2 → `LegalClassificationSection` → `Nature of Crime` multi-select → tick at least one crime (e.g. `Terrorism`).
    - Section 2 → `RegulatoryComplianceSection` → verify `Review Status` is `Approved` (already seeded).
15. Click **Complete Triage**. The page advances: the `TriageStepsBanner` title changes to `Fulfillment Steps`, the `WorkflowSidebar` advances the active marker from Triage to Fulfillment, and the `CaseInfoBar` workflow state pill reads `In Progress` under Fulfillment.

#### Part E — Configure services in the Fulfillment wizard

16. Scroll down to Section 4 (`AccountIdentifiersSection`). At the bottom of the section, click the **Open Fulfillment Wizard** primary footer button. The page navigates to `/cases/LNS-2025-555444/fulfillmentwizard` and mounts `FulfillmentWizardView`.
17. Step 1 of the wizard mounts — `IdentifierReviewStep`. Verify the identifier row for `cfo@kontoso-uk.example` is shown. Click the **Next** button in the `WizardFooter`. The wizard advances to Step 2 — `ServicesConfigurationStep`.
18. In Step 2, the default mode is Bulk. In the `DataCollectionPeriod` card at the top, pick a start date of `2026-01-01` and an end date of `2026-04-22`. Below, in the `MicrosoftServicesList`, tick the `Outlook` service row and confirm `Basic Subscriber Info`, `Authentication Logs`, `Content` are ticked.
19. Click **Next** in the `WizardFooter`. The wizard advances to Step 3 — `FulfillmentPlanReviewStep`. Verify the `ChangesSummary` card lists the identifier and that the summary tile `Date Range` reads `Jan 1, 2026 – Apr 22, 2026`.
20. Click **Save** (or **Submit**) in the `WizardFooter`. A toast confirms `Fulfillment plan saved`; the browser navigates back to `/cases/LNS-2025-555444`.

#### Part F — Submit Fulfillment → Publish

21. On the Case Details page, scroll to the `BottomActionBar` at the bottom of the page. Click **Submit Fulfillment**. The `FulfillmentSummaryDialog` opens summarising identifier count, service count, date range. Click **Submit** in the dialog.
22. The page transitions: the `WorkflowSidebar` active marker advances to "Collection, Prep & Delivery"; the route `/cases/LNS-2025-555444` now renders `CollectionPrepDeliveryPage` (because `workflowStage === WorkflowStage.Publish`). At the top of the page, the `CollectionPageHeader` renders with a Database24Regular icon, title, and two buttons: **Check Job Status** + **Resolve Case**.

#### Part G — Walk Collection / Prep / Delivery → Resolved

23. Below `CollectionPageHeader`, observe the `FulfillmentPipelineCard` showing three columns: Collection / Prepare / Delivery, each with a 0/N progress bar.
24. Below the pipeline card, observe the `CollectionTabBar` (All / Needs Action / By Identifier / Complete). Click `All`.
25. Scroll to the `FulfillmentTrackerSection`. Click the identifier row to expand. Per-service `CategoryStatusTable` rows render. For each row where the Phase Status badge reads `Ready to Submit` (or the collection job has completed), click the **Submit** action in the Actions column.
26. After all categories are submitted, the per-row Phase Status badges advance to `Ready to Deliver`. For each row, click **Deliver**.
27. Once all rows show `Delivered` and the `FulfillmentPipelineCard` Delivery column reads `N/N`, scroll back to the `CollectionPageHeader`. Click **Resolve Case**. The `ResolveCaseDialog` modal opens.
28. In the dialog, verify the default `Resolution Status` dropdown is set to `Resolved`. Type a brief note into the `Resolution Notes` textarea (e.g. "All requested categories delivered to Metropolitan Police Service per Westminster Magistrates' Court order UK-2025-CO-789"). Click **Resolve Case**. A success toast renders; the dialog closes; the `CaseInfoBar` workflow state pill reads `Resolved`.

#### Part H — Verify audit trail (notes timeline)

29. Scroll to Section 6 — `Operational Case Review`. If collapsed, click the group header chevron. The inner `OperationalReviewCard` Accordion is default-open. Under the `All` tab, verify at minimum these note rows are present (chronological, newest-first): a Triage-stage note created during Triage QC (per spec `case-stage-state-audit-logging.md`), the Fulfillment plan save event, the Submit Fulfillment event, the Resolve Case note text from Step 28.
30. **Note (spec gap)**: Per discovery, the WebClient does not currently auto-emit audit log entries on stage transitions — only user-written notes appear here. If only the Step 28 note is visible, log a structural FAIL referencing `case-stage-state-audit-logging.md` and the empty auto-audit surface area.

**Expected Results**:
- **Expected — Part A**:
    - Step 1: `/cases` queue mounts; UK seed case row is visible.
    - Step 2: Case Details page mounts at `/cases/LNS-2025-555444`.
    - Step 3: `WorkflowSidebar` expands; Triage stage is active.
    - Step 4: `TriageStepsBanner` reads `Triage Quick Steps`; **Complete Triage** button is disabled with a tooltip listing unmet gates.
    - Step 5: `CaseInfoBar` reads case number `LNS-2025-555444`, agency `Metropolitan Police Service`, state pill `Waiting on Triage`.
- **Expected — Part B**:
    - Step 7: `LegalClassificationSection` `Country` dropdown reads `United Kingdom`.
    - Step 8: `Jurisdiction` reads `International`.
    - Step 9: `RegulatoryComplianceSection` shows `CLOUD Act` / `UK Terrorism Act 2000` / `Approved`; EU27 harms hidden; Shield Law hidden.
- **Expected — Part C**:
    - Step 11: Identifier row appears in the table with Status `Pending`.
    - Step 12: Status flips to `Found`; button reads `Re-check Accounts`.
    - Step 13: Expanded row shows Consumer profile + Outlook service with Categories count `1`.
- **Expected — Part D**:
    - Step 14: Each remediation step removes the corresponding gate from the **Complete Triage** tooltip.
    - Step 15: `TriageStepsBanner` title reads `Fulfillment Steps`; sidebar active marker moves; state pill reads `In Progress`.
- **Expected — Part E**:
    - Step 16: Route changes to `/cases/LNS-2025-555444/fulfillmentwizard`; `FulfillmentWizardView` mounts; Step 1 is active.
    - Step 17: Step 1 shows the identifier; **Next** advances to Step 2.
    - Step 18: `DataCollectionPeriod` reflects the chosen dates; `MicrosoftServicesList` `Outlook` row shows the three category checkmarks.
    - Step 19: Step 3 `ChangesSummary` lists the identifier; `Date Range` summary tile reads `Jan 1, 2026 – Apr 22, 2026`.
    - Step 20: Save toast renders; navigation returns to `/cases/LNS-2025-555444`.
- **Expected — Part F**:
    - Step 21: `FulfillmentSummaryDialog` shows the plan summary; **Submit** is enabled.
    - Step 22: Route renders `CollectionPrepDeliveryPage`; `CollectionPageHeader` shows the two buttons.
- **Expected — Part G**:
    - Step 23: `FulfillmentPipelineCard` shows three phase columns.
    - Step 25: Per-row **Submit** action moves Collection→Prepare.
    - Step 26: Per-row **Deliver** action moves Prepare→Delivery.
    - Step 27: `ResolveCaseDialog` modal opens with `Resolution Status` defaulted to `Resolved`.
    - Step 28: Success toast `"Case Resolved"`; dialog closes; state pill reads `Resolved`.
- **Expected — Part H**:
    - Step 29: Notes timeline shows at least the user-written Resolve note.
    - Step 30: If auto-audit entries are missing, the structural gap is logged against `case-stage-state-audit-logging.md`.

**Pass criteria**:
- Every Part A–H expected result is observable.
- The case lands at `WorkflowState=Resolved` after the dialog completes.
- The notes timeline carries the user-written events (auto-audit is N/A per spec gap).

---

### UAT-UKCOPO-LRMS-002 · UKCOPO-LRMS-SUBPOENA-SYNTH — UK COPO via Subpoena — end-to-end Triage → Resolved

**Capability validated**: Same end-to-end walk as UAT-UKCOPO-LRMS-001 but with `authorizationType="Subpoena"` — proves that the LRMS state machine is independent of authorizationType (UK COPO can be modelled as any of the three UK-applicable AuthorizationType enum members from `domain.constants.ts` line 29-37).

**Persona**: TS (primary), RS (secondary)

**Workflow stage**: Triage · Waiting on Triage → Publish · Resolved

**Case shape**: United Kingdom / International / Subpoena · 1 Consumer identifier · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-SUBPOENA-SYNTH` into `mockCaseApi.MOCK_CASES` by cloning `LNS-2025-555444` and overriding: `caseId="UKCOPO-LRMS-SUBPOENA-SYNTH"`, `authorizations[0].authorizationType="Subpoena"`, `authorizations[0].authorizationNumber="UK-2025-SUB-456"`, `authorizations[0].issuingAuthority="Crown Prosecution Service"`.
2. Default queue.

**Test Steps**:
1. Navigate to `/cases`. Click the row for `UKCOPO-LRMS-SUBPOENA-SYNTH`. The Case Details page mounts.
2. Scroll to Section 3 — `Sender Authority Details`. Click the group chevron to expand. Click the inner `AuthorizationsSection` accordion header. Verify the first authorization row reads `Authorization Type: Subpoena`, `Authorization Number: UK-2025-SUB-456`, `Issuing Authority: Crown Prosecution Service`.
3. Follow Parts B–H of UAT-UKCOPO-LRMS-001 verbatim. The state machine behaviour is identical.

**Expected Results**:
- Step 2: `Subpoena` authorization renders in Section 3.
- Steps 3+: identical to UAT-UKCOPO-LRMS-001 Parts B–H — case advances to `Resolved`.

**Pass criteria**: Case reaches `WorkflowState=Resolved` and the audit trail (notes timeline) carries the user-written transition events.

---

### UAT-UKCOPO-LRMS-003 · UKCOPO-LRMS-ADMINSUBP-SYNTH — UK COPO via Administrative Subpoena — end-to-end Triage → Resolved

**Capability validated**: Same end-to-end walk with `authorizationType="Administrative Subpoena"` — proves the third UK-applicable AuthorizationType enum value behaves identically.

**Persona**: TS (primary), RS (secondary)

**Workflow stage**: Triage · Waiting on Triage → Publish · Resolved

**Case shape**: United Kingdom / International / Administrative Subpoena · 1 Consumer identifier · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-ADMINSUBP-SYNTH` into `mockCaseApi.MOCK_CASES` by cloning `LNS-2025-555444` and overriding: `caseId="UKCOPO-LRMS-ADMINSUBP-SYNTH"`, `authorizations[0].authorizationType="Administrative Subpoena"`, `authorizations[0].authorizationNumber="UK-2025-ADM-321"`, `authorizations[0].issuingAuthority="UK Home Office"`.
2. Default queue.

**Test Steps**:
1. Navigate to `/cases`. Click the row for `UKCOPO-LRMS-ADMINSUBP-SYNTH`. The Case Details page mounts.
2. Scroll to Section 3 — `Sender Authority Details`. Expand the group + inner `AuthorizationsSection` accordion. Verify the first authorization row reads `Authorization Type: Administrative Subpoena`, `Authorization Number: UK-2025-ADM-321`, `Issuing Authority: UK Home Office`.
3. Follow Parts B–H of UAT-UKCOPO-LRMS-001 verbatim.

**Expected Results**:
- Step 2: `Administrative Subpoena` authorization renders in Section 3.
- Steps 3+: identical to UAT-UKCOPO-LRMS-001 Parts B–H — case advances to `Resolved`.

**Pass criteria**: Case reaches `WorkflowState=Resolved` and the audit trail carries the user-written events.

---

## 5.2 Family 2 — WorkflowState transition matrix

Every test in this family is a focused one-trigger walk: (1) set up a UK COPO case at the "from" state, (2) fire the trigger, (3) verify the "to" state, (4) verify the audit entry. Use `LNS-2025-555444` as the base seed unless otherwise specified; clone to a fresh synthesised case ID per test so transitions don't bleed across tests.

---

### UAT-UKCOPO-LRMS-100 · UKCOPO-LRMS-TRANS-100 — Intake/Triage `WaitingOnTriage` → `InProgress` (assign)

**Capability validated**: `useWorkflowActions.assign(assigneeName)` flips `WorkflowState` from `WaitingOnTriage` to `InProgress` while keeping `WorkflowStage` in Triage. Verifies the assignment surface in `AssignedToCard` writes the assignee via the Redux/API path and that the `CaseInfoBar` state pill updates.

**Persona**: TS

**Workflow stage**: Triage · WaitingOnTriage → Triage · InProgress

**Case shape**: United Kingdom / International / Court Order · 1 Consumer identifier · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-100` from `LNS-2025-555444` with `workflowStage="Triage"` and `workflowState="WaitingOnTriage"`, `assigneeName=null`.
2. Default queue.

**Test Steps**:
1. Navigate to `/cases`. Click the row for `UKCOPO-LRMS-TRANS-100`. Case Details mounts.
2. Verify the `CaseInfoBar` state pill reads `Waiting on Triage` and the Assignee chip (right side of the bar) reads `Unassigned`.
3. Scroll to Section 1 — `Case Overview`. If collapsed, click the group chevron to expand. In the right sidebar column inside Section 1, find the `AssignedToCard`. Click the **Assign to me** shortcut button at the top of the card. The card updates: the assignee combobox now shows the current user's display name.
4. Wait 1–2s for the autosave indicator in `CaseInfoBar` to flip from "Saving…" to "Last saved …".
5. Re-inspect the `CaseInfoBar` state pill.
6. Scroll to Section 6 — `Operational Case Review` → expand → click the **All** tab.

**Expected Results**:
- Step 2: State pill `Waiting on Triage`; Assignee chip `Unassigned`.
- Step 3: `AssignedToCard` assignee field shows the current user.
- Step 4: Autosave completes ("Last saved …" timestamp updates).
- Step 5: State pill flips to `In Progress`; Assignee chip in `CaseInfoBar` updates to the current user.
- Step 6: Per spec, an `AssigneeUpdated` / `TriageStarted` audit note should appear. **If absent**, log structural FAIL referencing `case-stage-state-audit-logging.md`.

**Pass criteria**:
- State transitions `WaitingOnTriage → InProgress`.
- Stage stays `Triage`.
- Assignee written.
- Notes timeline carries the event (or structural FAIL logged if the auto-emit gap exists).

---

### UAT-UKCOPO-LRMS-101 · UKCOPO-LRMS-TRANS-101 — Triage `InProgress` → Fulfillment `InProgress` (triageComplete)

**Capability validated**: `useWorkflowActions.triageComplete()` advances the case from Triage stage to Fulfillment stage, with state remaining `InProgress`. Verifies the canCompleteTriage gate (`useWorkflowTransitions.ts:73-82`) honours the UK requirement (`isUnitedKingdom(country) ⇒ requiresRegulatoryReview = true`).

**Persona**: TS

**Workflow stage**: Triage · InProgress → Fulfillment · InProgress

**Case shape**: United Kingdom / International / Court Order · 1 Consumer identifier · synthesised, mid-triage

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-101` from `LNS-2025-555444` with `workflowStage="Triage"`, `workflowState="InProgress"`, `assigneeName=<TS user>`, `casePriority="High"`, `natureOfCrime=["Terrorism"]`, `regulatoryCompliance.reviewStatus="Approved"`.
2. Default queue.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-101`. Case Details mounts.
2. Verify the `CaseInfoBar` state pill reads `In Progress` under stage `Triage` (the sidebar's Triage stage is active).
3. Scroll to the `TriageStepsBanner` at the top. Hover over the **Complete Triage** button — verify the tooltip is empty (no unmet gates).
4. Click **Complete Triage**.
5. Wait ~1s. Observe the page chrome.
6. Scroll to Section 6 → expand → **All** tab.

**Expected Results**:
- Step 2: State pill `In Progress`; sidebar Triage active.
- Step 3: **Complete Triage** is enabled (no tooltip gates).
- Step 4: Button click fires `useWorkflowActions.triageComplete()`.
- Step 5: `TriageStepsBanner` title flips to `Fulfillment Steps`; `WorkflowSidebar` active marker advances to Fulfillment; state pill still reads `In Progress` (under Fulfillment stage).
- Step 6: Per spec, `TriageCompleted` audit note should appear; if absent, log structural FAIL.

**Pass criteria**:
- Stage advances Triage→Fulfillment.
- State remains `InProgress`.
- Banner/title and sidebar update.
- Notes timeline carries the event (or structural FAIL).

---

### UAT-UKCOPO-LRMS-102 · UKCOPO-LRMS-TRANS-102 — Triage `InProgress` → Fulfillment `RecommendRejection`

**Capability validated**: `useWorkflowActions.recommendRejection(reason)` writes a Rejection note FIRST (throws if the note write fails) then transitions stage Triage→Fulfillment and state to `RecommendRejection`. Verifies the reason-text requirement and the side-effect ordering documented at `useWorkflowActions.ts:75-131`.

**Persona**: TS

**Workflow stage**: Triage · InProgress → Fulfillment · RecommendRejection

**Case shape**: United Kingdom / International / Court Order · 1 Consumer identifier · synthesised, mid-triage

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-102` from `LNS-2025-555444` with `workflowStage="Triage"`, `workflowState="InProgress"`, assigned to a TS user.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-102`. Case Details mounts.
2. Scroll to the `CaseDetailsFooter` at the bottom of the page. Click **Recommend Rejection**. The `RecommendRejectionDialog` modal opens.
3. In the dialog, leave the Reason textarea empty. Click **Submit**. Verify the dialog blocks submit with a validation error like "Reason required" (form-level guard before the API call).
4. Type `UK COPO order outside Microsoft scope — Westminster Magistrates' Court order targets non-Microsoft service.` into the Reason textarea. Click **Submit**.
5. The dialog closes. Inspect the chrome.
6. Scroll to Section 6 → expand → **All** tab.

**Expected Results**:
- Step 2: `RecommendRejectionDialog` opens.
- Step 3: Empty reason rejected with validation error; API not called.
- Step 4: Submit fires `recommendRejection(reason)`.
- Step 5: State pill reads `Recommend Rejection`; sidebar advances stage to Fulfillment; banner reads `Fulfillment Steps`.
- Step 6: A Rejection note row appears at the top of the timeline with type `Rejection`/`Triage` and the reason text body.

**Pass criteria**:
- Empty reason blocked.
- Non-empty reason: state→`RecommendRejection`, stage→`Fulfillment`, Rejection note persisted.

---

### UAT-UKCOPO-LRMS-103 · UKCOPO-LRMS-TRANS-103 — Fulfillment `RecommendRejection` → `Rejected` (finalizeRejection)

**Capability validated**: `useWorkflowActions.finalizeRejection(reason)` from `RecommendRejection` state — `canFinalizeRejection` is true when `isFulfillmentStage AND (state == RecommendRejection || Rejected) AND rejectionReason present`. Writes a Rejection note then transitions state to `Rejected` (terminal).

**Persona**: RS

**Workflow stage**: Fulfillment · RecommendRejection → Fulfillment · Rejected

**Case shape**: United Kingdom / International / Court Order · 1 Consumer identifier · synthesised, post-recommend

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-103` from `LNS-2025-555444` with `workflowStage="Fulfillment"`, `workflowState="RecommendRejection"`, `rejectionReason="Set by TS during triage"`.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-103`. Case Details mounts (Fulfillment-stage view).
2. Verify the `CaseInfoBar` state pill reads `Recommend Rejection`.
3. Scroll to `CaseDetailsFooter`. Click **Finalize Rejection** (only visible when `canFinalizeRejection`). The `FinalizeRejectionDialog` opens.
4. Type a finalize reason: `RS concurs with TS rejection — closing case.` Click **Submit**.
5. The dialog closes. Inspect chrome.
6. Scroll to Section 6 timeline.

**Expected Results**:
- Step 2: State pill `Recommend Rejection`.
- Step 3: `FinalizeRejectionDialog` opens.
- Step 5: State pill reads `Rejected`; the case becomes read-only (`isReadOnly === true` because `Rejected` is in `END_STATES`); footer destructive buttons disappear or disable.
- Step 6: A second Rejection note appears with the finalize reason.

**Pass criteria**:
- State `Rejected` reached.
- Case becomes read-only.
- Two Rejection notes recorded (TS recommend + RS finalize).

---

### UAT-UKCOPO-LRMS-104 · UKCOPO-LRMS-TRANS-104 — Fulfillment `InProgress` → `Rejected` (direct finalize)

**Capability validated**: From the same `useWorkflowActions.finalizeRejection(reason)` path, this time without first passing through `RecommendRejection` — proves the gate `state == RecommendRejection || Rejected` is permissive enough to skip the intermediate step when RS pre-sets the state, or that the dialog accepts a direct rejection. (Per `useWorkflowTransitions.ts`, `canFinalizeRejection` requires `state == Rejected || RecommendRejection`; if the dialog refuses, this is the expected branch and the test logs N/A.)

**Persona**: RS

**Workflow stage**: Fulfillment · InProgress → Fulfillment · Rejected

**Case shape**: United Kingdom / International / Court Order · 1 Consumer identifier · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-104` from `LNS-2025-555444` with `workflowStage="Fulfillment"`, `workflowState="InProgress"`.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-104`.
2. Scroll to `CaseDetailsFooter`. If a **Finalize Rejection** button is visible, click it. Otherwise (per gate semantics, this button may be hidden because `state==InProgress` not `RecommendRejection`), the path is via `RecommendRejection` first — in that case, mark this test N/A and rerun UAT-UKCOPO-LRMS-102→103.
3. If the button was visible: in the dialog, supply a reason `Direct rejection by RS after review.` Click **Submit**.

**Expected Results**:
- Step 2: Either (a) button visible → proceed to Step 3, or (b) button hidden → N/A, fall back to 102+103 chain.
- Step 3 (if reached): State pill flips to `Rejected`; case becomes read-only; Rejection note persisted.

**Pass criteria**:
- Either the direct path works and lands at `Rejected`, OR the gate correctly hides the button and the test is N/A (in which case 103 covers the path).

---

### UAT-UKCOPO-LRMS-105 · UKCOPO-LRMS-TRANS-105 — Fulfillment `InProgress` → `Withdrawn`

**Capability validated**: `useWorkflowActions.withdraw()` flips state to `Withdrawn` (terminal) without changing stage. Verifies the `!isReadOnly` gate and the WithdrawConfirmationDialog flow.

**Persona**: RS

**Workflow stage**: Fulfillment · InProgress → Fulfillment · Withdrawn

**Case shape**: United Kingdom / International / Court Order · 1 Consumer identifier · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-105` from `LNS-2025-555444` with `workflowStage="Fulfillment"`, `workflowState="InProgress"`.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-105`.
2. Scroll to `CaseDetailsFooter`. Click **Withdraw**. The `WithdrawConfirmationDialog` opens.
3. Type a withdrawal reason: `LE Metropolitan Police Service withdrew COPO order — file closed.` Click **Confirm Withdraw**.
4. Inspect chrome + timeline.

**Expected Results**:
- Step 2: `WithdrawConfirmationDialog` opens.
- Step 3: State pill reads `Withdrawn`; case becomes read-only.
- Step 4: Notes timeline carries a Withdrawal note row.

**Pass criteria**:
- State `Withdrawn` reached.
- Case read-only.
- Withdrawal note persisted.

---

### UAT-UKCOPO-LRMS-106 · UKCOPO-LRMS-TRANS-106 — Fulfillment `InProgress` → `NoDataProvided` (No Accounts Found)

**Capability validated**: `useWorkflowActions.noAccountsFound()` flips state to `NoDataProvided` (terminal) without changing stage. Verifies the No-Accounts-Found path from `AccountIdentifiersSection`.

**Persona**: RS

**Workflow stage**: Fulfillment · InProgress → Fulfillment · NoDataProvided

**Case shape**: United Kingdom / International / Court Order · 1 Consumer identifier · synthesised, all identifiers checked as not-found

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-106` from `LNS-2025-555444` with `workflowStage="Fulfillment"`, `workflowState="InProgress"`, identifier check status `not-found` for all identifiers (mock `targetSelectors/checkAccounts/{caseId}` returns no matches).

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-106`.
2. Scroll to Section 4 — `Identifier & Data Services`. Verify the identifier check has run and the Status column reads `Not Found` for each identifier.
3. In the section header, click **No Accounts Found** (this CTA appears when all identifiers resolve to not-found — closest LRMS action to "abort because no data exists").
4. Confirm in any modal that appears.

**Expected Results**:
- Step 2: All identifiers marked `Not Found`.
- Step 3: **No Accounts Found** action visible and enabled.
- Step 4: State pill flips to `No Data Provided`; case becomes read-only.

**Pass criteria**:
- State `NoDataProvided` reached.
- Case read-only.

---

### UAT-UKCOPO-LRMS-107 · UKCOPO-LRMS-TRANS-107 — Fulfillment `InProgress` → `PublishInProgress` (submitFulfillment)

**Capability validated**: `submitFulfillment` + `patchCaseDetails` in `CaseDetailsComponent.tsx:780-830` advances stage Fulfillment→Publish and state→`PublishInProgress`. Verifies the `canSubmitFulfillment` gate (`fulfillmentIdentifierCount > 0 AND fulfillmentServiceCount > 0 AND etag present`).

**Persona**: RS

**Workflow stage**: Fulfillment · InProgress → Publish · PublishInProgress

**Case shape**: United Kingdom / International / Court Order · 1 Consumer identifier with at least 1 service+category · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-107` from `LNS-2025-555444` with `workflowStage="Fulfillment"`, `workflowState="InProgress"`, fulfillment plan saved (1 identifier × Outlook × Basic Subscriber Info, date range Jan 1 – Apr 22, 2026).

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-107`.
2. Scroll to `CaseDetailsFooter`. Hover over **Submit Fulfillment** — verify the tooltip is empty (no unmet gates).
3. Click **Submit Fulfillment**. `FulfillmentSummaryDialog` opens. Click **Submit** in the dialog.
4. Wait for the route to swap.

**Expected Results**:
- Step 2: **Submit Fulfillment** enabled.
- Step 3: Dialog opens with plan summary; submit fires `submitFulfillment` mutation followed by `patchCaseDetails(workflowState=PublishInProgress)`.
- Step 4: Route still `/cases/UKCOPO-LRMS-TRANS-107` but page now renders `CollectionPrepDeliveryPage`; sidebar active marker → "Collection, Prep & Delivery"; state pill reads `Publish In Progress`.

**Pass criteria**:
- Stage Fulfillment → Publish.
- State `PublishInProgress`.
- Collection page renders.

---

### UAT-UKCOPO-LRMS-108 · UKCOPO-LRMS-TRANS-108 — `PublishInProgress` → `PartiallyPublished` (server-driven)

**Capability validated**: Server-driven progress flips state to `PartiallyPublished` when some but not all categories complete publish. Verifies the polling/refetch path in `useCollectionPolling`.

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · PartiallyPublished

**Case shape**: United Kingdom / International / Court Order · 2+ services or categories · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-108` from `LNS-2025-555444` with `workflowStage="Publish"`, `workflowState="PublishInProgress"`, two services configured (Outlook, OneDrive), mock collection results show Outlook complete + OneDrive in progress.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-108`. `CollectionPrepDeliveryPage` mounts.
2. Click **Check Job Status** in `CollectionPageHeader`. The view refetches.
3. After ~5s of `useCollectionPolling`, inspect the `CaseInfoBar` state pill.

**Expected Results**:
- Step 2: Refetch triggers.
- Step 3: State pill flips from `Publish In Progress` to `Partially Published`; `FulfillmentPipelineCard` Prepare column reads `1/2`.

**Pass criteria**:
- State `PartiallyPublished` reflects server state.
- (If the server-driven write is not modelled in the current mock, log N/A.)

---

### UAT-UKCOPO-LRMS-109 · UKCOPO-LRMS-TRANS-109 — `PublishInProgress` → `DeliveryInProgress` (submitToDelivery)

**Capability validated**: `useSubmitToDeliveryMutation` (`collectionApi`) POST `cases/delivery/submit` flips state to `DeliveryInProgress` when a category's Deliver action is fired and the per-row deliveryJobId is present.

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · DeliveryInProgress

**Case shape**: United Kingdom / International / Court Order · 1 service/category with `publishJobId` + `deliveryJobId` present · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-109` at `workflowStage="Publish"`, `workflowState="PublishInProgress"`, all prepare jobs complete.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-109`. `CollectionPrepDeliveryPage` mounts.
2. Scroll to `FulfillmentTrackerSection`. Click the identifier row to expand. Click the **Deliver** action on a category row whose Phase Status reads `Ready to Deliver`.

**Expected Results**:
- Step 2: Deliver fires `submitToDelivery`; state pill flips to `Delivery In Progress`; `FulfillmentPipelineCard` Delivery column counter increments.

**Pass criteria**:
- State `DeliveryInProgress` reached.

---

### UAT-UKCOPO-LRMS-110 · UKCOPO-LRMS-TRANS-110 — `DeliveryInProgress` → `DeliveryComplete` (server-driven)

**Capability validated**: Server-driven delivery completion flips state to `DeliveryComplete` (terminal, in `END_STATES` per `workflow-rules.constants.ts:3-22`).

**Persona**: RS

**Workflow stage**: Publish · DeliveryInProgress → Publish · DeliveryComplete

**Case shape**: United Kingdom / International / Court Order · all categories delivered · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-110` at `workflowStage="Publish"`, `workflowState="DeliveryInProgress"`, mock returns all delivery jobs complete on next poll.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-110`.
2. Click **Check Job Status**. Wait ~5s.

**Expected Results**:
- Step 2: State pill flips to `Delivery Complete`; case becomes read-only.

**Pass criteria**:
- State `DeliveryComplete` reached; case read-only.

---

### UAT-UKCOPO-LRMS-111 · UKCOPO-LRMS-TRANS-111 — `PublishInProgress` → `Resolved` (ResolveCaseDialog · default)

**Capability validated**: `ResolveCaseDialog` POST `cases/{caseId}/resolve` with `resolutionStatus: Resolved` (the default selection). Verifies the canonical happy-path resolution.

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · Resolved

**Case shape**: United Kingdom / International / Court Order · synthesised, mid-publish

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-111` at `workflowStage="Publish"`, `workflowState="PublishInProgress"`.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-111`.
2. In `CollectionPageHeader`, click **Resolve Case**. `ResolveCaseDialog` opens.
3. Verify the `Resolution Status` dropdown defaults to `Resolved`.
4. Type a note. Click **Resolve Case** primary button.

**Expected Results**:
- Step 2: Dialog opens.
- Step 3: Default `Resolved`.
- Step 4: Success toast `"Case Resolved"`; dialog closes; state pill `Resolved`; case read-only.

**Pass criteria**: State `Resolved`.

---

### UAT-UKCOPO-LRMS-112 · UKCOPO-LRMS-TRANS-112 — `PublishInProgress` → `NoDataFound` (ResolveCaseDialog)

**Capability validated**: `ResolveCaseDialog` with `resolutionStatus: NoDataFound` from the `TERMINAL_WORKFLOW_STATES` picker.

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · NoDataFound

**Case shape**: United Kingdom / International / Court Order · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-112` at `workflowState="PublishInProgress"`.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-112`.
2. Click **Resolve Case** in header. In `ResolveCaseDialog`, change `Resolution Status` dropdown to `No Data Found`. Add note. Click **Resolve Case**.

**Expected Results**:
- Step 2: State pill `No Data Found`; case read-only.

**Pass criteria**: State `NoDataFound`.

---

### UAT-UKCOPO-LRMS-113 · UKCOPO-LRMS-TRANS-113 — `PublishInProgress` → `Cancelled` (ResolveCaseDialog)

**Capability validated**: ResolveCaseDialog with `resolutionStatus: Cancelled`.

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · Cancelled

**Preconditions**: Seed `UKCOPO-LRMS-TRANS-113` at `PublishInProgress`.

**Test Steps**:
1. Open the case → **Resolve Case** → select `Cancelled` → note → submit.

**Expected Results**:
- State pill `Cancelled`; case read-only.

**Pass criteria**: State `Cancelled`.

---

### UAT-UKCOPO-LRMS-114 · UKCOPO-LRMS-TRANS-114 — `PublishInProgress` → `Invalid` (ResolveCaseDialog)

**Capability validated**: ResolveCaseDialog with `resolutionStatus: Invalid`.

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · Invalid

**Preconditions**: Seed `UKCOPO-LRMS-TRANS-114` at `PublishInProgress`.

**Test Steps**:
1. Open the case → **Resolve Case** → select `Invalid` → note → submit.

**Expected Results**: State pill `Invalid`; case read-only.

**Pass criteria**: State `Invalid`.

---

### UAT-UKCOPO-LRMS-115 · UKCOPO-LRMS-TRANS-115 — `PublishInProgress` → `Withdrawn` (ResolveCaseDialog)

**Capability validated**: ResolveCaseDialog with `resolutionStatus: Withdrawn`.

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · Withdrawn

**Preconditions**: Seed `UKCOPO-LRMS-TRANS-115` at `PublishInProgress`.

**Test Steps**:
1. Open the case → **Resolve Case** → select `Withdrawn` → note → submit.

**Expected Results**: State pill `Withdrawn`; case read-only.

**Pass criteria**: State `Withdrawn`.

---

### UAT-UKCOPO-LRMS-116 · UKCOPO-LRMS-TRANS-116 — `PublishInProgress` → `Rejected` (ResolveCaseDialog)

**Capability validated**: ResolveCaseDialog with `resolutionStatus: Rejected`.

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · Rejected

**Preconditions**: Seed `UKCOPO-LRMS-TRANS-116` at `PublishInProgress`.

**Test Steps**:
1. Open the case → **Resolve Case** → select `Rejected` → note → submit.

**Expected Results**: State pill `Rejected`; case read-only.

**Pass criteria**: State `Rejected`.

---

### UAT-UKCOPO-LRMS-117 · UKCOPO-LRMS-TRANS-117 — `PublishInProgress` → `NoDataProvided` (ResolveCaseDialog)

**Capability validated**: ResolveCaseDialog with `resolutionStatus: NoDataProvided` chosen at publish stage (distinct from the no-accounts-found path at fulfillment stage in UAT-UKCOPO-LRMS-106).

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · NoDataProvided

**Preconditions**: Seed `UKCOPO-LRMS-TRANS-117` at `PublishInProgress`.

**Test Steps**:
1. Open the case → **Resolve Case** → select `No Data Provided` → note → submit.

**Expected Results**: State pill `No Data Provided`; case read-only.

**Pass criteria**: State `NoDataProvided`.

---

### UAT-UKCOPO-LRMS-118 · UKCOPO-LRMS-TRANS-118 — `*` → `WaitingOnTriage` (returnToTriage from Fulfillment)

**Capability validated**: `useWorkflowActions.returnToTriage()` clears `assigneeName` and sets stage back to Triage, state back to `WaitingOnTriage`. Verifies `canReturnToTriage` gate (`!isTriageStage AND !isReadOnly`).

**Persona**: RS

**Workflow stage**: Fulfillment · InProgress → Triage · WaitingOnTriage

**Case shape**: United Kingdom / International / Court Order · synthesised, in Fulfillment

**Preconditions**:
1. Seed `UKCOPO-LRMS-TRANS-118` at `workflowStage="Fulfillment"`, `workflowState="InProgress"`, `assigneeName=<RS user>`.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-TRANS-118`.
2. Scroll to `CaseDetailsFooter`. Click **Return to Triage**. `ReturnToTriageDialog` opens.
3. Type a note: `RS returning to Triage — UK regulatory review needs re-check.` Click **Confirm**.
4. Inspect chrome.

**Expected Results**:
- Step 2: Dialog opens.
- Step 3: `useWorkflowActions.returnToTriage()` fires.
- Step 4: State pill `Waiting on Triage`; sidebar Triage active again; `CaseInfoBar` Assignee chip reads `Unassigned` (assignee cleared); `TriageStepsBanner` reverts to `Triage Quick Steps`.

**Pass criteria**:
- State `WaitingOnTriage`.
- Stage `Triage`.
- Assignee cleared.

---

## 5.3 Family 3 — UK-specific paths

### UAT-UKCOPO-LRMS-200 · UKCOPO-LRMS-ALIAS-SYNTH — CountrySelector behaviour for "United Kingdom" + persistence

**Capability validated**: `CountrySelector.tsx` (line 24–481) renders the UK tile correctly (id=54, code="UK", name="United Kingdom", isDSACountry=false) and emits the full `Country` object via `onCountrySelect`. Verifies the wizard branch (`country.code !== 'USA'` ⇒ InternationalWizard) and the UK label appears in the wizard header. **Note**: The InternationalWizard itself is currently a stub ("Under Development" Alert at `InternationalWizard.tsx`), so end-to-end submission via the wizard is N/A — this test only validates the selector + persistence into local state.

**Persona**: TS

**Workflow stage**: Intake (pre-creation)

**Case shape**: pre-case state — only the CountrySelector + RequestWizard local state

**Preconditions**:
1. Default queue.
2. Open the Request Creation wizard at the entry route (typically `/cases/new` or the "+ New Request" CTA in the queue toolbar).

**Test Steps**:
1. From the Case Queue, click the **+ New Request** button. `RequestWizard` mounts. The first surface rendered is `CountrySelector` (because `country` state is null).
2. In the search box at the top of `CountrySelector`, type `United Kingdom`. The grid filters to one tile.
3. Verify the tile shows: name `United Kingdom`, code badge `UK`, no DSA chip (since `isDSACountry=false`).
4. Click the tile. `onCountrySelect(country)` fires with the full `Country` object `{ id: 54, name: 'United Kingdom', code: 'UK', isDSACountry: false, manualDelivery: false, countryContactReview: false }`.
5. The wizard advances. Verify the header now reads `Country: United Kingdom`.
6. Verify the InternationalWizard mounts (because `country.code !== 'USA'`). The wizard body renders the "Under Development" Alert (current stub state — N/A for end-to-end completion).
7. Click the **Change Country** ghost button in the header. The wizard returns to `CountrySelector`.

**Expected Results**:
- Step 2: Grid filters to "United Kingdom" tile only.
- Step 3: Tile copy: `United Kingdom` / `UK` / no DSA chip.
- Step 4: `onCountrySelect` fires with the documented Country object.
- Step 5: Header `Country: United Kingdom`.
- Step 6: InternationalWizard mounts with stub Alert (current build state — log as N/A for downstream wizard completion).
- Step 7: Change Country returns to CountrySelector.

**Pass criteria**:
- UK tile renders + selects correctly.
- Wizard branches to InternationalWizard.
- Change Country resets selection.
- (Downstream end-to-end submission via wizard logged N/A.)

---

### UAT-UKCOPO-LRMS-201 · UKCOPO-LRMS-ALIAS-SYNTH — `UK_ALIASES` normalization

**Capability validated**: `isUnitedKingdom(country)` (`countryUtils.ts`) tests membership in `UK_ALIASES = Set(['gb', 'uk', 'gbr', 'united kingdom', 'great britain'])` after lowercase+trim. Verifies all five aliases resolve to the UK-specific code paths (triage gate + EU27 DSA harms gate).

**Persona**: TS

**Workflow stage**: Triage (Section 2 — Legal & Compliance)

**Case shape**: synthesised case where `country` is iterated through each alias

**Preconditions**:
1. Seed five synthesised cases `UKCOPO-LRMS-ALIAS-GB`, `UKCOPO-LRMS-ALIAS-UK`, `UKCOPO-LRMS-ALIAS-GBR`, `UKCOPO-LRMS-ALIAS-UKLOW`, `UKCOPO-LRMS-ALIAS-GREATBRITAIN` cloned from `LNS-2025-555444` with `country` overridden to `gb`, `uk`, `gbr`, `united kingdom`, `Great Britain` respectively. All otherwise at `Triage · InProgress` with assignee + priority + nature-of-crime set.

**Test Steps**:
1. For each of the five synthesised cases, navigate to `/cases/{caseId}`.
2. Scroll to Section 2 — `Legal & Compliance`. Expand the group + `RegulatoryComplianceSection` accordion.
3. Without changing `regulatoryCompliance.reviewStatus` or `eu27DsaHarms`, scroll up to `TriageStepsBanner`. Hover **Complete Triage**.
4. Verify the disabled tooltip lists `Regulatory compliance review status required` (or equivalent) — this proves `requiresRegulatoryReview` evaluated to true, i.e. `isUnitedKingdom(country)` returned true for the alias.
5. Set `reviewStatus="Approved"` in `RegulatoryComplianceSection`.
6. Re-hover **Complete Triage**.

**Expected Results**:
- Step 4 (per case): Tooltip lists the regulatory-review requirement. This proves all five aliases (`gb`, `uk`, `gbr`, `united kingdom`, `Great Britain`) resolve to UK via the lowercase+trim+Set membership in `countryUtils.ts`.
- Step 6 (per case): Tooltip no longer lists the regulatory-review requirement (gate satisfied).

**Pass criteria**:
- All five aliases trigger the UK gate.
- Setting `reviewStatus` clears the gate.

---

### UAT-UKCOPO-LRMS-202 · UKCOPO-LRMS-EU27-SYNTH — Regulatory Compliance card under UK — `regulationType`, `applicableLaws`, `reviewStatus`, `reviewedBy`, `reviewDate`

**Capability validated**: `RegulatoryComplianceSection.tsx` correctly captures all `RegulatoryComplianceDetails` fields (`src/api/types.ts` lines 79-90) under a UK country. Verifies the dropdown options match the `RegulationType` enum (`DSA | GDPR | MLAT | CLOUD Act | Other`) and `RegulatoryReviewStatus` (`Pending | Under Review | Approved | Non-Compliant`).

**Persona**: TS

**Workflow stage**: Triage · InProgress

**Case shape**: United Kingdom / International / Court Order · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-EU27-SYNTH` from `LNS-2025-555444` with `country="United Kingdom"`, all other regulatory fields blank.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-EU27-SYNTH`. Case Details mounts.
2. Scroll to Section 2 — `Legal & Compliance`. Expand the group. Scroll past the two-column grid to the full-width `RegulatoryComplianceSection` accordion. Click its header.
3. Verify the panel renders the following fields (per spec):
    - `Regulation Type` dropdown — open it and verify options include `DSA`, `GDPR`, `MLAT`, `CLOUD Act`, `Other`. Pick `CLOUD Act`.
    - `Applicable Laws` multi-select / chip input — type `UK Terrorism Act 2000` and add it. Verify the chip persists.
    - `Review Status` dropdown — options `Pending`, `Under Review`, `Approved`, `Non-Compliant`. Pick `Approved`.
    - `Reviewed By` text input — type `Solicitor J. Smith`.
    - `Review Date` date picker — pick today's date.
    - `Notes` textarea — type `UK COPO order verified per Westminster Magistrates' Court.`
4. Wait for autosave (`CaseInfoBar` "Saving…" → "Last saved …").
5. Refresh the browser. Re-open the case. Re-expand Section 2 + `RegulatoryComplianceSection`.

**Expected Results**:
- Step 3: All fields render with the expected enum options.
- Step 4: Autosave persists.
- Step 5: All field values survive refresh (persisted via PATCH `cases/{id}`).

**Pass criteria**:
- All five fields capture + persist.
- Enum option lists match `domain.constants.ts`.

---

### UAT-UKCOPO-LRMS-203 · UKCOPO-LRMS-EU27-SYNTH — EU27 DSA harms field — UK suppression behaviour

**Capability validated**: `RegulatoryComplianceSection.tsx` only renders the EU27 DSA Harms Combobox when `isUnitedKingdom(country)` is true — but the Combobox is rendered DISABLED with placeholder `"Applicable to UK cases only"` when `!isUK`, and ENABLED with placeholder `"Select DSA harms"` when `isUK`. Verifies the auto-clear `useEffect([isUK])` that resets `eu27DsaHarms = []` on country change. (Note: per discovery, UK is treated as the only enabling country here — EU27 members do NOT enable this Combobox, contrary to first intuition; this is the documented branching at `RegulatoryComplianceSection.tsx`.)

**Persona**: TS

**Workflow stage**: Triage · InProgress

**Case shape**: United Kingdom / International / Court Order · synthesised, then country flipped

**Preconditions**:
1. Seed `UKCOPO-LRMS-EU27-SYNTH` from `LNS-2025-555444` with `country="United Kingdom"`.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-EU27-SYNTH`. Expand Section 2 → `RegulatoryComplianceSection`.
2. Verify the `EU 27 DSA harms` Combobox is **enabled** and its placeholder reads `Select DSA harms`. Open it and select two harms (e.g. `Illegal content`, `Disinformation`). The chips persist.
3. Save (wait for autosave). Verify in `CaseInfoBar` the "Last saved" timestamp updates.
4. Now flip the country: scroll up to `LegalClassificationSection`, change `Country` dropdown from `United Kingdom` to (e.g.) `Germany`.
5. Scroll back to `RegulatoryComplianceSection`. Inspect the `EU 27 DSA harms` Combobox.
6. Flip the country back to `United Kingdom`. Inspect the Combobox.

**Expected Results**:
- Step 2: Combobox enabled with `Select DSA harms` placeholder; two harms selectable.
- Step 3: Save persists the harms.
- Step 4: Country change to Germany.
- Step 5: Combobox is now DISABLED with placeholder `Applicable to UK cases only`; previously-selected harms have been auto-cleared by the `useEffect([isUK])` hook (eu27DsaHarms reset to `[]`).
- Step 6: Combobox re-enabled with `Select DSA harms`; chips are empty (the previous values are not restored).

**Pass criteria**:
- UK enables Combobox.
- Non-UK disables Combobox with the correct placeholder.
- Country flip auto-clears the harms array.

---

### UAT-UKCOPO-LRMS-204 · UKCOPO-LRMS-EU27-SYNTH — Shield Law confirmation — UK applicability (off)

**Capability validated**: `LegalComplianceCard.tsx` Shield Law toggle is enabled ONLY when `isUnitedStates(country)` returns true. UK does NOT enable Shield Law. Verifies the symmetric US-gate in `countryUtils.ts`.

**Persona**: TS

**Workflow stage**: Triage · InProgress

**Case shape**: United Kingdom / International / Court Order · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-EU27-SYNTH` with `country="United Kingdom"`.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-EU27-SYNTH`. Expand Section 2.
2. Locate `LegalComplianceCard` in the right column of the two-column grid.
3. Inspect the Shield Law row.

**Expected Results**:
- Step 3: Shield Law toggle is either NOT RENDERED or rendered DISABLED with a tooltip indicating "US-only". The MLAT toggle on the same card IS visible and toggleable regardless of country.

**Pass criteria**:
- Shield Law gated off for UK.
- MLAT toggle remains independent.

---

### UAT-UKCOPO-LRMS-205 · LNS-2025-555444 — DocumentPanel supporting affidavit attachment + verification

**Capability validated**: `DocumentPanel.tsx` is the canonical surface for affidavit / supporting-document upload during Triage. Verifies the `getAttachment`/`onVerificationPersist` round-trip (`AttachmentDocumentStatus.Valid | Rejected | Unverified`) and the optimistic UI. Note: the `DOCUMENT_VERIFICATION_GATES_TRIAGE = false` flag at `useWorkflowTransitions.ts:84-97` means unverified documents do NOT block triage today.

**Persona**: TS

**Workflow stage**: Triage · InProgress

**Case shape**: United Kingdom / International / Court Order · synthesised with affidavit attachment

**Preconditions**:
1. UK seed case `LNS-2025-555444` open at Triage·InProgress with at least one mock attachment in `caseData.attachments` (typed `Affidavit` or `Court Order`).

**Test Steps**:
1. Navigate to `/cases/LNS-2025-555444`.
2. In the `CaseInfoBar` at the top, find the Documents toggle button (DocumentRegular icon) on the right side. The button shows an attachmentCount badge. Click it (or press Alt+D).
3. The `DocumentPanel` slides in from the right.
4. At the top of the panel, find the combobox listing all attachments. Pick the first attachment.
5. The viewer (PDF embed / image / iframe) renders the document.
6. Below the viewer, find the `Document Type`, `Document Status`, `Document ID`, `Document Name`, `Start Date`, `Expiration Date` fields. Verify they are populated from the seed.
7. At the bottom of the panel, locate the verification banner. Click **Verify**.
8. Verify the optimistic update: the panel immediately shows a Verified card with the current user's name + timestamp.
9. After ~1s, the persist completes (no error MessageBar appears).
10. Click **Undo**. The verification reverts to `Unverified`.
11. Type a rejection reason into the Notes textarea: `Affidavit signature illegible.` Click **Reject**.
12. The panel shows a Rejected card with the reason.
13. Press Esc. The panel closes.

**Expected Results**:
- Step 2: Documents button visible with badge.
- Step 3: Panel slides in.
- Step 4: Combobox + chip row populated.
- Step 5: Viewer renders.
- Step 6: Validation grid populated.
- Step 7: Verify action enabled.
- Step 8: Optimistic verified card appears.
- Step 9: No persistError MessageBar.
- Step 10: Undo reverts to Unverified.
- Step 11: Reject action with reason fires.
- Step 12: Rejected card visible.
- Step 13: Esc closes the panel.

**Pass criteria**:
- Verify / Undo / Reject round-trip works.
- Notes/reason persist.
- Esc closes panel.

---

### UAT-UKCOPO-LRMS-206 · LNS-2025-555444 — Audit-logging spec coverage — every stage transition leaves a note row

**Capability validated**: Per the spec (`C:\R\LENS-LRMS\Specs\case-stage-state-audit-logging.md`), every stage transition (Intake > Triage > Fulfillment > Publish > Delivery > Resolved) must be audit-logged. Verifies (or documents the gap in) the WebClient's audit surface. Per discovery, the WebClient does NOT auto-emit audit log entries today — this test treats `OperationalReviewCard` (Section 6) as the proxy timeline and explicitly records the structural gap.

**Persona**: TS (Triage stages) + RS (Fulfillment / Publish / Delivery / Resolved stages)

**Workflow stage**: Triage · WaitingOnTriage → Publish · Resolved (full walk)

**Case shape**: United Kingdom / International / Court Order · synthesised

**Preconditions**:
1. Seed `UKCOPO-LRMS-AUDIT-SYNTH` from `LNS-2025-555444` at `Triage · WaitingOnTriage`.

**Test Steps**:
1. Navigate to `/cases/UKCOPO-LRMS-AUDIT-SYNTH`.
2. Walk the case end-to-end following Parts A–G of UAT-UKCOPO-LRMS-001 (Triage assign → triageComplete → Fulfillment plan save → submitFulfillment → Publish prepare → deliver → Resolve).
3. At each stage transition, open Section 6 (Operational Case Review) → `All` tab. Record whether an auto-emitted note row appears for the transition.
4. Specifically check for these expected event types per spec: `TriageStarted`, `TriageCompleted`, `FulfillmentPlanSaved`, `FulfillmentSubmitted`, `CollectionStarted`, `PrepareCompleted`, `DeliveryCompleted`, `CaseResolved`.
5. Also verify each metric per spec: `AcknowledgementTotalTime`, `TriageCompleteTotalTime`, `CollectionSuccessTotalTime`, `PrepareSuccessTotalTime`, `DeliverSuccessTotalTime`, `CaseResolvedTotalTime` — note that these are timing metrics, not note rows, and may not be UI-visible.

**Expected Results**:
- Step 3 (per transition): Per spec, an auto-emitted note row SHOULD appear. **Per discovery, the WebClient currently emits NO auto audit log entries** (grep returns zero matches for `audit`/`AuditLog`/`WorkflowStageChange` in `src/`). Therefore, the expected result for each step is to record the gap.
- Step 4: Each named event type is either visible OR logged as a structural FAIL against the spec file.
- Step 5: Timing metrics are likely server-side and not in the WebClient — log N/A and reference the spec.

**Pass criteria**:
- If the WebClient auto-emits stage transitions: each named event is present.
- If the WebClient does NOT auto-emit (current state): the structural gap is documented per spec, and at minimum the user-written notes captured during the walk are present (e.g. recommendation, withdrawal, resolve notes).

**Per-test decision tree slice**:

```
country isUnitedKingdom() === true  AND  spec: case-stage-state-audit-logging.md
└── ► UK COPO audit logging
    ├── Trigger:   every stage transition (Intake > Triage > Fulfillment > Publish > Delivery > Resolved)
    ├── Expected:  per spec, audit note per transition + timing metrics
    ├── Surface:   OperationalReviewCard (Section 6) — closest proxy in WebClient today
    ├── Gap:       grep src/ for /audit|AuditLog|WorkflowStageChange/ → zero hits
    ├── Implication: Triage → Fulfillment → Publish → Resolved transitions are NOT auto-audited
    │              in the WebClient. Server may emit; WebClient does not surface them.
    └── UATs:      UAT-UKCOPO-LRMS-206 (this test), and indirectly UAT-UKCOPO-LRMS-001..118 (each
                   transition test also checks the notes timeline)
```

---

## 6. Smoke tests

### UAT-UKCOPO-LRMS-SMOKE-A · LNS-2025-555444 — Open UK seed case, verify UK-specific chrome renders

**Capability validated**: The UK seed mock case loads without error and the UK-specific chrome (`country=United Kingdom` in Section 2, `regulatoryCompliance.regulationType="CLOUD Act"` in `RegulatoryComplianceSection`, Westminster Magistrates' Court in Section 3) is visible.

**Persona**: TS

**Workflow stage**: Triage · Waiting on Triage (or whatever the seed lands at)

**Preconditions**: Default queue; mock backend on.

**Test Steps**:
1. Navigate to `/cases`. Click row `LNS-2025-555444`.
2. Expand Section 2 → verify `Country = United Kingdom`.
3. Expand Section 2 → `RegulatoryComplianceSection` → verify `Regulation Type = CLOUD Act`.
4. Expand Section 3 → `AuthorizationsSection` → verify `Issuing Authority = Westminster Magistrates' Court`.

**Expected Results**:
- Steps 2–4: Each value renders.

**Pass criteria**: All three UK markers visible.

---

### UAT-UKCOPO-LRMS-SMOKE-B · LNS-2025-555444 — Triage gate refuses to advance without regulatory review

**Capability validated**: `canCompleteTriage` blocks triageComplete when UK case has `regulatoryCompliance.reviewStatus` unset and `eu27DsaHarms = []`.

**Persona**: TS

**Workflow stage**: Triage · InProgress

**Preconditions**: Seed `UKCOPO-LRMS-SMOKE-B` from `LNS-2025-555444` with `regulatoryCompliance.reviewStatus=null`, `eu27DsaHarms=[]`.

**Test Steps**:
1. Open the case. Hover **Complete Triage**.
2. Read the tooltip.

**Expected Results**:
- Step 2: Tooltip lists `Regulatory compliance review status required` (or equivalent text from `useWorkflowTransitions.triageGateErrors`).

**Pass criteria**: Gate blocks with the named reason.

---

### UAT-UKCOPO-LRMS-SMOKE-C · LNS-2025-555444 — Fulfillment wizard Step 2 — bulk services + date range save

**Capability validated**: Fulfillment wizard Step 2 in Bulk mode accepts a date range + service+category selection and saves without error.

**Persona**: RS

**Workflow stage**: Fulfillment · Wizard

**Preconditions**: Seed case at `Fulfillment · InProgress` with one identifier.

**Test Steps**:
1. Open the case. Section 4 → footer **Open Fulfillment Wizard**.
2. Step 1 → **Next**.
3. Step 2 → set `DataCollectionPeriod` start `2026-01-01`, end `2026-04-22`. Tick Outlook + Basic Subscriber Info.
4. **Next** → Step 3 → **Save**.

**Expected Results**:
- Step 4: Save toast renders; return to `/cases/{id}`.

**Pass criteria**: Plan saves; toast confirms.

---

### UAT-UKCOPO-LRMS-SMOKE-D · LNS-2025-555444 — Submit Fulfillment → Publish landing page renders

**Capability validated**: `submitFulfillment` transitions stage to Publish and the route renders `CollectionPrepDeliveryPage`.

**Persona**: RS

**Workflow stage**: Fulfillment · InProgress → Publish · PublishInProgress

**Preconditions**: Seed case at `Fulfillment · InProgress` with a saved plan.

**Test Steps**:
1. Open the case. `BottomActionBar` → **Submit Fulfillment** → dialog **Submit**.
2. Observe the route swap.

**Expected Results**:
- Step 2: `CollectionPrepDeliveryPage` renders with `CollectionPageHeader` + `FulfillmentPipelineCard`.

**Pass criteria**: Publish landing page renders.

---

### UAT-UKCOPO-LRMS-SMOKE-E · LNS-2025-555444 — Resolve Case dialog → Resolved terminal

**Capability validated**: `ResolveCaseDialog` with default `Resolved` selection transitions the case to terminal `Resolved` state.

**Persona**: RS

**Workflow stage**: Publish · PublishInProgress → Publish · Resolved

**Preconditions**: Seed case at `Publish · PublishInProgress`.

**Test Steps**:
1. Open the case. `CollectionPageHeader` → **Resolve Case**.
2. Default dropdown `Resolved`. Type note. **Resolve Case**.

**Expected Results**:
- Step 2: Success toast; state pill `Resolved`; case read-only.

**Pass criteria**: State `Resolved`.

---

## 7. Sign-off sheet

| Test ID | PASS / FAIL (Blocker) / FAIL (Cosmetic) / N/A | Tester | Date | Notes |
|---------|-----------------------------------------------|--------|------|-------|
| UAT-UKCOPO-LRMS-001 | | | | |
| UAT-UKCOPO-LRMS-002 | | | | |
| UAT-UKCOPO-LRMS-003 | | | | |
| UAT-UKCOPO-LRMS-100 | | | | |
| UAT-UKCOPO-LRMS-101 | | | | |
| UAT-UKCOPO-LRMS-102 | | | | |
| UAT-UKCOPO-LRMS-103 | | | | |
| UAT-UKCOPO-LRMS-104 | | | | |
| UAT-UKCOPO-LRMS-105 | | | | |
| UAT-UKCOPO-LRMS-106 | | | | |
| UAT-UKCOPO-LRMS-107 | | | | |
| UAT-UKCOPO-LRMS-108 | | | | |
| UAT-UKCOPO-LRMS-109 | | | | |
| UAT-UKCOPO-LRMS-110 | | | | |
| UAT-UKCOPO-LRMS-111 | | | | |
| UAT-UKCOPO-LRMS-112 | | | | |
| UAT-UKCOPO-LRMS-113 | | | | |
| UAT-UKCOPO-LRMS-114 | | | | |
| UAT-UKCOPO-LRMS-115 | | | | |
| UAT-UKCOPO-LRMS-116 | | | | |
| UAT-UKCOPO-LRMS-117 | | | | |
| UAT-UKCOPO-LRMS-118 | | | | |
| UAT-UKCOPO-LRMS-200 | | | | |
| UAT-UKCOPO-LRMS-201 | | | | |
| UAT-UKCOPO-LRMS-202 | | | | |
| UAT-UKCOPO-LRMS-203 | | | | |
| UAT-UKCOPO-LRMS-204 | | | | |
| UAT-UKCOPO-LRMS-205 | | | | |
| UAT-UKCOPO-LRMS-206 | | | | |
| UAT-UKCOPO-LRMS-SMOKE-A | | | | |
| UAT-UKCOPO-LRMS-SMOKE-B | | | | |
| UAT-UKCOPO-LRMS-SMOKE-C | | | | |
| UAT-UKCOPO-LRMS-SMOKE-D | | | | |
| UAT-UKCOPO-LRMS-SMOKE-E | | | | |
