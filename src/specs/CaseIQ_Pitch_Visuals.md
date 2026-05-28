# CaseIQ — Pitch Deck Visual Guide

**Purpose:** Visual direction for each slide, aligned to the pitch script. Designed for PowerPoint/Keynote production.

---

## HERO VISUAL: The CaseIQ Stack

**Used on:** Title slide background, system overview slide, and as a recurring motif throughout the deck.

**Concept:** A vertical stack of five translucent layers, each glowing with its own accent color, building upward. The stack sits on a dark background. Each layer is a horizontal slab with rounded edges — think of it like stacked glass panes, each slightly offset so you can see through to the layers below.

```
                    ┌─────────────────────────────┐
                    │     FORECASTING              │  ← Purple/Violet
                    │     "Where will we be?"      │
                    ├─────────────────────────────┤
                    │     LENS HEALTH              │  ← Blue
                    │     "How healthy is the      │
                    │      system right now?"       │
                    ├─────────────────────────────┤
                    │     LEGAL DEMAND INTEL (LDI)  │  ← Amber/Gold
                    │     "What do the documents   │
                    │      tell us?"                │
                    ├─────────────────────────────┤
                    │     CASE LIST HEALTH          │  ← Teal/Cyan
                    │     "What's the temperature  │
                    │      of this view?"           │
                    ├─────────────────────────────┤
                    │     CASE HEALTH INDEX (CHI)   │  ← Green-to-Red gradient
                    │     "How healthy is this     │
                    │      case?"                   │
                    └─────────────────────────────┘
                              CaseIQ
```

**Visual treatment:**
- Each layer has a subtle glow/halo in its accent color
- A thin vertical line of light runs through all five layers — representing the audit trail
- The active layer (whichever the speaker is discussing) glows brighter; others dim
- On the final "wrapper" slide, all five layers glow equally with a label: "CaseIQ — Operational Intelligence for Lawful Access"

**Animation:** As the speaker introduces each layer, that layer animates in from the bottom and locks into position. By the end of the stack section, all five are visible.

---

## Slide-by-Slide Visual Direction

### SLIDE 1: Title

**Visual:** The full CaseIQ stack (all five layers) on the right side of the slide, glowing softly. Left side has the title text.

**Background:** Dark navy/charcoal gradient
**Logo:** CaseIQ wordmark top-left. Microsoft logo bottom-right.
**Tagline below title:** "Operational Intelligence for Lawful Access Response"

---

### SLIDE 2: The Mission We Serve

**Visual:** Full-bleed photograph — a response specialist at a workstation, or a law enforcement officer's badge resting on a stack of legal documents. The image should feel serious and human, not corporate.

**Overlay:** Semi-transparent dark gradient from the left, with white text over it.

**Alternative:** A world map with subtle dots representing the 100+ jurisdictions Microsoft serves. Lines connecting dots to a central Microsoft shield icon. Not animated — just showing scale.

---

### SLIDE 3: The Problem — Today's Reality

**Visual:** Three-column layout. Each column has an icon and a pain-point list.

| Column | Icon | Header | Color |
|--------|------|--------|-------|
| Response Specialists | Person with magnifying glass | "Fighting the tool" | Red accent |
| Managers | Calendar with warning | "Planning blind" | Orange accent |
| Organization | Shield with crack | "Compliance gaps" | Dark red accent |

**Bottom strip:** Dale's quote in italic, spanning full width, on a dark background.

---

### SLIDE 4: The Human Cost

**Visual:** Three portrait-style cards arranged horizontally — one for Dale, David, and Shane. Each card has:
- A silhouette avatar (or initials in a circle)
- Their name and role
- One sentence summarizing their pain
- A large number representing wasted time: "~4 hrs/week configuring views", "~2 hrs/week re-filtering", "~6 hrs/week counting cases"

**Bottom:** A single statement in bold: "Every hour fighting the tool is an hour not responding to a legal demand."

---

### SLIDE 5: The Vision — CaseIQ System

**Visual:** The three-persona diagram from the pitch deck, but rendered as a polished graphic:

Three circles at the top (Triage Specialist, Response Specialist, Manager), each with a distinct icon and a question ("What needs classification?", "What should I work on?", "Where are we hurting?"). Arrows flow down to a central horizontal bar labeled "CaseIQ" that contains the five intelligence layers as small colored chips. Below the bar, three outcome statements.

**Color coding:** Each persona gets a consistent color used throughout the deck:
- Triage Specialist → Green
- Response Specialist → Blue
- Manager → Purple

