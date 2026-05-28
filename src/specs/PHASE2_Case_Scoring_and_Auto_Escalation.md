# Phase 2 -- Case Scoring & Auto-Escalation

**Parent**: DARS Case Operations & Workforce Intelligence Roadmap, Phase 2
**Status**: Draft
**Created**: 2026-03-26
**Last Updated**: 2026-03-26

---

## 1. Overview

Phase 2 replaces manual priority assignment with two deterministic scoring engines and an automated escalation framework.

| Capability | Purpose |
|---|---|
| **Case Health Index (CHI)** | A 5-level score (CHI-1 Critical through CHI-5 Quick) computed from deadline proximity, crime type, resource requirements, and legal consequence. Modeled after the Emergency Severity Index (ESI) used in ER triage and the Medical Priority Dispatch System (MPDS) used in 911 call centers. |
| **Complexity Score** | A weighted numeric score that predicts effort hours based on identifier count, service breadth, request type, and special-handling flags. Buckets into five tiers: Quick, Light, Medium, Heavy, Complex. |
| **Auto-Escalation** | A rule engine that runs on case load and on a configurable polling interval. Rules promote (never downgrade) a case's CHI when time-based conditions are met, ensuring no case silently ages past its deadline. |
| **Case Aging States** | A four-state lifecycle (Normal, Aging, Stale, Dormant) that drives visual badges and case list filtering. |
| **Triage Form Enhancements** | Structured `crime_type` enum, requestor verification status, penalty and deadline metadata fields that feed the CHI engine. |
| **CHI & Complexity Badges** | Visual indicators rendered in the case list card and case detail views so analysts can triage at a glance. |

CHI is the **primary sort dimension** for the case list. Within the same CHI level, cases sort by age descending (oldest first). This guarantees that the most urgent, longest-waiting cases surface to the top without analyst intervention.

---

## 2. Prerequisites

All of the following from Phase 1 must be complete before Phase 2 work begins:

| Phase 1 Deliverable | Why Phase 2 Needs It |
|---|---|
| Persona system (roles, permissions) | CHI override requires `Supervisor` or `Lead` role check |
| Enriched data model (`dateDue`, `dateEnteredQueue`, `deadlineType`, `hasFinancialPenalty`, `complexityScore`, `chiLevel`, `agingState`) | Scoring engines read and write these fields |
| Audit log (`auditEntries[]` on case) | CHI overrides and escalation events are logged |
| Event bus (`useEventBus` hook) | Auto-escalation emits events consumed by toasts and the audit trail |

---

## 3. Data Model

All types live in `src/types/scoringTypes.ts` unless otherwise noted.

### 3.1 CHI Types

```typescript
// ---------------------------------------------------------------------------
// CHI -- Case Health Index
// ---------------------------------------------------------------------------

/** CHI levels 1 (most severe) through 5 (least severe). */
export type CHILevel = 1 | 2 | 3 | 4 | 5;

export interface CHIConfig {
  level: CHILevel;
  label: string;
  color: string;       // foreground / text
  bgColor: string;     // badge background
  description: string;
}

/**
 * Canonical CHI configuration map.
 *
 * Color choices follow the existing priority palette in caseConstants.ts
 * and have been validated against WCAG 2.1 AA contrast ratios.
 */
export const CHI_CONFIGS: Record<CHILevel, CHIConfig> = {
  1: {
    level: 1,
    label: "Critical",
    color: "#FFFFFF",
    bgColor: "#D32F2F",   // red-700
    description:
      "Immediate legal or safety consequence. Court-imposed deadline within 5 days, " +
      "child exploitation crime type, or financial penalty at risk.",
  },
  2: {
    level: 2,
    label: "Urgent",
    color: "#FFFFFF",
    bgColor: "#E65100",   // orange-900
    description:
      "At risk of SLA breach. Due date within the SLA warning window, " +
      "has financial penalty, or reactivated from dormant state.",
  },
  3: {
    level: 3,
    label: "Significant",
    color: "#000000",
    bgColor: "#FBC02D",   // yellow-700
    description:
      "High resource consumption. Heavy/Complex complexity tier, " +
      "3+ services, or 25+ identifiers.",
  },
  4: {
    level: 4,
    label: "Standard",
    color: "#FFFFFF",
    bgColor: "#1565C0",   // blue-800
    description:
      "Routine case within SLA and standard complexity. " +
      "No special escalation triggers.",
  },
  5: {
    level: 5,
    label: "Quick",
    color: "#FFFFFF",
    bgColor: "#2E7D32",   // green-800
    description:
      "Minimal effort. Single identifier, single service, " +
      "routine request type.",
  },
};
```

### 3.2 Complexity Types

```typescript
// ---------------------------------------------------------------------------
// Complexity Score
// ---------------------------------------------------------------------------

export type ComplexityTier = "Quick" | "Light" | "Medium" | "Heavy" | "Complex";

export interface ComplexityConfig {
  tier: ComplexityTier;
  minScore: number;
  maxScore: number;          // Infinity for the top tier
  estimatedHours: string;    // human-readable range, e.g. "< 1 hr"
  color: string;
}

export const COMPLEXITY_CONFIGS: ComplexityConfig[] = [
  { tier: "Quick",   minScore: 0,  maxScore: 3,        estimatedHours: "< 1 hr",     color: "#2E7D32" },
  { tier: "Light",   minScore: 4,  maxScore: 8,        estimatedHours: "1 - 3 hrs",  color: "#1565C0" },
  { tier: "Medium",  minScore: 9,  maxScore: 15,       estimatedHours: "3 - 8 hrs",  color: "#FBC02D" },
  { tier: "Heavy",   minScore: 16, maxScore: 25,       estimatedHours: "8 - 24 hrs", color: "#E65100" },
  { tier: "Complex", minScore: 26, maxScore: Infinity,  estimatedHours: "24+ hrs",    color: "#D32F2F" },
];
```

### 3.3 Case Aging Types

