# DARS Case Health Management — Product Specification

**Persona:** Workforce Planner / Manager (Shane, Jessalyn, Ian Doyle, team leads)
**Scope:** Everything the manager sees and does to monitor LENS Health, triage cases, manage RS qualifications, allocate capacity, and forecast staffing needs.
**Related specs:** Weekly Focus Profile (RS-facing workflow), DARS Case List View (RS-facing case list)

---

## 1. Problem Statement

Every Tuesday morning, Shane and Jessalyn manually count cases across CRM case views, eyeball ages, mentally map who's available, and build a slide deck assigning priorities. When India volume spikes on a Wednesday or David goes on leave Thursday, they scramble over Teams chat to re-shuffle.

They have no system-level answer to:
- Where are we hurting and how badly?
- Do we have enough qualified people to handle what's coming?
- What will the case volumes look like in 2 weeks if we don't change anything?
- If I move Dale from Azure to US Federal, what breaks?

This spec replaces that manual process with a structured, measurable, threshold-driven system that borrows triage patterns from emergency medicine, incident command, and air traffic control — domains where getting prioritization wrong has severe consequences.

---

## 2. Design Principles (Drawn from Crisis Management Systems)

These principles are derived from six reference systems evaluated against DARS needs. Each principle addresses a specific gap in the current design.

### 2.1 Urgency and complexity are separate axes (from ER/ESI)

ESI doesn't just ask "how sick is this patient?" — it asks "how many resources will this patient consume?" A simple urgent case and a complex non-urgent case need different handling. DARS must measure both.

**Applied:** Every case carries two scores — a **Severity Index** (how urgent) and a **Complexity Score** (how much RS effort). Capacity planning uses complexity-adjusted depth, not raw case count.

### 2.2 Re-triage is mandatory (from ER/ICU)

ER patients are reassessed while waiting. ICU patients are scored on trajectory (getting better or worse). A case that was low-priority yesterday may be critical today if its deadline is approaching.

**Applied:** Cases auto-escalate via time-based rules. Cases that stall for 90+ days are separated as Dormant to stop polluting active metrics.

### 2.3 Same inputs, same output (from 911/MPDS)

A 911 dispatcher follows a deterministic protocol. Two dispatchers given the same caller produce the same response code. DARS triage today relies on individual judgment and freetext title-line shorthands.

**Applied:** The Case Health Index is calculated automatically from structured case metadata. Triage team validates but doesn't invent the score.

### 2.4 Define what changes when overwhelmed (from ICS/START)

ICS has specific operating modes. START has an "Expectant" category for patients who won't benefit from scarce resources. Normal processes break under volume pressure — the system must define what replaces them.

**Applied:** Four operating modes (Normal → Elevated → Surge → Crisis) with explicit behavioral changes at each level, including Focus Profile overrides and deferral of low-severity work.

### 2.5 Span of control is finite (from ICS)

No supervisor manages more than 7 people. No responder handles more tasks than they can track. ICS enforces this structurally.

**Applied:** Dynamic caseload caps adjusted by case complexity. A Staged state between "Available" and "Active" gives RS a claim without commitment.

### 2.6 Handoffs are formalized (from ATC)

When a plane moves between ATC sectors, there's a specific protocol. Nothing is assumed. In DARS, cases transfer between RS with no structured context.

**Applied:** Structured handoff protocol with context notes, partial work transfer, and acknowledgment.

---

## 3. Case Scoring

### 3.1 Case Health Index (CHI)

A 5-level score calculated automatically from case metadata. Determines triage priority, case list sort order, and dashboard urgency. Inspired by the Emergency Severity Index.

```
CHI Decision Tree:

  Step 1 — Immediate legal or safety consequence?
    Court-imposed deadline within 5 days         → CHI-1 (Critical)
    Financial penalty deadline within 7 days      → CHI-1 (Critical)
    CE (child exploitation) crime type            → CHI-1 (Critical)
    Emergency request (threat to life)            → CHI-1 (Critical)

  Step 2 — At risk of breach?
    SLA breach within 14 days                     → CHI-2 (Urgent)
    Financial penalty attached (any deadline)      → CHI-2 (Urgent)
    High priority flag from requesting agency      → CHI-2 (Urgent)
    Reactivated case (was closed, reopened)        → CHI-2 (Urgent)

  Step 3 — Significant resource consumption?
    ComplexityScore = Heavy or Complex            → CHI-3 (Significant)
    Multi-service case (3+ services)              → CHI-3 (Significant)
    25+ identifiers                               → CHI-3 (Significant)

  Step 4 — Standard case
    Within SLA, standard complexity               → CHI-4 (Standard)

  Step 5 — Quick resolution
    Single identifier, single service, routine    → CHI-5 (Quick)
```

**CHI is dynamic.** A case enters as CHI-4 and auto-escalates to CHI-2 as its SLA deadline approaches, then to CHI-1 if a court deadline becomes imminent. The auto-escalation rules (Section 4) drive this.

