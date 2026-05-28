# Weekly Focus Profile — Product Specification

**Parent spec:** DARS Case List View & Search
**Source:** Queue Management Workshop (Dale Ayers, David Large — CELA Response Specialists)

---

## Overview

Each week, managers (Shane, Jessalyn) determine what backlog areas the team should prioritize and assign each Response Specialist (RS) a set of focus areas. Today this is done manually in a Tuesday meeting, communicated via a shared slide/document, and each RS must then manually navigate and filter CRM case views to find matching cases.

This feature replaces that manual process with a structured, system-driven workflow:

```
Manager monitors LENS Health
  → defines Assignment Groups with health thresholds
  → qualifies RS users (skills, training, clearance)
  → builds Weekly Focus Profiles based on health signals + capacity
  → RS lands on a pre-filtered case list matching their profile
  → RS picks cases to work on
  → system tracks throughput back into LENS Health metrics
  → forecasting engine projects future staffing needs
```

The system forms a closed loop: health metrics inform assignments, assignments drive throughput, throughput feeds back into health metrics and forecasting.

---

## 1. Personas

### 1.1 Workforce Planner (Manager)

**Who:** Shane (GMT), Jessalyn (US), Ian Doyle, team leads
**Cadence:** Weekly (Tuesday mornings), with ad-hoc adjustments daily
**Goal:** Distribute case backlog across the team based on priority, skill, and capacity

**What they do today:**
- Review case volumes by country/region/type
- Identify where backlogs are growing, where financial penalties are pending
- Build a priority-ordered list per RS in a slide deck or shared doc
- Present it at Tuesday team meeting
- Manually adjust mid-week via Teams chat when priorities shift

### 1.2 Response Specialist (RS)

**Who:** Dale, David, and ~20+ RS across GMT and US teams
**Cadence:** Daily — check assignments, pick cases, work cases
**Goal:** Know exactly what to work on, in what order, without manually configuring case filters

**What they do today:**
- Attend Tuesday briefing, note their assignments
- Navigate to a case view in CRM
- Manually filter by country, type, etc. to find matching cases
- Pick cases one at a time or in small batches
- If priorities change mid-week, re-navigate and re-filter manually

---

## 2. Concepts

### 2.1 Assignment Group

A named, reusable set of filter criteria that describes a category of work. Managers create and maintain these.

Examples from the workshop:

| Assignment Group Name | Criteria |
|----------------------|----------|
| US Federal | country = US, jurisdiction = Federal |
| US Federal — CE | country = US, jurisdiction = Federal, crime_type = CE |
| US State & Local | country = US, jurisdiction = State/Local |
| US State & Local (from July) | country = US, jurisdiction = State/Local, date_received >= 2025-07-01 |
| EEA Older Than 5 Days | region = EEA, days_in_queue > 5 |
| EEA Older Than 10 Days | region = EEA, days_in_queue > 10 |
| EEA High Priority | region = EEA, priority = High |
| Azure (non-US, non-preservation) | service = Azure, country ≠ US, request_type ≠ Preservation |
| Azure (US) | service = Azure, country = US |
| Brazil Financial Penalty | country = Brazil, has_financial_penalty = true |
| India Emergency | country = India, priority = High |
| Preservations | request_type = Preservation |
| Oldest in US JTQ | queue = US JT Fulfillment, sort = date_received ASC |

### 2.2 LENS Health

LENS Health is the operational measurement of whether an Assignment Group is being serviced adequately. It is not a single number — it is a composite of demand signals, capacity signals, and risk signals that together tell a manager: "This area needs more people," "This area is under control," or "This area is about to breach."

**LENS Health is defined per Assignment Group.** Each group carries its own thresholds, because a 5-day-old US Federal CE case is a crisis, while a 5-day-old routine state/local case may be acceptable.

See **Section 3** for the full LENS Health model.

### 2.3 Qualification

