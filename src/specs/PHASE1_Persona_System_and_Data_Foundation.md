# Phase 1: Persona System & Data Foundation

**DARS Case Operations & Workforce Intelligence Roadmap — Phase 1**

| Field            | Value                                      |
| ---------------- | ------------------------------------------ |
| Phase            | 1 of N                                     |
| Status           | Draft                                      |
| Author           | Engineering                                |
| Created          | 2026-03-26                                 |
| Target milestone | Phase 1 — Foundation                       |
| Depends on       | Nothing (this is the foundation layer)     |

---

## 1. Overview

### What This Phase Delivers

Phase 1 establishes the foundational infrastructure that every subsequent phase of the DARS Case Operations & Workforce Intelligence Roadmap depends on. It introduces:

1. **Extensible persona system** — Three role-based personas (Triage Specialist, Response Specialist, Manager) that control what a user sees and can do within the case list and case forms.
2. **Triage completion tracking** — A discrete timestamp and user attribution when triage completes, enabling downstream workflows to know *when* and *by whom* a case was triaged.
3. **Case data model enrichment** — New fields for CHI (Data Sensitivity Index), complexity scoring, dates/deadlines, financial penalties, blockers, agency, and services. These fields power health management, SLA tracking, and workload intelligence in later phases.
4. **Case audit log foundation** — An append-only audit trail that records every meaningful action on a case, providing chain-of-custody and the raw data for future compliance dashboards.
5. **Event bus pattern foundation** — A lightweight pub/sub system for case lifecycle events, decoupling producers (workflow actions) from consumers (UI updates, audit logging, notifications).
6. **Persona-aware case view** — Filter chips, persona-specific action buttons, triage completion badges, and persona-labeled case view headers.

### Who It Serves

| Persona              | Primary value                                                                 |
| -------------------- | ----------------------------------------------------------------------------- |
| Triage Specialist    | Sees only cases awaiting triage; can complete triage with one click            |
| Response Specialist  | Sees triaged cases ready for fulfillment; knows who triaged and when           |
| Manager              | Sees all cases; understands case distribution at a glance                      |

### Problem It Solves

Today the DARS case list is a flat list with no role awareness. Every user sees every case in every stage, with no indication of which cases need their attention. There is no triage handoff signal, no audit trail, and no extensibility point for future features like SLA tracking or workload balancing. Phase 1 fixes all of this by laying a typed, event-driven, persona-aware foundation.

---

## 2. Prerequisites

**None.** This is the foundation phase. All subsequent phases depend on the artifacts produced here.

Phase 1 assumes the existing codebase has:
- React 18+ with TypeScript
- An `AppHeader` component
- A `CaseQueue` component with `CaseQueueItem` type
- A `DataEntryForm` component with `useCaseWorkflow` hook
- A `mockCaseDataFactory` utility
- Existing `caseTypes.ts` and `case-queue-types.ts` type files

---

## 3. Data Model

All types below are **exact TypeScript** that must appear in the codebase. Engineers should copy these verbatim and adjust imports.

### 3.1 Persona Types (`src/constants/personaConfig.ts`)

```typescript
// ---------------------------------------------------------------------------
// Persona ID — union type, not an enum, for simpler JSON serialization
// ---------------------------------------------------------------------------
export type PersonaId =
  | "triage_specialist"
  | "response_specialist"
  | "manager";

// ---------------------------------------------------------------------------
// Capability flags — each boolean gates a specific UI affordance or action
// ---------------------------------------------------------------------------
export interface PersonaCapability {
  /** Can click "Complete Triage" to finalize triage on a case */
  canCompleteTriage: boolean;
  /** Can click "Start Fulfillment" to begin response work */
  canStartFulfillment: boolean;
  /** Can manage the collection phase (identifiers, manual collection) */
  canManageCollection: boolean;
  /** Can see aggregate health metrics (aging, SLA, blockers) */
  canViewLensHealth: boolean;
  /** Can reassign cases between users */
  canManageAssignments: boolean;
  /** Can manage user qualifications / persona assignments */
  canManageQualifications: boolean;
}

// ---------------------------------------------------------------------------
// Persona configuration — everything the UI needs to render for a persona
// ---------------------------------------------------------------------------
export interface PersonaConfig {
  /** Machine-readable identifier */
  id: PersonaId;
  /** Human-readable name shown in the persona switcher */
  displayName: string;
  /** Short abbreviation for badges (e.g., "TS", "RS", "MGR") */
  abbreviation: string;
  /** One-sentence description of this persona's focus */
  description: string;
  /** Case stages this persona cares about — drives default case filter */
  relevantCaseStages: string[];
  /** The default filter(s) applied to the case list when this persona is active */
  defaultQueueFilter: string[];
  /** Capability flags */
  capabilities: PersonaCapability;
}

// ---------------------------------------------------------------------------
// Persona configurations
// ---------------------------------------------------------------------------
export const PERSONA_CONFIGS: Record<PersonaId, PersonaConfig> = {
  triage_specialist: {
    id: "triage_specialist",
    displayName: "Triage Specialist",
    abbreviation: "TS",
    description:
      "Reviews incoming cases, validates data, and completes triage so cases can move to fulfillment.",
    relevantCaseStages: ["Waiting on Triage"],
    defaultQueueFilter: ["Waiting on Triage"],
    capabilities: {
      canCompleteTriage: true,
      canStartFulfillment: false,
      canManageCollection: false,
      canViewLensHealth: false,
      canManageAssignments: false,
      canManageQualifications: false,
    },
  },
  response_specialist: {
    id: "response_specialist",
    displayName: "Response Specialist",
    abbreviation: "RS",
    description:
      "Handles case fulfillment — collection, review, and delivery of responsive records.",
    relevantCaseStages: ["Triage Complete", "In Review", "In Progress"],
    defaultQueueFilter: ["Triage Complete", "In Review", "In Progress"],
    capabilities: {
      canCompleteTriage: false,
      canStartFulfillment: true,
      canManageCollection: true,
      canViewLensHealth: false,
      canManageAssignments: false,
      canManageQualifications: false,
    },
  },
  manager: {
    id: "manager",
    displayName: "Manager",
    abbreviation: "MGR",
    description:
      "Oversees all cases — monitors health, manages assignments, and ensures SLA compliance.",
    relevantCaseStages: [
      "Waiting on Triage",
      "Triage Complete",
      "In Review",
      "In Progress",
      "Dormant",
      "Cancelled",
      "Completed",
    ],
    defaultQueueFilter: [], // empty = show all
    capabilities: {
      canCompleteTriage: false,
      canStartFulfillment: false,
      canManageCollection: false,
      canViewLensHealth: true,
      canManageAssignments: true,
      canManageQualifications: true,
    },
  },
};
```

