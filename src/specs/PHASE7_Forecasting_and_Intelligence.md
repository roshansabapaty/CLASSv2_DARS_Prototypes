# Phase 7 -- Forecasting & Intelligence

**Parent**: DARS Case Operations & Workforce Intelligence Roadmap, Phase 7
**Status**: Draft
**Created**: 2026-03-26
**Last Updated**: 2026-03-26

---

## 1. Overview

Forecasting turns reactive scrambling into proactive planning. Instead of discovering on Tuesday that India volume doubled last week, the system projects it 2 weeks out and recommends adding RS before the backlog forms. Scenario modeling lets managers test "what if" before committing to changes. Cross-training recommendations close qualification gaps before they become crises.

| Capability | Purpose |
|---|---|
| **Staffing Forecasts** | Week-by-week projections per Assignment Group, 4-8 weeks out. Shows projected inflow, capacity, case volume, capacity gap, and how many RS are needed to close the gap. |
| **Forecast Calculations** | Deterministic formulas that combine rolling averages, seasonal data, known events, leave calendars, and training pipelines to produce per-week projections with confidence bands. |
| **Scenario Modeling** | "What If" simulations: add/remove RS, volume spike, cross-train, deadline change. Side-by-side comparison of baseline vs. scenario with delta highlighting. |
| **Cross-Training Recommendations** | Identify qualification gaps by comparing projected demand against qualified RS count. Suggest candidates ranked by transferable skill overlap and availability. Show estimated ramp timeline. |
| **Certification Renewal Alerts** | Surface expiring certifications before they lapse, with renewal action links. Prevent qualified RS from silently dropping out of assignment groups. |
| **Duplicate & Cross-Reference Detection** | Detect the same identifier (SSN, phone, name, etc.) appearing across multiple cases. Flag potential duplicates, data package reuse opportunities, and same-agency overlaps. |
| **AI-Assisted Assignment (Future)** | Copilot-style suggestions for optimal case-to-RS assignment based on workload, qualifications, and throughput history. Deferred to post-Phase 7 iteration. |

---

## 2. Prerequisites

All of the following must be complete before Phase 7 work begins:

| Prerequisite Phase | Deliverable | Why Phase 7 Needs It |
|---|---|---|
| **Phase 4** | Assignment Groups | Forecasts are scoped per Assignment Group; groups define which RS belong to which case pool |
| **Phase 4** | Qualifications model | Cross-training recommendations compare RS qualifications against group requirements; throughput data per RS per group powers capacity projections |
| **Phase 6** | LENS Health Snapshots | Historical time-series data is the primary input to the rolling-average and seasonal-trend forecast calculations |
| **Phase 6** | Health Thresholds | Projected health status per week uses the same threshold config (Green/Yellow/Red) defined in Phase 6 |

---

## 3. Data Model

All types live in `src/types/forecastTypes.ts` unless otherwise noted.

### 3.1 Staffing Forecast

```typescript
// ---------------------------------------------------------------------------
// Staffing Forecast -- top-level forecast document
// ---------------------------------------------------------------------------

import { HealthStatus } from "./lensHealthTypes";

export interface StaffingForecast {
  /** Unique forecast identifier. */
  id: string;

  /** The Assignment Group this forecast covers. */
  assignmentGroupId: string;

  /** ISO 8601 timestamp when the forecast was generated. */
  generatedAt: string;

  /** Who triggered the forecast generation. */
  generatedBy: "System" | "Manager";

  /** Number of weeks projected (4-8). */
  forecastWeeks: number;

  /** Ordered array of per-week projections, index 0 = next week. */
  projections: WeeklyProjection[];
}
```

### 3.2 Weekly Projection

```typescript
// ---------------------------------------------------------------------------
// WeeklyProjection -- one week within a forecast
// ---------------------------------------------------------------------------

export interface WeeklyProjection {
  /** Monday of the projected week (ISO date string). */
  weekStart: string;

  /** Projected new cases arriving per business day. */
  projectedInflowPerDay: number;

  /** Projected cases completable per business day given current staffing. */
  projectedCapacityPerDay: number;

  /** Projected case volume at end of week. */
  projectedQueueDepth: number;

  /**
   * Capacity gap: inflow - capacity.
   * Positive = understaffed. Negative = surplus capacity.
   */
  capacityGap: number;

  /** Number of additional RS needed to close a positive gap. 0 if surplus. */
  rsNeededToCloseGap: number;

  /** Projected health status using Phase 6 thresholds. */
  projectedHealthStatus: HealthStatus;

  /** Confidence level degrades as projection extends further out. */
  confidence: ConfidenceLevel;

  /** Human-readable assumptions baked into this week's numbers. */
  assumptions: string[];
}
```

### 3.3 Confidence Level

```typescript
// ---------------------------------------------------------------------------
// ConfidenceLevel -- visual display configuration
// ---------------------------------------------------------------------------

export type ConfidenceLevel = "High" | "Medium" | "Low";

/**
 * Display configuration for confidence bands on charts.
 *
 * | Level  | Line Style | Variance |
 * |--------|------------|----------|
 * | High   | Solid      | ±15%     |
 * | Medium | Dashed     | ±30%     |
 * | Low    | Dotted     | ±50%     |
 */
export const CONFIDENCE_DISPLAY: Record<
  ConfidenceLevel,
  { lineStyle: "solid" | "dashed" | "dotted"; variance: number; label: string }
> = {
  High: { lineStyle: "solid", variance: 0.15, label: "High (±15%)" },
  Medium: { lineStyle: "dashed", variance: 0.3, label: "Medium (±30%)" },
  Low: { lineStyle: "dotted", variance: 0.5, label: "Low (±50%)" },
};
```

