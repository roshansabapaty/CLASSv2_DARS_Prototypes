# RFC — Workflow nav as a Teams-style list pane

> Status: **Draft for review** · Spun out of [dars-teams-nav-alignment-rfc.md § 3.2](dars-teams-nav-alignment-rfc.md). Scope is narrowed to Layer 2 (workflow nav) of the 3-pane Teams model. Does not commit to a path yet — compares **Path A (workflow-only list pane)** to **Path B (workflow + case-switcher list pane)** and surfaces open questions to resolve before implementation.

---

## 1. Context

DARS today has two ways of rendering the case-form workflow nav:

- **Default**: [`WorkflowSidebar`](c:/R/DARS_eEvidence/src/components/WorkflowSidebar.tsx#L51) — 256 px vertical column on the left of the case page. Stages (Triage / Review Case / Collection) at the top, dynamic sub-step list below.
- **Behind `FF_STAGE_TAB_BAR`**: [`StageTabBar`](c:/R/DARS_eEvidence/src/components/layout/StageTabBar.tsx#L63) — horizontal pill strip inside [StickyCaseHeader](c:/R/DARS_eEvidence/src/components/StickyCaseHeader.tsx#L217). Same content, but ~40-80 px tall consuming workspace vertical.

Neither reads as a Microsoft Teams *list pane*. The default sidebar comes close in shape but is missing the scope-setting header, search affordance, and named-scope behavior that Teams users have learned to rely on. The flag variant breaks the list-pane model entirely — it's a content tab strip, not nav.

We're going to reshape Layer 2 into a proper Teams list pane. The choice on the table: do we ship a **workflow-only list pane** (Path A), or do we add a **case-switcher block at the top of the same pane** so users can move between in-flight cases without leaving (Path B)?

---

## 2. Teams list pane reference

Quick recap of what we're aligning to — the same model from the parent RFC, focused on the list pane specifically:

```
┌──────────────────────────────┐
│  SCOPE HEADER                │  ← 56 px · named scope ("Teams", "Chat", a channel name)
│  ┌────────────────────────┐  │   plus optional secondary action / context chips
│  │ 🔍 Search              │  │  ← 36 px · search/filter — appears when list is long
│  └────────────────────────┘  │
├──────────────────────────────┤
│  ▼ Group A                   │  ← collapsible group header
│     ● Item 1                 │   ← items render with status indicator
│     ○ Item 2                 │
│  ▼ Group B                   │
│     ● Item 3                 │
│     ○ Item 4                 │
│  ▶ Group C  (collapsed)      │
├──────────────────────────────┤
│  + New                       │  ← optional footer affordance
└──────────────────────────────┘
  280–320 px
```

Key list-pane principles (the ones Layer 2 must satisfy):

1. **Named scope at the top.** The pane is a *contextual* nav; the header tells the user what they're inside of.
2. **Search appears when the list is long enough to need it.** Not always-on chrome.
3. **Groups collapse independently.** State persists per scope.
4. **Items show status, not just labels.** Active / completed / pending each have a stable visual.
5. **Below a width threshold, the pane collapses to icon-only.** Click an icon to re-expand as an overlay.

---

## 3. Current state — what's in `WorkflowSidebar` today

From [src/components/WorkflowSidebar.tsx](c:/R/DARS_eEvidence/src/components/WorkflowSidebar.tsx):

| Section | Contents | Lines | Gap vs Teams |
|---|---|---|---|
| Top — Stage indicators | 3 buttons: Triage, Review Case, Collection. Active = blue fill; complete = green check; disabled = grayed. | 74-122 | No scope-naming context above; user has to infer "this is for this case." |
| Middle — Sub-steps | Scrollable list of `navState.steps` items. Each = numbered circle + label + optional description. Active = blue + left border; complete = green; future = gray. | 125-209 | No search, no grouping; long lists scroll without a label per stage. |
| Footer | Text badge: "Stage N of 3" | 211-222 | Redundant once a scope header is added. |

Shape close to a list pane, but the scope header and the search affordance are the two structural pieces missing. The sub-step list doesn't carry stage context either — you can be deep in the list and lose track of which stage you're in.

---

## 4. Design fundamentals (shared by both paths)

These are settled from the design-decisions review and apply equally to Path A and Path B:

### 4.1 When the pane appears

The workflow list pane is **contextual to the active case**, not global chrome. It mounts only when the user has a specific case open; the queue and other top-level surfaces continue to show the full-width workspace with no list pane.

| Surface (active app rail entry) | Pane state |
|---|---|
| Cases — queue list (no case open) | **Not mounted** — workspace fills the available width |
| Cases — case open (Triage / Review Case / Collection) | **Mounted** — shows that case's workflow |
| Attorney Dashboard | **Not mounted** |
| Attorney Review Workspace (one escalation open) | **Not mounted** in Path A. Could be added later as its own contextual pane. |
| Notifications | **Not mounted** |

ASCII layout summarising the two states on the Cases app:

```
Queue list (no case open):
┌─┬──────────────────────────────────────────┐
│A│  Workspace = the case queue grid          │
│ │                                           │
└─┴──────────────────────────────────────────┘
 48px                fills the rest

Case open:
┌─┬──────────────┬──────────────────────────┐
│A│  STAGES      │  Workspace = case form    │
│ │  (list pane) │   / collection tracker    │
│ │              │                           │
└─┴──────────────┴──────────────────────────┘
 48px   280px           fills the rest
```

This matches the Teams model — Teams' list pane appears for the channel list when you're on the Teams app rail entry, the chat list when you're in Chat, etc. The pane is scoped to whatever the active rail entry is showing context for.

**Mounting in `App.tsx`**: the pane wraps the same render branch as today's [`WorkflowSidebar`](c:/R/DARS_eEvidence/src/App.tsx#L505) (lines 505-533). That branch is gated on `activeApp === "queue" && selectedCaseId !== null`. Other branches (`activeApp === "attorneyDashboard"`, `"notifications"`, etc.) render the workspace without a sibling pane.

**Path B variation**: in Path B (case-switcher in pane), the pane would *also* mount on the queue list page — showing pinned / recent cases there even when no specific case is open. The workflow section appears only when a case is also open. See §6 for details.

### 4.2 Pane width

- **Default**: **280 px** (Teams' minimum list pane width). Was 256 in `WorkflowSidebar`; +24 px buys room for the named header and avoids per-row truncation on sub-step descriptions.
- **User-resizable**: a 1.5 px drag handle on the right edge lets the user widen or narrow the pane between **240 px and 480 px**, mirroring Teams' channel-list-pane resize affordance. Width persists per-user via localStorage (`dars.workflowListPane.width`). Double-click the handle resets to the default. When the handle is focused, ←/→ shift width ±8 px and Home/End jump to the bounds. The handle exposes `role="separator"` + `aria-orientation="vertical"` + live `aria-valuenow`/`min`/`max` so AT users get the resize affordance announced.
- **Narrow viewport** (< 1024 px wide): collapses to a **48 px icon column** showing the three stage icons + active indicator. Click an icon to expand the full pane as an overlay (positioned absolutely above the workspace, dismisses on outside click). Same pattern Teams uses on its meeting tablet layout.

### 4.3 Named header — two rows

```
┌────────────────────────────────┐
│ STAGES         📄  👥  ⋯       │  ← row 1: scope label (left) + action icons (right)
│ LNS-2026-00200  Routine · N. Garcia│  ← row 2: case-id chip · priority chip · RS assignee
└────────────────────────────────┘
```

- **Row 1** (~ 20 px): subtle uppercase label on the left, sets the scope. Text reads "STAGES" for the workflow-only path; "CASES" for the case-switcher path's outer scope (more on that in Path B). Right side hosts the stage-agnostic action icons — see §4.4.
- **Row 2** (~ 28 px): case-context chips. Mirrors the Teams "team-name" header treatment but compressed to fit DARS's denser case identity.

Total header height: **~ 56 px**.

### 4.4 Action placement — stage-agnostic actions inside the scope header

The right side of row 1 of the scope header hosts the case-level action buttons — actions that apply regardless of which stage / sub-step is active. Icon-only at the default 280 px pane width so they fit alongside the `STAGES` label without forcing a third row.

**What goes there:**

| Slot | Action | When enabled |
|---|---|---|
| Icon 1 | 📄 Document Panel toggle | Always |
| Icon 2 | 👥 Identifier Panel toggle | Always |
| Icon 3 | ⋯ Overflow menu | Always |

Overflow menu items (TBD list — confirm against current StickyCaseHeader inventory before implementation):
- Escalate to Attorney
- Reject Case
- Resolve Case

**Save + Submit live in the pane footer**, not in the scope header. They get text buttons (not icons) for prominence and to read as the primary call-to-action zone. See §4.8 Footer for the layout, button states, and a11y spec. The workspace's `StickyCaseHeader` no longer carries these buttons after Phase 1 lands — single home for each action.

**Accessibility — required for every icon button in this header**:

- **Visible hover tooltip**: each icon renders inside the existing shadcn [`Tooltip`](c:/R/DARS_eEvidence/src/components/ui/tooltip.tsx) primitive (same pattern as [`LeftNavRail`](c:/R/DARS_eEvidence/src/components/app-shell/LeftNavRail.tsx) icons). Tooltip text matches the screen-reader label exactly — sighted and AT users hear the same identifier.
- **`aria-label`**: each `<button>` carries an `aria-label` attribute (e.g. `aria-label="Open document panel"`) identical to its tooltip text.
- **Toggle state**: panel-toggle buttons (Document, Identifier) use `aria-pressed="true" | "false"` so AT announces the current open/closed state.
- **Overflow menu**: the `⋯` trigger uses `aria-haspopup="menu"` + `aria-expanded` reflecting the current state. Menu items get standard `role="menuitem"` (via the shadcn `DropdownMenu` primitive — same one used in [`AppHeader`](c:/R/DARS_eEvidence/src/components/AppHeader.tsx)).
- **Activation keys**: `Enter` and `Space` both activate each button (default `<button>` behavior — don't override). Overflow menu opens on Enter / Space on the trigger; arrow keys navigate items; `Esc` closes and returns focus to the trigger.
- **Focus order**: see §4.9 Keyboard nav — action icons join the Tab order between the scope header and the first stage group.

**At narrow viewport** (icon column collapse, §4.2): the action icons render on the right side of the **expanded overlay**, not the 48 px collapsed strip. The strip is for stage navigation only; the overlay re-exposes the action row when the user clicks any stage icon.

### 4.5 Stage grouping — user-controlled, last-state persisted

Each of the 3 stages renders as a collapsible group with its sub-steps nested below. The user can collapse or expand any stage independently; the collapse state for each `{caseId, stageKey}` pair is persisted in `localStorage` under a key like `dars.workflow-listpane.collapse.<caseId>` so it round-trips per session per case.

```
▼ TRIAGE                              ← collapsed/expanded chevron + stage label
   ✓ Case Identification              ← sub-step status: complete (green check)
   ✓ Legal & Compliance               ← complete
   ● Identifier & Data Services       ← active (blue ring + bold)
   ○ Non-Disclosure Workflow          ← future (numbered empty circle)

▶ REVIEW CASE                         ← collapsed (chevron right)

▶ COLLECTION                          ← collapsed
```

On first mount of a case the **active stage starts expanded** and the other two **start collapsed** (sensible default that matches "what does the user want to see first"). Subsequent toggles persist.

### 4.6 Search / filter

Appears at the top of the list area (below the header, above the first stage group) **only when the active case has > 5 sub-steps across all stages**. Typing filters sub-step items live; matched groups stay expanded; non-matched groups collapse temporarily without altering persisted state.

For ~80% of cases the sub-step list is short enough that the search row is suppressed — keeping the pane lean.

### 4.7 Sub-step status visuals

| State | Symbol | Color |
|---|---|---|
| Complete | `✓` checkmark | green (`#107c10`) |
| Active | `●` filled disc + bold label | brand blue (`#0078d4`) |
| Future / Not started | `○` numbered empty circle | neutral-foreground-3 (`#605e5c`) |
| Blocked / Error | `!` triangle | red (`#a4262c`) |

### 4.8 Footer — Save + Submit

The pane footer is the **single home for Save Draft + Submit Case**. Sticky to the bottom of the pane regardless of scroll position inside the stage list. Both render as text buttons (not icons) so they read as the primary call-to-action zone.

**Layout** (~ 56 px tall, 16 px padding):

```
┌────────────────────────────────────┐
│   [ Save Draft ]   [ Submit ]      │
└────────────────────────────────────┘
```

- **Save Draft** — secondary button (outline / `bg-white text-[#0078d4] border-[#0078d4]`), left-aligned.
- **Submit Case** — primary button (filled blue / `bg-[#0078d4] text-white`), right-aligned to anchor the call-to-action corner.
- Gap between buttons: ~ 12 px. Both buttons share the same height (~ 32 px) for visual symmetry.

**Button states**:

| State | Save Draft | Submit Case |
|---|---|---|
| Default | Enabled when form has unsaved changes. When no changes, button reads "Saved" and is non-interactive (or shows the last-saved timestamp in a tooltip on hover). | Enabled only when all required fields are valid for the current stage. Disabled otherwise. |
| Disabled | n/a (always usable / always informative) | Tooltip on hover lists the unfilled / invalid fields blocking submit, with a "Go to field" link to scroll the workspace to the first one. |
| Loading | Spinner + "Saving…" label; button disabled. | Spinner + "Submitting…" label; button disabled. |
| Error | Toast surfaces the error; button returns to Enabled. | Same as Save Draft. |

**A11y**:

- Save Draft `<button>` carries `aria-label="Save case as draft"`. When disabled in the "Saved" state, the tooltip also exposes via `aria-describedby`.
- Submit Case `<button>` carries `aria-label="Submit case for next stage"` (or "Submit case" when on the final stage). When disabled with validation errors, the blocking-fields list is exposed via `aria-describedby` on the button itself so screen readers read the reason on focus.
- Both buttons are reachable via Tab — see §4.9.
- Activation: `Enter` or `Space` (default `<button>` behavior).
- Focus indicator: standard 2 px brand-blue outline; don't override.

**Narrow viewport** (icon column collapse, §4.2): the footer is preserved in the expanded overlay. In the 48 px collapsed strip itself, neither button renders — the strip is stage-navigation only. Tapping any stage icon opens the overlay which re-exposes the footer.

**Path B variation**: Path B replaces the case-switcher's empty footer area with an "Open from queue…" link (see §6). The workflow pane's footer (Save + Submit) stays where it is — the case-switcher's affordance lives in the *case-switcher block's* footer, not the workflow block's.

**Implementation impact on workspace**: today's `StickyCaseHeader` carries Save and Submit. Phase 1.2 of the implementation plan (§8) removes them from there. The workspace becomes purely identity / status (case ID, priority, SLA timer, escalation chips) and content (the form / collection tracker). This is part of the broader chrome-consolidation thread tracked in the parent RFC's Layer 3 work; the pane footer move *is* Layer 3 of that work landing inside Layer 2's deliverable.

### 4.9 Keyboard nav

- **Tab** moves focus through, in DOM order: scope header text → action icon row (§4.4) → search input (if rendered) → stage group headers → sub-step items → Save Draft → Submit Case.
- **Arrow Up / Down** within the pane moves focus between sub-step items, skipping collapsed groups.
- **Enter** activates a sub-step (mirrors click) and activates focused action buttons.
- **Esc** when search is focused clears the filter and returns focus to the most recently active item; when the overflow menu is open, Esc closes the menu and returns focus to the `⋯` trigger.
- The pane sets `role="navigation"` with `aria-label="Case workflow"`. Stage group headers use `aria-expanded` on click. The action icons follow the a11y spec in §4.4.

---

## 5. Path A — workflow-only list pane

The pane scope is **the current case's workflow**, nothing else. The named header reads `STAGES` (row 1) + case-id + priority + assignee (row 2). Below the header sit the 3 collapsible stage groups with their sub-steps.

### Wireframe

```
┌────────────────────────────────┐
│ STAGES         📄  👥  ⋯       │  ← scope header: label + action icons (§4.4)
│ LNS-2026-00200  Routine · N.Garcia │  ← case context (§4.3)
├────────────────────────────────┤
│ ▼ TRIAGE                       │
│    ✓ Case Identification       │
│    ✓ Legal & Compliance        │
│    ● Identifier & Data Svcs    │
│    ○ Non-Disclosure Workflow   │
│                                │
│ ▶ REVIEW CASE                  │
│                                │
│ ▶ COLLECTION                   │
│                                │
├────────────────────────────────┤
│  [ Save Draft ]   [ Submit ]   │  ← sticky footer (§4.8)
└────────────────────────────────┘
```

### Pros

- Minimum surface area. One scope, one shape.
- Smallest change vs current `WorkflowSidebar`.
- Telemetry / a11y wiring stays simple — one named scope, one navigation landmark.
- Footer earns its keep — Save / Submit always reachable; workspace chrome lightens correspondingly.

### Cons

- Switching between in-flight cases still requires going back to the queue (browser back, queue tab, find case, click). Doesn't solve a pain point that's only going to grow as RS workloads scale.

### Effort

- ~3-5 dev days. Reshape `WorkflowSidebar` + write the new header sub-component + add localStorage hooks for stage collapse + retire `FF_STAGE_TAB_BAR` / delete `StageTabBar`.

---

## 6. Path B — workflow + case-switcher list pane

The pane has **two scopes** stacked vertically: an outer **case-switcher** block at the top (showing recent / pinned cases) and the **current case's workflow** below it. Mirrors Teams' team-list-at-top + channel-list-below pattern.

### Wireframe

```
┌────────────────────────────────┐
│ CASES                          │   ← outer scope label
│  ★ LNS-2026-00200  ◀ active    │   ← currently-open case (highlighted)
│    LNS-2026-00270              │   ← recently viewed
│    LNS-2026-00250              │
│    LNS-2026-00190              │
│  + Open from queue…            │   ← case-switcher block footer
├────────────────────────────────┤
│ STAGES         📄  👥  ⋯       │   ← inner scope + action icons (§4.4)
│ LNS-2026-00200  Routine · N.Garcia │   ← case context (§4.3)
├────────────────────────────────┤
│ ▼ TRIAGE                       │
│    ✓ Case Identification       │
│    …                           │
│ ▶ REVIEW CASE                  │
│ ▶ COLLECTION                   │
├────────────────────────────────┤
│  [ Save Draft ]   [ Submit ]   │   ← workflow-block footer (§4.8)
└────────────────────────────────┘
```

### Pros

- Solves the "I'm working 3 cases in parallel and have to leave to switch" pain point that we've heard in informal RS feedback.
- Maps more literally to Teams' nav model (outer scope + inner scope in a single pane).
- Footer slot earns its keep — "Open from queue…" jumps to the full Case Queue when the user can't find the case among the recents.

### Cons

- More design surface: how many recents pin? what's the pinning rule (recently-viewed vs assignee-owned vs starred)? what happens when the user clicks a recent case — does the workspace switch atomically, or do we prompt to save unsaved edits?
- Bigger pane = less vertical room for the workflow steps. With 4 recents + the workflow header + 3 stages, the typical case fills the visible pane area at 900 px tall.
- Cross-case state model: today `App.tsx` already manages `selectedCaseId` and `sharedFormData`. We'd need to make sure pane-driven case switches go through the same save / load path as queue-driven switches.

### Effort

- ~1.5-2.5 sprints. Reshape WorkflowSidebar + add `CaseListPanePinned` sub-component + wire up the recent-cases store (likely a small zustand-like singleton in `src/state/`) + cross-case save/load orchestration + the "Open from queue…" link.

---

## 7. Comparison

| Dimension | Path A | Path B |
|---|---|---|
| **Effort** | 3-5 days | 1.5-2.5 sprints |
| **Reshape blast radius** | `WorkflowSidebar`, `App.tsx`, `featureFlags.ts`, `WorkflowSidebarWireframes` | Same as A + `state/` (new store), all callsites of `setSharedFormData`, save/load orchestration |
| **Solves "switch between cases without leaving"** | ✗ | ✓ |
| **Matches Teams nav model literally** | Partially (one scope) | Yes (outer + inner scope) |
| **Risk of regression** | Low | Medium — cross-case state changes are easy to get wrong |
| **Telemetry / a11y wiring** | Simple | More complex — two navigation landmarks need separate labeling |
| **Defers to future RFC** | Case-switching pattern stays a future-work item | Decision made now |

### Recommendation

Ship **Path A** first, then evaluate Path B as a follow-on once we have telemetry / RS feedback on whether the case-switching pain point is actually blocking work or just inconvenient. Two reasons:

1. **Path A is a strict prerequisite for Path B** — the case-switcher block sits *above* the workflow nav, which means the workflow nav has to already be a list pane for Path B to plug in cleanly. Path A ships standalone; Path B ships *only* on top of Path A.
2. **The case-switching pain is unconfirmed.** We've heard it informally but haven't measured it. Shipping Path A first surfaces RS / TS feedback on whether the list pane alone is enough.

---

## 8. Implementation plan (Path A — recommended)

### Phase 1.1 — New scope-header component

- **New** `src/components/workflow-nav/CaseScopeHeader.tsx`. Props: `caseId`, `priority`, `assignee`. Renders the 2-row header.
- Used by both the list pane and (if Phase 1 of the parent RFC also lands) the `CaseContextHeader` workspace-strip refactor.

### Phase 1.2 — Reshape `WorkflowSidebar` into the list pane

- Widen to 280 px.
- Mount `<CaseScopeHeader>` at the top.
- Replace the existing flat sub-step list with a collapsible-group renderer that takes `navState.steps` grouped by stage.
- Add the localStorage collapse-state hook (`useCaseWorkflowCollapseState`).
- Add the threshold-gated search input (`useDeferredValue`-driven filter against sub-step labels).
- Update the sub-step item to use the new status icon + label spec.
- Add the action-icon row to the right side of the scope header (Document panel toggle, Identifier panel toggle, overflow `⋯` menu) — see §4.4.
- Add the sticky pane footer with `[ Save Draft ]` + `[ Submit ]` — see §4.8.
- **Migrate Save + Submit from `StickyCaseHeader` to the pane footer.** Delete the corresponding action buttons from [`StickyCaseHeader.tsx`](c:/R/DARS_eEvidence/src/components/StickyCaseHeader.tsx) and the related handler-prop wiring. The footer buttons receive `onSave` / `onSubmit` callbacks from the same parent component that previously fed `StickyCaseHeader` (likely `DataEntryForm.tsx` and `CollectionTracker.tsx` — confirm during exploration).
- Rename the file from `WorkflowSidebar.tsx` → `WorkflowListPane.tsx`. Re-export the old name from a 1-line shim until callsites move (avoids a churny rename PR).

### Phase 1.3 — Narrow-viewport collapse

- New `src/hooks/useNavPaneWidth.ts` that reads `window.matchMedia('(max-width: 1024px)')` and returns `"expanded" | "collapsed"`.
- When collapsed, the pane renders as a 48 px icon column with the 3 stage icons + the active indicator. Click any icon to open the full pane as an overlay (`<Popover>` from shadcn or a hand-rolled absolute-positioned panel — TBD in design review).

### Phase 1.4 — Retire `FF_STAGE_TAB_BAR` + delete `StageTabBar`

- Remove the flag from `src/constants/featureFlags.ts`.
- Remove the conditional render branches in `App.tsx`, `DataEntryForm.tsx`, `CollectionTracker.tsx`, `StickyCaseHeader.tsx`.
- Delete `src/components/layout/StageTabBar.tsx`.
- Update `WorkflowSidebarWireframes.tsx` reference scenarios to match the new shape.

### Phase 1.5 — Ship flag

- Wrap the full Path A reshape behind `FF_NAV_V2_LIST_PANE` for the initial demo period.
- **Default during the demo period**: ON for the Cases app, OFF for Attorney Dashboard / Notifications (per §11 decision). The pane only mounts on Cases anyway today, so the per-surface scope is documentary — it makes the intent explicit and gives us a tight scope marker if a future surface decides to opt in.
- Once internal walkthroughs confirm parity / improvement, flip the default to ON globally and delete the flag in a follow-up PR.

---

## 9. Files touched (Path A)

| File | Action |
|---|---|
| [`src/components/WorkflowSidebar.tsx`](c:/R/DARS_eEvidence/src/components/WorkflowSidebar.tsx) | Major rewrite + rename to `WorkflowListPane.tsx` |
| `src/components/workflow-nav/CaseScopeHeader.tsx` | New — scope header with action icon row (§4.4) |
| `src/components/workflow-nav/WorkflowListPaneFooter.tsx` | New — sticky footer hosting Save + Submit (§4.8) |
| `src/components/workflow-nav/WorkflowListPaneCollapsed.tsx` | New (48 px icon column variant) |
| `src/hooks/useCaseWorkflowCollapseState.ts` | New |
| [`src/hooks/useResizablePaneWidth.ts`](c:/R/DARS_eEvidence/src/hooks/useResizablePaneWidth.ts) | New — drag-to-resize + keyboard + localStorage persistence (§4.2) |
| `src/hooks/useNavPaneWidth.ts` | New |
| [`src/App.tsx`](c:/R/DARS_eEvidence/src/App.tsx) | Remove `FF_STAGE_TAB_BAR` branches; add `FF_NAV_V2_LIST_PANE` branches |
| [`src/components/StickyCaseHeader.tsx`](c:/R/DARS_eEvidence/src/components/StickyCaseHeader.tsx) | Remove `StageTabBar` render + remove Save / Submit action buttons (they move to the pane footer) |
| [`src/components/DataEntryForm.tsx`](c:/R/DARS_eEvidence/src/components/DataEntryForm.tsx) | Remove `stageBarNavState` / `onStageBarStepClick` prop wiring; route Save / Submit handlers to the new pane footer instead of `StickyCaseHeader` |
| [`src/components/CollectionTracker.tsx`](c:/R/DARS_eEvidence/src/components/CollectionTracker.tsx) | Same as above |
| [`src/components/layout/StageTabBar.tsx`](c:/R/DARS_eEvidence/src/components/layout/StageTabBar.tsx) | Delete |
| [`src/constants/featureFlags.ts`](c:/R/DARS_eEvidence/src/constants/featureFlags.ts) | Add `FF_NAV_V2_LIST_PANE`, remove `FF_STAGE_TAB_BAR` |
| [`src/components/WorkflowSidebarWireframes.tsx`](c:/R/DARS_eEvidence/src/components/WorkflowSidebarWireframes.tsx) | Update reference scenarios |

---

## 10. Verification

- **Wide viewport** (1440×900): open `LNS-2026-00200`. Confirm pane shows the 2-row header (`STAGES` + case context), 3 stage groups, active stage expanded by default, sub-step status icons rendered correctly.
- **Stage collapse persistence**: collapse Triage, navigate to Review Case, return to Triage. Triage should still be collapsed (localStorage round-trip).
- **Long sub-step list** (`LNS-2026-00270` — 10 jobs in collection): confirm search row appears, filter works, expanding/collapsing during filter doesn't corrupt persisted state.
- **Narrow viewport** (resize to 1000 px wide): confirm pane collapses to 48 px icons. Click the Triage icon — full pane opens as overlay above the workspace. Click outside the overlay — overlay dismisses.
- **Keyboard nav**: Tab through pane items, confirm focus order matches DOM order, Arrow keys move within active sub-step list, Enter activates.
- **Flag default**: with `FF_NAV_V2_LIST_PANE=false`, the old `WorkflowSidebar` still renders. With `true`, the new pane renders. No mixed-mode rendering.
- **Typecheck**: `npm run typecheck` shows zero `TS2448` (forward-reference) errors.

---

## 11. Open questions

### Resolved (2026-05-27)

1. **Scope label text** → **`STAGES`**. Reads as DARS-native vocabulary; "WORKFLOW" was a Teams-leaning placeholder.
2. **Priority chip token** → **long form** `Emergency` / `Urgent` / `Routine`. More immediately readable to a new user than `P0`-`P2`. The pane's row 2 reserves enough horizontal room for the long-form label even at 280 px width (verified during exploration).
3. **Initial expand default** → **only the active stage**. The other two stages start collapsed; user-controlled toggles still persist per-`{caseId, stageKey}` via §4.5 thereafter.
4. **`FF_NAV_V2_LIST_PANE` default during demo** → **ON only on the Cases app, OFF for Attorney Dashboard / Notifications**. Per-surface scoping. Functionally equivalent to ON-everywhere today (the pane only mounts on Cases anyway) but the scope marker makes intent explicit.
5. **Stage navigation gating** → **none**. All three stage buttons are clickable from anywhere once a case is open; the current stage is the only one that becomes non-interactive. The previous `stageCompletion`-gated forward-only model blocked the very common "go back to Collection to check job status after dipping into Review Case" flow, so the gate was removed at the App.tsx prop-passing level (both `WorkflowSidebar` and `WorkflowListPane` benefit). Verified end-to-end via Playwright round-trip (Collection → Review Case → Collection).
6. **Resizable pane** → **yes, drag-to-resize**. The pane uses a `useResizablePaneWidth` hook with bounds 240-480 px, default 280 px, double-click resets to default, keyboard arrows shift ±8 px when the handle is focused. Width persists per-user via localStorage (`dars.workflowListPane.width`). Mirrors Teams' channel-list-pane resize affordance.

### Still open

7. **Sub-step "blocked" state** — does it exist today? I listed it in the status visuals (red `!`) but haven't confirmed there's a sub-step status that maps to it. Need to spot-check `navState.steps[].status` values across cases like `LNS-2026-00250` (Partial GFR — Attorney Review on one identifier).
8. **Narrow-viewport icon column — interaction model**: hover-to-peek (Teams desktop) or click-to-expand-as-overlay (Teams tablet)? I picked click for prototype simplicity. Confirm.

---

## 12. Non-goals

- The **case-switcher** pattern (Path B) is deferred. If Path A ships and the case-switching pain remains, that's the next RFC.
- **Layer 3** chrome consolidation (Phase 1 of the parent RFC) is parallel work. Path A here doesn't depend on it; both can ship in either order. If Layer 3 lands first, the `CaseScopeHeader` here will gain a sibling `CaseContextHeader` in the workspace strip and the two should share styling tokens.
- **Layer 1** polish stays on hold (user chose Option C / defer).
- **Mobile** (< 640 px) — the case form isn't designed for phone use today. Narrow-viewport collapse handles tablet / split-screen. Phone is out of scope.
- **Telemetry instrumentation** — instrumenting pane interactions for an A/B comparison is its own follow-up (the parent RFC mentions this open question; not part of Path A's deliverable).

---

## 13. Future work

- **Path B (case-switcher in pane)** — separate RFC if Path A doesn't address the case-switching pain.
- **List-pane density toggle** — Teams allows a "Compact" mode that removes descriptions and shrinks row height. Worth evaluating if RS / TS users want denser sub-step lists.
- **Pinned sub-steps / quick jump** — power-user feature to pin frequently-used sub-steps within a stage. Not needed for v1.