### 3.2 App User (`src/constants/personaConfig.ts`, same file)

```typescript
// ---------------------------------------------------------------------------
// App User — represents a logged-in user with a persona
// ---------------------------------------------------------------------------
export interface AppUser {
  /** Unique user identifier */
  id: string;
  /** Full name shown in UI */
  displayName: string;
  /** Email address */
  email: string;
  /** The persona this user operates under */
  persona: PersonaConfig;
}

// ---------------------------------------------------------------------------
// Prototype users — used during development before real auth exists
// ---------------------------------------------------------------------------
export const PROTOTYPE_USERS: AppUser[] = [
  {
    id: "user-nicole-garcia",
    displayName: "Nicole Garcia",
    email: "nicole.garcia@example.gov",
    persona: PERSONA_CONFIGS.triage_specialist,
  },
  {
    id: "user-michael-chen",
    displayName: "Michael Chen",
    email: "michael.chen@example.gov",
    persona: PERSONA_CONFIGS.response_specialist,
  },
  {
    id: "user-shane-morrison",
    displayName: "Shane Morrison",
    email: "shane.morrison@example.gov",
    persona: PERSONA_CONFIGS.manager,
  },
];
```

### 3.3 New CaseQueueItem Fields (`src/components/case-queue/case-queue-types.ts`)

Add these fields to the existing `CaseQueueItem` interface. All are optional so existing mock data does not break.

```typescript
// --- Add to CaseQueueItem interface ---

/** Data Sensitivity Index (1 = low, 5 = critical) */
chi?: 1 | 2 | 3 | 4 | 5;

/** Numeric complexity score (0-100) derived from identifier count, services, etc. */
complexityScore?: number;

/** Human-readable complexity tier derived from complexityScore */
complexityTier?: "Low" | "Medium" | "High" | "Very High";

/** Aging state derived from days since dateEnteredQueue */
caseAgingState?: "Fresh" | "Normal" | "Aging" | "Stale" | "Critical";

/** Date the case was served on the agency */
dateServed?: string; // ISO 8601

/** Date the case was received by the team */
dateReceived?: string; // ISO 8601

/** Date the case entered the current queue */
dateEnteredQueue?: string; // ISO 8601

/** Due date for the case (statutory or internal) */
dateDue?: string; // ISO 8601

/** Type of deadline governing dateDue */
deadlineType?: "Statutory" | "Internal" | "Court-Ordered" | "None";

/** Whether a financial penalty applies if the deadline is missed */
hasFinancialPenalty?: boolean;

/** Dollar amount of the penalty (present only if hasFinancialPenalty is true) */
penaltyAmount?: number;

/** Current blockers preventing forward progress */
currentBlockers?: string[];

/** Name of the requesting agency */
agencyName?: string;

/** List of services / record types requested */
services?: string[];

/** Number of identifiers on the original request */
identifierCountOriginal?: number;

/** Number of supplemental identifiers added after initial request */
identifierCountSupplemental?: number;

/** ISO 8601 timestamp when triage was completed */
triageCompletedDate?: string;

/** Display name of the user who completed triage */
triageCompletedBy?: string;
```

### 3.4 Audit Types (`src/types/auditTypes.ts`)

