# Phase 3 -- Case List View & Search

> **DARS Case Operations & Workforce Intelligence Roadmap -- Phase 3**
>
> Status: Draft
> Last updated: 2026-03-26
> Authors: Engineering (derived from DARS_Case_List_View_Product_Spec.md)
> Source workshop: Dale Ayers, David Large (Response Specialists, GMT team)

---

## 1. Overview

Response Specialists need a compact, spreadsheet-like view to browse large case lists efficiently. The current card layout (`CaseQueue.tsx` with `CaseCardDetails.tsx`) works well for active cases of 6-7 cases but becomes unwieldy when browsing 200+ cases in a shared case pool.

> **Dale Ayers:** "Having it in a compact one-liner like this is definitely helpful when there's volume."

Phase 3 delivers:

| Capability | Description |
|---|---|
| Compact table view | One row per case, high-density spreadsheet layout with 20+ columns |
| View density toggle | Switch between table and card view with a single click |
| Service icons column | Compact icon grid showing Microsoft services per case |
| Unified search bar | Search by request number, identifier value, or contact |
| Multi-request search | Paste multiple LNS/LENS numbers (comma or newline separated) |
| Identifier cross-reference | Find all cases containing a given identifier |
| Column-level filtering & sorting | Per-column filter dropdowns and header-click sorting |
| Saved/shared views | Persist column, filter, and sort configurations |
| Disambiguated font | Monospace font for identifier fields (l/I/1, O/0 distinction) |

---

## 2. Prerequisites

| Dependency | Required? | Notes |
|---|---|---|
| **Phase 1** -- Persona system, enriched data model | **Yes** | Table columns depend on the expanded `CaseQueueItem` fields (CHI, complexity, aging state, services array, etc.) |
| **Phase 2** -- CHI scoring, complexity tiers | **Graceful degrade** | If Phase 2 is delayed, render CHI and Complexity columns as empty/placeholder. The table structure does not break. |

The extended `CaseQueueItem` fields added by Phase 1:

```typescript
// Phase 1 additions to CaseQueueItem
chi: number;                        // 1-5
complexityScore: number;
complexityTier: "Low" | "Medium" | "High" | "Very High";
caseAgingState: "Green" | "Yellow" | "Red" | "Overdue";
dateServed: string;
dateReceived: string;
dateEnteredQueue: string;
dateDue: string;
deadlineType: "SLA" | "Court" | "Agency";
hasFinancialPenalty: boolean;
penaltyAmount: number | null;
currentBlockers: string[];
agencyName: string;
services: string[];                 // keys from MICROSOFT_SERVICES_CONFIG
identifierCountOriginal: number;
identifierCountSupplemental: number;
triageCompletedDate: string | null;
triageCompletedBy: string | null;
```

---

## 3. Data Model

All types live in `src/types/listViewTypes.ts`.

### 3.1 ColumnDefinition

```typescript
export interface ColumnDefinition {
  /** Unique column identifier, used as React key and in saved views */
  id: string;

  /** Human-readable column header label */
  label: string;

  /**
   * Data accessor -- either a direct key of CaseQueueItem or a string
   * indicating a derived/computed value (prefixed with "$").
   * Examples: "caseId", "country", "$ageDays", "$identifierSummary"
   */
  accessor: keyof CaseQueueItem | string;

  /** Default column width in pixels */
  width: number;

  /** Minimum column width when resizing */
  minWidth?: number;

  /** Whether clicking the header sorts by this column */
  sortable: boolean;

  /** Whether the column header shows a filter dropdown */
  filterable: boolean;

  /**
   * Filter input type rendered in the column header dropdown.
   * - "text"    -- free-text contains/equals
   * - "select"  -- dropdown of distinct values
   * - "date"    -- date range picker
   * - "number"  -- numeric comparison (gt, lt, between)
   * - "boolean" -- true/false toggle
   */
  filterType: "text" | "select" | "date" | "number" | "boolean";

  /** Whether the column is visible by default */
  visible: boolean;

  /** If true, the column cannot be removed or hidden (e.g., Request #) */
  locked: boolean;

  /**
   * Optional custom render key. When present, the table row delegates
   * rendering to a named sub-component instead of plain text.
   * Examples: "CHIBadge", "ComplexityIndicator", "ServiceIconGrid",
   *           "IdentifierSummary", "FinancialPenaltyIcon", "BlockerTags",
   *           "AgingStateBadge", "TriageInfo"
   */
  renderAs?: string;
}
```

### 3.2 SavedView

```typescript
export interface SavedView {
  /** UUID */
  id: string;

  /** User-facing name, e.g. "My Emergency Queue" */
  name: string;

  /** Ordered array of column definitions (includes visibility, width) */
  columns: ColumnDefinition[];

  /** Active filters applied to this view */
  filters: ActiveFilter[];

  /** Column id to sort by, or null for default sort */
  sortBy: string | null;

  /** Sort direction */
  sortDirection: "asc" | "desc";

  /** User who created this view */
  createdBy: string;

  /** If true, visible to all users in the team */
  isShared: boolean;

  /** If true, this view loads by default for the user's persona */
  isDefault: boolean;

  /** ISO timestamp of last modification */
  updatedAt: string;
}
```