A structured record of which RS users are qualified to work cases in a given Assignment Group. Qualifications are not binary — they carry skill level, training history, and capacity constraints that feed into both assignment decisions and staffing forecasts.

**Why qualifications matter beyond just "can they do it":**
- A manager needs to know not just *who* can work Azure cases, but *how many* qualified Azure RS they have, what their throughput is, and whether that's enough for next week's projected volume
- If only 2 of 20 RS can handle Azure and Azure volume doubles, that's a staffing gap the system should surface *before* the backlog forms
- Qualifications are the bridge between LENS Health (demand) and workforce capacity (supply)

**Qualification dimensions:**

| Dimension | Description | Example |
|-----------|-------------|---------|
| **Skill** | What training/certification the RS has completed | Azure tooling, Preservation workflow, CE clearance |
| **Proficiency** | Self-assessed or manager-assessed level | Trainee, Competent, Expert |
| **Throughput Rate** | Historical cases completed per day in this group | 4.2 cases/day for US Federal |
| **Max Concurrent** | How many active cases from this group the RS should carry | 3 for complex Azure, 8 for routine state/local |
| **Availability** | Hours per week the RS is available for this group | 20 hrs (if splitting time across groups) |
| **Training Date** | When the RS was qualified | 2025-03-15 |
| **Expiry/Recertification** | If qualification lapses without refresher | Annual for CE clearance |

Examples from the workshop:
- Only Dale and Shane are currently trained on Azure
- Some RS specialize in preservations
- CE cases may require specific clearance or experience
- IP team has dedicated preservation specialists
- David prefers small batches; Dale takes a week's worth — different working styles affect capacity

### 2.4 Weekly Focus Profile

A prioritized list of Assignment Groups assigned to a specific RS for a given week. Determines what that RS sees when they open their case list.

Example — Dale's focus profile for the week:

| Priority | Assignment Group |
|----------|-----------------|
| 1 | Azure (non-US, non-preservation) |
| 2 | US Federal |
| 3 | Oldest in US JTQ |

Example — another RS's focus profile:

| Priority | Assignment Group |
|----------|-----------------|
| 1 | US Federal — CE |
| 2 | EEA High Priority |
| 3 | EEA Older Than 5 Days |
| 4 | Preservations |

---

## 3. LENS Health, Qualifications & Forecasting

These topics are fully specified in a dedicated document:

**See: [DARS Case Health Management](DARS_Case_Health_Management.md)**

That spec covers (from the Manager persona):
- **Case Scoring:** Case Health Index (CHI-1 through CHI-5) and Complexity Score — auto-calculated urgency + effort prediction
- **Auto-Escalation:** Time-based rules that promote case severity as deadlines approach
- **Case Aging States:** Normal → Aging → Stale → Dormant (Dormant excluded from active metrics)
- **LENS Health Metrics:** Demand, Risk, and Capacity metrics per Assignment Group
- **Health Thresholds:** Manager-configurable targets that determine health status (Healthy → Watch → Warning → Critical)
- **Operating Modes / Surge Protocols:** Normal → Elevated → Surge → Crisis with specific behavioral changes
- **LENS Health Dashboard:** Manager's primary planning interface with CHI breakdown, alerts, and drill-downs
- **Qualification Management:** Coverage matrix, RS capability profiles, cross-training recommendations
- **Staffing Forecasts:** Week-by-week projections, capacity gap analysis, scenario modeling ("What If"), and proactive alerts
- **Case Handoff Protocol:** Structured transfer between RS with context and acknowledgment

The Weekly Focus Profile spec (this document) consumes health signals and qualification data as inputs to the Focus Profile assignment workflow below.

---

## 4. Manager Workflow: Create & Assign Focus Profiles

### 4.1 Step 1 — Review LENS Health

The manager opens the LENS Health Dashboard (see [DARS Case Health Management](DARS_Case_Health_Management.md), Section 8) and reviews:

