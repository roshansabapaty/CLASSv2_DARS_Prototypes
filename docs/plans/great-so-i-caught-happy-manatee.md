# Case List — Outlook-style view modes (Cards / List / Preview pane)

**Project:** DARS_EEVIDENCE (`c:\R\DARS_EEVIDENCE`)
**Scope:** Add an Outlook-style view-mode toggle to the Case List page. The RS chooses between three modes — **Cards** (current), **Detailed list** (compact rows), and **Preview pane** (list on left + selected-case preview on right) — and the choice persists across sessions.
**Status:** Ready to implement
**Created:** 2026-05-18

> Historical: the prior planning session shipped the WCAG 2.1 AA a11y + usability remediation (Tracks 1–6). Its plan is archived at [`a11y-and-usability-remediation-tracks-1-6.md`](./a11y-and-usability-remediation-tracks-1-6.md).

## Context

The Case List page currently renders every case as a wide visual card with priority rail, multi-row badge groups, property grid, and right-aligned actions ([CaseQueue.tsx:514-575](src/components/CaseQueue.tsx#L514)). The layout is information-rich but space-hungry — a 1080p viewport fits ~3 cases at once, and there's no way for an RS to scan a dozen cases at a glance.

Outlook solves this with a **view toggle**: the user picks Compact / Single-line / Reading-pane to match the task. We adopt the same idea for the Case List:

- **Cards** (default) — the existing rich layout. Best for triage decisions where the full context matters.
- **Detailed list** — one tabular row per case (case ID · priority · stage · country · assignee · due date · actions). Best for sweeping the queue.
- **Preview pane** — a compact list on the left ~40% of the page + a resizable right-side **case preview panel** showing the selected case's StickyCaseHeader-style summary, top correspondence, and primary actions. Best for "scan and decide" without leaving the queue.

The choice persists per user via localStorage so reopening the app lands on the last-used mode.

## What we'll reuse

- **`Resizable` + `useKeyboardResize`** — the side-panel pattern shared by [DocumentViewerPanel](src/components/DocumentViewerPanel.tsx) and [CorrespondencePanel](src/components/correspondence/CorrespondencePanel.tsx). The preview pane is the same `re-resizable` + left-handle setup with `aria-valuenow` and arrow-key resize.
- **`useFocusRestoration`** — restores focus to the previously-active row when the preview pane closes or the user switches view modes.
- **`StatusAnnouncer` / `useStatusAnnouncer`** — announce view-mode changes politely ("Switched to detailed list view. 14 cases.").
- **CaseQueueItem fields** — every field needed already exists on [case-queue-types.ts:28-63](src/components/case-queue/case-queue-types.ts#L28). No type changes.
- **Existing filter / sort / search state in [CaseQueue.tsx:172-297](src/components/CaseQueue.tsx)** — `searchTerm`, `quickFilter`, `caseStatusFilter`, `countryFilter`, `requestTypeFilter`, `slaTierFilter`, `sortBy`. The toggle drops in beside them; filtering logic is shared across all three view modes.
- **Sub-components** — `CaseCardHeader`, `CaseCardOperationalBadges`, `CaseCardDetails`, `CaseCardActions` stay as-is for Cards mode. Detailed list + Preview pane build new compact row components.
- **`ACTIVE_APP_STORAGE_KEY` pattern** at [App.tsx:46-50](src/App.tsx#L46) — same `localStorage.getItem` + validate + default approach for a new `dars.caseQueue.viewMode` key.

## Approach

### 1. View-mode state + persistence

```ts
// CaseQueue.tsx
type CaseListViewMode = "cards" | "list" | "preview";
const VIEW_MODE_STORAGE_KEY = "dars.caseQueue.viewMode";

const [viewMode, setViewModeRaw] = useState<CaseListViewMode>(() => {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (v === "cards" || v === "list" || v === "preview") return v;
  } catch { /* localStorage may be blocked */ }
  return "cards";
});
const setViewMode = (next: CaseListViewMode) => {
  setViewModeRaw(next);
  try { localStorage.setItem(VIEW_MODE_STORAGE_KEY, next); } catch {}
  announceStatus(`Switched to ${VIEW_MODE_LABEL[next]} view`);
};
```

Mirrors the activeApp pattern at App.tsx:46.

### 2. View-mode toggle in the filter toolbar

Add a 3-button icon group to the right of the existing sort dropdown (or wherever the filter row ends). Each button uses a `lucide-react` icon and is keyboard-tabbable:

| Mode | Icon | aria-label |
|---|---|---|
| Cards | `LayoutGrid` | "Card view" |
| Detailed list | `List` (or `Rows3`) | "Detailed list view" |
| Preview pane | `PanelRight` (or `Columns2`) | "Preview pane view" |

Visual: a single rounded chip with the three icons inside, the active one filled with brand background. Press behavior: `aria-pressed={viewMode === "cards"}` etc. Tooltip on each button names the mode + shortcut hint (`Ctrl+1/2/3`).

### 3. Detailed-list row component — new file

**`src/components/case-queue/CaseQueueListRow.tsx`**

One CSS grid row per case. Density: ~48 px tall. The row carries a 4 px priority-colored left rail as visual chrome (matches the Card border-l-4) plus the seven content columns defined by the spec:

| # | Column | Width | Content |
|---|---|---|---|
| 1 | **Case ID** | 1.1fr | `<CopyableText>`-wrapped ID, mono, semibold |
| 2 | **Priority** | auto | P0/P1/P2 chip (icon + text — already token-paired by Track 3 of the a11y plan) |
| 3 | **Due date** | 1fr | `<SlaDeadlineChip>` (reused from [src/components/sla/SlaDeadlineChip.tsx](src/components/sla/SlaDeadlineChip.tsx)) — live-ticks and changes color as the SLA window narrows |
| 4 | **Country** | 0.9fr | `country` · `jurisdiction` (e.g., "Germany · National") |
| 5 | **Identifiers** | auto | `<Users className="w-3 h-3" />` + `identifierCount` (numeric, with breakdown tooltip pulled from `identifierTypes`) |
| 6 | **LE-requested services** | 1.3fr | Inline chips for `servicesRequested`. Azure is sorted first (current convention from `CaseCardOperationalBadges.tsx:47-51`) and shows the `Cloud` icon; the rest render as compact text chips. Overflow as "+N more" with the full list in a tooltip when the row width forces it. |
| 7 | **Stage** | 0.9fr | Case-stage badge — same visual as the Card's stage chip |

Row markup: `<div role="row">` inside `<div role="table" aria-rowcount={N} aria-colcount={7}>`; columns get `role="gridcell"`. The whole row is keyboard-activatable (`tabIndex={0}`, Enter/Space opens the case — mirroring the Card's pattern landed in Track 1). No inline action buttons; opening the row is the primary action and `Pick`/`Release` move to the case page itself. This keeps the row clean and matches Outlook's pattern where mail rows don't expose Reply/Forward inline.

Responsive collapse:
- Below 1280 px — drop the **LE-requested services** column (it's the most expressive; the others stay readable).
- Below 1024 px — additionally drop **Country** and **Identifiers**.
- Below 768 px — only Case ID + Priority + Due Date + Stage remain.

Each hidden column appears in a per-row tooltip on hover/focus so the information isn't lost on small screens.

### 4. Preview-pane mode — split layout + new pane component

**Layout:**
```
┌────────────────────────────┬───────────────────────┐
│ List (left)                │ CasePreviewPane       │
│ flex-1, min-w-[320px]      │ Resizable, 420-720px  │
│ — vertical scroll          │ — vertical scroll     │
│ — denser rows (~40px)      │   anchored top        │
└────────────────────────────┴───────────────────────┘
```

The left list uses the same `CaseQueueListRow` component but with a `dense` prop that drops **LE-requested services**, **Country**, and **Identifiers** (keeping just Case ID + Priority + Due Date + Stage) and tightens padding. Those dropped columns are surfaced inside the preview pane on the right, so the information is still one click away. Each row is clickable and the **selected** row gets `aria-current="true"` + a brand-tint background + thicker left rail.

**`src/components/case-queue/CaseQueuePreviewPane.tsx`** — new component:
- Wraps `Resizable` with the same handle pattern as [CorrespondencePanel.tsx:415-465](src/components/correspondence/CorrespondencePanel.tsx#L415). Width state lifts to CaseQueue.
- Header: case ID + priority chip + stage badge + "Open case" primary button.
- Body sections (vertically stacked, each collapsible):
  - **Snapshot** — pulls a subset from CaseQueueItem (request type, country, jurisdiction, assignee, due date, identifier count, services chips). Use the same visual vocabulary as [StickyCaseHeader](src/components/StickyCaseHeader.tsx).
  - **Operational badges** — reuse `CaseCardOperationalBadges` directly.
  - **Recent correspondence** — pull from `useCorrespondenceNotifications().perCase.get(caseId)`; show unread / pending counts + the newest unread inbound subject if present.
  - **Actions** — `CaseCardActions` rendered vertically (same component, different `orientation` prop).
- Close affordance: an X button in the header that returns to no-selection state.
- Empty state when no case selected: "Select a case to preview" with a hint icon.

The pane is keyboard-resizable via the shared `useKeyboardResize` hook (min 420, max 720, step 16, big-step 64 — same as the document panel).

### 5. Selected-case state + keyboard nav

```ts
const [selectedPreviewCaseId, setSelectedPreviewCaseId] = useState<string | null>(null);
```

In Preview mode, rows behave as a single-select list:
- Click selects (does NOT open the full case page) — the preview pane updates.
- "Open case" inside the preview pane is the explicit "go" action.
- ArrowDown / ArrowUp move the selection through filtered/sorted cases. Wraps at top/bottom.
- Enter on a row, or `O` key with the list focused, opens the case.
- Escape clears the selection (preview pane returns to empty state).

In Cards and Detailed-list modes, row click opens the case directly (the current behaviour).

### 6. Keyboard shortcuts for view-mode switching

Add to the existing keyboard-shortcuts modal:
- `Ctrl + 1` → Cards
- `Ctrl + 2` → Detailed list
- `Ctrl + 3` → Preview pane

Wire via a `useEffect` listening on `window keydown` at the CaseQueue level — debounce alongside the existing case-page Ctrl+S handler so we don't collide.

### 7. Empty-states + transitions

- **Detailed list with zero results** — same empty state as Cards, just rendered without grid wrapper.
- **Preview pane with zero filter results** — list shows empty state; pane shows "Apply different filters to preview a case."
- **Mode-switch transition** — no animation on view-mode change (instant swap). The case body's `marginRight` shrink/grow stays the same 300 ms transition as today.
- **Mobile / narrow viewport** — below 1024 px the Preview pane mode auto-falls-back to Detailed list. Toolbar button stays available but is disabled with a tooltip ("Resize wider to enable preview pane").

### 8. Accessibility

- View-mode buttons: `<button aria-pressed={isActive}>` inside a `role="group" aria-label="Case list view mode"`.
- Detailed list and preview list: `role="table"` (or `role="grid"` since rows are selectable) with `role="row"` + `role="cell"` markup; `aria-rowcount` + `aria-colcount` on the table.
- Selected row carries `aria-current="true"` (preview mode) or `aria-selected="true"` (preview mode treated as `role="grid"`).
- Resize handle: `useKeyboardResize` provides `role="separator"` + arrow-key resize.
- Preview pane Close button: `aria-label="Clear preview selection"`, restores focus to the last-selected row.
- View-mode changes are announced via `useStatusAnnouncer()` ("Switched to Detailed list. 14 cases.").

## Files modified / created

| File | Change |
|---|---|
| **new** `src/components/case-queue/CaseQueueListRow.tsx` | Compact one-row case display. Reused for detailed-list and preview-list. `dense` prop for the preview's narrower mode. |
| **new** `src/components/case-queue/CaseQueuePreviewPane.tsx` | Resizable right-side pane showing selected-case summary + correspondence + actions. |
| **new** `src/components/case-queue/CaseQueueViewToggle.tsx` | Three-button icon group with aria-pressed + tooltips. |
| [src/components/CaseQueue.tsx](src/components/CaseQueue.tsx) | Add `viewMode` + `selectedPreviewCaseId` + `previewPaneWidth` state with localStorage persistence; mount the toggle in the toolbar; branch on viewMode for the rendered list; add keyboard shortcuts; wire selection. |
| [src/components/case-queue/CaseCardActions.tsx](src/components/case-queue/CaseCardActions.tsx) | Reused unchanged in Cards mode (right column) and Preview pane (vertical stack inside the pane footer). Detailed-list rows have no inline actions — row click opens the case directly. |
| [src/components/KeyboardShortcutsModal.tsx](src/components/KeyboardShortcutsModal.tsx) | Document the new `Ctrl + 1 / 2 / 3` shortcuts. |
| `src/hooks/useFocusRestoration.ts` | Existing — reused. |
| `src/hooks/useKeyboardResize.ts` | Existing — reused. |
| `src/components/StatusAnnouncer.tsx` | Existing — reused. |

No type changes to `CaseQueueItem`. No changes to filter/sort logic.

## Verification

1. `npm run dev` (Vite on `http://127.0.0.1:3001`). HMR picks up new files.
2. **Cards mode (default after first install)** — open the queue, confirm the existing rich cards render unchanged. Verify focus rings + Enter open the case.
3. **Detailed list** — click the second toggle button. Cases render as one-line rows with all expected columns. Filter the queue; rows update. Tab through rows; arrow-key nav DOES NOT trigger here (only Tab); Enter opens the case.
4. **Preview pane** — click the third toggle button. The right pane shows "Select a case to preview." Click a row → pane populates. Resize the pane via the left-edge handle (drag); resize via keyboard (focus the handle, press ArrowLeft to widen, ArrowRight to shrink). Confirm `aria-valuenow` updates via DevTools.
5. **Keyboard shortcuts** — Ctrl+1/2/3 switches modes. The StatusAnnouncer announces each switch.
6. **Persistence** — switch to Detailed list, close the tab, reopen the app, confirm Detailed list is restored. Repeat for Preview pane.
7. **Filter compatibility** — apply a quick filter (e.g., "myCases"), switch modes; the filtered set carries through.
8. **Focus restoration** — open a case from any mode, return to the queue (via the queue nav rail), confirm focus lands back on the row that was opened.
9. **Mobile (narrow viewport)** — drag the browser to ~900 px wide while in Preview mode. The pane auto-collapses to Detailed list and the Preview toggle is disabled with the tooltip "Resize wider to enable preview pane."
10. **a11y sweep** — axe-core: each mode has zero `button-name` / `landmark-one-main` / `aria-required-attr` violations. Keyboard-only walk: every interactive element reachable.
11. **Vite transform pass** on every touched file → all `200`.

## Risks

- **Preview-pane width budget** — the preview pane plus the left LeftNavRail plus the list column needs enough viewport. Below 1024 px the layout is cramped; we auto-collapse. Mitigation: live measurement on resize via the existing `viewportWidth` pattern in [useDocumentViewer.ts:25-100](src/hooks/useDocumentViewer.ts).
- **Filter-row crowding** — the existing toolbar already has search + 5 dropdowns + sort. Adding 3 more buttons makes a 9-control toolbar. Mitigation: collapse less-used dropdowns behind an "Advanced filters" disclosure, OR place the view toggle on the FAR RIGHT of the row so it visually separates from filtering.
- **Selected-case state across mode switches** — when the user switches Preview → Cards, the selection is no longer visible. We keep `selectedPreviewCaseId` in state so re-entering Preview mode restores the selection. If the case was filtered out, the pane reverts to empty.
- **Localstorage availability** — embed-mode iframes may block localStorage. The state-reader catches the throw and falls back to the default ("cards"). No regression risk.
- **No inline actions in the detailed list** — Outlook-style detailed rows have no row-level Pick/Release/Open buttons; users must open the case to act. This is the right tradeoff for density but the RS team should validate during testing — if Pick/Release inline is high-frequency, we can add a trailing kebab-menu column without breaking the spec.

## Open questions — resolved 2026-05-18

- **Default view mode → Cards.** Least cognitive shift from today's app.
- **Multi-select → IN SCOPE for this PR.** Add a checkbox column to the Detailed-list + Preview-pane list rows, a sticky bulk-actions footer (Pick / Release / Assign), and bulk-action handlers wired through `setSharedFormData` or the existing per-case action callbacks.
- **Toggle scope → all three hero apps** (Queue, Attorney Dashboard, Notifications). Each surface persists its own `viewMode` preference under a distinct localStorage key (`dars.caseQueue.viewMode`, `dars.attorneyDashboard.viewMode`, `dars.notifications.viewMode`). The `CaseQueueViewToggle` component is generic enough to be reused — same 3-icon group, same shortcuts (Ctrl+1/2/3 active on the currently-visible hero app).
- **Return state → restore selection.** Track `lastSelectedCaseId` per surface. When the RS returns to the queue from a case, the previously-selected row is highlighted again and the preview pane re-populates. Focus also returns to that row.

## Scope expansion (post-decision)

- **New file** `src/components/case-queue/CaseQueueBulkActionsBar.tsx` — sticky footer that surfaces when one or more rows are selected. Shows "N selected" + the bulk action buttons + a "Clear selection" link. Pick / Release / Assign call into the existing case-mutation paths (currently in `CaseCardActions`); the bar fans those out across the selected IDs.
- **Selection state** in CaseQueue:
  - `bulkSelectedCaseIds: Set<string>` — multi-select state.
  - `selectedPreviewCaseId: string | null` — single-select preview state.
  - Both reset when the filter changes case-IDs out of the visible set.
- **Attorney Dashboard + Notifications** — apply the same view-toggle pattern (toggle in their toolbar, list rows mirroring `CaseQueueListRow`'s structure adapted for the dashboard's case shape). These surfaces don't necessarily need the Preview pane mode if their lists are short; if so, the toggle can hide the preview button on those surfaces.
