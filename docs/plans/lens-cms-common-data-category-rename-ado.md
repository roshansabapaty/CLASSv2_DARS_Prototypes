# ADO Task — LENS-CMS / LENS-Common: rename "Data Category Group / Data Category" to "Data Category / Data Type"

> Draft for the LENS-CMS / LENS-Common ADO Task. Same vocabulary alignment as the LENS-LRMS Task — file as a sibling. Discovery-first framing because we're not yet sure whether the legacy terms live in one repo, both, or neither.

---

## Title

```
LENS-CMS / LENS-Common: rename "Data Category Group" → "Data Category" and "Data Category" → "Data Type" (discovery + apply)
```

---

## Description

### Context

DARS shipped a semantic-vocabulary update on 2026-05-28 and a companion ADO Task asks **LENS-LRMS** to propagate the rename through its UI, code, and API contracts:

- The concept formerly called **Data Category Group** is now **Data Category**.
- The concept formerly called **Data Category** is now **Data Type**.

This Task covers the same propagation for **LENS-CMS** (content-management service) and **LENS-Common** (shared library / contracts). Either, both, or neither may carry references to the legacy vocabulary — discovery comes first.

### Scope (Discovery → Apply)

**Phase 1 — Discovery (this Task):**

1. Grep both repos for: `Data Category Group`, `Data Category Groups`, `DataCategoryGroup`, `dataCategoryGroup`, `Data Category`, `dataCategory`, `categoryGroup`, `CategoryGroup`, `CategoryItem`, `Data Categories`, `dataCategories`, `categoryItem`.
2. Categorize each hit by surface:
   - **User-visible strings** (any UI rendered by CMS, content seeds, email templates)
   - **Code identifiers** (TypeScript / C# / shared types in LENS-Common)
   - **API / message-bus contracts** (request/response schemas, event payloads exposed by Common or CMS)
   - **DB / persisted-data schema** (CMS content store fields, persisted templates)
   - **Internal docs / specs** (`*.md`, OpenAPI specs, wiki pages)
3. Decide for each repo whether the rename is in scope. If **neither** repo carries the legacy terms, close this Task as "no-op confirmed".

**Phase 2 — Apply (file as child Tasks if either repo is affected):**

Per affected repo, apply the same rename rules DARS used:

1. **UI strings** — `Data Category` (inner) → `Data Type`; `Data Category Group` (outer) → `Data Category`. Pluralization context-sensitive.
2. **Code identifiers** —
   - `categoryGroup` / `categoryGroups` → `dataCategory` / `dataCategories`
   - `CategoryGroupConfig` → `DataCategoryConfig`
   - `categoryItem` / `dataCategory` (old inner identifier) → `dataType`
   - `CategoryItemConfig` → `DataTypeConfig`
3. **API / message-bus contracts** — rename fields, document the change in the LENS-Common changelog, and either:
   - Add the new field name as a parallel alias for one release, deprecate the old name with a sunset date confirmed by API owners and downstream consumers, then remove; **or**
   - Coordinate a breaking change with all consumers (DARS, LRMS, downstream jobs) and version-bump the contract.
4. **DB / persisted schema** — column / property renames with a backfill migration if needed (file as child Task per migration).
5. **Docs + specs** — update `*.md`, OpenAPI / Swagger files, internal wiki pages, training material.

### LENS-Common considerations

LENS-Common is a shared library — its types and contracts are consumed by **every** downstream service (DARS, LRMS, CMS, automation jobs, partner integrations). A rename in Common is effectively a versioned API change. Recommended approach:

- Identify every consumer of the renamed type / field via repo search across the LENS org (use the `ado-lens-clone` skill or `dev.azure.com/o365exchange` code-search) before deciding the deprecation strategy.
- Default to **parallel alias + sunset date** unless consumers actively need a breaking change.
- Coordinate the cut-over with the DARS team and the LRMS team so a single release contains all three sides aligned.

### LENS-CMS considerations

If CMS hosts content templates, email templates, or persisted user-facing copy that mentions "Data Category" / "Data Categories" today, those template strings need updating too — not just the code that renders them. Confirm whether translation files / localization resources exist (CMS would own those) and rename inside the translation source rather than at the rendering site.

---

## Acceptance criteria

- [ ] Both LENS-CMS and LENS-Common have been grep-audited and the discovery findings are attached to this Task (file list + per-file occurrence count, broken down by surface).
- [ ] For each affected repo:
  - [ ] User-visible strings use the new vocabulary (inner level → "Data Type" / "Data Types"; outer level → "Data Category" / "Data Categories").
  - [ ] Code identifiers reflect the new vocabulary (old identifiers removed, not just shadowed).
  - [ ] API / message-bus contracts use the new field names; deprecation aliases (if any) are documented in the LENS-Common changelog with a sunset date confirmed by consumers.
  - [ ] DB / persisted-data schema tracks the rename with a migration plan (child Task per migration).
  - [ ] Docs / specs / OpenAPI definitions reference the new vocabulary.
- [ ] If discovery shows **neither** repo carries the legacy terms, the Task is closed with a "no-op confirmed" comment summarizing what was checked.
- [ ] Regression test pass confirms downstream consumers (DARS, LENS-LRMS) still build and pass smoke tests after the cut-over.

---

## Notes

- Sibling Task for **LENS-LRMS** is filed separately — coordinate the cut-over so DARS, LRMS, and Common land in lock-step.
- DARS shipped UI strings only as the reference implementation; the per-occurrence diff is available on the DARS repo if you want a label comparison.
- DARS team contact for cross-team alignment: case-form list-view workstream owner (Lisa Wu).

---

## Suggested area path / tags

- **Area path**: `<LENS-CMS team's area path>` if discovery scopes to CMS; `<LENS-Common team's area path>` if it scopes to Common; both if it scopes to both. Confirm before submitting.
- **Iteration**: next available sprint, or backlog if waiting on cross-team coordination.
- **Tags**: `vocabulary-rename`, `cross-team-alignment`, `dars-parity`, `discovery`