### 3.4 Forecast Inputs

```typescript
// ---------------------------------------------------------------------------
// ForecastInput -- all data sources consumed by the forecast engine
// ---------------------------------------------------------------------------

import { LensHealthSnapshot } from "./lensHealthTypes";

export interface ForecastInput {
  /** Target Assignment Group. */
  assignmentGroupId: string;

  /** Historical snapshots from Phase 6 (minimum 4 weeks recommended). */
  historicalSnapshots: LensHealthSnapshot[];

  /** Optional seasonal data (same week in prior years). */
  seasonalData?: SeasonalDataPoint[];

  /** Known upcoming events that will affect volume. */
  knownEvents: KnownEvent[];

  /** Leave calendar for all RS in the group. */
  leaveCalendar: LeaveEntry[];

  /** RS currently in training pipeline for this group. */
  trainingPipeline: TrainingEntry[];

  /** RS at risk of departure. */
  attritionRisk: AttritionEntry[];
}

export interface SeasonalDataPoint {
  /** ISO week number (1-52). */
  weekNumber: number;

  /** Average daily inflow for this week historically. */
  avgDailyInflow: number;

  /** Number of years of data behind this average. */
  sampleYears: number;
}
```

### 3.5 Known Events, Leave, Training, Attrition

```typescript
// ---------------------------------------------------------------------------
// Supporting input types
// ---------------------------------------------------------------------------

export interface KnownEvent {
  id: string;
  description: string;
  expectedStartDate: string;
  expectedEndDate: string;

  /**
   * Multiplier applied to baseline inflow.
   * 1.0 = no change, 1.5 = 50% increase, 0.5 = 50% decrease.
   */
  volumeMultiplier: number;

  /** Assignment Group IDs affected by this event. */
  affectedGroups: string[];
}

export interface LeaveEntry {
  userId: string;
  startDate: string;
  endDate: string;
  type: "Vacation" | "Sick" | "OnCall" | "Training";
}

export interface TrainingEntry {
  userId: string;

  /** The group the RS is training into. */
  assignmentGroupId: string;

  startDate: string;

  /** Date when the RS is expected to reach competent proficiency. */
  expectedCompetencyDate: string;

  /**
   * Current proficiency level during training.
   * Used to compute partial capacity contribution.
   */
  currentProficiency: "Trainee" | "Competent" | "Expert";
}

export interface AttritionEntry {
  userId: string;
  expectedDepartureDate: string;

  /** Probability of departure (0.0 - 1.0). */
  probability: number;

  /** Groups that will lose capacity if this RS departs. */
  affectedGroups: string[];
}
```

### 3.6 Scenario Modeling

```typescript
// ---------------------------------------------------------------------------
// Scenario -- "What If" simulation
// ---------------------------------------------------------------------------

export interface Scenario {
  id: string;
  name: string;

  /** The baseline forecast this scenario modifies. */
  baselineForecastId: string;

  /** Ordered list of modifications applied to the baseline. */
  modifications: ScenarioModification[];

  /** Populated after simulation runs. */
  result?: StaffingForecast;
}

export type ScenarioModificationType =
  | "AddRS"
  | "RemoveRS"
  | "VolumeChange"
  | "CrossTrain"
  | "DeadlineChange";

export interface ScenarioModification {
  type: ScenarioModificationType;

  /**
   * Type-specific parameters.
   *
   * | Type           | Expected Params                                           |
   * |----------------|-----------------------------------------------------------|
   * | AddRS          | { userId, startWeek, throughputPerDay }                    |
   * | RemoveRS       | { userId, startWeek }                                     |
   * | VolumeChange   | { weekRange: [start, end], multiplier }                   |
   * | CrossTrain     | { userId, fromGroupId, startWeek, rampWeeks }             |
   * | DeadlineChange | { caseId?, groupWide: boolean, extensionDays }            |
   */
  params: Record<string, any>;
}
```

### 3.7 Cross-Training Recommendations

```typescript
// ---------------------------------------------------------------------------
// Cross-Training Recommendation
// ---------------------------------------------------------------------------

export interface CrossTrainingRecommendation {
  /** Group that needs more qualified RS. */
  assignmentGroupId: string;

  /** Current number of qualified RS in the group. */
  currentQualified: number;

  /** Projected RS needed based on demand forecast. */
  projectedNeed: number;

  /** projectedNeed - currentQualified. */
  gap: number;

  /** Estimated weeks to bring a candidate to competent level. */
  trainingDuration: number;

  /** Ranked list of candidates who could cross-train into this group. */
  candidates: CrossTrainingCandidate[];

  /** Urgency level based on gap severity and time horizon. */
  priority: "Critical" | "High" | "Medium" | "Low";
}

export interface CrossTrainingCandidate {
  userId: string;
  displayName: string;

  /** Skills from current group(s) that transfer to the target group. */
  transferableSkills: string[];

  /** Hours per week the candidate can dedicate to cross-training. */
  availableHoursPerWeek: number;

  /** Estimated weeks to reach competent proficiency. */
  estimatedRampWeeks: number;

  /** Current workload as percentage (0-100). High load = less available. */
  currentLoad: number;
}
```

