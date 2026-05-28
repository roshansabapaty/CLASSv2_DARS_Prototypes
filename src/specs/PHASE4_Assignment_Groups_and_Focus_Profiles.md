# Phase 4: Assignment Groups & Focus Profiles

**DARS Case Operations & Workforce Intelligence Roadmap -- Phase 4**
**Status:** Draft
**Last updated:** 2026-03-26

---

## 1. Overview

Phase 4 delivers the workforce assignment and case distribution system that replaces the manual Tuesday slide-deck process currently used by managers (Shane, Jessalyn) to direct Response Specialists (RS) to specific work categories.

**What this phase builds:**

- **Assignment Groups** -- named, reusable filter criteria sets that describe categories of work (e.g., "US Federal -- CE", "Azure non-US", "EEA Older Than 10 Days"). Managers create and maintain these as org-level objects.
- **FilterCriteria schema** -- structured JSON that defines how cases are matched to groups, using AND logic across all non-null fields.
- **Qualification management** -- structured records of which RS are qualified for each group, including proficiency level, throughput history, certification tracking, and emergency grants.
- **Qualification Coverage Matrix** -- manager view showing staffing levels per Assignment Group with gap analysis against projected demand.
- **RS Capability Profile** -- individual view of an RS's qualifications, performance metrics, current load, and availability.
- **Weekly Focus Profile builder** -- manager assigns a prioritized, ordered list of Assignment Groups to each RS for a given week, with bulk operations and mid-week adjustment support.
- **RS focus-filtered case view** -- the RS landing page showing "My Active Cases" and "Available to Pick" sections, where available cases are pre-filtered and grouped by the RS's assigned Focus Profile.
- **Pick, Release, Stage case actions** -- RS can claim cases from the case list with dynamic caseload caps that adjust based on operating mode and complexity.
- **Case handoff protocol** -- structured transfer of cases between RS with context notes, partial work references, and acknowledgment tracking.

**Why this matters:** Today, managers manually count case volumes, build priority lists in slide decks, present them at weekly meetings, and RS must then manually navigate and configure CRM filters to find matching cases. Mid-week priority changes are communicated ad-hoc via Teams chat. This phase automates the entire loop: managers define groups and assign focus, the system filters and presents the right cases to the right RS, and pick/release actions feed back into capacity metrics.

---

## 2. Prerequisites

| Phase | What it delivers | What Phase 4 consumes |
|-------|------------------|-----------------------|
| **Phase 1** | Persona system, enriched data model, event bus | Manager persona with workforce management capabilities; event bus for ASSIGNMENT_CHANGE, PROFILE_PUBLISHED, HANDOFF_INITIATED events; enriched CaseQueueItem with all filterable fields |
| **Phase 2** | CHI scoring (Case Health Index), Complexity Score | CHI for case sorting within groups; Complexity Score for dynamic caseload cap calculation |
| **Phase 3** | List view table component | Table component reused as the RS case view interface within `FocusQueueView`; column definitions, sort/filter patterns |

All three phases must be delivered before Phase 4 work begins. The Manager persona from Phase 1 gates access to Assignment Group CRUD, qualification management, and Focus Profile builder. The CHI score from Phase 2 determines sort order within each group's case list. The list view from Phase 3 provides the table rendering used in both the "My Active Cases" and "Available to Pick" sections.

---

## 3. Data Model

All interfaces below are implementation-ready TypeScript. Field names use camelCase to match existing codebase conventions (see `case-queue-types.ts`).

### 3.1 AssignmentGroup

```typescript
interface AssignmentGroup {
  id: string;                    // UUID
  name: string;                  // e.g., "US Federal -- CE", "Azure non-US"
  description: string;           // Human-readable context for the group
  criteria: FilterCriteria;      // Structured filter definition (see 3.2)
  isActive: boolean;             // false = archived, excluded from UI lists
  createdBy: string;             // userId of the manager who created it
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 FilterCriteria

Each field is optional. A `null` or `undefined` field acts as a wildcard (matches all cases). When multiple fields are set, they combine with AND logic -- a case must satisfy every non-null criterion to match.

Array-typed fields use OR within the array: `country: ["United States", "Canada"]` matches cases from either country.

```typescript
interface FilterCriteria {
  // Geographic
  country?: string[];            // Include: case.country IN this list
  countryExclude?: string[];     // Exclude: case.country NOT IN this list
  region?: string[];             // e.g., ["EEA", "GNI", "North America"]
  jurisdiction?: string[];       // e.g., ["Federal", "State", "Provincial"]

  // Request classification
  requestType?: string[];        // e.g., ["Search Warrant", "Court Order"]
  requestTypeExclude?: string[]; // e.g., ["Preservation"] to exclude
  crimeType?: string[];          // Matches against case.natureOfCrime array

  // Service
  service?: string[];            // e.g., ["Azure", "Teams"] -- matches servicesRequested
  serviceExclude?: string[];     // e.g., ["Xbox"] to exclude

  // Priority & risk
  priority?: ("Emergency" | "Urgent" | "Routine")[];
  hasFinancialPenalty?: boolean;  // true = only cases with financial penalty

  // Age & timing
  minDaysInQueue?: number;       // case must be >= N days old
  maxDaysInQueue?: number;       // case must be <= N days old
  dateReceivedAfter?: string;    // ISO date -- case.createDate >= this
  dateReceivedBefore?: string;   // ISO date -- case.createDate <= this

  // Queue & sort
  queue?: string;                // Named queue filter (e.g., "US JT Fulfillment")
  sortField?: string;            // Override default sort within this group
  sortDirection?: "ASC" | "DESC";
}
```

### 3.3 Qualification

```typescript
interface Qualification {
  id: string;                          // UUID
  assignmentGroupId: string;           // FK -> AssignmentGroup.id
  userId: string;                      // FK -> User (the RS being qualified)

  // Grant lifecycle
  grantedBy: string;                   // userId of the manager who granted
  grantedAt: Date;
  revokedAt?: Date;                    // Set when revoked; null = active
  revokeReason?: string;               // Required when revoking

  // Skill assessment
  proficiency: "Trainee" | "Competent" | "Expert";
  trainingCompletedAt?: Date;          // When formal training was finished
  certificationExpiresAt?: Date;       // Null = no expiration
  isEmergencyGrant: boolean;           // Crisis-mode temporary qualification
  emergencyExpiresAt?: Date;           // Auto-revoke datetime for emergency grants
  notes?: string;                      // Manager notes about this qualification

