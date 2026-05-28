# RFC — Align DARS navigation to the Microsoft Teams 3-pane model

> **Status update — 2026-05-27**
> - **Layer 1 (App nav) → Option C** (leave as-is). Already close to Teams; revisit only after Layer 2 lands.
> - **Layer 2 (Workflow nav)** split out to its own dedicated RFC: [dars-workflow-nav-listpane-rfc.md](dars-workflow-nav-listpane-rfc.md). That doc compares Path A (workflow-only list pane) vs Path B (workflow + case-switcher list pane).
> - **Layer 3 (Workspace chrome)** stays in this parent doc but is deprioritized until Layer 2 ships, since the list-pane reshape may absorb some of the case-header content currently in `StickyCaseHeader`.
>
> This parent RFC stays available as the cross-layer reference. The sections below describe the original 3-layer analysis; treat them as historical context now that the layer-specific RFCs are driving execution.
>
> ---
>
> Original status: **Draft for review** · Replaced the older "third placement for the workflow nav" item in [dars-eevidence-followup-roadmap.md](dars-eevidence-followup-roadmap.md).

---

## 1. Context

Microsoft Teams uses a stable, predictable **three-pane navigation model** that every Microsoft 365 app the user touches each day — Teams, Outlook, OneNote, Loop — borrows from. DARS has organically grown a navigation that *almost* mirrors it but with three small misalignments that make the case page feel busier than peers in the suite.

This RFC inventories the current DARS navigation against the Teams model per pane, identifies the gaps, and proposes a phased alignment so the case workflow reads as a first-class M365 surface.

### Microsoft Teams reference (the model we're aligning to)

```
┌────┬──────────────┬─────────────────────────────────────────┐
│ A  │   B          │   C                                      │
│ App│  List pane   │   Workspace                              │
│rail│              │                                          │
│    │  ┌──────┐    │   ┌──────────────────────────────────┐  │
│ A  │  │ Hdr  │    │   │  Thin context header              │  │
│ C  │  ├──────┤    │   ├──────────────────────────────────┤  │
│ T  │  │ Item │◄───┼───┤                                   │  │
│ T  │  │ Item │    │   │  Workspace content                 │  │
│ M  │  │ Item │    │   │                                    │  │
│    │  └──────┘    │   │                                    │  │
│ …  │              │   └──────────────────────────────────┘  │
└────┴──────────────┴─────────────────────────────────────────┘
 48px    280–320px              fills the rest
```

| Pane | Purpose | Width | What it looks like |
|---|---|---|---|
| **A. App rail** | Global app switcher (Activity / Chat / Teams / Calendar / Files / Apps). Constant, never collapses, icon-only with hover labels. | ~48 px | Vertical icon column, dark accent on active. |
| **B. List pane** | Contextual list scoped to the active app rail entry — channels within a team, threads within Chat, folders within Files. Has its own search/filter at top, an item list in the body, and an optional "+ New" affordance. | ~280–320 px | Light surface, named header, scrollable list, list items can collapse / nest. |
| **C. Workspace** | The actual content for the selected list item (a chat thread, a meeting, a channel feed). One thin context strip at top — name + 2-3 actions — and then content. No competing chrome. | fills | The "work-getting-done" canvas. |

Three guiding principles Teams uses that we'll lean on:

1. **The app rail never goes away.** It's the user's stable orientation across the whole product. 48 px of permanent visual scaffolding is cheap compared with the cognitive cost of context-switching.
2. **The list pane is *the* context-setter.** It tells the user what they're inside of (which team, which chat, which folder) and lets them navigate around within that scope. It's named, searchable, and dense.
3. **The workspace is sacred.** Anything that competes for vertical space at the top of the workspace makes the actual work feel cramped. Teams keeps the workspace's top strip to a single ~48 px row.

---

## 2. Current state in DARS