**CHI can be overridden** by the triage team with a mandatory justification note. Overrides are auditable.

### 3.2 Complexity Score

Predicts how much RS effort a case will consume. Used for capacity planning and caseload caps.

```
ComplexityScore = weighted sum of:
  identifier_count            × 1.0
  service_count               × 2.0
  has_azure                   × 3.0   (specialized tooling)
  has_enterprise_ids          × 2.0   (tenant/subscription ID lookups)
  has_linked_preservation     × 1.5   (cross-reference work)
  request_type_weight:
    Preservation              = 1.0
    Subpoena                  = 1.5
    Search Warrant            = 2.0
    Court Order               = 2.5
    Emergency                 = 3.0
```

Mapped to effort tiers:

| Tier | Score Range | Estimated Effort | Example |
|------|------------|-----------------|---------|
| **Quick** | 0 - 3 | < 1 hour | 1 identifier, 1 service, subpoena |
| **Light** | 4 - 8 | 1-2 hours | 2-3 identifiers, 1-2 services |
| **Medium** | 9 - 15 | 2-4 hours | 5-8 identifiers, 2 services, search warrant |
| **Heavy** | 16 - 25 | 4-8 hours | 10+ identifiers, 3 services, court order |
| **Complex** | 26+ | 8+ hours / multi-day | 25+ identifiers, Azure + enterprise, preservation cross-ref |

### 3.3 Why Both Scores Matter

A case list of 20 cases could mean wildly different things:

| Scenario | CHI Mix | Complexity Mix | Real Workload | Action |
|----------|---------|---------------|--------------|--------|
| A | All CHI-4 | All Quick | ~10 RS-hours | 1 RS for 1-2 days |
| B | All CHI-1 | All Complex | ~200 RS-hours | 5+ RS for a full week, drop everything |
| C | 5 CHI-1, 15 CHI-5 | Mixed | ~40 RS-hours | Route CHI-5 to junior RS, senior RS on CHI-1 |

Case volume alone (all show "20 cases") is misleading without both scores.

---

## 4. Auto-Escalation & Re-Triage

Cases are living entities. Their severity changes as time passes and deadlines approach. The system reassesses automatically rather than relying on a human to notice.

### 4.1 Time-Based Escalation Rules

```
// SLA approaching
IF days_until_due <= sla_warning_days AND chi > 2:
  escalate CHI to 2 (Urgent)
  notify assigned RS + manager
  reason: "SLA breach in {days} days"

// Penalty deadline imminent
IF has_financial_penalty AND days_until_due <= 3:
  escalate CHI to 1 (Critical)
  notify manager immediately
  reason: "Financial penalty deadline in {days} days"

// Court deadline imminent
IF deadline_type = CourtImposed AND days_until_due <= 5:
  escalate CHI to 1 (Critical)
  reason: "Court-imposed deadline in {days} days"

// Unassigned and aging
IF assigned_to = null AND days_in_queue > (median_age × 2):
  flag: "Deteriorating — unassigned, aging beyond norm"
  surface to top of manager dashboard

// Blocker stagnation
IF has_active_blocker AND blocker_unchanged_days > 5:
  flag: "Stalled — blocked for {days} days"
  prompt assigned RS: "Is this still blocked? Update or resolve."

// Pick-but-no-activity
IF status = Picked AND days_since_last_activity > 3:
  flag: "Assigned but idle for {days} days"
  notify RS: "You picked this case {days} ago. Start or release?"
```

### 4.2 Case Aging States

Cases that age beyond normal lifecycle should not pollute active metrics. Inspired by ICU "step-down" — a stable patient doesn't occupy an ICU bed forever.

| State | Age | Treatment |
|-------|-----|-----------|
| **Normal** | 0 - 14 days | Standard. Counted in active case depth. |
| **Aging** | 15 - 30 days | Warning indicator in list view. Counted in active case depth. |
| **Stale** | 31 - 90 days | Manager alerted monthly. Still counted in depth but flagged. |
| **Dormant** | 91+ days | Excluded from active case depth metrics. Shown in separate "Dormant Cases" section. Requires monthly justification to keep open. |

**Dormant cases** must have a reason to remain open:
- "Awaiting court decision" (valid — set a review date)
- "Law enforcement unresponsive — pending closure" (valid — auto-close after 30 more days if no response)
- No reason provided → auto-flag for manager review → close if no action in 14 days

---

## 5. LENS Health — Measurement

LENS Health for each Assignment Group is the intersection of three dimensions: **Demand** (what's coming in), **Risk** (what's at stake), and **Capacity** (who can do it).

### 5.1 Demand Metrics

