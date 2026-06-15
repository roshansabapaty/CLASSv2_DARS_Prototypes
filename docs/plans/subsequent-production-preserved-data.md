# Subsequent Production — preserved data → package & delivery

**Status:** Phases 3a + 3b implemented
**Owner:** DARS eEvidence
**Last updated:** 2026-06-15
**Closes:** the Workflow-5 (Subsequent Production) end-to-end gap flagged in `docs/eEvidence-Workflow-Validation.md`, and the follow-up logged in `docs/plans/inbound-eevidence-form-views.md`.

## Goal
When an EPOC-ER (EPOC Disclosure) case is a **subsequent production** following a prior EPOC-PR (preservation), its Collection stage presents the production scope as **preserved data** — collection already done under the parent — so the RS goes straight to **Package & Delivery**, with no fresh collection.

## Decisions (2026-06-15)
- **Seeding source:** dynamic — clone the linked parent EPOC-PR's jobs at case-open. (Not hardcoded.)
- **Demo case:** enhance `LNS-2026-00230` (already links to `00220`) into the end-to-end WF5 demo — advance to Collection, seed preserved jobs, `eevidenceWorkflow: 5`.
- **Scope editability:** preserved jobs are **read-only** (re-scoping / adding supplemental jobs is a later enhancement).

## Model notes (current)
- Jobs derive in `CollectionTracker.tsx` (`allPipelineJobs`) from `formData.identifiers[*].services[*].categoryGroups[*]` items (`SubCategory`), each with `collectionStatus` / `publishStatus` / `deliveryStatus`.
- An EPOC-ER is **not** `isEpocPrCase`, so its Package + Delivery stages render. Seeding jobs as `collectionStatus: "Complete"` makes them publishable immediately → the existing Submit-to-Publish → Review-&-Deliver flow handles them.
- `caseStage: "In Progress"` → `getWorkflowStageFromCaseStage` → lands on **collection**.
- `00230` reuses `00220`'s identifier *values*, so matching by `AccountIdentifier.value` works.

## Phase 3a — model + seeding + wiring
1. `SubCategory.preservedFromCaseId?: string` (caseTypes.ts) — marks a job as sourced from a parent's preserved snapshot.
2. `utils/subsequentProduction.ts`:
   - `getPreservationParentRef(formData)` — the `eevidenceRelatedCases` entry with subtype `EPOC-PR`.
   - `isSubsequentProduction(formData)` — eEvidence EPOC-ER with a PR parent.
   - `seedPreservedJobs(epocEr, parent)` — for each EPOC-ER identifier, clone the matching parent identifier's `services` (by value), then normalize every enabled item to `collectionStatus: "Complete"`, `publish/deliveryStatus: "Not Started"`, `preservedFromCaseId = parent.caseId`.
   - `applySubsequentProduction(formData)` — fetch the parent via `getCaseFormDataById` and seed.
3. `App.handleCaseSelect` — run `applySubsequentProduction` on the opened case's FormData before `setSharedFormData`.
4. `LNS-2026-00230` — `caseStage: "In Progress"` (builder + queue-types) + `eevidenceWorkflow: 5`.

## Phase 3b — Collection UI ✅
5. A "**Subsequent production — data already preserved**" banner on the Collection page (green), with the parent EPOC-PR case clickable via `onOpenCase`.
6. `PipelineJob.preserved` / `preservedFromCaseId` (derived from the SubCategory) → a "**Preserved**" badge on jobs.
7. **Submit-to-Package modal:** each preserved job row shows the data category/type, a "Preserved" badge, the **date range** (`startDate – endDate`), and the **collected** date so the RS can review and select it to package.

## Out of scope (future)
- Adding supplemental NEW jobs beyond the preserved scope.
- A forward-link on the EPOC-PR to its EPOC-ER successor(s).
- Real preserved-snapshot retrieval from LENS-CMS (prototype clones the parent case's jobs).
