# eEvidence Workflow Audit & Validation Guide

**App:** DARS eEvidence prototype
**URL:** http://localhost:3001
**Login (mock):** Nicole Garcia (CURRENT_USER)
**Source of truth:** EU Reg 2023/1543 Appendix-F workflows 1-8, seeded mock cases (`src/utils/mockCaseDataLENS*.ts`), and the case-to-workflow decision tree in `docs/UAT-MockCases.md` §4.5.

This is the workflow-centric companion to the case-centric `UAT-MockCases.md`: every EU eEvidence workflow, its canonical mock case, and step-by-step validation, plus the coverage gaps found during the audit.

## One-time pre-flight (do once before any workflow)

1. Start the dev server from `c:\r\dars_eevidence` (`npm run dev`, port 3001). Confirm http://localhost:3001 returns 200.
2. Confirm the **Cases** app is selected in the left rail and the **All Cases** queue renders.
3. Use the queue **search box** plus the case ID to locate each case below, then click the row to open it.

## Coverage scorecard

| WF | eEvidence workflow | Canonical mock case | UAT ID | Coverage |
|----|--------------------|---------------------|--------|----------|
| 1 | Standard Production - National | LNS-2026-00130 (Irish DPP) | 026 | Full |
| 2 | Standard Production - International / EA Review Window | LNS-2026-00245 active; 00247 lapsed; 00255 cleared | 024 / 025 / 017 | Full (3 states) |
| 3 | Emergency Production - 8h (Art. 9(2)) | LNS-2026-00140 (German BKA) | 027 | Full |
| 4 | Preservation Order (EPOC-PR) | LNS-2026-00215 receipt+ack; 00220 pipeline | 023 / 013 | Full |
| 5 | Subsequent Production (Form 5 -> EPOC-ER) | LNS-2026-00230 (linkage only) | 014 | Partial - GAP |
| 6 | Grounds for Refusal (Full / Partial) | LNS-2026-00240 Full; 00250 Partial | 015+028 / 016+029 | Full (informational + enforced) |
| 7 | Non-Execution (Form 3) | LNS-2026-00265 (EA overrules) + overlay on 00150/00190/00200 | 018 | Partial - no standalone compose+submit case |
| 8 | IA Withdrawal | LNS-2026-00280 (Portuguese) | 022 | Full |

---

## Workflow 1 - Standard Production (National) - LNS-2026-00130

The control/baseline: same-jurisdiction EPOC-ER (Irish IA + Irish SP), no EA leg.

1. Open the case; it lands on **Collection**.
2. Sticky header: SLA chip shows **Routine** countdown, green/OnTrack. Verify NO "EA REVIEW WINDOW" / GFR chip.
3. Banner stack is **empty** (no preservation/GFR/emergency/withdrawal banners).
4. CollectionTracker shows the full **three-column** pipeline (Collection / Package / Delivery).
5. **Submit to Publish** and **Review & Deliver** CTAs are both **enabled**, tooltips mention no block.
6. Audit thread has no workflow-specific events.

**Pass:** baseline pipeline, no eEvidence gating, both submit actions enabled.

---

## Workflow 2 - International / EA Review Window (3 states)

### 2a - Active window - LNS-2026-00245 (Italian, 5 days left)

1. Open; header chip reads **"EA REVIEW WINDOW · 5d"** (blue-violet).
2. Top of Case Overview: purple GFR panel **"EA REVIEW WINDOW - Enforcing Authority is reviewing"** plus "5 days remaining · operational countdown only - SLA continues".
3. Package column **"Review & Deliver"** button reads **"Blocked - EA review window"**, greyed; hover tooltip = "Action blocked - EA review window active."
4. **Collection actions stay enabled** (only delivery is gated).

### 2b - Lapsed + resume - LNS-2026-00247 (French, expired 2 days ago)