| Metric | Definition | Calculation |
|--------|-----------|-------------|
| **Case Depth** | Unassigned cases in this group | Count where assigned_to = null, case_aging_state ≠ Dormant |
| **Complexity-Adjusted Depth** | Case depth weighted by effort, not count | Sum of ComplexityScore for all unassigned cases ÷ avg ComplexityScore |
| **Inflow Rate** | Cases entering per day (7-day rolling) | New cases matching criteria in last 7 days ÷ 7 |
| **Completion Rate** | Cases completed per day (7-day rolling) | Closed cases from this group in last 7 days ÷ 7 |
| **Net Flow** | Growing or shrinking? | Inflow − Completion. Positive = growing |
| **Age Distribution** | Case ages by bucket | Count in: 0-2d, 3-5d, 6-10d, 11-30d, 30+d |
| **Median Age** | Typical wait time | Median of (now − date_entered_system) for unassigned |
| **Oldest Case** | Worst wait | Max of (now − date_entered_system) |
| **Staged Not Started** | Claimed but idle | Count where status = Staged AND days > 1 |
| **Weekly Trend** | Week-over-week direction | This week case depth vs. same day last week |

### 5.2 Risk Metrics

| Metric | Definition | Calculation |
|--------|-----------|-------------|
| **CHI-1 Backlog** | Critical cases unassigned | Count where chi = 1 AND assigned_to = null |
| **Penalty Exposure (count)** | Cases with fines attached | Count where has_financial_penalty = true AND open |
| **Penalty Exposure ($)** | Total fines at risk | Sum of penalty_amount where deadline approaching |
| **SLA Breach Count** | Already past due | Count where now > date_due AND open |
| **SLA Breach Imminent** | Will breach within N days | Count where date_due − now <= sla_warning_days AND open |
| **Court Deadline Imminent** | Court-imposed deadlines within 5 days | Count where deadline_type = Court AND date_due − now <= 5 |
| **CE Unassigned** | Child exploitation cases with no owner | Count where crime_type = CE AND assigned_to = null |
| **High Priority Unassigned** | High-priority, no owner | Count where priority = High AND assigned_to = null |
| **Reactivated Cases** | Reopened after closure | Count where case_state = Reactivated |
| **Avg Time-to-Pick** | How long cases wait before someone claims them | Avg of (date_picked − date_entered_system) last 30 days |
| **Avg Time-to-Complete** | Pick to completion | Avg of (date_completed − date_picked) last 30 days |
| **Dormant Count** | Cases > 90 days, still open | Count where case_aging_state = Dormant |
| **Re-open Rate** | Completed cases that bounce back | Reactivated in last 30 days ÷ Completed in last 30 days |
| **Handoff Failure Rate** | Transfers without context | Handoffs where context_note = null ÷ total handoffs |

### 5.3 Capacity Metrics

| Metric | Definition | Calculation |
|--------|-----------|-------------|
| **Qualified RS** | Total RS qualified for this group | Active Qualification records for this group |
| **Available RS** | Qualified, not on leave/on-call/maxed out | Qualified − (on leave + on-call + at max concurrent) |
| **Assigned RS** | RS with this group in active Focus Profile | FocusProfileEntry references to this group |
| **Total Capacity (cases/day)** | Estimated daily throughput | Sum of assigned RS avg_throughput_per_day |
| **Complexity-Adjusted Capacity** | Throughput weighted by case complexity | Total Capacity × (avg_group_complexity ÷ baseline_complexity) |
| **Capacity Utilization** | How stretched is the team? | Assigned RS hours ÷ Total available RS hours |
| **Days to Clear** | Time to eliminate backlog at current rate | Case Depth ÷ Completion Rate |
| **Capacity Gap** | Surplus or deficit | (Depth ÷ target_days_to_clear) − Total Capacity |
| **Caseload Utilization** | How full are individual RS? | Avg of (active_cases ÷ dynamic_cap) per assigned RS |
| **Single-Point-of-Failure** | Groups with ≤ 2 qualified RS | Flag where Qualified RS ≤ 2 |
| **Training Pipeline** | RS becoming qualified soon | Count where proficiency = Trainee |
| **Cross-Training Coverage** | Qualified ÷ minimum required | Qualified RS ÷ min_qualified_rs threshold |
| **Staging Depth** | Cases in Staged state per RS | Count where status = Staged, grouped by RS |
| **Time in Escalated Mode** | How long has this group been Warning/Critical? | Duration since health_status last changed from Healthy |

---

## 6. Health Thresholds (Manager-Configurable)

Each Assignment Group carries thresholds that turn raw metrics into actionable status signals. Managers set these based on operational knowledge — a 5-day SLA for CE cases, 14 days for routine requests.

