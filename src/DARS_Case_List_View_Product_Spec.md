# DARS Case List View & Search - Product Specification

**Source:** Queue Management Workshop (Dale Ayers, David Large - CELA Response Specialists, GMT team)
**Purpose:** Engineering specification for implementing case search, filtering, and case list view in the DARS redesign.

---

## 1. Case List View (Queue View)

### 1.1 Layout Requirements

**Default view: Compact table/spreadsheet layout (one row per case)**

Dale explicitly prefers a compact, one-line-per-case table view for high-volume queues:

> "Having it in a compact one-liner like this is definitely helpful when there's volume, which we will have."

> "From an organizing your requests into a list point of view, the list thing like this does work really well and the ability to customize what comes into it is a really good thing."

**Card view for personal queue (6-7 cases):**

Dale noted the card/tile view (already in DARS preview) works well when case count is small (active personal queue of ~6-7 cases), but compact list is needed when browsing larger queues.

> "If I was going to pick that as a default view, I'd probably pick it for this [active requests] because I know I could probably fit about six or seven of them on this particular view."

**Support both views — user can toggle:**

> "I might have folders where I might do tiles, I might want it listed, I might want details."

### 1.2 Required Columns (Default Case List)

The following columns were identified as essential for the case list view:

| Column | Description | Priority |
|--------|-------------|----------|
| **Request Number** | LNS number / case ID | Required |
| **Number of Identifiers** | Count of target identifiers in the case. Ideally show breakdown: `4 (1)` = 4 original + 1 supplemental | Required |
| **Country** | Country the case relates to. Must be clearly readable (current CRM shows it poorly) | Required |
| **Request Type** | e.g., Federal Court Order, Search Warrant, State/Local, Internal, Preservation | Required |
| **Category** | Case category classification | Required |
| **Queue** | Which queue the case is in (e.g., test queue, preservations queue, US JT fulfillment) | Required |
| **Date Received** | When Microsoft originally received the request (can differ from created date — the legal "served on" date) | Required |
| **Date Created** | When the case was created in the system | Required |
| **Entered Queue Date** | When triage handed off to response specialist queue | Required |
| **Due Date / Deadline** | When the case must be completed | Required |
| **Deadline Type** | Whether the deadline is an internal SLA or court-imposed | Required |
| **Financial Penalty Flag** | Whether fines are attached if the deadline is missed | Required |
| **Current Blockers** | What the case is waiting on (e.g., "Waiting on data from Mojang team") | Required |
| **Agency** | The law enforcement agency that submitted the request | Required |
| **Services** | Which Microsoft services are involved (shown as icons — see 1.3) | Required |
| **Age / Days in Queue** | Calculated field: how long the case has been sitting in the queue | Desired |
| **Case State** | Whether it's a reactivated request, blocked, new, etc. | Desired |
| **Assigned To** | Who currently owns the case | Required |

### 1.3 Service Icons Column

Instead of text labels for services (which would crowd the view), use small recognizable icons:

> "If you've got a services column and maybe just have like the Skype symbol or the Teams symbol or the Xbox symbol or the Outlook logo... you could probably fit about 20 icons along there and still only take up the same amount of space."

David added: "Even just a little colored block."

**Implementation:**
- Display service icons in a compact grid within a single column cell
- Icons should be small enough for 2 rows within a single row height
- Each service gets a distinct icon (Xbox, Teams, Outlook, Azure, Bing, BitLocker, Skype, etc.)
- On hover/click, show full service names as tooltip

### 1.4 Identifier Count Display

Show identifier breakdown, not just total count:

> "4 brackets, one, which would mean to me 4 identifiers that came in from them and one that I've created [supplemental]."

**Format:** `4 (+1)` where 4 = submitted identifiers, 1 = supplemental identifiers created by the response specialist.

---

## 2. Filtering & Sorting

### 2.1 Column Filtering

Every column in the list view should support:
- **Text "contains" filter** on text columns (e.g., title contains "fed" to find federal cases)
- **Date range filter** on date columns
- **Sort ascending/descending** on any column (especially date received — oldest to newest)
- **Multi-value filter** (e.g., filter by multiple countries simultaneously)

### 2.2 Title Line Shorthand Tags (Currently Manual)

Response specialists currently embed shorthand codes in case titles to indicate key attributes. These should become structured, filterable fields:

| Current Shorthand | Meaning |
|-------------------|---------|
| **Fed** | Federal case |
| **CE** | Child Exploitation (high priority) |
| **CO** | Court Order |
| **PIP** | Preservation In Progress |
| **+25** | More than 25 identifiers |
| **Match** | NDO requirement match found |
| **Xbox**, **Bing**, **BitLocker**, **Teams** | Specific service flagged as notable |

**Engineering requirement:** These should be structured metadata fields on the case, not freetext in titles. The system should auto-populate service tags from identifier/account lookup results.

### 2.3 Queue View Selector

Users need to switch between different queue views:

- **My Active Requests** (personal queue — default home)
- **Cases Available to Work On** (shared fulfillment queue)
- **Queue-specific views** (e.g., US JT Fulfillment, EEA queue, Azure queue)
- **Custom/saved views** (user-created filtered views)

**Pain point:** In current CRM, switching views retains previous filter state, which is confusing and annoying. Each view should load with its own saved filter state, not carry over from the previous view.

### 2.4 Weekly Focus Filter ("What am I working on this week?")

**Key workflow insight:** Each Tuesday morning, managers assign weekly priorities to response specialists. Priorities are defined by combinations of:

- **Country/Region** (e.g., US, Brazil, India, EEA)
- **Case Type** (e.g., Federal, State/Local, CE)
- **Service** (e.g., Azure)
- **Priority level** (e.g., financial penalty, high priority crimes)

**Feature: Weekly Focus Profile**

Allow users (or managers) to set a "weekly focus" that automatically filters the queue view:

> "The ability to put those types of things into a like, this is my page... this is what I'm assigned to this week."

- User sets: "This week I'm working on: Azure (non-US, non-preservation) + US Federal + oldest in US JTQ"
- Queue view auto-filters to show only matching cases
- Could be set via natural language prompt to AI/Copilot: "I'm assigned to these things this week"
- Managers (Shane, Jessalyn) should be able to set focus profiles for their team members

**Priority order example from weekly briefing:**
1. Brazil financial penalty priority escalations
2. Azure (first)
3. US Federal
4. US CE cases
5. Brazil content
6. Oldest in US JTQ
7. EEA older than 5 days
8. EEA older than 10 days
9. EEA high priority

---

## 3. Case Search

### 3.1 Search by Request Number (LNS Number)

**Current behavior:** User pastes an LNS number into a search bar, result appears, and clicking navigates to the case. However, from search results, users cannot "pick" the case — they can only "assign" it, which doesn't work the same as picking from the queue view.

**Requirement:** Search results must support the same actions as the queue view, including **Pick** (which both assigns and marks as "worked by me") and **Release**.

### 3.2 Multi-Request Search

Users sometimes receive a list of specific request numbers from managers in weekly briefings:

> "Searching multiple requests by their LNS number... that will be something that's useful."

**Requirement:** Support pasting/entering multiple request numbers and returning all matching cases in a single list view, with full pick/release capabilities.

### 3.3 Search by Identifier

Users search for identifiers to:
1. **Check for duplicates** — Has this identifier been submitted before? (same agency resubmitting)
2. **Check for related cases** — Is there a preservation request for this identifier?
3. **Check for cross-agency overlap** — Are multiple agencies requesting data on the same identifier?

**Search results for identifier search should show:**
- All requests containing that identifier
- The LNS/request number for each
- Which agency submitted each request
- The request type (preservation, production, etc.)
- How many total identifiers are in each request (context: is this identifier 1-of-1 or 1-of-25?)

> "If you put like a block of three names in a search identifiers, you'd want to know that all three of these names are the only three identifiers in this request, because that would probably be a preservation."

### 3.4 Search by Contact

Searching for law enforcement contacts requires a separate view/entity in the current system. In DARS, contact search should be integrated into the unified search experience.

### 3.5 Search Entity Types

The search bar should support searching across multiple entity types with clear disambiguation:

| Entity | Examples |
|--------|----------|
| **Request/Case** | LNS number, case title |
| **Identifier** | Email address, phone number, gamertag, IP address, serial number, Skype name, 5x5 token, subscription ID, tenant ID |
| **Contact** | Law enforcement officer name, agency name |

### 3.6 Duplicate Detection / Cross-Reference Alerts

When working on a case, the system should proactively flag:
- **Same identifier in other requests** — "This identifier also appears in LNS-12345 (submitted by same agency 2 weeks ago)"
- **Same identifier + same date range** — "Data package from LNS-12345 covers the same date range and could be reused"
- **Multiple agencies, same identifier** — "3 agencies have submitted requests for this identifier" (common with India bomb threat scenarios)

> "Something where you could stick an identifier in and CRM go, hey, do you know that this agency has the exact same identifier with either a similar or the exact same time frame."

---

## 4. Case Actions from List View

### 4.1 Pick

- Assigns case to the user AND marks it as "worked by me"
- Must be available from ALL views (queue view, search results, etc.)
- Current CRM only allows Pick from certain queue views — this limitation must not carry over

### 4.2 Release

- Releases a case from personal queue back to the shared queue
- Must be available from ALL views
- Current CRM restricts Release to specific queue views — this must be fixed

> "You can't do that from all the views though. You've got to be in the queue view in order to be able to release it."

### 4.3 Assign

- Assign a case to another team member
- Different from Pick: Assign does not mark the case as "worked by me"

---

## 5. Backend Data Model Requirements

### 5.1 Date Fields

