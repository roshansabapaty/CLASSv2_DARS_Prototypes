# M365-style Left Hero Nav Rail — Layout Plan

**Project:** DARS_EEVIDENCE (`c:\R\DARS_EEVIDENCE`)
**Scope:** Introduce a Microsoft 365-style left "hero" navigation rail
that hosts the top-level apps the RS / TS / Attorney can switch between.
First two apps: **Case Queue** (existing flow) and **Attorney Dashboard**
(new placeholder). The current AppHeader notifications bell moves into the
rail as a third destination.
**Status:** Ready to implement (7 open questions resolved)
**Created:** 2026-05-13

## Reference pattern

Outlook / Teams / OneDrive on the web all share the same left-rail shape:

- Narrow vertical column on the leftmost edge of the viewport, full height.
- Each item is an icon button (~40-48px square) with a tooltip on hover.
- The active app is signalled by a filled icon + a colored left-edge bar
  (Teams style) or a tinted pill background (Outlook web style).
- Some items live "above the line" (primary apps), some "below the line"
  (settings, help, account).

This plan adopts that shape with our existing Fluent UI v9 design tokens
so the rail blends with the rest of the app's brand colors.

## Visual mockup

```
┌────┬────────────────────────────────────────────────────────────────┐
│    │ AppHeader  (Help, User menu, contextual case info)             │
│    ├────────────────────────────────────────────────────────────────┤
│ ┃▢ │                                                                │
│ Q  │                                                                │
│    │                                                                │
│ ▢  │                                                                │
│ A  │   Main body — depends on `activeApp`:                          │
│    │     "queue"        → existing CaseQueue / DataEntryForm /      │
│ —  │                       CollectionTracker flow (unchanged)       │
│    │     "attorneyDash" → AttorneyDashboard (new placeholder page)  │
│ ▢  │     "notifications"→ NotificationsPage (new full-page view)    │
│ N  │                                                                │
│ ⓮  │                                                                │
│    │                                                                │
│    │                                                                │
│    ├────────────────────────────────────────────────────────────────┤
│ ⚙  │                                                                │
└────┴────────────────────────────────────────────────────────────────┘
   ↑
   48px-wide rail. Top-aligned items = hero apps. Bottom-aligned = utility
   (settings, help; reserved for a later iteration). The active item
   (`▢ Q` in this sketch) carries the colored left edge bar (`┃`).
```

## Rail items

| Order | Icon (Fluent v9) | Label | `activeApp` value | Notes |
|---|---|---|---|---|
| 1 | `Alert24Regular` / `Alert24Filled` (badge with unread count) | Notifications | `"notifications"` | Top spot. Replaces the AppHeader bell. The badge shows the same `useCorrespondenceNotifications().totalUnread` count the bell used. |
| (separator) | | | | Visual divider between Notifications and the hero apps. |
| 2 | `Briefcase24Regular` / `Briefcase24Filled` | Case Queue | `"queue"` | Restores the user's existing case context (selectedCaseId, workflowStage) when they switch back to this app. |
| 3 | `Scales24Regular` / `Scales24Filled` | Attorney Dashboard | `"attorneyDashboard"` | New. Filtered case list scoped to cases flagged for Internal Escalation / Assignment to Lawyer roles (see Attorney Dashboard section below). |
| (bottom-anchored, future) | `Settings24Regular` | Settings | (not wired yet) | Reserved spot at the bottom of the rail. |

## State management

**New App-level state:** `activeApp: "queue" | "attorneyDashboard" | "notifications"`.

**Persistence:** the active app is mirrored to `localStorage` under the key
`dars.activeApp` and restored on first mount. If the user was last on the
Attorney Dashboard when they reloaded, they land back on the Dashboard.
Falls back to `"queue"` when storage is unavailable or the persisted value
is unknown.

```ts
const [activeApp, setActiveApp] = React.useState<ActiveApp>(() => {
  try {
    const stored = localStorage.getItem("dars.activeApp");
    if (stored === "queue" || stored === "attorneyDashboard" || stored === "notifications") {
      return stored;
    }
  } catch { /* noop */ }
  return "queue";
});
React.useEffect(() => {
  try { localStorage.setItem("dars.activeApp", activeApp); } catch { /* noop */ }
}, [activeApp]);
```

The existing case state (`selectedCaseId`, `workflowStage`, `sharedFormData`,
etc.) is **independent** of `activeApp`. Switching away from Queue → Dashboard
→ back to Queue restores the prior case context — the user doesn't lose
their open case.

**Body switch** (replaces the current top-level if/else in App.tsx):

```tsx
{activeApp === "queue" && <CaseQueueOrCaseForm /* existing */ />}
{activeApp === "attorneyDashboard" && <AttorneyDashboard />}
{activeApp === "notifications" && <NotificationsPage />}
```

**No URL routing** — keeping consistent with the current app which is also
SPA-state-driven. Future iteration can add `react-router` or push-state.

## Rail behavior