```
HealthThresholds {
  assignment_group_id: FK

  // Demand
  max_queue_depth: Int?                  -- 50 → Warning
  critical_queue_depth: Int?             -- 100 → Critical
  max_median_age_days: Int?              -- 5 → Warning
  critical_median_age_days: Int?         -- 10 → Critical
  max_net_flow_per_day: Float?           -- +3.0 → Warning
  max_time_to_pick_days: Float?          -- 2.0 → cases shouldn't wait >2 days

  // Risk
  sla_target_days: Int                   -- 14 days from receipt
  sla_warning_days: Int                  -- 10 days → flag
  max_penalty_exposure_count: Int?       -- 5 → escalate
  max_sla_breach_count: Int?             -- 0 → any breach = Critical
  max_chi1_unassigned: Int?              -- 0 → any CHI-1 unassigned = Critical

  // Capacity
  min_qualified_rs: Int                  -- 4 → below this = staffing risk
  min_available_rs: Int                  -- 2 → below this = Critical
  target_days_to_clear: Int              -- 7 → queue should clear in 1 week
  max_capacity_utilization: Float        -- 0.85 → over 85% = strained
  max_caseload_utilization: Float        -- 0.90 → individual RS overloaded
}
```

### 6.1 Health Status Roll-Up

| Status | Meaning | Color |
|--------|---------|-------|
| **Healthy** | All metrics within thresholds. Stable or shrinking. | Green |
| **Watch** | Approaching thresholds. Net flow positive but manageable. | Yellow |
| **Warning** | Exceeding thresholds. Growing. Capacity strained. Action needed this week. | Orange |
| **Critical** | Breaches occurring. Penalties at risk. Capacity insufficient. Act now. | Red |

**Roll-up rules (evaluated in order, first match wins):**

1. ANY CHI-1 case unassigned for > 4 hours → Critical
2. SLA breach count > max_sla_breach_count → Critical
3. Case depth > critical_queue_depth → Critical
4. Single-point-of-failure AND that RS is on leave → Critical
5. Capacity gap > 0 AND net flow > 0 for 3+ days → Warning
6. Case depth > max_queue_depth → Warning
7. Median age > max_median_age_days → Warning
8. Any metric within 20% of threshold → Watch
9. All metrics within thresholds → Healthy

---

## 7. Operating Modes (Surge Protocol)

Inspired by ICS and mass-casualty triage. The system doesn't just report health — it changes behavior based on how bad things are.

Operating modes apply **per Assignment Group** or **system-wide** (if 3+ groups are Critical).

### 7.1 Normal

**Trigger:** All groups Healthy or Watch.

Standard workflow. RS works their Focus Profile. Manager reviews weekly.

### 7.2 Elevated

**Trigger:** Any group at Warning.

| Change | Description |
|--------|-------------|
| Manager alert | Manager alerted, expected to review within 4 hours |
| Capacity suggestion | RS with surplus capacity auto-offered cases from Warning groups they're qualified for |
| Volunteer toggle | RS can opt in: "Available to help with [group]" |
| Review cadence | Manager reviews this group daily instead of weekly |

### 7.3 Surge

**Trigger:** Any group at Critical OR 2+ groups at Warning.

| Change | Description |
|--------|-------------|
| Focus override | Critical group cases injected at top of all qualified RS case lists, regardless of their Focus Profile |
| Caseload increase | RS max concurrent limits increased by 25% |
| Fast-track routing | CHI-5 cases auto-routed to most junior qualified RS, freeing senior RS for complex work |
| Daily stand-up | Replaces weekly cadence. Manager checks group health daily with team |
| Deferral guidance | System suggests: "Consider deferring CHI-4/5 work in [other groups] to free capacity" |

### 7.4 Crisis

**Trigger:** 3+ groups at Critical OR CHI-1 backlog > 10 cases unassigned.

| Change | Description |
|--------|-------------|
| All Surge changes | Plus the following |
| Cross-region request | System alerts counterpart manager (GMT ↔ US) requesting support |
| Project work suspended | Non-case project work flagged as deferrable for all RS |
| Emergency qualification | Manager can temporarily grant qualification to RS not formally trained, flagged as "emergency — supervised" |
| Triage tightening | System recommends triage team increase rejection rigor on invalid/duplicate requests |
| Expectant deferral | CHI-4/5 cases explicitly parked. RS instructed: "Do not pick Standard/Quick cases until crisis resolves" |
| Escalation to leadership | Auto-notification to director-level if crisis persists > 48 hours |

### 7.5 De-Escalation

Operating mode steps down when triggers are no longer met for a sustained period:

- Crisis → Surge: when < 3 groups Critical for 24 hours
- Surge → Elevated: when no groups Critical for 48 hours
- Elevated → Normal: when no groups Warning for 72 hours

De-escalation is announced to the team: "US Federal returned to Normal. Standard Focus Profiles resume."

---

## 8. LENS Health Dashboard

The manager's primary interface. Built for the Tuesday morning planning session but useful daily.

### 8.1 Overview Panel

