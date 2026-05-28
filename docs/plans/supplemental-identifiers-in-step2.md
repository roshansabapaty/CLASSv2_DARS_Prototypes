# Plan — Surface supplemental identifiers in Step 2 (display-only) and on the Collection page (display + copy)

## Context

LE submits a target identifier of one type (e.g., `Phone Number`). Many Microsoft services key off a different identifier type — typically email or PUID. CLASS lookup ("Check Accounts" in the prototype) resolves the LE-supplied identifier to:

- a **Primary Identifier** (e.g., the canonical Microsoft Account email)
- a list of **Related Identifiers** (aliases — other emails, secondary accounts, …)

### Where supplemental identifier choice actually happens (per RS workflow)

| Category type | How the alias choice is made |
|---|---|
| **Automated** (collected by the back-end pipeline) | The back-end service auto-converts the LE-supplied identifier to whatever type the automated service requires. **The RS does not pick the alias.** No UI affordance needed. |
| **Manual** (collected by the Response Specialist outside the web app) | The RS performs the data collection in an **external tool**. They need to know which alias values are available so they can copy a value from this app and paste it into the external tool. **The RS does not record the choice in the wizard** — they copy the string and use it elsewhere. |

This re-scopes the original plan substantially:

- **Step 2 of the Fulfillment Wizard** — supplemental-identifier UX is **display-only context** so the RS understands what aliases are available before submitting the plan. No picker, no per-category writes to `subCategory.identifierId`.
- **Collection page** — the RS expands an identifier card and needs the **same alias panel**, with **copy-to-clipboard** affordances on each value, so they can grab the alias and paste it into an external manual-collection tool.

### What already exists

- **Data**: `identifier.checkAccounts.primaryIdentifier` + `identifier.checkAccounts.relatedIdentifiers` populated by `accountExistenceCheck.ts:86–106`.
- **Step 1 displays**: `AccountDetailsTab.tsx`, `IdentifierTableRow.tsx` (expanded), `CompactIdentifierList.tsx`. All copy-able.
- **Reusable copy component**: `CopyableIdentifier.tsx` with click-to-copy + Sonner toast confirmation. Already used at `CompactIdentifierList.tsx:591` for primary IDs.
- **Step 2 today** (`IdentifierAccordion`, `LEReviewPanel`, `RSEditPanel`, `ServiceCategoryTable`, `ServiceDropdownSelector`) — no alias context anywhere.
- **Collection page today** (`CollectionTracker.tsx:2873–3390` "By Identifier" view) — header shows LE-supplied value + type + task ID + service counts + pipeline + status; the **expanded body shows per-service tables but NO Primary / Related identifier metadata**. `ManualServiceCategories.tsx` (manual-collection form) renders inline at `CollectionTracker.tsx:3371` under each manual service.

## Goals

1. **Surface the aliases** — display the LE-supplied identifier + Primary + Related, each with type chip, on:
   - **Step 2 LE Review pane** (read-only context as the RS configures the fulfillment plan).
   - **Collection page by-identifier accordion body** (context for the RS performing manual collection in external tools).
2. **Enable copy** — every value in the panel is one click to copy, with toast confirmation. The RS pastes the value into whatever external manual-collection tool they are using.

## Non-goals

