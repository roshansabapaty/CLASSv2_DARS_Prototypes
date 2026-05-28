# Promote Quick-Filter Tabs to Count-Bearing Ops Buttons

**Project:** DARS_EEVIDENCE (`c:\R\DARS_EEVIDENCE`)
**Scope:** Upgrade the Case Queue's quick-filter tab row from text-only
tabs to operationally weighted buttons that surface, at a glance, how
many cases match each filter. Goal: help the RS / TS triage what needs
attention without pushing the case list below the fold.
**Status:** Ready to implement (4 open questions resolved)
**Created:** 2026-05-13

## Context

Today the case queue's quick-filter row is a thin Outlook-style tab strip
([src/components/CaseQueue.tsx — tab row](src/components/CaseQueue.tsx)):

```
All   My Cases   Unassigned   Emergency   Overdue   Escalated
─── (active tab carries a blue underline) ───────────────────
```

- Six mutually-exclusive tabs (one at a time).
- The row is ~36px tall.
- No counts — the user has to click a tab to find out how many cases match.

The user wants to:
1. **Promote** the tabs to feel like ops-grade buttons (more weight, clearer affordance).
2. **Show a count** next to each tab so the user can see urgency at a glance.
3. **Stay balanced** — don't push the case list down by adding much vertical chrome.

## Layout options considered

### Option A — Inline count chip on each tab (recommended)

Keep the row at its current height (~36px). Append a small count chip to
each label. Colour the chip by urgency for "needs attention" tabs.

```
All ⓘ18    My Cases ⓘ5    Unassigned ⓘ3    Emergency 🔴1    Overdue ⓘ0    Escalated 🟠3
└──── active tab gets blue underline (unchanged) ────┘
```

- **Visual weight**: numbers + colour give each tab clear ops meaning without
  growing the row.
- **Colour rules**:
  - **Red** chip when *Emergency* or *Overdue* count > 0 (these always need
    triage attention).
  - **Amber** chip when *Escalated* count > 0 (review work, not a code-red).
  - **Neutral grey** for *All*, *My Cases*, *Unassigned* counts (informational,
    not alerting).
  - When the count is `0`, the chip dims to muted grey regardless of tier so
    a quiet day doesn't look alarming.
- **Vertical impact**: 0px. Same height as today.

**Pros**
- Zero added height — the case list stays exactly where it is.
- Counts give immediate ops awareness.
- Colour codes urgency without screaming.

**Cons**
- Still relies on the user noticing the count colour. Slightly subtle.

### Option B — Two-line stacked button tabs

Each tab becomes a button card with the label on top and the count below
in larger weight. ~60–72px tall.

```
┌──────┬──────────┬────────────┬───────────┬─────────┬───────────┐
│ All  │ My Cases │ Unassigned │ Emergency │ Overdue │ Escalated │
│  18  │    5     │     3      │     1     │    0    │     3     │
└──────┴──────────┴────────────┴───────────┴─────────┴───────────┘
```

**Pros**
- Numbers are very prominent — scan-friendly.
- Feels weighty like an ops console.

**Cons**
- Doubles the row height. Pushes the case list ~36px down.
- Visually heavy; feels like a dashboard widget rather than a filter strip.

### Option C — Two-tier strip (ops cards + tabs)

Top strip = 3–4 alert cards (Emergency, Overdue, Escalated, Unassigned)
with prominent counts. Below = the original text-only tab row.

```
┌────────────┬──────────┬────────────┬─────────────┐
│Emergency 1 │Overdue 0 │Escalated 3 │Unassigned 3 │
└────────────┴──────────┴────────────┴─────────────┘
All   My Cases   Unassigned   Emergency   Overdue   Escalated
```

**Pros**
- Strongest emphasis on the urgent counts.
- Cleanly separates "ops dashboard" from "filter row".

**Cons**
- Two rows of chrome; chunky.
- Counts appear twice (in the top strip AND in the bottom row) — visually
  redundant.

