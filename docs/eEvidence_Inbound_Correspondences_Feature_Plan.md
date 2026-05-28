# eEvidence — Inbound Correspondence Feature Plan

> **Grounding source:** [`docs/eEvidence_MVP_Spec.md`](./eEvidence_MVP_Spec.md) (verbatim from the SharePoint PM spec, retrieved 2026-05-07).
> **Scope:** Inventory every IA/EA inbound scenario against an existing DARS case, evaluate UX patterns for discover / review / respond, and resolve the IA/EA "duplicate case" concern.
> **Audience:** Response Specialist (LERS) is primary; Attorney is secondary. Ops Manager is notified, not actioned.
> **What this doc is NOT:** A solution design, a wireframe set, or final acceptance criteria. It is the feature scope baseline + UX-pattern evaluation that the user asked for. Every claim is referenced to a spec section.

---

## 1. What "inbound correspondence" actually covers

The spec uses the word **"correspondence"** in two distinct senses, and the user's question covers both:

1. **Strict-sense correspondence** — `POST /eevidence/correspondence` carrying a `DocumentObject` whose `DocumentType` is one of 9 IA-or-EA values (spec §5.3.1, §5.5.3). These are "messages on a case."
2. **Broader inbound traffic** — any of the **10 inbound endpoints** WISP can hit on Microsoft (spec §1.2 / Endpoint Table 5.1-1), several of which are field updates (e.g., `/newdeadline`, `/deliverystatus`), badge triggers (e.g., `/groundsforrefusal`), case-creating events (e.g., `/preservation`, `/subsequentproduction`), or instructions that require a Specialist-confirmed outbound response (e.g., `/withdraw`).

The user's framing — "documents, forms, or just field updates" — matches the broader sense. This plan treats all 10 endpoints as in-scope inbound scenarios, plus the DocumentType-driven branches inside `/correspondence` and `/groundsforrefusal`.

---

## 2. Inbound scenario inventory

### 2.1 Master matrix (endpoint × DocumentType → effect)

| # | Endpoint | DocumentType / Sub-case | Sender | Effect on Case | Spec ref |
|---|---|---|---|---|---|
| 1 | `/eevidence/production` | Form 1 (new EPOC) | IA | **Creates** new production case; SLA clock starts from EPOC timestamp | §1.2 #1; F.1; F.2 |
| 1a | `/eevidence/production` | Form 1 (revised after Form 3) | IA | **Creates new linked case**; original NonExecution case stays read-only | F.7.1 Branch C (L350–351) |
| 2 | `/eevidence/preservation` | Form 2 (EPOC-PR) | IA | **Creates** new preservation case; snapshot taken; 60-day clock starts | F.4 (L306) |
| 3 | `/eevidence/groundsforrefusal` | `FullGroundsForRefusal` | EA | Applies `GFR HOLD` badge; blocks all delivery; pauses SLA | §5.5.2; §5.8.2; F.6.1 Branch A |
| 4 | `/eevidence/groundsforrefusal` | `PartialGroundsForRefusal` | EA | Applies `PARTIAL GFR` badge; blocks refused categories only | §5.5.2; §5.8.2; F.6.1 Branch B |
| 5 | `/eevidence/groundsforrefusal` | `NoGroundsForRefusal` | EA | Clears `EA REVIEW WINDOW`; re-enables delivery | §5.5.2; §5.8.2; F.6.1 Branch C |
| 6 | `/eevidence/subsequentproduction` | Form 5 | IA | **Creates new linked case** matched via `LinkedEPOCPRTransactionId`; new 10-day SLA; SP delivers from snapshot | F.5 (L308); §5.12 (L99–100) |
| 6e | `/eevidence/subsequentproduction` | Form 5 with no matching EPOC-PR | IA | Error to Specialist; **must submit Form 3 NonExecution** | F.5; §5.12 (L100) |
| 7 | `/eevidence/preservationextension` | Form 6 | IA | **Updates existing EPOC-PR case** — extends retention clock; no new case | F.4 (L306) |
| 8 | `/eevidence/endpreservation` | (no DocumentType variant) | IA | **Updates existing EPOC-PR case** — preservation obligation ends; 45-day retention starts | F.4; §1.2 #6 |
| 9 | `/eevidence/newdeadline` | NewDeadlineObject | IA | **Field update**: SLA recalculated from new timestamp; no badge change | §5.11 (L89–98) |
| 10 | `/eevidence/withdraw` | Withdrawal instruction | IA | Sets `AuthorizationDesiredStatus = Cancelled`; requires manual Specialist confirm; triggers outbound `ConfirmationOfWithdrawal` and 45-day retention | §5.12 (L101–102); F.8 (L363) |
| 11 | `/eevidence/deliverystatus` | `Received` or `Error` (per task) | IA | Per-task delivery status update; no badge; if `Error` → Specialist re-deliver option | §5.15 (L108–111) |
| 12 | `/eevidence/correspondence` | `Maintain` | IA | No badge change; **enforces Attorney escalation**; Specialist + Attorney notified | §5.3.1 / §5.5.2 |
| 13 | `/eevidence/correspondence` | `ProceedingToCourt` | IA | Applies `COURT ESCALATION` badge; **enforces Attorney escalation** | §5.3.1; F.7.1 Branch B |
| 14 | `/eevidence/correspondence` | `RequestAdditionalInformation` | IA or EA | Action badge; no state change; if `ResponseRequiredBy` is set, surfaces deadline | §5.3.1; §5.5.3 (L52, L69) |
| 15 | `/eevidence/correspondence` | `ProvideAdditionalInformation` | IA or EA | Recorded on case; no badge; no state change | §5.3.1 |
| 16 | `/eevidence/correspondence` | `EnforcingAuthorityAgreesWithObjection` | EA | EA hold confirmed on basis of SP objection; existing badge retained | §5.3.1; F.6.1 Branch E |
| 17 | `/eevidence/correspondence` | `EnforcingAuthorityDisagreesWithObjection` | EA | SP-raised hold cleared; relevant badge removed | §5.3.1 |
| 18 | `/eevidence/correspondence` | `EnforcingAuthorityRecognizesOrder` | EA | Recorded on case; no badge change | §5.3.1 |
| 19 | `/eevidence/correspondence` | `EnforcingAuthorityDoesNotRecogniseOrder` | EA | Badge applied; **attorney case assignment strongly recommended** | §5.3.1 |
| 20 | `/eevidence/correspondence` | `EnforcementProceduresInitiated` | EA | Applies `ENFORCEMENT PROCEEDINGS` badge; **attorney required**; delivery blocked pending legal resolution | §5.3.1; §5.5.2; F.6.1 Branch F |

