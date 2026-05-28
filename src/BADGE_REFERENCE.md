# Badge Reference — Case Queue Card & Case Detail Header

This document catalogs every badge displayed on the case queue cards and case detail header, including display criteria, visual styling, and functional purpose.

---

## Case Queue Card Badges

### Priority Level (P0 / P1 / P2)

| Property | Value |
|----------|-------|
| **Location** | Operational badges row (Row 1, left) |
| **Component** | `CaseCardOperationalBadges.tsx` |
| **Display Text** | `P0`, `P1`, or `P2` |
| **Icon** | `AlertCircle` (P0), `AlertTriangle` (P1), `FileText` (P2) |
| **Criteria** | Always displayed. Derived from `caseItem.casePriority`. |
| **Tooltip** | Shows priority label and expected response time (e.g., "Emergency Priority - 2-3 hours response time") |

| Priority | Badge Color | Border Color |
|----------|-------------|-------------|
| Emergency (P0) | Red background (`bg-red-50 text-red-700`) | `border-red-200` |
| Urgent (P1) | Orange background (`bg-orange-50 text-orange-700`) | `border-orange-200` |
| Routine (P2) | Blue background (`bg-blue-50 text-blue-700`) | `border-blue-200` |

**Purpose:** Immediate visual triage indicator. Font is monospaced and bold for scanability in the queue list.

---

### High Priority Crime

| Property | Value |
|----------|-------|
| **Location** | Operational badges row (Row 1, after priority) |
| **Component** | `CaseCardOperationalBadges.tsx` |
| **Display Text** | Crime name (e.g., "Threat to Life", "Child Safety", "Terrorism", "Human Trafficking", "Kidnapping") |
| **Icon** | `Shield` |
| **Color** | `bg-red-50 text-red-700 border-red-300` |
| **Criteria** | Displayed only when `natureOfCrime` contains a crime in the `HIGH_PRIORITY_CRIMES` list. Multiple badges if multiple high-priority crimes. |

**Purpose:** Flags cases involving imminent danger or sensitive crime categories that require expedited handling. Only the most critical crime categories appear here — routine crimes display elsewhere on the card.

---

### Emergency Request Type

| Property | Value |
|----------|-------|
| **Location** | Operational badges row (Row 1, after crime badges) |
| **Component** | `CaseCardOperationalBadges.tsx` |
| **Display Text** | Request type value (e.g., "Emergency Request", "Emergency Disclosure") |
| **Icon** | `AlertCircle` |
| **Color** | `bg-amber-50 text-amber-700 border-amber-300` |
| **Criteria** | Displayed only when `requestType` is `"Emergency Request"` or `"Emergency Disclosure"`. |

**Purpose:** Distinguishes emergency legal process types from standard requests. Complements the priority badge by showing the specific emergency mechanism used.

---

### Identifier Count

| Property | Value |
|----------|-------|
| **Location** | Operational badges row (Row 2) |
| **Component** | `CaseCardOperationalBadges.tsx` |
| **Display Text** | `{count} Identifier` or `{count} Identifiers` |
| **Icon** | `Users` |
| **Color** | `bg-indigo-50 text-indigo-700 border-indigo-200` |
| **Criteria** | Always displayed. Count from `caseItem.identifierCount`. |
| **Tooltip** | Breakdown of identifier types: email count, phone count, address count. |

**Purpose:** Indicates case complexity. Higher identifier counts suggest more collection jobs and longer processing times.

---

### Services Requested

| Property | Value |
|----------|-------|
| **Location** | Operational badges row (Row 2, after identifier count) |
| **Component** | `CaseCardOperationalBadges.tsx` |
| **Display Text** | Service name (e.g., "Outlook", "Teams", "Azure", "OneDrive/SharePoint") |
| **Icons** | `Mail` (Outlook), `MessageSquare` (Teams), `Cloud` (Azure), `HardDrive` (OneDrive/SharePoint) |
| **Criteria** | One badge per service in `caseItem.servicesRequested`. Azure is sorted first. |
| **Tooltip** | Service name. Azure additionally shows: "Azure cases may require additional collection workflows". |

| Service | Badge Color |
|---------|-------------|
| Azure | `bg-sky-50 text-sky-700 border-sky-300 ring-1 ring-sky-200` (highlighted) |
| All others | `bg-slate-50 text-slate-600 border-slate-200` |