### 3.8 Duplicate & Cross-Reference Detection

```typescript
// ---------------------------------------------------------------------------
// Duplicate Detection
// ---------------------------------------------------------------------------

export interface DuplicateDetection {
  /** The identifier value that matched across cases (e.g., SSN, phone). */
  identifierValue: string;

  /** Type of identifier (e.g., "SSN", "Phone", "Name", "Agency"). */
  identifierType: string;

  /** All cases sharing this identifier. */
  cases: DuplicateCaseRef[];

  /** True if all matching cases are from the same requesting agency. */
  sameAgency: boolean;

  /** True if any matching cases have overlapping date ranges. */
  overlappingDateRange: boolean;

  /** True if a completed case's data package covers the current request's date range. */
  dataPackageReusable: boolean;
}

export interface DuplicateCaseRef {
  caseId: string;
  agencyName: string;
  requestType: string;

  /** Start and end dates of the request period. */
  dateRange: { start: string; end: string };

  status: string;
}
```

---

## 4. Business Logic

All forecast logic lives in `src/utils/forecastEngine.ts`. Scenario simulation in `src/utils/scenarioEngine.ts`. Duplicate detection in `src/utils/duplicateDetection.ts`.

### 4.1 Projected Case Volume

The core recurrence relation that drives every forecast week:

```
depth[N] = depth[N-1] + (inflow[N] × 5) - (capacity[N] × 5)
```

Where `N` is the week index (0 = current week), `× 5` converts per-day to per-week (5 business days), and `depth[0]` is seeded from the latest LENS Health Snapshot.

If `depth[N]` goes negative, clamp to 0 (case volume cannot be negative).

### 4.2 Projected Inflow

```
projectedInflow[N] = weightedAvg(
  recent4wkRolling × 0.5,
  seasonalSameWeek × 0.3,
  knownEvents     × 0.2
)
```

- **recent4wkRolling**: Average daily inflow over the most recent 4 weeks of LENS Health Snapshots.
- **seasonalSameWeek**: Average daily inflow for the same ISO week number in prior years (if available).
- **knownEvents**: Baseline inflow × `volumeMultiplier` for any `KnownEvent` whose date range overlaps week N.

**Fallback** (no seasonal data available):

```
projectedInflow[N] = recent4wkRolling × 0.7 + knownEventAdjusted × 0.3
```

### 4.3 Projected Capacity

```
projectedCapacity[N] = sum(
  foreach RS assigned to group in week N:
    rs.avgThroughputPerDay × availabilityFraction
)
```

**Availability fraction rules:**

| Condition | Fraction |
|---|---|
| Full-time in group, no leave | `1.0` |
| Split across 2 groups | `0.5` |
| Split across 3+ groups | `1 / groupCount` |
| On leave (Vacation, Sick) | `0.0` |
| On-call rotation | `0.0` |
| In training for this group | Use proficiency default (see §10) |

### 4.4 Capacity Gap

```
capacityGap[N] = projectedInflow[N] - projectedCapacity[N]
```

**Interpretation:**

| Gap Value | Meaning | Derived Metric |
|---|---|---|
| `> 0` | Understaffed | `rsNeededToCloseGap = ceil(gap / avgRsThroughput)` |
| `= 0` | Balanced | Case volume holds steady |
| `< 0` | Surplus capacity | `daysToClear = ceil(depth[N] / abs(gap))` |

### 4.5 Confidence Degradation

Confidence degrades as projections extend further from the present:

| Week Range | Confidence | Variance Band |
|---|---|---|
| Week 1-2 | High | ±15% |
| Week 3-4 | Medium | ±30% |
| Week 5-8 | Low | ±50% |

Confidence also downgrades one level if:
- Fewer than 4 weeks of historical snapshots exist (High → Medium).
- The group was created within the last 8 weeks (all projections cap at Medium).
- Any `KnownEvent` has a `volumeMultiplier` > 2.0 (extreme uncertainty).

### 4.6 Scenario Simulation

1. Clone the baseline `StaffingForecast`.
2. Apply each `ScenarioModification` in order:

| Modification | Effect on Cloned Forecast |
|---|---|
| **AddRS** | Add `throughputPerDay × availabilityFraction` to `projectedCapacity` for weeks ≥ `startWeek`. |
| **RemoveRS** | Subtract the RS's throughput from `projectedCapacity` for weeks ≥ `startWeek`. |
| **VolumeChange** | Multiply `projectedInflow` by `multiplier` for weeks in `weekRange`. |
| **CrossTrain** | Add RS at Trainee proficiency (40% throughput) starting `startWeek`, ramping to Competent (80%) after `rampWeeks`. |
| **DeadlineChange** | Adjust SLA pressure calculations; does not directly change inflow/capacity but changes projected health status thresholds. |

3. Recalculate all `WeeklyProjection` values using the modified inputs.
4. Return the scenario forecast alongside a **delta comparison**: for each week, `delta.caseVolume = scenario.depth - baseline.depth`, etc.

### 4.7 Cross-Training Recommendation Logic

