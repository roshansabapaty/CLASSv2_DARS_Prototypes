# UAT — UK COPO Mock Cases & Coverage Plan

**Document owner**: Lisa Wu (Principal PM)
**Last updated**: 2026-06-01
**Source environment**: DARS eEvidence prototype (`http://localhost:5173`)
**Scope**: Exhaustive UAT coverage for the **UK COPO Order** request-type variant in the DARS eEvidence prototype. Covers per-(service, category-group, item) end-to-end production runs, automated-vs-manual collection-verification matrices, and the full set of IA-pushed authorization-status update scenarios at both case and task level.

---

## 1. Purpose

This document is the canonical UK COPO acceptance plan for the DARS eEvidence prototype. It validates three independent capability families against the two seeded UK COPO mock cases (`LNS-2026-00160`, `LNS-2026-00170`) and against synthesised variants where the seeded cases do not exercise a code path:

1. **Family 1 — Per-service end-to-end tests.** One test per `(service, data-category-group, data-item)` triple in the UK-COPO-eligible service catalogue. Each test walks Triage → Fulfillment Wizard → Submission → Collection → Packaging → Delivery and pins down what the RS should see at every stage. The verification copy in Step 4 branches on whether the item is automated or manual — automated items must auto-advance through the CollectionTracker pipeline, manual items must route to `ManualCollectionForm`.
2. **Family 2 — Automated vs Manual verification matrix.** A single dense matrix table covering every Family 1 triple, naming the exact `CollectionTracker` / `ManualCollectionForm` surface the RS should observe and the copy that distinguishes automated runs from manual ones.
3. **Family 3 — Authorization desired status update scenarios.** One test per case-level `authorizationDesiredStatus` value and one per task-level `authorizationDesiredTaskStatus` value. Each test verifies the `AuthorizationStatusBanner` copy, the per-identifier task-status cascade (where applicable), delivery gating, the audit thread entry, and the Acknowledge / Resolve flows from the banner. Each Family 3 test ships with a per-test decision tree showing why its actions diverge from sibling tests.

Each test specifies:

- **Capability validated**: the routing rule or pipeline behaviour under test
- **Persona**: TS / RS / ATT
- **Preconditions**: seed + queue state
- **Test Steps**: numbered imperative actions
- **Expected Results**: bullet-keyed to step numbers
- **Pass criteria**: PASS/FAIL invariants for sign-off

---

## 2. Document conventions

### 2.1 Test ID format

- Per-case test IDs: `UAT-UKCOPO-NNN` — sequential, three-digit, zero-padded.
- Cross-cutting smoke tests: `UAT-UKCOPO-SMOKE-X` — single uppercase letter suffix.
- Test ID never replaces a Case ID; per-case headings concatenate both: `UAT-UKCOPO-NNN · LNS-YYYY-NNNNN — <Scenario title>`.

### 2.2 Persona key

| Code | Persona | Day-to-day responsibility |
| --- | --- | --- |
| TS | Triage Specialist | Receives intake, reconciles LE-external → LENS service names, routes to RS. |
| RS | Response Specialist | Drives Fulfillment Wizard, Submission, Collection, Packaging, Delivery. |
| ATT | LENS Attorney | Resolves attorney escalations, signs off CSE-exempt and other policy-flagged identifiers. |
| LENS | LENS automation | Background services that auto-advance automated jobs through the CollectionTracker pipeline. |

### 2.3 Workflow stages

| Stage label | When opened, lands on | Page-level chrome |
| --- | --- | --- |
| Waiting on Triage | DataEntryForm (Triage view) | Sticky case header, page-top alert zone, Identifier section |
| Fulfillment Wizard | FulfillmentWizard — Step 1 (Case Review) | Wizard header, Step-rail, page-top alert zone |
| Submission | FulfillmentWizard — Step 3 (Plan Review) | Submission CTA, Plan review table, AuthorizationStatusBanner mount |
| Collection | CollectionTracker | Pipeline status matrix, per-identifier rows, ManualCollectionForm for manual items |
| Packaging | CollectionTracker — Package stage | Manifest builder, Package CTA |
| Delivery | CollectionTracker — Delivery stage | Delivery CTA, FormPreviewPanel |

### 2.4 Pass / fail definitions

- **PASS** — every Expected Results bullet observed verbatim; no console errors; no whiteout.
- **FAIL (Blocker)** — at least one Expected Results bullet missing, miswired, or contradicted. Submit a P0 bug.
- **FAIL (Cosmetic)** — copy, alignment, colour deviation that does not affect routing or data correctness. Submit a P2 bug.
- **N/A** — case shape does not actually expose the asserted surface in the current build (note rationale in failure column).

---

## 3. How to use this document

1. Confirm the dev server is up and the All Cases queue is reachable from the left navigation rail.
2. Identify the test family you are running. Family 1 and Family 3 are case-by-case; Family 2 is a single sweep of the matrix.
3. For each per-case test, follow Preconditions → Test Steps in order. Do not skip steps even if you have run the case before — many invariants depend on first-mount handler behaviour.
4. Verify each `- Step N:` bullet under Expected Results against what the UI shows. Record PASS / FAIL (Blocker) / FAIL (Cosmetic) / N/A on the Section 7 sign-off sheet.
5. After per-case runs, execute Section 6 smoke tests once per UAT cycle.

---

## 4. Case index