```typescript
// ---------------------------------------------------------------------------
// Case Aging
// ---------------------------------------------------------------------------

export type CaseAgingState = "Normal" | "Aging" | "Stale" | "Dormant";

export interface AgingConfig {
  state: CaseAgingState;
  minDays: number;
  maxDays: number;       // Infinity for Dormant
  color: string;
  description: string;
}

export const AGING_CONFIGS: AgingConfig[] = [
  {
    state: "Normal",
    minDays: 0,
    maxDays: 14,
    color: "#2E7D32",
    description: "Case is within expected processing window.",
  },
  {
    state: "Aging",
    minDays: 15,
    maxDays: 30,
    color: "#FBC02D",
    description: "Case has exceeded typical processing time. Review recommended.",
  },
  {
    state: "Stale",
    minDays: 31,
    maxDays: 90,
    color: "#E65100",
    description: "Case has significantly exceeded expected time. Supervisor attention required.",
  },
  {
    state: "Dormant",
    minDays: 91,
    maxDays: Infinity,
    color: "#D32F2F",
    description:
      "Case has been inactive for 90+ days. Excluded from active operational metrics " +
      "and auto-escalation rules. Requires manual reactivation.",
  },
];
```

### 3.4 Crime Type & Requestor Verification

```typescript
// ---------------------------------------------------------------------------
// Crime Type
// ---------------------------------------------------------------------------

export type CrimeType =
  | "ChildExploitation"
  | "ThreatToLife"
  | "Terrorism"
  | "Financial"
  | "Drugs"
  | "CyberCrime"
  | "FraudIdentityTheft"
  | "Other";

export const CRIME_TYPE_LABELS: Record<CrimeType, string> = {
  ChildExploitation: "Child Exploitation (CSAM/CSEM)",
  ThreatToLife: "Threat to Life",
  Terrorism: "Terrorism / National Security",
  Financial: "Financial Crime",
  Drugs: "Drug Trafficking",
  CyberCrime: "Cyber Crime / Hacking",
  FraudIdentityTheft: "Fraud / Identity Theft",
  Other: "Other",
};

// ---------------------------------------------------------------------------
// Requestor Verification
// ---------------------------------------------------------------------------

export type RequestorVerificationStatus =
  | "Verified"
  | "Unverified"
  | "Flagged"
  | "PendingVerification";

export const VERIFICATION_STATUS_COLORS: Record<RequestorVerificationStatus, string> = {
  Verified: "#2E7D32",
  Unverified: "#9E9E9E",
  Flagged: "#D32F2F",
  PendingVerification: "#FBC02D",
};
```

### 3.5 Escalation & Override Types

```typescript
// ---------------------------------------------------------------------------
// CHI Override
// ---------------------------------------------------------------------------

export interface CHIOverride {
  originalCHI: CHILevel;
  overriddenCHI: CHILevel;
  justification: string;       // required, min 20 characters
  overriddenBy: string;        // persona ID (Supervisor or Lead)
  overriddenAt: string;        // ISO-8601 timestamp
}

// ---------------------------------------------------------------------------
// Auto-Escalation
// ---------------------------------------------------------------------------

export interface AutoEscalationEvent {
  id: string;                  // UUID v4
  caseId: string;
  ruleName: string;
  previousCHI: CHILevel;
  newCHI: CHILevel;
  reason: string;
  triggeredAt: string;         // ISO-8601 timestamp
}

/**
 * An escalation rule definition. The `condition` function receives the
 * full case record and returns true when the rule should fire.
 * `newCHI` is the target level. The engine will only apply the rule if
 * newCHI < currentCHI (lower number = higher severity; escalation only).
 */
export interface EscalationRule {
  name: string;
  condition: (caseData: CaseRecord) => boolean;
  newCHI: CHILevel;
  reasonTemplate: string;      // may contain {{placeholders}}
}
```

### 3.6 Extended Case Record Fields

The following fields are added to the existing `FormData` / `CaseRecord` interface (from Phase 1 enriched data model):

```typescript
// Added to the case record
interface CaseRecordPhase2Extensions {
  // Scoring outputs (written by engines, read by UI)
  chiLevel: CHILevel;
  chiOverride: CHIOverride | null;
  complexityScore: number;
  complexityTier: ComplexityTier;
  agingState: CaseAgingState;

  // Triage inputs (written by analyst via form)
  crimeType: CrimeType | null;
  requestorVerificationStatus: RequestorVerificationStatus;
  deadlineType: "Standard" | "CourtImposed" | "Regulatory" | null;
  hasFinancialPenalty: boolean;
  financialPenaltyDeadline: string | null;  // ISO-8601 date

  // Escalation history
  escalationEvents: AutoEscalationEvent[];
}
```

---

## 4. Business Logic

### 4.1 calculateCHI

**File**: `src/utils/chiEngine.ts`
**Signature**: `calculateCHI(caseData: FormData): CHILevel`

The function walks a **strict priority ladder** -- the first matching step wins. This mirrors ESI: evaluate the most life-threatening conditions first, fall through to lower severity.

```
function calculateCHI(caseData):

  daysUntilDue = diffInDays(caseData.dateDue, now())
                  // null dateDue → Infinity (skip deadline rules)

  // ---------------------------------------------------------------
  // STEP 1 — Immediate consequence → CHI-1 Critical
  // ---------------------------------------------------------------
  IF caseData.deadlineType === "CourtImposed" AND daysUntilDue <= 5
      RETURN 1

  IF caseData.hasFinancialPenalty === true AND daysUntilDue <= 7
      RETURN 1

  IF caseData.crimeType === "ChildExploitation"
      RETURN 1

  IF caseData.casePriority === "Emergency"      // P0 from caseConstants
      RETURN 1

  // ---------------------------------------------------------------
  // STEP 2 — SLA breach risk → CHI-2 Urgent
  // ---------------------------------------------------------------
  slaWarningDays = getSLAWarningDays(caseData)    // default 14
  IF daysUntilDue <= slaWarningDays
      RETURN 2

  IF caseData.hasFinancialPenalty === true
      RETURN 2

  IF caseData.casePriority === "Urgent"           // P1 from caseConstants
      RETURN 2

  IF caseData.agingState === "Reactivated"        // was Dormant, now reopened
      RETURN 2

  // ---------------------------------------------------------------
  // STEP 3 — Significant resource consumption → CHI-3 Significant
  // ---------------------------------------------------------------
  complexityResult = calculateComplexity(caseData)
  IF complexityResult.tier === "Heavy" OR complexityResult.tier === "Complex"
      RETURN 3

  servicesCount = countDistinctServices(caseData.services)
  IF servicesCount >= 3
      RETURN 3

  identifierCount = countIdentifiers(caseData.identifiers)
  IF identifierCount >= 25
      RETURN 3

  // ---------------------------------------------------------------
  // STEP 4 — Standard processing → CHI-4 Standard
  // ---------------------------------------------------------------
  IF daysUntilDue > slaWarningDays AND complexityResult.tier IN ("Light", "Medium")
      RETURN 4

  // ---------------------------------------------------------------
  // STEP 5 — Minimal effort → CHI-5 Quick
  // ---------------------------------------------------------------
  IF identifierCount === 1
     AND servicesCount === 1
     AND isRoutineRequestType(caseData.requestType)   // Preservation, Subpoena
      RETURN 5

  // ---------------------------------------------------------------
  // DEFAULT — Standard
  // ---------------------------------------------------------------
  RETURN 4
```