```typescript
// ---------------------------------------------------------------------------
// Audit Action Enum
// ---------------------------------------------------------------------------
export enum AuditAction {
  CASE_CREATED = "CASE_CREATED",
  FIELD_CHANGED = "FIELD_CHANGED",
  STAGE_CHANGED = "STAGE_CHANGED",
  ASSIGNED = "ASSIGNED",
  UNASSIGNED = "UNASSIGNED",
  TRIAGE_COMPLETED = "TRIAGE_COMPLETED",
  CASE_VIEWED = "CASE_VIEWED",
  NOTE_ADDED = "NOTE_ADDED",
  IDENTIFIER_ADDED = "IDENTIFIER_ADDED",
  IDENTIFIER_REMOVED = "IDENTIFIER_REMOVED",
  ESCALATION_TRIGGERED = "ESCALATION_TRIGGERED",
  CANCELLATION_INITIATED = "CANCELLATION_INITIATED",
  DELIVERY_BLOCKED = "DELIVERY_BLOCKED",
}

// ---------------------------------------------------------------------------
// Audit Log Entry
// ---------------------------------------------------------------------------
export interface CaseAuditLogEntry {
  /** Unique ID for this log entry (UUID v4) */
  id: string;
  /** The case this entry belongs to */
  caseId: string;
  /** ID of the user who performed the action */
  userId: string;
  /** Display name of the user (denormalized for read performance) */
  userDisplayName: string;
  /** ISO 8601 timestamp of the action */
  timestamp: string;
  /** The action that was performed */
  action: AuditAction;
  /** Value before the change (stringified). Null for creation actions. */
  previousValue: string | null;
  /** Value after the change (stringified). Null for deletion actions. */
  newValue: string | null;
  /** Arbitrary metadata bag for action-specific context */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Case Event Type Enum
// ---------------------------------------------------------------------------
export enum CaseEventType {
  STAGE_TRANSITION = "STAGE_TRANSITION",
  FIELD_UPDATE = "FIELD_UPDATE",
  ASSIGNMENT_CHANGE = "ASSIGNMENT_CHANGE",
  TRIAGE_COMPLETE = "TRIAGE_COMPLETE",
  ESCALATION = "ESCALATION",
  CANCELLATION = "CANCELLATION",
  BLOCKER_ADDED = "BLOCKER_ADDED",
  BLOCKER_RESOLVED = "BLOCKER_RESOLVED",
}

// ---------------------------------------------------------------------------
// Case Event — payload for the event bus
// ---------------------------------------------------------------------------
export interface CaseEvent {
  /** Unique ID for this event (UUID v4) */
  id: string;
  /** The case this event pertains to */
  caseId: string;
  /** Type of event */
  eventType: CaseEventType;
  /** Event-specific payload (varies by eventType) */
  payload: Record<string, unknown>;
  /** ISO 8601 timestamp when the event was emitted */
  timestamp: string;
  /** The system or user that caused this event */
  source: string;
}
```

### 3.5 FormData Additions (`src/types/caseTypes.ts`)

Add these optional fields to the existing `FormData` interface (or equivalent top-level case type used by the form):

```typescript
// --- Add to FormData interface ---

triageCompletedDate?: string;   // ISO 8601
triageCompletedBy?: string;     // user display name
chi?: 1 | 2 | 3 | 4 | 5;
complexityScore?: number;
complexityTier?: "Low" | "Medium" | "High" | "Very High";
services?: string[];
dateServed?: string;
dateReceived?: string;
dateDue?: string;
deadlineType?: "Statutory" | "Internal" | "Court-Ordered" | "None";
hasFinancialPenalty?: boolean;
penaltyAmount?: number;
currentBlockers?: string[];

// Structured legal context — replaces flat country/jurisdiction/agency fields
legalContext?: CaseLegalContext;
```

### 3.6 Legal Context Hierarchy (`src/types/caseTypes.ts`)

The following interfaces implement the Country → Jurisdiction → Agency hierarchy. Add these to `caseTypes.ts`. They replace the flat `country: string`, `jurisdiction: string`, and `agency: string` fields on `FormData` (the legacy flat fields remain for backward compatibility during migration; new logic should consume `legalContext`).

```typescript
export type CaseRegion = "US" | "EU" | "EEA" | "APAC" | "LATAM" | "ROW";

export interface CaseCountry {
  countryCode: string;   // ISO 3166-1 alpha-2
  countryName: string;   // Human-readable name
  region: CaseRegion;    // Derived grouping for CHI scoring and routing
}

export interface CaseJurisdiction {
  country: CaseCountry;
  jurisdictionLevel: string;   // Country-specific; see JURISDICTION_LEVELS constant
  jurisdictionName?: string;   // Optional: "Southern District of New York"
}

export type AgencyType =
  | "LawEnforcement" | "IntelligenceAgency" | "RegulatoryBody"
  | "Court" | "Prosecutor" | "MilitaryLawEnforcement"
  | "InternationalBody" | "Other";

export interface Agency {
  id: string;
  name: string;
  shortName?: string;
  aliases: string[];
  country: CaseCountry;
  agencyType: AgencyType;
  jurisdiction?: CaseJurisdiction;
  verificationStatus: "Verified" | "Unverified" | "Flagged";
  contactDomain?: string;   // e.g. "@fbi.gov" — for requestor verification
}

export type AuthorityRole =
  | "IssuingAuthority"    // Court/body that authorized the demand
  | "EnforcingAuthority"  // Agency serving/executing the demand
  | "RequestingAgency"    // Agency that submitted the request to Microsoft
  | "CooperatingAgency"   // Additional agency (Interpol, etc.)
  | "OutsideCounsel";     // External legal representation

export interface CaseAgencyRole {
  agency: Agency;
  role: AuthorityRole;
  primaryContact?: Agent;
  notes?: string;
}

export interface CaseLegalContext {
  country: CaseCountry;
  jurisdiction: CaseJurisdiction;
  agencies: CaseAgencyRole[];        // At least one required

  // Derived — computed from agencies[], not stored
  primaryIssuingAuthority?: Agency;
  primaryEnforcingAuthority?: Agency;
  primaryRequestingAgency?: Agency;

  // Validation signals
  agencyCountryMatch: boolean;       // All agency countries match case country
  crossBorderFlag: boolean;          // Agencies from different countries — +1.0 CHI complexity
}
```

**Supporting constants** (`src/constants/caseConstants.ts`):

```typescript
// Per-country valid jurisdiction levels
const JURISDICTION_LEVELS: Record<string, string[]> = {
  "US": ["Federal", "State", "Local", "Tribal"],
  "CA": ["Federal", "Provincial", "Territorial"],
  "GB": ["National", "Regional"],
  "IN": ["Central", "State"],
  "DE": ["Federal", "State (Land)"],
  // ...see full constant in caseConstants.ts
  "__default__": ["National"],
};

function getJurisdictionLevels(countryCode: string): string[] {
  return JURISDICTION_LEVELS[countryCode] ?? JURISDICTION_LEVELS["__default__"];
}
```

