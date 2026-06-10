# Case List View Controls — Product Feature Specification

**Audience:** Engineering (LENS-LRMS WebClient + WebApi; LENS-CMS API + DataAccess; LENS-Common contracts) and Business Analysts (Response Specialists, Operations Leads, Program Managers, Transparency Reporting team).

**Scope:** This specification covers **real-time** shaping of the case list — Search, Filter, Sort, Column configuration — and one tier of automatic state persistence (**Phase 0.5: session-scoped autosave**, introduced in §5.7).

It does **not** cover named, server-persisted Saved Views, view sharing, or view export to external systems. Those concerns are addressed in the companion [**Saved Views Phase 1 Specification**](./saved-views-phase-1-spec.md).

The persistence story across both specs reads:

| Tier | Lifetime | Mechanism | Named? | Cross-tab / cross-device? | Spec |
|---|---|---|---|---|---|
| In-memory | Until reload | React state | No | No | This spec §3–§4 |
| **Session autosave (Phase 0.5)** | **Until tab close** | **Browser `sessionStorage`** | **No** | **No** | **This spec §5.7** |
| User defaults | Until manual reset / browser data clear | Browser `localStorage` | No | Cross-tab same browser | This spec §5.5 |
| Saved Views Phase 1 | Permanent (until deleted) | Server (Cosmos via CMS) | Yes | Yes | [Saved Views Phase 1](./saved-views-phase-1-spec.md) |

**Status:** Draft. Anchored against LENS-Common / LENS-CMS / LENS-LRMS source as of the sync run that produced this document (LENS-CMS@a05a9e6, LENS-Common@b93b66b, LENS-LRMS@7874ca3e).

**Companion prototype:** `c:/R/DARS_eEvidence/` — the prototype implementation of the proposed UX. This spec generalises the prototype's behaviours into a contract the LENS production stack can implement.

---

## 1. Problem Statement & Context

### 1.1 The problem

Response Specialists (RS), Triage Specialists (TS), Operations Leads, and Program Managers all interact with the same Case List in LRMS Portal but for very different reasons:

- **TS** triaging new intake: needs to *find* a specific case by reference number or identifier value in seconds, then assess it against jurisdiction and priority.
- **RS** working their personal queue: needs to *prioritise* across 20–50 active cases by SLA pressure (Due Date), workflow stage, and outstanding correspondence.
- **Operations Lead** running weekly forecasting: needs to *segment* the queue by request type, jurisdiction, and assignee distribution and *export* the slice for downstream forecasting tooling.
- **Program Manager** preparing transparency reports: needs to *audit* historical case data across long time ranges with broad filter combinations (country, jurisdiction, request type, agency).
- **All personas** investigating anomalies: need to *combine* filters that don't fit named-view buckets (e.g., "long-open Resolved cases with mismatched stage / status", "cases where Validating Authority differs from Issuing Authority", "Recommend-Rejection cases with no escalation in 7 days").

Today's LENS-LRMS WebClient implementation ([case-queue-filters.types.ts](C:/R/LENS-LRMS/sources/dev/WebClient/src/features/case-queue/types/case-queue-filters.types.ts)) ships a fixed 9-field `CaseQueueFilters` shape:

```ts
{
  freeText: string;
  priority: string[];
  workflowStage: string[];
  jurisdiction: string[];
  assigneeName: string[];
  agencyId: string[];
  dueDateBucket: string[];
  leReferenceNumber: string[];
  etsiAuthId: string[];
}
```

with three named views: `'my' | 'overdue' | 'all'`. There is no in-product sort UI, no in-product column configuration, and no in-product way to add a filter that isn't one of the nine. The downstream CMS API already supports a richer 17-field `CaseListFilters` contract ([CaseListFilters.cs](C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Models/CaseListFilters.cs)) — the WebClient is the bottleneck.

### 1.2 Why this matters

| Persona | Capability gap | Business cost |
|---|---|---|
| TS / RS | Can't filter by `RequestType`, `NatureOfCrimes`, `RequestOrigin`, `AccountTypes`, `CreatedFrom/To` — already in the CMS contract, not in the UI | Missed cases; slower triage; SLA risk |
| Operations Lead | No way to scope to a specific agency role (Issuing vs Validating vs Competent) or to a tenant; no client-side reshape of the visible column set | Forecasts built off-platform in Excel; data drift |
| Program Manager | Transparency reports require date-bounded scopes the UI can't express | Manual SQL pulls against Cosmos; engineering cycles per report |
| All personas | No way to identify anomalous cases visually (e.g., Resolved-but-stuck cases, mismatched resolution code vs delivery status) | Anomalies surface late, often after escalation |
| All personas | "All" tab means different things in different scopes; without a page-level Active/All scope, the queue is implicitly "all states" — Resolved cases dilute the working set | Slow page load + cognitive overhead reviewing finalised cases |

### 1.3 Microsoft's role + case-data classification

This section underpins every storage, query, reporting, and access decision in §5–§8 and must be understood before reading them. It establishes two things in order: (a) Microsoft's role with respect to customer data and the exceptions where law enforcement (LE) acquires data directly through Microsoft, and (b) the data-classification consequence — case records produced by those exceptions are operational LENS data, not customer data.

#### 1.3.1 Microsoft as service provider, not data controller

Microsoft hosts customer data on M365, Azure, and related services under a **service-provider** model. The customer's tenant administrator is the **data controller** — they decide what data is created, what's retained, and what's disclosed in response to legal process. Microsoft is a **data processor** — it processes that data on the controller's behalf, per the customer's instructions and Microsoft's contractual commitments to customers.

**Customer-first is the default for LE requests.** When law enforcement serves Microsoft with a request that targets a specific tenant's data, the default response is to direct LE to the customer so the customer (the data controller) can evaluate the request and respond directly. In the customer-first path **no LENS case is opened** — Microsoft never accepts the request for processing. Microsoft documents the customer-first routing publicly in the [Law Enforcement Requests Report](https://www.microsoft.com/en-us/corporate-responsibility/law-enforcement-requests-report). The Microsoft-internal MLAS guidance on this stance for LENS cases is at [LENS-ALL SharePoint](https://microsoft.sharepoint.com/teams/LENS-ALL/_layouts/15/viewer.aspx?sourcedoc={5d865415-5f3e-4d2e-909e-5aa7db9e7ceb}) (Microsoft-internal; LENS team access).

#### 1.3.2 Exceptions — when LE acquires data directly through Microsoft

A material minority of LE requests cannot follow the customer-first path. In every category below, routing the request through the customer would compromise the investigation, violate a legal instrument, or be operationally impossible. When any of these categories applies, Microsoft processes the request directly and a **LENS case is opened**:

1. **Emergency requests — imminent threat to life or serious physical harm.** When LE certifies that the time required to route the request through the customer would risk harm to a person (kidnapping in progress, active shooter / hostage situation, imminent suicide, child-exploitation in progress, terrorism with timeline pressure), direct acquisition is the only safe path. The customer-first default would introduce a delay incompatible with the emergency. Microsoft processes the request on an expedited timeline against the same data the customer would otherwise disclose — but on emergency cadence.
2. **Investigation-integrity risk.** Cases where notifying the customer would tip off the subject of the investigation. Common scenarios:
   - The subject IS the customer's tenant administrator (e.g., an insider-threat investigation against the admin).
   - The customer's normal communications (audit logs, admin notifications) would alert the subject.
   - The investigation involves coordinated targets across multiple tenants where notification of one would compromise the others.
3. **Non-disclosure obligations.** A court order, statutory non-disclosure provision, or similar legal instrument legally prohibits Microsoft from informing the customer of the request. In that case the customer-first default is impossible and Microsoft processes the request directly while observing the non-disclosure obligation. The NDO model in LENS-CMS (`NonDisclosureOrder` documents — see [caseTypes.ts](C:/R/DARS_eEvidence/src/types/caseTypes.ts)) captures these obligations on the case.
4. **Microsoft-controlled data only.** Some categories of data are operational records Microsoft owns and the customer doesn't access directly: authentication telemetry, login-history metadata, service-level connection logs, IP-reputation data, etc. LE requests touching only these categories are processed by Microsoft as a matter of course — the customer is not the data controller for this slice, Microsoft is.
5. **Cross-border / international legal frameworks.** Certain frameworks (CLOUD Act, EU eEvidence / EPOC, EU-US Data Privacy Framework variants, MLATs) compel Microsoft to process requests directly rather than route through the customer. These frameworks have their own procedural requirements that LENS-CMS captures via the structured agency-role model (§4.2: Issuing / Validating / Competent / Enforcing / Requesting authorities).

The user-facing categorisation surfaces in the Case List as filters (request type, request origin, threat-to-life flag, NDO presence, agency role) so the persona working a case can see at a glance which exception path the case came in through.

#### 1.3.3 Data classification — case records are operational LENS data

Once a LENS case exists (i.e., once one of the §1.3.2 exceptions applies and Microsoft accepts the request for processing), the **case record itself is operational LENS data — not tenant-customer data**.

A "case" is an audit-trail-bearing record of a law-enforcement request the Microsoft service-provider organisation is processing on behalf of an issuing authority. The case captures the request's metadata (issuing authority, target identifiers, services in scope, jurisdiction, etc.), the procedural state of the request, and the outcomes (delivered / not delivered / withdrawn / rejected). It does **not** itself contain customer email body content, document contents, or other protected M365 customer data — those payloads live in the downstream fulfilment + storage services (DCS, DFS, SMSv2; see [LENS-Common §LENS System Architecture](C:/R/LENS-Common/CLAUDE.md)).

Consequences for this spec:

1. **Cross-tenant queries are the operational norm**, not the exception. Ops Leads, Program Managers, and Transparency Reporting users routinely query and aggregate across every tenant whose cases the LENS organisation has processed. There is no tenant-isolation requirement at the storage layer.
2. **Tenant is just a query dimension**, not a partition boundary. The `Tenant` filter (§4.2) and any group-by `tenant` clause on the aggregate endpoint (§5.8 / §6.6) operate as ordinary filter parameters.
3. **Access control is at the role layer**, not the partition layer. `CaseReader`, `CaseWriter`, and the transparency-reporting consumers are scoped by role (see §5.7 of the Saved Views spec for the analogous saved-view ownership model); there is no per-tenant ACL constraint on case data.
4. **Cosmos partition key choice is purely operational** — selected for query distribution and time-bounded reporting cost, not for security boundary enforcement. See §5.4.
5. **Enterprise aggregate distinct-count reports** (BR-16, BR-17 below) are first-class capabilities — not "transparency reporting role" edge cases. They run against the same data path as the list view, with the same filters, surfaced via a dedicated aggregate endpoint (§5.8, §6.6).

This is a meaningful departure from a default M365 service posture where tenant data is treated as protected customer content. LENS case data is structured operational metadata captured by Microsoft's own organisational systems while servicing a third-party lawful request. The lawful request itself originates with an external issuing authority, not the tenant.

### 1.4 Outcome the spec drives toward

A Case List View Controls surface that:

1. Exposes the **full CMS `CaseListFilters` contract** to the user (and grows beyond it where new filters are needed).
2. Lets every column be **shown, hidden, or reordered** by the user in real time.
3. Supports **multi-key sort** (primary key + tiebreakers) consistent with how operations leads already think about prioritisation.
4. Has a **page-level Active/All scope** distinct from quick-filter tabs — `Active = caseStage ≠ Resolved`; default `Active`.
5. Maintains a **unified "Customize view" canvas** that consolidates Filters / Sort / Columns so power users can dial in a complete slice in one place.
6. Exports the on-screen slice as CSV with the user's exact visible columns, so transparency reporting and weekly forecasting work directly off the controls the user just configured.

---

## 2. Business Requirements

### 2.1 Capability matrix

| # | Capability | Primary persona | Drives |
|---|---|---|---|
| BR-1 | Search across case-level metadata + identifier values | TS, RS | Time-to-locate |
| BR-2 | Search by external reference numbers (`LeReferenceNumber`, `EtsiAuthId`) | TS, RS, Ops Lead | Cross-system tracing |
| BR-3 | Filter by case state, workflow stage, priority, jurisdiction, request type | All | Triage, prioritisation |
| BR-4 | Filter by nature of crime, account types, request origin | RS, Ops Lead, PM | Transparency reporting |
| BR-5 | Filter by SLA pressure (`DueDateBucket`, `DueBefore`) | RS | Prioritisation |
| BR-6 | Filter by agency role — Issuing, Validating, Competent, Enforcing | Ops Lead, PM | Authority-scoped reporting |
| BR-7 | Filter by created-date range | PM | Transparency reporting windows |
| BR-8 | Filter by tenant (Enterprise) | Ops Lead | Enterprise account workflows |
| BR-9 | Filter by escalation state (sub-state, assigned attorney, stale, recommend-rejection) | Attorney, RS | Escalation triage |
| BR-10 | Sort by multiple keys (primary + 2 tiebreakers) | Ops Lead, RS | Multi-axis prioritisation |
| BR-11 | Show / hide / reorder columns | All | Persona-appropriate density |
| BR-12 | Page-level Active/All scope toggle | All | Default working-set narrowing |
| BR-13 | Export the on-screen slice to CSV with the user's visible columns | Ops Lead, PM | Forecasting, transparency reports |
| BR-14 | Identify anomalous cases through filter combinations | All | Anomaly detection workflows |
| BR-15 | **Customisations survive page reload + in-app navigation while the user is in the workflow** (Phase 0.5 autosave — see §5.7) | **All** | **Reload-aversion; mid-investigation continuity** |
| BR-16 | **Aggregated count reports — total cases matching a filter combination over a date range** | **Ops Lead, PM, Transparency** | **Weekly forecasting, transparency reporting** |
| BR-17 | **Aggregated distinct-count reports — unique cases (e.g., Enterprise) grouped by delivery outcome, tenant, jurisdiction, or any other catalog dimension** | **Ops Lead, PM, Transparency** | **Enterprise data-request reporting; year-over-year comparisons** |

### 2.2 Why these capabilities are critical

**Transparency reporting (BR-2, BR-4, BR-7, BR-13).** Microsoft's biannual Law Enforcement Requests Report depends on auditable counts by request type, agency country, jurisdiction, and nature-of-crime. The current path is offline SQL against the Cosmos backing store; this spec brings those slices in-product so report writers iterate against the same data the operations team is working from.

**Weekly operational forecasting (BR-3, BR-5, BR-6, BR-10, BR-13).** Ops Leads run a weekly capacity forecast — case volume by request type × jurisdiction × workflow stage, projected against assignee headcount. They currently build the forecast in Excel from a Cosmos dump. With multi-key sort + flexible filtering + CSV export, the same slice ships from the UI in <30 seconds.

