# DARS — Mock Case User Acceptance Test (UAT) Document

**Document owner**: DARS Product Team
**Last updated**: 2026-06-08
**Source environment**: DARS eEvidence prototype (`http://localhost:3001`)
**Scope**: All mock cases shipped with the prototype as of this date — 29 cases covering Triage, Review Case, Collection, and Terminal workflow stages, plus dedicated demos for EU eEvidence Workflows 1 / 2 / 3 / 4 / 6 / 7 / 8 and the GFR-enforcement (informational vs RS-blocked) state distinction (UAT-DARS-028 + 029 reuse LNS-2026-00240 / 00250)

---

## 1. Purpose

This document gives Business stakeholders a structured, repeatable way to verify that the DARS prototype implements the agreed law-enforcement-request (LER) handling capabilities. Each mock case in the seed data was created to exercise one specific business capability end-to-end. This document maps each case to:

- The capability it validates
- The persona who would use it
- The preconditions to set up the test
- The exact steps a tester executes
- The expected outcome at each step
- A pass / fail criterion the Business can sign off against

---

## 2. Document conventions

### 2.1 Test ID format
`UAT-DARS-NNN` — sequential, three-digit.

### 2.2 Persona key

| Code | Persona | Day-to-day responsibility |
|---|---|---|
| **TS** | Triage Specialist | Receives new LE requests, validates legal scope, classifies and routes |
| **RS** | Response Specialist | Owns a case end-to-end through fulfillment + delivery |
| **ATT** | Attorney | Reviews escalated cases for legal sign-off, signs Form 3 / Form 6 |
| **LENS** | LENS Lead / Manager | Peer review, scope-approval backstop, queue oversight |

### 2.3 Workflow stages

| Stage label (in nav) | When opened, lands on | Page-level chrome |
|---|---|---|
| **Triage** | `DataEntryForm` | Stage banner: "Triage" + Case Overview accordion |
| **Review Case** | `DataEntryForm` (different stage) | Stage banner: "Review Case" + same Case Overview chrome |
| **Collection** | `CollectionTracker` | Page-top alert zone + job matrix |
| **Terminal** | `DataEntryForm` read-only | "Resolved" / "Rejected" / "Cancelled" / "No Data Provided" chip |

### 2.4 Pass / fail definitions

- **PASS**: Every expected result observed without manual workaround.
- **FAIL (Blocker)**: Expected result missing AND blocks the rest of the test path.
- **FAIL (Cosmetic)**: Expected result missing but business flow can still complete.
- **N/A**: Step cannot be executed in current environment (note reason).

---

## 3. How to use this document

