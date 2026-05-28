# Triage Framework Evaluation — DARS LENS Health vs. Crisis Management Systems

**Purpose:** Evaluate the DARS risk metrics and LENS Health model against proven high-stakes triage systems to identify missing patterns, structural gaps, and design improvements.

---

## 1. Reference Systems Evaluated

| System | Domain | Why Relevant |
|--------|--------|-------------|
| **ESI (Emergency Severity Index)** | Emergency Room triage | Gold standard for combining urgency with resource prediction under volume pressure |
| **START/SALT** | Mass casualty triage | How to make fast, consistent decisions when demand overwhelms capacity |
| **MPDS (Medical Priority Dispatch)** | 911 dispatch | Deterministic protocols that remove subjectivity from prioritization |
| **ICS (Incident Command System)** | Disaster response | Scalable workforce organization, span of control, surge management |
| **ATC (Air Traffic Control)** | Flight sequencing | Real-time prioritization of competing deadlines with catastrophic failure modes |
| **ICU Bed Management** | Hospital capacity | Acuity-based resource allocation when capacity is fixed and demand fluctuates |

---

## 2. Emergency Severity Index (ESI) — What DARS Can Learn

### How ESI Works

ESI is a 5-level triage system used in most US emergency departments. The critical insight: **it doesn't just measure "how sick" — it predicts "how many resources this will consume."**

```
ESI Decision Tree:

  Is the patient dying?
    YES → Level 1 (Resuscitation - immediate)
    NO  ↓

  Should the patient NOT wait?
    YES → Level 2 (Emergent - minutes)
    NO  ↓

  How many resources will this patient need?
    2+ resources → Level 3 (Urgent)
    1 resource   → Level 4 (Less urgent)
    0 resources  → Level 5 (Non-urgent)

  For Level 3: Are vitals in the danger zone?
    YES → Upgrade to Level 2
```

### Key Principles

1. **Urgency and complexity are separate axes.** A simple case can be urgent. A complex case can be non-urgent. ESI captures both.
2. **Resource prediction drives triage, not just severity.** Two patients with the same urgency may need very different amounts of care.
3. **Re-triage is mandatory.** Patients waiting in the lobby are reassessed. Conditions change. A Level 4 can become a Level 2.
4. **Overcrowding protocols exist.** When the ER is full, ESI doesn't break — specific protocols activate (divert ambulances, open overflow, call in staff).

### Gap in DARS: No Resource Consumption Prediction

The current DARS risk metrics measure **consequence** (penalty, SLA, priority) but not **effort** (how much RS time will this case consume?).

A case with 1 identifier, 1 service, and a standard subpoena takes an RS maybe 30 minutes. A case with 25 identifiers across 5 services with a court order and Azure involvement might take 8 hours.

Both currently show up as rows in the case list with equal visual weight.

**Recommendation — Case Complexity Score:**

```
ComplexityScore = weighted sum of:
  identifier_count          × 1.0    (each identifier = work)
  service_count             × 2.0    (each service = tool switch + context switch)
  has_azure                 × 3.0    (Azure requires specialized tooling)
  has_enterprise_ids        × 2.0    (tenant/subscription IDs = complex lookup)
  has_preservation_linked   × 1.5    (need to cross-reference preservation)
  request_type_weight:
    Preservation            = 1.0
    Subpoena                = 1.5
    Search Warrant          = 2.0
    Court Order             = 2.5
    Emergency               = 3.0    (fast but high-touch)
```

Display in the case list as an estimated effort indicator:

| Indicator | Meaning | Example |
|-----------|---------|---------|
| **Light** | < 1 hour estimated | 1 identifier, 1 service, subpoena |
| **Medium** | 1-4 hours estimated | 3-5 identifiers, 2 services |
| **Heavy** | 4-8 hours estimated | 10+ identifiers, 3+ services, court order |
| **Complex** | 8+ hours or multi-day | 25+ identifiers, Azure, enterprise, preservation cross-ref |

This directly affects capacity planning: a case list of 20 "Light" cases is a day's work. A case list of 20 "Complex" cases is a week's work. Without this distinction, case volume is a misleading capacity signal.

### Gap in DARS: No Re-Triage / Deterioration Detection

In an ER, a patient waiting in the lobby gets re-assessed if their condition changes. In DARS, a case sits at whatever priority it was assigned at triage and never changes unless a human notices.

**Recommendation — Auto-Escalation Rules:**

Cases should automatically escalate priority based on time-based triggers:

```
AutoEscalation {
  // Age-based escalation
  if days_in_queue > sla_warning_days AND priority != High:
    escalate priority to High
    notify assigned RS + manager
    reason: "Case approaching SLA breach"

  // Penalty deadline escalation
  if has_financial_penalty AND days_until_due <= 3:
    escalate to Critical
    notify manager immediately
    reason: "Financial penalty deadline in {days} days"

  // Court deadline escalation
  if deadline_type = CourtImposed AND days_until_due <= 5:
    escalate to Critical
    reason: "Court-imposed deadline imminent"

  // Unassigned aging
  if assigned_to = null AND days_in_queue > median_age × 2:
    flag as "Deteriorating — unassigned and aging"
    surface to top of manager dashboard

  // Blocker stagnation
  if current_blockers != null AND blocker_age > 5 days:
    flag as "Stalled — blocked for {days} days"
    notify assigned RS: "Is this still blocked?"
}
```

---

## 3. START/SALT Mass Casualty Triage — What DARS Can Learn

### How START Works

START (Simple Triage and Rapid Treatment) is used when a mass casualty event overwhelms resources. It classifies patients in under 30 seconds each:

```
Can the patient walk?
  YES → MINOR (Green tag) — they can wait

Can the patient breathe?
  NO (after repositioning) → EXPECTANT (Black tag) — resources better spent elsewhere
  YES → check respiratory rate

Respiratory rate > 30?
  YES → IMMEDIATE (Red tag)
  NO  → check perfusion (pulse)

Pulse absent or cap refill > 2 sec?
  YES → IMMEDIATE (Red tag)
  NO  → check mental status

Can follow commands?
  NO  → IMMEDIATE (Red tag)
  YES → DELAYED (Yellow tag) — can wait, but needs treatment
```

### Key Principles

1. **Speed of categorization matters.** START takes 30 seconds per patient. The system cannot afford analysis paralysis at the triage point.
2. **There is an "Expectant" category.** When resources are truly overwhelmed, some cases are deliberately deprioritized because the resource expenditure won't change the outcome. This is the hardest decision in crisis management.
3. **Walking wounded self-select.** "Can you walk?" immediately separates the minor cases from the serious ones without any further assessment.
4. **The algorithm is deterministic.** The same inputs always produce the same tag. No subjectivity.

### Gap in DARS: No Deterministic Triage Algorithm

Currently, case priority is set by the triage team using judgment. Two triage specialists might prioritize the same case differently. Dale and David described how they use ad-hoc title line shorthands ("CE", "Fed", "+25", "PIP") because the system doesn't enforce consistent categorization.

**Recommendation — Deterministic Case Scoring (Case Health Index):**

A composite score calculated automatically from case metadata, similar to how ESI uses a decision tree:

```
Case Health Index (CHI):

Step 1 — Is there an immediate legal or safety consequence?
  Court-imposed deadline within 5 days      → CHI-1 (Critical)
  Financial penalty deadline within 7 days   → CHI-1 (Critical)
  CE (child exploitation) crime type         → CHI-1 (Critical)
  Emergency request (threat to life)         → CHI-1 (Critical)

Step 2 — Is the case at risk of breach?
  SLA breach within 14 days                  → CHI-2 (Urgent)
  Financial penalty attached (any deadline)  → CHI-2 (Urgent)
  High priority flag from agency             → CHI-2 (Urgent)
  Reactivated case (was closed, reopened)    → CHI-2 (Urgent)

Step 3 — How much resource will this consume?
  ComplexityScore = Heavy or Complex         → CHI-3 (Significant)
  Multi-service case                         → CHI-3 (Significant)
  25+ identifiers                            → CHI-3 (Significant)

Step 4 — Standard case
  Standard complexity, within SLA            → CHI-4 (Standard)

Step 5 — Low effort
  Single identifier, single service, routine → CHI-5 (Quick)
```

**CHI feeds everything downstream:**
- LENS Health dashboard sorts/colors by CHI
- Focus Profile "Available to Pick" shows CHI-1 cases with visual urgency
- Capacity planning weights CHI-1 cases as consuming 3x the effort of CHI-5
- Auto-escalation rules promote cases to higher CHI as deadlines approach

### Gap in DARS: No Surge Protocol

START exists specifically because normal processes break under volume pressure. DARS has no equivalent. When India bomb threats flood the system with 50 cases in a day, or when a country's backlog hits critical, what changes?

**Recommendation — Surge Protocols:**

Define specific operational modes that activate based on LENS Health thresholds:

```
┌─────────────────────────────────────────────────────────────────┐
│  OPERATING MODES                                                 │
│                                                                  │
│  NORMAL                                                          │
│  Trigger: All groups Healthy or Watch                            │
│  Behavior: Standard workflow. RS works assigned Focus Profile.   │
│                                                                  │
│  ELEVATED                                                        │
│  Trigger: Any group at Warning                                   │
│  Behavior:                                                       │
│  - Manager alerted, reviews within 4 hours                       │
│  - RS with surplus capacity auto-offered cases from Warning      │
│    groups they're qualified for                                  │
│  - "Available to help" toggle for RS to volunteer capacity       │
│                                                                  │
│  SURGE                                                           │
│  Trigger: Any group at Critical OR 2+ groups at Warning          │
│  Behavior:                                                       │
│  - All managers notified immediately                             │
│  - Focus Profiles temporarily overridden: all qualified RS see   │
│    Critical group cases at top of their case list                │
│  - RS max concurrent limits increased by 50%                    │
│  - Fast-track mode enabled: CHI-5 cases auto-routed to most     │
│    junior qualified RS to free senior RS for complex work        │
│  - Daily stand-up cadence (replaces weekly)                      │
│                                                                  │
│  CRISIS                                                          │
│  Trigger: 3+ groups at Critical OR CHI-1 backlog > 10 cases     │
│  Behavior:                                                       │
│  - All above, plus:                                              │
│  - Cross-region support requested (GMT helps US, US helps GMT)   │
│  - Non-case project work suspended for all RS                    │
│  - Manager can temporarily grant "emergency qualification" to    │
│    RS who aren't formally qualified but can handle supervised    │
│  - Triage team increases rejection rigor (push back on invalid   │
│    or duplicate requests at intake)                              │
│  - "Expectant" mode: CHI-4/5 cases explicitly deferred. RS      │
│    told "do not pick Standard/Quick cases this week"             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. MPDS (Medical Priority Dispatch) — What DARS Can Learn

### How MPDS Works

When you call 911, the dispatcher follows a scripted protocol (ProQA) that asks a specific sequence of questions. Based on answers, the system deterministically selects:
- A response code (ALPHA through ECHO)
- Which unit types to send (BLS, ALS, engine, ladder)
- How fast they need to get there

The dispatcher does NOT use personal judgment about what to send. The protocol decides.

### Key Principle: Separation of Assessment from Dispatch

The person assessing the situation (dispatcher taking the call) is NOT the person deciding what resources to send (the protocol does that). This removes bias, ensures consistency, and allows the system to be audited and improved.

### Gap in DARS: Triage and Assignment Are Entangled

In DARS today, the triage team sets priority (assessment) AND the manager decides who works it (dispatch), but both use informal judgment. The triage team's priority determination isn't algorithmic, and the manager's assignment decision doesn't consider RS throughput data.

**Recommendation — Separate the Three Functions:**

| Function | Who Does It | What They Decide | System Support |
|----------|-------------|-----------------|----------------|
| **Assessment** | Triage team (or automated) | What is this case? What's the CHI? What services/identifiers? | CHI auto-calculated from case metadata. Triage team validates, can override with justification. |
| **Prioritization** | System + Health Thresholds | What order should cases be worked? | CHI + LENS Health status + deadline proximity = sort order. No human input needed per-case. |
| **Assignment** | Manager via Focus Profiles | Who works which types of cases? | Qualification matching + capacity data + forecast. Manager sets strategy, system executes. |

This separation means:
- Triage team focuses only on accurate case classification (not "who should work this")
- Managers focus on strategic allocation (not individual case priority)
- RS focus on execution (not case list navigation and filtering)

---

## 5. Incident Command System (ICS) — What DARS Can Learn

### Key Principles

1. **Span of Control: 3-7 direct reports, optimal is 5.** No supervisor should manage more than 7 people or functions. This is foundational to ICS.
2. **Scalable structure.** Same organizational pattern whether managing 5 people or 5,000.
3. **Staging.** Resources are positioned and ready but not committed until needed. This preserves flexibility.
4. **Demobilization planning.** Before the incident is over, ICS plans how to stand down resources. You don't keep everyone at surge forever.

### Gap in DARS: No Active Caseload Limits Based on Complexity

David described his approach: take small batches because priorities can change and you may need to release cases. Dale takes more. Neither is wrong, but the system doesn't enforce or guide this.

ICS would say: the span of control for an RS working cases is the number of active cases they can effectively manage. That number depends on case complexity.

**Recommendation — Dynamic Caseload Caps:**

```
MaxActiveCases(RS, Assignment Group) =
  base_max_concurrent (from Qualification record)
  × operating_mode_multiplier:
      Normal   = 1.0
      Elevated = 1.0
      Surge    = 1.25
      Crisis   = 1.5
  ÷ avg_complexity_of_current_cases:
      all CHI-5        = divide by 0.5  (can carry more)
      mixed             = divide by 1.0  (standard)
      all CHI-1/2       = divide by 2.0  (carry fewer)
