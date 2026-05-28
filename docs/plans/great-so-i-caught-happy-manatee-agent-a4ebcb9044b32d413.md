# Microsoft UX Standards for Filtered List Views — Research Report

Scope: how Microsoft surfaces search + filters + sort + saved views across M365, Dynamics, Defender/Purview, Lists/SharePoint, and Fluent UI v9. Targeted at a Fluent v9 case-queue redesign (search box + 3–5 filters + sort + room to grow + saved views).

## 1. Search-first vs. filters-first
Microsoft's modern surfaces are **search-first, filters-as-refiners**. OWA/Outlook on the Web puts a wide SearchBox at the top of the chrome; **filter chips ("Has attachments", "Unread", "To me", "Mentions me", "Flagged") appear only after the user types a query**, as a sticky horizontal "dynamic refiners" strip above results. Teams chat search and SharePoint search behave the same way. Dynamics 365 model-driven apps and Microsoft Lists invert this: the **view dropdown / pivot is the primary control**, and search is a secondary input scoped to the active view. The M365 Admin Center Active Users page splits the difference — a Filter dropdown on the left and a SearchBox on the right of the toolbar, both peers.

Takeaway: when the user always lands on the same list (a queue), the **Dynamics/Lists pattern (view-first, search-secondary)** is closer to the right model than the Outlook search-first pattern.

## 2. Filter chips / pills
The canonical Microsoft chip pattern is a **horizontal row of dismissible pills directly under the toolbar**, above the grid, each with a column-label prefix and an X — "Status: Active ×", "Country: US ×". A trailing **"Clear all"** text button sits at the right end of the chip row. This is what Defender, Purview, and the Power Platform admin lists do. Dynamics 365 grids show the same chips inline above the grid header. Outlook's dynamic refiners are the exception — they're toggle pills, not applied-filter chips, and live in the *results* region, not on the toolbar. Fluent 2 itself does **not ship a "FilterChip" primitive**; teams compose it from `Tag` (dismissible) + `TagGroup`.

## 3. "Add filter" / overflow
Three patterns are in production at Microsoft, ranked by frequency:

- **"+ Add filter" pill** that opens a small popover listing remaining filterable fields, with field → operator → value picked inline. Used in **Microsoft Defender XDR** (Incidents, Alerts, Device Inventory), **Microsoft Purview** (eDiscovery review sets, audit search, DLP alerts), **Power Platform Admin Center**, **Microsoft Sentinel** hunting. This is the dominant new pattern.
- **Filter button → right-side panel** (Fluent `Drawer`, inline overlay). Used in **Microsoft Lists / SharePoint** (the "Filters Pane" with column refiners), **Intune device list**, **OneDrive**. Best when filters are many (>10) and benefit from grouping.
- **A few primary filters always visible + overflow kebab**. Used in **M365 Admin Center** users page and **Teams admin center**. Less common because it hides discoverability.

Outlook/OWA uses **none of these on the inbox itself** — its filter ("Filter ▾" menu in the message-list header) is a single dropdown of preset states (Unread, Mentions, Flagged, Attachments, To Me, …) — closer to a saved-view picker than an ad-hoc filter builder.

## 4. Saved views / pivots
Dynamics 365 is the canonical saved-view model and the one Microsoft documentation treats as the standard: **System views** (admin-authored, shared) and **Personal views** (user-authored, optionally shared). The picker is a **dropdown next to the entity title** with a chevron, and a separate "Manage and share views" affordance. Microsoft Lists ships the same primitive: a **view switcher in the command bar** with "Save view as", "Edit current view", "Set current view as default", plus "Show only my views" / "Show others' views" filters in the picker. M365 Admin Center calls them "Filters" and offers up to **50 custom views** per tenant, with shared scope. Defender's "Custom views" on incident queues are list-scoped, save filter+sort+columns, and live in a left rail or a top dropdown.

Common pattern: the view picker is a **top-left dropdown that owns title-position prominence** (the view name *is* the page title), with "Modified" indicator if the user has tweaked filters since loading the view, and a "Save" / "Save as new view" pair.

## 5. Custom filter builder
Two real patterns:

- **Modern Advanced Find** in Dynamics 365 (replacing the legacy modal): an **expandable row builder** in a panel — each row is `Field` ▾ `Operator` ▾ `Value` ▾ `×`, with `+ Add row` and a `Group / Ungroup` button to wrap rows into AND/OR groups. Same shape in Purview eDiscovery Premium "Advanced filters" and in Power BI's filter pane.
- **Inline popover from "+ Add filter"**: same field/operator/value triplet but committed one-at-a-time, becoming a chip. Defender/Sentinel use this for ≤90% of cases and only fall back to a full builder for saved-query authoring.

Fluent UI v9 does **not ship an Advanced Filter component**. Teams roll their own from `Combobox` (field, operator), `Input`/`DatePicker` (value), and `Button` rows.

## 6. Sort placement
Microsoft strongly prefers **column-header click + caret** as the primary sort affordance — this is true across Lists, SharePoint, Dynamics grids, Defender, Purview, Admin Center, and the Fluent v9 `DataGrid` (which has built-in sort headers). A **separate "Sort by" dropdown is rare on the toolbar**; when it exists (e.g., OWA mailbox header "By Date ▾"), it is for surfaces where there is no visible column header (cards, conversation list). Saved views *embed* sort as part of the view definition — sort is rarely surfaced as its own toolbar control alongside filters.

