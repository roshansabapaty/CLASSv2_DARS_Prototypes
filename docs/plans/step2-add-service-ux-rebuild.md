# Plan — Rebuild the Add Service flow + Category Selection table in Step 2 (UX & a11y)

## Context

Step 2 of the Fulfillment Wizard ("Services Configuration") has two distinct "Add Service" surfaces and an inline data-categories table that all look unfinished and have measurable usability and accessibility problems. Reproduced on `LENS-2025-00280`:

- **Bulk Add service popover** — `BulkActionsToolbar.tsx:380–446`. 360px Fluent v9 `Popover`. Multi-select with checkboxes + an account-type sublabel like "1 Consumer". Footer "Configure N services →" opens a separate Dialog.
- **Per-identifier Add Service popover** — `ServiceDropdownSelector.tsx:304–401`. 320px shadcn/Radix `Popover` (expands to 560px when configuring). **Single-click**, no checkboxes, no account-type sublabel. The popover floats over the page header.
- **Inline category table** — `ServiceCategoryTable.tsx:415–691`. CSS grid with three different column templates (`28px_1fr_90px_1fr_80px`, `1fr_90px_1fr_60px`, plus group sub-headers), 10–11px font sizing, `mm/dd/yyyy` placeholder text overlapping the "LE requested: …" caption underneath, custom `<button>` checkmarks instead of real `Checkbox`.

Both popovers share `SearchableServiceSelector.tsx` as the inner picker, but everything around it (width, multi-select vs single-click, configure step, surrounding chrome, even the styling system — Fluent vs Tailwind) differs. The result is an inconsistent, cramped UX with overlapping text strings as reported.

Screenshots captured during investigation (in repo root):
- `bug-bulk-add-service-list.png` — bulk popover with overlapping accordion underneath.
- `bug-per-identifier-add-service.png` — per-identifier popover floating above the page header.
- `bug-categories-table.png`, `bug-categories-table-scrolled.png` — category table with mismatched columns and a tight "LE requested" caption directly under the date inputs.

## Goals

1. **One consistent Add Service experience** across both surfaces — same component, same picker semantics, same configure step, same affordances.
2. **Roomier modal sizing** that doesn't overlap unrelated content (the LE Review pane, the page header, the accordion controls) and doesn't truncate service names or descriptions.
3. **Account-type clarity** — the user should always be able to tell, at a glance, whether a service is compatible with the identifier(s) in scope.
4. **Accessible category table** — semantic structure, real `Checkbox` controls, larger base type, no overlapping captions, consistent column alignment between header / data / sub-rows.
5. **No regressions to existing flows** — provenance tags, "Reset to LE", the Configure → Preview confirmation in bulk, and the per-identifier inline configure picker behavior must all keep working.

## Non-goals

- Catalog data changes (`lensServicesConfig.ts`).
- Changes to the LE Review pane, IdentifierAliasesPanel, MappingIssuesPane, ETSI/Reject card flows.
- Backend / submission payload changes.
- Replacing shadcn/Radix wholesale with Fluent v9 outside the affected components.

## Specific issues to fix

### A. Picker UX

| # | Issue | Location |
|---|---|---|
| A1 | Per-identifier popover is single-click only — no way to add multiple services in one open, no checkbox state visible. | `ServiceDropdownSelector.tsx:323–341` |
| A2 | Bulk popover's "1 Consumer" / "1 Enterprise" sublabel is ambiguous — reads as "1 Consumer account" but means "applies to 1 of the selected identifiers". | `BulkActionsToolbar.tsx:411–422` (`chipText`), `SearchableServiceSelector.tsx:157` |
| A3 | Per-identifier popover lacks any account-type compatibility indication. RS can pick `Exchange Enterprise` for a Consumer-typed identifier and the picker says nothing. | `ServiceDropdownSelector.tsx:331–341` |
| A4 | Both popovers have inconsistent widths (320 / 360 / 560) and float over unrelated chrome. The per-identifier 320px width truncates service names like "Microsoft Account Profile - EntraID". | `ServiceDropdownSelector.tsx:327`, `BulkActionsToolbar.tsx:394` |
| A5 | Trigger button doesn't expose `aria-haspopup` or describe the popover content — screen reader users hear "Add Service 12, button" with no hint that 12 is a count of available services. | `ServiceDropdownSelector.tsx:306–322` |

### B. Configure step