```

If an RS has 4 CHI-2 cases, the system should prevent them from picking a 5th unless they release one. But if they have 4 CHI-5 cases, they could pick 4 more.

### Gap in DARS: No Staging Concept

ICS stages resources: ambulances parked at the staging area, ready to deploy but not committed. David's "small batch" approach is informal staging — he picks 2-3 cases because he knows he might be reassigned.

**Recommendation — Formal "Staged" State:**

Add a case state between "Available in Case Pool" and "Picked / Active":

```
Case States:
  Available → Staged → Active → Completed
                 ↓
              Released (back to Available)
```

**Staged** means:
- The RS has claimed the case — it's not visible to other RS as "Available"
- But the RS hasn't started working it yet
- If the RS is reassigned, a manager can release all Staged cases instantly (no work lost)
- Staged cases count toward the RS's caseload cap at a reduced weight (0.5x)
- Auto-release after 24 hours if not moved to Active: "You staged LNS-12345 yesterday but haven't started it. Release it or begin work?"

This preserves David's "small batch" workflow while making it visible and manageable for the manager.

---

## 6. Air Traffic Control — What DARS Can Learn

### Key Principles

1. **Sequencing under competing deadlines.** Every plane has a fuel limit (hard deadline) and a schedule (soft deadline). ATC sequences based on which hard deadlines are closest.
2. **Separation minimums.** Two planes can't occupy the same airspace. ATC maintains separation. Translated: two RS shouldn't unknowingly work the same identifier across different cases without awareness.
3. **Handoffs are formalized.** When a plane moves from one controller's sector to another, there's a specific handoff protocol. Nothing is assumed.
4. **"Unable" is a valid response.** A pilot can say "unable" to an ATC instruction if it's unsafe. The system accommodates this rather than forcing compliance.

### Gap in DARS: Case Handoff Protocol

Dale described that if an RS goes on leave, cases stuck in their active cases can cause problems. David described releasing cases back to the case pool. But there's no formal handoff — no way to transfer a case with context to another RS.

**Recommendation — Structured Handoff:**

When an RS needs to transfer a case (leave, reassignment, overload):

```
Handoff {
  from_rs: User
  to_rs: User (or null = release to queue)
  case_id: FK
  handoff_type: Enum       -- Planned (leave), Urgent (reassignment), Voluntary (overload)
  context_note: String     -- "Waiting on Mojang data, should arrive by Thursday.
                           --  Identifiers 1-3 are done, 4-5 need Xbox lookup."
  attachments: []          -- partial work products, notes
  acknowledged: Boolean    -- receiving RS must acknowledge
}
```

The receiving RS gets a notification with full context rather than picking up a case blind.

---

## 7. ICU Bed Management — What DARS Can Learn

### Key Principle: Acuity-Based Resource Allocation

ICU beds are scarce. Patients are scored on acuity (how sick) and trajectory (getting better or worse). A patient who is improving may be "stepped down" to a regular bed, freeing the ICU bed for a more acute patient.

### Gap in DARS: No "Step Down" for Cases That Stall

Some cases sit in the system for months (Dale showed 2024 cases still in the 2026 case pool). These aren't actively harmful — they're just stuck. But they inflate case depth metrics, distort health scores, and create noise.

**Recommendation — Case Aging States:**

```
Active Aging:
  0-14 days   → Normal (in SLA)
  15-30 days  → Aging (approaching breach)
  31-90 days  → Stale (why is this still here?)
  91+ days    → Dormant (requires review — close, reactivate, or escalate)

For Dormant cases:
  - Auto-flag for manager review monthly
  - Do NOT count toward active case depth metrics (distorts health)
  - Show in separate "Dormant Cases" section
  - Require a justification to keep open: "Awaiting court decision"
    or "Law enforcement unresponsive — pending closure"