Architecture mapped from exploration of `c:\R\DARS_eEvidence\src\` — citations below.

### 2.1 Layer 1 — App nav (✓ already close to Teams)

- **Component**: [`LeftNavRail`](c:/R/DARS_eEvidence/src/components/app-shell/LeftNavRail.tsx#L70) — mounts in [App.tsx:382-386 / 460-464](c:/R/DARS_eEvidence/src/App.tsx#L382)
- **Width**: 48 px fixed, full viewport height — already at Teams' app-rail width.
- **Items**: Notifications · Cases · Attorney Dashboard (3 entries today)
- **Position**: To the LEFT of the workspace, BELOW the AppHeader (which sits above and spans full width).

This is the layer in the best shape. Gaps are cosmetic, not structural.

### 2.2 Layer 2 — Workflow nav (the problem zone)

Two variants ship today, gated by `FF_STAGE_TAB_BAR`:

- **Default**: [`WorkflowSidebar`](c:/R/DARS_eEvidence/src/components/WorkflowSidebar.tsx#L51) — 256 px wide vertical column on the left of the case page. Lists 3 stages (Triage / Review Case / Collection) at the top and an N-item dynamic sub-step list below. Mounts in [App.tsx:505-533](c:/R/DARS_eEvidence/src/App.tsx#L505).
- **Flag on**: [`StageTabBar`](c:/R/DARS_eEvidence/src/components/layout/StageTabBar.tsx#L63) — horizontal pill strip rendered inside [StickyCaseHeader.tsx:217-227](c:/R/DARS_eEvidence/src/components/StickyCaseHeader.tsx#L217). Same 3 stage tabs + sub-step row, but ~40-80 px tall consuming workspace vertical.

**Gaps vs Teams**:

1. The default sidebar **doesn't name the scope it represents**. Teams' list pane has a header showing "Chat" or "Files" or the team name. WorkflowSidebar shows the stage list with no scope label — the user has to infer that the sidebar is "for this case."
2. **256 px is narrower than Teams** (280-320). That's tolerable, but with the case-id, priority chip, and sub-step labels, content runs to 2 lines.
3. **No search / filter** at the top. Sub-steps can run 6-12 items deep on complex cases.
4. The **flag variant collapses the same content into a horizontal strip at the top of the workspace** — recovers horizontal real estate but breaks the Teams model (workspace gets a second header band) and the user's eye doesn't read it as primary nav.

### 2.3 Layer 3 — Workspace (chrome stacking)

The workspace area today carries **two stacked chrome blocks** above the actual content:

- [`AppHeader`](c:/R/DARS_eEvidence/src/components/AppHeader.tsx#L44) — 64 px, full width, sits above everything else. Microsoft logo + DARS title + Help/User menus.
- [`StickyCaseHeader`](c:/R/DARS_eEvidence/src/components/StickyCaseHeader.tsx#L78) — 128-264 px, dynamic. Contains:
  - WorkflowStageBanner (~48-64 px colored strip)
  - CaseHeaderSummary (~80-120 px case card with ID, priority border, action buttons)
  - StageTabBar (~40-80 px, only when `FF_STAGE_TAB_BAR=true`)

Total chrome above the form fields: **192-328 px**. Teams' equivalent (app rail + thin channel header) is **~48 px**.

That stacking is the single biggest cosmetic-but-meaningful misalignment.

---

## 3. Proposed alignment — per layer

Recommendations marked **★** are the recommended path; alternatives are kept so we can choose based on review.

### 3.1 Layer 1 — App rail · low-effort polish

| Option | What changes | Effort | Recommend |
|---|---|---|---|
| **★ A. Add labels-on-hover + group footer** | Wire `LeftNavRailItem` to render its label as a tooltip on hover (Teams does this); add Settings + User profile to the bottom of the rail (currently only in AppHeader). | Small (~1 dev day) | ✓ |
| B. Widen to 64 px with always-visible labels under icons | Matches the "Teams + label" variant some M365 surfaces use. Tradeoff: 16 more pixels of fixed chrome. | Small-medium | |
| C. Leave as-is | Already close to Teams. Defer until layer-2 work lands. | Zero | |

### 3.2 Layer 2 — Workflow nav · the meaningful work

The current WorkflowSidebar is *trying* to be a list pane but isn't shaped like one. The flagged StageTabBar abandons the list-pane model entirely. Three real options:

| Option | What changes | Effort | Recommend |
|---|---|---|---|
| **★ A. Reshape `WorkflowSidebar` into a Teams-style list pane** | Widen to 280 px. Add a named header at the top showing the current case (ID, priority chip, RS assignee). Add a search/filter input above the sub-steps when the list runs >5 items deep. Group stages with a collapsible section header per stage. Drop the "Stage N of 3" footer (the header makes it implicit). Retire `FF_STAGE_TAB_BAR`. | Medium (~3-5 dev days) | ✓ |
| B. Add a second list pane for case-switching + nested workflow | Match Teams' team-picker → channel-list pattern: the list pane shows a **list of recent / pinned cases** at top, and the active case's workflow steps below it. Lets the user switch between in-flight cases without going back to the queue. | Large (~1-2 sprints) — meaningful product change | |
| C. Drop the sidebar entirely; commit to inline stepper inside the workspace | The current `FF_STAGE_TAB_BAR=true` variant, but cleaned up: only the 3 stage pills, no sub-steps in the strip (sub-steps live inline in the form). Recovers 256 px horizontal. Cost: now there's no scope-setting nav at all — relies entirely on the case header to ground the user. | Medium | |

**Why Option A**: it's the smallest change that brings the layer into the Teams model. It also kills `FF_STAGE_TAB_BAR` (which today is a flag we'd otherwise need to maintain forever) and unifies on one nav path. Option B is the more ambitious "what if DARS were truly Teams-shaped" — worth scoping separately.

### 3.3 Layer 3 — Workspace · consolidate chrome

Today's stack: `AppHeader (64) + WorkflowStageBanner (48-64) + CaseHeaderSummary (80-120) + StageTabBar (0-80)` = 192-328 px.

Teams equivalent: `AppHeader (48) + ThinContextHeader (48)` = 96 px.

| Option | What changes | Effort | Recommend |
|---|---|---|---|
| **★ A. Merge WorkflowStageBanner + CaseHeaderSummary into a single 64-72 px context strip** | Move stage color to a left-border accent rail (already used elsewhere) instead of a full-width banner. Compress CaseHeaderSummary to a single row: case-id chip · priority chip · RS assignee · 2-3 action buttons · overflow menu. Saves 80-140 px vertical. | Medium | ✓ |
| B. Make the case header collapsible on scroll | Full chrome on initial mount; collapses to a 48 px strip after the user scrolls past it. Saves vertical only after scroll. | Small | |
| C. Move the case identifier + actions into the list pane's header | The most aggressive consolidation: the list pane (layer 2) becomes the scope-setter and the workspace top strip vanishes. Mirrors Teams' channel-header pattern most literally. | Medium-large; harder to undo if user feedback negative | |

**Why Option A**: predictable, undoable, low-risk. Option C is the "purest" Teams alignment but couples L2 and L3 changes together — too much to land at once.

---

## 4. Recommended path

Land three changes in this order; each one is independently shippable behind a flag so we can A/B against the current state.

### Phase 1 — Workspace chrome consolidation (`FF_NAV_V2_WORKSPACE`)

- Merge `WorkflowStageBanner` + `CaseHeaderSummary` into a new `CaseContextHeader` component, ~64-72 px tall.
- Repaint stage color via a 4 px left accent on the workspace card.
- Retire `WorkflowStageBanner` once the flag rolls out 100%.
- **Outcome**: workspace recovers 80-140 px vertical. Smallest blast radius — touches only the case-page rendering tree.

### Phase 2 — Workflow nav reshape (`FF_NAV_V2_LIST_PANE`)

- Reshape [`WorkflowSidebar`](c:/R/DARS_eEvidence/src/components/WorkflowSidebar.tsx) → 280 px width, add a named header showing case context, group stages with collapsible sub-step lists, add a search input when sub-step list > 5 items.
- Delete [`StageTabBar`](c:/R/DARS_eEvidence/src/components/layout/StageTabBar.tsx) and retire `FF_STAGE_TAB_BAR` — both supersede.
- Move the WorkflowSidebarWireframes reference scenarios to match the new shape.
- **Outcome**: workflow nav reads as a Teams list pane. One nav path replaces two. The CaseContextHeader from Phase 1 stays in the workspace because the list pane's header shows nav-scope context, not case-action context — they don't overlap.

### Phase 3 — App rail polish (`FF_NAV_V2_RAIL`)

- Add label-on-hover tooltips to `LeftNavRailItem`.
- Add a footer group on `LeftNavRail` containing Settings + User profile (currently only in the global `AppHeader`).
- Optionally move the env-banner from `AppHeader` to the rail's footer (frees an additional ~24 px on the global header).
- **Outcome**: app rail matches Teams' interaction pattern; AppHeader becomes lighter (could trim to 48 px in a follow-up).

### Rollout strategy

- Each phase ships behind its own feature flag. Default to OFF in production.
- Internal demo + RS / TS persona walkthrough between each phase to gather feedback.
- After Phase 2, run a side-by-side A/B for one sprint comparing the V2 nav to the V1 sidebar; only flip the default once telemetry (or qualitative feedback) confirms parity or improvement on the "time-to-task-start" metric.

---

## 5. Files touched per phase

| Phase | New | Modified | Removed |
|---|---|---|---|
| **1 — Workspace chrome** | `CaseContextHeader.tsx` (new) | `StickyCaseHeader.tsx`, `DataEntryForm.tsx`, `CollectionTracker.tsx` | `WorkflowStageBanner.tsx` (after flag flip) |
| **2 — Workflow nav reshape** | `CaseListPaneHeader.tsx` (new sub-component) | `WorkflowSidebar.tsx`, `App.tsx`, `WorkflowSidebarWireframes.tsx`, `featureFlags.ts` | `StageTabBar.tsx`, `FF_STAGE_TAB_BAR` |
| **3 — App rail polish** | `LeftNavRailFooter.tsx` (new sub-component) | `LeftNavRail.tsx`, `LeftNavRailItem.tsx`, `AppHeader.tsx` | (nothing) |

---

## 6. Verification per phase

- **Phase 1**: open any case at 1440×900. Confirm the workspace shows ≥ 720 px of form content above the fold (today: ~480 px). Stage color is visible as a left-edge accent. Sticky header collapses chrome as designed.
- **Phase 2**: open a case with ≥ 6 sub-steps (e.g. `LNS-2026-00270`). Confirm the list pane shows: (a) named header with case-id + priority + assignee, (b) collapsible stage groups, (c) search input filtering sub-steps when typed. Confirm `FF_STAGE_TAB_BAR` no longer exists in the codebase.
- **Phase 3**: hover each rail icon. Confirm a Teams-style label tooltip appears within 500 ms. Confirm Settings + User profile menu opens from the rail footer.
- **All phases**: run `npm run typecheck` and confirm zero `TS2448` (forward-reference / TDZ) errors. Reload-test the case form on every workflow stage to confirm no regression in the underlying data flow.

---

## 7. Open questions for review

1. **Are we OK retiring `FF_STAGE_TAB_BAR` outright** (Option A path), or do you want to keep both nav shapes parallel through the alignment work? — Recommended: retire it. The flag would otherwise persist as a permanent fork.
2. **Phase 2 Option B** (case-switcher list pane at the top of the workflow nav) is intentionally not in the recommended path because it changes how RS / TS users move between cases. Want to scope that as a separate RFC, or fold it into Phase 2 here?
3. **Workspace context strip height** (Phase 1) — target 64 px or 72 px? 64 matches Teams; 72 keeps room for the SLA timer + escalation chips at their current type sizes. Recommend 72 then trim if user testing confirms readability.
4. **Telemetry for the A/B**: today the prototype has no event tracking. Do we proxy via qualitative review only, or stand up a lightweight `localStorage` event log for the demo period?

---

## 8. Non-goals

- Restyling the workspace contents themselves (form layout, accordion stepper internals). The accordion stepper from [CaseSummaryAndTabs.tsx](c:/R/DARS_eEvidence/src/components/CaseSummaryAndTabs.tsx) stays unchanged.
- Replacing the M365-style env banner, the Microsoft logo, or the global Help menu in AppHeader.
- Adding a second top-level surface to the app rail (e.g. an Admin or Reports app). Out of scope for nav-alignment; would be a separate IA decision.
- Changes to the Attorney Dashboard tri-pane layout (AttorneyReviewWorkspace) — that's a workspace-specific layout, not part of the global nav.
