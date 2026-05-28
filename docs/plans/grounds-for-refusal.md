# Grounds for Refusal (GFR) — Prototype Spec Plan

**Project:** DARS_EEVIDENCE (`c:\R\DARS_EEVIDENCE`)
**Scope:** End-to-end GFR domain model + UI + delivery gates + audit + mock seeds, narrowed to the 8 SP-relevant EPOC workflows from DARS Phase 2 Appendix F.
**Status:** READY TO IMPLEMENT — awaiting sign-off to begin Phase A
**Created:** 2026-05-20 · **Revised:** 2026-05-21
**Sources (in order received):**
1. **DARS Phase 2 eEvidence MVP Spec v1.docx** — *primary SP-canonical reference; Appendix F defines the 8 workflows in scope*
2. **eevidence-phase2-workflow-review-v3.pptx** — workflow diagrams (WF6)
3. **2026-05-17 e-Evidence Workshop Week 2 Readout.docx** — operational guidance
4. **EPOC Breakdown.xlsx** — 14-workflow universe (most operationally grounded, but covers IA + EA + SP scope)
5. **ETSI TS 104 144 v1.3.1** — wire-format data model for `/eevidence/groundsforrefusal`, Clauses 5.5.x (5.5.4 None / 5.5.5 Full / 5.5.6 Partial / 5.5.7 LDTask Object)

---

## TL;DR

Per ETSI TS 104 144 clause 5.5.1, the GFR endpoint "enables the Enforcing Authority to communicate whether or not it has grounds for refusal **after reviewing Form 1 (with Section M completed)** OR **after the Enforcing Authority having received a Form 3 from the Service Provider**." **Both triggers must be modelled.**

The prototype today **conflates** EU "Grounds for Refusal" with EPOC Form 3's non-execution reasons. They are **distinct but coupled systems** — Form 3 can be a *precursor* to GFR, not just a parallel taxonomy:

| | Form 3 (current prototype has it) | GFR (missing) |
|---|---|---|
| **Actor** | Microsoft refusing | Enforcing Authority's veto |
| **Direction** | Outbound — Microsoft authors | Inbound — Microsoft receives |
| **Legal anchor** | Reg 2023/1543 Annex III | Reg 2023/1543 Art. 8 + 10(2), Art. 12 |
| **Reason codes** | 10 ETSI codes for non-execution | 4 Art. 12 legal grounds |
| **ETSI clause** | 5.6.x (Non-Execution endpoint) | 5.5.x (GFR endpoint) |
| **Window** | None | 10 calendar days from EA notification |
| **SLA effect** | Pauses SLA on send (per earlier decision) | **Pauses SLA on receipt** (Appendix F Workflow 6) |
| **Workflow scope** | All eEvidence cases | Workflows 2, 5-international, 6 only |

This plan adds GFR as a first-class concept alongside Form 3. The Form 3 surfaces stay untouched.

---

## Scope narrowing — the 8 SP workflows (Appendix F)

EPOC Breakdown.xlsx enumerates 14 workflows; many are IA-internal or EA-internal and never surface to Microsoft. DARS Phase 2 Appendix F restricts to **8 SP-relevant workflows**:

| # | Workflow | GFR applies? |
|---|---|---|
| 1 | Standard Production — National | **No** — same-state, no EA leg |
| 2 | Standard Production — International (with EA review) | **Yes — primary GFR path** |
| 3 | Emergency Production (8h SLA, threat to life) | **No** — Appendix F: "no EA wait window" |
| 4 | Preservation Order (Form 2 / EPOC-PR) | No — preservation is not GFR-gated |
| 5 | Subsequent Production (Form 5) | **Yes if international** |
| 6 | Grounds for Refusal (EA Objects) | **This is GFR-in-flight** |
| 7 | Non-Execution (Form 3) | Parallel SP-side — not GFR but referenced |
| 8 | Withdrawal | **Supersedes an in-flight GFR if IA withdraws** |

GFR Panel render gate:
```ts
const gfrApplies = (
  fd.eevidenceWorkflow === 2 ||
  (fd.eevidenceWorkflow === 5 && fd.isInternational) ||
  fd.eevidenceWorkflow === 6
) && fd.authorizationDesiredStatus !== "Withdrawn";
```

Workflows 1, 3, 4, 7 never show the panel. Workflow 8 hides it once withdrawal is confirmed.

---

## What the sources agree on (post-reconciliation)

- **GFR is an Enforcing Authority decision delivered to Microsoft.** SP is passive. No "compose a GFR" workflow.
- **GFR has two triggers** per ETSI 5.5.1:
  - **Form 1 review** — EA reviews the original EPOC (with Section M completed) and issues a decision before SP execution.
  - **Form 3 response** — SP has already submitted a Form 3 non-execution via the Non-Execution endpoint (ETSI 6.4). The EA then issues a GFR responding to the SP's claim. The originating Form 3 is referenced via the GFR's **5.5.3 Document Object**.
- **The decision payload semantics shift with the trigger:**
  - Form 1 + `None` → EA cleared the case; SP proceeds normally.
  - Form 1 + `Full` / `Partial` → EA blocks delivery (full or per-Task-Object).
  - Form 3 + `None` → **EA rejected the SP's non-execution claim. SP must retract Form 3 and proceed with production.** (High-impact UI state.)
  - Form 3 + `Full` → EA backs the SP's refusal with formal legal veto. Case effectively closed.
  - Form 3 + `Partial` → EA partially backs the refusal; SP must still produce for non-blocked Task Objects.
- **Three decision states**, per ETSI's mutually-exclusive payload objects:
  - `None` — 5.5.4 `EPOCNoGroundsForRefusalInformation` — order may proceed
  - `Full` — 5.5.5 `EPOCFullRefusalInformation` — entire order blocked
  - `Partial` — 5.5.6 `EPOCPartialRefusalInformation` — block is scoped to one or more **LDTask Objects (5.5.7)**; in DARS each LDTask maps 1:1 to a target identifier, and the block cascades to every service + data-category job under that identifier
  - **No "Conditional" object exists in ETSI** — see "Out of scope" below.
- **`undefined` decision** = EA still reviewing (no payload received yet).
- **10-day review window** per Reg 2023/1543 Art. 8 + 10(2). Clock starts on EPOC notification to the EA.
- **GFR arrives via the Correspondence module** (workshop readout, confirmed by EPOC Breakdown).
- **Reason vocabulary** is transported as coded values inside the 5.5.5/5.5.6 payload objects. The codes derive from Reg 2023/1543 Art. 12 — Microsoft consumes them; we never author them.

## CRITICAL — Dual-taxonomy refusal model (with sequencing)

EPOC Breakdown draws an explicit line between two refusal taxonomies the earlier docs collapsed together. They have distinct actors and endpoints, but ETSI 5.5.1 confirms the workflows are **coupled** — a Form 3 (SP-side) can trigger a downstream GFR (EA-side):

| | EA Grounds for Refusal | SP Grounds for Non-Execution (Form 3) |
|---|---|---|
| Actor | Enforcing Authority | Microsoft |
| ETSI endpoint | `/eevidence/groundsforrefusal` (5.5.x) | `/nonexecution` (clause 6.4, carrying Form3Information) |
| Scope | Legal/jurisdictional veto | Operational inability |
| Outcome states | None / Full / Partial | (Form 3 sent → awaits EA response) |
| Triggers downstream? | — | **Yes** — EA may reply with a GFR confirming or rejecting Form 3 |