**Common agency patterns:**

| Scenario | IssuingAuthority | EnforcingAuthority | RequestingAgency |
|----------|------------------|--------------------|-----------------|
| Simple US | US Federal Court | FBI | FBI |
| MLAT | Foreign court | Local LE | DOJ/OIA |
| India + outside counsel | Indian court | Local police | Outside counsel firm |
| EU eEvidence | EU member state court | Executing Authority | EU member state court |

---

## 4. Business Logic

### 4.1 PersonaContext

**File:** `src/contexts/PersonaContext.tsx`

```typescript
import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AppUser, PROTOTYPE_USERS, PersonaCapability } from "../constants/personaConfig";

interface PersonaContextValue {
  /** The currently active user */
  currentUser: AppUser;
  /** Switch to a different user/persona */
  setCurrentUser: (user: AppUser) => void;
  /** All available prototype users */
  allUsers: AppUser[];
  /** Check whether the current user's persona has a specific capability */
  hasCapability: (capability: keyof PersonaCapability) => boolean;
}

const PersonaContext = createContext<PersonaContextValue | undefined>(undefined);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser>(PROTOTYPE_USERS[0]);

  const hasCapability = useCallback(
    (capability: keyof PersonaCapability): boolean => {
      return currentUser.persona.capabilities[capability];
    },
    [currentUser]
  );

  return (
    <PersonaContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        allUsers: PROTOTYPE_USERS,
        hasCapability,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) {
    throw new Error("usePersona must be used within a PersonaProvider");
  }
  return ctx;
}
```

**Behavior:**
- `currentUser` defaults to the first prototype user (Nicole Garcia, Triage Specialist).
- `setCurrentUser` replaces the active user. Components that depend on `usePersona()` will re-render.
- `hasCapability("canCompleteTriage")` returns `true` only for the Triage Specialist persona.

### 4.2 usePersona Hook

Exported from `PersonaContext.tsx` (see above). Returns:

| Property         | Type                                          | Description                                |
| ---------------- | --------------------------------------------- | ------------------------------------------ |
| `currentUser`    | `AppUser`                                     | The active user                            |
| `setCurrentUser` | `(user: AppUser) => void`                     | Switch user                                |
| `allUsers`       | `AppUser[]`                                   | All prototype users                        |
| `hasCapability`  | `(cap: keyof PersonaCapability) => boolean`   | Capability check shorthand                 |

### 4.3 Triage Completion Logic

**Where:** `src/hooks/useCaseWorkflow.ts` (existing hook, modified)

When the Triage Specialist clicks **"Complete Triage"**:

1. **Guard:** If `formData.triageCompletedDate` is already set, show a toast: *"Triage already completed"* and return (no-op).
2. **Mutation:**
   ```typescript
   setFormData((prev) => ({
     ...prev,
     caseStage: "Triage Complete",
     triageCompletedDate: new Date().toISOString(),
     triageCompletedBy: currentUser.displayName,
   }));
   ```
3. **Audit:** Log an `AuditAction.TRIAGE_COMPLETED` entry.
4. **Event:** Emit a `CaseEventType.TRIAGE_COMPLETE` event via the event bus.
5. **UI feedback:** Show a success toast: *"Triage completed successfully."*

**Precondition:** The "Complete Triage" button is only rendered when `hasCapability("canCompleteTriage")` is `true` AND `caseStage === "Waiting on Triage"`.

### 4.4 Audit Logging Hook

**File:** `src/hooks/useCaseAuditLog.ts`

```typescript
import { useState, useCallback } from "react";
import { CaseAuditLogEntry, AuditAction } from "../types/auditTypes";
import { usePersona } from "../contexts/PersonaContext";

// Generate a simple UUID v4 (crypto.randomUUID or fallback)
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useCaseAuditLog(caseId: string) {
  const { currentUser } = usePersona();
  const [entries, setEntries] = useState<CaseAuditLogEntry[]>([]);

  const log = useCallback(
    (
      action: AuditAction,
      previousValue: string | null,
      newValue: string | null,
      metadata?: Record<string, unknown>
    ) => {
      const entry: CaseAuditLogEntry = {
        id: generateId(),
        caseId,
        userId: currentUser.id,
        userDisplayName: currentUser.displayName,
        timestamp: new Date().toISOString(),
        action,
        previousValue,
        newValue,
        metadata,
      };
      setEntries((prev) => [...prev, entry]);
      // In development, also log to console for debugging
      if (import.meta.env.DEV) {
        console.log("[AUDIT]", entry);
      }
    },
    [caseId, currentUser]
  );

  /**
   * Wraps a setFormData-style setter so that every field change is audited.
   * Usage:
   *   const auditedSetFormData = auditedSetter(setFormData);
   *   auditedSetFormData({ caseStage: "In Progress" }, prevFormData);
   */
  const auditedSetter = useCallback(
    <T extends Record<string, unknown>>(
      setter: React.Dispatch<React.SetStateAction<T>>
    ) => {
      return (updates: Partial<T>, previous: T) => {
        // Log each changed field
        for (const key of Object.keys(updates)) {
          const prevVal = previous[key];
          const newVal = updates[key];
          if (prevVal !== newVal) {
            const action =
              key === "caseStage"
                ? AuditAction.STAGE_CHANGED
                : AuditAction.FIELD_CHANGED;
            log(
              action,
              prevVal != null ? String(prevVal) : null,
              newVal != null ? String(newVal) : null,
              { field: key }
            );
          }
        }
        setter((prev) => ({ ...prev, ...updates }));
      };
    },
    [log]
  );

  return { entries, log, auditedSetter };
}
```

