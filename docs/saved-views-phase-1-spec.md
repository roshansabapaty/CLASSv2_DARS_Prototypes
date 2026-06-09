# Saved Views — Phase 1 Product Feature Specification

**Audience:** Engineering (LENS-LRMS WebClient + WebApi; LENS-CMS API + DataAccess; LENS-Common contracts) and Business Analysts (Response Specialists, Operations Leads, Program Managers).

**Scope:** This specification covers **Phase 1** of Saved Views — *personal* named, persistable view definitions over the Case List View Controls surface (filters / sort / columns / scope). Phase 1 ships with **no sharing**, **no team views**, **no subscriptions**, and **no cross-user visibility**.

**Phase 2 (out of scope for this document):** sharing personal views with other named users, group/team views, ACL-controlled view distribution, and view-subscription notifications. See §10.3 for the deferred-feature list.

**Companion specifications:**
- **[Case List View Controls](./case-list-view-controls-spec.md)** — defines the underlying view-control state that a saved view captures.
- **Saved Views — Phase 2** (future) — sharing, team views, subscriptions.

**Status:** Draft. Anchored against LENS-Common / LENS-CMS / LENS-LRMS source as of the sync run that produced this document (LENS-CMS@a05a9e6, LENS-Common@b93b66b, LENS-LRMS@7874ca3e), and against the prototype implementation at `c:/R/DARS_eEvidence/`.

---

## 1. Problem Statement & Context

### 1.1 The problem

Once the Case List View Controls (Spec 1) give every persona the ability to dial in a filtered, sorted, and column-configured slice of the case list, the next bottleneck is *retention*. Today, every personalized slice the user constructs is lost on:

- **Page reload** — primary sort and filter bag are session-scoped only (per Spec 1 §5.5).
- **Device change** — the per-user persistence today is browser-`localStorage`, not server-side.
- **Browser data clear** — same root cause.
- **Switching surfaces** — the column reorder a user dialed in for the Cases page is gone when they come back to it after working a different surface.
- **Onboarding a new team member** — every new hire reinvents the same operational slices from scratch ("Show me US Federal subpoenas due this week").

The four primary personas all hit this differently:

- **TS** (Triage Specialist): processes intake against a small set of recurring jurisdiction × request-type combinations. Re-dialing those filters every morning is friction; *saving* the combination is the unblocker.
- **RS** (Response Specialist): personal queue is *the* daily work-list — `My Cases` + a few personalized narrowings (e.g., "My emergencies due this week", "My GFR-held cases awaiting response"). These narrowings are 5–10 saved views per RS.
- **Operations Lead**: weekly forecasting depends on the same exact slice every week (request type × jurisdiction × due-date bucket). Saved views make weekly forecasts reproducible.
- **Attorney / Escalation Reviewer**: works escalations on the Attorney Dashboard surface; saved views capture sub-state filters ("Pending review", "Stale 7d+", "Recommend rejection candidates").

### 1.2 Why Phase 1 is personal-only

Sharing introduces three concerns that are out of scope for the first ship:

1. **ACLs and authorization model** — who can see whose views, who can edit them, who can delete them, and how that interacts with tenant isolation. This is the bulk of Phase 2 design.
2. **Schema drift** — a shared view captures filter values that were valid when saved; if the catalog evolves (filters renamed, removed, or shape-changed), a shared view can break for every recipient simultaneously. Personal views can be retired silently by their owner; shared views need explicit lifecycle.
3. **Trust boundaries** — a shared view can encode operational intent ("escalations I'm not actioning") that the owner doesn't want broadcast. Sharing semantics need to be opt-in per-view; Phase 1 sidesteps this entirely.

Personal Phase 1 ships clean: every user has their own private view library, no cross-user impact, no ACL evaluator. Phase 2 builds on this foundation rather than retrofitting sharing onto a model that didn't anticipate it.

### 1.3 Outcome the spec drives toward

A Saved Views Phase 1 surface that:

1. Captures the user's current Case List View Controls state as a named, server-persisted view.
2. Lets the user **apply** any of their saved views with one click, restoring exactly the captured state.
3. Lets the user **rename**, **update** (overwrite), or **delete** any view they own.
4. Surfaces **system (built-in) views** alongside the user's personal views — pre-defined slices that ship with the product and can't be edited or deleted.
5. Surfaces a **"(modified)" indicator** so the user always knows when their current state has drifted from the saved snapshot.
6. **Survives device changes and browser clears** — server-side persistence keyed on the authenticated user identity.
7. **Per-surface separation** — Cases page views ≠ Attorney Dashboard views (each surface has its own quick-filter tabs, default column subset, and conceptually distinct work-list).
8. **Forward-compatible with Phase 2 sharing** — the schema and API contracts anticipate the future addition of ownership and sharing without breaking changes.

---

## 2. Business Requirements

### 2.1 Capability matrix

| # | Capability | Primary persona | Drives |
|---|---|---|---|
| BR-1 | Save the current Case List View Controls state as a named view | All | Workflow reproducibility |
| BR-2 | Apply a saved view in one click — restore the captured state exactly | All | Time-to-work |
| BR-3 | Update (overwrite) an existing saved view with the current state | All | Iteration on personal slices |
| BR-4 | Rename a saved view | All | Clarity, taxonomy ownership |
| BR-5 | Delete a saved view | All | Hygiene, removing stale slices |
| BR-6 | Surface built-in system views the user can apply but not edit | All | Onboarding, common baselines |
| BR-7 | Show a "(modified)" indicator when the current state has drifted from the applied view | All | Trust — "is this what I saved?" |
| BR-8 | Per-surface view libraries (Cases vs Attorney Dashboard) | All | Surface-specific work-lists |
| BR-9 | Server-side persistence so views survive devices, browsers, and re-installs | All | Continuity |
| BR-10 | Multi-tenant isolation — views are scoped to the user identity within their tenant | All | Security, transparency-reporting integrity |
| BR-11 | Graceful handling of catalog drift — a saved view referencing a removed filter / column degrades cleanly instead of throwing | Engineering, All | Operational stability |
| BR-12 | Forward-compatible schema for Phase 2 sharing | Engineering | Avoid breaking-change releases |

### 2.2 Why these capabilities are critical

**Operational consistency (BR-1, BR-2, BR-3).** Once an Ops Lead has dialed in the weekly forecasting slice, that slice becomes a *named asset* — every Monday they apply the same view and produce the same forecast. Without Saved Views, the asset lives in a manual checklist (often a OneNote page) and drifts as filters evolve.