### 3.3 ActiveFilter

```typescript
export interface ActiveFilter {
  /** The column this filter applies to */
  columnId: string;

  /** Comparison operator */
  operator: "contains" | "equals" | "gt" | "lt" | "between" | "in";

  /**
   * Filter value. Type depends on operator:
   * - "contains" / "equals": string
   * - "gt" / "lt": number | string (date ISO)
   * - "between": [number, number] | [string, string]
   * - "in": string[]  (multi-select values)
   */
  value: string | number | [string, string] | [number, number] | string[];
}
```

### 3.4 SearchQuery

```typescript
export interface SearchQuery {
  /** Raw text entered by the user */
  text: string;

  /**
   * Detected or user-selected entity type.
   * "auto" means the system will auto-detect.
   */
  entityType: "auto" | "request" | "identifier" | "contact";

  /** Search results */
  results: SearchResult[];

  /** Whether search is in progress */
  isLoading: boolean;
}
```

### 3.5 SearchResult

```typescript
export interface SearchResult {
  /** What matched */
  type: "case" | "identifier" | "contact";

  /** Case ID if a case was matched */
  caseId?: string;

  /** Identifier value if an identifier was matched */
  identifierValue?: string;

  /**
   * Human-readable context string displayed in search results.
   * Examples:
   *   "LNS-2025-00138 -- FBI, Emergency Disclosure, 3 identifiers"
   *   "dale.ayers@outlook.com found in 3 cases (FBI, Interpol, BKA)"
   */
  matchContext: string;

  /** Agency name for context display */
  agencyName?: string;

  /** Request type for context display */
  requestType?: string;

  /** Number of cases containing this match (for identifier search) */
  caseCount?: number;
}
```

---

## 4. Business Logic

### 4.1 Column Definitions

The table supports 20+ columns. Each column definition specifies its accessor, default width, sort/filter capabilities, and custom renderer.

| # | Column Label | `id` | `accessor` | Width | Sortable | Filterable | FilterType | RenderAs | Visible | Locked |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Request # | `caseId` | `caseId` | 160 | Yes | Yes | text | -- | Yes | **Yes** |
| 2 | CHI | `chi` | `chi` | 60 | Yes | Yes | number | `CHIBadge` | Yes | No |
| 3 | Complexity | `complexity` | `complexityTier` | 80 | Yes | Yes | select | `ComplexityIndicator` | Yes | No |
| 4 | Identifiers | `identifiers` | `$identifierSummary` | 100 | Yes | No | -- | `IdentifierSummary` | Yes | No |
| 5 | Country | `country` | `country` | 120 | Yes | Yes | select | -- | Yes | No |
| 6 | Request Type | `requestType` | `requestType` | 150 | Yes | Yes | select | -- | Yes | No |
| 7 | Category / Sub-Type | `caseType` | `caseType` | 160 | Yes | Yes | select | -- | No | No |
| 8 | Queue | `queue` | `$queue` | 120 | Yes | Yes | select | -- | No | No |
| 9 | Agency | `agencyName` | `agencyName` | 150 | Yes | Yes | text | -- | Yes | No |
| 10 | Date Received | `dateReceived` | `dateReceived` | 110 | Yes | Yes | date | -- | Yes | No |
| 11 | Date Due | `dateDue` | `dateDue` | 110 | Yes | Yes | date | -- | Yes | No |
| 12 | Deadline Type | `deadlineType` | `deadlineType` | 100 | Yes | Yes | select | -- | Yes | No |
| 13 | Financial Penalty | `financialPenalty` | `hasFinancialPenalty` | 60 | Yes | Yes | boolean | `FinancialPenaltyIcon` | Yes | No |
| 14 | Current Blockers | `blockers` | `currentBlockers` | 180 | No | Yes | select | `BlockerTags` | Yes | No |
| 15 | Services | `services` | `services` | 140 | No | Yes | select | `ServiceIconGrid` | Yes | No |
| 16 | Age (Days) | `ageDays` | `$ageDays` | 70 | Yes | Yes | number | -- | Yes | No |
| 17 | Assigned To | `assigneeName` | `assigneeName` | 130 | Yes | Yes | select | -- | Yes | No |
| 18 | Case Stage | `caseStage` | `caseStage` | 130 | Yes | Yes | select | -- | Yes | No |
| 19 | Aging State | `agingState` | `caseAgingState` | 90 | Yes | Yes | select | `AgingStateBadge` | Yes | No |
| 20 | Triage Completed | `triageCompleted` | `$triageInfo` | 150 | Yes | No | -- | `TriageInfo` | No | No |
| 21 | Priority | `casePriority` | `casePriority` | 90 | Yes | Yes | select | -- | Yes | No |
| 22 | Auth Desired Status | `authDesiredStatus` | `authorizationDesiredStatus` | 130 | Yes | Yes | select | -- | No | No |

**Computed accessors** (prefixed with `$`):

