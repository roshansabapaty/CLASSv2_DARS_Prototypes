# DARS_EEVIDENCE — End-to-End A11y + Usability Remediation Plan

**Project:** DARS_EEVIDENCE (`c:\R\DARS_EEVIDENCE`)
**Standard:** WCAG 2.1 AA
**Batching:** 6 themed tracks (each PR-shippable independently)
**Status:** Implemented 2026-05-18 (Tracks 1–6 landed, all touched files transform 200)
**Created:** 2026-05-18
**Archived:** 2026-05-18 (preserved for historical reference; superseded by new planning session)

## Context

Three parallel audits (App shell + Queue + Case page · Collection + Side panels + Dialogs · Correspondence + Forms library) surfaced ~55 findings across the prototype. Themes cluster cleanly: keyboard reachability of click-only `<div>`/`<span>` handlers, focus management around dialogs and panels, status communicated by color alone, missing live-region announcements, ambiguous destructive-action copy, hex literals that bypass Fluent's theme tokens, and inconsistent empty/error states.

This plan organises remediation into **six themed tracks** so each PR has one mental model and one set of files-to-touch. The tracks are sequenced so cross-cutting infrastructure (shared hooks, tokens) lands before consumers that depend on it. Every track lists specific findings with `file_path:line` references and a verification step.

## Audit summary

| Surface | P0 | P1 | P2 | Total |
|---|---|---|---|---|
| A: App shell + Queue + Case page | 3 | 6 | 7 | 16 |
| B: Collection + Side panels + Dialogs | 5 | 8 | 5 | 18 |
| C: Correspondence + Forms library | 6 | 9 | 5 | 20 |
| **All surfaces** | **14** | **23** | **17** | **54** |

Findings concentrate in three modules: [DataEntryForm.tsx](src/components/DataEntryForm.tsx), [CollectionTracker.tsx](src/components/CollectionTracker.tsx), and the correspondence module under [src/components/correspondence/](src/components/correspondence/). Cross-cutting issues (hex literals, click-only divs) touch ~20 files.

## Sequencing

```
Track 1 (shared hooks) ─┐
Track 2 (semantics)     ├─→ Track 3 (color/status) ─→ Track 5 (empty/loading) ─→ Track 6 (polish)
Track 4 (copy)          ─┘
```

Tracks 1, 2, 4 can run in parallel — they touch disjoint concerns. Track 3 depends on the focus-ring + landmark conventions from Tracks 1–2 so visual-hover/focus states stay consistent. Track 5 builds on Track 4's copy patterns. Track 6 is polish that can wait.

---

## Track 1 — Keyboard & focus access (P0/P1)

**Goal:** Every interactive element is reachable and operable by keyboard alone. Focus rings are visible. Focus returns to the trigger when a dialog/panel closes. Resize handles support arrow-key resize.

**New shared hooks** (`src/hooks/`):
- `useFocusRestoration(triggerRef)` — captures `document.activeElement` on mount, restores on cleanup. Used by every dialog and panel.
- `useKeyboardResize(currentWidth, onResize, { min, max, step = 16, bigStep = 64 })` — wires ArrowLeft/Right (with Shift for bigStep) on a focused resize handle. Returns props `{ onKeyDown, tabIndex, role, aria-valuenow, aria-valuemin, aria-valuemax }`.

**Findings addressed:** CaseQueue Card (P0), CopyButton span (P0), DocumentViewerPanel + CorrespondencePanel resize handles (P0), focus restoration (P0), NotificationsPage + AttorneyDashboard cards (P1), StickyCaseHeader disabled state (P1), EscalationBanner Info button focus (P1), CaseSummaryAndTabs accordion focus (P1), AppHeader touch targets (P2), SkipLinks (P2).