**Key behaviors:**
- `entries` is an append-only array. It is never mutated or truncated.
- `log()` is the low-level API for explicit audit entries (e.g., triage completion).
- `auditedSetter()` wraps any React state setter so that field-level changes are automatically logged with `FIELD_CHANGED` or `STAGE_CHANGED` actions.
- In development mode, every audit entry is also printed to the browser console prefixed with `[AUDIT]`.

### 4.5 Event Bus Hook

**File:** `src/hooks/useCaseEvents.ts`

```typescript
import { useRef, useCallback } from "react";
import { CaseEvent, CaseEventType } from "../types/auditTypes";

type EventHandler = (event: CaseEvent) => void;

// Generate a simple UUID v4
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useCaseEvents() {
  const subscribersRef = useRef<Map<CaseEventType, Set<EventHandler>>>(
    new Map()
  );

  const subscribe = useCallback(
    (eventType: CaseEventType, handler: EventHandler): (() => void) => {
      const map = subscribersRef.current;
      if (!map.has(eventType)) {
        map.set(eventType, new Set());
      }
      map.get(eventType)!.add(handler);

      // Return unsubscribe function
      return () => {
        map.get(eventType)?.delete(handler);
      };
    },
    []
  );

  const emit = useCallback(
    (
      caseId: string,
      eventType: CaseEventType,
      payload: Record<string, unknown>,
      source: string
    ) => {
      const event: CaseEvent = {
        id: generateId(),
        caseId,
        eventType,
        payload,
        timestamp: new Date().toISOString(),
        source,
      };

      // Notify subscribers
      const handlers = subscribersRef.current.get(eventType);
      if (handlers) {
        handlers.forEach((handler) => handler(event));
      }

      // Dev logging
      if (import.meta.env.DEV) {
        console.log("[EVENT]", event);
      }

      return event;
    },
    []
  );

  return { emit, subscribe };
}
```

**Key behaviors:**
- Subscriptions are stored in a ref so they persist across renders without causing re-renders.
- `subscribe()` returns an unsubscribe function (standard pattern for use in `useEffect` cleanup).
- `emit()` synchronously notifies all subscribers for the given event type and returns the constructed event.
- In development mode, every emitted event is printed to the browser console prefixed with `[EVENT]`.

---

## 5. Components & UI

### 5.1 PersonaSwitcher (in AppHeader)

**Location:** Rendered inside `src/components/AppHeader.tsx`

**Visual spec:**
```
[ Nicole Garcia  TS v ]    <-- dropdown trigger
```
- Trigger shows: `{currentUser.displayName}` + persona badge (`TS` / `RS` / `MGR`) + chevron-down icon.
- Badge color:
  - **TS** — blue background (`#2563EB`), white text
  - **RS** — green background (`#059669`), white text
  - **MGR** — purple background (`#7C3AED`), white text
- Dropdown menu shows all three prototype users. Each row:
  ```
  Nicole Garcia       TS    Triage Specialist
  Michael Chen        RS    Response Specialist
  Shane Morrison      MGR   Manager
  ```
- Clicking a row calls `setCurrentUser(selectedUser)`.
- The currently active user has a checkmark icon.

**Implementation notes:**
- Use an existing dropdown/popover component if the design system has one; otherwise a simple `<select>` is acceptable for prototype.
- Replace any hardcoded user name in `AppHeader` with `currentUser.displayName` from `usePersona()`.

### 5.2 Quick Filter Chips

**Location:** `src/components/CaseQueue.tsx`, rendered below the search bar and above the case list.

**Visual spec:**
```
[ All (12) ] [ Waiting on Triage (5) ] [ Triage Complete (2) ] [ In Progress (3) ] [ Dormant (2) ]
```

**Behavior:**
- Chips are derived from `currentUser.persona.relevantCaseStages` plus an "All" chip.
  - For **TS**: `All`, `Waiting on Triage`
  - For **RS**: `All`, `Triage Complete`, `In Review`, `In Progress`
  - For **MGR**: `All` plus every stage in the system
- Each chip shows the count of cases matching that stage filter.
- Chips are **multi-select toggles**. Clicking a chip toggles it on/off.
- The **"All"** chip is a shortcut that clears all other filters (shows everything).
- If all specific chips are deselected, the "All" chip activates automatically.
- Chip styling: selected = filled background; unselected = outlined.
- On persona switch, chips reset to `persona.defaultQueueFilter`.

**State:**
```typescript
const [stageFilter, setStageFilter] = useState<string[]>(
  currentUser.persona.defaultQueueFilter
);

// Reset filter when persona changes
useEffect(() => {
  setStageFilter(currentUser.persona.defaultQueueFilter);
}, [currentUser]);
```

**Filtering logic:**
```typescript
const filteredCases = stageFilter.length === 0
  ? allCases // empty filter = show all (Manager default)
  : allCases.filter((c) => stageFilter.includes(c.caseStage));
```

### 5.3 Triage Completion Badge

**Location:** `src/components/case-queue/CaseCardDetails.tsx`

**Visual spec:**
```
[check-circle icon] Triage completed Jan 19 by Nicole Garcia
```

**Behavior:**
- Rendered only when `case.triageCompletedDate` is truthy.
- Icon: green checkmark circle.
- Date is formatted as `MMM D` (e.g., "Jan 19"). If the year differs from the current year, show `MMM D, YYYY`.
- Text: `"Triage completed {date} by {triageCompletedBy}"`.
- **Highlighted for RS persona:** When `currentUser.persona.id === "response_specialist"`, add a light green background tint to the badge row to draw attention.

### 5.4 Persona-Aware CaseCardActions