  // Performance metrics (system-calculated, rolling 30-day)
  avgThroughputPerDay?: number;        // Cases completed per day in this group
  avgTimeToComplete?: number;          // Hours, average case duration
  maxConcurrentCases?: number;         // Manager-set cap for this RS in this group
  qualityScore?: number;               // 0.0-1.0, based on QA review results
}
```

### 3.4 WeeklyFocusProfile

```typescript
interface WeeklyFocusProfile {
  id: string;                    // UUID
  userId: string;                // FK -> User (the RS this profile is for)
  weekStart: Date;               // Monday of the effective week (ISO week)
  createdBy: string;             // userId of the manager who built it
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;             // false = superseded or deactivated
}
```

### 3.5 FocusProfileEntry

```typescript
interface FocusProfileEntry {
  id: string;                    // UUID
  profileId: string;             // FK -> WeeklyFocusProfile.id
  assignmentGroupId: string;     // FK -> AssignmentGroup.id
  priorityOrder: number;         // 1 = highest priority (work first), ascending
}
```

### 3.6 CaseHandoff

```typescript
interface CaseHandoff {
  id: string;                    // UUID
  caseId: string;                // FK -> Case
  fromUserId: string;            // RS transferring the case
  toUserId?: string;             // Receiving RS; null = release to case pool
  handoffType: "Planned" | "Urgent" | "Voluntary";
  contextNote: string;           // Required -- what's done, what's pending
  partialWork?: string;          // JSON references to attachments/notes
  createdAt: Date;
  acknowledgedAt?: Date;         // Set when receiving RS confirms receipt
}
```

### 3.7 CasePickState

```typescript
type CasePickState = "Available" | "Staged" | "Active" | "Released";
```

| State | Meaning | Visible to others | Caseload weight |
|-------|---------|-------------------|-----------------|
| `Available` | In shared case pool, no RS owns it | Yes | 0 |
| `Staged` | Claimed by RS but not started; auto-releases after 24 hours | No (locked) | 0.5x |
| `Active` | RS is actively working the case | No (locked) | 1.0x |
| `Released` | Returned to case pool by RS or system | Yes (transitions to Available) | 0 |

### 3.8 FocusProfileChangeLog

```typescript
interface FocusProfileChangeLog {
  id: string;                    // UUID
  profileId: string;             // FK -> WeeklyFocusProfile.id
  changedBy: string;             // userId of who made the change
  changedAt: Date;
  changeType: "Created" | "GroupAdded" | "GroupRemoved" | "Reordered" | "Deactivated" | "Cloned";
  details: string;               // JSON or human-readable description of what changed
}
```

---

## 4. Business Logic

### 4.1 Case-to-Group Matching

```typescript
function matchesCriteria(caseItem: CaseQueueItem, criteria: FilterCriteria): boolean
```

Evaluates all non-null fields in `criteria` against the case with AND logic. A case matches only if it satisfies every specified criterion. Null/undefined fields are wildcards (always pass).

**Evaluation rules per field:**

| Criteria field | Case field | Match logic |
|---|---|---|
| `country` | `caseItem.country` | `country.includes(caseItem.country)` |
| `countryExclude` | `caseItem.country` | `!countryExclude.includes(caseItem.country)` |
| `region` | Derived from `caseItem.country` using `JURISDICTIONS` from `caseConstants.ts` | Country belongs to at least one specified region group |
| `jurisdiction` | `caseItem.jurisdiction` | `jurisdiction.includes(caseItem.jurisdiction)` |
| `requestType` | `caseItem.requestType` | `requestType.includes(caseItem.requestType)` |
| `requestTypeExclude` | `caseItem.requestType` | `!requestTypeExclude.includes(caseItem.requestType)` |
| `crimeType` | `caseItem.natureOfCrime` | At least one crime in `caseItem.natureOfCrime` appears in `crimeType` |
| `service` | `caseItem.servicesRequested` | At least one service in `caseItem.servicesRequested` appears in `service` |
| `serviceExclude` | `caseItem.servicesRequested` | No service in `caseItem.servicesRequested` appears in `serviceExclude` |
| `priority` | `caseItem.casePriority` | `priority.includes(caseItem.casePriority)` |
| `hasFinancialPenalty` | `caseItem.hasFinancialPenalty` (new field, Phase 1) | Exact boolean match |
| `minDaysInQueue` | `daysSince(caseItem.createDate)` | `daysInQueue >= minDaysInQueue` |
| `maxDaysInQueue` | `daysSince(caseItem.createDate)` | `daysInQueue <= maxDaysInQueue` |
| `dateReceivedAfter` | `caseItem.createDate` | `createDate >= dateReceivedAfter` |
| `dateReceivedBefore` | `caseItem.createDate` | `createDate <= dateReceivedBefore` |
| `queue` | `caseItem.queue` (new field, Phase 1) | Exact string match |

**Implementation note:** Iterate over all keys of the criteria object. For each non-null key, evaluate the corresponding rule. If any rule returns false, short-circuit and return false. If all rules pass (or no rules are defined), return true.

### 4.2 Group Case Count

```typescript
function countMatchingCases(
  group: AssignmentGroup,
  allCases: CaseQueueItem[]
): number
```

Returns `allCases.filter(c => matchesCriteria(c, group.criteria)).length`. Used in the AssignmentGroupEditor live preview and CoverageMatrix demand calculation.

### 4.3 Qualification Gating

```typescript
function canAssignToGroup(userId: string, groupId: string): boolean
```

Returns true if:
1. An active Qualification record exists where `qualification.userId === userId` AND `qualification.assignmentGroupId === groupId`
2. `qualification.revokedAt` is null (not revoked)
3. If `qualification.certificationExpiresAt` is set, it has not passed
4. If `qualification.isEmergencyGrant` is true, `qualification.emergencyExpiresAt` has not passed

If the function returns false, the system prevents:
- Adding the group to that RS's Focus Profile
- The RS from picking cases that only match that group

### 4.4 Dynamic Caseload Cap

```typescript
function getMaxConcurrent(
  qualification: Qualification,
  operatingMode: "Normal" | "Elevated" | "Surge" | "Crisis",
  complexityFactor?: number   // defaults to 1.0
): number
```

**Formula:**

```
effectiveCap = floor(
  (qualification.maxConcurrentCases ?? DEFAULT_MAX_CONCURRENT)
  * modeMultiplier[operatingMode]
  / (complexityFactor ?? 1.0)
)
```

**Mode multipliers** (from DARS_Case_Health_Management.md Section 7):

| Operating mode | Multiplier | Effect |
|---|---|---|
| Normal | 1.0 | Standard cap |
| Elevated | 1.0 | No cap change (awareness only) |
| Surge | 1.25 | 25% more cases per RS |
| Crisis | 1.5 | 50% more cases per RS |

**Complexity factor** is the average Complexity Score (Phase 2) of the RS's current active cases, normalized to a 1.0 baseline. High-complexity cases (e.g., Enterprise Azure with 8+ identifiers) reduce effective cap; low-complexity cases increase it. Default = 1.0 if no cases are active or Complexity Score is unavailable.

`DEFAULT_MAX_CONCURRENT = 6` (configurable).

### 4.5 Focus Profile Filtering

```typescript
function getAvailableCases(
  profile: WeeklyFocusProfile,
  entries: FocusProfileEntry[],
  allCases: CaseQueueItem[],
  pickedCaseIds: Set<string>,
  groups: Map<string, AssignmentGroup>
): GroupedAvailableCases[]
```

**Returns:** An array of `{ group: AssignmentGroup, priorityOrder: number, cases: CaseQueueItem[] }` objects, sorted by `priorityOrder` ascending.

**Algorithm:**

1. Sort `entries` by `priorityOrder` ascending.
2. Initialize `assignedCaseIds: Set<string>` (starts empty).
3. For each entry in order:
   a. Resolve the `AssignmentGroup` from `groups.get(entry.assignmentGroupId)`.
   b. Filter `allCases` to cases that:
      - `matchesCriteria(case, group.criteria)` returns true
      - `case.caseId` is NOT in `pickedCaseIds` (already picked by this RS)
      - `case.caseId` is NOT in `assignedCaseIds` (already shown under a higher-priority group)
      - `case.pickState` is `"Available"` (not staged/active by another RS)
   c. Add all matching case IDs to `assignedCaseIds`.
   d. Sort matching cases by CHI (highest first), then by due date (soonest first).
   e. Emit the group + sorted cases as one entry in the result array.

### 4.6 Overlapping Group Resolution

A single case may match multiple Assignment Groups in an RS's Focus Profile. The rule: **show the case under the highest-priority group only** (lowest `priorityOrder` number). Step 3b above enforces this by tracking `assignedCaseIds` across group iterations.

Example: Case LNS-2025-00142 (US, Federal, Azure) matches both "Azure non-US" (priority 1, but fails country -- so no match) and "US Federal" (priority 2). It appears under "US Federal" only. If it matched both "Azure US" (priority 1) and "US Federal" (priority 2), it would appear under "Azure US" only.

### 4.7 Pick Action

```typescript
function pickCase(
  userId: string,
  caseId: string,
  pickType: "Stage" | "Active"
): PickResult
```

**Steps:**

1. **Optimistic lock check:** Verify `case.pickState === "Available"`. If not, return `{ success: false, reason: "ALREADY_PICKED" }`.
2. **Qualification check:** Verify the RS has an active qualification for at least one group that matches this case. If not, return `{ success: false, reason: "NOT_QUALIFIED" }`.
3. **Caseload cap check:** Count the RS's current active + staged cases (staged at 0.5x weight). If adding this case would exceed `getMaxConcurrent()`, return `{ success: false, reason: "CASELOAD_CAP_REACHED" }`.
4. **Assign:** Set `case.assigneeName = userId`, `case.pickState = pickType`.
5. **If Staged:** Start a 24-hour auto-release timer. After 24 hours, if still Staged, execute `releaseCase(userId, caseId, "AUTO_RELEASE")`.
6. **Emit event:** `eventBus.emit("ASSIGNMENT_CHANGE", { caseId, userId, action: "PICK", pickType, timestamp })`.
7. Return `{ success: true }`.

### 4.8 Release Action

```typescript
function releaseCase(
  userId: string,
  caseId: string,
  reason: "VOLUNTARY" | "AUTO_RELEASE" | "MANAGER_BULK_RELEASE"
): void
```

**Steps:**

1. Set `case.assigneeName = null`, `case.pickState = "Available"`.
2. Cancel any active auto-release timer for this case.
3. Emit event: `eventBus.emit("ASSIGNMENT_CHANGE", { caseId, userId, action: "RELEASE", reason, timestamp })`.
4. Case becomes immediately visible to all RS whose Focus Profile matches it.

### 4.9 Stage Action

Staging is a "soft claim" -- the RS intends to work the case but has not started. Staged cases:
- Are invisible to other RS (locked, cannot be picked by others)
- Count as 0.5x toward the RS's caseload cap
- Auto-release after 24 hours if not transitioned to Active
- Can be promoted to Active or Released at any time by the owning RS

### 4.10 Handoff Protocol

```typescript
function initiateHandoff(handoff: Omit<CaseHandoff, "id" | "createdAt" | "acknowledgedAt">): CaseHandoff
```

**Steps:**

1. Validate `handoff.contextNote` is non-empty (required field).
2. If `handoff.toUserId` is set:
   a. Verify the receiving RS has an active qualification for the case's matching group(s).
   b. Verify the receiving RS is not at caseload cap.
   c. Create the handoff record.
   d. Transfer assignment: `case.assigneeName = handoff.toUserId`.
   e. Send notification to receiving RS with context note and case link.
   f. Case appears in receiving RS's "My Active Cases" with a **Handoff** badge until `acknowledgedAt` is set.
3. If `handoff.toUserId` is null (release to case pool):
   a. Unassign the case (`case.assigneeName = null`, `case.pickState = "Available"`).
   b. Create the handoff record (context note preserved for whoever picks it next).
4. Emit event: `eventBus.emit("HANDOFF_INITIATED", { handoff })`.

**Acknowledgment:** The receiving RS must click "Acknowledge" to clear the Handoff badge. This sets `handoff.acknowledgedAt` and confirms they have read the context note. Unacknowledged handoffs older than 4 hours trigger a reminder notification.

---

## 5. Components & UI

### 5.1 Manager Views

#### AssignmentGroupEditor.tsx

Form to create or edit an Assignment Group. Fields correspond 1:1 with `FilterCriteria` properties.

**Key behaviors:**
- Country field uses `country-combobox.tsx` (existing) with multi-select, populated from `COUNTRIES` and `EU_COUNTRIES`/`EEAA_COUNTRIES`/`REST_OF_WORLD_COUNTRIES` in `caseConstants.ts`
- Request type field populated from `REQUEST_TYPES` in `caseConstants.ts`
- Service field populated from keys of `MICROSOFT_SERVICES_CONFIG` in `caseConstants.ts`
- Crime type field populated from `NATURE_OF_CRIMES` in `caseConstants.ts`
- **Live preview panel** shows count of currently matching cases, updated on every criteria change (debounced 300ms)
- Preview includes a collapsible list of the first 10 matching case IDs with priority badges
- Name uniqueness validation (no two active groups with the same name)
- Save button creates/updates the AssignmentGroup record

#### QualificationManager.tsx

Matrix table for managing qualifications across the team.

**Layout:** Rows = Assignment Groups, Columns = RS users. Each cell shows a proficiency badge (color-coded: red=none, yellow=Trainee, blue=Competent, green=Expert). Click a cell to open a dialog for granting, updating, or revoking a qualification.

**Key behaviors:**
- Filter rows by group status (active/archived)
- Filter columns by team (GMT/US)
- Bulk actions: "Grant [proficiency] to all selected RS for this group"
- Emergency grant button (available only in Surge/Crisis operating mode) with auto-expiry configuration
- Sort columns by number of qualifications, name, or team

#### CoverageMatrix.tsx

Read-only summary view answering: "For each group, do I have enough qualified people?"

**Columns per row:**
- Assignment Group name
- Expert count
- Competent count
- Trainee count
- Total qualified RS
- Need (projected RS required, calculated from current inflow rate / avg throughput)
- Gap status: "OK" (total >= need), "Watch" (total within 1 of need), "Gap" (total < need)

**Color coding:** Gap rows highlighted red, Watch rows highlighted amber.

#### RSCapabilityProfile.tsx

Per-RS detail view showing all qualifications, performance metrics, and current load.

**Sections:**
1. Header: RS name, team, manager, status
2. Qualifications table: Group name, proficiency level, throughput rate, qualified since, expires
3. This week summary: Focus Profile groups (in priority order), active case count, staged count, completed this week, caseload cap, avg completion time, available hours

#### FocusProfileBuilder.tsx

The primary manager tool for weekly assignment.

**Workflow:**
1. Select an RS from a dropdown or team roster
2. Left panel: available Assignment Groups (filtered to groups the RS is qualified for)
3. Right panel: assigned groups in priority order, with drag-and-drop reordering
4. Each group shows its current matching case count as a badge
5. Save / Publish button
6. On publish: RS receives notification, `FocusProfileChangeLog` entry created, `PROFILE_PUBLISHED` event emitted

**Validation on publish:**
- At least one group must be assigned
- All groups must have active qualifications for the selected RS
- Warn if any group has 0 matching cases (but allow save)

#### BulkProfileActions.tsx

Toolbar component for batch operations.

**Actions:**
- **Clone last week:** Copy previous week's profile for the selected RS(es) into the current week
- **Apply template:** Select a Focus Profile template (or another RS's profile) and apply it to multiple RS at once
- **Swap group:** Replace one Assignment Group with another across all selected profiles (e.g., "Replace Brazil with India for everyone")

### 5.2 RS Views

#### FocusQueueView.tsx

The RS landing page. Replaces the default case list view when an RS has an active Focus Profile.

**Layout:**

```
+------------------------------------------------------------------+
|  MY FOCUS THIS WEEK                           4/6 cases [======  ]|
|  Profile set by Shane on Mon 3/23              Browse All Cases   |
+------------------------------------------------------------------+
|                                                                    |
|  MY ACTIVE CASES (3)                                    [View All] |
|  +--------+-------+-----------+----------+--------+-----------+   |
|  | Case # | Flag  | Type      | Due      | Status | Actions   |   |
|  +--------+-------+-----------+----------+--------+-----------+   |
|  | LNS-142| US Fed| Search W. | Mar 28   | Active | [Release] |   |
|  | LNS-138| CA Pro| Emerg Dis.| Mar 27   | Active | [Handoff] |   |
|  | LNS-095| US St | Subpoena  | Mar 30   | Staged | [Start]   |   |
|  +--------+-------+-----------+----------+--------+-----------+   |
|                                                                    |
|  AVAILABLE TO PICK                                                 |
|                                                                    |
|  (1) Azure (non-US, non-preservation) -- 12 cases                 |
|  +--------+-------+-----------+----------+------+------+------+   |
|  | Case # | Ctry  | Type      | Age      | IDs  | CHI  | Pick |   |
|  +--------+-------+-----------+----------+------+------+------+   |
|  | LNS-201| UK    | Court Ord | 3 days   | 5    | CHI-2| [Pick]|  |
|  | LNS-187| DE    | Search W. | 7 days   | 2    | CHI-3| [Pick]|  |
|  | LNS-165| FR    | Subpoena  | 12 days  | 8    | CHI-4| [Pick]|  |
|  | ...    |       |           |          |      |      |       |   |
|  +--------+-------+-----------+----------+------+------+------+   |
|                                                                    |
|  (2) US Federal -- 47 cases                                        |
|  +--------+-------+-----------+----------+------+------+------+   |
|  | LNS-219| US Fed| Search W. | 2 days   | 3    | CHI-1| [Pick]|  |
|  | ...    |       |           |          |      |      |       |   |
|  +--------+-------+-----------+----------+------+------+------+   |
|                                                                    |
|  (3) Oldest in US JTQ -- 203 cases                                 |
|  +--------+-------+-----------+----------+------+------+------+   |
|  | LNS-044| US St | Subpoena  | 45 days  | 1    | CHI-5| [Pick]|  |
|  | ...    |       |           |          |      |      |       |   |
|  +--------+-------+-----------+----------+------+------+------+   |
+------------------------------------------------------------------+
```

**Key behaviors:**
- Header shows caseload indicator (current/cap), profile source, and "Browse All Cases" escape hatch
- "My Active Cases" sorted by due date (soonest first), showing Staged cases with a visual indicator
- "Available to Pick" sections grouped by Assignment Group in Focus Profile priority order
- Each group section is collapsible, shows case count badge
- Cases within each group sorted by CHI (most severe first), then due date
- Checkbox multi-select for batch picking
- If no Focus Profile is assigned: show "My Active Cases" normally, and a prompt in the Available section -- "No focus set for this week. Browse all cases or contact your manager."
- Pagination: first 20 cases per group, "Show more" to load additional

#### CasePickButton.tsx

Contextual action button rendered per case row in the Available to Pick section.

**States:**
- Default: "Pick" button (blue) -- assigns case as Active
- Alt-click or dropdown: "Stage" option -- claims case at 0.5x weight
- Disabled with tooltip: "Caseload cap reached (6/6)" when at capacity
- Disabled with tooltip: "Case no longer available" if picked by another RS (optimistic lock failure)
- Loading state during pick operation

#### HandoffDialog.tsx

Modal dialog for transferring a case to another RS or releasing to the case pool.

**Fields:**
- Handoff type: Planned / Urgent / Voluntary (radio group)
- To RS: searchable dropdown of qualified RS (or "Release to case pool" option)
- Context note: required textarea -- "What's done, what's pending, any blockers"
- Partial work reference: optional file/note attachment links
- Submit / Cancel

**Validation:**
- Context note must be non-empty
- If To RS is selected, verify qualification and caseload cap; show warning if receiving RS is near cap

### 5.3 Shared Components

#### AssignmentGroupBadge.tsx

Colored badge displaying an Assignment Group name. Color derived deterministically from group name hash (consistent across views). Used in Focus Profile builder, case list headers, case cards, and Coverage Matrix.

```typescript
interface AssignmentGroupBadgeProps {
  group: AssignmentGroup;
  size?: "sm" | "md";          // sm for inline, md for headers
  showCaseCount?: boolean;     // append "(12 cases)" when true
}
```

#### CaseloadIndicator.tsx

Progress bar showing current caseload vs. cap.

```typescript
interface CaseloadIndicatorProps {
  current: number;             // active (1x) + staged (0.5x) weighted count
  max: number;                 // from getMaxConcurrent()
  showLabel?: boolean;         // "4/6 cases"
}
```

**Color logic:**
- `current / max < 0.7` -- green
- `current / max < 0.9` -- amber
- `current / max >= 0.9` -- red

---

## 6. Files to Create

| File path | Responsibility |
|-----------|---------------|
| `src/types/workforceTypes.ts` | All Phase 4 TypeScript interfaces: AssignmentGroup, FilterCriteria, Qualification, WeeklyFocusProfile, FocusProfileEntry, CaseHandoff, CasePickState, FocusProfileChangeLog, GroupedAvailableCases, PickResult |
| `src/contexts/WorkforceContext.tsx` | React context provider combining assignment group state, qualification state, and focus profile state (see Section 9) |
| `src/hooks/useAssignmentGroups.ts` | CRUD operations for AssignmentGroup: create, update, archive, list active, get by ID |
| `src/hooks/useQualifications.ts` | Qualification operations: grant, revoke, update proficiency, list by group, list by user, check active |
| `src/hooks/useFocusProfile.ts` | Focus Profile operations: create, update entries, publish, clone, get active for user+week |
| `src/hooks/useCasePick.ts` | Pick/Release/Stage actions with optimistic locking, caseload cap checking, and event emission |
| `src/hooks/useHandoff.ts` | Handoff initiation, acknowledgment, and notification |
| `src/logic/matchesCriteria.ts` | Pure function: `matchesCriteria(case, criteria)` -- the core case-to-group matching engine |
| `src/logic/focusProfileFilter.ts` | Pure function: `getAvailableCases(profile, entries, allCases, pickedCaseIds, groups)` with overlap dedup |
| `src/logic/caseloadCap.ts` | Pure function: `getMaxConcurrent(qualification, operatingMode, complexityFactor)` |
| `src/logic/regionMapping.ts` | Maps country names to region groups (EEA, GNI, etc.) using `JURISDICTIONS` from `caseConstants.ts` |
| `src/components/workforce/AssignmentGroupEditor.tsx` | Manager form: create/edit group with FilterCriteria fields and live case count preview |
| `src/components/workforce/QualificationManager.tsx` | Manager matrix: groups x RS, proficiency badges, grant/revoke dialogs |
| `src/components/workforce/CoverageMatrix.tsx` | Manager read-only: per-group qualified RS counts vs. projected need |
| `src/components/workforce/RSCapabilityProfile.tsx` | Manager detail: per-RS qualifications, performance, load |
| `src/components/workforce/FocusProfileBuilder.tsx` | Manager tool: drag-drop group assignment per RS per week |
| `src/components/workforce/BulkProfileActions.tsx` | Manager toolbar: clone, template, swap operations |
| `src/components/workforce/FocusQueueView.tsx` | RS landing page: "My Active Cases" + "Available to Pick" grouped by profile |
| `src/components/workforce/CasePickButton.tsx` | RS action: pick/stage with cap indicator and optimistic lock handling |
| `src/components/workforce/HandoffDialog.tsx` | RS/Manager dialog: structured case transfer with context note |
| `src/components/workforce/AssignmentGroupBadge.tsx` | Shared: colored group name badge |
| `src/components/workforce/CaseloadIndicator.tsx` | Shared: current/cap progress bar |
| `src/constants/workforceConstants.ts` | Defaults: DEFAULT_MAX_CONCURRENT, mode multipliers, auto-release timeout, proficiency levels, colors |
| `src/mocks/workforceMockData.ts` | Mock data for all Phase 4 types (see Section 8) |

---

## 7. Files to Modify

| File path | Changes |
|-----------|---------|
| `src/components/CaseQueue.tsx` | Add a `viewMode` state: `"standard" \| "focus"`. When RS has an active Focus Profile, render `<FocusQueueView />` instead of the standard card list. Add a toggle button: "Switch to Focus View" / "Browse All Cases". Import `FocusQueueView` from `./workforce/FocusQueueView`. Pass existing `cases`, `searchTerm`, `sortBy` state into both views. |
| `src/components/case-queue/case-queue-types.ts` | Add `pickState?: CasePickState` and `assignmentGroupIds?: string[]` fields to the `CaseQueueItem` interface. Add `hasFinancialPenalty?: boolean` and `queue?: string` fields required by FilterCriteria matching. |
| `src/constants/caseConstants.ts` | Add `QUEUES` constant (named queue list: "US JT Fulfillment", "GMT Fulfillment", "Preservation", etc.) for the `queue` field in FilterCriteria. Add `REGION_GROUPS` mapping region names to country arrays for FilterCriteria region matching. |
| `src/types/caseTypes.ts` | Add `CasePickState` to the existing type exports if shared types live here. |
| `src/main.tsx` | Wrap relevant routes/components with `<WorkforceProvider>` context. Add routing for manager workforce views (AssignmentGroupEditor, QualificationManager, CoverageMatrix, FocusProfileBuilder). |

---

## 8. Mock Data

### 8.1 Assignment Groups

```typescript
export const MOCK_ASSIGNMENT_GROUPS: AssignmentGroup[] = [
  {
    id: "ag-001",
    name: "US Federal",
    description: "All US Federal jurisdiction cases -- court orders, search warrants, grand jury subpoenas",
    criteria: {
      country: ["United States"],
      jurisdiction: ["Federal"],
    },
    isActive: true,
    createdBy: "user-shane",
    createdAt: new Date("2026-01-06"),
    updatedAt: new Date("2026-03-10"),
  },
  {
    id: "ag-002",
    name: "Azure (non-US, non-preservation)",
    description: "Azure service requests from outside the US, excluding preservation-only requests",
    criteria: {
      countryExclude: ["United States"],
      service: ["Azure"],
      requestTypeExclude: ["Preservation"],
    },
    isActive: true,
    createdBy: "user-shane",
    createdAt: new Date("2026-01-06"),
    updatedAt: new Date("2026-02-18"),
  },
  {
    id: "ag-003",
    name: "EEA Older Than 10 Days",
    description: "EEA-origin cases sitting in the case list for more than 10 days -- backlog clearance focus",
    criteria: {
      region: ["EEA"],
      minDaysInQueue: 10,
    },
    isActive: true,
    createdBy: "user-jessalyn",
    createdAt: new Date("2026-02-03"),
    updatedAt: new Date("2026-03-17"),
  },
  {
    id: "ag-004",
    name: "Brazil Financial Penalty",
    description: "Brazilian cases with financial penalty risk -- prioritize to avoid fines",
    criteria: {
      country: ["Brazil"],
      hasFinancialPenalty: true,
    },
    isActive: true,
    createdBy: "user-jessalyn",
    createdAt: new Date("2026-02-10"),
    updatedAt: new Date("2026-02-10"),
  },
];
```

### 8.2 RS Users with Qualifications

```typescript
export const MOCK_QUALIFICATIONS: Qualification[] = [
  // Dale Ayers -- Azure expert, US Federal competent
  {
    id: "q-001",
    assignmentGroupId: "ag-002",  // Azure non-US
    userId: "user-dale",
    grantedBy: "user-shane",
    grantedAt: new Date("2024-06-15"),
    proficiency: "Expert",
    trainingCompletedAt: new Date("2024-06-10"),
    isEmergencyGrant: false,
    avgThroughputPerDay: 3.1,
    avgTimeToComplete: 4.2,
    maxConcurrentCases: 5,
    qualityScore: 0.94,
  },
  {
    id: "q-002",
    assignmentGroupId: "ag-001",  // US Federal
    userId: "user-dale",
    grantedBy: "user-shane",
    grantedAt: new Date("2023-11-01"),
    proficiency: "Competent",
    trainingCompletedAt: new Date("2023-10-28"),
    isEmergencyGrant: false,
    avgThroughputPerDay: 5.2,
    avgTimeToComplete: 2.8,
    maxConcurrentCases: 8,
    qualityScore: 0.91,
  },
  {
    id: "q-003",
    assignmentGroupId: "ag-003",  // EEA Older Than 10 Days
    userId: "user-dale",
    grantedBy: "user-shane",
    grantedAt: new Date("2025-09-01"),
    proficiency: "Competent",
    trainingCompletedAt: new Date("2025-08-28"),
    isEmergencyGrant: false,
    avgThroughputPerDay: 4.5,
    avgTimeToComplete: 3.0,
    maxConcurrentCases: 6,
    qualityScore: 0.88,
  },
  // David Large -- US Federal expert, Brazil competent
  {
    id: "q-004",
    assignmentGroupId: "ag-001",  // US Federal
    userId: "user-david",
    grantedBy: "user-shane",
    grantedAt: new Date("2023-06-01"),
    proficiency: "Expert",
    trainingCompletedAt: new Date("2023-05-20"),
    isEmergencyGrant: false,
    avgThroughputPerDay: 4.8,
    avgTimeToComplete: 3.1,
    maxConcurrentCases: 6,
    qualityScore: 0.96,
  },
  {
    id: "q-005",
    assignmentGroupId: "ag-004",  // Brazil Financial Penalty
    userId: "user-david",
    grantedBy: "user-jessalyn",
    grantedAt: new Date("2025-11-15"),
    proficiency: "Competent",
    trainingCompletedAt: new Date("2025-11-10"),
    isEmergencyGrant: false,
    avgThroughputPerDay: 3.0,
    avgTimeToComplete: 5.5,
    maxConcurrentCases: 4,
    qualityScore: 0.89,
  },
  // Sarah Johnson -- EEA competent, US Federal trainee
  {
    id: "q-006",
    assignmentGroupId: "ag-003",  // EEA Older Than 10 Days
    userId: "user-sarah",
    grantedBy: "user-jessalyn",
    grantedAt: new Date("2025-08-01"),
    proficiency: "Expert",
    trainingCompletedAt: new Date("2025-07-25"),
    isEmergencyGrant: false,
    avgThroughputPerDay: 5.0,
    avgTimeToComplete: 2.5,
    maxConcurrentCases: 7,
    qualityScore: 0.93,
  },
  {
    id: "q-007",
    assignmentGroupId: "ag-001",  // US Federal
    userId: "user-sarah",
    grantedBy: "user-jessalyn",
    grantedAt: new Date("2026-02-01"),
    proficiency: "Trainee",
    trainingCompletedAt: new Date("2026-01-28"),
    isEmergencyGrant: false,
    avgThroughputPerDay: 2.1,
    avgTimeToComplete: 5.8,
    maxConcurrentCases: 3,
    qualityScore: 0.78,
  },
];
```

### 8.3 Focus Profiles

```typescript
export const MOCK_FOCUS_PROFILES: WeeklyFocusProfile[] = [
  {
    id: "fp-001",
    userId: "user-dale",
    weekStart: new Date("2026-03-23"),   // Current week
    createdBy: "user-shane",
    createdAt: new Date("2026-03-23T09:00:00Z"),
    updatedAt: new Date("2026-03-23T09:00:00Z"),
    isActive: true,
  },
  {
    id: "fp-002",
    userId: "user-david",
    weekStart: new Date("2026-03-23"),
    createdBy: "user-shane",
    createdAt: new Date("2026-03-23T09:15:00Z"),
    updatedAt: new Date("2026-03-24T14:30:00Z"),  // Mid-week adjustment
    isActive: true,
  },
];