1. Open; `useEaWindowExpiry` auto-fires; header chip **"EA window lapsed · resume delivery"** (amber); green panel **"delivery is now permitted (Art. 8 + 10(2))"** plus **Resume Delivery** CTA.
2. Audit thread: exactly one auto **`EaWindowExpired`** (actor "System").
3. Click **Resume Delivery**; toast confirms; chip flips to **"delivery resumed"** (green); new **`GfrDeliveryResumedManually`** audit; Review & Deliver re-enables.
4. Hard-reload; both audit events still appear exactly once (idempotent).

### 2c - EA cleared (happy path) - LNS-2026-00255 (Belgian) - also exercises failed-delivery retry

1. Open; green panel **"EA cleared this case"** plus amber **FailedDeliveryBanner**.
2. Click **Retry Delivery**; dialog with failed job pre-selected; 4 seeded jobs span Failed/Acknowledged/Complete/Publishable.
3. Audit thread carries **`GfrCleared`**.

---

## Workflow 3 - Emergency Production 8h - LNS-2026-00140

1. Open; red **EmergencyEEvidenceBanner**: "Emergency Production - 8-hour SLA (Art. 9(2))" plus "Imminent danger to life" plus kidnapping justification sub-box.
2. SLA chip in **Approaching** (amber), tooltip says **"SLA 8 hours"** (not 3).
3. Cross-check against LNS-2025-00142 (non-eEvidence Emergency); that one is **3h**, proving the SlaContext shim applies only on WF3.
4. Three-column pipeline; **Review & Deliver enabled** (no gates).
5. Open LNS-2026-00130 to confirm the emergency banner self-hides off-WF3.

---

## Workflow 4 - Preservation Order - LNS-2026-00215 (receipt+ack); LNS-2026-00220 (pipeline)

On **00215**:

1. Open; blue **"Preservation Order in Effect"** banner, earliest expiry **Nov 25 2026**, **Acknowledge Receipt** CTA.
2. Pipeline collapses to **Preservation column only** (Package/Delivery hidden); "Cannot preserve - submit Form 3" CTA at the bottom.
3. Correspondence; open **Form 2** bubble; FormPreviewPanel hydrates with EPOC_FORM_2 fields.
4. Click **Acknowledge Receipt**; composer opens with **EPOC_PRESERVATION_ACK pre-attached**; sign & send; toast; banner swaps to green check.
5. Audit thread: exactly two events - **`PreservationOrderReceived`** plus **`PreservationOrderAcknowledged`**; idempotent across reload.

On **00220**: confirm per-identifier **"Preserve until: [date]"** (6-mo Consumer / 12-mo Enterprise).

---

## Workflow 5 - Subsequent Production - LNS-2026-00230 (GAP)

Best available case validates **linkage only**, not the full run:

1. Open LNS-2026-00230 (lands on **Triage**).
2. In Case Identification, the **Related Cases** panel shows entry to **LNS-2026-00220** labeled "Follow-on to EPOC-PR".
3. Click it; routes to the parent preservation case (which carries the reciprocal forward link).

**Audit finding:** No case sets `eevidenceWorkflow: 5`, and no case exercises the actual subsequent-production mechanics (new 10-day SLA off the Form 5, delivery from the preserved snapshot rather than fresh collection). LNS-2026-00230 only demonstrates the back-pointer. This is the one workflow without an end-to-end demo.

---

## Workflow 6 - Grounds for Refusal (Full & Partial)

Each has a two-phase contract: **informational** (EA decision shown, delivery NOT auto-blocked) then **enforced** (RS clicks Block).

### Full - LNS-2026-00240 - UAT-015 (informational) then UAT-028 (enforce)

1. Open; red panel **"Full Grounds for Refusal - review the EA's decision"** (reason: ImmunitiesOrPrivileges, Art. 12(1)(a)) plus red **"Block Delivery (case-wide)"** CTA; header chip **"EA Hold - Full"**; **SLA paused**.
2. Confirm toolbar **Block Delivery** plus per-row Review & Deliver are **still clickable**; audit has `GfrReceived`, no `GfrEnforced`.
3. Click **Block Delivery (case-wide)**; toast; panel flips to "delivery blocked" plus actor/date chip; toolbar reads "Blocked - GFR enforced"; per-row delivery disabled; **`GfrEnforced`** (scope: case-wide) appended; idempotent on reload.
4. **Undo** on the chip; reverts gates; appends `GfrEnforcementReleased` (original event retained).