**Location:** `src/components/case-queue/CaseCardActions.tsx`

**Logic:**

| Persona  | Case Stage              | Primary Action Button        |
| -------- | ----------------------- | ---------------------------- |
| TS       | Waiting on Triage       | **Start Triage** (opens case form in triage mode) |
| TS       | Any other stage         | **View Details** (read-only) |
| RS       | Triage Complete         | **Start Fulfillment** (opens case form in fulfillment mode) |
| RS       | In Review / In Progress | **Continue Fulfillment**     |
| RS       | Any other stage         | **View Details** (read-only) |
| Manager  | Any stage               | **View Details**             |

**Implementation:**
```typescript
const { currentUser, hasCapability } = usePersona();

function getPrimaryAction(caseStage: string) {
  if (
    hasCapability("canCompleteTriage") &&
    caseStage === "Waiting on Triage"
  ) {
    return { label: "Start Triage", action: "start_triage" };
  }
  if (
    hasCapability("canStartFulfillment") &&
    caseStage === "Triage Complete"
  ) {
    return { label: "Start Fulfillment", action: "start_fulfillment" };
  }
  if (
    hasCapability("canStartFulfillment") &&
    (caseStage === "In Review" || caseStage === "In Progress")
  ) {
    return { label: "Continue Fulfillment", action: "continue_fulfillment" };
  }
  return { label: "View Details", action: "view_details" };
}
```

### 5.5 Case View Header

**Location:** `src/components/CaseQueue.tsx`, at the top of the case list panel.

**Format:** `"{ViewLabel} — {count} cases"`

| Persona  | ViewLabel           |
| -------- | ------------------- |
| TS       | Triage Queue        |
| RS       | Fulfillment Queue   |
| Manager  | All Cases           |

**Count** reflects the number of cases after filtering.

```typescript
function getQueueLabel(personaId: PersonaId): string {
  switch (personaId) {
    case "triage_specialist":
      return "Triage Queue";
    case "response_specialist":
      return "Fulfillment Queue";
    case "manager":
      return "All Cases";
  }
}
```

---

## 6. Files to Create

| File Path                                | Purpose                                          |
| ---------------------------------------- | ------------------------------------------------ |
| `src/constants/personaConfig.ts`         | PersonaId, PersonaCapability, PersonaConfig, AppUser types; PERSONA_CONFIGS object; PROTOTYPE_USERS array |
| `src/contexts/PersonaContext.tsx`         | React context, PersonaProvider component, usePersona hook |
| `src/hooks/useCaseAuditLog.ts`           | Audit trail hook: log(), auditedSetter(), entries array |
| `src/hooks/useCaseEvents.ts`             | Event bus hook: emit(), subscribe()              |
| `src/types/auditTypes.ts`               | CaseAuditLogEntry, AuditAction enum, CaseEvent, CaseEventType enum |

---

## 7. Files to Modify

### 7.1 `src/App.tsx`

**Change:** Wrap the app's component tree in `<PersonaProvider>`.

```tsx
import { PersonaProvider } from "./contexts/PersonaContext";

function App() {
  return (
    <PersonaProvider>
      {/* existing app content */}
    </PersonaProvider>
  );
}
```

### 7.2 `src/components/AppHeader.tsx`

**Changes:**
1. Import `usePersona` from `PersonaContext`.
2. Replace any hardcoded user name with `currentUser.displayName`.
3. Add the `PersonaSwitcher` dropdown (see section 5.1).

### 7.3 `src/components/case-queue/case-queue-types.ts`

**Changes:**
1. Add all new fields from section 3.3 to the `CaseQueueItem` interface.
2. Update `MOCK_CASES` array to include the new fields on existing entries (see section 8 for sample data).

### 7.4 `src/types/caseTypes.ts`

**Changes:**
1. Add all new fields from section 3.5 to the `FormData` interface.

### 7.5 `src/hooks/useCaseWorkflow.ts`

**Changes:**
1. Accept `currentUser` (or call `usePersona()` directly) to get the active user.
2. Add a `completeTriage()` function that:
   - Guards against double completion.
   - Sets `triageCompletedDate`, `triageCompletedBy`, and `caseStage`.
   - Logs `AuditAction.TRIAGE_COMPLETED`.
   - Emits `CaseEventType.TRIAGE_COMPLETE`.
3. Expose `completeTriage` from the hook's return value.

### 7.6 `src/components/DataEntryForm.tsx`

**Changes:**
1. Pass `currentUser` (from `usePersona()`) into `useCaseWorkflow` if it doesn't call the hook internally.
2. Render the "Complete Triage" button only when `hasCapability("canCompleteTriage")` and `caseStage === "Waiting on Triage"`.

### 7.7 `src/utils/mockCaseDataFactory.ts`

**Changes:**
1. Map the new `CaseQueueItem` fields into the mock data generation logic.
2. Ensure every generated case has plausible values for CHI, complexity, dates, agency, and services.

### 7.8 `src/components/CaseQueue.tsx`

**Changes:**
1. Import and call `usePersona()`.
2. Add `stageFilter` state initialized from `currentUser.persona.defaultQueueFilter`.
3. Reset `stageFilter` when `currentUser` changes (via `useEffect`).
4. Render quick filter chips (section 5.2).
5. Filter displayed cases by `stageFilter`.
6. Render persona-aware case view header (section 5.5).

### 7.9 `src/components/case-queue/CaseCardDetails.tsx`

**Changes:**
1. Render the triage completion badge when `triageCompletedDate` is present (section 5.3).
2. Highlight the badge for RS persona.

### 7.10 `src/components/case-queue/CaseCardActions.tsx`

