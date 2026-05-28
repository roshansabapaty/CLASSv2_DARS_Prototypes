# Correspondence & Authority Communications — Phase 2

**Project:** DARS_EEVIDENCE (`c:\R\DARS_EEVIDENCE`)
**Scope:** Bidirectional communication loop with the issuing/enforcing authority. Complements **Phase 1 — Production Letters & Forms** by adding the inbound side, the delivery/acknowledgement state machine on outbound items, and the unified surface where everything lives.
**Owner:** lisawu@microsoft.com
**Status:** Planning
**Created:** 2026-05-07
**Related:** [production-letters-and-forms-phase1.md](production-letters-and-forms-phase1.md)

## Context

Phase 1 ends at "Signed + PDF download" — RS authors a form (e.g. EPOC Form 3 rejection), signs it, and downloads the PDF. Beyond that, the prototype is silent: no record of *when* the form was sent, no inbox for the issuing authority's response, no acknowledgement tracking, and no notification surfaces telling the RS that a reply has come back.

Phase 2 closes the loop in three ways:

1. **Outbound transmission state machine** — every outbound item (signed Phase 1 form, free-text letter, attachment-only correspondence) progresses through `Sent → Delivered → Acknowledged → Responded`, with audit data per transition.
2. **Inbound channel** — issuing/enforcing authorities can send correspondence and structured forms back to the RS. Items arrive in the case's Inbox typed by `kind` (Text · Attachment · StructuredForm · Acknowledgement · WithdrawalAmendment).
3. **Notification surfaces** — RS sees inbound activity at every level: AppHeader bell, queue card badge, sticky case chip, inline case alert, and live toast on arrival.

### Architectural decision: unify Phase 1 into Phase 2's surface

Phase 1's standalone **Forms & Letters** accordion section is **replaced** by a new **Correspondence with Authority** accordion section. This is intentional — the user's mental model is "I'm corresponding with the issuing/enforcing authority", not "I have a form library over here and a delivery log over there." All Phase 1 components are preserved; only the entry point changes (see *Phase 1 plan delta* below).

Above the accordion section, a persistent **discoverability banner** signals this is the eEvidence-specific communications hub and offers a one-click launch into an immersive **Correspondence Hub** — a full-screen workspace mirroring the existing Fulfillment Wizard pattern. The accordion gives a compact at-a-glance view; the Hub is for deep work on threads.

## User-confirmed decisions

- **Surface model:** Single **Correspondence with Authority** accordion section with compact tabbed summary (Inbox · Outbox · Compose) + a discoverability banner above the accordion that launches the immersive **Correspondence Hub**. Phase 1's "Forms & Letters" accordion is replaced by this section; Phase 1's components live on as the Compose tab's authoring tools.
- **Inbox/Outbox model:** Two flat chronological lists per case. Items can carry an optional `inReplyToId` for cross-linking; the UI renders a "↳ replies" indicator and a side-pane **ThreadPane** when one of a linked pair is opened.
- **Notification surfaces:** All four — AppHeader bell with count, queue card "📬 N new" / "Acknowledgement pending" badge, sticky case header chip + inline `MessageBar` alert, and Sonner toast on real-time arrival.
- **Delivery simulation:** All three — manual stamping (always-supported real path), auto-after-delay (~10s timer marks Sent → Delivered, ~20s Delivered → Acknowledged), and a dev-only **Demo Controls** panel that lets PMs trigger inbound events on demand.
- **UI library:** Fluent UI v9 + Griffel `makeStyles()` + `tokens.*`. No shadcn imports in new files. Per [docs/UI_LIBRARY_POLICY.md](docs/UI_LIBRARY_POLICY.md).

## Out of scope (Phase 2)

