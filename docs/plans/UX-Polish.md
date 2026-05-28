# Plan — UX polish audit: redundant, oversized, and duplicative surfaces

## Context

Following the AssignedTo migration (form-section → chip in 3 surfaces, ~85 lines removed from the case form) we want to apply the same lens to the rest of the app: **where is the same data shown twice or three times? Where does a section earn less than the screen real estate it claims? What is collapsed-by-default because nobody opens it, and what's expanded-by-default because nobody questioned it?**

This plan inventories candidates discovered by parallel audits of:
- The case form + sticky header + side panels
- The Fulfillment Wizard (Steps 1/2/3) + Collection page
- The queue list + dialogs + app shell + workflow sidebar

Each finding has a file location, a one-line description of the current state, a reason it's worth changing, and a concrete recommendation. They are grouped by tier so we can pick obvious wins first and leave the larger structural shifts for later sprints.

## Already shipped (do NOT repeat)

These were addressed in the current session and are excluded from the candidate list below:

- **AssignedTo migration** — case-form section removed; chips in queue rows, case header, and a bulk-assign dialog now drive `assigneeName`. ([AssigneeChip.tsx](src/components/assignee/AssigneeChip.tsx), [BulkAssignDialog.tsx](src/components/assignee/BulkAssignDialog.tsx), [useAssignCase.ts](src/hooks/useAssignCase.ts))
- **IdentifierAliasesPanel placement** — hoisted out of the LE Review pane and onto an identifier-level metadata band so Primary / Related are no longer misattributed to LE.
- **Date format consistency** — `formatDateToMMM` standardized on `MMM d, yyyy`; locale-unsafe `toLocaleDateString()` calls fixed; `PPP` date-fns tokens replaced.
- **AddServiceDialog consolidation** — bulk popover + per-identifier popover collapsed into one 3-step Dialog (Pick → Configure → Preview).
- **ServiceCategoryTable layout** — unified column templates, tooltip caption, larger fonts, sr-only date labels.
- **Bulk assign / pick / release in the queue** — the existing toolbar buttons that were placeholder-toast no-ops now mutate state in a single batched `setCases` update.
- **Escalate button on Collection** — parity with Triage / Fulfillment, wired through `<StickyCaseHeader>` to `<EscalateToAttorneyDialog>`.
- **Banner CTA visual treatment** — actionable buttons unified on `resolveButtonBase` with banner-agnostic focus ring and grouped under `role="group" aria-label="Case actions"`.

## Tier 1 — Obvious wins (low risk, high noise reduction)

### 1A. Retire `CaseSummaryCard` (sticky header already covers it)

- **Where**: [src/components/CaseSummaryCard.tsx](src/components/CaseSummaryCard.tsx) — entire file
- **Today**: ~400px tall card under the sticky header that renders case ID, priority, crimes, status, due date, request type, country, jurisdiction, agency, origin, identifier + service summary, authorization dates, create date.
- **Cost**: Nearly every field is already in the sticky header ([CaseHeaderSummary.tsx](src/components/case-header/CaseHeaderSummary.tsx)) and most are repeated again on Row 2 of the form's `Status & SLA Deadline` section. When the page first loads the user sees the same five fields three times before scrolling.
- **Fix**: Demote `CaseSummaryCard` to an optional "Full case details" popover or slide-out, OR delete it. The sticky header is the scan surface; the form sections are the edit surface.

### 1B. Drop the duplicate Status badge from `CaseSummaryCard`

- **Where**: [CaseSummaryCard.tsx](src/components/CaseSummaryCard.tsx) — ~line 221
- **Today**: `caseStage` is rendered as a badge in CaseSummaryCard, the sticky header (`CaseHeaderSummary.tsx`), AND inside the form's `Status & SLA Deadline` collapsible.
- **Fix**: Remove from `CaseSummaryCard`. (Subsumed by 1A if that ships.)

### 1C. Drop the duplicate Due Date label from `CaseSummaryCard`

