# Case List View Controls — Product Feature Specification

**Audience:** Engineering (LENS-LRMS WebClient + WebApi; LENS-CMS API + DataAccess; LENS-Common contracts) and Business Analysts (Response Specialists, Operations Leads, Program Managers, Transparency Reporting team).

**Scope:** This specification covers **real-time** shaping of the case list — Search, Filter, Sort, Column configuration. It does **not** cover Saved Views, view sharing, view persistence beyond a per-user session, or view export to external systems. Those concerns are addressed in the companion **Saved Views Specification** (separate document).

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

### 1.3 Outcome the spec drives toward

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

### 2.2 Why these capabilities are critical

**Transparency reporting (BR-2, BR-4, BR-7, BR-13).** Microsoft's biannual Law Enforcement Requests Report depends on auditable counts by request type, agency country, jurisdiction, and nature-of-crime. The current path is offline SQL against the Cosmos backing store; this spec brings those slices in-product so report writers iterate against the same data the operations team is working from.

**Weekly operational forecasting (BR-3, BR-5, BR-6, BR-10, BR-13).** Ops Leads run a weekly capacity forecast — case volume by request type × jurisdiction × workflow stage, projected against assignee headcount. They currently build the forecast in Excel from a Cosmos dump. With multi-key sort + flexible filtering + CSV export, the same slice ships from the UI in <30 seconds.

**Anomaly identification (BR-14).** Examples of anomalies the current UI can't express:
- Resolved cases where `delivery_status ≠ delivered_successfully` (mismatched resolution).
- Cases open >30 days with no workflow stage change (stuck triage).
- Cases where the agency country doesn't match the case country (`agencyCountryMatch === false` in `CaseLegalContext`) — already a flag in the data model, never surfaced.
- Cases where Recommend-Rejection has been the stage >7 days with no attorney action.

Without filter composition, anomaly hunting is a developer task. With it, it's a daily Ops responsibility.

### 2.3 Non-goals (in scope for the Saved Views spec)

- Saving a configured view as a named, reusable preset.
- Sharing a configured view with another user via URL or workspace.
- Persisting a configured view across sessions beyond per-user defaults.
- Subscribing to a saved view (e.g., email-on-change).
- Cross-tenant or cross-workspace view roaming.

The per-user **session-scoped** persistence of state (last scope, last filter set, last column order, last sort) is in scope here — that's a UX continuity expectation, not a saved-views feature.

---

## 3. User Experience (UX) Requirements

### 3.1 Page-level scope toggle (Active / All)

**Placement.** As the leading segment of the quick-filter tab row, left-justified, with a vertical divider separating it from the quick-filter tabs.

**Behaviour.**

- Two-option radiogroup, `role="radiogroup" aria-label="Case scope"`.
- Default: `Active` on every fresh load and after every session expiry. Selection persists per-user via the LRMS session-state mechanism (see §5.5).
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

### 3.8 Consistency patterns

These interaction patterns are shared across **Case Queue** (Cases page) and **Attorney Dashboard** (escalation-flavoured view) — both pages must implement the same chrome and behaviours described in §3.1–§3.7. The two pages differ in:

- The fixed set of quick-filter tabs.
- The default column subset (Attorney Dashboard surfaces Internal Escalation and Escalated To by default; Cases page does not).
- Persistence keys (separate `dars.attorneyDashboard.*` vs `dars.caseQueue.*` localStorage prefixes — see §5.5).

All other behaviours (scope toggle, search, filter chip semantics, sort, column show/hide, Customize view panel, Export list, Filter↔Column Sync Dialog) **must** be identical in both surfaces. Any divergence between the two is a regression and must be caught by the verifier suite.

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

- **Cosmos partition strategy**: cases are partitioned by `tenantId` ([LENS-CMS CLAUDE.md L217](C:/R/LENS-CMS/CLAUDE.md)). Filters that include a tenant scope (single-tenant queries) run single-partition — fast, RU-efficient. Cross-tenant queries (which transparency reporting requires) must be cross-partition and are capped at `pageSize` per query.
- **Query budget**: each call has an RU budget; if the cost would exceed the budget, Cosmos returns a partial page with `isTruncated = true`. The adapter relays the flag to the WebClient (see §3.6 / §4.5).
- **Total count**: the adapter computes `totalCount` only when the query is single-partition. For cross-partition queries, `totalCount = null`.

### 5.5 Persistence model (per-user, session-scoped)

The WebClient persists the following state per user via the existing LRMS session-state mechanism (today this is `localStorage` keyed by surface). **No server-side persistence is required for any of these — that's the Saved Views feature.**