**Total: 20 distinct inbound scenarios** across 10 endpoints. Note that `/correspondence` alone carries 9 scenarios (entries 12–20).

### 2.2 Categorization by case-state effect

This is the cut the user asked for: "documents, forms, or just field updates."

**Category A — Creates a new case (with linkage to a pre-existing case where applicable)**
- Entries 1, 1a, 2, 6, 6e

**Category B — Updates fields on the existing case** (no badge change, no state change)
- Entries 7, 8, 9, 11, 15, 18

**Category C — Applies or clears a case-condition badge / banner** (visual + behavioral state)
- Entries 3, 4, 5, 13, 16, 17, 19, 20

**Category D — Sets terminal Authorization status; requires manual confirmation + outbound notification**
- Entry 10 (withdrawal)

**Category E — No case-data change, but requires Specialist/Attorney action via Correspondence**
- Entry 12 (Maintain), Entry 14 (RequestAdditionalInformation)

### 2.3 Inbounds that demand an outbound response

The user noted some inbounds require outbound. The spec is explicit; here is the mapping.

| Inbound | Required outbound (per spec) | Outbound type |
|---|---|---|
| 6 (Form 5, no matching EPOC-PR) | Form 3 NonExecution | NotificationObject + DocumentObject + Form3Information via `/nonexecution` |
| 10 (Withdrawal) | ConfirmationOfWithdrawal — **after manual Specialist confirm** | NotificationObject via `/confirmwithdrawal` |
| 12 (Maintain) | If compliance still impossible: second Form 3 — Attorney consultation strongly recommended | NotificationObject via `/nonexecution` |
| 13 (ProceedingToCourt) | Attorney `ProvideAdditionalInformation` correspondence | DocumentObject via `/correspondence` |
| 14 (RequestAdditionalInformation, IA→SP or EA→SP) | `ProvideAdditionalInformation` from SP | DocumentObject via `/correspondence` |
| 20 (EnforcementProceduresInitiated) | Attorney response (legal-track, type per case) | DocumentObject via `/correspondence` (typically) |

