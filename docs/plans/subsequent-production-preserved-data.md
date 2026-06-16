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

**Work / status:**
1. ✅ **`ServiceCategoryTable` preserved support** — new optional `preservedData` prop; `isItemPreserved` locks the item (read-only) regardless of `isEditingCollectionScope`; preserved items render as locked rows with a **"Preserved · reuse (LNS-…)"** badge + status/date-range; excluded from "addable" and from toggling.
2. ✅ **Per-identifier (individual) wiring** — `Step2ServicesConfiguration` renderBody (the per-identifier config + the "Edit Fulfillment Plan" path) derives `svcPreservedData` from `identifier.services[*]…preservedFromCaseId` and passes it + guards `onToggleItem`.
3. ⏳ **Bulk / unified wizard paths** — the other two `ServiceCategoryTable` render sites (`Step2…:2071` bulk mode, `UnifiedIdentifiersView:276`) are cross-identifier and don't yet thread per-identifier preserved data. Needed before a fresh Triage→Fulfillment reliably shows reuse rows in the default (bulk/unified) view.
4. ⏳ **Flip `LNS-2026-00230` to `Waiting on Triage`** once the bulk/unified paths are covered.

Until 3–4 land, `00230` stays on **Collection** (safe). The reuse rows are already visible via the **per-identifier config / "Edit Fulfillment Plan"** path.

## Out of scope (future)
- A forward-link on the EPOC-PR to its EPOC-ER successor(s).
- Real preserved-snapshot retrieval from LENS-CMS (prototype clones the parent case's jobs).