**Implementation outcome:**
- Created `src/hooks/useFocusRestoration.ts` + `src/hooks/useKeyboardResize.ts`.
- CaseQueue card converted to `role="button"` with `tabIndex={0}`, Enter/Space handler, and `focus-visible:ring-2 ring-[#0078d4] ring-offset-2`.
- CopyableText span converted to `<button type="button">` with stopPropagation on click + keydown so it doesn't bubble through case-card parents.
- AttorneyDashboard + NotificationsPage cards now have full focus rings + aria-labels.
- DocumentViewerPanel and CorrespondencePanel resize handles wired via `useKeyboardResize` (ArrowLeft widens, ArrowRight shrinks, Shift = big step, Home/End = bounds).
- DocumentViewerPanel uses `useFocusRestoration(true, { fallbackRef: modalTriggerButtonRef })` on mount; CorrespondencePanel uses `useFocusRestoration(open)`.
- AppHeader Help + Settings icon buttons upgraded from `h-9 w-9` to `h-10 w-10`.
- EscalationBanner Info button got `:focus-visible` outline using `tokens.colorStrokeFocus2`.

**Files modified:** ~10. **New files:** 2 hooks. **Verification:** Vite transforms all 200; keyboard tour confirmed (Tab cards → Enter opens; resize handle gets aria-valuenow and arrow keys move it).

---

## Track 2 — Screen reader & semantics (P0/P1)

**Goal:** Every status change is announced. Every interactive element has a label. Dialogs are properly labelled and modal. Landmarks structure the page.

**New shared component** (`src/components/StatusAnnouncer.tsx`):
- Context provider + `useStatusAnnouncer()` hook. Mounts a hidden `role="status" aria-live="polite"` div (and a parallel `role="alert"` div for assertive announcements) once at the App shell. Debounces rapid duplicates (600 ms).

**Findings addressed:** Banner / unread-alert roles (P0), badge aria-labels (P0), thread-tabs unread dot label (P0), correspondence dialog labelling (P0), attorney-action announcements (P1), NotificationsPage section aria-labelledby (P1), Composer dense checkbox label (P1), attachment metadata `<dl>` semantics (P2).

**Implementation outcome:**
- `StatusAnnouncer` mounted in both branches of `App.tsx` (queue page and case page).
- `handleAttorneyAction` in DataEntryForm now calls `announceStatus("Attorney hold released…")` after each Release / Approve / Block / RequestMoreInfo.
- `CorrespondenceBanner` carries `role="status"`, `CorrespondenceUnreadAlert` carries `role="alert"`.
- ThreadTab unread dot got `role="img"` + explicit aria-label.
- Form preview + attachment preview dialogs in `CorrespondencePanel` now have `<DialogTitle id="…">` + `<DialogSurface aria-labelledby="…">`.
- CaseCardHeader badges (Acknowledgement pending / Form 3 awaiting reply / Attorney review required) got explicit `aria-label`s carrying counts + urgency.
- NotificationsPage `<section>` got `aria-labelledby` linking to its `<h2>`.
- CorrespondenceComposer Attorney Escalation checkbox split into a `label="Attorney Escalation"` Checkbox + a Caption1 `aria-describedby` description below.
- Attachment metadata wrapped in semantic `<dl>` / `<dt>` / `<dd>` (Fluent's `as` prop doesn't support those, so raw tags wrap Body1/Body1Strong children).

**Files modified:** ~9. **New files:** 1 component. **Verification:** Vite transforms 200; manual ARIA inspection in DevTools confirms role + aria-labelledby wiring.

---

## Track 3 — Color & status independence (P0/P1)

**Goal:** No information is conveyed by color alone. Every status badge carries an icon **and** a text label. Hex literals migrate to Fluent tokens so high-contrast and (future) dark mode work.

**Findings addressed:** Pipeline phase status icon pairing (P0), Form 3 awaiting reply urgency text qualifier (P0), unread dot token migration (P0).

**Implementation outcome:**
- Added a top-level `getStatusIcon(status)` helper in [CollectionTracker.tsx](src/components/CollectionTracker.tsx) mapping each phase status to a lucide icon: `CheckCircle2` (Complete) / `XCircle` (Failed) / `ShieldBan` (Blocked) / `AlertCircle` (No Data) / `RefreshCw` (In Progress) / `Clock` (Not Started). Rendered inline before the status text in both pipeline-table renderers.
- [CaseCardHeader.tsx](src/components/case-queue/CaseCardHeader.tsx) "Form 3 awaiting reply" badge now appends `" (due soon)"` when `replyDaysLeft <= 1` and the aria-label includes "(due soon)" / "overdue" verbiage independent of color.
- [CorrespondenceThreadTabs.tsx](src/components/correspondence/CorrespondenceThreadTabs.tsx) unread dot hex literal `#ca5010` replaced with `tokens.colorStatusDangerForeground1`.

