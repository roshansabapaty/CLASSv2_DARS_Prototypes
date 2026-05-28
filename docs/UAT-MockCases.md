# DARS — Mock Case User Acceptance Test (UAT) Document

**Document owner**: DARS Product Team
**Last updated**: 2026-05-27
**Source environment**: DARS eEvidence prototype (`http://localhost:3001`)
**Scope**: All mock cases shipped with the prototype as of this date — 21 cases covering Triage, Review Case, Collection, and Terminal workflow stages

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
| UAT-DARS-010 | LNS-2026-00190 | German eEvidence — Consumer/Enterprise manifest error | Review Case | RS |
| UAT-DARS-011 | LNS-2026-00200 | French eEvidence — Inform-Controller notification | Review Case | RS, ATT |
| UAT-DARS-012 | LNS-2026-00210 | Italian eEvidence — inverse manifest error | Triage | TS |
| UAT-DARS-013 | LNS-2026-00220 | Dutch EPOC-PR — preservation-only pipeline | Collection | RS |
| UAT-DARS-014 | LNS-2026-00230 | Dutch EPOC-ER — linkage to prior EPOC-PR | Triage | TS |
| UAT-DARS-015 | LNS-2026-00240 | Italian eEvidence — Full GFR (EA Hold) | Collection | RS, ATT |
| UAT-DARS-016 | LNS-2026-00250 | Polish eEvidence — Partial GFR + journalist immunity | Collection | RS, ATT |
| UAT-DARS-017 | LNS-2026-00255 | Belgian eEvidence — EA clears + failed-delivery retry | Collection | RS |
| UAT-DARS-018 | LNS-2026-00265 | Greek eEvidence — EA overrules Form 3 | Collection | RS, ATT |
| UAT-DARS-019 | LNS-2026-00270 | Swedish eEvidence — manual vs automated jobs | Collection | RS |
| UAT-DARS-020 | LNS-2026-00300 | US Subpoena — multi-tenant TPID attorney scope | Triage | TS, ATT |
| UAT-DARS-021 | LNS-2026-984174 | Rejected subpoena — civil matter, insufficient legal authority | Terminal · Rejected | RS |

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

**Capability validated**: Full Grounds for Refusal HOLD state; SLA pause; delivery gates disabled.

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
5. Attempt to click Send / Form 3 / Resolve action buttons in the CollectionTracker.
6. Open Case Overview → Audit Thread.

**Expected Results**:
- Step 2: Red Full-GFR HOLD card with reason `ImmunitiesOrPrivileges (Art. 12(1)(a))`.
- Step 3: Sticky header shows red **"EA Hold — Full"** chip.
- Step 4: SLA chip displays paused state.
- Step 5: All action buttons disabled (red lock icon).
- Step 6: Audit Thread carries `GfrReceived` event.

**Pass criteria**: Full GFR completely locks downstream actions; SLA paused.

---

### UAT-DARS-016 · LNS-2026-00250 — Polish eEvidence: Partial GFR + journalist immunity

**Capability validated**: Partial Grounds for Refusal with per-identifier cascade; multi-identifier scope handling.

**Persona**: RS (primary), ATT (secondary)

**Workflow stage**: Collection · In Progress

**Case shape**: Poland / National / eEvidence · 3 identifiers (2 email + 1 phone) · mixed Consumer/Enterprise

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open the case.
2. Inspect the page-top alert zone for `GroundsForRefusalPanel`.
3. Inside CollectionTracker, identify the journalist identifier (LDID-100002).
4. Compare the action buttons / locks on the journalist row vs. the witness + phone rows.
5. Inspect the SLA chip in the sticky header.

**Expected Results**:
- Step 2: Amber Partial-GFR panel listing the blocked LDTask + reason `FreedomOfPressOrExpression`.
- Step 3: Journalist row clearly identifiable.
- Step 4: Journalist row shows red lock on every service / category; witness + phone rows fully actionable.
- Step 5: SLA chip is **unchanged** (Partial does NOT pause SLA).

**Pass criteria**: Per-identifier cascade — blocked LDTask gated, others proceed; SLA unaffected.

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

## 6. Cross-cutting smoke tests

Run these once per UAT cycle, after the per-case tests. They verify infrastructure not tied to any single case.

### UAT-DARS-SMOKE-A — All Cases queue
- Confirm all 21 case rows render in the queue.
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
| UAT-DARS-SMOKE-A | | | | | |
| UAT-DARS-SMOKE-B | | | | | |
| UAT-DARS-SMOKE-C | | | | | |
| UAT-DARS-SMOKE-D | | | | | |

**UAT lead sign-off**: ____________________  **Date**: ____________________

**Business owner sign-off**: ____________________  **Date**: ____________________

---

*End of document.*
