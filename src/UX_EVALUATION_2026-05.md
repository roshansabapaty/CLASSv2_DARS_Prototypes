# DARS eEvidence — UX Evaluation, May 2026

> A fresh outside-eye evaluation of the running app, scored along three lenses:
> **Flow**, **Airy density**, **Fluent + React alignment**. Every finding is
> tagged with severity, lens, effort, and file:line evidence. This document is
> intentionally *delta* against the 41 prior `src/*.md` UX docs — overlap is
> called out explicitly with cross-references rather than relitigated.
>
> Generated 2026-05-28. Source of truth for evidence is the current `main`
> tree; cross-cutting numbers (file counts, primitive usage) were captured by
> ripgrep against the same tree.

---

## Table of contents

1. [Executive summary — top 5 highest-leverage opportunities](#1-executive-summary)
2. [Workflow vocabulary alignment](#2-workflow-vocabulary-alignment)
3. [Per-surface findings](#3-per-surface-findings)
   - 3.1 [App shell — AppHeader](#31-app-shell--appheader)
   - 3.2 [App shell — LeftNavRail](#32-app-shell--leftnavrail)
   - 3.3 [Case Queue](#33-case-queue)
   - 3.4 [Triage form](#34-triage-form-dataentryform)
   - 3.5 [Fulfillment Wizard](#35-fulfillment-wizard)
   - 3.6 [Collection Tracker](#36-collection-tracker)
   - 3.7 [Attorney workspace](#37-attorney-dashboard--review-workspace)
   - 3.8 [Notifications page](#38-notifications-page)
   - 3.9 [Modals & dialogs](#39-modals--dialogs)
4. [Cross-cutting themes](#4-cross-cutting-themes)
5. [Recommended sequencing](#5-recommended-sequencing)
6. [Delta vs existing docs](#6-delta-vs-existing-docs)
7. [Out-of-scope notes](#7-out-of-scope-notes)
8. [Severity × Effort triage matrix](#8-severity--effort-triage-matrix)

---

<a id="1-executive-summary"></a>
## 1. Executive summary — top 5 highest-leverage opportunities

| # | Opportunity | Lens | Severity | Effort | Why it's high-leverage |
|---|---|---|---|---|---|
| 1 | **Lock the 3-stage vocabulary into the UI** | Flow | High | S | Today the same hand-off shows up as five different labels (Triage / Review Case / Fulfillment Wizard / Generate Summary / Submit Collection Jobs). The team has agreed on `Triage → Review & Plan → Collection` with a preservation shortcut, but the UI has not. Aligning the vocabulary is a one-week copy + state-machine pass that immediately reduces user confusion and unblocks every later flow change. |
| 2 | **Consolidate the token system into a single brand source** | Fluent | High | M | Three parallel color/spacing systems exist today (CSS vars in `globals.css`, Tailwind `@theme inline`, and Fluent v9 `webLightTheme`). `webLightTheme`'s default brand is `#0F6CBD`; the CSS uses `#0078d4`. Fluent components and Tailwind components literally render different blues today. A generated `theme.ts` that emits CSS vars + a Fluent `BrandVariants` object from one source unlocks the next two opportunities. |
| 3 | **Migrate AppHeader to Fluent v9** | Flow + Fluent | High | M | AppHeader and LeftNavRail live adjacent at the top-left of every page and look like products from two different companies (shadcn + hex Tailwind vs Fluent `makeStyles` + `tokens.*`). Header migration is mechanical once #2 lands, and it is the single most visible visual-coherence win in the app. |
| 4 | **Move Fulfillment Summary out of a modal into an inline review surface** | Flow | High | L | `CaseDialogs.tsx:263-690` mounts a 1400px scrollable review workspace as a modal, including nested cards, expandable sections, document-side-panel coordination, and submit actions. Users lose page context and must manage a modal as if it were a full page. Convert to an inline stage panel or a Fluent `Drawer` with a sticky command bar. |
| 5 | **Push airy tokens into sub-components, and reconcile with the old compression pass** | Airy | High | L | The Tier 4 airy tokens (`--section-pad`, `--section-gap`, `--page-gutter-x`) are defined in `globals.css:73-77` but only 7 of ~200 component files reference them. Worse, an earlier compression pass (`SPACING_OPTIMIZATION_SUMMARY.md`) ran the *opposite* direction in the very same files (`p-8 → p-6`, `space-y-6 → p-5`). Today the airy direction lives only at page-shell depth. Sub-components fight it. |

These five interlock: #2 unlocks #3; #3 unblocks visual coherence for #1; #1 reduces confusion in #4; #5 cleans up the surfaces that the previous four touch. Suggested sequence is in [§5](#5-recommended-sequencing).

---

<a id="2-workflow-vocabulary-alignment"></a>
## 2. Workflow vocabulary alignment

**Canonical model** (per product owner, May 2026):

```
┌─────────┐    ┌────────────────────────────────┐    ┌────────────┐
│ Triage  │ →  │ Review case & create           │ →  │ Collection │
│         │    │ fulfillment plan               │    │            │
│         │    │ (a.k.a. "Fulfillment Wizard")  │    │            │
└─────────┘    └────────────────────────────────┘    └────────────┘
     │                                                      ▲
     │  preservation requests / preservation sub-types      │
     └──────────────────────────────────────────────────────┘
                       (skip Stage 2)
```

- **Three stages.** "Fulfillment" is an *umbrella* over Stage 2 + the front of Stage 3 (submission for collection), not a competing stage name.
- **Collection internally has sub-phases** — submit → package → deliver — but the team has **not** yet committed to a sub-phase rail. Today's `CollectionSidebarNav` 4-step rail (`Needs Action` / `Submit` / `Package & Deliver` / `Complete`) is **exploratory**, only 2 are wired, and the model will change.
- **Preservation shortcut.** Preservation requests skip Stage 2 entirely — they go from Triage straight into a "submit to collection and ensure preservation" action.

### Where the vocabulary is drifting today

| Surface | Current label(s) | Should read |
|---|---|---|
| WorkflowStageBanner | "Review Case" (`WorkflowStageBanner.tsx:396-408`) | "Review & Plan" |
| Footer primary action (triage) | "Review Triage" / "Complete Triage" (`DataEntryForm.tsx:4521-4544`) | "Continue to Review & Plan" |
| Footer primary action (review stage) | "Generate Summary" / "Submit Collection Jobs" (`DataEntryForm.tsx:4571-4589`) | "Submit to Collection" |
| Wizard heading | "Fulfillment Wizard" (`FulfillmentWizard.tsx:668`) | "Review & Plan" (with subtitle "create the fulfillment plan") |
| StageTabBar | "Triage" / "Review Case" / "Collection" | "Triage" / "Review & Plan" / "Collection" |
| Notifications opening a case | lands on "Triage" stage by default (`App.tsx:411-414`) | should respect last visited stage |

### Preservation flow is invisible

Currently, preservation requests follow the same triage → fulfillment wizard → collection path as every other request. The wizard then has a "skip" gate. **This hides the shortcut from the user's mental model.**

**Recommendation:** When a triage form has `requestType === 'preservation'` (or similar sub-type marker), the stage rail should *visually collapse Stage 2*:

```
Triage → ─ ─ ─ ─ ─ → Collection (preservation)
        (skipped)
```

…and the primary action at the bottom of Triage should read **"Submit for preservation"** rather than "Review Triage." See [§3.4](#34-triage-form-dataentryform) for the full finding.

| ID | Severity | Lens | Effort | Description |
|---|---|---|---|---|
| WV-1 | High | Flow | S | Adopt the 3-stage vocabulary across `WorkflowStageBanner`, `StageTabBar`, footer action buttons, and `LeftNavRail` tooltips. Centralize labels in `constants/stages.ts`. |
| WV-2 | High | Flow | M | Add a `preservation` branch to the stage rail that visually collapses Stage 2 when the case is a preservation request. |
| WV-3 | Med | Flow | S | Rename `FulfillmentWizard` heading to "Review & Plan" (subtitle: "Configure identifiers, services, and storage"). |
| WV-4 | Med | Flow | S | Replace "Generate Summary" + "Submit Collection Jobs" with a single "Submit to Collection" terminal action; if a summary preview is needed, move it inline (see [§3.9](#39-modals--dialogs) on the Fulfillment Summary modal). |

---

<a id="3-per-surface-findings"></a>
## 3. Per-surface findings

Findings are grouped per surface, then by lens (Flow / Airy / Fluent). Each finding is tagged `[Severity | Effort]`.

<a id="31-app-shell--appheader"></a>
### 3.1 App shell — AppHeader

**Surface state:** still on shadcn primitives (`./ui/button`, `./ui/dropdown-menu`, `./ui/badge`) with hardcoded hex Tailwind utilities. Adjacent to LeftNavRail which is pure Fluent v9. This is the single most-visible visual-coherence issue in the app.

#### Flow

- **[High | M]** Redesign Preview and Wireframes menu items set state but no modal is rendered. `App.tsx:77, 101, 373-376, 386-389` — `showWireframes` and `showRedesignPreview` are set from AppHeader but only `ComponentDocumentation` is conditionally rendered. Selecting these items appears to do nothing.
- **[Med | S]** Help menu contains dead-end items ("User Guide", "Support") with no handler, link, or disabled state. `AppHeader.tsx:137-144`. Either wire them or render disabled with "Coming soon."
- **[Med | S]** Settings + profile menu actions render as active controls but have no callbacks. `AppHeader.tsx:153-160, 197-210`. False affordances in the global shell.
- **[Med | S]** Help resources disappear after opening a case — the selected-case shell renders `<AppHeader />` without the help callbacks. `App.tsx:373-378, 447`. Users lose access to Component Documentation, Redesign Preview, and Wireframes when working in a case.

#### Airy

- **[Med | S]** Header padding (`px-6`) ignores the airy page gutter (`--page-gutter-x: 2rem`). Header content cannot align with page bodies that adopt the new gutter. `AppHeader.tsx:55-56`, `globals.css:74-77`.
- **[Low | S]** Header control spacing is ad hoc: `gap-2`, `h-10`, `h-9`, `px-3`. `AppHeader.tsx:94-170`. Should be Fluent `Toolbar` / `ToolbarButton`.
- **[Low | S]** Environment badge floats with bespoke spacing and shadow, visually competes with modals. `AppHeader.tsx:231-237`.

#### Fluent + React

- **[High | M]** Header is shadcn/Radix/Tailwind while the adjacent rail is Fluent v9. `AppHeader.tsx:2-22, 55-185` vs `LeftNavRail.tsx:38-51`. The shell looks stitched together. Specifically:
  - bg-white vs `tokens.colorNeutralBackground2`
  - `border-[#edebe9]` vs `tokens.colorNeutralStroke2`
  - `shadow-sm` Tailwind preset vs no elevation on rail
  - lucide-react icons vs `@fluentui/react-icons` Filled/Regular pairs
  - shadcn focus rings vs Fluent focus
  - `text-[15px]` / `text-[11px]` literal pixel sizes vs Fluent type tokens
- **[Med | M]** Focus treatment differs between header and rail. `button.tsx:7-8`, `LeftNavRailItem.tsx:53-58`, `globals.css:188-199`. Three distinct focus visuals on a single tab traverse.
- **[Med | S]** Icon families and weights diverge between shell surfaces (lucide vs Fluent regular/filled pairs).
- **[Low | S]** `onOpenCase` remains as a no-op API prop. `AppHeader.tsx:37-41, 50-52`. Remove or mark deprecated.

<a id="32-app-shell--leftnavrail"></a>
### 3.2 App shell — LeftNavRail

**Surface state:** Pure Fluent v9. Should serve as the migration reference for AppHeader.

#### Flow

- **[High | M]** Persisted `attorneyCaseView` can reload into an empty case view. `App.tsx:111-119, 402-407`. `attorneyCaseView` is a valid persisted `activeApp`, but the no-case branch passes `caseId={selectedCaseId ?? ""}`. A reload can land users in a detail workspace with no case context.
  - **Recommendation:** Do not persist detail-only apps, or coerce `attorneyCaseView` → `attorneyDashboard` when `selectedCaseId` is null.
- **[High | M]** Rail app switching bypasses case unsaved-change guards. `App.tsx:449-489, 546-564`, `LeftNavRail.tsx:84-99`. Workflow navigation uses guarded handlers; top-level rail clicks call `setActiveApp` directly. Switching away from Cases unmounts the case form branch, risking dirty-state loss.
- **[Med | S]** Attorney case view has no active rail item. `LeftNavRail.tsx:32-36, 91-99`, `App.tsx:399, 466`. Users lose orientation in the 48px rail when reviewing an attorney case.

#### Airy

- **[Low | S]** Rail dimensions (48px rail, 40px buttons) are repeated as literals. Future shell retunes will require hunting constants. Centralize as shell design constants.
- **[Low | S]** Rail vertical rhythm (`spacingVerticalS/XS`) is compact relative to Tier 4 — likely intentional for M365 rail style, but should be documented as an explicit exception.

#### Fluent + React

- **[Med | M]** Rail item is a hand-rolled button instead of Fluent `Button` / `ToolbarButton`. `LeftNavRailItem.tsx:29-58, 134-140`. Tokenized styling is good but interaction states, disabled behavior, and ARIA are manually recreated.
- **[Med | S]** Tooltip labelling may conflict with explicit unread aria-label. `LeftNavRailItem.tsx:126-137`. Use `relationship="description"` or include unread count in the tooltip label.

<a id="33-case-queue"></a>
### 3.3 Case Queue

**Surface state:** Mixed. Page chrome uses shadcn + ad-hoc Tailwind; some children use Fluent. The list itself is hand-rolled `div role="table"` rows, not Fluent `DataGrid`.

#### Flow

- **[High | M]** Detailed list defaults to a horizontally scrolling 11-column grid that exceeds the 1280px page container. `caseListColumns.ts:51-75`, `CaseQueue.tsx:923-929`. Key scan fields cannot fit without horizontal scroll.
  - **Recommendation:** Migrate to Fluent `DataGrid`; pin Case ID / Priority / Due Date; collapse low-value columns behind a details popover.
- **[High | S]** Persisted selected saved view is not applied on mount. `CaseQueue.tsx:370-418, 401-406, 457-466`. `currentViewId` is read from localStorage but `quickFilter`, `sortState`, `extraFilters` initialize independently. User's saved view is silently ignored.
- **[High | S]** Request Sub-Type filter has no options wired. `ExtraFilterChip.tsx:236-243`, `CaseQueue.tsx:873-885`. `requestSubTypeOptions` is never passed, so the control renders an empty list.
- **[Med | M]** Default card view hides bulk-selection affordances. `CaseQueue.tsx:241-249, 1043-1108`. Only list/preview rows render selection checkboxes — users defaulting to cards may never discover bulk actions.
- **[Med | S]** Priority sort first-click order contradicts intent. `caseListColumns.ts:131-140`. Comment says first click should surface urgent cases; ascending weight order puts Routine before Emergency.
- **[Med | S]** "Clear all" only clears extra filters, not quick filter / search / sort. `CaseQueue.tsx:887-893, 445-449`. Rename or actually clear.
- **[Med | S]** Sort state has no visible summary outside list headers. Card mode loses the sort context entirely.
- **[Med | S]** Selection silently dropped when filters change. `CaseQueue.tsx:599-625`. Hidden selected cases are removed with no user-visible explanation.
- **[Med | S]** Preview tooltip promises Esc but no Escape handling exists. `CaseQueuePreviewPane.tsx:271-283`.

#### Airy

- **[Med | S]** Queue body lacks vertical page padding token. `PageContainer` applies horizontal gutters only; the queue starts with `space-y` but no top/bottom `--section-pad`. `CaseQueue.tsx:734-737`, `PageContainer.tsx:49-54`.
- **[Low | S]** Toolbar controls remain compact (`h-8`, `text-xs`, `gap-3`) despite airy page direction. `CaseQueue.tsx:759-821`.
- **[Low | S]** Active-filter chip row pulls upward with `-mt-1`, fighting `--section-gap`. `CaseQueue.tsx:863-895`.

#### Fluent + React

- **[High | L]** Queue uses hand-rolled `div role="table"` instead of Fluent `DataGrid`. `CaseQueue.tsx:17-20, 923-970`. Selection, sorting, resizing, keyboard behavior, and virtualization are all custom.
- **[High | M]** Each row/card subscribes to correspondence notifications independently. `CaseQueueListRow.tsx:120-140`, `CaseCardHeader.tsx:59-70`, `CaseCardOperationalBadges.tsx:46-78`. Multiplies store subscriptions and memo work.
  - **Recommendation:** Call `useCorrespondenceNotifications()` once in `CaseQueue`, pass per-case counts, `React.memo` heavy rows.
- **[High | M]** Filters are shadcn/native, not Fluent form primitives. `ExtraFilterChip.tsx:14-21, 285-302`, `AdvancedFiltersPanel.tsx:15-21`.
- **[Med | M]** No virtualization or pagination — every filtered case mounts a row/card. `CaseQueue.tsx:953-1108`.
- **[Med | S]** Preview grid `aria-rowcount` is off by one. `CaseQueue.tsx:976-980`.
- **[Med | S]** Preview-mode bulk bar missing required `totalCount` / `onSelectAll` props. `CaseQueueBulkActionsBar.tsx:32-49`, `CaseQueue.tsx:985-991`.

#### Card content (sub-section)

- **[Med | M]** Card rows carry too many competing badges for sub-2-second scanning. `CaseCardOperationalBadges.tsx:80-145, 268-411`. Limit always-visible badges to priority/SLA + one highest-risk signal; move the rest to hover/secondary slot.
- **[Med | S]** Enterprise signal is duplicated in both operational badges AND details. `CaseCardOperationalBadges.tsx:238-265`, `CaseCardDetails.tsx:171-188`.
- **[Low | S]** Card action buttons use heavy gradients/shadows that dominate row scan. `CaseCardActions.tsx:42-58, 63-79`.

<a id="34-triage-form-dataentryform"></a>
### 3.4 Triage form (DataEntryForm)

**Surface state:** Outer page wrapper is airy + uses `PageContainer`. Inner fields are still shadcn / custom controls with compressed spacing. The biggest single component in the codebase (~24KB).

#### Flow

- **[High | M]** Submit errors do not jump to the first invalid field. `useCaseWorkflow.ts:59-70`, `DataEntryForm.tsx:4485-4514`. Validation sets inline errors and shows a generic bottom status/toast, but long accordion sections can hide the failing field.
  - **Recommendation:** Render an error summary with section links at the top; expand and focus the first invalid field.
- **[High | S]** Sidebar step changes skip scroll/focus restoration. `DataEntryForm.tsx:986-991`, `AccordionStepper.tsx:127-130`. External `requestedStepKey` bypasses the stepper's `goTo()` scroll behavior.
- **[High | M]** "Open IDs" replaces the case form entirely with a wizard-style overlay. `IdentifierPanel.tsx:118-127`, `DataEntryForm.tsx:2475-2478`. During Triage stage, opening IDs sets fulfillment mode (`DataEntryForm.tsx:2314-2321`). Leaks Stage 2 affordances into Stage 1.
  - **Recommendation:** Use a resizable side panel or split view (the `Resizable` dependency is already imported at `IdentifierPanel.tsx:1-4` but unused). If Open IDs is meant to be a Stage 1 identifier-review affordance, scope it down; if it's a hand-off to Stage 2, label the action and treat triage as complete.
- **[High | M]** Preservation flow is invisible. See [§2](#2-workflow-vocabulary-alignment). Preservation requests run the full triage → wizard → collection path; the wizard then has a "skip" gate. Should be a visible branch in the stage rail.
- **[Med | M]** Identifier editing/checking is duplicated across inline `IdentifierTable` and wizard Step 1. `DataEntryForm.tsx:4326-4352`, `IdentifierPanel.tsx:128-151`.
- **[Med | S]** Rejection reason renders twice with the same field id. `DataEntryForm.tsx:3027-3054, 3175-3204`.
- **[Med | M]** Primary action language forks by stage. See [§2 WV-1](#2-workflow-vocabulary-alignment).
- **[Med | S]** Conditional reveals cause layout jumps without animation or focus move. `DataEntryForm.tsx:2863-2886, 3423-3481`.
- **[Low | S]** Scroll-to-panel helpers do not move focus. `DataEntryForm.tsx:442-491`. Keyboard / screen-reader focus stays behind.

#### Airy

- **[High | M]** Outer spacing is airy; inner fields remain compressed. `globals.css:74-77` defines `--section-pad: 1.5rem` but field grids use `gap-3`, `space-y-1.5`, `h-8`. `DataEntryForm.tsx:2671-2734`. This is the most concrete instance of the cross-cutting "airy lives only at page-shell depth" theme.
  - **Note:** This directly contradicts `SPACING_OPTIMIZATION_SUMMARY.md`, which COMPRESSED DataEntryForm spacing earlier. The compressions and the airy direction fight inside the same file. See [§4 Theme 3](#theme-3-airy-density-tokens--shallow-adoption-and-direct-conflict).
- **[Med | S]** Spacing comments are stale — say the token defaults to 16px when globals now use 24px/32px. `DataEntryForm.tsx:2626-2631`.
- **[Med | S]** Timeline metadata is too packed (dates, separators, errors in one inline row). `DataEntryForm.tsx:2892-2904`.
- **[Med | S]** Long LE narrative reads as a gray wall (single `p-3` pre-wrap box). `DataEntryForm.tsx:3786-3799`.

#### Fluent + React

- **[High | L]** Triage form is still mostly shadcn/custom controls. `DataEntryForm.tsx:4-9, 131-149`. Core fields use `./ui/*`, not Fluent `Field`, `Input`, `Combobox`, `Textarea`.
- **[Med | M]** `DataEntryForm` owns too much UI state (disclosure / panel / edit states all at root). `DataEntryForm.tsx:349-381, 1005-1042`. Should be scoped to child components / reducers.

#### Sticky header & case summary (sub-section)

- **[High | M]** Sticky header does not shrink on scroll. `StickyCaseHeader.tsx:156-228`, `CaseHeaderSummary.tsx:433-459`. Banner + summary + property grid + (optional) stage tabs can consume significant viewport.
- **[Med | S]** "Sticky" depends on nested scroll layout, not CSS `position: sticky`. `DataEntryForm.tsx:2291-2292, 2488-2497`. Brittle.
- **[Med | M]** Header actions are tiny (`h-7 text-xs`) for primary workflow controls (Save / Escalate / Resolve). `WorkflowStageBanner.tsx:268-327`.

<a id="35-fulfillment-wizard"></a>
### 3.5 Fulfillment Wizard

**Surface state:** Step 1 + 3 + plan review are increasingly Fluent. Step 2 + wizard shell still shadcn. The strongest Fluent reference in the slice is `PlanReviewTable`.

#### Flow

- **[High | S]** Step change focuses the scroll region, not the first field. `FulfillmentWizard.tsx:309-318, 792-799`. Keyboard users still need to navigate into content after each step.
- **[High | S]** Step change does not explicitly reset scroll. Reused scroll container may retain mid-step scroll position.
- **[High | M]** External step navigation bypasses gates. `FulfillmentWizard.tsx:299-307, 400-444`. `requestedStepKey` can set Step 3 directly; `canProceed` only disables the Next button.
- **[High | M]** Step 2 gate is too permissive. `FulfillmentWizard.tsx:405-429`, `UnifiedIdentifiersView.tsx:169-184`. Next only requires *some* service configured, while per-identifier blockers live in row banners.
  - **Recommendation:** Aggregate blockers into `canProceed` or require explicit acknowledge/skip.
- **[High | M]** Step 2 keeps hidden legacy flows behind `false &&`. `Step2ServicesConfiguration.tsx:1112-1132, 1750-1758`. Reframed UnifiedIdentifiersView is live but legacy branches are dead code that confuse search and edits.
- **[Med | M]** Account check has multiple entry points with different implementations. `FulfillmentWizard.tsx:1023-1070, 1297-1359`, `Step2ServicesConfiguration.tsx:1627-1629`.
- **[Med | S]** Step 3 allows submit without storage location. `FulfillmentWizard.tsx:1485-1518, 930-939`. Warning explains the degradation but final action remains enabled.
- **[Med | S]** Progress rail is read-only. `FulfillmentWizard.tsx:690-743`. Steps show status but cannot be clicked.
- **[Med | S]** Disabled Next has no visible reason — users see disabled button but not the blocking condition.
- **[Med | S]** Terminal authorization banner says read-only, but Step 2 editing controls remain visually active. `AuthorizationStatusBanner.tsx:79-104`, `Step2ServicesConfiguration.tsx:1592-1607`.
- **[Med | S]** Footer lacks a close/cancel action — only the top-right X. `FulfillmentWizard.tsx:746-779, 878-943`.

#### Airy

- **[High | M]** Step 2 hard-codes compact spacing (`space-y-4`, `p-4`) instead of airy tokens. `Step2ServicesConfiguration.tsx:1095-1117, 1760-1848`. Tokenize before any further density work.
- **[Med | M]** Plan review is 10 columns inside the wizard panel — horizontal scanning burden. `PlanReviewTable.tsx:58-75, 460-478`.
- **[Med | M]** Category/date rows use 10px labels and compact date inputs. `ServiceCategoryTable.tsx:440-449, 600-710`.
- **[Med | S]** Wizard chrome is not tokenized — header/footer use fixed px padding, body uses `p-6`. `FulfillmentWizard.tsx:668-690, 878-879`.

#### Fluent + React

- **[Med | L]** Wizard root is shadcn while later steps are Fluent — visual language shifts mid-flow. `FulfillmentWizard.tsx:3-6` vs `PlanReviewTable.tsx:10-19`.
- **[Med | M]** Step 2 is mixed shadcn + Fluent in one surface. `Step2ServicesConfiguration.tsx:7-32`, `BulkActionsToolbar.tsx:11-31`.
- **[Med | M]** Service selector remains hand-rolled. `ServiceDropdownSelector.tsx:15-35, 216-249`. Duplicates Fluent Accordion + Dialog patterns.

<a id="36-collection-tracker"></a>
### 3.6 Collection Tracker

**Surface state:** Most visible chrome is still shadcn. Pipeline matrix is hidden in a modal. Sidebar navigation is exploratory and partially wired.

#### Flow

- **[High | M]** Four readiness states are modeled in the sidebar (Needs Action / Submit / Package & Deliver / Complete), but only two are visible in-page tabs (By Identifier / All). `CollectionTracker.tsx:3280-3313`, `CollectionSidebarNav.tsx:15-45`.
  - **Note:** The 4-step rail is **exploratory and will change** (per product owner). Don't lock the UI to it yet. But the *current state* is jarring: a rail that promises four phases next to a body that exposes only two views.
  - **Recommendation:** Either (a) ship the 4-phase model fully wired with the same 4 phases in-page, or (b) hide the partial rail until the model is locked.
- **[High | M]** "Package & Deliver" rail step has no destination. `CollectionSidebarNav.tsx:85-90, 118-120`. Clicking it only toggles active state, keeps the current filter, doesn't scroll to package/delivery actions.
- **[High | M]** Pipeline matrix scan requires opening a modal. `CollectionTracker.tsx:2624-2633, 4745-4759`. Users must know to click "Status Matrix" to see identifier × service blockers — the highest-value scan view is hidden.
  - **Recommendation:** Inline a compact matrix preview OR a persistent "blocking services" strip in the summary card.
- **[High | M]** Matrix is grouped by identifier, not truly cross-identifier. `PipelineStatusMatrix.tsx:347-370, 373-426`. Each identifier gets its own table — can't compare the same service across identifiers.
- **[High | M]** Manual collection has two divergent implementations. `ManualCollectionForm.tsx:280-300`, `CollectionTracker.tsx:3366-3391, 4687-4697`. The full `ManualCollectionForm` exists but `CollectionTracker` uses `ManualServiceCategories` inline. Consolidate or delete the unused.
- **[Med | S]** Defaulting to `by-identifier` is unexplained. `App.tsx:148-150`, `CollectionTracker.tsx:4124-4134`. Add a one-line "Recommended view: resolve each identifier end-to-end" hint near the tabs.
- **[Med | M]** Empty/no-progress states are filter-specific, not collection-wide. `CollectionTracker.tsx:4713-4740`. New users may see a dense pipeline shell with no clear first action.
- **[Med | S]** Sidebar completion stats are not wired — `pipelineStats` is never passed in. `CollectionSidebarNav.tsx:93-106`, `App.tsx:573-578`.
- **[Med | S]** Status values inconsistent across manual components. `ManualCollectionForm.tsx:598-600` uses "In Progress"; `ManualServiceCategories.tsx:472-475` uses "Started" while showing "In Progress."

#### Airy

- **[Med | S]** Collection body bypasses spacing tokens — `py-5 space-y-5` instead of `--section-gap`. `CollectionTracker.tsx:2514-2522`.
- **[Med | M]** Summary card combines too many chrome jobs (summary + report/export + block delivery + edit scope + alerts + visualization). `CollectionTracker.tsx:2609-2710, 2754-2787`. Reads as ops console, not calm progress overview.
- **[Med | S]** Matrix dialog uses negative horizontal margins to maximize table area, fighting page gutter alignment. `CollectionTracker.tsx:4747-4759`.
- **[Med | M]** Matrix lacks sticky first-column anchors. `PipelineStatusMatrix.tsx:428-439, 493-500`. Long category scans lose row context horizontally.
- **[Med | M]** Auto-expanding all pending manual rows overwhelms default view. `ManualServiceCategories.tsx:119-143`. Auto-expand only the first pending; show "N more need input."
- **[Med | S]** Manual + automated rows blend within By Identifier — only amber styling differentiates. `CollectionTracker.tsx:4439-4461, 4687-4697`. Add sub-section headers.

#### Fluent + React

- **[Med | M]** Page is mid-migration in the most visible chrome — Fluent imports beside shadcn Card/Button in summary/action area. `CollectionTracker.tsx:68-87, 2610-2641`.
- **[Med | M]** Matrix uses native table rather than Fluent `Table`/`DataGrid`. `PipelineStatusMatrix.tsx:428-439`. Document the accessibility exception or migrate.
- **[Med | S]** Status dots are custom divs with `title` only. `PipelineStatusMatrix.tsx:112-120`. Use Fluent `Badge` + `Tooltip` with visible text for failed/blocking states.
- **[Med | M]** Manual forms remain shadcn-first — `Button`, `Select`, `Input`, `Label`, `Badge` all shadcn. `ManualCollectionForm.tsx:2-16`, `ManualServiceCategories.tsx:2-14`.

#### WorkflowSidebar / sub-nav (sub-section)

- **[Med | S]** WorkflowSidebar is denser than current airy direction. `WorkflowSidebar.tsx:73-117`. 256px rail squeezes three stages into a compact horizontal mini-stepper. Prefer the `StageTabBar` consistently.
- **[Low | S]** Substep descriptions are 10px and truncate. `WorkflowSidebar.tsx:168-184`. Move to tooltips or use larger secondary text.
- **[Med | M]** Sidebar navigation is hand-rolled, not Fluent `Nav`/`Tree`. `WorkflowSidebar.tsx:15-26, 145-199`.
- **[Low | S]** `hasPrepareDeliverActive` is declared but unused. `CollectionSidebarNav.tsx:53-55, 79-80`. Dead API.

<a id="37-attorney-dashboard--review-workspace"></a>
### 3.7 Attorney Dashboard & Review Workspace

**Surface state:** `AttorneyReviewWorkspace` is the **strongest Fluent-aligned surface in the slice** — use as the migration reference. `AttorneyDashboard` is still shadcn-heavy.

#### Flow

- **[High | M]** Dashboard context is partly lost on case open/back. `App.tsx:390-407`, `AttorneyDashboard.tsx:315-320, 368-374`. Opening a case unmounts the dashboard; quick filter and view mode persist but search and extra filters are local state.
- **[High | M]** Per-identifier escalations can hide the actual action surface. `AttorneyReviewWorkspace.tsx:531-563`, `AttorneyReviewPanel.tsx:266-279`. Case-level panel renders, but per-identifier panels only appear when IdentifierTable rows expand. Attorneys may miss which rows need action.
  - **Recommendation:** Add "N identifiers need attorney review" summary with jump/expand-all actions.
- **[Med | S]** Default quick filter is "All," not the most actionable queue. `AttorneyDashboard.tsx:172-197, 199-212`. Default to Unassigned when count > 0, otherwise My cases, then All.
- **[Med | S]** Back navigation lacks breadcrumb / context. `AttorneyReviewWorkspace.tsx:441-459`. No breadcrumb or preserved queue label.
- **[Med | M]** Correspondence has an unused read-only snapshot but workspace mounts the writeable panel. `CorrespondenceHubSnapshot.tsx:1-17`, `AttorneyReviewWorkspace.tsx:635-650`. Blurs read-only review with composition.

#### Airy

- **[Med | S]** Dashboard uses hard-coded gutters (`px-6 py-6 max-w-*`) instead of `PageContainer`. `AttorneyDashboard.tsx:621-626`.
- **[Low | S]** Toolbar rows visually busy — quick filters + view toggle + search + saved views + add filter + chips + clear all stack tightly. Use Fluent `Toolbar` with overflow.
- **[Low | S]** Workspace mostly breathes well — keep as pattern target. `AttorneyReviewWorkspace.tsx:152-167`.
- **[Med | M]** Right pane can over-compress reading column (560–880px wide while left pane remains active). `AttorneyReviewWorkspace.tsx:185-187, 591-621`.
- **[Med | M]** Tri-pane summary is dense for a reading-first page. `EnterpriseTriPaneSummary.tsx:359-414, 420-580`.

#### Fluent + React

- **[Low | S]** Workspace is the migration reference — Fluent components + Griffel + tokens consistently. `AttorneyReviewWorkspace.tsx:19-25`, `EnterpriseContextSection.tsx:14-26`.
- **[Med | M]** Dashboard chrome still shadcn — cards / badges / buttons / input. `AttorneyDashboard.tsx:20-23`. Makes the dashboard feel like a different product than the workspace it opens.
- **[Med | S]** Empty state not tailored to search / extra filters. `AttorneyDashboard.tsx:776-809`. Says no cases are flagged when filters or search simply hide matches.
- **[Med | S]** Workspace top-bar actions are custom buttons, not Fluent `Toolbar`. `AttorneyReviewWorkspace.tsx:460-505`. Three equal-width reference toggles compete visually.
- **[Med | M]** `AttorneyActionDialog` remains shadcn. `AttorneyReviewPanel.tsx:21-22, 530-548`. Style shift at the most consequential action moment.

<a id="38-notifications-page"></a>
### 3.8 Notifications page

**Surface state:** Mostly shadcn. Inside `FluentProvider` but does not use Fluent primitives. Read state is module-level in-memory (not persisted).

#### Flow

- **[High | M]** Notification click loses item context. `NotificationsPage.tsx:54-59, 150-167`, `App.tsx:411-414`. Rows only pass `caseId`; the case opens at default Triage stage with no notification / item id or correspondence panel context.
  - **Recommendation:** Pass `item.id`, open the Correspondence Hub, focus the item, provide "Back to notifications" route state.
- **[High | M]** No mark-read or triage actions on the notifications page. `NotificationsPage.tsx:196-207, 272-283`, `CorrespondenceBanner.tsx:123-126`. The in-case banner supports "Mark all read"; the dedicated notifications surface does not.
- **[High | M]** Read/unread state is not session-persistent. `correspondenceStore.ts:27-50`, `DataEntryForm.tsx:1929-1935`. Module-level `Map` seeded at import; read mutations update memory only.
- **[Med | S]** List can show fewer items than the unread total without explanation. `App.tsx:132-135`, `useCorrespondenceNotifications.ts:203-207`. Add "Showing latest N of M" and paging.

#### Airy

- **[Med | S]** Notifications page does not use the airy page container/tokens. `NotificationsPage.tsx:95-129`. `max-w-3xl px-6 py-6 space-y-4` instead of shared tokens.
- **[Med | S]** Notification rows too compact for a reading surface. `NotificationsPage.tsx:163-180, 244-270`. `px-3 py-2` rows and `p-3` cards compress subject/counterparty/time.
- **[Low | S]** Empty state visually sparse but not action-oriented. `NotificationsPage.tsx:131-139`.

#### Fluent + React

- **[High | M]** Uses shadcn cards/buttons and hand-rolled tables. `NotificationsPage.tsx:13-17, 144-209`. Inside `FluentProvider` but no Fluent `List`, `DataGrid`, `Toolbar`, or `MessageBar`.
- **[Med | S]** Queue view toggle is reused with a permanently disabled preview option — and the shortcut copy says preview exists. `NotificationsPage.tsx:123-127`, `CaseQueueViewToggle.tsx:40-44`.

<a id="39-modals--dialogs"></a>
### 3.9 Modals & dialogs

#### Fulfillment Summary modal (highest-impact finding in this section)

- **[High | L]** Fulfillment Summary is too large and task-heavy for a modal. `CaseDialogs.tsx:263-268, 286-690`. 1400px scrollable review workspace with nested cards, expandable sections, document side-panel coordination, and submit actions. Users lose page context and manage a modal as if it were a full page. **This is #4 of the [Executive Summary](#1-executive-summary).**
  - **Recommendation:** Convert to an inline review step / page, or to a Fluent `Drawer` with a sticky command bar. If this is meant to replace the deprecated "Generate Summary" action ([§2 WV-4](#2-workflow-vocabulary-alignment)), make it the final pre-submit screen of the Review & Plan stage rather than a separate modal.
- **[High | M]** Escape can close multiple overlay layers at once. `CaseDialogs.tsx:269-274`, `useDocumentViewer.ts:50-55`, `DocumentViewerPanel.tsx:124-130`. Summary prevents pointer outside but the document viewer listens globally for Escape. Radix Dialog may also process Escape.
- **[Med | M]** Actions are buried at the bottom of long scroll content. `CaseDialogs.tsx:654-689`. Use sticky `DialogActions` or persistent command bar.
- **[Med | S]** Document-panel layout uses hardcoded 250px offset assumption. `CaseDialogs.tsx:264-268`, `DataEntryForm.tsx:2420-2423`. Panel width is dynamic; modal can misalign.
- **[Med | M]** Uses old compact card spacing inside a large modal. `CaseDialogs.tsx:286-315, 411-414, 478-504`. `p-4`, `gap-4`, `space-y-4` throughout — fights `--section-pad`/`--section-gap`.
- **[Med | M]** Expensive derived data work on every render. `CaseDialogs.tsx:236-259, 371-398`. Stats and service entries recompute on every expand/collapse toggle. Large cases will feel sluggish. Use `useMemo`.
- **[Med | M]** Mutates parent expansion state through a raw setter prop. `CaseDialogs.tsx:219-220, 233-234, 461-464`.

#### KeyboardShortcutsModal

- **[Med | S]** Dialog close callback ignores the `open` value. `KeyboardShortcutsModal.tsx:51`. Works today (no trigger) but fragile.
- **[Med | M]** Focus restore is undefined for keyboard-opened modal. `App.tsx:157-172`, `KeyboardShortcutsModal.tsx:51-52`. `?` shortcut opens from arbitrary focus; closing may not return users.
- **[Med | S]** Shortcut list advertises future or possibly inactive commands (`Ctrl+K` marked future). `KeyboardShortcutsModal.tsx:20-24`. Show only active or visually mark "Coming soon."
- **[Low | S]** "Press ? anytime" overstates global shortcut behavior — handler only suppresses inputs and textareas. `KeyboardShortcutsModal.tsx:94-98`, `App.tsx:161-169`.
- **[Low | S]** No explicit "Close" action in footer.
- **[Med | S]** `<kbd>` styling hardcodes borders / shadows / colors. `KeyboardShortcutsModal.tsx:78, 97`. Won't adapt with Fluent theme.
- **[High | M]** Remains shadcn `Dialog`, lucide icons, hardcoded colors. Migrate to Fluent v9 primitives.

#### DataRecoveryDialog

- **[Med | S]** Alert dialog has no `onOpenChange` escape/cancel path. `DataRecoveryDialog.tsx:29`. Esc close attempts can't notify parent. Conflicts with the app's shortcut copy.
- **[Med | S]** "Start Fresh" is semantically the cancel action but destructively discards data. `DataRecoveryDialog.tsx:51-65`. Rename to "Discard draft and start fresh" or make Recover the default.
- **[Med | M]** Mount-triggered dialog has no focus return target. `DataEntryForm.tsx:1121-1134`, `DataRecoveryDialog.tsx:29-30`.
- **[Low | S]** Can show "Last saved: Unknown time" — weakens recovery confidence.
- **[Low | S]** Relative time computed once during render — won't update if dialog stays open.
- **[High | M]** Remains shadcn `AlertDialog` with lucide icons and hex colors. Migrate.

#### CaseDialogs (UnsavedChanges + Agent Removal)

- **[Med | S]** Unsaved-change dismissals may not clear pending navigation. `CaseDialogs.tsx:104-116`, `DataEntryForm.tsx:4779-4784`. Cancel calls `cancelPendingNavigation`, but `onOpenChange` only sets open state. Esc bypasses cancel cleanup.
- **[Med | S]** Mix of `AlertDialogCancel` and plain `Button` semantics in actions. `CaseDialogs.tsx:115-142`.
- **[Low | S]** Agent removal has no in-progress/error state.
- **[Med | M]** Dialog title hierarchy inconsistent (default `text-lg`, explicit `text-xl`, `text-2xl`). `CaseDialogs.tsx:63, 107, 162, 277`.
- **[Med | M]** Radius differs between dialog (`rounded-lg`) and nested cards (`rounded-xl`). Pick Fluent radius tokens per surface level.
- **[High | M]** Hardcoded colors dominate modal content. `CaseDialogs.tsx:64-77, 121-128, 277-293, 454-460, 512-540`. Brand, warning, destructive, neutral, badge, and border colors are literal hex.

#### Autosave & save UX

- **[High | S]** `AutosaveIndicator` is not actually surfaced. `AutosaveIndicator.tsx:29-49`, `DataEntryForm.tsx:1089-1116`. Component exists, but the form routes save state through the sticky header instead. Either render it near primary actions or remove it.
- **[Med | S]** Manual save and autosave timestamps can diverge. `DataEntryForm.tsx:1089-1116`, `WorkflowStageBanner.tsx:284-354`. Header "Saved" reflects manual dirty snapshot; autosave is local recovery. Separate labels: "Changes saved" vs "Draft backed up locally."
- **[Med | S]** Autosave "saving" state is nearly invisible. `useAutosave.ts:30-50`. localStorage save toggles `isSaving` true/false in the same synchronous call. Remove spinner or debounce.
- **[Med | M]** Bottom bar omits save/dirty status — users at the bottom see validation and submit, but not save state.
- **[Low | S]** Unsaved navigation guard copy should align with the dialog button standard. Standardize on "Save draft" / "Discard changes" / "Continue."

---

<a id="4-cross-cutting-themes"></a>
## 4. Cross-cutting themes

### Theme 1: Triple token system that already drifts

Three parallel color/spacing systems exist:

1. **CSS vars in `globals.css:6-87`** — `--fluent-blue: #0078d4`, `--fluent-neutral-grey-{10..110}`, `--fluent-red`, `--fluent-orange`, `--fluent-green`, plus shadcn-style aliases (`--background`, `--foreground`, `--primary`, `--secondary`).
2. **Tailwind v4 `@theme inline` block** in `globals.css:127-166` re-exports those vars as `--color-*` tokens for utility classes.
3. **Fluent v9 `webLightTheme`** mounted UNMODIFIED at `App.tsx:359, 438` and a *second time* (nested) at `CorrespondencePanel.tsx:635`. No `createLightTheme(brandVariants)` override.

**The drift is real today, not theoretical:** `webLightTheme`'s default brand is Microsoft Communication Blue (`#0F6CBD`); the CSS uses `#0078d4`. Fluent components and Tailwind components render different blues in the same viewport.

Additionally, hardcoded hex usage is endemic — a single ripgrep for `#0078d4|#106ebe|#323130|#605e5c|#edebe9|#f3f2f1` returned 200+ KB of matches across the codebase.

**[Severity: High | Effort: M]** Generate a `theme.ts` that emits CSS vars + a Fluent `BrandVariants` object from one source of truth. Make `createLightTheme(brand)` the input to `FluentProvider`.

### Theme 2: shadcn → Fluent migration drift, with shell-coherence symptom

Numbers from the current tree:
- ~150 files import from `./ui/*` (shadcn)
- ~80 files import from `@fluentui/react-components`
- Many files import both (mid-migration)
- `MIGRATION_PROGRESS.md` tracks 66 files still on shadcn primitives
- Most-imported shadcn primitives: `badge` (46), `button` (40), `tooltip` (33), `card` (22)

**The shell-level symptom** (covered in [§3.1](#31-app-shell--appheader)) is the highest-visibility instance: `AppHeader` and `LeftNavRail` live adjacent at the top-left of every page and look like products from two different companies.

**[Severity: High | Effort: M]** Migrate AppHeader as the first beneficiary of Theme 1's unified tokens.

<a id="theme-3-airy-density-tokens--shallow-adoption-and-direct-conflict"></a>
### Theme 3: Airy density tokens — shallow adoption, and direct conflict with prior compression pass

`globals.css:73-77` defines five "Tier 4 airy density" tokens:
- `--page-max-w: 1280px`
- `--page-gutter-x: 2rem` (Fluent `spacingHorizontalXXXL`)
- `--section-gap: 1.5rem` (Fluent `spacingVerticalXXL`)
- `--section-pad: 1.5rem`
- `--table-row-pad: 0.5rem` (stays tight on purpose)

**Adoption:** Only **7 of ~200 files** reference any of these tokens — `CaseQueue.tsx`, `CollectionTracker.tsx`, `DataEntryForm.tsx`, `FulfillmentWizard.tsx`, `layout/PageContainer.tsx`, `layout/StageTabBar.tsx`, plus the definition in `globals.css`. Sub-components hardcode Tailwind padding (`p-4`, `space-y-2`, `gap-3`).

**Direct conflict with prior compression pass:** `SPACING_OPTIMIZATION_SUMMARY.md` (older work) actively COMPRESSED spacing — e.g. DataEntryForm `pb-32 → pb-16`, primary cards `p-8 → p-6`, `space-y-6 → p-5`. That older compression now **fights** the airy direction inside the very files that DID adopt the new tokens.

**[Severity: High | Effort: L]** Per-component touch. Three sub-recommendations:
1. Lint rule that forbids raw Tailwind padding inside files that import `layout/PageContainer.tsx`.
2. Promote `--section-pad` / `--section-gap` to Griffel mixins so Fluent v9 components can consume the same tokens.
3. Revisit each `SPACING_OPTIMIZATION_SUMMARY.md` compression case-by-case; restore breathing room where the airy tokens now apply.

### Theme 4: Fluent motion — essentially unused

- Files using `tokens.curve*` / `tokens.duration*`: **3** (`LeftNavRailItem.tsx`, `FormsLibrarySection.tsx`, `fulfillment-wizard/SplitPane.tsx`)
- Files using Tailwind `transition-*` / `animate-*` / `duration-*`: **~100**

The Fluent motion system (`durationFast`, `durationNormal`, `durationSlow` × `curveAccelerate*`, `curveDecelerate*`, `curveLinear`) is documented but ignored. Animations on hover, modal open, accordion expand, stepper transitions are all ad-hoc CSS with hand-picked durations. Some surfaces snap-cut. The result is inconsistent — some buttons feel "snappy," others "sticky" without rhyme or reason.

**[Severity: Medium | Effort: M]** Define a small set of motion mixins (`motionEnter`, `motionExit`, `motionHover`) that wrap Fluent's tokens. Require all `transition-*` usages migrate when their parent component is touched.

### Theme 5: Type ramp — zero Fluent adoption

- Files using `tokens.fontSize*` / Fluent text components (`Title1`, `Body1`, `Caption1`): **0**
- Files using raw Tailwind `text-{xs,sm,base,lg,xl,2xl,3xl}`: **50+**

Plus `globals.css:219-267` defines element-level type using `var(--text-2xl)` (Tailwind scale), giving a THIRD type system that no Fluent surface uses.

**Concrete symptom:** `AppHeader.tsx:83-86` uses literal pixel sizes — `text-[15px]` for the title, `text-[11px]` for the subtitle. Neither is on the Tailwind scale OR the Fluent ramp. Below `fontSizeBase200` (12px) Fluent considers text too small for body content.

**[Severity: Medium | Effort: M]** Adopt Fluent v9 text components (`Title3`, `Subtitle2`, `Body1Strong`, `Caption1`) in new code; map remaining Tailwind text classes onto Fluent equivalents as files are touched.

### Theme 6: Theme provider nesting risk

`CorrespondencePanel.tsx:635-924` mounts a **second** `<FluentProvider theme={webLightTheme}>` inside the already-wrapped App tree. While Fluent supports this for portals, having two providers is fragile: if the App later switches to a custom brand override (Theme 1's recommendation), this nested provider will continue using `webLightTheme` and render in the wrong brand color. The comment on lines 11-12 says it's defensive ("when mounted under a non-Fluent parent"), but the panel mounts inside the App tree, which IS Fluent-wrapped.

**[Severity: Low today / High once Theme 1 lands | Effort: S]** Remove the inner provider; if portal mirroring is needed, accept `theme` as an optional prop.

### Theme 7: Focus ring inconsistency

`globals.css:188-200` defines TWO focus-visible styles:
- Default: `outline: 2px solid var(--fluent-blue); outline-offset: 2px; box-shadow: 0 0 0 4px rgba(0, 120, 212, 0.15);`
- Inside `[role="dialog"]`: same with `rgba(0, 120, 212, 0.2)` (4-pt opacity difference)

Meanwhile, Fluent v9 components in LeftNavRail / fluent-extensions / etc. use Fluent's own focus indicator. **Three distinct focus treatments on a single tab traverse.**

**[Severity: Medium | Effort: S]** Delete the custom rules; let `tokens.colorStrokeFocus*` drive it. shadcn buttons can adopt a `.fluent-focus` recipe that matches.

### Theme 8: Page-scroll model is brittle

`globals.css:178` sets `body { overflow: hidden }`; `globals.css:185, 274` set `html { overflow: hidden }`. Combined with `globals.css:183 scroll-behavior: smooth` (dead code under `overflow: hidden`), the page model locks scroll inside internal containers.

This means every scrolling region needs explicit overflow management — easy to forget on a new view. Also disables anchor-link scrolling, browser find-in-page scroll-into-view, and momentum scroll on touch.

**[Severity: Medium | Effort: L]** Audit which scrolling pattern is actually required (probably "app shell stays put, body scrolls"); enforce it via a single `<AppShell>` wrapper that owns the scroll container instead of locking the whole document.

---

<a id="5-recommended-sequencing"></a>
## 5. Recommended sequencing

The five executive opportunities interlock. Suggested order:

```
Week 1: Vocabulary lock (WV-1..WV-4)            ← cheapest, unblocks copy in every later step
   │
   ├── Week 2-3: Token consolidation (Theme 1)  ← unlocks visual coherence
   │      │
   │      └── Week 4-5: AppHeader migration     ← mechanical once tokens unified
   │             │
   │             └── Week 6+: shadcn → Fluent rolling migration per MIGRATION_PROGRESS
   │
   ├── Week 2-3 (parallel): Fulfillment Summary modal → inline review surface
   │      └── Combine with "Submit to Collection" terminal action rename (WV-4)
   │
   └── Week 4+: Airy density adoption push (Theme 3)
          │
          ├── Lint rule: forbid raw Tailwind padding inside PageContainer'd files
          ├── Griffel mixins for --section-pad / --section-gap
          └── Reconcile SPACING_OPTIMIZATION_SUMMARY compressions case-by-case
```

**Why this order:**
- **Vocabulary first** because it's a one-week copy + state-machine pass that immediately reduces user confusion. Every later stage finding becomes clearer when the vocabulary is locked.
- **Tokens before header migration** because attempting AppHeader → Fluent v9 today would just bake the `#0078d4` vs `#0F6CBD` drift into Fluent components.
- **Fulfillment Summary in parallel** because the modal-to-inline conversion doesn't depend on tokens, and it lets you ship the new "Submit to Collection" terminal action from the inline surface — combining WV-4's copy change with a real flow change.
- **Airy density last** because it's per-component touch; doing it before token consolidation means rewriting twice (once with Tailwind padding, once with Griffel + tokens).

---

<a id="6-delta-vs-existing-docs"></a>
## 6. Delta vs existing docs

This evaluation is intentionally a delta — overlap with the 41 existing UX docs is noted here so future readers don't re-fight settled debates.

| Existing doc | Status | Where this report overlaps / extends |
|---|---|---|
| `UX_IMPROVEMENTS_SUMMARY.md` | Done — `validated-*` components + `useFormValidation` hook | Not relitigated. This report's "Submit errors don't jump to first invalid field" finding (§3.4) is downstream of that work and uses the hook. |
| `UX_SIMPLIFICATION_RECOMMENDATIONS.md` | 12 click-reduction tactics already documented | Not relitigated. Out of scope here. |
| `SPACING_OPTIMIZATION_SUMMARY.md` | Older compression pass (compressed `px-8 → px-6`, etc.) | **In direct tension with the current Tier 4 airy direction** (Theme 3). This report names that tension and recommends per-component reconciliation. |
| `COLORBLIND_ACCESSIBILITY_REVIEW.md` | Separate audit | Not re-covered. This report's only color-related findings are about token drift between Fluent and CSS, not contrast. |
| `CARD_BASED_LAYOUT_COMPLETE.md` | Card queue redesign documented | Card view findings (§3.3) flag where current implementation diverges from the plan — e.g., card view hides bulk-selection affordances despite the plan documenting them. |
| `QUEUE_CARD_REDESIGN_PLAN.md` | Queue redesign plan | Same as above. |
| `FULFILLMENT_WIZARD_REFACTORING_COMPLETE.md` | Refactor done | Findings in §3.5 focus on the *resulting* UX, not the refactor. The "Step 2 keeps hidden legacy flows behind `false &&`" finding is a cleanup item from that refactor. |
| `MIGRATION_PROGRESS.md` | Authoritative shadcn → Fluent v9 state | This report uses it as ground truth for migration counts. The recommended sequencing (§5) is consistent with it. |

---

<a id="7-out-of-scope-notes"></a>
## 7. Out-of-scope notes

Deliberately *not* covered in this evaluation:

- **Form-level validation patterns** — `UX_IMPROVEMENTS_SUMMARY.md` already covers the `validated-*` components and `useFormValidation` hook. Recommendations land there.
- **Click-reduction tactics** — `UX_SIMPLIFICATION_RECOMMENDATIONS.md` already enumerates 12. No reason to relitigate.
- **Colorblind / contrast accessibility** — `COLORBLIND_ACCESSIBILITY_REVIEW.md` is the source of truth.
- **Backend / data-shape concerns** — focus was purely rendered UX.
- **Mobile / small-viewport** — the app today appears to be desktop-first; mobile is a separate evaluation.
- **Authentication / authorization UX** — out of slice.
- **Internationalization** — out of slice.
- **Performance profiling** — flagged where I noticed it (per-row `useCorrespondenceNotifications` subscriptions, summary modal re-renders), but no profiling done.

---

<a id="8-severity--effort-triage-matrix"></a>
## 8. Severity × Effort triage matrix

Findings clustered for quick triage. Numbers in cells reference finding location (e.g. "3.4-Flow" = §3.4 Flow lens).

| | **Effort: S** | **Effort: M** | **Effort: L** |
|---|---|---|---|
| **Severity: High** | WV-1, 3.3-Flow (saved view), 3.3-Flow (sub-type filter), 3.4-Flow (sidebar step), 3.5-Flow (step focus + scroll), 3.9-Autosave (AutosaveIndicator) | **WV-2**, **Theme 1 (tokens)**, **Theme 2 (header migration)**, 3.1-Flow (Redesign Preview), 3.1-Fluent (AppHeader migration), 3.2-Flow (persisted attorneyCaseView), 3.2-Flow (rail bypass guards), 3.3-Flow (DataGrid migration), 3.3-Fluent (per-row subscriptions), 3.3-Fluent (filters → Fluent), 3.4-Flow (submit error focus), 3.4-Flow (Open IDs scope), 3.4-Airy (inner spacing), 3.4-Sticky (no shrink), 3.5-Flow (external step bypass), 3.5-Flow (Step 2 gate), 3.5-Flow (legacy `false &&`), 3.5-Airy (Step 2 spacing), 3.6-Flow (4-step rail vs 2 tabs), 3.6-Flow (Package & Deliver dead), 3.6-Flow (matrix in modal), 3.6-Flow (matrix grouping), 3.6-Flow (manual duplication), 3.7-Flow (dashboard context lost), 3.7-Flow (escalation visibility), 3.8-Flow (notification context), 3.8-Flow (no mark-read), 3.8-Flow (read state not persisted), 3.8-Fluent (shadcn primitives), 3.9-Summary (Escape multi-close), 3.9-KeyboardShortcuts (Fluent), 3.9-DataRecovery (Fluent), 3.9-CaseDialogs (hex colors) | **#4 Fulfillment Summary**, **Theme 3 (airy push)**, 3.3-Fluent (DataGrid full), 3.4-Fluent (form primitives), 3.9-Summary (modal → inline) |
| **Severity: Med** | many — see §3 per surface | many — see §3 per surface | 3.5-Fluent (wizard shell), 3.6-Airy (auto-expand reform) |
| **Severity: Low** | many — see §3 per surface | several | Theme 8 (page-scroll model) |

**Triage rule of thumb:**
- **High × S** = quick wins, ship in the next sprint.
- **High × M** = the meat of the next quarter.
- **High × L** = needs explicit roadmap commitment.
- **Med × S** = polish; bundle into surface migrations as they happen.

---

*End of evaluation.*