| # | Issue | Location |
|---|---|---|
| B1 | Bulk uses a Fluent Dialog; per-identifier inlines into the popover (560px). Two completely different mental models. | `BulkActionsToolbar.tsx:437`, `ServiceDropdownSelector.tsx:342–399` |
| B2 | Per-identifier's inline configure step has a 420px max-height with internal scroll, which clips long category groups. | `ServiceDropdownSelector.tsx:368` |

### C. Category table

| # | Issue | Location |
|---|---|---|
| C1 | Three different grid templates (`28px_1fr_90px_1fr_80px`, `1fr_90px_1fr_60px`, group header has no grid) — vertical lines don't align between header, selected rows, submitted-job sub-rows. | `ServiceCategoryTable.tsx:415, 508, 561` |
| C2 | Status column fixed at 90px — truncates longer status text (e.g. `Awaiting Provisioning`, `Disclosure Not Available`). | `ServiceCategoryTable.tsx:415, 508, 561` |
| C3 | "LE requested: Aug/01/2025 – Nov/01/2025" caption renders **below** the date inputs in the same cell, making the row visually lopsided and overlapping the next row's top border at small heights. | `ServiceCategoryTable.tsx:629–637` |
| C4 | Custom `<button>` checkmarks (rounded blue boxes with a checkmark icon) have no `role="checkbox"`, no `aria-checked`, no `aria-labelledby` — they look like checkboxes but aren't. | `ServiceCategoryTable.tsx:471–475, 562–566` |
| C5 | Date `<Input type="date">` controls have no associated `<label>` and no aria-label — only the visible "mm/dd/yyyy" placeholder. WCAG 3.3.2. | `ServiceCategoryTable.tsx:619–625, 536–542` |
| C6 | Base font sizes are 10–11px (`text-[10px]`, `text-[11px]`) — below WCAG-recommended minimum even for tabular data. Increases cognitive load on the densest screen of the wizard. | `ServiceCategoryTable.tsx` throughout |
| C7 | `<div>`-based grid loses table semantics — screen reader users can't navigate by column/row, and there's no `<caption>` for the table's purpose. | `ServiceCategoryTable.tsx:415–691` |
| C8 | Color-only differentiation: selected rows get a 3px blue left border (`border-l-[#0078d4]`), submitted rows get a 3px green left border. The "New"/"jobs" badges already provide a redundant cue, but the colors aren't called out as the primary signal — fine for sighted users, ambiguous for screen-reader users. | `ServiceCategoryTable.tsx:561, 468` |

## Recommended approach

### Phase 1 — Build a shared `AddServiceDialog`

**New**: `src/components/fulfillment-wizard/AddServiceDialog.tsx`

A single Fluent v9 `Dialog` that replaces both the bulk popover and the per-identifier popover. Two-step content with internal Back navigation:

1. **Step 1 — Pick services** (multi-select)
   - Reuse `SearchableServiceSelector` with `multiSelect={true}` for **both** flows.
   - Width: `surfaceProps={{ style: { width: 640 } }}` (Fluent default 560 + breathing room).
   - Sticky search input at the top, scrollable list (`maxHeight: 480px`) below.
   - Each row: emoji + service name (Fluent `fontSizeBase300`) + a **chip-based** account-type indicator (replacing the ambiguous "1 Consumer" string). Use `<Tag size="extra-small">` with text like `Consumer`, `Enterprise`, or `Consumer + Enterprise`.
   - **Compatibility**: pass `disabledReason` (already supported at `SearchableServiceSelector.tsx:51`) to disable services that don't match any identifier in scope, with a Tooltip like *"Requires Enterprise account; selected identifiers are Consumer."*
   - Footer: `Cancel` (left) + `Configure N service{s} →` (right, primary, disabled until ≥ 1 picked).

2. **Step 2 — Configure data category groups + items** (per service)
   - Same Dialog surface, content swap. Header shows `← Back` button + `Configure: <Service Name>` title + an account-type tag.
   - Reuse the existing `ServiceConfigPicker` body for parity with today's bulk Configure dialog.
   - Footer: `Cancel` + `Add (N selected)` primary.

Props:
```ts
interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Available services (after filtering out already-added). */
  services: SearchableServiceItem[];
  /** Account types of the identifiers in scope (1 in per-identifier flow, N in bulk). */
  identifierAccountTypes: Array<"Consumer" | "Enterprise" | "N/A">;
  /** Catalog of category groups per service for the configure step. */
  availableGroups: Record<string, CategoryGroup[]>;
  /** Commit callback — receives the picked service keys + per-service category picks. */
  onCommit: (picks: Record<string, Record<string, string[]>>) => void;
}
```