For each Assignment Group where:
- `qualifiedRS < minQualifiedRS` (below minimum staffing), **OR**
- `projectedDemand > currentCapacity` (forecast shows shortfall)

Execute the following:

1. **Calculate gap**: `gap = max(projectedNeed - currentQualified, minQualifiedRS - currentQualified)`.
2. **Find candidates**: Query all RS who are qualified in "related" groups (groups sharing ≥ 2 skill tags with the target group) and who have `currentLoad < 85%`.
3. **Rank candidates** by:
   - Transferable skill overlap (higher is better) — weight 0.4
   - Available hours per week (more is better) — weight 0.3
   - Current load (lower is better) — weight 0.2
   - Tenure / experience (longer is better) — weight 0.1
4. **Estimate ramp time**: Based on the candidate's transferable skill overlap:
   - ≥ 80% overlap → 2 weeks
   - 50-79% overlap → 4 weeks
   - 25-49% overlap → 6 weeks
   - < 25% overlap → 8+ weeks
5. **Set priority**:
   - `Critical`: gap ≥ 3 RS AND shortfall begins within 2 weeks
   - `High`: gap ≥ 2 RS OR shortfall begins within 4 weeks
   - `Medium`: gap = 1 RS AND shortfall begins within 6 weeks
   - `Low`: gap = 1 RS AND shortfall is 6+ weeks out

### 4.8 Duplicate Detection

For each identifier in the current case:

1. **Scan** all other open cases' identifier arrays for an exact match on `(identifierType, identifierValue)`.
2. **If match found**, evaluate:
   - **Same agency?** → Flag as potential duplicate request.
   - **Overlapping date range?** → Flag as potential data overlap.
   - **Both same agency AND overlapping dates?** → Flag as likely duplicate.
3. **Group** all matching cases by identifier and return as `DuplicateDetection`.

### 4.9 Data Package Reuse

If the same identifier + overlapping date range exists in a **completed** case:

1. Check that the completed case's data package covers ≥ 80% of the current case's requested date range.
2. If yes → set `dataPackageReusable = true`.
3. Surface prompt: _"Data from [completed case ID] covers this date range. Reuse instead of fresh pull?"_
4. If the analyst confirms reuse, link the data package reference and skip the redundant pull step.

---

## 5. Components & UI

All components live in `src/components/forecasting/` unless otherwise noted.

### 5.1 ForecastView.tsx

Per-group forecast table showing week-by-week projections.

| Column | Content |
|---|---|
| Week | `weekStart` formatted as "W14 (Mar 30)" |
| Inflow/Day | `projectedInflowPerDay` with confidence band |
| Capacity/Day | `projectedCapacityPerDay` |
| Case Volume | `projectedQueueDepth` with trend arrow (↑↓→) |
| Gap | `capacityGap` — red if positive, green if negative |
| RS Needed | `rsNeededToCloseGap` (only shown when gap > 0) |
| Health | `projectedHealthStatus` badge (Green/Yellow/Red) |
| Confidence | Icon: solid circle (High), half circle (Medium), empty circle (Low) |

**Interactions:**
- Click any week row to expand assumptions list.
- Click "Run Scenario" button to open ScenarioBuilder for that group.
- Click "Cross-Training" to jump to CrossTrainingPanel filtered to that group.

### 5.2 ForecastChart.tsx

Line chart rendering case volume projection over time.

- **X-axis**: Week labels (W14, W15, ...).
- **Y-axis**: Case volume (case count).
- **Lines**:
  - Case volume projection: solid/dashed/dotted per confidence level.
  - Capacity line: horizontal stepped line showing total capacity per week.
- **Shading**:
  - Green fill between capacity line and depth line when surplus.
  - Red fill between capacity line and depth line when gap.
- **Confidence bands**: Shaded region around the projection line using the ±variance from `CONFIDENCE_DISPLAY`.
- **Tooltips**: Hover any point to see exact values + assumptions.

Built on the existing charting library used in Phase 6 dashboards.

### 5.3 ScenarioModeler.tsx

Side-by-side comparison view.

| Left Panel (Baseline) | Right Panel (Scenario) |
|---|---|
| ForecastChart for baseline | ForecastChart for scenario |
| ForecastView table | ForecastView table with delta columns |

**Delta columns** show `+N` / `-N` in green/red next to each projected value.

Header bar shows scenario name, modification summary, and "Save Scenario" / "Discard" buttons.

### 5.4 ScenarioBuilder.tsx

Form to define scenario modifications.

| Field | Control | Notes |
|---|---|---|
| Scenario Name | Text input | Required, max 100 chars |
| Modification Type | Dropdown | AddRS, RemoveRS, VolumeChange, CrossTrain, DeadlineChange |
| **AddRS** | RS picker dropdown + start week selector + throughput override (optional) | Defaults to RS's avg throughput |
| **RemoveRS** | RS picker dropdown + start week selector | Shows current throughput being removed |
| **VolumeChange** | Week range picker + multiplier slider (0.1x - 5.0x) | Preview shows affected weeks highlighted |
| **CrossTrain** | RS picker + from-group + start week + ramp weeks | Auto-fills ramp estimate from §4.7 |
| **DeadlineChange** | Case picker or "Group-wide" toggle + extension days | Shows impact on health thresholds |