**Width:** fixed **48px** (icon-only) by default. No expand/collapse toggle
in the first cut — keeps the UX simple and the rail unobtrusive. Tooltip on
hover surfaces the label.

**Active indicator:**
- 3px-wide colored bar on the left edge of the button
  (`tokens.colorBrandStroke1`).
- Icon swaps from `Regular` → `Filled` variant.
- Background tint: `tokens.colorNeutralBackground1Selected`.

**Hover:** `tokens.colorNeutralBackground1Hover`.

**Keyboard:** rail items are real `<button>`s in tab order. Arrow up/down
navigates between rail items (Fluent's `useArrowNavigationGroup` or a small
hand-rolled keydown handler).

**Accessibility:**
- `<nav aria-label="Workspace navigation">` wraps the rail.
- Each item has `aria-current="page"` when active.
- Tooltip uses Fluent's `Tooltip` with `relationship="label"`.

## AppHeader changes

- **Remove**: the notifications bell + popover dropdown ([AppHeader.tsx:152-200](src/components/AppHeader.tsx#L152)). The data hook `useCorrespondenceNotifications` is reused by both the rail badge and the new NotificationsPage, so the underlying logic stays.
- **Keep**: Help menu, User menu, the contextual case info / breadcrumb when a case is open.

The bell dropdown's existing "list of recent inbound items grouped by case" UX gets re-used inside the new `NotificationsPage` (which is essentially a full-page version of that dropdown).

## Attorney Dashboard — escalated/lawyer-assigned case list

**Purpose:** the Attorney Dashboard is a filtered case-list view scoped to
cases the RS / TS has flagged for **Internal Escalation** or
**Assignment to Lawyer**. The intent is to give attorneys a focused queue
of work that requires their attention, separate from the general Case Queue
that mixes everything.

**Filter rule (first cut):** a case appears on the Attorney Dashboard when:

- `formData.caseEscalated === true` (the existing Internal Escalation flag), OR
- the case has an "assigned to lawyer" role marker — *to be defined* as a
  new boolean / role field. For the first cut we can borrow
  `caseEscalated || escalationNotes?.toLowerCase().includes("lawyer")` as a
  heuristic, or introduce a new dedicated flag like
  `assignedToLawyer: boolean`. **Open decision** — confirmed during
  implementation.

**Layout:** mirrors the existing CaseQueue card list with the same card
shape, sorted by escalation date or due date (descending). Adds a header
strip with the filter description ("Showing cases flagged for Internal
Escalation or Lawyer Assignment") and a count badge.

```
┌─────────────────────────────────────────────────────────────────┐
│ Attorney Dashboard                                              │
│ Showing 4 cases flagged for Internal Escalation /              │
│ Lawyer Assignment                                              │
├─────────────────────────────────────────────────────────────────┤
│ [Case card — LENS-2026-00150  ⚑ Escalated · Due May 22, 2026]  │
│ [Case card — LENS-2026-00170  ⚑ Lawyer review · Due Jun 2, …]  │
│ [Case card — LENS-2025-00125  ⚑ Escalated · Due Jan 25, 2025]  │
│ [Case card — …]                                                │
└─────────────────────────────────────────────────────────────────┘
```

Clicking a card opens the case in the Queue app (sets `activeApp = "queue"`,
calls `handleCaseSelect`). The Dashboard is a viewing surface only — no
case-state mutation happens here.

**Empty state:** "No cases currently flagged for escalation. The
Attorney Dashboard will list cases as the RS / TS flag them for review."

**Implementation reuse:** uses the same `CaseCard*` components that the
queue uses — just rendered against a filtered slice of `MOCK_CASES`. No new
card primitives.

## NotificationsPage

Full-page view at `activeApp === "notifications"`. Shape:

```
┌────────────────────────────────────────────────────────────┐
│  Notifications (3 unread)            [Mark all as read]    │
├────────────────────────────────────────────────────────────┤
│  LENS-2026-00150  ⚠ 2 unread                               │
│  ──────────────────────────────────────                    │
│  • [Receipt confirmation] from Anja Becker — 2 days ago    │
│  • [Clarification — scope] from Anja Becker — 4 hours ago  │
│                                                            │
│  LENS-2026-00180  ⚠ 1 unread                               │
│  ──────────────────────────────────────                    │
│  • [Acknowledgement] from Mossos — 1 day ago               │
│                                                            │
│  [No more unread] · [Show all (including read)]            │
└────────────────────────────────────────────────────────────┘
```

Clicking a row opens the case in the Queue app (sets `activeApp = "queue"`,
calls `handleCaseSelect`, and opens the case's Correspondence Hub at the
clicked item). This preserves the current bell-dropdown navigation behavior
in a roomier surface.

## Component structure

```
src/
└── components/
    └── app-shell/
        ├── LeftNavRail.tsx          ← new: the rail itself
        ├── LeftNavRailItem.tsx      ← new: single rail button + tooltip
        ├── AttorneyDashboard.tsx    ← new: placeholder page
        └── NotificationsPage.tsx    ← new: full-page notifications view
```

`App.tsx` composes them:

```tsx
<FluentProvider theme={webLightTheme} style={{ height: "100%" }}>
  <TooltipProvider>
    <div className="flex flex-row h-full overflow-hidden bg-[#faf9f8]">
      <LeftNavRail
        activeApp={activeApp}
        onChangeApp={setActiveApp}
        unreadCount={notifications.totalUnread}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader … />
        <main id="main-content" className="flex-1 overflow-auto">
          {activeApp === "queue" && /* existing queue/case/collection flow */}
          {activeApp === "attorneyDashboard" && <AttorneyDashboard />}
          {activeApp === "notifications" && <NotificationsPage
              onOpenCase={(caseId, inboundId) => {
                setActiveApp("queue");
                handleCaseSelect(caseId);
                // optionally surface inboundId via existing Hub-open hook
              }}
            />}
        </main>
      </div>
    </div>
  </TooltipProvider>
</FluentProvider>
```

## Files modified / created

1. **New** `src/components/app-shell/LeftNavRail.tsx`
2. **New** `src/components/app-shell/LeftNavRailItem.tsx`
3. **New** `src/components/app-shell/AttorneyDashboard.tsx`
4. **New** `src/components/app-shell/NotificationsPage.tsx`
5. **Modify** [src/App.tsx](src/App.tsx) — add `activeApp` state, wrap shell in `flex-row`, switch body on `activeApp`. Lift `useCorrespondenceNotifications` to App level so both LeftNavRail (badge) and NotificationsPage (list) consume the same instance.
6. **Modify** [src/components/AppHeader.tsx](src/components/AppHeader.tsx) — remove bell + popover (lines ~152-200). Drop the `useCorrespondenceNotifications` call from here.

## Verification plan

1. `npm run dev` → Queue loads by default; the rail shows three icons with Queue active (colored left bar, filled icon).
2. Click Attorney Dashboard → main body switches to the placeholder; rail's active indicator moves; Queue's case context (if any) is preserved (verified by clicking Queue again).
3. Click Notifications → main body shows the full-page notifications view. Click an unread row → switches to Queue, opens that case, opens the Hub.
4. Bell removed from AppHeader; rail's bell shows the same unread badge count as the old bell did.
5. Tooltip on hover for each rail item.
6. Keyboard: tab into rail, arrow up/down navigates items, Enter activates.
7. `npx vite build` clean.

## Confirmed decisions

1. **Notifications surface — full-page Notifications app.** Clicking the bell in the rail switches the main body to a full-page list, peer to Queue and Dashboard. Clicking an unread row routes back into the Queue app and opens the relevant case.
2. **Attorney Dashboard first cut — filtered case list.** Uses sketched-but-functional placeholder content: a filtered slice of `MOCK_CASES` showing only cases flagged for Internal Escalation or Lawyer Assignment, rendered with the existing CaseCard components. See the *Attorney Dashboard* section above for the filter rule.
3. **Rail width — fixed 48px, icons only.** Tooltip on hover surfaces the label. No expand/collapse toggle in this cut.
4. **AppHeader bell — fully removed.** Bell + popover dropdown stripped from `AppHeader.tsx`. `useCorrespondenceNotifications` hook stays (lifted to App level) since both the rail badge and the NotificationsPage consume it.
5. **Active-state visual — both, layered.** 3px brand-colored bar on the left edge of the active button + a subtle background tint behind the icon. Icon swaps `Regular → Filled`.
6. **Rail ordering — Notifications → (separator) → Queue → Attorney Dashboard.** Notifications takes the topmost slot for fastest visual scanning of the unread badge. Queue and Dashboard sit below the separator as the hero apps.
7. **Persistence — `activeApp` persists in localStorage.** Key: `dars.activeApp`. Restores last-active app on reload; falls back to `"queue"` when storage is unavailable or the value is unknown.

## Risks

- **Layout shift on first paint.** Adding the rail changes the body's leftmost edge by 48px. If any case-page component has hardcoded left positions / margins, they'll shift. Mitigation: rail is part of the outer flex shell, so existing components measure their own width — should be a no-op visually inside the body, but worth a regression sweep on the case form + collection tracker.
- **Existing left sidebars.** The collection-page sidebar nav (`CollectionSidebarNav`) and the workflow sidebar (`WorkflowSidebar`) already live inside the body and start at the left edge. With the rail added, they sit *next to* the rail, not flush with the viewport. This is correct M365 behavior but may look "double-rail" — confirm before shipping. Mitigation: when a case is open, the workflow sidebar's leftmost icon column could be visually de-emphasised (or the rail could collapse to a thinner 32px in case view). Defer until we see it live.
- **Notifications "app" empty state.** If the user has no cases assigned (and therefore no unread items), the Notifications page is just empty. Need a friendly empty state — e.g. "You're all caught up. New inbound items from the authority will appear here."
- **Tooltip vs. screen-reader label conflict.** Fluent's Tooltip with `relationship="label"` is the right pattern but make sure the `aria-label` on each rail button doesn't double-announce. Hand-tested in NVDA / VoiceOver during implementation.