export const MOCK_FOCUS_PROFILE_ENTRIES: FocusProfileEntry[] = [
  // Dale: Azure non-US (priority 1) -> US Federal (priority 2) -> EEA backlog (priority 3)
  { id: "fpe-001", profileId: "fp-001", assignmentGroupId: "ag-002", priorityOrder: 1 },
  { id: "fpe-002", profileId: "fp-001", assignmentGroupId: "ag-001", priorityOrder: 2 },
  { id: "fpe-003", profileId: "fp-001", assignmentGroupId: "ag-003", priorityOrder: 3 },
  // David: US Federal (priority 1) -> Brazil Financial Penalty (priority 2)
  { id: "fpe-004", profileId: "fp-002", assignmentGroupId: "ag-001", priorityOrder: 1 },
  { id: "fpe-005", profileId: "fp-002", assignmentGroupId: "ag-004", priorityOrder: 2 },
];
```

### 8.4 Case-to-Group Matching Results

Sample matching using `MOCK_CASES` from `case-queue-types.ts` against the four mock groups:

| Case ID | Country | Request Type | Services | AG: US Federal | AG: Azure non-US | AG: EEA >10d | AG: Brazil Fin. |
|---|---|---|---|---|---|---|---|
| LNS-2025-00142 | United States | Emergency Request | Outlook, Teams, Azure | Yes (US + Federal) | No (US excluded) | No | No |
| LNS-2025-00138 | Canada | Emergency Disclosure | Outlook, OneDrive | No (not US) | No (no Azure) | No | No |
| LNS-2025-00125 | United Kingdom | Preservation Request | Outlook | No | No (preservation excluded) | No (UK not EEA) | No |
| LNS-2025-00119 | Germany | Emergency Request | Outlook, Teams, Azure, OneDrive | No | Yes (non-US + Azure + not preservation) | Yes (if >10d old) | No |
| LNS-2025-00103 | Australia | Search Warrant | Outlook, Teams | No | No | No | No |
| LNS-2025-00095 | United States | Subpoena | Outlook, Teams, Azure | No (State jurisdiction) | No (US excluded) | No | No |

---

## 9. State Management

### WorkforceContext

A single React context provider that manages all Phase 4 state. Internally, it can be split into sub-reducers for cleanliness, but components consume a unified context.

```typescript
interface WorkforceState {
  // Assignment Groups
  assignmentGroups: AssignmentGroup[];
  assignmentGroupsLoading: boolean;