| Key (Cases page) | Key (Attorney Dashboard) | Shape |
|---|---|---|
| `dars.caseQueue.caseScope` | `dars.attorneyDashboard.caseScope` | `"active" \| "all"` |
| `dars.caseQueue.columnOrder` | `dars.attorneyDashboard.columnOrder` | `ColumnId[]` |
| `dars.caseQueue.columnHidden` | `dars.attorneyDashboard.columnHidden` | `ColumnId[]` |
| `dars.caseQueue.columnWidths` | *(not yet shipped on AD)* | `Record<ColumnId, number>` |
| `dars.caseQueue.viewMode` | `dars.attorneyDashboard.viewMode` | `"cards" \| "list" \| "preview"` |

The active filter bag, primary sort, and tiebreakers are **NOT** persisted across sessions — that's intentional. Saved Views (separate spec) is the path for users to durably capture a configured filter+sort combination.

### 5.6 Filter combination constraints

- **All filters AND-combined** at the server query layer (see §4.2).
- **Multi-value filters OR-combined within the field**.
- **No exclusive-or constraints**: any combination of filters is legal. The UI never blocks a combination as "incompatible"; if a combination yields zero rows, the empty state messaging covers it.
- **Filter-fingerprint key**: the WebClient computes a stable fingerprint of the active filter bag ([useCaseQueue.ts:75](C:/R/LENS-LRMS/sources/dev/WebClient/src/hooks/useCaseQueue.ts#L75)). The hook refetches when the fingerprint changes, debounces when it doesn't.

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

The `AuthorityRole` enum (currently `IssuingAuthority`, `EnforcingAuthority`, `RequestingAgency`, `CooperatingAgency`, `OutsideCounsel`) must be extended with `ValidatingAuthority` and `CompetentAuthority` so the new agency-role filters have first-class enum values.

The `CaseLegalContext` interface must gain two derived accessors:

- `primaryValidatingAuthority?: Agency`
- `primaryCompetentAuthority?: Agency`

Each is the `agency` from the first `CaseAgencyRole` in `agencies[]` matching the corresponding role.

**Backward compatibility** — existing single-value properties stay valid (the spec uses `T[]? | null` in addition; readers that only check `T?` get the first value of the array).

### 8.2 LENS-CMS — required handler changes

[`ICaseHandler.ListCasesAsync`](C:/R/LENS-CMS/sources/dev/CMS/src/BusinessLogic/Interfaces/ICaseHandler.cs) (and its implementing repository) must accept:

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

### 8.4 Cross-service contract compatibility checklist

| Concern | Owned by | Validation |
|---|---|---|
| `CaseListFilters` shape additive | LENS-Common | Schema diff test in `Common.Tests/DTOs/CaseListFiltersTests.cs` |
| `CaseSummaryResponse` shape additive | LENS-Common | Schema diff test |
| `ListCases` handler accepts new params | LENS-CMS | Contract test in `API.Tests/Controllers/CasesControllerTests.cs` |
| Cosmos `ORDER BY` cursor stability | LENS-CMS | Integration test in `DataAccess.Tests` — fetch two consecutive pages, assert no duplicate / no missing case IDs |
| Adapter row enrichment | LENS-LRMS WebApi | Unit + integration tests in `WebApi.Tests` |
| WebClient hook refetch behaviour | LENS-LRMS WebClient | Existing `useCaseQueue.test.ts` extended with sort + scope cases |

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
| Tenant isolation: user has access to tenants A, B; queries return only A+B rows | Tenant filter values reflect only A+B; selecting a tenant the user doesn't have access to yields zero results, NOT an error |

---

## 10. Open Questions & Future Considerations

### 10.1 Gaps and dependencies requiring clarification

**Q-1. Multi-value `CaseListFilters` schema upgrade — coordinated rollout.**
The §8.1 changes are additive but touch every downstream reader. Owner: LENS-Common. Question: do CMS / LRMS-WebApi roll together, or does CMS ship first and LRMS-WebApi adapt afterward? The spec assumes a coordinated release; a phased release means LRMS-WebApi must double-translate (multi-value from WebClient → single-value to CMS, accepting the loss of OR semantics within a field during the transition).

**Q-2. Sort directive — server-side support timeline.**
The spec assumes CMS gains a `sort` parameter (§6.3). Without it, the WebClient must fall back to client-side sort of each page in isolation, which produces visually correct ordering *within* a page but incorrect ordering *across* pages. The spec calls server-side sort a hard requirement; needs Eng Lead sign-off on CMS-side timing.

**Q-3. Total count for cross-partition queries.**
Today's CMS `ListCases` does not return a total for cross-partition queries (§5.4). Transparency reporting needs a total. Open: do we compute a separate "count" endpoint that uses Cosmos COUNT(1) with the same filters, or accept that transparency reports run paginated until exhaustion?

**Q-4. Per-user rate limiting alignment.**
CMS already has `RateLimitingOptions.ReadRequestsPerWindow = 1000 / 60s` ([CLAUDE.md L249](C:/R/LENS-CMS/CLAUDE.md#L249)). The LRMS-WebApi adapter adds its own surface; should it forward the throttle from CMS, or hold its own?

**Q-5. Search indexing.**
Server-side substring matching across `caseId`, identifier values, assignee, country, jurisdiction, reference numbers, and nature-of-crime tags is feasible against Cosmos's native indexing but at meaningful RU cost (every search is a cross-field scan). Open: do we add a separate search-optimised store (e.g., Azure Cognitive Search) for the search field specifically, or stay with the Cosmos-native path until search latency degrades?

**Q-6. Persistence boundary.**
The spec puts the active filter bag, primary sort, and tiebreakers OUT of cross-session persistence (§5.5) and INTO Saved Views (separate spec). The page-level scope, column order, and column visibility ARE in cross-session persistence. Confirm the split is acceptable to the Saved Views spec author so the two specs align.

### 10.2 Assumptions made in the design

| # | Assumption | Risk if wrong |
|---|---|---|
| A-1 | LENS-LRMS WebClient is the canonical owner of the list view UX; LENS-LEPortal (legacy) is being retired and won't gain feature parity | Spec wastes effort on the wrong frontend |
| A-2 | Multi-tenant data isolation is enforced at the Cosmos partition-key boundary; no row-level access logic is needed in the list query | A row-level check would add `WHERE` clauses we haven't accounted for |
| A-3 | All filters are AND-combined; no OR-of-filters or filter groups needed in v1 | A future "any of these dimensions" requirement (e.g., Boolean filter trees) requires re-modeling |
| A-4 | Column widths are per-user, NOT shared across saved views | If Saved Views capture column widths, we double-persist |
| A-5 | The Active/All scope is a server-side filter, not a client-side post-filter | If we later move per-row workflow-state computation client-side (unlikely), the scope toggle needs re-implementation |
| A-6 | CSV export is sufficient for transparency reporting; no native Excel `.xlsx` export | If reports require formula-embedded cells, the export needs upgrade |
| A-7 | Mass export beyond 10,000 rows goes through a separate batch-export path (out of scope here) | Without a documented path, users will try to fetch the next page and re-export, hitting the cap repeatedly |
| A-8 | Search across identifier values respects the `Microsoft.LENS.Common.Hashing` normalisation rules so a hashed query matches a hashed stored value | If normalisation drifts between client and server, a search-by-email-substring will miss documents |

### 10.3 Future enhancements (deferred)

**F-1. Saved Views.** Companion spec — named, persistable, shareable view definitions over the same Filters / Sort / Columns / Scope state captured here. The CustomViewPanel's footer "Save as view…" button is the integration point; the Saved Views spec owns persistence, sharing, ACLs, subscription.

**F-2. Anomaly filter group.** Productise the §7.7 anomaly anchors as a dedicated `FilterGroup = "Anomalies"` with predicates evaluated server-side. Pre-built anomaly filters surface in the +Add filter menu under their own group.

**F-3. Per-column conditional formatting.** Allow the user to define lightweight visual rules ("highlight rows where Stale Escalation > 7 days in red"). Out of scope for this spec — requires a rules engine + UI for rule definition.

**F-4. Server-side search optimisation.** If RU cost on free-text search becomes prohibitive, introduce an Azure Cognitive Search index that mirrors a subset of case fields (case-id, identifier values, assignee, reference numbers) and route the `freeText` parameter to that path while filters continue to hit Cosmos directly.

**F-5. Cross-tenant transparency reporting role.** A dedicated `TransparencyReporter` role on CMS that bypasses the default tenant scoping and allows cross-tenant queries with a strict audit trail. Required for transparency reports that aggregate across enterprise tenants.

**F-6. Live updates.** Today the list is fetched on demand. A future push-update channel (SignalR or similar) could refresh the list when an upstream event (case assignment, escalation status change) affects a row currently on screen. Out of scope here; adds significant complexity to the offline-after-refetch model.

**F-7. Column derivation library.** Promote the prototype's per-column comparators and serialisers into a shared `LENS-Common.CaseDerivations` library so CMS, LRMS-WebApi, and the WebClient all reference the same source of truth (§7.8). This is the path to eliminating drift between filtered-by-X and ordered-by-X cases.

**F-8. Advanced analytics integration.** Surface a "View in Analytics" affordance from the toolbar that hands the current filter+sort+column slice off to a downstream analytics tool (Power BI, internal dashboards). The hand-off encodes the slice as a query string the analytics tool consumes.

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
| Prototype regression harness | [c:/R/DARS_eEvidence/scripts/verify-ui.mjs](c:/R/DARS_eEvidence/scripts/verify-ui.mjs) | 9-verifier suite covering every §3 behaviour |

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

---

**End of specification.**
