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

## Mixed preserved + new jobs ✅
A subsequent-production order can add services / data categories / data types that were NOT in the EPOC-PR. The seeding **overlays** the parent's preserved jobs onto the EPOC-ER's own scope (`overlayPreservedServices` in `subsequentProduction.ts`) rather than replacing it: preserved items → collection-`Complete` + `preservedFromCaseId`; the EPOC-ER's own NEW items are left untouched (`Not Started`) so they still need fresh collection. The Collection page badges preserved jobs "Preserved" (identifier header, expanded category rows, and the Submit-to-Package / Review-&-Deliver / Complete views); new jobs flow through the normal Start Collection path. `LNS-2026-00230` seeds one new OneDrive-content job to demo the mix.

## Manual vs automated new jobs
New jobs carry the data type's `automated` flag. **Automated** → Start Collection drives Not Started → Started → Complete (Refresh Pipeline). **Manual** → the RS collects via the external tool, uploads to the SAS content boundary, then manually marks the collection status Complete (Start Collection does not apply). `LNS-2026-00230` seeds one of each: MSA Basic Subscriber Data (automated) + OneDrive Content (manual).

## Phase 4b — Triage → Fulfillment with preserved-reuse rows (PENDING)
Decided 2026-06-15: a subsequent-production EPOC-ER should route through **Triage → Fulfillment → Collection** (not open straight on Collection), and the Fulfillment wizard should surface the preserved jobs as **read-only "Preserved · reuse" rows** (service · data category · data type · date range) so the RS doesn't submit duplicates and reuses the previously-collected data. Status model stays **Complete + "Preserved" badge** (no new status).

**Why it's a correctness requirement, not just a label:** the fulfillment submit recomputes each job's `collectionStatus` (`useCaseWorkflow.ts:255-261`) and writes services back (`FulfillmentWizard.tsx:705`). So preserved jobs MUST be **locked** in the wizard (excluded from the submit recompute) or a fulfillment submit would overwrite their preserved-`Complete` status.

**Correctness is already handled** (verified): the fulfillment submit keeps existing-jobId jobs as-is (`useCaseWorkflow.ts:366,480` — `isExistingJob = !!category.jobId`), and `handleFinish` MERGES from `latestIdentifier.services` (`FulfillmentWizard.tsx:642`). Preserved jobs carry a `jobId`, so they survive Triage→Fulfillment→submit without losing their preserved-`Complete` status. So Phase 4b is the read-only **reuse UX**, not a data-loss fix.

**Work / status — ✅ COMPLETE:**
1. ✅ **`ServiceCategoryTable` preserved support** — new optional `preservedData` prop; `isItemPreserved` locks the item (read-only) regardless of `isEditingCollectionScope`; preserved items render as locked green rows with a **"Preserved · reuse (LNS-…)"** badge + Collection Job ID + `Complete` status + preserved date range; excluded from "addable" and from toggling.
2. ✅ **Live wiring — `UnifiedIdentifiersView`** (the reframed Step 2 UI, rendered unconditionally). Derives `svcPreservedData` from `identifier.services[serviceId].categoryGroups` items carrying `preservedFromCaseId` (NOT gated on `isEditingCollectionScope`), passes `preservedData`, and guards `onToggleItem`. Also wired the per-identifier `IndividualServiceConfigDialog`.
   - **Note:** the legacy `configMode` bulk/individual blocks (incl. the `Step2…:2071` `ServiceCategoryTable`) are dead code — wrapped in `{false && (…)}` (`Step2…:1777`, "Legacy Mode Selection (hidden)"). The single LIVE Step 2 table is in `UnifiedIdentifiersView`, so no bulk-path wiring was needed.
3. ✅ **`subsequentProduction.ts` jobId guarantee** — `overlayPreservedServices` now synthesizes a stable `jobId` (`PRES-<parent>-<svc>-<group>-<item>`) when the cloned parent item lacks one, so the Fulfillment submit treats preserved jobs as EXISTING (`useCaseWorkflow isExistingJob = !!category.jobId`) and never recomputes their `Complete` status.
4. ✅ **`LNS-2026-00230` flipped to `Waiting on Triage`** (builder + queue-types). It now routes Triage → Fulfillment (reuse rows shown) → Collection → Package & Delivery, with the seeded new jobs (automated MSA subscriber + manual OneDrive content) still requiring fresh collection.

**End-to-end demo (00230):** open from queue → Triage → advance to Fulfillment → wizard shows the preserved MSA/Email jobs as locked "Preserved · reuse (LNS-2026-00220)" rows + the two new jobs as normal selectable rows → submit → Collection page shows preserved jobs `Complete` (Preserved badge) ready to package, new jobs `Not Started` to collect.

## Out of scope (future)
- A forward-link on the EPOC-PR to its EPOC-ER successor(s).
- Real preserved-snapshot retrieval from LENS-CMS (prototype clones the parent case's jobs).