**Helper: getSLAWarningDays**

Returns the number of days before the due date at which we consider the case "at risk." Default is 14 days but can be overridden per request type:

| Request Type | SLA Warning Days |
|---|---|
| Emergency Letter | 1 |
| Lawful Intercept | 3 |
| Search Warrant | 7 |
| Court Order | 7 |
| All others | 14 |

**Helper: isRoutineRequestType**

Returns `true` for: `Preservation`, `Subpoena`, `Summons`, `Third Party Subpoena`. All other request types return `false`.

**Helper: getDefaultDueDays**

Returns the default due-date window (in calendar days from `dateReceived`) based on the case's country and jurisdiction level. Used when `dateDue` is not provided on the incoming legal demand.

| Country | Jurisdiction Level | Default Due Days | Notes |
|---------|-------------------|-----------------|-------|
| US | Federal | 14 | Standard US federal SLA |
| US | State | 14 | Mirrors federal; state may impose shorter via order |
| US | Local | 14 | |
| US | Tribal | 14 | |
| IN | Central | 3 | Indian government demands are aggressive (Workshop 2) |
| IN | State | 5 | |
| EU (all) | National | 10 | eEvidence framework default |
| EU (all) | Regional | 10 | |
| GB | National | 14 | UKCA obligations |
| GB | Regional | 14 | |
| AU | Federal | 14 | |
| AU | State | 14 | |
| *(all others)* | *(any)* | 21 | Conservative default for ROW / unknown |

```
function getDefaultDueDays(legalContext: CaseLegalContext): number
  IF legalContext is undefined → RETURN 21

  country = legalContext.country.countryCode
  level = legalContext.jurisdiction.jurisdictionLevel

  MATCH (country, level):
    ("IN", "Central")  → 3
    ("IN", "State")    → 5
    ("US", any)        → 14
    ("GB", any)        → 14
    ("AU", any)        → 14
    (EU country, any)  → 10   // check countryCode IN EU_COUNTRY_CODES
    default            → 21
```

> **CHI impact**: If a case's computed `dateDue` (using `getDefaultDueDays`) is within the SLA warning window at time of triage, the SLA Approaching escalation rule fires immediately — the case enters the case list already at CHI-2 or higher.

### 4.2 calculateComplexity

**File**: `src/utils/complexityEngine.ts`
**Signature**: `calculateComplexity(caseData: FormData): { score: number; tier: ComplexityTier }`

```
function calculateComplexity(caseData):

  score = 0.0

  // --- Identifier volume ---
  identifierCount = countIdentifiers(caseData.identifiers)    // 0 if none
  score += identifierCount * 1.0

  // --- Service breadth ---
  servicesCount = countDistinctServices(caseData.services)
  score += servicesCount * 2.0

  // --- Special service flags ---
  IF caseData.services includes "Azure"
      score += 3.0                    // Azure has complex data architecture

  // --- Enterprise identifier flag ---
  enterpriseIdTypes = ["TenantID", "SubscriptionID", "OrganizationID"]
  IF any identifier in caseData.identifiers has type IN enterpriseIdTypes
      score += 2.0                    // enterprise investigations need cross-referencing

  // --- Linked preservation ---
  IF caseData.hasLinkedPreservation === true
      score += 1.5                    // requires coordination with existing hold

  // --- Request type weight ---
  requestTypeWeights = {
    "Preservation":              1.0,
    "Preservation Request":      1.0,
    "Subpoena":                  1.5,
    "Summons":                   1.5,
    "Third Party Subpoena":      1.5,
    "Search Warrant":            2.0,
    "Court Order":               2.5,
    "MLAT":                      2.5,
    "National Security Letter":  2.5,
    "Emergency Letter":          3.0,
    "Lawful Intercept":          3.0,
    "Pen Register":              2.0,
    "Trap and Trace":            2.0,
  }
  score += requestTypeWeights[caseData.requestType] ?? 1.5   // default 1.5

  // --- Country/region complexity modifier ---
  // Based on case.legalContext.country.region (or derived from legacy country field).
  // Reflects processing difficulty: multi-step legal review, translation, MLAT routing.
  IF legalContext exists AND legalContext.country defined:
    regionModifier = {
      "US":    0.0,   // Standard US processing, well-defined SLA
      "EU":    1.0,   // eEvidence framework, GDPR review layer
      "EEA":   0.5,   // Similar to EU, slightly simpler
      "APAC":  1.5,   // India 3-day deadline, JP translation overhead
      "LATAM": 1.0,   // Brazil data localization, multi-step MLAT
      "ROW":   2.0,   // Highly variable; may require Interpol / treaty routing
    }[legalContext.country.region] ?? 1.5
    score += regionModifier

    // Jurisdiction-level sub-modifier (within-country variation)
    jurisdictionSubModifier = {
      // US jurisdictions
      "Federal": 0.0,   // Well-defined federal process
      "State":   0.5,   // State-specific variance
      "Local":   1.0,   // Highly variable, smaller agencies
      "Tribal":  1.5,   // Complex jurisdictional questions
      // India
      "Central": 0.5,   // Central government — direct, fast (3-day SLA)
      "State":   1.0,   // State-level in India: variable
      // EU / UK
      "National":  0.0,
      "Regional":  0.5,
    }[legalContext.jurisdiction.jurisdictionLevel] ?? 0.0
    score += jurisdictionSubModifier

  // --- Cross-border complexity flag ---
  IF legalContext exists AND legalContext.crossBorderFlag === true
      score += 1.0   // Agencies from different countries; requires additional review

  // --- Map score to tier ---
  tier = mapScoreToTier(score)
  RETURN { score: round(score, 1), tier }

function mapScoreToTier(score):
  IF score <= 3   → RETURN "Quick"
  IF score <= 8   → RETURN "Light"
  IF score <= 15  → RETURN "Medium"
  IF score <= 25  → RETURN "Heavy"
  RETURN "Complex"
```

### 4.3 Auto-Escalation Rules

**File**: `src/utils/autoEscalation.ts`
**Signature**: `evaluateEscalationRules(caseData: CaseRecord): AutoEscalationEvent[]`