| Field | Description |
|-------|-------------|
| `date_served` | When the legal demand was authorized/served on Microsoft (the legal clock start) |
| `date_received` | When Microsoft actually received the request |
| `date_created` | When the case was created in the system |
| `date_entered_queue` | When triage completed and case entered the fulfillment queue |
| `date_picked` | When a response specialist picked the case |
| `date_due` | Deadline for completion |
| `date_modified` | Last user modification |
| `date_system_modified` | Last system/automated modification |

### 5.2 Case Metadata

| Field | Type | Notes |
|-------|------|-------|
| `request_number` | String | LNS number or DARS equivalent |
| `country` | String/Enum | Country the case relates to |
| `region` | Enum | US, EEA, International, etc. |
| `jurisdiction` | Enum | Federal, State/Local, International |
| `request_type` | Enum | Court Order, Search Warrant, Subpoena, Preservation, Emergency, Internal |
| `category` | String | Case category |
| `crime_type` | Enum | CE (Child Exploitation), Financial, Terrorism, etc. — for priority flagging |
| `priority` | Enum | High, Standard, Low |
| `has_financial_penalty` | Boolean | Fines attached to deadline |
| `deadline_type` | Enum | SLA, Court-imposed, Agency-requested |
| `current_blockers` | String[] | List of current blockers (e.g., "Awaiting Mojang data") |
| `case_state` | Enum | New, Active, Reactivated, Blocked, Completed |
| `assigned_to` | User | Current owner |
| `queue` | String | Current queue assignment |

### 5.3 Identifier Model

| Field | Type | Notes |
|-------|------|-------|
| `identifier_value` | String | The actual identifier (email, gamertag, etc.) |
| `identifier_type` | Enum | Email, Phone, GamerTag, SkypeName, IP, SerialNumber, 5x5Token, SubscriptionID, TenantID, CreditCard, etc. |
| `source` | Enum | Submitted (from LE), Supplemental (created by RS) |
| `associated_service` | String[] | Which Microsoft services this identifier maps to (auto-populated from account lookup) |
| `request_id` | FK | The case this identifier belongs to |

### 5.4 Service Lookup (Account Check)

The system should support automated service lookup per identifier:
- Pass identifier to each requested Microsoft service
- Return: exists (yes/no), account type, account creation date
- Populate `associated_service` on the identifier record
- Surface results in the case list view as service icons

### 5.5 Weekly Focus / Assignment Profile

| Field | Type | Notes |
|-------|------|-------|
| `user_id` | FK | The response specialist |
| `week_start` | Date | Monday of the assignment week |
| `focus_criteria` | JSON | Array of filter criteria (country, region, jurisdiction, service, request_type, etc.) |
| `priority_order` | Int | Order in which focus areas should be worked |
| `set_by` | FK | Manager who assigned this focus |

---

## 6. UX Requirements

### 6.1 Font Choice

**Critical requirement:** Use a monospace or disambiguated font where `l` (lowercase L), `I` (uppercase i), `1` (one), `O` (uppercase o), and `0` (zero) are visually distinct.

> "The font that we use for CRM is foolish because we have the L that can be a capital I as well as a lowercase i... there should really never be a time when we're looking at stuff going, is that a little I or is that a small L?"

This is operationally critical because identifiers (gamertags, email addresses, serial numbers) contain these characters and must be transcribed accurately.

### 6.2 Column Customization

Users must be able to:
- Add/remove columns from the list view
- Reorder columns via drag-and-drop
- Save customized column layouts per view
- Available columns should be clearly named and searchable (current CRM has too many ambiguously named fields)

### 6.3 Saved Views / Filters

- Filters should persist per view (not leak between views)
- Users can save custom views with specific column layouts + filters
- Shared views can be published to the team by managers

### 6.4 View Density Options

Support at least two density modes:
- **Compact** (default for queue browsing) — one-line per case, maximum cases visible
- **Comfortable/Card** (for personal queue) — more detail per case, card layout

---

## 7. Key Personas & Workflows

### 7.1 Response Specialist (Dale, David)

**Daily workflow:**
1. Open DARS, land on "My Active Requests" (personal queue)
2. Check weekly focus assignments (set by managers every Tuesday)
3. Navigate to appropriate queue view (e.g., US JT Fulfillment)
4. Apply filters based on weekly focus (e.g., country = US, type = Federal)
5. Sort by oldest first or priority
6. Pick cases in small batches (David prefers small batches; Dale takes what he can chew)
7. Work cases, checking identifiers against prior requests
8. Release unpicked cases if priorities change mid-week

### 7.2 Manager / Workforce Planner (Shane, Jessalyn)

**Weekly workflow:**
1. Review queue backlogs by country/region
2. Identify priority areas (where backlogs are growing, financial penalties pending)
3. Assign weekly focus profiles to team members
4. Monitor queue throughput during the week
5. Adjust assignments as needed (can change daily)

---

## 8. Out of Scope (Noted but Not Specified Here)

- Data package reuse across duplicate requests (policy validation needed)
- AI/Copilot integration for natural language queue filtering
- Automated triage and case routing
- Account lookup / service verification implementation details