```

This is the ICU equivalent of stepping down a stable patient — the case isn't resolved, but it shouldn't occupy the same mental and operational space as an active case.

---

## 8. Composite Recommendations for DARS

Synthesizing all six reference systems into concrete changes to the DARS spec:

### 8.1 Add to Section 2 (Concepts)

| New Concept | Inspired By | Description |
|-------------|-------------|-------------|
| **Case Health Index (CHI)** | ESI | 5-level composite score combining urgency + complexity + consequence. Auto-calculated, overridable. |
| **Complexity Score** | ESI resource prediction | Estimated RS effort based on identifier count, service count, request type. |
| **Operating Mode** | ICS, START | System-wide or per-group escalation state (Normal → Elevated → Surge → Crisis) with specific behavioral changes. |
| **Staged State** | ICS staging | Case state between Available and Active. Claimed but not started. Low-friction to release. |
| **Handoff Protocol** | ATC | Structured transfer of a case between RS with context, acknowledgment, and partial work. |
| **Case Aging State** | ICU step-down | Normal → Aging → Stale → Dormant. Dormant cases separated from active LENS Health metrics. |
| **Auto-Escalation** | MPDS, ER re-triage | Time-based rules that promote case CHI as deadlines approach. No human action needed. |
| **Surge Protocol** | ICS, START | Defined operational changes at each escalation level. Override Focus Profiles, increase caps, defer low-priority work. |

### 8.2 Modify Section 3.3 (Risk Metrics)

Add these metrics to the Risk table:

| Metric | Definition | Inspired By |
|--------|-----------|-------------|
| **CHI-1 Backlog** | Count of Critical-severity cases unassigned | ESI Level 1 patients waiting |
| **Avg Time-to-Pick** | How long cases sit before an RS picks them | ER "door-to-provider" time |
| **Avg Time-to-Complete** | How long from pick to completion | ER "length of stay" |
| **Complexity-Adjusted Case Depth** | Case depth weighted by ComplexityScore, not raw count | ESI resource prediction |
| **Dormant Case Count** | Cases >90 days old still open | ICU bed-blocking |
| **Handoff Failure Rate** | Cases released without handoff context | ATC handoff quality |
| **Re-open Rate** | Completed cases that get reactivated | ER bounce-back rate |

### 8.3 Modify Section 3.4 (Capacity Metrics)

Add:

| Metric | Definition | Inspired By |
|--------|-----------|-------------|
| **Complexity-Adjusted Capacity** | RS throughput weighted by case complexity, not just count | ESI resource-based triage |
| **Caseload Utilization** | RS active cases / dynamic cap (complexity-adjusted) | ICS span of control |
| **Staging Depth** | Cases in Staged state per RS | ICS staging area |
| **Cross-Training Coverage Ratio** | Qualified RS / minimum required RS per group | ICS redundancy planning |
| **Time in Operating Mode** | How long the system has been in Elevated/Surge/Crisis | ICS demobilization trigger |

### 8.4 New: Integrate CHI into LENS Health Dashboard

The dashboard (Section 3.7) should show case depth broken down by CHI level, not just raw count:

```
│ Assignment Group      │ CHI-1│ CHI-2│ CHI-3│ CHI-4│ CHI-5│ Total│
├──────────────────────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ 🔴 US Federal — CE   │  5   │  8   │  4   │  6   │  0   │  23  │
│ 🔴 Brazil Fin Penalty│  3   │  14  │  0   │  0   │  0   │  17  │
│ 🟢 US State & Local   │  0   │  1   │  2   │  3   │  2   │  8  │
```

A case list of 23 cases where 5 are CHI-1 is a fundamentally different problem than a case list of 23 cases where all are CHI-4. The dashboard must make this visible.

### 8.5 Summary: What Each System Teaches DARS

| System | Core Teaching | DARS Application |
|--------|--------------|-----------------|
| **ER (ESI)** | Urgency alone is insufficient — predict resource consumption | Complexity Score + CHI combining urgency and effort |
| **Mass Casualty (START)** | When overwhelmed, triage faster and accept that some things wait | Surge protocols, Operating Modes, "Expectant" deferral of CHI-4/5 |
| **911 Dispatch (MPDS)** | Remove subjectivity — same inputs, same output, every time | Deterministic CHI calculation, separate assessment from assignment |
| **Disaster Response (ICS)** | Span of control, staging, scalable structure, plan to stand down | Dynamic caseload caps, Staged state, demobilization triggers |
| **Air Traffic Control** | Sequence by hard deadlines, formalize handoffs, allow "unable" | Court/penalty deadlines trump SLA, structured handoff protocol |
| **ICU Management** | Scarce capacity requires continuous acuity reassessment | Auto-escalation, case aging states, Dormant separation |
