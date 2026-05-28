# RFI / PAI flow — open edge cases for RS + Legal review

**Status:** Implementation shipped in prototype; behaviour needs policy validation
**Created:** 2026-05-19
**Owners:** Response Specialist team, Legal

This doc captures three behavioural decisions baked into the prototype's
**Request Additional Information (RFI)** and **Provide Additional Information (PAI)**
flow. Each has a current implementation chosen as the safest default —
but each represents a policy judgement that should be validated with a
Response Specialist and Legal before this lands in production DARS.

The questions below are *not* about UI polish. They're about how the
case progresses, what gets audited, what UI signals the RS sees, and
who controls when the case re-enters attorney review. Decisions here
shape compliance posture under EU Reg 2023/1543 Art. 9 and the parallel
follow-up timelines for non-EU jurisdictions.

---

## Edge Case 1 — "RFI reply due" countdown on inbound RFIs

**What ships today:**
- When the authority sends us an inbound `RequestAdditionalInformation`,
  the case list (Cards + Detailed list views) renders an amber/red
  **"RFI reply due • Nd"** badge — same visual pattern as the existing
  "Form 3 awaiting reply • Nd" badge.
- The countdown reads from `followUp.requiredBy` on the inbound when
  the authority supplied a deadline; otherwise it falls back to a
  **5-day default reply window** computed from the inbound's
  `createdAt`.
- Badge flips slate → amber at 1 day remaining and amber → red on
  breach. Tooltip explains the window.

**Why we shipped this default:**
- 5 days mirrors the EU Reg 2023/1543 Art. 9(6) Form 3 reply window —
  it's a defensible policy parity until a regulation-specific window is
  authoritatively sourced.
- We don't enforce reply — the badge is informational. The RS can still
  send the PAI past the window; the badge just turns red.

**Decisions (2026-05-19):**
1. ✅ **Per-jurisdiction defaults.** Replace the global 5-day fallback
   with regulation-anchored windows per jurisdiction (EU / UK / US / …).
   Each jurisdiction's window needs Legal sign-off; until then the
   prototype uses placeholder values noted in code with a `// TODO(legal)`
   tag.
