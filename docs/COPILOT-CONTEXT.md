# DARS eEvidence Prototype — Context for Copilot

This file is a single-shot context dump you can paste / upload to Copilot so a
fresh session understands the project as well as the Claude sessions that built
it. It covers architecture, schemas, conventions, recent feature work, and
where to look for more detail.

Authored 2026-06-03 by the Claude session author; reflects the state of the
repo at commit `8c78e13`.

---

## 1. Project at a glance

DARS_eEvidence is a **React + Vite + TypeScript prototype** for Microsoft's
Digital and Regulatory Solutions Law Enforcement Request system. It models the
end-to-end workflow that triage and response specialists use when Microsoft
receives a legal-demand request (subpoena, search warrant, EU eEvidence EPOC,
UK COPO order, etc.) and walks it through Triage → Fulfillment → Collection →
Publish → Delivery → Resolved.

- **Repo**: `C:\R\DARS_eEvidence` (mirrored at
  `https://github.com/lisawu_microsoft/dars-eevidence-prototype`, EMU-managed,
  private).
- **Related production repo**: `C:\R\LENS-LRMS` — the actual LENS LRMS web
  client (synced from `dev.azure.com/o365exchange/O365 Core/_git/LENS-LRMS`).
  DARS_eEvidence is a UX prototype that explores changes ahead of LRMS.
- **Personas modelled**:
  - **TS** — Triage Specialist (intake + classification)
  - **RS** — Response Specialist (fulfillment + delivery)
  - **Attorney** — escalation reviewer; has a dedicated Attorney Dashboard +
    Attorney case view distinct from the standard case form

## 2. Tech stack + UI library policy

- React 18 · Vite 6 · TypeScript 5 · pnpm/npm
- **Fluent UI v9 (`@fluentui/react-components`) + Griffel `makeStyles(tokens)`**
  for new code
- **shadcn/ui (Radix-based)** is the legacy UI layer; allowed in untouched
  files but every touched file must migrate to Fluent v9.
- `.shadcn-allowlist.txt` tracks the surgical exceptions.
- **Griffel quirk**: rejects CSS shorthand (`border`, `padding`). Use long-form
  per-side props (`borderTopStyle` + `borderTopWidth` + `borderTopColor`, etc.).
- **FluentProvider trap**: the root `FluentProvider` in `src/App.tsx` needs
  `style={{ height: "100%" }}` but **never** `className` (whiteout regression).
  Nested FluentProviders inside the root tree can also cause issues — prefer
  one root provider and let it scope the whole app.
- **Type-erased imports**: TypeScript-only `React.ReactNode` works without
  `import React`, but **`<React.Fragment>` is a runtime value** — every file
  that uses it needs `import * as React from "react"`. Vite's automatic JSX
  runtime won't catch the missing import; you'll see a blank page at runtime.

## 3. Core architecture concepts

### 3.1 FormData — the case shape

Every case is a `FormData` object (see `src/types/caseTypes.ts`). Critical
fields:

- `caseId: "LNS-YYYY-NNNNN"` — canonical identifier
- `requestType: string` — `"eEvidence"`, `"COPO Order"`, `"Subpoena"`,
  `"Search Warrant"`, etc.
- `requestSubType?: string` — for eEvidence: `"EPOC"`, `"EPOC ER"`, `"EPOC PR"`,
  `"EPOC PR Extension"`
- `caseStage: string` — `"Waiting on Triage"` → `"Triage Complete"` →
  `"In Progress"` → terminal states (`"Resolved"`, `"Cancelled"`,
  `"Withdrawn"`, `"Rejected"`)
- `identifiers: AccountIdentifier[]` — target identifiers
- `enterpriseContext?: EnterpriseContext` — multi-tenant tenant context
- `attorneyEscalation?: AttorneyEscalation` — case-level escalation block (the
  per-identifier block on `AccountIdentifier` is the canonical write path)
- `escalationAuditEvents?: EscalationAuditEvent[]` — append-only audit thread
- `notes?: CaseNote[]` — free-form notes with `subType` discriminator
- `correspondence?: CorrespondenceItem[]` — inbound + outbound items

### 3.2 SignalScope — unified scope discriminated union

Every authority/specialist write into FormData carries a `SignalScope`. From
`src/types/caseTypes.ts`:

```ts
type SignalScope =
  | { kind: "all" }
  | { kind: "tenant"; tenantId: string }
  | { kind: "tpid"; tpid: string }
  | { kind: "some"; identifierIds: string[] }
  | { kind: "none" }
```