| Accessor | Computation |
|---|---|
| `$identifierSummary` | `"${identifierCountOriginal} (+${identifierCountSupplemental})"` -- e.g., `"4 (+1)"` |
| `$ageDays` | `Math.floor((Date.now() - new Date(dateEnteredQueue).getTime()) / 86400000)` |
| `$queue` | Placeholder for Phase 4 assignment groups. Returns `"--"` until Phase 4. |
| `$triageInfo` | `triageCompletedDate ? formatDate(triageCompletedDate) + " by " + triageCompletedBy : "--"` |

### 4.2 Search Logic

The unified search bar handles four distinct search modes. The system auto-detects the mode from input patterns but allows the user to override via an entity-type selector.

#### 4.2.1 Auto-detection Rules

```
INPUT PATTERN                         DETECTED TYPE
--------------------------------------------------------------
Matches /^L(EN)?S-\d{4}-\d{5,6}$/i   request
Contains comma or newline + above     request (multi)
Matches email pattern (*@*.*)         identifier
Matches phone pattern (+digits, etc)  identifier
Matches IPv4 or IPv6                  identifier
Everything else                       fuzzy text (all fields)
```

#### 4.2.2 Single Request Search

- Exact match on `caseId`.
- Result: single `SearchResult` with `type: "case"`, full case context.

#### 4.2.3 Multi-Request Search

- Split input on commas, newlines, or semicolons.
- Trim whitespace from each token.
- Search each token as a request number.
- Results: array of `SearchResult`, one per matched case. Unmatched tokens shown with "Not found" context.

#### 4.2.4 Identifier Cross-Reference Search

- Input detected as email, phone, or IP.
- Scan all cases' `identifiers` arrays (from the full `FormData`, not the case list summary).
- For each case containing a matching identifier, return a `SearchResult` with `type: "identifier"`, including `agencyName`, `requestType`, and total `caseCount`.
- Group results by identifier value, then list cases within each group.

#### 4.2.5 Fuzzy Text Search

- Search across: `caseId`, `agencyName`, `assigneeName`, `country`, `caseStage`, `requestType`, `natureOfCrime[]`, `currentBlockers[]`.
- Case-insensitive substring match.
- Results: array of `SearchResult` with `type: "case"`.

#### 4.2.6 Search Result Actions

Each search result row supports the same Pick/Release actions available on case list cards:
- **Unassigned case**: "Pick" button to self-assign.
- **Assigned to me**: "Release" button to unassign.
- **Assigned to other**: "View" button (read-only).

### 4.3 Sorting

- Click a sortable column header once: sort ascending.
- Click again: sort descending.
- Click a third time: return to unsorted (default order).
- Visual indicator: up-arrow (asc), down-arrow (desc), or neutral dash (unsorted) in the header.

**Default sort order** (when no explicit sort is active):
1. CHI ascending (1 = most urgent first).
2. Within the same CHI tier, Age descending (oldest first).

### 4.4 Filtering

- Each filterable column header has a small dropdown icon.
- Clicking it opens a filter popover with controls appropriate to `filterType`:
  - **text**: text input with "contains" / "equals" toggle.
  - **select**: checkbox list of all distinct values in that column.
  - **date**: date range picker (from / to).
  - **number**: comparison operator dropdown (>, <, between, =) + input(s).
  - **boolean**: toggle (Yes / No / Any).
- Active filters appear as removable chips in the `ActiveFilters` bar above the table.
- Filters are AND-combined: a case must pass all active filters.
- Filter state is part of the `SavedView` and is preserved when switching views.

### 4.5 Saved Views

- Saved views are persisted to `localStorage` for the prototype phase.
- CRUD operations:
  - **Create**: user configures columns + filters + sort, clicks "Save View", enters name.
  - **Read**: dropdown lists all saved views (personal + shared).
  - **Update**: user modifies current view, clicks "Save" to overwrite.
  - **Delete**: user selects "Delete View" from dropdown.
- **Share**: toggle `isShared` flag. Shared views appear for all users.
- **Set as Default**: one view per persona can be marked as default. It loads automatically when the case list opens.
- localStorage key: `dars_saved_views_${userId}`.
- Shared views stored under: `dars_shared_views`.

---

## 5. Components & UI

### 5.1 Component Tree

```
CaseQueue.tsx (modified)
  |-- ViewDensityToggle.tsx              (table | card toggle)
  |-- CaseSearch.tsx                     (unified search bar)
  |   `-- SearchResults.tsx              (results dropdown panel)
  |-- ActiveFilters.tsx                  (removable filter chips)
  |-- SavedViewManager.tsx               (view selector dropdown)
  |-- CaseListTable.tsx                  (main table -- rendered when density = "table")
  |   |-- CaseListTableHeader.tsx        (sortable/filterable column headers)
  |   `-- CaseListTableRow.tsx           (single row, virtual-scrolled)
  |       |-- ServiceIconGrid.tsx        (compact service icon cell)
  |       |-- CHIBadge                   (from Phase 2 components)
  |       `-- ComplexityIndicator        (from Phase 2 components)
  |-- ColumnCustomizer.tsx               (dialog to add/remove/reorder columns)
  `-- [existing card view]               (rendered when density = "card")
```

### 5.2 CaseListTable.tsx