The **only** outbound DocumentTypes available to SP for `/correspondence` are `RequestAdditionalInformation` and `ProvideAdditionalInformation` (spec L70, §5.3.2). Everything else inbound that needs a "response" routes to either `/nonexecution`, `/confirmwithdrawal`, `/datapreserved`, or `/outcome` — there is no free-form outbound DocumentType.

### 2.4 Inbounds that gate Attorney involvement

Per §5.5.2 and the workflow branches, the following inbounds either **require** or **strongly recommend** assigning the case to an Attorney before any outbound action:

- **Required**: `Maintain`, `ProceedingToCourt`, `EnforcementProceduresInitiated`
- **Strongly recommended**: `EnforcingAuthorityDoesNotRecogniseOrder`, `FullGroundsForRefusal` (complex scenarios)
- **Plus the Form 3 attorney-gate reason codes** (§5.2.1): DeFactoImpossibility, ServiceNotCovered, ImmunitiesOrPrivileges, ConflictOfLaw — and **all enterprise cases** regardless of reason code.

---

## 3. The "duplicate case" question (preservation example)

The user's concern was: *"there is a case where the IA or EA may create a duplicate request/case because they wanted to send an additional inbound correspondence. For example, they created a preservation request, but then submitted a new request to extend the previous preservation request."*

The spec addresses this explicitly, and the answer is **not** "duplicate." It is **three distinct linkage patterns**, picked at the endpoint level by the IA. The Specialist must be able to tell them apart at a glance.

### 3.1 Pattern P1 — Field update on the same case (no new case)

**Scenarios:** 7 (`/preservationextension` — Form 6), 8 (`/endpreservation`), 9 (`/newdeadline`), 11 (`/deliverystatus`).

**Behavior:** The original case is mutated. No new case is created. No linkage UI required.

**Specialist-facing UX cue:** A banner / event card on the existing case header AND a chronological entry in that case's Correspondence + Audit Thread.

> **The user's example maps here.** A preservation extension is *not* a duplicate request. Form 6 explicitly extends the existing EPOC-PR case (per Workflow 4 / L306: *"Form 6 received: IA extends the preservation period. DARS extends the retention clock accordingly."*).

### 3.2 Pattern P2 — New case created, linked back to the originator (with reciprocal hyperlinks)

**Scenarios:** 6 (`/subsequentproduction` — Form 5), 1a (revised EPOC after Form 3 — F.7.1 Branch C).

**Behavior:**
- LENS-API matches the inbound to the originating case using `LinkedEPOCPRTransactionId` (Form 5) or via the audit linkage of the prior NonExecution case (revised EPOC).
- DARS creates a new case with a fresh 10-day SLA clock and applies reciprocal hyperlinks: original case → "View linked production case"; new case → "Linked to: [original case ID]."
- The originating EPOC-PR case gets a `SUBSEQUENT PRODUCTION ACTIVE` badge (per §5.5.1) which suppresses preservation end-date enforcement until the new production case reaches Resolved (per §5.12 L99).

**Specialist-facing UX cue:** Both cases must surface a "Linked Cases" panel. The new case must be discoverable from the Case Queue with a clear "Linked Form 5 / Subsequent Production" indicator, and the originating preservation case must show the new case in its Linked Cases panel + audit thread.

### 3.3 Pattern P3 — New case created, NO matching predecessor (error path)

**Scenario:** 6e (`/subsequentproduction` Form 5 received with no matching EPOC-PR).

**Behavior:** Per spec §5.12 L100 and F.5: *"A Form 5 with no matching EPOC-PR must surface an error to the Specialist and prevent progression."* The Specialist's only path forward is Form 3 NonExecution (`DataNotHeld` reason code is the most likely fit, but the spec does not pre-pick one).

**Specialist-facing UX cue:** An intake-error banner + a guided path into the Form 3 submission flow with the case pre-flagged as un-fulfillable.

### 3.4 Out-of-spec edge case to flag

The spec at §3.0 (Intake bullet) flags **nested documents** as under discussion (April 2nd, 2026 TCLI-EC coordination): *"documents attached to correspondences, or correspondences linked to other correspondences."* This is a fourth potential linkage pattern the UX must accommodate later but is **not** committed for MVP. We should design the inbox data model to admit nested attachments without breaking, but should not invest UX work on this until policy resolves.

---

## 4. UX pattern evaluation — Discover / Review / Respond

This section maps each spec requirement to a UI surface and notes where the existing DARS_eEvidence app already has a foothold vs. greenfield.