The engine iterates all rules against the case. For each matching rule where `rule.newCHI < caseData.chiLevel` (strictly more severe), it generates an `AutoEscalationEvent`. The **most severe** event wins -- only one CHI change is applied per evaluation cycle.

```
ESCALATION_RULES: EscalationRule[] = [

  // Rule 1 — SLA Approaching
  {
    name: "SLA Approaching",
    condition: (c) =>
      c.dateDue !== null
      AND diffInDays(c.dateDue, now()) <= getSLAWarningDays(c)
      AND c.chiLevel > 2,
    newCHI: 2,
    reasonTemplate:
      "SLA breach risk: due date {{dateDue}} is within {{daysRemaining}} days.",
  },

  // Rule 2 — Financial Penalty Imminent
  {
    name: "Penalty Imminent",
    condition: (c) =>
      c.hasFinancialPenalty === true
      AND c.dateDue !== null
      AND diffInDays(c.dateDue, now()) <= 3,
    newCHI: 1,
    reasonTemplate:
      "Financial penalty deadline in {{daysRemaining}} days. Immediate action required.",
  },

  // Rule 3 — Court Deadline
  {
    name: "Court Deadline",
    condition: (c) =>
      c.deadlineType === "CourtImposed"
      AND c.dateDue !== null
      AND diffInDays(c.dateDue, now()) <= 5,
    newCHI: 1,
    reasonTemplate:
      "Court-imposed deadline {{dateDue}} is within 5 days.",
  },

  // Rule 4 — Unassigned & Deteriorating
  {
    name: "Unassigned Aging",
    condition: (c) =>
      c.assignee === null
      AND diffInDays(now(), c.dateEnteredQueue) > 2 * queueMedianAgeDays(),
    newCHI: c.chiLevel,        // does not change CHI; adds a flag
    reasonTemplate:
      "Unassigned for {{daysInQueue}} days (2x median case age). Flagged: Deteriorating.",
    // NOTE: This rule does not promote CHI. It sets a "Deteriorating" flag
    // on the case record and emits an event. See edge cases (Section 10).
  },

  // Rule 5 — Blocker Stagnation
  {
    name: "Blocker Stagnation",
    condition: (c) =>
      c.hasBlockers === true
      AND diffInDays(now(), c.blockerLastUpdatedAt) > 5,
    newCHI: c.chiLevel,        // flag only
    reasonTemplate:
      "Blocker unchanged for {{blockerDays}} days. Flagged: Stalled.",
  },

  // Rule 6 — Picked But Idle
  {
    name: "Picked But Idle",
    condition: (c) =>
      c.status === "Picked"
      AND diffInDays(now(), c.lastActivityAt) > 3,
    newCHI: c.chiLevel,        // flag only
    reasonTemplate:
      "Case picked but no activity for {{idleDays}} days. Flagged: Idle.",
  },
]
```

**Evaluation algorithm:**

```
function evaluateEscalationRules(caseData):
  // Dormant cases are excluded entirely
  IF caseData.agingState === "Dormant"
      RETURN []

  firedEvents = []

  FOR EACH rule IN ESCALATION_RULES:
    IF rule.condition(caseData) === true:
      // Only allow promotion (lower CHI number = more severe)
      IF rule.newCHI < caseData.chiLevel:
        event = {
          id: generateUUID(),
          caseId: caseData.id,
          ruleName: rule.name,
          previousCHI: caseData.chiLevel,
          newCHI: rule.newCHI,
          reason: interpolate(rule.reasonTemplate, caseData),
          triggeredAt: now().toISOString(),
        }
        firedEvents.push(event)
      ELSE IF rule is a flag-only rule (Rules 4, 5, 6):
        // Emit event with same CHI; UI uses ruleName to show flag
        event = {
          id: generateUUID(),
          caseId: caseData.id,
          ruleName: rule.name,
          previousCHI: caseData.chiLevel,
          newCHI: caseData.chiLevel,       // unchanged
          reason: interpolate(rule.reasonTemplate, caseData),
          triggeredAt: now().toISOString(),
        }
        firedEvents.push(event)

  // Apply the most severe promotion
  IF any event in firedEvents has newCHI < caseData.chiLevel:
    bestEvent = event with minimum newCHI
    caseData.chiLevel = bestEvent.newCHI
    caseData.escalationEvents.push(bestEvent)
    eventBus.emit("case:escalated", bestEvent)

  // Apply flags for non-promotion events
  FOR EACH flagEvent in firedEvents WHERE newCHI === previousCHI:
    caseData.escalationEvents.push(flagEvent)
    eventBus.emit("case:flagged", flagEvent)

  RETURN firedEvents
```

### 4.4 Case Aging Calculation

**File**: `src/utils/caseAging.ts`
**Signature**: `calculateAgingState(dateEnteredQueue: string | Date): { state: CaseAgingState; daysInQueue: number }`

```
function calculateAgingState(dateEnteredQueue):
  IF dateEnteredQueue is null or undefined
      RETURN { state: "Normal", daysInQueue: 0 }

  daysInQueue = diffInCalendarDays(now(), dateEnteredQueue)

  IF daysInQueue <= 14   → RETURN { state: "Normal",  daysInQueue }
  IF daysInQueue <= 30   → RETURN { state: "Aging",   daysInQueue }
  IF daysInQueue <= 90   → RETURN { state: "Stale",   daysInQueue }
  RETURN { state: "Dormant", daysInQueue }
```

---

## 5. Components & UI

### 5.1 CHIBadge

**File**: `src/components/case-queue/CHIBadge.tsx`

A colored pill badge that displays the CHI level number and label.

```
Props:
  level: CHILevel             // required
  showLabel: boolean          // default true
  size: "sm" | "md"          // default "md"
  override: CHIOverride | null  // if present, show override indicator

Rendering:
  config = CHI_CONFIGS[level]
  <span
    style={{
      backgroundColor: config.bgColor,
      color: config.color,
      padding: size === "sm" ? "2px 6px" : "4px 10px",
      borderRadius: "12px",
      fontSize: size === "sm" ? "11px" : "13px",
      fontWeight: 600,
    }}
  >
    CHI-{level}
    {showLabel && ` ${config.label}`}
  </span>
  {override && (
    <Tooltip content={`Overridden from CHI-${override.originalCHI}. Reason: ${override.justification}`}>
      <Icon name="ArrowSwap" size={12} />
    </Tooltip>
  )}
```

**Accessibility**: Badge includes `aria-label="Severity: CHI-{level} {label}"`. Override tooltip is keyboard-focusable.