```
┌──────────────────────────────────────────────────────────────────────────┐
│  LENS HEALTH                                      Week of Mar 24, 2026   │
│  Operating Mode: ELEVATED (US Federal — CE at Warning)                   │
│                                                                          │
│  ● 1 Critical  ● 2 Warning  ● 3 Watch  ● 8 Healthy     [System alerts: 4]│
│                                                                          │
│  ┌──────────────────┬──────┬──────┬──────┬──────┬──────┬──────┬────────┐│
│  │ Assignment Group  │ CHI-1│ CHI-2│ CHI-3│ CHI-4│ CHI-5│ Total│ Health ││
│  ├──────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼────────┤│
│  │ US Federal — CE   │  5   │  8   │  4   │  6   │  0   │  23  │ 🔴     ││
│  │ Brazil Fin Pen    │  3   │  14  │  0   │  0   │  0   │  17  │ 🟠     ││
│  │ India Emergency   │  0   │  6   │  12  │  23  │  0   │  41  │ 🟠     ││
│  │ Azure (non-US)    │  0   │  2   │  5   │  3   │  2   │  12  │ 🟡     ││
│  │ US Federal        │  0   │  4   │  10  │  28  │  5   │  47  │ 🟡     ││
│  │ EEA > 10 Days     │  0   │  1   │  8   │  15  │  7   │  31  │ 🟡     ││
│  │ Preservations     │  0   │  0   │  4   │  10  │  5   │  19  │ 🟢     ││
│  │ US State & Local  │  0   │  0   │  1   │  5   │  2   │   8  │ 🟢     ││
│  └──────────────────┴──────┴──────┴──────┴──────┴──────┴──────┴────────┘│
│                                                                          │
│                    Depth   Age(med) Net/day  Risk     Capacity           │
│  US Federal — CE    23     8d       +4.1     3⚠ 0💰   2/4 RS assigned   │
│  Brazil Fin Pen     17     12d      +2.3     0⚠ 17💰  1/3 RS assigned   │
│  India Emergency    41     3d       +8.7     6⚠ 0💰   3/5 RS assigned   │
│                                                                          │
│  [Drill into group]  [Thresholds]  [Forecast →]  [Build Profiles →]     │
└──────────────────────────────────────────────────────────────────────────┘
```

Key differences from a raw case count: CHI breakdown shows that US Federal — CE has 5 Critical-severity cases — that's the real emergency, not the 47-case US Federal case list where most are CHI-4.

### 8.2 Group Drill-Down

Clicking into a group reveals:

**Metrics panel:** Full demand/risk/capacity metrics from Section 5
**Case list:** Sortable table (same columns as RS list view), sorted by CHI then age
**Trend charts:** Case depth, inflow rate, and completion rate over 4/8/12 weeks
**RS panel:** Qualified RS with individual throughput, current caseload, availability
**Inflow patterns:** Day-of-week heatmap, seasonal comparison to prior year
**Dormant cases:** Separate tab showing 90+ day cases with justification status

### 8.3 Alerts Panel

Active alerts aggregated from auto-escalation, forecasting, and threshold breaches:

```
┌──────────────────────────────────────────────────────────────────────┐
│  ALERTS (4 active)                                                    │
│                                                                      │
│  🔴 NOW   US Federal — CE: 2 CHI-1 cases unassigned > 4 hours       │
│           Action: Assign immediately or activate Surge protocol       │
│                                                                      │
│  🟠 TODAY Brazil Fin Penalty: 3 cases breach financial deadline in    │
│           5 days. Only 1 RS assigned.                                 │
│           Action: Assign 2 additional RS from qualified pool (5 avail)│
│                                                                      │
│  🟡 W14  US Federal: David on leave W14 reduces capacity by 22%.     │
│           Projected backlog grows to 61 → 106 over 2 weeks.          │
│           Action: Pre-assign 1 additional RS starting W14             │
│                                                                      │
│  🟡 W18  Azure: Only 2 qualified RS. If either unavailable,          │
│           single-point-of-failure. Training pipeline: 0.              │
│           Action: Begin cross-training 2 RS (4-week ramp)             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 9. Qualification Management

### 9.1 Qualification Record

```
Qualification {
  id: UUID
  assignment_group_id: FK → AssignmentGroup
  user_id: FK → User

  // Grant
  granted_by: FK → User
  granted_at: DateTime
  revoked_at: DateTime?
  revoke_reason: String?

  // Skill
  proficiency: Enum                 -- Trainee, Competent, Expert
  training_completed_at: Date?
  certification_expires_at: Date?
  is_emergency_grant: Boolean       -- temporary Crisis-mode qualification
  emergency_expires_at: DateTime?   -- auto-revoke after crisis
  notes: String?

  // Performance (system-calculated, rolling 30-day)
  avg_throughput_per_day: Float?
  avg_time_to_complete: Duration?
  max_concurrent_cases: Int?        -- manager-set cap
  quality_score: Float?
}
```

### 9.2 Coverage Matrix

Answers: "For each group, do I have enough qualified people?"

```
┌─────────────────────┬────────┬────────┬─────────┬─────────┬───────┬──────────┐
│ Assignment Group     │ Expert │ Compet │ Trainee │ Total   │ Need  │ Status   │
├─────────────────────┼────────┼────────┼─────────┼─────────┼───────┼──────────┤
│ Azure (non-US)       │ 1      │ 1      │ 0       │ 2       │ 4     │ 🔴 Gap   │
│ US Federal — CE      │ 3      │ 4      │ 1       │ 8       │ 6     │ ✓ OK     │
│ India Emergency      │ 1      │ 2      │ 0       │ 3       │ 6     │ 🔴 Gap   │
│ Preservations        │ 2      │ 3      │ 1       │ 6       │ 4     │ ✓ OK     │
│ EEA High Priority    │ 3      │ 5      │ 2       │ 10      │ 6     │ ✓ OK     │
└─────────────────────┴────────┴────────┴─────────┴─────────┴───────┴──────────┘

