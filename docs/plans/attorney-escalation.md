# Attorney Escalation — Specialist → Attorney Review Loop

**Project:** DARS_EEVIDENCE (`c:\R\DARS_EEVIDENCE`)
**Scope:** End-to-end attorney escalation flow. The Specialist (TS / RS)
escalates a case to a role or a specific attorney; the attorney reviews
the case via four bounded actions (Release, Approve with Conditions,
Request More Information, Block). Every action audits to the case thread,
toggles the **ATTORNEY REVIEW REQUIRED** badge, and gates downstream
delivery / Form 3 signing when the case is blocked.
**Status:** Ready to implement (9 open questions resolved)
**Created:** 2026-05-13

## Context

What already exists in the codebase that this feature must coordinate with:

- **`caseEscalated: boolean` + `escalationNotes: string`** on `FormData`
  ([src/types/caseTypes.ts:573-574](src/types/caseTypes.ts#L573-L574)).
  A generic "this case has been escalated" flag — currently used for
  LE-side escalations via the Agent's `escalatedToLE` field, with limited
  UI. We will preserve this for non-attorney escalations and add a new
  parallel `attorneyEscalation` object for attorney-specific state.
- **`assignedToLawyer?: boolean`** on `CaseQueueItem`
  ([src/components/case-queue/case-queue-types.ts](src/components/case-queue/case-queue-types.ts)).
  Seeded the Attorney Dashboard's filter rule. We will derive this flag
  from `attorneyEscalation.status` going forward so the Dashboard and the
  escalation state stay in lock-step.
- **Attorney Dashboard** at
  [src/components/app-shell/AttorneyDashboard.tsx](src/components/app-shell/AttorneyDashboard.tsx).
  Filters MOCK_CASES by `assignedToLawyer || escalatedToLE || isThreatToLife`.
  The Dashboard becomes the attorney's queue — clicking a case opens it
  with the attorney-action UI visible.
- **`deliveryBlocked` state** on
  [src/components/CollectionTracker.tsx:263](src/components/CollectionTracker.tsx#L263).
  Currently driven by the cancellation workflow. The attorney **Block**
  action hooks into the same gate so the case's delivery jobs and form
  signing are uniformly disabled.
- **Notes timeline** at
  [src/components/NotesTimeline.tsx](src/components/NotesTimeline.tsx) +
  `FormData.notes: CaseNote[]`. The Audit Thread for escalation actions
  can be implemented as a typed extension to `CaseNote` (e.g.
  `note.kind === "attorneyAction"`).

## Goals

1. Let any Specialist (TS or RS) escalate a case to:
   - a **role** ("Legal Counsel", "Senior Counsel", "Privacy Officer", etc.)
   - and optionally a **specific attorney** by name (from a mock directory)
   - with a **reason note** explaining what they need attorney input on.
2. Show an **ATTORNEY REVIEW REQUIRED** badge on the case header until the
   escalation is closed by an attorney action.
3. Surface the case on the **Attorney Dashboard** (already wired by
   `assignedToLawyer`, just needs the new flag to drive it).
4. When the case is open, expose **exactly four attorney actions** in a
   dedicated review panel — Release / Approve with Conditions / Request
   More Information / Block.
5. Every action posts an **audit entry** to the case's notes timeline.
6. **Block** disables delivery + form signing; **Approve with Conditions**
   leaves a conditions banner visible to the Specialist on reassignment;
   **Request More Information** ping-pongs the case back to the Specialist
   with an attorney-authored note.

## Data model

### New types — [src/types/caseTypes.ts](src/types/caseTypes.ts)

```ts
/** DARS roles a Specialist can escalate a case to. Only the `Attorney`
 *  role surfaces the full 4-action review panel (Release / Approve /
 *  Approve-Conditional / Request More Info / Block); the other roles
 *  get a simpler Acknowledge / Reassign panel — see "Role differentiation"
 *  below. */
export type EscalationRole =
  | "Attorney"
  | "LensLeadOrManager"
  | "ResponseSpecialist"
  | "TriageSpecialist";

/** Current state of an attorney escalation. */
export type AttorneyEscalationStatus =
  | "Pending"               // Specialist escalated; attorney hasn't acted yet
  | "ApprovedForDelivery"   // Attorney cleared the case; no constraints
  | "ApprovedWithConditions" // Cleared with caveats; conditionsNote required
  | "InformationRequested"  // Attorney bounced back for more info
  | "Blocked";              // Delivery + Form 3 frozen; blockingNote required

/** A single attorney action recorded against an escalation. The full
 *  list is the audit trail surfaced in the notes timeline. */
export interface AttorneyAction {
  id: string;
  action:
    | "Release"
    | "ApproveWithConditions"
    | "RequestMoreInformation"
    | "Block";
  /** Free-text note authored by the attorney for this action. Required
   *  for Approve-with-Conditions / Request-Info / Block; optional for
   *  Release. */
  note?: string;
  attorneyName: string;
  performedAt: Date;
}

/** Escalation state. Lives on FormData. Optional — only present once
 *  the Specialist has actually escalated. Despite the name `AttorneyEscalation`
 *  the target role may be any of the DARS personas; we keep the type name
 *  attorney-flavoured because the 4-action review panel is the dominant
 *  flow this state machine drives. */
export interface AttorneyEscalation {
  /** Role the Specialist targeted. */
  role: EscalationRole;
  /** Specific assignee id (lookup against ESCALATION_DIRECTORY). When
   *  undefined, any user holding the role can pick up the case. */
  assignedAttorneyId?: string;
  /** The Specialist's reason for escalating — shown to the attorney
   *  prominently in the review panel. */
  reason: string;
  escalatedAt: Date;
  escalatedBy: string;
  /** Computed from the most recent action. Drives the badge state. */
  status: AttorneyEscalationStatus;
  /** Required when status === "ApprovedWithConditions". Conditions
   *  banner copy shown to the Specialist after reassignment. */
  conditionsNote?: string;
  /** Required when status === "InformationRequested". Inline note from
   *  the attorney to the Specialist. */
  informationRequest?: string;
  /** Required when status === "Blocked". Reason rendered in the block
   *  banner + Ops Manager notification. */
  blockingNote?: string;
  /** Append-only history of attorney actions. */
  actions: AttorneyAction[];
}

interface FormData {
  // …
  attorneyEscalation?: AttorneyEscalation;
}
```

### Constants — [src/constants/caseConstants.ts](src/constants/caseConstants.ts)

```ts
export const ESCALATION_ROLES: Array<{ value: EscalationRole; label: string }> = [
  { value: "Attorney",            label: "Attorney" },
  { value: "LensLeadOrManager",   label: "LENS Lead / Manager" },
  { value: "ResponseSpecialist",  label: "Response Specialist" },
  { value: "TriageSpecialist",    label: "Triage Specialist" },
];

/** Mock directory of escalation targets across all four DARS roles.
 *  Real DARS would query an org-chart service. */
export interface EscalationDirectoryEntry {
  id: string;
  name: string;
  role: EscalationRole;
  email: string;
}

export const ESCALATION_DIRECTORY: EscalationDirectoryEntry[] = [
  // Attorneys
  { id: "ATT-001", name: "Sarah Mitchell",   role: "Attorney",            email: "s.mitchell@legal.contoso.com" },
  { id: "ATT-002", name: "Thomas Anderson",  role: "Attorney",            email: "t.anderson@legal.contoso.com" },
  // LENS Lead / Manager
  { id: "LEAD-01", name: "Priya Iyer",       role: "LensLeadOrManager",   email: "p.iyer@contoso.com" },
  // Response Specialists
  { id: "RS-001",  name: "Nicole Garcia",    role: "ResponseSpecialist",  email: "n.garcia@contoso.com" },
  { id: "RS-002",  name: "Marcus Kohl",      role: "ResponseSpecialist",  email: "m.kohl@contoso.com" },
  // Triage Specialists
  { id: "TS-001",  name: "Elena Ruiz",       role: "TriageSpecialist",    email: "e.ruiz@contoso.com" },
];
```

### Audit trail = dedicated Audit Thread (new component)

Per the decision below, the escalation audit log lives in its **own**
surface — a new **AuditThread** component on the case — rather than
folding into the existing NotesTimeline. This keeps free-text case notes
distinct from typed escalation events.

```ts
/** A single auditable event in an escalation's lifecycle. The
 *  EscalateToAttorneyDialog appends an "Escalated" event; each attorney
 *  action appends one of "Released" / "ApprovedWithConditions" /
 *  "InformationRequested" / "Blocked"; the Specialist's "Resume" appends
 *  a "Resumed" event. All entries are read-only once written. */
export interface EscalationAuditEvent {
  id: string;
  kind:
    | "Escalated"
    | "Released"
    | "ApprovedWithConditions"
    | "InformationRequested"
    | "Blocked"
    | "Resumed"
    | "Acknowledged"     // for non-attorney role panels
    | "ReassignedToSpecialist"
    | "LeadNotified";    // system event when status flips to Blocked
  actor: string;         // performer's display name (CURRENT_USER for prototype)
  actorRole?: EscalationRole;
  performedAt: Date;
  note?: string;         // free-text note attached to the event
}

// Stored on FormData parallel to (not inside) attorneyEscalation so the
// audit survives if the live escalation block is later reset.
interface FormData {
  // …
  escalationAuditEvents?: EscalationAuditEvent[];
}
```

The new `<AuditThread />` component (`src/components/escalation/AuditThread.tsx`)
renders these events as a chronological list with kind-aware icons +
tinting. Mounted at the bottom of the case body — below the
Operational Case Review section — so it's always reachable but doesn't
compete with the day-to-day case form.

## UX flows

### Flow 1 — Specialist escalates

**Entry point**: a new **"Escalate to Attorney"** action on the
WorkflowStageBanner ([src/components/case-header/WorkflowStageBanner.tsx](src/components/case-header/WorkflowStageBanner.tsx))
right of the existing Save button. Available at any workflow stage. When
the case already has an `attorneyEscalation` in a non-terminal state, the
button text changes to **"Update Escalation"** and opens the same dialog
pre-filled.

**Dialog** (new component `src/components/escalation/EscalateToAttorneyDialog.tsx`):

```
┌─ Escalate to Attorney ─────────────────────────────────────┐
│ Role *                                                     │
│ [ Legal Counsel ▾ ]                                        │
│                                                            │
│ Specific attorney (optional)                               │
│ [ Any Legal Counsel ▾ ]                                    │
│   • Sarah Mitchell — Legal Counsel                         │
│   • Thomas Anderson — Senior Counsel (won't show — role)   │
│                                                            │
│ Reason for escalation *                                    │
│ [ Multiline textarea …                                  ]  │
│                                                            │
│  ┌────────────────────────────────────────────────┐        │
│  │ ATTORNEY REVIEW REQUIRED badge will appear on  │        │
│  │ this case until an attorney closes the         │        │
│  │ escalation.                                    │        │
│  └────────────────────────────────────────────────┘        │
│                                                            │
│                              [ Cancel ]  [ Escalate ]      │
└────────────────────────────────────────────────────────────┘
```

- Role dropdown is required; specific-attorney dropdown filters by role
  and accepts "Any" as the default.
- Reason textarea is required (≥ 10 chars).
- Submitting sets `attorneyEscalation = { role, assignedAttorneyId?, reason, escalatedAt: now, escalatedBy: CURRENT_USER, status: "Pending", actions: [] }`.
- Toast: *"Case escalated to [attorney/role]"*.

### Flow 2 — Attorney reviews the case

When `attorneyEscalation` is present and its status is in
`["Pending", "InformationRequested"]`, the case header carries a
**"ATTORNEY REVIEW REQUIRED"** badge (red pill on the WorkflowStageBanner).

Right below the StickyCaseHeader, render a new **AttorneyReviewPanel**
component anchored full-width at the top of the case body. Visible only
when the active user has an attorney-like profile (for the prototype:
always visible to the current user — the UX gating is just the
escalation status, not a separate role check).

```
┌─ Attorney Review Required ─────────────────────────────────┐
│ Escalated by Nicole Garcia (TS) · 2 hours ago              │
│ Targeted: Legal Counsel  ·  Sarah Mitchell                 │
│                                                            │
│ Reason for escalation:                                     │
│ "Cross-border eEvidence with conflicting Spanish + German  │
│  jurisdictional claims. Need privilege review before       │
│  sending Form 3."                                          │
│                                                            │
│  Take action ───────────────────────────────────────       │
│  [ ✓ Release Hold / Approve for Delivery ]                 │
│  [ ⓘ Approve with Conditions … ]                          │
│  [ ⊙ Request More Information … ]                          │
│  [ ✕ Block Delivery / Form 3 … ]                           │
└────────────────────────────────────────────────────────────┘
```

Each action button opens its own confirmation step where required:

| Action | Confirmation | Required input |
|---|---|---|
| **Release / Approve for Delivery** | Simple confirmation dialog | Optional note |
| **Approve with Conditions** | Dialog with required `conditionsNote` textarea | Conditions note text |
| **Request More Information** | Dialog with required `informationRequest` textarea | Request note text |
| **Block** | Dialog with required `blockingNote` textarea + acknowledgement checkbox ("I confirm this will halt delivery") | Blocking note text |

#### State machine

```
                            ┌─────────────────┐
                            │   (no state)    │
                            └────────┬────────┘
                                     │ Specialist escalates
                                     ▼
                            ┌─────────────────┐
                            │     Pending     │
                            └────────┬────────┘
                                     │ Attorney actions:
            ┌────────────────────────┼────────────────────────┬────────────────────┐
            ▼                        ▼                        ▼                    ▼
  ┌──────────────────┐    ┌─────────────────────┐    ┌──────────────────┐    ┌─────────┐
  │ApprovedForDeliv. │    │ApprovedWithCondit.  │    │InformationReqstd │    │ Blocked │
  │ (badge cleared)  │    │ (banner visible)    │    │ (badge stays)    │    │(blocked)│
  └──────────────────┘    └─────────────────────┘    └────────┬─────────┘    └────┬────┘
                                                              │ Specialist replies          │
                                                              │ Specialist re-escalates     │
                                                              ▼                              ▼
                                                          (back to Pending)          (back to Pending
                                                                                       via "Update
                                                                                       Escalation")
```

Approved states (`ApprovedForDelivery`, `ApprovedWithConditions`) are
**terminal** for the badge — the badge is cleared. Specialist can still
re-escalate later by clicking "Escalate to Attorney" again; that creates
a fresh entry on the `actions[]` audit list.

### Flow 3 — Approve with Conditions banner

Once the attorney approves with conditions, a banner persists on the case
form (above the accordion sections) until the Specialist explicitly
acknowledges:

```
┌─ Approved with Conditions ─────────────────────────────────┐
│ Sarah Mitchell (Legal Counsel) — 10:42 AM                  │
│                                                            │
│ "Approved for delivery on the consumer identifier only.   │
│  The enterprise mailbox (ceo@kontoso-de.example) is       │
│  excluded pending privilege review by outside counsel."   │
│                                                            │
│                                    [ Acknowledge ]         │
└────────────────────────────────────────────────────────────┘
```

Clicking Acknowledge dismisses the banner (sets `conditionsAcknowledgedAt`)
but keeps the conditions note in the audit log.

### Flow 4 — Block effect (advisory only)

**Block is advisory, NOT enforced.** The attorney's "Block" action does
not disable any UI controls — the Specialist remains able to deliver,
send correspondence, or sign Form 3 if they choose. What Block does:

- WorkflowStageBanner shows a red **AWAITING ATTORNEY REVIEW BEFORE
  DELIVERY** chip.
- A persistent warning **banner** sits above the case-body accordion:
  *"⚠ The attorney has blocked further delivery / correspondence /
  Form 3 transmission pending review. Proceeding without resolution is
  at the Specialist's discretion and will be logged."*
- A `LeadNotified` audit event fires: a `toast.warning` *"LENS Lead
  notified — case marked Blocked"* + a system entry appended to the
  Audit Thread. Real DARS would integrate with the existing
  notification service; the prototype's toast + audit entry stand in.
- **Form 3 submission stops the SLA timer.** When the Specialist signs
  + sends EPOC Form 3 — Non-Execution Response while the case is
  Blocked (or at any time), the case's SLA countdown halts (`dueDate`
  moves to a `"paused"` sentinel). Recorded as a `SLAStopped` system
  event on the Audit Thread. The case stays open; the SLA clock just
  no longer counts down against the Specialist.
- All other gates (delivery, correspondence, Resolve Case, signing)
  stay enabled. No tooltips disabled-state UI.

Why advisory and not enforced: the Specialist may need to send
correspondence (e.g. ask the IA a clarifying question, send the
attorney's requested info) while the case is technically Blocked. The
chip + banner + audit trail provide the social pressure without making
the UI a dead end.

### Flow 5 — Request More Information

- Attorney writes a note for the Specialist.
- Status flips to `InformationRequested`.
- Badge stays as **ATTORNEY REVIEW REQUIRED** (so the case stays on the
  Attorney Dashboard) but the Specialist's queue ALSO shows the case
  with a new mini-badge: **Info requested**.
- The Specialist can reply by adding a regular case note + clicking
  "Resume Escalation" which flips status back to `Pending`. (The same
  WorkflowStageBanner button shows "Resume Escalation" when status is
  `InformationRequested`.)

### Flow 6 — Role differentiation (Attorney vs. peer-review roles)

The Escalate dialog accepts any of the four DARS roles. The review-panel
behavior differs based on which role the case was escalated to:

| Targeted role | Review panel | Actions |
|---|---|---|
| **Attorney** | `AttorneyReviewPanel` (the 4-action panel described above) | Release / Approve with Conditions / Request More Info / Block |
| **LENS Lead/Manager**, **Response Specialist**, **Triage Specialist** | `PeerReviewPanel` (simpler) | **Acknowledge** (clears chip; logs `Acknowledged` event with optional note) · **Reassign to Specialist** (returns case ownership with a note; logs `ReassignedToSpecialist`) |

The peer-review panel renders the same Specialist-reason context block
at the top, so the reviewer sees why the case landed in their lap. The
WorkflowStageBanner chip on a peer-review escalation reads **REVIEW
REQUESTED** (slate-blue) rather than the red **ATTORNEY REVIEW REQUIRED**
to signal the lighter weight of the action.

Both panels share:
- The Specialist reason + targeted role/assignee header.
- The Audit Thread surface (every action lands there).
- The Controller Notification Strip when the case is Enterprise (so
  even a non-attorney peer reviewer sees the secrecy posture).

`PeerReviewPanel` lives at `src/components/escalation/PeerReviewPanel.tsx`;
the dialog branching is driven by `formData.attorneyEscalation?.role`.

## Enterprise case detection → mandatory attorney escalation

A case is **Enterprise** (and therefore mandatory-attorney-review)
whenever **either** of these is true:

1. **IA Form 1 flag** — the Issuing Authority's EPOC envelope flagged
   that they contacted Microsoft as the **service provider / processor**
   rather than the data controller. This maps to the existing
   `eevidenceEnterpriseRequest` block we built earlier — specifically
   when `addressedToController === true` AND **either**
   `addressedToProcessorControllerUnidentified === true` OR
   `addressedToProcessorDetrimentalToInvestigation === true` (i.e. the
   IA reached the "processor route" branch of the decision tree).
2. **Check-accounts result** — the prototype's "check accounts" step on
   any identifier returned `checkAccounts.accountType === "Enterprise"`.

Either signal flips a derived `isEnterpriseCase(formData)` selector to
`true`. Defined once in
`src/utils/escalationHelpers.ts` (new file):

```ts
export function isEnterpriseCase(formData: FormData): boolean {
  // Signal 1: IA-side processor route (Form 1 / EPOC envelope)
  const e = formData.eevidenceEnterpriseRequest;
  const iaProcessorRoute =
    e?.addressedToController === true &&
    (e.addressedToProcessorControllerUnidentified === true ||
      e.addressedToProcessorDetrimentalToInvestigation === true);

  // Signal 2: Identifier-level account check
  const anyEnterpriseIdentifier = (formData.identifiers ?? []).some(
    (id) => id.checkAccounts?.accountType === "Enterprise",
  );

  return iaProcessorRoute || anyEnterpriseIdentifier;
}
```

### Surface in the case form

When `isEnterpriseCase(formData)` is true and `formData.attorneyEscalation`
is **not yet set**, the case form shows a soft but prominent banner above
the accordion list:

```
┌─ Enterprise Case — Attorney Escalation Required ──────────┐
│ This case is classified as Enterprise because:            │
│  • The Issuing Authority addressed Microsoft as the       │
│    processor (Form 1 — UnderlyingConditions).             │
│  • Target identifier "ceo@kontoso-de.example" was         │
│    detected as an Enterprise account.                     │
│                                                            │
│ Escalate this case for attorney review before proceeding. │
│                                                            │
│                              [ Escalate to Attorney ]      │
└────────────────────────────────────────────────────────────┘
```

- Reasons rendered as a bulleted list — only the signals that fired show
  up.
- The CTA opens the existing **EscalateToAttorneyDialog** with the role
  pre-selected to **Legal Counsel** (the safest default for Enterprise
  cases).
- Banner is dismissable only by completing the escalation — there's no
  "ignore" affordance, since the escalation is mandatory by policy.
- Once `attorneyEscalation` is set, the Enterprise banner hides and the
  normal **ATTORNEY REVIEW REQUIRED** chip + AttorneyReviewPanel take
  over.

New file: `src/components/escalation/EnterpriseEscalationBanner.tsx`.

### Controller-disclosure / NDO awareness in the AttorneyReviewPanel

When the case is Enterprise AND the attorney is reviewing it, the
**AttorneyReviewPanel** renders an extra context strip above the four
action buttons so the attorney sees the IA's controller-notification
intent at a glance:

```
┌─ Controller Notification Status ───────────────────────────┐
│ ⚠ Microsoft shall NOT inform the controller (NDO-like)    │
│                                                            │
│ Per the Issuing Authority's Form 1 — UnderlyingConditions:│
│   ProcessorShallNotInformController = true                │
│                                                            │
│ Disclosing this production to the enterprise customer is  │
│ prohibited. Treat as an NDO-equivalent constraint.        │
└────────────────────────────────────────────────────────────┘
```

The label + tint changes based on the IA's flags from
`eevidenceEnterpriseRequest`:

| `processorShallInformController` | `processorShallNotInformController` | Banner |
|---|---|---|
| `true` | `false` / undefined | **Green** — *"Microsoft shall inform the controller — no secrecy restriction."* |
| `false` / undefined | `true` | **Amber** — *"Microsoft shall NOT inform the controller (NDO-like). Controller disclosure prohibited; treat as secrecy constraint."* |
| `false` / undefined | `false` / undefined | **Slate** — *"No controller-notification flag set on this case. Attorney to confirm intent with IA before proceeding."* |
| `true` | `true` | **Red** — *"Conflicting notification flags on this case — IA Form 1 indicates both Inform AND NotInform. Clarify with IA before proceeding."* (defensive — the IA UX enforces mutual exclusion but we surface drift if data carries it.) |

This strip is read-only context for the attorney. It does NOT block
actions on its own — the attorney makes the call. The strip simply
ensures the secrecy constraint is in the attorney's field of view
before they click Release / Approve / Request / Block.

### Files affected by Enterprise detection

(in addition to the attorney-escalation files listed below)

- **New** `src/utils/escalationHelpers.ts` — exports `isEnterpriseCase(formData)` + a small `getEnterpriseReasons(formData)` helper returning the bullet-list copy.
- **New** `src/components/escalation/EnterpriseEscalationBanner.tsx` — the mandatory-escalation banner.
- **New** `src/components/escalation/ControllerNotificationStrip.tsx` — the NDO-awareness strip rendered inside the AttorneyReviewPanel.
- [src/components/escalation/AttorneyReviewPanel.tsx](src/components/escalation/AttorneyReviewPanel.tsx) (also new, per the main plan) — mounts `ControllerNotificationStrip` above the action buttons when `isEnterpriseCase(formData) === true`.
- [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx) — mount `EnterpriseEscalationBanner` above the accordion list when `isEnterpriseCase(formData) && !formData.attorneyEscalation`.

## Correspondence: "Request Additional Information" outbound template

When the attorney action is **Request More Information**, the Specialist's
next step is typically to ask the Issuing or Enforcing Authority for the
clarification the attorney flagged. To make that fast and consistent, ship
a new outbound correspondence template **"Request Additional Information"**
that's filterable to eEvidence cases.

### Where it lives

- A new template in
  [src/config/formTemplates.ts](src/config/formTemplates.ts) alongside
  EPOC Form 3.
- Filter: `requestTypes: ["eEvidence"]` so the picker hides it on
  non-eEvidence cases. No jurisdiction filter — it works for any eEvidence
  case (EU + EEA + future).
- Surfaces in:
  - the **Forms & Letters** library (existing template-picker dialog), and
  - the **Correspondence Hub → Compose tab** template picker (same
    `TemplatePickerDialog` already wired for EPOC Form 3).

### Required fields

| Field | Type | Autofill source | Notes |
|---|---|---|---|
| **Recipient** | Radio (`IssuingAuthority` / `EnforcingAuthority`) | `IssuingAuthority` default when the case has an IA; falls back to `EnforcingAuthority` when only the EA is set | Drives the salutation + the `to` address on the outbound correspondence record. |
| **Body** | Textarea, pre-filled (see below) | Boilerplate scaffold with token replacements | Required. Specialist edits the placeholders before sending. |
| **Attachments** | File upload list | — | Optional. Reuses the existing `FreeTextComposer` attachment UI (drag-drop + click-to-upload). |
| **Signature** | (filled at sign time) | `assigneeName` + `__msLegalRep.designatedEstablishment` | Same Phase 1 signing flow as EPOC Form 3 — typed name + attestation. |

### Body — pre-filled boilerplate scaffold

The Body textarea opens **pre-populated** with the Microsoft-standard
"Request Additional Information" letter scaffold. Tokens in square
brackets resolve via the existing form-engine autofill (same
`defaultValueFrom` mechanism EPOC Form 3 uses). Anything left as a square-
bracket placeholder is required free-text the Specialist must replace
before "Continue to Sign" becomes enabled.

```
Dear [Issuing Authority],

Further to your eEvidence Production Order [EPOC-DE-FFM-2026-0150]
transmitted on [2026-04-22], Microsoft Ireland Operations Limited
requires additional information before proceeding with production of
the requested data.

Specifically, we ask that you clarify the following:

[describe the missing or ambiguous information]

We would be grateful for your response by [response deadline]. Until
then, the order remains under review and no data has been produced.

Yours sincerely,
[Nicole Garcia]
Microsoft Response Specialist
eevidence@microsoft.com
```

#### Token replacements

| Placeholder | Resolves to | Autofill source |
|---|---|---|
| `[Issuing Authority]` / `[Enforcing Authority]` | Authority's name from the eEvidence block | `eevidenceIssuingAuthority.name` / `eevidenceEnforcingAuthority.name` |
| `[EPOC-DE-FFM-2026-0150]` | First IA approval reference number | `eevidenceIssuingAuthority.approvalReferenceNumbers.0` |
| `[2026-04-22]` | Date of Transmission | `dateOfTransmission` |
| `[Microsoft Ireland Operations Limited]` | Designated establishment | `__msLegalRep.designatedEstablishment` |
| `[Nicole Garcia]` | Signing Specialist | `assigneeName` |
| `[eevidence@microsoft.com]` | MS contact email | `__msLegalRep.email` |
| `[describe the missing or ambiguous information]` | **No autofill — Specialist replaces.** | (free text) |
| `[response deadline]` | **No autofill — Specialist replaces.** | (free text) |

The form engine's existing autofill (`resolveAutofill` in
[src/components/forms-library/formEngine.ts](src/components/forms-library/formEngine.ts))
substitutes any token whose source resolves to a non-empty value. The
remaining `[…]` placeholders stay as visible cues; a `validateInstance`
pass at sign time will surface "this letter still has unresolved
placeholders" as a soft warning.

### Linkage to attorney escalation

When `attorneyEscalation.status === "InformationRequested"`, the
Correspondence Hub's Compose tab surfaces the **"Request Additional
Information"** template above the others with an *"Recommended — Attorney
requested more info"* tag. This is a UX nudge only — the template stays
available even without an active escalation.

## Bidirectional Request / Provide Additional Information loop

The "Request Additional Information" template is one half of a
two-direction conversation pattern. The full loop has four document
flows the prototype must recognise + render:

| Direction | Document type | Who sends | Who renders |
|---|---|---|---|
| Outbound | **Request Additional Information** | Microsoft → IA / EA | Composed via the new template (above). Recorded on `OutboundCorrespondenceItem` with `kind: "RequestAdditionalInformation"`. |
| Inbound  | **Provide Additional Information** | IA / EA → Microsoft (reply to our request) | Linked to the outbound item via `inReplyToId`; renders in InboxList with a green "Reply received" tag. Drives `transitionOutbound(... "Responded")` when the inbound is linked. |
| Inbound  | **Request Additional Information** | IA / EA → Microsoft (asking us for clarification) | Renders in InboxList with an action chip *"Reply with Provide Additional Information"* that opens the new outbound template, pre-set to `kind: "ProvideAdditionalInformation"` and `inReplyTo` carrying the inbound id. |
| Outbound | **Provide Additional Information** | Microsoft → IA / EA (reply to the inbound request above) | A second new outbound template, identical Recipient + Body + Attachments shape, with its own scaffold for replying to an IA / EA query. |

### Type extensions — [src/types/correspondence.ts](src/types/correspondence.ts)

Extend the `InboundKind` enum to recognise these as first-class document
types so the inbox can route + tag them, and so the outbound link via
`inReplyToId` carries unambiguous semantics:

```ts
export type InboundKind =
  | "Text"
  | "Attachment"
  | "StructuredForm"
  | "Acknowledgement"
  | "WithdrawalAmendment"
  | "RequestAdditionalInformation"   // IA / EA asking MS to clarify
  | "ProvideAdditionalInformation";  // IA / EA responding to our request
```

The outbound side currently doesn't carry a `kind` enum — outbound items
are typed by whether they're a signed form, free-text letter, or
attachment-only. Add a parallel `OutboundDocumentKind` so the outbox can
filter / label these:

```ts
export type OutboundDocumentKind =
  | "FreeText"
  | "SignedForm"
  | "RequestAdditionalInformation"
  | "ProvideAdditionalInformation";

interface OutboundCorrespondenceItem {
  // existing fields …
  documentKind?: OutboundDocumentKind;
}
```

When the Specialist sends one of the new templates, the
`OutboundCorrespondenceItem` is stamped with the matching
`documentKind`. Outbox detail surfaces the kind as a small chip next to
the subject line so the audit trail is scannable.

### Second new outbound template — "Provide Additional Information"

A mirror of the "Request Additional Information" template, but with a
scaffold worded as a reply rather than a request. Same field shape
(Recipient + Body + Attachments + Signature) so the UI is consistent.

Boilerplate scaffold:

```
Dear [Issuing Authority],

We refer to your communication of [date of inbound RequestAdditionalInformation]
in connection with eEvidence Production Order [EPOC-DE-FFM-2026-0150].

Please find below the additional information you requested:

[describe the response]

[Attach any supporting documents using the Attachments field below.]

Should you require any further clarification, please contact us at
[eevidence@microsoft.com].

Yours sincerely,
[Nicole Garcia]
Microsoft Response Specialist
```

Token replacements work the same way as the "Request Additional
Information" template. Same `flagUnresolvedPlaceholders` validation
guards the `[…]` placeholders at sign time.

When this template is opened **as a reply** (from an inbound
*RequestAdditionalInformation* item), the form pre-fills the recipient
from the inbound's `counterparty` and carries the `inReplyTo` link on
the outbound record so the audit shows the conversation thread.

### Inbox rendering rules

[src/components/correspondence/InboxList.tsx](src/components/correspondence/InboxList.tsx)
+ [src/components/correspondence/InboxItemDetail.tsx](src/components/correspondence/InboxItemDetail.tsx)
get two new kind-aware behaviours:

| Inbound `kind` | List badge | Detail-pane action |
|---|---|---|
| `RequestAdditionalInformation` | Amber pill "Authority requested info" | **Reply** button → opens *Provide Additional Information* template prefilled with `inReplyTo` |
| `ProvideAdditionalInformation` | Green pill "Authority replied to your request" | (no special action) — Standard read + acknowledge |

The badge styles reuse the existing kind-badge slot already wired for
`Acknowledgement` / `StructuredForm` etc.

### Mock data

Two new seeded inbound items on **LENS-2026-00150** so reviewers can
exercise both halves of the loop without composing anything:

1. A `ProvideAdditionalInformation` inbound that's the reply to an
   earlier outbound `RequestAdditionalInformation` (already seeded
   correspondence will need a matching outbound stub added to make the
   link).
2. A standalone `RequestAdditionalInformation` inbound where the IA is
   asking us a question; clicking the "Reply" button on the detail
   pane opens the *Provide Additional Information* template with the
   `inReplyTo` link populated.

### Files affected by the bidirectional loop

(in addition to the other lists in this plan)

- [src/types/correspondence.ts](src/types/correspondence.ts) — extend `InboundKind`; add `OutboundDocumentKind` + `documentKind` field on `OutboundCorrespondenceItem`.
- [src/config/formTemplates.ts](src/config/formTemplates.ts) — second new template **REQUEST_ADDITIONAL_INFORMATION** (already listed) + **PROVIDE_ADDITIONAL_INFORMATION** (new). Both export from `FORM_TEMPLATES`.
- [src/components/correspondence/InboxList.tsx](src/components/correspondence/InboxList.tsx) + [InboxItemDetail.tsx](src/components/correspondence/InboxItemDetail.tsx) — kind-aware badge + Reply button for the two new inbound kinds.
- [src/components/correspondence/OutboxList.tsx](src/components/correspondence/OutboxList.tsx) + [OutboxItemDetail.tsx](src/components/correspondence/OutboxItemDetail.tsx) — render `documentKind` chip on the row + detail.
- [src/data/mockCorrespondenceSeeds.ts](src/data/mockCorrespondenceSeeds.ts) — seed the two new items on LENS-2026-00150 + the matching outbound stub for the reply linkage.

### Mock data

Seed the EU eEvidence demo case (**LENS-2026-00150**) with the right
fields so the template autofill demos cleanly:

- `eevidenceIssuingAuthority.name`, `approvalReferenceNumbers.0`, and
  `dateOfTransmission` are already populated from earlier work — the
  scaffold's tokens render correctly without further mock changes.

### Files affected by this template

(in addition to the attorney-escalation files listed below)

- [src/config/formTemplates.ts](src/config/formTemplates.ts) — define
  the new `REQUEST_ADDITIONAL_INFORMATION` template with the four
  sections (Recipient / Body / Attachments / Signature). Add it to the
  exported `FORM_TEMPLATES` array.
- [src/components/forms-library/formEngine.ts](src/components/forms-library/formEngine.ts)
  — extend `validateInstance` to flag unresolved `[…]` placeholders in
  `type: "textarea"` fields when the template carries a new
  `flagUnresolvedPlaceholders?: boolean` config.
- [src/components/correspondence/ComposePanel.tsx](src/components/correspondence/ComposePanel.tsx)
  — when an attorney escalation is in `InformationRequested` state, sort
  the recommended template to the top of the picker with the
  "Recommended" tag.

## Files modified / created

1. [src/types/caseTypes.ts](src/types/caseTypes.ts) — new types: `EscalationRole`, `AttorneyEscalationStatus`, `AttorneyAction`, `AttorneyEscalation`, `EscalationAuditEvent`. New fields on `FormData`: `attorneyEscalation?`, `escalationAuditEvents?`. **No** changes to `CaseNote` — audit log is a separate surface.
2. [src/constants/caseConstants.ts](src/constants/caseConstants.ts) — `ESCALATION_ROLES`, `ESCALATION_DIRECTORY` (covers all four DARS personas, not just attorneys).
3. **New** `src/components/escalation/EscalateToAttorneyDialog.tsx` — role + optional assignee + required reason. Used by "Escalate" / "Update Escalation" / "Resume Escalation" flows. Renamed conceptually to *EscalateToReviewerDialog* in implementation since it covers non-attorney targets too; the file name + button copy can keep "attorney" framing if that's clearer to RS / TS, given attorneys are the dominant case.
4. **New** `src/components/escalation/AttorneyReviewPanel.tsx` — 4-action panel. Mounts when `attorneyEscalation.role === "Attorney"`.
5. **New** `src/components/escalation/PeerReviewPanel.tsx` — 2-action panel (Acknowledge / Reassign). Mounts when role is `LensLeadOrManager` / `ResponseSpecialist` / `TriageSpecialist`.
6. **New** `src/components/escalation/AttorneyActionDialog.tsx` — generic confirmation dialog. Used by Approve-Conditional / Request-Info / Block. Takes a config object (label + required-note-prompt + optional acknowledgement-text).
7. **New** `src/components/escalation/ConditionsBanner.tsx` — banner above the accordion when status === `ApprovedWithConditions` and not yet acknowledged.
8. **New** `src/components/escalation/AuditThread.tsx` — dedicated audit log surface. Renders `formData.escalationAuditEvents[]` chronologically with kind-aware icons + tinting. Mounted below the Operational Case Review section on the case body.
9. [src/components/case-header/WorkflowStageBanner.tsx](src/components/case-header/WorkflowStageBanner.tsx) — chips: **ATTORNEY REVIEW REQUIRED** (red, when role = Attorney + status non-terminal), **REVIEW REQUESTED** (slate-blue, when role ≠ Attorney + status non-terminal), **AWAITING ATTORNEY REVIEW BEFORE DELIVERY** (red warning, when status = Blocked), **INFO REQUESTED** (amber, when status = InformationRequested). New button next to Save: "Escalate" / "Update Escalation" / "Resume Escalation" based on current status.
10. [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx) — handlers: `handleEscalate`, `handleAttorneyAction(actionType, note)`, `handlePeerAction(actionType, note)`, `handleAcknowledgeConditions`, `handleResumeEscalation`. Each handler appends the matching `EscalationAuditEvent`. Wire `AttorneyReviewPanel` / `PeerReviewPanel` / `ConditionsBanner` / `AuditThread` into the case-body shell.
11. **New** `src/utils/slaTimer.ts` — helper `pauseSlaTimerOnFormThreeSubmission(formData)` that flips `dueDate` to a paused sentinel + appends an `SLAStopped` audit event. Called from the existing Form 3 send flow.
12. [src/components/case-queue/case-queue-types.ts](src/components/case-queue/case-queue-types.ts) — derive `assignedToLawyer` from `attorneyEscalation?.role === "Attorney"` going forward.
13. [src/components/app-shell/AttorneyDashboard.tsx](src/components/app-shell/AttorneyDashboard.tsx) — sort cases with status === "Pending" or "InformationRequested" to the top; show the role/assignee target + escalation age on each card.
14. **Mock seed** — pre-populate `attorneyEscalation` + a couple of `escalationAuditEvents[]` on **LENS-2026-00150** with status === "Pending", targeted to Sarah Mitchell (Attorney). Gives reviewers a working scenario to click into.

**Files NOT touched** (intentionally, per the advisory-only Block decision):
- [src/components/CollectionTracker.tsx](src/components/CollectionTracker.tsx) — Block does NOT force `deliveryBlocked`. Delivery actions remain enabled when status === "Blocked"; the warning chip + banner are the only signals.
- [src/components/forms-library/FormFillerDialog.tsx](src/components/forms-library/FormFillerDialog.tsx) — "Continue to Sign" stays enabled.
- [src/components/case-resolution/ResolveCaseDialog.tsx](src/components/case-resolution/ResolveCaseDialog.tsx) — Resolve stays enabled.
- [src/components/NotesTimeline.tsx](src/components/NotesTimeline.tsx) — unchanged; escalation events live in the new AuditThread, not the notes timeline.
- [src/types/caseTypes.ts → CaseNote](src/types/caseTypes.ts) — no `kind` discriminator added.

## Verification

1. Open LENS-2026-00150 → header shows **ATTORNEY REVIEW REQUIRED** chip; case body shows the AttorneyReviewPanel at top with reason + four actions. Audit Thread (below Operational Case Review) shows the seeded `Escalated` event.
2. Click **Release Hold** → confirmation → `Released` event appears in the Audit Thread; chip disappears; case proceeds. Notes timeline is unchanged (escalation events stay out of it).
3. Click **Approve with Conditions** → dialog requires a conditions note → on confirm the chip clears, a **Conditions banner** appears above the accordion → click Acknowledge → banner clears; `ApprovedWithConditions` + `Acknowledged` events both appear in the Audit Thread.
4. Click **Request More Information** → dialog with required textarea → status becomes `InformationRequested`; chip changes to amber **INFO REQUESTED** variant; Specialist's case header gains a "Resume Escalation" button; `InformationRequested` event in the Audit Thread.
5. Click **Block** → dialog requires note + acknowledgement checkbox → on confirm: chip becomes red **AWAITING ATTORNEY REVIEW BEFORE DELIVERY**; warning banner appears above the accordion; toast fires *"LENS Lead notified — case marked Blocked"*; `Blocked` + `LeadNotified` events appear in the Audit Thread. **Delivery, correspondence, Form 3 signing, and Resolve Case remain enabled** — Block is advisory only.
6. With status = Blocked, send EPOC Form 3 → Specialist completes the Phase 1 signing flow normally → on submit, an `SLAStopped` event is appended to the Audit Thread and the case's `dueDate` flips to the paused sentinel (SLA countdown halts).
7. Open a case without escalation (e.g. LENS-2026-00170) → no chip, no panel, no banner. Header shows "Escalate" button. Audit Thread is empty / hidden.
8. Re-escalate after Approve with Conditions → status flips to Pending with a new entry in `actions[]` AND a new `Escalated` event appended to `escalationAuditEvents[]` (append behavior — prior events preserved).
9. Escalate to **LENS Lead/Manager** instead of Attorney → `PeerReviewPanel` mounts (not AttorneyReviewPanel); chip reads slate-blue **REVIEW REQUESTED**. Two actions visible: **Acknowledge** and **Reassign to Specialist**. Acknowledge clears the chip + logs an `Acknowledged` event. Reassign opens a note dialog and logs `ReassignedToSpecialist`.
10. Attorney Dashboard surfaces escalated cases first; card shows "Pending review · Attorney · Sarah Mitchell · 2h ago" (or the matching peer-review variant).
11. `npx vite build` clean.

## Confirmed decisions

1. **Role list — DARS personas.** Four targets: **Attorney**, **LENS Lead/Manager**, **Response Specialist**, **Triage Specialist**. Only the Attorney role surfaces the 4-action review panel; the other three get the simpler Acknowledge / Reassign panel.
2. **Required fields on Escalate** — role required + reason required (≥ 10 chars). Assignee is optional ("Any [role]" default).
3. **Action gating** — any user with the case open can click the action buttons for the prototype; no role-gate. Real DARS will role-gate later.
4. **Block scope — advisory only.** No programmatic gates. Status = Blocked surfaces a red chip + warning banner + toast + Audit Thread `LeadNotified` event, but the Specialist can still deliver, send correspondence, sign Form 3, or resolve the case. **Form 3 submission stops the SLA timer** (`SLAStopped` audit event + `dueDate` flips to paused sentinel).
5. **Role differentiation** — Attorney → `AttorneyReviewPanel` (4 actions). LENS Lead/Manager + Response Specialist + Triage Specialist → `PeerReviewPanel` (Acknowledge + Reassign). Chip text varies: red **ATTORNEY REVIEW REQUIRED** vs. slate-blue **REVIEW REQUESTED**.
6. **Block notification** — toast + Audit Thread system event tagged "LENS Lead notified" (matches the DARS role names).
7. **Audit log — dedicated AuditThread component.** New surface below Operational Case Review on the case body. Backed by `FormData.escalationAuditEvents: EscalationAuditEvent[]`. Existing `NotesTimeline` is NOT extended — free-text notes and escalation events live in separate surfaces.
8. **Re-escalation** — append. New `Escalated` event tacks onto the existing `escalationAuditEvents[]` array; the live `attorneyEscalation.actions[]` array also appends. Prior actions / notes are never lost.
9. **Legacy `escalatedToInternal`** — leave untouched. The new `attorneyEscalation.assignedAttorneyId` is fully independent; legacy callers continue reading the old field unchanged.

## Risks

- **State sprawl on FormData.** Adding a sizeable `attorneyEscalation` block + a parallel `escalationAuditEvents[]` array on an already-large FormData shape. Mitigation: contain all escalation logic to the new `src/components/escalation/` folder; document the relationship to the legacy `caseEscalated` + `escalatedToInternal` fields; don't touch those legacy fields in the prototype.
- **Specialist re-entry path after "Request More Information".** The case is back on the Specialist's queue but the chip is still surfacing — the Specialist might think they can't proceed when they actually need to *reply*. Mitigation: amber **INFO REQUESTED** chip variant + a prominent "Resume Escalation" button next to Save. The Audit Thread shows the attorney's note inline. Worth user-testing before shipping.
- **Block is advisory — Specialist can override.** By design, the Specialist can deliver / send correspondence / sign Form 3 even when the case is Blocked. Mitigation: the warning banner copy is explicit ("Proceeding without resolution is at the Specialist's discretion and will be logged."); every override action lands in the Audit Thread as a normal event. If real DARS wants enforcement later, a single `isCaseAttorneyBlocked(formData)` selector can be wired into the relevant mutators without re-plumbing the data model.
- **"Approve with Conditions" conditions are advisory.** The conditions banner doesn't enforce anything programmatically — it's visible text only. If a condition like "consumer identifier only" gets ignored, no system check catches it. Acceptable for prototype; flag for follow-up if needed.
- **Mock-only escalation directory.** The directory is a static 6-row table for the prototype. When real DARS integration lands, IDs will change and the dropdown will fetch live data. Mitigation: keep `assignedAttorneyId` as an opaque string with an optional fallback display name in the UI; don't bake constants beyond the dialog dropdown.
- **SLA timer pause semantics.** Form 3 submission halts the SLA clock by flipping `dueDate` to a paused sentinel. Reviving the case (re-resolving, re-opening) requires re-deciding what the new `dueDate` should be. Mitigation: the existing Re-open flow already touches `dueDate`; verify it correctly resets the paused-sentinel back to a live date.
- **Separate Audit Thread doubles the surface RS/TS need to scan.** Free-text notes live in NotesTimeline; typed escalation events live in AuditThread. Mitigation: AuditThread mounts below the Operational Case Review so it's always reachable; the Specialist's primary view (top of the case) only shows the chips + panels — they don't have to scroll to the bottom unless they're investigating history.

## Functional gaps — discovered post-implementation

Captured 2026-05-19 after end-to-end demo with RS reviewers. Each gap
is a follow-up unit of work; none block the current escalation flow,
but each represents missing context the user needs to triage
escalated cases efficiently.

### Gap 1 — Case list views don't show escalation type

**What the RS sees today:**
The Case Queue's **"Escalated"** quick filter
([CaseQueue.tsx:172-297](src/components/CaseQueue.tsx#L172)) hides
non-escalated cases, but the three surfaced rows look identical to any
other case. The Cards view's `CaseCardOperationalBadges`, the Detailed
list's columns, and the Preview pane's signal block don't carry any
"why is this here" context — the user can't tell which role was
escalated to, who the assignee is, or what the escalation status is
without opening each case.

**What the RS expects:**
Each escalated case in the list view should display a badge / chip
with `"<Role> Escalated"` (literal copy from the RS feedback —
e.g. **"Attorney Escalated"**, **"LENS Lead/Manager Escalated"**,
**"Response Specialist Escalated"**, **"Triage Specialist Escalated"**).
Where space allows, also surface the assignee name + status tone
(amber `InformationRequested` / red `Blocked` / red `Pending`).

**Where the fix lands:**
- [src/components/case-queue/CaseCardOperationalBadges.tsx](src/components/case-queue/CaseCardOperationalBadges.tsx)
  — add a new badge alongside the existing operational chips. Derive
  from the registry via `getEscalationSummaryForCase(caseId)` (already
  exists in [escalationHelpers.ts](src/utils/escalationHelpers.ts)).
  Same tone logic as the Attorney Dashboard's
  `EscalationSummaryStrip`.
- [src/components/case-queue/CaseQueueListRow.tsx](src/components/case-queue/CaseQueueListRow.tsx)
  — render the badge inside an existing column (likely **Stage** or
  add a new optional **Escalation** column toggled by the Escalated
  quick filter). Respect the responsive collapse rules (drop the
  column below 1024px, fold into a tooltip).
- [src/components/case-queue/CaseQueuePreviewPane.tsx](src/components/case-queue/CaseQueuePreviewPane.tsx)
  — surface the same chip alongside the existing operational badges
  in the right-side pane.

**Implementation sketch:**

```tsx
// In CaseCardOperationalBadges + CaseQueueListRow + CaseQueuePreviewPane
const summary = getEscalationSummaryForCase(caseItem.caseId);
if (summary) {
  const roleLabel = ESCALATION_ROLES.find(r => r.value === summary.role)?.label ?? summary.role;
  return (
    <Badge tone={tone(summary.status)}>
      <Scale className="w-3 h-3" />
      {roleLabel} Escalated
    </Badge>
  );
}
```

**Open copy decisions:**
- `"<Role> Escalated"` vs. `"Escalated to <Role>"` — current direction
  is the user's literal phrasing; the latter reads more naturally in
  English. RS team to decide.
- Whether to show the assignee name on the badge (e.g. `"Attorney
  Escalated · Sarah Mitchell"`) — risk of overflow in dense columns.
- Whether terminal statuses (`ApprovedForDelivery`,
  `ApprovedWithConditions`) get a different badge style (grey
  "Cleared") or hide the badge entirely. Today they hide via
  `escalationStatusWeight` returning 0/1.

### Gap 2 — Attorney Dashboard lacks quick filters + search bar

**What the attorney sees today:**
The Attorney Dashboard
([AttorneyDashboard.tsx](src/components/app-shell/AttorneyDashboard.tsx))
shows a flat sorted list of cases requiring attorney attention.
There's no way to slice the list to "Unassigned" (cases targeted to
"Any Attorney" with no specific assignee), to filter by jurisdiction
/ country / priority, or to search by case ID. The view toggle
(Cards / Detailed list) is the only control.

**What the attorney expects:**
Mirror the **filter toolbar** + **quick filter tabs** + **search**
from the All Cases page so attorneys can navigate their queue the
same way the RS / TS navigate the main queue. The most critical use
case is **"Unassigned"** — escalations created with role `Attorney`
but `assignedAttorneyId === undefined` (open to any attorney).

**What to clone, what to drop:**

| Control | All Cases page | Attorney Dashboard | Notes |
|---|---|---|---|
| **Search bar** (caseId / agency / identifiers) | ✓ | ✓ — clone | Same field, same debounce. |
| **Quick filter tabs** | All / My Cases / Escalated / Threat to Life | All / **Unassigned** / My Assignments / Threat to Life | Drop the Escalated tab — the dashboard IS the escalated view. |
| **Case status filter** | All / New / In Progress / Disclosed / etc. | Active statuses only | Hide terminal statuses by default. |
| **Country filter** | ✓ | ✓ — clone | Same component. |
| **Request type filter** | ✓ | ✓ — clone | Same component. |
| **SLA tier filter** | ✓ | ✓ — clone | Same component. |
| **Sort dropdown** | Newest / Priority / Due date | Newest / Priority / Escalation age | Add "Escalation age" — most recent first. |
| **View toggle** | Cards / List / Preview | Cards / List (current) | Preview pane stays gated to the queue. |

**Where the fix lands:**
- The All Cases filter toolbar is currently composed of
  [`CaseQueueFilters.tsx`](src/components/CaseQueue.tsx) (inline; may
  need extraction). The cleanest path is to extract the toolbar into
  a shared component:
  - **New** `src/components/case-queue/CaseQueueFilters.tsx` — props
    let the consumer enable / disable specific filters + customise
    the quick-filter tab set.
  - [CaseQueue.tsx](src/components/CaseQueue.tsx) — refactor to
    consume the shared toolbar.
  - [AttorneyDashboard.tsx](src/components/app-shell/AttorneyDashboard.tsx)
    — mount the shared toolbar with the attorney-specific tab set.

**New quick filter: "Unassigned"**
- Defined as: `attorneyEscalation.role === "Attorney"` AND
  `attorneyEscalation.assignedAttorneyId === undefined` AND status is
  non-terminal.
- Helper to add to
  [escalationHelpers.ts](src/utils/escalationHelpers.ts):

```ts
export function isUnassignedAttorneyEscalation(caseId: string): boolean {
  const esc = getCaseFormDataById(caseId)?.attorneyEscalation;
  if (!esc) return false;
  if (esc.role !== "Attorney") return false;
  if (esc.assignedAttorneyId) return false;
  return ["Pending", "InformationRequested", "Blocked"].includes(esc.status);
}
```

**Persistence:**
The dashboard's view mode already persists per surface under
`dars.attorneyDashboard.viewMode`. Quick filter selection should
follow the same pattern: `dars.attorneyDashboard.quickFilter`.

### Gap 3 — Correspondence requiring attorney review isn't surfaced on the dashboard

**What the attorney sees today:**
The dashboard's `EscalationSummaryStrip` shows status / role /
assignee / age, but no signal that **correspondence** on the case
needs attorney review. Two flavours of "needs review":

1. **Outbound items the RS held under the Attorney Escalation
   toggle** (`transmission.status === "Draft"` +
   `pendingAttorneyReview === true`). Already tracked via
   `heldForAttorney` in
   [`PerCaseCorrespondenceCounts`](src/hooks/useCorrespondenceNotifications.ts#L51).
   Currently surfaces only on the Card view's `CaseCardHeader` as a
   red "Attorney review required" pill — NOT on the Attorney
   Dashboard cards.
2. **Inbound items on an active attorney escalation.** No equivalent
   flag today. An inbound `RequestAdditionalInformation` from the
   authority on a case where `attorneyEscalation.status` is
   non-terminal effectively needs the attorney's eyes on it before
   the RS can sensibly reply.

**What the attorney expects:**
A signal on each dashboard card (Cards + Detailed list) showing
**"N outbound + M inbound awaiting your review"** so they can
prioritise their queue. Clicking the signal jumps directly to the
case's Correspondence panel.

**Where the fix lands:**

- Extend
  [`PerCaseCorrespondenceCounts`](src/hooks/useCorrespondenceNotifications.ts)
  with a new field — provisionally `inboundAwaitingAttorney` —
  computed from "inbound items on a case whose
  `attorneyEscalation.status` is non-terminal AND that landed after
  the most recent attorney action / escalation event." (The exact
  freshness rule needs RS validation.)
- Add a small **"Attorney review queue"** chip to the Attorney
  Dashboard's `EscalationSummaryStrip`
  ([AttorneyDashboard.tsx](src/components/app-shell/AttorneyDashboard.tsx))
  that renders:
  - `N outbound · M inbound` when both > 0
  - `N outbound awaiting review` when only outbound > 0
  - `M inbound awaiting review` when only inbound > 0
  - Hidden when both are 0
- Cards view: surface the same chip in
  [CaseCardOperationalBadges.tsx](src/components/case-queue/CaseCardOperationalBadges.tsx)
  so attorneys hitting the case from the queue (not the dashboard)
  also see the signal.

**Implementation sketch:**

```ts
// useCorrespondenceNotifications.ts — extend the per-case loop
const inboundAwaitingAttorney = (() => {
  const escStatus = getCaseFormDataById(caseId)?.attorneyEscalation?.status;
  if (!escStatus || ["ApprovedForDelivery", "ApprovedWithConditions"].includes(escStatus)) {
    return 0;
  }
  return inboundItems(caseItems).filter((inb) => !inb.readAt).length;
})();
```

**Open questions:**
- **Freshness rule.** Today the rough heuristic is "unread inbound on
  active escalation." Should it be tighter — e.g. "inbound that
  landed after the last attorney action"? Tighter means fewer false
  positives but risks missing context the attorney needs.
- **Inbound vs outbound priority.** Held outbounds are existing
  drafts the RS authored. Inbound items are new authority traffic.
  The attorney may want to triage one before the other; the chip
  copy should reflect what the attorney sees first.
- **Cross-link to the case form.** Clicking the chip on the dashboard
  card should open the case with the Correspondence panel
  pre-expanded. Today the dashboard's `onOpenCase` just opens the
  case at the default tab.

### Gap 4 — Attorney Dashboard preview pane not enabled

**What the attorney sees today:**
The Attorney Dashboard's view toggle exposes Cards and Detailed list,
but the **Preview pane** option is gated off
([AttorneyDashboard.tsx:117-121](src/components/app-shell/AttorneyDashboard.tsx#L117))
with `previewDisabled` on the `CaseQueueViewToggle`. Clicking on a
dashboard card is the only way to inspect a case — and that navigates
away from the dashboard into the full case form, losing the queue
context.

**What the attorney expects:**
The same scan-and-decide experience the RS gets in the Case Queue's
Preview pane: pick a case in the left list, the right pane fills with
a case summary + the pending action items the attorney needs to act
on, without leaving the dashboard. From the preview the attorney can
either act in-place (one-click Release / Acknowledge a peer review)
or click "Open case" to go to the full form.

**What the preview pane should contain (attorney variant):**

| Section | Content | Source |
|---|---|---|
| **Header** | Case ID + priority chip + stage badge + escalation chip + "Open case" primary button | Existing `CaseQueuePreviewPane` header + `currentEscalationChip(formData)` |
| **Escalation snapshot** | Specialist's reason, escalated-by + age, targeted role + assignee, status chip | `attorneyEscalation` + `getEscalationSummaryForCase(caseId)` |
| **Pending action items** | Numbered list of the attorney's outstanding decisions on this case (see breakdown below) | Derived (see implementation sketch) |
| **Case snapshot** | Country / jurisdiction / request type / due date / identifier count / services | Existing `CaseQueuePreviewPane` snapshot |
| **Correspondence summary** | Counts of unread inbound + held outbound + inbound RFI awaiting reply, with click-to-open links | `useCorrespondenceNotifications().perCase` |
| **Actions** | One-click Release / Approve with Conditions / Request More Info / Block — same buttons as the in-case `AttorneyReviewPanel`, just in the pane | Reuse `AttorneyReviewPanel` with `orientation="vertical"` |

**The "Pending action items" list — derivation:**

A computed list of bullet-point actions the attorney still needs to
take on this case. The order matters: most urgent first.

```ts
function pendingAttorneyActionsForCase(caseId: string): PendingAction[] {
  const formData = getCaseFormDataById(caseId);
  if (!formData) return [];
  const actions: PendingAction[] = [];
  const esc = formData.attorneyEscalation;

  // 1. Outstanding decision on the escalation itself.
  if (esc?.status === "Pending") {
    actions.push({
      kind: "decision",
      label: "Decide: Release / Approve with Conditions / Request More Info / Block",
      severity: "critical",
    });
  }
  if (esc?.status === "InformationRequested") {
    actions.push({
      kind: "decision",
      label: "Waiting on Specialist to reply — no attorney action needed yet",
      severity: "info",
    });
  }
  if (esc?.status === "Blocked") {
    actions.push({
      kind: "decision",
      label: "Re-evaluate Block — the Specialist may have addressed your concerns",
      severity: "warning",
    });
  }

  // 2. Held outbounds — drafts pending attorney release.
  const held = heldForAttorneyOutbounds(formData.correspondence);
  if (held.length > 0) {
    actions.push({
      kind: "correspondence-out",
      label: `${held.length} outbound message${held.length === 1 ? "" : "s"} held for your release`,
      severity: "warning",
    });
  }

  // 3. Inbound items on the active escalation that haven't been triaged.
  const inboundAwaiting = inboundAwaitingAttorneyReview(formData);
  if (inboundAwaiting.length > 0) {
    actions.push({
      kind: "correspondence-in",
      label: `${inboundAwaiting.length} authority correspondence item${inboundAwaiting.length === 1 ? "" : "s"} for your review`,
      severity: "info",
    });
  }

  return actions;
}
```

**Where the fix lands:**

- [src/components/app-shell/AttorneyDashboard.tsx](src/components/app-shell/AttorneyDashboard.tsx)
  - Remove `previewDisabled` from the `CaseQueueViewToggle`.
  - Drop the gate in `setViewMode` that forces preview → list.
  - Lift `selectedPreviewCaseId` + `previewPaneWidth` state (mirror
    the [CaseQueue.tsx](src/components/CaseQueue.tsx) implementation).
- **New** `src/components/case-queue/CaseQueueAttorneyPreviewPane.tsx`
  — attorney variant of the existing `CaseQueuePreviewPane`. Reuses
  the same `Resizable` + `useKeyboardResize` chrome but swaps the
  body sections for the attorney-flavored content described above.
  - Pulls in `<AttorneyReviewPanel>` (or `<PeerReviewPanel>` based on
    `attorneyEscalation.role`) as the action surface.
  - Keep "Open case" as the explicit go-to-the-full-form action.
- [src/components/case-queue/CaseQueueViewToggle.tsx](src/components/case-queue/CaseQueueViewToggle.tsx)
  — already supports the preview mode for the Case Queue; the
  dashboard just needs to opt in.

**Reuse vs. fork decision:**

The Case Queue's `CaseQueuePreviewPane` is ~400 LoC; an attorney
variant shares the resizable chrome + header pattern but diverges on
the body content (action items + AttorneyReviewPanel). Two options:

1. **Fork** to a new `CaseQueueAttorneyPreviewPane.tsx` — cleanest
   separation, slight duplication of the chrome.
2. **Extract the chrome** into a shared `<PreviewPaneShell>` component,
   then let the Case Queue and Attorney Dashboard each compose their
   own body. More refactor up-front but better long-term.

Recommended: Option 1 for the first cut (ships faster, easier to
review). Refactor to a shared shell later if the surfaces drift
further.

**Interaction with quick filters (Gap 2):**

Once Gap 2 lands and the dashboard has its **Unassigned** quick
filter tab, the preview pane should respect the filter — selecting
preview on the Unassigned tab shouldn't pull in cases from outside
that filter. Same pattern as the Case Queue.

**Mobile / narrow viewport:**
Below 1024px the Preview pane should auto-fall back to Detailed list,
mirroring the existing Case Queue behaviour at
[CaseQueue.tsx](src/components/CaseQueue.tsx) (the toggle button
becomes disabled with a tooltip "Resize wider to enable preview
pane").

**Open questions:**
- **Action buttons in the pane — same scope as the full case form?**
  Today the in-case `AttorneyReviewPanel` exposes all four actions
  with confirmation dialogs. Some of those dialogs require notes
  (Approve with Conditions, Request More Information, Block). Should
  the preview pane support the full flow, or only the no-input
  actions (Release) and link out for the rest? Trade-off: pane height
  vs. workflow efficiency.
- **Selection persistence.** Should the preview selection persist
  across page reloads (same pattern as the RS's queue selection) or
  reset every session?
- **Empty state.** When no case is selected, the pane shows "Select
  a case to preview." Should it instead surface a global "X cases
  pending your action" summary (sum across the visible cases) so the
  attorney has a triage starting point?