## Recommendation

**Option A** — inline count chip with urgency-coloured backgrounds.

Reasons:
- Keeps the case list in the same vertical position. Zero added chrome.
- The colour-coded count chip is enough signal for ops-aware scanning without
  needing a second dashboard row.
- Single source of truth — counts live with their filter, no risk of strip
  / row divergence.
- Reversible: if the count chip pattern isn't enough later, we can grow it
  into Option B with a small visual change.

## Detailed UX spec (Option A)

### Tab visual

```
┌───────────────────────────────────────────────────────────────────────┐
│ All ◯18  My Cases ◯5  Unassigned ◯3  ⚠Emergency ⬤1  ⏱Overdue ◯0  ⚖Escalated ⬤3 │
│  ──────                                                                          │  ← active underline
└───────────────────────────────────────────────────────────────────────┘
            └─ count chip ──┘                  └─ icon + red chip ─┘
                                                                       └─ icon + amber chip ─┘
```

- **Leading urgency icons**: a 14px lucide-react icon precedes the label
  on the three "needs attention" tabs:
  - **⚠ AlertTriangle** on *Emergency*
  - **⏱ Clock** on *Overdue*
  - **⚖ Scale** on *Escalated*
  - The icon colour matches the count chip (red / amber / muted when
    count is 0). `gap-1.5` between icon and label.
- **Count chip**: 18px-tall pill, ~22-32px wide depending on digits, sits
  immediately to the right of the tab label with `gap-1.5`. Number is
  semibold; chip has 1px border + soft background fill.
- **Urgency colour rules** (chip only — label text colour unchanged):

  | Tab | Count > 0 | Count = 0 |
  |---|---|---|
  | All | neutral (`slate-100` bg, `slate-700` text) | neutral muted |
  | My Cases | neutral | neutral muted |
  | Unassigned | neutral | neutral muted |
  | Emergency | **red** (`red-50` bg, `red-700` text, `red-200` border) | neutral muted |
  | Overdue | **red** | neutral muted |
  | Escalated | **amber** (`amber-50` bg, `amber-700` text, `amber-200` border) | neutral muted |

- **Active tab**: brand-blue underline + bold label (unchanged from today).
  When the active tab also has an urgent chip, the chip retains its red /
  amber colour — the underline + chip colour combination shouts "this is
  the urgent view you're looking at".
- **Hover**: chip darkens one step; tab label takes the existing hover
  treatment (slate-900 text + slate-300 underline).

### Accessibility

- `aria-label` for each tab includes the count, e.g.:
  `"Emergency, 1 case requires attention"` (red chip)
  `"Overdue, no cases overdue"` (zero count)
- `role="tab"` and `aria-selected` semantics unchanged.
- Colour is paired with the number, never used as the only signal.

### Data wiring

Counts are computed **against the dropdown-filtered case list** — i.e. the
slice that survives the Country / Request Type / SLA Deadline dropdowns,
but **before** the quick-filter tab predicate. This makes each tab show
"how many of the cases I'm currently viewing fit this filter."

```ts
// `dropdownFilteredCases` = post-Country/RequestType/SLA, pre-tab.
// Already computed above the tab row in the filter pipeline; just expose
// it as a stable name.
const filterCounts = React.useMemo(() => {
  const map: Record<QuickFilter, number> = {
    all: dropdownFilteredCases.length,
    myCases: 0,
    unassigned: 0,
    emergency: 0,
    overdue: 0,
    escalated: 0,
  };
  for (const c of dropdownFilteredCases) {
    for (const tab of QUICK_FILTERS) {
      if (tab.key === "all") continue;
      if (tab.predicate(c)) map[tab.key]++;
    }
  }
  return map;
}, [dropdownFilteredCases]);
```

#### Helper-text affordance

Because counts can drop when a dropdown narrows the list (e.g. picking
Country = "United States" shrinks "My Cases" from 6 → 2), the row needs a
small text affordance so the user knows *why* numbers shifted.