**Purpose:** Shows which Microsoft services the case requires data from. Azure is visually differentiated because it often requires additional collection workflows.

---

### Enterprise Account

| Property | Value |
|----------|-------|
| **Location** | Operational badges row (Row 2, after services) |
| **Component** | `CaseCardOperationalBadges.tsx` |
| **Display Text** | "Enterprise" |
| **Icon** | `Building2` |
| **Color** | `bg-purple-50 text-purple-700 border-purple-300` |
| **Criteria** | Displayed only when BOTH `accountExistenceChecked === true` AND `hasEnterpriseAccounts === true`. |
| **Tooltip** | "Enterprise accounts discovered via Check Accounts action. May require different collection workflows and approvals." |

**Purpose:** Flags cases with enterprise (organizational) accounts, which may require different legal authority or collection procedures compared to consumer accounts.

---

### Blocked by Issuing/Enforcing Authority

| Property | Value |
|----------|-------|
| **Location** | Header row, next to case ID |
| **Component** | `CaseCardHeader.tsx` |
| **Display Text** | "Blocked by Issuing/Enforcing Authority" |
| **Icon** | `Send` |
| **Color** | `bg-[#fde7e9] text-[#d13438] border-[#d13438]` (red) |
| **Criteria** | Displayed when `caseItem.escalatedToLE === true`. |
| **Tooltip** | "Case escalated to issuing/enforcing authority - awaiting response" |

**Purpose:** Indicates the case is blocked waiting on a response from the law enforcement agency that submitted the request. The specialist cannot proceed until the authority responds to an escalation (e.g., request for additional documentation or clarification).

---

### Authorization Cancellation

| Property | Value |
|----------|-------|
| **Location** | Header row, next to case ID (same row as Blocked badge) |
| **Component** | `CaseCardHeader.tsx` |
| **Display Text** | "Authorization Cancellation" |
| **Icon** | `Ban` |
| **Color** | `bg-[#fff4ce] text-[#8a6d3b] border-[#f9a825]` (amber) |
| **Animation** | `animate-pulse` (pulsing to draw attention) |
| **Criteria** | Displayed when `caseItem.authorizationDesiredStatus === "Cancelled"`. |
| **Tooltip** | "Sending authority has requested authorization cancellation - action required" |

**Purpose:** Alerts the specialist that the sending authority has updated their authorization desired status to "Cancelled". The case requires immediate attention to process the cancellation workflow (block delivery, cancel tasks, close case). The pulsing animation ensures this time-sensitive action is not overlooked in the queue.

---

### Case Stage

| Property | Value |
|----------|-------|
| **Location** | Header row, right-aligned |
| **Component** | `CaseCardHeader.tsx` |
| **Display Text** | `caseStage` value (e.g., "Waiting on Triage", "In Progress", "In Review", "Resolved", "Cancelled") |
| **Color** | `bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]` (neutral gray) |
| **Criteria** | Always displayed. |
| **Tooltip** | "Case Status" |

**Purpose:** Shows the current workflow stage of the case. Uses neutral styling since the priority badge already conveys urgency.

---

### Resolved (Action Area)

| Property | Value |
|----------|-------|
| **Location** | Card action button area (replaces action button) |
| **Component** | `CaseCardActions.tsx` |
| **Display Text** | "Resolved" (with checkmark) |
| **Color** | `bg-slate-100 text-slate-500 border-slate-300` (muted) |
| **Criteria** | Displayed when `caseStage === "Resolved"`. Replaces the normal action button. |
| **Helper text** | "Click to review" |

**Purpose:** Indicates the case is fully resolved. Replaces the action button with a muted indicator since no further action is needed — clicking opens the case in read-only mode.

---

### Regular Crime Badges

| Property | Value |
|----------|-------|
| **Location** | Case details section |
| **Component** | `CaseCardDetails.tsx` |
| **Display Text** | Crime name (e.g., "Fraud", "Identity Theft", "Cyberstalking") |
| **Color** | `bg-slate-50 text-slate-700 border-slate-200` (neutral) |
| **Criteria** | Displayed for each crime in `natureOfCrime` that is NOT in the `HIGH_PRIORITY_CRIMES` list. |
| **Tooltip** | "Nature of Crime" |

**Purpose:** Shows the full set of crime categories for the case. Uses neutral styling to distinguish from the high-priority crime badges that appear in the operational row.

---

### Request Origin