### 5.2 ComplexityIndicator

**File**: `src/components/case-queue/ComplexityIndicator.tsx`

A small chip displaying the complexity tier and estimated hours.

```
Props:
  score: number
  tier: ComplexityTier

Rendering:
  config = COMPLEXITY_CONFIGS.find(c => score >= c.minScore && score <= c.maxScore)
  <span
    style={{
      backgroundColor: config.color + "20",   // 12% opacity background
      color: config.color,
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: 500,
    }}
  >
    {config.tier} ({config.estimatedHours})
  </span>
```

### 5.3 AgingBadge

**File**: `src/components/case-queue/AgingBadge.tsx`

Displays the case age (days since entered) and the aging state when non-Normal.

```
Props:
  dateEnteredQueue: string | Date
  compact: boolean            // default false

Rendering:
  { state, daysInQueue } = calculateAgingState(dateEnteredQueue)
  config = AGING_CONFIGS.find(a => a.state === state)

  IF compact:
    <span style={{ color: config.color, fontSize: "12px" }}>
      {daysInQueue}d
    </span>
  ELSE:
    <span style={{ color: config.color }}>
      {state !== "Normal" && `${state} — `}{daysInQueue} days
    </span>
```

### 5.4 CHI Override Dialog

**Trigger**: Click on CHIBadge when user has `Supervisor` or `Lead` role.

```
Dialog contents:
  - Header: "Override CHI for Case {caseId}"
  - Current CHI badge (read-only)
  - New CHI dropdown (1-5)
  - Justification textarea (required, min 20 chars, max 500 chars)
  - Character count indicator
  - Warning text: "CHI overrides are logged to the audit trail."
  - [Cancel] [Apply Override] buttons

On submit:
  1. Validate justification length
  2. Create CHIOverride record
  3. Write override to case record
  4. Log to audit trail: { action: "chi_override", ...override }
  5. Emit event: eventBus.emit("case:chi_overridden", override)
  6. Close dialog
```

### 5.5 Auto-Escalation Toast

When `case:escalated` fires, a toast notification is shown:

```
Toast:
  variant: "warning" (CHI-2) or "error" (CHI-1)
  title: "Case Escalated"
  message: "Case {caseId} escalated to CHI-{newCHI}: {reason}"
  duration: 8000ms
  action: "View Case" → navigates to case detail
```

When `case:flagged` fires (Rules 4, 5, 6):

```
Toast:
  variant: "info"
  title: "Case Flagged"
  message: "Case {caseId}: {reason}"
  duration: 6000ms
```

### 5.6 Triage Form Additions

Added to the triage section of `DataEntryForm.tsx`:

| Field | Control | Behavior |
|---|---|---|
| Crime Type | `<Dropdown>` with `CRIME_TYPE_LABELS` | Optional. When set to `ChildExploitation`, CHI recalculates immediately and shows warning banner. |
| Requestor Verification | Read-only status badge | Set by Kodex integration (Phase 1) or manually by Lead. Shows `Verified` / `Unverified` / `Flagged` / `PendingVerification`. |
| Deadline Type | `<Dropdown>`: Standard, CourtImposed, Regulatory | Affects CHI Step 1 (court-imposed check). Default: Standard. |
| Has Financial Penalty | `<Checkbox>` | When checked, enables `Financial Penalty Deadline` field. |
| Financial Penalty Deadline | `<DatePicker>` | Only visible when `hasFinancialPenalty` is true. |

### 5.7 Country → Jurisdiction → Agency Fields (Triage Form)

The triage form renders a structured legal context section to replace the flat `country`/`jurisdiction`/`agency` fields:

**Country dropdown**

- Typeahead `<Combobox>` — searches against `COUNTRY_METADATA` keys (country name) and returns `CaseCountry` (code + name + region).
- On change: clears jurisdiction dropdown and all agency rows; triggers CHI recalculation.

**Jurisdiction dropdown**

- `<Dropdown>` populated by `getJurisdictionLevels(selectedCountry.countryCode)`.
- Disabled until a country is selected.
- Optional free-text override for `jurisdictionName` (e.g., "Southern District of NY").
- On change: triggers `getDefaultDueDays()` to compute a suggested `dateDue`; shows inline "Suggested due date: [date]" with option to accept or override.

**Agency section (repeating rows)**

Each row captures one agency + authority role:

| Field | Control | Behavior |
|---|---|---|
| Agency name | Typeahead `<Combobox>` against agency registry | Returns `Agency` entity; auto-fills country and type. Free-text allowed for unverified agencies. |
| Authority role | `<Dropdown>` with `AUTHORITY_ROLES` | Required per row. Default for first row: `RequestingAgency`. |
| Agency country | Read-only badge | Derived from agency registry. If agency country ≠ case country → shows cross-border warning. |
| Agency type | Read-only badge | Derived from agency registry (`AgencyType`). |
| Primary contact | Optional `<ContactPicker>` | Agent contact at this agency for this case. |

- **+ Add agency** button adds a new row.
- When any agency has a different country from the case country: show inline banner:
  ```
  ⚠ Cross-border request detected. Agency country does not match case country.
    This adds a +1.0 complexity modifier and requires additional review.
  ```
- `legalContext.crossBorderFlag` is set `true` and CHI recalculates.

**Derived due date behavior:**

When country + jurisdiction changes:
1. Call `getDefaultDueDays(legalContext)` → compute `suggestedDue = dateReceived + N days`.
2. If `dateDue` is not manually set: auto-populate `dateDue = suggestedDue`.
3. If `dateDue` was previously set: show "Suggested due date changed to [date] based on jurisdiction. Update?" prompt.

---

## 6. Files to Create

| File Path | Contents | Exports |
|---|---|---|
| `src/types/scoringTypes.ts` | All types and constants from Section 3 | `CHILevel`, `CHIConfig`, `CHI_CONFIGS`, `ComplexityTier`, `ComplexityConfig`, `COMPLEXITY_CONFIGS`, `CaseAgingState`, `AgingConfig`, `AGING_CONFIGS`, `CrimeType`, `CRIME_TYPE_LABELS`, `RequestorVerificationStatus`, `VERIFICATION_STATUS_COLORS`, `CHIOverride`, `AutoEscalationEvent`, `EscalationRule`, `CaseRecordPhase2Extensions` |
| `src/utils/chiEngine.ts` | CHI calculation engine | `calculateCHI`, `getSLAWarningDays`, `isRoutineRequestType` |
| `src/utils/complexityEngine.ts` | Complexity scoring engine | `calculateComplexity`, `mapScoreToTier` |
| `src/utils/autoEscalation.ts` | Escalation rule engine | `evaluateEscalationRules`, `ESCALATION_RULES` |
| `src/utils/caseAging.ts` | Aging state calculator | `calculateAgingState` |
| `src/hooks/useCaseHealth.ts` | Composite hook combining all engines | `useCaseHealth` |
| `src/components/case-queue/CHIBadge.tsx` | CHI visual badge | `CHIBadge` |
| `src/components/case-queue/ComplexityIndicator.tsx` | Complexity chip | `ComplexityIndicator` |
| `src/components/case-queue/AgingBadge.tsx` | Aging indicator | `AgingBadge` |