- **Per-category picker that writes `subCategory.identifierId`** — descoped. Automated categories are auto-resolved by the back-end; manual categories are collected externally. Neither requires writing the alias choice into the wizard. The existing `SubCategory.identifierId` field stays unused by the new UX (Step 1's `AccountDetailsTab.tsx` "Add" button keeps using it as today; we are not removing or changing that path).
- **Per-service bulk-apply** — descoped (same reasoning).
- **Identifier-type compatibility metadata on the service catalog** — out of scope. The RS reads aliases and decides themselves.
- **Backend / submission-payload changes** — none.

## UX design

### Shared component — `IdentifierAliasesPanel.tsx`

A single, dependency-light read-only component used on BOTH surfaces (Step 2 and Collection page). Visual layout:

```
┌─ Identifier Aliases ──────────────────────────────────────────────┐
│ Submitted by LE   +1-425-555-0142                  [Phone Number] │
│ Primary           user.x@outlook.com   📋          [Email]        │
│ Related (2)       userx_alt@hotmail.com   📋       [Email]        │
│                   u.x@gmail.com           📋       [Email]        │
└───────────────────────────────────────────────────────────────────┘
```

Behavior:

- **Visible when** `identifier.checkAccounts?.primaryIdentifier` is set OR `identifier.checkAccounts?.relatedIdentifiers?.length > 0`.
- The **LE-supplied row** is informational; not copyable here (it's already copyable from the card header on every page).
- The **Primary** row uses `<CopyableIdentifier value={primary} copyLabel="Copy Primary Identifier" variant="inline" />` — click-to-copy with toast.
- Each **Related** row uses `<CopyableIdentifier value={alias} copyLabel="Copy Related Identifier" variant="inline" />`.
- Type chips are derived from the value string: `@` → Email; leading `+` or all digits → Phone Number; else PUID/Other. (Same heuristic as elsewhere in the prototype; we don't carry per-alias type metadata yet.)
- Account-type chip (Consumer / Enterprise / N/A) is rendered next to the Primary row using `identifier.checkAccounts.accountType`.
- Compact density — fits in a single Card without dominating the page.

### Step 2 surface

Mount `<IdentifierAliasesPanel identifier={identifier} />` **at the top of the LE Review pane body**, above the resolved-services tree, inside `LEReviewPanel.tsx`. Conditional on the same `checkAccounts.primaryIdentifier` truthy check. Display-only — no `[Use for…]` button, no picker, no writes.

This gives the RS context as they review the LE-requested services and configure the plan. They can copy a value here too if they need it during plan configuration (rare but harmless to allow).

### Collection page surface

Mount `<IdentifierAliasesPanel identifier={identifier} />` **at the top of the expanded by-identifier accordion body** in `CollectionTracker.tsx`. Specifically, inside the `{isExpanded && (...)}` block around line 3088, BEFORE the services tables and before any `ManualServiceCategories` mounts.

Rationale: when the RS expands an identifier to record manual collection, the alias panel is the first thing they see. They can scan the available aliases, click to copy whichever one they need, paste into the external tool, then proceed to the per-service manual-job entries below. Co-locating it within the same expansion body keeps everything for that identifier in one place.

> Considered but rejected: mounting the panel **inside** `ManualServiceCategories.tsx` directly (next to each service's manual entries). Rejected because it duplicates the panel for every manual service block, clutters the per-service form, and makes the alias context look service-specific when it's actually identifier-level.

## Phased work

### Phase 1 — Build the shared `IdentifierAliasesPanel` component

**New**: `src/components/IdentifierAliasesPanel.tsx` (placed at `src/components/`, not in `fulfillment-wizard/`, since it is shared across Step 2 and the Collection page).

- Props: `{ identifier: AccountIdentifier }`. No callbacks — fully self-contained.
- Type-chip helper inline (regex on value).
- Returns `null` when no `primaryIdentifier` and no `relatedIdentifiers`.
- Uses `CopyableIdentifier` for Primary and Related values.
- Tailwind / Fluent token styling consistent with the existing Step 2 panes.

### Phase 2 — Mount in Step 2

**Modified**: `src/components/fulfillment-wizard/LEReviewPanel.tsx`
- Render `<IdentifierAliasesPanel identifier={identifier} />` at the top of the body.

**Modified**: `src/components/fulfillment-wizard/IdentifierAccordion.tsx`
- If not already passing the full `identifier` to `LEReviewPanel`, pass it now (the panel needs `identifier.checkAccounts` in addition to whatever LEReviewPanel already consumes).

### Phase 3 — Mount on the Collection page

**Modified**: `src/components/CollectionTracker.tsx`
- Inside the by-identifier accordion expanded body (around line 3088, before the per-service tables), render `<IdentifierAliasesPanel identifier={identifier} />`.
- Visibility is gated on `isExpanded && identifier.checkAccounts?.primaryIdentifier`.

### Phase 4 — Mock fixture (already partially covered by existing mocks)

The existing `LENS-2025-00250` mock now populates `checkAccounts.primaryIdentifier` and `checkAccounts.relatedIdentifiers` once the user runs Check Accounts (the simulator was fixed in a previous round to do this independent of enabled internal services).

To create a more compelling demo where the LE-supplied identifier and the Primary differ in TYPE (phone → email):

**New**: `src/utils/mockCaseDataLENS202500280.ts` with a single identifier:
- `value: "+1-425-555-0142"`, `type: "Phone Number"`, `accountType: "Consumer"`.
- After Check Accounts runs, `primaryIdentifier` = `"user.x@outlook.com"`, `relatedIdentifiers` = `["userx_alt@hotmail.com", "u.x@gmail.com"]`.
- `leExternalServices: ["Email", "OneDrive"]` so the LE Review pane shows resolved services.

Register in `App.tsx` + `case-queue-types.ts` (same pattern as LENS-2025-00200 / 00250).

> Optional simplification: skip the new mock if extending LENS-2025-00250 with one phone-number identifier feels less invasive. Either is fine.

### Phase 5 — Verification

1. Open mock case → run Check Accounts → enter Step 2.
2. Expand the phone-number identifier.
3. **Expect (Step 2)**: LE Review pane shows Aliases panel at top with phone (LE-supplied), email Primary, two Related emails. Each Primary / Related value has a copy icon. Click one — toast says "Copied to clipboard"; clipboard contains the value.
4. Navigate to the Collection page (or click "View Collection" from the queue).
5. Expand the same identifier in the by-identifier view.
6. **Expect (Collection)**: the same Aliases panel appears at the top of the expanded body, before the per-service tables. Same copy behavior. Manual-collection forms (`ManualServiceCategories`) below render unchanged.
7. **Expect**: identifiers WITHOUT a `primaryIdentifier` (e.g., `not-found@example.test` on LENS-2025-00200) render NO panel on either surface.

## Files touched (summary)

**New**:
- `src/components/IdentifierAliasesPanel.tsx`
- `src/utils/mockCaseDataLENS202500280.ts` (or extend LENS-2025-00250 — engineering choice)

**Modified**:
- `src/components/fulfillment-wizard/LEReviewPanel.tsx`
- `src/components/fulfillment-wizard/IdentifierAccordion.tsx` (only if a prop wiring change is needed to pass the full identifier)
- `src/components/CollectionTracker.tsx` (mount the panel inside the by-identifier expansion)
- `src/App.tsx` + `src/components/case-queue/case-queue-types.ts` (register new mock, if Phase 4 adds one)

**Untouched**:
- `src/types/caseTypes.ts` — no data-model changes (`SubCategory.identifierId` stays as today).
- `src/hooks/useIdentifierManagement.tsx` — `handleAddAliasAsIdentifier` / `handleAddAliasToCategory` keep working as in Step 1.
- Service catalog (`lensServicesConfig.ts`) — no changes.
- `src/utils/accountExistenceCheck.ts` — already populates the data.
- `ManualServiceCategories.tsx` / `ManualCollectionForm.tsx` — unchanged.

## Open questions

1. **Identifier type chip derivation** — Phase 1 derives the type from the value string (`@` → Email, `+` / digits → Phone, else PUID). Sufficient for the prototype, or should the Check Accounts simulator emit explicit per-alias type metadata? Suggest sufficient for now; revisit if real CLASS data turns out richer.
2. **LE-supplied row copyability** — should the LE-supplied (top) row also be click-to-copy, or only Primary + Related? My draft leaves it informational since the value already exists on the card header. Easy to make copyable if preferred.
3. **Account-type chip on Related rows** — Primary row shows the account-type chip (Consumer / Enterprise / N/A). Should each Related row show the same chip too, or assume same as Primary? My draft assumes same as Primary; chip on Primary only.
4. **Mock fixture choice** — new `LENS-2025-00280` (cleaner demo) vs. extend `LENS-2025-00250` (less queue clutter). Defaulting to new file; trivial to switch.

## Recommended order

1. Phase 1 (build component) + Phase 4 (mock fixture) in parallel.
2. Phase 2 (mount in Step 2) and Phase 3 (mount on Collection page) — independent, can do either order.
3. Phase 5 verification — hit both surfaces.