**Anomaly identification (BR-14).** Examples of anomalies the current UI can't express:
- Resolved cases where `delivery_status ≠ delivered_successfully` (mismatched resolution).
- Cases open >30 days with no workflow stage change (stuck triage).
- Cases where the agency country doesn't match the case country (`agencyCountryMatch === false` in `CaseLegalContext`) — already a flag in the data model, never surfaced.
- Cases where Recommend-Rejection has been the stage >7 days with no attorney action.

Without filter composition, anomaly hunting is a developer task. With it, it's a daily Ops responsibility.

**Reload-resilience (BR-15).** The most common path through the queue is: dial in a filter → open a case → come back to the list → tweak the filter → reload to refresh data → tweak again. Without autosave, every reload is a tax that resets the user's working slice. Phase 0.5 makes the customised view a property of the user's *session* (specifically the browser tab), so reload-aversion goes away — but the customisation is automatically released when the user genuinely leaves the workflow (tab close).

**Enterprise aggregated distinct counts (BR-16, BR-17).** The list view answers "what cases match these filters." The aggregate endpoint answers "**how many** cases match these filters, broken down by which dimensions." This is the gap between operational case-handling and transparency-style reporting. Two example questions that the aggregate endpoint must answer in one call each:

1. *"Across all Enterprise tenants over Q2, how many cases resulted in data being disclosed (delivery completed successfully) vs. not disclosed (rejected / no-data / withdrawn)?"* — a `count` query grouped by delivery outcome, filtered to `accountTypes=Enterprise` + `createdFrom=Q2-start` + `createdTo=Q2-end`.

2. *"How many unique cases did we process Enterprise data requests for in the first half of the year?"* — a `distinctCount` query on `caseId` with `accountTypes=Enterprise` and a date-range filter; returns a single integer.

Both queries are routine for transparency-report writers and Ops Leads, ship monthly, and must complete in <2 seconds for ranges of up to a year. See §5.8 (query model), §6.6 (endpoint contract), and §1.3 (why these are first-class, not "edge case TransparencyReporter role").

### 2.3 Non-goals (in scope for the Saved Views spec)

- Saving a configured view as a **named**, reusable preset.
- Sharing a configured view with another user via URL or workspace.
- Persisting a configured view across **devices**.
- Persisting a configured view across **browser tab close**.
- Subscribing to a saved view (e.g., email-on-change).
- Cross-tenant or cross-workspace view roaming.

The **session-scoped** autosave (this spec §5.7) is in scope here because it's a continuity feature for the active workflow, not a saved-views feature. The boundary: if the user closes the tab, the autosave is gone; only Saved Views Phase 1 carries state across that boundary.

---

## 3. User Experience (UX) Requirements

### 3.1 Page-level scope toggle (Active / All)

**Placement.** As the leading segment of the quick-filter tab row, left-justified, with a vertical divider separating it from the quick-filter tabs.

**Behaviour.**

- Two-option radiogroup, `role="radiogroup" aria-label="Case scope"`.
- Default: `Active` on every fresh tab and after every session expiry. Selection survives reload + in-app navigation within the same tab via the Phase 0.5 autosave (§5.7) and cross-tab via per-user defaults (§5.5).
- `Active` predicate: `caseStage !== "Resolved"` evaluated against the current case state. A re-opened case (Resolved → any other stage) re-enters Active automatically because the predicate reads the *current* stage at query time. No history-aware logic is required.
- `All` shows every case regardless of stage.
- Switching scope triggers a list refetch (see §5.3) and the quick-filter tab "All" label dynamically re-reads as `All Active` or `All Cases` to disambiguate against the toggle.

**Why "Active = not Resolved" rather than "Active = open lifecycle stages":** Resolved is the only terminal stage where the case is genuinely finalised; Cancelled, Rejected, and No Data Provided are intermediate states where re-opening or appeal is still possible, so they should remain in scope by default.

### 3.2 Search

**Input.** Single text field with a search icon, right-justified in the toolbar row, max width 360px, placeholder `Search by case ID, identifier, assignee, country…`.

**Match semantics.**