1. Which groups are Critical/Warning? → these need more RS assigned
2. Which groups are Healthy with excess capacity? → RS can be reallocated
3. What does the 4-week forecast show? → are problems coming?
4. Are there any proactive alerts? → certification expirations, leave gaps
5. What operating mode are we in? → Surge/Crisis changes what RS see

> "The thing that dictates what is the priority is who we owe, who we owe requests to." — Dale

The dashboard replaces the manual pre-meeting case counting that Shane/Jessalyn do today.

### 4.2 Step 2 — Manage Assignment Groups

**Create/edit Assignment Groups:**

- Name the group (e.g., "US Federal — CE")
- Define filter criteria using structured fields:
  - Country / Region
  - Jurisdiction (Federal, State/Local, International)
  - Request Type (Court Order, Search Warrant, Preservation, etc.)
  - Crime Type (CE, Financial, Terrorism, etc.)
  - Service (Azure, Xbox, Teams, etc.)
  - Priority level
  - Financial penalty (yes/no)
  - Age threshold (days in system)
  - Date range (date_received after/before)
  - Case pool name
- Preview: show count of currently matching cases
- Save as reusable group

**Assignment Groups are org-level objects** — created by managers, visible to the whole team. They persist across weeks. Managers reuse them week to week, creating new ones only when priorities shift (e.g., a new country backlog emerges).

### 4.3 Step 3 — Review Qualifications

The manager reviews the Qualification Coverage Matrix (see [DARS Case Health Management](DARS_Case_Health_Management.md), Section 9) to verify RS are qualified for groups they'll be assigned.

**Rules enforced by the system:**
- A manager can only assign an RS to a Focus Profile that includes Assignment Groups they are qualified for
- If an RS is not qualified for a group, the system prevents assignment and prompts the manager
- Qualifications can be updated at any time (e.g., when someone completes Azure training)
- During Crisis operating mode, managers can grant emergency qualifications (auto-expiring)
- Bulk operations: "Add all GMT RS to this group", "Remove user from all groups"

### 4.4 Step 4 — Build Weekly Focus Profiles

The manager builds a Focus Profile for each RS:

**UI: Drag-and-drop priority list builder**

1. Select an RS user (or build a template for multiple RS)
2. Add Assignment Groups from the available list (filtered to groups the RS is qualified for)
3. Drag to set priority order (1 = work first, 2 = work next, etc.)
4. Set the effective week (defaults to current week)
5. Save / Publish

**Bulk assignment:** Manager should be able to:
- Apply the same profile to multiple RS users at once ("Everyone on GMT gets US Federal + EEA this week")
- Clone last week's profiles and adjust
- Use a template: "Same as last week but swap Brazil for India"

**Publishing:** When the manager saves/publishes, each assigned RS receives a notification:
- "Your focus for this week has been updated by Shane"
- Links directly to their filtered case view

### 4.5 Step 5 — Mid-Week Adjustments

Priorities change frequently — daily or even hourly:

> "That can change from weekly to daily. All of a sudden, right, we need to switch tack." — David

**Manager actions:**
- Edit an RS's Focus Profile at any time
- Add/remove Assignment Groups
- Re-order priorities
- RS is notified of changes
- Cases already picked by the RS are not affected (they keep working those)
- Only the "available to pick" list updates

---

## 5. RS Workflow: View & Pick Cases

### 5.1 Landing Page — "My Focus This Week"

When an RS opens DARS, they see:

**Section 1: My Active Cases** (cases already picked / in progress)
- Compact table view of cases they own
- Sorted by deadline urgency

**Section 2: Available Cases (Matching My Focus Profile)**
- Cases from the shared case pool that match their assigned Focus Profile criteria
- Organized by Assignment Group, in priority order

Layout concept:

```
┌─────────────────────────────────────────────────────┐
│  MY ACTIVE CASES (3)                        [View All] │
│  ┌───────┬──────┬─────────┬────────┬───────────────┐ │
│  │ LNS#  │ 🇺🇸  │ Fed CO  │ Due 3/28│ ⚠ Penalty    │ │
│  │ LNS#  │ 🇧🇷  │ Preserv │ Due 4/1 │              │ │
│  │ LNS#  │ 🇮🇳  │ Emerg   │ Due 3/27│ ⚠ Penalty    │ │
│  └───────┴──────┴─────────┴────────┴───────────────┘ │
│                                                       │
│  AVAILABLE TO PICK                                    │
│                                                       │
│  ① Azure (non-US, non-preservation)  — 12 cases      │
│  ┌───────┬──────┬─────────┬────────┬──────┬─────────┐│
│  │ LNS#  │ 🇬🇧  │ CO      │ 3 days │ 5 ID │ [Pick] ││
│  │ LNS#  │ 🇩🇪  │ SW      │ 7 days │ 2 ID │ [Pick] ││
│  │ ...   │      │         │        │      │         ││
│  └───────┴──────┴─────────┴────────┴──────┴─────────┘│
│                                                       │
│  ② US Federal  — 47 cases                             │
│  ┌───────┬──────┬─────────┬────────┬──────┬─────────┐│
│  │ LNS#  │ 🇺🇸  │ Fed SW  │ 12 days│ 8 ID │ [Pick] ││
│  │ ...   │      │         │        │      │         ││
│  └───────┴──────┴─────────┴────────┴──────┴─────────┘│
│                                                       │
│  ③ Oldest in US JTQ  — 203 cases                      │
│  ┌───────┬──────┬─────────┬────────┬──────┬─────────┐│
│  │ ...   │      │         │        │      │         ││
│  └───────┴──────┴─────────┴────────┴──────┴─────────┘│
└─────────────────────────────────────────────────────┘
```

### 5.2 Picking Cases

From the "Available to Pick" list:

- **Single pick:** Click "Pick" on a row → case moves to "My Active Cases", assigned to the RS
- **Batch pick:** Select multiple checkboxes → "Pick Selected" → all move to active
- **Pick locks the case** — other RS cannot pick the same case simultaneously
- Small batch picking is the recommended pattern (David's preference):

> "Taking smaller batches I found has been better... you're not supposed to keep stuff in your personal queue in case you go on leave." — David

### 5.3 Releasing Cases

If priorities change or the RS can't finish:

- Select case(s) from "My Active Cases"
- Click "Release" → case returns to the shared case pool, unassigned
- Release must be available from ANY view (a current CRM pain point)
- Released cases become available to other RS immediately

### 5.4 Switching Focus Mid-Session

If the RS wants to browse outside their assigned focus (e.g., helping with an ad-hoc request):

- "Browse All Cases" option that shows the full unfiltered case list
- They can still pick/release from any case pool they are qualified for
- Their Focus Profile remains unchanged — it's a lens, not a restriction

### 5.5 No Focus Profile Assigned

If a manager hasn't set a Focus Profile for the RS this week:

- Show "My Active Cases" section normally
- Show "Available to Pick" with a prompt: "No focus set for this week. Browse all cases or contact your manager."
- The RS can still browse and pick from any case pool they are qualified for

---

## 6. Backend Data Model

### 6.1 Assignment Group

```
AssignmentGroup {
  id: UUID
  name: String                    -- "US Federal — CE"
  description: String             -- optional, human-readable context
  created_by: FK → User           -- manager who created it
  criteria: FilterCriteria        -- structured filter definition (see 5.4)
  is_active: Boolean              -- soft delete / archive
  created_at: DateTime
  updated_at: DateTime
}
```

### 6.2 Qualification

See [DARS Case Health Management](DARS_Case_Health_Management.md), Section 9.1 for the full Qualification schema (includes proficiency, throughput, certification expiry, emergency grants).

### 6.3 Weekly Focus Profile

```
WeeklyFocusProfile {
  id: UUID
  user_id: FK → User              -- the RS this profile is for
  week_start: Date                -- Monday of the effective week
  created_by: FK → User           -- manager who assigned it
  created_at: DateTime
  updated_at: DateTime
  is_active: Boolean              -- current/superseded
}

FocusProfileEntry {
  id: UUID
  profile_id: FK → WeeklyFocusProfile
  assignment_group_id: FK → AssignmentGroup
  priority_order: Int             -- 1 = highest priority
}
```

### 6.4 Filter Criteria Schema

Assignment Groups define their matching criteria as structured JSON:

```
FilterCriteria {
  country: String[]?              -- ["US"] or ["US", "CA"]
  country_exclude: String[]?      -- ["US"] (for "non-US")
  region: Enum[]?                 -- [EEA, APAC, LATAM, ...]
  jurisdiction: Enum[]?           -- [Federal, StateLocal, International]
  request_type: Enum[]?           -- [CourtOrder, SearchWarrant, Preservation, ...]
  request_type_exclude: Enum[]?   -- [Preservation]
  crime_type: Enum[]?             -- [CE, Financial, Terrorism, ...]
  service: String[]?              -- ["Azure", "Xbox"]
  service_exclude: String[]?      -- exclude specific services
  priority: Enum[]?               -- [High, Standard]
  has_financial_penalty: Boolean?
  min_days_in_queue: Int?         -- e.g., 5 for "older than 5 days"
  max_days_in_queue: Int?
  date_received_after: Date?      -- e.g., "from July" = 2025-07-01
  date_received_before: Date?
  queue: String[]?                -- specific queue names
  sort_field: String?             -- default sort for this group
  sort_direction: Enum?           -- ASC / DESC
}
```

**Evaluation:** A case matches an Assignment Group if it satisfies ALL specified criteria (AND logic). Null/omitted fields are not evaluated (wildcard).

### 6.5 Health, Forecast & Handoff Schemas

See [DARS Case Health Management](DARS_Case_Health_Management.md), Section 12 for:
- HealthThresholds, LensHealthSnapshot (daily time-series), StaffingForecast
- CaseHandoff, AutoEscalationEvent, OperatingModeChange

### 6.6 Focus Profile Change Log

Track mid-week adjustments for audit and communication:

```
FocusProfileChangeLog {
  id: UUID
  profile_id: FK → WeeklyFocusProfile
  changed_by: FK → User
  changed_at: DateTime
  change_type: Enum               -- Created, EntryAdded, EntryRemoved, ReOrdered, Deactivated
  details: JSON                   -- what changed
}
```

---

## 7. Notifications

| Event | Recipient | Channel |
|-------|-----------|---------|
| Focus Profile published for the week | RS | In-app banner + optional email/Teams |
| Focus Profile updated mid-week | RS | In-app banner + optional Teams |
| Assignment Group criteria changed | All RS with profiles referencing it | In-app |
| RS qualification granted | RS | In-app + email |
| RS qualification revoked | RS | In-app + email |
| Case picked by another RS (race condition) | RS who attempted pick | In-app toast: "This case was just picked by [name]" |
| LENS Health status changed to Warning/Critical | Manager | In-app + Teams |
| Staffing forecast projects capacity gap in 2+ weeks | Manager | Weekly digest email |
| Volume spike detected (3+ days above 2x avg) | Manager | In-app + Teams |
| RS certification expiring within 30 days | Manager + RS | In-app + email |
| Leave approval creates capacity gap | Manager | In-app |
| Single-point-of-failure: only 1 RS qualified for active group | Manager | In-app + email |

---

## 8. Permissions

| Action | Roles |
|--------|-------|
| Create/edit Assignment Groups | Manager, Workforce Planner |
| Grant/revoke Qualifications | Manager, Workforce Planner |
| Create/edit Focus Profiles for others | Manager, Workforce Planner |
| View own Focus Profile | RS |
| Pick/Release cases within qualified groups | RS |
| Browse all cases | RS (read-only for unqualified groups) |
| View LENS Health dashboard | Manager, Workforce Planner, RS (limited) |
| Configure health thresholds | Manager, Workforce Planner |
| View staffing forecasts | Manager, Workforce Planner |
| Run forecast simulations | Manager, Workforce Planner |
| View qualification coverage matrix | Manager, Workforce Planner |
| View own capability profile | RS |

---

## 9. Edge Cases

### 9.1 Overlapping Assignment Groups

A single case may match multiple Assignment Groups in an RS's profile (e.g., a US Federal Azure case matches both "US Federal" and "Azure").

**Resolution:** Show the case under the highest-priority group only. Do not duplicate across groups.

### 9.2 Case Picked While RS Is Browsing

Another RS picks a case that's currently displayed in the first RS's available list.

**Resolution:** Optimistic UI — when the RS clicks "Pick", the system checks availability. If already picked, show: "This case was just picked by [name]. Refreshing your list." Remove the case from the list.

### 9.3 RS Goes on Leave Mid-Week

Cases in their active cases should be visible to managers for reassignment or bulk release.

**Manager action:** "Release all of [RS name]'s active cases back to case pool" — available from the manager's workforce planning view.

### 9.4 No Matching Cases

An Assignment Group in the RS's profile has zero matching cases this week.

**Display:** Show the group header with "0 cases — All caught up" rather than hiding it entirely, so the RS knows the system checked.

### 9.5 Assignment Group Criteria Change After Profiles Are Published

If a manager edits an Assignment Group's criteria after Focus Profiles referencing it are active:

- Already-picked cases are not affected
- The "Available to Pick" list refreshes to match updated criteria
- Affected RS users are notified

### 9.6 Cross-Region Coordination

GMT and US teams have separate managers (Shane vs. Jessalyn) but share some case pools.

**Resolution:** Assignment Groups are global. Qualifications and Focus Profiles are scoped per manager. A case can only be picked once regardless of which team the RS belongs to.

---

### 9.7 Forecast Accuracy Degrades Over Time

Forecasts beyond 4 weeks become unreliable due to shifting priorities and external events.

**Resolution:** Show confidence intervals that widen with time horizon. Weeks 1-2: high confidence (solid line). Weeks 3-4: medium confidence (dashed line). Beyond: low confidence (dotted, labeled "speculative"). Encourage managers to re-run forecasts weekly rather than planning far out.

### 9.8 Throughput Data Missing for New Qualifications

A newly qualified RS has no historical throughput data, so capacity projections for their Assignment Group may be inaccurate.

**Resolution:** Use proficiency-level defaults until 30 days of data accumulate. Trainee = 40% of group avg. Competent = 80%. Expert = 110%. Flag in forecasts: "2 RS using estimated throughput (no history yet)."

---

## 10. Migration from Current Process

### Phase 1 — Structured Assignment Groups
- Managers create Assignment Groups in DARS based on their existing slide deck categories
- RS users continue to manually filter, but saved views now map to Assignment Groups

### Phase 2 — Qualifications & Focus Profiles
- Managers set qualifications (bulk import from existing knowledge of who can do what)
- Focus Profiles are published weekly; RS users land on pre-filtered views

### Phase 3 — LENS Health Dashboard & Thresholds
- Managers get the backlog/penalty/age dashboard to inform profile creation
- Configure health thresholds per Assignment Group
- Replaces manual case counting done before Tuesday meetings
- System begins capturing daily LensHealthSnapshot records for trending

### Phase 4 — Staffing Forecasts
- Historical data (from Phase 3 snapshots) powers inflow projections
- Qualification throughput baselines populated from Phase 2 activity
- Managers can run 4-week forecasts and "what if" simulations
- Cross-training recommendations generated from qualification coverage gaps

### Phase 5 — AI-Assisted Assignment (Future)
- Copilot suggests optimal Focus Profiles based on LENS Health, RS qualifications, and historical throughput
- RS can ask Copilot: "What should I work on next?" and get a recommendation
- Forecast model enhanced with ML for seasonal pattern detection and anomaly alerting
