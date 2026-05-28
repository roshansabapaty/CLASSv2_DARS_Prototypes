# CMS Search, Filter & Views — Feature Specification

| Property | Value |
|---|---|
| **Owner** | CaseIQ / DARS Product |
| **Input Sources** | DARS Queue Management Workshop (Dale Ayers, David Large), LENS Case Management Workshop #1 (Shane Mulvey, Claire Mulvey, Jessalyn Halbritter, Tracy Ingle, Faisal Younas), CMS Design Docs, CMS Lookup Index Design |
| **Status** | Draft — Prototype UX decisions added 2026-04-10 |
| **Date** | 2026-03-30 |
| **Prototype** | `C:\R\Prototype_v2` — running at http://localhost:3005 |

---

## Table of Contents

- [Background](#background)
- [User Personas](#user-personas)
- [Current State Gaps](#current-state-gaps)
- [Feature Areas](#feature-areas)
  - [F1 — Identifier Search](#f1--identifier-search)
  - [F2 — Case List Views & Columns](#f2--case-list-views--columns)
  - [F3 — Filtering & Saved Views](#f3--filtering--saved-views)
  - [F4 — Related Cases per Identifier](#f4--related-cases-per-identifier)
  - [F5 — Automatic Identifier Cross-Check at Intake](#f5--automatic-identifier-cross-check-at-intake)
  - [F6 — Case List Actions (Pick, Release, Assign)](#f6--case-list-actions-pick-release-assign)
  - [F7 — View Density Modes (Table + Card)](#f7--view-density-modes-table--card)
  - [F8 — Multi-Case-Number Batch Search](#f8--multi-case-number-batch-search)
  - [F9 — Bulk Export](#f9--bulk-export)
  - [F10 — Default Landing Page & Homepage](#f10--default-landing-page--homepage)
- [Search, Filter & View Scenarios by Persona](#search-filter--view-scenarios-by-persona)
- [CMS Backend Requirements](#cms-backend-requirements)
- [Non-Goals](#non-goals)
- [Open Questions](#open-questions)
- [Prototype UX Decisions](#prototype-ux-decisions)

---

## Background

LENS response specialists currently work cases through a CRM (Dynamics) and track metrics in Power BI. Workshop observations surfaced three categories of unmet need:

1. **Identifier search is manual and slow** — finding all cases for a given account requires separate searches per identifier; there is no bulk check and identifier searches take 15–30 seconds.
2. **Case list views are missing critical columns** — jurisdiction, due date, and assignee are not reliably surfaced; specialists build workaround custom views.
3. **No related-case signal** — when a new case arrives with 20 identifiers, there is no automated signal telling the specialist which of those identifiers already have active legal demands.

This spec formalises the search and view capabilities CMS must support so that DARS can build these experiences on top of the CMS API and lookup infrastructure.

---

## User Personas

| Persona | Role | Primary Search/View Needs |
|---|---|---|
| **Response Specialist** (Jessalyn) | US Operations | My assigned cases; FIFO by due date; enterprise vs. general split; release case back to queue |
| **Regional POC Specialist** (Claire) | India/DSA/eEvidence | India queue monitoring 3–4× daily; original received date; 72-hr SLA urgency signal |
| **Operational Excellence Lead** (Shane) | Metrics & Resource Planning | Cross-queue counts by jurisdiction; identifier type filtering for training; worked-by tracking |
| **Compliance / Litigation Coordinator** (Tracy) | Transparency reporting, litigation support | Queue-agnostic search; bulk identifier checking; domain-scoped searches; historical 6-month queries; private views shared with attorneys |

---

## Current State Gaps

The following capabilities are **not supported** by the current CMS API and lookup index design, and are required by one or more personas:

| Gap | Persona | Severity |
|---|---|---|
| Filter cases by `accountType` (Enterprise / Consumer / Both) | Jessalyn, Shane | High |
| Filter cases by `identifierType` (Email, UPN, Skype, etc.) | Shane, Tracy | High |
| Filter cases by `DFT.Service` (Exchange,Teams,Azure, etc.) | Shane, Ian | High |
| Filter cases by `Case.natureOfCrime` (DSA Harm or Threat to Life) | All | High |
| Filter cases by `Case.RequestType` | All | High |
| Filter cases by `Case.Status` | All | High |
| Filter cases by `Case.RequestSubType` | Ian | High |
| Filter cases by `Case.AssignedTo` == UserLogin | All | High | 
| Filter cases by `Priority` (Emergency, Urgent) | All | High | 
| Filter cases by `Case.Request` | All | High |
| Search by identifier value with exact match returning related case count | All | High |
| Search by identifier domain (e.g., all `@contoso.com` accounts) | Tracy | High |
| Multi-identifier batch search (N identifiers → matching cases) | Tracy | Medium |
| Automatic cross-check of all identifiers on a new case at intake | Tracy | High |
| Jurisdiction as a filterable column in case list | All | High |
| Due date column reliably populated and sortable | All | High |
| Original received date as a distinct sortable column | Claire, Shane | Medium |
| Queue-agnostic "all requests" search across all stages | Tracy | Medium |
| Related case count badge per identifier | All | Medium |
| Number of services requested per case | All | Medium |
| Number of identifiers requested per case | All | Medium |

| Full-text search across case fields (`$search`) | Tracy | Low (post-MVP) |

---

## Feature Areas

---

### F1 — Identifier Search

#### F1.1 Search by Exact Identifier Value

**As a** response specialist or compliance coordinator,
**I want to** enter an identifier value (email address, UPN, phone number, Skype ID, PUID, Xbox Gamertag, IP address) and see all cases that contain a DFT with that identifier,
**So that** I can determine whether an active or historical legal demand already exists for this account.

**Acceptance criteria:**

- Input: exact identifier string (any type)
- System hashes the input value (SHA-256, lowercase normalized) and queries the `identifier` lookup in `dft-lookups`
- Returns: list of matching DFT records with `caseId`, `lensTaskId`, `service`, `fulfillmentStatus`, `identifierType`, `accountType`, and case summary fields (priority, stage, due date, assignee)
- Response time: ≤ 3 seconds for up to 50 results
- Results indicate whether each associated case and if the DFT is active or closed or cancelled.
- A **related case count** badge is shown: "This identifier appears in N case(s)"

**CMS backend requirement:** `GET /identifiers/{hashedValue}/cases` or equivalent query on `dft-lookups`. See [CMS-B1](#cms-b1--identifier-lookup-endpoint).

---

#### F1.2 Filter by Identifier Type

**As a** response specialist or trainer,
**I want to** filter a list of identifiers or DFTs by identifier type (Email, UPN, PhoneNumber, PUID, SkypeID, XboxGamertag, IPAddress, TenantID),
**So that** I can build training scenarios ("show every request where identifier type is Skype ID") and track volume by identifier category.

**Acceptance criteria:**

- Identifier type is available as a filter on both the identifier search results view and the DFT list view within a case
- Multi-select supported (e.g., Email OR UPN)
- Available identifier type values match the `identifierType` enum in CMS: `Email`, `UPN`, `PhoneNumber`, `PUID`, `SkypeID`, `XboxGamertag`, `IPAddress`, `TenantID`

**CMS backend requirement:** `identifierType` stored in the `identifier` lookup document and queryable as a secondary predicate. See [CMS-B2](#cms-b2--identifiertype-in-identifier-lookup).

---

#### F1.3 Filter by Account Type (Enterprise / Consumer / Both)

**As a** response specialist,
**I want to** filter cases by the account type of their identifiers (Enterprise, Consumer, Both),
**So that** I can separate my enterprise escalation queue from general consumer cases without relying on manual title tags like "[enterprise]".

**Acceptance criteria:**

- `accountType` (Enterprise / Consumer / Both) is available as a filter in the case list view
- Filter maps to the `accountType` field on `TargetIdentifier`, sourced from CLASS lookup results
- Cases with multiple DFTs having different account types appear under each applicable filter value (i.e., a case with one Enterprise DFT and one Consumer DFT matches both filters)
- Default case list view shows `accountType` as an optional column

**CMS backend requirement:** A new `accounttype` case-level lookup index or promotion of `accountType` into `CaseSummary`. See [CMS-B3](#cms-b3--accounttype-lookup-index).

---

#### F1.4 Domain Search (Identifier Value Contains Domain)

**As a** compliance coordinator,
**I want to** search for all cases containing identifiers that belong to a specific domain (e.g., `@contoso.com`, `@nypd.gov`),
**So that** I can identify all active legal demands related to a specific organisation or law enforcement agency.

**Acceptance criteria:**

- Input: domain string (e.g., `contoso.com`) — no hash, plaintext suffix match
- System returns all DFT records where `targetIdentifierValue` ends with `@{domain}` (case-insensitive)
- Results grouped by case, showing identifier count per case for that domain
- Performance target: ≤ 10 seconds for results (acknowledged as a heavier query)
- Clearly labelled as a "domain search" distinct from exact-match identifier search
- **Not** a prefix/wildcard on the hashed partition key — requires a separate domain-index or ADX-backed query path

**CMS backend requirement:** A separate `identifierdomain` lookup index or ADX/analytics export. See [CMS-B4](#cms-b4--domain-search-index).

---

#### F1.5 Multi-Identifier Batch Search

**As a** compliance coordinator,
**I want to** paste or upload a list of identifier values and see all cases associated with any of them,
**So that** I can conduct litigation support research across a set of accounts without running N separate searches.

**Acceptance criteria:**

- Input: up to 50 identifier values (newline or comma delimited)
- System hashes each value and queries the `identifier` lookup in parallel
- Results deduplicated by case: if two identifiers from the input list appear in the same case, the case appears once with both identifiers listed
- Export to CSV available
- Response time: ≤ 15 seconds for 50 identifiers

**CMS backend requirement:** Batch query endpoint on `dft-lookups`. See [CMS-B5](#cms-b5--batch-identifier-lookup-endpoint).

---

### F2 — Case List Views & Columns

#### F2.1 Mandatory Columns in Default Case List

The default case list view must surface the following columns based on workshop feedback. Columns marked **required** must be present in the default view with no configuration needed. 

Columns that aren't marked **required** should be available as an optional column they can add to their views. Adding these optional columns should save their configuration so that the user does not have to add it every time.

| Column | Field | Required | Sortable | Notes |
|---|---|---|---|---|
| Case / Request number | `caseId` | Yes | No | LNS-{epoch}-{suffix} format |
| Title | `title` | Yes | No | |
| Due date | `caseDueDate` | Yes | Yes | Sort ascending (most urgent first) by default; show "Overdue" badge if past today |
| Original received date | `createdAt` | Yes | Yes | When LE submitted the request |
| Jurisdiction | `jurisdiction` | Yes | Yes | Federal / State / Local / International |
| Priority | `priority` | Yes | Yes | Emergency → Urgent → Standard |
| Stage | `workflowStage` | Yes | Yes | Triage / Fulfillment / etc. |
| Assignee | `assigneeId` (resolved to name) | Yes | Yes | |
| Queue | derived from `workflowStage` | Yes | No | Human-readable queue name |
| Identifier count | `identifierCount` | Yes | Yes | Format: "4 (+1)" = 4 original + 1 supplemental. Source: Dale (W1): "4 brackets, one, which would mean 4 identifiers from them and one that I've created" |
| Deadline type | `deadlineType` | Yes | Yes | SLA / Issuing Authority Imposed / Agency Requested. Source: Dale (W1): "is that our SLA or have the courts imposed a deadline?" |
| Financial penalty | `hasFinancialPenalty` | Yes | No | Boolean flag with warning icon. Source: Dale (W1): "are there fines attached to that if we don't do it?" |
| Agency | `agencyName` | Yes | Yes | Requesting LE agency. Source: Dale (W1): "the agency would be great to be able to see" |
| Current blockers | `currentBlockers` | Optional | No | What is this case waiting on (e.g., "Awaiting Mojang data"). Source: Dale (W1): "what that request is waiting on" |
| Services | `services` | Optional | No | Render as compact icons (Outlook, Teams, Xbox, Azure, etc.). Source: Dale (W1): "the Skype symbol or the Teams symbol or the Xbox symbol" |
| Category | `category` | Optional | Yes | Case category. Source: Dale (W1) |
| CHI score | `chi` | Optional | Yes | Case Health Index 1-5. Source: CaseIQ CHI spec |
| Complexity tier | `complexityTier` | Optional | Yes | Quick / Light / Medium / Heavy / Complex |
| Account type | `accountType` | Optional | Yes | Enterprise / Consumer / Both — new field |
| Request type | `requestType` | Optional | Yes | |
| Country | `country` | Optional | Yes | |
| Entered queue date | `stageEnteredAt` | Optional | Yes | When case moved into current stage |
| Created date | `caseCreatedAt` | Optional | Yes | When case was created in CMS (may differ from `createdAt` LE submission date). Source: Dale (W1): "Microsoft received this one on the 19th, but we didn't create the request until today" |
| Worked by | `workedBy` | Optional | Yes | Custom field: who picked/is working on this case. Distinct from `assigneeId` which carries over from triage. Source: Shane (W2): "the worked by will update to their name... that's when a person will get the credit" |

**Note on due date defaults:** Workshop confirmed that outside the US and Brazil, the requested due date is rarely populated by the requesting agency. The system must apply a jurisdiction-based SLA default when `caseDueDate` is null:

| Jurisdiction | Default SLA |
|---|---|
| India | 72 hours from `createdAt` |
| EU / UK | 10 days from `createdAt` |
| US / Brazil | Field usually populated; fall back to 14 days |
| Rest of World | 14 days from `createdAt` |

This calculated due date should be stored on the case or computed and surfaced as a `effectiveDueDate` field so it can be sorted and filtered without requiring the UI to apply the logic.

---

#### F2.2 Overdue Badge

Cases where `effectiveDueDate` < today must display a visible "Overdue" indicator in the list row. This is distinct from the Emergency priority flag. A case can be Standard priority and still be overdue.

---

#### F2.3 Queue Count Display

Managers and specialists check the row count of their queue view as an operational signal (confirmed: Jessalyn checks 1–2× daily, Claire 3–4× daily). The list view must:

- Display a total record count for the current filtered view ("59 cases")
- Update the count when filters change without requiring a full page reload
- Support a "cases available to work on" view (unassigned, active, non-terminal) as a first-class named view

---

### F3 — Filtering & Saved Views

#### F3.1 Filter Panel — Supported Dimensions

The following filters must be available in DARS:

| Filter | Type | Values |
|---|---|---|
| Country | Multi-select with typeahead | ISO 3166-1 alpha-2 codes and country names; also supports region groupings (US, EU, EEA, APAC, LATAM, ROW) |
| Jurisdiction level | Dependent multi-select | Populated from `getJurisdictionLevels()` after country selection; hidden (shows all) if no country selected |
| Agency type | Multi-select | LawEnforcement, IntelligenceAgency, RegulatoryBody, Court, Prosecutor, MilitaryLawEnforcement, InternationalBody, Other |
| Agency name | Typeahead / Multi-select | Searches agency registry by name, short name, and aliases |
| Authority role | Multi-select | IssuingAuthority, EnforcingAuthority, RequestingAgency, CooperatingAgency, OutsideCounsel |
| Cross-border flag | Boolean toggle | Shows only cases where `legalContext.crossBorderFlag === true` |
| Priority | Multi-select | Emergency, Urgent, Standard |
| Stage | Multi-select | Triage, Fulfillment, Closed, etc. |
| Account type | Multi-select | Enterprise, Consumer, Both |
| Identifier type | Multi-select | Email, UPN, PhoneNumber, PUID, SkypeID, XboxGamertag, IPAddress, TenantID |
| Request type | Multi-select | CourtOrder, SearchWarrant, SubpoenaSummons, Preservation, NSL, LawfulIntercept, EmergencyLetter, etc. |
| Assignee | Typeahead / Multi-select | Resolved display names |
| Due date | Date range or bucket | Overdue / Due today / Due this week / Due later / No due date |
| Original received date | Date range | Calendar picker |
| Case status | Multi-select | Open, Draft, InReview, Closed |

**Country → Jurisdiction filter behavior:**

- The jurisdiction level filter is **dependent** on the country filter. When one or more countries are selected, the jurisdiction dropdown shows only valid levels for those countries (union of all selected countries' levels).
- When no country is selected, the jurisdiction filter shows all possible levels across all countries, labeled with their country scope (e.g., "Federal (US/AU/CA)", "Central (IN)").
- Region groupings are available as shorthand: selecting "EU" auto-selects all 27 EU member state country codes.
- Saved views persist both country and jurisdiction selections together (they are stored as a `CountryJurisdictionFilter` pair, not as independent values).

**Agency filter behavior:**

- The agency name filter uses typeahead search against the agency registry (`name`, `shortName`, `aliases`).
- Agency type filter is independent of country — allows filtering cases by what type of authority issued or enforced the demand (e.g., "show me all cases from Courts" or "show me all Intelligence Agency requests").
- Authority role filter narrows results to cases where a specific role type is populated (e.g., "show cases that have an OutsideCounsel listed").
- **Cross-border flag** is a single toggle — useful for leads who want to quickly review all flagged cases for additional review.

---

#### F3.2 Saved Views

**As a** specialist or manager,
**I want to** save a combination of filters as a named view (e.g., "India 72hr", "Enterprise Escalations", "Federal Overdue"),
**So that** I can switch between operational contexts without reconfiguring filters each session.

**Acceptance criteria:**

- Views can be saved as personal (visible only to creator) or shared (visible to a named group or all team members)
- Personal views display a distinct icon in the view list (workshop: "person icon" vs. system default)
- Shared views are read-only for non-owners; owner can edit or delete
- System provides at least these default views with no configuration required:
  - "My Cases" — assigned to current user, active stages
  - "Cases Available to Work On" — unassigned, non-terminal, active
  - "All Active Cases" — cross-stage, non-terminal
  - "Overdue" — `effectiveDueDate` < today, non-terminal

---

#### F3.3 Queue-Agnostic Search ("All Requests")

**As a** compliance coordinator,
**I want to** search across all cases regardless of which stage or queue they are in,
**So that** I can find a specific case by request number, identifier, or other attribute without knowing its current routing state.

**Acceptance criteria:**

- "All Requests" is a named view / search mode accessible from the main navigation
- Returns cases in any stage including Triage, Fulfillment, Review, and Closed
- Searchable by: `caseId` (LNS number), `leReferenceNumber`, `title` keyword, and identifier value
- Response time: ≤ 5 seconds

---

### F4 — Related Cases per Identifier

#### F4.1 Related Case Count on Identifier

**As a** response specialist,
**I want to** see, alongside each identifier on a case, how many other active cases include that same identifier,
**So that** I can immediately identify potential duplicates or patterns without running a separate search.

**Acceptance criteria:**

- On the case detail / DFT list view, each identifier row shows a "Related cases: N" count
- Clicking the count opens a panel listing the related cases (caseId, stage, priority, assignee, due date)
- Count is 0 for identifiers that appear only in the current case
- Related cases count includes both active and recently closed cases (within last 90 days)
- Count is computed from the `identifier` lookup in `dft-lookups` (same hash partition)

**CMS backend requirement:** `GET /identifiers/{hashedValue}/cases` with count and list. See [CMS-B1](#cms-b1--identifier-lookup-endpoint).

---

#### F4.2 Related Cases Summary on Case Header

**As a** response specialist,
**I want to** see a summary banner on a case when any of its identifiers appear in other active cases,
**So that** I am proactively alerted to potential duplicate handling without needing to check each identifier.

**Acceptance criteria:**

- If one or more DFTs on the case have identifiers that also appear in other active cases, a banner is shown: "N identifier(s) on this case appear in M other active case(s)"
- Banner links to the full related cases panel
- Banner is not shown if all identifiers are unique to this case
- Must not block case workflow — informational only

---

### F5 — Automatic Identifier Cross-Check at Intake

**User quote (Tracy, 00:57:43):**
*"I would love if when a request comes in, every single account on that request is automatically checked for any other legal demand that has come in for that account and provides a set of information."*

#### F5.1 Intake Cross-Check

**As a** triage specialist,
**I want** the system to automatically check every identifier on a newly received case against all existing active cases at the point the case enters triage,
**So that** I do not need to manually search each identifier and I have full context before beginning work.

**Acceptance criteria:**

- Triggered: when a case transitions into Triage stage (case created or moved)
- For each DFT identifier on the case, system queries the `identifier` lookup
- Results attached to the case as a system-generated `CaseEvent` of type `IntakeCrossCheckCompleted`
- Event body contains: list of identifiers checked, list of matching caseIds per identifier, total related case count
- Results surfaced in DARS as a notification / intake summary panel on the case
- If no related cases found: no banner shown (silent)
- If related cases found: banner shown per F4.2
- Cross-check must complete within 10 seconds of case entering Triage; if slower, results are delivered asynchronously and the specialist is notified when ready

**CMS backend requirement:** A Change Feed trigger or a `POST /cases/{caseId}/intake-check` endpoint that runs bulk identifier lookups and writes results as a CaseEvent. See [CMS-B6](#cms-b6--intake-cross-check-operation).

---

### F6 — Case List Actions (Pick, Release, Assign)

Workshop participants from both sessions described actions they take directly from the case list — not just viewing, but claiming and releasing work. These actions are currently restricted to specific CRM views, causing friction.

#### F6.1 Pick (Claim a Case)

**As a** response specialist, **I want to** select one or more cases from the available list and "pick" them — assigning them to myself and marking them as being worked on — **so that** other specialists know I've claimed them and they won't duplicate my work.

**Acceptance criteria:**
- Pick is available from ANY case list view (not restricted to a specific queue view)
- Pick updates both `assigneeId` and `workedBy` to the current user
- Pick is available as single-select and multi-select (batch pick)
- Picked cases move to "My Cases" view and remain in the shared pool (visible but marked as claimed)
- Source: David (W1): "I would just pick the request... the worked by field will be mine"

#### F6.2 Release (Return Case to Pool)

**As a** response specialist, **I want to** release one or more cases I've picked back to the shared pool — **so that** other specialists can pick them up when my priorities change mid-week.

**Acceptance criteria:**
- Release clears `workedBy` and resets the case to "available to work on" status
- Release is available from ANY case list view — not just Queue Items (current CRM limitation)
- Release is available as single-select and multi-select (batch release)
- Released cases immediately appear in "Cases Available to Work On" views for other specialists
- Source: Jessalyn (W2): "if I clicked here I couldn't release this request from this view" — this restriction must NOT carry over to CaseIQ
- Source: David (W1): "there is a button at the top called release... it releases from when you've picked it back to the queue"
- Source: Dale (W1): "you can't do that from all the views though. So you've got to be in the queue view"

#### F6.3 Route (Transfer to Another Specialist)

**As a** specialist, **I want to** route a case to a specific colleague — **so that** they see it in their working view and can continue where I left off.

**Acceptance criteria:**
- Route updates `workedBy` to the target specialist (clears the previous)
- The case stays in its current fulfillment pool (does NOT move to a personal/hidden queue)
- Source: Shane (W2): "I'd route it to Jessalyn. So when she goes in, she'd see it... but it will stay in the same queue"
- **Critical design decision:** CaseIQ must NOT have hidden personal queues. Routing to a person is a filter change (`workedBy = person`), not a queue move. Source: Tracy (W2): "Personal queues are the bane of existence"

---

### F7 — View Density Modes (Table + Card)

Workshop 1 participants (Dale, David) explicitly described needing two density modes based on the number of cases being viewed.

#### F7.1 Compact Table Mode (Default for Large Lists)

**As a** response specialist browsing a fulfillment pool with 50+ cases, **I want** a compact, one-row-per-case table layout — **so that** I can scan the maximum number of cases on screen and quickly assess my workload.

**Acceptance criteria:**
- One row per case, minimal vertical space
- All configured columns visible (horizontal scroll if needed, with sticky first column)
- Default for views with >10 cases
- Source: Dale (W1): "Having it in a compact one-liner like this is definitely helpful when there's volume"

#### F7.2 Card / Tile Mode (For Personal Queue)

**As a** response specialist viewing my 5-7 active cases, **I want** a card/tile layout showing more detail per case — **so that** I can see key information (identifiers, services, blockers, deadline) without clicking into each case.

**Acceptance criteria:**
- Card layout with 6-7 cards visible on screen
- Each card shows: case number, title, CHI badge, due date, identifier count, services icons, current blockers, assignee
- Default for "My Cases" view when count ≤ 10
- User can toggle between table and card at any time
- Source: Dale (W1): "I'd probably pick [card view] for this here because I know I could probably fit about six or seven of them"

---

### F8 — Multi-Case-Number Batch Search

Distinct from F1.5 (multi-identifier batch search). Dale receives lists of specific LNS case numbers from weekly briefings and needs to find all of them at once.

**As a** response specialist, **I want to** paste a list of LNS case numbers and see all matching cases in a single result view — **so that** I can quickly locate and pick cases assigned to me in the weekly briefing without searching one at a time.

**Acceptance criteria:**
- Input: up to 50 LNS/case numbers (newline or comma delimited)
- System queries by `caseId` for each
- Results displayed as a standard case list (supports pick, release, and all list actions)
- Cases not found are listed separately: "3 of 12 case numbers not found"
- Response time: ≤ 5 seconds for 50 case numbers
- Source: Dale (W1): "searching multiple requests by their LNS number or whatever it ends up being in DARS, that will be something that's useful"
- Source: Dale (W1) showed a screenshot of weekly briefing with specific LNS numbers listed for his team

---

### F9 — Bulk Export

Transparency and regulatory reporting depends entirely on exporting case data from views. This is not a nice-to-have; it's her core reporting workflow.

#### F9.1 CSV Export from Any View

**As a** compliance coordinator, **I want to** export the current filtered case list to CSV — **so that** I can produce transparency reports, litigation research, and regulatory filings.

**Acceptance criteria:**
- Export button available on every case list view
- Exports all columns currently visible in the view
- Supports result sets up to 100,000 rows
- Export includes: all standard columns + any custom columns the user has configured
- Response time: acknowledge export request immediately; deliver file within 60 seconds for up to 100K rows (async with notification if slower)
- Source: Tracy (W2): "I do all of my reporting out of views. I don't use the Power BI at all"
- Source: Tracy (W2): "could be up to 100,000 lines"

#### F9.2 Historical Date Range Query

**As a** compliance coordinator, **I want to** query all cases received within a date range (e.g., last 6 months) — **so that** I can produce transparency reports covering specific reporting periods.

**Acceptance criteria:**
- Date range filter on `createdAt` (original received date) supports ranges up to 12 months
- Combined with other filters (country, request type, jurisdiction) for targeted exports
- Source: Tracy (W2): "trying to search for all requests received within the last six months"

---

### F10 — Default Landing Page & Homepage

Both workshops described a "home" experience — what the specialist sees when they first open DARS.

**As a** response specialist, **I want** DARS to land on my active cases when I open it — **so that** I immediately see what I'm working on without navigating through menus.

**Acceptance criteria:**
- Default landing page shows "My Cases" (cases where `workedBy` = current user, active stages)
- If user has a Focus Profile (Phase 4), landing page shows "My Focus This Week" with grouped assignment areas
- If user has no active cases, landing page shows "Cases Available to Work On" for their qualified groups
- Landing page is persona-aware: Triage Specialist sees triage cases; Response Specialist sees fulfillment cases; Manager sees LENS Health Dashboard
- Source: Dale (W1): "here, where I've actually got my web browser home button. So this is my active requests."
- Source: Jessalyn (W2): "I go to queue items... cases I'm working on and then the USJT fulfillment"

---

## Search, Filter & View Scenarios by Persona

The following table catalogs every distinct search, filter, and view scenario described across both workshops, mapped to the feature area that addresses it.

### Response Specialist Scenarios (Dale, David, Jessalyn)

| # | Scenario | Who | Workshop | Feature | Status |
|---|----------|-----|----------|---------|--------|
| RS-01 | Land on "My Active Cases" as homepage | Dale, Jessalyn | W1, W2 | F10 | New |
| RS-02 | See identifier count (4 original + 1 supplemental) in list | Dale | W1 | F2.1 | New column added |
| RS-03 | See deadline type (SLA vs. issuing authority imposed) in list | Dale | W1 | F2.1 | New column added |
| RS-04 | See financial penalty flag in list | Dale | W1 | F2.1 | New column added |
| RS-05 | See requesting agency in list | Dale | W1 | F2.1 | New column added |
| RS-06 | See current blockers in list | Dale | W1 | F2.1 | New column added |
| RS-07 | See services as icons in list | Dale, David | W1 | F2.1 | New column added |
| RS-08 | Filter by title "contains" keyword (e.g., "fed", "CE") | Dale, David | W1, W2 | F3.1 | Covered (title keyword filter) |
| RS-09 | Search multiple LNS numbers from weekly briefing list | Dale | W1 | F8 | New |
| RS-10 | Search identifier to check for duplicates | Dale | W1 | F1.1, F4.1 | Covered |
| RS-11 | Search identifier to find preservation requests | Dale, Jessalyn | W1, W2 | F1.1, F4.1 | Covered |
| RS-12 | Search identifier to detect same-agency resubmission | Dale | W1 | F1.1, F4.2 | Covered |
| RS-13 | See which cases an identifier appears in (without click-through) | Dale, Shane | W1, W2 | F1.1, F4.1 | Covered (inline case list) |
| RS-14 | India bomb threat: same identifier from 10+ agencies, detect data reuse | Dale, Claire | W1, W2 | F4.2, F5.1 | Covered (related case banner) |
| RS-15 | Pick cases from the oldest end of the list in small batches | David, Jessalyn | W1, W2 | F6.1 | New |
| RS-16 | Release cases back to pool when priorities change | David, Jessalyn, Dale | W1, W2 | F6.2 | New |
| RS-17 | Release must work from ANY view (not just Queue Items) | Jessalyn, Dale | W1, W2 | F6.2 | New (explicit requirement) |
| RS-18 | Compact table view for scanning 50+ case lists | Dale, David | W1 | F7.1 | New |
| RS-19 | Card view for personal queue of 5-7 cases | Dale, David | W1 | F7.2 | New |
| RS-20 | Sort by original received date (FIFO) | Jessalyn | W2 | F2.1 | Covered |
| RS-21 | Sort by requested due date (most urgent first) | Jessalyn, Dale | W1, W2 | F2.1 | Covered |
| RS-22 | View enterprise cases separately from general cases | Jessalyn | W2 | F1.3 | Covered |
| RS-23 | See title-line shorthands replaced by structured fields | Dale, Jessalyn | W1, W2 | F2.1 | Addressed (structured columns replace title parsing) |
| RS-24 | Route case to another specialist (case stays in same pool) | Shane | W2 | F6.3 | New |
| RS-25 | Check enterprise escalation criteria before picking | Jessalyn | W2 | F1.3, F2.1 | Covered (account type filter + enterprise fields) |

### Regional POC Specialist Scenarios (Claire)

| # | Scenario | Who | Workshop | Feature | Status |
|---|----------|-----|----------|---------|--------|
| CL-01 | Check India queue count 3x/day (morning, lunch, end of day) | Claire | W2 | F2.3 | Covered |
| CL-02 | Watch original received dates to calculate 72-hr SLA countdown | Claire | W2 | F2.1, CMS-B7 | Covered |
| CL-03 | Estimate IPH fulfillment team capacity (2-3 people) | Claire | W2 | Out of scope (capacity planning = Phase 6) | Noted |
| CL-04 | Contact IPH directly when surge comes in | Claire | W2 | Out of scope (communication = external) | Noted |
| CL-05 | Search identifier for India bomb threats (same email in 20+ cases) | Claire | W2 | F1.1, F4.1 | Covered |
| CL-06 | Pull date/time and LNS to compare submission timing | Claire | W2 | F1.1, F4.1 | Covered |

### Operational Excellence Lead Scenarios (Shane)

| # | Scenario | Who | Workshop | Feature | Status |
|---|----------|-----|----------|---------|--------|
| SH-01 | Cross-queue counts by jurisdiction (federal, state, enterprise, Azure) | Shane | W2 | F3.1, F2.3 | Covered |
| SH-02 | Filter by identifier type for training new hires (Skype → Xbox → OneDrive) | Shane | W2 | F1.2 | Covered |
| SH-03 | Track "worked on" vs. "completed" per person | Shane | W2 | F6 (workedBy tracking) | Partial — needs CMS-level "contributor log" |
| SH-04 | Multiple pivot tables to compile NSU case lists | Shane | W2 | F9.1 (export) | New (export enables pivot table workflow) |
| SH-05 | Can't pull country or queue in identifier view | Shane | W2 | F1.1 (response includes caseSummary) | Covered (ensure country/queue in response) |
| SH-06 | Check for cases stuck in personal queues | Shane | W2 | F10 + F6 (no hidden queues) | Addressed (personal queues eliminated) |
| SH-07 | Answer "how many active cases from federal agency, not counting triage?" | Shane | W2 | F3.1 + F2.3 | Covered (jurisdiction filter + stage filter + count) |

### Compliance / Litigation Coordinator Scenarios (Tracy)

| # | Scenario | Who | Workshop | Feature | Status |
|---|----------|-----|----------|---------|--------|
| TR-01 | Queue-agnostic search across all cases, all stages | Tracy | W2 | F3.3 | Covered |
| TR-02 | Bulk identifier cross-check on every new case at intake | Tracy | W2 | F5.1 | Covered |
| TR-03 | Search by domain (all `@contoso.com` identifiers) | Tracy | W2 | F1.4 | Covered |
| TR-04 | Create private views, share with attorneys only | Tracy | W2 | F3.2 | Covered |
| TR-05 | Default views to private; share with groups/individuals/everyone | Tracy | W2 | F3.2 | Covered (added sharing granularity) |
| TR-06 | Transparency reporting: all requests received within 6 months | Tracy | W2 | F9.2 | New |
| TR-07 | Export up to 100K rows | Tracy | W2 | F9.1 | New |
| TR-08 | "If we're tracking it, I want to be able to pull a report on it" | Tracy | W2 | F9 (general principle) | New |
| TR-09 | Identifier-to-request mapping navigable in both directions | Tracy | W2 | F1.1, F4.1 | Covered |
| TR-10 | Track original received date + auto-response acknowledgment + first closure date | Tracy | W2 | F2.1, CMS-B7, CMS-B8 | Covered (dates) + New (auto-response tracking) |

### Programmatic / ETSI Scenarios (Faisal)

| # | Scenario | Who | Workshop | Feature | Status |
|---|----------|-----|----------|---------|--------|
| FA-01 | Task-level deadlines (not just case-level) | Faisal | W2 | CMS-B7 extension needed | Open question — see Q7 |

---

## CMS Backend Requirements

The following new or modified backend capabilities are required to support the features above. Each is a planned engineering work item for the CMS team.

---

### CMS-B1 — Identifier Lookup Endpoint

**New endpoint:** `GET /api/v1/identifiers/{hashedValue}/cases`

| Property | Value |
|---|---|
| **Auth** | `CMS.CaseReader` |
| **Input** | `hashedValue` — SHA-256 hex string of normalized identifier value |
| **Response** | Array of `{ caseId, lensTaskId, service, fulfillmentStatus, identifierType, accountType, caseSummary }` |
| **Count** | Response includes `total` field (number of matching cases) |
| **Scope** | Tenant-scoped; returns active cases by default; `?includeClosed=true` for 90-day history |
| **Index used** | `dft-lookups` container, `identifier` partition |

Alternatively, this can be served via the existing `GET /cases?identifierHash={hash}` if `identifierHash` is added as a supported ListCases filter field.

---

### CMS-B2 — `identifierType` in Identifier Lookup

**Schema change:** Add `identifierType` field to the `identifier` lookup document (7.11 in cosmos-lookup-indexes.md). It is currently stored in the DFT document body only.

| Change | Detail |
|---|---|
| **Document updated** | `dft-lookups` / `identifier` partition |
| **New field** | `"identifierType": "Email"` — populated from `DFT.TargetIdentifier.identifierType` at write time |
| **Impact** | Enables secondary predicate filtering: `WHERE lookupType = 'identifier' AND identifierType = 'SkypeID'` |
| **Migration** | Existing documents need backfill; estimate ~2 hrs at scale using bulk-rebuild utility |

---

### CMS-B3 — `accountType` Lookup Index

**New lookup type:** `accounttype` in the `case-lookups` container.

| Property | Value |
|---|---|
| **Container** | `case-lookups` |
| **HPK** | `lookupType = "accounttype"`, `lookupValue = {accountType}` (Enterprise / Consumer / Both) |
| **Source** | DFT mutation handlers; case-level `accountType` is derived as: if any DFT is Enterprise → Enterprise; if all Consumer → Consumer; if mixed → Both |
| **Trigger fields** | `DFT.TargetIdentifier.accountType` change |
| **Enables** | `GET /cases?accountType=Enterprise` — single-partition query |

**Alternative (lighter weight):** Promote `accountType` into `CaseSummary` on existing lookup documents. This avoids a new partition but adds a field to the shared summary schema, requiring bulk-rebuild.

The new lookup index is preferred for query isolation and hot-partition management.

---

### CMS-B4 — Domain Search Index

**Option A (recommended for MVP):** ADX / Log Analytics export
The `identifier` lookup documents are continuously exported to Azure Data Explorer via the Change Feed. Domain searches run as KQL queries against ADX:

```kql
dft_lookups
| where lookupType == "identifier"
| where targetIdentifierValue endswith "@contoso.com"
| summarize caseCount = dcount(caseId) by targetIdentifierValue
```

- No Cosmos schema change required
- ADX query latency: 5–10 seconds acceptable per workshop
- Read-only; does not affect CMS write path

**Option B (deferred):** Dedicated `identifierdomain` lookup index in `dft-lookups` storing the extracted domain string as `lookupValue`. Enables Cosmos-native domain queries but requires schema change and migration.

---

### CMS-B5 — Batch Identifier Lookup Endpoint

**New endpoint:** `POST /api/v1/identifiers/batch`

| Property | Value |
|---|---|
| **Auth** | `CMS.CaseReader` |
| **Request body** | `{ "identifierValues": ["email1@x.com", "email2@y.com", ...] }` (max 50) |
| **Processing** | System hashes each value; queries `dft-lookups` identifier partition for each in parallel (Task.WhenAll) |
| **Response** | Map of `{ identifierValue → [matching cases] }`; deduplicated case list with all matching identifiers listed per case |
| **Tenant scope** | Tenant-scoped |

---

### CMS-B6 — Intake Cross-Check Operation

**New operation:** triggered when a case transitions to Triage.

| Property | Value |
|---|---|
| **Trigger** | CaseEvent `StageChange` where `newStage = "Triage"` detected by Change Feed consumer |
| **Operation** | For each DFT on the case: hash `targetIdentifierValue`, query `dft-lookups` identifier partition, collect matching `caseId` values excluding current case |
| **Output** | Write `CaseEvent` of type `IntakeCrossCheckCompleted` with results payload |
| **Async** | If > 5 identifiers, run async and write event when complete; response specialist sees "Cross-check in progress" then notification when done |
| **Auth** | Internal worker using `CMS.AggregateProcessor` or `CMS.SystemIntegration` role |
| **Idempotent** | If cross-check event already exists for the current Triage entry, do not re-run |

---

### CMS-B7 — `effectiveDueDate` Field

**Schema addition:** Add a computed `effectiveDueDate` to `CaseSummary` (and the `duedate` lookup).

| Property | Value |
|---|---|
| **Logic** | `effectiveDueDate = caseDueDate ?? jurisdictionSlaDefault(jurisdiction, createdAt)` |
| **SLA defaults** | India: +72 hrs; EU/UK: +10 days; US/Brazil: +14 days; RoW: +14 days |
| **Computed at** | Case creation and on `caseDueDate` update |
| **Purpose** | Enables sort and filter on due date even when LE does not populate the field |
| **Bucket impact** | The `duedate` lookup uses `effectiveDueDate` instead of `caseDueDate` for bucket assignment |

---

### CMS-B8 — `stageEnteredAt` Timestamp

**Schema addition:** Record the timestamp when a case enters its current `workflowStage`.

| Property | Value |
|---|---|
| **Field** | `stageEnteredAt` on Case entity |
| **Set by** | Stage transition handler; updated on every `StageChange` event |
| **Purpose** | Enables "entered queue date" column (Workshop: "I want to know when it hit the queue, not when it was created") and CHI dwell-time scoring |
| **CaseSummary** | Include in `CaseSummary` so lookup indexes carry it without a follow-up read |

---

## Non-Goals

- **Full-text search across case content** — `$search` parameter is post-MVP per CMS design doc; not in scope here
- **Predictive / ML-based duplicate detection** — F5 is rule-based exact-match cross-check only
- **Modifying Power BI reports** — out of scope; CMS provides the data; reporting layer is separate. **Note:** Tracy (W2) does not use Power BI — she does all regulatory/transparency reporting from case list views with CSV export. The case list + export IS her reporting tool. F9 addresses this.
- **Managing agency / agent data** — this spec covers case and identifier search only. Agency deduplication and registry are covered in the Workshop2 gap analysis (GAP W2-3).
- **AI-assisted view configuration** — Dale (W1) expressed interest in telling Copilot how to arrange views. Deferred to Phase 7 (AI-Assisted Assignment). Not in scope for initial CMS capability.
- **Capacity estimation / workload signals** — Claire (W2) estimates her team's daily capacity in her head. Workload and capacity planning are covered in Phase 6 (LENS Health) and Phase 7 (Forecasting), not in this search/filter spec.

---

## Open Questions

| # | Question | Owner | Notes |
|---|---|---|---|
| 1 | Should `effectiveDueDate` be stored on the Case document or computed client-side? | CMS Eng | Storing enables index/sort; computing is simpler but shifts logic to DARS |
| 2 | Is Option A (ADX) for domain search acceptable for initial release, or do we need Cosmos-native? | Tracy / PM | ADX has 5–10s latency; acceptable per workshop |
| 3 | What is the right cross-check batch size before switching to async? Currently proposed: >5 identifiers → async | CMS Eng | Needs load-test validation |
| 4 | Should the `accounttype` lookup be case-level (derived) or DFT-level (per identifier)? | CMS Eng | Case-level is simpler; DFT-level is more granular |
| 5 | Should saved views be stored in CMS or in DARS? | Product | CMS is the data layer; views are likely a DARS/UX concern; CMS just needs to support the query parameters |
| 6 | For the related cases panel (F4.1), should closed cases within 90 days be included? Or active only? | Tracy / Shane | Workshop suggested "any other legal demand" — implies historical |
| 7 | Should `effectiveDueDate` be case-level or task-level? Faisal (W2) says programmatic deadlines are per-task, not per-case. If task-level, should case-level `effectiveDueDate` = earliest task deadline? | CMS Eng / Faisal | Tension between Dale's case-level deadline type, Jessalyn's single due date, and Faisal's task-level model |
| 8 | Should `workedBy` be a separate field from `assigneeId`? Workshop confirmed they serve different purposes: `assigneeId` carries from triage, `workedBy` updates on pick and is used for metrics | CMS Eng | Shane (W2): "the worked by will update to their name... that's when a person will get the credit" |
| 9 | Should CMS track a "contributor log" — every person who touched a case and for how long — to support Shane's "worked on 350 but completed 200" metric? | CMS Eng / Product | This is more than `workedBy`; it's a time-in-state log per contributor per case |
| 10 | For F9.1 bulk export, what is the maximum row limit before we switch to async file generation? Proposed: 10K sync, 100K async with notification | CMS Eng | Tracy's transparency reports can hit 100K rows |
| 11 | Should the auto-response acknowledgment timestamp be tracked as a separate field (`autoResponseSentAt`) for regulatory compliance? | Tracy / Legal | Tracy (W2): "we have to track when they got the auto response stating we've received it" |

---

## Prototype UX Decisions

The following decisions were made during prototype implementation (DARS 2.0 eEvidence, `C:\R\Prototype_v2`, April 2026). They represent the chosen UX direction for each design option in the spec and should be used as the baseline for future design and engineering work.

---

### UX-D1 — Filter Layout: Horizontal Filter Bar (F3.1)

**Decision:** Horizontal filter bar above the case list with multi-select dropdown popovers. Always visible, collapsed by default per dimension.

**Rationale:** Chosen over collapsible left sidebar (Option A) and filter drawer (Option B) because it keeps full-width horizontal space for both card and table views while keeping all filter dimensions accessible without an extra click. Aligns with modern list UIs (GitHub Issues, Linear). For the DARS use case, the expected filter dimensions in Tier 1 are manageable in a horizontal bar.

**Implemented filters (Tier 1 prototype):**
- Priority (Emergency / Urgent / Routine)
- Stage (all stages, multi-select)
- Country (all countries in mock data, multi-select)
- Account Type (Enterprise / Consumer)
- Due Date bucket (Overdue / Today / This Week / Later)

**Active filter chips:** Active filter selections render as removable chips below the filter bar. "Clear all" removes all active filters and clears search.

**Not yet implemented (Tier 2+):** Jurisdiction (dependent on country), Agency type, Agency name typeahead, Authority role, Cross-border flag, Identifier type, Request type, Assignee typeahead, Original received date range, Case status.

---

### UX-D2 — Named Views: Fluent TabList with CounterBadge (F3.2)

**Decision:** Fluent UI v9 `TabList` with `CounterBadge` per tab in the page header. Four system default views.

**Tab order (final):**

| Position | Tab | Filter Logic |
|---|---|---|
| 1 | My Cases | `workedBy === currentUser OR assigneeName === currentUser` — any stage |
| 2 | Cases to Work On | `!assigneeName AND !workedBy AND stage NOT IN TERMINAL_STAGES` |
| 3 | Overdue | `isOverdue === true AND stage NOT IN TERMINAL_STAGES` |
| 4 | All Cases | No exclusions — all cases across all stages |

**Why "All Cases" is last and unfiltered:** Moved from "All Active" (which excluded terminal stages) to "All Cases" (no exclusions) to serve transparency reporting and bulk export use cases (Tracy, F9). Users who want active-only cases use the Stage filter to exclude Resolved/Rejected/Cancelled/Withdrawn. Placing it last ensures power-user/export scenarios don't interfere with the default working views.

**Page heading removed:** The `h1 "Case Queue"` heading was removed from the queue page. The tab strip and case count subtitle (`N of M cases`) provide sufficient context. No rename was needed.

**Not yet implemented:** Personal vs. shared view indicators (person icon / globe icon), custom saved views (+ Save View), view editing.

---

### UX-D3 — View Density Toggle: Manual Only (F7)

**Decision:** Manual toggle only — Cards / Table buttons in the queue toolbar. No automatic switching based on case count.

**Rationale:** User explicitly chose manual toggle over auto-switch (which would default to Card ≤10 cases, Table >10 cases). Avoids unexpected layout changes when filter results cross the threshold.

**Toggle location:** Top-right of the queue header, inline with the Export button. Uses filled/outlined button states to indicate the active mode.

**Default:** Card view (prototype default; production should default to Table for large queues per F7.1).

**Not yet implemented:** Per-view density persistence (each named view remembering its last density mode).

---

### UX-D4 — Case List Table Columns (F2.1)

**Implemented columns in `CaseListTableView`:**

| Column | Sticky | Sortable | Notes |
|---|---|---|---|
| Case ID | Left | No | Font-mono; threat-to-life icon; click opens case |
| Due Date | No | Yes (default sort) | Shows `effectiveDueDate`; Overdue badge when `isOverdue === true` |
| Stage | No | Yes | Color-coded chip per stage |
| Priority | No | Yes | Icon + label chip |
| Agency | No | Yes | `agencyName` field |
| Country / Jurisdiction | No | Yes | Two-line cell: country on top, jurisdiction below |
| Assignee | No | Yes | Blue + bold when `assigneeName === currentUser`; shows `workedBy` if distinct |
| Identifiers | No | No | Count + type list |
| Services | No | No | Icon row (Outlook/Teams/Azure/OneDrive) |
| Deadline | No | No | `DeadlineTypeBadge`: SLA / Authority / Agency Req. |
| $ (Financial Penalty) | No | No | Dollar icon when `hasFinancialPenalty === true` |
| Actions | Right | No | Context-sensitive per row (see UX-D5) |

**Terminal stage rows** are rendered at 60% opacity with grayscale to visually de-emphasise closed/rejected/cancelled cases.

---

### UX-D5 — Pick / Release / Route Actions (F6)

**Decision:** Actions are inline per row (table view) and inline on card (card view). No separate action panel.

**Row action states:**

| Case State | Actions Shown |
|---|---|
| Unassigned + active | **Pick** button (outlined, brand blue) + View button |
| Worked by current user | **Open** button + **More menu** (Release / Route to…) |
| Assigned to another user | View only |
| Terminal stage | View only |

**Pick:** Sets `workedBy = currentUser` and `assigneeName = currentUser` if unassigned. Case immediately appears in "My Cases" tab.

**Release:** Clears `workedBy`; clears `assigneeName` only if it was set to current user. Case reappears in "Cases to Work On" tab.

**Route to…:** Sets `workedBy` and `assigneeName` to the target specialist. Case remains in the same queue pool (no hidden personal queues — per Tracy's explicit requirement). Available specialists: `RESPONSE_SPECIALISTS` constant in `case-queue-types.ts`.

**Card view:** Pick / Release / Route rendered as text buttons below the card content. Pick shown for unassigned. Release + Route shown for worked-by-me cases.

---

### UX-D6 — CSV Export (F9.1)

**Decision:** Client-side CSV export from the current filtered view. Single-click, no async (prototype scale only).

**Exported columns:** Case ID, Stage, Priority, Agency, Country, Jurisdiction, Assignee, Worked By, Due Date, Overdue, Deadline Type, Financial Penalty, Identifier Count, Services, Create Date.

**Filename format:** `case-queue-{YYYY-MM-DD}.csv`

**Production note:** F9.1 specifies async export for up to 100K rows with notification. The prototype export is synchronous and client-side only — suitable for demo/testing with ≤50 mock cases.

---

### UX-D7 — Data Model Changes Implemented

The following fields were added to `CaseQueueItem` in the prototype (`case-queue-types.ts`) and are required as backend CMS fields per the spec:

| Field | Type | Spec Ref | Status |
|---|---|---|---|
| `workedBy` | `string?` | F6, CMS-B8 | Prototype mock ✓ |
| `effectiveDueDate` | `string?` | F2.1, CMS-B7 | Prototype mock ✓ |
| `isOverdue` | `boolean?` | F2.2 | Prototype computed ✓ |
| `deadlineType` | `"SLA" \| "Issuing Authority Imposed" \| "Agency Requested"` | F2.1 | Prototype mock ✓ |
| `hasFinancialPenalty` | `boolean?` | F2.1 | Prototype mock ✓ |
| `agencyName` | `string?` | F2.1 | Prototype mock ✓ |
| `stageEnteredAt` | `string?` | F2.1, CMS-B8 | Prototype mock ✓ |
| `triageCompletedDate` | `string?` | Plan A (persona system) | Prototype mock ✓, write-back pending |
| `triageCompletedBy` | `string?` | Plan A (persona system) | Prototype mock ✓, write-back pending |

**Constants added:**
- `TERMINAL_STAGES: string[]` — stages excluded from active queue views
- `RESPONSE_SPECIALISTS: string[]` — available routing targets (mock users)