2. ✅ **Default IS applied (implicit from #1).** We continue to fall
   back to a window when the authority omits an explicit deadline —
   just per-jurisdiction instead of one global value.
3. ✅ **Breach raises both signals.** On breach the prototype:
    - Surfaces an attorney-escalation nudge banner on the case form
      ("RFI reply window breached — consider escalating to attorney
      for review").
    - Auto-writes a system audit event to the AuditThread (kind:
      `RfiReplyOverdue` or similar), mirroring how Form 3 submission
      auto-writes `SLAStopped`. No RS interaction required for the
      audit event.
4. ✅ **Calendar days, flag for future per-jurisdiction work.** Keep
   the simple calendar-day count for the prototype; document the
   per-jurisdiction business-day question as a follow-up before
   production. Aligns with the existing Form 3 awaiting-reply badge.

**Original questions for the team (resolved above):**
1. ~~Is 5 days the right fallback?~~ → see decision 1
2. ~~Should the badge come from the inbound's metadata only?~~ → see decision 2
3. ~~Breach behaviour?~~ → see decision 3
4. ~~Holiday / business-day handling?~~ → see decision 4

**Follow-up before production:**
- Legal to confirm reply windows per jurisdiction (placeholder values
  in the implementation table need replacement).
- Per-jurisdiction business-day decision (Q4) when production migrates
  past the prototype.

**Implementation:**
- Type: `InboundCorrespondenceItem.followUp.requiredBy?: Date`
- Engine helper: `awaitingOurReplyInbounds(items)` at
  `src/components/correspondence/correspondenceEngine.ts`
- Notifications hook: `awaitingOurReply` / `oldestAwaitingOurReply` on
  `PerCaseCorrespondenceCounts`
  (`src/hooks/useCorrespondenceNotifications.ts`)
- UI: `daysLeftForInboundRfi` + badge JSX in
  `src/components/case-queue/CaseCardHeader.tsx`

---

## Edge Case 2 — `respondedByOutboundId` back-link on inbound RFIs

**What ships today:**
- When the RS sends an outbound PAI in reply to an inbound RFI (the
  outbound carries `inReplyToId = <inboundId>`), the inbound is
  immediately stamped with `respondedByOutboundId = <outboundId>`.
- The inline **"Reply with Provide Additional Information"** CTA on
  the inbound bubble hides as soon as `respondedByOutboundId` is set —
  the conversation is closed from our side. RS can't click Reply twice
  and create duplicate outbounds.
- The back-link is symmetrical: the outbound's `inReplyToId` already
  walked one direction; this closes the loop.

**Why we shipped this default:**
- Duplicate replies are an operational and audit headache. The CTA
  hiding is a soft guardrail that signals "you've already handled
  this" without locking the RS out — they can still author a new
  outbound by going through the Compose tab directly.
- The stamping is one-shot at send time. No reverse-link rewrites
  when an outbound is later cancelled or amended.

**Decisions (2026-05-20):**
1. ✅ **"Replied ✓" chip with overflow menu.** After a PAI is sent,
   replace the inline CTA on the inbound bubble with a confirmation
   chip. An overflow (⋮) menu surfaces "Send another reply" for the
   supplemental-reply path. Strongest discoverability that the loop
   is closed; legitimate second replies stay one click deep.
2. ✅ **Keep the back-link, mark it as cancelled.** Convert
   `respondedByOutboundId` from a string to a small structured
   object: `{ outboundId: string; status: "sent" | "cancelled" }`.
   When the outbound is cancelled, flip the status but leave the
   pointer. The bubble surfaces "Replied (cancelled)" with the
   overflow menu still offering "Send another reply"; the per-
   jurisdiction breach countdown resumes if the cancellation
   re-opens the conversation.
3. ✅ **Per-inbound granularity + "related RFIs" link.** Keep the
   per-inbound CTA hide logic. When composing a PAI in reply to one
   RFI, the composer surfaces a sidebar list of OTHER open RFIs
   from the same authority with a checkbox to "Mark these as
   also-replied". Selected items get the same `respondedByOutboundId`
   stamp pointing at this outbound. The RS keeps control; no
   silent mis-collapses.
4. ✅ **Fire `RfiReplied` system event on send.** New audit kind
   that captures the RFI subject + PAI subject + timestamps.
   Auto-written on send regardless of escalation state. Gives the
   attorney first-class visibility of reply timing in the AuditThread.

**Original questions for the team (resolved above):**
1. ~~Can the RS legitimately reply twice?~~ → see decision 1
2. ~~Cancellation handling?~~ → see decision 2
3. ~~Multi-IA / multi-EA granularity?~~ → see decision 3
4. ~~Audit thread linkage?~~ → see decision 4

**Follow-up before production:**
- Decision 2 changes the type of `respondedByOutboundId` — production
  data migrations need to lift any existing string values into the new
  `{ outboundId, status }` shape.
- Decision 3's "related RFIs" sidebar needs UX review for cases with
  many open RFIs (graceful pagination / collapse).

**Implementation:**
- Type: `InboundCorrespondenceItem.respondedByOutboundId?: string`
  (`src/types/correspondence.ts`)
- Stamp at send: `handleSendOutbound` walks the case's correspondence
  and patches the matching inbound when the outbound carries
  `inReplyToId` (`src/components/DataEntryForm.tsx`)
- CTA gating: `CorrespondenceMessageBubble` hides the reply button
  when `item.respondedByOutboundId` is truthy

---

## Edge Case 3 — Auto-resume escalation prompt on PAI inbound

**What ships today:**
- A blue **"Authority replied to your information request — ready to
  resume escalation"** banner surfaces above the Case Overview when
  ALL of:
  1. `attorneyEscalation.status === "InformationRequested"`, AND
  2. The case has an inbound `ProvideAdditionalInformation` with
     `createdAt > latest InformationRequested audit event`.
- The banner shows the PAI's subject + age and a one-click **"Resume
  Escalation"** button.
- **Resume is manual, not automatic.** The button opens the existing
  `EscalateToAttorneyDialog` in resume mode, where the RS adds their
  own commentary before the case goes back to the attorney. Closing
  the dialog without submitting leaves the case in
  `InformationRequested` — the banner stays.
- Once the dialog is submitted, status flips to `Pending` + a
  `Resumed` audit event lands.

**Why we shipped this default:**
- Auto-flipping the case back to Pending the moment a PAI lands would
  surprise the RS — they may not have read the PAI yet, and the
  attorney would see the case re-appear in their queue without
  knowing the RS's commentary. Manual confirmation lets the RS
  control timing.
- The freshness check (`PAI.createdAt > InformationRequested.performedAt`)
  prevents the banner from firing on historical PAI traffic that
  predated the current escalation cycle.

**Decisions (2026-05-20):**
1. ✅ **Manual resume stays.** Keep the current banner + button. RS
   reads the PAI, adds commentary, clicks Resume. Attorney sees the
   case re-appear with the RS's framing intact. No auto-flip.
2. ✅ **Primary Resume CTA + secondary "Send another RFI" link.**
   Banner gets a second affordance for cases where the authority's
   PAI didn't satisfy the attorney's question. Resume stays the
   visual primary; the secondary link opens the composer pre-loaded
   with the RFI template. Hierarchy nudges toward Resume without
   trapping the RS when the PAI is inadequate.
3. ✅ **Count + newest-PAI summary.** Banner copy shifts to
   `"N replies received, most recent: <subject>"` when there are
   multiple unread PAIs since the InformationRequested event. Stays
   single-line; drives the RS to the Correspondence panel for the
   full thread.
4. ✅ **Dismissable + audit-logged.** Add an × dismiss button.
   Dismissing hides the banner for the current page session and
   writes a `PaiPromptDismissed` audit event ("PAI prompt dismissed
   by RS — N replies pending"). Banner returns on next page load
   (no cooldown), so the RS isn't permanently shielded from the
   reminder, but the audit thread captures their deliberate not-now.

**Original questions for the team (resolved above):**
1. ~~Manual vs auto resume?~~ → see decision 1
2. ~~Inadequate-PAI handling?~~ → see decision 2
3. ~~Multiple-PAI display?~~ → see decision 3
4. ~~Dismissal behaviour?~~ → see decision 4

**Follow-up before production:**
- Decision 4 records dismissal in the audit thread but the dismissal
  itself only persists for the current page session. Production may
  want per-RS-per-case persistence (localStorage or a server-side
  setting).
- Decision 2's "Send another RFI" path needs to skip the
  RfiReplied audit event since it's an unsolicited follow-up RFI,
  not a reply to the PAI — worth a code comment in the implementation.

**Implementation:**
- Component: `src/components/escalation/AwaitingInfoReplyBanner.tsx`
- Mount point: above Case Overview, alongside other escalation banners
  in `src/components/DataEntryForm.tsx` (~line 2130)
- Freshness check: walks `formData.escalationAuditEvents` for the
  newest `InformationRequested` event and filters PAIs by `createdAt`

---

## Cross-cutting concerns (not specific to one edge case)

**A. Order of operations when multiple CTAs compete.**
On a case with an inbound RFI **and** `InformationRequested` escalation
**and** an outbound PAI in draft, the RS sees up to three prompts: the
"RFI reply due" badge, the "Resume Escalation" banner, and the
unread-inbound pill on the queue. Which takes precedence in the RS's
mental model? Worth a hierarchy decision before adding more banners.

**B. Non-eEvidence inbound RFIs.**
Today the inline **"Reply with Provide Additional Information"** CTA
fires on any inbound with `kind === "RequestAdditionalInformation"`,
regardless of `requestType`. The PAI template's
`requestTypes: ["eEvidence"]` filter would hide it from the picker on a
UK COPO / US case — the click would silently fail. Two options to
explore: gate the CTA by case `requestType`, or make the PAI template
request-type-agnostic with conditional autofill.

**C. Token-resolution misses in the RFI body.**
If the case is missing `eevidenceIssuingAuthority.name` (data quality
issue), the RFI body shows the literal `{{eevidenceIssuingAuthority.name}}`
token. The Specialist will catch this at fill-time, but a defensive
fallback (display `[Issuing Authority]` as a normal placeholder) might
read better.

---

## How to use this doc

1. RS reviews from the operational angle: "Does the badge timing match
   how I currently triage RFIs? Are the cooldowns reasonable?"
2. Legal reviews from the policy angle: "Is the default reply window
   defensible? Does the auto/manual resume policy align with EU
   procedural rules?"
3. Resolutions go into a follow-up PR; each decision becomes a small
   prototype change (5-30 LoC) and a more confident rollout posture.

Open questions get tracked here until resolved. Once decisions land,
this doc becomes the spec for the production-grade RFI/PAI flow.