| Property | Value |
|----------|-------|
| **Location** | Case details section |
| **Component** | `CaseCardDetails.tsx` |
| **Display Text** | Origin value (e.g., "LE Portal", "LEAPI", "Email forward", "Mail/Letter") |
| **Color** | `bg-slate-50 text-slate-600 border-slate-200` (neutral) |
| **Criteria** | Displayed when `caseItem.requestOrigin` has a value. |
| **Tooltip** | "Case Origin" |

**Purpose:** Shows how the case was submitted to the system. Useful for understanding processing context (e.g., LEAPI submissions may have structured data, email forwards may need manual triage).

---

## Case Detail Header Badges

These badges appear in the sticky case header when viewing a case's detail pages (Triage, Fulfillment, Collection).

### Priority Level (P0 / P1 / P2)

| Property | Value |
|----------|-------|
| **Location** | Case header summary, badges row |
| **Component** | `CaseHeaderSummary.tsx` |
| **Criteria** | Always displayed. Same mapping as queue card. |

Same styling as queue card priority badge.

---

### High Priority Crime

| Property | Value |
|----------|-------|
| **Location** | Case header summary, badges row |
| **Component** | `CaseHeaderSummary.tsx` |
| **Display Text** | Crime name with `Shield` icon |
| **Color** | `bg-red-50 text-red-700 border-red-300` |
| **Criteria** | Displayed for each crime in `HIGH_PRIORITY_CRIMES` list. |

Same criteria as queue card.

---

### Blocked by Issuing/Enforcing Authority

| Property | Value |
|----------|-------|
| **Location** | Case header summary, badges row |
| **Component** | `CaseHeaderSummary.tsx` |
| **Display Text** | "Blocked by Issuing/Enforcing Authority" |
| **Icon** | `Send` |
| **Color** | `bg-[#fde7e9] text-[#d13438] border-[#d13438]` |
| **Criteria** | Displayed when any agent in `formData.agents` has `escalatedToLE === true`. |

**Purpose:** Same as queue card, but checks agent-level escalation status from the full form data rather than the queue item flag.

---

### Internal Escalation

| Property | Value |
|----------|-------|
| **Location** | Case header summary, badges row |
| **Component** | `CaseHeaderSummary.tsx` |
| **Display Text** | "Internal Escalation" |
| **Icon** | `AlertTriangle` |
| **Color** | `bg-[#fde7e9] text-[#d13438] border-[#d13438]` (red) |
| **Criteria** | Displayed when `formData.escalatedToInternal` is truthy (an internal contact has been assigned for escalation). |

**Purpose:** Indicates the case has been escalated to an internal team member (e.g., legal, compliance, management). Distinct from the authority-blocked badge which involves external parties.

---

### NDO Expiration

| Property | Value |
|----------|-------|
| **Location** | Case header summary, badges row |
| **Component** | `CaseHeaderSummary.tsx` |
| **Display Text** | `NDO Exp: {date}` (e.g., "NDO Exp: Jan 15") |
| **Icon** | `ShieldAlert` |
| **Criteria** | Displayed only when the case has non-disclosure orders with expiration dates. |
| **Tooltip** | NDO name, full expiration date, and days remaining or expired message. |

| Status | Badge Color |
|--------|-------------|
| Expired | `bg-[#fde7e9] text-[#d13438] border-[#d13438]` (red) |
| Expiring Soon (0-7 days) | `bg-[#fff4ce] text-[#835c00] border-[#c19c00]` (amber) |
| Normal | `bg-[#e8f4fd] text-[#0078d4] border-[#0078d4]` (blue) |

**Purpose:** Tracks non-disclosure order expiration. Critical for compliance — an expired NDO may require user notification. Color escalation (blue -> amber -> red) draws increasing attention as expiration approaches.

---

### Case Status

| Property | Value |
|----------|-------|
| **Location** | Case header summary, badges row |
| **Component** | `CaseHeaderSummary.tsx` |
| **Display Text** | `Status: {caseStage}` |
| **Criteria** | Always displayed. |

| Stage | Icon | Badge Color |
|-------|------|-------------|
| Resolved | `CheckCircle2` | `bg-[#dff6dd] text-[#107c10] border-[#107c10]` (green) |
| Cancelled | `Ban` | `bg-[#fde7e9] text-[#a4262c] border-[#d13438]` (red) |
| All others | None | `bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]` (neutral) |

**Purpose:** Shows the current case stage with semantic coloring for terminal states (resolved = green, cancelled = red).