### Partial - LNS-2026-00250 - UAT-016 then UAT-029

1. Open; amber panel listing the **1 journalist identifier** (reason FreedomOfPressOrExpression) plus **"Block Delivery for these 1 identifier"** CTA; **SLA unchanged** (Partial does not pause).
2. All 3 rows clickable pre-enforcement.
3. Click CTA; only the **journalist row** locks (`identifierBlockedByPartialGfr`), witness+phone keep delivering; `GfrEnforced` scope "1 target identifier"; Undo path symmetric.

---

## Workflow 7 - Non-Execution (Form 3) - LNS-2026-00265 (+ overlays) (Partial)

1. Open LNS-2026-00265; orange GFR panel **"EA rejected your Form 3 - production required"**; header chip **"EA rejected Form 3"**.
2. Click **Retract Form 3**; confirmation dialog; page-top **Attorney review required** banner appears (auto-escalation).

Form-3 **submission** origin is validated piecemeal as an overlay (Form 3 template available on LNS-2026-00150; manifest-error auto-issue on LNS-2026-00190; held controller-notice Form 3 on LNS-2026-00200).

**Audit finding:** there is no single case dedicated to compose -> attorney-gate -> QES sign -> submit Form 3 end-to-end; coverage is spread across cases plus the decision-tree overlay.

---

## Workflow 8 - IA Withdrawal - LNS-2026-00280

1. Open; red **WithdrawalBanner** "EPOC withdrawn by the Issuing Authority", effective **May 20 2026**, deletion deadline **Jul 4 2026**, IA = Ministerio Publico - DIAP Lisboa.
2. Header: **Retention chip "~38d left"** (neutral); SLA continues (withdrawal does not pause SLA).
3. Per-identifier jobs: two pre-pending jobs flipped to **Cancelled**, the already-**Complete** job untouched.
4. Correspondence; withdrawal-notice bubble; FormPreviewPanel (EPOC_WITHDRAWAL).
5. Audit: exactly one **`EpocWithdrawn`**; case stage chip = **Withdrawn**.
6. Hard-reload; still exactly one `EpocWithdrawn` (idempotent).

---

## Audit findings (cleanup backlog)

### Coverage gaps

1. **Workflow 5 (Subsequent Production) has no end-to-end demo** - only the linkage on LNS-2026-00230. The doc header itself admits demos exist only for "Workflows 1/2/3/4/6/7/8." Recommend authoring an EPOC-ER-from-Form-5 case (new SLA, snapshot delivery).
2. **Workflow 7 lacks a standalone Form-3 submission case** - the compose/sign/submit path is only exercised as an overlay.

### Documentation defects in UAT-MockCases.md

3. **Duplicate test ID:** UAT-DARS-028 is assigned twice - to LNS-2026-00240 (Full-GFR enforcement) and to LNS-2026-00310 (Romania placeholder).
4. **Missing from the §4 index & §7 sign-off sheet:** UAT-DARS-015 and -016 exist as full sections (lines 688, 720) but are not in the case-index table (it jumps 014->017) or the sign-off sheet.
5. **Sign-off sheet stops at SMOKE-D** - omits SMOKE-E/F/G, which are defined in §6.
6. **Inconsistent case counts:** the intro says "29 cases," SMOKE-A says "27 case rows," and MOCK_CASES actually defines **30** (`case-queue-types.ts`).
7. **Stale placeholders:** LNS-2026-00310 (Romania) and LNS-2026-00320 (US Subpoena) are marked "please author," yet 00310's data builder is already partially populated (DIICOT issuing authority) - doc and code have drifted.
