# CMS Request Type and Sub-Type Schema Update Spec

## Purpose

Define the canonical enum values for request types and request sub-types in the CMS database, based on the approved Visio taxonomy (April 1, 2026), and define deterministic mappings between them.

## Scope

- Update CMS database enum/domain values for request types.
- Update CMS database enum/domain values for request sub-types.
- Add and seed a mapping table that constrains valid sub-type choices per request type.
- Ensure `None` is supported as the default sub-type when a request type has sub-types.

## Source of Truth

- Source artifact: request-type/sub-type Visio exported image provided by product team.
- Effective date: 2026-04-01.

## Canonical Enum Values

### RequestType (19 values)

1. Search Warrant
2. Preservation
3. Subpoena
4. Court Order
5. Duplicate
6. Civil Demand
7. Not Valid
8. NSL
9. Other
10. LEPortal Feedback
11. Witness Testimony
12. Civil
13. IREQ
14. Summons
15. International Order
16. Consent Release
17. PRTT
18. Emergency Letter
19. Lawful Intercept

### RequestSubType (23 values)

1. Administrative
2. AU Cloud
3. Civil
4. Consent Release
5. Content Disclosure
6. Defense Counsel
7. Digital Safety (was Evidence Hold)
8. eEvidence
9. Extension
10. FACTA
11. Judicial Order
12. Lawful Intercept
13. Microsoft Business Records
14. Non-Content Disclosure
15. Non-Judicial Order
16. None
17. Preservation
18. PRTT
19. Renewal
20. Start
21. Stop
22. UK COPO
23. Urgent

## Mapping Rules

1. The valid combinations of request type and request sub-type are defined only by the mapping file:
   - `src/specs/request_type_subtype_mapping.csv`
2. If a request type has at least one sub-type in the mapping, `None` is the default sub-type unless otherwise specified by workflow logic.
3. If a request type has no mapped sub-types, store `request_sub_type = NULL`.
4. Request creation/update must reject any request type/sub-type pair not present in the mapping table.

## LE Portal Visibility Metadata

The Visio indicates green-filled request types are LE Portal visible. If CMS stores visibility in schema/config, seed `is_le_portal_visible` as follows:

- `true`: Search Warrant, Preservation, Subpoena, Court Order, Witness Testimony, Summons, International Order, Consent Release, PRTT, Emergency Letter, Lawful Intercept
- `false`: Duplicate, Civil Demand, Not Valid, NSL, Other, LEPortal Feedback, Civil, IREQ

## Recommended Relational Model

Use lookup tables instead of hard DB enum types for easier future taxonomy changes.

### Tables

- `request_type_lookup`
  - `id` (PK)
  - `name` (unique, not null)
  - `is_le_portal_visible` (not null, default false)
  - `is_active` (not null, default true)
  - `created_at`, `updated_at`

- `request_sub_type_lookup`
  - `id` (PK)
  - `name` (unique, not null)
  - `is_active` (not null, default true)
  - `created_at`, `updated_at`

- `request_type_sub_type_map`
  - `request_type_id` (FK -> `request_type_lookup.id`)
  - `request_sub_type_id` (FK -> `request_sub_type_lookup.id`)
  - `is_default` (not null, default false)
  - PK (`request_type_id`, `request_sub_type_id`)
  - Unique filtered index to allow max one default per request type

- `case_request` (or existing case table)
  - `request_type_id` (FK -> `request_type_lookup.id`, not null)
  - `request_sub_type_id` (FK -> `request_sub_type_lookup.id`, nullable)

## Migration Plan

1. Create lookup and mapping tables.
2. Seed `request_type_lookup` with the 19 values above.
3. Seed `request_sub_type_lookup` with the 23 values above.
4. Seed `request_type_sub_type_map` from `request_type_subtype_mapping.csv`.
5. Mark `is_default = true` for rows where sub-type is `None`.
6. Backfill existing case/request records:
   - Map legacy request type strings to new canonical names.
   - Map legacy sub-type strings to new canonical names.
   - If missing or invalid sub-type for a mapped request type, set to `None` when available.
7. Add write-time validation in API/service layer for allowed pairs.
8. Add read-time compatibility adapter (if needed) for old clients.

## Data Validation Requirements

1. API validation rejects non-canonical request type values.
2. API validation rejects non-canonical request sub-type values.
3. API validation rejects invalid pairings not in `request_type_sub_type_map`.
4. If request type has mapped sub-types and sub-type omitted, API sets default `None`.

## Reporting and Auditing Requirements