---

### Authorization Cancellation (Actionable)

| Property | Value |
|----------|-------|
| **Location** | Case header summary, badges row |
| **Component** | `CancellationBadge.tsx` (rendered in `CaseHeaderSummary.tsx`) |
| **Icon** | `Ban` |
| **Criteria** | Displayed when `formData.authorizationDesiredStatus === "Cancelled"`. |
| **Click Action** | Opens the 4-step Cancellation Workflow Dialog. |

| State | Display Text | Badge Color | Animation |
|-------|-------------|-------------|-----------|
| Steps incomplete | "Authorization Cancellation" | `bg-[#fde7e9] text-[#a4262c] border-[#d13438]` (red) | `animate-pulse` |
| All steps complete | "Cancellation Complete" | `bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]` (neutral) | None |

**Purpose:** This is the primary entry point for the cancellation workflow. When the sending authority updates the authorization desired status to "Cancelled", this badge pulses red to alert the specialist. Clicking it opens a guided 4-step workflow: Review Scope -> Block Delivery -> Cancel Identifier Tasks -> Cancel Case. Once all steps are completed, the badge transitions to a neutral "Cancellation Complete" state.

---

### MLAT Required (Extended Details)

| Property | Value |
|----------|-------|
| **Location** | Case header extended/collapsible section |
| **Component** | `CaseHeaderSummary.tsx` |
| **Display Text** | "MLAT Required" |
| **Color** | `bg-purple-50 text-purple-700 border-purple-300` (purple) |
| **Criteria** | Displayed only when `formData.mlat === true`. Visible only when the extended details section is expanded. |

**Purpose:** Indicates the case requires Mutual Legal Assistance Treaty processing, which involves international legal coordination and potentially longer processing times.

---

### Authorization Desired Status (Extended Details)

| Property | Value |
|----------|-------|
| **Location** | Case header extended/collapsible section |
| **Component** | `CaseHeaderSummary.tsx` |
| **Display Text** | Status value (e.g., "Active", "Pending", "Cancelled") |
| **Color** | `bg-slate-50 text-slate-700 border-slate-300` (neutral) |
| **Criteria** | Displayed when `formData.authorizationDesiredStatus` has a value. Visible only when the extended details section is expanded. |

**Purpose:** Read-only display of the current authorization desired status as set by the sending authority. The actionable cancellation badge (above) is the primary UI for the "Cancelled" state — this field provides the raw data value for reference.

---

### Enterprise Account (Extended Details)

| Property | Value |
|----------|-------|
| **Location** | Case header extended/collapsible section, next to identifier count |
| **Component** | `CaseHeaderSummary.tsx` |
| **Display Text** | "Enterprise" |
| **Icon** | `Building` |
| **Color** | `bg-orange-50 text-orange-700 border-orange-300` (orange) |
| **Criteria** | Displayed when any identifier has enterprise accounts. Visible only in the expanded details section. |

**Purpose:** Quick reference that the case involves enterprise (organizational) accounts, visible when reviewing full case details.

---

## Color System Reference

| Semantic Meaning | Background | Text | Border |
|-----------------|------------|------|--------|
| **Danger / Blocked / Cancelled** | `bg-red-50` or `bg-[#fde7e9]` | `text-red-700` or `text-[#d13438]` | `border-red-300` or `border-[#d13438]` |
| **Warning / Attention Required** | `bg-amber-50` or `bg-[#fff4ce]` | `text-amber-700` or `text-[#8a6d3b]` | `border-amber-300` or `border-[#f9a825]` |
| **Info / Active** | `bg-blue-50` or `bg-[#e8f4fd]` | `text-blue-700` or `text-[#0078d4]` | `border-blue-200` or `border-[#0078d4]` |
| **Success / Resolved** | `bg-[#dff6dd]` | `text-[#107c10]` | `border-[#107c10]` |
| **Enterprise / Special** | `bg-purple-50` or `bg-orange-50` | `text-purple-700` or `text-orange-700` | `border-purple-300` or `border-orange-300` |
| **Azure Priority** | `bg-sky-50` | `text-sky-700` | `border-sky-300` + `ring-1 ring-sky-200` |
| **Neutral / Default** | `bg-[#f3f2f1]` or `bg-slate-50` | `text-[#605e5c]` or `text-slate-600` | `border-[#8a8886]` or `border-slate-200` |