  // Qualifications
  qualifications: Qualification[];
  qualificationsLoading: boolean;

  // Focus Profiles
  focusProfiles: WeeklyFocusProfile[];
  focusProfileEntries: FocusProfileEntry[];
  activeProfileForCurrentUser: WeeklyFocusProfile | null;

  // Case pick state
  casePickStates: Map<string, CasePickState>;  // caseId -> state
  caseAssignments: Map<string, string>;         // caseId -> userId

  // Handoffs
  pendingHandoffs: CaseHandoff[];               // Unacknowledged handoffs for current user

  // Operating mode (from Phase 2, consumed here)
  operatingMode: "Normal" | "Elevated" | "Surge" | "Crisis";
}

interface WorkforceActions {
  // Assignment Groups
  createGroup: (group: Omit<AssignmentGroup, "id" | "createdAt" | "updatedAt">) => void;
  updateGroup: (id: string, updates: Partial<AssignmentGroup>) => void;
  archiveGroup: (id: string) => void;

  // Qualifications
  grantQualification: (qual: Omit<Qualification, "id" | "grantedAt">) => void;
  revokeQualification: (id: string, reason: string) => void;
  updateProficiency: (id: string, proficiency: Qualification["proficiency"]) => void;

  // Focus Profiles
  createProfile: (profile: Omit<WeeklyFocusProfile, "id" | "createdAt" | "updatedAt">) => void;
  addGroupToProfile: (profileId: string, groupId: string, priorityOrder: number) => void;
  removeGroupFromProfile: (profileId: string, groupId: string) => void;
  reorderProfileEntries: (profileId: string, orderedGroupIds: string[]) => void;
  publishProfile: (profileId: string) => void;
  cloneLastWeek: (userId: string) => void;