- `"all"` — case-wide. **Hybrid storage**: written to the case-level field
  AND replicated onto every identifier.
- `"tenant"` / `"tpid"` — multi-tenant variants. Resolved to a subset of
  identifiers, then stored per-identifier (case-level field cleared).
- `"some"` — explicit identifier list.
- `"none"` — audit-only.

The unified write helpers in `src/utils/caseEscalation.ts` enforce the
hybrid-storage rule. Read-side callers use `getActiveAttorneyEscalation(c)`
which prefers per-identifier, falls back to case-level.

### 3.3 Attorney escalation lifecycle + de-escalation

`AttorneyEscalationStatus` values: `Pending` · `ApprovedForDelivery` ·
`ApprovedWithConditions` · `InformationRequested` · `Blocked`.

The four attorney CTAs map to status transitions:

| CTA | Resulting status | Ball with… | De-escalated? |
|---|---|---|---|
| Release | `ApprovedForDelivery` | RS (proceed with delivery) | Yes (terminal) |
| ApproveWithConditions | `ApprovedWithConditions` | RS (acknowledge then deliver) | Yes (terminal w/ conditions) |
| RequestMoreInformation | `InformationRequested` | RS (reply, then ball returns to attorney) | Partial — ping-pong |
| Block | `Blocked` | RS (legal cleanup; held) | Yes (terminal) |

The `EscalationNotesCard` (Attorney case view, §5 below IdentifierTable) shows
the original RS escalation reason + every action note + a header badge
declaring de-escalation state. Free-form notes added via the compose area are
stored as `formData.notes[]` with `subType: "escalation"` so they thread in.

### 3.4 Mutual exclusivity invariant — Consumer XOR Enterprise

An identifier resolves to **Consumer OR Enterprise, never both**. Enforced at
three layers:

1. **Writers** — the random rolls in `runAccountExistenceCheck`,
   `FulfillmentWizard.handleCheckAllAccounts`, and `Step1IdentifierReview`
   pick one type per identifier then derive both booleans from it.
2. **Runtime normalizer** — `normalizeAccountExistence` + `normalizeIdentifierAccountType`
   in `src/utils/accountExistenceCheck.ts` coerce any block with both flags
   true to Enterprise (with `console.warn`), and walk cross-service drift on
   the same identifier.
3. **Seeds** — `mockCaseData.ts` previously had id1 with both flags true; fixed.

For Enterprise accounts, **Last logon + IP-resolves (30d)** are suppressed in
the `UserPanel` (Tier 2 Target Identifier card) because that telemetry is
tenant-administered, not per-user. Mailbox region / OneDrive region /
Conflict-of-law stay — they're tenant-level facts.

### 3.5 LE → internal service mapping

`src/utils/resolveExternalServices.ts` translates LE-supplied external service
names (e.g., `"Email"`, `"SharePoint"`) to internal LENS service keys via
`LE_EXTERNAL_SERVICE_MAP` in `src/config/leExternalServiceMap.ts`.

Five resolution statuses:

| Status | When it fires |
|---|---|
| `resolved` | success |
| `unmapped-name` | external name not in the map (typo, deprecated product) |
| `missing-account-type` | account check hasn't run yet (transient) |
| `wrong-account-type` | e.g., SharePoint requested on a Consumer identifier (SP is Enterprise-only) |
| `internal-key-missing` | map says "→ X" but X is gone from the LENS catalog |

The `LEReviewPanel` in `src/components/fulfillment-wizard/` renders unresolved
rows with a red `unmappedChip` Tag. `validateIdentifier.ts` surfaces
`le-service-unmapped` and `le-category-unmapped` informational chips on Step 1.

**EU eEvidence is the canonical channel where this failure mode appears in
production** — Form 1's Services / Data Categories / Data Types / Date Range
fields are free-form text. UK COPO uses a closed-list Home Office template so
the unmapped-name path is effectively unreachable from that channel.

Demo case: **LNS-2026-00310** (Romanian DIICOT EPOC ER) — three identifiers
exercise every failure mode. Each identifier also carries a structured
`leExternalCategoryRequests` payload (LE's verbatim category names + data type
lists + per-category date ranges) so the failure surface has real content.

### 3.6 EnterpriseContext + TPID rollups

`EnterpriseContext` has `org: EnterpriseOrgContext` (legacy single-tenant) and
`orgs?: EnterpriseOrgContext[]` (multi-tenant). Read via
`getEnterpriseOrgs(c)` which handles both shapes.