"Need" = projected RS required based on current inflow rate and throughput data
```

### 9.3 RS Capability Profile

Per-RS view showing all qualifications, load, and performance:

```
┌──────────────────────────────────────────────────────────────┐
│  DALE AYERS                                                   │
│  Team: GMT    Manager: Shane    Status: Active                │
│                                                               │
│  Qualifications:                                              │
│  ┌──────────────────┬───────────┬──────┬──────────┬─────────┐│
│  │ Group             │ Level     │ Rate │ Since    │ Expires ││
│  ├──────────────────┼───────────┼──────┼──────────┼─────────┤│
│  │ Azure (non-US)    │ Expert    │ 3.1/d│ 2024-06  │ —       ││
│  │ US Federal        │ Competent │ 5.2/d│ 2023-11  │ —       ││
│  │ US Federal — CE   │ Competent │ 4.8/d│ 2023-11  │ 2026-06 ││
│  │ Preservations     │ Trainee   │ 1.2/d│ 2026-02  │ —       ││
│  └──────────────────┴───────────┴──────┴──────────┴─────────┘│
│                                                               │
│  This Week:                                                   │
│  Focus: Azure (non-US) → US Federal → Oldest US JTQ          │
│  Active: 3  |  Staged: 1  |  Completed: 11  |  Cap: 6       │
│  Avg completion: 2.3 hrs   |  Available: 40 hrs/wk           │
└──────────────────────────────────────────────────────────────┘
```

### 9.4 Cross-Training Recommendations

System identifies gaps where qualified RS count is below threshold or projected demand, then suggests candidates:

```
CROSS-TRAINING: Azure
├─ Current: 2 (Dale, Shane)
├─ Need by W18: 4
├─ Training duration: ~4 weeks to Competent
├─ Candidates (ranked by transferable skill):
│   1. Will — Expert on US Federal, 5.2/d throughput, available 10 hrs/wk
│   2. Sarah — Competent on EEA, managed Azure tooling in prior role
└─ If approved: projected gap closes by W22

CROSS-TRAINING: India Emergency
├─ Current: 3
├─ Need (seasonal Q2 peak): 6
├─ Training duration: ~2 weeks
├─ Candidates:
│   1. David — Expert on US Federal, cross-region experience
│   2-3. From EEA pool (lower Q2 volume frees capacity)
└─ If approved: ready before April spike

CERTIFICATION RENEWAL: CE Clearance
├─ Expiring: Dale (Jun 1), Will (Jun 15)
├─ Lead time: 3 weeks
└─ Action: Initiate renewal by May 11
```

---

## 10. Staffing Forecast

### 10.1 Purpose

Answers: "Given current inflow trends, qualified RS, and throughput — will we have enough people in 2, 4, 8 weeks?" Turns reactive scrambling into planned allocation.

### 10.2 Inputs

| Input | Source | Update Frequency |
|-------|--------|-----------------|
| Historical inflow per group | Case timestamps vs. group criteria | Continuous |
| Seasonal patterns | Same-period data from prior years | Annual recalculation |
| Known events | Manager-entered (e.g., "COOPERS deadline", "India election") | Ad-hoc |
| Completion rates per group | Historical throughput per RS per group | Rolling 30-day |
| Qualified RS roster | Qualification records | Real-time |
| Leave/absence calendar | HR integration or manager-entered | Weekly |
| Training pipeline | Trainees with expected competency dates | Manager-entered |
| Attrition risk | Expected departures/transfers | Manager-entered |

### 10.3 Calculations

**Projected Case Depth (week N):**
```
depth[N] = depth[N-1]
         + (projected_inflow[N] × 5 workdays)
         - (projected_capacity[N] × 5 workdays)
```

**Projected Inflow:**
```
projected_inflow[N] = weighted_avg(
  recent_4wk_rolling  (weight: 0.5)
  seasonal_same_week  (weight: 0.3)
  known_events        (weight: 0.2)
)
```

**Projected Capacity:**
```
projected_capacity[N] = sum(
  for each assigned RS in week N:
    throughput_per_day × availability_fraction
)