  // Case actions
  pickCase: (caseId: string, pickType: "Stage" | "Active") => PickResult;
  releaseCase: (caseId: string, reason: string) => void;
  initiateHandoff: (handoff: Omit<CaseHandoff, "id" | "createdAt" | "acknowledgedAt">) => CaseHandoff;
  acknowledgeHandoff: (handoffId: string) => void;
}
```

**Provider placement:** `<WorkforceProvider>` wraps the application at the same level as other context providers in `main.tsx`. It subscribes to Phase 1 event bus for ASSIGNMENT_CHANGE events from external sources and Phase 2 operating mode changes.

**Persistence:** In the prototype phase, state is held in-memory with mock data initialization. The context API is designed so that swapping to real API calls requires changing only the hook implementations, not the component code.

---

## 10. Edge Cases

### 10.1 Qualification Expires Mid-Week

**Scenario:** RS has an active Focus Profile with Group A. On Wednesday, their certification for Group A expires.

**Behavior:**
- Cases already picked (Active/Staged) from Group A remain assigned. The RS can finish them.
- Group A disappears from the "Available to Pick" section immediately.
- Manager receives an alert: "[RS name]'s qualification for [Group A] expired. 2 active cases remain assigned."
- Manager can extend the certification, grant an emergency qualification, or reassign cases via handoff.

### 10.2 RS Picks Case Then Gets Reassigned

**Scenario:** RS picks case LNS-142. Manager then edits the RS's Focus Profile, removing the group that LNS-142 belongs to.

**Behavior:**
- LNS-142 remains in the RS's "My Active Cases." Focus Profile changes only affect the "Available to Pick" section.
- The RS can continue working, release, or hand off the case.
- A subtle info banner appears: "Your focus profile was updated by [Manager]. 1 active case is outside your current focus groups."

### 10.3 Two RS Try to Pick Same Case (Optimistic Locking)

**Scenario:** RS-A and RS-B both see case LNS-201 as Available. RS-A clicks Pick, then RS-B clicks Pick 2 seconds later.

**Behavior:**
- RS-A's pick succeeds: case transitions to Active, assigned to RS-A.
- RS-B's pick fails: `pickCase()` checks `case.pickState` and finds it is no longer `Available`. Returns `{ success: false, reason: "ALREADY_PICKED" }`.
- RS-B sees a toast notification: "Case LNS-201 was just picked by another specialist."
- RS-B's case list refreshes automatically to remove the case from their available list.

**Implementation:** Use a version counter or timestamp on the case pick state. The pick operation includes a compare-and-swap: `UPDATE case SET pickState = 'Active', version = version + 1 WHERE id = ? AND version = ? AND pickState = 'Available'`. If affected rows = 0, the pick failed.

### 10.4 Profile Published with 0 Matching Cases

**Scenario:** Manager publishes a Focus Profile for RS where every assigned group currently has 0 matching cases.

**Behavior:**
- Allow the publish (groups may get cases later in the week as new requests arrive).
- Show a warning dialog before publish: "Warning: None of the assigned groups currently have available cases. The RS will see an empty Available to Pick section."
- RS sees: "My Active Cases" (if any) + "Available to Pick" with each group showing "(0 cases)" -- not an error state.
- As new cases arrive and match the criteria, they appear automatically (polling or real-time update).

### 10.5 Staged Case Auto-Release

**Scenario:** RS stages a case at 3:00 PM Monday. At 3:00 PM Tuesday (24 hours later), the case is still Staged.

**Behavior:**
- System auto-releases: `releaseCase(userId, caseId, "AUTO_RELEASE")`.
- RS receives notification: "Case LNS-201 was auto-released after 24 hours in Staged status."
- Case returns to Available in the shared case pool.
- RS's caseload count decreases by 0.5.

### 10.6 Emergency Qualification During Crisis Mode

**Scenario:** System enters Crisis mode for the Azure group. Manager grants emergency qualification to 3 RS who are not Azure-trained.

**Behavior:**
- Qualifications created with `isEmergencyGrant: true` and `emergencyExpiresAt` set to crisis resolution time or 14 days (whichever is first).
- Cases worked under emergency qualification are automatically flagged for QA review.
- When crisis de-escalates, emergency qualifications auto-revoke. Active cases assigned under emergency grant remain with the RS but are flagged for handoff review.

### 10.7 Handoff to RS at Caseload Cap

**Scenario:** Manager tries to hand off a case to an RS who is already at their caseload cap.

**Behavior:**
- HandoffDialog shows a warning: "[RS name] is at caseload capacity (6/6). Proceeding will exceed their cap."
- Manager can override (the handoff is a manager action, not subject to the same self-service cap).
- If RS initiates a voluntary handoff to a peer at cap, the system blocks it: "Cannot transfer -- [RS name] is at capacity."

### 10.8 Group Criteria Change Affecting Active Picks

**Scenario:** Manager edits Assignment Group criteria. Cases previously matching no longer match.

**Behavior:**
- Already-picked cases are unaffected (assignment is independent of group criteria).
- The "Available to Pick" section re-evaluates on next refresh and removes non-matching cases.
- If a case was Staged and no longer matches any of the RS's groups, it remains Staged (the RS claimed it) -- but a subtle indicator shows "This case no longer matches your focus groups."

---

## 11. Acceptance Criteria

### Manager: Assignment Group Management

1. **AC-01:** Manager can create a new Assignment Group by specifying a name, description, and at least one FilterCriteria field. The live preview panel shows the count of currently matching cases, updating within 500ms of any criteria change.

2. **AC-02:** Manager can edit an existing Assignment Group's criteria. Changes take effect immediately for all Focus Profiles referencing this group (Available to Pick sections update on next refresh).

3. **AC-03:** Manager can archive (soft-delete) an Assignment Group. Archived groups are removed from all active Focus Profiles and no longer appear in the group selection UI. A confirmation dialog warns how many profiles are affected.

4. **AC-04:** Assignment Group names must be unique among active groups. Attempting to save a duplicate name shows a validation error.

### Manager: Qualification Management

5. **AC-05:** Manager can grant a qualification to an RS for a specific Assignment Group, selecting a proficiency level (Trainee / Competent / Expert). The qualification appears immediately in the Coverage Matrix and RS Capability Profile.

6. **AC-06:** Manager can revoke a qualification with a required reason. Revoked qualifications are removed from active status. If the RS has an active Focus Profile with the revoked group, a warning shows the affected profile.

7. **AC-07:** Coverage Matrix displays accurate Expert / Competent / Trainee / Total counts per group, with "Need" calculated from current inflow rate divided by average throughput. Gap status (OK / Watch / Gap) is color-coded.

8. **AC-08:** During Surge or Crisis operating mode, manager can grant emergency qualifications with an auto-expiry date. Emergency qualifications are visually distinct (dashed border or icon) in all views.

### Manager: Focus Profile Building

9. **AC-09:** Manager can build a Weekly Focus Profile for an RS by adding qualified Assignment Groups and arranging them in priority order via drag-and-drop. Only groups the RS is qualified for appear in the available list.

10. **AC-10:** Manager can publish a Focus Profile. On publish, the RS receives a notification and their case view updates to reflect the new profile. A FocusProfileChangeLog entry is created.

11. **AC-11:** Manager can clone last week's profiles for one or multiple RS into the current week with a single action. Cloned profiles can be edited before publishing.

12. **AC-12:** Manager can edit an RS's Focus Profile mid-week (add/remove groups, reorder). Active cases already picked by the RS are unaffected; only the "Available to Pick" list changes.

### RS: Focus Case View & Case Actions

13. **AC-13:** When an RS with an active Focus Profile opens the case list, they see the FocusQueueView with "My Active Cases" (sorted by due date) and "Available to Pick" (grouped by Assignment Group in profile priority order, cases sorted by CHI then due date).

14. **AC-14:** RS can pick a case from the Available section. The case moves to "My Active Cases," is no longer visible to other RS, and the caseload indicator updates. If at caseload cap, the Pick button is disabled with an explanatory tooltip.

15. **AC-15:** RS can stage a case (soft claim at 0.5x caseload weight). Staged cases auto-release after 24 hours if not promoted to Active. The RS receives a notification 1 hour before auto-release.

16. **AC-16:** RS can release a case from "My Active Cases." The case returns to Available state and becomes visible to all qualified RS immediately.

17. **AC-17:** If a case matches multiple groups in the RS's Focus Profile, it appears under the highest-priority group only (no duplicates across sections).

18. **AC-18:** RS can initiate a handoff via the HandoffDialog. Context note is required. The receiving RS sees the case in their "My Active Cases" with a Handoff badge until they acknowledge.

19. **AC-19:** When two RS attempt to pick the same case simultaneously, only the first succeeds. The second sees an error toast and the case is removed from their available list without requiring a full page refresh.

### RS: No Profile / Escape Hatch

20. **AC-20:** If no Focus Profile is assigned for the current week, the RS sees "My Active Cases" normally and a prompt in the Available section directing them to browse all cases or contact their manager.

21. **AC-21:** RS can click "Browse All Cases" to switch to the standard (unfiltered) CaseQueue view at any time. Their Focus Profile remains unchanged.

---

## 12. Cross-References

| Document | Sections consumed | What Phase 4 uses from it |
|---|---|---|
| `Weekly_Focus_Profile_Spec.md` | Sections 2-5 | Section 2: Assignment Group concept, examples, filter criteria fields. Section 3: Qualification dimensions, Coverage Matrix design, RS Capability Profile wireframe. Section 4: Manager workflow -- review health, manage groups, build profiles, mid-week adjustments. Section 5: RS workflow -- landing page wireframe, pick/release/stage flows, no-profile behavior. |
| `DARS_Case_Health_Management.md` | Section 9 (Qualification Management) | Section 9.1: Qualification record schema (field-level reference for Qualification interface). Section 9.2: Coverage Matrix layout (Expert/Competent/Trainee/Total/Need/Status columns). Section 9.3: RS Capability Profile wireframe (qualifications table + weekly summary). Section 9.4: Cross-training recommendations (informs CoverageMatrix gap alerts). |
| `DARS_Case_Health_Management.md` | Section 11.2 (Handoff Protocol) | Handoff data structure (from_rs, to_rs, type, context_note, partial_work, acknowledged). Notification and acknowledgment flow. Used directly as the basis for CaseHandoff interface and HandoffDialog component. |
| `DARS_Case_Health_Management.md` | Section 7 (Operating Modes) | Mode multipliers consumed by `getMaxConcurrent()`: Normal=1.0, Elevated=1.0, Surge=1.25, Crisis=1.5. Emergency qualification grant behavior during Crisis mode. |
| `DARS_Case_Health_Management.md` | Section 12.4 (Case Handoff data model) | Backend schema reference for CaseHandoff: field names, types, nullability. Phase 4 translates this to the TypeScript interface in Section 3.6. |
| `src/components/case-queue/case-queue-types.ts` | CaseQueueItem interface | The fields that FilterCriteria matches against: country, jurisdiction, requestType, natureOfCrime, casePriority, servicesRequested, createDate, isThreatToLife, hasEnterpriseAccounts, hasAzureAccounts. Phase 4 adds pickState and assignmentGroupIds to this interface. |
| `src/constants/caseConstants.ts` | Country lists, REQUEST_TYPES, NATURE_OF_CRIMES, MICROSOFT_SERVICES_CONFIG | Populate FilterCriteria form dropdowns in AssignmentGroupEditor. Region mapping (EU_COUNTRIES, EEAA_COUNTRIES, GNI_COUNTRIES) used by regionMapping.ts for region-based criteria. |