---

### SLIDE 6: Layer 1 — Case Health Index (CHI)

**Visual:** The CaseIQ stack on the right with only the bottom layer (CHI) glowing bright. Other layers are dim/ghosted.

**Main content area (left):** A single case card rendered large, with a prominent CHI badge in the top-right corner. Show the badge transitioning through states:

```
┌──────────────────────────────────────┐
│  LNS-2026-00421                      │
│  US Federal — Search Warrant    CHI-4│ ← Blue badge
│  Agency: FBI Seattle                 │
│  Identifiers: 3  Services: 2        │
│  Due: Apr 15, 2026                   │
│                                      │
│         ⏱ Time passes...             │
│                                      │
│  LNS-2026-00421                      │
│  US Federal — Search Warrant    CHI-2│ ← Orange badge
│  Due: Apr 15, 2026 (9 days)         │
│  ⚠ SLA breach imminent              │
│                                      │
│         ⏱ Court deadline added...    │
│                                      │
│  LNS-2026-00421                      │
│  US Federal — Search Warrant    CHI-1│ ← Red badge
│  Due: Apr 15, 2026 (3 days)         │
│  🔴 Court deadline imminent          │
└──────────────────────────────────────┘
```

**Animation:** The badge transitions from blue → orange → red as time passes, with the escalation reason appearing each time. This is the "CHI is dynamic" moment.

**Bottom callout:** "Same inputs → same score. No more inconsistent prioritization."

---

### SLIDE 7: Layer 2 — Case List Health

**Visual:** The CaseIQ stack with the bottom two layers glowing (CHI + Case List Health).

**Main content:** The health bar from the spec, rendered as a polished UI component. Show it twice — once for a full case list, once for a filtered view, with the numbers changing:

```
Before filter:
┌──────────────────────────────────────────────┐
│  All Cases — 203 cases        Health: 🟡 WATCH│
│  CHI-1: 5  CHI-2: 12  CHI-3: 28  ...        │
│  2 past due · 1 penalty at risk              │
└──────────────────────────────────────────────┘

          ↓  Filter: "India + Emergency"

After filter:
┌──────────────────────────────────────────────┐
│  India Emergency — 41 cases  Health: 🟠 WARNING│
│  CHI-1: 3  CHI-2: 6  CHI-3: 12  ...         │
│  3 past due · 6 unassigned                   │
└──────────────────────────────────────────────┘
```

**Animation:** The filter applies and the health bar recalculates — numbers change, status shifts from Watch to Warning, color shifts from yellow to orange. The "instant recalculation" is the visual hook.

**Callout:** "The health of any view. Recalculated in real time."

---

### SLIDE 8: Focus Profiles

**Visual:** Split screen.

**Left side:** A stylized version of the Tuesday planning slide deck (an actual PowerPoint icon with a red "X" through it, or a screenshot of a messy assignment spreadsheet, faded/greyed out).

**Right side:** A clean Focus Profile card:

```
┌──────────────────────────────────────┐
│  DALE AYERS — This Week              │
│                                      │
│  ① Azure (non-US)       12 cases    │
│  ② US Federal           47 cases    │
│  ③ Oldest in US JTQ    203 cases    │
│                                      │
│  Active: 3/6    Completed: 11       │
│  [Published by Shane · Tue 9:15 AM] │
└──────────────────────────────────────┘
```

**Arrow:** From left (old) to right (new) with the label "From this → to this"

---

### SLIDE 9: Layer 3 — LENS Health Dashboard

**Visual:** The CaseIQ stack with three layers glowing (CHI + Case List Health + LENS Health).

**Main content:** A polished mock of the LENS Health Dashboard — not a wireframe, but a realistic dark-themed UI rendering:

- Top strip: "LENS HEALTH — Week of Mar 24, 2026 | Operating Mode: ELEVATED"
- Table of assignment groups with colored status dots (red/orange/yellow/green)
- Each row shows: group name, case count, trend arrow (↑/↓), RS capacity (3/5), risk icons
- One row is expanded showing a mini sparkline chart of case volume over 8 weeks

**Color palette:** Dark background (charcoal), colored status indicators, white text. Should look like an operations center dashboard — serious, information-dense, professional.

**Callout:** "From firefighting to forecasting."

---

### SLIDE 10: Layer 4 — Legal Demand Intelligence

**Visual:** The CaseIQ stack with four layers glowing.

**Main content:** A split-panel UI mockup — the extraction review panel:

**Left panel:** A rendered PDF document (blurred/generic legal text, but with key entities highlighted with colored bounding boxes):
- Agency name highlighted in blue
- Identifiers highlighted in green
- Date range highlighted in orange
- Deadline highlighted in red

**Right panel:** Extracted fields list with confidence badges:
```
Agency: FBI — Seattle         ✅ 96%
Type: Search Warrant          ✅ 94%
Deadline: Apr 15, 2026        ✅ 91%
Identifiers:                  ⚠️ 78%
  user@outlook.com            ✅ 99%
  +1-206-555-0142             ✅ 95%
  xb0x_g4m3r_t4g              ⚠️ 72%

⚠️ Cross-validation:
  Submitted: "Subpoena"
  Extracted: "Search Warrant"
  → Discrepancy flagged
```

**Animation:** Colored bounding boxes appear on the PDF one by one, and the corresponding extracted field appears on the right. The cross-validation warning pops last with a subtle shake animation.

**Callout:** "The documents tell the story. CaseIQ reads them."

---

### SLIDE 11: Full Case Lifecycle

**Visual:** A horizontal flow diagram — not a boring flowchart, but a stylized pipeline:

Five connected nodes, each as a rounded rectangle with an icon:

```
📄 TRIAGE  →  ⚙️ FULFILLMENT  →  📦 COLLECTION  →  🚀 DELIVERY  →  🔒 CLOSURE
```

Below the pipeline, floating event badges that can "attach" at any point:
- 🚫 Cancellation
- 🔄 Renewal
- 🔍 Internal Review
- 📩 LE Modification
- 📋 NDO Tracking

Each badge has a dotted line connecting it to the pipeline at various points, showing that lifecycle events can occur anywhere.

**Color:** The pipeline flows left-to-right with a gradient from teal (triage) through blue (fulfillment/collection) to green (delivery/closure). Event badges are amber/warning-colored.

---

### SLIDE 12: What We Gain — Before/After

**Visual:** A two-column comparison table, but designed as contrasting cards rather than a flat table:

**Left column (Today):** Dark red/grey background, each row has an ✗ icon
**Right column (CaseIQ):** Green/teal background, each row has a ✓ icon

Each row is a horizontal card pair. Key rows to emphasize visually (larger font):
- "Manual judgment per case" → "CHI: instant, deterministic"
- "Tuesday slide deck" → "Focus Profiles: published, qualified"
- "Discover backlogs after crisis" → "LENS Health: 4-week forecasts"

---

### SLIDE 13: What We Gain Over Kodex

**Visual:** A competitive positioning matrix — CaseIQ on the vertical axis, Kodex on the horizontal, with a diagonal line. Features above the diagonal are "CaseIQ advantage." Features on the diagonal are "parity."

Alternatively, a simpler visual: Two columns, CaseIQ and Kodex, with checkmarks. CaseIQ has all checkmarks. Kodex is missing 8 rows (the advantages), shown as empty/grey cells.

The 8 advantage rows should be called out with a distinct highlight color and a small "Unique to CaseIQ" badge.

---

### SLIDE 14: Implementation Roadmap

**Visual:** A Gantt-style horizontal timeline, but stylized:

Seven horizontal bars, each a different color from the CaseIQ palette, stacked vertically with labels. The eEvidence fast lane is shown as a separate bar running in parallel above the main track, connected to Phases 1-3 with dotted dependency lines.

```
Pre-Phase  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 1    ░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░
Phase 2    ░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░░
Phase 3    ░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░░
Phase 4    ░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░░
Phase 5    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░
Phase 6    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████░
Phase 7    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██░

eEvidence   ░░░░░░░░████████████████░░░░░░░░░░░░░
Fast Lane                            ↑
                              18 Aug 2026
                             (EU Enforcement)
```

A vertical red dashed line at the August 2026 mark labeled "EU Enforcement Deadline."

**Below the Gantt:** The "what complete means" criteria as four small icon+text pairs.

---

### SLIDE 14A: Compliance Gate

**Visual:** A gate/checkpoint metaphor — two pillars with a bar across them, and a checklist flowing through the gate. Items on the checklist have green checkmarks (completed) or amber circles (in progress).

The five review areas as a vertical checklist, each with an owner badge:

```
✅ Audit trail spec              Legal + Engineering
✅ Data residency review         DPO + Compliance
⏳ Transparency reporting        Legal
⏳ Encryption standard           CISO
⏳ LDI liability scope           Legal
⏳ EU PKI certificate chain      Security + Engineering
⏳ eEvidence stop-clock rules    Legal + Engineering
```