---

## 7. Files to Modify

### 7.1 `src/constants/caseConstants.ts`

**Add:**

```typescript
import { CrimeType, CRIME_TYPE_LABELS, RequestorVerificationStatus } from "../types/scoringTypes";

// Re-export for backwards compatibility with existing imports
export const CRIME_TYPES = CRIME_TYPE_LABELS;

export const REQUESTOR_VERIFICATION_STATUSES: RequestorVerificationStatus[] = [
  "Verified",
  "Unverified",
  "Flagged",
  "PendingVerification",
];

export const DEADLINE_TYPES = ["Standard", "CourtImposed", "Regulatory"] as const;
```

### 7.2 `src/components/case-queue/CaseCardDetails.tsx`

**Add** CHIBadge, ComplexityIndicator, and AgingBadge to the card layout:

```
Import CHIBadge, ComplexityIndicator, AgingBadge.

In the card header row (next to case ID and priority badge):
  <CHIBadge level={caseData.chiLevel} size="sm" override={caseData.chiOverride} />

In the metadata row:
  <ComplexityIndicator score={caseData.complexityScore} tier={caseData.complexityTier} />
  <AgingBadge dateEnteredQueue={caseData.dateEnteredQueue} compact />
```

### 7.3 `src/components/CaseQueue.tsx`

**Modify sort logic:**

```typescript
// Primary sort: CHI level ascending (1 = most severe first)
// Secondary sort: daysInQueue descending (oldest first within same CHI)
cases.sort((a, b) => {
  if (a.chiLevel !== b.chiLevel) return a.chiLevel - b.chiLevel;
  const aDays = diffInDays(now(), a.dateEnteredQueue);
  const bDays = diffInDays(now(), b.dateEnteredQueue);
  return bDays - aDays;  // older cases first
});
```

**Add CHI filter:**

```
In the filter bar, add a multi-select filter:
  label: "Severity"
  options: CHI-1 through CHI-5 with color chips
  behavior: when selected, only show cases matching selected CHI levels
```

### 7.4 `src/hooks/useCaseWorkflow.ts`

**Modify** the save handler to recalculate scores:

```
In the existing save flow (after field validation, before persisting):

  // Recalculate scores
  const { chiLevel, complexityScore, complexityTier, agingState } =
    calculateAllScores(caseData);
  caseData.chiLevel = chiLevel;
  caseData.complexityScore = complexityScore;
  caseData.complexityTier = complexityTier;
  caseData.agingState = agingState;

  // Evaluate auto-escalation
  const events = evaluateEscalationRules(caseData);
  // Events are emitted inside evaluateEscalationRules via eventBus
```

### 7.5 `src/components/DataEntryForm.tsx`

**Add** to the triage section (after existing priority and request type fields):

- Crime Type dropdown (see Section 5.6)
- Deadline Type dropdown
- Has Financial Penalty checkbox
- Financial Penalty Deadline date picker (conditional)
- Requestor Verification Status badge (read-only unless Lead/Supervisor)

When `crimeType` is set to `ChildExploitation`, show an inline warning:

```
<Banner variant="error">
  Child Exploitation cases are automatically classified as CHI-1 Critical.
  This case will be prioritized above all other cases in the case list.
</Banner>
```

---

## 8. Mock Data

Five cases spanning all CHI levels, demonstrating how scores are calculated.

### Case 1: CHI-1 Critical

```typescript
{
  id: "LNS-10001",
  requestType: "Emergency Letter",
  casePriority: "Emergency",
  crimeType: "ChildExploitation",
  identifiers: [
    { type: "Email", value: "suspect@example.com" },
    { type: "Phone", value: "+15551234567" },
  ],
  services: ["Outlook", "Teams"],
  dateDue: "2026-04-01",             // 6 days from now
  deadlineType: "Standard",
  hasFinancialPenalty: false,
  dateEnteredQueue: "2026-03-24",    // 2 days ago

  // --- Calculated ---
  chiLevel: 1,
  // Reason: crimeType === "ChildExploitation" → Step 1 fires
  complexityScore: 2 * 1.0 + 2 * 2.0 + 3.0 = 9.0,
  complexityTier: "Medium",          // 9 falls in 9-15
  agingState: "Normal",              // 2 days
}
```

### Case 2: CHI-2 Urgent

```typescript
{
  id: "LNS-10002",
  requestType: "Court Order",
  casePriority: "Urgent",
  crimeType: "Financial",
  identifiers: [
    { type: "Email", value: "person@corp.com" },
    { type: "TenantID", value: "abc-123-def" },
  ],
  services: ["Azure", "Enterprise"],
  dateDue: "2026-04-05",             // 10 days from now
  deadlineType: "CourtImposed",
  hasFinancialPenalty: true,
  dateEnteredQueue: "2026-03-12",    // 14 days ago

  // --- Calculated ---
  chiLevel: 2,
  // Reason: hasFinancialPenalty AND daysUntilDue(10) <= slaWarningDays(7 for Court Order) is FALSE
  //         but hasFinancialPenalty → Step 2 fires
  complexityScore: 2 * 1.0 + 2 * 2.0 + 3.0 + 2.0 + 2.5 = 13.5,
  complexityTier: "Medium",          // 13.5 in 9-15
  agingState: "Normal",              // 14 days (boundary)
}
```

### Case 3: CHI-3 Significant