Multiple modifications can be stacked. "Run Simulation" button triggers the scenario engine and opens ScenarioModeler.

### 5.5 CrossTrainingPanel.tsx

Prioritized list of groups needing cross-training.

| Column | Content |
|---|---|
| Group | Assignment Group name |
| Priority | Badge: Critical (red), High (orange), Medium (yellow), Low (blue) |
| Current / Need | e.g., "3 / 5 qualified RS" |
| Gap | Shortfall count |
| Top Candidate | Best-ranked candidate name + estimated ramp weeks |
| Action | "View Candidates" → expands to full candidate table |

**Expanded candidate table columns**: Name, Transferable Skills (tag chips), Available Hours, Ramp Weeks, Current Load (progress bar), "Recommend" button.

### 5.6 CertificationAlerts.tsx

List of expiring certifications with renewal actions.

| Column | Content |
|---|---|
| RS Name | Display name with avatar |
| Certification | Certification name |
| Expiry Date | Date with countdown (e.g., "12 days") |
| Status | Active (green), Expiring Soon (yellow, ≤30 days), Expired (red) |
| Affected Groups | Groups where this certification is required |
| Action | "Send Reminder" / "Initiate Renewal" button |

Sorted by expiry date ascending (most urgent first). Certifications expiring within 30 days surface a persistent banner in the Manager dashboard.

### 5.7 DuplicateDetectionBanner.tsx

Banner displayed at the top of a case detail view when duplicates are detected.

**Variants:**

| Condition | Banner Style | Message |
|---|---|---|
| Same identifier in other open cases | Warning (yellow) | "This identifier appears in {N} other open cases." |
| Same agency + overlapping dates | Alert (orange) | "Possible duplicate: {Agency} submitted a similar request ({Case ID})." |
| Data package reusable | Info (blue) | "Matching data package exists. Consider reuse." |

Each banner includes a "View Details" link that expands to show the full list of matching cases with their status, agency, and date ranges.

### 5.8 DataReusePrompt.tsx

Modal prompt triggered when a data package reuse opportunity is confirmed.

**Content:**
- Header: "Reusable Data Package Found"
- Body: "Data from **{sourceCase.caseId}** covers {overlapPercent}% of the requested date range ({dateRange.start} - {dateRange.end}). Reusing this data saves an estimated {estimatedDays} processing days."
- Actions:
  - "Reuse Data" (primary) → links the data package and skips fresh pull
  - "Pull Fresh Data" (secondary) → proceeds with normal workflow
  - "Compare Side-by-Side" (tertiary) → opens source and current case date ranges for comparison

### 5.9 ForecastConfidenceLegend.tsx

Compact legend component displayed alongside any forecast chart.

```
━━━━  High confidence (±15%)    Weeks 1-2
╌╌╌╌  Medium confidence (±30%)  Weeks 3-4
┈┈┈┈  Low confidence (±50%)     Weeks 5-8
```

Also shows a note: _"Confidence may be reduced for new groups or extreme volume events."_

---

## 6. Files to Create

| File Path | Purpose |
|---|---|
| `src/types/forecastTypes.ts` | All TypeScript interfaces and types from §3 |
| `src/utils/forecastEngine.ts` | Core forecast calculation logic (§4.1-4.5) |
| `src/utils/scenarioEngine.ts` | Scenario simulation logic (§4.6) |
| `src/utils/crossTrainingEngine.ts` | Cross-training recommendation logic (§4.7) |
| `src/utils/duplicateDetection.ts` | Duplicate detection and data reuse logic (§4.8-4.9) |
| `src/components/forecasting/ForecastView.tsx` | Forecast table component (§5.1) |
| `src/components/forecasting/ForecastChart.tsx` | Forecast chart component (§5.2) |
| `src/components/forecasting/ScenarioModeler.tsx` | Side-by-side scenario comparison (§5.3) |
| `src/components/forecasting/ScenarioBuilder.tsx` | Scenario creation form (§5.4) |
| `src/components/forecasting/CrossTrainingPanel.tsx` | Cross-training recommendations (§5.5) |
| `src/components/forecasting/CertificationAlerts.tsx` | Certification renewal alerts (§5.6) |
| `src/components/forecasting/DuplicateDetectionBanner.tsx` | Duplicate case banner (§5.7) |
| `src/components/forecasting/DataReusePrompt.tsx` | Data reuse modal (§5.8) |
| `src/components/forecasting/ForecastConfidenceLegend.tsx` | Confidence legend (§5.9) |
| `src/hooks/useForecast.ts` | Hook: fetch/generate forecasts for an Assignment Group |
| `src/hooks/useScenario.ts` | Hook: manage scenario state and simulation execution |
| `src/hooks/useDuplicateDetection.ts` | Hook: run duplicate detection for a case |
| `src/mocks/forecastMockData.ts` | Mock data for all forecast, scenario, and detection features |
| `src/__tests__/forecastEngine.test.ts` | Unit tests for forecast calculations |
| `src/__tests__/scenarioEngine.test.ts` | Unit tests for scenario simulation |
| `src/__tests__/duplicateDetection.test.ts` | Unit tests for duplicate detection |

---

## 7. Files to Modify