| Test ID | Case ID | Scenario | Stage | Persona |
| --- | --- | --- | --- | --- |
| UAT-UKCOPO-001 | LNS-2026-00160 | UK COPO · MSA Subscriber Data · Basic Subscriber Data (automated) | Triage → Delivery | TS, RS |
| UAT-UKCOPO-002 | LNS-2026-00160 | UK COPO · MSA Subscriber Data · Date of Birth (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-003 | LNS-2026-00160 | UK COPO · MSA Subscriber Data · Gender (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-004 | LNS-2026-00160 | UK COPO · MSA Subscriber Data · Device Info (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-005 | LNS-2026-00160 | UK COPO · MSA Subscriber Data · Basic Billing (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-006 | LNS-2026-00160 | UK COPO · MSA Authentication Logs · Basic Authentication/IP (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-007 | LNS-2026-00160 | UK COPO · MSA Traffic Data · 2FA / MFA / Proof (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-008 | LNS-2026-00160 | UK COPO · MSA Traffic Data · Push Tokens (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-009 | LNS-2026-00160 | UK COPO · MSA Traffic Data · Detailed Billing (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-010 | LNS-2026-00160 | UK COPO · MSA Traffic Data · Reverse 2FA (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-011 | LNS-2026-00160 | UK COPO · MSA Traffic Data · Reverse IP (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-012 | LNS-2026-00160 | UK COPO · MSA Content Data · Unified Audit Logs (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-013 | LNS-2026-00170 | UK COPO · Exchange Consumer Traffic · Email Headers (Non-Content) (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-014 | LNS-2026-00170 | UK COPO · Exchange Consumer Content · Content Data (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-015 | LNS-2026-00170 | UK COPO · Exchange Consumer Content · Email Headers (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-016 | LNS-2026-00170 | UK COPO · Exchange Consumer Content · Email Contacts (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-017 | LNS-2026-00170 | UK COPO · Exchange Consumer Content · Email Calendar (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-018 | LNS-2026-00160 | UK COPO · Teams for Life · Generic Content (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-019 | LNS-2026-00160 | UK COPO · Teams for Life · Teams Live Intercept (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-020 | LNS-2026-00160 | UK COPO · OneDrive Consumer Traffic · Generic Traffic Data (automated) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-021 | LNS-2026-00160 | UK COPO · OneDrive Consumer Content · Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-022 | UKCOPO-XBOX-SYNTH | UK COPO · XBOX Subscriber Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-023 | UKCOPO-XBOX-SYNTH | UK COPO · XBOX Authentication Logs (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-024 | UKCOPO-XBOX-SYNTH | UK COPO · XBOX Traffic · Strike Logs (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-025 | UKCOPO-XBOX-SYNTH | UK COPO · XBOX Traffic · Purchase History (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-026 | UKCOPO-XBOX-SYNTH | UK COPO · XBOX Traffic · PrePaid Balance (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-027 | UKCOPO-XBOX-SYNTH | UK COPO · XBOX Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-028 | UKCOPO-SKYPE-SYNTH | UK COPO · Skype Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-029 | UKCOPO-MINECRAFT-SYNTH | UK COPO · Minecraft Traffic · Generic Traffic Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-030 | UKCOPO-MINECRAFT-SYNTH | UK COPO · Minecraft Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-031 | UKCOPO-GROUPME-SYNTH | UK COPO · GroupMe Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-032 | UKCOPO-COPILOT-SYNTH | UK COPO · CoPilot Consumer Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-033 | UKCOPO-ANY-SYNTH | UK COPO · DevTunnels Traffic · Generic Traffic Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-034 | UKCOPO-ANY-SYNTH | UK COPO · DevTunnels Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-035 | UKCOPO-ANY-SYNTH | UK COPO · BitLocker Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-036 | UKCOPO-ANY-SYNTH | UK COPO · Microsoft Ads Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-037 | UKCOPO-ANY-SYNTH | UK COPO · Bing Search Content Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-038 | UKCOPO-ANY-SYNTH | UK COPO · Microsoft Forms · Basic Subscriber Data (manual) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-039 | LNS-2026-00160 | UK COPO · Production Letters · Affidavit (manual; auto-enabled) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-040 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Subscriber · Basic Subscriber Data (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-041 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Subscriber · Language (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-042 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Subscriber · Date of Birth (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-043 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Subscriber · Device Info (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-044 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Subscriber · Gender (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-045 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Subscriber · Basic Billing (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-046 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Authentication Logs · Basic Authentication/IP (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-047 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Traffic · List of Accounts (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-048 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Traffic · List of Domains (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-049 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Traffic · Detailed Billing (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-050 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Traffic · Password Change History (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-051 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Traffic · Advertising Information (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-052 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Traffic · Reverse 2FA (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-053 | UKCOPO-ENT-SYNTH | UK COPO · EntraID Traffic · Reverse IP (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-054 | UKCOPO-ENT-SYNTH | UK COPO · Exchange Enterprise Traffic · Password Change History (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-055 | UKCOPO-ENT-SYNTH | UK COPO · Exchange Enterprise Traffic · Email Headers (Non-Content) (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-056 | UKCOPO-ENT-SYNTH | UK COPO · Exchange Enterprise Content · Content Data (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-057 | UKCOPO-ENT-SYNTH | UK COPO · Exchange Enterprise Content · Email Headers (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-058 | UKCOPO-ENT-SYNTH | UK COPO · Exchange Enterprise Content · Email Contacts (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-059 | UKCOPO-ENT-SYNTH | UK COPO · Exchange Enterprise Content · Email Calendar (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-060 | UKCOPO-ENT-SYNTH | UK COPO · Teams for Business Traffic · 2FA / MFA / Proof (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-061 | UKCOPO-ENT-SYNTH | UK COPO · Teams for Business Content · Generic Content (automated, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-062 | UKCOPO-ENT-SYNTH | UK COPO · OneDrive for Business Content · Content Data (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-063 | UKCOPO-ENT-SYNTH | UK COPO · SharePoint Online Content · Content Data (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-064 | UKCOPO-ENT-SYNTH | UK COPO · CoPilot Enterprise Content Data (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-065 | UKCOPO-ENT-SYNTH | UK COPO · Azure Storage Traffic · Generic Traffic Data (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-066 | UKCOPO-ENT-SYNTH | UK COPO · Azure Storage Content · Content Data (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-067 | UKCOPO-ENT-SYNTH | UK COPO · Azure Storage Content · Unified Audit Logs (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-068 | UKCOPO-ENT-SYNTH | UK COPO · Azure VM Disks Traffic · Generic Traffic Data (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-069 | UKCOPO-ENT-SYNTH | UK COPO · Azure VM Disks Content · Content Data (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-070 | UKCOPO-ENT-SYNTH | UK COPO · Azure VM Disks Content · Unified Audit Logs (manual, Enterprise) | Fulfillment → Delivery | RS |
| UAT-UKCOPO-100 | LNS-2026-00170 | Case-level `authorizationDesiredStatus = "Active"` (no-op baseline) | Fulfillment | RS |
| UAT-UKCOPO-101 | LNS-2026-00170 | Case-level `authorizationDesiredStatus = "Approved"` (untyped seed) | Fulfillment | RS |
| UAT-UKCOPO-102 | LNS-2026-00170 | Case-level `authorizationDesiredStatus = "Cancelled"` (terminal, scope=all) | Fulfillment → Collection | RS |
| UAT-UKCOPO-103 | LNS-2026-00170 | Case-level `authorizationDesiredStatus = "Withdrawn"` (terminal, scope=all) | Collection | RS |
| UAT-UKCOPO-104 | LNS-2026-00170 | Case-level `authorizationDesiredStatus = "Suspended"` (non-terminal) | Fulfillment | RS |
| UAT-UKCOPO-105 | LNS-2026-00170 | Case-level `authorizationDesiredStatus = "Expired"` (non-terminal, time-driven) | Collection | RS |
| UAT-UKCOPO-106 | LNS-2026-00170 | Case-level `authorizationDesiredStatus = "Rejected"` (untyped seed) | Fulfillment | RS |
| UAT-UKCOPO-110 | LNS-2026-00160 | Task-level `authorizationDesiredTaskStatus = "Requested"` (per-identifier baseline) | Fulfillment | RS |
| UAT-UKCOPO-111 | LNS-2026-00160 | Task-level `authorizationDesiredTaskStatus = "Active"` (per-identifier baseline) | Fulfillment | RS |
| UAT-UKCOPO-112 | LNS-2026-00160 | Task-level `authorizationDesiredTaskStatus = "Suspended"` (per-identifier warn) | Fulfillment | RS |
| UAT-UKCOPO-113 | LNS-2026-00160 | Task-level `authorizationDesiredTaskStatus = "Completed"` (per-identifier terminal-success) | Collection | RS |
| UAT-UKCOPO-114 | LNS-2026-00160 | Task-level `authorizationDesiredTaskStatus = "Cancelled"` (per-identifier terminal, scope=some) | Collection | RS |

---

## 4.5 UK COPO authorization-status decision tree

This tree explains *why* Family 3's expected results diverge across the 11 status-update tests. DARS's `applyAuthorizationStatusUpdate` (utils/caseEscalation.ts:514-556) enforces a **hybrid storage rule** — the same IA-pushed value lands in a different field, triggers a different banner, and gates a different surface depending on (a) whether the signal is case-level or task-level, (b) the `scope` of the signal, and (c) whether the value is terminal. When a Family 3 test's expected results reference a banner, chip, cascade, or gate, this tree tells you the routing rule that produced it.

```
On case open
│
├── requestType ≠ "COPO Order" OR country ≠ "GB"
│   └── Not in scope (out-of-scope for UK COPO suite — see UAT-MockCases.md for EU eEvidence)
│
└── requestType === "COPO Order" AND country === "GB"
    │
    ├── Signal kind === "case-level" (writes formData.authorizationDesiredStatus)
    │   │
    │   ├── status === "Active"  OR  "Approved" (untyped seed)
    │   │   ├── ► Workflow A — Baseline / no-op signal
    │   │   ├── Banner:  no AuthorizationStatusBanner mounts
    │   │   ├── Chip:    CaseSummaryCard outline badge "Approved" / "Active"
    │   │   ├── Gates:   none — isAuthorizationStatusTerminal returns false
    │   │   ├── Pipeline: full Triage → Fulfillment → Collection → Package → Delivery
    │   │   ├── Audit:   no entry appended (no signal observed)
    │   │   ├── Demo case: LNS-2026-00170
    │   │   └── UATs:    UAT-UKCOPO-100, UAT-UKCOPO-101
    │   │
    │   ├── status === "Cancelled"  (scope.kind === "all")
    │   │   ├── ► Workflow B — Case-wide Cancellation (terminal)
    │   │   ├── Banner:  red AuthorizationStatusBanner — "LE Cancelled — cease execution
    │   │   │            on the entire case" + Acknowledge CTA
    │   │   ├── Chip:    CaseHeaderSummary CancellationBadge (red) at top of sticky header
    │   │   ├── Gates:   cancellationLocked === true → Package + Deliver buttons DISABLED
    │   │   │            with tooltip "Action blocked — authorization cancelled."
    │   │   ├── Pipeline: ALL identifiers' authorizationDesiredTaskStatus mirrored to
    │   │   │            "Cancelled"; on Acknowledge, every identifier.taskStatus force-set
    │   │   │            to "Cancelled" (DataEntryForm.tsx:4857-4873)
    │   │   ├── Audit:   AuthorizationStatusUpdated (scope=all, status=Cancelled);
    │   │   │            on Acknowledge → AuthorizationStatusAcknowledged
    │   │   ├── Resolve: ResolveCase CTA prefilled; once cancellationAllStepsComplete →
    │   │   │            caseStage advances to "Cancelled"
    │   │   ├── Demo case: LNS-2026-00170
    │   │   └── UATs:    UAT-UKCOPO-102
    │   │
    │   ├── status === "Withdrawn"  (scope.kind === "all")
    │   │   ├── ► Workflow C — Case-wide Withdrawal (terminal)
    │   │   ├── Banner:  red WithdrawalBanner (preservation/withdrawal.ts:250-) —
    │   │   │            "IA Withdrew the order" + retention chip
    │   │   ├── Chip:    "Retention · 45-day clock from effective date"
    │   │   ├── Gates:   cancellationLocked === true; caseStage === "Withdrawn";
    │   │   │            isCaseWithdrawn === true → Delivery frozen
    │   │   ├── Pipeline: pending + ready-to-deliver jobs flipped to Cancelled;
    │   │   │            already-delivered jobs untouched
    │   │   ├── Audit:   EpocWithdrawn appended; startRetentionClock("Withdrawn") fires
    │   │   ├── Demo case: LNS-2026-00170
    │   │   └── UATs:    UAT-UKCOPO-103
    │   │
    │   ├── status === "Suspended"  (non-terminal)
    │   │   ├── ► Workflow D — Case-wide Pause (non-terminal)
    │   │   ├── Banner:  amber AuthorizationStatusBanner — "LE Suspended — pause
    │   │   │            execution" + Acknowledge CTA (informational, no gate)
    │   │   ├── Chip:    CaseSummaryCard warning badge "Suspended"
    │   │   ├── Gates:   none auto-fired; isAuthorizationStatusTerminal returns false;
    │   │   │            RS chooses whether to halt Collection manually
    │   │   ├── Pipeline: full pipeline still reachable (Suspended is advisory)
    │   │   ├── Audit:   AuthorizationStatusUpdated (scope=all, status=Suspended)
    │   │   ├── Demo case: LNS-2026-00170
    │   │   └── UATs:    UAT-UKCOPO-104
    │   │
    │   ├── status === "Expired"  (time-driven, non-terminal)
    │   │   ├── ► Workflow E — Authorization aged-out (advisory)
    │   │   ├── Banner:  amber AuthorizationStatusBanner — "Authorization expired
    │   │   │            <authorizationExpirationDate>" (no Acknowledge mutates state)
    │   │   ├── Chip:    CaseSummaryCard warning badge "Expired"
    │   │   ├── Gates:   none auto-fired; RS escalates back to LE for renewal
    │   │   ├── Pipeline: still walkable; Expired is informational not enforcing today
    │   │   ├── Audit:   AuthorizationStatusUpdated (scope=all, status=Expired,
    │   │   │            source=timeBased)
    │   │   ├── Demo case: LNS-2026-00170 (force expirationDate into the past)
    │   │   └── UATs:    UAT-UKCOPO-105
    │   │
    │   └── status === "Rejected"  (untyped seed)
    │       ├── ► Workflow F — Not-recognised IA value
    │       ├── Banner:  no AuthorizationStatusBanner mounts (value not in terminal set)
    │       ├── Chip:    CaseSummaryCard renders raw string "Rejected" with neutral tint
    │       ├── Gates:   none — isAuthorizationStatusTerminal returns false
    │       ├── Pipeline: full pipeline still reachable
    │       ├── Audit:   AuthorizationStatusUpdated (scope=all, status=Rejected) appended
    │       ├── Demo case: LNS-2026-00170
    │       └── UATs:    UAT-UKCOPO-106
    │
    └── Signal kind === "task-level"  (writes identifier.authorizationDesiredTaskStatus)
        │
        ├── status === "Requested"  (default, baseline)
        │   ├── ► Workflow G — Per-task baseline "to be created"
        │   ├── Banner:  no banner (per-task signal, no case-level chrome)
        │   ├── Chip:    PlanReviewTable "Authorization" column · informative badge
        │   │            "Requested" (PlanReviewTable.tsx:52-54)
        │   ├── Gates:   none
        │   ├── Pipeline: identifier proceeds normally; column only shows on
        │   │            requestType === "COPO Order" or "eEvidence"
        │   ├── Audit:   no entry until IA updates (Requested is the implicit default)
        │   ├── Demo case: LNS-2026-00160
        │   └── UATs:    UAT-UKCOPO-110
        │
        ├── status === "Active"  (default, baseline)
        │   ├── ► Workflow H — Per-task baseline "go ahead"
        │   ├── Banner:  no banner
        │   ├── Chip:    PlanReviewTable badge "Active" (brand Fluent color)
        │   ├── Gates:   none
        │   ├── Pipeline: identifier proceeds normally
        │   ├── Audit:   AuthorizationStatusUpdated (scope=some, status=Active) if pushed
        │   ├── Demo case: LNS-2026-00160
        │   └── UATs:    UAT-UKCOPO-111
        │
        ├── status === "Suspended"  (per-task warn)
        │   ├── ► Workflow I — Per-task pause (informational)
        │   ├── Banner:  case-level field cleared by applyAuthorizationStatusUpdate
        │   │            (scope=some); no case-level banner; per-identifier chip only
        │   ├── Chip:    PlanReviewTable badge "Suspended" (warning amber)
        │   ├── Gates:   none auto-fired at task scope; RS chooses whether to halt
        │   ├── Pipeline: identifier-level Collection still walkable
        │   ├── Audit:   AuthorizationStatusUpdated (scope=some, status=Suspended) +
        │   │            authorizationDesiredTaskStatusUpdatedAt/By
        │   ├── Demo case: LNS-2026-00160
        │   └── UATs:    UAT-UKCOPO-112
        │
        ├── status === "Completed"  (per-task terminal-success)
        │   ├── ► Workflow J — Per-task done (informational)
        │   ├── Banner:  no case-level banner
        │   ├── Chip:    PlanReviewTable badge "Completed" (success green)
        │   ├── Gates:   none auto-fired; the chip is signal only — taskStatus is NOT
        │   │            mutated by IA push
        │   ├── Pipeline: identifier may already be delivered; chip records IA's view
        │   ├── Audit:   AuthorizationStatusUpdated (scope=some, status=Completed)
        │   ├── Demo case: LNS-2026-00160
        │   └── UATs:    UAT-UKCOPO-113
        │
        └── status === "Cancelled"  (per-task terminal-disrupt, scope.kind === "some")
            ├── ► Workflow K — Per-task cancellation (informational + audit)
            ├── Banner:  no case-level banner (case-level field cleared by scope=some)
            ├── Chip:    PlanReviewTable badge "Cancelled" (danger red, disruption tier)
            ├── Gates:   cancellationLocked === false (only case-level Cancelled locks);
            │            per-task Cancelled does NOT auto-flip taskStatus and does NOT
            │            freeze the rest of the case
            ├── Pipeline: non-listed identifiers continue normally; listed identifier
            │            renders red chip but no automatic Collection halt
            ├── Audit:   AuthorizationStatusUpdated (scope=some, status=Cancelled) +
            │            authorizationDesiredTaskStatusUpdatedAt/By
            ├── Compare: this is the canonical "task-level vs case-level" contrast with
            │            UAT-UKCOPO-102 — same value, different scope, very different
            │            blast radius
            ├── Demo case: LNS-2026-00160
            └── UATs:    UAT-UKCOPO-114
```

### How to read this tree when interpreting a UAT result

- **Banner present?** Trace down the tree. Banners only mount under case-level Cancelled / Withdrawn / Suspended / Expired branches. A missing banner on a task-level Cancelled (UAT-UKCOPO-114) is correct, not a bug.
- **Delivery button disabled?** Three places gate it: (1) `cancellationLocked` (case-level Cancelled only), (2) `caseStage === "Withdrawn"` (Workflow C), (3) `isCaseWithdrawn` predicate. Per-task Cancelled does not flip any of these.
- **Identifier `taskStatus` cascade?** Only Workflow B (case-level Cancelled, scope=all) followed by the RS clicking Acknowledge writes `taskStatus = "Cancelled"` on every identifier. Per-task Cancelled (Workflow K) does NOT touch `taskStatus` — the only field that changes is `authorizationDesiredTaskStatus`.
- **Audit event missing?** Each workflow appends `AuthorizationStatusUpdated`; only Withdrawal (Workflow C) appends the additional `EpocWithdrawn` kind and starts the retention clock. If Workflow K does not show an entry, confirm the simulator dispatched with `scope.kind === "some"` and identifier IDs populated.

---

## 5. Test cases

> Each test below assumes you have already verified the dev server is up and opened the All Cases queue from the left navigation rail. Where a synthesised case ID is referenced (`UKCOPO-XBOX-SYNTH`, `UKCOPO-ENT-SYNTH`, etc.), seed it locally from the LNS-2026-00170 template, then mutate only the `leExternalServices` + `targetAccountType` fields per the test.

---

## 5.1 Family 1 — Per-service end-to-end tests (Consumer-scope + any-scope)

These tests target Consumer-scope services and any-scope services that are reachable from a UK COPO Consumer identifier. Each test isolates a single `(service, group, item)` triple to verify that the pipeline correctly partitions automated from manual collection paths.

---

### UAT-UKCOPO-001 · LNS-2026-00160 — UK COPO · MSA · Subscriber Data · Basic Subscriber Data (automated)

**Capability validated**: MSA `genericAttributes` lands the automated subscriber-data path; CollectionTracker auto-advances; Package + Deliver fire without manual entry.

**Persona**: TS (primary), RS (secondary)

**Workflow stage**: Triage → Fulfillment → Submission → Collection → Packaging → Delivery

**Case shape**: GB / National England and Wales / COPO Order · 1 Consumer email identifier `subject-uk@outlook.com` · CSE-exempt overlay · attorneyEscalation Pending (ATT-001)

**Preconditions**:
1. Default queue.
2. Acknowledge the attorney escalation as ATT-001 before walking the pipeline (CSE-exempt cases route through `AttorneyReviewPanel` first).

**Test Steps**:
1. Open the case from the queue.
2. In Triage, confirm the LE-external → LENS service-name resolver maps `Microsoft Account Profile` to `msaProfile` on first mount.
3. Enable `msaProfile` on the identifier; under Subscriber Data, leave only `Basic Subscriber Data` checked and disable all other items.
4. Push to Fulfillment Wizard. In Step 2, confirm `Basic Subscriber Data` is marked **Automated**.
5. Submit and open CollectionTracker. Observe job auto-advance through `Started → Complete`.
6. Package. Confirm the deliverable manifest lists MSA subscriber-data attributes per the `info` field (`Name (Reg); CID (hex); PUID; Address; Phone Number; Creation Date; …`).
7. Deliver. Confirm Delivery succeeds and the audit thread records `JobCompleted → DeliveryAcknowledged`.

**Expected Results**:
- Step 2: Resolver chip shows "Microsoft Account Profile → msaProfile" with a green Resolved badge.
- Step 4: Item carries an "Automated" pill in the PlanReviewTable.
- Step 5: Pipeline status matrix flips green within the simulated tick; no `ManualCollectionForm` mounts.
- Step 6: Manifest preview lists the verbatim `info` attribute string.
- Step 7: Audit thread shows `JobCompleted` (LENS automation) and `DeliveryAcknowledged` (RS).

**Pass criteria**: Automated pipeline runs without RS data entry; deliverable manifest matches the canonical MSA subscriber attribute list.

---

### UAT-UKCOPO-002 · LNS-2026-00160 — UK COPO · MSA · Subscriber Data · Date of Birth (automated)

**Capability validated**: MSA `dateOfBirth` automated path produces a single-attribute deliverable.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case and push to Fulfillment Wizard.
2. In Step 2, enable `msaProfile` and under Subscriber Data leave only `Date of Birth` checked.
3. Submit and walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: `Date of Birth` carries an "Automated" pill.
- Step 3: CollectionTracker auto-advances; manifest contains only "Date of Birth"; Delivery succeeds.

**Pass criteria**: Automated end-to-end with a one-attribute deliverable.

---

### UAT-UKCOPO-003 · LNS-2026-00160 — UK COPO · MSA · Subscriber Data · Gender (automated)

**Capability validated**: MSA `gender` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Subscriber Data check only `Gender`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest contains only "Gender"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-004 · LNS-2026-00160 — UK COPO · MSA · Subscriber Data · Device Info (automated)

**Capability validated**: MSA `deviceInfo` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Subscriber Data check only `Device Info`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest contains "Device Info"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-005 · LNS-2026-00160 — UK COPO · MSA · Subscriber Data · Basic Billing (manual)

**Capability validated**: MSA `basicBilling` routes to `ManualCollectionForm`; RS enters billing data and attaches evidence; status set by hand.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Subscriber Data check only `Basic Billing`.
3. Submit. In CollectionTracker, click the Basic Billing job row.
4. Confirm `ManualCollectionForm` opens. Enter Billing Address, Account Holder Name, Expiration Date, Payment Method Last 4. Attach a stub evidence file.
5. Set status to `Complete`. Save.
6. Package and Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders on Basic Billing in PlanReviewTable.
- Step 3: Job row does NOT auto-advance; status stays `Pending` until RS opens it.
- Step 4: `ManualCollectionForm` renders with named fields matching the `info` string.
- Step 5: Status flips to `Complete`; audit thread shows `ManualCollectionRecorded`.
- Step 6: Package + Deliver succeed.

**Pass criteria**: No auto-advance; manual form drives status; evidence file attached.

---

### UAT-UKCOPO-006 · LNS-2026-00160 — UK COPO · MSA · Authentication Logs · Basic Authentication/IP (automated)

**Capability validated**: MSA `authenticationLogs.genericAttributes` automated path; auth/IP history deliverable.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Authentication Logs check only `Basic Authentication/IP`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Auth Logs / IP History"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-007 · LNS-2026-00160 — UK COPO · MSA · Traffic Data · 2FA / MFA / Proof (manual)

**Capability validated**: MSA `trafficData.2FAMFAProof` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Traffic Data check only `2FA / MFA / Proof`.
3. Submit. Open the `2FA / MFA / Proof` job row in CollectionTracker.
4. In `ManualCollectionForm`, enter MFA method details, proof timestamps, attach a stub evidence file.
5. Set status `Complete`. Save.
6. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Job row does not auto-advance.
- Step 4: `ManualCollectionForm` opens; RS-entered values persist on save.
- Step 6: Package + Deliver succeed.

**Pass criteria**: Manual entry drives status; deliverable carries RS-attached evidence.

---

### UAT-UKCOPO-008 · LNS-2026-00160 — UK COPO · MSA · Traffic Data · Push Tokens (manual)

**Capability validated**: MSA `pushTokens` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Traffic Data check only `Push Tokens`.
3. Submit. Open job row. Enter push token records and attach evidence in `ManualCollectionForm`.
4. Set status `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: `ManualCollectionForm` opens; manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-009 · LNS-2026-00160 — UK COPO · MSA · Traffic Data · Detailed Billing (manual)

**Capability validated**: MSA `detailedBilling` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Traffic Data check only `Detailed Billing`.
3. Submit, open the manual job, enter detailed billing rows, attach evidence.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-010 · LNS-2026-00160 — UK COPO · MSA · Traffic Data · Reverse 2FA (manual)

**Capability validated**: MSA `reverse2FA` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Traffic Data check only `Reverse 2FA`.
3. Submit, open job, manually enter reverse-lookup results, attach evidence.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-011 · LNS-2026-00160 — UK COPO · MSA · Traffic Data · Reverse IP (manual)

**Capability validated**: MSA `reverseIP` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Traffic Data check only `Reverse IP`.
3. Submit, open job, manually enter reverse-IP lookup results, attach evidence.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-012 · LNS-2026-00160 — UK COPO · MSA · Content Data · Unified Audit Logs (manual)

**Capability validated**: MSA `contentData.unifiedAuditLogs` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `msaProfile`, under Content Data check only `Unified Audit Logs`.
3. Submit, open job, manually attach UAL CSV/JSON exports.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists; file attachments saved.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-013 · LNS-2026-00170 — UK COPO · Exchange Consumer · Traffic Data · Email Headers (Non-Content) (automated)

**Capability validated**: ExchangeConsumer `emailHeadersNonContent` automated path on the clean rehearsal case.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · no escalation

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open `LNS-2026-00170` and push to Fulfillment.
2. Confirm `Email` resolves to `exchangeConsumer`. Enable `exchangeConsumer`.
3. Under Traffic Data check only `Email Headers (Non-Content)`.
4. Submit and walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: Resolver shows "Email → exchangeConsumer".
- Step 3: "Automated" pill renders.
- Step 4: Auto-advance; manifest carries "Email Headers (Non-Content)"; Delivery succeeds.

**Pass criteria**: Automated end-to-end on the clean case.

---

### UAT-UKCOPO-014 · LNS-2026-00170 — UK COPO · Exchange Consumer · Content Data · Content Data (automated)

**Capability validated**: ExchangeConsumer `contentData.genericAttributes` (Email Content) automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open `LNS-2026-00170`, push to Fulfillment.
2. Enable `exchangeConsumer`, under Content Data check only `Content Data`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Email Content"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-015 · LNS-2026-00170 — UK COPO · Exchange Consumer · Content Data · Email Headers (automated)

**Capability validated**: ExchangeConsumer `emailHeaders` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open `LNS-2026-00170`, push to Fulfillment.
2. Enable `exchangeConsumer`, under Content Data check only `Email Headers`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Email Headers"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-016 · LNS-2026-00170 — UK COPO · Exchange Consumer · Content Data · Email Contacts (automated)

**Capability validated**: ExchangeConsumer `emailContacts` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open `LNS-2026-00170`, push to Fulfillment.
2. Enable `exchangeConsumer`, under Content Data check only `Email Contacts`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Email Contacts"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-017 · LNS-2026-00170 — UK COPO · Exchange Consumer · Content Data · Email Calendar (automated)

**Capability validated**: ExchangeConsumer `emailCalendar` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue.

**Test Steps**:
1. Open `LNS-2026-00170`, push to Fulfillment.
2. Enable `exchangeConsumer`, under Content Data check only `Email Calendar`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Email Calendar"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-018 · LNS-2026-00160 — UK COPO · Teams for Life · Content Data · Generic Content (automated)

**Capability validated**: TeamsForLife `genericAttributesChats` automated path (Teams Chat Messaging deliverable).

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · CSE overlay

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open `LNS-2026-00160`, push to Fulfillment.
2. Confirm `Teams` resolves to `teamsForLife`. Enable it.
3. Under Content Data check only `Generic Content`.
4. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: Resolver shows "Teams → teamsForLife".
- Step 3: "Automated" pill renders.
- Step 4: Auto-advance; manifest carries "Teams Chat Messaging"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-019 · LNS-2026-00160 — UK COPO · Teams for Life · Content Data · Teams Live Intercept (manual)

**Capability validated**: TeamsForLife `teamsLiveIntercept` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `teamsForLife`, under Content Data check only `Teams Live Intercept`.
3. Submit, open job, manually configure intercept window + attach intercept evidence.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: `ManualCollectionForm` opens; intercept config persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-020 · LNS-2026-00160 — UK COPO · OneDrive for Consumer · Traffic Data · Generic Traffic Data (automated)

**Capability validated**: OneDriveConsumer `trafficData.genericAttributes` (API Logs) automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Confirm `OneDrive` resolves to `oneDriveConsumer`. Enable it.
3. Under Traffic Data check only `Generic Traffic Data`.
4. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: Resolver shows "OneDrive → oneDriveConsumer".
- Step 3: "Automated" pill renders.
- Step 4: Auto-advance; manifest carries "API Logs"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-021 · LNS-2026-00160 — UK COPO · OneDrive for Consumer · Content Data · Content Data (manual)

**Capability validated**: OneDriveConsumer `contentData.genericAttributes` (OneDrive Content) manual path — content is always manual for OneDrive Consumer.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `oneDriveConsumer`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach OneDrive content export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: `ManualCollectionForm` opens.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-022 · UKCOPO-XBOX-SYNTH — UK COPO · XBOX · Subscriber Data (manual)

**Capability validated**: XBOX `subscriberData.genericAttributes` manual path on a synthesised UK COPO Consumer identifier that carries `XBOX/Minecraft` in `leExternalServices`.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier (XBOX gamertag pattern)

**Preconditions**:
1. Seed `UKCOPO-XBOX-SYNTH` from `LNS-2026-00170` template; mutate `leExternalServices = ["Microsoft Account Profile","XBOX/Minecraft"]` and confirm resolver maps to `xbox`.

**Test Steps**:
1. Open the synthesised case, push to Fulfillment.
2. Enable `xbox`, under Subscriber Data check only `Basic Subscriber Data`.
3. Submit, open job, manually enter Xbox Gamertag, MSA, Account Created Date, Customer Name, Country, Contact Email; attach evidence.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: `ManualCollectionForm` exposes XBOX-shaped fields.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end on XBOX subscriber data.

---

### UAT-UKCOPO-023 · UKCOPO-XBOX-SYNTH — UK COPO · XBOX · Authentication Logs (manual)

**Capability validated**: XBOX `authenticationLogs.genericAttributes` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-XBOX-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `xbox`, under Authentication Logs check only `Basic Authentication/IP`.
3. Submit, open job, manually enter IP history rows + serial-number + gamertag pairing, attach evidence.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-024 · UKCOPO-XBOX-SYNTH — UK COPO · XBOX · Traffic Data · Strike Logs (manual)

**Capability validated**: XBOX `strikeLogs` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-XBOX-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `xbox`, under Traffic Data check only `Strike Logs`.
3. Submit, open job, manually attach strike-log export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-025 · UKCOPO-XBOX-SYNTH — UK COPO · XBOX · Traffic Data · Purchase History (manual)

**Capability validated**: XBOX `purchaseHistory` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-XBOX-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `xbox`, under Traffic Data check only `Purchase History`.
3. Submit, open job, manually attach purchase-history export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-026 · UKCOPO-XBOX-SYNTH — UK COPO · XBOX · Traffic Data · PrePaid Balance (manual)

**Capability validated**: XBOX `prePaidBalance` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-XBOX-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `xbox`, under Traffic Data check only `PrePaid Balance`.
3. Submit, open job, manually enter prepaid balance + supporting evidence.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-027 · UKCOPO-XBOX-SYNTH — UK COPO · XBOX · Content Data (manual)

**Capability validated**: XBOX `contentData.genericAttributes` (Profile Photo, Clubs, Contacts, Content, Video, Voice) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-XBOX-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `xbox`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach the six content categories listed in the `info` field.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: `ManualCollectionForm` lists all six XBOX content categories.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end with all six XBOX content categories captured.

---

### UAT-UKCOPO-028 · UKCOPO-SKYPE-SYNTH — UK COPO · Skype · Content Data (manual)

**Capability validated**: Skype `contentData.genericAttributes` (Contact List / Buddy List) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Seed `UKCOPO-SKYPE-SYNTH` from `LNS-2026-00170` template; add `Skype` to `leExternalServices` (note: not in current resolver map — manually enable `skype` in Step 2).

**Test Steps**:
1. Open the case, push to Fulfillment.
2. In Step 2, manually enable `skype` (resolver will surface "wrong-account-type" if account check returns non-Skype — override).
3. Under Content Data check only `Content Data`.
4. Submit, open job, manually attach Skype buddy list export.
5. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 3: "Manual" pill renders.
- Step 4: Manual entry persists.
- Step 5: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end on Skype.

---

### UAT-UKCOPO-029 · UKCOPO-MINECRAFT-SYNTH — UK COPO · Minecraft · Traffic Data · Generic Traffic Data (manual)

**Capability validated**: Minecraft `trafficData.genericAttributes` (Purchase History) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Seed `UKCOPO-MINECRAFT-SYNTH` from `LNS-2026-00170` template; mutate `leExternalServices` to include `XBOX/Minecraft` and force resolution to `minecraft` (override XBOX if both compete).

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `minecraft`, under Traffic Data check only `Generic Traffic Data`.
3. Submit, open job, manually attach Minecraft purchase-history export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end on Minecraft traffic data.

---

### UAT-UKCOPO-030 · UKCOPO-MINECRAFT-SYNTH — UK COPO · Minecraft · Content Data (manual)

**Capability validated**: Minecraft `contentData.genericAttributes` (Minecraft Content) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-MINECRAFT-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `minecraft`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach Minecraft content export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end on Minecraft content.

---

### UAT-UKCOPO-031 · UKCOPO-GROUPME-SYNTH — UK COPO · GroupMe · Content Data (manual)

**Capability validated**: GroupMe `contentData.genericAttributes` (Chat Content) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Seed `UKCOPO-GROUPME-SYNTH` from `LNS-2026-00170` template; manually enable `groupMe` (no resolver mapping today).

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Manually enable `groupMe`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach GroupMe chat export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end on GroupMe.

---

### UAT-UKCOPO-032 · UKCOPO-COPILOT-SYNTH — UK COPO · CoPilot Consumer · Content Data (manual)

**Capability validated**: CoPilotConsumer `contentData.genericAttributes` (Prompts & Responses) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Seed `UKCOPO-COPILOT-SYNTH` from `LNS-2026-00170` template; manually enable `coPilotConsumer`.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `coPilotConsumer`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach CoPilot prompts & responses export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-033 · UKCOPO-ANY-SYNTH — UK COPO · DevTunnels · Traffic Data · Generic Traffic Data (manual)

**Capability validated**: DevTunnels `trafficData.genericAttributes` (Device Info) manual path on an any-scope service.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Seed `UKCOPO-ANY-SYNTH` from `LNS-2026-00170` template; manually enable `devTunnels`.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `devTunnels`, under Traffic Data check only `Generic Traffic Data`.
3. Submit, open job, manually attach DevTunnels device info export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end on DevTunnels traffic.

---

### UAT-UKCOPO-034 · UKCOPO-ANY-SYNTH — UK COPO · DevTunnels · Content Data (manual)

**Capability validated**: DevTunnels `contentData.genericAttributes` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-ANY-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `devTunnels`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach DevTunnels content export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-035 · UKCOPO-ANY-SYNTH — UK COPO · BitLocker · Content Data (manual)

**Capability validated**: BitLocker `contentData.genericAttributes` (BitLocker Key) manual path on an any-scope service.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-ANY-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `bitlocker`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach BitLocker recovery key + provenance.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end on BitLocker key delivery.

---

### UAT-UKCOPO-036 · UKCOPO-ANY-SYNTH — UK COPO · Microsoft Ads · Content Data (manual)

**Capability validated**: Microsoft Ads `contentData.genericAttributes` (Domain Names; Keywords) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-ANY-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `microsoftAds`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach Ads domain/keyword export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-037 · UKCOPO-ANY-SYNTH — UK COPO · Bing Search · Content Data (manual)

**Capability validated**: Bing Search `contentData.genericAttributes` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-ANY-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `bingSearch`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach Bing query content export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-038 · UKCOPO-ANY-SYNTH — UK COPO · Microsoft Forms · Subscriber Data (manual)

**Capability validated**: Microsoft Forms `subscriberData.genericAttributes` (Associated Account Information) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. `UKCOPO-ANY-SYNTH` seeded.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `microsoftForms`, under Subscriber Data check only `Basic Subscriber Data`.
3. Submit, open job, manually attach Forms-associated account info.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-039 · LNS-2026-00160 — UK COPO · Production Letters · Affidavit (manual; auto-enabled for COPO)

**Capability validated**: Production Letters `disclosureLetters.affidavit` auto-enables on UK COPO cases (`autoEnabledForCOPO: true`, `requestTypeScope: ["COPO Order"]`); manual upload via the manual collection form's notes attachment.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Default queue. Acknowledge attorney escalation first.

**Test Steps**:
1. Open `LNS-2026-00160`, push to Fulfillment.
2. In Step 2, confirm `productionLetters` is auto-enabled (visible without explicit toggle) and `Affidavit` is pre-checked under Disclosure Letters.
3. Submit, open the Affidavit job row.
4. In `ManualCollectionForm`, attach a sworn statement / supporting affidavit file in the notes attachment slot.
5. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: `productionLetters` rendered as pre-selected with an "Auto-enabled (COPO)" badge.
- Step 3: Affidavit row marked "Manual"; does not auto-advance.
- Step 4: Notes attachment slot accepts the file.
- Step 5: Package + Deliver succeed; Affidavit appears in the delivered manifest.

**Pass criteria**: Auto-enable on COPO observed; manual file upload persists; deliverable carries affidavit.

---

## 5.2 Family 1 — Per-service end-to-end tests (Enterprise-scope, synthesised UK COPO Enterprise case)

UK COPO can in theory target Enterprise tenants. These tests use a synthesised case `UKCOPO-ENT-SYNTH` cloned from `LNS-2026-00170` with `targetAccountType = "Enterprise"` and `leExternalServices` extended to include `SharePoint`. They verify that all Enterprise-scope services in the catalogue are reachable from a UK COPO case.

---

### UAT-UKCOPO-040 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Subscriber Data · Basic Subscriber Data (automated)

**Capability validated**: EntraID `subscriberData.genericAttributes` automated path on an Enterprise UK COPO identifier.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. Seed `UKCOPO-ENT-SYNTH`; confirm `Microsoft Account Profile` resolves to `entraIDProfile` for Enterprise account-type.

**Test Steps**:
1. Open the case, push to Fulfillment.
2. Enable `entraIDProfile`, under Subscriber Data check only `Basic Subscriber Data`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: Resolver shows "Microsoft Account Profile → entraIDProfile (Enterprise)".
- Step 3: "Automated" pill renders; manifest carries PUID/Organization Profile attributes; Delivery succeeds.

**Pass criteria**: Automated end-to-end on EntraID subscriber data.

---

### UAT-UKCOPO-041 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Subscriber Data · Language (automated)

**Capability validated**: EntraID `language` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Subscriber Data check only `Language`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Language"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-042 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Subscriber Data · Date of Birth (automated)

**Capability validated**: EntraID `dateOfBirth` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Subscriber Data check only `Date of Birth`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Date of Birth"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-043 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Subscriber Data · Device Info (automated)

**Capability validated**: EntraID `deviceInfo` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Subscriber Data check only `Device Info`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Device Info"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-044 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Subscriber Data · Gender (automated)

**Capability validated**: EntraID `gender` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Subscriber Data check only `Gender`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Gender"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-045 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Subscriber Data · Basic Billing (manual)

**Capability validated**: EntraID `basicBilling` manual path (Subscriptions; Billing Address; Account Holder Name; Expiration Date; Payment Method Last 4).

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Subscriber Data check only `Basic Billing`.
3. Submit, open job, manually enter subscription + billing rows, attach evidence.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-046 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Authentication Logs · Basic Authentication/IP (automated)

**Capability validated**: EntraID `authenticationLogs.genericAttributes` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Authentication Logs check only `Basic Authentication/IP`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Auth Logs / IP History"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-047 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Traffic Data · List of Accounts (manual)

**Capability validated**: EntraID `listOfAccounts` (SMTP) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Traffic Data check only `List of Accounts`.
3. Submit, open job, manually attach SMTP account list.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-048 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Traffic Data · List of Domains (manual)

**Capability validated**: EntraID `listOfDomains` (SMTP) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Traffic Data check only `List of Domains`.
3. Submit, open job, manually attach SMTP domain list.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-049 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Traffic Data · Detailed Billing (manual)

**Capability validated**: EntraID `detailedBilling` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Traffic Data check only `Detailed Billing`.
3. Submit, open job, manually enter detailed billing rows.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-050 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Traffic Data · Password Change History (manual)

**Capability validated**: EntraID `passwordChangeHistory` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Traffic Data check only `Password Change History`.
3. Submit, open job, manually attach password-change history.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-051 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Traffic Data · Advertising Information (manual)

**Capability validated**: EntraID `advertisingInformation` (Bing Ads) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Traffic Data check only `Advertising Information`.
3. Submit, open job, manually attach Bing Ads info.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-052 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Traffic Data · Reverse 2FA (manual)

**Capability validated**: EntraID `reverse2FA` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Traffic Data check only `Reverse 2FA`.
3. Submit, open job, manually attach reverse 2FA lookup.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-053 · UKCOPO-ENT-SYNTH — UK COPO · EntraID · Traffic Data · Reverse IP (manual)

**Capability validated**: EntraID `reverseIP` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `entraIDProfile`, under Traffic Data check only `Reverse IP`.
3. Submit, open job, manually attach reverse-IP lookup.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-054 · UKCOPO-ENT-SYNTH — UK COPO · Exchange Enterprise · Traffic Data · Password Change History (manual)

**Capability validated**: ExchangeEnterprise `passwordChangeHistory` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `exchangeEnterprise`, under Traffic Data check only `Password Change History`.
3. Submit, open job, manually attach Exchange Enterprise password-change history.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-055 · UKCOPO-ENT-SYNTH — UK COPO · Exchange Enterprise · Traffic Data · Email Headers (Non-Content) (automated)

**Capability validated**: ExchangeEnterprise `emailHeadersNonContent` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `exchangeEnterprise`, under Traffic Data check only `Email Headers (Non-Content)`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Email Headers (Non-Content)"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-056 · UKCOPO-ENT-SYNTH — UK COPO · Exchange Enterprise · Content Data · Content Data (automated)

**Capability validated**: ExchangeEnterprise `contentData.genericAttributes` (Email Content) automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `exchangeEnterprise`, under Content Data check only `Content Data`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Email Content"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-057 · UKCOPO-ENT-SYNTH — UK COPO · Exchange Enterprise · Content Data · Email Headers (automated)

**Capability validated**: ExchangeEnterprise `emailHeaders` (Email Full Headers) automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `exchangeEnterprise`, under Content Data check only `Email Headers`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Email Full Headers"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-058 · UKCOPO-ENT-SYNTH — UK COPO · Exchange Enterprise · Content Data · Email Contacts (automated)

**Capability validated**: ExchangeEnterprise `emailContacts` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `exchangeEnterprise`, under Content Data check only `Email Contacts`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Email Contacts"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-059 · UKCOPO-ENT-SYNTH — UK COPO · Exchange Enterprise · Content Data · Email Calendar (automated)

**Capability validated**: ExchangeEnterprise `emailCalendar` automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `exchangeEnterprise`, under Content Data check only `Email Calendar`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Email Calendar"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-060 · UKCOPO-ENT-SYNTH — UK COPO · Teams for Business · Traffic Data · 2FA / MFA / Proof (manual)

**Capability validated**: TeamsForBusiness `2FAMFAProof` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `teamsForBusiness`, under Traffic Data check only `2FA / MFA / Proof`.
3. Submit, open job, manually attach MFA proof.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-061 · UKCOPO-ENT-SYNTH — UK COPO · Teams for Business · Content Data · Generic Content (automated)

**Capability validated**: TeamsForBusiness `genericAttributesChats` (Teams Chat Messaging) automated path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `teamsForBusiness`, under Content Data check only `Generic Content`.
3. Submit, walk CollectionTracker → Package → Deliver.

**Expected Results**:
- Step 2: "Automated" pill renders.
- Step 3: Auto-advance; manifest carries "Teams Chat Messaging"; Delivery succeeds.

**Pass criteria**: Automated end-to-end.

---

### UAT-UKCOPO-062 · UKCOPO-ENT-SYNTH — UK COPO · OneDrive for Business · Content Data · Content Data (manual)

**Capability validated**: OneDriveForBusiness `contentData.genericAttributes` (OneDrive Content) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `oneDriveForBusiness`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach OneDrive content export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-063 · UKCOPO-ENT-SYNTH — UK COPO · SharePoint Online · Content Data · Content Data (manual)

**Capability validated**: SharePointOnline `contentData.genericAttributes` (SharePoint Content) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded with `SharePoint` in `leExternalServices`.

**Test Steps**:
1. Open, push to Fulfillment.
2. Confirm `SharePoint` resolves to `sharePointOnline`. Enable it.
3. Under Content Data check only `Content Data`.
4. Submit, open job, manually attach SharePoint content export.
5. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: Resolver shows "SharePoint → sharePointOnline".
- Step 3: "Manual" pill renders.
- Step 4: Manual entry persists.
- Step 5: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-064 · UKCOPO-ENT-SYNTH — UK COPO · CoPilot Enterprise · Content Data (manual)

**Capability validated**: CoPilotEnterprise `contentData.genericAttributes` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `coPilotEnterprise`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach CoPilot prompts/responses + Tenant ID.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-065 · UKCOPO-ENT-SYNTH — UK COPO · Azure Storage · Traffic Data · Generic Traffic Data (manual)

**Capability validated**: Azure Storage `trafficData.genericAttributes` (ARM Logs; Netflow IP) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `azureStorage`, under Traffic Data check only `Generic Traffic Data`.
3. Submit, open job, manually attach ARM logs + Netflow IP exports.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-066 · UKCOPO-ENT-SYNTH — UK COPO · Azure Storage · Content Data · Content Data (manual)

**Capability validated**: Azure Storage `contentData.genericAttributes` (Blobs; Sites; File Shares; Tables and Queues) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `azureStorage`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach Azure Storage content export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-067 · UKCOPO-ENT-SYNTH — UK COPO · Azure Storage · Content Data · Unified Audit Logs (manual)

**Capability validated**: Azure Storage `unifiedAuditLogs` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `azureStorage`, under Content Data check only `Unified Audit Logs`.
3. Submit, open job, manually attach UAL export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-068 · UKCOPO-ENT-SYNTH — UK COPO · Azure VM Disks · Traffic Data · Generic Traffic Data (manual)

**Capability validated**: Azure VM Disks `trafficData.genericAttributes` (ARM Logs; Netflow IP; VIP History) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `azureVMDisks`, under Traffic Data check only `Generic Traffic Data`.
3. Submit, open job, manually attach VM Disks traffic export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-069 · UKCOPO-ENT-SYNTH — UK COPO · Azure VM Disks · Content Data · Content Data (manual)

**Capability validated**: Azure VM Disks `contentData.genericAttributes` (Azure VMs & Disks) manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `azureVMDisks`, under Content Data check only `Content Data`.
3. Submit, open job, manually attach VM image / disk content export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

### UAT-UKCOPO-070 · UKCOPO-ENT-SYNTH — UK COPO · Azure VM Disks · Content Data · Unified Audit Logs (manual)

**Capability validated**: Azure VM Disks `unifiedAuditLogs` manual path.

**Persona**: RS

**Workflow stage**: Fulfillment → Delivery

**Case shape**: GB / National / COPO Order · 1 Enterprise identifier

**Preconditions**:
1. `UKCOPO-ENT-SYNTH` seeded.

**Test Steps**:
1. Open, push to Fulfillment.
2. Enable `azureVMDisks`, under Content Data check only `Unified Audit Logs`.
3. Submit, open job, manually attach UAL export.
4. Set `Complete`. Package + Deliver.

**Expected Results**:
- Step 2: "Manual" pill renders.
- Step 3: Manual entry persists.
- Step 4: Package + Deliver succeed.

**Pass criteria**: Manual end-to-end.

---

## 5.3 Family 2 — Automated vs Manual verification matrix

The single sweep below covers every `(service, group, item)` triple in the Family 1 test set. For each row, the **Verification approach** column states exactly what the RS should observe in CollectionTracker (automated) or ManualCollectionForm (manual). Run this matrix once per UAT cycle alongside the Family 1 per-test executions; it doubles as a coverage checklist and a quick-reference for what "correct" looks like at the Collection stage.

| Service | Category Group | Item | Automated? | Verification approach |
| --- | --- | --- | --- | --- |
| msaProfile | Subscriber Data | Basic Subscriber Data | Yes | CollectionTracker job row auto-advances `Pending → Started → Complete`; status flips green within the simulated tick; manifest preview lists MSA subscriber attributes (`Name (Reg); CID (hex); PUID; …`); no `ManualCollectionForm` mounts. |
| msaProfile | Subscriber Data | Date of Birth | Yes | CollectionTracker job auto-advances; deliverable carries "Date of Birth"; no manual form. |
| msaProfile | Subscriber Data | Gender | Yes | CollectionTracker job auto-advances; deliverable carries "Gender". |
| msaProfile | Subscriber Data | Device Info | Yes | CollectionTracker job auto-advances; deliverable carries "Device Info". |
| msaProfile | Subscriber Data | Basic Billing | No | Job row stays `Pending`; opens `ManualCollectionForm`; RS enters Billing Address, Account Holder Name, Expiration Date, Payment Method Last 4; attaches evidence; sets status `Complete` by hand. |
| msaProfile | Authentication Logs | Basic Authentication/IP | Yes | CollectionTracker job auto-advances; deliverable carries "Auth Logs / IP History". |
| msaProfile | Traffic Data | 2FA / MFA / Proof | No | `ManualCollectionForm` opens; RS enters MFA method + timestamps + proof; attaches evidence; sets `Complete`. |
| msaProfile | Traffic Data | Push Tokens | No | `ManualCollectionForm` opens; RS enters token records; attaches evidence; sets `Complete`. |
| msaProfile | Traffic Data | Detailed Billing | No | `ManualCollectionForm` opens; RS enters detailed billing rows; attaches evidence; sets `Complete`. |
| msaProfile | Traffic Data | Reverse 2FA | No | `ManualCollectionForm` opens; RS enters reverse-2FA lookup results; sets `Complete`. |
| msaProfile | Traffic Data | Reverse IP | No | `ManualCollectionForm` opens; RS enters reverse-IP lookup results; sets `Complete`. |
| msaProfile | Content Data | Unified Audit Logs | No | `ManualCollectionForm` opens; RS attaches UAL export; sets `Complete`. |
| exchangeConsumer | Traffic Data | Email Headers (Non-Content) | Yes | CollectionTracker job auto-advances; deliverable carries "Email Headers (Non-Content)". |
| exchangeConsumer | Content Data | Content Data | Yes | CollectionTracker job auto-advances; deliverable carries "Email Content". |
| exchangeConsumer | Content Data | Email Headers | Yes | CollectionTracker job auto-advances; deliverable carries "Email Headers". |
| exchangeConsumer | Content Data | Email Contacts | Yes | CollectionTracker job auto-advances; deliverable carries "Email Contacts". |
| exchangeConsumer | Content Data | Email Calendar | Yes | CollectionTracker job auto-advances; deliverable carries "Email Calendar". |
| teamsForLife | Content Data | Generic Content | Yes | CollectionTracker job auto-advances; deliverable carries "Teams Chat Messaging". |
| teamsForLife | Content Data | Teams Live Intercept | No | `ManualCollectionForm` opens; RS configures intercept window + attaches intercept evidence; sets `Complete`. |
| oneDriveConsumer | Traffic Data | Generic Traffic Data | Yes | CollectionTracker job auto-advances; deliverable carries "API Logs". |
| oneDriveConsumer | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches OneDrive content export; sets `Complete`. |
| xbox | Subscriber Data | Basic Subscriber Data | No | `ManualCollectionForm` opens; RS enters Xbox Gamertag, MSA, Account Created Date, Customer Name, Country, Contact Email; sets `Complete`. |
| xbox | Authentication Logs | Basic Authentication/IP | No | `ManualCollectionForm` opens; RS enters IP history with XBOX serial + gamertag pairing; sets `Complete`. |
| xbox | Traffic Data | Strike Logs | No | `ManualCollectionForm` opens; RS attaches strike-log export; sets `Complete`. |
| xbox | Traffic Data | Purchase History | No | `ManualCollectionForm` opens; RS attaches purchase-history export; sets `Complete`. |
| xbox | Traffic Data | PrePaid Balance | No | `ManualCollectionForm` opens; RS enters prepaid balance; sets `Complete`. |
| xbox | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches Profile Photo, Xbox Clubs, Xbox Contacts, Xbox Content, Xbox Video, Xbox Voice; sets `Complete`. |
| skype | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches Skype buddy list export; sets `Complete`. |
| minecraft | Traffic Data | Generic Traffic Data | No | `ManualCollectionForm` opens; RS attaches Minecraft purchase history; sets `Complete`. |
| minecraft | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches Minecraft content export; sets `Complete`. |
| groupMe | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches GroupMe chat export; sets `Complete`. |
| coPilotConsumer | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches CoPilot prompts & responses; sets `Complete`. |
| devTunnels | Traffic Data | Generic Traffic Data | No | `ManualCollectionForm` opens; RS attaches DevTunnels device info; sets `Complete`. |
| devTunnels | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches DevTunnels content; sets `Complete`. |
| bitlocker | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches BitLocker recovery key + provenance; sets `Complete`. |
| microsoftAds | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches Ads domain/keyword export; sets `Complete`. |
| bingSearch | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches Bing query content; sets `Complete`. |
| microsoftForms | Subscriber Data | Basic Subscriber Data | No | `ManualCollectionForm` opens; RS attaches Forms-associated account info; sets `Complete`. |
| productionLetters | Disclosure Letters | Affidavit | No | Item auto-enabled on COPO; `ManualCollectionForm` opens; RS attaches sworn statement via notes attachment; sets `Complete`. |
| entraIDProfile | Subscriber Data | Basic Subscriber Data | Yes | CollectionTracker job auto-advances; deliverable carries PUID + Organization Profile attributes. |
| entraIDProfile | Subscriber Data | Language | Yes | CollectionTracker job auto-advances; deliverable carries "Language". |
| entraIDProfile | Subscriber Data | Date of Birth | Yes | CollectionTracker job auto-advances; deliverable carries "Date of Birth". |
| entraIDProfile | Subscriber Data | Device Info | Yes | CollectionTracker job auto-advances; deliverable carries "Device Info". |
| entraIDProfile | Subscriber Data | Gender | Yes | CollectionTracker job auto-advances; deliverable carries "Gender". |
| entraIDProfile | Subscriber Data | Basic Billing | No | `ManualCollectionForm` opens; RS enters Subscriptions, Billing Address, Account Holder Name, Expiration Date, Payment Method Last 4; sets `Complete`. |
| entraIDProfile | Authentication Logs | Basic Authentication/IP | Yes | CollectionTracker job auto-advances; deliverable carries "Auth Logs / IP History". |
| entraIDProfile | Traffic Data | List of Accounts | No | `ManualCollectionForm` opens; RS attaches SMTP account list; sets `Complete`. |
| entraIDProfile | Traffic Data | List of Domains | No | `ManualCollectionForm` opens; RS attaches SMTP domain list; sets `Complete`. |
| entraIDProfile | Traffic Data | Detailed Billing | No | `ManualCollectionForm` opens; RS attaches detailed billing; sets `Complete`. |
| entraIDProfile | Traffic Data | Password Change History | No | `ManualCollectionForm` opens; RS attaches password change history; sets `Complete`. |
| entraIDProfile | Traffic Data | Advertising Information | No | `ManualCollectionForm` opens; RS attaches Bing Ads info; sets `Complete`. |
| entraIDProfile | Traffic Data | Reverse 2FA | No | `ManualCollectionForm` opens; RS attaches reverse-2FA lookup; sets `Complete`. |
| entraIDProfile | Traffic Data | Reverse IP | No | `ManualCollectionForm` opens; RS attaches reverse-IP lookup; sets `Complete`. |
| exchangeEnterprise | Traffic Data | Password Change History | No | `ManualCollectionForm` opens; RS attaches password change history; sets `Complete`. |
| exchangeEnterprise | Traffic Data | Email Headers (Non-Content) | Yes | CollectionTracker job auto-advances; deliverable carries "Email Headers (Non-Content)". |
| exchangeEnterprise | Content Data | Content Data | Yes | CollectionTracker job auto-advances; deliverable carries "Email Content". |
| exchangeEnterprise | Content Data | Email Headers | Yes | CollectionTracker job auto-advances; deliverable carries "Email Full Headers". |
| exchangeEnterprise | Content Data | Email Contacts | Yes | CollectionTracker job auto-advances; deliverable carries "Email Contacts". |
| exchangeEnterprise | Content Data | Email Calendar | Yes | CollectionTracker job auto-advances; deliverable carries "Email Calendar". |
| teamsForBusiness | Traffic Data | 2FA / MFA / Proof | No | `ManualCollectionForm` opens; RS attaches MFA proof; sets `Complete`. |
| teamsForBusiness | Content Data | Generic Content | Yes | CollectionTracker job auto-advances; deliverable carries "Teams Chat Messaging". |
| oneDriveForBusiness | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches OneDrive content export; sets `Complete`. |
| sharePointOnline | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches SharePoint content export; sets `Complete`. |
| coPilotEnterprise | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches CoPilot prompts/responses + Tenant ID; sets `Complete`. |
| azureStorage | Traffic Data | Generic Traffic Data | No | `ManualCollectionForm` opens; RS attaches ARM Logs + Netflow IP; sets `Complete`. |
| azureStorage | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches Azure Storage Blobs, Sites, File Shares, Tables/Queues; sets `Complete`. |
| azureStorage | Content Data | Unified Audit Logs | No | `ManualCollectionForm` opens; RS attaches UAL export; sets `Complete`. |
| azureVMDisks | Traffic Data | Generic Traffic Data | No | `ManualCollectionForm` opens; RS attaches ARM Logs + Netflow IP + VIP History; sets `Complete`. |
| azureVMDisks | Content Data | Content Data | No | `ManualCollectionForm` opens; RS attaches Azure VMs & Disks; sets `Complete`. |
| azureVMDisks | Content Data | Unified Audit Logs | No | `ManualCollectionForm` opens; RS attaches UAL export; sets `Complete`. |

---

## 5.4 Family 3 — Authorization desired status update scenarios

Each test below pushes one `authorizationDesiredStatus` (case level) or `authorizationDesiredTaskStatus` (task level) value via the `AuthoritySignalSimulator` dialog (or, where the simulator does not expose a value, via direct seed mutation). Each test ships with a per-test decision tree slice — a small focused ASCII tree that explains why this test's expected outcome differs from its siblings. The shared top-level decision tree lives in Section 4.5.

> **Routing reminder**: the predicate `cancellationLocked = isAuthorizationStatusTerminal(formData.authorizationDesiredStatus)` only matches **case-level** `"Cancelled"` or `"Withdrawn"`. Task-level signals (`scope.kind === "some"`) clear `formData.authorizationDesiredStatus` to `""` so the case-level lock never fires.

---

### UAT-UKCOPO-100 · LNS-2026-00170 — Case-level `authorizationDesiredStatus = "Active"` (no-op baseline)

**Capability validated**: Baseline state — no banner, no chip beyond `CaseSummaryCard` outline, no gates. Confirms the absence of UI chrome when the IA's stated status is the trivial baseline.

**Persona**: RS

**Workflow stage**: Fulfillment

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · clean

**Preconditions**:
1. Default queue. Seed `formData.authorizationDesiredStatus = "Active"` (already the default on the clean case).

**Test Steps**:
1. Open `LNS-2026-00170`.
2. Inspect the sticky case header, page-top alert zone, and CaseSummaryCard.
3. Push through Fulfillment Wizard to Step 3 (Plan Review).
4. Inspect the AuthorizationStatusBanner mount point in Step 3.

**Expected Results**:
- Step 2: No AuthorizationStatusBanner; CaseSummaryCard shows an outline badge labelled "Active".
- Step 3: Submit-to-Delivery enabled; no tooltip gate.
- Step 4: No banner mounts at Step 3.

**Pass criteria**: Baseline UI — no banners, no gates, no chips beyond CaseSummaryCard outline.

**Per-test decision tree slice**:

```
authorizationDesiredStatus === "Active"
└── ► Workflow A — Baseline (no-op)
    ├── Banner:  none
    ├── Chip:    CaseSummaryCard outline "Active"
    ├── Gates:   none — isAuthorizationStatusTerminal returns false
    ├── Audit:   no entry appended (no signal observed)
    └── Demo case: LNS-2026-00170
```

---

### UAT-UKCOPO-101 · LNS-2026-00170 — Case-level `authorizationDesiredStatus = "Approved"` (untyped seed)

**Capability validated**: Untyped seed value "Approved" is treated as the human-readable equivalent of "Active"; no banner mounts, no gates fire.

**Persona**: RS

**Workflow stage**: Fulfillment

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · clean

**Preconditions**:
1. Default queue. The seed value `"Approved"` is the default on `LNS-2026-00170`.

**Test Steps**:
1. Open `LNS-2026-00170`.
2. Inspect the sticky case header and CaseSummaryCard.
3. Push to Fulfillment Wizard Step 3.
4. Open AuthoritySignalSimulator and confirm "Approved" is selectable as the IA Form 4 dropdown value.

**Expected Results**:
- Step 2: No AuthorizationStatusBanner; CaseSummaryCard shows outline "Approved".
- Step 3: Submit-to-Delivery enabled; no tooltip gate.
- Step 4: Simulator confirms "Approved" maps to the typed "Active" branch (no terminal predicate fires).

**Pass criteria**: Untyped "Approved" behaves like "Active" everywhere.

**Per-test decision tree slice**:

```
authorizationDesiredStatus === "Approved" (untyped seed)
└── ► Workflow A — Baseline (no-op)
    ├── Banner:  none — value not in terminal set
    ├── Chip:    CaseSummaryCard outline "Approved"
    ├── Gates:   none
    ├── Audit:   no entry appended unless simulator re-pushes
    └── Demo case: LNS-2026-00170
```

---

### UAT-UKCOPO-102 · LNS-2026-00170 — Case-level `authorizationDesiredStatus = "Cancelled"` (scope=all, terminal)

**Capability validated**: Full case-wide cancellation via `applyAuthorizationStatusUpdate(scope.kind="all", status="Cancelled")` — mirrors onto every identifier's `authorizationDesiredTaskStatus`, locks Package + Deliver, and on Acknowledge cascades `taskStatus = "Cancelled"` to every identifier.

**Persona**: RS

**Workflow stage**: Fulfillment → Collection

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · mid-workflow

**Preconditions**:
1. Open `LNS-2026-00170` and push through Fulfillment Wizard to Step 3, but do NOT submit. Leave the case at "mid-workflow" with a single pending job seeded in CollectionTracker.

**Test Steps**:
1. Open `AuthoritySignalSimulator` and select IA Form 4 with status `Cancelled`, scope `all`.
2. Fire the signal. Observe the page-top alert zone.
3. Inspect the `AuthorizationStatusBanner` copy and CTAs.
4. Hover Package and Deliver buttons in CollectionTracker.
5. Click the banner's primary "Acknowledge" CTA.
6. Inspect each identifier's `taskStatus` after Acknowledge.
7. Inspect the audit thread.

**Expected Results**:
- Step 2: Red `AuthorizationStatusBanner` mounts with copy `**"LE Cancelled — cease execution on the entire case"**` + Acknowledge CTA.
- Step 3: `CaseHeaderSummary CancellationBadge` (red) appears at top of sticky header.
- Step 4: Package and Deliver buttons disabled with tooltip `*"Action blocked — authorization cancelled."*` (`cancellationLocked === true`).
- Step 5: Acknowledge fires; `formData.authorizationStatusAcknowledgedAt`, `authorizationStatusAcknowledgedBy` set.
- Step 6: Every identifier's `taskStatus === "Cancelled"` (case-level wins per cascade rule).
- Step 7: Audit thread shows `AuthorizationStatusUpdated` (scope=all, status=Cancelled) followed by `AuthorizationStatusAcknowledged`.

**Pass criteria**:
- Banner renders with correct copy.
- Package + Deliver gated by `cancellationLocked`.
- Acknowledge cascade flips every identifier `taskStatus` to "Cancelled".
- Audit thread carries both events in order.

**Per-test decision tree slice**:

```
authorizationDesiredStatus === "Cancelled"  AND  scope.kind === "all"
└── ► Workflow B — Case-wide Cancellation (terminal)
    ├── Banner:  red AuthorizationStatusBanner + Acknowledge CTA
    ├── Chip:    CancellationBadge (red)
    ├── Gates:   cancellationLocked === true → Package + Deliver DISABLED
    ├── Cascade: on Acknowledge → every identifier.taskStatus = "Cancelled"
    ├── Audit:   AuthorizationStatusUpdated → AuthorizationStatusAcknowledged
    ├── Compare: contrast with UAT-UKCOPO-114 (scope=some) — same value,
    │            different scope, no case-level lock, no banner
    └── Demo case: LNS-2026-00170
```

---

### UAT-UKCOPO-103 · LNS-2026-00170 — Case-level `authorizationDesiredStatus = "Withdrawn"` (terminal)

**Capability validated**: IA withdrawal via `applyWithdrawal` — sets `authorizationDesiredStatus="Withdrawn"`, `caseStage="Withdrawn"`, appends `EpocWithdrawn` audit, starts 45-day retention clock, and freezes Delivery.

**Persona**: RS

**Workflow stage**: Collection

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · two pending jobs + one delivered job seeded

**Preconditions**:
1. Open `LNS-2026-00170` and seed CollectionTracker with two pending jobs (Started status) plus one already-delivered job (DeliveryAcknowledged).

**Test Steps**:
1. Fire IA Withdrawal via `AuthoritySignalSimulator` (or direct seed).
2. Inspect the page-top alert zone for `WithdrawalBanner`.
3. Inspect the sticky-header chip for the Retention chip.
4. Inspect each pending job row in CollectionTracker.
5. Inspect the already-delivered job row.
6. Inspect the audit thread.

**Expected Results**:
- Step 2: Red `WithdrawalBanner` renders at top of stack with copy `**"IA Withdrew the order"**` + Acknowledge CTA.
- Step 3: Retention chip `**"Retention · 45-day clock from effective date"**` lights up in sticky header.
- Step 4: Both pre-pending jobs flipped to `Cancelled`.
- Step 5: Delivered job untouched.
- Step 6: Audit thread shows `EpocWithdrawn` event with effective date; `startRetentionClock("Withdrawn")` recorded.

**Pass criteria**:
- `WithdrawalBanner` renders with correct copy.
- Two pre-pending jobs flipped to Cancelled; already-delivered job untouched.
- `caseStage === "Withdrawn"`, `isCaseWithdrawn === true`.
- Retention clock started.

**Per-test decision tree slice**:

```
authorizationDesiredStatus === "Withdrawn"  (via applyWithdrawal)
└── ► Workflow C — Case-wide Withdrawal (terminal)
    ├── Banner:  red WithdrawalBanner (preservation/withdrawal.ts:250-)
    ├── Chip:    Retention chip (45-day clock)
    ├── Gates:   cancellationLocked === true; caseStage === "Withdrawn"
    ├── Pipeline: pending + ready-to-deliver flipped Cancelled;
    │            delivered jobs untouched
    ├── Audit:   EpocWithdrawn appended; startRetentionClock fires
    ├── Compare: distinct from UAT-UKCOPO-102 — Withdrawn ALSO sets
    │            caseStage and starts the retention clock
    └── Demo case: LNS-2026-00170
```

---

### UAT-UKCOPO-104 · LNS-2026-00170 — Case-level `authorizationDesiredStatus = "Suspended"` (non-terminal)

**Capability validated**: IA's pause signal — advisory only; banner mounts but no gates fire; `isAuthorizationStatusTerminal` returns false.

**Persona**: RS

**Workflow stage**: Fulfillment

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · mid-workflow

**Preconditions**:
1. Open `LNS-2026-00170` and push to Fulfillment Wizard Step 3.

**Test Steps**:
1. Fire IA Form 4 with status `Suspended`, scope `all` via `AuthoritySignalSimulator`.
2. Inspect the page-top alert zone.
3. Hover Package and Deliver buttons.
4. Inspect the audit thread.

**Expected Results**:
- Step 2: Amber `AuthorizationStatusBanner` renders with copy `**"LE Suspended — pause execution"**` + Acknowledge CTA.
- Step 3: Package and Deliver remain enabled (no auto-fired gate; `cancellationLocked === false`).
- Step 4: Audit thread shows `AuthorizationStatusUpdated` (scope=all, status=Suspended).

**Pass criteria**: Advisory banner only; no gates; RS chooses whether to halt manually.

**Per-test decision tree slice**:

```
authorizationDesiredStatus === "Suspended"
└── ► Workflow D — Case-wide Pause (non-terminal)
    ├── Banner:  amber AuthorizationStatusBanner + Acknowledge CTA
    ├── Chip:    CaseSummaryCard warning badge "Suspended"
    ├── Gates:   none auto-fired
    ├── Pipeline: full pipeline still reachable (advisory)
    ├── Audit:   AuthorizationStatusUpdated (scope=all, status=Suspended)
    ├── Compare: vs UAT-UKCOPO-102 — Suspended is non-terminal; no lock
    └── Demo case: LNS-2026-00170
```

---

### UAT-UKCOPO-105 · LNS-2026-00170 — Case-level `authorizationDesiredStatus = "Expired"` (time-driven)

**Capability validated**: Time-driven aging out of the authorization — the status flips from "Active" / "Approved" to "Expired" once `authorizationExpirationDate` is passed. Advisory only; no gates auto-fire.

**Persona**: RS

**Workflow stage**: Collection

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · `authorizationExpirationDate` forced into the past

**Preconditions**:
1. Open `LNS-2026-00170` and override `formData.authorizationExpirationDate` to a date earlier than today via direct seed mutation. Reload.

**Test Steps**:
1. Open the case after the seed mutation.
2. Inspect the page-top alert zone and CaseSummaryCard.
3. Hover Package and Deliver buttons.
4. Inspect the audit thread.

**Expected Results**:
- Step 2: Amber `AuthorizationStatusBanner` renders with copy referencing the expired `authorizationExpirationDate`.
- Step 3: Package and Deliver remain enabled (`isAuthorizationStatusTerminal` returns false; no auto-gate).
- Step 4: Audit thread shows `AuthorizationStatusUpdated` (scope=all, status=Expired, source=timeBased).

**Pass criteria**: Advisory banner only; no gates auto-fire; RS escalates manually back to LE for renewal.

**Per-test decision tree slice**:

```
authorizationDesiredStatus === "Expired"  (time-driven)
└── ► Workflow E — Authorization aged-out
    ├── Banner:  amber AuthorizationStatusBanner
    ├── Chip:    CaseSummaryCard warning "Expired"
    ├── Gates:   none auto-fired (advisory only)
    ├── Pipeline: still walkable
    ├── Audit:   AuthorizationStatusUpdated (source=timeBased)
    ├── Compare: vs UAT-UKCOPO-103 — Expired is NOT terminal; Withdrawn is
    └── Demo case: LNS-2026-00170 (force expirationDate into the past)
```

---

### UAT-UKCOPO-106 · LNS-2026-00170 — Case-level `authorizationDesiredStatus = "Rejected"` (untyped seed)

**Capability validated**: Out-of-union string value flows through (FormData field is typed `string`); no banner, no gates, raw label shown.

**Persona**: RS

**Workflow stage**: Fulfillment

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Force `formData.authorizationDesiredStatus = "Rejected"` via direct seed mutation.

**Test Steps**:
1. Open `LNS-2026-00170`.
2. Inspect the page-top alert zone and CaseSummaryCard.
3. Inspect Package and Deliver buttons in CollectionTracker.
4. Inspect the audit thread.

**Expected Results**:
- Step 2: No banner mounts (value not in terminal set); CaseSummaryCard renders raw string "Rejected" with neutral tint.
- Step 3: Package and Deliver remain enabled.
- Step 4: Audit thread shows `AuthorizationStatusUpdated` (scope=all, status=Rejected) if simulator pushed it; otherwise no entry.

**Pass criteria**: Untyped value displayed read-only; no banners; no gates.

**Per-test decision tree slice**:

```
authorizationDesiredStatus === "Rejected"  (untyped seed)
└── ► Workflow F — Not-recognised IA value
    ├── Banner:  none (value not in terminal set)
    ├── Chip:    CaseSummaryCard raw string "Rejected" (neutral)
    ├── Gates:   none
    ├── Pipeline: full pipeline still reachable
    ├── Audit:   AuthorizationStatusUpdated only if simulator pushed
    └── Demo case: LNS-2026-00170
```

---

### UAT-UKCOPO-110 · LNS-2026-00160 — Task-level `authorizationDesiredTaskStatus = "Requested"` (baseline)

**Capability validated**: PlanReviewTable's per-identifier "Authorization" column renders `Requested` as an informative (neutral) Fluent badge; column only shows on `requestType === "COPO Order"` (or eEvidence).

**Persona**: RS

**Workflow stage**: Fulfillment

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Force the identifier's `authorizationDesiredTaskStatus = "Requested"` via direct seed mutation.

**Test Steps**:
1. Open `LNS-2026-00160` and push to Fulfillment Wizard Step 3.
2. Inspect the PlanReviewTable's "Authorization" column.
3. Confirm no banner mounts and no gates fire.

**Expected Results**:
- Step 2: Per-identifier chip renders with text `"Requested"` in informative (neutral) Fluent color.
- Step 3: No AuthorizationStatusBanner; Submit-to-Delivery enabled.

**Pass criteria**: Baseline per-task chip displayed; no case-level chrome.

**Per-test decision tree slice**:

```
authorizationDesiredTaskStatus === "Requested"  (per-task baseline)
└── ► Workflow G — Per-task baseline "to be created"
    ├── Banner:  none
    ├── Chip:    PlanReviewTable badge "Requested" (informative)
    ├── Gates:   none
    └── Demo case: LNS-2026-00160
```

---

### UAT-UKCOPO-111 · LNS-2026-00160 — Task-level `authorizationDesiredTaskStatus = "Active"` (baseline)

**Capability validated**: PlanReviewTable's "Authorization" column renders `Active` as a brand-color Fluent badge; no banner, no gates.

**Persona**: RS

**Workflow stage**: Fulfillment

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Force the identifier's `authorizationDesiredTaskStatus = "Active"` via direct seed mutation.

**Test Steps**:
1. Open `LNS-2026-00160` and push to Fulfillment Wizard Step 3.
2. Inspect the PlanReviewTable.
3. Confirm no banner mounts.

**Expected Results**:
- Step 2: Per-identifier chip renders `"Active"` in brand Fluent color.
- Step 3: No AuthorizationStatusBanner; Submit-to-Delivery enabled.

**Pass criteria**: Baseline per-task chip displayed; no case-level chrome.

**Per-test decision tree slice**:

```
authorizationDesiredTaskStatus === "Active"
└── ► Workflow H — Per-task baseline "go ahead"
    ├── Banner:  none
    ├── Chip:    PlanReviewTable badge "Active" (brand)
    ├── Gates:   none
    └── Demo case: LNS-2026-00160
```

---

### UAT-UKCOPO-112 · LNS-2026-00160 — Task-level `authorizationDesiredTaskStatus = "Suspended"` (per-task warn)

**Capability validated**: Per-task pause signal via `scope.kind="some"` — case-level field cleared, per-identifier warn chip displayed, no case-level banner.

**Persona**: RS

**Workflow stage**: Fulfillment

**Case shape**: GB / National / COPO Order · 1 Consumer identifier

**Preconditions**:
1. Open `LNS-2026-00160` and push to Fulfillment Wizard Step 3.

**Test Steps**:
1. Fire IA Form 4 with status `Suspended`, scope `some` (target the single identifier) via `AuthoritySignalSimulator`.
2. Inspect the page-top alert zone (case-level banner mount).
3. Inspect the PlanReviewTable.
4. Confirm `formData.authorizationDesiredStatus` is cleared to `""`.
5. Inspect the audit thread.

**Expected Results**:
- Step 2: No case-level `AuthorizationStatusBanner` mounts (applyAuthorizationStatusUpdate clears the case-level field on scope=some).
- Step 3: Per-identifier chip renders `"Suspended"` in warning (amber) Fluent color.
- Step 4: `formData.authorizationDesiredStatus === ""`; `authorizationStatusUpdatedAt/By` zeroed.
- Step 5: Audit thread shows `AuthorizationStatusUpdated` (scope=some, status=Suspended) + `authorizationDesiredTaskStatusUpdatedAt/By` set on the identifier.

**Pass criteria**: Per-task warn chip only; case-level field cleared; no banner; no gates.

**Per-test decision tree slice**:

```
authorizationDesiredTaskStatus === "Suspended"  AND  scope.kind === "some"
└── ► Workflow I — Per-task pause (informational)
    ├── Banner:  none (case-level field cleared by scope=some)
    ├── Chip:    PlanReviewTable badge "Suspended" (warning amber)
    ├── Gates:   none auto-fired at task scope
    ├── Pipeline: identifier-level Collection still walkable
    ├── Audit:   AuthorizationStatusUpdated (scope=some) +
    │            authorizationDesiredTaskStatusUpdatedAt/By
    ├── Compare: vs UAT-UKCOPO-104 — task-level Suspended clears
    │            case-level field; case-level Suspended does NOT
    └── Demo case: LNS-2026-00160
```

---

### UAT-UKCOPO-113 · LNS-2026-00160 — Task-level `authorizationDesiredTaskStatus = "Completed"` (per-task terminal-success)

**Capability validated**: Per-task terminal-success signal — chip rendered in success green, `taskStatus` NOT mutated by IA push.

**Persona**: RS

**Workflow stage**: Collection

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · job already delivered

**Preconditions**:
1. Open `LNS-2026-00160` and seed the single identifier with a delivered job in CollectionTracker.

**Test Steps**:
1. Fire IA Form 4 with status `Completed`, scope `some` (target the single identifier).
2. Inspect the page-top alert zone.
3. Inspect the PlanReviewTable's "Authorization" column.
4. Inspect the identifier's `taskStatus` field.
5. Inspect the audit thread.

**Expected Results**:
- Step 2: No case-level banner mounts.
- Step 3: Per-identifier chip renders `"Completed"` in success (green) Fluent color.
- Step 4: `taskStatus` unchanged by IA push — only `authorizationDesiredTaskStatus` mutated.
- Step 5: Audit thread shows `AuthorizationStatusUpdated` (scope=some, status=Completed).

**Pass criteria**: Per-task terminal-success chip displayed; `taskStatus` not touched.

**Per-test decision tree slice**:

```
authorizationDesiredTaskStatus === "Completed"  AND  scope.kind === "some"
└── ► Workflow J — Per-task done (informational)
    ├── Banner:  none
    ├── Chip:    PlanReviewTable badge "Completed" (success green)
    ├── Gates:   none — chip is signal only; taskStatus NOT mutated
    ├── Audit:   AuthorizationStatusUpdated (scope=some, status=Completed)
    └── Demo case: LNS-2026-00160
```

---

### UAT-UKCOPO-114 · LNS-2026-00160 — Task-level `authorizationDesiredTaskStatus = "Cancelled"` (per-task terminal-disrupt, scope=some)

**Capability validated**: Per-task cancellation — the canonical contrast against case-level Cancelled (UAT-UKCOPO-102). Chip renders danger red, case-level field is CLEARED to `""`, `cancellationLocked` remains false, non-listed identifiers continue normally.

**Persona**: RS

**Workflow stage**: Collection

**Case shape**: GB / National / COPO Order · 1 Consumer identifier · job mid-Collection

**Preconditions**:
1. Open `LNS-2026-00160` and seed the single identifier with a Started job in CollectionTracker.

**Test Steps**:
1. Fire IA Form 4 with status `Cancelled`, scope `some` (target the single identifier).
2. Inspect the page-top alert zone.
3. Inspect the PlanReviewTable's "Authorization" column.
4. Confirm `formData.authorizationDesiredStatus` is cleared to `""`.
5. Hover Package and Deliver buttons in CollectionTracker.
6. Inspect the identifier's `taskStatus`.
7. Inspect the audit thread.

**Expected Results**:
- Step 2: No case-level `AuthorizationStatusBanner` mounts (scope=some clears the case-level field).
- Step 3: Per-identifier chip renders `"Cancelled"` in danger (red) Fluent color — "disruption-tier" state.
- Step 4: `formData.authorizationDesiredStatus === ""`; `authorizationStatusUpdatedAt/By` zeroed.
- Step 5: Package and Deliver remain enabled (`cancellationLocked === false`). No tooltip gate.
- Step 6: `taskStatus` NOT flipped to `"Cancelled"` — only `authorizationDesiredTaskStatus` mutated. The actual block enforcement for EA-Partial-GFR-blocked tasks lives in `groundsForRefusal.ts` consumers; pure IA-driven per-task Cancelled is informational + auditable.
- Step 7: Audit thread shows `AuthorizationStatusUpdated` (scope=some, status=Cancelled) + `authorizationDesiredTaskStatusUpdatedAt/By` recorded on the identifier.

**Pass criteria**:
- Per-task red chip displayed; no case-level banner.
- Case-level field cleared.
- `cancellationLocked === false`; Package + Deliver still enabled.
- `taskStatus` untouched.
- Audit captures both event + per-identifier timestamp.

**Per-test decision tree slice**:

```
authorizationDesiredTaskStatus === "Cancelled"  AND  scope.kind === "some"
└── ► Workflow K — Per-task cancellation (informational + audit)
    ├── Banner:  none (case-level field cleared by scope=some)
    ├── Chip:    PlanReviewTable badge "Cancelled" (danger red, disruption tier)
    ├── Gates:   cancellationLocked === false; Package + Deliver still enabled
    ├── Pipeline: non-listed identifiers continue normally; listed
    │            identifier renders red chip but no auto Collection halt
    ├── Audit:   AuthorizationStatusUpdated (scope=some, status=Cancelled) +
    │            authorizationDesiredTaskStatusUpdatedAt/By
    ├── Compare: CANONICAL contrast with UAT-UKCOPO-102 — same value
    │            ("Cancelled"), opposite scope ("some" vs "all"), opposite
    │            blast radius:
    │            ├── UAT-UKCOPO-102 (scope=all):  banner + lock + cascade
    │            └── UAT-UKCOPO-114 (scope=some): chip only, no gates,
    │                                              no cascade, case-level
    │                                              field CLEARED
    └── Demo case: LNS-2026-00160
```

---

## 6. Cross-cutting smoke tests

Run these once per UAT cycle, after the per-case tests.

### UAT-UKCOPO-SMOKE-A — UK COPO request-type detection

- Confirm both seeded cases (`LNS-2026-00160`, `LNS-2026-00170`) appear in the All Cases queue.
- Confirm both render `requestType` "COPO Order" and `country` "GB" on the queue card.
- Confirm `requestSubType` is the empty string on both (UK COPO carries no sub-type).
- Confirm the `PlanReviewTable` "Authorization" column shows on both (gated by `requestType === "COPO Order"`).

### UAT-UKCOPO-SMOKE-B — LE-external → LENS service resolver

- Open `LNS-2026-00160` and confirm the resolver maps `Microsoft Account Profile → msaProfile`, `Email → exchangeConsumer`, `Teams → teamsForLife`, `OneDrive → oneDriveConsumer` on first mount.
- Confirm resolver is case-insensitive + whitespace-trimmed.
- Confirm mismatched account-type returns `wrong-account-type`.

### UAT-UKCOPO-SMOKE-C — CSE exempt overlay (LNS-2026-00160)

- Confirm a purple `**"Exempt: Child Sexual Exploitation"**` chip renders in DisclosureSection (distinct from order-level NDOs).
- Confirm `attorneyEscalation` Pending (ATT-001) blocks production until acknowledged.
- Confirm no NDO chips render (case has `ndoAttached === ""`).

### UAT-UKCOPO-SMOKE-D — Clean rehearsal case (LNS-2026-00170)

- Confirm no NDO, no CSE overlay, no attorney escalation, no prior correspondence/jobs/resolution.
- Confirm Triage → Review Case → Collection walks without any blocker banners.
- This is the live-demo rehearsal case.

### UAT-UKCOPO-SMOKE-E — Authorization status simulator coverage

| Test case | Simulator value | Scope | Expected workflow leaf |
| --- | --- | --- | --- |
| LNS-2026-00170 | Approved | all | Workflow A (baseline, no chrome) |
| LNS-2026-00170 | Cancelled | all | Workflow B (banner + lock + cascade) |
| LNS-2026-00170 | Withdrawn | all | Workflow C (withdrawal banner + retention) |
| LNS-2026-00170 | Suspended | all | Workflow D (amber advisory, no gate) |
| LNS-2026-00160 | Cancelled | some | Workflow K (red chip only, no lock) |

### UAT-UKCOPO-SMOKE-F — IPA 2016 statutory cite presence

- Open both seeded cases and confirm `approvalDescription` and `additionalCaseInformation` explicitly cite "Investigatory Powers Act 2016".
- Confirm `approvalType === "Judicial"` on both.
- Confirm `approverRole === "District Judge (Magistrates' Courts)"` on both.

### UAT-UKCOPO-SMOKE-G — UK-specific schema invariants

1. Open both seeded cases.
2. Confirm `legalContext.country.countryCode === "GB"`, `region === "ROW"`.
3. Confirm `legalContext.jurisdiction.jurisdictionLevel === "National"`, `jurisdictionName === "England and Wales"`.
4. Confirm `legalContext.crossBorderFlag === false`, `mlat === false`.
5. Confirm `eu27DsaHarms === []` and `shieldLawConfirmation === ""`.
6. Confirm `agencyAddress.postalCode` is in UK postcode format (`SW1H 0BG`, `EC2M 4NR`).

**Pass criteria**: All UK-specific schema fields exactly match the seed convention.

---

## 7. Sign-off sheet

Print or copy this table into your UAT log per test run.

| Test ID | Date | Tester | Persona | Status | Failure notes |
| --- | --- | --- | --- | --- | --- |
| UAT-UKCOPO-001 | | | TS/RS | | |
| UAT-UKCOPO-002 | | | RS | | |
| UAT-UKCOPO-003 | | | RS | | |
| UAT-UKCOPO-004 | | | RS | | |
| UAT-UKCOPO-005 | | | RS | | |
| UAT-UKCOPO-006 | | | RS | | |
| UAT-UKCOPO-007 | | | RS | | |
| UAT-UKCOPO-008 | | | RS | | |
| UAT-UKCOPO-009 | | | RS | | |
| UAT-UKCOPO-010 | | | RS | | |
| UAT-UKCOPO-011 | | | RS | | |
| UAT-UKCOPO-012 | | | RS | | |
| UAT-UKCOPO-013 | | | RS | | |
| UAT-UKCOPO-014 | | | RS | | |
| UAT-UKCOPO-015 | | | RS | | |
| UAT-UKCOPO-016 | | | RS | | |
| UAT-UKCOPO-017 | | | RS | | |
| UAT-UKCOPO-018 | | | RS | | |
| UAT-UKCOPO-019 | | | RS | | |
| UAT-UKCOPO-020 | | | RS | | |
| UAT-UKCOPO-021 | | | RS | | |
| UAT-UKCOPO-022 | | | RS | | |
| UAT-UKCOPO-023 | | | RS | | |
| UAT-UKCOPO-024 | | | RS | | |
| UAT-UKCOPO-025 | | | RS | | |
| UAT-UKCOPO-026 | | | RS | | |
| UAT-UKCOPO-027 | | | RS | | |
| UAT-UKCOPO-028 | | | RS | | |
| UAT-UKCOPO-029 | | | RS | | |
| UAT-UKCOPO-030 | | | RS | | |
| UAT-UKCOPO-031 | | | RS | | |
| UAT-UKCOPO-032 | | | RS | | |
| UAT-UKCOPO-033 | | | RS | | |
| UAT-UKCOPO-034 | | | RS | | |
| UAT-UKCOPO-035 | | | RS | | |
| UAT-UKCOPO-036 | | | RS | | |
| UAT-UKCOPO-037 | | | RS | | |
| UAT-UKCOPO-038 | | | RS | | |
| UAT-UKCOPO-039 | | | RS | | |
| UAT-UKCOPO-040 | | | RS | | |
| UAT-UKCOPO-041 | | | RS | | |
| UAT-UKCOPO-042 | | | RS | | |
| UAT-UKCOPO-043 | | | RS | | |
| UAT-UKCOPO-044 | | | RS | | |
| UAT-UKCOPO-045 | | | RS | | |
| UAT-UKCOPO-046 | | | RS | | |
| UAT-UKCOPO-047 | | | RS | | |
| UAT-UKCOPO-048 | | | RS | | |
| UAT-UKCOPO-049 | | | RS | | |
| UAT-UKCOPO-050 | | | RS | | |
| UAT-UKCOPO-051 | | | RS | | |
| UAT-UKCOPO-052 | | | RS | | |
| UAT-UKCOPO-053 | | | RS | | |
| UAT-UKCOPO-054 | | | RS | | |
| UAT-UKCOPO-055 | | | RS | | |
| UAT-UKCOPO-056 | | | RS | | |
| UAT-UKCOPO-057 | | | RS | | |
| UAT-UKCOPO-058 | | | RS | | |
| UAT-UKCOPO-059 | | | RS | | |
| UAT-UKCOPO-060 | | | RS | | |
| UAT-UKCOPO-061 | | | RS | | |
| UAT-UKCOPO-062 | | | RS | | |
| UAT-UKCOPO-063 | | | RS | | |
| UAT-UKCOPO-064 | | | RS | | |
| UAT-UKCOPO-065 | | | RS | | |
| UAT-UKCOPO-066 | | | RS | | |
| UAT-UKCOPO-067 | | | RS | | |
| UAT-UKCOPO-068 | | | RS | | |
| UAT-UKCOPO-069 | | | RS | | |
| UAT-UKCOPO-070 | | | RS | | |
| UAT-UKCOPO-100 | | | RS | | |
| UAT-UKCOPO-101 | | | RS | | |
| UAT-UKCOPO-102 | | | RS | | |
| UAT-UKCOPO-103 | | | RS | | |
| UAT-UKCOPO-104 | | | RS | | |
| UAT-UKCOPO-105 | | | RS | | |
| UAT-UKCOPO-106 | | | RS | | |
| UAT-UKCOPO-110 | | | RS | | |
| UAT-UKCOPO-111 | | | RS | | |
| UAT-UKCOPO-112 | | | RS | | |
| UAT-UKCOPO-113 | | | RS | | |
| UAT-UKCOPO-114 | | | RS | | |
| UAT-UKCOPO-SMOKE-A | | | TS | | |
| UAT-UKCOPO-SMOKE-B | | | TS | | |
| UAT-UKCOPO-SMOKE-C | | | TS/ATT | | |
| UAT-UKCOPO-SMOKE-D | | | TS/RS | | |
| UAT-UKCOPO-SMOKE-E | | | RS | | |
| UAT-UKCOPO-SMOKE-F | | | TS | | |
| UAT-UKCOPO-SMOKE-G | | | TS | | |

**UAT lead sign-off**: ____________________  **Date**: ____________________
**Business owner sign-off**: ____________________  **Date**: ____________________

---

*End of document.*