```typescript
{
  id: "LNS-10003",
  requestType: "Search Warrant",
  casePriority: "Routine",
  crimeType: "CyberCrime",
  identifiers: Array(30).fill({ type: "IP", value: "varied" }),
  services: ["Outlook", "Teams", "Azure", "OneDrive/SharePoint"],
  dateDue: "2026-05-15",             // 50 days from now
  deadlineType: "Standard",
  hasFinancialPenalty: false,
  dateEnteredQueue: "2026-03-10",    // 16 days ago

  // --- Calculated ---
  chiLevel: 3,
  // Reason: identifierCount(30) >= 25 → Step 3 fires
  //         also servicesCount(4) >= 3 → Step 3 would fire
  //         also complexity tier = Heavy → Step 3 would fire
  complexityScore: 30 * 1.0 + 4 * 2.0 + 3.0 + 2.0 = 43.0,
  complexityTier: "Complex",         // 43 >= 26
  agingState: "Aging",               // 16 days
}
```

### Case 4: CHI-4 Standard

```typescript
{
  id: "LNS-10004",
  requestType: "Subpoena",
  casePriority: "Routine",
  crimeType: "FraudIdentityTheft",
  identifiers: [
    { type: "Email", value: "user1@example.com" },
    { type: "Email", value: "user2@example.com" },
    { type: "Phone", value: "+15559876543" },
  ],
  services: ["Outlook", "MSA"],
  dateDue: "2026-05-01",             // 36 days from now
  deadlineType: "Standard",
  hasFinancialPenalty: false,
  dateEnteredQueue: "2026-03-20",    // 6 days ago

  // --- Calculated ---
  chiLevel: 4,
  // Reason: no Step 1-3 triggers; within SLA, Light complexity
  complexityScore: 3 * 1.0 + 2 * 2.0 + 1.5 = 8.5,
  complexityTier: "Light",           // 8.5 in 4-8... actually 8.5 > 8
  // NOTE: 8.5 rounds; strict check: 8.5 > 8 → "Medium"
  // Correction: complexityTier: "Medium" (9-15 range starts at 9; 8.5 < 9 → "Light" if using <= 8)
  // Clarification: score 8.5 with boundary at maxScore 8 → "Medium" tier.
  // Implementation uses: score > maxScore to advance. 8.5 > 8 → next tier.
  complexityTier: "Medium",
  agingState: "Normal",              // 6 days
}
```

### Case 5: CHI-5 Quick

```typescript
{
  id: "LNS-10005",
  requestType: "Preservation",
  casePriority: "Routine",
  crimeType: "Other",
  identifiers: [
    { type: "Email", value: "single@example.com" },
  ],
  services: ["Outlook"],
  dateDue: "2026-06-01",             // 67 days from now
  deadlineType: "Standard",
  hasFinancialPenalty: false,
  dateEnteredQueue: "2026-03-25",    // 1 day ago

  // --- Calculated ---
  chiLevel: 5,
  // Reason: identifierCount=1, servicesCount=1, requestType=Preservation (routine) → Step 5
  complexityScore: 1 * 1.0 + 1 * 2.0 + 1.0 = 4.0,
  complexityTier: "Light",           // 4 in 4-8
  agingState: "Normal",              // 1 day
}
```

---

## 9. State Management

### 9.1 useCaseHealth Hook

**File**: `src/hooks/useCaseHealth.ts`

```typescript
interface CaseSeverityResult {
  chiLevel: CHILevel;
  chiConfig: CHIConfig;
  chiOverride: CHIOverride | null;
  complexityScore: number;
  complexityTier: ComplexityTier;
  complexityConfig: ComplexityConfig;
  agingState: CaseAgingState;
  daysInQueue: number;
  agingConfig: AgingConfig;
  escalationWarnings: AutoEscalationEvent[];
  flags: string[];                     // "Deteriorating", "Stalled", "Idle"
}

function useCaseHealth(caseData: FormData): CaseSeverityResult {
  // Memoize calculations to avoid re-running on every render
  const severity = useMemo(() => {
    const chiLevel = caseData.chiOverride?.overriddenCHI
      ?? calculateCHI(caseData);
    const chiConfig = CHI_CONFIGS[chiLevel];

    const { score, tier } = calculateComplexity(caseData);
    const complexityConfig = COMPLEXITY_CONFIGS.find(c => c.tier === tier)!;

    const { state, daysInQueue } = calculateAgingState(caseData.dateEnteredQueue);
    const agingConfig = AGING_CONFIGS.find(a => a.state === state)!;

    return {
      chiLevel,
      chiConfig,
      chiOverride: caseData.chiOverride ?? null,
      complexityScore: score,
      complexityTier: tier,
      complexityConfig,
      agingState: state,
      daysInQueue,
      agingConfig,
      escalationWarnings: [],
      flags: [],
    };
  }, [caseData]);

  // Run auto-escalation on mount and when case data changes
  useEffect(() => {
    const events = evaluateEscalationRules(caseData);

    // Separate promotions from flags
    const promotions = events.filter(e => e.newCHI < e.previousCHI);
    const flags = events
      .filter(e => e.newCHI === e.previousCHI)
      .map(e => e.ruleName.includes("Aging") ? "Deteriorating"
              : e.ruleName.includes("Blocker") ? "Stalled"
              : "Idle");

    // Update severity state with escalation results
    setSeverity(prev => ({
      ...prev,
      chiLevel: promotions.length > 0
        ? Math.min(...promotions.map(p => p.newCHI)) as CHILevel
        : prev.chiLevel,
      escalationWarnings: events,
      flags,
    }));
  }, [caseData.id, caseData.dateDue, caseData.chiLevel]);

  return severity;
}
```

### 9.2 Integration Points

| Trigger | Action |
|---|---|
| Case loaded from API | `useCaseHealth` runs, calculates all scores, evaluates escalation rules |
| Analyst saves case form | `useCaseWorkflow.save()` recalculates CHI and complexity before persisting |
| CHI override applied | Override stored on case; `useCaseHealth` uses override value |
| Timer tick (if implemented) | Background job re-evaluates escalation rules for all open cases |
| Case enters system | `dateEnteredQueue` set; aging starts |

---

## 10. Edge Cases

### 10.1 CHI Override Audit Trail

Every CHI override **must** generate an audit log entry:

```typescript
{
  action: "chi_override",
  timestamp: override.overriddenAt,
  actor: override.overriddenBy,
  details: {
    originalCHI: override.originalCHI,
    overriddenCHI: override.overriddenCHI,
    justification: override.justification,
  },
}
```

The override persists until the case is manually reset or the case is closed. Auto-escalation **does not** override a manual CHI override -- if a Supervisor has set CHI-4 on a case, escalation rules will not promote it. The Supervisor "owns" the severity until they release it.

### 10.2 Auto-Escalation Cannot Downgrade

