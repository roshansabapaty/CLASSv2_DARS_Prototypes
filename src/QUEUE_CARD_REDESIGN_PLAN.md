# Queue Card Redesign — Implementation Plan

## Overview

Apply the layout from `CaseCardRedesignPreview.tsx` to the live queue cards, incorporating **Option C** (priority signal deduplication: uniform `border-l-4`, keep border color, remove conditional priority label badge, rely on P-badge as primary accessible signal).

## Option C — Priority Signal Consolidation

**What changes:**
- Border thickness normalized to `border-l-4` for all priorities (was 8/6/4)
- Border color retained (red/orange/blue) for fast queue scanning
- P-level badge with distinct icon shapes (AlertCircle/AlertTriangle/FileText) remains as the primary accessible indicator
- Conditional priority label badge removed (redundant — P-badge tooltip already shows the same text)
- `borderWidth` field removed from `PriorityConfig` (no longer needed)

**Accessibility rationale (per COLORBLIND_ACCESSIBILITY_REVIEW.md):**
The audit's recommended Option C (Icon + Priority Level Indicator) is already implemented via the P-badge. The border thickness variation was a Phase 2 defense-in-depth addition, but with the P-badge providing icon shape + P0/P1/P2 text + colored background, thickness is the weakest redundant channel. Normalizing it reduces visual noise without losing any accessible signal.

---

## Implementation Steps

Each step is designed to be independently deployable (app won't break between steps) and small enough to stay within Babel parse-size limits.

### Step 1: Update types and helpers (`case-queue-types.ts`)

**Changes:**
1. Add `identifierCount: number` and `servicesRequested: string[]` to `CaseQueueItem`
2. Add these fields to all mock data entries
3. Update `getPriorityConfig()` — set all priorities to `border-l-4`, remove `borderWidth` field
4. Remove `borderWidth` from `PriorityConfig` interface
5. Export `HIGH_PRIORITY_CRIMES` array (needed by new component)
6. Add `SERVICE_ICONS` map export

**Risk:** None — additive changes + config simplification. Existing components ignore new fields.

---

### Step 2: Create `CaseCardOperationalBadges.tsx` (new component)

**Creates:** `/components/case-queue/CaseCardOperationalBadges.tsx`

**Renders:** The new Row 1 operational badge bar from the preview:
- Cat 1: Urgency Signals (P-level badge + high-priority crime badges + emergency request type badge)
- Cat 2: Identifier Count
- Cat 3: Services Requested (Azure prioritized with accent styling)
- Cat 4: Account Type (Enterprise only, post Check Accounts, purple styling)

**Pipe dividers** between categories. Wrapped in `bg-slate-50/80 rounded-md border border-slate-100` container.

**Risk:** None — new file, not yet imported anywhere.

---

### Step 3: Update `CaseCardHeader.tsx` to title-only layout

**Changes:**
1. Remove P-level badge (moved to operational row)
2. Remove high-priority crime badges (moved to operational row)
3. Remove conditional priority label badge (Option C removal)
4. Remove `FileText` icon before Case ID
5. Keep: Case ID (copyable), Blocked by LE badge, Case Stage badge, Due Date
6. Update props interface: remove `priorityConfig` and `highPriorityCrimes` (no longer needed)

**Risk:** Low — `CaseQueue.tsx` still passes these props but they'll be unused until Step 5 updates the call site. TypeScript will warn but won't break rendering.

---

### Step 4: Update `CaseCardDetails.tsx` — Enterprise badge to purple

**Changes:**
1. Update Enterprise badge colors from Fluent gray (`bg-[#f3f2f1] text-[#605e5c]`) to purple (`bg-purple-50 text-purple-700 border-purple-300`) to match preview
2. Remove `workflowStage` gating on Enterprise badge (preview shows it whenever `accountExistenceChecked && hasEnterpriseAccounts`)

**Risk:** None — visual-only change.

---

### Step 5: Update `CaseQueue.tsx` Card element — wire up new layout

**Changes (within selected Card element only):**
1. Update Card `className`: remove `priorityConfig.color` reference (now always `border-l-4`, color still applied via `priorityConfig.color` but it's uniform width)
2. Add `<CaseCardOperationalBadges>` between `<CaseCardHeader>` and `<CaseCardDetails>`
3. Update `<CaseCardHeader>` props: remove `priorityConfig` and `highPriorityCrimes`
4. Pass new props to `<CaseCardOperationalBadges>`: `caseItem`, `priorityConfig`, `highPriorityCrimes`, `workflowStage`
5. Import new component

**Risk:** Low — all sub-components already updated in prior steps.

---

## File Change Summary

| File | Step | Change Type |
|------|------|-------------|
| `case-queue-types.ts` | 1 | Modify (types + mock data + config) |
| `CaseCardOperationalBadges.tsx` | 2 | Create (new component) |
| `CaseCardHeader.tsx` | 3 | Modify (simplify to title-only) |
| `CaseCardDetails.tsx` | 4 | Modify (Enterprise badge color) |
| `CaseQueue.tsx` | 5 | Modify (wire up new layout) |

## Rollback

Each step can be reverted independently. Steps 1-2 are purely additive. Steps 3-5 can be reverted by restoring the previous file versions.