### 4.1 Discover

The Specialist must be alerted when an inbound lands and must be able to spot affected cases at a glance.

| Requirement | UX surface | Spec ref | Greenfield? |
|---|---|---|---|
| In-app notification on inbound to assigned Specialist + Ops Manager | Toast / notification center, plus email/Teams (out of scope for MVP unless policy mandates) | §5.3.1 (L59) | **Greenfield.** No notification system found in src for inbound WISP events. |
| Unread-correspondence indicator on Case Queue row | New badge in `CaseCardOperationalBadges.tsx` | §5.3.1 (L57); §5.13 | Greenfield (existing badges are NDO/priority-based). |
| Active hold indicator on Case Queue row | New badges: `EA REVIEW WINDOW`, `GFR HOLD`, `PARTIAL GFR`, `COURT ESCALATION`, `ENFORCEMENT PROCEEDINGS`, `PRESERVATION ACTIVE`, `SUBSEQUENT PRODUCTION ACTIVE`, `ATTORNEY REVIEW REQUIRED` | §5.4 / §5.5.1 / §5.13 | Greenfield. None exist in src today. |
| EPOC Form Type indicator on row | Distinguish Form 1 / Form 2 / Form 5 visually | §5.13 | Greenfield. |
| Live SLA countdown on row | Existing case header has SLA fields; queue card needs the live timer | §5.10; §5.13 | Partial — `dateDue` exists in `FormData`, but no live-countdown component. |
| Emergency case sort + broadcast (8H) | Top-of-queue sort + ICM-style broadcast | §5.7; F.3 | Greenfield (priority sort exists; broadcast does not). |
| Day-10 EA window expiry banner + audit | Scheduled job + green banner on case | §5.8.1; F.6.1 Branch D | Greenfield. |

### 4.2 Review

The Specialist must be able to read the inbound document, see what changed, and understand what's required.

| Requirement | UX surface | Spec ref | Greenfield? |
|---|---|---|---|
| Per-case Correspondence Inbox (chronological in/out, with sender, DocumentType, UTC timestamp, attachments link) | New tab/section on case detail page (alongside existing Case Overview / Legal & Compliance / Sender Authority Details / Identifier & Data Services / Non-Disclosure Workflow) | §5.3.1 (L51); §5.2.3 (L56–57) | Greenfield. Existing accordion stepper has no Correspondence section. |
| Document viewer for the DocumentObject | Render PDF (signed forms), text body (DocumentBody), and structured properties incl. `ResponseRequiredBy` | §5.3.1 (L52); §5.5.3 | Greenfield. `DocumentViewerPanel.tsx` exists for legal-demand documents — likely reusable but ETSI envelope handling is new. |
| Case Header banners for state-changing inbounds (red / amber / green) | Add to `CaseHeader.tsx` / `WorkflowStageBanner.tsx` per badge | §5.4; F.6.1; F.7.1 | Greenfield (banner pattern exists; mappings do not). |
| Linked Cases panel (Pattern P2) — preservation ↔ subsequent production, NonExecution ↔ revised EPOC | New panel on case detail; bidirectional hyperlinks | §5.12 (L99–100); F.5; F.7.1 Branch C | Greenfield. `relatedCaseNumbers` exists as a flat string field in `FormData` — insufficient for first-class linkage. |
| Audit Thread (read-only, immutable log of every event) | New tab; surfaces every WISP message + DARS action | §5.16 (L112–114) | Greenfield. `NotesTimeline.tsx` exists for case notes — not the same thing. |
| EPOC Authorization Level indicator (advisory data-category scope) | New display element on case detail | §5.5 (L73) | Greenfield. |
| GFR panel showing EA name, GFR receipt date, reason summary, expiry countdown | New panel on case detail when GFR badge active | F.6 (L310) | Greenfield. |
| Disabled (not hidden) publish/deliver controls with explanatory tooltip during holds | Modify existing CaseActions / CaseHeaderActions | §5.8 L80; F.2 | Greenfield wiring; existing buttons exist. |

### 4.3 Respond

The Specialist must be able to take the right outbound action without composing protocol XML.