- Real network transmission to actual authority systems. All transmission is simulated.
- The EU "decentralised IT system" referenced by Reg 2023/1543 — Phase 3+ concern.
- Real-time push from a backend. Inbound arrival is simulated locally (auto-sim + Demo Controls).
- E2E encryption; signature verification on inbound items (the EU regulation requires authority signatures — Phase 3).
- Multi-recipient outbound (cc'ing issuing + enforcing simultaneously).
- Per-jurisdiction transmission protocol differences.
- Backend persistence — items live on `formData.correspondence` (in-memory FormData state).

## Approach

### A. Architectural unification with Phase 1

Phase 1 components and types stay unchanged in their locations. Only the *entry point* into them changes:

- **Stays put:** `forms-library/` directory and all components, `formTemplate.ts`, `formTemplates.ts`, `microsoftLegalReps.ts`, `formEngine.ts`, `pdfGenerator.ts`, `TemplatePickerDialog`, `FormFillerDialog`, `SignaturePanel`, `FormPreviewPanel`, `EscalationBanner`, `FormStatusBadge`.
- **Replaced as the accordion's mounted content:** `FormsLibrarySection.tsx` becomes a thin shim that re-exports from the new `CorrespondenceSection.tsx`, OR is deleted and its mount swapped wholesale (preferred).
- **Reused by the new ComposePanel:** `TemplatePickerDialog` is opened by ComposePanel's "Use a template" entry. `FormFillerDialog` runs unchanged. When a form is signed, instead of stopping there, ComposePanel creates an **OutboundCorrespondenceItem** linked to the form instance and starts the transmission state machine.

When the RS clicks "Send" on a signed form, the system:
1. Creates an `OutboundCorrespondenceItem` with `formInstanceId` set.
2. Marks the linked Phase 1 `CaseFormInstance` status as `Sent` (extended enum — see Phase 1 plan delta below).
3. Starts the auto-after-delay simulator on the new outbound item.

### B. Data model — new file `src/types/correspondence.ts`

```ts
import type { CaseRegion } from "./caseTypes";

export type CorrespondenceDirection = "Inbound" | "Outbound";
export type AuthorityRole = "IssuingAuthority" | "EnforcingAuthority";

export type CorrespondenceChannel =
  | "Email"
  | "DecentralisedITSystem"   // EU eEvidence official channel (Reg 2023/1543)
  | "AuthorityPortal"
  | "PostalMail"
  | "Other";

export type OutboundTransmissionStatus =
  | "Draft"          // not yet sent (covers Phase 1 Signed-but-not-Sent state)
  | "Sent"           // RS has dispatched via the chosen channel
  | "Delivered"      // delivery confirmed (manually stamped or auto-simulated)
  | "Acknowledged"   // authority formally acknowledged receipt
  | "Responded"      // authority sent a response (creates a linked Inbound item)
  | "Failed";        // delivery failed (mock)

export type InboundKind =
  | "Text"                 // free-text letter / email body
  | "Attachment"           // attached document(s) only, no body
  | "StructuredForm"       // authority-submitted form (e.g. corrected EPOC, EPOC-PR companion)
  | "Acknowledgement"      // formal receipt confirmation, often with reference number
  | "WithdrawalAmendment"; // authority withdraws or amends an earlier order

export interface CorrespondenceAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;             // ObjectURL in the prototype
}

interface CorrespondenceBase {
  id: string;
  caseId: string;
  direction: CorrespondenceDirection;
  counterparty: AuthorityRole;
  channel: CorrespondenceChannel;
  /** Cross-link to a parent (the outbound this replies to, or vice-versa).
   *  Drives the ThreadPane side view. */
  inReplyToId?: string;
  subject: string;
  createdAt: Date;
}

export interface OutboundCorrespondenceItem extends CorrespondenceBase {
  direction: "Outbound";
  /** Reference to a Phase 1 form instance (when the outbound is a signed form). */
  formInstanceId?: string;
  body?: string;
  attachments?: CorrespondenceAttachment[];
  transmission: {
    status: OutboundTransmissionStatus;
    sentAt?: Date;
    sentBy?: string;
    deliveredAt?: Date;
    deliveryConfirmedBy?: "RS" | "AutoSim" | "AuthorityCallback";
    acknowledgedAt?: Date;
    acknowledgementRef?: string;   // authority's reference number
    respondedAt?: Date;
    respondedInboundId?: string;   // points at the linked inbound reply
    failedAt?: Date;
    failureReason?: string;
  };
}

export interface InboundCorrespondenceItem extends CorrespondenceBase {
  direction: "Inbound";
  kind: InboundKind;
  body?: string;
  attachments?: CorrespondenceAttachment[];
  /** For StructuredForm — references a Phase 1 template + filled values. */
  structuredForm?: {
    templateId: string;
    values: Record<string, unknown>;
  };
  /** Read state. Unread = surfaces in notification UIs. */
  readAt?: Date;
  /** RS-set follow-up state. */
  followUp?: {
    requiredBy?: Date;
    note?: string;
    completedAt?: Date;
  };
}

export type CorrespondenceItem =
  | OutboundCorrespondenceItem
  | InboundCorrespondenceItem;
```

Extend `FormData` in [src/types/caseTypes.ts](src/types/caseTypes.ts) with one new field:

```ts
correspondence?: CorrespondenceItem[];
```

### C. New components — `src/components/correspondence/`

All Fluent v9 + Griffel.

| File | Purpose |
|---|---|
| `CorrespondenceSection.tsx` | The accordion section content. Compact tabbed summary (`TabList` + `Tab`): Inbox · Outbox · Compose. Each tab shows the 5 most-recent items + "View all in Hub" link. |
| `CorrespondenceBanner.tsx` | Discoverability banner mounted *above* the accordion list on the case page. Fluent `MessageBar` (intent `informative`), eEvidence-flavored copy: *"Correspondence with Authority — receive and send formal communications with the issuing or enforcing authority for this case."* Right side: unread/pending counters + primary "Open Hub" `Button`. Collapsible. |
| `CorrespondenceHub.tsx` | Full-screen immersive workspace, mirrors the Fulfillment Wizard's full-screen modal pattern. Three top-level `Tab`s: **Inbox**, **Outbox**, **Compose**. Side-pane `ThreadPane` opens when an item with `inReplyToId` is selected. |
| `InboxList.tsx` | Flat chronological list of `InboundCorrespondenceItem`. Filter chips: kind, read/unread, has-follow-up. Row: counterparty avatar + role chip (Issuing/Enforcing), kind `Badge`, subject, age, unread dot, follow-up indicator. |
| `InboxItemDetail.tsx` | Right-pane or modal view: header + body + attachments + structured-form preview (delegates to Phase 1 `FormPreviewPanel` when `kind === "StructuredForm"`) + thread context. Actions: Mark read · Set follow-up · Reply · Open thread. |
| `OutboxList.tsx` | Flat chronological list of `OutboundCorrespondenceItem`. `TransmissionStatusBadge` per row. Filter chips: status, channel. |
| `OutboxItemDetail.tsx` | Header + form preview (when linked) or body+attachments + `TransmissionStepper` showing the lifecycle with timestamps. Manual-stamp actions: Mark Delivered · Mark Acknowledged (with reference-number `Input`) · Link incoming response. |
| `ComposePanel.tsx` | Two entry points: **Use a template** (opens Phase 1 `TemplatePickerDialog`) and **New free-text correspondence** (opens `FreeTextComposer`). When the source is a Phase 1 signed form, ComposePanel wraps the form's instanceId into a new outbound item on Send. |
| `FreeTextComposer.tsx` | Subject `Input` + body `Textarea` + attachments dropzone + counterparty `Select` (Issuing / Enforcing) + channel `Select` + "Reply to" picker (existing inbound items, optional). Send → creates `OutboundCorrespondenceItem`. |
| `TransmissionStatusBadge.tsx` | Fluent `Badge` mapping `OutboundTransmissionStatus` to color + icon (Draft grey, Sent blue, Delivered teal, Acknowledged green, Responded purple, Failed red). |
| `TransmissionStepper.tsx` | Visual stepper (Draft → Sent → Delivered → Acknowledged → Responded). Each step shows timestamp + actor. Failed branches red with reason. |
| `ThreadPane.tsx` | Side-pane that shows a linked outbound + inbound pair in chronological order when either is selected. |
| `CorrespondenceUnreadAlert.tsx` | Fluent `MessageBar` (intent `informative`) mounted above the accordion list when `unreadCount > 0`. Copy: *"You have N unread messages from the issuing authority."* Actions: Mark all read · Open Hub. |
| `DemoControlsPanel.tsx` | Floating dismissable panel (bottom-right, `import.meta.env.DEV` only) with: Simulate inbound arrival · Auto-progress outbound · Reset auto-sim timers · Disable auto-sim toggle. |
| `correspondenceEngine.ts` | Pure helpers: `unreadInboxCount`, `pendingOutboxCount`, `linkInbound`, `transitionOutbound`, `simulateAutoDelivery`, `groupByThread`. |
| `index.ts` | Barrel exports. |

### D. Notification system

#### D1. App-level notification store — new hook `src/hooks/useCorrespondenceNotifications.ts`

```ts
// Pseudocode:
useCorrespondenceNotifications(): {
  totalUnread: number;
  totalPending: number;          // outbound items awaiting Acknowledged past threshold
  perCase: Map<string, { unread: number; pending: number }>;
  recentInbound: InboundCorrespondenceItem[];  // newest 5 across all cases
}
```

The hook reads correspondence from a shared cases store (per the existing `sharedFormData` pattern), aggregates, and re-emits on changes.

#### D2. AppHeader bell — modify [src/components/AppHeader.tsx](src/components/AppHeader.tsx)

Replace the hardcoded notification dropdown content with state-driven content:
- Bell badge count = `useCorrespondenceNotifications().totalUnread`.
- Dropdown lists `recentInbound` (newest 5). Each row: case ID, counterparty role chip, subject, age, read/unread dot.
- Click a row → navigate to case + open Correspondence Hub on Inbox tab + scroll/focus that item.
- "View all" footer → opens new `NotificationsAllDialog` grouped by case.

#### D3. Queue card badge — modify [src/components/case-queue/CaseCardHeader.tsx](src/components/case-queue/CaseCardHeader.tsx)

Add a Fluent `Badge` next to the existing badges (LE Cancelled, etc.):
- **"📬 N new"** (intent `informative`) when `perCase[caseId].unread > 0`.
- **"⏳ Acknowledgement pending"** (intent `warning`) when an outbound is `Sent` or `Delivered` past a threshold (e.g. 24h in real time, 30s in demo time).

#### D4. Sticky case header chip + inline alert

- Modify [src/components/case-header/CaseHeaderSummary.tsx](src/components/case-header/CaseHeaderSummary.tsx): add a "📬 N unread" chip beside the existing terminal-status chips when current case has unread inbound. Click → opens Correspondence Hub on Inbox.
- New `CorrespondenceUnreadAlert.tsx` mounted at the top of the case-page body (between sticky header and accordion list), only renders when `unreadCount > 0`.

#### D5. Sonner toast on real-time arrival

When `simulateInboundArrival` fires (Demo Controls panel or auto-sim cron), and the user is in-app:
- Sonner toast: *"📬 New response from {Issuing|Enforcing} Authority — Case {caseId}"*. Click → navigate.
- AriaLiveRegion polite announcement for screen-reader users.

### E. Demo Controls panel (dev-only)

`DemoControlsPanel.tsx` mounted in `App.tsx` only when `import.meta.env.DEV`. Floating bottom-right, dismissable, persistent toggle in `localStorage`.

Buttons:
- **Simulate inbound arrival** — opens a small dialog: pick case (or current), counterparty, kind, subject, body, optional `inReplyToId`. Submit creates an `InboundCorrespondenceItem` and fires the toast/announce/notification cascade.
- **Auto-progress outbound** — pick a Sent/Delivered/Acknowledged outbound; advances it one step.
- **Trigger Responded** — picks an outbound and synthesizes a linked inbound reply (since auto-sim doesn't generate Responded automatically).
- **Reset auto-sim timers** — restart any auto-after-delay timers on Sent items.
- **Disable auto-sim** toggle — pause the auto-after-delay simulator (so demos run on manual cadence).

### F. Auto-after-delay simulator — new hook `src/hooks/useOutboundAutoSim.ts`

Mounted at App level once. Watches `formData.correspondence` across cases; when an outbound transitions to `Sent`:
- After ~10s (env-configurable) → transition to `Delivered`, `deliveryConfirmedBy: "AutoSim"`.
- After ~20s → transition to `Acknowledged` with synthetic reference `"AUTO-{shortId}"`.
- Stops there. `Responded` requires synthesizing an inbound item (Demo Controls handles this).

The hook respects the `Disable auto-sim` toggle from Demo Controls.

### G. State plumbing

Add to [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx):

- `handleCreateOutbound(item)` — pushes to `formData.correspondence`. If `formInstanceId` is set, also flips the linked Phase 1 form instance status to `Sent` (extends Phase 1 `FormInstanceStatus`).
- `handleTransitionOutbound(itemId, nextStatus, audit)` — patches the transmission sub-object.
- `handleAddInbound(item)` — pushes inbound and triggers notification side-effects (toast + announce).
- `handleMarkInboundRead(itemId)` and `handleSetInboundFollowUp(itemId, followUp)`.

Threaded through `CaseSummaryAndTabs` → `CorrespondenceSection` → `CorrespondenceHub` and its children.

## Phase 1 plan delta (apply to [production-letters-and-forms-phase1.md](production-letters-and-forms-phase1.md) at Phase 2 implementation time)

1. **Section rename:** "Forms & Letters" accordion section → **"Correspondence with Authority"**. Accordion `key` changes from `"forms"` to `"correspondence"`. Label is user-facing.
2. **Component substitution:** `FormsLibrarySection.tsx` is replaced by `CorrespondenceSection.tsx` as the section's mounted content. Phase 1's `TemplatePickerDialog`, `FormFillerDialog`, `SignaturePanel`, `FormPreviewPanel`, `pdfGenerator`, `formEngine` keep their APIs and are imported by `ComposePanel`.
3. **Form lifecycle extension:** `FormInstanceStatus` extends from `"Draft" | "Signed"` to `"Draft" | "Signed" | "Sent"`. The `Sent` transition fires when an outbound correspondence item is created with that form's `formInstanceId`.
4. **PDF as artifact:** PDF download remains unchanged for the RS workflow; additionally, the generated PDF is automatically attached to the new Outbox item as the source artifact, viewable from `OutboxItemDetail`.

These deltas land at Phase 2 implementation time, not retroactively. Phase 1 ships as currently written.

## Files to create

1. `src/types/correspondence.ts`
2. `src/components/correspondence/CorrespondenceSection.tsx`
3. `src/components/correspondence/CorrespondenceBanner.tsx`
4. `src/components/correspondence/CorrespondenceHub.tsx`
5. `src/components/correspondence/InboxList.tsx`
6. `src/components/correspondence/InboxItemDetail.tsx`
7. `src/components/correspondence/OutboxList.tsx`
8. `src/components/correspondence/OutboxItemDetail.tsx`
9. `src/components/correspondence/ComposePanel.tsx`
10. `src/components/correspondence/FreeTextComposer.tsx`
11. `src/components/correspondence/TransmissionStatusBadge.tsx`
12. `src/components/correspondence/TransmissionStepper.tsx`
13. `src/components/correspondence/ThreadPane.tsx`
14. `src/components/correspondence/CorrespondenceUnreadAlert.tsx`
15. `src/components/correspondence/DemoControlsPanel.tsx`
16. `src/components/correspondence/correspondenceEngine.ts`
17. `src/components/correspondence/index.ts`
18. `src/components/NotificationsAllDialog.tsx` — "View all" surface for the AppHeader bell.
19. `src/hooks/useCorrespondenceNotifications.ts`
20. `src/hooks/useOutboundAutoSim.ts`

## Files to modify

1. [src/types/caseTypes.ts](src/types/caseTypes.ts) — add `correspondence?: CorrespondenceItem[]` to `FormData`.
2. [src/components/CaseSummaryAndTabs.tsx](src/components/CaseSummaryAndTabs.tsx) — change section key/label per Phase 1 delta; mount `<CorrespondenceSection>`.
3. [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx) — add the four handlers; mount `<CorrespondenceBanner>` above the case content area; thread props.
4. [src/components/AppHeader.tsx](src/components/AppHeader.tsx) — wire bell to `useCorrespondenceNotifications`.
5. [src/components/case-queue/CaseCardHeader.tsx](src/components/case-queue/CaseCardHeader.tsx) — add "📬 N new" + "⏳ Acknowledgement pending" badges.
6. [src/components/case-header/CaseHeaderSummary.tsx](src/components/case-header/CaseHeaderSummary.tsx) — unread chip.
7. [src/App.tsx](src/App.tsx) — mount `useOutboundAutoSim`; mount `<DemoControlsPanel>` (DEV only).
8. `src/utils/mockCase*.ts` — seed at least one case with example correspondence (1 outbound + 2 inbound, threaded; including a StructuredForm inbound so we can test the FormPreviewPanel reuse).

## Open items requiring user input

1. **Auto-sim delay defaults** — confirm 10s (Sent → Delivered) and 20s (Delivered → Acknowledged) are right for demos, or pick alternative timings.
2. **Banner copy** — confirm the discoverability banner copy: *"Correspondence with Authority — receive and send formal communications with the issuing or enforcing authority for this case."* Or pick alternative wording.
3. **Demo Controls visibility** — should DemoControlsPanel be **always visible in DEV** (default) or **hidden behind a keyboard chord** (e.g. `Ctrl+Shift+D`) to avoid distracting recordings/screenshots?

## Verification

1. `npm run dev` in `c:\R\DARS_EEVIDENCE`. Open the queue. Confirm the seeded case (e.g. LENS-2025-00200) shows a "📬 N new" badge.
2. AppHeader bell shows badge count > 0; dropdown lists the latest unread inbound items.
3. Open the case → sticky header chip "📬 N unread" appears + the inline `CorrespondenceUnreadAlert` MessageBar above the accordion.
4. The `CorrespondenceBanner` is visible at the top of the case body. Click "Open Hub" → full-screen Hub opens.
5. Hub Inbox tab lists all inbound items; filters work. Click an item → detail view; if it links to an outbound, the `ThreadPane` opens beside it.
6. Switch to Outbox tab. Pick an item in `Sent` status → click "Mark Delivered" → `TransmissionStepper` advances; status badge updates.
7. Open the case's Correspondence accordion section directly (without the Hub). Compact summary shows the 5 most recent items per tab; "View all in Hub" links each open the Hub on the right tab.
8. Compose tab → "Use a template" → Phase 1 `TemplatePickerDialog` opens (EPOC Form 3 pickable). Fill, sign — Phase 1 still works as designed.
9. After signing, the form auto-creates an OutboundCorrespondenceItem with `transmission.status: "Sent"`. Verify in the Outbox tab.
10. Wait ~10s — auto-sim transitions it to `Delivered`. Wait ~20s — `Acknowledged` with `acknowledgementRef` starting `"AUTO-"`.
11. Open `DemoControlsPanel` → "Simulate inbound arrival". Submit. Verify all five notification surfaces fire: Sonner toast, AppHeader bell increments, queue card badge updates, sticky chip increments, inline alert appears (or count updates).
12. Use Demo Controls "Trigger Responded" on a Sent/Acknowledged outbound → synthesizes a linked inbound; opens the ThreadPane to confirm the link.
13. Mark inbound items as read → unread counts everywhere decrement and clear.
14. Toggle "Disable auto-sim" → confirm Sent items no longer auto-advance.
15. Refresh the page — correspondence persists in `formData.correspondence` (in-memory until backend lands).

## Risks and mitigations

- **Cross-cutting state ownership:** the notification store reads correspondence across all cases. In the prototype, FormData is per-case; the cross-case aggregation happens in `useCorrespondenceNotifications` reading the shared cases store. Document the fan-out in the hook's JSDoc.
- **Auto-sim noise during demos:** the auto-after-delay simulator could fire mid-sentence during a PM walkthrough. Mitigation: Demo Controls "Disable auto-sim" toggle. Default state in DEV may be opt-in (configurable in `useOutboundAutoSim`).
- **Dual surface confusion:** users might be unsure whether to use the accordion section or the Hub. Mitigation: consistent copy ("Open Hub" CTA in the section header; section subtitle reads "Quick view of correspondence — open the Hub for the full workspace").
- **Phase 1 delta requires a small change to in-flight Phase 1 work:** the `forms` → `correspondence` rename is a one-commit change. If Phase 1 has already shipped, treat the rename as a deprecation: keep `formsLibraryContent` as a temporary alias for one release.
- **Pre-commit hook:** `scripts/check-no-new-shadcn-imports.sh` rejects new files importing from `src/components/ui/*`. All new components must use Fluent v9 imports only.

## Phase 3+ (not in this plan, for context)

- Real transmission integration (decentralised IT system per EU 2023/1543, secure email gateways, authority portals).
- Authority-side digital signature verification on inbound items.
- E2E encryption for sensitive correspondence content.
- Multi-recipient correspondence (issuing + enforcing in one outbound, with per-recipient delivery state).
- Backend persistence + push for true real-time inbound (replacing auto-sim).
- Configurable per-jurisdiction transmission protocols (e.g. UK eEvidence portal vs EU decentralised IT system vs US email).
- Conversation analytics (response times, escalation patterns, success rates).