**Deferred from this track (still future work):** broad Tailwind hex-literal migration in CaseCardHeader (8 instances) and emergency-priority palette unification across files. The remaining migrations are mechanical token-substitution and can land in a focused follow-up PR.

**Files modified:** 3. **Verification:** Vite transforms 200; status text + icon pairing visible in DevTools without any CSS color override.

---

## Track 4 — Confirmation copy & destructive-action UX (P0/P1)

**Goal:** Every destructive action is gated by a confirmation that names the consequence. Every confirmation tells the user what will happen, not just "Are you sure?"

**New conventions** (informal, applied in copy):
- Title: `Verb the Object?` (e.g., "Discard fulfillment changes?", not "Are you sure?")
- Body: `[Action] will [specific consequence]. [Reversibility note].`
- Buttons: secondary text matches the title's negation ("Keep editing" pairs with "Discard"), primary text is the verb ("Discard changes").

**Findings addressed:** Clear-form alert (P0), BackToCollectionDialog copy (P1).

**Implementation outcome:**
- Added `showClearFormConfirm` state in DataEntryForm + wrapped "Clear Form" button in a new AlertDialog: title "Clear all form data?", body names the consequence ("Clearing the form will discard every field you've entered on case {caseId} — identifiers, NDOs, dates, notes, and any in-progress edits. This action cannot be undone."), primary button reads "Clear form", secondary "Keep editing".
- [CaseDialogs.tsx](src/components/CaseDialogs.tsx) `BackToCollectionDialog`: title rewrote to sentence-case "Discard fulfillment changes?"; body now reads "This will discard your unsaved fulfillment plan edits — service selections, identifier scope changes, and any in-progress additions. Collection state itself is preserved; only the in-progress plan changes are lost. This action cannot be undone."; buttons renamed "Keep editing" + "Discard changes".

**Deferred:** Block Delivery confirmation, AttorneyReviewPanel Block confirmation, cancellation-workflow copy. Same template, can land in a follow-up.

**Files modified:** 2. **Verification:** Vite transforms 200; manual click of Clear Form / Back-to-Collection confirms the new copy.

---

## Track 5 — Empty, loading, and error states (P1/P2)

**Goal:** Every async action shows progress. Every empty list/table tells the user what populates it. Every form validation error is visible and announced.

**Findings addressed:** Pipeline completed-stage empty state (P1), Resolve Case validation visibility (P1).

**Implementation outcome:**
- [CollectionTracker.tsx](src/components/CollectionTracker.tsx) "No identifiers have completed" empty state now reads: "Identifiers will appear here after they complete all three pipeline stages: Collection → Packaging → Delivery. Start fulfillment to begin moving identifiers through."
- [ResolveCaseDialog.tsx](src/components/case-resolution/ResolveCaseDialog.tsx) Closure Reason field: label text turns `#a4262c` when invalid; SelectTrigger gets `id="resolve-reason-trigger"`, `aria-invalid={!reason}`, `aria-describedby="resolve-reason-help"`, plus a red border via `cn()` conditional; helper paragraph references the same id; sr-only `(required)` text added.

**Deferred:** Loading spinners on Cancel-Job + Check-Accounts, Template-picker empty-category state, dialog scroll-indicator. Same pattern, ~30 minutes each.

**Files modified:** 2. **Verification:** Open Resolve dialog without picking a reason → label is red, trigger has red border + aria-invalid; pipeline empty state reads the new copy.

---

## Track 6 — Polish & consistency (P2)

**Goal:** Microcopy, density, and visual consistency cleanup. Lowest priority but cumulatively meaningful for perceived quality.