- **Case-insensitive substring** match against the haystack defined in §4.1.
- **Multi-field** — the search term is checked against every field in §4.1 simultaneously; first hit wins.
- **No typeahead suggestions** in v1. (Typeahead is a §10 future-consideration item; cost is server-side index work.)
- **Debounced** at 250ms (see §3.6 perf requirement) — the WebClient holds the in-flight request and aborts via `AbortController` on each new keystroke (already implemented in [useCaseQueue.ts:101-128](C:/R/LENS-LRMS/sources/dev/WebClient/src/hooks/useCaseQueue.ts#L101-L128)).
- **Empty search** returns to the full scope+filter+sort slice.
- **Trim whitespace** before matching; a search term that is whitespace-only is equivalent to empty.

**Persistence.** Search term is **NOT** captured by the Phase 0.5 autosave (§5.7). Reload starts with an empty search box even when the rest of the view state restores. Rationale: search is treated as a transient lookup with the highest PII density (email addresses, phone numbers); we explicitly avoid persisting it.

**Feedback.**

- Loading state: shimmer on the table rows; the search input remains responsive (does not disable).
- Zero-results state: an inline empty state (see §3.7) with a button to clear the search term.
- Error state: error toast with the upstream error message + a retry button. The search input value is preserved.

### 3.3 Filter discovery, selection, removal

**Three discovery paths**, by escalating user investment:

1. **Quick-filter tabs** — fixed set of personas-specific predicates (`All Active`, `My Cases`, `Unassigned`, `Threat to Life`, etc.). One-click. Mutually exclusive — exactly one tab is active.
2. **+ Add filter menu** — popover anchored to a toolbar button. Lists every catalog filter grouped by `FilterGroup` (`People`, `Case meta`, `Dates`, `Workflow`, `Signals`, `Tenant`, `Escalation`, `Intake`). 10-row scroll cap; "Customize view…" CTA pinned at the bottom of the scroll region as a deep link to the unified Customize view panel.
3. **Customize view panel** — right-side Sheet, the unified canvas. Filters section lists every active filter with its value editor inline + an "Add filter" affordance.

**Filter chip semantics.**

- Each active filter renders as a chip in the active-filter strip below the toolbar row.
- Chip text format: `{FilterLabel}: {Summary}`. Example: `Assignee: Nicole Garcia`, `Crime / Nature: 3 selected`, `Due Date Range: Mar 1 – Today`.
- Chip body click opens the value editor popover (re-uses the same control component as the Customize view panel — see §3.10).
- Chip ✕ removes the filter entirely from `activeFilters`.

**Auto-mount column on filter add (Filter↔Column Sync Dialog).**

- When a user adds a filter via the **+ Add filter** menu and the filter's linked column (see §4.3) is currently hidden, an AlertDialog asks: `Show the {ColumnLabel} column? (because you added the {FilterLabel} filter)`. Confirm → column flips to visible. Skip → filter still mounts, column stays hidden.
- When a user removes a filter chip and the filter's linked column is currently visible, the same dialog asks the inverse: `Hide the {ColumnLabel} column?`.
- The dialog suppresses itself when:
  - The filter has no `columnId` declared (e.g., a multi-column "Operational Badges" filter that spans atomic badge columns).
  - The column is locked (e.g., Case ID — always visible).
  - The action would be a no-op (column already in the desired state).

**Filter→Column linkage** is declared on each filter definition in the canonical catalog (§4.2). For LENS-LRMS, the canonical catalog must live in the WebClient as a typed TypeScript registry (parallels the prototype's `extraFilterCatalog.ts`).

### 3.4 Sorting

**Single-key sort (primary).**

- Click a sortable column header → cycle direction: `null → asc → desc → null`.
- Sort indicator chevron rendered in the header label; ARIA: `aria-sort="ascending"` / `"descending"` / `"none"` on the `<th>` element.
- The toolbar also surfaces a Sort dropdown that mirrors the column-header cycle (so card-mode and preview-pane-mode users without column headers can still set the sort).

**Multi-key sort (tiebreakers).**

- The Customize view panel's Sort section allows up to **2 additional tiebreaker keys** beyond the primary. Total = 3 keys max.
- Tiebreaker semantics: when the primary comparator returns 0, the comparator walks each tiebreaker in order; when all tiebreakers also return 0, falls through to the final stable tiebreaker: Due Date ascending.
- Tiebreakers persist alongside the primary sort. Single-key column-header clicks affect only the primary key; tiebreakers are managed exclusively through the Customize view panel.

**Sortable columns.** Every column in the column catalog is sortable unless explicitly marked `sortable: false`. The catalog declares per-column direction labels so the Sort dropdown reads naturally (e.g., Priority `desc` = "Most urgent first", not "Z to A").

**Default sort behaviour** (no user sort active): see §4.4.

### 3.5 Column selection and reordering

**Edit Columns menu.**

- Anchored to a "⋮" button at the right edge of the column-header row.
- Lists every column in the catalog, in the current order. Each row has:
  - A checkbox (show / hide). Locked columns (Case ID) render the checkbox disabled and always checked.
  - The column label.
  - A lock glyph on locked columns.
  - Up / Down arrow buttons. Reorders the column in the persisted column-order list. Up is disabled when the column is at the top OR the column directly above is locked; same for Down.
- 10-row scroll cap inside the menu's scroll region; "Customize view…" CTA pinned at the bottom as a deep link to the Customize view panel.

**Customize view panel — Columns section.** Same affordances as the Edit Columns menu but always visible while the user is shaping their view, so they can see the table re-flow in real time as they hide / show / reorder.

**Default visibility rules.**

- New columns introduced in a later build that are marked `hiddenByDefault: true` in the catalog automatically join the user's hide-list on next load (forward-compat migration in the visibility-set sanitiser; see §5.4).
- New columns marked `hiddenByDefault: false` (or unmarked) are visible by default.

### 3.6 Responsiveness and performance

| Interaction | Target latency (p95) | Mechanism |
|---|---|---|
| Search keystroke → first response paint | 600ms | 250ms input debounce + AbortController fan-out cancel + server-side Cosmos query with continuation tokens |
| Filter add/change → result paint | 800ms | New refetch keyed by the filter fingerprint; AbortController cancels the in-flight refetch |
| Sort change → result paint | 600ms | Server-side sort applied at the query layer; same continuation-token plumbing |
| Column show/hide/reorder | 100ms | Client-side only; no server roundtrip |
| Active/All scope flip | 800ms | New refetch — scope is a server-side filter (`caseStage !== "Resolved"`) |
| Export list (≤ 1000 rows) | 2000ms | Client-side CSV build from already-fetched + in-memory rows |
| Customize view panel open | 100ms | Pure client-side mount |
| **Page reload → restored view (Phase 0.5)** | **300ms** | **`sessionStorage` read on mount; no server roundtrip; data refetch runs in parallel** |

### 3.7 System feedback

**Loading states.**

- First load: full-page shimmer over the table area.
- Subsequent refetches (filter / sort / scope change): row-area shimmer; toolbar and header stay interactive.
- Pagination forward / back: keep the previous page visible until the new page arrives, then swap.

**Empty states.**

| Trigger | Headline | Body | Primary action |
|---|---|---|---|
| Fresh page, no scope/filter narrowing, no rows in tenant | "No cases yet" | "When law enforcement requests come in, they'll appear here." | (none) |
| Scope=Active, no rows | "No active cases" | "Try the All toggle to include Resolved cases." | "Switch to All" button |
| Search has no matches | "No cases match \"{searchTerm}\"" | "Check spelling, or remove a filter to broaden your search." | "Clear search" button |
| Filter combination has no matches | "No cases match these filters" | "Try removing a filter or switching to a broader scope." | "Reset filters" button |

**Error states.**

- Server 5xx / network error: inline error banner above the table; row area stays in the last-known-good state. Banner: `Couldn't refresh the list. {message}` with a Retry button.
- Validation error (server-side, e.g., invalid `continuationToken`): silently reset to page 1 + log to telemetry (`LrmsCaseOperationEvent` with `Phase = ValidationFailed`).
- Authorization 401 / 403: redirect to the LRMS sign-in flow; do not surface the raw error to the user.

**Autosave is invisible.** No toast, no banner, no "Saving…" indicator when Phase 0.5 captures a state change. The user only ever notices autosave by its *absence* — they reload and find their work intact. Autosave failure (e.g., `sessionStorage` quota exceeded — see §9.9) surfaces as a non-blocking debug log; users continue to work in memory-only mode without disruption.

### 3.8 Consistency patterns

These interaction patterns are shared across **Case Queue** (Cases page) and **Attorney Dashboard** (escalation-flavoured view) — both pages must implement the same chrome and behaviours described in §3.1–§3.7. The two pages differ in:

- The fixed set of quick-filter tabs.
- The default column subset (Attorney Dashboard surfaces Internal Escalation and Escalated To by default; Cases page does not).
- Persistence keys (separate `dars.attorneyDashboard.*` vs `dars.caseQueue.*` prefixes for both `localStorage` user defaults — §5.5 — and `sessionStorage` Phase 0.5 autosave — §5.7).

All other behaviours (scope toggle, search, filter chip semantics, sort, column show/hide, Customize view panel, Export list, Filter↔Column Sync Dialog, Phase 0.5 autosave) **must** be identical in both surfaces. Any divergence between the two is a regression and must be caught by the verifier suite.

### 3.9 Keyboard and accessibility

- **Tab focus order**: scope toggle → quick-filter tabs → toolbar buttons (Saved Views → +Add filter → Sort → Customize view → Save current view → Export list) → Search → active-filter chips → column headers → row 1 (then within row: checkbox → cells) → row 2 → … → pagination controls.
- **Scope toggle**: arrow keys cycle between Active / All when the radiogroup has focus.
- **Quick-filter tabs**: arrow keys cycle tabs (standard ARIA tablist).
- **Sort by header**: Enter or Space on a focused header cycles the sort direction.
- **Column reorder via keyboard**: only via the Edit Columns menu / Customize view panel — drag-and-drop is mouse-only; the menu's Up/Down buttons are the keyboard-accessible equivalent.
- **All controls** must satisfy WCAG 2.1 AA contrast on both light and dark themes; the LRMS theme tokens already cover this.
- **Live region**: every refetch posts an announcement to a polite live region (`aria-live="polite"`) — `"Loading cases."` and on completion `"{N} cases shown."`. The prototype's `StatusAnnouncer` is the reference implementation pattern.

### 3.10 Value-control component contract

Every filter has a `FilterValueControl` component that owns its value editor UI. The catalog declares which control variant each filter uses:

| Variant | Used for | Behaviour |
|---|---|---|
| `MultiCheckControl` | Multi-select string sets (Crime, Services, Account Type, etc.) | Checkbox list of the distinct values present in the current case set; selected values stored as `string[]`. |
| `AssigneeControl` | Single-select assignee | Dropdown with sentinels: `Anyone`, `Unassigned`, and the distinct assignee names. Value stored as `string`. |
| `DateRangeControl` | Date range filters | From / To date pickers + a `field` selector (Created / Due). `forceField` prop pins the axis when the filter is dedicated to one (e.g., Due Date Range). |
| `RadioControl` | Yes / No / Any | Three-option radio group. |
| `NumberThresholdControl` | Threshold-style filters (e.g., Stale Escalation days) | Number input with a unit label. |
| `BadgeMatchControl` | Operational badge filter | Multi-select badge picker + an `any` / `all` match-mode toggle. |

The same component instance is mounted by **both** the chip popover (compact) and the Customize view panel's filter row (expanded). The component must render identically in both contexts.

### 3.11 Restore on load (Phase 0.5 UX expectation)

When the user returns to a list page (Cases or Attorney Dashboard) — by reload, by in-app navigation, by browser back / forward — within the same tab:

- The page mounts in <300ms with the **last-known view state** for that surface restored (filters, primary sort, tiebreakers, scope, column order, column visibility, quick-filter tab, view-mode toggle, applied-Saved-View id).
- If no Phase 0.5 snapshot exists for the surface (first visit in this tab session), the page falls back to the user's `localStorage` defaults (column order, scope), then the surface's hardcoded defaults.
- The restore is **silent** — no banner, no announcement, no "Restoring view…" delay.
- If a Saved View was applied before the reload, the Saved Views menu still reflects it as the applied view; if the user had modified it before reload, the `(modified)` indicator restores correctly.

When the user closes the tab and opens a fresh tab to the same page, the Phase 0.5 snapshot is gone (browser-managed). The new tab starts from defaults (or auto-applies the user's last-applied Saved View if Saved Views Phase 1's "last applied" feature is on).

---

## 4. Functional Requirements

### 4.1 Supported search fields and scope

Search applies a case-insensitive substring match against the following haystack, ordered by priority:

| Field | Source | Notes |
|---|---|---|
| `caseId` | Direct field on the case | Exact prefix or substring; the LNS-YYYY-NNNN format means most searches will use a numeric tail |
| Identifier values | `getCaseIdentifierValues(caseId, c)` | Email addresses, phone numbers, account IDs, IP addresses — the values attached to the case as legal subjects of the request |
| `assigneeName` | Direct field | Owner / RS handling the case |
| `country` | Direct field (or `legalContext.country.countryName`) | Display name, not country code |
| `jurisdiction` | Direct field (or `legalContext.jurisdiction.jurisdictionName`) | Free text, e.g., "Southern District of New York" |
| `leReferenceNumber` | Direct field (when present) | Law-enforcement-side reference number |
| `etsiAuthId` | Direct field (when present) | ETSI authorization ID for eEvidence cases |
| `natureOfCrime[]` | Direct array on the case | Each crime label matched individually |

**Not searchable** (intentional — to keep result quality high):

- Free-text Notes content (separate Notes-search feature out of scope here).
- Attachment file names.
- Audit history.
- Correspondence body content (separate Correspondence-search feature out of scope here).

**Search precedence.** When search and filters are both active, search applies **after** filters at the server query layer. The user only sees rows that satisfy both. Counts on quick-filter tabs reflect the *filter-only* set (so users can see how many cases each tab would yield before search narrowing).

### 4.2 Available filters

The canonical filter catalog is a typed registry declared in the LRMS WebClient (proposed path: `sources/dev/WebClient/src/features/case-queue/catalog/filterCatalog.ts`). Each entry declares:

```ts
interface FilterDef<V = unknown> {
  id: string;                       // catalog key
  label: string;                    // user-visible label
  group: FilterGroup;               // for the +Add filter menu grouping
  control: FilterControlVariant;    // see §3.10
  defaultValue: V;                  // mounted on filter-add
  isActive: (v: V) => boolean;      // does this value actually narrow the list?
  predicate: (c: Case, v: V) => boolean;  // client-side predicate for in-memory checks
  summary: (v: V) => string;        // chip body text
  columnId?: ColumnId;              // linked column for the sync dialog (§3.3)
  serverField?: keyof CaseListFilters;  // maps to the CMS contract field
}
```

**v1 catalog (proposed for LRMS WebClient, derived from prototype + CMS contract gap analysis):**

| `id` | Label | Group | Control | `serverField` | `columnId` |
|---|---|---|---|---|---|
| `assignee` | Assignee | People | `AssigneeControl` | `AssigneeName` | `case-assignee` |
| `crime` | Crime / Nature | Case meta | `MultiCheckControl` | `NatureOfCrimes` | `crime` |
| `accountType` | Account Type | Case meta | `MultiCheckControl` | `AccountTypes` | `enterprise` |
| `dateRange` | Date Range | Dates | `DateRangeControl` | `CreatedFrom` / `CreatedTo` / `DueBefore` (axis-dependent) | `due-date` |
| `dueDateRange` | Due Date Range | Dates | `DateRangeControl` (forceField=due) | `DueBefore` (+ a new `DueAfter`; see §8.1 schema change) | `due-date` |
| `workflowStage` | Workflow Stage | Workflow | `MultiCheckControl` | `WorkflowStage` (multi-value; see §8.1) | `stage` |
| `caseStatus` | Case Status | Case meta | `MultiCheckControl` | `WorkflowState` (multi-value; see §8.1) | `stage` |
| `country` | Country | Case meta | `MultiCheckControl` | *(new — see §8.1 `Country[]`)* | `country` |
| `jurisdiction` | Jurisdiction | Case meta | `MultiCheckControl` | `Jurisdiction` (multi-value; see §8.1) | `country` |
| `requestType` | Request Type | Case meta | `MultiCheckControl` | `RequestType` (multi-value; see §8.1) | `request-type` |
| `requestSubType` | Request Sub-Type | Case meta | `MultiCheckControl` | *(new — see §8.1 `RequestSubType[]`)* | `request-sub-type` |
| `services` | Services | Case meta | `MultiCheckControl` | *(new — see §8.1 `ServicesRequested[]`)* | `services` |
| `slaTier` | SLA Deadline | Case meta | `MultiCheckControl` | `Priority` (mapped via `PriorityRank`) | `priority` |
| `escalationStatus` | Escalation status | Escalation | `MultiCheckControl` | *(new — see §8.1)* | `internal-escalation` |
| `specificAttorney` | Assigned attorney | Escalation | `AssigneeControl` | *(new — see §8.1)* | `escalation-reviewer` |
| `tenant` | Tenant | Tenant | `MultiCheckControl` | *(new — see §8.1)* | `tenant` |
| `unreadInbound` | Unread inbound (IA/EA) | Signals | `RadioControl` | *(new — see §8.1)* | `unread` |
| `agency` | Issuing Authority | Intake | `MultiCheckControl` | `AgencyId` (multi-value; see §8.1) | `agency` |
| `agencyName` | Agency Name | Intake | `MultiCheckControl` | *(new — see §8.1)* | `agency-name` |
| `validatingAuthority` | Validating Authority | Intake | `MultiCheckControl` | *(new — see §8.1)* | `validating-authority` |
| `competentAuthority` | Competent Authority Name | Intake | `MultiCheckControl` | *(new — see §8.1)* | `competent-authority` |
| `requestOrigin` | Request Origin | Intake | `MultiCheckControl` | `RequestOrigin` (multi-value; see §8.1) | `request-origin` |
| `staleEscalation` | Stale escalation | Escalation | `NumberThresholdControl` | *(new — see §8.1)* | `stale-escalation` |
| `recommendRejection` | Recommend Rejection | Escalation | `RadioControl` | *(new — see §8.1)* | `recommend-rejection` |
| `deliveryOutcome` | Delivery Outcome | Workflow | `MultiCheckControl` | *(new — see §8.1)* | `delivery-outcome` |
| `badges` | Operational badges | Signals | `BadgeMatchControl` | *(client-side composite — splits into per-badge server flags; see §8.1)* | *(spans multiple atomic columns)* |
| `identifierType` | Identifier Types | Case meta | `MultiCheckControl` | *(new — see §8.1)* | `identifier-types` |

**Filter combination semantics.** Filters are AND-combined at the server query layer. Within a multi-value filter, the values are OR-combined (e.g., `Crime: ["Cybercrime", "Fraud"]` matches a case whose `natureOfCrimes` contains either).

**Quick-filter tabs** are a special case: exactly one is active at a time, and the tab's predicate is AND-combined with all active extra filters.

### 4.3 Sort capabilities

**Sort key shape.**

```ts
interface SortKey {
  columnId: ColumnId;      // catalog key
  direction: 'asc' | 'desc';
}
```

**Sort state shape on the client.**

```ts
interface SortState {
  primary: SortKey | null;
  tiebreakers: SortKey[];   // max length 2; managed in the Customize view panel only
}
```

**Default sort behaviour.**

- If `primary` is `null`:
  - Apply the dashboard's default escalation-weight ordering when the surface is the Attorney Dashboard (already implemented in [AttorneyDashboard.tsx](C:/R/LENS-LRMS/sources/dev/WebClient/src/features/case-queue/...) — escalation status weight → secondary by escalation date).
  - Apply due-date ascending (most-urgent first) when the surface is the Cases page.
- If `primary` is non-null:
  - Apply `primary`, then walk `tiebreakers` in order, then fall through to due-date ascending as the final stable tiebreaker.

**Per-column sort interpretation.** Each sortable column declares how a direction maps to a human label (in the Sort dropdown) and how the comparator orders values:

| Column kind | Direction interpretation | Example column |
|---|---|---|
| String | A→Z (asc) / Z→A (desc); empty-strings bucket last | `case-id`, `case-assignee` |
| Date | Earliest first (asc) / latest first (desc); null dates bucket last | `due-date`, `ndo-reminder` |
| Numeric / weighted | Smallest first (asc) / largest first (desc); zero-value rows bucket last | `priority`, `unread`, `identifiers` |
| Workflow stage | Canonical workflow order (asc) / reverse (desc) | `stage` |
| Boolean | Unflagged first (asc) / flagged first (desc) | `threat-to-life`, `enterprise` |
| Tier-weighted | Lowest tier first (asc) / highest tier first (desc) | `gfr-hold` |

The exact comparator-direction-label table for v1 is in the prototype at [CaseQueueSortByMenu.tsx:47-71](c:/R/DARS_eEvidence/src/components/case-queue/CaseQueueSortByMenu.tsx#L47-L71) and must port verbatim to LRMS.

**Server-side sort.** Sort keys are sent to CMS as part of the query (see §6.3). CMS must sort at the Cosmos query layer to keep pagination cursors stable. **Sort changes invalidate the continuation token** — the WebClient must reset to page 1 on every sort change.

### 4.4 Column configuration options

**Column catalog shape.**

```ts
interface ColumnDef {
  id: ColumnId;
  label: string;
  defaultWidth: number;        // px
  minWidth: number;
  maxWidth: number;
  sortable?: boolean;          // defaults to true
  locked?: boolean;            // defaults to false; locked = always visible, no reorder
  hiddenByDefault?: boolean;   // forward-compat for new synthesized columns
}
```

**Column state on the client.**

- `columnOrder: ColumnId[]` — the user's preferred order including hidden columns; the Edit Columns menu walks this list.
- `columnHidden: ColumnId[]` — the user's hide-set; locked columns are filtered out by the sanitiser.
- `visibleOrderedColumns = filterVisibleColumns(applyColumnOrder(CASE_LIST_COLUMNS, columnOrder), columnHidden)` — the projection the table actually renders.

**Reset behaviour.** The Customize view panel's "Reset to default" footer button resets:

- Filters → empty bag.
- Primary sort → `null` (falls back to the surface's default order).
- Tiebreakers → empty list.
- Column visibility → `defaultColumnVisibility(catalog)` (i.e., all `hiddenByDefault` columns hidden again).
- Column order → `defaultColumnOrder(catalog)` (catalog's declared order).
- **Phase 0.5 autosave snapshot for the surface → deleted** (§5.7) so the next reload starts genuinely pristine rather than restoring the just-reset state.

Search term is **not** reset (it's a transient lookup; the user typed it and we trust they want to keep typing).

The page-level Active/All scope is **not** reset (it's a per-user scope preference, not a view-shape preference).

### 4.5 Pagination

**Model.** Continuation-token (cursor) based; matches the CMS `ListCases` contract.

- `pageSize` is configurable in 25 / 50 / 100; default 25. Maximum 100 enforced server-side ([CasesController.cs:288-300](C:/R/LENS-CMS/sources/dev/CMS/src/API/Controllers/CasesController.cs#L288-L300)).
- `continuationToken` is opaque to the client (Cosmos-issued).
- Forward navigation walks tokens; backward navigation replays earlier tokens cached in the client's `pageTokensRef` ring (the LRMS WebClient's existing pattern, [useCaseQueue.ts:99](C:/R/LENS-LRMS/sources/dev/WebClient/src/hooks/useCaseQueue.ts#L99)).
- Total count is best-effort: CMS returns a `totalCount` only when cheap to compute (single-partition queries); cross-partition queries return `null` and the WebClient renders `"Showing rows X–Y"` without a total.
- A `hasMorePages` boolean drives the Next button's enabled state.
- A `isTruncated` boolean indicates the server stopped early due to query cost (RU budget). When `isTruncated === true`, the UI shows a banner: `"Some results may be missing — narrow your filters to see all matches."`

**Filter / sort / scope changes reset pagination.** On any change to the filter bag, sort state, scope, or search term, the WebClient resets to page 1 and discards cached continuation tokens.

### 4.6 Active/All scope as a server-side filter

Implementation note: the scope toggle is a *server-side* filter expressed via the existing `WorkflowState` field, not a client-side post-filter. Default `Active` translates to `WorkflowState IN (WaitingOnTriage, InProgress, InReview, Cancelled, Rejected, NoDataProvided)` (i.e., everything except `Resolved`). `All` omits the constraint entirely.

This keeps Cosmos RU cost down (server doesn't fetch Resolved cases the user won't see) and avoids client-side row count drift between paginated pages.

### 4.7 Export list

**Trigger.** Toolbar button labelled "Export list", icon `Download`. Disabled when the on-screen list has zero rows.

**Output.**

- **Format**: CSV per RFC 4180, UTF-8 with BOM (so Excel opens it as UTF-8 by default).
- **Rows**: every row currently in the on-screen filtered + sorted slice. **Includes all pages** (the client must fetch all remaining pages of the same query and concatenate before building the CSV). Subject to the §4.8 max-rows constraint.
- **Columns**: the user's visible columns, in their visible order. Hidden columns are omitted.
- **Header row**: the column labels (not the ids).
- **Cell serialisation**: each column has a registered serializer that renders the same human-readable value the cell shows on screen. Columns with multi-value cells (Services, Crime, Identifier Types) join values with `", "`. Em-dash cells (no value) serialise as empty strings.
- **Filename**: `dars-{surface}-{scope}-{yyyy-mm-dd}.csv` where `surface ∈ { 'cases', 'attorney-dashboard' }` and `scope ∈ { 'active', 'all' }`. Example: `dars-cases-active-2026-06-08.csv`.

**Feedback.** Status announcer posts: `Exported {N} case{s} to {filename}.` The browser handles the actual download via Blob + temporary anchor click — no toast, the download dialog is the feedback.

### 4.8 Export constraints

- **Row cap**: 10,000 rows per export. If the underlying slice exceeds 10,000, the WebClient exports the first 10,000 in sort order and surfaces a warning toast: `"Exported 10,000 of N matches. Narrow your filters and re-export to capture the rest."`
- **No PII exposure** beyond what's already visible in the table cells — the export is a passive copy of the visible state.
- **Audit log entry**: every successful export logs `LrmsCaseOperationEvent { Operation = ExportCaseList, Phase = Completed, Message = "Exported {N} cases to {filename}, surface={surface}, scope={scope}, filterFingerprint={hash}" }`. The filter fingerprint is a non-reversible hash of the active filter bag (no raw filter values logged) — sufficient for "who exported what slice" audit, insufficient to leak identifier values.

---

## 5. Data Model & Backend Requirements

### 5.1 LENS-CMS query contract (existing)

The CMS API exposes `GET /api/v1/cases` ([CasesController.cs:288](C:/R/LENS-CMS/sources/dev/CMS/src/API/Controllers/CasesController.cs#L288)):

```
GET /api/v1/cases
  ?filter={CaseListFilters}      // strongly-typed query filter
  &pageSize=25                   // int, 1-100, default 25
  &continuationToken={opaque}    // optional cursor; reads from "cursor" header as fallback
```

Returns: `PagedResponse<CaseSummaryResponse>` ([CaseSummaryResponse.cs](C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Responses/CaseSummaryResponse.cs)).

Auth: `Authorize(Roles = CmsRoles.CaseReader)`.

The `CaseListFilters` DTO currently has 17 properties — see [CaseListFilters.cs](C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Models/CaseListFilters.cs). Most are single-value (`?`) which means the server today only supports OR-of-one — i.e., not true multi-select. **§8.1 lists every multi-value upgrade required.**

### 5.2 LENS-LRMS WebApi (adapter layer)

LRMS WebApi sits between the WebClient and CMS. Today it exposes case *detail* endpoints ([CaseController.cs](C:/R/LENS-LRMS/sources/dev/WebApi/src/API/Controllers/CaseController.cs)) but no list endpoint visible at the controller level — `caseApi.getCaseQueueCases()` in the WebClient points at some other route. The list endpoint must:

- Accept the WebClient's filter / sort / pagination shape (see §6.1).
- Translate to a CMS `CaseListFilters` query + sort directive (see §6.2).
- Invoke CMS `ListCases`.
- Project the CMS `CaseSummaryResponse` into the LRMS `CaseQueueResponseItem` shape consumed by the WebClient (see §6.4).
- Pass the `continuationToken` through transparently.

**Why the adapter exists.** Two reasons: (1) the WebClient's filter shape is different from CMS's (multi-value vs single-value); the adapter is where the mapping lives. (2) Some filters (escalation-related, badge composites) are LRMS concepts that aren't first-class in CMS; the adapter is where LRMS-private logic stays out of CMS.

### 5.3 Query construction

For each request from the WebClient, LRMS WebApi:

1. Validates the inbound query against `LrmsCaseListQuery` (see §6.1). On invalid input → 400 with a problem-details body keyed by parameter name.
2. Translates the inbound shape to `CaseListFilters` + sort directive. Drops empty / "any" / `[]` values (don't send vacuous filters to CMS — they degrade query plans).
3. Invokes `ICaseApiService.GetCasesAsync(filters, sort, pageSize, continuationToken, ct)`.
4. Receives `PagedResponse<CaseSummaryResponse>`.
5. Enriches the response with per-row escalation state, internal-escalation summary, and badge derivations (LRMS-private state stored in LRMS data stores, not CMS) by calling the LRMS-internal helpers used by the WebClient today.
6. Projects to `LrmsCaseListResponse` (see §6.4) and returns.

### 5.4 Large-dataset handling

The data classification in §1.3 sets the policy for storage decisions: case records are operational LENS data, and cross-tenant queries are the operational norm. Concretely:

- **Cosmos partition strategy.** Cases are **NOT** partitioned by `tenantId`. Doing so would make the common operational and reporting query (filter or aggregate across every tenant whose cases the organisation has processed) a worst-case cross-partition fan-out. Instead, partition by a key that distributes load evenly AND supports the cardinal time-bounded reporting query.

  Recommended partition key: **`createdYearMonth`** (computed `yyyy-MM` from `createdAt`). Rationale:
  1. Distinct-count and aggregate reports are date-range scoped (weekly forecasts, monthly transparency reports, quarterly summaries) → naturally hit a small, bounded set of partitions.
  2. Steady ingestion produces well-balanced partitions (no historical hot-spot).
  3. The list view query is always filtered by case scope (Active = currently-open) which biases toward the most recent few partitions.
  4. Tenant-scoped queries from the Tenant filter fan out across the partitions in the date range — fine because the filter is paired with a date range in the operational queries that matter (a "list every Contoso case ever" query is rare; "list every Contoso case in Q2" is the norm).

  Alternative considered and rejected: `requestType` — too few distinct values for even distribution; eEvidence dominates and would hot-partition.

  The partition key is an operational decision, not a security boundary. See §1.3 — there is no tenant-isolation invariant being enforced at this layer.

- **Cross-partition queries are normal.** The CMS handler does NOT set `EnableCrossPartition = false` as a gating policy. Cross-partition is the default for queries without a time-range filter and a routine path for queries with one.

- **Query budget.** Each call has an RU budget; if the cost would exceed the budget, Cosmos returns a partial page with `isTruncated = true`. The adapter relays the flag to the WebClient (see §3.6 / §4.5). Aggregate endpoint queries with no date-range filter MAY hit the budget at scale; ops should plan for paginated aggregation in that case (see §5.8.5).

- **Total count.** Cosmos `COUNT()` is supported cross-partition with predictable cost when the index serves the predicate. The adapter computes `totalCount` for any list query whose filter has a date-range constraint (the cardinal operational case). For unbounded filter combinations, `totalCount = null` and the WebClient renders `Showing rows X–Y` without a total; the user can either narrow the filter or use the aggregate endpoint (§5.8) which returns counts.

- **Time-range default.** The Active/All scope toggle (§3.1) does NOT add a time-range constraint — Active means "not Resolved." The list view's default sort (due-date ascending) biases toward recent partitions but doesn't bound them. For the operational queries that produced the partition-key choice above (transparency reports, weekly forecasts), date-range filters are explicit and the user-supplied.

### 5.5 Persistence model — three client tiers

The WebClient maintains view-state in three tiers, each with a distinct lifetime, scope, and storage mechanism. The split is intentional and matches user intent for each kind of state:

| Tier | Lifetime | Scope | Storage | What it holds |
|---|---|---|---|---|
| **In-memory** | Until reload | Per tab | React state | Live filters, primary sort, tiebreakers, scope, column order, column visibility, search term, pagination cursor, selected preview row, bulk selection, open dialogs |
| **Session autosave (Phase 0.5 — §5.7)** | Until tab close | Per tab, per surface | Browser `sessionStorage` | Filters, primary sort, tiebreakers, scope, column order, column visibility, quick-filter tab, view-mode toggle, applied-Saved-View id (if any) |
| **User defaults** | Until manual reset / browser data clear | Per user, per browser (shared across tabs) | Browser `localStorage` | Column order, column visibility, scope, view-mode toggle, column widths |

**`localStorage` user-default keys:**

| Key (Cases page) | Key (Attorney Dashboard) | Shape |
|---|---|---|
| `dars.caseQueue.caseScope` | `dars.attorneyDashboard.caseScope` | `"active" \| "all"` |
| `dars.caseQueue.columnOrder` | `dars.attorneyDashboard.columnOrder` | `ColumnId[]` |
| `dars.caseQueue.columnHidden` | `dars.attorneyDashboard.columnHidden` | `ColumnId[]` |
| `dars.caseQueue.columnWidths` | *(not yet shipped on AD)* | `Record<ColumnId, number>` |
| `dars.caseQueue.viewMode` | `dars.attorneyDashboard.viewMode` | `"cards" \| "list" \| "preview"` |

**`sessionStorage` Phase 0.5 autosave keys** (see §5.7 for shape):

| Key (Cases page) | Key (Attorney Dashboard) |
|---|---|
| `dars.caseQueue.sessionView` | `dars.attorneyDashboard.sessionView` |

**Why the split matters.** The active filter bag and the primary sort live in **session autosave** (Phase 0.5), NOT in user defaults — they're investigation-specific state the user expects to release at tab close. Column order and visibility live in **both** layers — they're a per-user preference that *also* persists across reloads within the tab. Saved Views (separate spec) is the durable, named, cross-device path on top of all this. The three layers compose:

- A user who sets a clever column order wants it next Monday morning too → captured in `localStorage` (user defaults).
- A user who dialed in an investigation-specific filter set wants it across a reload but NOT next Monday → captured in `sessionStorage` (Phase 0.5).
- A user who wants the whole slice back next Monday → captured in a Saved View (server).

**Read precedence on mount.** Phase 0.5 snapshot (if present) wins over user defaults for the fields it carries. User defaults fill in any field Phase 0.5 didn't capture. Hardcoded surface defaults fill in any field neither layer captured.

### 5.6 Filter combination constraints

- **All filters AND-combined** at the server query layer (see §4.2).
- **Multi-value filters OR-combined within the field**.
- **No exclusive-or constraints**: any combination of filters is legal. The UI never blocks a combination as "incompatible"; if a combination yields zero rows, the empty state messaging covers it.
- **Filter-fingerprint key**: the WebClient computes a stable fingerprint of the active filter bag ([useCaseQueue.ts:75](C:/R/LENS-LRMS/sources/dev/WebClient/src/hooks/useCaseQueue.ts#L75)). The hook refetches when the fingerprint changes, debounces when it doesn't.

### 5.7 Session-scoped autosave (Phase 0.5)

#### 5.7.1 Goal

Make the user's customised view a property of the **browser tab session**, not of in-memory React state. A reload, an in-app navigation, or a browser back / forward inside the same tab restores the customisation; closing the tab releases it. The user never names anything; the autosave is invisible.

#### 5.7.2 Mechanism

Browser `sessionStorage`, keyed per surface:

```ts
const SESSION_VIEW_KEY: Record<Surface, string> = {
  queue: "dars.caseQueue.sessionView",
  attorneyDashboard: "dars.attorneyDashboard.sessionView",
};
```

The payload is a JSON-serialised `SessionViewSnapshot`:

```ts
interface SessionViewSnapshot {
  schemaVersion: 1;
  capturedAt: string;          // RFC 3339 — debugging only
  surface: "queue" | "attorneyDashboard";

  // Live view-shape state
  quickFilter: string;
  primarySort: SortKey | null;
  sortTiebreakers: SortKey[];
  extraFilters: Record<string, unknown>;
  caseScope: "active" | "all";
  columnOrder: ColumnId[];
  columnHidden: ColumnId[];
  viewMode: "cards" | "list" | "preview";

  // Saved Views integration
  appliedViewId: string | null;   // null when no Saved View is applied
}
```

**Not captured** in the snapshot:

- Search term (transient lookup; always resets to empty on reload).
- Pagination cursor / current page (every reload starts at page 1).
- Preview-pane selected row (transient).
- Bulk selection (transient).
- Per-column widths (already in `localStorage` user defaults).

#### 5.7.3 Write trigger

The WebClient writes to `sessionStorage` after every change to any captured field, **debounced 200ms** (multiple rapid edits coalesce into one write). The write is wrapped in `try/catch` — `sessionStorage` quota errors (~5 MB per origin) are logged but never thrown.

#### 5.7.4 Read trigger

On every mount of the Cases page or Attorney Dashboard component:

1. Read `sessionStorage[SESSION_VIEW_KEY[surface]]`.
2. If absent or malformed → fall through to user defaults (`localStorage`).
3. If present and `schemaVersion` matches the current build → sanitise (drop unknown filter ids, drop unknown column ids per the same sanitisers used by Saved Views — see [Saved Views §4.8](./saved-views-phase-1-spec.md)), hydrate the React state, proceed.
4. If `schemaVersion` is older → run the in-flight migration transformer if registered; if no transformer is registered → discard and fall through to defaults (a build mismatch in `sessionStorage` is a transient state worth dropping rather than crashing).

#### 5.7.5 Lifecycle

- **Write.** Every captured-field change → debounced write.
- **Read.** Every mount of Cases / Attorney Dashboard → one read, then hydrate.
- **Clear on Reset.** The Customize view panel's "Reset to default" button explicitly removes the surface's `sessionStorage` entry (see §4.4).
- **Clear on Apply Saved View.** Applying a Saved View replaces in-memory state with the view's snapshot; the next debounced write to `sessionStorage` overwrites the autosave entry with the new state. No explicit clear is needed.
- **Clear on tab close.** The browser handles this — `sessionStorage` dies with the tab.

#### 5.7.6 Interaction with Saved Views

Three reload scenarios cover the precedence:

| Scenario | Behaviour |
|---|---|
| User applies Saved View "X", reloads | Read autosave → autosave's `appliedViewId` is `"X"`, captured state matches view snapshot → `(modified)` indicator stays off; surface looks identical to before reload |
| User applies Saved View "X", tweaks a filter, reloads | Autosave captured the post-tweak state with `appliedViewId = "X"` → restore → `viewMatchesCurrent("X", restored)` returns false → `(modified)` indicator on |
| User has no Saved View applied, builds a custom slice, reloads | Autosave has `appliedViewId = null` and the custom slice → restore; menu trigger reads "Saved views" with no view selected |
| User closes tab, opens fresh tab | `sessionStorage` is empty → fall through; if Saved Views Phase 1's "last applied view" feature is on, that view auto-applies in the new tab; otherwise pristine defaults |
| User Resets via Customize view panel | Autosave entry deleted; in-memory state cleared; if a Saved View was applied, `appliedViewId` cleared from menu state |

**Rule of thumb.** Saved Views are the durable, named slice; Phase 0.5 is the *delta* the user is currently working with on top of the applied view (or on top of the defaults if no view is applied). The autosave layer never *replaces* a Saved View — it carries the user's working state forward across reloads within the tab and integrates with the modified indicator via `appliedViewId`.

#### 5.7.7 Cross-tab semantics

`sessionStorage` is per-tab by browser specification. Two tabs of the Cases page in the same browser have **independent** autosave snapshots — they do not sync. This is by design:

- Two tabs typically represent two work-streams (e.g., RS triaging in one tab, Ops Lead investigating in another).
- Users who want cross-tab sync use Saved Views.

We explicitly do NOT use `localStorage` + a session token for cross-tab sync — that path adds complexity (storage events, conflict resolution) for marginal value at this stage.

#### 5.7.8 Schema versioning

`schemaVersion = 1` ships with Phase 0.5. The field exists so a future build that changes the snapshot shape can register a transformer (§5.7.4 step 4). The transformer pattern mirrors Saved Views Phase 1 §5.6.

When a `schemaVersion` mismatch occurs and no transformer is registered, the WebClient silently discards the snapshot and falls through to defaults. **No telemetry warning** for this case — it would fire once per user on every build that ships a schema bump, which is noise. When a transformer IS registered, every transform emits a debug event so we can monitor migration impact.

#### 5.7.9 Catalog drift

Same sanitiser as Saved Views ([§4.8 of Saved Views Phase 1](./saved-views-phase-1-spec.md)): unknown filter ids dropped, unknown column ids dropped, unknown sort key columns dropped — silently on session restore. The user has no expectation of stable session state across builds; we don't surface a warning.

#### 5.7.10 Telemetry

| Event | Trigger |
|---|---|
| `LrmsCaseOperationEvent { Operation = SessionViewRestore, Surface, HadAppliedView, FiltersCount }` | Successful restore on mount |
| `LrmsCaseOperationEvent { Operation = SessionViewRestore, Phase = Warning, Message = "Dropped n unknown filter ids" }` | Catalog drift on restore |
| `LrmsCaseOperationEvent { Operation = SessionViewRestore, Phase = Failed, Message }` | Malformed JSON, quota error, etc. |
| `LrmsCaseOperationEvent { Operation = SessionViewClear, Reason = "Reset" }` | User-initiated reset |

No filter values logged — same fingerprint approach as elsewhere in the spec.

#### 5.7.11 Privacy and security

`sessionStorage` is same-origin and tab-bound. It is **not** transmitted to the server. It is **not** synced across devices. For a shared-workstation scenario, closing the browser tab fully releases the snapshot — there is no residual on-disk state to worry about beyond the standard browser cache.

The snapshot can contain identifier values via the `extraFilters` payload (e.g., a tenant name) — but **search term is excluded** specifically because it most often contains the highest-value PII (email addresses, phone numbers). The autosave's privacy posture is "the same as `localStorage` for app preferences": local to the tab session, not transmitted.

#### 5.7.12 Implementation cost

Estimated effort: ~50 LOC in the LRMS WebClient — a new `useSessionView` React hook that wraps the existing view-controls state with `sessionStorage` read on mount and a debounced write on change. No backend changes. No new endpoints. No new contracts in LENS-Common.

### 5.8 Aggregate query model (BR-16, BR-17)

#### 5.8.1 Goal

Surface aggregate counts (total or distinct) over the same filter model the list view uses, without the user paginating through results to count by hand. Backs the Enterprise distinct-count reports described in §1.3 and §2.2.

#### 5.8.2 Query shape

The aggregate query carries:

- The **same filter parameters** as ListCases (every catalog filter in §4.2; same shape, same semantics).
- A **metric**: `count` (rows that match the filter) or `distinctCount` (rows that match, distinct on a specified field — typically `caseId`).
- An optional **`groupBy`** dimension list (1–3 dimensions). When unspecified, returns a single aggregate row.
- An optional **`distinctField`** (required when `metric=distinctCount`). Typically `caseId`; could also be `tenant`, `assigneeName`, `agencyId` for higher-level distinct counts.

The query does NOT carry sort, pagination, or column-configuration parameters — aggregates have no rows-to-rank and no rows-to-display semantics. The response is bounded by the cardinality of the `groupBy` dimensions; the spec caps total group cardinality at 1,000 (see §5.8.6).

#### 5.8.3 Example queries

| Question | Metric | Group by | Filters |
|---|---|---|---|
| Total Enterprise cases delivered vs. not delivered in Q2 | `count` | `deliveryOutcome` | `accountTypes=Enterprise`, `createdFrom=2026-04-01`, `createdTo=2026-06-30` |
| Unique cases processed for Enterprise tenants in H1 | `distinctCount` (on `caseId`) | *(none)* | `accountTypes=Enterprise`, `createdFrom=2026-01-01`, `createdTo=2026-06-30` |
| Cases per tenant per delivery outcome in 2026 | `count` | `tenant`, `deliveryOutcome` | `createdFrom=2026-01-01`, `createdTo=2026-12-31` |
| Distinct tenants we processed Subpoenas for last month | `distinctCount` (on `tenant`) | *(none)* | `requestType=Subpoena`, `createdFrom=2026-05-01`, `createdTo=2026-05-31` |

#### 5.8.4 Server-side execution

CMS implements the aggregate as a Cosmos SQL `SELECT COUNT(1)` (or `SELECT VALUE COUNT(DISTINCT c.fieldX)`) against the same container that backs the list view. The query layer:

1. Validates the filter combination (same validators as ListCases).
2. Validates that `groupBy` dimensions are in the allow-list (every catalog filter id; not arbitrary fields).
3. Builds the Cosmos query: `FROM c WHERE <filter clauses> GROUP BY <groupBy clauses>`.
4. Computes the aggregate; returns a `groups[]` array sized by the cardinality of `groupBy`.

The `groupBy` allow-list is critical: arbitrary group-by would let a caller fan out queries by high-cardinality dimensions (`caseId`, identifier values) and blow the RU budget. Spec-approved dimensions:

```
caseScope, quickFilter, priority, workflowStage, caseStatus,
country, jurisdiction, requestType, requestSubType,
accountTypes, deliveryOutcome, agencyId, agencyName,
validatingAuthority, competentAuthority, requestOrigin, tenant,
escalationStatus, recommendRejection, slaTier
```

#### 5.8.5 Aggregate query cost — paginated aggregation

A single aggregate query can exceed Cosmos's RU budget when:

- The filter combination is broad (e.g., no date range) AND
- The `groupBy` dimensions span every partition.

When this happens, the response carries `isTruncated = true` AND a `partialContinuationToken`. The caller (typically a script or a Reports UI, not the LRMS WebClient) re-issues the query with the token to accumulate partial counts. The endpoint enforces a global timeout (§6.6) so a runaway aggregate doesn't burn the user's session.

Operational guidance for callers: **always include a date-range filter** when querying aggregates. The §5.4 partition strategy (`createdYearMonth`) makes date-bounded aggregates single-pass-fast and unbounded aggregates expensive.

#### 5.8.6 Cardinality cap

If the `groupBy` combination would produce > 1,000 distinct groups, CMS returns `400 GroupCardinalityExceeded` rather than blow the response payload. The caller must narrow the filter or reduce the `groupBy` count.

Why 1,000: the cardinal Enterprise use cases produce <50 groups (delivery outcomes × a small number of high-volume tenants); 1,000 is a comfortable ceiling that catches accidental high-cardinality combinations (e.g., grouping by `caseId`).

#### 5.8.7 Caching

Aggregate responses MAY be cached at the LRMS WebApi layer for 5 minutes when:

- The filter has a closed date range entirely in the past (no rows can change retroactively → safe to cache).
- The filter does NOT include `assignee`, `escalationStatus`, `staleEscalation`, `specificAttorney`, or any other dimension that changes outside of case creation (those would invalidate a cached response on every assignment).

Cache key: the SHA-256 of the canonicalised query parameters. Cache layer: in-memory in the WebApi process, sized to 1,000 entries with LRU eviction. Stale responses are NOT returned; on miss, the WebApi calls through to CMS.

#### 5.8.8 Authorization

Aggregate queries require the `CaseReader` role (same as ListCases). No additional role is required for cross-tenant aggregation — that's the point of §1.3. Audit logging via `LrmsCaseOperationEvent { Operation = AggregateCases, Phase = Completed, Message = "metric={metric}, groupBy={dims}, filterFingerprint={hash}" }`. No raw filter values logged.

---

## 6. Frontend ↔ Backend Contracts

### 6.1 LRMS WebClient → LRMS WebApi

**`GET /api/case/list`** (proposed — does not exist in [CaseController.cs](C:/R/LENS-LRMS/sources/dev/WebApi/src/API/Controllers/CaseController.cs) today; today's `caseApi.getCaseQueueCases()` points at a different route that must be unified to this contract.)

**Query string:**

```
GET /api/case/list
  ?freeText=foo
  &caseScope=active|all
  &priority=Emergency,Urgent
  &workflowStage=Triage,Fulfillment
  &workflowState=WaitingOnTriage,InProgress
  &jurisdiction=US-Federal,DE-Federal
  &country=US,DE
  &assigneeName=Nicole%20Garcia
  &agencyId=AGENCY-001,AGENCY-002
  &agencyName=FBI,BKA
  &validatingAuthority=...
  &competentAuthority=...
  &requestType=Subpoena,Warrant
  &requestSubType=EPOC-ER
  &requestOrigin=LEPortal,LEAPI
  &natureOfCrimes=Cybercrime,Fraud
  &accountTypes=Consumer,Enterprise
  &services=Email,Teams
  &tenant=Contoso,Fabrikam
  &etsiAuthId=ETSI-...
  &leReferenceNumber=...
  &createdFrom=2026-01-01
  &createdTo=2026-06-08
  &dueBefore=2026-06-15
  &dueAfter=2026-06-01
  &dueDateBucket=overdue|dueToday|dueThisWeek|dueThisMonth
  &identifierType=email,phone
  &escalationStatus=Pending,InformationRequested
  &specificAttorney=ATT-NNN
  &staleEscalationDays=7
  &recommendRejection=yes|no
  &unreadInbound=yes|no
  &badgeIds=threat-to-life,gfr-hold&badgeMatch=any|all
  &sortPrimary=priority:desc
  &sortTiebreaker1=due-date:asc
  &sortTiebreaker2=case-assignee:asc
  &pageSize=25
  &continuationToken={opaque}
```

**Comma-separated values** for multi-value filters; values are URL-encoded. Empty parameters are omitted (not sent as empty strings).

**Sort directives** use the format `{columnId}:{asc|desc}`; tiebreakers numbered 1–2.

**Response shape:**

```ts
interface LrmsCaseListResponse {
  items: CaseQueueResponseItem[];     // see §6.4
  totalCount?: number;                // null for cross-partition queries
  hasMorePages: boolean;
  continuationToken?: string;
  isTruncated: boolean;
  appliedScope: 'active' | 'all';
  appliedFilterFingerprint: string;   // non-reversible hash, for audit log
}
```

**Status codes:**

| Code | Meaning | Body |
|---|---|---|
| 200 | Success | `LrmsCaseListResponse` |
| 400 | Validation failure | `ProblemDetails` with per-parameter errors keyed in `extensions.errors` |
| 401 | Unauthenticated | (none — redirect) |
| 403 | Lacks `CaseReader` role | `ProblemDetails` with `errorCode = "AccessDenied"` |
| 429 | Per-user rate limit hit | `ProblemDetails` with `Retry-After` header |
| 500 | Downstream CMS or LRMS error | `ProblemDetails` with `extensions.errorCode` |

### 6.2 LRMS WebApi → LENS-CMS

**`GET /api/v1/cases`** ([CasesController.cs:288](C:/R/LENS-CMS/sources/dev/CMS/src/API/Controllers/CasesController.cs#L288)) — existing contract. The adapter populates `CaseListFilters` and the new server-side `sort` parameter (see §8.1).

**Authoritative DTO**: `Microsoft.LENS.Common.DataModels.Contracts.CMS.CaseListFilters`. The adapter must NOT serialise empty arrays, empty strings, or default-value sentinels — empty filter slots must be omitted from the query so CMS's query planner can optimise.

**MISE v2 service-to-service auth** with the `CMS.CaseReader` role on the LRMS WebApi's service principal. LRMS WebApi is registered as an authorized caller in CMS's `AnyOfAuthorizedClients` whitelist.

### 6.3 Server-side sort parameter (new — proposed §8.1 schema change)

```
&sort=primary:{columnId}:{asc|desc};tb1:{columnId}:{asc|desc};tb2:{columnId}:{asc|desc}
```

CMS parses the sort directive into a list of `SortKey { columnId, direction }`. Unknown `columnId` values are rejected with 400. The CMS handler builds the Cosmos `ORDER BY` clause from the list in order. The handler **must** include `caseId` as the final tiebreaker so the cursor is stable across pages.

### 6.4 Row projection

**LRMS `CaseQueueResponseItem`** (current shape, [api/types.ts](C:/R/LENS-LRMS/sources/dev/WebClient/src/api/types.ts) reads):

```ts
interface CaseQueueResponseItem {
  caseId: string;
  createDate: string;
  assigneeName?: string;
  requestType?: string;
  requestOrigin?: string;
  country?: string;
  jurisdiction?: string;
  natureOfCrimes?: string[];
  isThreatToLife?: boolean;
  isEscalatedInternally?: boolean;
  priority?: string;
  caseDueDate?: string;
  workflowStage?: string;
  workflowStateName?: string;
  hasEnterpriseAccounts?: boolean;
  hasAzureAccounts?: boolean;
  accountExistenceChecked?: boolean;
  identifierCount?: number;
}
```

**Proposed v1 enrichments** (additive — no breaking changes to existing readers):

- `identifierTypes?: Record<string, number>` — backs the Identifier Types filter + column.
- `escalation?: { status, role, assigneeLabel, escalatedAt, lastActivityAt }` — backs the Escalation Status, Specific Attorney, Stale Escalation filters.
- `agencies?: { issuing?, validating?, competent?, enforcing?: string }` — backs the four authority filters and their synthesised columns.
- `tenant?: string` — backs the Tenant filter.
- `unreadInboundCount?: number` — backs the Unread Inbound (IA/EA) filter.
- `gfrHold?: { tier: 'red' \| 'amber' \| 'green' \| 'brand' } | null` — backs the GFR Hold column / badge.
- `attorneyReviewCount?: number` — backs the Attorney Review column.
- `recentNotes?: RecentNotesSummary` — already in `CaseSummaryResponse`, projected through.

The LRMS WebApi adapter is responsible for assembling these enrichments by joining CMS data with LRMS-private stores (escalation registry, correspondence engine, agency directory).

### 6.5 Invalid / conflicting input handling

| Scenario | Server response | UX |
|---|---|---|
| `pageSize > 100` | 400, `errors.pageSize = "Must be 1-100"` | Toast; reset to default 25 |
| Unknown `columnId` in sort directive | 400, `errors.sort = "Unknown column 'foo'"` | Drop the bad sort key, retry without |
| `createdFrom > createdTo` | 400, `errors.createdFrom = "Must be <= createdTo"` | Inline error on the date range chip |
| Filter value not in catalog enum | 400, `errors.{field} = "Value 'x' is not valid"` | Inline error on the chip |
| Stale `continuationToken` (e.g., after Cosmos partition split) | 410 Gone (proposed) | Reset to page 1 silently; toast: `"Refreshed list."` |
| MISE token expired mid-pagination | 401 | Standard auth redirect |
| Cosmos throttle (429) on the CMS side | CMS retries via Polly; if exhausted, 503 to LRMS adapter | Retry banner with backoff |

### 6.6 Aggregate endpoint contract (BR-16, BR-17)

Backs the aggregate query model defined in §5.8.

#### 6.6.1 LRMS WebClient / programmatic caller → LRMS WebApi

```
GET /api/case/aggregate
  ?metric=count|distinctCount
  &distinctField=caseId                  # required when metric=distinctCount
  &groupBy=deliveryOutcome,tenant        # comma-separated; 0–3 dimensions
  &<every catalog filter>=...             # same shape as /api/case/list
```

**Response 200:**

```ts
interface AggregateResponse {
  metric: "count" | "distinctCount";
  distinctField?: string;
  groupBy: string[];
  groups: AggregateGroup[];
  totalCount: number;                     // sum across all groups
  generatedAt: string;                    // RFC 3339
  isTruncated: boolean;                   // see §5.8.5
  partialContinuationToken?: string;      // present only when isTruncated
  cached: boolean;                        // true when served from §5.8.7 cache
  cachedAt?: string;                      // when cached=true
}

interface AggregateGroup {
  dimensions: Record<string, string | null>;  // keyed by groupBy field; null = "no value"
  count: number;
  distinctCount?: number;                 // present only when metric=distinctCount
}
```

**Example.** "Enterprise cases by delivery outcome over Q2 2026":

```
GET /api/case/aggregate
  ?metric=count
  &groupBy=deliveryOutcome
  &accountTypes=Enterprise
  &createdFrom=2026-04-01
  &createdTo=2026-06-30
```

Response:

```json
{
  "metric": "count",
  "groupBy": ["deliveryOutcome"],
  "groups": [
    { "dimensions": { "deliveryOutcome": "Disclosed" },    "count": 234 },
    { "dimensions": { "deliveryOutcome": "NotDisclosed" }, "count": 56  },
    { "dimensions": { "deliveryOutcome": "InProgress" },   "count": 18  },
    { "dimensions": { "deliveryOutcome": "Withdrawn" },    "count": 7   }
  ],
  "totalCount": 315,
  "generatedAt": "2026-06-09T14:22:11Z",
  "isTruncated": false,
  "cached": false
}
```

**Example.** "Unique cases processed for Enterprise tenants in H1":

```
GET /api/case/aggregate
  ?metric=distinctCount
  &distinctField=caseId
  &accountTypes=Enterprise
  &createdFrom=2026-01-01
  &createdTo=2026-06-30
```

Response:

```json
{
  "metric": "distinctCount",
  "distinctField": "caseId",
  "groupBy": [],
  "groups": [
    { "dimensions": {}, "count": 612, "distinctCount": 612 }
  ],
  "totalCount": 612,
  "generatedAt": "2026-06-09T14:22:11Z",
  "isTruncated": false,
  "cached": true,
  "cachedAt": "2026-06-09T14:18:33Z"
}
```

**Status codes:**

| Code | `errorCode` | Cause |
|---|---|---|
| 200 | — | Success |
| 400 | `MetricRequired` | `metric` missing |
| 400 | `DistinctFieldRequired` | `metric=distinctCount` without `distinctField` |
| 400 | `DistinctFieldInvalid` | `distinctField` not in allow-list (caseId, tenant, assigneeName, agencyId) |
| 400 | `GroupByInvalid` | A `groupBy` dimension not in §5.8.4 allow-list |
| 400 | `GroupByTooMany` | > 3 `groupBy` dimensions |
| 400 | `GroupCardinalityExceeded` | Result would have > 1,000 groups (§5.8.6) |
| 400 | `FilterValidationFailed` | Same per-parameter validators as list endpoint |
| 401 / 403 / 429 | — | Same as list endpoint |
| 503 | `BudgetExhausted` | Cosmos RU budget exhausted; caller should retry with `partialContinuationToken` or narrow filters |
| 504 | `Timeout` | Aggregate query exceeded the 10-second hard timeout |

#### 6.6.2 LRMS WebApi → LENS-CMS

CMS exposes `GET /api/v1/cases/aggregate` with the same parameter shape; the adapter is mostly pass-through. The adapter:

1. Validates inbound query (same FluentValidator chain as list endpoint, plus aggregate-specific rules).
2. Computes the cache key per §5.8.7 and short-circuits on hit.
3. Forwards to CMS; on response, populates the §5.8.7 cache for cacheable queries.
4. Emits `LrmsCaseOperationEvent { Operation = AggregateCases, ... }` telemetry per §5.8.8.

#### 6.6.3 Timeout and retry policy

- LRMS WebApi imposes a hard 10-second timeout on the aggregate call to CMS.
- On timeout: returns `504 Timeout` to the caller; logs a `Failed` event.
- On `503 BudgetExhausted` from CMS: the adapter does NOT auto-retry; the caller decides whether to narrow filters or paginate via `partialContinuationToken`.

---

## 7. Calculated Fields & Derived Values

The list view depends on several **derived** values that are not raw fields on the case document. Each must have a defined computation, input fields, dependencies, and audit story.

### 7.1 `caseScope` derived view filter

| Aspect | Detail |
|---|---|
| Inputs | `Case.workflowState` (enum, `Microsoft.LENS.Common.DataModels.Shared.Enums.WorkflowState`) |
| Logic | `caseScope = "active"` iff `workflowState !== Resolved` |
| Where evaluated | Server-side, expressed in the CMS query as a `WorkflowState IN (…)` clause |
| Re-evaluation | On every list query (live) |
| Audit dependency | The `LrmsCaseOperationEvent.Operation = ListCases` log records the resolved scope |

### 7.2 `priorityRank` (already in CaseSummaryResponse)

| Aspect | Detail |
|---|---|
| Inputs | `Case.priority` (enum, `Microsoft.LENS.Common.DataModels.Shared.Enums.Priority`) |
| Logic | `Emergency = 1`, `Urgent = 2`, `Standard = 3` (lower number = higher urgency, per [CaseSummaryResponse.cs:101](C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Responses/CaseSummaryResponse.cs#L101)) |
| Where evaluated | Server-side; projected on every list response |
| Use | Drives the Priority column sort comparator + the SLA Tier filter mapping |

### 7.3 `dueDateBucket` (already in CaseListFilters)

| Aspect | Detail |
|---|---|
| Inputs | `Case.caseDueDate` (DateTimeOffset), system clock |
| Logic | `overdue` iff `caseDueDate < now`; `dueToday` iff same calendar day; `dueThisWeek` iff within 7 days; `dueThisMonth` iff within 30 days |
| Where evaluated | Server-side, on each ListCases call (the bucket is a derived predicate, not a stored field) |
| Caveat | Time-zone: evaluated in **UTC**. Display of due-date cells is in the user's local time zone; bucket computation is in UTC to keep cross-region behaviour deterministic. |

### 7.4 `escalationAge` (proposed new derived field)

| Aspect | Detail |
|---|---|
| Inputs | `Case.attorneyEscalation.escalatedAt`, `Case.attorneyEscalation.actions[].performedAt`, system clock |
| Logic | `escalationAge = floor((now - max(escalatedAt, max(actions.performedAt))) / 24h)` |
| Edge cases | Returns `null` when the case has no active escalation OR the escalation is in a terminal status (`ApprovedForDelivery`, `ApprovedWithConditions`) |
| Use | Drives the Stale Escalation filter (`staleEscalationDays` threshold) + Escalation Age column |
| Storage | NOT persisted — computed on read |

### 7.5 `agencyCountryMatch` (already in `CaseLegalContext`)

| Aspect | Detail |
|---|---|
| Inputs | `legalContext.country.countryCode`, `legalContext.agencies[].agency.country.countryCode` |
| Logic | `agencyCountryMatch = legalContext.agencies.every(ar => ar.agency.country.countryCode === legalContext.country.countryCode)` |
| Use | Anomaly detection — surfaces cases where the LE agency country doesn't match the case country (e.g., cross-border MLAT scenarios) |
| Proposed surfacing | A future "Cross-border anomaly" filter (`anomalyType = countryMismatch`); column treatment: a small warning glyph next to the Country / Jurisdiction cell when `false` |

### 7.6 `unreadInboundCount` (proposed new derived field)

| Aspect | Detail |
|---|---|
| Inputs | Correspondence engine: every inbound correspondence item on the case where the sender role is IssuingAuthority or EnforcingAuthority and `read === false` |
| Logic | Count of matching items |
| Use | Drives the Unread Inbound (IA/EA) filter + Unread column |
| Storage | Materialised by the LRMS correspondence engine and joined into the row projection by the adapter; NOT in CMS |

### 7.7 Anomaly anchors (for BR-14)

The spec does not propose dedicated anomaly columns in v1, but flags these as the source list for the future "Anomaly" filter group:

| Anomaly | Source | Predicate |
|---|---|---|
| Mismatched resolution code vs delivery status | `Case.resolutionCode`, `Case.deliveryStatus` | `resolutionCode === "DataProvided" && deliveryStatus !== "DeliveredSuccessfully"` |
| Stuck triage | `Case.workflowStage`, `Case.workflowStageEnteredAt` | `workflowStage === "Triage" && (now - workflowStageEnteredAt) > 7 days` |
| Resolved-but-stuck | `Case.workflowState`, `Case.workflowStateEnteredAt` | `workflowState === "Resolved" && (now - workflowStateEnteredAt) > 30 days && hasOpenDfts === true` |
| Cross-border country mismatch | `agencyCountryMatch` (§7.5) | `=== false` |
| Stale escalation | `escalationAge` (§7.4) | `>= 7` |

The anomaly catalog will be productised in a follow-on spec; for v1, these are documented as derivable from existing data so the engineering team can validate the schema covers them.

### 7.8 Traceability and reporting consistency

Every derived value above must satisfy:

1. **Single source of truth** — the predicate / formula is defined in **one** place (the proposal: a `LENS-Common.CaseDerivations` library, new). Both CMS server-side and the LRMS adapter reference the same library to avoid drift between the queried filter and the displayed cell.
2. **Deterministic** — given the same inputs, produces the same output across services. Time-zone, casing, and null-handling are explicit.
3. **Documented in XML doc comments** on the C# declarations and JSDoc on TypeScript equivalents.
4. **Versioned** — when a derivation changes (e.g., the "active" definition expands to include / exclude another stage), the change is versioned in the library's release notes so transparency-report writers can correlate stage transitions with derivation changes.

### 7.9 `deliveryOutcome` (proposed new derived field — drives BR-16, BR-17)

| Aspect | Detail |
|---|---|
| Inputs | The case's delivery-job records (downstream of CMS, in the DCS/DFS fulfilment pipeline — see [LENS-Common §LENS System Architecture](C:/R/LENS-Common/CLAUDE.md)) |
| Logic | `Disclosed` if any delivery job completed successfully AND the case's `resolutionCode` indicates data was provided; `NotDisclosed` if the case is in a terminal state and no delivery completed successfully; `InProgress` if no delivery has terminated; `Withdrawn` if the issuing authority withdrew the request before completion; `Rejected` if the case's `resolutionCode` is a rejection (no-data, scope-issue, etc.) |
| Where evaluated | Server-side at projection time. Materialised onto the case record by the fulfilment pipeline so the list / aggregate query layer reads it without joining to delivery records |
| Use | Drives the `deliveryOutcome` filter (§4.2) + Delivery Outcome column + the cardinal BR-16 / BR-17 aggregate queries |
| Storage | Persisted as a denormalised field on the case document. Updated whenever a delivery job's status changes (fulfilment pipeline event handler). |
| Telemetry | Every transition emits `LrmsCaseOperationEvent { Operation = DeliveryOutcomeTransition, ... }` so transparency-report writers can correlate stage transitions with the derived value |

### 7.10 `viewMatchesCurrent` (Phase 0.5 ↔ Saved Views modified indicator)

| Aspect | Detail |
|---|---|
| Inputs | The restored Phase 0.5 snapshot's captured state + the Saved View identified by snapshot's `appliedViewId` (if non-null) |
| Logic | Apply [Saved Views §7.1](./saved-views-phase-1-spec.md) `viewMatchesCurrent` comparator |
| Where evaluated | Client-side, immediately after Phase 0.5 restore on mount; thereafter on every captured-state change (debounced 50ms) |
| Use | Drives the `(modified)` indicator on the Saved Views menu trigger |
| Note | Phase 0.5 doesn't define a new comparator — it re-uses Saved Views' existing logic via the `appliedViewId` field in the snapshot |

---

## 8. Integration with Existing Systems

### 8.1 LENS-Common — required schema changes

The CMS `CaseListFilters` contract is the bottleneck for the proposed UX. Required upgrades (all additive — no breaking changes to existing readers; new properties are optional):

| Existing field | Change |
|---|---|
| `RequestType?` | → `RequestType[]?` (multi-value) |
| `Jurisdiction?` | → `Jurisdiction[]?` (multi-value) |
| `Priority?` | → `Priority[]?` (multi-value) |
| `WorkflowState?` | → `WorkflowState[]?` (multi-value) |
| `WorkflowStage?` | → `WorkflowStage[]?` (multi-value) |
| `AgencyId?` | → `AgencyId[]?` (multi-value) |
| `RequestOrigin?` | → `RequestOrigin[]?` (multi-value) |
| (none) | + `Country[]?` |
| (none) | + `RequestSubType[]?` |
| (none) | + `ServicesRequested[]?` |
| (none) | + `IdentifierType[]?` |
| (none) | + `Tenant[]?` |
| (none) | + `EscalationStatus[]?` |
| (none) | + `SpecificAttorney?` |
| (none) | + `StaleEscalationDays?` |
| (none) | + `RecommendRejection?` (`yes` / `no` / null) |
| (none) | + `UnreadInbound?` (`yes` / `no` / null) |
| `DueBefore?` | + add complementary `DueAfter?` |
| (none) | + `BadgeIds[]?` + `BadgeMatch?` (`any` / `all`) |
| (none) | + `AgencyName[]?`, `ValidatingAuthority[]?`, `CompetentAuthority[]?` |
| (none) | + `DeliveryOutcome[]?` — enum: `Disclosed` / `NotDisclosed` / `InProgress` / `Withdrawn` / `Rejected`. Derived from the case's delivery jobs (see §7.9). Drives BR-16, BR-17 and the new `deliveryOutcome` filter (§4.2). |

The `AuthorityRole` enum (currently `IssuingAuthority`, `EnforcingAuthority`, `RequestingAgency`, `CooperatingAgency`, `OutsideCounsel`) must be extended with `ValidatingAuthority` and `CompetentAuthority` so the new agency-role filters have first-class enum values.

The `CaseLegalContext` interface must gain two derived accessors:

- `primaryValidatingAuthority?: Agency`
- `primaryCompetentAuthority?: Agency`

Each is the `agency` from the first `CaseAgencyRole` in `agencies[]` matching the corresponding role.

**Backward compatibility** — existing single-value properties stay valid (the spec uses `T[]? | null` in addition; readers that only check `T?` get the first value of the array).

### 8.2 LENS-CMS — required handler changes

**Cosmos container partition key change.** Per §1.3 and §5.4, the `Cases` container's partition key changes from `/tenantId` to `/createdYearMonth` (computed `yyyy-MM` from `createdAt`). This is a **breaking change** to the deployed CMS data tier and requires:

1. A new container with the new partition key.
2. A migration job that copies every existing document into the new container, computing `createdYearMonth` per-row.
3. A dual-write window during migration so writes from CasesController land in both containers; the WebApi adapter reads from the new container exclusively once migration completes.
4. Validation that no row was dropped (count check, sample fingerprint comparison).

The partition key change is operational (per §1.3 data classification) — there is no security boundary removed. The tenant-isolation invariant the previous partition key implicitly enforced was, on reconsideration, not a security invariant the platform required for case data.

Required ListCases handler changes — [`ICaseHandler.ListCasesAsync`](C:/R/LENS-CMS/sources/dev/CMS/src/BusinessLogic/Interfaces/ICaseHandler.cs) (and its implementing repository) must accept:

1. A `SortDirective` parameter (sequence of `SortKey { columnId, direction }`).
2. The expanded `CaseListFilters` shape from §8.1.
3. The `caseScope` value (or its WorkflowState IN-clause equivalent).

The Cosmos query builder ([CaseRepository](C:/R/LENS-CMS/sources/dev/CMS/src/DataAccess/Repositories/)) must:

- Translate each filter property to a `c.{path} = @value` or `c.{path} IN (@v1, @v2, ...)` clause.
- Translate the sort directive to an `ORDER BY` clause, appending `c.caseId ASC` as the final tiebreaker.
- Reject any combination that would require a cross-partition scan with `EnableCrossPartition = false` (transparency-reporting role gets the cross-partition right).

The `Pagination` config block ([CLAUDE.md L249](C:/R/LENS-CMS/CLAUDE.md#L249)) stays at `Min=1, Default=25, Max=100`. No change.

### 8.3 LENS-LRMS WebApi — required handler changes

A new `CaseListHandler` (proposed; the existing `CaseRequestHandler` is detail-focused) implements §6.1's `GET /api/case/list`:

1. Validates and parses the inbound query (via a FluentValidator).
2. Translates to `CaseListFilters` + `SortDirective` + `caseScope` for CMS.
3. Calls `ICaseApiService.GetCasesAsync(...)`.
4. Enriches each row by joining LRMS-private state from:
   - The internal-escalation registry (current Specialist-side escalation state per case).
   - The correspondence engine (`heldForAttorneyOutbounds`, `unreadInboxCount`).
   - The agency directory (canonical agency name → ID lookups; reverse projection for `agencyName` / `validatingAuthority` / `competentAuthority` filters).
5. Projects to `LrmsCaseListResponse` (§6.1).
6. Logs `LrmsCaseOperationEvent { Operation = ListCases, Phase = Completed, Message = "..." }` per [.claude/rules/logging.md](C:/R/LENS-LRMS/.claude/rules/logging.md).

### 8.4 LENS-LRMS WebClient — Phase 0.5 implementation

New `useSessionView` hook in `sources/dev/WebClient/src/features/case-queue/hooks/useSessionView.ts`:

```ts
function useSessionView(
  surface: "queue" | "attorneyDashboard",
  initialState: CommonViewFilters,
): [CommonViewFilters, (next: Partial<CommonViewFilters>) => void];
```

- Reads `sessionStorage[SESSION_VIEW_KEY[surface]]` on mount; hydrates initial state per §5.7.4.
- Writes back (debounced 200ms) on every change to captured fields per §5.7.3.
- Catches and logs `sessionStorage` errors silently (quota, disabled storage) without disrupting the in-memory state.
- Wires into the existing `useCaseQueue` hook so the rest of the data path is unchanged.

No backend changes are required for Phase 0.5.

### 8.5 LENS-CMS + LRMS-WebApi — aggregate endpoint (BR-16, BR-17)

A new `ICaseAggregateHandler` in `CMS/BusinessLogic/Handlers/`:

```csharp
public interface ICaseAggregateHandler
{
    Task<AggregateResponse> AggregateAsync(
        AggregateRequest request,
        CancellationToken cancellationToken);
}
```

`AggregateRequest` carries the `CaseListFilters` block + `metric` + optional `distinctField` + `groupBy[]`. The handler:

1. Validates that `groupBy` dimensions are in the §5.8.4 allow-list.
2. Validates the §5.8.6 cardinality cap (estimated via a probe query or accepted as best-effort).
3. Builds the Cosmos SQL — `SELECT COUNT(1)` or `SELECT VALUE COUNT(DISTINCT c.<field>)` with `GROUP BY` clauses derived from the request.
4. Executes via `ICaseRepository.AggregateAsync`.
5. Returns the projected `AggregateResponse`.

CMS endpoint exposing this: `GET /api/v1/cases/aggregate` with `[Authorize(Roles = CmsRoles.CaseReader)]`. LRMS-WebApi `CaseAggregateHandler` is the adapter; cache lives in WebApi per §5.8.7.

The aggregate handler shares the `CaseListFilters` translation logic with `ICaseHandler.ListCasesAsync` — both call into the same filter-to-Cosmos-SQL builder. This prevents drift: filter semantics that produce a row in the list view always produce a count in the aggregate response.

### 8.6 Cross-service contract compatibility checklist

| Concern | Owned by | Validation |
|---|---|---|
| `CaseListFilters` shape additive | LENS-Common | Schema diff test in `Common.Tests/DTOs/CaseListFiltersTests.cs` |
| `CaseSummaryResponse` shape additive | LENS-Common | Schema diff test |
| `ListCases` handler accepts new params | LENS-CMS | Contract test in `API.Tests/Controllers/CasesControllerTests.cs` |
| Cosmos `ORDER BY` cursor stability | LENS-CMS | Integration test in `DataAccess.Tests` — fetch two consecutive pages, assert no duplicate / no missing case IDs |
| Adapter row enrichment | LENS-LRMS WebApi | Unit + integration tests in `WebApi.Tests` |
| WebClient hook refetch behaviour | LENS-LRMS WebClient | Existing `useCaseQueue.test.ts` extended with sort + scope cases |
| **Phase 0.5 `sessionStorage` autosave round-trip** | **LENS-LRMS WebClient** | **New `useSessionView.test.ts` — write, simulate unmount/remount, assert state restores; assert sanitiser drops unknown ids; assert quota errors don't crash** |
| **Phase 0.5 ↔ Saved Views integration** | **LENS-LRMS WebClient** | **Integration test — apply Saved View, tweak filter, simulate reload, assert `(modified)` indicator is on** |

---

## 9. Edge Cases & Error Handling

### 9.1 No results returned

| Trigger | Behaviour |
|---|---|
| Fresh tenant with zero cases | Empty state §3.7 row 1 |
| Active scope + no non-Resolved cases | Empty state §3.7 row 2 (CTA to switch scope) |
| Search yields zero matches | Empty state §3.7 row 3 |
| Filter combination yields zero matches | Empty state §3.7 row 4 |

Empty-state CTAs are non-destructive — they suggest the next step but never auto-clear filters / scope.

### 9.2 Invalid search input

| Input | Behaviour |
|---|---|
| Empty / whitespace-only | Treat as no search; full slice returns |
| Length > 256 | Truncate to 256 chars before sending; log a debug event (this rarely happens organically) |
| Special characters (`%`, `_`, `*`, `?`, `"`, `'`) | Pass through; CMS Cosmos query parametrises so SQL-injection risk is structural-zero |
| Embedded null `\0` | Reject 400 before sending |
| Unicode normalisation | The WebClient does NOT NFC-normalize; the server does. Tested by the existing `Microsoft.LENS.Common.Hashing` normalization tests |

### 9.3 Conflicting filters

There are no logical conflicts the spec considers — every combination is valid (§5.6). However, **semantic** conflicts can yield zero results; the UX surfaces this through the empty state, not through inline validation:

| Example | UX |
|---|---|
| Workflow Stage = Triage AND Case Status = Resolved | Zero matches; empty state row 4 |
| Country = US AND Jurisdiction = State/Bayern | Zero matches; empty state row 4 |
| Due Date Range = Mar 1 – Mar 5 AND Created From = Apr 1 | Zero matches; empty state row 4 |

### 9.4 Sorting on unavailable or null fields

| Scenario | Behaviour |
|---|---|
| Sort by Assignee, case has no assignee | Empty-string assignee buckets to the bottom on `asc`, same position on `desc` (chevron flip handles direction) |
| Sort by Due Date, case has null due date | Null dates bucket to the bottom on `asc`, top on `desc` |
| Sort by Escalation Age, case has no active escalation | Null age buckets to the bottom on both directions (§4.3 final tiebreaker handles ordering within that bucket) |
| Sort by a column that's currently hidden | Allowed — sorting and visibility are orthogonal axes; the comparator runs regardless |
| Sort by a column the user later hides | The sort persists; nothing in the UI surfaces the column's sort indicator (because the column isn't rendered), but the order remains |
| Sort key column removed from the catalog in a later build | Sanitiser drops the orphaned key on load; reverts to default sort with a debug log |

### 9.5 Pagination edge cases

| Scenario | Behaviour |
|---|---|
| User changes filter mid-flight | AbortController cancels the in-flight request; new request fires |
| User clicks Next then Back rapidly | Each click cancels the previous fetch (existing pattern in [useCaseQueue.ts:101](C:/R/LENS-LRMS/sources/dev/WebClient/src/hooks/useCaseQueue.ts#L101)) |
| Continuation token becomes stale (partition split mid-session) | Server returns 410 Gone; client resets to page 1 silently + toast |
| `isTruncated === true` on every page | Banner persists across pages; CTA to narrow filters |
| Total count unknown (cross-partition) | Range display reads `Showing rows X–Y` without total; pagination Next button still works via `hasMorePages` |

### 9.6 Column edge cases

| Scenario | Behaviour |
|---|---|
| User hides every column | Locked columns (Case ID) cannot be hidden; the sanitiser enforces this. So "every column hidden" can't happen — Case ID minimum |
| User reorders a hidden column | The order persists; when later un-hidden the column lands in the saved order position |
| User attempts to reorder a locked column | Up/Down arrows are disabled; drag-drop on a locked column is rejected at the handler |
| New `hiddenByDefault` column ships in a later build | Sanitiser appends the id to the user's hide-list on first load (forward-compat migration); the user sees no change |
| New `hiddenByDefault: false` column ships in a later build | Sanitiser appends to the user's column-order list; visible immediately |
| Cell renderer throws (e.g., malformed identifier value) | Cell renders an em-dash + logs a debug event; the row remains rendered (one bad cell doesn't kill the row) |

### 9.7 Export edge cases

| Scenario | Behaviour |
|---|---|
| Export with zero rows on screen | Button is disabled; no-op |
| Export exceeds 10,000 rows | Cap + warning toast (§4.8) |
| Cell value contains comma, quote, CR, LF | CSV-escape per RFC 4180 — wrap in double-quotes, double up embedded quotes |
| Cell value contains non-ASCII | UTF-8 with BOM (§4.7); Excel opens correctly |
| User changes filter while pages are still being fetched for export | AbortController cancels the export; toast: `"Export cancelled."` |
| Server error mid-export | Toast: `"Export failed — try again."` |

### 9.8 Authorization edge cases

| Scenario | Behaviour |
|---|---|
| User loses `CaseReader` role mid-session | First 403 on a list refetch triggers re-auth; re-auth confirms missing role → redirect to "no access" page |
| Per-user rate limit hit (CMS `RateLimiting` config — 1000 reads / 60 s) | 429 with `Retry-After`; toast: `"Slow down — try again in {N}s."`; pagination buttons disabled for the window |
| User scopes to a specific tenant via the Tenant filter | Tenant filter values are populated from the distinct tenants present in the case set (no per-user ACL restriction). Per §1.3, case data is operational LENS data, not customer data — every `CaseReader` sees cases for every tenant. A user *role* (e.g., Triage Specialist) may have UX that focuses on a subset, but the data layer enforces no tenant ACL. |

### 9.9 Phase 0.5 autosave edge cases

| Scenario | Behaviour |
|---|---|
| `sessionStorage` is disabled (private browsing edge cases) | Hook degrades to in-memory only; no error surfaced to the user |
| `sessionStorage` quota exceeded (~5 MB origin-wide) | Hook logs a debug event; current state is not persisted; the existing snapshot survives; next reload restores the older snapshot |
| JSON parse error on read | Discard the bad snapshot, fall through to defaults, log `SessionViewRestore Phase = Failed` |
| `schemaVersion` mismatch with no transformer registered | Discard silently; no telemetry warning (build-bump noise) |
| Two tabs in same browser | Each tab has its own `sessionStorage` — independent autosaves by design (§5.7.7) |
| User clears browser data mid-session | Next read returns null; next reload starts from defaults |
| Reload during in-flight save (race) | The pending debounced write finishes before `beforeunload`; if not, the previous successful write is what the next mount restores |
| Reload while Customize view panel is open | The panel is not a captured field; on restore, the panel is closed (default state) and the user reopens if desired |
| Reload while Filter↔Column Sync Dialog is showing | The dialog is transient; on restore, no dialog is shown — the filter/column state captured is whatever was applied before the dialog appeared |

### 9.10 Phase 0.5 ↔ Saved Views edge cases

| Scenario | Behaviour |
|---|---|
| User applies Saved View "X"; "X" is deleted from another device; user reloads | Autosave's `appliedViewId = "X"` — restore hydrates the filter state from the snapshot; Saved Views menu refetches and finds "X" missing; trigger reverts to "Saved views" + toast: `"View 'X' is no longer available."` |
| User applies Saved View "X"; "X" is renamed to "Y" from another device; user reloads | Autosave's `appliedViewId = "X"` — restore; Saved Views menu refetches and finds the view at id "X" now named "Y"; trigger label reads "Y" (id-based lookup wins) |
| User applies Saved View "X"; WebClient bundle ships with a new filter catalog entry between Apply and reload | Autosave restores; the new filter id isn't in the snapshot → not active; user can add it via +Add filter |
| Catalog drift drops a filter id from BOTH the autosave snapshot AND the applied Saved View's snapshot identically | `viewMatchesCurrent` still returns true (both snapshots lost the same id); `(modified)` indicator stays off |
| User applies Saved View "X", then tweaks state, then deletes "X" via the menu | Autosave updates: `appliedViewId = null`; modified indicator drops; runtime state preserved (user's tweaks survive the delete) |

---

## 10. Open Questions & Future Considerations

### 10.1 Gaps and dependencies requiring clarification

**Q-1. Multi-value `CaseListFilters` schema upgrade — coordinated rollout.**
The §8.1 changes are additive but touch every downstream reader. Owner: LENS-Common. Question: do CMS / LRMS-WebApi roll together, or does CMS ship first and LRMS-WebApi adapt afterward? The spec assumes a coordinated release; a phased release means LRMS-WebApi must double-translate (multi-value from WebClient → single-value to CMS, accepting the loss of OR semantics within a field during the transition).

**Q-2. Sort directive — server-side support timeline.**
The spec assumes CMS gains a `sort` parameter (§6.3). Without it, the WebClient must fall back to client-side sort of each page in isolation, which produces visually correct ordering *within* a page but incorrect ordering *across* pages. The spec calls server-side sort a hard requirement; needs Eng Lead sign-off on CMS-side timing.

**Q-3. Total count for cross-partition queries.** **Resolved by §5.8.** The new aggregate endpoint (`GET /api/case/aggregate?metric=count`) returns total counts with the same filter shape as the list endpoint. The list endpoint's `totalCount` is computed when the filter has a date-range constraint (§5.4) and `null` otherwise; users who need a count for an unbounded filter query call the aggregate endpoint explicitly. No "TransparencyReporter" role required — cross-tenant aggregation is the operational norm per §1.3.

**Q-4. Per-user rate limiting alignment.**
CMS already has `RateLimitingOptions.ReadRequestsPerWindow = 1000 / 60s` ([CLAUDE.md L249](C:/R/LENS-CMS/CLAUDE.md#L249)). The LRMS-WebApi adapter adds its own surface; should it forward the throttle from CMS, or hold its own?

**Q-5. Search indexing.**
Server-side substring matching across `caseId`, identifier values, assignee, country, jurisdiction, reference numbers, and nature-of-crime tags is feasible against Cosmos's native indexing but at meaningful RU cost (every search is a cross-field scan). Open: do we add a separate search-optimised store (e.g., Azure Cognitive Search) for the search field specifically, or stay with the Cosmos-native path until search latency degrades?

**Q-6. Persistence boundary.**
The spec puts the active filter bag, primary sort, and tiebreakers in the new **session autosave** (Phase 0.5 — §5.7), with the page-level scope, column order, and column visibility ALSO captured there (and additionally as cross-tab user defaults in `localStorage`). Saved Views (separate spec) layers on top. Confirm the three-tier split is acceptable to the Saved Views spec author so the two specs compose cleanly and `appliedViewId` mediation is correctly modelled.

**Q-7. Phase 0.5 autosave debounce window.**
Spec proposes 200ms (§5.7.3). If telemetry shows users frequently lose the very-latest write to a reload (e.g., they reload within 200ms of changing a filter), tighten to 100ms. If `sessionStorage` write contention becomes a bottleneck (unlikely at <1 KB writes), raise to 500ms. Validate against real user telemetry within 30 days of Phase 0.5 launch.

**Q-8. Phase 0.5 surface boundary.**
Spec scopes autosave to Cases page and Attorney Dashboard. If a future surface (e.g., a per-tenant case list) is added, it gets its own `sessionStorage` key per the same pattern. Confirm no other list pages exist today that should be retrofitted at Phase 0.5 launch.

### 10.2 Assumptions made in the design

| # | Assumption | Risk if wrong |
|---|---|---|
| A-1 | LENS-LRMS WebClient is the canonical owner of the list view UX; LENS-LEPortal (legacy) is being retired and won't gain feature parity | Spec wastes effort on the wrong frontend |
| A-2 | **(Revised per §1.3.)** Case data is operational LENS metadata, not customer data. No multi-tenant isolation is enforced or required at the storage layer. The Cosmos partition key is chosen for query distribution + reporting cost (§5.4), not for security. | If a future change reclassifies case data as customer data, partition-key + tenant ACL must be redesigned — significant rework |
| A-3 | All filters are AND-combined; no OR-of-filters or filter groups needed in v1 | A future "any of these dimensions" requirement (e.g., Boolean filter trees) requires re-modeling |
| A-4 | Column widths are per-user, NOT shared across saved views | If Saved Views capture column widths, we double-persist |
| A-5 | The Active/All scope is a server-side filter, not a client-side post-filter | If we later move per-row workflow-state computation client-side (unlikely), the scope toggle needs re-implementation |
| A-6 | CSV export is sufficient for transparency reporting; no native Excel `.xlsx` export | If reports require formula-embedded cells, the export needs upgrade |
| A-7 | Mass export beyond 10,000 rows goes through a separate batch-export path (out of scope here) | Without a documented path, users will try to fetch the next page and re-export, hitting the cap repeatedly |
| A-8 | Search across identifier values respects the `Microsoft.LENS.Common.Hashing` normalisation rules so a hashed query matches a hashed stored value | If normalisation drifts between client and server, a search-by-email-substring will miss documents |
| A-9 | `sessionStorage` is available in every supported browser (Edge / Chrome / Firefox modern) | If a target environment disables it, Phase 0.5 silently degrades to in-memory only — acceptable per §9.9 |
| A-10 | The 5 MB `sessionStorage` quota is comfortably above the snapshot size (~1–5 KB typical) | Quota errors only realistic if other features in the LRMS bundle compete for the same quota; spec budgets <10 KB for the Phase 0.5 snapshot |

### 10.3 Future enhancements (deferred)

**F-1. Saved Views.** Companion spec — named, persistable, shareable view definitions over the same Filters / Sort / Columns / Scope state captured here. The CustomViewPanel's footer "Save as view…" button is the integration point; the Saved Views spec owns persistence, sharing, ACLs, subscription.

**F-2. Anomaly filter group.** Productise the §7.7 anomaly anchors as a dedicated `FilterGroup = "Anomalies"` with predicates evaluated server-side. Pre-built anomaly filters surface in the +Add filter menu under their own group.

**F-3. Per-column conditional formatting.** Allow the user to define lightweight visual rules ("highlight rows where Stale Escalation > 7 days in red"). Out of scope for this spec — requires a rules engine + UI for rule definition.

**F-4. Server-side search optimisation.** If RU cost on free-text search becomes prohibitive, introduce an Azure Cognitive Search index that mirrors a subset of case fields (case-id, identifier values, assignee, reference numbers) and route the `freeText` parameter to that path while filters continue to hit Cosmos directly.

**F-5. Cross-tenant transparency reporting role.** **Removed per §1.3.** No special role is required for cross-tenant aggregation; the `CaseReader` role already covers it, and the aggregate endpoint (§5.8, §6.6) is the supported path for transparency-style queries. The original framing assumed case data was customer data; §1.3 corrects that and removes the need for a tenant-bypass role.

**F-6. Live updates.** Today the list is fetched on demand. A future push-update channel (SignalR or similar) could refresh the list when an upstream event (case assignment, escalation status change) affects a row currently on screen. Out of scope here; adds significant complexity to the offline-after-refetch model.

**F-7. Column derivation library.** Promote the prototype's per-column comparators and serialisers into a shared `LENS-Common.CaseDerivations` library so CMS, LRMS-WebApi, and the WebClient all reference the same source of truth (§7.8). This is the path to eliminating drift between filtered-by-X and ordered-by-X cases.

**F-8. Advanced analytics integration.** Surface a "View in Analytics" affordance from the toolbar that hands the current filter+sort+column slice off to a downstream analytics tool (Power BI, internal dashboards). The hand-off encodes the slice as a query string the analytics tool consumes.

**F-9. Cross-tab Phase 0.5 sync.** If telemetry shows users complaining about independent per-tab state (rare per §5.7.7), a future enhancement could broadcast `sessionStorage` writes across same-origin tabs via `BroadcastChannel`. Not in scope at Phase 0.5 — the cross-tab independence is a *feature* by design.

---

## Appendix A — Anchored references

Every claim in this spec ties back to source. Anchor index:

| Anchor | Source | Purpose |
|---|---|---|
| `CaseListFilters` | [C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Models/CaseListFilters.cs](C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Models/CaseListFilters.cs) | Canonical server-side filter shape (today) |
| `CaseSummaryResponse` | [C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Responses/CaseSummaryResponse.cs](C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Responses/CaseSummaryResponse.cs) | Canonical row projection |
| `CaseLegalContext`, `AuthorityRole` | [C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Models/CaseLegalContext.cs](C:/R/LENS-Common/sources/dev/DataModels/Contracts/CMS/Models/CaseLegalContext.cs) | Country / jurisdiction / agency model |
| `CasesController.ListCases` | [C:/R/LENS-CMS/sources/dev/CMS/src/API/Controllers/CasesController.cs](C:/R/LENS-CMS/sources/dev/CMS/src/API/Controllers/CasesController.cs#L288) | Current ListCases endpoint |
| `QueryOptions` | [C:/R/LENS-CMS/sources/dev/CMS/src/DataAccess/Repositories/QueryOptions.cs](C:/R/LENS-CMS/sources/dev/CMS/src/DataAccess/Repositories/QueryOptions.cs) | Repository query options + partition strategy |
| `CaseQueryParametersValidator` | [C:/R/LENS-CMS/sources/dev/CMS/src/Common/Validation/CaseQueryParametersValidator.cs](C:/R/LENS-CMS/sources/dev/CMS/src/Common/Validation/CaseQueryParametersValidator.cs) | Server-side range validators |
| CMS `Pagination` config | [C:/R/LENS-CMS/CLAUDE.md L249](C:/R/LENS-CMS/CLAUDE.md) | Page size limits |
| `CaseQueueFilters` (WebClient) | [C:/R/LENS-LRMS/sources/dev/WebClient/src/features/case-queue/types/case-queue-filters.types.ts](C:/R/LENS-LRMS/sources/dev/WebClient/src/features/case-queue/types/case-queue-filters.types.ts) | Current frontend filter shape |
| `useCaseQueue` | [C:/R/LENS-LRMS/sources/dev/WebClient/src/hooks/useCaseQueue.ts](C:/R/LENS-LRMS/sources/dev/WebClient/src/hooks/useCaseQueue.ts) | Current frontend fetch hook + pagination plumbing |
| LRMS WebApi `CaseController` | [C:/R/LENS-LRMS/sources/dev/WebApi/src/API/Controllers/CaseController.cs](C:/R/LENS-LRMS/sources/dev/WebApi/src/API/Controllers/CaseController.cs) | Current detail endpoints; list endpoint to be added |
| LENS-Common architecture overview | [C:/R/LENS-Common/CLAUDE.md](C:/R/LENS-Common/CLAUDE.md) | Service boundaries (LRMS ↔ DCS ↔ DFS ↔ SMSv2) |
| Prototype | [c:/R/DARS_eEvidence/](c:/R/DARS_eEvidence) | Reference UX for every behaviour in §3 |
| Prototype filter catalog | [c:/R/DARS_eEvidence/src/components/case-queue/extraFilterCatalog.ts](c:/R/DARS_eEvidence/src/components/case-queue/extraFilterCatalog.ts) | Reference catalog shape |
| Prototype column catalog | [c:/R/DARS_eEvidence/src/components/case-queue/caseListColumns.ts](c:/R/DARS_eEvidence/src/components/case-queue/caseListColumns.ts) | Reference column catalog shape |
| Prototype CSV export | [c:/R/DARS_eEvidence/src/components/case-queue/caseListExport.ts](c:/R/DARS_eEvidence/src/components/case-queue/caseListExport.ts) | Reference export implementation |
| Prototype regression harness | [c:/R/DARS_eEvidence/scripts/verify-ui.mjs](c:/R/DARS_eEvidence/scripts/verify-ui.mjs) | 11-verifier suite covering every §3 behaviour |
| Microsoft Law Enforcement Requests Report | [microsoft.com/en-us/corporate-responsibility/law-enforcement-requests-report](https://www.microsoft.com/en-us/corporate-responsibility/law-enforcement-requests-report) | Public documentation of Microsoft's customer-first LE routing default — §1.3.1 |
| MLAS guidance on LENS case data classification | [LENS-ALL SharePoint](https://microsoft.sharepoint.com/teams/LENS-ALL/_layouts/15/viewer.aspx?sourcedoc={5d865415-5f3e-4d2e-909e-5aa7db9e7ceb}) | Microsoft-internal MLAS guidance on Microsoft-as-service-provider stance for LENS cases — anchors §1.3 |

---

## Appendix B — Glossary

| Term | Definition |
|---|---|
| RS | Response Specialist — primary persona working a personal queue of cases |
| TS | Triage Specialist — primary persona processing incoming intake |
| LENS | Lawful Electronic Notification Service (also: Legal Enforcement and National Security per LENS-CMS CLAUDE.md) |
| LRMS | Lawful Request Management System — the LENS portal user-facing surface |
| CMS | Case Management Service — the LENS persistence layer for cases (Cosmos-backed) |
| DCS | Data Collection Service — orchestrates per-DFS fulfillment requests |
| DFS | Data Fulfillment Service — service-specific data extraction (Exchange, OneDrive, etc.) |
| SMSv2 | Storage Management Service v2 — issues SAS tokens for case attachments |
| MISE v2 | Microsoft Identity Service Essentials v2 — service-to-service auth |
| EPOC | European Production Order Certificate — eEvidence framework |
| ETSI | European Telecommunications Standards Institute — owns the underlying conditions standard for production orders |
| IA / EA | Issuing Authority / Enforcing Authority — EU eEvidence procedural roles |
| ColumnId | The catalog key for a column (e.g., `"case-id"`, `"due-date"`) |
| `caseScope` | Page-level Active/All toggle; `Active = caseStage ≠ Resolved` |
| Synthesised column | A column that's hidden by default and only appears when its linked filter is added |
| Phase 0.5 autosave | `sessionStorage`-backed automatic capture of the in-flight view shape; survives reload + in-app navigation, dies with the tab; see §5.7 |
| `appliedViewId` | The Saved View id whose snapshot the user last applied; carried in the Phase 0.5 snapshot so the `(modified)` indicator restores correctly across reloads |
| Saved View | Named, server-persisted view (see Saved Views Phase 1 spec) |

---

**End of specification.**
