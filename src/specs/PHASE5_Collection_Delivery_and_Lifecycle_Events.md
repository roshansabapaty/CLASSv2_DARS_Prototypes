# Phase 5 — Collection, Delivery, and Lifecycle Events

> **DARS Case Operations & Workforce Intelligence Roadmap — Phase 5**
> Status: Draft
> Created: 2026-03-26
> Authors: Engineering Team
> Last Updated: 2026-03-26

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

Phase 5 handles everything that occurs after a Reviewing Specialist (RS) configures fulfillment: the actual collection of data from service providers, secure delivery of that data to law enforcement, and all the real-world disruptions that occur throughout a case's lifecycle — cancellations, renewals, internal reviews, and modifications from law enforcement authorities.

### What This Phase Delivers

| Capability | Description |
|---|---|
| **Collection Pipeline Tracking** | Per-identifier, per-service, per-data-category status rollup with stalled-job detection and overall progress calculation |
| **Secure Delivery Management** | Package tracking, download confirmation, re-delivery support, and expiring download link lifecycle |
| **Enhanced Cancellation Workflow** | Partial cancellation at identifier level, LE-initiated cancellation handling, structured reason tracking |
| **Internal Review Routing** | Policy, escalation, quality, and compliance review with a dedicated reviewer case list, pause/resume semantics |
| **Long-Running Case Management** | Preservation lifecycle with PIP tracking, renewal window detection, NDO expiry monitoring, court order extensions |
| **Legal Authority Notification Handling** | Cancellations, modifications, supplemental requests, and urgency changes ingested as structured CaseEvents |
| **Outbound Response Management** | Templated responses for rejections, acknowledgments, deficiencies, and production cover letters with approval workflow |
| **Data Retention Policy** | Configurable retention periods per request type, auto-purge countdown, legal hold override |

### Kodex Gaps Addressed

- **GAP 3 — Templated Responses**: ResponseTemplate and OutboundResponse system enables standardized communications for rejections, acknowledgments, and production cover letters.
- **GAP 6 — Data Retention**: RetentionPolicy with configurable periods, legal hold override, and auto-purge countdown with pre-purge notifications.
- **GAP 8 — Secure Delivery**: DeliveryPackage with expiring download links, download confirmation tracking, and re-delivery management.

---

## 2. Prerequisites

| Phase | Dependency | Required For |
|---|---|---|
| **Phase 1** | Persona system | Role-based access: RS works cases, Manager approves, Reviewer reviews |
| **Phase 1** | Data model (Case, Identifier, Service, SubCategory) | Collection progress rolls up from SubCategory status |
| **Phase 1** | Audit log infrastructure | All lifecycle events (cancellation, delivery, review) logged immutably |
| **Phase 1** | Event bus | CaseEvent processing, renewal alerts, retention notifications |
| **Phase 2** | CHI scoring engine | Priority-aware collection ordering; CHI recalculation after partial cancellation |
| **Phase 4** | Assignment system | RS must be assigned to a case before working collection/delivery; reviewer assignment for internal reviews |

### Existing Code Foundations

The following existing code provides the substrate for Phase 5:

- **SubCategory interface** — already models `enabled`, `taskId`, `startDate`, `endDate`, `status` (`"Not started"` | `"In Progress"` | `"Completed"` | `"Cancelled"`), `collectionStatus`, `publishStatus`, `deliveryStatus`, `jobId`, `publishJobId`, `deliveryJobId`, `collectionStatusUpdatedAt`, `publishStatusUpdatedAt`, `deliveryStatusUpdatedAt`, `additionalJobs`.
- **CollectionTracker.tsx** (251KB) — manages collection progress at the task level; Phase 5 adds the rollup/aggregation layer on top.
- **PipelineStatusMatrix.tsx** — visualizes the collection pipeline per-identifier/per-service; Phase 5 adds delivery columns and stall detection.
- **cancellation/ directory** — `CancellationWorkflowDialog.tsx` (4-step: review scope -> block delivery -> cancel tasks -> cancel case), `CancellationStatusIndicator.tsx`, `BlockDeliveryPopup.tsx`, `CancellationBadge.tsx`. Phase 5 extends this with partial cancellation and LE-initiated flows.
- **REQUEST_SUB_TYPES** — includes `"Renewal"`, `"Preservation"`, `"Cease"`, `"Stop"`, `"Start"`.
- **APPROVAL_TYPES** — includes `"Cancellation"`, `"Renewal"`, `"Modification"`.
- **NDO_STATUSES** — `"Active"`, `"Expired"`, `"Pending"`, `"Cancelled"`.
- **TaskStatus** — 17 states including `AwaitingPreservation`, `Preserved`, `PreservationNotAvailable`, `Cancelled`.

### Critical Constraint

> **In-flight collection jobs CANNOT be stopped.** New jobs CAN be prevented. Delivery CAN be blocked.
>
> All cancellation and pause logic must respect this constraint: once a collection job is submitted, it will run to completion. The system can only prevent _new_ jobs from being created and block delivery of collected data.

---

## 3. Data Model

