# ADO Task — LENS-LRMS: Rename "Data Category Group / Data Category" to "Data Category / Data Type"

> Draft for the LENS-LRMS ADO Task. Paste the **Title** into the Title field and the **Description** block into the Description (it's markdown-compatible). Acceptance Criteria goes into the AC field if your template has one; otherwise leave inline.

---

## Title

```
LENS-LRMS: rename "Data Category Group" → "Data Category" and "Data Category" → "Data Type" (UI strings + API contracts)
```

---

## Description

### Context

DARS (data-access-request-suite) shipped a semantic-vocabulary update on 2026-05-28:

- The concept formerly called **Data Category Group** is now **Data Category**.
- The concept formerly called **Data Category** is now **Data Type**.

These two terms describe the two-level hierarchy used to scope LE-requested data on an identifier (e.g. an outer **Data Category** like "Subscriber Data" / "Authentication Logs" / "Traffic Data" containing inner **Data Types** like "Date of Birth" / "Generic Attributes" / "Push Tokens"). The vocabulary now matches how stakeholders describe these concepts in conversation and in legal-team-facing docs.

LENS-LRMS surfaces the same hierarchy in its web UI and exposes it on the API contracts shared with DARS, automation jobs, and downstream consumers. Aligning the two systems removes the per-team translation tax and avoids the "DARS calls it X, LRMS calls it Y" confusion that's been showing up in support tickets.

### Scope (Strong — UI + code + API contracts)

This Task asks for the **full propagation** of the rename, not just label changes:

1. **User-visible UI strings** — every label, column header, dropdown option, tooltip, helper text, badge, and empty-state copy in the LENS-LRMS web app that references "Data Category" / "Data Categories" should be updated to "Data Type" / "Data Types". Anything that today references "Data Category Group" / "Data Category Groups" should become "Data Category" / "Data Categories".
   - Rule of thumb: pluralization is context-sensitive — use "Data Type" (singular) for column headers and field labels showing one item, "Data Types" (plural) for counts and summaries.

2. **Code identifiers** — TypeScript / JS / C# property names, interface names, class names, helper functions, enum values, and constants that use the old vocabulary should track the rename:
   - `categoryGroup` / `categoryGroups` → `dataCategory` / `dataCategories`
   - `CategoryGroupConfig` → `DataCategoryConfig`
   - `categoryItem` / `dataCategory` (the old inner-level identifier) → `dataType`
   - `CategoryItemConfig` → `DataTypeConfig`
   - Helpers like `formatCategoryName`, `iterateServiceCategories`, etc., follow the same pattern.

3. **API contracts** — REST / OData / gRPC fields exposed by LENS-LRMS that use the old vocabulary need to rename too. Where the field is consumed by external systems (DARS, downstream jobs, partner integrations), coordinate the rename with consumers so the version bump or alias period doesn't break callers.
   - Suggest: add the new field name as a parallel alias for one release, deprecate the old name with a sunset date in the API changelog, then remove. Confirm the deprecation strategy with the API owners before shipping.

4. **DB / persisted-data schema** — column names, JSON property names in persisted payloads, message-bus event schemas, and any field used in saved filters / saved views. If a migration is needed (renaming a column), file as a child Task linked to this one.

5. **Documentation + training material** — `*.md` specs, runbooks, onboarding docs, internal wiki pages, and any training decks that use the old vocabulary.

### Reference — what DARS shipped

For parity, the DARS PR renamed the following UI surfaces (these are the LENS-LRMS analogues to look for):

| Surface | Before | After |
|---|---|---|
| Service-categories table column header | `Data Category` | `Data Type` |
| Submitted-jobs table column header | `Data Category` | `Data Type` |
| Plan-summary count tile | `Data Categories` | `Data Types` |
| Per-service breakdown column header | `Data Category` | `Data Type` |
| Identifier-list tooltip | `Data Categories:` | `Data Types:` |
| Identifier-list badge | `N categor{y|ies}` | `N Data Typ{e|es}` |
| Manual-collection table column header | `Data Category` | `Data Type` |
| Fulfillment-task filter label | `Data Category` | `Data Type` |
| Fulfillment-task filter all-option | `All Categories` | `All Data Types` |
| Wizard empty state | `No categories selected` | `No Data Types selected` |
| Wizard column header | `Data Categories` | `Data Types` |

DARS deliberately scoped to UI strings only and deferred code-identifier / API renames as a follow-up. **LENS-LRMS should do the full propagation in this Task** so the system isn't left half-renamed.

---

## Acceptance criteria

- [ ] No user-visible string in the LENS-LRMS web app renders "Data Category" (singular) for the inner / item level — all such labels read "Data Type" instead.
- [ ] No user-visible string renders "Data Categories" (plural) for the inner level — all such labels read "Data Types".
- [ ] No user-visible string renders "Data Category Group" or "Data Category Groups" for the outer level — all such labels read "Data Category" or "Data Categories" respectively.
- [ ] Property / class / interface names in the LENS-LRMS frontend and backend reflect the new vocabulary (`dataCategory`, `dataType`, `DataCategoryConfig`, `DataTypeConfig`, etc.). Old identifiers are removed (not just shadowed).
- [ ] Public API responses use the new field names. Where the field is consumed by external systems, a deprecation alias for the old name is documented in the API changelog with a sunset date confirmed by API owners.
- [ ] DB columns / JSON property names in persisted payloads track the rename, with a backfill migration if needed (file as child Task).
- [ ] Internal docs (`*.md`, wiki, training decks) reference the new vocabulary; obvious legacy mentions of the old terms are updated or annotated.
- [ ] A regression test pass on the LENS-LRMS web app confirms the existing functionality still works after the rename (no broken filter dropdowns, no broken saved views, no broken column resize state).

---

## Notes

- Coordinate the API rename with DARS so the DARS LENS-LRMS client is updated in lock-step. The DARS team contact for this rename is the case-form list-view workstream owner (Lisa Wu).
- The DARS PR is the reference implementation for the string-level changes — review the diff if you want a per-occurrence comparison.
- Saved filters / saved views that key off the old field names will need a localStorage migration or a one-time alias-resolution pass on load — confirm the LENS-LRMS strategy with the frontend owner.

---

## Suggested area path / tags

- **Area path**: `<LENS-LRMS team's area path — confirm before submitting>`
- **Iteration**: next available sprint, or backlog if waiting on API-owner alignment
- **Tags**: `vocabulary-rename`, `cross-team-alignment`, `dars-parity`