| File Path | Change |
|---|---|
| `src/types/index.ts` | Add re-export of `forecastTypes.ts` |
| `src/components/dashboard/ManagerDashboard.tsx` | Add ForecastView and CrossTrainingPanel widgets |
| `src/components/dashboard/LeadDashboard.tsx` | Add ForecastView (read-only) and CertificationAlerts widgets |
| `src/components/caseDetail/CaseDetailHeader.tsx` | Integrate DuplicateDetectionBanner |
| `src/components/caseDetail/CaseDataSection.tsx` | Integrate DataReusePrompt trigger |
| `src/routes/AppRoutes.tsx` | Add `/forecasting` and `/forecasting/:groupId/scenarios` routes |
| `src/navigation/SideNav.tsx` | Add "Forecasting" menu item (visible to Manager, Lead roles) |
| `src/store/forecastStore.ts` | New Zustand store for forecast state (see §9) |
| `src/mocks/handlers.ts` | Add MSW handlers for forecast, scenario, and duplicate endpoints |

---

## 8. Mock Data

All mock data lives in `src/mocks/forecastMockData.ts`.

### 8.1 Baseline Forecast — India Group

```typescript
export const MOCK_INDIA_FORECAST: StaffingForecast = {
  id: "forecast-india-2026-w13",
  assignmentGroupId: "grp-india",
  generatedAt: "2026-03-27T06:00:00Z",
  generatedBy: "System",
  forecastWeeks: 6,
  projections: [
    {
      weekStart: "2026-03-30", // W14
      projectedInflowPerDay: 12,
      projectedCapacityPerDay: 10,    // David on leave — capacity drops
      projectedQueueDepth: 55,        // was 45, grew by (12-10)×5 = +10
      capacityGap: 2,
      rsNeededToCloseGap: 1,
      projectedHealthStatus: "Yellow",
      confidence: "High",
      assumptions: [
        "David (RS-204) on vacation W14 — capacity reduced by 4.2/day",
        "No known volume events",
        "Based on 4-week rolling average inflow of 11.8/day",
      ],
    },
    {
      weekStart: "2026-04-06", // W15
      projectedInflowPerDay: 12,
      projectedCapacityPerDay: 14.2,  // David returns
      projectedQueueDepth: 44,        // 55 + (12-14.2)×5 = 55 - 11 = 44
      capacityGap: -2.2,
      rsNeededToCloseGap: 0,
      projectedHealthStatus: "Green",
      confidence: "High",
      assumptions: [
        "David (RS-204) returns from leave",
        "Full team available",
      ],
    },
    {
      weekStart: "2026-04-13", // W16
      projectedInflowPerDay: 13,
      projectedCapacityPerDay: 14.2,
      projectedQueueDepth: 38,        // 44 + (13-14.2)×5 = 44 - 6 = 38
      capacityGap: -1.2,
      rsNeededToCloseGap: 0,
      projectedHealthStatus: "Green",
      confidence: "Medium",
      assumptions: [
        "Slight inflow uptick based on seasonal pattern",
      ],
    },
    {
      weekStart: "2026-04-20", // W17
      projectedInflowPerDay: 15,
      projectedCapacityPerDay: 14.2,
      projectedQueueDepth: 42,        // 38 + (15-14.2)×5 = 38 + 4 = 42
      capacityGap: 0.8,
      rsNeededToCloseGap: 1,
      projectedHealthStatus: "Yellow",
      confidence: "Medium",
      assumptions: [
        "Seasonal tax-season spike historically increases India inflow 25%",
        "Volume multiplier: 1.25",
      ],
    },
    {
      weekStart: "2026-04-27", // W18
      projectedInflowPerDay: 16,
      projectedCapacityPerDay: 14.2,
      projectedQueueDepth: 51,        // 42 + (16-14.2)×5 = 42 + 9 = 51
      capacityGap: 1.8,
      rsNeededToCloseGap: 1,
      projectedHealthStatus: "Yellow",
      confidence: "Low",
      assumptions: [
        "Continued seasonal spike",
        "Low confidence — 5 weeks out",
      ],
    },
    {
      weekStart: "2026-05-04", // W19
      projectedInflowPerDay: 14,
      projectedCapacityPerDay: 14.2,
      projectedQueueDepth: 50,        // 51 + (14-14.2)×5 = 51 - 1 = 50
      capacityGap: -0.2,
      rsNeededToCloseGap: 0,
      projectedHealthStatus: "Yellow",
      confidence: "Low",
      assumptions: [
        "Seasonal spike subsides",
        "Low confidence — 6 weeks out",
      ],
    },
  ],
};
```

### 8.2 Scenario — "Add RS to Cover David's Leave"

```typescript
export const MOCK_SCENARIO_ADD_RS: Scenario = {
  id: "scenario-india-cover-david",
  name: "Add Sarah to India Group for W14",
  baselineForecastId: "forecast-india-2026-w13",
  modifications: [
    {
      type: "AddRS",
      params: {
        userId: "RS-312",
        displayName: "Sarah Chen",
        startWeek: "2026-03-30",
        throughputPerDay: 3.8,
      },
    },
  ],
  result: {
    // ... scenario forecast with W14 capacity = 13.8 instead of 10
    // W14 queue depth: 45 + (12-13.8)×5 = 45 - 9 = 36 (Green)
    // Delta vs baseline W14: depth -19, gap -5.8
  } as StaffingForecast,
};
```

### 8.3 Mock Duplicate Detection