`EnterpriseOrgContext` carries (recent additions in bold):

- `tenantId`, `parentTpid?`, `parentTpidDisplayName?`
- `tenantPrimaryDomain`, `tenantDisplayName`, `hqCountry?`
- `exchangeSeatCount?`, `isS500?`, `hasDerogation?`, `customContractLanguage?`
- `accountManager?`, `adminContact?`
- `sharePointRegion?`, `defaultStorageRegion?`
- **`tenantCreatedAt?: Date`** — UTC-rendered in OrgPanel
- **`tenantMailingAddress?: { street?; number?; city?; stateProvince?; postalCode?; country? }`**
- **`tenantPhone?: string`** — distinct from `adminContact.phone`
- **`domains?: Array<{ name; verified; isPrimary; domainType: "onmicrosoft" | "custom" }>`**
- `provenance?: Partial<Record<keyof EnterpriseOrgContext, string>>`

**TPID parent-tenant lookup**: `getParentTenantOrg(parentTpid)` in
`src/utils/caseEscalation.ts` looks up the holding-company tenant. Convention:
parent tenants seed themselves with `tenantId === parentTpid` and no
`parentTpid` of their own. The `OrgPanel` renders child domains + parent
domains as two labeled groups when a parent record exists.

Seeded parents today: `TPID-CONTOSO` (Contoso Holdings), `TPID-KONTOSO`
(Kontoso Holdings). Other TPIDs in `MOCK_ORGS` carry `parentTpid` but no
parent record — the parent-domain group simply doesn't render (graceful).

### 3.7 Production Letters service (UK COPO scaffolding)

`src/config/lensServicesConfig.ts` carries a `productionLetters` service with:
- `requestTypeScope: ["COPO Order"]` — auto-enabled when `requestType === "COPO Order"`
- One category group `disclosureLetters` with one item `affidavit` (manual)
- Drives an Affidavit upload affordance per-identifier on UK COPO cases

`createDefaultIdentifierServices(requestType?)` consumes the scope; scoped
services are enabled with their `defaultSelected` items pre-selected.
`applyRequestTypeServiceDefaults(services, requestType)` is the idempotent
normalizer for case-load paths.

### 3.8 Login activity / cross-border

`ipHistoryStore` (`src/state/ipHistoryStore.ts`) is a module-level singleton
read via `useSyncExternalStore`. Populated by **Check Accounts handlers** as a
side-effect — when Check Accounts runs, Consumer identifiers also get a
30-day-window login query queued via `loginQuery.ts`, results land in
`ipHistoryStore`. **Enterprise identifiers are explicitly excluded** from the
side-effect; their cross-border determination is org-level (Tenant Home
Location vs IA country) and surfaces in `OrgPanel`.

UI:
- `LoginLocationPanel` (cross-border drawer) — title swaps to **"Consumer
  User Locations"** for Consumer identifiers
- `IdentifierTableRow` column **"Consumer User Location Summary"** shows the
  most-recent country + city + time/date
- Action button on Consumer rows is labelled **"Consumer User Locations"**

## 4. Mock data conventions

- Case files: `src/utils/mockCaseDataLENS<YYYYNNNNN>.ts`, each exports a
  `build<...>FormData()`.
- Registry: `src/utils/caseDataRegistry.ts` (`CASE_DATA_BUILDERS` map) and
  `src/components/case-queue/case-queue-types.ts` (`MOCK_CASES` queue rows).
  **Both** need an entry to surface in the queue + open from a case row.
- Tenant catalogue: `src/data/mockOrgs.ts` (`MOCK_ORGS` map) — keyed by a
  short slug (e.g. `"contoso-com"`, `"kontoso-de"`).
- Prior tenant history: `src/data/mockPriorHistory.ts` indexed by tenantId.

Notable demo cases:

| Case | Scenario |
|---|---|
| `LNS-2026-00150` | EU eEvidence (German) — Kontoso GmbH single-tenant; foundational Phase 1 + attorney escalation |
| `LNS-2026-00160` / `00170` | UK COPO walkthroughs (City of London / Metropolitan) |
| `LNS-2026-00190` | Manifest-error scenario (IA claims Enterprise; CLASS says Consumer) |
| `LNS-2026-00265` | Greek EPOC ER · Workflow 7 audit-thread demo · 4 chronological events |
| `LNS-2026-00270` | Mixed manual + automated jobs demo |
| `LNS-2026-00280` | Portuguese eEvidence withdrawal (Workflow 8) |
| `LNS-2026-00300` | Multi-tenant TPID-CONTOSO (Contoso Corp US + Contoso France) |
| `LNS-2026-00310` | LE → internal service **mapping failure demo** (Romanian DIICOT EPOC) |