- **Where**: [CaseSummaryCard.tsx:227](src/components/CaseSummaryCard.tsx#L227)
- **Today**: Due date as a "MMM d, yyyy" label here while the sticky header's `<SlaDeadlineChip>` already live-ticks and colour-codes the same value.
- **Fix**: Remove. The live SLA chip is more useful than a static label.

### 1D. Default-collapse the `Authorization Details` section

- **Where**: [src/components/tabs/SenderAuthorityTab.tsx](src/components/tabs/SenderAuthorityTab.tsx) — `sectionId="authorization-details"`, ~line 715
- **Today**: ~12 read-only fields (start / expiration dates, approver name + role + timestamp, reference number, emergency flag) sourced from the LE submission. RS edits these rarely.
- **Fix**: Change to `defaultOpen: false`. Move a 1-line "Approved Mmm d by <approver>" badge into the section header so the value is scannable without expanding.

### 1E. Flatten the nested "Show approval details" toggle

- **Where**: [SenderAuthorityTab.tsx:776-802](src/components/tabs/SenderAuthorityTab.tsx#L776) — the `approvalDetails` boolean
- **Today**: A secondary show/hide toggle nested *inside* the already-collapsed Authorization Details section. Two clicks to reach the data.
- **Fix**: Delete the inner toggle. When the user expands the section, show everything. The double-disclosure costs more than it saves.

### 1F. Default-collapse the `Agency Details` section

- **Where**: [SenderAuthorityTab.tsx](src/components/tabs/SenderAuthorityTab.tsx) — `sectionId="agency-details"`, ~line 94
- **Today**: Defaults to `defaultOpen: true`. Agency name + phone + address + agents (rarely edited after initial triage). Occupies 200-300px at rest.
- **Fix**: `defaultOpen: false`. Surface a 1-line agency-name badge in the collapsed-section header.

### 1G. ~~Drop the duplicate date-range caption in the LE Review pane~~ — **N/A after verification**

- **Audit claim**: "The 'LE requested: …' caption appears in the LEReviewPanel service header AND repeats inside each category row below it."
- **Verified state of the code**: [LEReviewPanel.tsx:348-353](src/components/fulfillment-wizard/LEReviewPanel.tsx#L348-L353) renders the caption ONCE per service in the service-header band. The per-category body rows ([lines 354-376](src/components/fulfillment-wizard/LEReviewPanel.tsx#L354-L376)) render only bullet + category-name + optional Unmapped tag — no date. There is no within-pane duplication.
- **The same caption renders in three places across the wizard**, but each is a different surface with a different purpose:
  - `LEReviewPanel` service-header band — read-only summary of what LE wanted (Step 2 left pane).
  - `ServiceCategoryTable` info-icon tooltip — hover-reveal baseline next to the per-row editable date inputs (Step 2 right pane).
  - `PlanReviewTable` per-row subtext — final audit-table comparison of chosen-vs-baseline dates (Step 3).
- **Conclusion**: nothing to remove. Each render serves a distinct purpose and dropping any of them loses information. Item closed as not-applicable.

### 1H. Drop the duplicate service count across Steps 1 / 2 / 3

- **Where**: Step 1 `IdentifierTable` row, Step 2 `IdentifierAccordion` header ("N configured"), Step 3 `PlanReviewTable` row.
- **Today**: Same `N services` count rendered in each step's identifier row.
- **Fix**: Keep the count in the Step 2 accordion header (where the RS is configuring). Drop from Step 1 (pre-config noise) and Step 3 (Step 3 already implies a final count via the table totals).

### 1I. Reintroduce column headers across every grid-roled case list

Three surfaces declare ARIA grid / table semantics today without rendering a column-header row. All three are missing the same a11y signal.

| Surface | File / line | ARIA role declared | colcount | Has header today? |
|---|---|---|---|---|
| Main queue — **Preview** pane left list | [src/components/CaseQueue.tsx:844-883](src/components/CaseQueue.tsx#L844-L883) | `role="grid"` | 4 | ❌ No |
| Attorney Dashboard — **List** view | [src/components/app-shell/AttorneyDashboard.tsx:424-442](src/components/app-shell/AttorneyDashboard.tsx#L424-L442) | `role="table"` | 7 | ❌ No |
| Attorney Dashboard — **Preview** view left list | [src/components/app-shell/AttorneyDashboard.tsx:389-414](src/components/app-shell/AttorneyDashboard.tsx#L389-L414) | `role="table"` | 7 | ❌ No |

The main queue's Detailed-list view ([CaseQueue.tsx:776-797](src/components/CaseQueue.tsx#L776-L797)) is the only surface that currently renders `<CaseQueueListHeader>`, and it serves as the working template.

- **Cost**: Screen-reader users entering any of the three grids lose all column-name context. Keyboard navigation past the cells has no row that names what each cell means. The `aria-colcount` declaration is a promise the surface doesn't keep.
- **Constraint**: the existing `<CaseQueueListHeader>` ([src/components/case-queue/CaseQueueListHeader.tsx](src/components/case-queue/CaseQueueListHeader.tsx)) hard-codes a select-all checkbox column. The Attorney Dashboard surfaces don't bulk-select cases — wiring the bulk-select header into them would introduce a misleading affordance.
- **Recommended fix** (small refactor, single shared component):
  1. Make the checkbox column in `<CaseQueueListHeader>` **optional** via a new `bulkSelectable?: boolean` prop (defaulting to `true` so existing call sites are unchanged).
  2. When `bulkSelectable === false`, suppress the checkbox cell + collapse the column. The dashboard surfaces pass `false`; the main queue passes `true` (default).
  3. Render the header at the top of all three surfaces, inside the same `role="grid"` / `role="table"` container so the header row gets the grid contract's "first row" treatment.
- **Column-template consistency**: `<CaseQueueListRow>` already uses `density="full"` (dashboard list) and `density="dense"` (preview lists). Verify the dense template lines up with the header's column widths after the fix; if not, pass a `density` prop to the header too so the visual gridlines align.
- **Optional follow-up**: the dashboard's `aria-colcount={7}` matches the full case-card grid; the main queue's preview uses `aria-colcount={4}`. Confirm those numbers match the actual cells the row renders. Today they're a documentation-only signal and the row count may not match the declared column count.

### 1J. Preview pane is missing fields the case card shows

- **Where**: [src/components/case-queue/CaseQueuePreviewPane.tsx](src/components/case-queue/CaseQueuePreviewPane.tsx) `PreviewContent` body (lines 232–445).
- **Today**: The preview pane shows Case ID, priority chip, status badge, due date, escalation chip, the `CaseCardOperationalBadges` row (which covers high-priority crimes + account-existence indicators + correspondence chips), correspondence counts (when present), and the snapshot grid (Request, Country+Jurisdiction, Identifiers w/ breakdown, Due).
- **Gap vs. the case card view**: The case card ([CaseCardDetails.tsx](src/components/case-queue/CaseCardDetails.tsx) + [CaseCardHeader.tsx](src/components/case-queue/CaseCardHeader.tsx) + [CaseCardOperationalBadges.tsx](src/components/case-queue/CaseCardOperationalBadges.tsx)) additionally shows:
  - **Assigned To** — the post-AssignedTo-migration `<AssigneeChip />` lives prominently in the card's 3-col details grid. The preview pane has no assignee surface at all.
  - **Regular (non-high-priority) crime badges** — the card surfaces them in its Row 3; `CaseCardOperationalBadges` only emits the high-priority ones, so they're absent from the preview.
  - **Create Date** — the card's metadata row shows it alongside Origin; the preview only shows Due.
  - **Request Origin** — `LE Portal / Email forward / Mail / Letter / LEAPI`. Visible in the card metadata row; missing from the preview.
- **Cost**: Users have explicitly asked for the preview to mirror the card so they can triage in-place. Today they have to open the case (round trip) to see the assignee or origin. Defeats the purpose of having a preview pane.
- **Fix**: Add four fields to the preview pane's Snapshot section (Tier 1, low risk):
  1. **Assigned To** — render `<AssigneeChip variant="inline" />` (same component used in Surface A queue rows post-migration). Pass `onChange={(next) => onReassign?.(caseItem.caseId, next)}` so the chip is click-to-reassign from the preview too. Wire `onReassign` through the existing `handleQueueReassign` callback in CaseQueue.
  2. **Regular crime badges** — derive `regularCrimes = natureOfCrime.filter(c => !isHighPriorityCrime(c))` (the case card does this) and render a small chip row below `Operational signals`. Keep high-priority crimes in `CaseCardOperationalBadges` as today.
  3. **Create Date** — append a `SnapshotRow icon={Calendar} label="Created" value={formatDateToMMM(caseItem.createDate)}` alongside the existing Due row.
  4. **Request Origin** — append a `SnapshotRow icon={MapPin} label="Origin" value={caseItem.requestOrigin}` to the snapshot grid.
- **Confirm during build**: cross-check the case card's exact field order with the preview's snapshot order so the two surfaces match the user's expectation. The case card's order is `Request → Country/Jurisdiction → Assigned To → Crimes → Account indicators → Create Date / Origin`; the preview can mirror this with `Request → Country/Jurisdiction → Assigned To → Identifiers → Due → Created → Origin → Operational signals → Crimes (regular) → Correspondence`.

## Tier 2 — Structural consolidation (medium effort, big payoff)

### 2A. Unify the 5 terminal-state cards in `IdentifierAccordion`

- **Where**: [src/components/fulfillment-wizard/IdentifierAccordion.tsx:373-389](src/components/fulfillment-wizard/IdentifierAccordion.tsx#L373)
- **Today**: Five sibling cards swap into the accordion body depending on state:
  `RejectedIdentifierCard`, `ETSIStatusCard`, `InvalidIdentifierCard`, `NotFoundIdentifierCard`, plus the LE/RS split-pane fall-through. Each card has ~180-220px of header chrome, an icon, a title, an action button, and a free-text reason area.
- **Cost**: Five visual variants of the same "this identifier is in a terminal state, here's why, here's the next action" pattern. Maintenance burden + cognitive cost when the RS encounters a new one.
- **Fix**: Single `<IdentifierStatusSummary>` component with a `kind` prop (`rejected | etsi-terminal | invalid | not-found`) that branches the icon / colour / verbs internally. Single 3-line card (icon + title + action) with a "Show details" disclosure for reason / timestamps / actor.

### 2B. Consolidate the validation-banner stack in `LEReviewPanel`

- **Where**: [LEReviewPanel.tsx](src/components/fulfillment-wizard/LEReviewPanel.tsx) — the `.banners` container
- **Today**: Up to 3 `<MessageBar>` rows can stack: account-check blocked, full-LE-removal-unconfirmed, mapping-issues. Plus the dedicated `<MappingIssuesPane>` below.
- **Cost**: No priority hierarchy — the RS must read all three to find the one that's actually blocking submission.
- **Fix**: Show only the **highest-priority** issue inline (blocking → warning → info), with a "+N other notices" disclosure that expands the rest. Sequence: account-check-na → account-check-errored → account-check-not-run → full-le-removal → mapping-issues → others.

### 2C. Hide per-category date pickers when they match the service default

- **Where**: [ServiceCategoryTable.tsx](src/components/fulfillment-wizard/ServiceCategoryTable.tsx) date-input cell
- **Today**: Every category row renders two date inputs even when the value is just inherited from the identifier-level / service-level default.
- **Cost**: Visual density on an already-busy table.
- **Fix**: When the row's `dateRange` equals the service / bulk default, render a compact "Same as service" link with a tooltip showing the dates. The link expands to the date inputs on click. Only categories with a per-row override show the inputs by default.

### 2D. Replace inline `IdentifierTable` with a 1-line summary

- **Where**: [DataEntryForm.tsx](src/components/DataEntryForm.tsx) — the case-review section's identifier table (~line 2915)
- **Today**: A full identifier table renders inline in the case form, then the same identifiers re-render inside the right-edge `IdentifierPanel` slide-out (which hosts the FulfillmentWizard).
- **Cost**: Two scrollable identifier grids of the same data, ~600px of vertical space combined.
- **Fix**: Replace the inline table with a 1-line "Identifiers: 5 total · 2 approved · 1 pending · 1 invalid" summary that opens the IdentifierPanel on click. The panel is the work surface; the form should hint, not duplicate.

### 2E. Add a sticky case-context micro-header inside the Fulfillment Wizard

- **Where**: [src/components/FulfillmentWizard.tsx](src/components/FulfillmentWizard.tsx) — the wizard container
- **Today**: Step 1 / Step 2 / Step 3 fill the viewport; the user has no persistent reference to "what case am I editing?" without scrolling up. Navigation lives in the footer (Back / Next / Complete).
- **Fix**: Add a 32px sticky strip above the step content: `CN-2025-00280 · 5 identifiers · ← View Collection`. Survives all three steps. Keeps wizard navigation in the footer; just makes parent context always visible.

### 2F. Consolidate correspondence entry points

- **Where**: [DataEntryForm.tsx](src/components/DataEntryForm.tsx) — `CorrespondenceBanner`, `CorrespondenceUnreadAlert`, the in-form section, the side panel.
- **Today**: Four surfaces all announce the same inbox: top banner (always visible), red unread alert (above the section), the in-form `CorrespondenceSection` accordion, plus a 540px-wide side panel that closes the document panel when opened.
- **Cost**: Four entry points for one subsystem. The side panel and the document panel fight for the same right-edge space.
- **Fix**: Keep the top banner + unread alert (top-of-fold context) and the side panel (the actual interaction surface). Drop the in-form `CorrespondenceSection` — it duplicates what the side panel does.

### 2G. Move `AccountExistenceBadges` out of the case-form headers

- **Where**: Wherever `<AccountExistenceBadges>` renders in the case form (above / alongside the IdentifierTable).
- **Today**: Enterprise / Consumer account-existence indicators shown per-identifier in both the case form and inside the IdentifierPanel where the user actually does the CLASS lookup.
- **Fix**: Keep in the IdentifierPanel only. The case form should just count totals, not show per-identifier badge rows that depend on a panel the user hasn't opened yet.

## Tier 3 — Data / judgment calls (need telemetry, UR, or a stakeholder decision)

### 3A. Three queue view modes (Cards / Detailed list / Preview pane)

- **Where**: [CaseQueueViewToggle.tsx](src/components/case-queue/CaseQueueViewToggle.tsx)
- **Today**: Three segmented-control buttons switch the entire queue visualization. Three separate row/card components are maintained.
- **Question**: Which mode do RS / TS users actually use? If Cards usage is <15% or Preview usage is <10%, retire one and merge the other into List with an optional Preview pane toggle.
- **Fix (after data)**: Default to **List** with an opt-in **Preview pane** layout toggle. Drop the Cards mode if unused.

### 3B. Workflow sidebar collapse toggle

- **Where**: [src/components/WorkflowSidebar.tsx:79-106](src/components/WorkflowSidebar.tsx#L79)
- **Today**: A toggle collapses the left rail from 256px → 64px (icons only).
- **Question**: Does anyone collapse it? The 64px state saves marginal horizontal space on modern viewports. Maintenance + accessibility cost of the chevron + animate-rotate.
- **Fix (likely)**: Remove the toggle. Fix the rail at 256px. If tablet breakpoints matter, hide it entirely below a viewport threshold (hamburger), not "collapse to icons."

### 3C. `NotificationsPage` vs per-case inbox banner

- **Where**: [src/components/app-shell/NotificationsPage.tsx](src/components/app-shell/NotificationsPage.tsx) (global bell icon)
- **Today**: The bell opens a full-page "Notifications" view listing unread inbound correspondence grouped by case. Each case page also shows the same banner.
- **Question**: Does the standalone Notifications page add value over the bell-dropdown + per-case banner?
- **Fix (likely)**: Replace the page with a popover preview from the bell (click-to-case). Keep the page only if the Attorney role needs a cross-case inbox; otherwise retire it.

### 3D. Filter chips ↔ filter popover state sync in `AdvancedFiltersComponent`

- **Where**: [AdvancedFiltersComponent.tsx](src/components/AdvancedFiltersComponent.tsx)
- **Today**: A popover opens the filter form; active filters render as chips above the queue. The two surfaces both edit the same filter state but feel unsynced when the user removes a chip while the popover is open.
- **Fix**: Replace the popover with a collapsible filter rail (Amazon / GitHub pattern). Single source of truth, persists on the page, opens with a single "Filters (3 applied)" chip.

### 3E. Forms Library entry point

- **Where**: [src/components/forms-library/FormsLibrarySection.tsx](src/components/forms-library/FormsLibrarySection.tsx)
- **Today**: "New form" is only reachable from inside the case page → Forms tab. No global / queue-level entry.
- **Question**: Do RS users want to draft a form from the queue without opening a case first?
- **Fix (after UR)**: Add a "New form" entry to the app header or to the queue's bulk-action menu. Store the draft client-side until the user attaches it to a case.

### 3F. Click-to-sort on every case-list column header — **shipped 2026-05**

- **UR signal (2026-05)**: RS / TS sort by **Priority, Due Date, and Stage**. Other columns stay label-only.
- **Where shipped**:
  - [src/components/case-queue/caseListColumns.ts](src/components/case-queue/caseListColumns.ts) — added `sortable?: boolean` to `ColumnDef`, `SortState` type, `buildSortComparator(sortState)` with `PRIORITY_WEIGHT` + `STAGE_WEIGHT` ranks. Marked Priority / Due Date / Stage as `sortable: true`.
  - [src/components/case-queue/CaseQueueListHeader.tsx](src/components/case-queue/CaseQueueListHeader.tsx) — sortable headers render as `<button>` with `ChevronsUpDown / ChevronUp / ChevronDown` icons; `aria-sort` flips `none / ascending / descending`. Resize handles untouched so drag-to-resize doesn't collide with the sort click.
  - [src/components/CaseQueue.tsx](src/components/CaseQueue.tsx) — `sortState` + `handleColumnSort` (cycle: none → asc → desc → none) wired into both the detailed-list and preview-list `<CaseQueueListHeader>` instances. Column-sort takes precedence; the toolbar Sort dropdown stays as the tiebreaker.
  - [src/components/app-shell/AttorneyDashboard.tsx](src/components/app-shell/AttorneyDashboard.tsx) — same state + handler wired into both dashboard `<CaseQueueListHeader>` instances. The default escalation-weight ordering produced by `baseCases.sort` falls back as the tiebreaker.
- **Deferred** (worth revisiting after this lands in usage):
  - Retire the standalone "Sort by Due Date / Sort by Create Date" toolbar dropdown — kept for now because it includes "Create Date" which isn't a column. Decide whether to add Create Date as a sortable column or to keep the dropdown indefinitely.
  - SLA tier sort — not in the UR signal, but reconsider if telemetry shows users repeatedly Priority-sorting then re-scanning for SLA.

## Tier 4 — Airy density & spacing (design-studio feedback)

The studio's read is that DARS feels dense compared with current product norms; pages "fill up to the edges" and the workspace doesn't read as the primary focal point. The three ideas below are intentionally exploratory — they're not concrete-implementation specs, they're investigations to run **after** the Tier 1 / Tier 2 subtractions land, because there's no point adding generous padding around a `CaseSummaryCard` we're about to retire.

**Reference anchors for "airy"**:
- **Microsoft Copilot Studio** + **M365 Copilot Chat** — modern Microsoft surfaces; use these for chrome, spacing, and centered-column patterns.
- **Intuit TurboTax** — closer match for DARS's complicated multi-step workflows. Use it for the stage-tab-bar feel (4C), how sub-steps surface without crowding, and how progress + context coexist with breathing room.

### 4A. Vertical rhythm — bump the spacing scale between content sections

- **Today**: Inter-section gaps inside the case form and the wizard mostly sit at `space-y-4` (16px = `spacingVerticalL`) or `space-y-3` (12px = `spacingVerticalM`). Section internal padding is often `p-3` / `p-4` (12-16px = `spacingVerticalM` / `spacingVerticalL`). Stacked sections read as one continuous wall of UI.
- **Investigation**:
  - Promote `space-y-4` → `space-y-6` (16 → 24px = `spacingVerticalL` → `spacingVerticalXXL`) between top-level form sections.
  - Promote internal section padding from `p-3` → `p-6` (12 → 24px = `spacingVerticalM` → `spacingVerticalXXL`) on `<PrimaryCard>` and equivalent wrappers.
  - Use a single design token (e.g. `--section-gap`, `--section-pad`) so future tuning is one diff instead of a hundred. Anchor each token's value to a published Fluent 2 spacing token from `@fluentui/react-components` (`tokens.spacingVertical*`).
- **Where**: [src/components/DataEntryForm.tsx](src/components/DataEntryForm.tsx) `space-y-*` wrappers, [src/components/ui/card.tsx](src/components/ui/card.tsx) base card padding, `<PrimaryCard>`, the wizard step containers.
- **Fluent 2 anchoring note**: Tailwind's spacing scale aligns 1:1 with the Fluent 2 token scale at every step (`gap-2`=`spacingS`=8, `gap-3`=`spacingM`=12, `gap-4`=`spacingL`=16, `gap-6`=`spacingXXL`=24, `gap-8`=`spacingXXXL`=32). So every value we bump to is automatically on the Fluent 2 grid — no invented numbers, no manual auditing against the Fluent registry.
- **Trap to avoid**: Don't apply the change before Tier 1 fires. The point of adding breathing room is to feel open, not to spread three redundant cards further apart.

### 4B. Page chrome — centered, max-width content column

- **Today**: Most full-page surfaces (queue, case form, collection page, wizard steps) span the full viewport width minus the left sidebar. On a 1920px monitor the form runs end-to-end, making the eye dart across long horizontal labels.
- **Investigation**:
  - Establish a single content `max-width` (1200–1400px is the modern default for dense data apps; Outlook web is ~1280, Linear is ~1200, GitHub is ~1280) with `mx-auto` so the content area centers when the viewport exceeds it.
  - Decide whether the **sticky case header** should also constrain, or remain full-bleed for chip visibility.
  - Apply consistently to `CaseQueue`, `DataEntryForm`, `CollectionTracker`, and each Fulfillment Wizard step.
  - On wide monitors, the resulting left/right gutter becomes visual quiet space — pairs well with 4A's vertical rhythm.
- **Where**: Top-level page wrappers; likely a new `src/components/layout/PageContainer.tsx` that wraps each route surface. Existing call sites currently use ad-hoc `<div className="px-4">` or `<div className="px-6 py-5">`.
- **Trap to avoid**: Document panels and identifier panels currently dock to the right edge of the viewport. If we add a centered container, decide whether those side panels overlay the container or push the container left. The simpler, more predictable choice is to keep panels as right-edge overlays (z above the centered container).

### 4C. Nav re-think — make the workspace the focal point

- **Today**: The workflow sidebar (`WorkflowSidebar.tsx`) takes 256px / 64px of horizontal space and surfaces the three workflow stages (Triage → Fulfillment → Collection) plus their sub-steps. The sidebar exists primarily for *navigation between stages of one case*; it's not a global app navigation. Most users only switch stages a handful of times per case.
- **Investigation**:
  - Replace the persistent left sidebar with a **horizontal stage tab bar** that sits inside the case page just below the sticky header. Frees ~256px of horizontal space → flows directly into 4B's centered-content gain.
  - When on the queue (not inside a case), the stage nav doesn't apply; the queue gets the full width.
  - Keep the "Open Docs" / "View Identifiers" affordances on the sticky header (where they already live) so users never lose them.
  - Workflow stage progression (the dots / chevrons under each stage) can become inline pills inside the tab bar: `Triage ✓ — Fulfillment ◐ — Collection ○`.
  - Audit any nav-driven concept (e.g. counts, badges) that lives in the sidebar today and find it a home in the header instead.
- **Where**: [src/components/WorkflowSidebar.tsx](src/components/WorkflowSidebar.tsx), every page that currently expects to live next to it, and the sticky header to absorb whatever badges or counts the sidebar surfaces.
- **Connects to Tier 3B**: removing the sidebar collapse toggle was already on the list; this proposal goes further and removes the sidebar entirely on case pages. Worth deciding now whether to do Tier 3B first as a smaller change, or skip it and go straight to 4C.

### Density & spacing — proposed sequencing

The studio feedback is principle-level ("more airy") rather than a single-PR ask, so the work has to be paired with the structural changes in Tiers 1-2 to land cleanly. Suggested rollout:

1. Land **Tier 1 subtractions first** (especially 1A: retire `CaseSummaryCard`). You can't tell whether a page feels airy until the redundancies are gone.
2. Introduce **design tokens for spacing** (4A): `--section-gap`, `--section-pad`, `--page-max-w`, `--page-gutter`. One commit, no visual change yet (tokens default to today's values).
3. Tune the token values to the new airy scale (4A). This becomes a single, reviewable visual diff applied to the whole app.
4. Wrap each route in `<PageContainer>` with the centered `max-width` (4B).
5. Spike the **nav re-think** (4C) as a feature-flagged prototype on a single workflow first (e.g. just on the Collection page) and gather user reaction before rolling out across all three stages.

### Visual checks to run after each step

- Screenshot the queue, the case form Row 1-3, Fulfillment Step 2 split-pane, and the Collection by-identifier view at 1280px and 1920px viewport widths.
- Compare against Outlook web, Linear, Notion sidebar, and GitHub PR view for "airy" parity.
- Re-check the dense data surfaces (`ServiceCategoryTable`, `PlanReviewTable`, queue Detailed-list rows) — these are tables and shouldn't get the same generous padding as cards. Define the table-specific spacing token (`--table-row-pad`) separately so airy ≠ huge rows.

## Recommended sequence

1. **Tier 1A + 1B + 1C** — retire `CaseSummaryCard` (or strip its redundant fields). Single largest noise reduction; deletes ~400px from every case page. Net diff is mostly subtractive.
2. **Tier 1D + 1E + 1F** — collapse-by-default the authorization + agency sections, flatten the nested toggle. Trivial diff (`defaultOpen: false`, delete one `useState`), instant feel-better.
3. **Tier 1G + 1H** — small data-dedup wins inside the wizard.
4. **Tier 4 step 2 — introduce spacing tokens** (no visual change yet). Sets up the airy work to be a single later diff instead of dozens of inline edits.
5. **Tier 2A** — unify terminal-state cards. Net new component but removes 4 near-duplicate ones.
6. **Tier 2B** — banner stack consolidation. Materially clarifies the wizard for the most common blocking states.
7. **Tier 2C / 2D / 2E / 2F / 2G** — pick by stakeholder priority; each is a 1-2 hour PR.
8. **Tier 4 step 3 — tune spacing token values** to the new airy scale (4A). Now the page actually breathes; redundant elements removed in steps 1-3 are gone, so the breathing room reads as intentional, not as "spread out the same noise."
9. **Tier 4 step 4 — centered content container** (4B). Adds the page-margin focus the studio asked about.
10. **Tier 4 step 5 — nav re-think prototype** (4C) behind a feature flag on a single workflow. Validate before rolling broadly.
11. **Tier 3** — gather telemetry / UR first; then act on view modes / sidebar / notifications / filters / forms-library entry.

## How findings were assembled

Three parallel `Explore` audits covered:
- Case form + sticky header + side panels (`DataEntryForm.tsx`, `case-header/*`, `CaseSummaryCard.tsx`, side panels, `tabs/*`).
- Fulfillment Wizard Steps 1/2/3 + Collection page (`FulfillmentWizard.tsx`, `fulfillment-wizard/*`, `CollectionTracker.tsx`).
- Queue + dialogs + app shell + workflow sidebar (`CaseQueue.tsx`, `case-queue/*`, dialogs, `WorkflowSidebar.tsx`, `app-shell/*`, `forms-library/*`).

Findings were reconciled against the work already shipped in this session (listed in "Already shipped" above) so this plan does not double-count completed migrations.

## Open questions

- Is there usage telemetry available for the three queue view modes (Tier 3A)? If yes, run the analysis before retiring any of them.
- Is the "Notifications" page in active use by the Attorney persona specifically? If it's purely an Attorney surface, keep it but move the entry point under the Attorney Dashboard rather than the global bell.
- For Tier 2A (unified terminal-state card): are there any planned future states (e.g., "Awaiting LE Clarification") that the new shape needs to anticipate? Worth sketching before refactoring.