1. Pre-flight: confirm the dev server is up (`http://localhost:3001` returns 200). Confirm you are logged in as **Nicole Garcia** (the prototype's `CURRENT_USER`).
2. Pick a test case by Test ID. Read the **Preconditions** block.
3. Open the All Cases queue and locate the case by **Case ID** (use the search field).
4. Execute the **Test Steps** in order. After each step, confirm the **Expected Results**.
5. Record PASS / FAIL on the **Sign-off sheet** in Section 6.

---

## 4. Case index

| Test ID | Case ID | Scenario | Stage | Persona |
|---|---|---|---|---|
| UAT-DARS-001 | LNS-2025-00095 | Resolved subpoena — fulfillment archive | Terminal · Resolved | RS |
| UAT-DARS-002 | LNS-2025-00103 | Search Warrant — "No Data Provided" path | Terminal · No Data | RS |
| UAT-DARS-003 | LNS-2025-00125 | UK preservation — attorney-assigned scope review | Review Case | ATT, RS |
| UAT-DARS-004 | LNS-2025-00142 | Emergency Disclosure — kidnapping, threat-to-life | Triage | TS, ATT |
| UAT-DARS-005 | LNS-2025-00147 | Subpoena — LE cancellation mid-cycle | Terminal · Cancelled | RS |
| UAT-DARS-006 | LNS-2026-00150 | German eEvidence — clean Enterprise EPOC | Triage | TS, RS |
| UAT-DARS-007 | LNS-2026-00160 | UK COPO — LE-name service mapping, CSE-exempt | Triage | TS, ATT |
| UAT-DARS-008 | LNS-2026-00170 | UK COPO — clean walkthrough (rehearsal case) | Triage | TS, RS |
| UAT-DARS-009 | LNS-2026-00180 | Spanish eEvidence — Validating Authority path | Triage | TS, ATT |
| UAT-DARS-010 | LNS-2026-00190 | German eEvidence — Consumer/Enterprise manifest error | Collection | RS |
| UAT-DARS-011 | LNS-2026-00200 | French eEvidence — Inform-Controller notification | Collection | RS, ATT |
| UAT-DARS-012 | LNS-2026-00210 | Italian eEvidence — inverse manifest error | Triage | TS |
| UAT-DARS-013 | LNS-2026-00220 | Dutch EPOC-PR — preservation-only pipeline | Collection | RS |
| UAT-DARS-014 | LNS-2026-00230 | Dutch EPOC-ER — linkage to prior EPOC-PR | Triage | TS |
| UAT-DARS-017 | LNS-2026-00255 | Belgian eEvidence — EA clears + failed-delivery retry | Collection | RS |
| UAT-DARS-018 | LNS-2026-00265 | Greek eEvidence — EA overrules Form 3 | Collection | RS, ATT |
| UAT-DARS-019 | LNS-2026-00270 | Swedish eEvidence — manual vs automated jobs | Collection | RS |
| UAT-DARS-020 | LNS-2026-00300 | US Subpoena — multi-tenant TPID attorney scope | Triage | TS, ATT |
| UAT-DARS-021 | LNS-2026-984174 | Rejected subpoena — civil matter, insufficient legal authority | Terminal · Rejected | RS |
| UAT-DARS-022 | LNS-2026-00280 | Portuguese eEvidence — Workflow 8 IA Withdrawal (mid-collection) | Collection | RS |
| UAT-DARS-023 | LNS-2026-00215 | Spanish EPOC-PR — Workflow 4 Active Preservation Order (Form 2 receipt + ack) | Collection | RS |
| UAT-DARS-024 | LNS-2026-00245 | Italian eEvidence — Workflow 2 Active EA Review Window | Collection | RS |
| UAT-DARS-025 | LNS-2026-00247 | French eEvidence — Workflow 2 EA Window Lapsed + Resume Delivery | Collection | RS |
| UAT-DARS-026 | LNS-2026-00130 | Irish eEvidence — Workflow 1 Standard Production National (default happy path) | Collection | RS |
| UAT-DARS-027 | LNS-2026-00140 | German eEvidence — Workflow 3 Emergency Production 8h (Art. 9(2)) | Collection | RS |
| UAT-DARS-028 | LNS-2026-00240 | Italian eEvidence — RS enforces Full GFR via Block Delivery CTA | Collection | RS |
| UAT-DARS-028 | LNS-2026-00310 | Romania — eEvidence · EPOC ER (placeholder — please author) | Triage | TBD |
| UAT-DARS-029 | LNS-2026-00250 | Polish eEvidence — RS enforces Partial GFR via Block Delivery CTA | Collection | RS |
| UAT-DARS-030 | LNS-2026-00320 | United States — Subpoena (placeholder — please author) | Triage | TBD |

---

## 4.5 EU eEvidence decision tree

This tree explains *why* the eEvidence cases produce the expected results testers see. DARS routes every eEvidence case through one of the eight Appendix F workflows. Each routing decision is driven by data already on the case envelope plus the inbound events that follow. When a test case's expected results reference a banner, chip, or audit event, this tree tells you the routing rule that produced it.

```
On case open
│
├── requestType ≠ "eEvidence"
│   └── Not in scope (subpoena / COPO / warrant flows — see UATs 001–005, 020, 021)
│
└── requestType === "eEvidence"
    │
    ├── caseStage === "Withdrawn"  OR
    │   authorizationDesiredStatus === "Withdrawn"  OR
    │   audit has `EpocWithdrawn` event
    │   ├── ► Workflow 8 — IA Withdrawal (terminal)
    │   ├── Banner:  red WithdrawalBanner at top of stack
    │   ├── Chip:    Retention chip (45-day clock from effective date)
    │   ├── Gates:   gfrApplies() returns false → GFR panel hidden, delivery
    │   │            gates lifted (case is terminal)
    │   ├── Pipeline: pending + ready-to-deliver jobs flipped to Cancelled;
    │   │             already-delivered jobs untouched
    │   └── UATs:    UAT-DARS-022 (LNS-2026-00280)
    │
    ├── requestSubType === "EPOC PR"
    │   ├── ► Workflow 4 — Preservation Order (collection-only pipeline)
    │   ├── Banner:  PreservationOrderActiveBanner (top) — until preservation ends
    │   ├── Pipeline: Package + Delivery stages hidden; per-identifier
    │   │             `desiredPreservationExpiration` shown on each row
    │   ├── Then routes by next inbound event:
    │   │   ├── PreservationOrder (Form 2)        → PreservationOrderReceived audit
    │   │   ├── PreservationExtension (Form 6)    → bumps expiry + green extension banner
    │   │   ├── Form5_ConfirmationOfIssuance      → links to follow-on EPOC-ER
    │   │   ├── EndPreservation                   → EndPreservationBanner +
    │   │   │                                       Retention chip ("PreservationEnded")
    │   │   └── Withdrawal                        → Workflow 8 supersedes (above)
    │   ├── If SP cannot preserve  → Submit Form 3 (Workflow 7 — see below)
    │   └── UATs:    UAT-DARS-013 (LNS-2026-00220), and Workflow 4 demo
    │                LNS-2026-00215 (Spanish active preservation — bridge case)
    │
    └── requestSubType === "EPOC ER"  (production order)
        │
        ├── isInternational === true (cross-border EPOC, EA review applies)
        │   │
        │   ├── eevidenceGroundsForRefusal.decision === undefined
        │   │   │
        │   │   ├── isWindowLapsed(formData) === false  (Day 1–10)
        │   │   │   ├── ► Workflow 2 — Active EA Review Window
        │   │   │   ├── Chip:   "EA REVIEW WINDOW · Nd"
        │   │   │   ├── Panel:  Purple GFR Panel with countdown
        │   │   │   ├── Gates:  Submit-to-Delivery DISABLED with tooltip
        │   │   │   │           "Action blocked — EA review window active."
        │   │   │   ├── Collection: still allowed (only delivery is gated)
        │   │   │   └── Demo case: LNS-2026-00245 (Italian, 5 days remaining)
        │   │   │
        │   │   └── isWindowLapsed(formData) === true   (Day 11+, no decision)
        │   │       │
        │   │       ├── manualDeliveryResumed === false
        │   │       │   ├── ► Workflow 2 — Window Lapsed, awaiting RS resume
        │   │       │   ├── useEaWindowExpiry hook auto-fires EaWindowExpired audit
        │   │       │   ├── Panel:  Green "delivery is now permitted (Art. 8 + 10(2))"
        │   │       │   │           + Resume Delivery CTA
        │   │       │   ├── Chip:   "EA window lapsed · resume delivery" (warn)
        │   │       │   ├── Gates:  Submit-to-Delivery still disabled until RS clicks Resume
        │   │       │   └── Demo case: LNS-2026-00247 (French, expired 2 days ago)
        │   │       │
        │   │       └── manualDeliveryResumed === true (RS clicked Resume)
        │   │           ├── ► Workflow 2 — Lapsed, delivery resumed
        │   │           ├── Audit: GfrDeliveryResumedManually appended
        │   │           ├── Chip:  "EA window lapsed · delivery resumed" (success)
        │   │           └── Gates: Submit-to-Delivery RE-enabled
        │   │
        │   ├── eevidenceGroundsForRefusal.decision.kind === "None"
        │   │   ├── trigger === "Form1Review"
        │   │   │   ├── ► EA cleared (Workflow 2 happy path)
        │   │   │   ├── Auto-appends `GfrCleared` audit (via useEaWindowExpiry hook)
        │   │   │   ├── Panel:  Green "EA cleared this case"
        │   │   │   └── Demo case: LNS-2026-00255 (Belgian, Form1Review)
        │   │   │
        │   │   └── trigger === "Form3Response"
        │   │       ├── ► Workflow 7 — EA rejected SP's Form 3
        │   │       ├── Panel:  Orange "EA rejected your Form 3" + Retract CTA
        │   │       ├── Gate:   Retract gated until attorney clears review
        │   │       └── Demo case: UAT-DARS-018 (LNS-2026-00265, Greek)
        │   │
        │   ├── eevidenceGroundsForRefusal.decision.kind === "Full"
        │   │   │
        │   │   ├── eevidenceGroundsForRefusal.enforcementApplied !== true  (RS still deciding)
        │   │   │   ├── ► Workflow 6 — Full GFR received, RS reviewing
        │   │   │   ├── Panel:   Red "Full Grounds for Refusal — review the EA's decision"
        │   │   │   ├── Chip:    "SLA paused · EA Hold — Full"
        │   │   │   ├── Gates:   Delivery NOT auto-blocked — RS retains discretion
        │   │   │   │            to dispute the refusal. EA's reasons + RS action
        │   │   │   │            CTA "Block Delivery (case-wide)" surface on the panel.
        │   │   │   └── Demo case: UAT-DARS-015 (LNS-2026-00240, Italian — informational state)
        │   │   │
        │   │   └── eevidenceGroundsForRefusal.enforcementApplied === true  (RS enforced)
        │   │       ├── ► Workflow 6 — Full GFR enforced by RS
        │   │       ├── Panel:   Red "Full Grounds for Refusal — delivery blocked"
        │   │       │            + confirmation chip showing actor + date
        │   │       ├── Chip:    "SLA paused · EA Hold — Full" (unchanged)
        │   │       ├── Gates:   `canDeliver()` returns false → all delivery
        │   │       │            actions disabled; per-row + toolbar gates fire.
        │   │       ├── Audit:   `GfrEnforced` event (scope: case-wide)
        │   │       └── Demo case: UAT-DARS-028 (LNS-2026-00240, post-enforcement)
        │   │
        │   └── eevidenceGroundsForRefusal.decision.kind === "Partial"
        │       │
        │       ├── eevidenceGroundsForRefusal.enforcementApplied !== true  (RS still deciding)
        │       │   ├── ► Workflow 6 — Partial GFR received, RS reviewing
        │       │   ├── Panel:   Amber "Partial Grounds for Refusal — N task(s) blocked"
        │       │   │            + RS action CTA "Block Delivery for these N identifier(s)"
        │       │   ├── Chip:    "Partial GFR — N task(s) blocked"
        │       │   ├── Gates:   Per-identifier delivery NOT auto-blocked —
        │       │   │            `identifierBlockedByPartialGfr()` returns false
        │       │   │            until the RS enforces the block.
        │       │   └── Demo case: UAT-DARS-016 (LNS-2026-00250, Polish — informational state)
        │       │
        │       └── eevidenceGroundsForRefusal.enforcementApplied === true  (RS enforced)
        │           ├── ► Workflow 6 — Partial GFR enforced by RS
        │           ├── Panel:   Amber panel + confirmation chip
        │           │            showing actor + date + identifier count
        │           ├── Gates:   Listed identifiers' delivery actions
        │           │            greyed via the per-identifier helper;
        │           │            non-listed identifiers continue to deliver.
        │           ├── Audit:   `GfrEnforced` event (scope: N target identifiers)
        │           └── Demo case: UAT-DARS-029 (LNS-2026-00250, post-enforcement)
        │
        └── isInternational === false (national EPOC, no EA review)
            │
            ├── casePriority === "Emergency"  AND  eevidenceWorkflow === 3
            │   ├── ► Workflow 3 — Emergency Production (Art. 9(2), 8h SLA)
            │   ├── Banner:   red EmergencyEEvidenceBanner with IA's
            │   │             stated emergency category + justification
            │   ├── SLA tier: getSlaConfig() swaps Emergency from 3h → 8h
            │   │             via SlaContext shim (requestType + workflow)
            │   ├── Chip:     Approaching (amber) once remaining ≤ 2h
            │   ├── Pipeline: full Collection → Package → Delivery
            │   ├── EEvidenceAuthorisationFlags.emergencyJustification
            │   │             carries category {DangerToLife |
            │   │             DangerOfInjury | CriticalInfrastructure} + note
            │   └── Demo case: LNS-2026-00140 (German BKA kidnapping)
            │
            └── ► Workflow 1 — Standard Production (National)
                ├── Pipeline:  full Collection → Package → Delivery
                ├── No GFR panel renders
                ├── SLA tier: Routine (10 days) per Art. 9(1)
                ├── Default eEvidence happy path — baseline for all other workflows
                └── Demo case: LNS-2026-00130 (Irish DPP)

Triggered at any point (overlay on the above):
│
├── SP submits Form 3 (EPOC_FORM_3 outbound)
│   ├── ► Workflow 7 — Non-Execution Response
│   ├── On send:
│   │   ├── pauseSlaTimerOnFormThreeSubmission → SLAStopped audit
│   │   ├── applyForm3Submission → Form3Submitted audit
│   │   └── startRetentionClock("Form3NonExecution", sentAt) → 45-day clock
│   ├── Chip:   Retention chip lights up in sticky header
│   ├── On EPOC-PR cases: "Cannot Preserve" CTA on Preservation column
│   │                     pre-attaches EPOC_FORM_3 in the composer
│   └── Reuses the Form 3 template — reason codes include the new
│       "dataNotHeld" option for preservation-failure scenarios
│
└── All pipeline jobs reach terminal delivered state
    ├── (Complete OR DeliveryAcknowledged on every job)
    ├── ► startRetentionClock("Delivered", now) → 45-day clock
    └── Chip:   Retention chip lights up automatically
```

### How to read this tree when interpreting a UAT result

- **Banner present?** Trace down the tree: each branch lists the banner that renders. A missing banner usually means the case didn't reach that workflow state OR a prerequisite is missing (e.g., `eevidenceWorkflow` undefined, wrong `requestSubType`).
- **Delivery button disabled?** Three places gate it: (1) `canDeliver()` checking GFR + lapsed window, (2) `cancellationLocked`, (3) `caseStage === "Withdrawn"`. The button label tells you which.
- **Retention chip showing?** The reason in the tooltip identifies which terminal event started it. If the chip's missing on a terminal case, check whether the clock started — the `startRetentionClock` helper is idempotent but only fires when called.
- **Audit event missing?** Each workflow appends specific audit kinds via specific paths. The most common gap is an unfired auto-detection hook (e.g., `useEaWindowExpiry` requires a mounted CollectionTracker/DataEntryForm).

---

## 5. Test cases

> Each test below assumes you have already verified the dev server is up and opened the All Cases queue from the left navigation rail.

---

### UAT-DARS-001 · LNS-2025-00095 — Resolved subpoena: fulfillment archive

**Capability validated**: Resolved-case archival pathway; queue card terminal state.

**Persona**: RS

**Workflow stage**: Terminal · Resolved

**Case shape**: US / State / Subpoena · 4 identifiers (2 email + 1 phone + 1 address) · mixed Consumer + Enterprise

**Preconditions**:
1. Default queue filters (no filter applied).

**Test Steps**:
1. In the queue, type "00095" into the search field; the row for LNS-2025-00095 appears.
2. Observe the row's stage column and operational badges.
3. Click the row to open the case.
4. Read the sticky case header.

**Expected Results**:
- Queue row stage column reads **"Resolved"**.
- Operational badges show no urgent flags (no GFR, no escalation chip, no unread).
- Case opens read-only — no editable fields, no Begin Triage CTA.
- Sticky header chip reads **"Resolved"**.
- Identifier table shows all 4 identifiers with terminal Complete / DeliveryAcknowledged statuses.

**Pass criteria**: All four expected results visible without scroll workaround.

---

### UAT-DARS-002 · LNS-2025-00103 — Search Warrant: "No Data Provided" path

**Capability validated**: No-data terminal branch; queue signaling for data-unavailability.

**Persona**: RS

**Workflow stage**: Terminal · No Data Provided

**Case shape**: Australia / State / Search Warrant · 2 identifiers (1 email + 1 phone) · Enterprise

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Search "00103"; open the case.
2. Navigate to the Collection page.
3. Inspect the per-job status badges on the collection rows.

**Expected Results**:
- Sticky header shows **"No Data Provided"** chip.
- All collection rows display **"No Data"** terminal badges.
- Delivery / Form 3 / Resolve buttons are disabled.

**Pass criteria**: Terminal state visible; no action buttons enabled.

---

### UAT-DARS-003 · LNS-2025-00125 — UK preservation: attorney-assigned scope review

**Capability validated**: Tier 3 Lawyer-Assigned escalation path; collection gated until attorney clears.

**Persona**: ATT (primary), RS (secondary)

**Workflow stage**: Review Case · In Review

**Case shape**: UK / National / Preservation Request · 1 Enterprise email identifier (Globex UK treasury mailbox)

**Preconditions**:
1. Open the Attorney Dashboard from the left rail.
2. Confirm LNS-2025-00125 appears in the dashboard list with **Michael Chen** in the Escalated To column.

**Test Steps**:
1. From the Attorney Dashboard, click into LNS-2025-00125.
2. Observe the page-top alert zone (above Case Overview).
3. Click "Review now →" on the Attorney Review Required banner.
4. Inspect the AttorneyReviewPanel inside Case Overview.
5. Navigate to the identifier row in the Identifier table.

**Expected Results**:
- Step 2: Page-top alert zone shows the purple **"Attorney review required"** banner with status `Pending review` and Assigned to: `Michael Chen`.
- Step 3: Case Overview accordion auto-expands (if collapsed) and the AttorneyReviewPanel scrolls into view.
- Step 4: AttorneyReviewPanel displays the reason (preservation-hold scope), action buttons (Approve / Request Info / Block).
- Step 5: Identifier row's taskStatus reads **"Attorney Review"**.

**Pass criteria**: All four expected results — particularly the page-top compact alert and the scroll-into-view behavior of "Review now →".

---

### UAT-DARS-004 · LNS-2025-00142 — Emergency Disclosure: kidnapping / threat-to-life

**Capability validated**: Emergency (P0) priority handling; threat-to-life signaling; multi-identifier attorney clearance gate; Consumer User Locations populated via Check Accounts.

**Persona**: TS (primary), ATT (secondary)

**Workflow stage**: Triage · Waiting on Triage

**Case shape**: US / Federal / Emergency Disclosure · 3 identifiers (email + phone + address) · Consumer

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Confirm the case is pinned to the **top of the queue** under sort = Priority desc.
2. Inspect the row's priority badge + operational badges.
3. Open the case; inspect the sticky case-header chip and the Operational signals row inside the preview pane (re-pick the case if needed).
4. Inside the case, look at each identifier's row.
5. Look at the page-top alert zone for an Attorney review required banner.
6. Click **Check Accounts** on the identifier table to populate Consumer User Locations.
7. Inspect the "Consumer User Location Summary" column on each row.
8. Open the case in the Attorney Dashboard view. Expand the email identifier row → confirm the inline AttorneyReviewPanel + the Consumer User Locations link surfaces.
9. Click **Consumer User Locations** on the email row → drawer opens.

**Expected Results**:
- Step 1: Row appears at top with red **P0 Emergency** badge.
- Step 2: Operational badges include a red **Threat to life** chip.
- Step 3: Sticky-header chip + Operational signals row both surface Emergency + Threat to life.
- Step 4: All three identifiers carry the **"Attorney Review"** taskStatus.
- Step 5: Attorney review required banner present in page-top zone.
- Step 6 toast: *"Account check complete: 3 of 3 accounts found"*.
- Step 7: Email + phone rows render `Country / City · Mmm d, yyyy h:mm AM` (most recent login from the seeded LOGIN_EVENTS). The address identifier shows `—` or `Run Check Accounts to populate` — addresses don't generate logins (realistic empty path).
- Step 8: Inline AttorneyReviewPanel renders the case-scoped escalation. The **Consumer User Locations** button is visible on the row's Actions column (not on the address row — Consumer-only gate).
- Step 9: Panel header reads **"Consumer User Locations"** (not "Login Location History"). No From/To inputs and no Look up locations button — read-only viewer driven by Check Accounts.

**Pass criteria**: All emergency signaling visible *before* the case is opened; case form gates identifier action behind attorney clearance; Consumer User Locations populates on Check Accounts (no separate fetch) and renders only on Consumer rows.

---

### UAT-DARS-005 · LNS-2025-00147 — Subpoena: LE cancellation mid-cycle

**Capability validated**: Cancellation pathway; LE-side cancel signal propagation; audit trail.

**Persona**: RS

**Workflow stage**: Terminal · Cancelled

**Case shape**: France / National / Subpoena · 3 identifiers (2 email + 1 phone) · Enterprise

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Search "00147"; open the case.
2. Inspect the sticky header.
3. Open Case Overview and scroll to the Audit Thread.
4. Navigate to the Collection page and inspect the job rows.

**Expected Results**:
- Step 2: Sticky header reads **"Cancelled"**.
- Step 3: Audit Thread shows a cancellation event with the LE contact email.
- Step 4: All Collection job rows display **"Cancelled"** status.

**Pass criteria**: Cancellation state propagated to all three surfaces (header / audit / collection).

---

### UAT-DARS-006 · LNS-2026-00150 — German eEvidence: clean Enterprise EPOC

**Capability validated**: EU eEvidence intake (Forms & Letters); EPOC Form 3 template availability; Enterprise happy-path classification (IA Q1 + Q2 = YES, Check Accounts confirms Enterprise); Enterprise Org Home Location In-jurisdiction chip.

**Persona**: TS (primary), RS (secondary), ATT (Enterprise Org review)

**Workflow stage**: Triage · Waiting on Triage

**Case shape**: Germany / National / eEvidence (EPOC ER) · 2 Enterprise email identifiers (Kontoso GmbH)

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case; inspect the Authorization Details accordion + the Enterprise Request card.
2. Open the Forms & Letters sidebar.
3. Confirm there is no `ManifestErrorWarningBanner` in the page-top alert zone.
4. Open the case from the Attorney Dashboard. Inspect the Enterprise Org stripe in the tri-pane.
5. Expand the Enterprise Context section and inspect the single OrgPanel.
6. Inspect the IdentifierTable "Consumer User Location Summary" column.

**Expected Results**:
- Step 1: Authorization Details shows IA + EA blocks pre-filled. Enterprise Request card shows Q1 = YES, Q2 = YES, processor reasons populated.
- Step 2: EPOC **Form 3 (Non-Execution Response)** is selectable as a template.
- Step 3: No manifest-error banner present.
- Step 4: Tri-pane Enterprise Org row reads "Kontoso GmbH (kontoso-de.example)", Parent TPID **"Kontoso Holdings"**, Org Home Location row shows **Germany + In-jurisdiction** chip (German tenant matches German issuing authority). No "+ more tenants" badge.
- Step 5: Single OrgPanel — no "Tenant N of M" suffix on the title (single-tenant case). Parent TPID row visible. View Prior Tenant History button shows count `1` and **no** TPID rollup chip (single tenant).
- Step 6: Both Enterprise rows display em-dash (`—`) in the Consumer User Location Summary column — Enterprise identifiers don't surface per-user IP geo; the cross-border signal lives on the Org Home Location chip instead.

**Pass criteria**: Clean enterprise EPOC cascade with no warnings; Form 3 available on demand; In-jurisdiction chip confirms tenant + issuing authority alignment; column correctly hides Consumer User Locations for Enterprise rows.

---

### UAT-DARS-007 · LNS-2026-00160 — UK COPO: LE-name service mapping + CSE-exempt

**Capability validated**: External → internal LENS service name resolver; CSE-exempt disclosure auto-routing.

**Persona**: TS (primary), ATT (secondary)

**Workflow stage**: Triage · Waiting on Triage

**Case shape**: UK / National / COPO Order · 1 Consumer email identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case; advance to Step 2 (Service Configuration).
2. Observe the LE-facing service names ("Email", "Microsoft Account Profile", "Teams", "OneDrive") + the internal LENS keys they resolve to.
3. Return to Case Overview and inspect the identifier row.
4. Check the Attorney Review Required banner state in the page-top zone.

**Expected Results**:
- Step 2: Service mapping UI shows each LE name mapped to one or more internal keys (e.g. Email → `exchangeConsumer` + `msaProfile`).
- Step 3: Identifier carries a purple **"Exempt: Child Sexual Exploitation"** chip.
- Step 4: Attorney review required banner is present (CSE-exempt path auto-escalates).

**Pass criteria**: Resolver maps all 4 LE names without manual intervention; CSE-exempt chip visible.

---

### UAT-DARS-008 · LNS-2026-00170 — UK COPO: clean walkthrough (rehearsal case)

**Capability validated**: Clean Triage → Review → Collection flow for demo rehearsal; no edge-case chrome.

**Persona**: TS (primary), RS (secondary)

**Workflow stage**: Triage · Waiting on Triage

**Case shape**: UK / National / COPO Order · 1 Consumer email identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Confirm no escalation, manifest, or GFR banners render anywhere.
3. Walk Triage → Review Case → Collection using the workflow nav stages. Confirm each stage opens without an alert blocking progress.

**Expected Results**:
- Step 2: Page-top alert zone shows only the Correspondence Hub banner.
- Step 3: All three stages reachable; each shows the standard chrome.

**Pass criteria**: Full pipeline walkable with no blocker banners. This is the rehearsal case for live demos.

---

### UAT-DARS-009 · LNS-2026-00180 — Spanish eEvidence: Validating Authority path

**Capability validated**: Conditional Validating Authority subsection on Authorization Details; "Other Competent Authority" trigger.

**Persona**: TS (primary), ATT (secondary)

**Workflow stage**: Triage · Waiting on Triage

**Case shape**: Spain / National / eEvidence · 1 Consumer email identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case; expand the Authorization Details accordion.
2. Observe the Validating Authority subsection.
3. Inspect the Enterprise Request card.

**Expected Results**:
- Step 2: Validating Authority block visible (Issuing Authority = Mossos d'Esquadra regional police; Validating Authority = Investigating Judge of the Audiencia Nacional).
- Step 3: Enterprise Request card shows only the controller-route checkbox checked (no processor branch).

**Pass criteria**: VA subsection only renders when IA role = "Other Competent Authority" — and it does here.

---

### UAT-DARS-010 · LNS-2026-00190 — German eEvidence: Consumer/Enterprise manifest error

**Capability validated**: Manifest error detection (IA claims Enterprise, Microsoft detects Consumer); Form 3 manifest-errors reason auto-population.

**Persona**: RS

**Workflow stage**: Review Case · In Progress

**Case shape**: Germany / Federal / eEvidence · 1 Consumer email identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Inspect the page-top alert zone for `ManifestErrorWarningBanner`.
3. Click the **"Issue Form 3"** CTA on the banner.
4. Confirm the Form 3 reason pre-selection.

**Expected Results**:
- Step 2: Orange `ManifestErrorWarningBanner` reads "EPOC claims Enterprise but account is Consumer".
- Step 3: Form 3 dialog opens.
- Step 4: Reason dropdown is pre-selected to a manifest-error reason.

**Pass criteria**: Banner direction = "EPOC-claims-Enterprise"; Form 3 reason wired.

---

### UAT-DARS-011 · LNS-2026-00200 — French eEvidence: Inform-Controller notification

**Capability validated**: "Notify the Controller" path for Enterprise tenant; tenant admin contact discovery; held outbound Form 3.

**Persona**: RS (primary), ATT (secondary)

**Workflow stage**: Review Case · In Progress

**Case shape**: France / National / eEvidence · 1 Enterprise email identifier (contoso-fr.onmicrosoft.com)

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Inspect the page-top alert zone for `InformControllerNoticeBanner`.
3. Confirm the tenant admin contact (e.g. `admin@contoso-fr.fr`) is displayed.
4. Inspect the Attorney Review Required banner state.

**Expected Results**:
- Step 2: Banner reads "Notify the Controller — Send email to ..." with the tenant admin contact embedded.
- Step 3: Admin email + copy CTA both render.
- Step 4: Attorney review required banner present (Form 3 outbound held in Draft).

**Pass criteria**: Banner surfaces controller contact; outbound Form 3 visible as held in correspondence.

---

### UAT-DARS-012 · LNS-2026-00210 — Italian eEvidence: inverse manifest error

**Capability validated**: Manifest error in the reverse direction (IA does NOT claim Enterprise, Microsoft DOES detect Enterprise).

**Persona**: TS

**Workflow stage**: Triage · Waiting on Triage

**Case shape**: Italy / National / eEvidence · 1 Enterprise email identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Inspect the page-top alert zone for `ManifestErrorWarningBanner`.
3. Read the banner's direction copy.

**Expected Results**:
- Step 2: Orange banner present.
- Step 3: Direction copy reads "Account is Enterprise but EPOC doesn't claim Enterprise".

**Pass criteria**: Same banner family as UAT-010 but mirrored direction.

---

### UAT-DARS-013 · LNS-2026-00220 — Dutch EPOC-PR: preservation-only pipeline

**Capability validated**: EPOC-PR collapses pipeline to Collection only; per-identifier `desiredPreservationExpiration` rendering.

**Persona**: RS

**Workflow stage**: Collection · In Progress

**Case shape**: Netherlands / National / eEvidence (EPOC PR) · 2 identifiers (Consumer + Enterprise email)

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case; confirm it lands on the Collection page.
2. Observe whether Publish / Delivery sub-tabs are present in the CollectionTracker.
3. Inspect each identifier row for the preservation expiration date.

**Expected Results**:
- Step 2: Only **Collection** tab visible; Publish + Delivery tabs hidden.
- Step 3: Each row displays read-only "Preserve until: [ISO date]" — 6-month window for Consumer, 12-month for Enterprise.

**Pass criteria**: EPOC-PR cases hide downstream stages; preservation expiration visible per identifier.

---

### UAT-DARS-014 · LNS-2026-00230 — Dutch EPOC-ER: linkage to prior EPOC-PR

**Capability validated**: EPOC-PR → EPOC-ER linkage via `eevidenceRelatedCases`; back-pointer rendering.

**Persona**: TS

**Workflow stage**: Triage · Waiting on Triage

**Case shape**: Netherlands / National / eEvidence (EPOC ER) · 2 identifiers (Consumer + Enterprise email)

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Locate the Related Cases panel inside Case Identification.
3. Click the LNS-2026-00220 link.

**Expected Results**:
- Step 2: Related Cases panel shows entry pointing to LNS-2026-00220 with the relationship label "Follow-on to EPOC-PR".
- Step 3: Clicking the link routes to the parent preservation case.

**Pass criteria**: Back-pointer visible and navigable.

---

### UAT-DARS-015 · LNS-2026-00240 — Italian eEvidence: Full GFR (EA Hold)

**Capability validated**: Full GFR informational state — EA's decision surfaced WITHOUT auto-blocking delivery. RS retains discretion via the "Block Delivery (case-wide)" CTA. SLA pauses on Full GFR receipt; delivery gating is a separate user action validated by UAT-DARS-028.

**Persona**: RS (primary), ATT (secondary)

**Workflow stage**: Collection · In Progress

**Case shape**: Italy / National / eEvidence · 1 Enterprise email identifier (member of parliament)

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Inspect the page-top alert zone for `GroundsForRefusalPanel`.
3. Read the sticky header chip.
4. Inspect the SLA chip in the sticky header.
5. Inspect the Submit-to-Delivery / Block Delivery toolbar buttons in CollectionTracker.
6. Open Case Overview → Audit Thread.

**Expected Results**:
- Step 2: Red Full-GFR card headlined **"Full Grounds for Refusal — review the EA's decision"** with reason `ImmunitiesOrPrivileges (Art. 12(1)(a))` and a primary red **"Block Delivery (case-wide)"** CTA button.
- Step 3: Sticky header shows red **"EA Hold — Full"** chip.
- Step 4: SLA chip displays paused state.
- Step 5: Submit-to-Delivery / Block Delivery toolbar buttons remain ENABLED — the case is not auto-blocked. The toolbar Block Delivery button reads "Block Delivery" (clickable), NOT "Blocked — GFR enforced."
- Step 6: Audit Thread carries `GfrReceived` event; no `GfrEnforced` event yet.

**Pass criteria**: Full GFR is informational — panel renders the EA's reasons + action CTA; delivery actions remain clickable. SLA pauses but no auto-gating fires. UAT-DARS-028 covers the post-enforcement state.

---

### UAT-DARS-016 · LNS-2026-00250 — Polish eEvidence: Partial GFR + journalist immunity

**Capability validated**: Partial GFR informational state — EA's per-identifier veto list surfaced WITHOUT auto-blocking. RS reviews and decides via "Block Delivery for these N identifier(s)" CTA. Per-identifier gating fires only post-enforcement (validated by UAT-DARS-029).

**Persona**: RS (primary), ATT (secondary)

**Workflow stage**: Collection · In Progress

**Case shape**: Poland / National / eEvidence · 3 identifiers (2 email + 1 phone) · mixed Consumer/Enterprise

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Inspect the page-top alert zone for `GroundsForRefusalPanel`.
3. Identify the journalist identifier (LDID-100002) inside CollectionTracker.
4. Compare the action buttons / per-row state on the journalist row vs. the witness + phone rows.
5. Inspect the SLA chip in the sticky header.

**Expected Results**:
- Step 2: Amber Partial-GFR panel listing the blocked LDTask + reason `FreedomOfPressOrExpression`, with a primary amber **"Block Delivery for these 1 identifier"** CTA below the blocked-identifiers list.
- Step 3: Journalist row clearly identifiable.
- Step 4: Journalist row appears the same as the witness + phone rows — no auto-grey, no per-row lock. All three rows show clickable delivery actions.
- Step 5: SLA chip is **unchanged** (Partial does NOT pause SLA).

**Pass criteria**: Partial GFR is informational — panel renders the EA's list + action CTA; per-identifier delivery actions remain unblocked. UAT-DARS-029 covers the post-enforcement state where the listed identifier becomes greyed.

---

### UAT-DARS-017 · LNS-2026-00255 — Belgian eEvidence: EA clears + failed-delivery retry

**Capability validated**: Explicit `EPOCNoGroundsForRefusalInformation`; FailedDeliveryBanner + Retry Delivery dialog.

**Persona**: RS

**Workflow stage**: Collection · In Progress

**Case shape**: Belgium / National / eEvidence · 1 Consumer email identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Inspect the page-top alert zone.
3. Click "Retry Delivery" on the FailedDeliveryBanner.
4. Inside CollectionTracker, locate the 4 seeded jobs (Failed / Acknowledged / Complete / Publishable).
5. Open Case Overview → Audit Thread.

**Expected Results**:
- Step 2: Green `GroundsForRefusalPanel` "EA cleared this case" + amber `FailedDeliveryBanner` both present.
- Step 3: Retry dialog opens with the failed job pre-selected.
- Step 4: All 4 jobs visible in their respective states (Failed = ✕, Acknowledged = ✓✓, Complete = ✓, Publishable = pending publish).
- Step 5: Audit Thread carries `GfrCleared` event.

**Pass criteria**: Both clearance + retry surfaces operate; all 4 demo job states visible.

---

### UAT-DARS-018 · LNS-2026-00265 — Greek eEvidence: EA overrules Form 3

**Capability validated**: Form 3 rejection by EA (inverse GFR); Retract Form 3 path; auto-escalation.

**Persona**: RS (primary), ATT (secondary)

**Workflow stage**: Collection · In Progress

**Case shape**: Greece / National / eEvidence · 1 Consumer email identifier (Athens-based, NYC trip in geo history)

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Inspect the page-top alert zone for `GroundsForRefusalPanel`.
3. Read the sticky header chip.
4. Click "Retract Form 3" CTA on the GFR panel.
5. Inspect the page-top alert zone for the Attorney review required banner.

**Expected Results**:
- Step 2: Orange `GroundsForRefusalPanel` reads "EA rejected your Form 3 — production required".
- Step 3: Sticky header shows **"EA rejected Form 3"** chip.
- Step 4: Confirmation dialog opens (or Phase B stub fires).
- Step 5: Attorney review required banner present (auto-escalation fired).

**Pass criteria**: Inverse GFR + auto-escalation both visible.

---

### UAT-DARS-019 · LNS-2026-00270 — Swedish eEvidence: manual vs automated jobs

**Capability validated**: CollectionTracker Manual vs Automated category breakdown; per-category status tracking.

**Persona**: RS

**Workflow stage**: Collection · In Progress

**Case shape**: Sweden / National / eEvidence · 1 Consumer email identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case; land on Collection.
2. Confirm 4 Consumer services are enabled on the identifier (MSA Profile, Exchange Consumer, OneDrive Consumer, Teams for Life).
3. Inspect the Collection summary chips at the top of the page.
4. Inspect individual job rows for manual category badges.
5. Confirm the mix of statuses across jobs.

**Expected Results**:
- Step 3: Summary chips display "5 automated · 5 manual" counts.
- Step 4: Manual jobs (Basic Billing, 2FA/MFA/Proof, Detailed Billing, Teams Live Intercept, OneDrive Content) display a manual badge / hand icon.
- Step 5: Statuses span Not Started → In Progress → Complete → DeliveryAcknowledged across the 10 jobs.

**Pass criteria**: Manual vs Automated breakdown visible with correct counts; status spread present.

---

### UAT-DARS-020 · LNS-2026-00300 — US Subpoena: multi-tenant TPID attorney scope + prior-history rollup

**Capability validated**: End-to-end multi-tenant attorney workflow — `EnterpriseContext.orgs[]` stacked panels, scope picker tenant + TPID variants, TPID-aware prior-tenant-history rollup, originating-tenant badge on prior case detail.

**Persona**: TS (open case), ATT (escalate + review prior history)

**Workflow stage**: Triage · Waiting on Triage

**Case shape**: US / Federal / Subpoena · 2 Enterprise email identifiers across Contoso Corp US (`tenant-contoso`) + Contoso France SAS (`tenant-contoso-fr`); both under `TPID-CONTOSO` / "Contoso Holdings". Each tenant has one prior LNS case seeded.

**Preconditions**:
1. Default queue.

**Test Steps**:

#### Part A — Multi-tenant Enterprise Context surfaces
1. Open the case from the Attorney Dashboard.
2. Inspect the tri-pane Enterprise Org stripe.
3. Inspect the mid-page Enterprise Context section (expand the accordion if collapsed).
4. Inspect the IdentifierTable.

**Expected — Part A**:
- Step 2: Tenant row shows **Contoso Corp (contoso.com)** with brand chip **`+1 more tenant`**; Parent TPID row reads **"Contoso Holdings"**; Org Home Location chip reads **In-jurisdiction** (US tenant matches US case).
- Step 3: **Two OrgPanels stack** —
  - "Organization — Contoso Corp · Tenant 1 of 2" with Parent TPID row, In-jurisdiction chip, and "Prior LNS history" row hosting the `View Prior Tenant History` button.
  - "Organization — Contoso France SAS · Tenant 2 of 2" with Parent TPID row + **Cross-border vs United States** chip (French tenant ≠ US issuing authority). No prior-history button on this panel.
- Step 4: 2 rows — `k.alvarez@contoso.com` and `m.lefebvre@contoso-fr.onmicrosoft.com`. Each tagged Enterprise.

#### Part B — Scope picker tenant + TPID variants
5. Click **Escalate to Attorney** in the sticky header.
6. Open the **Apply to** dropdown.
7. Pick **"All under Contoso Holdings — covers 2 tenants (2 identifiers)"**. Write a 10+ char reason. Submit.

**Expected — Part B**:
- Step 6: Dropdown surfaces six options in this order: *All identifiers (case-wide)*, *All under Contoso Holdings — covers 2 tenants (2 identifiers)* (TPID), *All in tenant contoso.com (1 identifier)* (tenant), *All in tenant contoso-fr.onmicrosoft.com (1 identifier)* (tenant), *Specific identifiers*, *Administrative (audit only)*.
- Step 7 toast: *"Case escalated"*; sticky header chip flips to **"Attorney Review Required"**. Both identifier rows now show red-accent + `AttorneyReview` status. Each per-identifier `attorneyEscalation` block has `scope: "tpid"` stamped. Case-level `FormData.attorneyEscalation` is **`undefined`** (scope=tpid clears it per the hybrid storage rule). AuditThread event note reads *"Scope: all identifiers under TPID-CONTOSO — covers 2 tenants (2 of 2)."*

#### Part C — TPID-aware prior history rollup
8. Click **View Prior Tenant History** on the Contoso Corp OrgPanel.
9. Inspect the drawer header.
10. Inspect the table.
11. Click the case ID for `LNS-2025-00598` (the Contoso France prior).
12. Inspect the Prior Case Detail header card.
13. Click "Back to prior history".
14. Click `LNS-2025-00501` (Contoso US prior).

**Expected — Part C**:
- Step 8: Button shows count `2` and the brand chip **"TPID rollup · 2 tenants"** plus an orange "1 redirected" chip.
- Step 9: Drawer title reads **"Prior Tenant History [TPID rollup]"** with subtitle *"Contoso Holdings · aggregated across child tenants"*.
- Step 10: Table lists **both** prior cases, newest-first by `dateServed`: `LNS-2025-00598` (Nov 20 2025, Police Nationale, Redirected) then `LNS-2025-00501` (Sep 30 2025, FBI New York, Info Provided).
- Step 12: Header card includes the **brand-outline "🏢 From Contoso France SAS"** originating-tenant badge alongside the resolution / request-type / legal-demand badges. Hover → tooltip *"Originating tenant: Contoso France SAS"*.
- Step 13: Returns to the rollup list (parent drawer still open).
- Step 14: Detail drawer reopens showing **"🏢 From Contoso Corp"** badge.

#### Part D — Audit event capture
15. Open the AuditThread for the case.

**Expected — Part D**:
- Recent events include the `Escalated` (TPID scope, see Part B) and `PriorTenantHistoryViewed` event with note *"Opened prior-tenant history (TPID rollup — 2 cases across 2 tenants)."*

#### Part E — Authority signal simulator (Pinned follow-up #2)
16. Click **Simulate authority signal** in the workspace top bar.
17. In the *EA Grounds for Refusal* section, pick **Partial**, tick the journalist-equivalent task (`LDID-…` for `k.alvarez@contoso.com`), and click **Issue Partial GFR**.
18. Inspect the AuditThread.

**Expected — Part E**:
- Step 16: Dialog opens with IA Form 4 + EA GFR sections.
- Step 17 dialog closes; case state mutated.
- Step 18: New event entry — kind `GfrReceived`, actor `"Simulated EA"`, note includes `Derived SignalScope: some (1 of 2)`.

**Pass criteria**: All five parts complete with no manual workaround; scope=tpid persists per-identifier and clears case-level; rollup drawer aggregates correctly; originating-tenant badge resolves for both prior cases; simulator dispatches real GFR mutation through the unified helper.

---

### UAT-DARS-021 · LNS-2026-984174 — Rejected subpoena: civil matter, insufficient legal authority

**Capability validated**: Rejected-case terminal state; civil-matter classification.

**Persona**: RS

**Workflow stage**: Terminal · Rejected

**Case shape**: US / State / Subpoena · 1 Consumer email identifier · Civil Matter

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Search "984174"; locate the row.
2. Open the case.
3. Inspect the sticky header.
4. Locate the rejection reason in Case Overview.

**Expected Results**:
- Step 1: Row visible with **Rejected** stage column.
- Step 3: Sticky header chip reads **"Rejected"**.
- Step 4: Rejection reason field populated (insufficient legal authority — civil matter).

**Pass criteria**: Rejection state visible at header + reason recorded.

---

### UAT-DARS-022 · LNS-2026-00280 — Portuguese eEvidence: Workflow 8 IA Withdrawal (mid-collection)

**Capability validated**: Workflow 8 (IA Withdrawal) end-to-end — withdrawal handler cancels pending delivery, starts 45-day retention clock, flips caseStage + authorizationDesiredStatus to "Withdrawn", appends `EpocWithdrawn` audit event. Withdrawal supersedes all other workflow gates.

**Persona**: RS

**Workflow stage**: Collection → terminal Withdrawn (auto-flipped by handler)

**Case shape**: Portugal / National / eEvidence (EPOC ER) · 1 Consumer email identifier · 3 pre-seeded jobs in mixed delivery states (in-flight Started, ready-not-submitted, already-Complete)

**Preconditions**:
1. Default queue.
2. Case opens with the Withdrawal inbound already seeded; handler fires on first mount and the audit event is appended once (idempotent).

**Test Steps**:
1. Open the case from the queue. Confirm landing on Collection page.
2. Inspect the **top banner stack** — observe the red WithdrawalBanner.
3. Inspect the **sticky case header** for the SLA chip and the retention-clock chip.
4. Open the per-identifier pipeline view. Inspect the three pre-seeded data-category jobs (msaProfile.subscriberData, msaProfile.authenticationLogs, exchangeConsumer.contentData) and their delivery statuses.
5. Open the Correspondence panel; click the **EPOC Withdrawal Notice** inbound bubble. Click "View the EPOC withdrawal notice" to open the FormPreviewPanel.
6. Open the Audit thread. Locate the `EpocWithdrawn` event.
7. Inspect the case stage chip in the sticky header.
8. Hard-reload the page (Ctrl+F5). Re-open the case. Re-inspect the audit thread.

**Expected Results**:
- Step 2: Red banner reads **"EPOC withdrawn by the Issuing Authority"** with effective date **May 20, 2026**, deletion deadline **Jul 4, 2026** (~38 days remaining today), IA actor **"Ministério Público — DIAP Lisboa (Portugal)"**, and the withdrawal note quoting the cancelled-job count + reason.
- Step 3: SLA chip rendered (case-level SLA continues by spec — withdrawal doesn't pause SLA). Retention chip reads **"Retention: ~38d left"** in neutral tone (≥30d). Tooltip explains "IA withdrew the EPOC" with the May 20 anchor.
- Step 4:
  - `msaProfile.subscriberData` shows **Cancelled** (was Started → handler flipped).
  - `msaProfile.authenticationLogs` shows **Cancelled** (was Publish:Complete + Delivery:Not Started → handler pre-empts).
  - `exchangeConsumer.contentData` stays **Complete** (already delivered; handler must not touch — over-disclosure already a fait accompli).
- Step 5: FormPreviewPanel opens with EPOC_WITHDRAWAL template, fields populated (issuing authority, file number, effective date 2026-05-20, original EPOC ref, reason text).
- Step 6: Exactly one `EpocWithdrawn` event present; actor reads the IA name; note includes the cancelled-count line ("Cancelled 2 pending delivery jobs.").
- Step 7: Case stage chip reads **Withdrawn**.
- Step 8: Still exactly one `EpocWithdrawn` event after reload (idempotent — handler dedupes by `documentId`).

**Pass criteria**:
- WithdrawalBanner renders with correct IA + dates.
- Two pre-pending jobs flipped to Cancelled; the already-delivered job untouched.
- Retention clock anchored to the IA's effective date (not "today").
- `caseStage === "Withdrawn"`; `authorizationDesiredStatus === "Withdrawn"`.
- Audit log carries exactly one `EpocWithdrawn` event after multiple mounts.

---

### UAT-DARS-023 · LNS-2026-00215 — Spanish EPOC-PR: Workflow 4 Active Preservation Order (Form 2 receipt + acknowledgement)

**Capability validated**: Workflow 4 receipt path — `PreservationOrder` inbound handler auto-appends `PreservationOrderReceived` audit on mount; `PreservationOrderActiveBanner` renders earliest preservation expiry + "Acknowledge Receipt" CTA; outbound EPOC_PRESERVATION_ACK send fires `PreservationOrderAcknowledged` audit and swaps banner to green confirmation. Round-out of the Workflow 4 lifecycle on the receipt side.

**Persona**: RS

**Workflow stage**: Collection (preservation-only pipeline)

**Case shape**: Spain / National / eEvidence (EPOC PR) · 1 Consumer email identifier · `desiredPreservationExpiration: 2026-11-25` (6-month window) · Form 2 inbound pre-seeded

**Preconditions**:
1. Default queue.
2. Case has a Form 2 inbound; the inbound-event handler fires once on case mount.

**Test Steps**:
1. Open the case from the queue. Confirm landing on the Collection page.
2. Inspect the **top banner stack**.
3. Inspect the Collection pipeline view (which stages render).
4. Open the Correspondence panel. Click the **Form 2 — Preservation Order** inbound bubble. Click "View Form 2 (Preservation Order)".
5. Close the FormPreviewPanel. Back on the banner, click **Acknowledge Receipt**.
6. In the Correspondence composer that opens, confirm the form chip is pre-attached. Click the chip to open FormFillerDialog.
7. Fill the signer name + acknowledgement date fields. Sign and send.
8. Re-inspect the top banner. Open the Audit thread.
9. Hard-reload the page. Re-open the case.

**Expected Results**:
- Step 2: Blue **"Preservation Order in Effect"** banner shows earliest preservation expiration **Nov 25, 2026**, received date, IA actor (Audiencia Nacional), and **Acknowledge Receipt** CTA visible.
- Step 3: Only the **Preservation** column renders; Package + Delivery columns hidden. The "Cannot preserve — submit Form 3" CTA shows at the bottom of the Preservation column.
- Step 4: FormPreviewPanel opens hydrated with EPOC_FORM_2 fields (issuing authority, file number, date of issue, preservation order reference, initial expiration 2026-11-25, offence + data description).
- Step 5: Composer side-panel opens; the EPOC_PRESERVATION_ACK chip is pre-attached without manually picking it; FormFillerDialog opens automatically with the template ready.
- Step 7: Toast reads **"Preservation receipt acknowledged to the IA"**. Banner swaps to green ✓ **"Receipt acknowledged to the Issuing Authority"** (Acknowledge CTA hidden post-ack).
- Step 8: Audit thread shows exactly TWO new events: `PreservationOrderReceived` (actor: Audiencia Nacional, performedAt 2026-05-25) and `PreservationOrderAcknowledged` (actor: Nicole Garcia / CURRENT_USER, performedAt = send time).
- Step 9: After reload, banner stays in the green ✓ confirmation state; audit events unchanged (idempotent — `PreservationOrderReceived` doesn't double-fire, `PreservationOrderAcknowledged` keyed by the outbound's documentId).

**Pass criteria**: Form 2 inbound auto-applies receipt audit on case open; ActiveBanner renders pre-ack; Acknowledge CTA opens composer with pre-attached template; send produces ack audit + banner swap; idempotent across reloads.

---

### UAT-DARS-024 · LNS-2026-00245 — Italian eEvidence: Workflow 2 Active EA Review Window

**Capability validated**: Workflow 2 active state — international EPOC + GFR block without decision; `gfrChipMeta()` renders "EA REVIEW WINDOW · Nd"; GFR Panel countdown card; Submit-to-Delivery button visibly disabled (not hidden) with the spec-compliant tooltip. Collection actions remain unblocked during the hold.

**Persona**: RS

**Workflow stage**: Collection · In Progress

**Case shape**: Italy / National / eEvidence (EPOC ER) · `isInternational: true` · `eevidenceWorkflow: 2` · 1 Consumer email identifier · 2 pre-seeded jobs at Publish:Complete, Delivery:Not Started · GFR block notifiedAt 2026-05-22, expires 2026-06-01 (5 days remaining today)

**Preconditions**:
1. Default queue. Today = 2026-05-27.
2. Case has GFR block with no decision (EA actively reviewing).

**Test Steps**:
1. Open the case from the queue.
2. Inspect the sticky case header for the EA review chip.
3. Inspect the top of Case Overview for the GFR Panel.
4. Scroll to / view the CollectionTracker pipeline. Locate the "Review & Deliver" button on the Package column.
5. Hover the disabled Review & Deliver button.
6. Verify Collection-phase actions remain operable (the Submit-to-Publish CTA, manual collection forms, Refresh Pipeline).

**Expected Results**:
- Step 2: Sticky chip reads **"EA REVIEW WINDOW · 5d"** in info / blue-violet tone. Tooltip explains publish + deliver are blocked until the EA decides or the window lapses; SLA continues.
- Step 3: GFR Panel (purple card) headline reads **"EA REVIEW WINDOW — Enforcing Authority is reviewing"**. Operational countdown badge reads **"5 days remaining · operational countdown only — SLA continues"**. Paragraph notes "Publish + Deliver actions are blocked until the EA decides or the window lapses; collection continues."
- Step 4: Button reads **"Blocked — EA review window"** (instead of "Review & Deliver (2)"). Button is visibly disabled (greyed). Inline red helper text appears below the button.
- Step 5: Tooltip reads **"Action blocked — EA review window active. Awaiting EA determination."**.
- Step 6: Collection submit affordances remain operative — Submit-to-Publish CTA still clickable (the window only gates delivery, per spec).

**Pass criteria**:
- Sticky chip + GFR Panel use the new "EA REVIEW WINDOW" label.
- Submit-to-Delivery DISABLED with spec-compliant tooltip (not hidden, not silently clickable).
- Collection unaffected by the EA window hold.
- Countdown matches `eaReviewWindowExpiresAt - now`, rounded up by `daysLeftEaReview()`.

---

### UAT-DARS-025 · LNS-2026-00247 — French eEvidence: Workflow 2 EA Window Lapsed + Resume Delivery

**Capability validated**: Workflow 2 lapsed path — `useEaWindowExpiry` hook auto-fires `EaWindowExpired` audit on case mount when the window has passed without a decision; GFR Panel green "delivery is now permitted (Art. 8 + 10(2))" with Resume Delivery CTA; on click → `manualDeliveryResumed: true` + `GfrDeliveryResumedManually` audit + Submit-to-Delivery re-enables. Validates the auto-detection-and-manual-resume contract.

**Persona**: RS

**Workflow stage**: Collection · In Progress

**Case shape**: France / National / eEvidence (EPOC ER) · `isInternational: true` · `eevidenceWorkflow: 2` · 1 Consumer email identifier · 2 pre-seeded jobs at Publish:Complete, Delivery:Not Started · GFR block notifiedAt 2026-05-15, expires 2026-05-25 (passed 2 days ago); `windowLapsed` NOT pre-seeded — hook fires it on mount

**Preconditions**:
1. Default queue. Today = 2026-05-27.
2. The seeded `eaReviewWindowExpiresAt` is in the past with no EA decision; the hook should fire `EaWindowExpired` on first mount.

**Test Steps**:
1. Open the case from the queue.
2. Inspect the sticky case header chip + the GFR Panel state at the top of Case Overview.
3. Open the Audit thread; locate the auto-fired `EaWindowExpired` event.
4. Inspect the Collection pipeline's "Review & Deliver" button.
5. Click the **Resume Delivery** button in the GFR Panel.
6. Verify the panel + chip + button state after the click. Open the Audit thread again.
7. Click "Review & Deliver" (now enabled). Cancel out of the dialog.
8. Hard-reload the page. Re-open the case. Re-check the Audit thread.

**Expected Results**:
- Step 2: Sticky chip reads **"EA window lapsed · resume delivery"** in warn / amber tone. GFR Panel renders a green card headlined **"EA review window expired — delivery is now permitted"** with the Art. 8 + 10(2) attribution + a primary **Resume Delivery** button.
- Step 3: Audit thread contains exactly one `EaWindowExpired` event (actor: "System", performedAt = first mount time). Note quotes Art. 8 + 10(2).
- Step 4: Button reads **"Blocked — EA review window"** with tooltip **"Action blocked — EA review window lapsed. Click Resume Delivery in the GFR Panel to proceed."**.
- Step 5: Toast reads **"Delivery resumed — EA review window had lapsed without a decision. Submit-to-Delivery is re-enabled."**.
- Step 6: Sticky chip flips to **"EA window lapsed · delivery resumed"** in success / green tone. GFR Panel swaps to a green confirmation card showing the resume timestamp + actor. Audit thread has a new `GfrDeliveryResumedManually` event (actor: CURRENT_USER).
- Step 7: Review & Deliver button now reads **"Review & Deliver (2)"** and opens the standard delivery review dialog. Dialog body lists the 2 pending jobs.
- Step 8: After reload, the audit thread STILL shows exactly one `EaWindowExpired` event (auto-detection hook is idempotent — doesn't re-fire because `windowLapsed` flag and the audit event are both already on FormData) AND exactly one `GfrDeliveryResumedManually` event (helper is idempotent on the `manualDeliveryResumed` flag).

**Pass criteria**:
- `useEaWindowExpiry` hook fires `EaWindowExpired` audit on first mount when window has passed.
- Lapsed-pre-resume panel + chip use warn tone with Resume Delivery CTA.
- Resume Delivery sets `manualDeliveryResumed: true`, appends `GfrDeliveryResumedManually` audit, swaps panel/chip to success tone.
- Submit-to-Delivery re-enables on resume.
- Both audit events idempotent across reloads.

---

### UAT-DARS-026 · LNS-2026-00130 — Irish eEvidence: Workflow 1 Standard Production National

**Capability validated**: Workflow 1 baseline — same-jurisdiction EPOC-ER (Irish IA + Irish SP) bypasses the EA review leg entirely. `gfrApplies()` returns false → no GFR panel; `isInternational: false` → no EA chip; Routine SLA tier (10 days per Art. 9(1)). Full Collection → Package → Delivery pipeline with no banners. This is the eEvidence default happy path — every other workflow's expected results should be interpreted relative to this baseline.

**Persona**: RS

**Workflow stage**: Collection · In Progress

**Case shape**: Ireland / National / eEvidence (EPOC ER) · `isInternational: false` · `eevidenceWorkflow: 1` · 1 Consumer email identifier · 3 pre-seeded jobs spanning the pipeline (1 publish-pending, 1 delivery-pending, 1 already delivered)

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case from the queue.
2. Inspect the sticky case header — note the SLA chip + verify the GFR / EA review chip is **NOT** present.
3. Scroll the Case Overview banner stack — verify no preservation / GFR / emergency / withdrawal banners render.
4. Open the CollectionTracker pipeline. Confirm the three-column layout (Collection / Package / Delivery) is present (not the preservation-only collapse).
5. Locate the "Submit to Publish" CTA on the Collection column and "Review & Deliver" CTA on the Package column.
6. Open the Audit thread.

**Expected Results**:
- Step 2: SLA chip shows **Routine** countdown (4 days remaining at today's date) in OnTrack (green) tone. No `EA REVIEW WINDOW` chip, no `EA window lapsed` chip, no GFR chip.
- Step 3: Banner stack EMPTY — no PreservationOrderActiveBanner, no PreservationExtensionBanner, no EndPreservationBanner, no WithdrawalBanner, no EmergencyEEvidenceBanner.
- Step 4: All three pipeline columns visible. `isEpocPr` collapse is NOT triggered.
- Step 5: Both CTAs visible and **enabled** (no gating from GFR, no EA review window, no withdrawal). Tooltips do not mention any block reason.
- Step 6: Audit thread carries no workflow-specific events from the eEvidence handlers (no `EaWindowExpired`, no `PreservationOrderReceived`, no `EpocWithdrawn`). Only routine bookkeeping events present (if any).

**Pass criteria**: Workflow 1 case renders the baseline pipeline with NO eEvidence-workflow-specific affordances; Submit-to-Publish + Submit-to-Delivery enabled; SLA on Routine 10-day; the case acts as the "control" against which the other workflow demos diverge.

---

### UAT-DARS-027 · LNS-2026-00140 — German eEvidence: Workflow 3 Emergency Production 8h (Reg 2023/1543 Art. 9(2))

**Capability validated**: Workflow 3 — `eevidenceWorkflow: 3` + `casePriority: "Emergency"` activates the spec's 8-hour SLA window via `getSlaConfig`'s `SlaContext` shim (instead of the static 3-hour Emergency tier). `EEvidenceAuthorisationFlags.emergencyJustification` carries the IA's structured threat declaration (category + note). `EmergencyEEvidenceBanner` renders prominently with the category label + justification. Pipeline + delivery actions remain available — the only spec-imposed change is the accelerated clock.

**Persona**: RS

**Workflow stage**: Collection · In Progress (urgent)

**Case shape**: Germany / Federal / eEvidence (EPOC ER) · `isInternational: true` · `eevidenceWorkflow: 3` · `casePriority: "Emergency"` · `isThreatToLife: true` · 1 Consumer email identifier · 2 pre-seeded jobs at Publish:Complete, Delivery:Not Started · `emergencyJustification: { category: "DangerToLife", note: <kidnapping rationale> }`

**Preconditions**:
1. Default queue. Today = 2026-06-01.
2. EPOC received 2026-06-01 04:00 UTC; 8h SLA → due 2026-06-01 12:00 UTC. By the time the tester opens the case (~10:00 UTC) the chip should be in Approaching (amber) state with ~2h remaining.

**Test Steps**:
1. Open the case from the queue.
2. Inspect the top banner stack — verify the EmergencyEEvidenceBanner renders.
3. Inspect the sticky case header SLA chip. Hover for tooltip.
4. Compare with UAT-DARS-004 (LNS-2025-00142, the non-eEvidence Emergency case) — verify the chip durations differ.
5. Open the CollectionTracker pipeline.
6. Inspect the "Review & Deliver" CTA on the Package column.
7. Locate and confirm the absence of the GFR Panel even though `isInternational: true` (Workflow 3 short-circuits the EA review in current scope).

**Expected Results**:
- Step 2: Red EmergencyEEvidenceBanner reads **"Emergency Production — 8-hour SLA (Reg 2023/1543 Art. 9(2))"** with secondary line **"Imminent danger to life"** and the IA's structured justification note quoted in a sub-box ("Active kidnapping investigation...").
- Step 3: SLA chip is in **Approaching** (amber) tone showing **"Due in ~2h Nm"** (relative to opening time). Tooltip reads **"P0 Emergency — SLA 8 hours. Due in 2h Nm."** — note the spec's **8 hours** label, not 3.
- Step 4: LNS-2025-00142 chip is **3-hour** Emergency (P0); LNS-2026-00140 chip is **8-hour** Emergency (P0). Both labels read "Emergency" / "P0" but the durations differ because the SlaContext shim is applied only on Workflow 3.
- Step 5: Three-column pipeline visible (no preservation collapse).
- Step 6: Review & Deliver button **enabled** — no EA gate, no GFR block, no withdrawal. RS can dispatch immediately to meet the 8h window.
- Step 7: GFR Panel not rendered even though `isInternational: true`. (Note: Workflow 3 + Workflow 6 collapsed-EA-window interaction is explicitly NOT in current scope.)

**Pass criteria**:
- 8h SLA tier applied to the sticky chip (not 3h) — verifiable by comparing tooltip duration label against LNS-2025-00142.
- EmergencyEEvidenceBanner renders with structured category + free-text note.
- Pipeline + delivery actions available; no spurious gates.
- Banner self-hides on non-Workflow-3 cases (verify by opening LNS-2026-00130 — banner absent).

---

### UAT-DARS-028 · LNS-2026-00240 — Italian eEvidence: RS enforces Full GFR via "Block Delivery (case-wide)"

**Capability validated**: User-driven Full GFR enforcement — RS reviews the EA's decision and clicks the panel's CTA to enforce the block. `applyGfrEnforcement` flips `enforcementApplied: true` on the GFR block, appends a `GfrEnforced` audit event (scope: case-wide), and downstream gates engage. Counterpart to UAT-DARS-015 which validates the pre-enforcement informational state.

**Persona**: RS

**Workflow stage**: Collection · In Progress · Full GFR received, RS reviewing

**Case shape**: Italy / National / eEvidence · 1 Enterprise email identifier · `decision.kind === "Full"` · `enforcementApplied !== true`

**Preconditions**:
1. Default queue.
2. Case has a Full GFR with no prior enforcement (the seed lands in this state on case open).

**Test Steps**:
1. Open the case.
2. Inspect the GFR Panel — verify the headline + the Block Delivery CTA.
3. Inspect the CollectionTracker pipeline. Verify the toolbar "Block Delivery" button + the per-row "Review & Deliver" button are CLICKABLE.
4. Click the **Block Delivery (case-wide)** primary button on the GFR Panel.
5. Re-inspect the GFR Panel + toolbar + per-row delivery button.
6. Re-inspect the page-top "Delivery is blocked" inline banner.
7. Open the Audit Thread.
8. Hard-reload the page. Re-inspect the GFR Panel + audit thread.

**Expected Results**:
- Step 2: Panel headline reads **"Full Grounds for Refusal — review the EA's decision"** with red **"Block Delivery (case-wide)"** button + helper text "Enforces the EA's GFR. The block is auditable and reversible from the Block Delivery banner."
- Step 3: Toolbar button reads **"Block Delivery"** (clickable, not "Blocked — GFR enforced"). Per-row Review & Deliver button is enabled.
- Step 4: Toast reads **"Delivery blocked — GFR enforced"** with description **"Case-wide delivery is now blocked. GfrEnforced event appended to the audit thread."**
- Step 5:
  - GFR Panel headline swaps to **"Full Grounds for Refusal — delivery blocked"**. A confirmation chip appears showing **"Delivery blocked [date] by [RS name]"**. The Block Delivery CTA is no longer rendered.
  - Toolbar button reads **"Blocked — GFR enforced"** and is non-interactive.
  - Per-row Review & Deliver button is disabled with tooltip **"Action blocked — GFR enforced by the RS. See the GFR Panel."**
- Step 6: Inline banner reads **"Delivery is blocked — GFR enforced. The RS chose to enforce the EA's Grounds for Refusal."** The Unblock button is NOT rendered (the block is GFR-scoped, not a generic RS block).
- Step 7: Audit Thread has a new **`GfrEnforced`** event, actor = CURRENT_USER, role = ResponseSpecialist, note reads **"RS blocked delivery in response to Full GFR (scope: case-wide)."**
- Step 8: After reload, panel stays in the enforced confirmation state. Exactly one `GfrEnforced` event present — `applyGfrEnforcement` is idempotent.

**Pass criteria**:
- `enforcementApplied: true` persisted on `eevidenceGroundsForRefusal` with stamped `enforcementAppliedAt` + `enforcementAppliedBy`.
- All delivery gates engage post-enforcement (`canDeliver()` returns false).
- Exactly one `GfrEnforced` audit event after multiple opens.

**Undo path (accidental-click recovery)**:
9. After step 7, click the **Undo** button on the confirmation chip in the GFR Panel.
10. Re-inspect the GFR Panel + toolbar + per-row delivery button + audit thread.

**Expected Results (undo)**:
- Step 9: Toast reads **"GFR enforcement released"** with description **"Delivery actions are re-enabled. GfrEnforcementReleased event appended to the audit thread."**
- Step 10:
  - Panel headline reverts to **"Full Grounds for Refusal — review the EA's decision"** with the **"Block Delivery (case-wide)"** primary CTA back in place. Confirmation chip is gone.
  - Toolbar button reads **"Block Delivery"** again (clickable).
  - Per-row Review & Deliver button is re-enabled.
  - Audit Thread now carries TWO events in order: the original `GfrEnforced` PLUS a new `GfrEnforcementReleased` event with note "RS released the prior GFR enforcement (Full GFR; original block by [actor]).". The original enforcement event stays in the log — releases append, not rewrite.

---

### UAT-DARS-029 · LNS-2026-00250 — Polish eEvidence: RS enforces Partial GFR via "Block Delivery for these N identifier(s)"

**Capability validated**: User-driven Partial GFR enforcement — RS reviews the EA's per-identifier veto list and clicks the panel's CTA to block delivery for the listed identifiers' data-type jobs. `applyGfrEnforcement` flips `enforcementApplied: true` and downstream per-row gating activates via `identifierBlockedByPartialGfr`. Non-listed identifiers continue to deliver normally. Counterpart to UAT-DARS-016 which validates the pre-enforcement informational state.

**Persona**: RS

**Workflow stage**: Collection · In Progress · Partial GFR received, RS reviewing

**Case shape**: Poland / National / eEvidence · 3 identifiers (2 email + 1 phone) · `decision.kind === "Partial"` · `decision.blockedTaskObjectIds` = 1 journalist identifier · `enforcementApplied !== true`

**Preconditions**:
1. Default queue.
2. Case has a Partial GFR with no prior enforcement.

**Test Steps**:
1. Open the case.
2. Inspect the GFR Panel — verify the blocked-identifiers list + the Block Delivery CTA.
3. Inside CollectionTracker, identify the journalist identifier (LDID-100002) and the two non-listed identifiers (witness + phone). Confirm all three rows have clickable delivery actions.
4. Click the **Block Delivery for these 1 identifier** primary button on the GFR Panel.
5. Re-inspect the GFR Panel + per-row delivery state.
6. Open the Audit Thread.
7. Hard-reload the page. Re-inspect.

**Expected Results**:
- Step 2: Panel renders the blocked-identifiers list (1 journalist taskId) + reason chips + amber **"Block Delivery for these 1 identifier"** button + helper "Enforces the EA's Partial GFR; non-listed identifiers continue to deliver normally."
- Step 3: All three rows clickable. SLA chip unchanged (Partial does NOT pause SLA).
- Step 4: Toast reads **"Delivery blocked — GFR enforced"** with description **"Listed target identifiers can no longer deliver. GfrEnforced event appended to the audit thread."**
- Step 5:
  - GFR Panel renders a confirmation chip below the blocked list showing **"Delivery blocked for the 1 listed target identifier on [date] by [RS name]."** The Block Delivery CTA is no longer rendered.
  - Journalist row: per-row delivery actions disabled (grey lock); tooltip cites `identifierBlockedByPartialGfr`.
  - Witness + phone rows: unchanged, delivery actions remain clickable.
  - Sticky header chip + SLA chip unchanged.
- Step 6: Audit Thread carries one new **`GfrEnforced`** event with note **"RS blocked delivery in response to Partial GFR (scope: 1 target identifier)."**
- Step 7: After reload, state persists. Exactly one `GfrEnforced` event — idempotent.

**Pass criteria**:
- Per-identifier gating fires only after the RS clicks the CTA.
- `identifierBlockedByPartialGfr(formData, journalistTaskId)` returns true post-enforcement; returns true for journalist only, never for the non-listed identifiers regardless of enforcement state.
- Audit scope label correctly reads "1 target identifier" (not "case-wide").

**Undo path (accidental-click recovery)**:
8. After step 6, click the **Undo** button on the confirmation chip in the GFR Panel.
9. Re-inspect the GFR Panel + journalist row's delivery actions + audit thread.

**Expected Results (undo)**:
- Step 8: Toast reads **"GFR enforcement released"** with the same description as UAT-028.
- Step 9:
  - Panel reverts to the pre-enforcement state with the **"Block Delivery for these 1 identifier"** CTA back in place. Confirmation chip is gone.
  - Journalist row's delivery actions become clickable again — `identifierBlockedByPartialGfr` returns false because `enforcementApplied` is cleared.
  - Witness + phone rows unchanged (they were never affected).
  - Audit Thread carries TWO events: original `GfrEnforced` (scope: 1 target identifier) PLUS new `GfrEnforcementReleased` event referencing the original actor.

---

## 6. Cross-cutting smoke tests

Run these once per UAT cycle, after the per-case tests. They verify infrastructure not tied to any single case.

### UAT-DARS-SMOKE-A — All Cases queue
- Confirm all 27 case rows render in the queue.
- Confirm the **Badges** filter (toolbar) opens and supports multi-select + Any/All toggle.
- Confirm column-header sort works on Priority / Due Date / Stage / Internal Escalation.

### UAT-DARS-SMOKE-B — Attorney Dashboard
- Confirm only attorney-relevant cases surface (those with active escalation or threat-to-life or GFR hold).
- Confirm **My cases** quick filter narrows to cases where you are the Assigned RS or named Escalated To reviewer.
- Confirm bulk-actions bar appears when 1+ rows are checked; Pick / Release / Assign all available.

### UAT-DARS-SMOKE-C — Preview pane (both surfaces)
- Open any case in Preview Pane mode. Confirm the tripanel renders with the **all-identifiers** list (RS / TS variant) on the main Case Queue.
- Switch to Attorney Dashboard; confirm the tripanel switches to **flagged-focus** (escalated identifier tab pattern).
- Confirm the "Open case" button sits directly under the tripanel (above the fold).

### UAT-DARS-SMOKE-D — Banner relocation regression
- Open LNS-2025-00125 or LNS-2026-00200 — any case with active escalation.
- Collapse the Case Overview accordion. Confirm the compact "Attorney review required" banner stays visible in the page-top alert zone.
- Click **Review now →**; Case Overview re-expands and the AttorneyReviewPanel scrolls into view.

### UAT-DARS-SMOKE-E — EscalateToAttorneyDialog scope picker (all 5 variants)

Verifies that the `SignalScope` discriminated union is exercised end-to-end and that the hybrid-storage rule routes writes to the right field.

| Variant | Test case | Steps | Per-identifier write? | Case-level field after submit? |
|---|---|---|---|---|
| `all` | LNS-2026-00170 (UK COPO walkthrough, no active escalation) | Escalate → pick **All identifiers** → submit | Yes — all 1 identifier gets `attorneyEscalation` with `scope: "all"` | **Set** (hybrid mirror) |
| `tenant` | LNS-2026-00300 (multi-tenant) | Escalate → pick **All in tenant contoso.com** → submit | Only the Contoso US identifier gets `attorneyEscalation` with `scope: "tenant"`; the Contoso France identifier untouched | **Cleared** (`undefined`) |
| `tpid` | LNS-2026-00300 | Escalate → pick **All under Contoso Holdings** → submit | Both identifiers get `attorneyEscalation` with `scope: "tpid"` | **Cleared** |
| `some` | LNS-2026-00250 (Polish, 3 identifiers) | Escalate → pick **Specific identifiers** → tick journalist → submit | Only journalist identifier gets `attorneyEscalation` with `scope: "some"` and `identifierId` on the audit event | **Cleared** |
| `none` | Any case | Escalate → pick **Administrative (audit only)** → submit | No identifier mutation; audit event note ends with `Scope: administrative (audit only — no task gating).` | Untouched |

Pass criteria for each variant: per-identifier write target list matches the table; the case-level field follows the hybrid storage rule; sticky chip + AttorneyReviewPanel render appropriately; AuditThread records the scope kind in the event note.

### UAT-DARS-SMOKE-F — Authority signal simulator (Pinned follow-up #2)

Verifies the unified `applyAuthorizationStatusUpdate` + `applyGfrDecision` helpers via the prototype simulator.

1. Open any attorney-flow case (e.g. LNS-2026-00150).
2. Click **Simulate authority signal** in the workspace top bar.
3. In **IA Form 4 — authorization desired status update**, pick **Cancelled**, scope **All identifiers (case-wide)** → click **Apply IA Form 4 update**.
4. Confirm `formData.authorizationDesiredStatus === "Cancelled"`, each identifier's `authorizationDesiredTaskStatus === "Cancelled"`, AuditThread has new entry note starting with `[Simulated IA Form 4] Authorization desired status → Cancelled. Scope: all identifiers.`
5. Re-open the simulator. In **EA Grounds for Refusal**, pick **Full** → click **Issue Full GFR**.
6. Confirm `formData.eevidenceGroundsForRefusal.decision.kind === "Full"`; AuditThread `GfrReceived` event; note includes `Derived SignalScope: all`.
7. Re-open the simulator. Pick **Partial** GFR; tick the first identifier's task; submit.
8. Confirm `decision.kind === "Partial"`, `blockedTaskObjectIds` contains the picked task id; AuditThread note includes `Derived SignalScope: some (1 of N)`.

Pass criteria: All three signal types (IA Form 4 case-wide, EA Full GFR, EA Partial GFR) mutate the case via the unified helpers; the derived `SignalScope` is captured in the audit note for each.

### UAT-DARS-SMOKE-G — Dashboard preview pane sticky footer (Pinned follow-up #4)

Verifies the viewport-bounded preview-pane container so CTAs stay visible on long content.

1. On the Attorney Dashboard, switch to **Preview** view mode.
2. Select a case with a long Operational signals + tripanel body (LNS-2025-00142 — multiple identifiers, threat-to-life).
3. Scroll inside the preview pane body.

Pass criteria: The preview pane's footer CTAs (Open case button + any sticky action row) remain pinned at the bottom of the pane while the body scrolls internally. The page itself does NOT scroll past the dashboard header.

---

## 7. Sign-off sheet

Print or copy this table into your UAT log per test run.

| Test ID | Date | Tester | Persona | Status (PASS / FAIL / N/A) | Failure notes |
|---|---|---|---|---|---|
| UAT-DARS-001 | | | | | |
| UAT-DARS-002 | | | | | |
| UAT-DARS-003 | | | | | |
| UAT-DARS-004 | | | | | |
| UAT-DARS-005 | | | | | |
| UAT-DARS-006 | | | | | |
| UAT-DARS-007 | | | | | |
| UAT-DARS-008 | | | | | |
| UAT-DARS-009 | | | | | |
| UAT-DARS-010 | | | | | |
| UAT-DARS-011 | | | | | |
| UAT-DARS-012 | | | | | |
| UAT-DARS-013 | | | | | |
| UAT-DARS-014 | | | | | |
| UAT-DARS-015 | | | | | |
| UAT-DARS-016 | | | | | |
| UAT-DARS-017 | | | | | |
| UAT-DARS-018 | | | | | |
| UAT-DARS-019 | | | | | |
| UAT-DARS-020 | | | | | |
| UAT-DARS-021 | | | | | |
| UAT-DARS-022 | | | | | |
| UAT-DARS-023 | | | | | |
| UAT-DARS-024 | | | | | |
| UAT-DARS-025 | | | | | |
| UAT-DARS-026 | | | | | |
| UAT-DARS-027 | | | | | |
| UAT-DARS-028 | | | | | |
| UAT-DARS-029 | | | | | |
| UAT-DARS-SMOKE-A | | | | | |
| UAT-DARS-SMOKE-B | | | | | |
| UAT-DARS-SMOKE-C | | | | | |
| UAT-DARS-SMOKE-D | | | | | |

**UAT lead sign-off**: ____________________  **Date**: ____________________

**Business owner sign-off**: ____________________  **Date**: ____________________

---

*End of document.*