**Overlap:** reasons like `ConflictWithThirdCountryLaw` appear in BOTH taxonomies. Same vocabulary, different sender, different downstream effects. The model needs two separate fields on FormData; the actor (EA vs SP) is the discriminator.

**Sequencing implication:** a single case may carry both an outbound Form 3 AND an inbound GFR responding to it. The GFR Panel must surface its `trigger` ("Form1Review" vs "Form3Response") and, when applicable, link back to the originating Form 3 via the 5.5.3 Document Object reference. The Form 3 surface in CollectionTracker must reflect the EA's downstream response (e.g., "EA rejected this non-execution — production required").

---

## Resolved conflicts

Each conflict from the prior plan is now resolved against Appendix F + ETSI as the SP-canonical anchors.

### Conflict 1 — Does GFR pause the case SLA?

| Source | Position |
|---|---|
| Appendix F (Workflow 6) | "Apply hold and pause SLA immediately" |
| Workshop readout | "does NOT pause the case" |
| EPOC Breakdown | "not technically but in practice, yes" |

**Resolved (per RS guidance, 2026-05-21):** The Appendix F language "Apply hold and pause SLA immediately" applies only **after a Full GFR decision lands**, not while the EA is reviewing. The pre-decision EA-review window is tracked by a separate operational timer that does **not** affect SLA. Concretely:

| Phase | SLA behaviour |
|---|---|
| **Notification → decision pending** (EA reviewing) | SLA ticks normally. A separate `eaReviewWindowExpiresAt` countdown chip is shown alongside the SLA chip — operational tracking only, no SLA effect. |
| **Decision = `None`** (whether Form1Review or Form3Response) | No SLA change. Continue normally. |
| **Decision = `Full`** | Case-level SLA pauses entirely (we can't deliver anyway). Resume only on `manualDeliveryResumed` or a downstream `None`. |
| **Decision = `Partial`** | Case-level SLA **continues**. The partial-GFR effect is scoped to the blocked LDTask Objects (per-identifier block); non-blocked identifiers' work proceeds on the original SLA. |
| **Day-10 lapse without decision** | SLA still ticking; the EA-review timer just expired. RS decides what to do next (resume gated delivery via manual click, escalate, etc.). No automatic SLA action. |

**State model implication:** the EA-review countdown is its own field (`eaReviewWindowExpiresAt`), distinct from the SLA's `slaPausedAt`. They are independent timers. The SLA chip and the EA-review chip co-exist in the sticky header until a Full decision lands and the SLA chip flips to paused.

### Conflict 2 — What happens at day-10 lapse?

| Source | Position |
|---|---|
| **Appendix F (Workflow 2)** | **"Day-10 expiry → manually proceed to delivery (MVP)"** |
| Workshop readout | "proceed automatically" |
| Earlier spec | Manual action required; lapse is not approval |

**Resolved:** **Manual resume required.** Appendix F explicitly tags this as the MVP behaviour. Auto-resume reads as "approved by silence" which the Reg explicitly warns against.

Concrete behaviour:
- Day-10 with no EA decision: audit event auto-fires (`EaWindowExpired`); delivery stays gated.
- Specialist clicks **"Resume delivery — EA window lapsed"** → writes `GfrDeliveryResumedManually` audit event → lifts the gate.

### Conflict 3 — Does Full GFR block delivery or just signal disapproval?

| Source | Position |
|---|---|
| **Appendix F (Workflow 6)** | **"Enforce delivery blocks (full or partial)"** + **"Continue data collection during hold"** |

**Resolved:** Full GFR blocks **delivery** (Send / Form 3 transmission / Resolve). Collection continues — in-flight jobs keep running, data piles up, but nothing leaves the door. Partial GFR blocks delivery only for the EA-named data categories.

---

## Out of scope (with provenance)

These items were considered earlier but don't survive the Appendix F + ETSI scope narrowing. Each is captured here so a future contributor knows we ruled them out deliberately, not by omission.

| Item | Why out of scope |
|---|---|
| **`Conditional` decision state** | ETSI defines exactly three payload objects (5.5.4 None / 5.5.5 Full / 5.5.6 Partial). No `EPOCConditionalRefusalInformation` exists; the wire format literally cannot carry it. EPOC Breakdown's "Conditional" describes IA/EA-internal practice, not anything Microsoft receives. |
| **Clock-interrupt mechanics** (Form 3 pauses, new EPOC resets) | Not in Appendix F. Workflows 6 and 7 are modelled as separate SP states, not interleaved clock events. Deferred to v1.1 contingent on Legal sign-off. |
| **Emergency-variant retroactive purge** (8h SLA + 96h post-delivery GFR) | Appendix F Workflow 3 explicitly: "No EA wait window." Emergency production bypasses the GFR step entirely; there is no Workflow 3 + GFR composite. |
| **Multi-level `GfrBlockedSelector`** (service / category / timeRange) | ETSI 5.5.6 partial refusal scopes to LDTask Objects (5.5.7), not service-or-category-or-time. In DARS, LDTask ≡ target identifier, and the block cascades to every service + data-category job underneath. Service- / category- / time-range selectors are an EPOC Breakdown gloss on IA/EA-internal practice and not in the SP wire format. |
| **Auto-detect new EPOC arrival as a clock reset** | Out with clock-interrupt mechanics. |
| **EA "acknowledged receipt" sub-state** | All sources treat the EA as silent until a decision lands. |
| **"Revise EA decision" affordance** | Audit-only model — newest GFR correspondence wins. |

---

## Domain model

### ETSI-aligned tagged union

Mirrors ETSI's mutually-exclusive payload object structure (5.5.4/5.5.5/5.5.6).

```ts
/** EA's three discrete decisions, one per ETSI payload object.
 *  Absence (`undefined` decision payload) = EA still reviewing. */
export type GfrDecisionKind = "None" | "Full" | "Partial";

/** Reg 2023/1543 Art. 12 grounds. Transported inside the 5.5.5
 *  (Full) and 5.5.6 (Partial) payload objects as coded values.
 *  Microsoft consumes them; we never author them. The richer
 *  Form 3 D-reasons live separately on `nonExecutionReason`. */
export type RefusalReason =
  | "ImmunitiesOrPrivileges"            // Art. 12(1)(a)
  | "ConflictWithThirdCountryLaw"       // Art. 12(1)(b)
  | "ManifestBreachOfFundamentalRights" // Art. 12(1)(c)
  | "ManifestlyDisproportionate";       // Art. 12(1)(d)

/** Discriminated union per ETSI 5.5.4/5.5.5/5.5.6. */
export type GfrDecisionPayload =
  | {
      kind: "None";                   // 5.5.4 EPOCNoGroundsForRefusalInformation
      decidedAt: Date;
      decidedBy?: string;             // EA officer name if provided
      note?: string;
    }
  | {
      kind: "Full";                   // 5.5.5 EPOCFullRefusalInformation
      decidedAt: Date;
      decidedBy?: string;
      reasons: RefusalReason[];
      reasonSummary?: string;
    }
  | {
      kind: "Partial";                // 5.5.6 EPOCPartialRefusalInformation
      decidedAt: Date;
      decidedBy?: string;
      reasons: RefusalReason[];
      reasonSummary?: string;
      /** LDTask Object IDs (ETSI 5.5.7) whose entire production the EA
       *  blocks. In DARS these are matched against
       *  `AccountIdentifier.taskId` (caseTypes.ts:609) — format
       *  `LDID-xxxxxx | LIID-xxxxxx | LPID-xxxxxx`. The block CASCADES
       *  through every service and every data-category job under that
       *  identifier — there is no category-level or service-level
       *  partial within a Task. Non-listed identifiers remain
       *  actionable. NDOs already cross-reference identifiers via
       *  this same `taskId` field (NonDisclosureOrder.linkedTaskId),
       *  so the ETSI LDTask ↔ DARS identifier mapping has precedent. */
      blockedTaskObjectIds: string[];
    };

export interface EEvidenceGroundsForRefusal {
  /** Per ETSI 5.5.1, GFR has two trigger paths:
   *   - "Form1Review"   — EA reviewed the original EPOC (Form 1, Section M)
   *                       and issued a decision before SP execution.
   *   - "Form3Response" — SP submitted a Form 3 (Non-Execution endpoint,
   *                       ETSI 6.4); EA reviewed it and replied via GFR.
   *  Trigger affects panel copy AND the operational meaning of each
   *  decision (e.g., `None` after Form 3 ⇒ EA rejected SP's refusal). */
  trigger: "Form1Review" | "Form3Response";
  /** When trigger === "Form3Response", points to the SP's originating
   *  Form 3 (referenced via the GFR's 5.5.3 Document Object). The Form 3
   *  surface in CollectionTracker reads from this to reflect the EA's
   *  downstream verdict. */
  referencedForm3Id?: string;

  /** When the EA was first notified of the EPOC. Art. 8 clock starts here.
   *  For Form3Response trigger, this is the EA's notification of the
   *  Form 3 (which restarts a fresh 10-day review window). */
  notifiedAt: Date;
  /** notifiedAt + 10 calendar days. OPERATIONAL TIMER ONLY — does NOT
   *  pause the case SLA while the EA is reviewing. SLA pause only
   *  occurs after a Full GFR decision lands (see canDeliver +
   *  slaPausedAt on FormData). Recomputed only on a new EPOC
   *  (Workflow 5 link); no clock-interrupt model for MVP. */
  eaReviewWindowExpiresAt: Date;

  ea: { name: string; referenceNumber?: string };

  /** Undefined while EA reviewing; populated when 5.5.4/5/6 arrives. */
  decision?: GfrDecisionPayload;

  // Day-10 lapse handling
  windowLapsed?: boolean;
  windowLapsedAt?: Date;
  manualDeliveryResumed?: boolean;
  manualDeliveryResumedAt?: Date;
  manualDeliveryResumedBy?: string;
}
```

### Workflow discriminator (new field on FormData)

```ts
/** Maps to DARS Phase 2 Appendix F. Drives the GFR Panel render gate
 *  and several other workflow-specific behaviours (8h SLA, preservation
 *  semantics, withdrawal handling). */
export type EEvidenceWorkflow = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// On FormData:
//   eevidenceWorkflow?: EEvidenceWorkflow;
//   isInternational?: boolean;   // surfaces alongside Workflow 2 / 5 / 6
```

### New `EscalationAuditEvent.kind` values

- `GfrReceived` — fires when an EA decision lands (None/Full/Partial — note captures which AND the trigger).
- `EaWindowExpired` — fires at day-10 if `decision` is still undefined.
- `GfrCleared` — fires when an EA decision flips a Full/Partial back to None (rare but legal).
- `GfrDeliveryResumedManually` — fires when the specialist clicks "Resume delivery" after a window lapse.
- `Form3Retracted` — fires when the specialist retracts a Form 3 after `Form3Response + None` (the EA rejected the SP's claim).

### Modelling GFR as a Correspondence inbound kind

Inbound GFR items get `kind: "GroundsForRefusal"` and the panel reads from the most recent such inbound. Unifies with the RFI/PAI pattern.

---

## Surfaces to build

| Surface | What changes |
|---|---|
| **Case Overview — top of escalation banner stack** | New `GroundsForRefusalPanel` rendered FIRST on workflows 2/5-international/6. Branches on `decision.kind` × `trigger`: undefined → countdown panel; `Full` → red HOLD panel; `Partial` → amber panel listing the blocked target identifiers; `None` (Form1Review) → green "EA cleared this case"; `None` (Form3Response) → orange "EA rejected your Form 3 — production required" with CTA to retract Form 3; `windowLapsed` → warning banner with "Resume delivery" CTA. The panel header always displays the trigger badge ("Reviewing Form 1" vs "Reviewing Form 3 #...") so the RS sees the conversation context at a glance. |
| **Sticky case header chip** | New GFR chip via `currentEscalationChip(formData)` extension. Tone-coded by decision. Composes with the existing SLA-paused pill. |
| **Queue cards (CaseCardOperationalBadges)** | New "GFR HOLD" / "PARTIAL GFR" / "EA reviewing · Nd" badge. Hidden on workflows 1/3/4/7/8. |
| **Detailed list (CaseQueueListRow)** | Same badge inline with Case ID. |
| **Preview pane** | Inherits via `CaseCardOperationalBadges`. |
| **Attorney Dashboard** | GFR-held cases sort to the top above Pending attorney escalation. |
| **CollectionTracker / delivery action sites** | Gate Send / Form 3 transmission / Resolve when `!canDeliver(formData)`. For Partial GFR: every row under each blocked target identifier (all services + all data-category jobs under it) is greyed out with a "Blocked by EA — Partial GFR" pill. Non-listed identifiers remain fully actionable. When a Form3Response GFR returns `None`, the Form 3 record on CollectionTracker (or wherever it's surfaced) carries a "EA rejected — production required" pill plus a "Retract Form 3" CTA. |
| **AuditThread** | Render the four new event kinds (icons + tones already scaffolded). |
| **Inbox bubble (CorrespondenceMessageBubble)** | When `kind === "GroundsForRefusal"`, render a distinct chip + the decision details inline. Click → opens the GFR Panel. |

---

## State machine (simplified — no clock interrupts)

GFR can enter the state machine via either trigger; the body of the machine is identical from "EA reviewing" onward.

```
┌─────────────────────────┐     ┌────────────────────────────┐
│ Trigger A: EA notified  │     │ Trigger B: SP sent Form 3  │
│ of Form 1 + Section M   │     │ via Non-Execution endpoint │
│ (Art. 8 clock starts)   │     │ (fresh 10-day clock starts)│
└──────────┬──────────────┘     └──────────┬─────────────────┘
           │                               │
           └──────────────┬────────────────┘
                          │
                          ▼
┌──────────────────────────────────┐
│   SLA continues normally;        │
│   eaReviewWindowExpiresAt =      │
│   notifiedAt + 10 days (op chip) │
└─────────────┬────────────────────┘
              │  (decision = undefined)
              ▼
┌──────────────────────────────────┐
│   EA reviewing — countdown panel │
│   Day-8/9 amber nudge surfaces   │
└──────────┬────────┬──────────────┘
           │        │
   EA decides    Day 10 silence
           │        │
           │        ▼
           │  ┌─────────────────────────────┐
           │  │   windowLapsed = true       │
           │  │   audit: EaWindowExpired    │
           │  │   Banner: "Window expired — │
           │  │   no approval implied"      │
           │  │   Delivery still gated      │
           │  └───────┬─────────────────────┘
           │          │
           │     specialist clicks
           │     "Resume delivery"
           │          │
           │          ▼
           │  ┌─────────────────────────────┐
           │  │ manualDeliveryResumed=true  │
           │  │ audit:                      │
           │  │  GfrDeliveryResumedManually │
           │  │ SLA resumed; delivery OK    │
           │  └─────────────────────────────┘
           ▼
   ┌───────────────────┐
   │  Decision branch  │
   └─┬─────┬─────┬─────┘
     │     │     │
   None  Full  Partial
     │     │     │
     ▼     ▼     ▼
 No SLA   Pause       Block every
 change;  case-       service+job
 audit:   level SLA;  under each
 GfrClrd  block all   blocked Task
          delivery    ID. CASE SLA
                      KEEPS TICKING
                      for non-
                      blocked IDs.

           ⇡ Semantics differ by trigger:
             • Form1Review + None     → EA cleared the original EPOC;
                                        proceed to production.
             • Form3Response + None   → EA REJECTED the SP's Form 3;
                                        retract Form 3, proceed to
                                        production. (High-impact UI.)
             • Form1Review + Full     → EA blocked the original EPOC.
             • Form3Response + Full   → EA backed the SP's refusal;
                                        case effectively closed.
             • {trigger} + Partial    → Block only the named LDTask /
                                        target identifiers (same shape
                                        regardless of trigger).
```

State invariants:
- **SLA does NOT pause on notification.** Pre-decision EA review is tracked by a separate `eaReviewWindowExpiresAt` chip (operational only).
- **SLA pauses ONLY on a Full GFR decision** (case-level). Resumes on `manualDeliveryResumed` or a superseding `None`.
- **Partial GFR does not pause the case SLA.** The block is scoped to the named LDTask IDs; the case clock continues for all non-blocked identifiers.
- **`None` decision** has no SLA effect (whether arriving via Form1Review or Form3Response trigger).
- Collection jobs keep running regardless of GFR state.
- A late EA decision overrides a prior `windowLapsed` state.
- IA withdrawal (Workflow 8) supersedes everything — hides panel, cancels delivery, starts retention clock.

---

## Mock seeds (5 cases — covers both triggers + all 3 decisions + lapse)

Seed names use a scenario-descriptive convention: `{trigger}-{outcome}` so the case ID, the file name, and the verification step all read consistently.

| Case ID | Scenario name | Workflow chain | Trigger | GFR state |
|---|---|---|---|---|
| **LNS-2026-00240** | **Form1-Full-EaBlocks** | 2 → 6 | `Form1Review` | `Full` — `reasons: [ImmunitiesOrPrivileges]`. Demonstrates red HOLD panel + full delivery block + case SLA pauses + audit `GfrReceived`. |
| **LNS-2026-00250** | **Form1-Partial-EaBlocksOneTask** | 2 → 6 | `Form1Review` | `Partial` — 3 target identifiers (`LDID-100001`, `LDID-100002`, `LDID-100003`); `blockedTaskObjectIds: ["LDID-100002"]`. Demonstrates amber panel + per-identifier cascade. Case SLA continues for non-blocked identifiers. |
| **LNS-2026-00255** | **Form1-None-EaClears** | 2 → 6 | `Form1Review` | `None` — EA explicitly approved. Demonstrates green confirmation panel + audit `GfrCleared`. SLA unchanged. |
| **LNS-2026-00260** | **Form1-Lapsed-NoEaResponse** | 2 → 6 | `Form1Review` | `decision: undefined`, `notifiedAt` 11 days ago, `windowLapsed: true`. Demonstrates day-10 lapse banner + "Resume delivery" CTA + audit `EaWindowExpired`. SLA still ticking — no auto-pause. |
| **LNS-2026-00265** | **Form3Response-None-EaOverrulesSp** | 2 → 7 → 6 | `Form3Response` | SP sent a Form 3 citing `ConflictWithThirdCountryLaw`; EA replied `None`, rejecting the SP's claim. Demonstrates the orange "EA rejected your Form 3 — production required" panel variant + Retract-Form-3 CTA + linked Form 3 reference in the panel header. |

Optionally update one existing case to carry `eevidenceWorkflow: 1` (Workflow 1 — National, no EA leg) so the panel-suppression gate is verifiable.

**Why no `Form3Response + Full` seed?** It's the most likely production outcome but the least UX-interesting — the SP's view is "EA backed our refusal, audit only, no action required." Covered as a Phase G toggle on LNS-2026-00240 rather than a full new seed.

**Other `Form3Response` × decision combinations** that are *not* seeded but documented:
- `Form3Response + Partial` — EA partially backs the SP refusal. Rare; production resumes for non-blocked LDTasks. Phase G can simulate via dev-only toggle.

---

## Files modified / created

| File | Change | Phase |
|---|---|---|
| `src/types/caseTypes.ts` | Replace stale Phase 1 types with the tagged-union `GfrDecisionPayload` + `RefusalReason` (trimmed to Art. 12) + `EEvidenceGroundsForRefusal` + `EEvidenceWorkflow`. Add `eevidenceWorkflow` + `isInternational` fields on FormData. | A |
| `src/types/correspondence.ts` | Extend `InboundKind` union with `"GroundsForRefusal"`. | A |
| `src/components/escalation/AuditThread.tsx` | Icon+tone for 4 new audit kinds already scaffolded — keep. | A |
| **new** `src/utils/groundsForRefusal.ts` | Helpers: `gfrApplies(formData)`, `currentDecision(formData)`, `isCaseOnGfrHold(formData)`, `gfrChipMeta(formData)`, `daysLeftEaReview(formData)`, `identifierBlockedByPartialGfr(formData, taskObjectId)`, `blockedIdentifierIds(formData)`, `isWindowLapsed(formData)`, `canDeliver(formData)`. | A |
| **new** `src/components/escalation/GroundsForRefusalPanel.tsx` | Five-state render: Reviewing-countdown, Full, Partial, None, Lapsed-warning. | A/B |
| `src/components/DataEntryForm.tsx` | Mount `GroundsForRefusalPanel` gated by `gfrApplies(formData)`. Add `handleResumeDeliveryAfterLapse`. `useEffect` to auto-fire `EaWindowExpired` at day-10. Wire SLA pause/resume on GFR state transitions. | A, D, E |
| `src/utils/escalationHelpers.ts` | Extend `currentEscalationChip()` to compose with attorney chips. | A |
| `src/components/case-queue/CaseCardOperationalBadges.tsx` | New badge for GFR state; hidden on non-applicable workflows. | C |
| `src/components/case-queue/CaseQueueListRow.tsx` | Inline GFR badge on Case ID cell. | C |
| `src/components/app-shell/AttorneyDashboard.tsx` | GFR HOLD sort weight above Pending attorney escalation. | C |
| `src/components/CollectionTracker.tsx` | Gate Send + Form 3 + Resolve on `canDeliver(formData)`. Per-category gates for Partial GFR. Hide UI on Workflow 8 withdrawal. | D |
| `src/components/correspondence/CorrespondenceMessageBubble.tsx` | Render inbound `GroundsForRefusal` items with decision chip + summary. | F |
| **new** `src/utils/mockCaseDataLENS202600240.ts` | Seed: **Form1-Full-EaBlocks** (2 → 6) | A |
| **new** `src/utils/mockCaseDataLENS202600250.ts` | Seed: **Form1-Partial-EaBlocksOneTask** (2 → 6) | B |
| **new** `src/utils/mockCaseDataLENS202600255.ts` | Seed: **Form1-None-EaClears** (2 → 6) | B |
| **new** `src/utils/mockCaseDataLENS202600260.ts` | Seed: **Form1-Lapsed-NoEaResponse** (2 → 6) | E |
| **new** `src/utils/mockCaseDataLENS202600265.ts` | Seed: **Form3Response-None-EaOverrulesSp** (2 → 7 → 6) | B |
| `src/utils/caseDataRegistry.ts` | Register the 5 new builders. | A/B/E |
| `src/components/case-queue/case-queue-types.ts` | Add 5 new rows to `MOCK_CASES` with `eevidenceWorkflow: 2`. | A/B/E |
| `src/components/CollectionTracker.tsx` (Form 3 surface) | When a Form3Response GFR returns `None`, render the linked Form 3 row with a "EA rejected — production required" pill and a "Retract Form 3" CTA. | B/D |

---

## Implementation phases — UX-validation order

Each phase produces something the RS can click through in the browser. Each phase has its own open-questions block; nothing implementation-side proceeds past those.

### Phase A — Panel visible on one Full GFR case

**Goal:** Open one mock case → see GroundsForRefusalPanel rendered correctly. Nothing else changes yet — no gates, no queue badges, no correspondence wiring.

**Ships:**
- Type updates (tagged-union `GfrDecisionPayload`, trimmed `RefusalReason`, `eevidenceWorkflow`, `trigger: "Form1Review" | "Form3Response"`, `referencedForm3Id?`). Replaces the older stale Phase-1 scaffolding.
- `groundsForRefusal.ts` helpers (the read-side: `gfrApplies`, `currentDecision`, `gfrTrigger`, `gfrChipMeta`, `daysLeftEaReview`).
- `GroundsForRefusalPanel` rendering 3 states for the Form1Review trigger only: Reviewing-countdown, Full, None. (Partial deferred to Phase B; Form3Response trigger handling to Phase B; Lapsed to Phase E.) The panel header surfaces the trigger badge so the contract is visible even when only one trigger is wired.
- Sticky-header chip via `currentEscalationChip` extension.
- 1 mock seed: **Form1-Full-EaBlocks** (LNS-2026-00240, Workflow 2, Form1Review trigger).
- Render gate working: opening a non-applicable case (Workflow 1, 3, 4, 7) shows no panel and no chip.

**You validate by clicking:**
- Open LNS-2026-00240 → red HOLD panel at top of banner stack, chip in sticky header.
- Open any existing eEvidence case → no panel, no chip (workflow discriminator hides it).

**Open questions for Phase A:**
1. **Panel placement** — top of the `space-y-3 mb-4` banner stack (above EnterpriseEscalationBanner)? Or inline with the Case Overview body sections?
2. **Sticky header chip tone** — Full GFR = red, mirroring existing "Attorney Hold"? Or distinct purple-gavel tone so it's not visually confused with attorney escalation?
3. **Panel copy register** — strict legalese ("EA has determined Full Grounds for Refusal under Reg 2023/1543 Art. 8") vs specialist-readable ("This case is blocked by the Enforcing Authority — see decision below")?
4. **Countdown unit** — `Nd Nh remaining` like the SLA chip, or whole-days only (workshop treats the window as calendar days)?
5. **Retrofit existing seeds with `eevidenceWorkflow`?** — minimal: only the new GFR seeds get the discriminator + a sentinel for the existing cases. Or full retrofit so every case carries the right workflow type? Recommendation: minimal, plus one existing case marked `eevidenceWorkflow: 1` to prove suppression works.

---

### Phase B — Partial + None decision states + Form3Response trigger

**Goal:** See how the panel branches across the remaining EA decisions AND across both triggers. All 3 ETSI decisions (None/Full/Partial) demonstrable across both trigger paths (Form1Review and Form3Response).

**Ships:**
- Partial-state panel rendering (lists each blocked target identifier with the EA's reasons inline; non-listed identifiers shown as "Production continues").
- None-state panel — two variants per trigger:
  - Form1Review + None → green "EA cleared this case — production may proceed".
  - Form3Response + None → orange "EA rejected your Form 3 — production required" with a "Retract Form 3" CTA.
- 3 mock seeds:
  - **Form1-Partial-EaBlocksOneTask** (LNS-2026-00250) — 3 identifiers, 1 blocked.
  - **Form1-None-EaClears** (LNS-2026-00255) — Form1Review + None.
  - **Form3Response-None-EaOverrulesSp** (LNS-2026-00265) — high-impact "EA rejected your Form 3" retract scenario.
- Helpers: `identifierBlockedByPartialGfr`, plus `gfrPanelVariant(formData)` to select the right panel variant from `(trigger, decision.kind)`.
- Form 3 surface treatment: when a Form3Response GFR returns `None`, the Form 3 row carries the "EA rejected — production required" pill and the Retract CTA (clicking it writes a placeholder retraction audit event; full retract flow Phase D).

**You validate by clicking:**
- Switch between **Form1-Full-EaBlocks** (LNS-2026-00240), **Form1-Partial-EaBlocksOneTask** (LNS-2026-00250), **Form1-None-EaClears** (LNS-2026-00255), **Form3Response-None-EaOverrulesSp** (LNS-2026-00265) → each panel renders its variant.
- Partial case lists each blocked target identifier with its reason chips; other identifiers shown as "Production continues".
- **Form1-None-EaClears** (LNS-2026-00255) shows green "EA cleared this case" confirmation.
- **Form3Response-None-EaOverrulesSp** (LNS-2026-00265) shows the orange "EA rejected your Form 3" panel + Retract CTA; the panel header references the originating Form 3 ID; the Form 3 row on CollectionTracker shows the matching pill.

**Open questions for Phase B:**
1. **Partial-list layout** — for each blocked identifier, render `[ID copyable] · [reason chips]` on its own line? Or a compact grouped layout (one line per reason, with identifiers listed under it)? Recommendation: identifier-first, since the RS action is per-identifier.
2. **Partial reasons rendering** — chip per `RefusalReason` (one per reason) or single sentence? Art. 12 codes are short — chips look clean.
3. **`None` panel — Form1Review variant** — persistent green banner, or auto-collapse to a chip after the RS dismisses it once? Recommendation: persistent until next case action.
4. **`None` panel — Form3Response variant ("EA rejected your Form 3")** — should the Retract-Form-3 CTA require a confirmation dialog ("I acknowledge the EA's rejection and will proceed with production")? Recommendation: yes — strict-legal posture, matching the day-10 lapse pattern. Without that, the audit trail loses the RS's explicit acknowledgement.
5. **Retract Form 3 mechanics** — does retracting a Form 3 fully reverse the SP's non-execution claim (case returns to in-flight production), or does it leave a tombstone record of the retracted Form 3 in the audit thread? Recommendation: tombstone retain — production resumes but the prior Form 3 is auditable.
6. **Identifier ID source** — what's the stable ID DARS uses for a target identifier today? Need a consistent value to populate `blockedTaskObjectIds[]`. I'll grep; flag if you know the field name off-hand (e.g. `identifier.id` vs `identifier.taskObjectId`).
7. **Block visibility on non-CollectionTracker surfaces** — Identifiers Summary table, alias panels — do they also surface the blocked-identifier pill, or is CollectionTracker the canonical block surface?

---

### Phase C — Queue visibility (no opening the case)

**Goal:** An RS scanning the queue can spot GFR cases without clicking in.

**Ships:**
- GFR badge on `CaseCardOperationalBadges` (Cards mode).
- Inline badge in `CaseQueueListRow` (Detailed list + Preview pane inherits).
- Badge hidden on workflows 1/3/4/7/8 — verify with the retrofit seed from Phase A.
- Attorney Dashboard sort weight bump for GFR-held cases.

**You validate by clicking:**
- Refresh the queue → 3 GFR cases (Full/Partial/None) have distinct chips visible in Cards / List / Preview modes.
- Workflow 1 retrofit case → no GFR chip on the queue card.
- Switch to Attorney Dashboard → GFR cases sort above Pending-attorney-escalation cases.

**Open questions for Phase C:**
1. **Badge placement on the card** — append to operational badges row (Cat 5), or anchor it to the case-ID row beside "Blocked by Authority"? Latter is more prominent but crowds the title row.
2. **Detailed list column** — reuse the existing inline badge group, or add a dedicated "Escalation" column?
3. **Quick filter — "On GFR hold"** — add to the assignment dropdown? Or out of scope for MVP?
4. **Dashboard sort weight order** — `Full > Partial > windowLapsed > Pending attorney escalation`? Or treat all GFR states equally above attorney work?
5. **Should `None` cases get a queue chip at all?** A "cleared" indicator is informational but not actionable. Recommendation: brief green chip for 48h then auto-suppress.

---

### Phase D — Delivery gates active + SLA pause/resume

**Goal:** Panel now actually does something. Try to deliver → blocked. SLA chip behaves correctly across the state machine.

**Ships:**
- `canDeliver(formData)` helper (true unless Full GFR active, or Partial gate hits, or window lapsed without manual resume). For Partial GFR, `canDeliver` is identifier-scoped: `canDeliverForIdentifier(formData, taskObjectId)`. For `Form3Response + None`, `canDeliver` only becomes true after the RS retracts the Form 3 (so production isn't accidentally re-enabled while a stale Form 3 is still in the audit-active state).
- Gates on `Send` / `Form 3 send` / `Resolve` in CollectionTracker. For Partial GFR: cascade the block through every service + data-category row under each blocked identifier (no per-row override possible — the block is at the LDTask level).
- Full Retract-Form-3 flow (started as a stub in Phase B): confirmation dialog → audit event `Form3Retracted` (new kind) → Form 3 status flipped to "Retracted — superseded by EA decision" → `canDeliver` re-enables for non-blocked identifiers.
- SLA pause on GFR notification (Appendix F): set `slaPausedAt` when EA review begins. Resume on `None` decision or on `manualDeliveryResumed`. SLA pill composes with the GFR sub-chip.
- Workflow 8 supersession: panel hides + delivery cancels on `authorizationDesiredStatus === "Withdrawn"`.

**You validate by clicking:**
- Open **Form1-Full-EaBlocks** (LNS-2026-00240) → Send disabled with tooltip; sticky-header SLA pill flips to **paused** at the moment the Full decision lands.
- Open **Form1-Partial-EaBlocksOneTask** (LNS-2026-00250) → every service + data-category row under the EA-blocked identifier is greyed out with "Blocked by EA — Partial GFR" pills; the other two identifiers' rows are fully actionable; Send becomes a per-identifier action. **Case SLA chip unchanged** — still live-ticking against the original deadline.
- Open **Form1-None-EaClears** (LNS-2026-00255) → SLA chip unchanged (never paused — None has no SLA effect); Send enabled.
- Withdraw an in-flight GFR case via mock toggle → panel disappears; Send disabled with "Case withdrawn" tooltip.

**Open questions for Phase D:**
1. **Tooltip copy when delivery blocked** — "Delivery blocked by EA Grounds for Refusal" vs "See decision details above" linking to the panel?
2. **Form 3 send while GFR is in flight** — block since the EA is currently reviewing? Or allow since the SP might discover an unrelated non-execution reason? Recommendation: block by default, with an override for the case where the SP's reason is distinct from the EA's; flag as TODO until Legal weighs in.
3. **`Resolve` action** — block while any GFR is active? Or allow a "resolve as refused" path that captures the GFR-driven outcome?
4. **Per-identifier gate visual** — grey out every row under the blocked identifier + pill on the identifier header? Or collapse the identifier's section entirely with a single "Blocked by EA — N services + categories suppressed" summary?
5. **SLA chip composition** — show two pills ("SLA paused" + "Awaiting EA Nd") or one merged pill ("SLA paused · EA reviewing Nd")?
6. **Retract Form 3 confirmation dialog copy** — needs to communicate "this is irreversible — the SP's non-execution claim will be withdrawn and production will resume." Plus the "I acknowledge" checkbox? Draft copy needed before Phase D ships.
7. **`Form3Retracted` audit event** — new audit kind, or fold under existing `Form3Submitted` lineage as a "status change"? Recommendation: new kind, since it surfaces a different operational meaning.

---

### Phase E — Day-10 lapse + manual resume

**Goal:** Time-based behaviour. Most visually distinctive panel state.

**Ships:**
- `useEffect` in DataEntryForm that auto-fires `EaWindowExpired` audit event when `Date.now() > eaReviewWindowExpiresAt && decision === undefined`. (Does NOT auto-pause SLA — the EA review timer is operational only.)
- Lapsed-state panel variant with orange warning + "Resume delivery — EA window lapsed" CTA.
- `manualDeliveryResumed` writes its audit event and unblocks delivery (resumes SLA + lifts the canDeliver gate).
- 1 new mock seed: **Form1-Lapsed-NoEaResponse** (LNS-2026-00260, `notifiedAt` 11 days ago).
- Day-8/9 amber nudge chip on the SLA strip.

**You validate by clicking:**
- Open **Form1-Lapsed-NoEaResponse** (LNS-2026-00260) → orange warning banner + disabled Send.
- Click "Resume delivery" → confirm dialog → audit fires → panel transitions to "Window lapsed — delivery resumed manually" record → Send re-enables.

**Open questions for Phase E:**
1. **Confirmation dialog before resume?** Or one-click? Recommendation: dialog with "I acknowledge no EA approval is implied" checkbox (strict-legal posture per Conflict 2 resolution).
2. **Day-8 / Day-9 nudge surface** — toast on case open? Persistent amber chip on the SLA strip? In-panel only?
3. **Late EA decision after lapse** — confirmed the late decision supersedes the lapse. Should the panel show both the lapse audit AND the new decision, or hide the lapse once superseded?

---

### Phase F — Correspondence integration

**Goal:** GFR arrives via the Correspondence module as Appendix F + workshop describe. The bubble in the conversation thread is the canonical source; the panel reads from the most recent inbound.

**Ships:**
- Extend `InboundKind` with `"GroundsForRefusal"`.
- `CorrespondenceMessageBubble` renders the GFR variant with decision chip + summary inline + "Open in panel" link.
- Bidirectional sync: panel reads from the most recent inbound GFR item; correspondence ordering preserved.

**You validate by clicking:**
- Open **Form1-Full-EaBlocks** (LNS-2026-00240) → Correspondence Hub shows a `GroundsForRefusal` bubble in the thread.
- Click the bubble → scrolls to (or opens) the GFR Panel.
- Close & reopen the case → panel reloads from correspondence state.

**Open questions for Phase F:**
1. **Bubble expanded by default?** Other inbound kinds are collapsed; GFR is higher-stakes. Recommendation: expand-on-mount for the most-recent GFR.
2. **Multiple EA replies** — if the EA sends Partial then a correction to Full, do both bubbles render? "Newest wins" was the proposed model.
3. **Attachments** — EA decisions in production often include PDFs (the formal decision letter from the 5.5.3 Document Object). Bubble supports attachment chips, or out of scope for MVP?
4. **Reply affordance** — can the RS reply to an EA inbound via the existing composer? Or is the EA channel one-way for this prototype?
5. **Form 3 → GFR linkage rendering** — when a GFR has `trigger === "Form3Response"`, the bubble should visually thread under the SP's Form 3 outbound (akin to an email reply). Same conversation, indented, or a separate "Decision on your Form 3" subgroup? Recommendation: threaded indent — matches the conversation metaphor and keeps the originating Form 3 immediately visible.

---

### Phase G — Polish + verification

**Goal:** Edge cases swept, build clean, accessibility verified.

**Ships:**
- Workflow 4 (Preservation) sweep — confirm panel never renders.
- Workflow 5 international sweep — confirm panel renders for international Form 5, not domestic.
- Workflow 8 (Withdrawal) supersession sweep — confirm panel hides cleanly when withdrawal lands mid-GFR.
- `npx vite build` clean.
- axe-core sweep on the new panel + chip + queue badge.
- Hover + keyboard nav on all new affordances.
- Focus restoration verified when the panel mounts/unmounts.

**Open questions for Phase G:**
1. **Anything from earlier phases left as TODO** — promote to a v1.1 backlog item or block the verification gate?

---

## Verification (end-to-end)

Organised by flow category. Every flow demonstrable in the prototype gets at least one verification step.

### A — Form1Review trigger flows (path: Workflow 2 → 6)

| # | Seed | Workflow chain | What to verify |
|---|---|---|---|
| A.1 | **Form1-Full-EaBlocks** (LNS-2026-00240) | 2 → 6 | Open the case → red GFR HOLD panel at top of banner stack. Sticky-header chip shows "EA Hold — Full". SLA pill flips to **paused** (per Conflict 1 resolution: Full = pause). Send / Form 3 / Resolve all disabled with "Delivery blocked by EA" tooltip. Audit Thread shows `GfrReceived` with reason chip. |
| A.2 | **Form1-Partial-EaBlocksOneTask** (LNS-2026-00250) | 2 → 6 | Open the case → amber PARTIAL GFR panel lists `LDID-100002` as blocked with reason chips; lists `LDID-100001` and `LDID-100003` as "Production continues". On CollectionTracker, every service + data-category row under `LDID-100002` is greyed with "Blocked by EA — Partial GFR" pill. Rows under the other two LDTask IDs remain fully actionable. **Case SLA continues ticking** (Partial does NOT pause case SLA). Audit `GfrReceived`. |
| A.3 | **Form1-None-EaClears** (LNS-2026-00255) | 2 → 6 | Open the case → green None panel: "EA cleared this case — production may proceed". Send enabled. SLA pill **unchanged** (None has no SLA effect). Audit `GfrCleared`. |
| A.4 | **Form1-Lapsed-NoEaResponse** (LNS-2026-00260) | 2 → 6 | Open the case → orange warning banner: "EA review window expired (11 days ago) — no approval implied." SLA pill **still ticking** (day-10 lapse does NOT auto-pause SLA — RS decides). Click "Resume delivery — EA window lapsed" → confirmation dialog with "I acknowledge no EA approval is implied" checkbox → Send re-enabled, audit `GfrDeliveryResumedManually`. Audit `EaWindowExpired` fired automatically at day-10. |

### B — Form3Response trigger flows (path: Workflow 2 → 7 → 6)

| # | Seed | Workflow chain | What to verify |
|---|---|---|---|
| B.1 | **Form3Response-None-EaOverrulesSp** (LNS-2026-00265) | 2 → 7 → 6 | Open the case → orange Form3Response panel: "EA rejected your Form 3 — production required." Panel header carries the originating Form 3 ID + "Reviewing Form 3" trigger badge. The Form 3 row on CollectionTracker shows the matching "EA rejected — production required" pill plus a "Retract Form 3" CTA. Click Retract → confirmation dialog → audit thread gets `Form3Retracted` and `GfrCleared`. Form 3 row flips to "Retracted — superseded by EA decision". Send re-enables for all identifiers. |
| B.2 (toggle, no seed) | Form3Response + Full (LNS-2026-00240 dev toggle) | 2 → 7 → 6 | Dev toggle on the Form1-Full-EaBlocks seed simulates EA backing the SP's refusal instead of issuing its own. Panel shows "EA confirmed your Form 3 — case closed." No new action required. Audit `GfrReceived` with trigger annotated. |

### C — Workflow-gate suppression (panel must NOT render)

| # | Scenario | What to verify |
|---|---|---|
| C.1 | Existing case with `eevidenceWorkflow: 1` (National) | No GFR Panel, no sticky chip, no queue badge. CollectionTracker normal. |
| C.2 | Workflow 3 (Emergency — 8h SLA, no EA wait) | No GFR Panel. (Existing emergency seed if one exists, else dev toggle.) |
| C.3 | Workflow 4 (Preservation — Form 2 / EPOC-PR) | No GFR Panel. Preservation surface unaffected. |
| C.4 | Workflow 7 (Form 3 in flight, no EA reply yet) | No GFR Panel — Form 3 outbound is visible on its own surface. Only when an inbound GFR lands with `trigger: "Form3Response"` does the panel appear. |
| C.5 | Workflow 8 (Withdrawn, `authorizationDesiredStatus === "Withdrawn"`) | GFR Panel suppressed even if a prior decision was held; "Case withdrawn" message takes precedence. |
| C.6 | Non-eEvidence request type (e.g., a Search Warrant case) | `gfrApplies` returns false unconditionally. No panel, no chip. |

### D — Cross-surface visibility (queue side)

| # | Surface | What to verify |
|---|---|---|
| D.1 | Case list — Cards view | All 5 GFR seeds carry distinct chips ("GFR HOLD", "PARTIAL GFR", "EA cleared", "Window lapsed", "EA rejected Form 3"). Workflow 1 retrofit case shows no GFR chip. |
| D.2 | Case list — Detailed list view | Inline badge appears next to Case ID, same 5 distinct chips, suppressed on non-applicable workflows. |
| D.3 | Case list — Preview pane | Inherits the badge via `CaseCardOperationalBadges`. Selecting a GFR case shows the operational summary including GFR state. |
| D.4 | Attorney Dashboard | Form1-Full, Form1-Partial, Form1-Lapsed, Form3Response-None seeds all sort **above** Pending Attorney Escalation cases. Form1-None ("cleared") is at normal priority. |

### E — Correspondence / inbox integration

| # | Scenario | What to verify |
|---|---|---|
| E.1 | Form1Review path | Open the case → Correspondence Hub shows an inbound `GroundsForRefusal` bubble. Click → scrolls to / opens GFR Panel. |
| E.2 | Form3Response path | Inbound GFR bubble is **threaded** under the originating outbound Form 3 (email-reply metaphor). Both visible in the conversation. |

### F — Audit Thread

| # | Event | Triggered by | What to verify |
|---|---|---|---|
| F.1 | `GfrReceived` | Any EA decision landing | Renders with the right icon/tone for None/Full/Partial. Note captures decision kind + trigger ("Form 1 review" vs "Form 3 response"). |
| F.2 | `EaWindowExpired` | Day-10 useEffect | Renders automatically on the Lapsed seed. |
| F.3 | `GfrCleared` | None decision OR Retract-Form-3 path closing the GFR | Fires on Form1-None, Form3Response-None (after Retract), and Form1-Lapsed (after Resume). |
| F.4 | `GfrDeliveryResumedManually` | RS clicked Resume after lapse | Fires on Form1-Lapsed only after the confirm dialog completes. |
| F.5 | `Form3Retracted` | RS clicked Retract Form 3 | Fires on Form3Response-None after the confirm dialog completes. |

### G — SLA behaviour matrix

| # | State | Expected SLA chip behaviour |
|---|---|---|
| G.1 | Pre-decision (EA reviewing — Form1Review or Form3Response) | SLA ticks normally. Separate `eaReviewWindowExpiresAt` chip shown alongside — operational only. |
| G.2 | `Full` decision landed | Case SLA pauses; "SLA paused — EA Full GFR" pill replaces the live countdown. |
| G.3 | `Partial` decision landed | Case SLA continues; chip surfaces "Partial GFR — N task(s) blocked" alongside but doesn't pause SLA. |
| G.4 | `None` decision landed | No SLA change. Chip clears. |
| G.5 | Day-10 lapse without decision | SLA still ticking. Warning banner appears. No automatic SLA pause. |

### H — Build + accessibility

| # | Check | Tool |
|---|---|---|
| H.1 | `npx vite build` | Clean — no Rollup errors, no missing lucide exports. |
| H.2 | axe-core sweep on the GFR Panel, sticky chip, queue badges, Retract dialog | Zero violations on `button-name` / `aria-required-attr` / contrast. |
| H.3 | Keyboard nav | Panel + Retract CTA + Resume CTA + confirm dialog all reachable via Tab; Enter activates; Esc dismisses dialogs. |
| H.4 | Focus restoration | After Retract dialog closes, focus returns to the Retract button (or its replacement state). After Resume dialog closes, focus returns to the resumed-delivery banner. |

---

## What's already landed (foundational scaffolding — needs revision)

Phase 1 from the prior plan added some types that **don't match this revised model**. They need updating in Phase A:

- ✅ Added 4 new audit kinds to `EscalationAuditEvent.kind` — KEEP.
- ✅ Added icon+tone entries in `AuditThread.tsx` `KIND_META` — KEEP.
- 🔄 Added flat `EEvidenceGroundsForRefusal` interface — **REPLACE** with the tagged-union `GfrDecisionPayload` shape.
- 🔄 Added flat `GfrDecision` type — **REPLACE** with `GfrDecisionKind` ("None" | "Full" | "Partial").
- 🔄 Added old `GfrLegalGround` type — **REPLACE** with trimmed `RefusalReason` (Art. 12 only).
- ❌ Need to ADD `EEvidenceWorkflow` type + `eevidenceWorkflow` / `isInternational` fields on FormData.

If you want me to revert these before review, say the word; otherwise Phase A subsumes the rewrite.

---

## Open questions BEFORE Phase A starts

Most of the earlier "Conflicts" are now resolved against Appendix F + ETSI. Still need your sign-off on these scope-shaping items before code:

1. ~~**Workflow discriminator**~~ — **RESOLVED 2026-05-22.** Numeric `1 | 2 | ... | 8` with a `WORKFLOW_NAMES` constants table mapping each number to its Appendix F title.
2. ~~**Retrofit existing seeds**~~ — **RESOLVED 2026-05-21.** Full retrofit but **only for eEvidence cases** (i.e., cases whose `requestType === "eEvidence"`). Non-eEvidence request types are left alone for now; post-implementation we can evaluate whether workflow-discriminator concepts should extend to other request types. Action for Phase A: enumerate the existing eEvidence seeds and assign each an `eevidenceWorkflow` value (most will be `2` since they're international by default; verify each).
3. ~~**Target-identifier ID source**~~ — **RESOLVED 2026-05-21.** Field is [`AccountIdentifier.taskId`](C:/R/DARS_EEVIDENCE/src/types/caseTypes.ts#L609), format `LDID-xxxxxx | LIID-xxxxxx | LPID-xxxxxx`. Generated by [`genIdentifierTaskId()`](C:/R/DARS_EEVIDENCE/src/utils/mockCaseData.ts#L15-L18). Already cross-referenced by `NonDisclosureOrder.linkedTaskId` — same mapping pattern. Mock seeds will hardcode stable IDs (e.g. `LDID-100001`) instead of using the random generator so the GFR's `blockedTaskObjectIds` can reference them consistently.
4. ~~**SLA pause confirmation**~~ — **RESOLVED 2026-05-22.** Nuanced model:
   - Pre-decision (EA reviewing) → SLA ticks normally; separate `eaReviewWindowExpiresAt` operational chip alongside SLA.
   - `Full` decision → case SLA pauses entirely.
   - `Partial` decision → case SLA continues (block is scoped to LDTask IDs only).
   - `None` decision → no SLA change.
   - Day-10 lapse → no automatic SLA action; RS decides next steps.

   See revised Conflict 1 resolution for full table.
5. ~~**Form3Response trigger — in scope for v1?**~~ — **RESOLVED 2026-05-22.** In scope. Both triggers wired; **Form3Response-None-EaOverrulesSp** seed (LNS-2026-00265) + Retract-Form-3 flow included in Phases B/D.
6. ~~**`Form3Retracted` new audit event**~~ — **RESOLVED 2026-05-22.** Confirmed new `EscalationAuditEvent.kind` with its own icon/tone in AuditThread, distinct from `GfrCleared`.
7. **Anything from the docs I'm still misreading?** This rewrite is the fourth pass; flag if anything looks off before Phase A starts.

---