**Changes:**
1. Import and call `usePersona()`.
2. Replace static action buttons with persona-aware actions (section 5.4).

---

## 8. Mock Data

Three sample `CaseQueueItem` records with ALL new fields populated. These should be added to (or replace entries in) the existing mock data.

### 8.1 "Waiting on Triage" Case — Emergency, CHI-2

```typescript
{
  // --- existing fields ---
  caseNumber: "DARS-2026-0147",
  caseStage: "Waiting on Triage",
  caseName: "Garcia v. Department of Revenue — Emergency Tax Records",
  assignedTo: "Nicole Garcia",
  requestDate: "2026-03-20",
  // ... other existing fields as needed ...

  // --- new fields ---
  chi: 2,
  complexityScore: 28,
  complexityTier: "Low",
  caseAgingState: "Fresh",
  dateServed: "2026-03-18",
  dateReceived: "2026-03-19",
  dateEnteredQueue: "2026-03-20",
  dateDue: "2026-04-03",
  deadlineType: "Statutory",
  hasFinancialPenalty: false,
  penaltyAmount: undefined,
  currentBlockers: [],
  agencyName: "Department of Revenue",
  services: ["Tax Records", "Employment Verification"],
  identifierCountOriginal: 3,
  identifierCountSupplemental: 0,
  triageCompletedDate: undefined,   // not yet triaged
  triageCompletedBy: undefined,      // not yet triaged
}
```

### 8.2 "In Progress" Case — Medium Complexity, Financial Penalty, CHI-3

```typescript
{
  // --- existing fields ---
  caseNumber: "DARS-2026-0089",
  caseStage: "In Progress",
  caseName: "Chen Industries — Multi-Agency Personnel File Request",
  assignedTo: "Michael Chen",
  requestDate: "2026-02-10",

  // --- new fields ---
  chi: 3,
  complexityScore: 62,
  complexityTier: "Medium",
  caseAgingState: "Normal",
  dateServed: "2026-02-08",
  dateReceived: "2026-02-09",
  dateEnteredQueue: "2026-02-10",
  dateDue: "2026-04-10",
  deadlineType: "Court-Ordered",
  hasFinancialPenalty: true,
  penaltyAmount: 5000,
  currentBlockers: ["Awaiting third-party records from Agency B"],
  agencyName: "Department of Labor",
  services: ["Personnel Files", "Disciplinary Records", "Benefits History"],
  identifierCountOriginal: 7,
  identifierCountSupplemental: 2,
  triageCompletedDate: "2026-02-12T14:33:00Z",
  triageCompletedBy: "Nicole Garcia",
}
```

### 8.3 "Dormant" Case — Stale, CHI-4

```typescript
{
  // --- existing fields ---
  caseNumber: "DARS-2025-0412",
  caseStage: "Dormant",
  caseName: "Morrison Estate — Historical Land Records & Mineral Rights",
  assignedTo: "Shane Morrison",
  requestDate: "2025-11-15",

  // --- new fields ---
  chi: 4,
  complexityScore: 85,
  complexityTier: "Very High",
  caseAgingState: "Stale",
  dateServed: "2025-11-10",
  dateReceived: "2025-11-12",
  dateEnteredQueue: "2025-11-15",
  dateDue: "2026-02-15",
  deadlineType: "Statutory",
  hasFinancialPenalty: true,
  penaltyAmount: 15000,
  currentBlockers: [
    "Missing historical archive records (pre-1990)",
    "Pending inter-agency transfer from Dept. of Interior",
  ],
  agencyName: "Department of Natural Resources",
  services: [
    "Land Title Records",
    "Mineral Rights Documentation",
    "Environmental Impact Assessments",
    "Historical Survey Maps",
  ],
  identifierCountOriginal: 12,
  identifierCountSupplemental: 5,
  triageCompletedDate: "2025-11-18T09:15:00Z",
  triageCompletedBy: "Nicole Garcia",
}
```

---

## 9. State Management

### 9.1 Context Hierarchy

```
<PersonaProvider>           ← app root, provides currentUser + capabilities
  <App>
    <AppHeader />           ← reads usePersona() for PersonaSwitcher
    <CaseQueue />           ← reads usePersona() for filter chips + header
      <CaseCard />
        <CaseCardDetails /> ← reads usePersona() for badge highlight
        <CaseCardActions /> ← reads usePersona() for action buttons
    <DataEntryForm />       ← reads usePersona() for triage completion
  </App>
</PersonaProvider>
```

### 9.2 Case Filter State

- **Location:** Local state in `CaseQueue` component.
- **Type:** `string[]` (array of stage names).
- **Initial value:** `currentUser.persona.defaultQueueFilter`.
- **Reset behavior:** Resets to default whenever `currentUser` changes (detected via `useEffect` dependency).

### 9.3 Audit Log State

- **Location:** Local state in `useCaseAuditLog` hook, scoped per-case.
- **Type:** `CaseAuditLogEntry[]` (append-only).
- **Persistence:** In-memory only for Phase 1. Future phases will persist to backend.
- **Access:** The hook returns `entries` for display in a future audit trail panel.

### 9.4 Event Bus State

- **Location:** `useRef` inside `useCaseEvents` hook.
- **Type:** `Map<CaseEventType, Set<EventHandler>>`.
- **Lifecycle:** Subscribers should unsubscribe in `useEffect` cleanup to prevent memory leaks.

---

## 10. Edge Cases

### 10.1 Persona Switch Mid-Session

**Scenario:** User switches from TS to RS while a case form is open.