The escalation engine enforces `rule.newCHI < caseData.chiLevel` (strictly lower number = more severe). A case at CHI-1 will never be moved to CHI-2 or lower by the engine. Similarly, if a case naturally calculates as CHI-2 but was previously escalated to CHI-1, recalculation on save should preserve the escalated CHI-1 unless the Supervisor explicitly overrides.

### 10.3 Dormant Case Exclusion

Cases with `agingState === "Dormant"` (91+ days since entered):

- Excluded from `evaluateEscalationRules` (engine returns `[]` immediately)
- Excluded from active operational metrics (average CHI, case volume counts)
- Still visible in the case list but visually de-emphasized (50% opacity, moved to bottom)
- Require manual reactivation by a Supervisor, which sets `agingState` to `"Reactivated"` and triggers CHI-2

### 10.4 Zero Identifiers

When `identifierCount === 0`:

- Complexity score = `servicesCount * 2.0 + specialFlags + requestTypeWeight`
- CHI Step 5 cannot fire (requires `identifierCount === 1`)
- CHI Step 3 identifier check (>= 25) does not fire
- Falls through to Step 4 (Standard) by default

### 10.5 Case With No Due Date

When `dateDue` is `null` or `undefined`:

- `daysUntilDue` is treated as `Infinity`
- All deadline-based rules are skipped:
  - CHI Step 1: court-imposed deadline check -- skipped
  - CHI Step 1: financial penalty deadline check -- skipped
  - CHI Step 2: SLA warning check -- skipped
  - Escalation Rule 1 (SLA Approaching) -- skipped
  - Escalation Rule 2 (Penalty Imminent) -- skipped
  - Escalation Rule 3 (Court Deadline) -- skipped
- CHI can still be 1 via `crimeType === "ChildExploitation"` or `casePriority === "Emergency"`
- CHI can still be 3 via complexity/service/identifier checks

### 10.6 Concurrent Escalation Events

If multiple escalation rules fire simultaneously (e.g., both "SLA Approaching" and "Penalty Imminent"), the engine applies only the most severe CHI (lowest number). Both events are recorded in `escalationEvents[]` for audit purposes, but only one CHI change occurs.

### 10.7 Complexity Score Boundary Values

Score boundaries are inclusive on the lower end, exclusive on the upper end:

| Score | Tier |
|---|---|
| 0.0 -- 3.0 | Quick |
| 3.1 -- 8.0 | Light |
| 8.1 -- 15.0 | Medium |
| 15.1 -- 25.0 | Heavy |
| 25.1+ | Complex |

Implementation should use `score <= maxScore` with the `maxScore` values from `COMPLEXITY_CONFIGS`. For the boundary value of exactly 3.0, the case is "Quick." For 3.1, it is "Light."

---

## 11. Acceptance Criteria

| # | Criterion | Verification Method |
|---|---|---|
| AC-1 | `calculateCHI` returns the correct level for each step of the decision tree when given matching inputs | Unit test: one test per step (5 tests minimum) |
| AC-2 | Crime type `ChildExploitation` always returns CHI-1 regardless of other factors | Unit test: set crimeType=CE with Routine priority, far-future due date -- must return 1 |
| AC-3 | Priority `Emergency` (P0) always returns CHI-1 | Unit test: set casePriority=Emergency with no other triggers -- must return 1 |
| AC-4 | Complexity score matches the formula for a known set of inputs | Unit test: provide exact inputs, assert exact score to one decimal place |
| AC-5 | Each complexity tier maps to the correct score range boundary | Unit test: test boundary values (3.0 = Quick, 3.1 = Light, 8.0 = Light, 8.1 = Medium, etc.) |
| AC-6 | Auto-escalation promotes CHI-4 to CHI-2 when `daysUntilDue <= slaWarningDays` | Unit test: mock case with CHI-4 and approaching deadline -- assert CHI becomes 2 |
| AC-7 | Auto-escalation promotes to CHI-1 when `hasFinancialPenalty` and `daysUntilDue <= 3` | Unit test: mock case -- assert CHI becomes 1 |
| AC-8 | Auto-escalation does NOT downgrade CHI (CHI-1 stays CHI-1 even if no rules match) | Unit test: case at CHI-1 -- run all rules -- assert CHI remains 1 |
| AC-9 | Dormant cases (91+ days) are excluded from escalation and active operational metrics | Unit test: 91-day-old case -- `evaluateEscalationRules` returns `[]`. Integration test: operational metric counts exclude dormant cases. |
| AC-10 | CHI badge renders with the correct background color for each of the 5 levels | Component test: render CHIBadge for levels 1-5, assert `backgroundColor` matches `CHI_CONFIGS[level].bgColor` |
| AC-11 | Case list is sorted by CHI ascending (1 first), then by age descending within same CHI | Integration test: provide 10 cases with mixed CHI and ages -- assert sort order |
| AC-12 | CHI override saves justification to audit log | Integration test: apply override -- assert audit log contains entry with action `chi_override` and correct justification |
| AC-13 | Crime type dropdown appears in the triage form and updates `crimeType` on case | Component test: render DataEntryForm, find Dropdown with crime type options, select value, assert form state updated |
| AC-14 | Aging badge shows correct state label and day count for each aging threshold | Component test: render AgingBadge with dates producing each state, assert text content |
| AC-15 | Escalation events are emitted through event bus with correct payload | Unit test: mock `eventBus.emit` -- run escalation -- assert `case:escalated` called with `AutoEscalationEvent` shape |

---

## 12. Cross-References

| Reference | Sections | Relevance |
|---|---|---|
| DARS Case Operations & Workforce Intelligence Roadmap | Phase 2 | Parent roadmap defining phase scope and sequencing |
| `DARS_Case_Health_Management.md` | Sections 3 -- 4 | Case health scoring model and aging state definitions; Phase 2 implements the scoring engines described there |
| `Triage_Framework_Evaluation.md` | Sections 2 -- 4 | ESI (Emergency Severity Index) and MPDS (Medical Priority Dispatch System) evaluation; CHI decision tree is adapted from ESI 5-level model |
| Kodex GAP 2 | Requestor verification | `RequestorVerificationStatus` field supports Kodex integration for validating law enforcement requestor identity |
| `caseConstants.ts` | Priority levels, request types, request sub-types, identifier types, services | Existing enumerations consumed by the CHI and complexity engines |
| `useCaseWorkflow.ts` | Stage transitions | Save handler modified to trigger score recalculation and escalation evaluation |

---

*End of spec. An engineer should be able to implement all scoring engines, UI components, and integration points from this document without additional design input.*