availability = 1.0 (full time on group)
             | 0.5 (splitting across groups)
             | 0.0 (on leave / on-call)
```

**Capacity Gap:**
```
gap = projected_inflow − projected_capacity
If gap > 0: backlog grows. Need (gap ÷ avg_rs_throughput) more RS.
If gap < 0: backlog shrinks. Days to clear = depth ÷ |gap|.
```

### 10.4 Forecast View

```
┌──────────────────────────────────────────────────────────────────────┐
│  FORECAST: US Federal                                                │
│                                                                      │
│  Current: 47 cases | 5 assigned / 10 qualified | 22/d capacity      │
│  Inflow: 24/d (7-day avg) | Net: +2/d (growing)                    │
│                                                                      │
│  Week  Depth  Inflow  Capacity  RS     Gap    Status     Notes       │
│  ────────────────────────────────────────────────────────────        │
│  W13   47     24/d    22/d      5/10   -2/d   ⚠ Growing             │
│  W14   61     24/d    17.6/d    4/10   -6.4/d 🔴 Critical  David OOO│
│  W15   106    24/d    22/d      5/10   -2/d   🔴 Backlog            │
│  W16   120    22/d*   26.4/d    6/10   +4.4/d 🟠 Recovery  +1 RS    │
│  W17   89     22/d    26.4/d    6/10   +4.4/d 🟡 Improving          │
│  W18   58     22/d    26.4/d    6/10   +4.4/d 🟢 On track           │
│                                                                      │
│  * seasonal dip in US federal submissions                            │
│  Confidence: W13-14 ━━━ high | W15-16 ╌╌╌ medium | W17-18 ┈┈┈ low  │
│                                                                      │
│  RECOMMENDATION:                                                     │
│  Assign 1 additional RS to US Federal starting W13 to prevent W14   │
│  crisis. Dale (qualified, on Azure) could absorb ~4/day.            │
│  Trade-off: Azure drops from 2 → 1 assigned RS (already ⚠).        │
│                                                                      │
│  [What if: +1 RS?]  [What if: inflow -20%?]  [What if: train 2?]   │
└──────────────────────────────────────────────────────────────────────┘
```

### 10.5 Scenario Modeling

Managers run simulations before committing:

| Scenario | Tests | Shows |
|----------|-------|-------|
| **+1 RS** | Add a specific RS to this group | New capacity curve, impact on their other groups |
| **-1 RS** | Someone goes on leave or transfers | When backlog becomes unmanageable |
| **Volume spike** | Inflow doubles for 2 weeks | Breaking point and recovery timeline |
| **Cross-train** | N RS trained over M weeks | When capacity gap closes, ramp period |
| **Deadline shift** | Penalty deadline moves up | Updated risk exposure |

Output: side-by-side current plan vs. simulation with health status delta.

### 10.6 Forecast Confidence

Projections degrade over time. Display confidence visually:

| Horizon | Confidence | Display | Accuracy Target |
|---------|-----------|---------|----------------|
| Week 1-2 | High | Solid line | ±15% |
| Week 3-4 | Medium | Dashed line | ±30% |
| Week 5-8 | Low | Dotted, labeled "speculative" | ±50% |

Encourage managers to re-forecast weekly rather than planning far out.

### 10.7 Forecast Alerts

| Alert | Trigger | Lead Time |
|-------|---------|-----------|
| Backlog will exceed critical threshold | Projected depth > critical_queue_depth | 2 weeks |
| Capacity gap persists | Gap > 0 for 2+ projected weeks | 2 weeks |
| Single-point-of-failure | Qualified RS = 1 for active group | Immediate |
| Certification expiring | Qualification expires within 30 days | 30 days |
| Leave creates capacity gap | Approved leave drops available RS below min | On approval |
| Volume spike detected | Inflow > 2x rolling avg for 3+ days | Immediate |
| Seasonal spike approaching | Prior year shows volume jump in same period | 4 weeks |

---

## 11. Case Actions — Manager-Specific

Beyond what RS can do (pick, release), managers have additional case actions:

### 11.1 Bulk Release

"Release all of [RS name]'s cases back to case pool" — used when RS goes on leave unexpectedly. Cases return to Available state in the shared case pool, retaining their CHI and complexity scores.

### 11.2 Reassign with Handoff

Transfer a case from one RS to another with structured context:

```
Handoff {
  from_rs: User
  to_rs: User
  case_id: FK
  type: Enum              -- Planned (leave), Urgent (reallocation), Voluntary
  context_note: String    -- "Waiting on Mojang data, expected Thursday.
                          --  Identifiers 1-3 done. 4-5 need Xbox lookup."
  partial_work: Attachment[]
  acknowledged: Boolean   -- receiving RS must confirm
}
```

Receiving RS gets notification with full context. Case appears in their Active case list with a "Handoff" badge until acknowledged.

### 11.3 Emergency Qualification Grant

During Crisis mode, temporarily qualify an RS for a group they're not formally trained on:

- Flagged as `is_emergency_grant = true`
- Auto-expires when crisis de-escalates (or after 14 days, whichever is first)
- Cases worked under emergency qualification flagged for QA review
- Does not count toward the RS's permanent qualification record until formally assessed

### 11.4 Override CHI

Manager can override a case's auto-calculated CHI with justification:

- Override reason required (freetext)
- Original CHI preserved for audit
- Auto-escalation rules still apply (a CHI-4 override can still escalate to CHI-2 by time rules)

---

## 12. Backend Data Model

### 12.1 Health Thresholds

```
HealthThresholds {
  id: UUID
  assignment_group_id: FK → AssignmentGroup
  set_by: FK → User
  updated_at: DateTime

  max_queue_depth: Int?
  critical_queue_depth: Int?
  max_median_age_days: Int?
  critical_median_age_days: Int?
  max_net_flow_per_day: Float?
  max_time_to_pick_days: Float?
  sla_target_days: Int
  sla_warning_days: Int
  max_penalty_exposure_count: Int?
  max_sla_breach_count: Int?
  max_chi1_unassigned: Int?
  min_qualified_rs: Int
  min_available_rs: Int
  target_days_to_clear: Int
  max_capacity_utilization: Float
  max_caseload_utilization: Float
}
```

### 12.2 LENS Health Snapshot (Daily Time-Series)

```
LensHealthSnapshot {
  id: UUID
  assignment_group_id: FK
  snapshot_date: Date
  queue_depth: Int
  complexity_adjusted_depth: Float
  inflow_count: Int
  completed_count: Int
  median_age_days: Float
  oldest_case_days: Int
  chi_1_count: Int
  chi_2_count: Int
  chi_3_count: Int
  chi_4_count: Int
  chi_5_count: Int
  penalty_exposure_count: Int
  sla_breach_count: Int
  sla_breach_imminent_count: Int
  qualified_rs_count: Int
  available_rs_count: Int
  assigned_rs_count: Int
  total_capacity_per_day: Float
  capacity_gap: Float
  health_status: Enum
  operating_mode: Enum
  dormant_count: Int
}
```

### 12.3 Staffing Forecast

```
StaffingForecast {
  id: UUID
  assignment_group_id: FK
  generated_at: DateTime
  generated_by: Enum          -- System | Manager
  forecast_weeks: Int

  projections: [{
    week_start: Date
    projected_inflow_per_day: Float
    projected_capacity_per_day: Float
    projected_queue_depth: Int
    capacity_gap: Float
    rs_needed_to_close_gap: Int
    projected_health_status: Enum
    confidence: Enum          -- High | Medium | Low
    assumptions: String[]
  }]
}
```

### 12.4 Case Handoff

```
CaseHandoff {
  id: UUID
  case_id: FK
  from_rs: FK → User
  to_rs: FK → User?          -- null = release to queue
  handoff_type: Enum          -- Planned | Urgent | Voluntary
  context_note: String
  partial_work: JSON          -- references to attachments/notes
  created_at: DateTime
  acknowledged_at: DateTime?
}
```

### 12.5 Auto-Escalation Log

```
AutoEscalationEvent {
  id: UUID
  case_id: FK
  triggered_at: DateTime
  rule_name: String           -- "SLA approaching", "Penalty imminent"
  previous_chi: Int
  new_chi: Int
  reason: String
  notifications_sent: [{user_id, channel}]
}
```

### 12.6 Operating Mode Log

```
OperatingModeChange {
  id: UUID
  scope: Enum                 -- Group | SystemWide
  assignment_group_id: FK?    -- null if system-wide
  previous_mode: Enum
  new_mode: Enum
  triggered_at: DateTime
  trigger_reason: String      -- "US Federal — CE exceeded critical_queue_depth"
  resolved_at: DateTime?
}
```

---

## 13. Permissions

| Action | Roles |
|--------|-------|
| View LENS Health dashboard | Manager, Workforce Planner |
| View LENS Health (own groups only) | RS (limited) |
| Configure health thresholds | Manager, Workforce Planner |
| View/run staffing forecasts | Manager, Workforce Planner |
| Run scenario simulations | Manager, Workforce Planner |
| View qualification coverage matrix | Manager, Workforce Planner |
| Grant/revoke qualifications | Manager, Workforce Planner |
| Grant emergency qualifications | Manager (Crisis mode only) |
| Override case CHI | Manager, Workforce Planner |
| Bulk release RS cases | Manager, Workforce Planner |
| Reassign with handoff | Manager, Workforce Planner |
| Acknowledge handoff | RS (receiving) |
| View own capability profile | RS |
| Trigger manual operating mode change | Manager (with justification) |