**Behavior:**
- Case filters reset to the new persona's defaults.
- The open case form is **NOT** reset or closed. The user continues viewing/editing the case.
- Action buttons in the case form update to reflect the new persona's capabilities.
- Rationale: Closing the form would lose unsaved work. The form should always reflect the current persona's capabilities, but the data should not be discarded.

### 10.2 Triage Completion on Already-Completed Case

**Scenario:** TS clicks "Complete Triage" on a case that already has `triageCompletedDate` set.

**Behavior:**
- The `completeTriage()` function detects the existing date and returns early.
- A toast notification appears: *"Triage has already been completed for this case."*
- No audit log entry is created (the action was a no-op).
- No event is emitted.

### 10.3 Mock Data Coverage

All three personas must see at least one case when they log in with default filters:
- **TS** (default filter: "Waiting on Triage"): Mock data includes case DARS-2026-0147.
- **RS** (default filter: "Triage Complete", "In Review", "In Progress"): Mock data includes case DARS-2026-0089 ("In Progress").
- **Manager** (default filter: all): Sees all three mock cases plus any existing mocks.

### 10.4 Empty Filter State

If a user deselects all filter chips, the behavior depends on persona:
- **Manager:** Empty filter = show all (this is the default).
- **TS / RS:** If all chips are deselected, automatically activate the "All" chip and show all cases. An empty filter should never show zero results when cases exist.

### 10.5 Case Count Accuracy

Chip counts must update in real-time when:
- A case's stage changes (e.g., triage completion moves a case from "Waiting on Triage" to "Triage Complete").
- The underlying case list changes (e.g., a new case is added to mock data).

Counts should be calculated from the full unfiltered list, not the currently displayed list.

---

## 11. Acceptance Criteria

| #  | Criterion                                                                                          | Verification Method       |
| -- | -------------------------------------------------------------------------------------------------- | ------------------------- |
| 1  | Persona switcher is visible in the AppHeader, showing the current user name and persona badge (TS/RS/MGR). | Visual inspection         |
| 2  | Switching to TS persona auto-filters the case list to "Waiting on Triage" cases.                    | Click TS in switcher, observe case list |
| 3  | Switching to RS persona auto-filters the case list to "Triage Complete" / "In Review" / "In Progress". | Click RS in switcher, observe case list |
| 4  | Switching to Manager persona shows all cases (no filter applied).                                   | Click MGR in switcher, observe case list |
| 5  | Quick filter chips appear below the search bar. Clicking a chip toggles it and filters the case list. | Click chips, observe case list updates |
| 6  | Each chip displays the count of cases matching that stage.                                          | Compare chip count to manual count |
| 7  | Clicking the "All" chip shows the unfiltered list.                                                  | Click "All", verify all cases shown |
| 8  | TS completing triage populates `triageCompletedDate` (ISO 8601) and `triageCompletedBy` (user display name). | Complete triage, inspect state |
| 9  | RS viewing a triaged case sees a green triage completion badge with date and name.                  | Switch to RS, open triaged case |
| 10 | TS sees "Start Triage" button on "Waiting on Triage" cases; RS sees "Start Fulfillment" on "Triage Complete" cases. | Switch personas, check buttons |
| 11 | Case view header shows persona-appropriate label (e.g., "Triage Queue -- 5 cases") with correct count. | Visual inspection per persona |
| 12 | New fields (CHI, complexityScore, complexityTier, dates, agency, services) are present in mock data and accessible in the type system. | TypeScript compilation, inspect mock data |
| 13 | `CaseAuditLog` captures a `STAGE_CHANGED` entry when triage is completed.                           | Complete triage, inspect audit entries via console or React DevTools |
| 14 | Event bus emits a `TRIAGE_COMPLETE` event when triage finishes, observable in the console (`[EVENT]` log). | Complete triage, check browser console |

---

## 12. Cross-References

| Reference                                         | Relevance                                                         |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| **Parent roadmap:** DARS Case Operations & Workforce Intelligence Roadmap, Phase 1 | This spec implements the entirety of Phase 1.                    |
| **Source plan:** `cheerful-stargazing-truffle.md` (Persona System Plan) | Original ideation document that defined the three personas and their capabilities. |
| **DARS_Case_List_View_Product_Spec.md** section 5 (Data Model) | Defines the baseline `CaseQueueItem` and `FormData` types that this spec extends. |
| **DARS_Case_Health_Management.md** sections 3-4 (CHI / Complexity) | Defines the CHI scale (1-5) and complexity scoring algorithm that this spec adds fields for. Phase 2+ will implement the scoring logic. |
| **Kodex Gap 4** — Audit Trail Foundation           | This spec delivers the `CaseAuditLogEntry` type, `AuditAction` enum, and `useCaseAuditLog` hook. |
| **Kodex Gap 10** — Event Bus Pattern               | This spec delivers the `CaseEvent` type, `CaseEventType` enum, and `useCaseEvents` hook. |

---

## Appendix: Derivation Rules (Informational)

These rules are **not implemented in Phase 1** but are documented here so engineers understand how the new fields will be used in future phases.

| Field              | Derivation (future)                                                    |
| ------------------ | ---------------------------------------------------------------------- |
| `complexityScore`  | Weighted formula: `identifierCountOriginal * 5 + services.length * 10 + (chi * 8) + supplementalModifier` |
| `complexityTier`   | `0-25 = Low`, `26-50 = Medium`, `51-75 = High`, `76-100 = Very High`  |
| `caseAgingState`   | Based on days since `dateEnteredQueue`: `0-7 = Fresh`, `8-30 = Normal`, `31-60 = Aging`, `61-90 = Stale`, `91+ = Critical` |

In Phase 1, these values are **manually set in mock data**. Automatic derivation will be implemented in Phase 2 (Case Health Engine).