| Requirement | UX surface | Spec ref | Greenfield? |
|---|---|---|---|
| "Send Correspondence" action with limited DocumentType options (`RequestAdditionalInformation` / `ProvideAdditionalInformation`) | Button on case detail; modal with recipient (IA/EA), DocumentType, body, optional PDF attachment, confirmation prompt | §5.3.2 (L54–55); §5.2.3 (L58); spec L70 | Greenfield. |
| Form 3 NonExecution submission flow | Multi-step wizard: select reason code(s) → affected tasks/categories → narrative → ConflictOfLaw fields if applicable → optional RequestForClarification → QES/AES digital signature → confirmation modal → DARS auto-constructs NotificationObject + DocumentObject + Form3Information | §5.2 (L44–47); §5.2.1 reason-code table; §5.6 ConflictOfLaw fields | Greenfield. |
| Attorney-gate guard on Form 3 (DeFactoImpossibility, ServiceNotCovered, ImmunitiesOrPrivileges, ConflictOfLaw, all Enterprise) | Pre-submit check that requires assigned Attorney approval | §5.2.1 (L47); F.7.1 (L345) | Greenfield. |
| "Confirm Withdrawal" action (manual; never automatic) | Button surfaced on case when `AuthorizationDesiredStatus = Cancelled`; auto-cancels all tasks; submits ConfirmationOfWithdrawal | §5.12 / Withdrawal section L101–102; F.8 | Partial — `authorizationDesiredStatus` already in `FormData`. The acknowledgement primitive exists for UK COPO; eEvidence outbound wiring is new. |
| Manual "Initiate Delivery" after EA hold lifts (Day-10 expiry; NoGroundsForRefusal) | Re-enable `Publish/Deliver` controls, plus explicit Specialist action — auto-publish is stretch | §5.8.1 (L83); F.6.1 Branch D | Greenfield wiring. |
| Per-task re-delivery for Failed deliveries | Per-task action in delivery panel | §5.15 (L110) | Greenfield. |
| "Assign to Attorney" via existing Case Queue | Use existing assignment, gated by ATTORNEY REVIEW REQUIRED badge | §5.4; §5.5.1; Appendix C | Partial — assignment exists; the badge-driven gate does not. |
| Cancel-delivery action while push is in flight | New action; spec calls out a minutes-not-days time window and a possible signal/correspondence to IA | §3.0 Publish/Delivery bullets ("New Ask: Cancel delivery action button within DARS") | Greenfield. Active open item per inline spec comments. |

### 4.4 Recommended UX-pattern summary

Based on the matrix above, the inbound-correspondence feature reduces to **five UI surfaces**, each of which the existing app does not yet have:

