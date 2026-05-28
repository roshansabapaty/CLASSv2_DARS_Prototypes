# DARS Case Management — Search, Views & Filters: Full Parity Spec

| Property | Value |
|---|---|
| **Owner** | CaseIQ / DARS Product |
| **Source** | LENS Case Management Workshop #1 (GMT) — direct user research with response specialists |
| **Participants** | Jessalyn Halbritter (US RS), Shane Mulvey (Ops Excellence, Dublin), Claire Mulvey (Regional POC, Dublin), Tracy Ingle (Compliance/Litigation) |
| **Status** | Draft — awaiting engineering review |
| **Date** | 2026-03-30 |

---

## Purpose

DARS is a net-new case management system replacing the current Dynamics CRM + Power BI workflow. This spec documents **every view, search, filter, and report** that response specialists and operational leads use today so that DARS ships with full parity on day one. Where the current system has known pain points, the preferred DARS behaviour is documented alongside it.

---

## Table of Contents

1. [Personas & Daily Routines](#1-personas--daily-routines)
2. [Case List Views](#2-case-list-views)
3. [Columns & Fields](#3-columns--fields)
4. [Filters](#4-filters)
5. [Sorting & Default Order](#5-sorting--default-order)
6. [Case Pick & Release Workflow](#6-case-pick--release-workflow)
7. [Identifier Search & Lookup Views](#7-identifier-search--lookup-views)
8. [Metrics & Reporting](#8-metrics--reporting)
9. [Saved & Shared Views](#9-saved--shared-views)
10. [Pain Points Resolved in DARS](#10-pain-points-resolved-in-dars)
11. [Open Questions](#11-open-questions)

---

## 1. Personas & Daily Routines

### 1.1 Jessalyn Halbritter — Response Specialist, US Operations

**Tenure:** 3 years | **Region:** US | **Focus:** US jurisdiction processing & metrics

**Daily routine (as described in workshop):**
1. Opens **USJT Fulfillment queue** — her primary working list. Checks the row count as an operational pulse.
2. Reviews cases sorted by oldest requested due date first (FIFO).
3. **Picks** a case — `Work By` field updates to her name; case stays in USJT queue (does not move to a personal queue).
4. Works through the case. If it does not meet escalation criteria for enterprise, she releases it back to the queue.
5. Checks **Cases I'm Working On** to see items currently routed to her.
6. Occasionally checks **Requests Assigned to Me** to catch anything that was accidentally assigned to her personal queue rather than routed.
7. Checks queue count **1–2× per day**.

**Views used daily:**
- USJT Fulfillment Queue
- Cases I'm Working On
- Enterprise Queue (for enterprise-flagged cases)
- Cases Available to Work On (for picking)

**Key need:** Separation between "routed to me" (intentional) vs. "in my personal queue" (accidental). DARS must surface this distinction clearly.

---

### 1.2 Shane Mulvey — Response Specialist & Operational Excellence Lead, Dublin

**Tenure:** ~9 years | **Region:** Dublin/EMEA | **Focus:** Daily & weekly metrics, resource deployment, training

**Daily routine (as described in workshop):**
1. Pulls **pivot tables** from Power BI and CRM to track: federal cases, CE cases, state & local, overall oldest by due date.
2. Monitors total case counts across active queues to determine where to deploy resources.
3. Checks for the **oldest cases** across jurisdictions — tracks both requested due date and original received date.
4. For **Azure/enterprise** reporting: tracks not just cases completed but cases worked on where the identifier turned out not to be Azure-impacted (completed checks ≠ completed cases).
5. Builds and shares **custom views** for team training (e.g., filter to Skype ID identifier type).
6. Routes cases between specialists. Updates `Work By` field. Monitors for cases stuck in personal queues via Power BI.

**Key need:** Live metrics in DARS. Currently Power BI has a 4-hour refresh lag — Shane checks CRM directly for live queue counts. DARS must make queue counts and oldest-case tracking available in real time without a separate reporting tool.

---

### 1.3 Claire Mulvey — Response Specialist & Regional POC, Dublin

**Tenure:** 6 years | **Region:** Dublin, POC for India | **Focus:** India 72-hour SLA, DSA, eEvidence

**Daily routine (as described in workshop):**
1. Checks **India queue** on arrival, at lunch, and before end of day (**3–4× daily**) due to 72-hour SLA.
2. Monitors **original received date** carefully — requests that come in on a Friday evening in India need Monday response; this creates predictable weekend surge.
3. Uses the queue's row count as her primary signal for capacity: she knows roughly how many fulfillment staff are on and assesses whether the queue is manageable.
4. Also monitors India queue during off-hours if needed due to time zone difference.

**Key need:** Original received date must be a visible, sortable column — not just the due date. Jurisdiction-based SLA defaults must be clearly shown when the requested due date is not populated by the requesting agency.

---

### 1.4 Tracy Ingle — Compliance & Litigation Coordinator

**Tenure:** Not stated | **Focus:** Transparency reporting, litigation support, compliance research, attorney coordination

**Daily routine (as described in workshop):**
1. Uses **All Request Items** view (queue-agnostic) to find any case across the system by request number.
2. Runs **identifier searches** for compliance and litigation support — searching by identifier value, domain, account name, or requester.
3. Builds **private custom views** for litigation discovery projects, shared only with specific attorneys.
4. Runs **6-month historical queries** for transparency reporting.
5. Manages and tracks **attorney work** (escalations, enterprise assessments) — this is currently not systematically tracked in CRM.
6. Identified the biggest unmet need: **automated identifier cross-check at intake** — checking every identifier on a new case against all existing legal demands.

**Key need:** Queue-agnostic search, historical queries across closed cases, private views with controlled sharing, identifier bulk lookup, and attorney activity tracking.

---

## 2. Case List Views

Each named view below is used today and must be available in DARS as a first-class named view accessible from navigation — not requiring the user to manually reconstruct filters.

---

### 2.1 Cases I'm Working On

| Property | Value |
|---|---|
| **Used by** | All response specialists |
| **Frequency** | Multiple times daily |
| **Filter** | `Work By = current user` AND `status ≠ Closed/Archived` |
| **Purpose** | Shows cases currently routed to or picked by the logged-in specialist |
| **Sort** | Requested due date ascending (oldest/most urgent first) |
| **Columns** | Request number, Title, Work By, Requested Due Date, Original Received Date, Stage, Jurisdiction, Request Type |

**DARS note:** `Work By` is a custom field built in CRM. It tracks the current active worker — not just the assignee. When a case is routed to a queue (not a person), `Work By` clears. DARS must replicate this as a first-class field.

---

### 2.2 Cases Available to Work On

| Property | Value |
|---|---|
| **Used by** | All response specialists, especially when picking new work |
| **Frequency** | At start of day; whenever picking a new case |
| **Filter** | `Work By = blank` AND `stage ∈ active stages (Triage, Fulfillment)` AND `status ≠ Closed/Archived` |
| **Purpose** | Shows unassigned cases in the queue available for any specialist to pick up |
| **Sort** | Requested due date ascending (FIFO) |
| **Columns** | Request number, Title, Requested Due Date, Original Received Date, Stage, Jurisdiction, Request Type, Priority |
| **Count** | Row count displayed prominently — this is the primary queue health signal |

**DARS note:** This is the **most operationally critical view**. Row count is checked 1–4× daily by specialists as an operational pulse. Count must update in real time.

---

### 2.3 All Active Cases in Selected Queue(s)

| Property | Value |
|---|---|
| **Used by** | Shane (ops/metrics), managers |
| **Frequency** | Daily |
| **Filter** | `stage ∈ [user-selected queues]` AND `status ≠ Closed/Archived` — includes both picked and unpicked cases |
| **Purpose** | Shows total active caseload across one or more stages; used for capacity planning and queue health |
| **Sort** | Requested due date ascending |
| **Columns** | Request number, Title, Work By, Requested Due Date, Stage, Jurisdiction, Priority, Account Type |
| **Queue selection** | User can select one or more queues (Triage, USJT Fulfillment, India, Federal, etc.) |

**DARS note:** This view is distinct from "Cases Available to Work On" — it includes cases already picked by someone (non-blank Work By). It answers "how many total cases are active in this queue" not just "how many are free to pick."

---

### 2.4 USJT Fulfillment Queue

| Property | Value |
|---|---|
| **Used by** | Jessalyn and US-region specialists |
| **Frequency** | Primary working view, open all day |
| **Filter** | `stage = Fulfillment` AND `jurisdiction = US` AND `status ≠ Closed/Archived` |
| **Purpose** | The day-to-day working list for the US jurisdiction team |
| **Sort** | Requested due date ascending (oldest first) |

---

### 2.5 India Queue

| Property | Value |
|---|---|
| **Used by** | Claire |
| **Frequency** | 3–4× daily |
| **Filter** | `jurisdiction = India` (or `country = IN`) AND `status ≠ Closed/Archived` |
| **Purpose** | Monitor India SLA compliance — 72-hour response window |
| **Sort** | Original received date ascending |
| **Critical column** | Original received date must appear early in the column order |

---

### 2.6 Enterprise Queue

| Property | Value |
|---|---|
| **Used by** | Jessalyn, Shane |
| **Frequency** | Daily |
| **Filter** | `accountType = Enterprise` AND `status ≠ Closed/Archived` |
| **Purpose** | Separate view for enterprise-flagged cases that may require attorney escalation review |
| **Sort** | Priority descending, then requested due date ascending |

**Current workaround:** In CRM, enterprise cases are identified by the text tag `[enterprise]` in the case title. Jessalyn manually reads the title to determine if a case is enterprise-impacted. DARS must store account type as a structured field (`accountType = Enterprise / Consumer / Both`) populated from CLASS lookup results, not title parsing.

---

### 2.7 Federal Queue

| Property | Value |
|---|---|
| **Used by** | Shane, specialists |
| **Filter** | `jurisdiction = Federal` AND `status ≠ Closed/Archived` |
| **Purpose** | Metrics and resource deployment for federal cases |
| **Sort** | Requested due date ascending |

---

### 2.8 CE / State & Local Queue

| Property | Value |
|---|---|
| **Used by** | Shane (metrics) |
| **Filter** | `jurisdiction ∈ [State, Local]` AND `status ≠ Closed/Archived` |
| **Purpose** | Metrics tracking; used in weekly resource planning |

---

### 2.9 All Request Items (Queue-Agnostic Search)

| Property | Value |
|---|---|
| **Used by** | Tracy, all specialists when a case can't be found in normal views |
| **Frequency** | Ad hoc; Tracy uses regularly |
| **Filter** | None — shows all cases regardless of stage, including Closed |
| **Purpose** | Cross-stage, cross-queue lookup when you know the request number or identifier but not the current routing |
| **Search input** | Request number, case title keyword, identifier value, LE reference number |
| **Sort** | Original received date descending (most recent first) by default |

**Pain point addressed:** Currently, if a case is in an unexpected queue or was accidentally put in a personal queue, it becomes invisible to standard views. "All Request Items" is the fallback that finds it. Tracy also uses this for litigation support — searching for all cases matching specific criteria across the entire system history.

---

### 2.10 Requests Assigned to Me

| Property | Value |
|---|---|
| **Used by** | All specialists — used as a diagnostic check |
| **Frequency** | Occasional; used when a case seems to have disappeared |
| **Filter** | `assignedTo = current user` (personal queue assignment — distinct from Work By routing) |
| **Purpose** | Surface cases accidentally assigned to personal queue instead of routed to shared queue |

**DARS design intent:** Personal queues should be **eliminated in DARS**. All cases must live in shared stage queues. The ideal DARS state has no equivalent for this view — but during transition, DARS must provide visibility into any case that is not in a shared queue. The system should also proactively alert a manager when a case leaves a shared queue.

---

### 2.11 Service NDO Extensions

| Property | Value |
|---|---|
| **Used by** | Specialists handling NDO workflow (primarily IPH) |
| **Frequency** | As needed |
| **Filter** | Cases/tasks with active NDO extensions pending |
| **Purpose** | Separate working view for NDO extension tasks, distinct from main case fulfillment |

---

### 2.12 Overdue Cases

| Property | Value |
|---|---|
| **Used by** | Shane (ops), managers |
| **Filter** | `effectiveDueDate < today` AND `status ≠ Closed/Archived` |
| **Purpose** | Immediate escalation view — cases that have missed SLA |
| **Sort** | Most overdue first (furthest past due date) |
| **Display** | Overdue badge/indicator on every row; days overdue shown |

---

## 3. Columns & Fields

### 3.1 Required Columns (Must Be Available in All Case List Views)

| Column | Field | Notes |
|---|---|---|
| **Request number** | `caseId` | LNS-{epoch}-{suffix} format; clickable link to case detail |
| **Title** | `title` | In CRM, title contains embedded tags ([enterprise], [NDO], [preservation]). DARS should store these as structured fields, not title text |
| **Work By** | `workBy` / `assigneeId` | Who is currently actively working on the case; blank = available to pick |
| **Requested Due Date** | `effectiveDueDate` | See SLA default logic in §3.3; must be sortable |
| **Original Received Date** | `createdAt` | When the LE request was submitted; distinct from processed date |
| **Stage / Queue** | `workflowStage` | Current stage in human-readable form (Triage, Fulfillment, etc.) |
| **Jurisdiction** | `jurisdiction` | Federal / State / Local / International — critical filter & display column |
| **Priority** | `priority` | Emergency / Urgent / Standard |
| **Request Type** | `requestType` | SubpoenaSummons, CourtOrder, SearchWarrant, etc. |
| **Country** | `country` | ISO country |
| **Account Type** | `accountType` | Enterprise / Consumer / Both — **new structured field**, not a title tag |
| **Entered Queue Date** | `stageEnteredAt` | When the case moved into its current stage — "when did it hit the queue" |

### 3.2 Optional Columns (Available But Not Default)

| Column | Field | Notes |
|---|---|---|
| **Service Type** | `service` | Azure, Exchange, OneDrive, Skype, etc. |
| **LE Reference Number** | `leReferenceNumber` | The requesting agency's own case number |
| **Crime Type / Priority Category** | `crimeCategory` | 7 priority crime types ranked higher (per workshop, crime type affects picking priority) |
| **First Resolved Date** | `firstResolvedAt` | When the case was first closed; used for metrics |
| **Triage Completion Date** | `triageCompletedAt` | Timestamp when case left triage — needed for bottleneck analysis |
| **Assignment Date** | `assignedAt` | When case moved from triage to fulfillment |
| **Related Case Count** | computed | Number of other active cases sharing any identifier with this case |

### 3.3 Effective Due Date (SLA Default Logic)

The `requestedDueDate` field is rarely populated by requesting agencies outside the US and Brazil. DARS must calculate an `effectiveDueDate` automatically when the field is blank, using jurisdiction-based SLA rules:

| Jurisdiction / Country | Default SLA from `createdAt` |
|---|---|
| India | 72 hours |
| EU member states | 10 calendar days |
| UK | 10 calendar days |
| US | 14 calendar days (field usually populated by LE) |
| Brazil | Varies; fall back to 14 calendar days |
| Rest of World | 14 calendar days |

The `effectiveDueDate` is:
- The `requestedDueDate` if populated
- Otherwise the jurisdiction SLA default applied to `createdAt`

**DARS must display this as a single computed column** — specialists should not need to know whether the date came from LE or was calculated. An indicator (e.g., "SLA default") can distinguish the two sources.

### 3.4 Title Tag → Structured Field Mapping

In the current CRM, specialists encode metadata into the case title using text tags. DARS must migrate these to structured fields:

| CRM Title Tag | DARS Structured Field |
|---|---|
| `[enterprise]` | `accountType = Enterprise` |
| `[preservation]` | `requestType = Preservation` |
| `[NDO]` | Case has active NDO (boolean) |
| Case title also contains jurisdiction, service, and crime context | These must be filterable structured fields in DARS |

---

## 4. Filters

### 4.1 Case List Filters

All case list views must support the following filters in a filter panel. Filters must be combinable (AND logic between fields, OR within multi-select).

| Filter | Type | Values |
|---|---|---|
| **Stage / Queue** | Multi-select | Triage, Fulfillment, Review, Closed, Archived |
| **Jurisdiction** | Multi-select | Federal, State, Local, International, India, EU, UK, Brazil, Rest of World |
| **Country** | Multi-select | ISO country codes with search |
| **Priority** | Multi-select | Emergency, Urgent, Standard |
| **Request Type** | Multi-select | SubpoenaSummons, CourtOrder, SearchWarrant, Preservation, NSL, LawfulIntercept, EmergencyLetter, ConsentRelease, InternationalOrder, PRTT, Other |
| **Account Type** | Multi-select | Enterprise, Consumer, Both |
| **Service Type** | Multi-select | Exchange, SharePoint, OneDrive, Azure, Skype, Xbox, Teams, etc. |
| **Work By (Assignee)** | Typeahead + Multi-select | Specialist display names; "Unassigned" option for blank Work By |
| **Due Date** | Bucket OR date range | Overdue / Due Today / Due This Week / Due This Month / Due Later / No Due Date; or custom date range |
| **Original Received Date** | Date range | Calendar date picker (from / to) |
| **Entered Queue Date** | Date range | When case arrived in current stage |
| **Status** | Multi-select | Open, InReview, Closed, Draft |
| **Crime Type** | Multi-select | 7 priority crime categories + Other |

### 4.2 Identifier-Level Filters

When browsing the identifier list within a case, or running a standalone identifier search, the following filters must be available:

| Filter | Type | Values |
|---|---|---|
| **Identifier Type** | Multi-select | Email, UPN, PhoneNumber, PUID, SkypeID, XboxGamertag, IPAddress, TenantID |
| **Account Type** | Multi-select | Enterprise, Consumer, Both |
| **Account Status** | Multi-select | Active, SoftDeleted, Deleted, Unknown |
| **Service** | Multi-select | Exchange, OneDrive, Azure, etc. |
| **Fulfillment Status** | Multi-select | NotStarted, InProgress, Complete, Failed |
| **Enterprise Provisioned** | Boolean | Yes / No |
| **Has Related Cases** | Boolean | Show only identifiers appearing in more than one case |

---

## 5. Sorting & Default Order

### 5.1 Default Sort for All Active Case Views

**Primary sort:** `effectiveDueDate` ascending (oldest / most urgent due date first)
**Secondary sort:** `createdAt` ascending (oldest original received date as tiebreaker)

This is the FIFO + SLA-priority model used by all specialists. The intent is: work the case that is closest to or past its deadline first; when multiple cases share the same due date, work the one that has been waiting longest.

### 5.2 Date Fields & Their Meaning

Specialists distinguish these dates and need all of them to be sortable:

| Date Field | What It Means | Used For |
|---|---|---|
| `createdAt` | When LE submitted the request | FIFO tie-breaking; Claire's India SLA starting point |
| `effectiveDueDate` | Response deadline (LE-provided or SLA-calculated) | Primary sort; overdue detection |
| `stageEnteredAt` | When case moved into its current stage | "Entered queue date"; dwell time; bottleneck detection |
| `triageCompletedAt` | When triage was finished | Metrics: triage throughput |
| `assignedAt` | When moved from triage to fulfillment | Metrics: queue entry time |
| `firstResolvedAt` | When first closed | Metrics: time to resolution |

### 5.3 Shane's Oldest-Case Metric

Shane's operational metric tracks the **oldest case** in each jurisdiction bucket:
- Oldest by `effectiveDueDate` for each of: Federal, CE/State+Local, Overall
- When a queue is in good health (no overdue), secondary sort is `createdAt` — work oldest received first
- When a queue has overdue cases, those surface first regardless of creation order

DARS must provide these oldest-case snapshots as a live metric — not requiring a Power BI query.

---

## 6. Case Pick & Release Workflow

This section captures the exact pick/route/release workflow described in the workshop. DARS must implement all variants.

### 6.1 Pick a Case (Self-Assign)

**Trigger:** Specialist selects a case in "Cases Available to Work On" and clicks Pick / Take.

**Behaviour:**
- `Work By` field updates to the specialist's name
- Case **remains in its current shared queue** (e.g., USJT Fulfillment) — it does not move to a personal queue
- Case now appears in the specialist's "Cases I'm Working On" view
- Case row in the queue is updated to show the specialist's name in the Work By column — visible to all

**Why it stays in the queue:** Personal queues cause cases to get lost. By staying in the shared queue with a Work By indicator, any manager or colleague can see and recover the case if needed.

---

### 6.2 Route to a Specific Person

**Trigger:** Manager or specialist routes a case to a named colleague.

**Behaviour:**
- `Work By` field updates to the named person
- Case remains in its current shared queue
- The case appears in the named person's "Cases I'm Working On" view
- When the named person completes their part, they route it back or to another person
- Routing history is tracked (audit trail: who had it, when)

**Multi-person scenario (Tracy's addition):**
- A response specialist and a manager or attorney may access the case simultaneously
- Two response specialists do not typically work the same case at the same time
- Attorney activity on a case is a separate tracking requirement (attorney metrics not yet defined — flagged as open question)

---

### 6.3 Release Back to Queue

**Trigger:** Specialist determines the case does not meet their criteria (e.g., flagged enterprise but not actually enterprise-impacted) and releases it.

**Behaviour:**
- `Work By` field clears (returns to blank)
- Case remains in its shared queue and becomes visible again in "Cases Available to Work On"
- Case no longer appears in the specialist's "Cases I'm Working On" view
- Release is available from **any case view** — not just the queue items view

**Current pain point:** In CRM, the release action is only available in the Queue Items view. From the "Requests" view, the specialist can only assign to self or resolve — not release. DARS must make release available from any context.

---

### 6.4 Route to a Different Queue (Stage Transition)

**Trigger:** Case progresses (e.g., triage complete → fulfillment) or is reassigned to a different stage queue.

**Behaviour:**
- Stage updates (`workflowStage` changes)
- `Work By` may clear depending on routing target (queue = clear; specific person = set to that person)
- Case appears in the new queue

---

### 6.5 Personal Queue Elimination

**DARS design principle:** Personal queues must not exist in DARS. All cases must reside in a named shared stage queue at all times.

**Today's problem:** When a case is "assigned" (not "routed") in CRM, it lands in the individual's personal queue — a queue that is invisible to reporting and other specialists. Cases get "lost in the ether" and are only detectable via Power BI filtering.

**DARS requirement:**
- There is no mechanism to move a case to a personal queue
- All cases are always in a named shared queue (Triage, USJT Fulfillment, India, etc.)
- `Work By` field indicates active worker without changing the queue

---

## 7. Identifier Search & Lookup Views

### 7.1 Search by Exact Identifier Value

**Who uses it:** All specialists; Tracy most heavily for compliance

**Scenario:** A specialist wants to know if an identifier (e.g., `suspect@contoso.com`) has any other active or historical legal demands.

**Expected result:**
- List of all cases containing a DFT with that identifier value
- Columns: Case ID, Stage, Priority, Due Date, Assignee, Fulfillment Status, Account Type, Service
- **Related case count badge:** "This identifier appears in N cases"
- Includes active and closed cases (within 90-day history); toggle to include all historical

**Performance target:** ≤ 3 seconds for exact-match results

---

### 7.2 Filter by Identifier Type

**Who uses it:** Shane (training), Tracy (compliance reporting)

**Scenario:** "Show me every case where the identifier type is Skype ID" — used to create training queues and service-specific reporting.

**Training use case described by Shane (00:59:26–01:00:07):**
> Create a filtered view showing all requests with Skype ID identifiers — used when onboarding a new specialist to that service type.

**Supported identifier types:** Email, UPN, PhoneNumber, PUID, SkypeID, XboxGamertag, IPAddress, TenantID

---

### 7.3 Filter by Account Type (Enterprise / Consumer / Both)

**Who uses it:** Jessalyn, Shane, managers

**Scenario:** Show only cases where the identifier is an enterprise account — needed to separate the enterprise escalation queue from the general consumer queue.

**Current workaround:** Enterprise cases are tagged `[enterprise]` in the case title. Specialists must read the title to determine account type. This is unreliable and unsearchable.

**DARS requirement:** `accountType` must be a structured field on the DFT/TargetIdentifier, populated from CLASS lookup results, and filterable in all case list views.

---

### 7.4 Domain Search

**Who uses it:** Tracy (compliance, litigation support)

**Scenario (verbatim, ~00:58:59–01:00:00):**
> "All accounts that are on a certain domain... filter for accounts that contain or are in a domain name, e.g., all custom enterprise domains."
> "All accounts requested by the New York DA... all accounts on a certain domain."

**Expected behaviour:**
- Input: domain string (e.g., `contoso.com`, `nypd.gov`)
- Returns: all cases containing identifiers whose value ends with `@{domain}` or is within that domain
- Results grouped by case; shows identifier count per domain per case
- Performance: ≤ 10 seconds (acceptable per research; this is a heavier query)

**Implementation note:** The SHA-256 hashed partition key used by the CMS identifier lookup **blocks prefix searches**. Domain search requires a separate index or ADX-backed query path. See CMS-B4 in the companion CMS spec.

---

### 7.5 Multi-Identifier Batch Search

**Who uses it:** Tracy (litigation support, bulk account research)

**Scenario:** Paste or upload a list of account identifiers and find all cases associated with any of them.

**Expected behaviour:**
- Input: up to 50 identifier values (paste or CSV upload)
- Returns: unified case list — if two identifiers from the list appear in the same case, the case appears once
- Each matching case shows which of the input identifiers matched
- Export to CSV/Excel

---

### 7.6 Related Cases per Identifier (Cross-Case Signal)

**Who uses it:** All specialists; Tracy's most-requested feature

**Tracy's exact request (00:57:43–00:58:07):**
> "I would love if when a request comes in, every single account on that request is automatically checked for any other legal demand that has come in for that account and provides a set of information."

**Expected behaviour (inline signal on case):**
- On the case's identifier/DFT list, each identifier shows: "Appears in N other case(s)" with a clickable link
- Clicking opens a side panel listing those cases (case ID, stage, priority, due date, assignee)
- If any identifier on the case appears in another active case, a banner shows on the case header: "N identifier(s) on this case appear in M other active case(s)"
- Banner is informational only — does not block workflow

---

### 7.7 Automatic Identifier Cross-Check at Intake

**Who uses it:** Tracy, triage specialists

**Scenario:** When a new case enters Triage, the system automatically checks every identifier on the case against all existing cases. No specialist action required.

**Expected behaviour:**
- Triggered: when case transitions into Triage stage
- System checks every DFT identifier → finds all matching cases → writes result as a system `CaseEvent`
- Result surfaced in DARS as an intake summary panel on the case
- If no matches: no notification (silent)
- If matches: banner shown per §7.6

---

### 7.8 Identifier Search Performance

**Current state pain point (Shane, ~00:56:45):**
> "It's the one that takes time — identifiers, not requests — because there's so many hundreds of thousands of them."
- Identifier searches today: 15–30 seconds to populate
- Exports can be 100,000+ lines
- Case/request searches: 3–4 seconds

**DARS target:**
- Exact identifier lookup: ≤ 3 seconds
- Domain search: ≤ 10 seconds
- Bulk 50-identifier batch: ≤ 15 seconds
- Export: available as async download for large result sets

---

## 8. Metrics & Reporting

These metrics are currently tracked manually via Power BI pivot tables and CRM live views. DARS must provide these as live, in-product metrics — no external reporting tool required for daily operations.

### 8.1 Queue Count by Jurisdiction

**Who:** Shane (daily), Claire (daily), managers

**Metric:** Total active cases in each jurisdiction bucket:
- Federal
- CE / State & Local
- Overall (all jurisdictions)
- India (separate due to 72-hr SLA)

**Display:** Live count shown in navigation or dashboard. Updates in real time (not on 4-hour Power BI delay).

**Used to:** Determine where to deploy resources for the day/week.

---

### 8.2 Oldest Case Tracker

**Who:** Shane (daily/weekly)

**Metric:** The oldest active case in each jurisdiction bucket, by `effectiveDueDate`.

**Display:** Per-jurisdiction "oldest case" showing: case ID, due date, how many days overdue (or days until due), current assignee.

**When queue is healthy (no overdue):** Also shows the oldest by `createdAt` (FIFO oldest received).

---

### 8.3 Cases Worked On vs. Cases Completed

**Who:** Shane, OPS management

**The distinction (00:18:40–00:19:00):**
> "I've completed say 20 Azure requests, but I may have done Azure checks on 2 or 300 requests but they just were not Azure-impacted. OPS management wants to know: how many requests did I actually work on and out of that what percentage were Azure?"

**Metric required:**
- Cases **completed** by a specialist (case closed, specialist was `Work By`)
- Cases **worked on** (specialist was `Work By` at any point, regardless of outcome)
- Breakdown by service type (Azure, Exchange, OneDrive, etc.) — to distinguish "touched this case" from "this case had an Azure identifier that turned out to be irrelevant"

**DARS requirement:** The `CaseEvent` audit trail must record every `Work By` assignment/release with timestamps. Metrics are computed from this history.

---

### 8.4 Throughput by Specialist

**Who:** Shane, managers

**Metric:** Cases worked and cases completed per specialist, per time period (daily, weekly, monthly).

**Used for:** Performance tracking, FY goal progress, identifying outliers.

---

### 8.5 Weekly FY Goal Tracking

**Who:** Shane

**Metric:** Cases completed vs. FY target; trending up/down.

**Period:** Weekly snapshots; year-to-date cumulative.

---

### 8.6 Azure / Service Type Breakdown

**Who:** Shane

**Metric:** Among all active cases:
- How many have Azure identifiers
- How many have Exchange identifiers
- How many have enterprise account type vs. consumer

**Used for:** Resource deployment — Azure cases may require different specialist skills.

---

### 8.7 Attorney / Escalation Activity Tracking

**Who:** Tracy

**Current state:** Not tracked. Tracy flagged this as a gap (00:21:24–00:21:33):
> "Tracking the things that they [attorneys] do — we haven't really talked about yet either."

**DARS requirement (TBD):**
- Track when an attorney is added to a case (EscalationWorkItem created)
- Track when attorney review is completed (EscalationWorkItem resolved)
- Track attorney's time-on-case and outcome (Approved / Rejected)
- Aggregate by attorney for workload reporting

This is not yet fully defined. See §11 Open Questions.

---

### 8.8 Historical / Transparency Reports

**Who:** Tracy

**Metric:** Query cases and metrics over a defined historical period (e.g., last 6 months) for transparency reporting and regulatory submissions.

**DARS requirement:**
- Date range filter covering up to 1 year of historical data
- Filters: jurisdiction, request type, country, service type, resolution status
- Export to CSV/Excel
- Must include closed/archived cases (not just active)

---

## 9. Saved & Shared Views

### 9.1 View Types

| Type | Visibility | Edit Access | Icon |
|---|---|---|---|
| **System default** | All users | Read-only | No indicator |
| **Personal** | Creator only | Creator | Person icon (per CRM convention) |
| **Shared — team** | Named group or team | Owner only | Shared icon |
| **Shared — attorneys** | Specific named users | Owner only | Restricted icon |
| **Shared — all** | All users in tenant | Owner only | Global icon |

### 9.2 System Default Views (No Configuration Required)

These views must be available on day one for every user:
1. Cases I'm Working On
2. Cases Available to Work On
3. All Active Cases in Selected Queues
4. All Request Items (queue-agnostic)
5. Overdue Cases
6. USJT Fulfillment Queue (or equivalent named fulfillment queues per jurisdiction)

### 9.3 Custom View Creation

**Requirements:**
- Any user can create a personal view from any filter combination
- User can name and save the view
- Owner can optionally share with a group or named individuals
- Shared views appear in the shared views list for recipients
- Private views (litigation support, attorney-specific research) are visible only to the creator and explicitly named recipients
- View deletion does not affect cases

### 9.4 Shane's Training Views

Shane creates views filtered to specific identifier types (e.g., "All Skype ID cases") to onboard new specialists to a service type. These are shared views, typically shared with the new specialist and their manager. DARS must allow this without requiring admin access to create the view.

---

## 10. Pain Points Resolved in DARS

| # | Current Pain Point | Root Cause | DARS Resolution |
|---|---|---|---|
| 1 | Cases get "lost in the ether" in personal queues | CRM allows cases to be assigned to personal queues; these are invisible to reporting | Personal queues eliminated. All cases always in a named shared stage queue. `Work By` field tracks active worker without changing queue. |
| 2 | No jurisdiction column in case list | Jurisdiction is not a default column in CRM list views | Jurisdiction is a mandatory column in all DARS case list views. |
| 3 | Requested due date missing for most non-US/Brazil cases | Requesting agencies outside the US don't populate the field | `effectiveDueDate` computed automatically using jurisdiction-based SLA defaults. Displayed as single sortable column with source indicator. |
| 4 | Enterprise identification via title text tag | No structured account type field; specialists encode `[enterprise]` in title | `accountType` is a structured field on TargetIdentifier, populated from CLASS lookup, filterable everywhere. |
| 5 | Identifier searches take 15–30 seconds; exports 100K+ rows | No indexed lookup; full-table scan | Identifier lookup index (`dft-lookups`) enables ≤ 3s exact-match. Domain search via ADX. |
| 6 | No bulk identifier cross-check at intake | No automation; manual per-identifier search | Automatic intake cross-check on triage entry; results surfaced as inline banner. |
| 7 | Power BI 4-hour refresh delay for queue counts | Power BI is a separate reporting tool with batch refresh | DARS provides live queue counts and oldest-case metrics in-product. |
| 8 | Release case not available from "Requests" view | CRM's "Requests" view only supports assign-to-self or resolve | Release action available from any DARS case view. |
| 9 | No tracking of attorney work and metrics | CRM has no attorney activity tracking | Attorney escalation events tracked in `CaseEvent` audit trail; metrics computed from history. |
| 10 | No "entered queue date" column | CRM doesn't surface when a case entered its current stage | `stageEnteredAt` tracked on every stage transition; available as column and filter. |
| 11 | Multiple dates (received, due, entered queue) confused | Only one or two date fields shown; no clear labelling | All date fields shown with distinct labels; sorting available on each independently. |

---

## 11. Open Questions

| # | Question | Owner | Impact |
|---|---|---|---|
| 1 | How is attorney activity (escalation, review, outcome) defined and tracked for metrics? Tracy flagged this is not yet designed. | Tracy / Product | Blocks §8.7 |
| 2 | Should `effectiveDueDate` be stored on the Case document (indexed, sortable) or computed at query time? | CMS Eng | Performance and sort reliability |
| 3 | What is the exact list of named shared queues in DARS (replacing CRM queues)? Need a mapping from existing CRM queue names to DARS stage/jurisdiction structure. | Ops / PM | Blocks §2 view configuration |
| 4 | Should "Cases Worked On" be computed from audit trail (CaseEvent) or tracked as a separate counter on the case? | CMS Eng / Product | Blocks §8.3 |
| 5 | For the domain search, is 10-second latency acceptable at launch? Or do we need Cosmos-native indexing (slower to build, faster at runtime)? | Tracy / Eng | Blocks §7.4 implementation path |
| 6 | Should closed cases be included in "All Request Items" by default, or should historical cases require an explicit toggle? | Tracy / PM | Scoping §2.9 |
| 7 | How far back should identifier cross-check look for related cases? 90 days (AggregateSnapshot TTL) or all-time? | Tracy / PM | Blocks §7.7 |
| 8 | What constitutes "worked on" for Azure metrics — any specialist who touched the case, or only the specialist who completed it? | Shane / PM | Blocks §8.3 |