All interfaces below are additive — they do not modify existing interfaces unless explicitly noted in [Section 7](#7-files-to-modify).

### 3.1 CollectionProgress

Aggregated view of collection status across all identifiers, services, and subcategories for a case.

```typescript
interface CollectionProgress {
  /** The case this progress summary belongs to */
  caseId: string;

  /** Total number of collection tasks (subcategories with enabled = true) */
  totalTasks: number;

  /** Tasks with status = "Completed" */
  completedTasks: number;

  /** Tasks where collectionStatus indicates failure (job error, timeout, provider rejection) */
  failedTasks: number;

  /** Tasks with status = "Cancelled" */
  cancelledTasks: number;

  /**
   * Overall progress percentage.
   * Formula: ((completedTasks + cancelledTasks) / totalTasks) * 100
   * Cancelled tasks count toward progress because they are resolved (not pending).
   */
  progressPercent: number;

  /**
   * Estimated completion date based on average task completion rate.
   * Undefined if no tasks have completed yet or if all remaining tasks are stalled.
   */
  estimatedCompletionDate?: string; // ISO 8601

  /**
   * Human-readable descriptions of current blockers.
   * Examples: "AT&T CDR collection stalled (no update in 5 days)",
   *           "Identifier 555-0123 pending LE clarification"
   */
  currentBlockers: string[];
}
```

### 3.2 DeliveryPackage

Represents a packaged set of collected data ready for (or already sent to) the requesting law enforcement agency.

```typescript
interface DeliveryPackage {
  /** Unique package identifier */
  id: string;

  /** The case this delivery belongs to */
  caseId: string;

  /** Which identifiers' data is included in this package */
  identifierIds: string[];

  /** Which services' data is included */
  serviceIds: string[];

  /** When the package was assembled */
  packagedAt: string; // ISO 8601

  /** How this package is/was delivered */
  deliveryMethod: "SecurePortal" | "EncryptedEmail" | "PhysicalMedia" | "API";

  /** Current delivery lifecycle status */
  deliveryStatus:
    | "Packaging"
    | "Ready"
    | "Sent"
    | "Downloaded"
    | "Expired"
    | "Failed"
    | "Redelivered";

  /** Expiring download URL (SecurePortal and EncryptedEmail methods) */
  downloadUrl?: string;

  /** When the download link expires */
  downloadExpiry?: string; // ISO 8601

  /** When the recipient downloaded the package */
  downloadedAt?: string; // ISO 8601

  /** Who downloaded the package (LE agent name/badge from auth) */
  downloadedBy?: string;

  /** Number of times this package has been re-delivered */
  redeliveryCount: number;
}
```

### 3.3 CancellationRequest

Structured cancellation request supporting both internal and LE-initiated cancellations at full-case or partial-identifier scope.

```typescript
interface CancellationRequest {
  /** Unique cancellation request identifier */
  id: string;

  /** The case being cancelled (fully or partially) */
  caseId: string;

  /** Whether the entire case is cancelled or only specific identifiers */
  scope: "FullCase" | "PartialIdentifiers";

  /**
   * When scope = "PartialIdentifiers", the specific identifier IDs to cancel.
   * Undefined when scope = "FullCase".
   */
  identifierIds?: string[];

  /** Who initiated the cancellation */
  initiatedBy: "Internal" | "LEAuthority";

  /** Structured reason for cancellation */
  reason: CancellationReason;

  /** When the cancellation was requested */
  requestedAt: string; // ISO 8601

  /** When the cancellation was fully processed (all tasks transitioned) */
  processedAt?: string; // ISO 8601

  /** Who processed the cancellation (RS or system for auto-processed LE requests) */
  processedBy?: string;
}

type CancellationReason =
  | "LEWithdrew"        // LE agency withdrew the legal demand
  | "Duplicate"         // Duplicate of another case
  | "InvalidDemand"     // Legal demand found to be invalid (wrong jurisdiction, expired, etc.)
  | "CourtOrderRevoked" // Court order was revoked or vacated
  | "AgencyRequest"     // LE agency requested cancellation for unspecified operational reasons
  | "InternalPolicy"    // Internal policy decision (e.g., compliance review rejection)
  | "Other";            // Free-text reason required when selected
```

### 3.4 InternalReview

Tracks routing of a case to an internal reviewer (policy, escalation, quality, or compliance) with pause/resume semantics.

```typescript
interface InternalReview {
  /** Unique review identifier */
  id: string;

  /** The case under review */
  caseId: string;

  /** Type of review being conducted */
  reviewType: "Policy" | "Escalation" | "Quality" | "Compliance";

  /** Who requested the review (RS userId, manager userId, or "System" for auto-triggered) */
  requestedBy: string;

  /** When the review was requested */
  requestedAt: string; // ISO 8601

  /** The assigned reviewer's userId. Undefined if not yet assigned. */
  reviewerId?: string;

  /** Reviewer's notes explaining their decision */
  reviewerNotes?: string;

  /** The outcome of the review */
  outcome?: "Approved" | "Rejected" | "Hold";

  /** When the outcome was recorded */
  outcomeAt?: string; // ISO 8601

  /**
   * For "Hold" outcomes: the date until which the case should remain on hold.
   * After this date, the case auto-returns to the reviewer case list for re-evaluation.
   */
  holdUntil?: string; // ISO 8601

  /**
   * The case stage to return to after review completion.
   * On "Approved" → restore to this stage and resume.
   * On "Rejected" → return to "Triage" regardless of this value.
   */
  returnToStage: string;
}
```

### 3.5 RenewalTracking

Monitors authorization expiration and manages the renewal lifecycle for preservation, intercept, and court order cases.

```typescript
interface RenewalTracking {
  /** Unique renewal tracking identifier */
  id: string;

  /** The case whose authorization is being tracked */
  caseId: string;

  /**
   * If this case is a renewal of a previous case, the original case ID.
   * Used to build the renewal chain.
   */
  parentCaseId?: string;

  /** What type of authorization is expiring */
  renewalType: "Preservation" | "Intercept" | "CourtOrder";

  /** When the current authorization expires */
  currentAuthorizationExpiry: string; // ISO 8601

  /**
   * When the renewal window opens (configurable, default: 14 days before expiry).
   * Calculated as: currentAuthorizationExpiry - renewalWindowDays.
   */
  renewalWindowOpens: string; // ISO 8601

  /** Current status in the renewal lifecycle */
  renewalStatus:
    | "NotDue"            // Expiry is beyond the renewal window
    | "WindowOpen"        // Within the renewal window; action needed
    | "RenewalSubmitted"  // Renewal request submitted to LE or internally
    | "Renewed"           // Successfully renewed; new case created or dates extended
    | "Expired"           // Authorization expired without renewal
    | "Released";         // Expired and data/preservation released

  /** If renewed, the new case ID that continues this authorization */
  renewedCaseId?: string;
}
```

### 3.6 CaseEvent and CaseEventType

Structured events representing notifications and modifications from law enforcement or internal systems.

```typescript
interface CaseEvent {
  /** Unique event identifier */
  id: string;

  /** The case this event pertains to */
  caseId: string;

  /** The type of event */
  eventType: CaseEventType;

  /**
   * Event-specific payload. Structure varies by eventType.
   * See payload schemas below.
   */
  payload: Record<string, any>;

  /** When the event was received/created */
  timestamp: string; // ISO 8601

  /** Where the event originated */
  source: "System" | "Internal" | "LEAuthority";

  /** When the event was acknowledged and processed by an RS */
  processedAt?: string; // ISO 8601

  /** Who processed the event */
  processedBy?: string;
}

type CaseEventType =
  | "CANCELLATION_NOTICE"      // LE requests full or partial cancellation
  | "IDENTIFIER_MODIFICATION"  // LE adds/removes/changes identifiers
  | "DATE_RANGE_MODIFICATION"  // LE changes the requested date range
  | "URGENCY_CHANGE"           // LE changes urgency (e.g., emergency → standard)
  | "SUPPLEMENTAL_REQUEST"     // LE sends additional legal authority or requests
  | "RENEWAL_REQUEST"          // LE submits a renewal for preservation/intercept
  | "NDO_UPDATE";              // NDO status change (lifted, extended, modified)
```

#### CaseEvent Payload Schemas

```typescript
// CANCELLATION_NOTICE payload
interface CancellationNoticePayload {
  scope: "FullCase" | "PartialIdentifiers";
  identifierIds?: string[];
  reason: string;
  leContactName?: string;
  leReferenceNumber?: string;
}

// IDENTIFIER_MODIFICATION payload
interface IdentifierModificationPayload {
  added?: Array<{ type: string; value: string }>;
  removed?: string[]; // identifier IDs
  changed?: Array<{ identifierId: string; newValue: string }>;
  justification: string;
}

// DATE_RANGE_MODIFICATION payload
interface DateRangeModificationPayload {
  previousStart?: string;
  previousEnd?: string;
  newStart: string;
  newEnd: string;
  affectsIdentifierIds?: string[];
  justification: string;
}

// URGENCY_CHANGE payload
interface UrgencyChangePayload {
  previousUrgency: string;
  newUrgency: string;
  justification: string;
}

// SUPPLEMENTAL_REQUEST payload
interface SupplementalRequestPayload {
  documentType: string;
  documentReference?: string;
  additionalScope?: string;
  notes: string;
}

// RENEWAL_REQUEST payload
interface RenewalRequestPayload {
  renewalType: "Preservation" | "Intercept" | "CourtOrder";
  newExpirationDate: string;
  documentReference?: string;
  notes?: string;
}

// NDO_UPDATE payload
interface NdoUpdatePayload {
  previousStatus: string;
  newStatus: string;
  effectiveDate: string;
  notes?: string;
}
```

### 3.7 ResponseTemplate and OutboundResponse

Templated response system for standardized outbound communications.

```typescript
interface ResponseTemplate {
  /** Unique template identifier */
  id: string;

  /** Human-readable template name (e.g., "Standard Rejection — Insufficient Legal Authority") */
  name: string;

  /** Category of response this template is for */
  templateType:
    | "Rejection"
    | "Deficiency"
    | "Acknowledgment"
    | "PartialProduction"
    | "FullProduction"
    | "ExtensionRequest"
    | "Clarification";

  /**
   * The template body with {{variable}} placeholders.
   * Example: "Dear {{agencyContact}}, regarding case {{caseId}}..."
   */
  bodyTemplate: string;

  /**
   * List of variable names used in bodyTemplate.
   * Used for validation and to prompt the RS for any values not auto-resolved from case data.
   */
  variables: string[];

  /** Whether sending this template requires manager/supervisor approval */
  requiresApproval: boolean;
}

interface OutboundResponse {
  /** Unique response identifier */
  id: string;

  /** The case this response is associated with */
  caseId: string;

  /** The template used to generate this response */
  templateId: string;

  /** The fully rendered body after variable substitution */
  renderedBody: string;

  /** Recipient (LE contact email or mailing info) */
  sentTo: string;

  /** When the response was sent */
  sentAt: string; // ISO 8601

  /** Who sent the response (RS userId) */
  sentBy: string;

  /** If the template requires approval, who approved it */
  approvedBy?: string;

  /** When it was approved */
  approvedAt?: string; // ISO 8601
}
```

### 3.8 RetentionPolicy

Configurable data retention rules per request type.

```typescript
interface RetentionPolicy {
  /** The request type this policy applies to (e.g., "Subpoena", "CourtOrder", "Preservation") */
  requestType: string;

  /** Number of days to retain case data after case closure */
  retentionDays: number;

  /**
   * Whether a legal hold on the case overrides the retention period.
   * When true and a legal hold is active, data is NOT purged regardless of retentionDays.
   */
  legalHoldOverride: boolean;
}
```

---

## 4. Business Logic

### 4.1 Collection Progress Rollup

**Purpose**: Aggregate the per-subcategory statuses already tracked in the existing data model into a case-level `CollectionProgress` summary.

**Algorithm**:

```
function calculateCollectionProgress(case: Case): CollectionProgress {
  let total = 0, completed = 0, failed = 0, cancelled = 0;
  let blockers: string[] = [];
  let completionTimes: number[] = [];

  for (identifier of case.identifiers) {
    for (service of identifier.services) {
      for (subCategory of service.subCategories) {
        if (!subCategory.enabled) continue;
        total++;

        switch (subCategory.status) {
          case "Completed":
            completed++;
            completionTimes.push(durationBetween(subCategory.startDate, subCategory.endDate));
            break;
          case "Cancelled":
            cancelled++;
            break;
          case "In Progress":
            // Stall detection: no collectionStatusUpdatedAt change in STALL_THRESHOLD_DAYS
            if (daysSince(subCategory.collectionStatusUpdatedAt) > STALL_THRESHOLD_DAYS) {
              blockers.push(
                `${service.name} ${subCategory.name} collection stalled ` +
                `(no update in ${daysSince(subCategory.collectionStatusUpdatedAt)} days)`
              );
            }
            break;
          case "Not started":
            // Check if this is blocked by a cancelled/failed dependency
            break;
        }

        // Check for job failures via collectionStatus
        if (subCategory.collectionStatus === "Failed" ||
            subCategory.collectionStatus === "Error") {
          failed++;
        }
      }
    }
  }

  const progressPercent = total > 0
    ? Math.round(((completed + cancelled) / total) * 100)
    : 0;

  // Estimate completion: average time per task * remaining tasks
  const avgCompletionTime = completionTimes.length > 0
    ? average(completionTimes)
    : undefined;
  const remainingTasks = total - completed - cancelled - failed;
  const estimatedCompletionDate = avgCompletionTime && remainingTasks > 0
    ? addDays(now(), avgCompletionTime * remainingTasks / parallelismFactor)
    : undefined;

  return {
    caseId: case.id,
    totalTasks: total,
    completedTasks: completed,
    failedTasks: failed,
    cancelledTasks: cancelled,
    progressPercent,
    estimatedCompletionDate,
    currentBlockers: blockers,
  };
}
```

**Constants**:
- `STALL_THRESHOLD_DAYS`: 3 (configurable). If a subcategory's `collectionStatusUpdatedAt` has not changed in this many days while status is `"In Progress"`, it is considered stalled.
- `parallelismFactor`: Estimated number of tasks processed in parallel. Used for completion time estimation. Default: 5.

### 4.2 Partial Cancellation

**Purpose**: Cancel specific identifiers within a case while allowing other identifiers to continue through the collection/delivery pipeline.

**Flow**:

1. RS selects identifiers to cancel in `PartialCancellationDialog.tsx`.
2. System checks each selected identifier for in-flight collection jobs:
   - If any subcategory has `collectionStatus = "In Progress"` and a `jobId` → show warning: "Collection job {jobId} is in-flight and cannot be stopped. It will complete but delivery will be blocked."
3. For each selected identifier:
   a. Set all subcategory `status` = `"Cancelled"` for subcategories in `"Not started"` state.
   b. For subcategories `"In Progress"`: leave status as-is but set `deliveryStatus` = `"Blocked"` (collection completes but delivery is prevented).
   c. For subcategories `"Completed"`: set `deliveryStatus` = `"Blocked"`.
   d. Set the identifier-level `taskStatus` = `"Cancelled"`.
   e. Prevent creation of new collection, publish, and delivery jobs for this identifier.
4. Create a `CancellationRequest` record with `scope = "PartialIdentifiers"`.
5. Recalculate CHI score (Phase 2) — fewer identifiers may change priority.
6. Recalculate case complexity — fewer data points.
7. Update `CollectionProgress` — cancelled tasks count toward resolved total.
8. Log to audit trail: who cancelled, which identifiers, reason.

### 4.3 LE-Initiated Cancellation

**Purpose**: Process cancellation requests that originate from the law enforcement authority rather than internal staff.

**Flow**:

1. A `CaseEvent` arrives with `eventType = "CANCELLATION_NOTICE"` and `source = "LEAuthority"`.
2. Event appears in the `LENotificationPanel.tsx` for the assigned RS.
3. RS reviews the event payload:
   - If `scope = "FullCase"` → RS clicks "Process Full Cancellation" → triggers the existing `CancellationWorkflowDialog.tsx` 4-step flow with the reason pre-populated from the LE notice.
   - If `scope = "PartialIdentifiers"` → RS clicks "Process Partial Cancellation" → opens `PartialCancellationDialog.tsx` with the specified identifiers pre-selected.
4. On processing:
   - Mark the `CaseEvent` as processed (`processedAt`, `processedBy`).
   - Create the `CancellationRequest` with `initiatedBy = "LEAuthority"`.
   - Audit log entry includes LE source attribution, LE contact name, and LE reference number from the event payload.

### 4.4 Internal Review Routing

**Purpose**: Route a case to an internal reviewer (policy, escalation, quality, or compliance) with pause/resume semantics that do not destroy in-progress work.

**Flow**:

1. Review triggered by:
   - RS requests escalation (manual).
   - Manager flags for quality review (manual).
   - System auto-triggers compliance review based on rules (e.g., case involves certain request types or jurisdictions).
2. On trigger:
   a. Capture the current `caseStage` as `returnToStage`.
   b. Set `caseStage` = `"Pending Review"`.
   c. **Pause active collection**: do NOT cancel running jobs (constraint: in-flight jobs cannot be stopped). Instead, set a `reviewHold` flag that prevents new job creation. Running jobs complete but their results are held.
   d. Create `InternalReview` record.
   e. Assign to reviewer (round-robin within the review type's reviewer pool, or manual assignment by manager).
   f. Case appears in the `InternalReviewQueue.tsx` for the assigned reviewer.
3. Reviewer actions:
   - **Approve**: `outcome = "Approved"`. Restore `caseStage` to `returnToStage`. Clear `reviewHold` flag. Resume job creation. Case returns to RS's case list.
   - **Reject**: `outcome = "Rejected"`. Set `caseStage` = `"Triage"`. Return to triage case list with reviewer notes visible. RS must address notes before re-submitting.
   - **Hold**: `outcome = "Hold"`. Set `holdUntil` date. Case remains paused. After `holdUntil` date passes, case auto-returns to reviewer case list for re-evaluation (not auto-approved).
4. Audit log captures all review actions with reviewer identity and notes.

### 4.5 Renewal Detection

**Purpose**: Proactively detect approaching authorization expirations for preservation, intercept, and court order cases and guide the RS through the renewal process.

**Detection Logic**:

```
function evaluateRenewalStatus(tracking: RenewalTracking): void {
  const now = Date.now();
  const expiry = new Date(tracking.currentAuthorizationExpiry).getTime();
  const windowOpens = new Date(tracking.renewalWindowOpens).getTime();

  if (tracking.renewalStatus === "Renewed" || tracking.renewalStatus === "Released") {
    return; // Terminal states
  }

  if (now >= expiry) {
    if (tracking.renewalStatus !== "RenewalSubmitted") {
      tracking.renewalStatus = "Expired";
      // Trigger: notify RS and manager, flag for data release decision
    }
    // If RenewalSubmitted but expired, keep as RenewalSubmitted — still processing
    return;
  }

  if (now >= windowOpens) {
    if (tracking.renewalStatus === "NotDue") {
      tracking.renewalStatus = "WindowOpen";
      // Trigger: alert RS via RenewalAlertBanner, notify manager
    }
  }
}
```

**Renewal Window Configuration**:
- Default: 14 days before expiry.
- Configurable per renewal type (preservation may need longer lead time than court orders).

**Renewal Processing**:
- When RS initiates renewal:
  - If LE submits a new legal demand → create a new case with `parentCaseId` linking to the original. Set `renewedCaseId` on the original's `RenewalTracking`. Set `renewalStatus = "Renewed"`.
  - If LE extends existing authorization → update `currentAuthorizationExpiry` on the existing case. Set `renewalStatus = "Renewed"`.
- When authorization expires without renewal:
  - Set `renewalStatus = "Expired"`.
  - After configurable grace period (default: 7 days), set `renewalStatus = "Released"`.
  - Flag preservation data for release. Notify RS to update preservation status.

### 4.6 Preservation Lifecycle

**Purpose**: Track the relationship between preservation cases and their parent production cases, and surface the Preservation-In-Progress (PIP) status.

**Rules**:
- A preservation case links to a production case via `parentCaseId` on the production case's `RenewalTracking` or via a dedicated `preservationCaseId` field.
- **PIP (Preservation-In-Progress)** status is derived, not stored:
  ```
  isPIP = case has active preservation (preservationStatus = "Active")
          AND no production case linked yet (no parentCaseId reference from a production case)
  ```
- PIP badge displayed in the case list to indicate "preservation is live but no production demand has been received yet."
- When a production case arrives referencing the preservation:
  - Link the cases.
  - PIP flag automatically clears.
  - Preservation data becomes the starting point for the production case's collection.

### 4.7 NDO Lifecycle

**Purpose**: Monitor Non-Disclosure Order (NDO) status and alert RS when NDOs are approaching expiry.

**Rules**:
- NDO statuses (existing): `"Active"`, `"Expired"`, `"Pending"`, `"Cancelled"`.
- **NDO expiry alerting**: when an NDO has an expiration date, alert the RS 30 days before expiry.
- **On NDO expiry**:
  - Notify RS to update the case's notification status (the entity can now be notified).
  - Log NDO expiry as a `CaseEvent` with `eventType = "NDO_UPDATE"`.
  - RS must acknowledge and update the notification status field.
- **NDO extension**: if a court extends the NDO, update the expiration date and reset the alert window.

### 4.8 Template Rendering

**Purpose**: Replace `{{variable}}` placeholders in response templates with actual case data, provide preview, and log sent responses.

**Rendering Logic**:

```
function renderTemplate(template: ResponseTemplate, caseData: Case): string {
  let rendered = template.bodyTemplate;

  const variableMap: Record<string, string> = {
    caseId: caseData.id,
    agencyName: caseData.agencyName,
    agencyContact: caseData.agencyContact,
    identifiers: caseData.identifiers.map(i => i.value).join(", "),
    requestType: caseData.requestType,
    receivedDate: formatDate(caseData.receivedDate),
    dueDate: formatDate(caseData.dueDate),
    rsName: caseData.assignedRS?.name ?? "Unassigned",
    currentDate: formatDate(now()),
    // ... additional variables resolved from case data
  };

  for (const variable of template.variables) {
    const value = variableMap[variable];
    if (value === undefined) {
      // Variable not auto-resolved — RS must provide manually
      // UI highlights unresolved variables in the preview
      continue;
    }
    rendered = rendered.replaceAll(`{{${variable}}}`, value);
  }

  return rendered;
}
```

**Approval Flow**:
- If `template.requiresApproval === true`:
  - RS generates the rendered response and clicks "Submit for Approval".
  - Manager/supervisor receives approval request.
  - On approval → response is sent and logged.
  - On rejection → response returned to RS with notes.
- If `template.requiresApproval === false`:
  - RS can send directly after preview.

### 4.9 Data Retention

**Purpose**: Automatically manage case data lifecycle after closure with configurable retention periods and legal hold support.

**Rules**:
- On case closure (`caseStage` = `"Closed"`), the retention countdown begins.
- `retentionDays` is determined by the case's `requestType` via `RetentionPolicy` lookup.
- **Pre-purge notification**: N days before purge (configurable, default: 30 days), notify the RS and manager that case data will be purged.
- **Purge execution**:
  - Verify no active legal hold on the case.
  - Delete case data (collected data, delivery packages, working files).
  - Retain the case metadata shell (case ID, request type, dates, audit log) for compliance.
  - Log purge event to audit trail: what was purged, when, by whom/what system.
- **Legal hold override**: if `legalHoldOverride = true` on the policy AND the case has an active legal hold → skip purge entirely. Retention countdown pauses. Resumes when legal hold is lifted.

**Default Retention Periods**:

| Request Type | Retention Days | Legal Hold Override |
|---|---|---|
| Subpoena | 365 | true |
| Court Order | 730 | true |
| Preservation | 180 | true |
| Emergency | 90 | true |
| Pen Register | 365 | true |
| Wiretap | 730 | true |

---

## 5. Components & UI

### 5.1 CollectionProgressBar.tsx

**Purpose**: Case-level progress visualization with status breakdown.

**Features**:
- Horizontal progress bar segmented by status: completed (green), in-progress (blue), failed (red), cancelled (gray), not-started (empty).
- Percentage label: "72% Complete (36/50 tasks)".
- Hover tooltip shows breakdown: "28 completed, 8 in-progress, 2 failed, 6 cancelled, 6 not started".
- Stalled task warning icon if `currentBlockers.length > 0`, with popover listing blockers.
- Estimated completion date displayed below the bar when available.

### 5.2 DeliveryTracker.tsx

**Purpose**: Per-package delivery status tracking with download lifecycle management.

**Features**:
- Table of `DeliveryPackage` records for the case.
- Columns: Package ID, Identifiers, Services, Packaged Date, Method, Status, Actions.
- Status badges with color coding: Packaging (yellow), Ready (blue), Sent (purple), Downloaded (green), Expired (gray), Failed (red).
- For SecurePortal/EncryptedEmail packages:
  - "Copy Download Link" button (when status = Ready or Sent).
  - Expiry countdown: "Link expires in 2d 14h".
  - "Redeliver" button (when status = Expired or Failed): generates a new download link, increments `redeliveryCount`.
- Download confirmation: when `downloadedAt` is populated, show "Downloaded by {downloadedBy} on {date}".

### 5.3 PartialCancellationDialog.tsx

**Purpose**: Identifier-level cancellation selection with in-flight job warnings.

**Features**:
- List of all case identifiers with checkboxes.
- For each identifier, show current status summary (e.g., "3/5 tasks completed, 1 in-flight").
- In-flight warning callout: "The following identifiers have in-flight collection jobs that cannot be stopped. Collection will complete but delivery will be blocked: [list]".
- Reason selector using `CancellationReason` type.
- Free-text notes field (required when reason = "Other").
- Confirmation step showing impact summary: "X tasks will be cancelled, Y tasks will have delivery blocked, CHI will be recalculated."
- Submit creates `CancellationRequest` with `scope = "PartialIdentifiers"`.

### 5.4 LENotificationPanel.tsx

**Purpose**: Displays incoming notifications from law enforcement with action buttons.

**Features**:
- List of unprocessed `CaseEvent` records where `source = "LEAuthority"` and `processedAt` is null.
- Each event shows: event type badge, timestamp, source, payload summary.
- Action buttons per event type:
  - CANCELLATION_NOTICE → "Process Cancellation" (opens appropriate cancellation dialog).
  - IDENTIFIER_MODIFICATION → "Review Modifications" (opens diff view of identifier changes).
  - DATE_RANGE_MODIFICATION → "Review Date Change" (shows old vs. new date range).
  - URGENCY_CHANGE → "Acknowledge & Update" (updates urgency, recalculates CHI).
  - SUPPLEMENTAL_REQUEST → "Review Supplemental" (opens document viewer).
  - RENEWAL_REQUEST → "Process Renewal" (opens renewal workflow).
  - NDO_UPDATE → "Acknowledge NDO Change" (updates NDO status).
- "Mark as Processed" button on each event (sets `processedAt` and `processedBy`).
- Badge count of unprocessed events shown on the panel tab.

### 5.5 InternalReviewQueue.tsx

**Purpose**: Reviewer's dedicated case list showing cases pending their review.

**Features**:
- Filtered list of `InternalReview` records assigned to the current reviewer where `outcome` is null.
- Columns: Case ID, Request Type, Review Type, Requested By, Requested At, Days in Review.
- Sort by: requested date (oldest first by default), review type, urgency.
- Click to open case detail with review context panel.
- Quick actions: "Approve", "Reject", "Hold" (each opens `ReviewDecisionDialog.tsx`).
- Stats bar: "You have X cases pending review. Average review time: Y days."

### 5.6 ReviewDecisionDialog.tsx

**Purpose**: Capture the reviewer's decision with notes.

**Features**:
- Three action buttons: Approve (green), Reject (red), Hold (yellow).
- Required notes field for Reject and Hold outcomes.
- Optional notes field for Approve.
- For Hold: date picker for `holdUntil` (required).
- Impact summary:
  - Approve: "Case will return to {returnToStage} stage. Collection will resume."
  - Reject: "Case will return to Triage. RS will see your notes."
  - Hold: "Case will remain paused until {holdUntil}. You will be notified to re-evaluate."
- Confirmation: "Are you sure you want to {action} this case?"

### 5.7 RenewalAlertBanner.tsx

**Purpose**: Prominent banner on cases approaching authorization expiration.

**Features**:
- Displayed at the top of the case detail view when `renewalStatus = "WindowOpen"` or `"Expired"`.
- For WindowOpen: amber banner — "Preservation expires in {N} days — Initiate renewal".
- For Expired: red banner — "Authorization expired on {date}. Renewal not submitted. Data may be released."
- "Initiate Renewal" button opens the renewal workflow.
- "Dismiss" button (with confirmation) for cases where renewal is intentionally not pursued.

### 5.8 PreservationLink.tsx

**Purpose**: Display the link between a preservation case and its associated production case(s).

**Features**:
- On a preservation case: shows linked production case(s) with status.
- On a production case: shows linked preservation case with preservation dates and status.
- PIP badge: if preservation is active with no linked production → show "PIP" (Preservation-In-Progress) badge.
- Click-through navigation between linked cases.

### 5.9 ResponseTemplateEditor.tsx

**Purpose**: Template selection, variable resolution, preview, and send workflow.

**Features**:
- Template selector dropdown filtered by `templateType`.
- Live preview panel showing rendered output with resolved variables highlighted in green and unresolved variables highlighted in red.
- Manual input fields for unresolved variables.
- "Preview" button renders the template with current values.
- "Send" button (or "Submit for Approval" if `requiresApproval = true`).
- Character/word count.
- Template variable reference sidebar showing available variables and their current values.

### 5.10 OutboundResponseHistory.tsx

**Purpose**: Timeline of all outbound communications sent for a case.

**Features**:
- Chronological list of `OutboundResponse` records.
- Each entry shows: template name, sent date, sent by, sent to, approval status (if applicable).
- Expand to view full rendered body.
- "Resend" button to re-send a previous response.
- Export option for compliance records.

### 5.11 RetentionCountdown.tsx

**Purpose**: Display remaining retention time on closed cases with purge warning.

**Features**:
- Shown on closed cases only.
- Countdown display: "Data retained for X more days" (or "Y months, Z days").
- Color coding: green (> 90 days), yellow (30-90 days), red (< 30 days).
- Legal hold indicator: if active, show "Legal hold active — purge suspended" with lock icon.
- Pre-purge warning: when within the notification window, show prominent warning.
- Admin action: "Extend Retention" button (requires justification and manager approval).

---

## 6. Files to Create

### Components

| File Path | Description |
|---|---|
| `src/components/collection/CollectionProgressBar.tsx` | Case-level collection progress bar with status breakdown |
| `src/components/collection/CollectionProgressBar.test.tsx` | Unit tests for CollectionProgressBar |
| `src/components/delivery/DeliveryTracker.tsx` | Per-package delivery status and download management |
| `src/components/delivery/DeliveryTracker.test.tsx` | Unit tests for DeliveryTracker |
| `src/components/cancellation/PartialCancellationDialog.tsx` | Identifier-level cancellation selection dialog |
| `src/components/cancellation/PartialCancellationDialog.test.tsx` | Unit tests for PartialCancellationDialog |
| `src/components/notifications/LENotificationPanel.tsx` | Incoming LE notification display and action panel |
| `src/components/notifications/LENotificationPanel.test.tsx` | Unit tests for LENotificationPanel |
| `src/components/review/InternalReviewQueue.tsx` | Reviewer case list with pending review list |
| `src/components/review/InternalReviewQueue.test.tsx` | Unit tests for InternalReviewQueue |
| `src/components/review/ReviewDecisionDialog.tsx` | Approve/reject/hold decision dialog |
| `src/components/review/ReviewDecisionDialog.test.tsx` | Unit tests for ReviewDecisionDialog |
| `src/components/lifecycle/RenewalAlertBanner.tsx` | Authorization expiration warning banner |
| `src/components/lifecycle/RenewalAlertBanner.test.tsx` | Unit tests for RenewalAlertBanner |
| `src/components/lifecycle/PreservationLink.tsx` | Preservation-to-production case linking |
| `src/components/lifecycle/PreservationLink.test.tsx` | Unit tests for PreservationLink |
| `src/components/lifecycle/RetentionCountdown.tsx` | Closed-case data retention countdown |
| `src/components/lifecycle/RetentionCountdown.test.tsx` | Unit tests for RetentionCountdown |
| `src/components/responses/ResponseTemplateEditor.tsx` | Template selection, rendering, preview, and send |
| `src/components/responses/ResponseTemplateEditor.test.tsx` | Unit tests for ResponseTemplateEditor |
| `src/components/responses/OutboundResponseHistory.tsx` | Timeline of sent communications |
| `src/components/responses/OutboundResponseHistory.test.tsx` | Unit tests for OutboundResponseHistory |

### Hooks

| File Path | Description |
|---|---|
| `src/hooks/useCollectionProgress.ts` | Calculates and returns `CollectionProgress` for a case |
| `src/hooks/useDeliveryPackages.ts` | Manages delivery package state and operations |
| `src/hooks/useCancellation.ts` | Handles partial and full cancellation logic |
| `src/hooks/useInternalReview.ts` | Manages internal review lifecycle (create, assign, decide) |
| `src/hooks/useRenewalTracking.ts` | Monitors renewal windows and manages renewal state |
| `src/hooks/useCaseEvents.ts` | Processes incoming CaseEvents and provides event queue |
| `src/hooks/useResponseTemplates.ts` | Template CRUD, rendering, and send operations |
| `src/hooks/useRetentionPolicy.ts` | Retention countdown calculation and purge operations |

### Types

| File Path | Description |
|---|---|
| `src/types/collection-types.ts` | `CollectionProgress` interface |
| `src/types/delivery-types.ts` | `DeliveryPackage` interface |
| `src/types/cancellation-types.ts` | `CancellationRequest`, `CancellationReason` |
| `src/types/review-types.ts` | `InternalReview` interface |
| `src/types/renewal-types.ts` | `RenewalTracking` interface |
| `src/types/case-event-types.ts` | `CaseEvent`, `CaseEventType`, payload interfaces |
| `src/types/response-types.ts` | `ResponseTemplate`, `OutboundResponse` |
| `src/types/retention-types.ts` | `RetentionPolicy` interface |

### State Management

| File Path | Description |
|---|---|
| `src/state/caseEventQueue.ts` | Global state for pending LE notification events |
| `src/state/reviewContext.ts` | Reviewer case list state and assignment management |
| `src/state/retentionState.ts` | Retention countdown timers and purge scheduling |

### Mock Data

| File Path | Description |
|---|---|
| `src/mocks/phase5-mock-data.ts` | Mock data for all Phase 5 scenarios (see Section 8) |

---

## 7. Files to Modify

| File Path | Change Description |
|---|---|
| `src/components/cancellation/CancellationWorkflowDialog.tsx` | Add `mode` prop: `"full"` (default, existing behavior) or `"partial"` (new, delegates to `PartialCancellationDialog`). Add LE-initiated pre-population: when triggered from `LENotificationPanel`, pre-fill reason and scope from `CaseEvent` payload. |
| `src/components/collection/CollectionTracker.tsx` | Import and display `CollectionProgressBar` as a summary header. Wire `useCollectionProgress` hook to provide rollup data. Add stall detection indicators. No removal of existing functionality — additive only. |
| `src/components/collection/PipelineStatusMatrix.tsx` | Add delivery status columns alongside existing collection/publish columns. Add visual indicators for blocked delivery (from partial cancellation). |
| `src/hooks/useCaseWorkflow.ts` | Add `"Pending Review"` as a valid stage transition. Add `reviewHold` flag support in stage transition logic. Add `resumeFromReview()` function that restores `returnToStage`. Add `pauseForReview()` function that captures current stage and transitions to Pending Review. |
| `src/constants/caseConstants.ts` | Add `CANCELLATION_REASONS` constant array derived from `CancellationReason` type. Add `REVIEW_TYPES` constant array: `["Policy", "Escalation", "Quality", "Compliance"]`. Add `STALL_THRESHOLD_DAYS` constant (default: 3). Add `RENEWAL_WINDOW_DAYS` constant (default: 14). Add `NDO_ALERT_DAYS` constant (default: 30). Add `DEFAULT_RETENTION_POLICIES` array of `RetentionPolicy`. |
| `src/types/case-queue-types.ts` | Add `isPIP` boolean flag to the case queue item type. Add `renewalStatus` field. Add `pendingReview` boolean flag. Add `unprocessedEventCount` number field. |

---

## 8. Mock Data

All mock data lives in `src/mocks/phase5-mock-data.ts` and covers the following scenarios:

### Scenario 1: Mid-Collection Case (60% complete, 1 stalled)

```typescript
export const mockCollectionCase: CollectionProgress = {
  caseId: "CASE-2026-00451",
  totalTasks: 50,
  completedTasks: 28,
  failedTasks: 2,
  cancelledTasks: 0,
  progressPercent: 60,
  estimatedCompletionDate: "2026-04-10T00:00:00Z",
  currentBlockers: [
    "AT&T CDR collection stalled (no update in 5 days)",
  ],
};
```

- 50 total subcategory tasks across 4 identifiers and 3 services.
- 28 completed, 2 failed, 20 in-progress/not-started.
- 1 stalled task: AT&T CDR with `collectionStatusUpdatedAt` 5 days ago.

### Scenario 2: Partial Cancellation Case

```typescript
export const mockPartialCancellation: CancellationRequest = {
  id: "CANCEL-2026-00102",
  caseId: "CASE-2026-00389",
  scope: "PartialIdentifiers",
  identifierIds: ["ID-001", "ID-003"],
  initiatedBy: "Internal",
  reason: "Duplicate",
  requestedAt: "2026-03-20T14:30:00Z",
  processedAt: "2026-03-20T15:45:00Z",
  processedBy: "rs-user-042",
};
```

- Case with 5 identifiers; 2 cancelled as duplicates of another case.
- Remaining 3 identifiers continue through pipeline.
- CHI recalculated from 78 to 62 after cancellation.

### Scenario 3: Case in Internal Review

```typescript
export const mockInternalReview: InternalReview = {
  id: "REV-2026-00034",
  caseId: "CASE-2026-00512",
  reviewType: "Compliance",
  requestedBy: "manager-user-007",
  requestedAt: "2026-03-22T09:00:00Z",
  reviewerId: "reviewer-user-015",
  reviewerNotes: undefined,
  outcome: undefined,
  outcomeAt: undefined,
  holdUntil: undefined,
  returnToStage: "Collection",
};
```

- Case was in Collection stage when compliance review was triggered.
- Collection paused (no new jobs), existing in-flight jobs completing.
- Assigned to reviewer-user-015, awaiting decision.

### Scenario 4: Preservation Approaching Renewal

```typescript
export const mockRenewalTracking: RenewalTracking = {
  id: "REN-2026-00018",
  caseId: "CASE-2026-00290",
  parentCaseId: undefined,
  renewalType: "Preservation",
  currentAuthorizationExpiry: "2026-04-09T00:00:00Z",
  renewalWindowOpens: "2026-03-26T00:00:00Z",
  renewalStatus: "WindowOpen",
  renewedCaseId: undefined,
};
```

- Preservation case with authorization expiring April 9, 2026.
- Renewal window opened today (March 26, 2026 — 14 days before expiry).
- RS should see `RenewalAlertBanner` with "Preservation expires in 14 days."

### Scenario 5: LE Cancellation Event Pending

```typescript
export const mockLECancellationEvent: CaseEvent = {
  id: "EVT-2026-00077",
  caseId: "CASE-2026-00401",
  eventType: "CANCELLATION_NOTICE",
  payload: {
    scope: "FullCase",
    reason: "Investigation closed. Legal demand withdrawn.",
    leContactName: "Det. Sarah Chen",
    leReferenceNumber: "PD-2026-1847",
  },
  timestamp: "2026-03-25T16:20:00Z",
  source: "LEAuthority",
  processedAt: undefined,
  processedBy: undefined,
};
```

- Full-case cancellation notice from LE, received yesterday.
- Not yet processed — appears in `LENotificationPanel` for the assigned RS.
- Reason: investigation closed, legal demand withdrawn.

---

## 9. State Management

### 9.1 CaseEventQueue (`src/state/caseEventQueue.ts`)

**Purpose**: Global state for pending LE notification events across all cases assigned to the current user.

**Shape**:

```typescript
interface CaseEventQueueState {
  /** All unprocessed events for the current user's assigned cases */
  pendingEvents: CaseEvent[];

  /** Count of unprocessed events (for badge display) */
  pendingCount: number;

  /** Loading state */
  isLoading: boolean;

  /** Actions */
  fetchPendingEvents: () => Promise<void>;
  markEventProcessed: (eventId: string, processedBy: string) => Promise<void>;
  getEventsForCase: (caseId: string) => CaseEvent[];
}
```

**Behavior**:
- Initialized on user login / role context switch.
- Polls for new events every 60 seconds (configurable).
- `pendingCount` drives the notification badge on the main nav and the LENotificationPanel tab.
- `markEventProcessed` optimistically removes the event from `pendingEvents` and decrements `pendingCount`.

### 9.2 ReviewContext (`src/state/reviewContext.ts`)

**Purpose**: State management for the reviewer case list and review assignment workflow.

**Shape**:

```typescript
interface ReviewContextState {
  /** Reviews assigned to the current reviewer */
  myReviews: InternalReview[];

  /** All pending reviews (for managers with visibility) */
  allPendingReviews: InternalReview[];

  /** Currently selected review */
  activeReview: InternalReview | null;

  /** Actions */
  fetchMyReviews: () => Promise<void>;
  fetchAllPendingReviews: () => Promise<void>;
  assignReviewer: (reviewId: string, reviewerId: string) => Promise<void>;
  submitDecision: (
    reviewId: string,
    outcome: "Approved" | "Rejected" | "Hold",
    notes: string,
    holdUntil?: string
  ) => Promise<void>;
  setActiveReview: (review: InternalReview | null) => void;
}
```

**Behavior**:
- `myReviews` filtered to current user's reviewer ID.
- `allPendingReviews` available only to users with Manager or Admin persona.
- `submitDecision` triggers the stage transition logic in `useCaseWorkflow` (approve → restore stage, reject → triage, hold → pause).

### 9.3 RetentionState (`src/state/retentionState.ts`)

**Purpose**: Tracks retention countdown timers and purge scheduling for closed cases.

**Shape**:

```typescript
interface RetentionState {
  /** Retention info for closed cases visible to the current user */
  caseRetentionMap: Map<string, {
    caseId: string;
    closedAt: string;
    retentionDays: number;
    purgeDate: string;
    daysRemaining: number;
    hasLegalHold: boolean;
    notificationSent: boolean;
  }>;

  /** Actions */
  calculateRetention: (caseId: string) => void;
  applyLegalHold: (caseId: string) => Promise<void>;
  releaseLegalHold: (caseId: string) => Promise<void>;
  executePurge: (caseId: string) => Promise<void>;
}
```

---

## 10. Edge Cases

### 10.1 Cancel Identifier That Is Already Delivered

**Scenario**: RS attempts to cancel an identifier whose data has already been delivered to LE.

**Handling**:
- Show warning dialog: "Data for identifier {value} has already been delivered to {agencyName} on {deliveryDate}. Delivery cannot be reversed. Cancelling this identifier will only prevent future collection and delivery. Proceed?"
- If RS confirms: mark identifier as cancelled, log that data was previously delivered, include in audit trail.
- The delivered data remains with LE — this is irreversible.

### 10.2 Renewal Submitted but Original Expires Before Processing

**Scenario**: RS submits a renewal request, but the original authorization expires before the renewal is processed by LE.

**Handling**:
- Keep `renewalStatus = "RenewalSubmitted"` (do NOT overwrite to "Expired").
- Show warning banner: "Authorization expired on {date}. Renewal is pending. Collection continues under submitted renewal authority."
- If renewal is ultimately denied: transition to "Expired" → "Released".
- If renewal is approved: transition to "Renewed" and update dates.
- Log the gap period in audit trail for compliance.

### 10.3 Internal Review on Case Already in Collection

**Scenario**: A compliance review is triggered on a case that has 30 active collection jobs in flight.

**Handling**:
- Do NOT cancel the 30 in-flight jobs (constraint: in-flight jobs cannot be stopped).
- Set `reviewHold` flag to prevent new job creation.
- In-flight jobs complete normally. Their results are stored but delivery is paused.
- Show in reviewer case list: "Case has 30 in-flight collection jobs. Results will be held pending review outcome."
- On review approval: clear hold, resume delivery pipeline, allow new job creation.
- On review rejection: clear hold, move to triage, collected data is held (not delivered, not deleted).

### 10.4 LE Sends Duplicate Cancellation

**Scenario**: LE sends two `CANCELLATION_NOTICE` events for the same case within a short time window.

**Handling**:
- Both events appear in `LENotificationPanel`.
- When RS processes the first event:
  - If full-case cancellation: case enters cancellation workflow.
  - Second event now shows with info badge: "A cancellation for this case has already been processed on {date}."
  - RS can "Dismiss as Duplicate" (logs dismissal to audit trail) or process it again (idempotent — no harm in re-cancelling an already-cancelled case).
- Deduplication logic: if two CANCELLATION_NOTICE events for the same case arrive within 24 hours with the same scope, flag the second as "Potential Duplicate."

### 10.5 Delivery Link Expires Before Download

**Scenario**: A delivery package download link expires before LE downloads it.

**Handling**:
- `deliveryStatus` transitions from `"Sent"` to `"Expired"` when `downloadExpiry` passes.
- RS is notified: "{agencyName} has not downloaded package {id}. Link expired on {date}."
- RS can click "Redeliver" → generates a new download link with a fresh expiry window, increments `redeliveryCount`.
- After 3 redelivery attempts, escalate to manager for follow-up with LE.

### 10.6 Partial Cancellation Leaves Zero Active Identifiers

**Scenario**: RS cancels identifiers one by one until all identifiers are cancelled.

**Handling**:
- After each partial cancellation, check if any identifiers remain active.
- If zero active identifiers remain: prompt RS — "All identifiers have been cancelled. Would you like to cancel the entire case?"
- If RS confirms: transition to full-case cancellation workflow.
- If RS declines: case remains open with all identifiers cancelled (unusual but allowed for record-keeping).

### 10.7 Template Variable Unresolvable

**Scenario**: A response template references `{{courtOrderNumber}}` but the case has no court order number on file.

**Handling**:
- In the preview, highlight `{{courtOrderNumber}}` in red with tooltip: "This variable could not be auto-resolved from case data."
- RS must manually enter the value or select a different template.
- "Send" button disabled while any variables remain unresolved.

### 10.8 Legal Hold Applied After Retention Countdown Started

**Scenario**: A case has been closed for 300 days (retention period: 365 days). A legal hold is then applied.

**Handling**:
- Immediately pause the retention countdown.
- `RetentionCountdown` shows: "Legal hold active — purge suspended. 65 days remained when hold was applied."
- When legal hold is lifted: countdown resumes from 65 days (not reset to 365).
- Audit trail logs: hold applied date, hold lifted date, countdown pause/resume.

---

## 11. Acceptance Criteria

### Collection Pipeline

| # | Criterion |
|---|---|
| AC-01 | `CollectionProgressBar` displays accurate progress percentage calculated from all enabled subcategories across all identifiers and services. |
| AC-02 | Stalled collection jobs (no status update in `STALL_THRESHOLD_DAYS`) are identified and listed in `currentBlockers`. |
| AC-03 | Estimated completion date is calculated based on average task completion rate and displayed when available. |

### Secure Delivery

| # | Criterion |
|---|---|
| AC-04 | `DeliveryTracker` displays all delivery packages for a case with correct status badges and delivery method. |
| AC-05 | Download link expiry countdown is accurate and updates in real-time (or on component refresh). |
| AC-06 | Re-delivery generates a new download link with a fresh expiry window and increments `redeliveryCount`. |
| AC-07 | Download confirmation (`downloadedAt`, `downloadedBy`) is recorded and displayed when the recipient downloads the package. |

### Cancellation

| # | Criterion |
|---|---|
| AC-08 | Partial cancellation correctly sets `status = "Cancelled"` on not-started tasks for selected identifiers and `deliveryStatus = "Blocked"` on in-progress/completed tasks. |
| AC-09 | In-flight collection jobs are NOT stopped during partial cancellation; a warning is displayed to the RS. |
| AC-10 | CHI score and case complexity are recalculated after partial cancellation. |
| AC-11 | LE-initiated cancellation events appear in `LENotificationPanel` and can be processed into the cancellation workflow with LE source attribution in the audit trail. |

### Internal Review

| # | Criterion |
|---|---|
| AC-12 | Cases routed for internal review transition to `"Pending Review"` stage with collection paused (no new jobs created). |
| AC-13 | Reviewer case list (`InternalReviewQueue`) shows all pending reviews assigned to the current reviewer with correct metadata. |
| AC-14 | Approve outcome restores the case to `returnToStage` and resumes collection. Reject outcome sends to Triage with reviewer notes. Hold outcome pauses until `holdUntil` date. |

### Renewal & Lifecycle

| # | Criterion |
|---|---|
| AC-15 | `RenewalAlertBanner` appears when a case enters the renewal window (default: 14 days before authorization expiry). |
| AC-16 | Preservation cases display PIP badge in the case list when there is active preservation with no linked production case. |
| AC-17 | NDO expiry alerts fire 30 days before NDO expiration and prompt the RS to update notification status. |

### Outbound Responses

| # | Criterion |
|---|---|
| AC-18 | `ResponseTemplateEditor` correctly renders templates by substituting `{{variables}}` with case data and highlights unresolved variables. |
| AC-19 | Templates with `requiresApproval = true` cannot be sent without manager approval. Approved and sent responses are logged in `OutboundResponseHistory`. |

### Data Retention

| # | Criterion |
|---|---|
| AC-20 | `RetentionCountdown` displays accurate remaining retention days on closed cases, respects legal hold override, and sends pre-purge notifications at the configured threshold. |

---

## 12. Cross-References

### Internal Specifications

| Reference | Relevance |
|---|---|
| `DARS_Case_Health_Management.md` Section 11 | Case health scoring incorporates collection progress, stall detection, and review status from Phase 5. |
| `PHASE1_Persona_System_and_Data_Foundation.md` | Persona-based access control governs who can cancel, review, approve responses, and apply legal holds. |
| Phase 2 Spec (CHI Scoring) | CHI recalculation triggered by partial cancellation (fewer identifiers changes priority). Collection ordering uses CHI for job scheduling priority. |
| Phase 4 Spec (Assignment System) | RS assignment required before collection/delivery work. Reviewer assignment for internal reviews uses similar round-robin logic. |

### Kodex Gap Mapping

| Kodex Gap | Phase 5 Resolution |
|---|---|
| **GAP 3 — Templated Responses** | `ResponseTemplate` + `OutboundResponse` system with variable substitution, preview, approval workflow, and history tracking. Components: `ResponseTemplateEditor.tsx`, `OutboundResponseHistory.tsx`. |
| **GAP 6 — Data Retention** | `RetentionPolicy` with per-request-type configurable retention days, legal hold override, auto-purge countdown, and pre-purge notifications. Component: `RetentionCountdown.tsx`. |
| **GAP 8 — Secure Delivery** | `DeliveryPackage` with expiring download URLs, download confirmation tracking, re-delivery management, and multiple delivery methods. Component: `DeliveryTracker.tsx`. |

### Existing Component Dependencies

| Existing Component | Phase 5 Interaction |
|---|---|
| `src/components/cancellation/CancellationWorkflowDialog.tsx` | Extended with `mode` prop for partial cancellation and LE-initiated pre-population. |
| `src/components/cancellation/CancellationStatusIndicator.tsx` | Updated to reflect partial cancellation state (some identifiers cancelled, others active). |
| `src/components/cancellation/BlockDeliveryPopup.tsx` | Reused for partial cancellation delivery blocking on per-identifier basis. |
| `src/components/cancellation/CancellationBadge.tsx` | Extended to show "Partial" variant when only some identifiers are cancelled. |
| `src/components/collection/CollectionTracker.tsx` | Enhanced with progress rollup header and stall detection. |
| `src/components/collection/PipelineStatusMatrix.tsx` | Extended with delivery status columns and blocked-delivery indicators. |

---

*End of Phase 5 Specification*