**Callout:** "Engineering does not begin until this gate clears."

---

### SLIDE 14B: CLASS v2 Dependency

**Visual:** An architecture diagram showing DARS/CaseIQ in the center, with CLASS v2 as an external service connected by API lines at four integration points (one per phase). Each integration point is labeled with the phase number and the specific endpoint.

```
                    ┌─────────────┐
         Phase 2 ───│             │
  /accountidentifiers│   CLASS v2  │
                    │             │
         Phase 5 ───│  Collector  │
  auth logs, profile │   API      │
                    │             │
         Phase 7 ───│             │
  /locationssummary │             │
                    └─────────────┘
                          │
                    ┌─────┴─────┐
                    │  LENS     │
                    │  Storage  │
                    └───────────┘
```

A red callout box for the dependency risk: "CLASS v2.2 (Azure) — TBD. Phase 5 collection for Azure may remain manual if delayed."

---

### SLIDE 15: Impact — By the Numbers

**Visual:** Metric cards arranged in a 3×3 grid. Each card has:
- The metric name (small, top)
- A large "before" number crossed out in red
- A large "after" number in green
- The phase that delivers it (small badge, bottom)

Example card:
```
┌─────────────────────┐
│ Time to find a case  │
│                      │
│   Minutes  → Seconds │
│   ████████    ██     │
│                      │
│ Phase 3 + 4          │
└─────────────────────┘
```

The most dramatic improvements (Tuesday planning: Hours → Minutes, SLA detection: Reactive → Proactive) should be the largest cards.

---

### SLIDE 15B: Measuring Success

**Visual:** A measurement timeline — horizontal arrow from "Baseline Study (Weeks 1-6)" through "Phase Launches" to "90-Day Review."

Above the timeline, the 7 baseline metrics as small cards.
Below the timeline, the 4 success criteria as bold targets with progress bars (empty for now — to be filled as the program executes).

```
Baseline Study          Phase Launches              Program Review
    ●─────────────────●────●────●────●──────────────●
    │                 P1   P2   P3   P4             │
    │                                                │
    │  SLA breach rate: ≥40% reduction              │
    │  Planning time: ≥60% reduction                │
    │  Time-to-case: <30 seconds                    │
    │  Routing failures: Zero                       │
```

---

### SLIDE 16: The Ask

**Visual:** Clean, minimal. Dark background. White text. No diagrams.

Left side: The four "what we need" bullets, each with a distinct icon:
- 🏗️ Engineering investment
- ⚡ eEvidence Fast Lane team
- 🤝 RS/Attorney partnership
- ⚖️ Legal/Compliance alignment

Right side: The four "what we deliver" bullets, each with a green checkmark.

A thin horizontal line separates the two sides with the label "Investment → Outcome"

---

### SLIDE 17: Close

**Visual:** The full CaseIQ stack, all five layers glowing, centered on a dark background. Dale's quote in large italic text above the stack.

Below the stack: "CaseIQ — Making lawful access response faster, safer, and smarter."

Microsoft logo. End.

---

## Color Palette Reference

| Layer | Primary Color | Hex (suggested) | Usage |
|-------|--------------|-----------------|-------|
| CHI | Green-to-Red gradient | `#22C55E` → `#EF4444` | CHI badges, case health |
| Case List Health | Teal/Cyan | `#06B6D4` | Health bar, list-level indicators |
| LENS Health | Blue | `#3B82F6` | Dashboard, system-level status |
| LDI | Amber/Gold | `#F59E0B` | Extraction confidence, document highlights |
| Forecasting | Purple/Violet | `#8B5CF6` | Projections, scenario modeling |
| Audit Trail | White/Silver line | `#E2E8F0` | Vertical thread through all layers |
| eEvidence | Distinct accent (EU blue) | `#003399` | Fast lane track, EU compliance items |

## Health Status Colors (consistent everywhere)

| Status | Color | Hex |
|--------|-------|-----|
| Healthy | Green | `#22C55E` |
| Watch | Yellow | `#EAB308` |
| Warning | Orange | `#F97316` |
| Critical | Red | `#EF4444` |

## Typography Notes

- Slide titles: Bold, large (28-32pt)
- Body text: Clean sans-serif (Segoe UI for Microsoft alignment)
- Code/data: JetBrains Mono or Cascadia Code — reinforces the "system-level" feel
- Dale/David quotes: Italic, slightly larger than body, with attribution in smaller text
- Numbers in metric cards: Extra-large (48-60pt), bold