```typescript
export const MOCK_DUPLICATE_DETECTION: DuplicateDetection = {
  identifierValue: "555-12-3456",
  identifierType: "SSN",
  cases: [
    {
      caseId: "DARS-2026-1847",
      agencyName: "DEA - Miami Field Office",
      requestType: "Financial Records",
      dateRange: { start: "2025-06-01", end: "2025-12-31" },
      status: "Open",
    },
    {
      caseId: "DARS-2025-9823",
      agencyName: "DEA - Miami Field Office",
      requestType: "Communications Records",
      dateRange: { start: "2025-01-01", end: "2025-09-30" },
      status: "Completed",
    },
    {
      caseId: "DARS-2026-0412",
      agencyName: "FBI - Tampa",
      requestType: "Financial Records",
      dateRange: { start: "2025-08-01", end: "2026-02-28" },
      status: "Open",
    },
  ],
  sameAgency: false,        // mixed agencies
  overlappingDateRange: true, // Jun-Dec 2025 overlaps with multiple
  dataPackageReusable: true,  // DARS-2025-9823 covers part of range
};
```

### 8.4 Mock Cross-Training Recommendation

```typescript
export const MOCK_CROSS_TRAINING: CrossTrainingRecommendation = {
  assignmentGroupId: "grp-india",
  currentQualified: 3,
  projectedNeed: 5,
  gap: 2,
  trainingDuration: 4,
  candidates: [
    {
      userId: "RS-312",
      displayName: "Sarah Chen",
      transferableSkills: ["LNS Processing", "Financial Analysis", "Hindi"],
      availableHoursPerWeek: 15,
      estimatedRampWeeks: 3,
      currentLoad: 62,
    },
    {
      userId: "RS-108",
      displayName: "Marcus Johnson",
      transferableSkills: ["LNS Processing", "Financial Analysis"],
      availableHoursPerWeek: 10,
      estimatedRampWeeks: 4,
      currentLoad: 78,
    },
  ],
  priority: "High",
};
```

---

## 9. State Management

Forecast state is managed via a Zustand store at `src/store/forecastStore.ts`.

```typescript
import { create } from "zustand";
import {
  StaffingForecast,
  Scenario,
  CrossTrainingRecommendation,
  DuplicateDetection,
} from "../types/forecastTypes";

interface ForecastState {
  // --- Forecasts ---
  forecasts: Record<string, StaffingForecast>;        // keyed by assignmentGroupId
  activeForecastGroupId: string | null;
  forecastLoading: boolean;
  forecastError: string | null;

  // --- Scenarios ---
  scenarios: Record<string, Scenario[]>;               // keyed by baselineForecastId
  activeScenarioId: string | null;
  scenarioSimulating: boolean;

  // --- Cross-Training ---
  crossTrainingRecs: CrossTrainingRecommendation[];
  crossTrainingLoading: boolean;

  // --- Duplicate Detection ---
  duplicatesForCase: Record<string, DuplicateDetection[]>; // keyed by caseId
  duplicateScanning: boolean;

  // --- Actions ---
  generateForecast: (groupId: string) => Promise<void>;
  setActiveForecastGroup: (groupId: string) => void;

  createScenario: (scenario: Omit<Scenario, "id">) => string;
  runScenario: (scenarioId: string) => Promise<void>;
  deleteScenario: (scenarioId: string) => void;

  fetchCrossTrainingRecs: () => Promise<void>;

  scanForDuplicates: (caseId: string) => Promise<void>;
  clearDuplicates: (caseId: string) => void;
}
```

**Hooks** (thin wrappers around the store):
- `useForecast(groupId)` — returns the forecast for a group, triggers generation if stale (> 24 hours).
- `useScenario(forecastId)` — returns scenarios for a forecast, provides `create` / `run` / `delete` actions.
- `useDuplicateDetection(caseId)` — returns duplicate results for a case, triggers scan on mount.

---

## 10. Edge Cases & Defaults

| Scenario | Handling |
|---|---|
| **New group with no historical data** | Cannot compute rolling average. Use organization-wide average inflow as baseline. Set all confidence levels to "Low". Show banner: "Limited forecast accuracy — fewer than 4 weeks of historical data." |
| **RS with no throughput history** | Use proficiency-based defaults as fraction of the group average throughput: **Trainee = 40%**, **Competent = 80%**, **Expert = 110%**. |
| **Group has only 1 RS** | Forecast still runs. Cross-training priority automatically set to "Critical" (single point of failure). |
| **All RS on leave for a week** | `projectedCapacity = 0`. Case volume grows by `inflow × 5`. Health status = "Red". Scenario modeler suggests temporary reassignment. |
| **Known event with multiplier > 3.0** | Confidence automatically set to "Low" for all affected weeks. Assumption note: "Extreme volume event — forecast accuracy limited." |
| **Forecast covers a holiday week** | Adjust inflow downward (business days = 4 or fewer). Capacity also adjusts for office closures. Leave calendar should include org-wide holidays. |
| **Duplicate detection finds 20+ matches** | Paginate results. Show top 5 in banner, "View all 20" link expands full list. |
| **Circular cross-training recommendation** | If Group A recommends training RS from Group B, and Group B recommends training RS from Group A, flag as "mutual dependency" and escalate to manager review. |
| **Scenario stacking conflicts** | If two modifications affect the same RS in the same week (e.g., AddRS + RemoveRS for same person), reject with validation error: "Conflicting modifications for {RS name} in week {N}." |
| **Attrition entry with 100% probability** | Treat as confirmed departure. Remove RS from capacity starting at `expectedDepartureDate`. Cross-training priority bumps to "Critical" for affected groups. |
| **Data package reuse with partial coverage** | If reuse covers < 80% of requested date range, show: "Partial match — covers {X}% of requested range. Fresh pull recommended for remaining period." |