1. Any create, update, deactivate, or remap action on request type/sub-type taxonomy must be audit-logged with:
  - actor identity (user/service principal)
  - timestamp (UTC)
  - action type (`CREATE`, `UPDATE`, `DEACTIVATE`, `MAP_ADD`, `MAP_REMOVE`, `DEFAULT_CHANGE`)
  - previous value(s) and new value(s)
  - correlation/request ID
2. Case-level changes to `request_type` or `request_sub_type` must be audit-logged with before/after values.
3. Audit records must be queryable for compliance reporting for at least 10 years (or longer per regional policy).
4. Reporting views/exports must support grouping by canonical request type and canonical request sub-type.
5. Reporting logic must use canonicalized values after migration so legacy aliases do not create duplicate buckets.
6. A monthly data quality report must surface:
  - unmapped or invalid type/sub-type combinations (expected = 0)
  - null sub-type counts where `None` should have been defaulted
  - counts by request type and sub-type for trend monitoring
7. Filtered views and reporting must support counting cases by these dimensions:
  - `request_type`
  - `request_sub_type`
  - `country`
  - `content_released` (boolean: whether any content was released)
  - `resolved_date` (date case reached resolved status)
8. Reporting output must allow slicing and filtering combinations of the above fields (for example: Request Type + Request Sub-Type + Country + Content Released + Resolved Date range).
9. Canonical `content_released` determination in CMS: set `content_released = true` when at least one data category delivery job status is `completed`; otherwise `false`.
10. CMS must persist `first_resolved_at` as the first timestamp when case stage/status transitions to `Resolved`.
11. `first_resolved_at` is immutable and must not be overwritten if a case is later reactivated/reopened and resolved again.
12. If a case is reactivated, CMS should also persist `latest_resolved_at` (or equivalent) for operational tracking; reporting for "cases resolved in period" must use `first_resolved_at` unless a report explicitly requests latest resolution.
13. Resolved-date reporting fields must be normalized to UTC date for aggregation consistency.

## Backward Compatibility Notes

Potential legacy naming normalizations:

- `LE Portal Feedback` -> `LEPortal Feedback`
- `Evidence Hold` -> `Digital Safety (was Evidence Hold)`

If legacy values exist, normalize during backfill or in API translation layer.

## Acceptance Criteria

1. All 19 request type values exist in lookup table and are queryable.
2. All 23 request sub-type values exist in lookup table and are queryable.
3. Mapping table exactly matches `request_type_subtype_mapping.csv`.
4. Every mapped request type that includes `None` has exactly one default row.
5. Invalid request type/sub-type pairs are blocked at API and DB validation layer.
6. Existing records migrate without data loss.
7. Audit log entries are emitted for taxonomy and case-level request type/sub-type changes.
8. Reporting outputs group correctly by canonical request type/sub-type with no duplicate legacy buckets.
9. Reporting and filtered views can return case counts split by request type, request sub-type, country, content released flag, and resolved date.
10. `content_released` values in reports match CMS delivery job status logic (`data category delivery job status = completed`).
11. `first_resolved_at` is populated on first resolution and remains unchanged after reactivation/reopen cycles.
12. "Cases resolved within a specified time period" report returns counts based on `first_resolved_at` by default.

## Test Cases (Minimum)

1. Insert `Search Warrant + Microsoft Business Records` succeeds.
2. Insert `Search Warrant + None` succeeds.
3. Insert `Search Warrant + Administrative` fails.
4. Insert `International Order + UK COPO` succeeds.
5. Insert `Lawful Intercept + Renewal` succeeds.
6. Insert `Duplicate + AnySubType` fails unless explicitly mapped.
7. Insert mapped request type with null sub-type defaults to `None` (where defined).
8. Update a taxonomy mapping and verify audit entry includes actor, action, before/after, and timestamp.
9. Update a case from one sub-type to another and verify case-level audit trail is written.
10. Run reporting aggregation and verify legacy aliases roll up into canonical buckets only.
11. Query/report case counts grouped by Request Type + Request Sub-Type + Country and verify totals match source cases.
12. Filter report by `content_released = true` and verify only cases with at least one data category delivery job status of `completed` are included.
13. Filter report by resolved date range and verify only cases resolved within the range are counted.
14. Resolve a case for the first time and verify `first_resolved_at` is set.
15. Reactivate and resolve the same case again; verify `first_resolved_at` is unchanged and `latest_resolved_at` updates (if implemented).
16. Run "resolved in period" report and verify counting is based on `first_resolved_at` by default.