## 7. Search scope / fields
Microsoft mostly avoids "search in: field ▾" pickers. The norm is **free-text, server-side, scored across known indexed fields**, with **chips/refiners** as the way to scope. Where scope pickers exist (SharePoint search, Teams search), they are **tabs/pivots above results** ("All / Messages / Files / People"), not a dropdown attached to the SearchBox. Inside Dynamics, Quick Find searches a curated set of "Quick Find columns" defined by the entity admin — invisible to the user. Conclusion: if your indexer is good, a **single SearchBox with no scope picker** is the Microsoft-native answer; if not, expose scope as **tab pivots**, never as a dropdown inside the SearchBox.

## 8. Fluent UI v9 specifics
Fluent 2 / v9 ships the parts but **no compound "filter bar"**: `SearchBox` (with optional filter icon slot per the usage doc), `Combobox`/`Dropdown` with `multiselect`, `TagPicker` (still maturing — multi-select pattern + single-line overflow are tracked enhancements), `Tag`/`TagGroup` (dismissible — the chip primitive), `Menu`/`MenuPopover` (for "+ Add filter" popovers), `Drawer` (right-side filter panel), and `DataGrid` with built-in sortable headers and column-level filter slots. The Fluent 2 SearchBox doc explicitly says "the filter icon and filter dropdown are optional" — i.e., Microsoft does not prescribe an in-box filter, and most surfaces keep filters as siblings, not children, of the SearchBox.

---

## Recommendation (opinionated)

For a Fluent v9 case queue with search + 3–5 filters + sort + future-room-to-grow + saved views, adopt **three** patterns and skip the rest:

1. **View-first toolbar, Dynamics/Lists style.** Top-left: a `Menu`-driven view picker that doubles as the page title ("All open cases ▾"), with system + personal views, "Save as new view", and a "Modified" dot when the user has tweaked filters. This solves the saved-views requirement *and* removes pressure from the filter row to carry every default. Beats Outlook's search-first model because your users return to the same queue.

2. **One row: SearchBox + 3 most-used filters as `Combobox multiselect` + "+ Add filter" pill + "Clear all".** Applied filters render as `Tag` chips on a second row directly under the toolbar. This is the Defender/Purview pattern and it scales: today you have three filters inline; tomorrow the fourth and fifth live behind "+ Add filter" with zero redesign. Do **not** put a sort dropdown on this row — sort lives on column headers via Fluent v9 `DataGrid`'s built-in sortable headers, and is captured into the view definition when the user saves.

3. **Defer the right-side filter panel and the advanced AND/OR builder.** A `Drawer`-based filter pane is the Lists pattern, but it is overkill for 3–5 filters and adds a second "where do filters live" surface. Skip it until you cross ~8 filters or need grouped AND/OR. When that day comes, add it *behind* "+ Add filter" → "Advanced…", not as a replacement for the inline pattern. Same logic for an Advanced Find–style row builder: don't pre-build it.

Net layout: `[View ▾]  [SearchBox]  [Filter1 ▾] [Filter2 ▾] [Filter3 ▾]  [+ Add filter]      [Save view] [⋯]` on row 1, `[Status: Active ×] [Country: US ×]   Clear all` on row 2 (only when filters applied), sortable column headers in the grid below. This is the most "Microsoft-native" shape for your problem and the one Fluent v9 primitives compose cleanly into.

---

## Sources

- [Fluent 2 SearchBox usage](https://fluent2.microsoft.design/components/web/react/core/searchbox/usage/)
- [Fluent UI React v9 SearchBox storybook](https://react.fluentui.dev/?path=%2Fdocs%2Fcomponents-searchbox--default)
- [Fluent UI React v9 Combobox storybook](https://react.fluentui.dev/?path=%2Fdocs%2Fcomponents-combobox--default)
- [Fluent 2 home](https://fluent2.microsoft.design/)
- [TagPicker v9 enhancements (multi-select, overflow)](https://github.com/microsoft/fluentui/issues/31666)
- [Creating Useful Views for Lists & Libraries (MS Learn)](https://learn.microsoft.com/en-us/microsoft-365/community/creating-useful-views-in-lists-libraries)
- [Use filtering to modify a SharePoint view](https://support.microsoft.com/en-us/office/use-filtering-to-modify-a-sharepoint-view-3d8efc52-0808-4731-8f9b-3dfaeacea3d4)
- [Use sorting to modify a SharePoint view](https://support.microsoft.com/en-us/office/use-sorting-to-modify-a-sharepoint-view-1e85d6e7-bdb3-4176-b1cb-62c5fbd3ef98)
- [Dynamics 365: Create and customize views](https://learn.microsoft.com/en-us/dynamics365/sales/customize-views)
- [Dynamics 365 view types (system vs personal)](https://learn.microsoft.com/en-us/dynamics365/customerengagement/on-premises/customize/create-edit-views?view=op-9-1)
- [Modern Advanced Find in Dynamics 365](https://www.pragmatiq.co.uk/how-to-work-with-views-and-the-modern-advanced-find-in-dynamics-365/)
- [M365 Admin Center custom user views (techcommunity)](https://techcommunity.microsoft.com/blog/microsoft_365blog/simplify-it-management-with-new-features-in-the-microsoft-365-admin-center/265921)
- [OWA search refiners (office365itpros)](https://office365itpros.com/2023/08/11/owa-search-refiners/)
- [Defender for Cloud Apps activity filters](https://learn.microsoft.com/en-us/defender-cloud-apps/activity-filters)
- [Purview portal overview](https://learn.microsoft.com/en-us/purview/purview-portal)
- [Purview eDiscovery Premium advanced filters](https://m365admin.handsontek.net/microsoft-purview-ediscovery-premium-review-set-advanced-filters/)