Main table container with:
- Virtualized row rendering (react-window or @tanstack/react-virtual) for smooth scrolling at 200+ rows.
- Horizontal scroll when total column width exceeds viewport.
- Sticky first column (Request #) during horizontal scroll.
- Sticky header row during vertical scroll.
- Row height: 36px (compact density).
- Alternating row backgrounds: white / slate-50.
- Row hover: slate-100 background.
- Row click: navigates to case detail (same as card click -- calls `onCaseSelect`).

### 5.3 CaseListTableRow.tsx

Single row renderer. Responsibilities:
- Map each visible `ColumnDefinition` to a table cell.
- Delegate to custom renderers based on `renderAs`:
  - `CHIBadge`: colored circle with number (1=red, 2=orange, 3=yellow, 4=green, 5=blue).
  - `ComplexityIndicator`: text badge with tier color.
  - `IdentifierSummary`: `"4 (+1)"` where supplemental count is muted text.
  - `FinancialPenaltyIcon`: AlertTriangle icon when `hasFinancialPenalty` is true, empty otherwise.
  - `BlockerTags`: horizontal list of small tags, truncated with "+N more" tooltip.
  - `ServiceIconGrid`: see section 5.5.
  - `AgingStateBadge`: colored text -- Green/Yellow/Red/Overdue.
  - `TriageInfo`: date + "by [name]", or "--" if not triaged.
- Identifier values (in search results and detail views) rendered in `font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace` for disambiguation.

### 5.4 CaseListTableHeader.tsx

Renders the `<thead>` with:
- Column label text.
- Sort indicator (arrow icon) for sortable columns.
- Filter dropdown trigger (funnel icon) for filterable columns; filled/colored when active.
- Column resize handle (drag border between headers).
- Right-click context menu: "Hide Column", "Sort Ascending", "Sort Descending", "Filter...".

### 5.5 ServiceIconGrid.tsx

Renders the compact service icon grid within a single table cell.

- Each of the 10 Microsoft services from `MICROSOFT_SERVICES_CONFIG` is represented by a small icon.
- Layout: 5-column x 2-row grid within the cell (each icon ~16x16px with 2px gap).
- Active services (present in case's `services[]` array): full color icon.
- Inactive services: not rendered (cell shows only active icons).
- Tooltip on hover over individual icon: service display name.
- Tooltip on hover over cell: comma-separated list of all active services.

Icon mapping (extends `microsoftServices.ts`):

| Service Key | Lucide Icon | Fallback Emoji |
|---|---|---|
| outlook | `Mail` | mail envelope |
| teams | `MessageSquare` | speech bubble |
| azure | `Cloud` | cloud |
| consumerIPHistory | `Globe` | globe |
| msaServicesUtilized | `BarChart3` | bar chart |
| enterprise | `Building2` | building |
| oneDriveSharePoint | `HardDrive` | hard drive |
| oneDriveConsumer | `FolderOpen` | folder |
| skype | `Phone` | phone |
| xbox | `Gamepad2` | gamepad |

### 5.6 CaseSearch.tsx

Unified search bar with:
- Text input with placeholder: "Search by request #, identifier, or contact..."
- Left-side icon: `Search`.
- Entity type indicator pill (auto-detected or manually selected): `Auto | Request | Identifier | Contact`.
- Debounced input (300ms) before search fires.
- Keyboard shortcut: `Ctrl+K` / `Cmd+K` to focus search.
- When multi-request is detected (comma/newline): chip count indicator "3 requests".
- Clear button (X) on the right when text is present.
- Results appear in `SearchResults.tsx` dropdown below.

### 5.7 SearchResults.tsx

Dropdown panel anchored below the search bar:
- Grouped by result type: "Cases", "Identifiers", "Contacts".
- Each result row shows:
  - Match icon (FileText for case, User for contact, Key for identifier).
  - Primary text (case ID or identifier value).
  - Context text (agency, request type, case count).
  - Action button (Pick / Release / View).
- Maximum 20 visible results; "Show all N results" link at bottom for pagination.
- Keyboard navigation: arrow keys to move, Enter to select, Escape to close.
- Empty state: "No results for [query]".

### 5.8 ColumnCustomizer.tsx

Modal dialog opened from a "Columns" button in the table toolbar:
- Left panel: list of all available columns with checkboxes for visibility.
- Right panel: ordered list of visible columns, drag-and-drop to reorder.
- Request # (`caseId`) checkbox is disabled (always visible, always first).
- "Reset to Default" button restores persona default columns.
- "Apply" saves and closes; "Cancel" discards changes.

### 5.9 ActiveFilters.tsx

Horizontal bar rendered between the search bar and the table:
- Each active filter renders as a chip: `[Column Label]: [value/operator] [X]`.
- Examples: `Country: United States [X]`, `CHI: > 3 [X]`, `Case Stage: In Progress, In Review [X]`.
- "Clear All" button on the right.
- If no filters are active, the bar is not rendered (zero height).

### 5.10 SavedViewManager.tsx

Dropdown component in the table toolbar:
- Current view name displayed in button text.
- Dropdown menu:
  - List of saved views (personal first, then shared with "Shared" badge).
  - Divider.
  - "Save Current View" (opens name input).
  - "Save As..." (duplicate current view with new name).
  - "Share View" toggle (only for views the user owns).
  - "Set as Default" option.
  - "Delete View" (with confirmation).

### 5.11 ViewDensityToggle.tsx

Toggle button pair in the case list header:
- Table icon (active when density = "table"): `LayoutList` or `Table2` from lucide.
- Card icon (active when density = "card"): `LayoutGrid` or `Rows3` from lucide.
- Active button has filled background; inactive is outline.
- Switching preserves: search text, active filters, sort order.
- Density preference stored in `localStorage` key: `dars_view_density`.

### 5.12 ASCII Wireframe -- Table Layout

```
+-----------------------------------------------------------------------------------+
| Case List                                               [Table|Card] [Columns] [Views v] |
+-----------------------------------------------------------------------------------+
| [Search by request #, identifier, or contact...  ] [Auto v]                       |
+-----------------------------------------------------------------------------------+
| Country: United States [x]  |  Case Stage: In Progress [x]  |  [Clear All]       |
+=====+=====+=====+======+========+===========+=======+========+======+======+=======+
| Req#| CHI | Cmx | IDs  |Country | Req Type  |Agency | Rcvd   | Due  | DDL  | Svcs  |
+=====+=====+=====+======+========+===========+=======+========+======+======+=======+
|LNS-|  1  | VHi | 4(+1)|US      |Emerg Req  |FBI    |Jan 19  |Jan 20|SLA   |[icons]|
|2025-|     |     |      |        |           |       |        |      |      |       |
|00142|     |     |      |        |           |       |        |      |      |       |
+-----+-----+-----+------+--------+-----------+-------+--------+------+------+-------+
|LNS-|  2  | Hi  | 2(+0)|CA      |Emerg Disc |RCMP   |Jan 18  |Jan 21|Court |[icons]|
|2025-|     |     |      |        |           |       |        |      |      |       |
|00138|     |     |      |        |           |       |        |      |      |       |
+-----+-----+-----+------+--------+-----------+-------+--------+------+------+-------+
|LNS-|  3  | Med | 1(+0)|UK      |Preserv Req|NCA    |Jan 15  |Jan 25|SLA   |[icons]|
|2025-|     |     |      |        |           |       |        |      |      |       |
|00125|     |     |      |        |           |       |        |      |      |       |
+-----+-----+-----+------+--------+-----------+-------+--------+------+------+-------+
|                         ... (virtual scroll) ...                                  |
+-----------------------------------------------------------------------------------+
| Showing 142 of 207 cases                                          [<  1 2 3 ... >]|
+-----------------------------------------------------------------------------------+

Row height: 36px  |  Sticky: column 1 (Req#) + header row
Font for IDs: JetBrains Mono / Fira Code (disambiguated)
```

---

## 6. Files to Create

| File Path | Purpose |
|---|---|
| `src/components/case-list/CaseListTable.tsx` | Main table component with virtual scrolling, sticky header/column, horizontal scroll |
| `src/components/case-list/CaseListTableRow.tsx` | Single row renderer with custom cell renderers |
| `src/components/case-list/CaseListTableHeader.tsx` | Sortable/filterable column header row with resize handles |
| `src/components/case-list/ColumnCustomizer.tsx` | Modal dialog for column visibility and reorder (drag-and-drop) |
| `src/components/case-list/ServiceIconGrid.tsx` | Compact 5x2 icon grid for Microsoft services column |
| `src/components/case-list/ActiveFilters.tsx` | Removable filter chip bar above the table |
| `src/components/case-list/SavedViewManager.tsx` | Dropdown for saved view CRUD and sharing |
| `src/components/case-list/ViewDensityToggle.tsx` | Table/card toggle button pair |
| `src/components/search/CaseSearch.tsx` | Unified search bar with auto-detect entity type |
| `src/components/search/SearchResults.tsx` | Search results dropdown with grouped results and actions |
| `src/hooks/useColumnConfig.ts` | Column visibility, order, width state management (localStorage-persisted) |
| `src/hooks/useCaseSearch.ts` | Search text, entity type detection, result fetching, loading state |
| `src/hooks/useSavedViews.ts` | Saved view CRUD, share, set-default operations (localStorage) |
| `src/types/listViewTypes.ts` | TypeScript interfaces: ColumnDefinition, SavedView, ActiveFilter, SearchQuery, SearchResult |
| `src/constants/defaultColumns.ts` | Default column definitions per persona (RS default, Lead default, Manager default) |

---

## 7. Files to Modify

### 7.1 `src/components/CaseQueue.tsx`

Current state: renders card-based case list with search input, assignment filter, and sort dropdown.

Changes:
1. Import `ViewDensityToggle`, `CaseListTable`, `CaseSearch`, `ActiveFilters`, `SavedViewManager`, `ColumnCustomizer`.
2. Add state: `viewDensity: "table" | "card"` (initialized from localStorage).
3. Replace existing `<input>` search with `<CaseSearch>` component.
4. Add `<ViewDensityToggle>` to case list header, next to existing buttons.
5. Add `<ActiveFilters>` between search bar and content area.
6. Add `<SavedViewManager>` to toolbar.
7. Conditionally render:
   - `viewDensity === "table"` -> `<CaseListTable cases={sortedCases} onCaseSelect={onCaseSelect} />`
   - `viewDensity === "card"` -> existing card grid (unchanged).
8. Pass filter state down to both views so switching preserves filters.

### 7.2 `src/config/microsoftServices.ts`

Current state: `MicrosoftService` interface has optional `icon?: string` field, currently set to emoji strings.

Changes:
1. Add `lucideIcon` property to `MicrosoftService` interface:
   ```typescript
   export interface MicrosoftService {
     key: string;
     name: string;
     description: string;
     icon?: string;           // existing emoji fallback
     lucideIcon: string;      // lucide-react icon name for ServiceIconGrid
   }
   ```
2. Update each service config entry with the `lucideIcon` value:
   - `outlook`: `"Mail"`
   - `teams`: `"MessageSquare"`
   - `azure`: `"Cloud"`
   - `consumerIPHistory`: `"Globe"`
   - `msaServicesUtilized`: `"BarChart3"`
   - `enterprise`: `"Building2"`
   - `oneDriveSharePoint`: `"HardDrive"`
   - `oneDriveConsumer`: `"FolderOpen"`
   - `skype`: `"Phone"`
   - `xbox`: `"Gamepad2"`

---

## 8. Mock Data -- Search Scenarios

These mock scenarios drive prototype demos and unit tests.

### Scenario 1: Single Request Search

```
Input:   "LNS-2025-00138"
Detected: entityType = "request"
Results: [
  {
    type: "case",
    caseId: "LNS-2025-00138",
    matchContext: "LNS-2025-00138 -- RCMP, Emergency Disclosure, 2 identifiers, In Progress",
    agencyName: "RCMP",
    requestType: "Emergency Disclosure"
  }
]
```

### Scenario 2: Multi-Request Search

```
Input:   "LNS-2025-00138, LNS-2025-00142"
Detected: entityType = "request" (multi)
Results: [
  {
    type: "case",
    caseId: "LNS-2025-00138",
    matchContext: "LNS-2025-00138 -- RCMP, Emergency Disclosure, In Progress",
    agencyName: "RCMP",
    requestType: "Emergency Disclosure"
  },
  {
    type: "case",
    caseId: "LNS-2025-00142",
    matchContext: "LNS-2025-00142 -- FBI, Emergency Request, Waiting on Triage",
    agencyName: "FBI",
    requestType: "Emergency Request"
  }
]
```

### Scenario 3: Identifier Cross-Reference Search

```
Input:   "dale.ayers@outlook.com"
Detected: entityType = "identifier"
Results: [
  {
    type: "identifier",
    identifierValue: "dale.ayers@outlook.com",
    caseId: "LNS-2025-00138",
    matchContext: "Found in LNS-2025-00138 -- RCMP, Emergency Disclosure",
    agencyName: "RCMP",
    requestType: "Emergency Disclosure",
    caseCount: 3
  },
  {
    type: "identifier",
    identifierValue: "dale.ayers@outlook.com",
    caseId: "LNS-2025-00142",
    matchContext: "Found in LNS-2025-00142 -- FBI, Emergency Request",
    agencyName: "FBI",
    requestType: "Emergency Request",
    caseCount: 3
  },
  {
    type: "identifier",
    identifierValue: "dale.ayers@outlook.com",
    caseId: "LNS-2025-00119",
    matchContext: "Found in LNS-2025-00119 -- BKA, Emergency Request",
    agencyName: "BKA",
    requestType: "Emergency Request",
    caseCount: 3
  }
]
```

### Scenario 4: Fuzzy Text Search

```
Input:   "FBI"
Detected: entityType = "auto" (fuzzy)
Results: [
  {
    type: "case",
    caseId: "LNS-2025-00142",
    matchContext: "LNS-2025-00142 -- FBI (agencyName match), Emergency Request, US",
    agencyName: "FBI",
    requestType: "Emergency Request"
  },
  {
    type: "case",
    caseId: "LNS-2025-00151",
    matchContext: "LNS-2025-00151 -- FBI Denver Field Office (agencyName match), Search Warrant, US",
    agencyName: "FBI Denver Field Office",
    requestType: "Search Warrant"
  }
]
```

---

## 9. State Management

### 9.1 `useColumnConfig` Hook

```typescript
interface UseColumnConfigReturn {
  /** Current column definitions in display order */
  columns: ColumnDefinition[];

  /** Visible columns only, in display order */
  visibleColumns: ColumnDefinition[];

  /** Toggle a column's visibility */
  toggleColumn: (columnId: string) => void;

  /** Reorder columns (move columnId to newIndex) */
  reorderColumn: (columnId: string, newIndex: number) => void;

  /** Resize a column */
  resizeColumn: (columnId: string, newWidth: number) => void;

  /** Reset to persona default */
  resetToDefault: (persona?: string) => void;

  /** Apply a saved view's column config */
  applyViewColumns: (columns: ColumnDefinition[]) => void;
}
```

- Persisted to `localStorage` key: `dars_column_config_${userId}`.
- Initialized from `defaultColumns.ts` based on user persona on first load.
- Column changes are debounce-persisted (500ms) to avoid excessive writes.

### 9.2 `useCaseSearch` Hook

```typescript
interface UseCaseSearchReturn {
  /** Current search query state */
  query: SearchQuery;

  /** Update search text (triggers auto-detect + debounced search) */
  setSearchText: (text: string) => void;

  /** Override auto-detected entity type */
  setEntityType: (type: SearchQuery["entityType"]) => void;

  /** Clear search */
  clearSearch: () => void;

  /** Whether the search results panel is open */
  isResultsPanelOpen: boolean;

  /** Close results panel */
  closeResultsPanel: () => void;
}
```

- Debounce: 300ms after last keystroke before firing search.
- Auto-detection runs synchronously on each keystroke to update the entity type indicator pill in real time.
- Search execution is async (simulated 200ms delay in prototype).
- Results panel auto-opens when results arrive, closes on Escape or click-outside.

### 9.3 `useSavedViews` Hook

```typescript
interface UseSavedViewsReturn {
  /** All available views (personal + shared) */
  views: SavedView[];

  /** Currently active view (null = unsaved/default) */
  activeView: SavedView | null;

  /** Create a new view from current state */
  createView: (name: string, config: Omit<SavedView, "id" | "createdBy" | "updatedAt">) => SavedView;

  /** Update an existing view */
  updateView: (id: string, updates: Partial<SavedView>) => void;

  /** Delete a view */
  deleteView: (id: string) => void;

  /** Set a view as the active view (applies its config) */
  activateView: (id: string) => void;

  /** Toggle the shared flag on a view */
  toggleShare: (id: string) => void;

  /** Set a view as the default for this persona */
  setAsDefault: (id: string) => void;
}
```

- localStorage keys:
  - Personal views: `dars_saved_views_${userId}`
  - Shared views: `dars_shared_views`
- On load: merge personal + shared views, deduplicate by `id`.
- Default view: if user has a view with `isDefault: true`, load it. Otherwise, load persona defaults from `defaultColumns.ts`.

### 9.4 View Density

- Stored in `localStorage` key: `dars_view_density`.
- Values: `"table"` | `"card"`.
- Default: `"card"` (preserves current behavior for users who haven't toggled).
- Read on mount in `CaseQueue.tsx`, updated via `ViewDensityToggle`.

---

## 10. Edge Cases

### 10.1 Empty State

When the table has zero cases after filtering:
- Display a centered message within the table body area: "No cases match your filters."
- Below the message: "Try adjusting your filters or [Clear All Filters] to see all cases."
- The header row and filter chips remain visible.

### 10.2 Column Overflow / Horizontal Scroll

- When total column width exceeds the viewport, a horizontal scrollbar appears.
- The first column (Request #) is sticky (`position: sticky; left: 0; z-index: 10`) with a subtle right-edge shadow to indicate more content.
- The header row is sticky (`position: sticky; top: 0; z-index: 20`).
- The intersection cell (top-left corner) has `z-index: 30`.

### 10.3 Long Text Truncation

| Column | Behavior |
|---|---|
| Current Blockers | Show first 2 tags inline; overflow as "+N more" with tooltip listing all |
| Agency Name | Truncate with ellipsis at column width; full text in tooltip |
| Nature of Crime | Not displayed in table (available in card view / detail) |
| Request # | Never truncated (column width accommodates longest format) |

### 10.4 Service Icons at Scale

- If a case has all 10 services, the 5x2 grid renders within the 36px row height (16px icons + 2px gap + 2px padding = 36px).
- If the cell is too narrow (user resized column below 80px), switch to a count display: "6 svcs" with full icon grid in tooltip.

### 10.5 Identifier Search Returning Large Result Sets

- If identifier search returns more than 20 cases, paginate results in the `SearchResults.tsx` dropdown.
- Show first 20, with a "Show all N results" link.
- Clicking "Show all" expands the results panel to a full-width overlay (same as a mini-table) with virtual scrolling.

### 10.6 Disambiguated Monospace Font

- Apply `font-family: "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace` to:
  - Request # column cells in the table.
  - Identifier values in search results.
  - Identifier values in the case detail view (existing `CaseCardDetails.tsx`).
- CSS custom property: `--font-identifier: "JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", monospace;`
- Load JetBrains Mono from Google Fonts (or bundle woff2) as primary choice.
- Rationale: distinguishes visually confusable characters (l vs I vs 1, O vs 0, rn vs m) critical for Response Specialists verifying identifier accuracy.

### 10.7 Phase 2 Unavailable

- If `chi` is `undefined` or `null`: render CHI column cell as `--` (muted text).
- If `complexityTier` is `undefined`: render Complexity column cell as `--`.
- Sorting on these columns treats undefined as lowest priority (sorted last in ascending, first in descending).

### 10.8 Browser Resize / Responsive Behavior

- At viewport widths below 1024px: auto-hide columns marked `visible: false` in defaults and show a "N columns hidden" indicator.
- The table is designed for desktop RS workstations (typically 1920px+ monitors). Mobile is not a target.

---

## 11. Acceptance Criteria

| # | Criterion | Verification |
|---|---|---|
| AC-1 | Table view renders all 20+ columns with correct data from `CaseQueueItem` | Visual inspection: every column defined in section 4.1 displays its corresponding data |
| AC-2 | Toggle between table and card view preserves filter state, search text, and sort order | Set filters + search, toggle to card and back; all state retained |
| AC-3 | Click column header cycles: ascending -> descending -> unsorted | Click Request Type header 3 times; observe sort indicator and row order change |
| AC-4 | Column customizer: drag to reorder, toggle to show/hide; Request # cannot be hidden | Open customizer, uncheck Country (disappears), drag Agency before Date Received (order changes), attempt to uncheck Request # (disabled) |
| AC-5 | Service icons render compactly in a grid with tooltip on hover | Hover over service icons cell; tooltip shows "Outlook, Teams, Azure" |
| AC-6 | Identifier count shows "4 (+1)" format (original + supplemental) | Case with 4 original + 1 supplemental shows `4 (+1)` in Identifiers column |
| AC-7 | Search by LNS/LENS number finds exact case | Type "LNS-2025-00138" in search bar; results show exactly that case |
| AC-8 | Paste multiple LNS numbers (comma-separated) finds all matching cases | Paste "LNS-2025-00138, LNS-2025-00142"; results show both cases |
| AC-9 | Search by email finds all cases containing that identifier | Type "dale.ayers@outlook.com"; results list 3 cases with agency context |
| AC-10 | Search results show agency name and case context | Each search result row displays agency, request type, and case stage |
| AC-11 | Active filter chips appear above table and are individually removable | Set Country = US; chip "Country: United States [x]" appears; click x removes it |
| AC-12 | Saved view persists columns + filters + sort to localStorage | Create view "My Emergency Cases", reload page, select view; all config restored |
| AC-13 | Financial penalty column shows warning icon for flagged cases | Case with `hasFinancialPenalty: true` shows AlertTriangle icon in cell |
| AC-14 | Aging state renders with color coding (Green/Yellow/Red/Overdue) | Cases with different aging states show corresponding text colors |
| AC-15 | Identifier values rendered in disambiguated monospace font | Request # column and identifier values in search results use JetBrains Mono / Fira Code |

---

## 12. Cross-References

| Reference | Relevance |
|---|---|
| **Parent Roadmap** | DARS Case Operations & Workforce Intelligence Roadmap, Phase 3 |
| **DARS_Case_List_View_Product_Spec.md** | Primary source document (entire document). Located at `src/DARS_Case_List_View_Product_Spec.md` |
| **Phase 1 Spec** | Persona system and enriched data model (prerequisite for extended `CaseQueueItem` fields) |
| **Phase 2 Spec** | CHI scoring and complexity tiers (optional dependency; graceful degrade if absent) |
| **Workshop Transcript** | Dale Ayers and David Large, Response Specialists (GMT team). Key quotes: |
|  | -- Dale: "Having it in a compact one-liner like this is definitely helpful when there's volume." |
|  | -- Dale: "If I could just paste a bunch of LNS numbers and find them all at once, that would save me a lot of time." |
|  | -- David: "The biggest pain is when I get an identifier and I need to know if it's already in another case. I have to search one by one." |
|  | -- Dale: "I can't tell the difference between a lowercase L and an uppercase I in these identifiers. A monospace font would help a lot." |
| **Existing Components** | `src/components/CaseQueue.tsx`, `src/components/case-queue/CaseCardDetails.tsx`, `src/components/case-queue/case-queue-types.ts` |
| **Service Config** | `src/config/microsoftServices.ts` -- 10 service definitions with emoji icons (to be extended with lucide icon names) |

---

## Appendix A: Default Column Sets by Persona

### Response Specialist (RS) Default

Visible columns (in order): Request #, CHI, Complexity, Identifiers, Country, Request Type, Agency, Date Received, Date Due, Deadline Type, Financial Penalty, Services, Age (Days), Assigned To, Case Stage, Aging State.

Hidden by default: Category/Sub-Type, Queue, Current Blockers, Triage Completed, Priority, Auth Desired Status.

### Team Lead Default

Visible columns (in order): Request #, CHI, Assigned To, Case Stage, Aging State, Age (Days), Country, Request Type, Agency, Date Due, Deadline Type, Current Blockers, Services.

### Manager Default

Visible columns (in order): Request #, CHI, Complexity, Assigned To, Case Stage, Aging State, Age (Days), Country, Agency, Financial Penalty, Current Blockers.

---

## Appendix B: localStorage Schema

```
Key                                  Value Type       Description
---                                  ----------       -----------
dars_view_density                    string           "table" | "card"
dars_column_config_{userId}          JSON string      ColumnDefinition[]
dars_saved_views_{userId}            JSON string      SavedView[]
dars_shared_views                    JSON string      SavedView[]
dars_active_view_{userId}            string           SavedView.id or null
```

---

## Appendix C: Dependency Additions

| Package | Purpose | Version |
|---|---|---|
| `@tanstack/react-virtual` | Virtual scrolling for large table row sets | ^3.x |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag-and-drop for column reorder in ColumnCustomizer | ^6.x |

No other new runtime dependencies. All icons use the existing `lucide-react` package. Fonts loaded via Google Fonts CDN or self-hosted woff2.