---

## 11. Acceptance Criteria

### Forecasting Core

- [ ] AC-7.01: System generates a staffing forecast for any Assignment Group with ≥ 1 week of LENS Health Snapshot history.
- [ ] AC-7.02: Forecast projects 4-8 weeks out (configurable per group, default 6).
- [ ] AC-7.03: Each weekly projection includes inflow/day, capacity/day, case volume, capacity gap, RS needed, health status, and confidence level.
- [ ] AC-7.04: Projected case volume follows the recurrence formula: `depth[N] = depth[N-1] + (inflow[N] × 5) - (capacity[N] × 5)`, clamped to ≥ 0.
- [ ] AC-7.05: Projected inflow uses weighted average of rolling 4-week, seasonal, and known events (50/30/20 split, or 70/30 fallback without seasonal data).
- [ ] AC-7.06: Confidence degrades per schedule: High (W1-2), Medium (W3-4), Low (W5+), with additional downgrades for sparse data or extreme events.
- [ ] AC-7.07: Forecasts regenerate automatically every 24 hours (system-triggered) and on-demand by managers.

### Scenario Modeling

- [ ] AC-7.08: Manager can create a named scenario with one or more modifications (AddRS, RemoveRS, VolumeChange, CrossTrain, DeadlineChange).
- [ ] AC-7.09: Scenario simulation clones the baseline forecast, applies modifications, and recalculates all projections.
- [ ] AC-7.10: ScenarioModeler displays side-by-side baseline vs. scenario with delta highlighting per week.
- [ ] AC-7.11: Conflicting modifications for the same RS in the same week are rejected with a validation error.

### Cross-Training

- [ ] AC-7.12: System identifies groups where qualified RS count is below minimum or projected demand exceeds capacity.
- [ ] AC-7.13: Candidates are ranked by transferable skill overlap (0.4), available hours (0.3), current load (0.2), and tenure (0.1).
- [ ] AC-7.14: Priority levels (Critical/High/Medium/Low) are set based on gap severity and time horizon per §4.7.
- [ ] AC-7.15: Cross-training ramp estimates use the skill overlap tiers: ≥80% → 2wk, 50-79% → 4wk, 25-49% → 6wk, <25% → 8+wk.

### Certification Alerts

- [ ] AC-7.16: Certifications expiring within 30 days surface a persistent banner in Manager and Lead dashboards.
- [ ] AC-7.17: CertificationAlerts list is sorted by expiry date ascending and shows affected groups.

### Duplicate Detection

- [ ] AC-7.18: When a case is opened, the system scans all open cases for matching identifiers and displays a DuplicateDetectionBanner if matches are found.
- [ ] AC-7.19: Same-agency + overlapping-date matches are flagged as "Possible duplicate" with higher visual priority (orange banner).
- [ ] AC-7.20: Data package reuse opportunities (completed case with ≥80% date coverage) trigger the DataReusePrompt modal.
- [ ] AC-7.21: Analyst can choose "Reuse Data", "Pull Fresh", or "Compare Side-by-Side" from the reuse prompt.

### Edge Cases

- [ ] AC-7.22: New groups with no historical data use org-wide average and display a "Limited accuracy" banner.
- [ ] AC-7.23: RS with no throughput history use proficiency defaults: Trainee = 40%, Competent = 80%, Expert = 110% of group average.
- [ ] AC-7.24: Single-RS groups automatically receive "Critical" cross-training priority.

---

## 12. Cross-References

| Reference | Section | Relevance |
|---|---|---|
| `DARS_Case_Health_Management.md` §10 | Staffing forecasts, scenarios, cross-training | Primary source for forecast requirements, scenario modeling, and cross-training logic |
| `DARS_Case_List_View_Product_Spec.md` §3.6 | Duplicate detection | Primary source for duplicate and cross-reference detection requirements |
| Phase 4 spec | Assignment Groups, Qualifications | Provides group membership, RS qualifications, and throughput data consumed by forecast engine |
| Phase 6 spec | LENS Health Snapshots, Health Thresholds | Provides historical time-series data and health threshold configuration used by projections |
| `src/types/lensHealthTypes.ts` | `LensHealthSnapshot`, `HealthStatus` | Imported by forecast types; snapshot history is the primary forecast input |
| `src/types/assignmentGroupTypes.ts` | `AssignmentGroup`, `Qualification` | Imported for group membership and qualification checks |
| `src/store/lensHealthStore.ts` | LENS Health state | Forecast store reads historical snapshots from LENS Health store |
| `src/components/dashboard/ManagerDashboard.tsx` | Manager dashboard | Modified to embed ForecastView and CrossTrainingPanel |
| `src/components/caseDetail/CaseDetailHeader.tsx` | Case detail header | Modified to embed DuplicateDetectionBanner |