## 5. Workflow stages + state machine

- `WorkflowStage` (LRMS-side): Intake → Triage → Fulfillment → Publish → Complete
- `WorkflowState` (LRMS-side, 16 values): `WaitingOnTriage` · `InProgress` ·
  `RecommendRejection` · `Withdrawn` · `Rejected` · `TriageComplete` ·
  `NoDataProvided` · `PublishInProgress` · `PartiallyPublished` ·
  `Resolved` · `Cancelled` · `Invalid` · `NoDataFound` · `InReview` ·
  `DeliveryInProgress` · `DeliveryComplete`

(In DARS_eEvidence the equivalent fields live on `FormData.caseStage` +
`workflowStage`; LRMS uses the explicit state-machine.)

`AuthorizationDesiredStatus` (case-level): `Active` · `Cancelled` ·
`Withdrawn` · `Suspended` · `Expired`. `AuthorizationDesiredTaskStatus`
(per-task): `Requested` · `Active` · `Cancelled` · `Updated` · `Paused`.
Terminal values trigger `cancellationLocked` which gates Package + Deliver.

## 6. UI surfaces that matter

### Case Queue (`src/components/CaseQueue.tsx`)
- 3 view modes: Cards / Detailed list / Preview pane
- Persisted view + column widths in localStorage (`dars.caseQueue.*` keys)
- **Column reorder + sort + drag-auto-scroll** (recent work):
  - All columns are sortable (`sortable: true` everywhere in `CASE_LIST_COLUMNS`)
  - Drag column header to reorder; Fluent v9 `Menu` button at the right edge
    for accessibility-first reorder
  - Persisted at `dars.caseQueue.columnOrder` (Attorney Dashboard uses
    `dars.attorneyDashboard.columnOrder` — independent)
  - `useDragAutoScroll` hook auto-scrolls the table when dragging near edges

### Attorney Dashboard (`src/components/app-shell/AttorneyDashboard.tsx`)
- Filters: jurisdiction · sort-by menu · advanced filters panel
- Same column reorder + sort wiring as Case Queue, independent storage key

### Attorney case view (`src/components/attorney-escalation/AttorneyReviewWorkspace.tsx`)
- Top bar: back · case id · Attorney Review chip · escalation reason badges ·
  Show DARS Request View · Show Correspondence Hub · Show Legal Demand ·
  Simulate authority signal
- Body (5 cards, in render order):
  1. **EnterpriseTriPaneSummary**
  2. **AttorneyReviewPanel** (case-level decision surface)
  3. **IdentifierTable** (sorted attorney-action-first; read-only)
  4. **EnterpriseContextSection** (positioned after the table because its
     data is downstream of Check Accounts)
  5. **EscalationNotesCard** — original RS reason + chronological attorney
     action notes + free-form compose area; header badge declares
     de-escalation state

### Case form (`src/components/DataEntryForm.tsx`)
- Mounts `EnterpriseContextSection` after the Account Identifiers card (same
  reasoning — Check Accounts is upstream of the Enterprise data)
- Embeds `PriorTenantHistoryPanel` so RS/TS can view prior cases on a tenant
  from the IdentifierTable's "View other cases on this tenant" link

### Fulfillment Wizard Step 1 (`src/components/FulfillmentWizard.tsx`)
- "Identifier & Services" step mounts `EnterpriseContextSection` below the
  IdentifierTable

## 7. Persistence keys (localStorage)

- `dars.caseQueue.viewMode`
- `dars.caseQueue.columnWidths`
- `dars.caseQueue.columnOrder`
- `dars.attorneyDashboard.columnOrder`
- `dars.identifierPanel.open`
- (plus pane-visibility hooks under `dars.*.visible`)

## 8. Repo workflow

- **Backup script** `scripts/backup.ps1`: `.\scripts\backup.ps1 "<message>"`
  stages everything tracked, commits, and pushes. Confirms before applying
  unless `-SkipConfirm`. Lisa's preferred pattern is to **split a single
  backup invocation across multiple commits** when the staged diff spans
  unrelated feature areas — each commit gets its own descriptive message,
  the whole bundle pushes in one go.
- **Plans sync** `scripts/sync-plans.ps1`: mirrors
  `C:\Users\lisawu\.claude\plans\*.md` into `docs/plans/` so RFC plans
  stay versioned with the code.