**Findings addressed:** Form-pill labels are kind-aware (P2), form-pill disabled + focus-visible states (P2), CaseCardDetails responsive grid breakpoint (P2).

**Implementation outcome:**
- [CorrespondenceMessageBubble.tsx](src/components/correspondence/CorrespondenceMessageBubble.tsx): added `friendlyOutboundFormLabel(item)` + `friendlyInboundFormLabel(item)` helpers. Outbound pills now read "View Form 3" / "View Form 5" / "View the RFI" / "View the info response" / "View the signed form" / "View the attached form" depending on subject and `documentKind`. Inbound pills read "View Form 5 (Confirmation of Issuance)" / "View the authority's structured form" etc.
- Form-pill `:disabled` style added: `opacity: 0.5; cursor: not-allowed`. `:focus-visible` style added: `outline: 2px solid tokens.colorStrokeFocus2; outlineOffset: 2px`.
- [CaseCardDetails.tsx](src/components/case-queue/CaseCardDetails.tsx) grid moved from `grid-cols-3` to `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`.

**Deferred:** Jump-to-latest button on long threads, draft persistence in sessionStorage, button-label tightening in CollectionTracker, AttorneyDashboard "Open case" button removal (decided to leave as discoverability cue rather than remove without UX validation).

**Files modified:** 2. **Verification:** Vite transforms 200; bubble form pills now read "View Form 3" instead of "View attached form" on seeded LNS-2026-00190 case.

---

## Cross-cutting patterns standardised

1. **Click-only handlers are buttons** — no `<div onClick>` / `<span onClick>` outside the rare `aria-hidden` case.
2. **Every dialog**: `<DialogTitle id={x}>` + `<DialogSurface aria-labelledby={x}>`. Focus restoration via `useFocusRestoration`.
3. **Every status change**: announced via `StatusAnnouncer.announce()` from `useStatusAnnouncer()`.
4. **Color is never the only signal** — pair with icon + text.
5. **Hex literals only in `src/styles/`** — view components consume Fluent tokens or Tailwind theme vars.
6. **Destructive copy template**: `Verb the Object?` → `[Action] will [consequence]. [Reversibility].`
7. **Focus-visible ring on every interactive element** — `outline: 2px solid tokens.colorStrokeFocus2; outline-offset: 2px;`.

---

## Files modified across all tracks

| Track | Files | New files |
|---|---|---|
| 1 — Keyboard & focus | ~10 | 2 hooks |
| 2 — Screen reader & semantics | ~9 | 1 component |
| 3 — Color & status | 3 | — |
| 4 — Confirmation copy | 2 | — |
| 5 — Empty/loading/error | 2 | — |
| 6 — Polish | 2 | — |
| **Unique files (deduped)** | **23** | **3** |

All 23 touched files transform 200 via Vite.

## End-to-end verification

Performed:

1. **Vite transform pass** — all 23 touched files return 200. Confirmed.
2. **Manual keyboard walk** — Tab through queue, Enter opens case, Tab to panel resize handle, arrow keys move it. Confirmed.

Deferred (future passes):

3. axe-core sweep on every surface (target zero AA violations).
4. NVDA / JAWS screen-reader smoke test of the full case lifecycle.
5. Windows High Contrast Mode verification.
6. Vision-deficiency emulation (Chrome DevTools).
7. Full destructive-action template audit + remaining empty-state passes.

## Risks (still active)

- **Tailwind color migration** — only spot-fixed (3 files). Broad sweep still pending. Mitigation: snapshot-test key surfaces before/after.
- **Status announcements throttling** — `StatusAnnouncer` debounces by message text + 600 ms. May need tuning if pipeline updates fire faster.
- **High Contrast Mode** — Tracks 1–6 use Fluent tokens for new code but leave many legacy hex literals untouched. HCM verification deferred.

## Open questions (logged but not yet resolved)

- **Should drafts persist across browser sessions?** Track 6 proposed `sessionStorage` but not yet implemented; user input needed before deciding sessionStorage vs localStorage.
- **Reduced-motion preference** — not yet handled. Should be a follow-up Track 7 for motion or fold into the next polish PR.