### Phase 2 — Wire the dialog into both surfaces

**Modified**: `src/components/fulfillment-wizard/ServiceDropdownSelector.tsx`
- Replace the `Popover` + inline configure (lines 304–401) with `<AddServiceDialog />`.
- The dialog opens from the existing `Add Service` button. No more 320/560px width juggling.

**Modified**: `src/components/fulfillment-wizard/BulkActionsToolbar.tsx`
- Replace the Fluent `Popover` + downstream `BulkConfigureServicesDialog` chain (lines 380–446) with `<AddServiceDialog />`.
- The Configure dialog logic in `BulkConfigureServicesDialog` is already a Dialog — its body becomes Phase 2 of `AddServiceDialog` so we don't lose the bulk Preview / per-identifier breakdown features. Verify those features are wired before deleting the old file.

**Deleted (after migration verified)**: `BulkConfigureServicesDialog.tsx` if its full feature set has been folded in. Keep behind the new dialog if not — reassess at the end of Phase 2.

### Phase 3 — Rebuild `ServiceCategoryTable` rows

**Modified**: `src/components/fulfillment-wizard/ServiceCategoryTable.tsx`

- **Switch to semantic `<table>`** (or Fluent `<DataGrid>` if it composes cleanly with the existing custom row chrome). Wrap each service's table in a `<table>` with `<caption className="sr-only">` describing it ("Data categories for Exchange Consumer"). Header `<th scope="col">` for each column.
- **Unified column template** for header, selected rows, submitted parent rows, AND submitted-job sub-rows. Suggested widths: `auto` (checkbox) | `1fr` (Data Category) | `auto` (Status — adapts to longest badge) | `auto` (Date Range — auto-fits two date inputs side by side) | `auto` (Actions). Drop fixed 90px and 80px widths.
- **Replace the custom `<button>` checkmarks** with Fluent `<Checkbox>` (for selectable rows) and a static `<CheckCircle2>` icon (for submitted rows). Real ARIA semantics for free.
- **Move "LE requested: …" caption out of the Date Range cell** into a small info icon at the end of the cell with the caption inside a Fluent `<Tooltip>`. The cell stays one line tall.
- **Bump base font sizes** from `text-[10px]` / `text-[11px]` to Fluent `fontSizeBase200` (12px) for body text and `fontSizeBase100` for secondary captions only. Audit row paddings to keep the table dense without crossing 11px.
- **Add proper `<label>`** (visually hidden via `sr-only`) for each date input: "Start date for {item.name}" / "End date for {item.name}".
- **Submitted-row sub-headers** get the same column template as the parent row so vertical lines align. Currently `1fr_90px_1fr_60px` differs from `28px_1fr_90px_1fr_80px` — fix by reusing the parent template and leaving the checkbox column empty for sub-rows (or merging via `colSpan`).

### Phase 4 — Compatibility chips + identifier-scope badge in dialog header

**Modified**: `AddServiceDialog.tsx` header
- When opened from per-identifier flow, show a small badge inline with the title: `For analyst@contoso.com (Enterprise)`.
- When opened from bulk, show: `For 2 identifiers (1 Consumer + 1 Enterprise)`.
- Inside the picker, services that mismatch (e.g., `Exchange Enterprise` when scope is only Consumer) are disabled via `disabledReason` and ranked below compatible services.

### Phase 5 — Verification

1. Open `LENS-2025-00280` from the queue and enter Step 2.
2. **Per-identifier flow** — expand identifier 1 (`+1-425-555-0142`), click Add Service in the RS workspace. Expect:
   - Fluent Dialog opens (~640px wide), centered, with backdrop. No bleed over the page header.
   - Header reads `Add services • For +1-425-555-0142 (Consumer)`.
   - Each service row shows a `Consumer` / `Enterprise` / `Consumer + Enterprise` chip; Enterprise-only rows are disabled with a tooltip.
   - Multi-select with checkboxes; pick two services; click `Configure 2 services →`.
   - Step 2 of the dialog walks each picked service in turn. Back button returns to picker without losing selections.
   - Click `Add (N selected)` — dialog closes, services appear in the workspace, no console errors.