- **UAT deliverables** `scripts/generate-uat-deliverables.cjs`: reads a UAT
  markdown source, produces `.xlsx` (9-column SharePoint template per-step
  layout) + `.docx` (decision-tree companion). Args: `<source.md> [<title>]`.

## 9. UAT plans

| Plan | What |
|---|---|
| [`docs/UAT-MockCases.md`](UAT-MockCases.md) | Foundational UAT covering the eEvidence + COPO + subpoena scenarios |
| [`docs/uat/UAT-UKCOPO.md`](uat/UAT-UKCOPO.md) | UK COPO test plan for the DARS prototype — 89 tests, 3 families + decision trees |
| [`docs/uat/UAT-UKCOPO-LRMS.md`](uat/UAT-UKCOPO-LRMS.md) | UK COPO test plan for the **production LENS-LRMS** WebClient — 34 click-by-click granular tests across 4 families |
| `docs/plans/` | RFC plans mirrored from `~/.claude/plans/` |

## 10. Code conventions worth knowing

- **Default to writing no comments.** Only add one when the WHY is non-obvious
  (hidden constraint, subtle invariant, surprising behavior). Don't explain
  WHAT — well-named identifiers do that.
- **No backwards-compat shims** unless explicitly asked. Delete unused code
  outright rather than commenting it out.
- **Long-form border properties** under Griffel (`borderTopStyle`,
  `borderTopWidth`, `borderTopColor`, …). Shorthand `border` is rejected.
- **Mutually-exclusive Consumer/Enterprise** — every writer must enforce XOR;
  every reader can rely on it.
- **Per-identifier escalation is the canonical write target** — the
  case-level `attorneyEscalation` field is deprecated; `getActiveAttorneyEscalation(c)`
  is the canonical read accessor that walks per-identifier first.
- **localStorage gracefully** — every read wraps in try/catch (sandboxed
  iframes can throw); every write wraps similarly.
- **`useSyncExternalStore` over event emitters** for module-level singletons
  (correspondence, ip-history, etc.).

## 11. Open follow-ups + known gaps

- **6 TPIDs without parent-tenant records** in MOCK_ORGS (Iberia, Fabrikam,
  Northwind, Tailwind, Adventure Works) — their orgs carry `parentTpid` but
  the parent-domain group doesn't render. Graceful, but inconsistent.
- **`formData.attorneyEscalation` deprecation** — the case-level field is
  marked `@deprecated`; per-identifier is canonical. Removal is pinned
  follow-up #1 in the merge plan.
- **Real authority-signal handlers** — currently routed through the
  `AuthoritySignalSimulator` dev affordance. Real IA Form 4 + EA GFR ingestion
  is pinned follow-up #2.
- **Production swap-out for prior-tenant history** — `PriorTenantLookupSource`
  interface in `src/utils/priorTenantLookup.ts` is the seam; mock reads
  `MOCK_PRIOR_HISTORY`. CLASS / LERS swap-in lands later.
- **TypeScript pre-existing errors** — `sonner@2.0.3` module-path quirks +
  ExtraFilterChip / AdvancedFiltersPanel / CaseQueueBulkActionsBar prop
  mismatches. Vite builds clean (esbuild is more lenient than tsc).

## 12. Where to look for more

- `src/types/caseTypes.ts` — the canonical type surface; ~1500 lines but
  comprehensively commented
- `src/utils/caseEscalation.ts` — every write helper + the
  `applyAttorneyAction` / `applyAuthorizationStatusUpdate` / `applyGfrDecision`
  unified mutators
- `src/utils/resolveExternalServices.ts` + `src/config/leExternalServiceMap.ts`
  — the LE → internal mapping engine
- `src/utils/escalationHelpers.ts` — read-side queries
  (`getActiveAttorneyEscalation`, `isAttorneyEscalationActive`,
  `gfrQueueChipForCase`, etc.)
- `src/utils/groundsForRefusal.ts` — GFR decision model + delivery gating
- `src/utils/eEvidenceHelpers.ts` — Workflow N classifiers
- `src/hooks/useCaseWorkflow.ts` — the kitchen-sink hook driving the case
  form's workflow actions
- `docs/UAT-MockCases.md` §4.5 — EU eEvidence decision tree (the routing
  rules for every banner / chip / gate)
- [LENS-LRMS repo](file:///C:/R/LENS-LRMS/) — production code; the DARS
  prototype tracks ahead of it