**Onboarding speed (BR-6).** New TS / RS hires inherit the system view library on day one. The "Emergency / Urgent" and "Overdue" system views shipped in the prototype ([savedViews.ts:77-126](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts#L77-L126)) are concrete examples — every persona uses them before they build their first personal view.

**Workflow continuity (BR-9).** The current `localStorage` persistence ([savedViews.ts:132-188](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts#L132-L188)) is browser-bound. Operations Leads frequently work across multiple devices (laptop in the office, secondary laptop for legal-hold reviews, on-call iPad). Saved views must roam with the user identity, not the browser profile.

**Trust and auditability (BR-7).** Without the modified indicator, users can't tell whether the slice they're working from is the saved view they think it is. For transparency-report-adjacent work this is a correctness concern: the report writer needs to know whether the slice that produced their counts matches the saved view the report cites.

**Forward compatibility (BR-12).** Phase 2's sharing model adds `ownerId`, `sharedWith[]`, and visibility-scope fields. Phase 1 ships the schema *as if those fields exist* but doesn't expose them in the UI — so Phase 2 is purely additive, not a breaking migration.

### 2.3 Non-goals (Phase 1)

- ❌ Sharing a saved view with another user.
- ❌ Team / group views.
- ❌ "Subscribe to this view" notifications when matching rows enter / exit.
- ❌ View import / export (e.g., as JSON for support escalations).
- ❌ View versioning — only the current snapshot is stored; no diff history.
- ❌ Cross-tenant view roaming (a user with access to tenants A and B does NOT see tenant-A views from within tenant B).
- ❌ Auto-pinning views to specific cases.
- ❌ Per-saved-view custom UI themes / branding.

---

## 3. User Experience (UX) Requirements

### 3.1 Saved Views menu — placement and trigger

**Placement.** Leftmost item in the toolbar's Row 2 (the filter-controls row), to the left of "+ Add filter":

```
[Saved Views ▾] · [+ Add filter] · [Sort] · [Customize view] · [Save current view] · [Export list] · [Search…]
```

**Trigger.** A button styled as a small popover-trigger with:

- A bookmark icon.
- Either the literal text "Saved views" (when no view is currently applied) OR the currently-applied view's name + `(modified)` suffix when state has drifted.
- A chevron-down to indicate it's a popover trigger.

**Visual state when a view is applied:**

- Active view, no drift → button outlined in the surface's primary brand color (Cases page = `#0078d4`; Attorney Dashboard = `#5c2d91`), filled with a translucent brand tint.
- Active view, drifted → button reverts to the neutral outlined treatment, and the trigger label appends `" (modified)"`.

Reference implementation: [SavedViewsMenu.tsx:85-115](C:/R/DARS_eEvidence/src/components/case-queue/SavedViewsMenu.tsx#L85-L115).

### 3.2 Saved Views menu — open behavior

Clicking the trigger opens a popover with three vertically-stacked sections:

1. **System views** (always shown, even when empty for QA/test environments). Header: "System views" with a small lock glyph. Each row is read-only (no edit/delete affordances).
2. **Your views** (omitted entirely when the user has zero personal views). Header: "Your views". Each row carries a per-row "⋮" overflow menu with `Update from current`, `Rename`, and `Delete` items.
3. **Save current view…** action — always the last item, separated by a divider. Opens the SaveViewDialog (§3.5).

**Row affordances** (per [ViewRow](C:/R/DARS_eEvidence/src/components/case-queue/SavedViewsMenu.tsx#L185-L259)):

- Check glyph on the left when the row is the currently-applied view.
- View name (truncated with ellipsis at 200px).
- `modified` micro-tag on the applied row when current state has drifted.
- "⋮" overflow on user views; system views show no overflow.

**Click semantics:**

- Clicking the row body anywhere except the "⋮" applies the view and closes the popover.
- Clicking "⋮" stops propagation (does NOT apply) and opens the per-row action menu.
- Selecting a per-row action (Delete, Rename, Update from current) keeps the popover open so the user can continue managing without re-opening.

### 3.3 Applying a view

Applying a view writes the captured snapshot back to the runtime state, replacing:

| Runtime state | Source |
|---|---|
| Active quick-filter tab | `view.filters.quickFilter` |
| Primary sort | `view.filters.sortState` (may be null → falls to surface default) |
| Sort tiebreakers | `view.filters.sortTiebreakers ?? []` |
| Extra-filter bag | `view.filters.extraFilters ?? {}` |
| Case scope (Active/All) | `view.filters.caseScope ?? "active"` |
| Column order | `view.filters.columnOrder ?? defaultColumnOrder(catalog)` |
| Column visibility | `view.filters.columnHidden ?? defaultColumnVisibility(catalog)` |

**Preserved (NOT overwritten by apply):**

- Search term (transient lookup — preserved across view changes).
- View-mode toggle (cards / list / preview — layout preference, not view content).
- Per-column widths (resize is a user preference layered over the visible column set).
- Selected case in the preview pane (transient selection).

The persisted per-user defaults (column order, visibility, scope) — the `localStorage`-backed values from Spec 1 §5.5 — are **also updated** when a view is applied. Rationale: if the user applies a view, that's the slice they want to keep across reloads too, not the slice they had before applying. Applying a saved view is "I want this to be my working set"; on next reload, the same view is the natural starting place.

**Apply latency target.** Apply must complete in <200ms (client-side only — no network round-trip). The captured snapshot is already in memory when the user opens the menu.

### 3.4 Modified-from-saved indicator

A saved view is considered "modified" when the runtime state has drifted from the captured snapshot on **any** of the following dimensions:

- Quick-filter tab.
- Primary sort `columnId` or `direction`.
- Sort tiebreakers (length OR ordering OR contents).
- Extra-filter bag — any added, removed, or value-changed filter.
- Case scope.
- Column order — any reordering.
- Column visibility — any show/hide change.

The comparison is performed by `viewMatchesCurrent(view, current)` (reference: [savedViews.ts:204-231](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts#L204-L231)). When `viewMatchesCurrent` returns `false`, the menu trigger appends ` (modified)` and the applied row shows the `modified` micro-tag.

**Search term is excluded** from the comparison — it's not part of the view, so typing in the search box never marks the view modified.

### 3.5 Save current view dialog

Opens from:
- The Saved Views menu's "Save current view…" item.
- The toolbar's standalone "Save current view" button.
- The Customize view panel's footer "Save as view…" button.

**Dialog content** (reference: [SaveViewDialog.tsx](C:/R/DARS_eEvidence/src/components/case-queue/SaveViewDialog.tsx)):

- Title: "Save current view".
- Body: "Capture the current filter selection, badge selection, and sort order as a named view you can return to later. Search terms are not saved."
- Single text input: View name (autofocused on open).
- Inline error region below the input.
- Cancel + Save buttons in the footer.

**Validation:**

| Condition | Error message | Behavior |
|---|---|---|
| Empty / whitespace-only name | "Name is required." | Save button stays enabled but click triggers error |
| Name matches an existing view (case-insensitive) including system views | "A view with this name already exists." | Save click triggers error |
| Name length > 80 characters | "Name must be 80 characters or fewer." | Save click triggers error |
| Name contains control characters or newlines | "Name cannot contain line breaks or control characters." | Save click triggers error |
| User has reached the per-user view cap (see §4.5) | "You've reached the maximum of 50 personal saved views. Delete one before saving a new one." | Save click triggers error; offer "Manage views" link |

The conflict check is **case-insensitive** to avoid "My Cases" and "my cases" being treated as different views — operationally they're the same view to a human.

The error region (`role="alert"`) announces to screen readers; the input is marked `aria-invalid="true"` when an error is showing.

**Submit behavior:**

- Enter key in the input submits.
- Successful save: dialog closes, the new view becomes the currently-applied view (the captured state matches the runtime state by construction, so no "modified" indicator).
- Failed save (server error): dialog stays open, error region surfaces the upstream error, input value preserved.

### 3.6 Update view from current

Per-row "⋮" action on user views only: `Update from current`. Overwrites the saved view's `filters` snapshot with the runtime state. After confirmation, the view stops being marked "(modified)".

**Confirmation pattern.** This action is potentially destructive (loses the old captured state). The "⋮" item opens an AlertDialog:

- Title: "Update '{viewName}'?"
- Body: "This replaces the saved view's contents with your current filters, sort, columns, and scope. The previous saved state will be lost."
- Buttons: Cancel · Update view (primary).

Only fires when the view is currently applied AND modified. When the view isn't applied (or is applied but not modified), the menu item is disabled with the tooltip "No changes to update — apply the view first or change a filter."

### 3.7 Rename view

Per-row "⋮" action on user views only: `Rename`. Opens an inline rename input on the row (or a small modal — both are acceptable; reference implementation is a small modal mirroring the Save dialog).

Validation is identical to §3.5 except the user's own current name does NOT count as a conflict (renaming "X" to "X" is a no-op, not an error).

### 3.8 Delete view

Per-row "⋮" action on user views only: `Delete view` (red `Trash2` glyph, `#a4262c`).

**Confirmation pattern.** AlertDialog:

- Title: "Delete '{viewName}'?"
- Body: "This view will no longer appear in your Saved views menu. This cannot be undone."
- Buttons: Cancel · Delete view (destructive primary, `#a4262c`).

**Post-delete behavior:**

- If the deleted view was the currently-applied view, the surface falls back to "no view applied" — runtime state is preserved (the user keeps their current filter/sort/etc.), the trigger label reverts to "Saved views", and the `(modified)` tag is dropped.
- The menu popover stays open so the user can pick a replacement view.

### 3.9 System views are read-only

System views render with the same visual treatment as personal views but **no** "⋮" overflow menu and no Delete / Rename / Update actions. The lock glyph in the "System views" section header is the only chrome difference.

Applying a system view and then modifying the runtime state shows the same `(modified)` indicator as for personal views. There is no "Save as new view from system view" affordance in Phase 1 — the user uses the regular Save Current View dialog from the toolbar to create a personal copy.

### 3.10 Per-surface menu separation

The Cases page and Attorney Dashboard each mount their own SavedViewsMenu instance bound to their own surface scope:

| Surface | View library scope | System view examples |
|---|---|---|
| Cases page | `surface = "queue"` | "All cases", "Emergency / Urgent", "Overdue" |
| Attorney Dashboard | `surface = "attorneyDashboard"` | "All escalations", "My cases", "Threat to life" |

A view saved on the Cases page is NOT visible from the Attorney Dashboard's menu, and vice versa. This mirrors the prototype's `STORAGE_KEY` per-surface split ([savedViews.ts:132-135](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts#L132-L135)) and reflects the operational reality that the two surfaces show different quick-filter tabs and different default column subsets — a "My cases" view on one surface is conceptually a different view from "My cases" on the other.

### 3.11 Empty state — no personal views yet

When the user has zero personal views, the menu shows:

- The "System views" section with the available built-ins.
- A divider.
- The "Save current view…" action.

The "Your views" section is omitted entirely; no "(empty)" placeholder. This matches today's prototype behavior ([SavedViewsMenu.tsx:139](C:/R/DARS_eEvidence/src/components/case-queue/SavedViewsMenu.tsx#L139)).

### 3.12 Responsiveness and performance

| Interaction | Target latency (p95) | Mechanism |
|---|---|---|
| Open menu | 100ms | Pre-loaded view list (fetched on page mount; refreshed on Save / Update / Delete / Rename success) |
| Apply view | 200ms | Client-side state restore |
| Save view → menu reflects new entry | 600ms | Server roundtrip + local list update |
| Delete view → row disappears | 400ms | Optimistic UI: row hides immediately, server roundtrip reconciles |
| Rename view → label updates | 400ms | Optimistic UI: row label updates immediately, server roundtrip reconciles |
| Update view → modified indicator clears | 500ms | Server roundtrip + local snapshot replacement |

**Optimistic UI policy.** Save, Update, Delete, and Rename apply the local change immediately; the server roundtrip reconciles. On server failure, the local change is reverted and an error toast is surfaced. Apply has no server roundtrip (the snapshot is already in memory).

### 3.13 Loading and error states

| Scenario | UX |
|---|---|
| First page load — view library is being fetched | Trigger button is enabled but shows a small spinner inside the bookmark glyph; menu opens but shows a "Loading your views…" message until the fetch completes |
| Fetch failure (5xx) | Trigger button is enabled; menu shows "Couldn't load your views. {message}" with a Retry button; system views are still visible (they're shipped with the bundle, not fetched) |
| Save / Update / Delete / Rename failure | Optimistic change reverts; toast: "{Action} failed — {message}"; original view list restored |
| 401 Unauthenticated mid-session | Standard auth redirect; partial UI state lost (user re-authenticates) |
| 403 — user lost view-management permission | Toast: "You no longer have permission to manage saved views. Contact your admin." Menu falls back to read-only mode (system views + apply only) |
| 429 — rate-limited on Save/Update/Delete | Toast with `Retry-After`: "Too many changes — try again in {N}s." |

### 3.14 Keyboard and accessibility

- **Tab focus**: Saved Views trigger is reachable via Tab from the surface's quick-filter tabs.
- **Popover open**: Enter / Space on the focused trigger opens the menu; Escape closes.
- **Row navigation**: Arrow Up/Down moves through rows; Enter applies the focused row; Tab moves to the per-row "⋮" button.
- **"⋮" menu**: Standard dropdown — Arrow Up/Down navigates items, Enter activates.
- **Modal dialogs (Save, Confirm Delete, Confirm Update)**: focus-trapped per WAI-ARIA dialog pattern; Escape cancels.
- **ARIA**:
  - Trigger button: `aria-haspopup="dialog"`, `aria-expanded` toggled.
  - Popover container: `role="menu"` with `aria-label="Saved views menu"`.
  - Applied row: `aria-current="true"`.
  - Modified indicator: announced via the trigger button's accessible name (the `aria-label` includes " (modified)" so screen-reader users hear the state).
- **Live region**: Successful Save / Update / Delete / Rename actions post to a polite live region: `"View '{name}' saved."` / `"View '{name}' updated."` / `"View '{name}' deleted."` / `"View renamed to '{new}'."`

### 3.15 Cross-tab synchronization (single-user, multi-tab)

When the user has two tabs of LRMS Portal open and edits a view in tab A, tab B should reflect the change without manual refresh.

**Mechanism.** Each tab subscribes to a per-user storage event (browser `storage` event when persistence is `localStorage`, or a server-sent-event channel when persistence is server-side — see §5). On a remote change, the inactive tab:

- Refreshes its view list.
- If the user is on the currently-applied view AND that view was updated remotely, surfaces a non-blocking toast: "'{name}' was updated in another tab — applying the new version." and re-applies.
- If the currently-applied view was deleted remotely, the trigger reverts to "Saved views" (no view applied) + toast: "'{name}' was deleted in another tab."

---

## 4. Functional Requirements

### 4.1 What a saved view captures

The saved view's `filters` field captures the following keys. All except `quickFilter` and `sortState` are optional for back-compat with views saved before later capabilities shipped.

| Field | Type | Default if absent | Reference |
|---|---|---|---|
| `quickFilter` | `string` (catalog quick-filter id) | `"all"` | `CommonViewFilters.quickFilter` |
| `sortState` | `{ columnId, direction } \| null` | `null` (surface default) | `CommonViewFilters.sortState` |
| `sortTiebreakers` | `Array<{ columnId, direction }>` (max 2) | `[]` | `CommonViewFilters.sortTiebreakers` |
| `extraFilters` | `Record<string, unknown>` (FilterDef.id → value) | `{}` | `CommonViewFilters.extraFilters` |
| `caseScope` | `"active" \| "all"` | `"active"` | `CommonViewFilters.caseScope` |
| `columnOrder` | `ColumnId[]` | `defaultColumnOrder(catalog)` | New in Phase 1 |
| `columnHidden` | `ColumnId[]` | `defaultColumnVisibility(catalog)` | New in Phase 1 |

**Why `columnOrder` and `columnHidden` are part of the view** (and not just per-user persistence): a personal Ops Lead view "Weekly forecast" is meaningless without the specific column subset that makes the forecast readable. Capturing column state inside the view ensures applying the view restores the user's complete configuration — filters + sort + the table shape itself.

### 4.2 What a saved view does NOT capture

- **Search term** — transient lookup.
- **View mode** (cards / list / preview) — per-user layout preference.
- **Per-column widths** — per-user comfort setting layered over the visible column set.
- **Preview pane selection** — transient.
- **Bulk selection state** — transient.
- **Pagination position** — every apply resets to page 1.

### 4.3 System (built-in) views

System views ship with the product. Phase 1 ships the prototype's six:

**Cases page (`surface = "queue"`):**

| `id` | Name | Captured state |
|---|---|---|
| `sys-queue-all` | "All cases" | `quickFilter: "all"`, `sortState: null` |
| `sys-queue-emergency` | "Emergency / Urgent" | `quickFilter: "emergency"`, `sortState: { columnId: "due-date", direction: "asc" }` |
| `sys-queue-overdue` | "Overdue" | `quickFilter: "overdue"`, `sortState: { columnId: "due-date", direction: "asc" }` |

**Attorney Dashboard (`surface = "attorneyDashboard"`):**

| `id` | Name | Captured state |
|---|---|---|
| `sys-att-all` | "All escalations" | `quickFilter: "all"`, `sortState: null` |
| `sys-att-my-cases` | "My cases" | `quickFilter: "myCases"`, `sortState: null` |
| `sys-att-threat-to-life` | "Threat to life" | `quickFilter: "threatToLife"`, `sortState: { columnId: "due-date", direction: "asc" }` |

**Reference**: [savedViews.ts:77-126](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts#L77-L126).

**Implementation note.** System views are NOT stored in the server-side persistence layer — they live in the WebClient bundle as a constant array. This avoids a Phase 2 problem where every tenant has to be migrated when a system view's content changes; instead, a build rolls forward and every user sees the new system view definition on next page load.

### 4.4 View ownership

Every saved view in Phase 1 has exactly one owner: the user identity that created it. The owner has implicit full rights to read / update / delete the view.

**Ownership identity.** The MISE v2 `SubjectClaim` (Entra ID `oid` for human users) keys ownership. Service principal identities cannot own views — Save / Update / Delete on a non-human caller is rejected with 403.

**Tenant scope.** Views are scoped to the (tenant, user) pair. A user whose identity is valid in both tenant A and tenant B sees disjoint view libraries when working in each. Cross-tenant view visibility is explicitly **not supported in Phase 1** (deferred to a future "Transparency Reporter" cross-tenant role — see Spec 1 §10.3 F-5).

**Phase 2 forward-compat.** The persisted schema (§5.1) includes `ownerId`, `tenantId`, `visibility` (= `"private"` for every Phase 1 row), and a placeholder `sharedWith[]` (always empty in Phase 1). The View Management API filters every list query on `ownerId = caller.subjectClaim` so a future expansion to `sharedWith.contains(caller.subjectClaim) OR visibility = "team"` is a one-line query change.

### 4.5 Per-user limits

| Limit | Value | Rationale |
|---|---|---|
| Maximum personal views per (user, surface) | 50 | A persona who genuinely needs >50 named slices is more likely building reports than managing a workflow; cap forces hygiene |
| Maximum view name length | 80 characters | Fits in the menu without truncation at typical viewport widths |
| Maximum captured `filters` payload size | 16 KB serialized | Hard cap to prevent a corrupted client from bloating storage; 16 KB is ~10× the size of a maximally-loaded prototype view |

Hitting the maximum surfaces an inline error (§3.5) — no silent drop.

### 4.6 Default view behavior

**No view applied as default.** On a fresh user (no view library, no remembered last-applied view), the surface loads with `currentViewId = undefined`. Trigger label reads "Saved views". The runtime state is the surface's defaults (no extra filters, surface default sort, full column set per the catalog).

**Last-applied view restoration.** Per the prototype's [readSelectedViewId](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts#L168) pattern, the surface remembers the last-applied view id per-user. On next page load, the surface auto-applies that view (showing the row as the applied one in the menu).

This auto-apply is **NOT** the same as a "default view" feature — there's no "Set as default" affordance. Phase 1 just persists "what was applied last time" so a user who applies "Weekly forecast" Friday evening sees it again Monday morning without re-clicking. Phase 2 may add explicit "set as default for new sessions" semantics.

When the last-applied view has been deleted between sessions (e.g., from another device), the surface falls back to "no view applied" silently.

### 4.7 Reset behavior

Hard reset (Customize view panel's "Reset to default" footer button — Spec 1 §4.4) clears extra filters, sort, tiebreakers, column visibility, column order. **It does NOT delete saved views or change the applied view.**

After a Reset, if a view was applied, the modified indicator immediately shows (the runtime state has drifted from the snapshot). The user can either Apply the view again to restore it, or Update view from current to capture the post-reset state, or Save current view as a new view.

### 4.8 Catalog drift behavior

Saved views capture filter ids and column ids by reference. When the WebClient is updated and one of the referenced ids is removed (e.g., a filter is renamed or a column is retired), the stored view payload still references the old id.

**On apply, the WebClient must:**

1. Run each filter id in `extraFilters` through `getFilterDef(id)` — drop entries whose definition no longer exists, with a debug log per dropped id.
2. Run each column id in `columnOrder` / `columnHidden` through the catalog — drop unknown ids and append any newly-introduced catalog ids per the sanitiser pattern in [caseListColumns.ts:sanitizeColumnOrder](C:/R/DARS_eEvidence/src/components/case-queue/caseListColumns.ts).
3. Validate `sortState.columnId` and each `sortTiebreakers[i].columnId` against the catalog. Drop unknown sort keys.

**No automatic re-save.** The cleaned view is applied in-memory but the stored snapshot is NOT overwritten. Rationale: the user may intentionally have the old reference (the filter is coming back, or they want to know which views still reference the deprecated id). Persistent cleanup happens only when the user explicitly Updates the view from current.

**Telemetry.** Every catalog-drift drop emits a `LrmsCaseOperationEvent { Operation = ApplySavedView, Phase = Warning, Message = "Dropped reference to {id} not in catalog" }` so operations can monitor drift impact across the user base.

---

## 5. Data Model & Backend Requirements

### 5.1 SavedView document schema

The server-side persistence layer stores a SavedView document per saved view. The schema is forward-compatible with Phase 2 sharing.

```jsonc
{
  "id": "view-{kebab-uuid}",          // partition key on (tenantId, surface, ownerId)
  "tenantId": "tenant-...",            // partition scope
  "ownerId": "{Entra oid}",            // user identity
  "surface": "queue" | "attorneyDashboard",
  "name": "Weekly forecast",
  "filters": { /* see §4.1 */ },       // 16 KB max
  "createdAt": "2026-06-08T20:35:00Z", // RFC 3339
  "modifiedAt": "2026-06-08T20:35:00Z",
  "etag": "{cosmos etag}",             // optimistic concurrency

  // Phase 2 placeholders — written but unused in Phase 1
  "visibility": "private",             // future: "private" | "shared" | "team"
  "sharedWith": [],                    // future: list of subject claim ids
  "schemaVersion": 1                   // increments when the on-disk shape changes
}
```

### 5.2 Storage layer

**Service.** Phase 1 introduces a new CMS endpoint group `api/v1/saved-views` co-located with the existing case management surface. The rationale for hosting saved views in CMS rather than a new service:

- Existing MISE v2 auth + Cosmos infrastructure.
- Existing tenant-isolation patterns (partition key strategy).
- Existing observability (Geneva structured logging).
- Avoids a new service deployment pipeline.

A new Cosmos container `SavedViews` in the existing CMS database, partitioned on `tenantId` (matching the existing `Cases` container's pattern per [LENS-CMS CLAUDE.md L217](C:/R/LENS-CMS/CLAUDE.md)).

**Partition strategy.** `tenantId` only — single-partition queries per user (filtered by `ownerId` and `surface` server-side). Cross-partition scans are not required for any Phase 1 query.

**Indexes.** Composite index on `(tenantId, ownerId, surface, modifiedAt DESC)` so the list query is order-by-modifiedAt single-partition.

**ETag.** Every document has the Cosmos-managed `_etag`. PATCH / PUT operations require an `If-Match` header; mismatched ETag returns 412 Precondition Failed.

### 5.3 Query patterns

| Query | Frequency | Cost (RU est.) |
|---|---|---|
| List views for (tenantId, ownerId, surface) | On page load + after any mutation | <5 RU (single-partition, indexed) |
| Get view by id | On apply (only when the snapshot isn't already in memory) | <2 RU |
| Create view | On Save current view | <5 RU |
| Update view | On Update from current or Rename | <5 RU |
| Delete view | On Delete | <2 RU |

Per-user QPS at 5 actions/minute peak yields well under the 10 RU/s reserved capacity per user.

### 5.4 Authorization model

**Role.** A new CMS role `CMS.SavedViewsManager` granted to LRMS-WebApi's service principal. The role mapping policies:

| Endpoint | Required role |
|---|---|
| GET `/api/v1/saved-views` | `CMS.SavedViewsManager` |
| GET `/api/v1/saved-views/{id}` | `CMS.SavedViewsManager` |
| POST `/api/v1/saved-views` | `CMS.SavedViewsManager` |
| PATCH `/api/v1/saved-views/{id}` | `CMS.SavedViewsManager` |
| DELETE `/api/v1/saved-views/{id}` | `CMS.SavedViewsManager` |

**Per-row authorization** (enforced in the handler, NOT the policy):

- Every query is filtered by `ownerId = caller.subjectClaim` server-side.
- Every PATCH / DELETE checks `existing.ownerId === caller.subjectClaim` BEFORE applying; mismatch returns 403 with `errorCode: "NotOwner"`.
- This guarantees Phase 1's "no cross-user visibility" invariant even if the role is accidentally granted broadly.

**MISE v2 caller chain.** LRMS-WebApi presents its service-principal token + the end-user's identity via the existing CDT (Constrained Delegation Token) pattern. CMS extracts the end-user's `oid` from the CDT and uses it as `ownerId` — the end user, not the service principal, owns the view.

### 5.5 Cosmos document lifecycle

**Soft delete.** Phase 1 does NOT use soft delete — DELETE permanently removes the document. Rationale: the user has explicit warnings; restoration is a future concern; soft delete adds query complexity (every list must filter `isDeleted = false`) for marginal benefit.

**TTL.** No TTL is set. A saved view persists until the user deletes it or the user identity is purged from Entra (which triggers a separate cascade — see §5.8).

### 5.6 Schema versioning

The `schemaVersion` field on each document allows future migrations:

- Phase 1 ships `schemaVersion = 1`.
- When a future build needs to change the shape of `filters` (e.g., breaking `sortState` shape change), it ships a migration handler in the WebApi adapter: on read, documents at older `schemaVersion` are transformed in-flight to the current shape; on next write the document is persisted at the current version.
- The transformation is read-only — Phase 1 commits to never destroying a document during migration.

### 5.7 Concurrency

A user with two tabs open could attempt to modify the same view from both. The ETag-based optimistic concurrency in §5.2 catches this:

- Tab A reads view at ETag `"abc"`.
- Tab B reads the same view at ETag `"abc"`.
- Tab A submits an Update with `If-Match: "abc"` → CMS accepts, new ETag `"def"`.
- Tab B submits an Update with `If-Match: "abc"` → CMS returns 412.
- Tab B's WebClient reconciles: refetches the view, shows a toast: "This view was updated in another tab. Your changes were not saved." and re-opens the editor with the latest snapshot.

### 5.8 User-deletion cascade

When an Entra identity is deprovisioned (e.g., employee leaves), the tenant's user-cleanup job should cascade-delete all SavedViews documents owned by that identity. Phase 1 does NOT implement an automatic cascade — instead:

- Orphaned views (whose `ownerId` no longer resolves to an active identity) are tolerated by the query layer (they're simply never fetched because no live user has that subject claim).
- A nightly cleanup job (NEW, proposed) sweeps documents whose `ownerId` no longer maps to an active user in the tenant's directory and deletes them.

Until the cleanup job ships (Phase 2 target), orphaned documents accumulate at the typical employee-turnover rate. At expected scale (tens of users per tenant, <10 views per user), this is negligible.

---

## 6. Frontend ↔ Backend Contracts

### 6.1 LRMS WebClient → LRMS WebApi

All endpoints are scoped under `/api/saved-views`. WebApi acts as the adapter between the WebClient (which uses surface-typed shapes) and CMS (which uses the canonical `SavedViewDocument` shape).

#### 6.1.1 List user's views

```
GET /api/saved-views?surface={queue|attorneyDashboard}
```

**Response 200:**

```ts
interface SavedViewListResponse {
  views: SavedViewDto[];
}

interface SavedViewDto {
  id: string;
  name: string;
  surface: "queue" | "attorneyDashboard";
  filters: CommonViewFilters;
  createdAt: string;       // RFC 3339
  modifiedAt: string;
  etag: string;
  // Phase 2 placeholders — always "private" / [] in Phase 1
  visibility: "private";
  sharedWith: [];
}
```

#### 6.1.2 Get single view

```
GET /api/saved-views/{id}
```

**Response 200:** `SavedViewDto`. **404:** unknown id. **403:** view exists but caller is not owner.

#### 6.1.3 Create view

```
POST /api/saved-views
Content-Type: application/json
{
  "name": "Weekly forecast",
  "surface": "queue",
  "filters": { /* CommonViewFilters */ }
}
```

**Response 201:** `SavedViewDto` with the assigned id, `Location: /api/saved-views/{id}` header.

**Errors:**

| Status | `errorCode` | Cause |
|---|---|---|
| 400 | `NameRequired` | Empty name |
| 400 | `NameTooLong` | Name > 80 chars |
| 400 | `NameInvalid` | Control chars / newlines in name |
| 409 | `NameConflict` | Case-insensitive name already used by caller on same surface |
| 400 | `PayloadTooLarge` | `filters` serializes to > 16 KB |
| 400 | `InvalidFilters` | `filters` fails server-side schema validation |
| 429 | `LimitReached` | Caller has 50 views on this surface already |

#### 6.1.4 Update (overwrite) view

```
PATCH /api/saved-views/{id}
If-Match: "{etag}"
Content-Type: application/json
{
  "name"?: "New name",                    // optional — for Rename
  "filters"?: { /* CommonViewFilters */ } // optional — for Update from current
}
```

Either or both fields may be present. At least one is required.

**Response 200:** updated `SavedViewDto`.

**Errors:**

| Status | `errorCode` | Cause |
|---|---|---|
| 400 | (validation errors as in Create) | — |
| 403 | `NotOwner` | Caller doesn't own this view |
| 404 | `NotFound` | View id doesn't exist |
| 409 | `NameConflict` | Rename to a name already in use |
| 412 | `EtagMismatch` | `If-Match` doesn't match current ETag |
| 428 | `IfMatchRequired` | `If-Match` header missing |

#### 6.1.5 Delete view

```
DELETE /api/saved-views/{id}
If-Match: "{etag}"
```

**Response 204:** No content. **Errors:** 403 NotOwner, 404 NotFound, 412 EtagMismatch, 428 IfMatchRequired.

### 6.2 LRMS WebApi → LENS-CMS

CMS exposes the same shapes under `/api/v1/saved-views`. WebApi is a thin translator — primary value-add is:

- MISE v2 CDT chain handling so CMS receives the end-user's `oid` as `ownerId`.
- Surface-typed validation: WebApi validates that `filters` matches the expected surface (e.g., a queue view can't carry an Attorney Dashboard quick-filter id).
- Audit logging via `LrmsCaseOperationEvent` (existing pattern) extended with `Operation = SaveView | UpdateView | DeleteView | ApplyView`.

The CMS contract carries an additional `tenantId` derived from the auth context; WebApi does not pass it explicitly.

### 6.3 Telemetry events

Every action emits a structured event:

| Event | Trigger |
|---|---|
| `LrmsCaseOperationEvent { Operation = ListSavedViews }` | Menu opens; page loads |
| `LrmsCaseOperationEvent { Operation = ApplySavedView, ViewId, IsSystemView, ModifiedAfterApply }` | User applies a view |
| `LrmsCaseOperationEvent { Operation = SaveView, ViewId, Surface }` | User saves a new view |
| `LrmsCaseOperationEvent { Operation = UpdateView, ViewId, RenameOnly, FiltersChanged }` | User updates or renames |
| `LrmsCaseOperationEvent { Operation = DeleteView, ViewId, WasApplied }` | User deletes a view |
| `LrmsCaseOperationEvent { Operation = ApplySavedView, Phase = Warning, Message = "Dropped reference to {id}" }` | Catalog drift on apply |

No raw filter values are logged — the `Filters` payload is summarized as a non-reversible fingerprint (same approach as Spec 1 §4.8 export audit).

### 6.4 Invalid / conflicting input handling

| Scenario | Server response | WebClient UX |
|---|---|---|
| Save with empty name | 400 NameRequired | Inline error on dialog |
| Save with conflicting name | 409 NameConflict | Inline error on dialog |
| Save exceeds 50-view limit | 429 LimitReached | Inline error on dialog with "Manage views" link |
| Update with stale ETag | 412 EtagMismatch | Toast + offer to discard local edits or reload latest |
| Apply view that was deleted server-side between fetch and apply | (no server roundtrip — applies the cached snapshot) | Banner: "This view no longer exists. The applied filters may not save back." |
| Apply view whose `filters` references a removed filter id | (server returns it as-is) | Apply succeeds with degraded set; warning toast: "Some filters in this view are no longer available and were skipped." |
| Server error during save | 500 + errorCode | Optimistic UI reverts; toast |
| Schema-mismatch on read (older `schemaVersion`) | Server migrates in-flight | (transparent to client) |

---

## 7. Calculated Fields & Derived Values

### 7.1 `isModified` (current state vs applied view)

| Aspect | Detail |
|---|---|
| Inputs | Runtime `CommonViewFilters` state + applied view's snapshot |
| Logic | `!viewMatchesCurrent(view, current)` — see [savedViews.ts:204-231](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts#L204-L231) |
| Comparison method | Quick-filter exact string match; sortState shallow equality on `columnId` + `direction`; sortTiebreakers length + per-position equality; extraFilters JSON-stringify per key, sorted keys; caseScope exact; columnOrder array-equality; columnHidden set-equality |
| Where evaluated | Client-side, on every relevant state change (debounced 50ms to avoid excess re-renders) |
| Use | Drives the `(modified)` indicator + the Update from current menu item's enabled state |

### 7.2 Name conflict check

| Aspect | Detail |
|---|---|
| Inputs | Proposed name + list of all existing view names for the same (user, surface) |
| Logic | `existing.some(n => n.toLowerCase() === proposed.trim().toLowerCase())` |
| Includes | Both personal AND system views |
| Excludes | The user's own current view name when in Rename mode (renaming to the same name is a no-op, not a conflict) |
| Where evaluated | Client-side (immediate feedback) + server-side (authoritative re-check) |

### 7.3 Last-applied view id

| Aspect | Detail |
|---|---|
| Inputs | Per-user surface state |
| Storage | Server-side, on the user identity (NOT inside a SavedView document) |
| Update trigger | Every successful Apply |
| Reset trigger | Successful Delete of the currently-applied view |
| Where evaluated | Client reads on page mount; auto-applies if non-null |

### 7.4 Filter / sort / column-id sanitization on apply

| Aspect | Detail |
|---|---|
| Inputs | The view's stored `filters` payload + current build's catalog (filter ids, column ids) |
| Logic | Each id is membership-tested against the catalog; misses are dropped |
| Telemetry | Every drop logs a Warning-phase event |
| Where evaluated | Client-side, immediately before apply commits |
| Side effect | Cleaned set is applied to runtime state but NOT persisted back to the document |

### 7.5 Forward-compat schema migration (read path)

| Aspect | Detail |
|---|---|
| Inputs | Document with older `schemaVersion` |
| Logic | A registered transformer per (from, to) pair; chained when crossing multiple versions |
| Side effect | Transformed shape is returned in the API response; the document is rewritten on the next user-initiated save |
| Where evaluated | LRMS WebApi (adapter layer) — keeps CMS handlers free of multi-version awareness |

---

## 8. Integration with Existing Systems

### 8.1 LENS-Common — new contracts to add

A new contract namespace `Microsoft.LENS.Common.DataModels.Contracts.SavedViews` containing:

```csharp
namespace Microsoft.LENS.Common.DataModels.Contracts.SavedViews;

public sealed class SavedViewDocument
{
    public required string Id { get; init; }
    public required string TenantId { get; init; }
    public required string OwnerId { get; init; }
    public required SavedViewSurface Surface { get; init; }
    public required string Name { get; init; }
    public required JsonElement Filters { get; init; }  // opaque to CMS; validated at WebApi
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset ModifiedAt { get; init; }

    // Phase 2 placeholders — Phase 1 always writes "private" / []
    public SavedViewVisibility Visibility { get; init; } = SavedViewVisibility.Private;
    public IReadOnlyList<string> SharedWith { get; init; } = Array.Empty<string>();
    public int SchemaVersion { get; init; } = 1;
}

public enum SavedViewSurface
{
    Queue,
    AttorneyDashboard,
}

public enum SavedViewVisibility
{
    Private,
    // Phase 2: Shared, Team
}

public sealed class CreateSavedViewRequest
{
    public required string Name { get; init; }
    public required SavedViewSurface Surface { get; init; }
    public required JsonElement Filters { get; init; }
}

public sealed class PatchSavedViewRequest
{
    public string? Name { get; init; }
    public JsonElement? Filters { get; init; }
}
```

**Note on `Filters` as `JsonElement`.** The filter shape is owned by LRMS (the surface knows what `quickFilter` ids exist; CMS doesn't need to). CMS treats `Filters` as opaque JSON, validates only that it's well-formed and under 16 KB. LRMS WebApi validates the schema against the current catalog before forwarding.

### 8.2 LENS-CMS — new endpoints

A new `SavedViewsController` co-located with `CasesController`:

```
POST   /api/v1/saved-views
GET    /api/v1/saved-views?surface=...
GET    /api/v1/saved-views/{id}
PATCH  /api/v1/saved-views/{id}
DELETE /api/v1/saved-views/{id}
```

Auth: `[Authorize(Roles = CmsRoles.SavedViewsManager)]` on every endpoint.

**Handlers:**

- `ISavedViewHandler.CreateAsync(ownerId, tenantId, request)` — generates id, writes to Cosmos, returns the persisted document.
- `ISavedViewHandler.ListAsync(ownerId, tenantId, surface)` — single-partition query.
- `ISavedViewHandler.GetAsync(ownerId, tenantId, id)` — point-read, owner check.
- `ISavedViewHandler.PatchAsync(ownerId, tenantId, id, etag, request)` — owner check + ETag check + partial update.
- `ISavedViewHandler.DeleteAsync(ownerId, tenantId, id, etag)` — owner check + ETag check + delete.

**Repository:** `ISavedViewRepository` in `DataAccess/Repositories/` following the existing CaseRepository pattern. Same Polly retry policies, same `QueryOptions` (single-partition, `PartitionKey = tenantId`).

### 8.3 LENS-CMS — Cosmos infrastructure

- New container: `SavedViews` in the existing CMS database.
- Partition key: `/tenantId`.
- Default RU/s: 400 (autoscale-eligible).
- Indexing policy: composite indexes on `(tenantId, ownerId, surface, modifiedAt DESC)` for the list query; default indexing on all other fields.
- Backup: same continuous-backup policy as the `Cases` container.

### 8.4 LENS-CMS — appsettings extension

```jsonc
"SavedViews": {
  "MaxViewsPerUserPerSurface": 50,
  "MaxNameLength": 80,
  "MaxFiltersBytes": 16384,
  "NameConflictCaseSensitive": false
}
```

Backed by `SavedViewsOptions : IConfigOptions` in `Common/Configuration/`.

### 8.5 LENS-LRMS WebApi — new handler

A new `ISavedViewsHandler` in `BusinessLogic/Handlers/` calling the CMS contract via a new `ISavedViewsApiService` in `DataAccess/`. The handler:

1. Accepts the WebClient's surface-typed CommonViewFilters payload.
2. Validates `filters` against the **current** catalog (filter ids exist, column ids exist, sort key columns are sortable, scope is `"active"` or `"all"`). On failure → 400 `InvalidFilters`.
3. Serializes `filters` to `JsonElement` and calls CMS.
4. On read path, applies the schema migration transformer (§7.5) before returning to the WebClient.
5. Emits the appropriate telemetry event (§6.3).

### 8.6 LENS-LRMS WebClient — refactor scope

The prototype's localStorage-backed savedViews module ([savedViews.ts](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts)) is the reference implementation. Production migration:

1. Replace `loadUserSavedViews` / `writeUserSavedViews` / `readSelectedViewId` / `writeSelectedViewId` with calls to the LRMS WebApi (§6.1).
2. Wrap the network layer in an RTK-Query slice (`savedViewsApi`) so the cache invalidation pattern matches the rest of the WebClient.
3. Mount an effect at page load that fetches the user's view library + the last-applied view id, then auto-applies.
4. Wire optimistic updates for Save / Update / Delete / Rename with revert-on-failure.
5. Subscribe to a server-sent-events channel for cross-tab synchronization (§3.15).

### 8.7 Migration path for existing prototype users

The prototype's localStorage-backed views need a one-time migration when production launches. Approach:

- On first page load after the production launch, the WebClient reads any existing `dars.savedViews.queue` / `dars.savedViews.attorneyDashboard` `localStorage` entries.
- For each entry, POSTs to the new CMS API to create a server-side equivalent.
- On success, clears the `localStorage` entry.
- On failure (e.g., name conflict because the user has the same view on two devices), the WebClient logs the conflict and surfaces a one-time banner: "Some local views couldn't be migrated. Open the Saved views menu to resolve."

The migration is per-user, per-surface, one-time. After the migration window closes (e.g., 60 days post-launch), the localStorage path is removed from the WebClient bundle entirely.

---

## 9. Edge Cases & Error Handling

### 9.1 Name collision scenarios

| Scenario | Behavior |
|---|---|
| User saves "Weekly forecast"; later saves another "weekly forecast" | 409 `NameConflict` (case-insensitive check) |
| User renames "Weekly forecast" → "Weekly Forecast" | Allowed (own name doesn't count as conflict) |
| User creates "My emergencies"; system ships "My Emergencies" as a system view later | 409 `NameConflict` on next user save (system views are included in the conflict check); user must rename their existing view first |
| Two tabs save "Weekly forecast" concurrently | First write wins (assigned id and persisted); second write gets 409; UX surfaces "A view with this name was just created in another tab — choose a different name." |
| Unicode normalization edge cases (e.g., NFC vs NFD "café") | Conflict check normalizes both inputs to NFC before comparison |

### 9.2 Cap and quota scenarios

| Scenario | Behavior |
|---|---|
| User at 50 views attempts Save | 429 `LimitReached`; dialog shows error with "Manage views" link |
| User deletes a view then immediately saves a new one | Succeeds (the cap is real-time, not nightly-recomputed) |
| `filters` payload exceeds 16 KB | 400 `PayloadTooLarge`; toast: "This view's filter set is too large to save. Remove some filters and try again." |
| User attempts to PATCH a view to exceed 16 KB | Same 400 |
| Tenant has 10,000 users with 50 views each (500,000 documents) | Within Cosmos scaling expectations for a single container; no behavioral change |

### 9.3 Authorization edge cases

| Scenario | Behavior |
|---|---|
| User opens a stale tab where the view library was fetched 24 hours ago | The cached list is shown immediately; refresh-on-focus refetches; deleted views vanish, new views appear |
| User changes tenants mid-session (rare — typically a re-auth flow) | View library is refetched against the new tenant; previous tenant's views are not visible |
| User loses `CaseReader` role but keeps `SavedViewsManager` | Apply succeeds (returns the snapshot) but List Cases fails on the underlying surface — UX surfaces the case-list error, not a saved-views error |
| Service principal calls Save endpoint directly (no end-user identity in the CDT) | 403 with `errorCode: "ServicePrincipalNotAllowed"` — only human identities can own views |
| User has access to tenants A + B and saves a view in A | View is invisible from B; this is by design |
| Cross-user impersonation attempt (forge `ownerId` in request body) | Ignored — the handler always uses `caller.subjectClaim` for `ownerId`, never the request body |

### 9.4 Concurrency edge cases

| Scenario | Behavior |
|---|---|
| Tab A applies view X, Tab B deletes view X; Tab A then tries Update from current | Tab A's PATCH returns 404; toast: "This view was deleted in another tab." + reverts to "Saved views" trigger label |
| Tab A and Tab B both Update the same view simultaneously | First write wins (ETag); second gets 412; Tab B's WebClient refetches + re-opens editor with latest snapshot |
| User applies view X, then Server tells WebClient via SSE that view X was renamed in another tab | Trigger label updates to the new name; no other UX change |
| User applies view X with `caseScope = "active"`, then immediately toggles scope to `"all"` | `isModified` becomes `true`; user can Update from current to capture the new scope |

### 9.5 Catalog drift scenarios

| Scenario | Behavior |
|---|---|
| View references a removed filter id (e.g., `agency` was renamed to `issuingAuthority`) | Filter is dropped on apply; warning toast; view stored snapshot unchanged |
| View references a removed column id | Column is dropped from `columnOrder` / `columnHidden`; rest of view applies |
| View's `sortState.columnId` refers to a column that was made non-sortable | Sort is dropped; surface default order applies |
| View was saved when the catalog had filter `X`; `X` was removed; user runs Update from current with the modified state (X no longer in `extraFilters`) | The new snapshot doesn't include `X`; on next apply, no drift warning fires |
| User installs an updated WebClient bundle with new catalog entries | Existing views are unchanged; new entries are not added to existing views; the user can Save current view after adjusting filters to capture the new catalog |

### 9.6 Data integrity scenarios

| Scenario | Behavior |
|---|---|
| Cosmos throws 429 (RU exhaustion) on Save | Polly retry policy in CMS catches; if exhausted, 503 to WebApi which surfaces to WebClient as a retry-friendly toast |
| Cosmos document gets corrupted (e.g., truncated `filters` JSON) | Read path returns 500 `MalformedDocument`; ops team is paged; user sees: "This view is corrupted and can't be loaded. Please delete it and re-save." with a Delete action |
| User's `localStorage` from the prototype contains a malformed view | Migration skips it + logs; user sees the migration banner |
| Network failure mid-Save | Optimistic UI reverts; toast: "Couldn't save. Check your connection." |

### 9.7 Surface-mismatch scenarios

| Scenario | Behavior |
|---|---|
| WebClient sends `surface = "queue"` with an Attorney Dashboard `quickFilter` id | 400 `InvalidFilters`; toast: "This view contains controls that don't belong to the Cases page." (this is purely defensive — the UI doesn't make this mistake) |
| User navigates from Cases to Attorney Dashboard mid-Save | Save completes on the Cases surface; user sees the new view in the Cases menu when they return |

---

## 10. Open Questions & Future Considerations

### 10.1 Gaps and dependencies requiring clarification

**Q-1. End-user CDT chain through MISE v2.**
The spec assumes LRMS-WebApi presents a CDT chain that lets CMS extract the end-user's `oid` as `ownerId`. The MISE v2 CDT pattern is documented but operational readiness across LRMS / CMS varies. Owner: LRMS WebApi team. Question: does the existing case-API CDT chain already cover this, or do we need additional MISE configuration on CMS?

**Q-2. SSE channel for cross-tab sync.**
§3.15 requires a server-sent-events channel for per-user real-time updates. LRMS-WebApi has no SSE infrastructure today. Owner: LRMS WebApi team. Question: do we build SSE in Phase 1 (high integration cost), or accept eventual consistency for cross-tab in Phase 1 (refresh-on-focus only) and add SSE in Phase 2 alongside sharing?

**Q-3. User-deletion cleanup job ownership.**
§5.8 defers automatic cascade-delete to a nightly job. Owner of the job: TBD. Options: (a) a new CMS Worker function, (b) a separate identity-lifecycle service that owns deprovisioning fan-out across all LENS surfaces, (c) accept the orphan accumulation indefinitely. Recommended: (b), but (c) is acceptable for Phase 1 launch.

**Q-4. System view content rollout.**
§4.3 ships the prototype's six system views verbatim. The Operations Lead persona may have specific desired system views ("My queue", "Due today", "Recommended Rejection candidates") that haven't been validated against the production user base. Recommendation: ship the prototype's six, instrument apply-count telemetry, iterate the system view list in subsequent monthly releases.

**Q-5. Migration window for prototype localStorage views.**
§8.7 proposes a one-time migration with a 60-day fallback window. Open: do we communicate the migration to the prototype's existing testers (~20 internal users) ahead of cutover, or rely on the in-product banner?

**Q-6. Per-user limit (50) — operational confidence.**
The 50-view cap is a heuristic. Open: validate against the heaviest prototype user's view count + a buffer. If any tester exceeds 30 views in normal use, raise the cap to 100.

### 10.2 Assumptions made in the design

| # | Assumption | Risk if wrong |
|---|---|---|
| A-1 | Saved views belong in CMS (not a new service) | If CMS scaling becomes a concern, the SavedViews container can be extracted to its own service later — schema is self-contained |
| A-2 | `ownerId` is the user's Entra `oid`, not a derived display name | If `oid` changes per identity rotation (rare in Entra), views become orphaned. Validate before launch with Identity team |
| A-3 | Per-user view library fits in a single page load (no pagination on the list endpoint) | 50 views × ~2 KB average = 100 KB; well under any reasonable threshold. Pagination becomes a Phase 2 concern only if the cap rises to 1000+ |
| A-4 | LRMS WebApi is the canonical validation point for `filters` schema | If we ever need server-side filtering of views by content (e.g., "find all views that reference filter X"), CMS would need filter-aware indexing. Phase 1 doesn't need this |
| A-5 | Phase 2 sharing will use the same `SavedViewDocument` schema with the placeholder fields populated | A more invasive schema change in Phase 2 (e.g., separating SavedView from Sharing as two documents) would require migration; we mitigate by writing placeholder fields from Phase 1 |
| A-6 | Optimistic UI is acceptable for all mutations | If users frequently lose changes due to optimistic-revert (e.g., network is flaky), we may need to surface a "saving…" pending state on the row |
| A-7 | The user wants the last-applied view to auto-apply on next page load | If users complain about losing their pristine state ("I closed the tab on a clean filter set; why did it come back filtered?"), we may need an explicit "Pin as default" affordance |

### 10.3 Phase 2 — sharing (the next ship)

Phase 2 will allow users to share their personal saved views with other named users (per direction confirmed in spec authoring). Phase 2 scope sketch:

**F-1. Per-view sharing.** Each personal view gains a "Share…" action that adds (user, role) pairs to the `sharedWith` array. Roles:

- **Viewer** — can apply the view, can't modify it.
- **Editor** — can apply, update, rename (but not transfer ownership or delete).

**F-2. Visibility scopes.** The `visibility` field becomes meaningful:

- `"private"` — owner only.
- `"shared"` — owner + every identity in `sharedWith`.
- `"team"` — every member of a named team (Phase 2's team-membership model is an open design question).

**F-3. Discovery.** A "Shared with me" section in the Saved Views menu lists views the user has been granted access to but doesn't own.

**F-4. Ownership transfer.** Owner can transfer a view's ownership to another user. The new owner gets full rights; original owner reverts to whatever access they had via `sharedWith`.

**F-5. Audit trail.** Every Share / Unshare / Transfer action is logged with both parties' identities for compliance review.

**F-6. Tenant boundary.** Sharing is always within-tenant. Cross-tenant sharing is explicitly not in Phase 2 scope.

### 10.4 Phase 3+ — deferred enhancements

**F-7. View subscriptions.** Notify the user (email, Teams card, in-app banner) when a saved view's matching row set changes — new cases enter, cases exit, threshold-cross events. Useful for ops dashboards on hot queues.

**F-8. View versioning / history.** Keep the last N snapshots of each view so users can "revert this view to last Tuesday's content." Storage cost vs operational value tradeoff TBD.

**F-9. View import / export.** Export a view as JSON for sharing with support / engineering when debugging behavior. Phase 1 has no export path; users describe the view verbally.

**F-10. Saved view URL deep-linking.** Users can share a URL that auto-applies a specific view when opened. Combines with Phase 2 sharing (the recipient must have the view shared with them OR own a copy).

**F-11. Per-saved-view custom presentation.** Allow a saved view to override the default column color treatments, row density, or row highlighting. Not in scope until presentation-layer customization is itself productised.

**F-12. Cross-surface views.** A single saved view that applies across Cases page AND Attorney Dashboard. Requires unifying the surfaces' state shapes more than current architecture allows.

---

## Appendix A — Anchored references

| Anchor | Source | Purpose |
|---|---|---|
| `CommonViewFilters`, `SavedView` | [C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts) | Reference shape for the captured-state payload |
| `SYSTEM_QUEUE_VIEWS`, `SYSTEM_ATTORNEY_VIEWS` | [savedViews.ts:77-126](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts#L77-L126) | Phase 1 system view content |
| `viewMatchesCurrent` | [savedViews.ts:204-231](C:/R/DARS_eEvidence/src/components/case-queue/savedViews.ts#L204-L231) | Reference logic for the modified indicator |
| `SavedViewsMenu` | [C:/R/DARS_eEvidence/src/components/case-queue/SavedViewsMenu.tsx](C:/R/DARS_eEvidence/src/components/case-queue/SavedViewsMenu.tsx) | Reference UX for the menu component |
| `SaveViewDialog` | [C:/R/DARS_eEvidence/src/components/case-queue/SaveViewDialog.tsx](C:/R/DARS_eEvidence/src/components/case-queue/SaveViewDialog.tsx) | Reference UX for the save dialog |
| CMS auth + Cosmos patterns | [C:/R/LENS-CMS/CLAUDE.md](C:/R/LENS-CMS/CLAUDE.md) | Existing infrastructure for the new SavedViews surface to follow |
| Existing `CasesController` | [C:/R/LENS-CMS/sources/dev/CMS/src/API/Controllers/CasesController.cs](C:/R/LENS-CMS/sources/dev/CMS/src/API/Controllers/CasesController.cs) | Pattern reference for the new `SavedViewsController` |
| `QueryOptions` (partition strategy) | [C:/R/LENS-CMS/sources/dev/CMS/src/DataAccess/Repositories/QueryOptions.cs](C:/R/LENS-CMS/sources/dev/CMS/src/DataAccess/Repositories/QueryOptions.cs) | Pattern reference for the new SavedViews repository |
| LRMS WebApi `CaseController` | [C:/R/LENS-LRMS/sources/dev/WebApi/src/API/Controllers/CaseController.cs](C:/R/LENS-LRMS/sources/dev/WebApi/src/API/Controllers/CaseController.cs) | Pattern reference for the new SavedViews adapter |
| Case List View Controls Spec | [./case-list-view-controls-spec.md](./case-list-view-controls-spec.md) | Companion spec — defines the state a saved view captures |

---

## Appendix B — Glossary

| Term | Definition |
|---|---|
| Saved view | A named, persisted snapshot of Case List View Controls state belonging to one user |
| System view | A view shipped with the WebClient bundle; not stored server-side; read-only to all users |
| Personal view | A user-created view stored server-side; CRUD-able only by its owner |
| Surface | Either `queue` (Cases page) or `attorneyDashboard` — distinct view libraries per surface |
| Applied view | The view whose snapshot was last loaded into runtime state |
| Modified (state) | Runtime state has drifted from the applied view's snapshot |
| Catalog drift | The filter / column catalog has changed shape since a view was saved |
| ETag concurrency | Optimistic concurrency via Cosmos's `_etag`; `If-Match` header on mutations |
| CDT | Constrained Delegation Token — MISE v2 mechanism for forwarding end-user identity through service principals |
| Owner | The user identity that created a personal view; has implicit full rights |
| `oid` | Entra ID Object Identifier — stable identifier for a user identity within a tenant |

---

**End of Saved Views Phase 1 specification.**
