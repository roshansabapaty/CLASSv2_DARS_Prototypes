# Phase 6: LENS Health & Operational Monitoring

## DARS Case Operations & Workforce Intelligence Roadmap

| Field            | Value                                                        |
|------------------|--------------------------------------------------------------|
| Phase            | 6 of 8                                                       |
| Status           | Draft                                                        |
| Author           | Engineering                                                  |
| Created          | 2026-03-26                                                   |
| Last Updated     | 2026-03-26                                                   |
| Source Documents  | DARS_Case_Health_Management.md sections 5-8; Triage_Framework_Evaluation.md sections 3, 5 |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Data Model](#3-data-model)
4. [Business Logic](#4-business-logic)
5. [Components & UI](#5-components--ui)
6. [Files to Create](#6-files-to-create)
7. [Files to Modify](#7-files-to-modify)
8. [Mock Data](#8-mock-data)
9. [State Management](#9-state-management)
10. [Edge Cases](#10-edge-cases)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Cross-References](#12-cross-references)

---

## 1. Overview

### Problem Statement

Managers currently have no unified view into the operational health of their case pools. They discover backlogs reactively, cannot anticipate capacity shortfalls, and lack a systematic mechanism for escalating operational posture when demand outstrips supply. This leads to missed SLAs, penalty exposure, and uneven workload distribution that degrades both service quality and RS morale.

### What LENS Health Delivers

LENS Health answers three questions for every Assignment Group at every point in time:

1. **Where are we hurting?** -- Which case pools have backlogs, aging cases, or unassigned high-severity work?
2. **How badly?** -- A composite health status (Healthy / Watch / Warning / Critical) derived from demand, risk, and capacity dimensions.
3. **Do we have enough people?** -- Capacity gap analysis comparing qualified/available RS against current and projected demand.

### Three Dimensions of LENS Health

| Dimension    | What It Measures                                              | Key Inputs                                                   |
|-------------|---------------------------------------------------------------|--------------------------------------------------------------|
| **Demand**  | Volume and velocity of incoming work                          | Case volume, inflow rate, net flow, complexity-adjusted depth |
| **Risk**    | Consequences of falling behind                                | Penalty exposure, SLA breaches, CHI-1 unassigned count, reopen rate |
| **Capacity**| Qualified RS available to absorb demand                       | Qualified RS count, available RS count, throughput capacity, capacity gap |

### Operating Modes

When health degrades past thresholds, the system transitions through **Operating Modes** that activate behavioral changes automatically. This is inspired by two proven frameworks:

- **ICS (Incident Command System)** surge protocols: escalating command structures and resource mobilization when incident scope grows.
- **ER overcrowding protocols (ESI)**: resource-based triage that shifts processing rules when department capacity is exceeded.

Operating Modes are: **Normal** -> **Elevated** -> **Surge** -> **Crisis**. Each mode triggers specific behavioral changes in routing, capacity limits, and manager notifications to create a closed-loop system: health drives assignments, assignments drive throughput, throughput drives health.

### Closed-Loop Integration

```
LENS Health Snapshot
        |
        v
Health Status Roll-Up (Healthy / Watch / Warning / Critical)
        |
        v
Operating Mode Determination (Normal / Elevated / Surge / Crisis)
        |
        +---> Behavioral Changes (cap overrides, focus routing, deferrals)
        |           |
        |           v
        |     Assignment Engine (Phase 5) adjusts routing
        |           |
        |           v
        |     RS completes work --> throughput data feeds back
        |           |
        +<----------+
        |
        v
Next Health Snapshot (cycle repeats every 15 minutes)
```

### Transparency Reporting (Kodex GAP 7)

Phase 6 also delivers the data aggregation layer for transparency reports required under Kodex GAP 7. These reports aggregate case outcomes by period, country, and request type, providing the raw data needed for regulatory compliance reporting.

---

## 2. Prerequisites

### Hard Dependencies

| Phase | Component                          | Why Required                                                    |
|-------|------------------------------------|-----------------------------------------------------------------|
| **Phase 2** | CHI scoring and complexity     | Severity-weighted metrics (CHI-1 unassigned, complexity-adjusted depth) require CHI scores and complexity values to be populated on every case. |
| **Phase 4** | Assignment Groups              | LENS Health is measured per Assignment Group. Without groups, there is nothing to measure.  |
| **Phase 4** | Qualifications                 | Capacity metrics (qualifiedRs, availableRs) depend on RS-to-group qualification mappings.    |
| **Phase 5** | Collection pipeline            | Throughput data (completionRate, avgTimeToComplete) comes from the collection pipeline's case lifecycle tracking. |

### Soft Dependencies

| Component                  | Impact if Absent                                                   |
|----------------------------|--------------------------------------------------------------------|
| Phase 3 (Penalty Engine)   | penaltyExposureCount and penaltyExposureAmount will be 0; risk dimension is degraded but functional. |
| Phase 5 (Dynamic Caps)     | caseloadUtilization defaults to static caps; less accurate but functional. |
| Leave/availability system  | availableRs cannot subtract on-leave RS; overestimates capacity.   |

### Technical Prerequisites

- Cron or scheduler infrastructure capable of running snapshot jobs every 15 minutes.
- Database support for time-series snapshot data (or append-only table with date partitioning).
- WebSocket or polling mechanism for real-time Operating Mode banner updates.

---

## 3. Data Model

### 3.1 LensHealthSnapshot

Captured every 15 minutes per Assignment Group. This is the core fact table for all health calculations.

```typescript
interface LensHealthSnapshot {
  /** Unique snapshot identifier (UUID) */
  id: string;

  /** The Assignment Group this snapshot measures */
  assignmentGroupId: string;

  /** Timestamp when this snapshot was captured */
  snapshotDate: Date;

  // ── Demand Metrics ──────────────────────────────────────────────

  /** Count of open, unassigned, non-dormant cases in this group's case pool */
  queueDepth: number;

  /**
   * Case depth weighted by complexity.
   * Formula: sum(complexityScore) / avgComplexityScore
   * A case pool of 10 high-complexity cases is "deeper" than 10 simple ones.
   */
  complexityAdjustedDepth: number;

  /** Cases entering the system in the trailing 7-day window */
  inflowCount: number;

  /** Cases completed (closed/resolved) in the trailing 7-day window */
  completedCount: number;

  /** Median calendar days since dateEnteredQueue for all open cases */
  medianAgeDays: number;

  /** Age in days of the single oldest open case */
  oldestCaseDays: number;

  // ── CHI Distribution ────────────────────────────────────────────

  /** Count of open cases at each CHI level */
  chi1Count: number;
  chi2Count: number;
  chi3Count: number;
  chi4Count: number;
  chi5Count: number;

  // ── Risk Metrics ────────────────────────────────────────────────

  /** Open cases flagged with a financial penalty */
  penaltyExposureCount: number;

  /** Total monetary value of penalty exposure (EUR) */
  penaltyExposureAmount: number;

  /** Open cases past their due date */
  slaBreachCount: number;

  /** Open cases where (dateDue - now) <= slaWarningDays */
  slaBreachImminentCount: number;

  /** Open cases at CHI-1 or CHI-2 with no assigned RS */
  ceUnassignedCount: number;

  /** Open cases at CHI-1 with no assigned RS (subset of ceUnassignedCount) */
  highPriorityUnassignedCount: number;

  /** Average calendar days from dateEnteredQueue to datePicked, trailing 30 days */
  avgTimeToPickDays: number;

  /** Average calendar days from datePicked to dateCompleted, trailing 30 days */
  avgTimeToCompleteDays: number;

  // ── Capacity Metrics ────────────────────────────────────────────

  /** RS with active qualifications for this group */
  qualifiedRsCount: number;

  /**
   * Qualified RS minus those on leave, on call, or at max concurrent.
   * These are RS who could accept a new case right now.
   */
  availableRsCount: number;

  /** RS currently assigned at least one open case in this group */
  assignedRsCount: number;

  /**
   * Estimated total cases the assigned RS pool can complete per day.
   * Formula: sum(assignedRs.avgThroughputPerDay)
   */
  totalCapacityPerDay: number;

  /**
   * How many more cases per day we need to clear the case pool in targetDaysToClear.
   * Formula: (queueDepth / targetDaysToClear) - totalCapacityPerDay
   * Positive = shortfall. Negative = surplus.
   */
  capacityGap: number;

  /**
   * Fraction of theoretical max capacity currently consumed.
   * Formula: (inflowRate / totalCapacityPerDay) * 100
   * >100% means inflow exceeds capacity.
   */
  capacityUtilization: number;

  /**
   * Average (activeCases / dynamicCap) across all RS in this group.
   * 100% means every RS is at their dynamic cap.
   */
  caseloadUtilization: number;

  // ── Quality Metrics ─────────────────────────────────────────────

  /** Cases dormant (no activity) for > dormancyThresholdDays */
  dormantCount: number;

  /**
   * Reactivated cases / completed cases over trailing 30 days.
   * High reopen rate indicates quality issues.
   */
  reopenRate: number;

  // ── Composite Status ────────────────────────────────────────────

  /** Rolled-up health status for this group at snapshot time */
  healthStatus: HealthStatus;

  /** Current operating mode (may be group-level or inherited from system-wide) */
  operatingMode: OperatingMode;
}
```

### 3.2 HealthThresholds

Manager-configurable targets per Assignment Group. Every group gets a row; missing optional fields mean "no threshold for this metric" (i.e., it cannot trigger a status change on its own).

```typescript
interface HealthThresholds {
  /** Unique identifier */
  id: string;

  /** The Assignment Group these thresholds apply to */
  assignmentGroupId: string;

  /** RS who last updated these thresholds */
  setBy: string;

  /** When thresholds were last modified */
  updatedAt: Date;

  // ── Demand Thresholds ───────────────────────────────────────────

  /** Case volume at which Warning triggers */
  maxQueueDepth?: number;

  /** Case volume at which Critical triggers */
  criticalQueueDepth?: number;

  /** Median age (days) at which Warning triggers */
  maxMedianAgeDays?: number;

  /** Median age (days) at which Critical triggers */
  criticalMedianAgeDays?: number;

  /** Net flow per day above which Warning triggers */
  maxNetFlowPerDay?: number;

  /** Max acceptable average time-to-pick in days */
  maxTimeToPickDays?: number;

  // ── Risk Thresholds ─────────────────────────────────────────────

  /** SLA target in calendar days (used for breach calculation) */
  slaTargetDays: number;

  /** Days before SLA due date to trigger "imminent" warnings */
  slaWarningDays: number;

  /** Penalty exposure count at which Warning triggers */
  maxPenaltyExposureCount?: number;

  /** SLA breach count at which Critical triggers */
  maxSlaBreachCount?: number;

  /** Max CHI-1 cases allowed unassigned before Critical (typically 0) */
  maxDsi1Unassigned?: number;

  // ── Capacity Thresholds ─────────────────────────────────────────

  /** Minimum qualified RS required for this group */
  minQualifiedRs: number;

  /** Minimum available RS required (triggers SPOF detection) */
  minAvailableRs: number;

  /** Target days to clear entire case pool at current capacity */
  targetDaysToClear: number;

  /** Capacity utilization percentage at which Warning triggers */
  maxCapacityUtilization: number;

  /** Caseload utilization percentage at which Warning triggers */
  maxCaseloadUtilization: number;
}
```

### 3.3 Enumerations

```typescript
type HealthStatus = "Healthy" | "Watch" | "Warning" | "Critical";

type OperatingMode = "Normal" | "Elevated" | "Surge" | "Crisis";
```

### 3.4 OperatingModeChange

Audit trail for every operating mode transition.

```typescript
interface OperatingModeChange {
  /** Unique identifier */
  id: string;

  /** Whether this mode change applies to a single group or the entire system */
  scope: "Group" | "SystemWide";

  /** If scope is "Group", which group. Null for system-wide changes. */
  assignmentGroupId?: string;

  /** Mode before this transition */
  previousMode: OperatingMode;

  /** Mode after this transition */
  newMode: OperatingMode;

  /** When the transition occurred */
  triggeredAt: Date;

  /**
   * Human-readable reason for the transition.
   * Example: "3 groups at Critical: GDPR-DE, GDPR-FR, CCPA-US"
   */
  triggerReason: string;

  /** When the mode was de-escalated or resolved. Null if still active. */
  resolvedAt?: Date;
}
```

### 3.5 HealthAlert

Individual alerts generated when specific conditions are detected.

```typescript
interface HealthAlert {
  /** Unique identifier */
  id: string;

  /** Assignment Group that triggered this alert */
  assignmentGroupId: string;

  /** Category of the alert */
  alertType: AlertType;

  /** Severity level for display and notification routing */
  severity: HealthStatus;

  /**
   * Human-readable alert message.
   * Example: "CHI-1 case DARS-4821 unassigned for 6 hours in GDPR-DE case pool"
   */
  message: string;

  /** When the alert was generated */
  triggeredAt: Date;

  /** When a manager acknowledged the alert. Null if unacknowledged. */
  acknowledgedAt?: Date;

  /** RS who acknowledged the alert */
  acknowledgedBy?: string;

  /**
   * Free-text description of action taken.
   * Example: "Reassigned to RS-Mueller, escalated to team lead"
   */
  actionTaken?: string;
}

type AlertType =
  | "CHI1_UNASSIGNED"
  | "PENALTY_APPROACHING"
  | "SLA_BREACH"
  | "CAPACITY_GAP"
  | "SINGLE_POINT_OF_FAILURE"
  | "VOLUME_SPIKE"
  | "CERTIFICATION_EXPIRING";
```

### 3.6 TransparencyReportData

Aggregated data for Kodex GAP 7 transparency reporting.

```typescript
interface TransparencyReportData {
  /** Reporting period identifier (e.g., "2026-Q1", "2026-03") */
  period: string;

  /** ISO 3166-1 alpha-2 country code */
  country: string;

  /** Case request type (e.g., "Access", "Deletion", "Rectification", "Objection") */
  requestType: string;

  /** Total cases received in this period/country/type combination */
  totalReceived: number;

  /** Total cases completed (closed with a resolution) */
  totalCompleted: number;

  /** Total cases rejected (closed as invalid, duplicate, or out-of-scope) */
  totalRejected: number;

  /** Total cases cancelled by the requestor */
  totalCancelled: number;

  /** Average calendar days from receipt to completion */
  avgResponseDays: number;

  /** Cases where a financial penalty was incurred */
  penaltyCount: number;
}
```

### 3.7 Entity Relationship Summary

```
AssignmentGroup (Phase 4)
  |
  +--< LensHealthSnapshot (many per group, one per 15-min interval)
  |
  +--1 HealthThresholds (one per group, manager-editable)
  |
  +--< HealthAlert (many per group, generated by snapshot engine)
  |
  +--< OperatingModeChange (many per group or system-wide)

Case (Phase 1)
  |
  +--- CHI score (Phase 2)  ──> feeds chi1Count..chi5Count, complexityAdjustedDepth
  +--- Penalty data (Phase 3) ──> feeds penaltyExposureCount, penaltyExposureAmount
  +--- Assignment (Phase 5) ──> feeds avgTimeToPickDays, completedCount

TransparencyReportData
  |
  +--- aggregated from Case + AssignmentGroup data
```

---

## 4. Business Logic

### 4.1 Demand Metrics Calculation

All demand metrics are calculated per Assignment Group at each snapshot interval.

#### Case Volume (Queue Depth)

```
queueDepth = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND status IN ('Open', 'In Progress', 'Pending')
    AND isDormant = false
    AND assignedRsId IS NULL
)
```

Note: "unassigned, non-dormant" means the case is actively waiting in the case pool for someone to pick it up.

#### Inflow Rate

```
inflowCount = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND dateEnteredQueue >= (now - 7 days)
)

inflowRate = inflowCount / 7
```

Seven-day trailing window smooths daily variance while remaining responsive to trends.

#### Completion Rate

```
completedCount = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND dateCompleted >= (now - 7 days)
    AND status IN ('Closed', 'Resolved')
)

completionRate = completedCount / 7
```

#### Net Flow

```
netFlow = inflowRate - completionRate
```

- **Positive net flow**: case volume is growing (inflow exceeds throughput).
- **Negative net flow**: case volume is shrinking.
- **Near zero**: steady state.

#### Median Age

```
ages = [
    (now - case.dateEnteredQueue) in days
    FOR EACH case WHERE
        assignmentGroupId = :groupId
        AND status IN ('Open', 'In Progress', 'Pending')
]

medianAgeDays = MEDIAN(ages)
oldestCaseDays = MAX(ages)
```

#### Complexity-Adjusted Depth

```
totalComplexity = SUM(case.complexityScore
    FOR EACH case WHERE
        assignmentGroupId = :groupId
        AND status IN ('Open', 'In Progress', 'Pending')
        AND isDormant = false
)

avgComplexityScore = AVG(case.complexityScore
    FOR ALL cases in system with complexityScore > 0
)

complexityAdjustedDepth = totalComplexity / avgComplexityScore
```

This normalizes case volume by work effort. A case pool with 5 cases at complexity 10 shows as depth ~10, equivalent to 10 average cases.

### 4.2 Risk Metrics Calculation

#### Penalty Exposure

```
penaltyExposureCount = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND hasFinancialPenalty = true
    AND status NOT IN ('Closed', 'Resolved', 'Cancelled')
)

penaltyExposureAmount = SUM(case.penaltyAmount WHERE
    assignmentGroupId = :groupId
    AND hasFinancialPenalty = true
    AND status NOT IN ('Closed', 'Resolved', 'Cancelled')
)
```

#### SLA Breach Metrics

```
slaBreachCount = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND status NOT IN ('Closed', 'Resolved', 'Cancelled')
    AND now > dateDue
)

slaBreachImminentCount = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND status NOT IN ('Closed', 'Resolved', 'Cancelled')
    AND dateDue IS NOT NULL
    AND (dateDue - now) <= thresholds.slaWarningDays
    AND (dateDue - now) > 0
)
```

#### Unassigned High-Priority Cases

```
ceUnassignedCount = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND chiScore IN (1, 2)
    AND assignedRsId IS NULL
    AND status NOT IN ('Closed', 'Resolved', 'Cancelled')
)

highPriorityUnassignedCount = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND chiScore = 1
    AND assignedRsId IS NULL
    AND status NOT IN ('Closed', 'Resolved', 'Cancelled')
)
```

#### Time-to-Pick and Time-to-Complete

```
avgTimeToPickDays = AVG(
    (case.datePicked - case.dateEnteredQueue) in days
    FOR EACH case WHERE
        assignmentGroupId = :groupId
        AND datePicked IS NOT NULL
        AND datePicked >= (now - 30 days)
)

avgTimeToCompleteDays = AVG(
    (case.dateCompleted - case.datePicked) in days
    FOR EACH case WHERE
        assignmentGroupId = :groupId
        AND dateCompleted IS NOT NULL
        AND dateCompleted >= (now - 30 days)
)
```

#### Reopen Rate

```
reactivatedCount = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND dateReactivated >= (now - 30 days)
)

completedInPeriod = COUNT(cases WHERE
    assignmentGroupId = :groupId
    AND dateCompleted >= (now - 30 days)
)

reopenRate = completedInPeriod > 0
    ? reactivatedCount / completedInPeriod
    : 0
```

### 4.3 Capacity Metrics Calculation

#### Qualified and Available RS

```
qualifiedRsCount = COUNT(DISTINCT rs WHERE
    EXISTS qualification WHERE
        qualification.rsId = rs.id
        AND qualification.assignmentGroupId = :groupId
        AND qualification.status = 'Active'
        AND (qualification.expiresAt IS NULL OR qualification.expiresAt > now)
)

availableRsCount = COUNT(DISTINCT rs WHERE
    rs.id IN qualifiedRs
    AND rs.onLeave = false
    AND rs.onCall = false
    AND rs.activeCaseCount < rs.dynamicCap
)

assignedRsCount = COUNT(DISTINCT rs WHERE
    EXISTS case WHERE
        case.assignedRsId = rs.id
        AND case.assignmentGroupId = :groupId
        AND case.status IN ('In Progress', 'Pending')
)
```

#### Total Capacity and Capacity Gap

```
totalCapacityPerDay = SUM(
    rs.avgThroughputPerDay
    FOR EACH rs IN assignedRs
)

// If no throughput history, default to 1.0 cases/day per RS
IF totalCapacityPerDay = 0 AND assignedRsCount > 0:
    totalCapacityPerDay = assignedRsCount * 1.0

requiredCapacityPerDay = queueDepth / thresholds.targetDaysToClear

capacityGap = requiredCapacityPerDay - totalCapacityPerDay
```

- **capacityGap > 0**: We need more throughput than we have. Shortfall.
- **capacityGap <= 0**: Current capacity is sufficient to clear the case pool in target days.

#### Utilization Metrics

```
capacityUtilization = totalCapacityPerDay > 0
    ? (inflowRate / totalCapacityPerDay) * 100
    : (inflowRate > 0 ? 999 : 0)

caseloadUtilization = qualifiedRsCount > 0
    ? AVG(rs.activeCaseCount / rs.dynamicCap * 100 FOR EACH rs IN qualifiedRs)
    : 0
```

### 4.4 Health Status Roll-Up Rules

Health status is evaluated per Assignment Group. Rules are evaluated in order; **the first matching rule wins**. This ensures the most severe condition always takes precedence.

```typescript
function calculateHealthStatus(
  snapshot: LensHealthSnapshot,
  thresholds: HealthThresholds,
  recentSnapshots: LensHealthSnapshot[] // last 3 days of snapshots
): HealthStatus {

  // ── CRITICAL (immediate action required) ──────────────────────

  // Rule 1: Any CHI-1 case unassigned for more than 4 hours
  if (snapshot.highPriorityUnassignedCount > 0) {
    const oldestDsi1UnassignedHours = getOldestDsi1UnassignedHours(
      snapshot.assignmentGroupId
    );
    if (oldestDsi1UnassignedHours > 4) {
      return "Critical";
    }
  }

  // Rule 2: SLA breach count exceeds critical threshold
  if (
    thresholds.maxSlaBreachCount !== undefined &&
    snapshot.slaBreachCount > thresholds.maxSlaBreachCount
  ) {
    return "Critical";
  }

  // Rule 3: Case volume exceeds critical threshold
  if (
    thresholds.criticalQueueDepth !== undefined &&
    snapshot.queueDepth > thresholds.criticalQueueDepth
  ) {
    return "Critical";
  }

  // Rule 4: Single Point of Failure AND that RS is unavailable
  if (snapshot.qualifiedRsCount === 1) {
    if (snapshot.availableRsCount === 0) {
      return "Critical";
    }
  }

  // ── WARNING (proactive intervention needed) ───────────────────

  // Rule 5: Capacity gap positive AND net flow positive for 3+ consecutive days
  if (snapshot.capacityGap > 0) {
    const consecutivePositiveNetFlowDays =
      countConsecutivePositiveNetFlowDays(recentSnapshots);
    if (consecutivePositiveNetFlowDays >= 3) {
      return "Warning";
    }
  }

  // Rule 6: Case volume exceeds warning threshold
  if (
    thresholds.maxQueueDepth !== undefined &&
    snapshot.queueDepth > thresholds.maxQueueDepth
  ) {
    return "Warning";
  }

  // Rule 7: Median age exceeds warning threshold
  if (
    thresholds.maxMedianAgeDays !== undefined &&
    snapshot.medianAgeDays > thresholds.maxMedianAgeDays
  ) {
    return "Warning";
  }

  // ── WATCH (monitor closely) ───────────────────────────────────

  // Rule 8: Any metric within 20% of its threshold
  if (isAnyMetricWithin20Percent(snapshot, thresholds)) {
    return "Watch";
  }

  // ── HEALTHY ───────────────────────────────────────────────────

  // Rule 9: All metrics within thresholds
  return "Healthy";
}
```

#### Rule 8 Detail: 20% Proximity Check

```typescript
function isAnyMetricWithin20Percent(
  snapshot: LensHealthSnapshot,
  thresholds: HealthThresholds
): boolean {
  const checks = [
    {
      value: snapshot.queueDepth,
      threshold: thresholds.maxQueueDepth,
    },
    {
      value: snapshot.medianAgeDays,
      threshold: thresholds.maxMedianAgeDays,
    },
    {
      value: snapshot.capacityUtilization,
      threshold: thresholds.maxCapacityUtilization,
    },
    {
      value: snapshot.caseloadUtilization,
      threshold: thresholds.maxCaseloadUtilization,
    },
    {
      value: snapshot.slaBreachCount,
      threshold: thresholds.maxSlaBreachCount,
    },
    {
      value: snapshot.penaltyExposureCount,
      threshold: thresholds.maxPenaltyExposureCount,
    },
  ];

  return checks.some(({ value, threshold }) => {
    if (threshold === undefined || threshold === 0) return false;
    const ratio = value / threshold;
    return ratio >= 0.8 && ratio <= 1.0;
  });
}
```

### 4.5 Operating Mode Triggers

Operating Modes apply system-wide. They are determined by aggregating health statuses across all Assignment Groups.

#### Escalation Rules

| Target Mode   | Trigger Condition                                                    |
|---------------|----------------------------------------------------------------------|
| **Elevated**  | Any 1+ Assignment Group at Warning                                   |
| **Surge**     | Any 1+ Assignment Group at Critical OR 2+ groups at Warning          |
| **Crisis**    | 3+ Assignment Groups at Critical OR CHI-1 backlog system-wide > 10   |

```typescript
function determineOperatingMode(
  groupStatuses: Map<string, HealthStatus>
): OperatingMode {
  const criticalCount = countByStatus(groupStatuses, "Critical");
  const warningCount = countByStatus(groupStatuses, "Warning");
  const totalDsi1Backlog = getTotalDsi1UnassignedSystemWide();

  // Crisis: 3+ Critical OR CHI-1 backlog > 10
  if (criticalCount >= 3 || totalDsi1Backlog > 10) {
    return "Crisis";
  }

  // Surge: any Critical OR 2+ Warning
  if (criticalCount >= 1 || warningCount >= 2) {
    return "Surge";
  }

  // Elevated: any Warning
  if (warningCount >= 1) {
    return "Elevated";
  }

  return "Normal";
}
```

#### De-escalation Rules

De-escalation requires sustained improvement to prevent oscillation ("flapping") between modes.

| Transition             | Condition                                                 |
|------------------------|-----------------------------------------------------------|
| Crisis -> Surge        | 24 consecutive hours with fewer than 3 groups at Critical AND CHI-1 backlog <= 10 |
| Surge -> Elevated      | 48 consecutive hours with 0 groups at Critical            |
| Elevated -> Normal     | 72 consecutive hours with 0 groups at Warning             |

```typescript
function evaluateDeescalation(
  currentMode: OperatingMode,
  modeHistory: OperatingModeChange[],
  groupStatuses: Map<string, HealthStatus>
): OperatingMode | null {
  const criticalCount = countByStatus(groupStatuses, "Critical");
  const warningCount = countByStatus(groupStatuses, "Warning");
  const hoursSinceLastEscalation = getHoursSince(
    modeHistory[modeHistory.length - 1].triggeredAt
  );

  switch (currentMode) {
    case "Crisis":
      if (criticalCount < 3 && getTotalDsi1UnassignedSystemWide() <= 10) {
        if (hoursSinceLastEscalation >= 24) return "Surge";
      }
      break;

    case "Surge":
      if (criticalCount === 0) {
        if (hoursSinceLastEscalation >= 48) return "Elevated";
      }
      break;

    case "Elevated":
      if (warningCount === 0) {
        if (hoursSinceLastEscalation >= 72) return "Normal";
      }
      break;
  }

  return null; // No de-escalation
}
```

### 4.6 Behavioral Changes per Operating Mode

Each Operating Mode activates specific behavioral changes across the system. These changes are enforced by the Assignment Engine (Phase 5) and surfaced in the UI.

#### Normal Mode

| Aspect              | Behavior                                                  |
|---------------------|-----------------------------------------------------------|
| Routing             | Standard skill-based matching, workload-balanced          |
| Capacity Caps       | Dynamic caps as configured                                |
| Focus Requirements  | Standard focus rules apply                                |
| Deferrals           | CHI-4 and CHI-5 may be deferred per normal schedule       |
| Notifications       | Standard alert routing                                    |
| Reporting           | Standard cadence                                          |

#### Elevated Mode

| Aspect              | Behavior                                                  |
|---------------------|-----------------------------------------------------------|
| Routing             | Prioritize Warning-group cases in assignment scoring (+15% weight to group health) |
| Capacity Caps       | No change                                                 |
| Focus Requirements  | RS in Warning groups encouraged to focus on oldest cases first |
| Deferrals           | CHI-5 deferrals extended; CHI-4 deferrals reviewed        |
| Notifications       | Daily health summary email to group managers              |
| Reporting           | Manager dashboard highlights Warning groups               |

#### Surge Mode

| Aspect              | Behavior                                                  |
|---------------------|-----------------------------------------------------------|
| Routing             | **Focus override**: RS with qualifications in Critical groups may receive cases from those groups even if not their primary group. Cross-group assignment enabled. |
| Capacity Caps       | Dynamic caps increased by 20% for RS in Critical/Warning groups |
| Focus Requirements  | **Fast-track routing**: CHI-1 and CHI-2 cases skip normal case list ordering and route to next available qualified RS immediately |
| Deferrals           | CHI-5 cases deferred automatically. CHI-4 cases deferred if RS has CHI-1/2/3 cases available. |
| Notifications       | Hourly health updates to group managers. Escalation to department head. |
| Reporting           | Real-time dashboard auto-refresh every 5 minutes          |

#### Crisis Mode

| Aspect              | Behavior                                                  |
|---------------------|-----------------------------------------------------------|
| Routing             | **All-hands routing**: All qualified RS across all groups are eligible for Critical group cases. Primary group affinity suspended for CHI-1 and CHI-2. |
| Capacity Caps       | Dynamic caps increased by 50%. Hard cap override requires manager approval per RS. |
| Focus Requirements  | **Mandatory focus**: RS must complete or explicitly defer current case before picking new. No concurrent case increases. |
| Deferrals           | CHI-4 and CHI-5 deferred system-wide. Only CHI-1, CHI-2, CHI-3 actively worked. |
| Notifications       | 30-minute health updates. Escalation to VP/Director level. SMS/pager integration if configured. |
| Reporting           | Real-time dashboard auto-refresh every 2 minutes. Situation report generated every 4 hours. |

### 4.7 Transparency Report Aggregation

Data aggregation for Kodex GAP 7 compliance reporting.

```typescript
function aggregateTransparencyData(
  startDate: Date,
  endDate: Date
): TransparencyReportData[] {
  const cases = getCasesInPeriod(startDate, endDate);

  // Group by (period, country, requestType)
  const groups = groupBy(cases, (c) => ({
    period: formatPeriod(startDate, endDate), // e.g., "2026-Q1"
    country: c.dataSubjectCountry,
    requestType: c.requestType,
  }));

  return groups.map(({ key, cases }) => ({
    period: key.period,
    country: key.country,
    requestType: key.requestType,
    totalReceived: cases.length,
    totalCompleted: cases.filter((c) =>
      c.status === "Closed" && c.resolution !== "Rejected" && c.resolution !== "Cancelled"
    ).length,
    totalRejected: cases.filter((c) =>
      c.resolution === "Rejected"
    ).length,
    totalCancelled: cases.filter((c) =>
      c.resolution === "Cancelled"
    ).length,
    avgResponseDays: avg(
      cases
        .filter((c) => c.dateCompleted)
        .map((c) => daysBetween(c.dateReceived, c.dateCompleted))
    ),
    penaltyCount: cases.filter((c) => c.penaltyIncurred === true).length,
  }));
}
```

---

## 5. Components & UI

### 5.1 HealthDashboard.tsx

The manager's primary planning interface. Provides an at-a-glance view of all Assignment Groups and their health.

**Props:**
```typescript
interface HealthDashboardProps {
  /** Currently authenticated user (for permission checks) */
  currentUser: User;
  /** Optional filter to show only specific groups */
  groupFilter?: string[];
}
```

**Layout:**

```
+-------------------------------------------------------------------+
| LENS HEALTH DASHBOARD                         Mode: [SURGE]  [!3] |
+-------------------------------------------------------------------+
| Operating Mode Banner (if not Normal)                              |
| "SURGE MODE ACTIVE since 2026-03-25 14:00 — 1 Critical, 2 Warning"|
| Behavioral changes: Cross-group routing ON | Caps +20% | CHI-5    |
| deferred                                                           |
+-------------------------------------------------------------------+
|                                                                    |
| [Filter: All Groups v] [Time Range: 4 weeks v] [Export v]         |
|                                                                    |
| +-------+----------+-------+------+-----+------+------+---------+ |
| | Group | Status   | Depth | Age  | In  | Out  | Gap  | RS Avl  | |
| +-------+----------+-------+------+-----+------+------+---------+ |
| | GDPR  | CRITICAL | 47    | 12d  | 8/d | 3/d  | +5.2 | 2/8     | |
| |  -DE  | [!]      |       |      |     |      |      |         | |
| +-------+----------+-------+------+-----+------+------+---------+ |
| | GDPR  | WARNING  | 31    | 8d   | 5/d | 4/d  | +1.1 | 4/6     | |
| |  -FR  | [^]      |       |      |     |      |      |         | |
| +-------+----------+-------+------+-----+------+------+---------+ |
| | CCPA  | WARNING  | 28    | 6d   | 6/d | 5/d  | +0.8 | 5/7     | |
| |  -US  | [^]      |       |      |     |      |      |         | |
| +-------+----------+-------+------+-----+------+------+---------+ |
| | PDPA  | WATCH    | 15    | 4d   | 3/d | 3/d  | -0.2 | 3/4     | |
| |  -SG  | [~]      |       |      |     |      |      |         | |
| +-------+----------+-------+------+-----+------+------+---------+ |
| | LGPD  | HEALTHY  | 8     | 2d   | 2/d | 3/d  | -1.0 | 4/5     | |
| |  -BR  | [ok]     |       |      |     |      |      |         | |
| +-------+----------+-------+------+-----+------+------+---------+ |
|                                                                    |
| CHI Distribution (all groups)                                      |
| CHI-1: [|||       ] 3 unassigned (!)   CHI-2: [|||||    ] 12      |
| CHI-3: [||||||||  ] 45                 CHI-4: [||||||   ] 31      |
| CHI-5: [|||       ] 18 (deferred)                                  |
|                                                                    |
| Trend Sparklines (4-week):                                         |
| Case Volume: _/--\__/---\___/^^^^    Inflow: --\_/--\__/--        |
| Completion:  --/--\__/--\_/--        Net Flow: _-_/--^^           |
|                                                                    |
| Active Alerts [3]                                                  |
| [!] CHI-1 DARS-4821 unassigned 6h in GDPR-DE    [Ack] [Assign]  |
| [!] SLA breach: 5 cases past due in GDPR-DE     [Ack] [View]    |
| [^] Capacity gap growing: CCPA-US 3 days trend   [Ack] [Plan]   |
+-------------------------------------------------------------------+
```

**Key behaviors:**
- Table rows sorted by health status severity (Critical first), then by case volume descending.
- Status column uses color coding: Critical = red, Warning = amber, Watch = blue, Healthy = green.
- Clicking a row navigates to GroupHealthDrilldown for that group.
- Auto-refresh interval adapts to Operating Mode: Normal = 15min, Elevated = 10min, Surge = 5min, Crisis = 2min.
- Export button generates CSV of current snapshot data.

### 5.2 GroupHealthDrilldown.tsx

Full detail view for a single Assignment Group.

**Props:**
```typescript
interface GroupHealthDrilldownProps {
  assignmentGroupId: string;
  currentUser: User;
}
```

**Sections:**

1. **Header**: Group name, current health status badge, operating mode, time since last status change.
2. **Metrics Panel** (3-column grid):
   - Demand column: case volume, complexity-adjusted depth, inflow/outflow rates, net flow, median age, oldest case.
   - Risk column: penalty exposure (count + amount), SLA breaches, SLA imminent, CHI-1 unassigned, reopen rate.
   - Capacity column: qualified RS, available RS, assigned RS, total capacity/day, capacity gap, utilization gauges.
3. **Case List**: Filterable/sortable table of all open cases in this group. Columns: Case ID, CHI, Age, Status, Assigned RS, Due Date, Penalty flag.
4. **RS Panel**: Table of all qualified RS for this group. Columns: RS name, status (available/on leave/at cap), active case count, dynamic cap, avg throughput.
5. **Trend Charts** (HealthTrendChart instances):
   - Case volume over 4/8/12 weeks.
   - Inflow vs. completion rate over same period.
   - Capacity utilization over same period.
6. **Inflow Pattern Analysis**: Heatmap showing case arrivals by day-of-week and hour-of-day over last 30 days. Helps managers anticipate demand spikes.
7. **Threshold Configuration**: Inline link to HealthThresholdEditor for this group.

### 5.3 HealthThresholdEditor.tsx

Per-group threshold configuration form. Restricted to managers and admins.

**Props:**
```typescript
interface HealthThresholdEditorProps {
  assignmentGroupId: string;
  currentUser: User;
  onSave: (thresholds: HealthThresholds) => void;
  onCancel: () => void;
}
```

**Layout:**
- Three-section form matching the three dimensions (Demand, Risk, Capacity).
- Each field shows current value, has input for new value, and displays system default as placeholder.
- Validation: criticalQueueDepth must be > maxQueueDepth. slaWarningDays must be < slaTargetDays. minQualifiedRs must be >= 1.
- "Preview Impact" button: simulates what the current case pool's health status would be under the new thresholds (before saving).
- Save generates an audit log entry with before/after values.

### 5.4 OperatingModeBanner.tsx

Persistent banner displayed at the top of all DARS pages when Operating Mode is not Normal.

**Props:**
```typescript
interface OperatingModeBannerProps {
  currentMode: OperatingMode;
  modeChange: OperatingModeChange;
}
```

**Behavior:**
- Hidden when mode is Normal.
- **Elevated**: Blue banner. Shows "ELEVATED MODE" with reason and time since activation. Lists behavioral changes active.
- **Surge**: Amber banner, bold text. Lists specific Critical/Warning groups. Lists all Surge behavioral changes.
- **Crisis**: Red banner, pulsing border animation. Shows crisis reason, escalation contacts, all Crisis behavioral changes. Cannot be dismissed.
- Banner includes a "Details" expand button showing full mode change history.
- Updates via WebSocket subscription to mode changes.

### 5.5 AlertsPanel.tsx

Active alerts panel with severity-based ordering and action buttons.

**Props:**
```typescript
interface AlertsPanelProps {
  alerts: HealthAlert[];
  onAcknowledge: (alertId: string) => void;
  onAction: (alertId: string, action: string) => void;
}
```

**Behavior:**
- Alerts sorted by severity (Critical first), then by triggeredAt (oldest first).
- Each alert row shows: severity icon, alert type badge, message, time since triggered, action buttons.
- Action buttons vary by alert type:
  - CHI1_UNASSIGNED: [Acknowledge] [Assign Now] [View Case]
  - PENALTY_APPROACHING: [Acknowledge] [View Case] [Escalate]
  - SLA_BREACH: [Acknowledge] [View Cases] [Generate Report]
  - CAPACITY_GAP: [Acknowledge] [View Group] [Request Resources]
  - SINGLE_POINT_OF_FAILURE: [Acknowledge] [Cross-Train Plan]
  - VOLUME_SPIKE: [Acknowledge] [View Inflow Analysis]
  - CERTIFICATION_EXPIRING: [Acknowledge] [View RS Profile]
- Acknowledged alerts move to a collapsed "Resolved" section.
- Unacknowledged Critical alerts trigger browser notifications (if permitted).

### 5.6 HealthTrendChart.tsx

Reusable sparkline/mini chart component for time-series health data.

**Props:**
```typescript
interface HealthTrendChartProps {
  /** Data points: array of { date, value } */
  data: Array<{ date: Date; value: number }>;
  /** Chart title */
  title: string;
  /** Time range to display */
  range: "4w" | "8w" | "12w";
  /** Optional threshold line to overlay */
  warningThreshold?: number;
  criticalThreshold?: number;
  /** Chart height in pixels */
  height?: number;
  /** Show area fill below line */
  showArea?: boolean;
}
```

**Rendering:**
- Uses lightweight charting (recharts or similar).
- Threshold lines rendered as horizontal dashed lines (amber for warning, red for critical).
- Hover tooltip shows exact date + value.
- Area below line shaded green when below warning, amber between warning and critical, red above critical.

### 5.7 CapacityGauge.tsx

Visual capacity indicator showing assigned RS / qualified RS.

**Props:**
```typescript
interface CapacityGaugeProps {
  qualifiedRsCount: number;
  availableRsCount: number;
  assignedRsCount: number;
  capacityUtilization: number;
  caseloadUtilization: number;
}
```

**Rendering:**
- Horizontal bar gauge divided into segments: assigned (filled), available-but-unassigned (lighter fill), on-leave/unavailable (gray).
- Numeric labels: "5 assigned / 7 available / 9 qualified".
- Below gauge: utilization percentage with color coding (green < 70%, amber 70-90%, red > 90%).
- SPOF indicator: if qualifiedRsCount <= 1, show warning icon with "Single Point of Failure" label.

### 5.8 TransparencyReportGenerator.tsx

Interface for generating Kodex GAP 7 transparency reports.

**Props:**
```typescript
interface TransparencyReportGeneratorProps {
  currentUser: User;
}
```

**Layout:**
- Period selector: dropdown for quarter or custom date range.
- Grouping options: by country, by request type, or both.
- Preview table showing aggregated data before export.
- Export buttons: CSV, PDF, JSON.
- Columns in export: Period, Country, Request Type, Total Received, Total Completed, Total Rejected, Total Cancelled, Avg Response Days, Penalty Count.

---

## 6. Files to Create

| File Path                                                        | Purpose                                              |
|-----------------------------------------------------------------|------------------------------------------------------|
| `src/types/lensHealth.ts`                                      | All TypeScript interfaces and type aliases from Section 3 |
| `src/services/lensHealthEngine.ts`                             | Core calculation engine: snapshot generation, demand/risk/capacity metrics, health roll-up, operating mode determination |
| `src/services/healthThresholdService.ts`                        | CRUD operations for HealthThresholds. Default threshold factory. Threshold validation logic. |
| `src/services/operatingModeService.ts`                          | Mode transition logic, de-escalation evaluation, behavioral change registry, mode change audit logging |
| `src/services/healthAlertService.ts`                            | Alert generation, deduplication, acknowledgment, notification dispatch |
| `src/services/transparencyReportService.ts`                     | Transparency data aggregation, period grouping, export formatting |
| `src/services/snapshotScheduler.ts`                             | 15-minute interval scheduler, snapshot persistence, retention policy (90 days detailed, 1 year daily rollups) |
| `src/components/LensHealth/HealthDashboard.tsx`                | Main dashboard component (Section 5.1) |
| `src/components/LensHealth/GroupHealthDrilldown.tsx`            | Group detail view (Section 5.2) |
| `src/components/LensHealth/HealthThresholdEditor.tsx`           | Threshold configuration form (Section 5.3) |
| `src/components/LensHealth/OperatingModeBanner.tsx`             | System-wide mode banner (Section 5.4) |
| `src/components/LensHealth/AlertsPanel.tsx`                     | Active alerts panel (Section 5.5) |
| `src/components/LensHealth/HealthTrendChart.tsx`                | Reusable trend chart (Section 5.6) |
| `src/components/LensHealth/CapacityGauge.tsx`                   | Capacity visualization (Section 5.7) |
| `src/components/LensHealth/TransparencyReportGenerator.tsx`     | Report generator UI (Section 5.8) |
| `src/hooks/useLensHealth.ts`                                   | React hook: fetches snapshots, subscribes to updates, provides health data to components |
| `src/hooks/useOperatingMode.ts`                                 | React hook: subscribes to operating mode changes, provides current mode and behavioral flags |
| `src/hooks/useHealthAlerts.ts`                                  | React hook: manages alert state, acknowledgment, notification permissions |
| `src/store/lensHealthSlice.ts`                                 | Redux/Zustand slice for LENS Health state |
| `src/mocks/lensHealthMocks.ts`                                 | Mock data for all LENS Health entities |
| `src/__tests__/lensHealthEngine.test.ts`                       | Unit tests for health calculation engine |
| `src/__tests__/operatingModeService.test.ts`                    | Unit tests for mode transitions and de-escalation |
| `src/__tests__/healthStatusRollup.test.ts`                      | Unit tests for all 9 roll-up rules |

---

## 7. Files to Modify

| File Path                                                        | Change Description                                    |
|-----------------------------------------------------------------|-------------------------------------------------------|
| `src/types/index.ts`                                            | Re-export all types from `lensHealth.ts`             |
| `src/services/assignmentEngine.ts` (Phase 5)                   | Integrate operating mode behavioral changes: cap overrides, focus routing, deferral logic, cross-group assignment |
| `src/components/Layout/AppHeader.tsx`                           | Mount `OperatingModeBanner` component globally         |
| `src/components/Navigation/Sidebar.tsx`                         | Add "LENS Health" navigation item under Management section |
| `src/routes/index.tsx`                                          | Add routes: `/health`, `/health/:groupId`, `/health/thresholds/:groupId`, `/transparency` |
| `src/store/index.ts`                                            | Register `lensHealthSlice`                            |
| `src/services/collectionPipeline.ts` (Phase 5)                 | Emit events on case completion for throughput tracking  |
| `src/types/case.ts`                                             | Add `dateEnteredQueue`, `datePicked`, `dateReactivated` fields if not present |
| `src/services/notificationService.ts`                           | Add health alert notification templates, operating mode change notifications |
| `src/components/CaseForm/CaseHeader.tsx`                        | Show health status badge for case's Assignment Group    |

---

## 8. Mock Data

### 8.1 Mock Assignment Groups with Health Data

```typescript
export const mockHealthSnapshots: LensHealthSnapshot[] = [
  {
    id: "snap-001",
    assignmentGroupId: "grp-gdpr-de",
    snapshotDate: new Date("2026-03-26T10:00:00Z"),
    queueDepth: 47,
    complexityAdjustedDepth: 62.3,
    inflowCount: 56,
    completedCount: 21,
    medianAgeDays: 12,
    oldestCaseDays: 34,
    chi1Count: 2,
    chi2Count: 5,
    chi3Count: 18,
    chi4Count: 14,
    chi5Count: 8,
    penaltyExposureCount: 3,
    penaltyExposureAmount: 45000,
    slaBreachCount: 5,
    slaBreachImminentCount: 8,
    ceUnassignedCount: 4,
    highPriorityUnassignedCount: 2,
    avgTimeToPickDays: 2.3,
    avgTimeToCompleteDays: 8.7,
    qualifiedRsCount: 8,
    availableRsCount: 2,
    assignedRsCount: 6,
    totalCapacityPerDay: 3.2,
    capacityGap: 5.2,
    capacityUtilization: 112,
    caseloadUtilization: 94,
    dormantCount: 3,
    reopenRate: 0.08,
    healthStatus: "Critical",
    operatingMode: "Surge",
  },
  {
    id: "snap-002",
    assignmentGroupId: "grp-gdpr-fr",
    snapshotDate: new Date("2026-03-26T10:00:00Z"),
    queueDepth: 31,
    complexityAdjustedDepth: 38.1,
    inflowCount: 35,
    completedCount: 28,
    medianAgeDays: 8,
    oldestCaseDays: 21,
    chi1Count: 0,
    chi2Count: 3,
    chi3Count: 12,
    chi4Count: 10,
    chi5Count: 6,
    penaltyExposureCount: 1,
    penaltyExposureAmount: 15000,
    slaBreachCount: 2,
    slaBreachImminentCount: 5,
    ceUnassignedCount: 1,
    highPriorityUnassignedCount: 0,
    avgTimeToPickDays: 1.5,
    avgTimeToCompleteDays: 6.2,
    qualifiedRsCount: 6,
    availableRsCount: 4,
    assignedRsCount: 5,
    totalCapacityPerDay: 4.1,
    capacityGap: 1.1,
    capacityUtilization: 87,
    caseloadUtilization: 78,
    dormantCount: 1,
    reopenRate: 0.05,
    healthStatus: "Warning",
    operatingMode: "Surge",
  },
  {
    id: "snap-003",
    assignmentGroupId: "grp-ccpa-us",
    snapshotDate: new Date("2026-03-26T10:00:00Z"),
    queueDepth: 28,
    complexityAdjustedDepth: 25.4,
    inflowCount: 42,
    completedCount: 35,
    medianAgeDays: 6,
    oldestCaseDays: 15,
    chi1Count: 1,
    chi2Count: 4,
    chi3Count: 10,
    chi4Count: 8,
    chi5Count: 5,
    penaltyExposureCount: 0,
    penaltyExposureAmount: 0,
    slaBreachCount: 1,
    slaBreachImminentCount: 3,
    ceUnassignedCount: 2,
    highPriorityUnassignedCount: 1,
    avgTimeToPickDays: 1.1,
    avgTimeToCompleteDays: 5.4,
    qualifiedRsCount: 7,
    availableRsCount: 5,
    assignedRsCount: 6,
    totalCapacityPerDay: 5.0,
    capacityGap: 0.8,
    capacityUtilization: 84,
    caseloadUtilization: 71,
    dormantCount: 0,
    reopenRate: 0.03,
    healthStatus: "Warning",
    operatingMode: "Surge",
  },
  {
    id: "snap-004",
    assignmentGroupId: "grp-pdpa-sg",
    snapshotDate: new Date("2026-03-26T10:00:00Z"),
    queueDepth: 15,
    complexityAdjustedDepth: 14.2,
    inflowCount: 21,
    completedCount: 21,
    medianAgeDays: 4,
    oldestCaseDays: 11,
    chi1Count: 0,
    chi2Count: 1,
    chi3Count: 6,
    chi4Count: 5,
    chi5Count: 3,
    penaltyExposureCount: 0,
    penaltyExposureAmount: 0,
    slaBreachCount: 0,
    slaBreachImminentCount: 1,
    ceUnassignedCount: 0,
    highPriorityUnassignedCount: 0,
    avgTimeToPickDays: 0.8,
    avgTimeToCompleteDays: 4.1,
    qualifiedRsCount: 4,
    availableRsCount: 3,
    assignedRsCount: 3,
    totalCapacityPerDay: 3.0,
    capacityGap: -0.2,
    capacityUtilization: 70,
    caseloadUtilization: 65,
    dormantCount: 0,
    reopenRate: 0.02,
    healthStatus: "Watch",
    operatingMode: "Surge",
  },
  {
    id: "snap-005",
    assignmentGroupId: "grp-lgpd-br",
    snapshotDate: new Date("2026-03-26T10:00:00Z"),
    queueDepth: 8,
    complexityAdjustedDepth: 7.5,
    inflowCount: 14,
    completedCount: 21,
    medianAgeDays: 2,
    oldestCaseDays: 7,
    chi1Count: 0,
    chi2Count: 0,
    chi3Count: 3,
    chi4Count: 3,
    chi5Count: 2,
    penaltyExposureCount: 0,
    penaltyExposureAmount: 0,
    slaBreachCount: 0,
    slaBreachImminentCount: 0,
    ceUnassignedCount: 0,
    highPriorityUnassignedCount: 0,
    avgTimeToPickDays: 0.5,
    avgTimeToCompleteDays: 3.2,
    qualifiedRsCount: 5,
    availableRsCount: 4,
    assignedRsCount: 4,
    totalCapacityPerDay: 4.5,
    capacityGap: -1.0,
    capacityUtilization: 44,
    caseloadUtilization: 52,
    dormantCount: 0,
    reopenRate: 0.01,
    healthStatus: "Healthy",
    operatingMode: "Surge",
  },
];
```

### 8.2 Mock Health Thresholds

```typescript
export const mockHealthThresholds: HealthThresholds[] = [
  {
    id: "thresh-001",
    assignmentGroupId: "grp-gdpr-de",
    setBy: "mgr-schmidt",
    updatedAt: new Date("2026-03-01T09:00:00Z"),
    maxQueueDepth: 30,
    criticalQueueDepth: 50,
    maxMedianAgeDays: 7,
    criticalMedianAgeDays: 14,
    maxNetFlowPerDay: 3,
    maxTimeToPickDays: 2,
    slaTargetDays: 30,
    slaWarningDays: 5,
    maxPenaltyExposureCount: 2,
    maxSlaBreachCount: 3,
    maxDsi1Unassigned: 0,
    minQualifiedRs: 4,
    minAvailableRs: 2,
    targetDaysToClear: 14,
    maxCapacityUtilization: 90,
    maxCaseloadUtilization: 85,
  },
  {
    id: "thresh-002",
    assignmentGroupId: "grp-lgpd-br",
    setBy: "mgr-silva",
    updatedAt: new Date("2026-02-15T14:00:00Z"),
    maxQueueDepth: 20,
    criticalQueueDepth: 40,
    maxMedianAgeDays: 5,
    criticalMedianAgeDays: 10,
    maxNetFlowPerDay: 2,
    maxTimeToPickDays: 1,
    slaTargetDays: 15,
    slaWarningDays: 3,
    maxPenaltyExposureCount: 1,
    maxSlaBreachCount: 2,
    maxDsi1Unassigned: 0,
    minQualifiedRs: 3,
    minAvailableRs: 2,
    targetDaysToClear: 10,
    maxCapacityUtilization: 85,
    maxCaseloadUtilization: 80,
  },
];
```

### 8.3 Mock Alerts

```typescript
export const mockHealthAlerts: HealthAlert[] = [
  {
    id: "alert-001",
    assignmentGroupId: "grp-gdpr-de",
    alertType: "CHI1_UNASSIGNED",
    severity: "Critical",
    message: "CHI-1 case DARS-4821 unassigned for 6 hours in GDPR-DE case pool",
    triggeredAt: new Date("2026-03-26T04:00:00Z"),
    acknowledgedAt: undefined,
    acknowledgedBy: undefined,
    actionTaken: undefined,
  },
  {
    id: "alert-002",
    assignmentGroupId: "grp-gdpr-de",
    alertType: "SLA_BREACH",
    severity: "Critical",
    message: "5 cases past SLA due date in GDPR-DE case pool. Total penalty exposure: EUR 45,000",
    triggeredAt: new Date("2026-03-26T06:15:00Z"),
    acknowledgedAt: undefined,
    acknowledgedBy: undefined,
    actionTaken: undefined,
  },
  {
    id: "alert-003",
    assignmentGroupId: "grp-ccpa-us",
    alertType: "CAPACITY_GAP",
    severity: "Warning",
    message:
      "Capacity gap growing in CCPA-US: positive net flow for 3 consecutive days. Gap: +0.8 cases/day",
    triggeredAt: new Date("2026-03-26T08:30:00Z"),
    acknowledgedAt: undefined,
    acknowledgedBy: undefined,
    actionTaken: undefined,
  },
  {
    id: "alert-004",
    assignmentGroupId: "grp-pdpa-sg",
    alertType: "SINGLE_POINT_OF_FAILURE",
    severity: "Watch",
    message:
      "PDPA-SG has only 1 qualified RS for PDPA-Complex subcategory. Cross-training recommended.",
    triggeredAt: new Date("2026-03-25T12:00:00Z"),
    acknowledgedAt: new Date("2026-03-25T14:30:00Z"),
    acknowledgedBy: "mgr-tan",
    actionTaken: "Initiated cross-training for RS-Wong on PDPA-Complex. ETA: 2 weeks.",
  },
];
```

### 8.4 Mock Operating Mode Change

```typescript
export const mockOperatingModeChanges: OperatingModeChange[] = [
  {
    id: "mode-001",
    scope: "SystemWide",
    assignmentGroupId: undefined,
    previousMode: "Normal",
    newMode: "Elevated",
    triggeredAt: new Date("2026-03-24T09:00:00Z"),
    triggerReason: "GDPR-DE entered Warning status: case volume 32 exceeds threshold 30",
    resolvedAt: new Date("2026-03-25T11:00:00Z"),
  },
  {
    id: "mode-002",
    scope: "SystemWide",
    assignmentGroupId: undefined,
    previousMode: "Elevated",
    newMode: "Surge",
    triggeredAt: new Date("2026-03-25T11:00:00Z"),
    triggerReason:
      "GDPR-DE entered Critical: CHI-1 case unassigned >4h. Additionally GDPR-FR and CCPA-US at Warning.",
    resolvedAt: undefined,
  },
];
```

### 8.5 Mock Transparency Report Data

```typescript
export const mockTransparencyData: TransparencyReportData[] = [
  {
    period: "2026-Q1",
    country: "DE",
    requestType: "Access",
    totalReceived: 342,
    totalCompleted: 298,
    totalRejected: 12,
    totalCancelled: 8,
    avgResponseDays: 18.4,
    penaltyCount: 2,
  },
  {
    period: "2026-Q1",
    country: "DE",
    requestType: "Deletion",
    totalReceived: 187,
    totalCompleted: 156,
    totalRejected: 5,
    totalCancelled: 3,
    avgResponseDays: 22.1,
    penaltyCount: 1,
  },
  {
    period: "2026-Q1",
    country: "FR",
    requestType: "Access",
    totalReceived: 215,
    totalCompleted: 198,
    totalRejected: 7,
    totalCancelled: 4,
    avgResponseDays: 14.2,
    penaltyCount: 0,
  },
  {
    period: "2026-Q1",
    country: "US",
    requestType: "Deletion",
    totalReceived: 428,
    totalCompleted: 401,
    totalRejected: 15,
    totalCancelled: 6,
    avgResponseDays: 11.8,
    penaltyCount: 0,
  },
];
```

---

## 9. State Management

### 9.1 LENS Health Store Slice

```typescript
// src/store/lensHealthSlice.ts

interface LensHealthState {
  /** Most recent snapshot per group */
  latestSnapshots: Record<string, LensHealthSnapshot>;

  /** Historical snapshots for trend charts (keyed by groupId) */
  snapshotHistory: Record<string, LensHealthSnapshot[]>;

  /** Thresholds per group */
  thresholds: Record<string, HealthThresholds>;

  /** Active (unresolved) alerts */
  activeAlerts: HealthAlert[];

  /** Current system-wide operating mode */
  currentOperatingMode: OperatingMode;

  /** Operating mode change history */
  modeHistory: OperatingModeChange[];

  /** Transparency report data (loaded on demand) */
  transparencyData: TransparencyReportData[];

  /** Loading states */
  loading: {
    snapshots: boolean;
    thresholds: boolean;
    alerts: boolean;
    transparency: boolean;
  };

  /** Error states */
  errors: {
    snapshots: string | null;
    thresholds: string | null;
    alerts: string | null;
    transparency: string | null;
  };

  /** UI state */
  ui: {
    selectedGroupId: string | null;
    dashboardTimeRange: "4w" | "8w" | "12w";
    alertFilter: AlertType | "all";
    groupFilter: string[];
  };
}
```

### 9.2 Actions

```typescript
// Snapshot actions
fetchLatestSnapshots(): void;
fetchSnapshotHistory(groupId: string, range: "4w" | "8w" | "12w"): void;

// Threshold actions
fetchThresholds(groupId: string): void;
updateThresholds(groupId: string, thresholds: Partial<HealthThresholds>): void;
previewThresholdImpact(groupId: string, thresholds: HealthThresholds): HealthStatus;

// Alert actions
fetchActiveAlerts(): void;
acknowledgeAlert(alertId: string, actionTaken?: string): void;
dismissAlert(alertId: string): void;

// Operating mode actions
fetchCurrentMode(): void;
subscribeToModeChanges(): void;  // WebSocket subscription

// Transparency actions
fetchTransparencyData(startDate: Date, endDate: Date): void;
exportTransparencyReport(format: "csv" | "pdf" | "json"): void;

// UI actions
selectGroup(groupId: string | null): void;
setDashboardTimeRange(range: "4w" | "8w" | "12w"): void;
setAlertFilter(filter: AlertType | "all"): void;
setGroupFilter(groupIds: string[]): void;
```

### 9.3 Selectors

```typescript
// Derived data selectors
selectAllGroupHealthSummaries(): GroupHealthSummary[];  // sorted by severity
selectGroupHealth(groupId: string): LensHealthSnapshot | null;
selectGroupTrends(groupId: string): TrendData;
selectSystemHealthOverview(): { critical: number; warning: number; watch: number; healthy: number };
selectActiveAlertCount(): number;
selectUnacknowledgedCriticalAlerts(): HealthAlert[];
selectCapacityOverview(): { totalQualified: number; totalAvailable: number; totalAssigned: number };
selectDsiDistribution(): { chi1: number; chi2: number; chi3: number; chi4: number; chi5: number };
```

### 9.4 Real-Time Update Strategy

| Data Type           | Update Mechanism                        | Frequency                           |
|--------------------|-----------------------------------------|-------------------------------------|
| Health Snapshots   | Polling via `useLensHealth` hook        | Adapts to operating mode (2-15 min) |
| Operating Mode     | WebSocket subscription                   | Instant on change                   |
| Health Alerts      | WebSocket subscription + polling fallback | Instant on new alert, poll every 60s |
| Thresholds         | On-demand fetch + optimistic update      | On editor open, on save             |
| Transparency Data  | On-demand fetch                          | On report page load                 |

---

## 10. Edge Cases

### 10.1 New Assignment Group (No History)

- **Scenario**: A group is created but has no cases and no snapshots yet.
- **Handling**: Generate a snapshot with all metrics at 0. Health status = "Healthy". Do not generate alerts. Show "No data yet" in trend charts. Require manager to set thresholds before meaningful health monitoring begins.

### 10.2 Group With No Qualified RS

- **Scenario**: All RS qualifications for a group have expired or been revoked.
- **Handling**: qualifiedRsCount = 0, availableRsCount = 0. If queueDepth > 0, immediately trigger CAPACITY_GAP alert at Critical severity. Health status = "Critical" (rule 4 variant: SPOF with 0 RS). Generate CERTIFICATION_EXPIRING alerts proactively when last RS qualification is within 30 days of expiry.

### 10.3 All RS on Leave Simultaneously

- **Scenario**: qualifiedRsCount > 0 but availableRsCount = 0 because all are on leave.
- **Handling**: totalCapacityPerDay = 0. capacityGap = queueDepth / targetDaysToClear (fully unmet). Alert: CAPACITY_GAP at Critical. Health status: Critical (no capacity to absorb any work).

### 10.4 Massive Volume Spike

- **Scenario**: Inflow increases 300%+ in a single day (e.g., regulatory deadline, media event).
- **Handling**: VOLUME_SPIKE alert triggered when inflowRate > 2x the 30-day average. netFlow will spike positive, likely triggering Warning/Critical within 1-2 snapshot cycles. Operating mode should escalate to Surge or Crisis automatically. Behavioral changes (CHI-5 deferral, cap increases) activate to absorb spike.

### 10.5 Flapping Prevention

- **Scenario**: Case volume oscillates around a threshold boundary, causing rapid status changes.
- **Handling**: De-escalation requires sustained improvement (24/48/72 hours per mode). For health status: once a group enters Warning or Critical, it remains there until the triggering metric falls below 90% of its threshold (10% hysteresis band). Status change events are rate-limited to maximum one change per hour per group.

### 10.6 Threshold Configuration Conflicts

- **Scenario**: Manager sets criticalQueueDepth less than or equal to maxQueueDepth.
- **Handling**: Validation in HealthThresholdEditor prevents saving. Error message: "Critical threshold must be greater than warning threshold." Server-side validation as backup.

### 10.7 Snapshot Generation Failure

- **Scenario**: The 15-minute snapshot scheduler fails (database timeout, service crash).
- **Handling**: Missed snapshots are not retroactively generated. The next successful snapshot captures current state. If 3+ consecutive snapshots are missed (45+ minutes), generate a SYSTEM alert to operations team. Dashboard shows "Last updated: X minutes ago" with a stale-data warning banner if data is > 20 minutes old.

### 10.8 Operating Mode Conflict Between Manual and Automatic

- **Scenario**: System calculates "Normal" mode but a manager has manually escalated to "Elevated" for a planned maintenance window.
- **Handling**: Manual escalations always take precedence over automatic de-escalation. Manual mode has an optional `expiresAt` field. Automatic escalation can still push the mode higher (e.g., manual Elevated can be auto-escalated to Surge). Only automatic de-escalation is blocked, not manual de-escalation.

### 10.9 Transparency Report Period Boundaries

- **Scenario**: A case is received in Q4 but completed in Q1. Which period does it count in?
- **Handling**: `totalReceived` counts by `dateReceived` falling in the period. `totalCompleted` counts by `dateCompleted` falling in the period. This means a quarterly report may show more completions than receipts (clearing backlog from previous quarter) or vice versa. A note in the report explains this methodology.

### 10.10 Dormant Cases and Case Volume

- **Scenario**: A group has 50 cases but 30 are dormant. Is the case volume 50 or 20?
- **Handling**: queueDepth excludes dormant cases by definition (unassigned AND non-dormant). dormantCount is tracked separately. Dashboard shows both: "Active: 20, Dormant: 30". Dormant cases are still visible in GroupHealthDrilldown's case list with a "Dormant" badge, but they do not contribute to demand metrics or health status calculations.

---

## 11. Acceptance Criteria

### Health Snapshot Engine

1. **AC-601**: The snapshot engine generates a `LensHealthSnapshot` for every active Assignment Group every 15 minutes. Each snapshot contains all 30+ metrics defined in Section 3.1, calculated per the formulas in Section 4.1-4.3.

2. **AC-602**: `queueDepth` counts only open, unassigned, non-dormant cases. Dormant cases are excluded from case volume but tracked in the `dormantCount` field.

3. **AC-603**: `complexityAdjustedDepth` correctly normalizes case volume by complexity score. A case pool of 5 cases with complexity 10 each produces an adjusted depth approximately equal to 10 (assuming system-wide average complexity of 5).

4. **AC-604**: `inflowRate` and `completionRate` use a trailing 7-day window. `netFlow` equals `inflowRate - completionRate`. Positive netFlow indicates growing case volume.

5. **AC-605**: `penaltyExposureAmount` sums the monetary value of all open cases with financial penalties. `penaltyExposureCount` counts those cases.

### Health Status Roll-Up

6. **AC-606**: Health status roll-up evaluates all 9 rules in priority order (Section 4.4). The first matching rule determines the status. Given a group with 1 CHI-1 case unassigned for 5 hours and case volume at 25 (below both thresholds), the status is "Critical" (rule 1 matches first).

7. **AC-607**: The 20% proximity check (rule 8) correctly identifies metrics within 80-100% of their threshold. If maxQueueDepth = 30 and queueDepth = 25 (83%), status is "Watch".

8. **AC-608**: Health status changes are rate-limited to one change per hour per group. If case volume oscillates across a threshold boundary within an hour, only the first transition is recorded.

### Operating Modes

9. **AC-609**: Operating mode escalation follows the rules in Section 4.5: any Warning = Elevated, any Critical or 2+ Warning = Surge, 3+ Critical or CHI-1 backlog > 10 = Crisis.

10. **AC-610**: De-escalation requires sustained improvement: Crisis to Surge after 24h with fewer than 3 Critical, Surge to Elevated after 48h with 0 Critical, Elevated to Normal after 72h with 0 Warning.

11. **AC-611**: Each operating mode activates the correct behavioral changes as defined in Section 4.6. In Surge mode: dynamic caps increase by 20%, cross-group assignment is enabled, CHI-5 cases are deferred, and CHI-1/2 cases route via fast-track.

12. **AC-612**: Every operating mode transition is logged as an `OperatingModeChange` record with scope, previous mode, new mode, trigger reason, and timestamp.

### Health Dashboard

13. **AC-613**: The Health Dashboard displays all Assignment Groups in a table sorted by health status severity (Critical first), then by case volume descending. Each row shows: group name, status badge, case volume, median age, inflow/outflow rates, capacity gap, and available RS count.

14. **AC-614**: The dashboard auto-refresh interval adapts to the current operating mode: Normal = 15 min, Elevated = 10 min, Surge = 5 min, Crisis = 2 min.

15. **AC-615**: Clicking a group row in the dashboard navigates to GroupHealthDrilldown showing all metrics, case list, RS panel, and trend charts for that group.

### Thresholds

16. **AC-616**: Managers can view and edit health thresholds for each Assignment Group they manage. The threshold editor validates that `criticalQueueDepth > maxQueueDepth`, `slaWarningDays < slaTargetDays`, and `minQualifiedRs >= 1`.

17. **AC-617**: The "Preview Impact" button in the threshold editor shows what the group's current health status would be under the proposed thresholds, without saving.

### Alerts

18. **AC-618**: Health alerts are generated automatically when conditions match (CHI1_UNASSIGNED when CHI-1 case unassigned > 4h, SLA_BREACH when breach detected, CAPACITY_GAP when gap > 0 for 3+ days, etc.). Alerts are deduplicated: no duplicate alert for the same condition on the same group within 4 hours.

19. **AC-619**: Managers can acknowledge alerts and record actions taken. Acknowledged alerts move to a "Resolved" section in the AlertsPanel.

20. **AC-620**: Unacknowledged Critical alerts trigger browser notifications (with user permission). In Crisis mode, alerts are sent every 30 minutes until acknowledged.

### Transparency Reporting

21. **AC-621**: The Transparency Report Generator aggregates case data by period, country, and request type. Output includes: total received, completed, rejected, cancelled, average response days, and penalty count.

22. **AC-622**: Transparency reports can be exported in CSV, PDF, and JSON formats. The CSV format includes headers matching the `TransparencyReportData` fields.

### Integration

23. **AC-623**: The Assignment Engine (Phase 5) reads the current operating mode and applies behavioral changes: cap overrides, focus routing adjustments, deferral logic, and cross-group assignment rules as specified in Section 4.6.

24. **AC-624**: The OperatingModeBanner appears at the top of all DARS pages when operating mode is not Normal. The banner cannot be dismissed in Crisis mode. The banner displays the current mode, reason, duration, and active behavioral changes.

25. **AC-625**: Snapshot data older than 90 days is rolled up to daily aggregates. Daily aggregates are retained for 1 year. Detailed 15-minute snapshots older than 90 days are purged by the retention policy.

---

## 12. Cross-References

### Phase Dependencies (Upstream)

| Reference                                      | Relationship                                                  |
|------------------------------------------------|---------------------------------------------------------------|
| Phase 2 - `CHI` scoring                       | CHI scores feed `chi1Count..chi5Count`, health rule 1 (CHI-1 unassigned), and the system-wide CHI-1 backlog count for Crisis mode. |
| Phase 2 - `complexityScore`                   | Complexity scores feed `complexityAdjustedDepth` calculation. |
| Phase 3 - Penalty Engine                       | Penalty data feeds `penaltyExposureCount`, `penaltyExposureAmount`, and `PENALTY_APPROACHING` alerts. |
| Phase 4 - `AssignmentGroup`                   | Every health metric is scoped to an Assignment Group. The group is the fundamental unit of health measurement. |
| Phase 4 - `Qualification`                     | Qualifications feed `qualifiedRsCount` and `availableRsCount` capacity metrics. SPOF detection depends on qualification count. |
| Phase 5 - Collection Pipeline                  | Case lifecycle events (dateEnteredQueue, datePicked, dateCompleted) feed throughput metrics. `avgTimeToPickDays`, `avgTimeToCompleteDays`, `completionRate`. |
| Phase 5 - Dynamic Caps                        | `dynamicCap` per RS feeds `caseloadUtilization`. Operating mode cap overrides (+20%/+50%) modify these caps. |

### Phase Dependencies (Downstream)

| Reference                                      | Relationship                                                  |
|------------------------------------------------|---------------------------------------------------------------|
| Phase 7 - Reporting & Analytics               | LENS Health snapshots are a primary data source for operational reporting. Trend analysis, SLA compliance reports, and capacity planning reports consume snapshot history. |
| Phase 8 - Continuous Improvement               | Health metrics feed the feedback loop for tuning CHI weights, complexity scores, and dynamic cap parameters. |

### Source Document Traceability

| Spec Section                    | Source Document Section                                      |
|---------------------------------|--------------------------------------------------------------|
| 3.1 LensHealthSnapshot        | DARS_Case_Health_Management.md section 5 (LENS Health Metrics) |
| 3.2 HealthThresholds           | DARS_Case_Health_Management.md section 6 (Health Thresholds) |
| 4.4 Health Status Roll-Up      | DARS_Case_Health_Management.md section 7 (Health Status)     |
| 4.5 Operating Mode Triggers    | DARS_Case_Health_Management.md section 8 (Operating Modes)   |
| 4.5 ICS-inspired escalation    | Triage_Framework_Evaluation.md section 3 (ICS Surge Protocols) |
| 4.6 Resource-based mode changes| Triage_Framework_Evaluation.md section 5 (ESI Resource Triage) |
| 4.7 Transparency Aggregation   | Kodex GAP 7 requirements                                     |

### Glossary

| Term                       | Definition                                                    |
|---------------------------|---------------------------------------------------------------|
| **Assignment Group**       | A logical grouping of cases by regulation/jurisdiction (e.g., GDPR-DE, CCPA-US). Phase 4 entity. |
| **CHI**                    | Data Subject Impact score (1-5, 1 = most severe). Phase 2 entity. |
| **Dynamic Cap**            | The maximum concurrent cases an RS should handle, adjusted by complexity and skill. Phase 5 entity. |
| **Health Status**          | Composite assessment of a group's operational state: Healthy, Watch, Warning, Critical. |
| **Net Flow**               | Inflow rate minus completion rate. Positive = growing case volume. |
| **Operating Mode**         | System-wide operational posture: Normal, Elevated, Surge, Crisis. |
| **RS**                     | Reviewing Specialist. The person who works cases. |
| **SPOF**                   | Single Point of Failure. A group with only 1 qualified RS. |
| **SLA**                    | Service Level Agreement. The contractual deadline for case completion. |
| **Throughput**             | Cases completed per unit time. |
| **Kodex GAP 7**            | Regulatory requirement for transparency reporting on data subject request processing. |