1. **Correspondence Inbox tab** on case detail (the user's primary concept) — chronological list of inbound + outbound DocumentObjects, with read/unread state per row, document viewer, and a "Send Correspondence" action constrained to the two valid outbound DocumentTypes.
2. **Case-condition badges + banners** on the case header and queue row — drives Discover. The full set is in §5.4 / §5.5.1 / §5.5.2 (the doc-type routing table).
3. **Linked Cases panel** — handles Pattern P2 (Form 5, revised EPOC) and Pattern P1's preservation-extension call-out. Bidirectional, first-class navigable.
4. **Form 3 NonExecution wizard** — the only protocol-formal outbound that handles the "I cannot comply" inbound responses. Drives Respond for ~6 of 20 scenarios.
5. **Audit Thread tab** — read-only ledger of every WISP message + DARS action, satisfying §5.16 and underwriting all the "Specialist must be informed" requirements.

The "Confirm Withdrawal" action and the per-task delivery re-try slot into existing case-action surfaces; they don't justify their own panels.

---

## 5. Open questions surfaced by this analysis

These are decisions the spec leaves open or that the user's framing surfaced. They block detailed design, not exploratory design.

1. **`Maintain` correspondence — what's the Specialist's expected next step?** Spec §5.3.1 says "no badge change; Specialist + Attorney notified" and §5.5.2 says it "enforces Attorney escalation." But F.7.1 Branch A says "DARS → Active. Specialist notified. If original reason persists: second Form 3 may be required." Need confirmation: does Maintain unconditionally trigger an `ATTORNEY REVIEW REQUIRED` badge, or only when the Specialist intends to file a second Form 3?
2. **`EnforcingAuthorityAgreesWithObjection` / `Disagrees` / `RecognizesOrder` / `DoesNotRecogniseOrder`** — the §5.5.2 routing table marks the badge column as `?` for four of these. The spec body has free-text behaviors but no committed badge name. Need product to decide.
3. **`ResponseRequiredBy` deadline rendering** — spec L52 and L69 say `RequestAdditionalInformation` *may* carry a `ResponseRequiredBy`. The UX should treat this as an SLA-adjacent timer (separate from the EPOC SLA), but spec doesn't define a badge for it. Recommend an "Action required by [date]" inline indicator on the inbox entry, not a global badge.
4. **Nested documents (correspondence-of-correspondence, attachments-of-correspondence)** — spec §3.0 lists this as under discussion (TCLI-EC coordination, raised 2026-04-02). Design the inbox data model to admit nesting; do not commit a UI pattern until policy resolves.
5. **Correspondence after case closure** — spec §5.3 (L48) requires correspondences to remain receivable/sendable after closure. Existing closure flows in DARS_eEvidence may not preserve case workspaces post-resolution. Need confirmation that read/write to closed cases is possible.
6. **Cancel-in-flight delivery** — §3.0 Publish/Delivery bullets call this a "New Ask" but per Faisal Younas' comment (2026-04-01) it requires further engineering/ops alignment. Excluded from initial UX evaluation; revisit when policy resolves.
7. **Form 5 with no matching EPOC-PR — preferred Form 3 reason code** — spec says "Specialist submits Form 3 NonExecution" but doesn't pre-pick a reason. UX should propose a default (likely `DataNotHeld`) but allow override.
8. **8H emergency broadcast** — §5.7 says broadcast to on-call rotation; F.3 says broadcast to *all* DARS users. The two are not contradictory but design needs to know which is the primary channel.

---

## 6. Implementation footholds in the existing app

What the Specialist's case-detail page already has that we can build on (audited 2026-05-07):

- **Accordion-stepper layout** (`CaseSummaryAndTabs.tsx`) — Correspondence Inbox and Audit Thread can slot in as new sections without disrupting Triage / Review / Resolution flow.
- **`CaseHeader.tsx` + `WorkflowStageBanner.tsx`** — banner and badge surface area exists; need new banner mappings + badge components.
- **`CaseCardOperationalBadges.tsx`** — has the priority/crime/identifier-count pattern; eEvidence badges follow the same component shape.
- **`AuthorizationDesiredStatus` already exists in `FormData`** — withdrawal acknowledgement primitive is partially in place from UK COPO.
- **`relatedCaseNumbers: string`** — exists but is a flat free-text field; not adequate for Pattern P2 linking. Recommend a structured `linkedCases: LinkedCase[]` model.
- **`DocumentViewerPanel.tsx`** — likely reusable for ETSI DocumentObject rendering.
- **No conflicting "correspondence" data model in src** — clean greenfield.

What's **not** there and is fully greenfield:

- Any `/eevidence/*` endpoint handler in src (they're API-tier; UI-tier never owned them).
- Any of the eEvidence case-condition badges.
- Any inbound-event notification primitive (toast on case-event, broadcast, on-call dispatch).
- Any structured Linked Cases UI.
- An immutable Audit Thread.
- The Form 3 NonExecution wizard.
- The Send Correspondence modal.
- The Day-10 / 5-day expiry scheduled-job hooks (these are server-side, but UI must render their banners + audit entries).

---

## 7. Suggested next step

Before we commit to wireframes, recommend one focused workshop to resolve the open questions in §5 above (especially #1, #2, #3, #5). After that, the natural implementation order is:

1. **Data model + types** — `Correspondence`, `DocumentObject`, `LinkedCase`, `CaseCondition` (badge), `AuditEvent`. Wire these into `caseTypes.ts` and a small set of mock cases (extend `mockCaseDataLENS202500250.ts` patterns).
2. **Correspondence Inbox** (read-only first) — chronological list + document viewer. This single surface unblocks 13 of the 20 inbound scenarios for the Discover and Review pillars.
3. **Case-condition badges + banners** — wire the §5.5.2 DocumentType-to-badge routing table.
4. **Send Correspondence modal** — outbound Request/Provide AdditionalInformation. Closes the Respond loop for the "info exchange" subset.
5. **Linked Cases panel** — handles Pattern P2 / P3 navigation. Required before Form 5 / revised-EPOC scenarios are usable.
6. **Form 3 NonExecution wizard** — the largest single piece. Required for the no-matching-EPOC-PR error path and for Maintain follow-ups.
7. **Audit Thread** — read-only ledger; consumes events from steps 2–6.
8. **Manual-confirm Withdrawal + Per-task re-delivery** — small additions on existing surfaces.

Per-step, each merge should add only the components that step needs. Don't pre-build the full eEvidence model in step 1.