Render a one-line hint below the tab row, visible only when **any
dropdown** is set to a non-`"all"` value:

```
└──────────────────────────────────────────────────────┘
Counts reflect the filters applied below (Country, Request Type, SLA Deadline).
```

- 11px slate-500 italic text, ~4px below the tab row.
- Mounts/unmounts based on `isAnyDropdownActive` — invisible when the user
  is on the clean view, so no permanent chrome.
- Same row height impact as the original tab row when no dropdowns are
  active (which is the most common state).

```tsx
const isAnyDropdownActive =
  caseStatusFilter !== "all" ||
  countryFilter !== "all" ||
  requestTypeFilter !== "all" ||
  slaTierFilter !== "all";

{isAnyDropdownActive && (
  <p className="text-[11px] italic text-slate-500 -mt-2 mb-1 px-1">
    Counts reflect the filters applied below
    (Case Status, Country, Request Type, SLA Deadline).
  </p>
)}
```

### Files modified

1. [src/components/CaseQueue.tsx](src/components/CaseQueue.tsx) — add the
   `filterCounts` memo + the count-chip JSX inside each `<button role="tab">`.
   No new helpers, no new state.

## Verification

1. Reload the queue → each tab shows its count chip next to the label.
2. Emergency / Overdue / Escalated tabs render red or amber chips **only
   when count > 0**. With zero matches, all chips look muted.
3. With the seeded mock data, expect:
   - All: 10
   - My Cases: 6 (cases assigned to Nicole Garcia)
   - Unassigned: 1 (LENS-2025-00142)
   - Emergency: 1 (LENS-2025-00142)
   - Overdue: depends on `dueDate < now`; on `2026-05-13` most 2025 cases
     are overdue (~6 cases). Will show red.
   - Escalated: 3 (LENS-2025-00125, LENS-2026-00150, LENS-2026-00180)
4. Picking a tab still narrows the case list. Granular dropdowns still
   refine inside the active tab — but the tab counts don't change in
   response to dropdown choices (intentional, per the data-wiring note above).
5. Screen-reader: each tab announces its label + count.
6. `npx vite build` clean.

## Confirmed decisions

1. **Tab-count scope — dropdown-filtered list.** Counts reflect the cases that survive the Case Status / Country / Request Type / SLA Deadline dropdowns. Picking Country = "United States" shrinks "My Cases" accordingly. To prevent confusion when counts drop, a one-line helper appears below the tab row whenever any dropdown is active: *"Counts reflect the filters applied below (Case Status, Country, Request Type, SLA Deadline)."* When all dropdowns are at "all", the helper line is hidden.
2. **Active tab + urgent chip — stay coloured.** Being on the Emergency tab doesn't make the workload less urgent; the chip stays red. The active underline + the red chip together signal "you're looking at the urgent view."
3. **Zero state — dim to muted grey.** The chip stays in place; its colour shifts to a muted slate when count is 0. Keeps the row's visual rhythm consistent and prevents width jitter as counts change.
4. **Urgency icons — add leading glyphs.** Lucide icons precede the label on three tabs: **⚠ AlertTriangle** on Emergency, **⏱ Clock** on Overdue, **⚖ Scale** on Escalated. Icon colour matches the count chip (red / amber when count > 0, muted when 0).

## Risks

- **Count drift if dropdowns affect tab counts.** If the team later decides tab counts SHOULD respect dropdown filters, swap the precompute source — but watch for the surprising-empty-tab case (you pick "United States" in Country, then "My Cases" shows 2 instead of 6, and you don't immediately remember why).
- **Colour-only signalling**. Mitigated by including the count in `aria-label` and by the explicit number being visible — colour is augmentation, not the sole cue.
- **Row width on narrow viewports**. Adding count chips may push the row past the available width on a 1024px screen. Mitigation: count chips are compact (~22-32px); if it overflows, the row already has `flex-wrap` available — switch to wrapping.