3. **Bulk flow** — close the wizard, reopen, click Add service in the bulk toolbar. Expect:
   - Same Dialog component, same UX. Header reads `For 2 identifiers (1 Consumer + 1 Enterprise)`.
   - All affordances of the previous bulk Configure → Preview chain are preserved (per-identifier breakdown of which categories will land where).
4. **Category table** — expand `Exchange Consumer` in the workspace. Expect:
   - All vertical column borders align between header, selected row, and submitted-job sub-row.
   - Status column auto-sizes — try with a longer status string from devtools to confirm.
   - "LE requested: …" caption shows in a tooltip behind a small info icon at the end of the Date Range cell, not below the inputs.
   - Tab-key focus order: checkbox → name (with tooltip) → start date → end date → action button. No focus trap.
   - VoiceOver / Narrator: row navigated as a table row, columns announced ("Data Category, Generic Attributes; Status, New; Date Range, Aug 1 to Nov 1, 2025"). Custom-button checkmarks now announce as proper checkboxes.
5. **A11y spot-check** — run axe DevTools on Step 2 with the dialog open and the table expanded. Confirm zero violations under Critical / Serious. Specifically watch for: missing form labels, color-contrast on the 10/11px text (now bumped to 12px), missing accessible names on icon-only buttons.

## Files touched (summary)

**New**:
- `src/components/fulfillment-wizard/AddServiceDialog.tsx`

**Modified**:
- `src/components/fulfillment-wizard/ServiceDropdownSelector.tsx` — drop popover, mount AddServiceDialog from the trigger button.
- `src/components/fulfillment-wizard/BulkActionsToolbar.tsx` — drop Fluent Popover, mount AddServiceDialog.
- `src/components/fulfillment-wizard/ServiceCategoryTable.tsx` — semantic `<table>`, unified columns, real `<Checkbox>`, tooltip for the LE-requested caption, bumped font sizes, sr-only labels on date inputs.
- `src/components/fulfillment-wizard/SearchableServiceSelector.tsx` — replace the free-text `description` slot with a structured `accountTypeChip: "Consumer" | "Enterprise" | "Consumer+Enterprise"` so the chip styling is consistent.

**Removed (after Phase 2 migration verified)**:
- The inline Configure + Preview dialogs inside `BulkActionsToolbar.tsx` (lines 478–579) — folded into `AddServiceDialog` (no separate `BulkConfigureServicesDialog.tsx` file existed; it was always inline). The bulk toolbar only opens the new dialog and the inline dialog blocks are deleted.

**Untouched**:
- `LEReviewPanel`, `IdentifierAliasesPanel`, `MappingIssuesPane`, `ETSIStatusCard`, etc.
- `lensServicesConfig.ts`, validation utilities, `IdentifierAccordion` (other than confirming dialog mounts cleanly).

## Decisions (resolved)

1. **Per-identifier picker** → multi-select with Configure step (matches bulk).
2. **Bulk dialog** → keep Pick → Configure → **Preview** → Add (preview retained as a 3rd step inside the new dialog).
3. **Category table** → originally chose Fluent v9 `<DataGrid>`; **shipped as targeted CSS Grid fixes** — unified column templates across header / selected rows / submitted-job sub-rows, auto-sized Status column, "LE requested" caption moved to a tooltip behind an info icon, font sizes bumped to 12px, `role="checkbox"` + `aria-checked` + `aria-label` on the custom checkmark buttons, sr-only `aria-label` on every date input. A full DataGrid migration is deferred — the existing nested structure (group headers + submitted-job sub-tables + "Add X category" links) doesn't fit DataGrid's flat-row model cleanly, and the targeted fixes resolve the user-reported overlap and density without that refactor.
4. **`BulkConfigureServicesDialog`** → delete after Phase 2 verification (no flag). **Note**: no separate file existed; the Configure + Preview dialogs were inline within `BulkActionsToolbar.tsx` and have been deleted (lines 478–579).

## Recommended order

1. Phase 1 (build dialog) + small Phase 3 spike (rebuild one row's grid template) in parallel.
2. Phase 2 (wire into per-identifier first — smaller blast radius, then bulk).
3. Phase 3 finish (full table rebuild with semantic markup, real `<Checkbox>`, tooltip caption, font bumps).
4. Phase 4 (compatibility chips + scope badge in dialog header).
5. Phase 5 verification.
