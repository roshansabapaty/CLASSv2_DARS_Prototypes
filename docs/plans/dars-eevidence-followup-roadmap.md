# DARS / eEvidence — follow-up roadmap & Copilot agent prompts

> Open work items that need to be picked up after the current DARS prototype session ends. Each section has (1) context for the human reader and (2) a copy-pasteable **Copilot Agent prompt** designed to be dropped into GitHub Copilot Chat (Agent mode) in VS Code without drift. Copilot prompts are self-contained — brief Copilot as if it just walked into the room.
>
> **Generic anti-drift rules embedded in every prompt below** (do not strip these when copying):
> - Phase 1 is *explore*. Phase 2 is *plan / propose*. Phase 3 is *implement only after explicit approval*.
> - Cite specific file paths + line numbers when proposing changes. Never propose code against a file you haven't read.
> - Match existing conventions in the repo you're working in (Tailwind hex vs Fluent v9 makeStyles, shadcn vs Radix primitives, prop-naming, etc.). Surface mismatches; don't invent new patterns.
> - Don't add features, refactor adjacent code, or upgrade dependencies that weren't requested.
> - Stop and ask the user before any destructive operation (delete file, drop migration, force-push, etc.).
> - At the end of each phase, summarize what you did + what's next in ≤ 5 bullets before moving on.

---

## 1. Fulfillment Wizard — cleaner date-range picker (3 modes)

### Context

Date Range columns currently appear in the Fulfillment Wizard's Step 2 (Services Configuration), in [src/components/fulfillment-wizard/ServiceCategoryTable.tsx](c:/R/DARS_eEvidence/src/components/fulfillment-wizard/ServiceCategoryTable.tsx) (column header "Date Range") and on every data-type row that has a `startDate` / `endDate`. The current control is a pair of native `<input type="date">` inputs side by side — works but feels heavy when you've got 10+ data types stacked, and there's no shortcut for "X days from start" or "X days back from end" — both common LE phrasings on warrants.

**The three modes to support:**

| Mode | User picks | We compute |
|---|---|---|
| Manual range | Both start + end | nothing — store as-is |
| Forward from start | Start + `N` days | `end = start + N days` |
| Backward from end | End + `N` days | `start = end - N days` |

The picker should be a single popover affordance (not 2+ visible inputs on every row), with the active mode visible inside the popover so the user can switch fluidly.

### Deliverable

A new component `<DateRangePicker3Mode>` that drops into ServiceCategoryTable (and any other row-level Date Range cell) and replaces the existing pair of native date inputs. State shape stays `{ startDate?: string; endDate?: string }` so the surrounding form-data plumbing doesn't change.

### Copilot Agent prompt

```text
You are improving the DARS_eEvidence prototype (Vite + React 18 + TypeScript +
Tailwind 4 + shadcn primitives + some Fluent v9 islands). Repo root:
c:\R\DARS_eEvidence.

GOAL
Replace the row-level Date Range cell in the Fulfillment Wizard with a single
popover-based control that supports three input modes:
  1. Manual: user types both Start + End.
  2. Forward: user types Start + N days; we set End = Start + N.
  3. Backward: user types End + N days; we set Start = End - N.

The control must round-trip the existing `{ startDate?: string; endDate?: string }`
shape unchanged so callers don't need updating.

PHASE 1 — EXPLORE (read-only)
1. Read src/components/fulfillment-wizard/ServiceCategoryTable.tsx end-to-end.
   Find every Date Range input. Note the row data shape, how state flows up to
   the parent (FulfillmentWizard.tsx -> Step2ServicesConfiguration.tsx), and
   which prop / callback updates the start/end on a row.
2. Read src/components/ui/popover.tsx and src/components/ui/input.tsx — these
   are the shadcn primitives you'll compose. Don't pull in a new date library.
3. Grep for any existing date-range helper (e.g. `addDays`, `differenceInDays`)
   in src/utils/. If one exists, reuse it. If not, do simple inline math —
   don't add date-fns just for this.
4. Report findings before writing code: file:line for each Date Range input
   site, the exact callback signature that updates a row's start/end, and a
   one-paragraph plan for the new component.
5. STOP. Wait for me to confirm the plan.

PHASE 2 — DESIGN
After I confirm Phase 1, propose:
  - Component file location (src/components/fulfillment-wizard/
    DateRangePicker3Mode.tsx).
  - Props shape (value: { startDate?: string; endDate?: string },
    onChange: (next) -> void, plus any optional `mode` default).
  - Internal state for current mode + the days-N input.
  - Popover trigger appearance (a single button showing "Mar 1 - Mar 14" or
    "Pick range" in muted text when empty; uses the existing chip styling
    from sibling cells — match the Tailwind tokens used in
    ServiceCategoryTable.tsx).
  - Tab order + a11y labels (the popover content needs role="dialog" via
    Radix's PopoverContent + visible focus management on the mode toggle).
Show me the proposed JSX + state shape. STOP for approval.

PHASE 3 — IMPLEMENT
After approval, ship:
  1. Create the new component.
  2. Replace the existing pair of date inputs in ServiceCategoryTable.tsx with
     the new component. Don't touch any unrelated columns.
  3. Verify the existing parent state-update callbacks still receive the same
     shape (start/end strings or undefined).
  4. Run `npx vite` in c:\R\DARS_eEvidence and load any case with
     workflowStage="fulfillment". Confirm:
       - The Date Range cell renders as a single button.
       - All three modes produce the right start/end pair.
       - Switching mode mid-edit doesn't wipe the existing dates unexpectedly
         (preserve what's already set when the user toggles modes).
       - Clearing both fields is reachable (an explicit "Clear" affordance).
  5. Search for "type=\"date\"" across the wizard subtree — if any other Date
     Range surfaces exist in fulfillment-wizard/, mention them but do NOT
     migrate without my explicit go-ahead.

ANTI-DRIFT
- Don't add date-fns / dayjs / any date lib.
- Don't restyle adjacent table cells. Don't change column widths beyond what
  the new single button needs.
- Don't migrate the picker elsewhere (Triage form, NDO form, etc.) — scope is
  the Fulfillment Wizard only.
- If you find that the existing `startDate` / `endDate` shape is actually
  Date objects (not strings), surface that BEFORE changing the component; the
  data contract decision should come from me.
```

---

## 2. Workflow navigation panel — better placement

### Context

The case-form workflow has three stages: Triage, Review Case, Collection. Today the navigation between them is rendered as:

- **Default**: vertical `WorkflowSidebar` on the left rail of the case page. Takes ~256 px of horizontal width AND has tall sub-step accordion content — eats vertical room too.
- **`FF_STAGE_TAB_BAR` flag on**: replaces the sidebar with a horizontal `StageTabBar` at the top of the case content area. Recovers the 256 px horizontal — but it doesn't *read* as a primary workflow nav (looks like a content tab strip, gets ignored).

The user's directive: figure out a third placement that gives back vertical space without making the nav feel like incidental content tabs.

Possible directions to evaluate (Copilot will explore):
- M365 left-rail-style icon column (24 px collapsed icons + tooltip on hover, expandable on click).
- Sticky breadcrumb-style stage indicator above the case header with click-through.
- Inline stepper at the very top of the form (≤ 56 px tall) with active-stage highlight + completion ticks.

### Deliverable

A short design RFC (markdown doc) comparing 2–3 placements with mockups (ASCII or screenshot), recommendation, and an implementation plan for the chosen direction.

### Copilot Agent prompt

```text
You are designing a UX placement change for the DARS_eEvidence prototype.
Repo root: c:\R\DARS_eEvidence.

GOAL
Produce a design RFC that recommends a new placement for the case-form
workflow navigation (Triage / Review Case / Collection). The current
WorkflowSidebar takes too much vertical space; the horizontal StageTabBar
(behind FF_STAGE_TAB_BAR) doesn't read as primary nav. We need a third
option.

PHASE 1 — EXPLORE
1. Read src/components/WorkflowSidebar.tsx + src/components/StageTabBar.tsx
   (if present) end-to-end. Note the props each accepts, the
   completion-state model, and where they mount in App.tsx /
   PageContainer.tsx.
2. Grep for "FF_STAGE_TAB_BAR" to find every callsite affected by the flag.
3. Read the StickyCaseHeader and CaseSummaryAndTabs components — those
   chrome elements compete for screen real estate at the top of the case
   form. Note their heights.
4. Open the running app (npm run dev / vite, port 3009) and screenshot:
     a) A Triage case with the WorkflowSidebar showing (flag off).
     b) The same case with FF_STAGE_TAB_BAR on.
   Use Playwright (already in node_modules/playwright) — write a small
   probe script if needed. Save to .playwright-mcp/screenshots/ with
   descriptive names.
5. Measure: in dev tools, capture the pixel height the sidebar eats above
   the fold and how much of the case form is visible without scrolling at
   1440x900. Same measurement for the tab-bar variant. Report both.
6. STOP. Summarize what you found in ≤ 8 bullets + 2 screenshot links.

PHASE 2 — PROPOSE 2-3 PLACEMENTS
After I see Phase 1, propose 2-3 alternative placements. For each, draw
an ASCII mockup of the case page (or a Mermaid flow showing where the nav
sits), and list:
  - Vertical pixel cost vs current sidebar
  - Discoverability score (does it read as primary nav?)
  - Implementation cost (component refactor, new component, or just CSS?)
  - A11y notes (keyboard reachable, ARIA role, screen-reader announcement)

Candidate placements to consider — DO consider these unless you have a
strong reason not to:
  - M365 left-rail icon column (24px collapsed + tooltip on hover,
    expanding inline on activation).
  - Sticky breadcrumb-style stage chip strip above the case header.
  - Inline horizontal stepper at the very top of the form content
    (~56px tall, click-through, with completion ticks).

Recommend ONE. STOP for my pick.

PHASE 3 — DOCUMENT
After I pick, write the RFC to
C:\Users\lisawu\.claude\plans\dars-workflow-nav-placement-rfc.md with:
  - Context (1 paragraph)
  - Current state (with screenshots embedded as relative links)
  - Options considered (2-3, brief)
  - Recommendation (the picked one, with rationale)
  - Implementation plan: file list + change summary per file + test plan
    + flag strategy (introduce a new flag like FF_NAV_PLACEMENT_V2 so it
    ships behind a feature flag, parallel to FF_STAGE_TAB_BAR)
  - Open questions

ANTI-DRIFT
- Do NOT ship the implementation in this run. RFC + screenshots only.
- Do NOT modify WorkflowSidebar.tsx / StageTabBar.tsx in this run.
- Do NOT introduce a router refactor or a layout primitive replacement.
- If you discover the FF_STAGE_TAB_BAR flag implementation has bugs,
  note them in the RFC but don't fix them here.
```

---

## 3. eEvidence UX + contracts spec + durable refresh skill

### Context

There's a product spec for eEvidence at **Appendix F: Workflow Summaries** — Microsoft SharePoint URL the user provided:

> `https://microsoft.sharepoint.com/:w:/t/LENSEngineeringEC/cQrpcAYRtoN6R5rVPmoezwcQEgUCS8IwXXGoMT3bQsedPJJwtQ`

The DARS_eEvidence prototype embodies the UX side of this spec. The two prod codebases that need to implement it are:

- `c:\R\LENS-LRMS` (LE Request Management Service — the queue / case form / fulfillment)
- `c:\R\LENS-CMS` (Content Management Service)
- `c:\R\LENS-Common` (shared library / contracts)

(Repos clonable via the existing `ado-lens-clone` skill from `dev.azure.com/o365exchange`.)

### Deliverables (two of them)

**3a.** A spec document at `c:\R\DARS_eEvidence\docs\eevidence-ux-contracts-spec.md` (path to confirm with user — could also live in plans/) that:
- Mirrors Appendix F's section structure (Workflow Summaries).
- For each workflow, captures: UX in the prototype (with embedded Playwright screenshots), API contracts the workflow consumes, and a FE/MT/BE gap table comparing the spec/prototype to current LENS-LRMS + LENS-CMS code.

**3b.** A **durable Claude Code skill** at `c:\Users\lisawu\.claude\skills\refresh-eevidence-spec\` that, when invoked, re-syncs the LENS-LRMS / LENS-CMS / LENS-Common repos and regenerates the spec document with up-to-date prototype screenshots + code-comparison tables. (The user has Claude Code installed; Copilot Agent should produce the skill files even though Copilot itself can't invoke skills — the user will run them from Claude Code.)

### Copilot Agent prompt

```text
You are working on the DARS_eEvidence prototype (c:\R\DARS_eEvidence) and
adjacent prod repos (c:\R\LENS-LRMS, c:\R\LENS-CMS, c:\R\LENS-Common). Your
job has two deliverables: (3a) an eEvidence UX + contracts spec document,
(3b) a Claude Code skill that keeps the spec fresh.

CONTEXT
- Product spec lives in SharePoint at this URL (Appendix F: Workflow
  Summaries): https://microsoft.sharepoint.com/:w:/t/LENSEngineeringEC/cQrpcAYRtoN6R5rVPmoezwcQEgUCS8IwXXGoMT3bQsedPJJwtQ
- DARS_eEvidence is the design-direction prototype. Routes / surfaces of
  interest:
    Triage page (DataEntryForm.tsx with workflowStage="triage")
    Review Case page (same component, workflowStage="fulfillment")
    Collection page (CollectionTracker.tsx)
    Fulfillment Wizard (FulfillmentWizard.tsx + fulfillment-wizard/*)
    Sender Authority tab (SenderAuthorityTab.tsx)
    Identifier & Data Services step (Step2ServicesConfiguration.tsx +
      ServiceCategoryTable.tsx)
    Correspondence Hub
    Attorney Dashboard (app-shell/AttorneyDashboard.tsx)
    Case Queue (CaseQueue.tsx)
- LENS-LRMS and LENS-CMS implement (or will implement) the same workflows
  in production. We compare and surface gaps.

PHASE 1 — INTAKE & EXPLORE
1. Fetch the SharePoint doc via the WorkIQ MCP (`mcp__workiq__ask_work_iq`).
   WorkIQ handles Microsoft SSO automatically, so this is the preferred path
   over SharePoint Graph or PowerShell credential calls. Issue a question
   like:
     "From the document at <SharePoint URL>, extract the full text of
      'Appendix F: Workflow Summaries' verbatim, preserving heading levels,
      tables, and numbered lists. Return as markdown."
   If WorkIQ prompts for EULA acceptance, run `mcp__workiq__accept_eula`
   once and retry. Save the response to
   c:\R\DARS_eEvidence\docs\_intake\appendix-f-workflow-summaries.md.
   If WorkIQ returns a partial / paraphrased extract instead of verbatim
   text, re-ask explicitly: "Return the literal content, do not summarize."
   If WorkIQ still cannot access the doc, STOP and tell me — I'll paste
   the contents. Do NOT fall back to scraping or PowerShell SSO — WorkIQ
   is the canonical Microsoft-internal content path.
2. Clone LENS-LRMS, LENS-CMS, LENS-Common into c:\R if they aren't already
   present. Use the ado-lens-clone Claude skill semantics if available
   (Git Credential Manager has a cached AAD token; `git clone
   https://o365exchange@dev.azure.com/o365exchange/O365%20Core/_git/LENS-LRMS`
   should work). If a clone fails, surface the exact error and stop —
   don't retry with `--no-verify` or token hacks.
3. Index each repo: list top-level directories, identify the FE entry
   points (likely a React or Razor app), the MT layer (likely an API /
   message-bus boundary), and the BE persistence layer. Build a one-page
   "where things live" map for each repo. Save to
   c:\R\DARS_eEvidence\docs\_intake\<repo>-map.md.
4. Read the eEvidence-related workflows in each repo. Grep for
   "EPOC", "eEvidence", "Form 1", "Form 3", "Grounds for Refusal",
   "underlying conditions", "addressedToController",
   "addressedToProcessor", "Notification details", "WISP" to find the
   prod-code equivalents of what the prototype renders.
5. Launch the DARS_eEvidence app (npx vite in c:\R\DARS_eEvidence;
   playwright is installed at node_modules/playwright). Capture
   screenshots of every workflow listed under Appendix F. Save to
   c:\R\DARS_eEvidence\docs\screenshots\<workflow-slug>\<step-N>.png.
6. STOP. Summarize what you found in ≤ 15 bullets, list the files
   you intake'd, the screenshots taken, and the gap headlines per
   repo. Wait for me to confirm before writing the spec.

PHASE 2 — WRITE THE SPEC (3a)
After confirmation, write the spec to
c:\R\DARS_eEvidence\docs\eevidence-ux-contracts-spec.md. Mirror the
section structure of Appendix F (one section per workflow). Each section
contains:
  - Summary (from Appendix F).
  - Prototype UX (embedded screenshots from Phase 1 step 5, plus 2-3
    sentence narrative of the user flow as rendered today).
  - API contracts (the request / response / event shapes the workflow
    consumes; pull these from LENS-Common if defined, otherwise sketch
    from the prototype's types/caseTypes.ts and call out the gap).
  - FE / MT / BE gap table comparing the spec + prototype to current
    LENS-LRMS + LENS-CMS code. Each row:
        | Layer | Current state | Required state | Owner | Risk |
  - Open questions.

The spec should be skimmable. Every screenshot has a caption. Every code
reference cites file:line. Every gap row has a one-sentence "why this
matters" lead.

STOP after the first 3 workflow sections are written. Show me, get
feedback, then continue.

PHASE 3 — BUILD THE DURABLE SKILL (3b)
After the spec is approved, create a Claude Code skill at
c:\Users\lisawu\.claude\skills\refresh-eevidence-spec\ with:
  - SKILL.md describing the skill (frontmatter: name, description,
    when-to-use; body: step-by-step instructions for Claude to follow
    when invoked).
  - A scripts/ subdirectory with:
      sync-repos.ps1 — pulls latest LENS-LRMS / LENS-CMS / LENS-Common.
      capture-screenshots.mjs — Playwright script that launches the
        prototype, navigates the workflows, and saves screenshots.
      build-gap-table.mjs — re-scans the prod repos for the eEvidence
        markers grepped in Phase 1, compares against the prototype's
        type definitions, and emits a refreshed gap table for each
        workflow section.
  - A README.md describing how the skill is run (from Claude Code:
    "/refresh-eevidence-spec") and what its outputs are.

The skill must be idempotent: running it twice in a row produces no
spurious diffs (deterministic screenshot timestamps, stable section
ordering, sorted gap-table rows by Layer then Risk).

ANTI-DRIFT
- Do NOT write a separate "automation" outside the skill folder — the
  skill IS the automation.
- Do NOT cache the SharePoint doc inside the skill (it changes; the
  skill re-fetches each run via WorkIQ — `mcp__workiq__ask_work_iq` —
  same as Phase 1 step 1, then overwrites the intake file).
- Do NOT introduce CI / GitHub Actions / scheduled tasks — the skill is
  user-invoked, not background. We can layer scheduling later if the
  user asks.
- If WorkIQ is not available in the host MCP client when the skill
  runs, the skill should detect that and stop with a clear message
  ("WorkIQ MCP not connected — re-fetch of Appendix F skipped; spec
  regenerated against stale intake") rather than silently producing
  stale output.
- If you cannot reach a repo (auth failure, missing path), surface the
  error in the skill output and exit cleanly. Don't fabricate a gap
  table from stale data.
```

---

## 4. UAT validation document (and skill update)

### Context

Parallel to the spec — a UAT (User Acceptance Test) document driven by the same Appendix F: Workflow Summaries source. Each workflow gets a numbered set of validation scenarios that the business side can run through to certify the implementation.

The durable skill from item 3 should be extended to also keep this document fresh on each invocation (so spec + UAT drift together).

### Deliverable

A doc at `c:\R\DARS_eEvidence\docs\eevidence-uat-validation.md` plus an extension to the `refresh-eevidence-spec` skill that regenerates both docs.

### Copilot Agent prompt

```text
You are extending the eEvidence documentation set in c:\R\DARS_eEvidence.
This prompt depends on item 3 being completed first (skill at
c:\Users\lisawu\.claude\skills\refresh-eevidence-spec\ exists, and the
spec at c:\R\DARS_eEvidence\docs\eevidence-ux-contracts-spec.md exists).

GOAL
Author a UAT validation document aligned to Appendix F: Workflow
Summaries, and update the refresh-eevidence-spec skill to keep this
document fresh too.

PHASE 1 — EXPLORE
1. Read c:\R\DARS_eEvidence\docs\eevidence-ux-contracts-spec.md to
   understand the workflow taxonomy already in play. The UAT doc must
   mirror its workflow ordering exactly.
2. Read the intake of Appendix F (c:\R\DARS_eEvidence\docs\_intake\
   appendix-f-workflow-summaries.md) to extract any acceptance criteria
   already in the product spec.
3. Read the existing skill at c:\Users\lisawu\.claude\skills\
   refresh-eevidence-spec\ — note its structure (SKILL.md, scripts/,
   README.md). The extension must mirror its style.
4. STOP. Summarize the workflow list, the per-workflow acceptance
   criteria already in Appendix F, and your plan for the UAT doc shape.

PHASE 2 — DRAFT THE UAT DOC
Per workflow section, the UAT doc has:
  - Pre-conditions (what state the case + identifiers must be in).
  - Numbered scenarios (1, 2, 3, ...) — each is a sequence of user
    actions terminated by an observable outcome. Format each as a
    table with columns: Step | Action | Expected outcome.
  - Pass/fail criteria for the workflow as a whole.
  - Linked-from-spec section: each scenario references the spec's gap
    table row that motivates it (so if a gap is closed, the UAT scenario
    becomes runnable; if a gap is open, the UAT scenario is "blocked by
    <gap-row-link>").

Write the first 3 workflow sections, STOP, and show me. Iterate.

PHASE 3 — EXTEND THE SKILL
After UAT doc is approved, extend the refresh-eevidence-spec skill:
  - SKILL.md gains a second deliverable: regenerate
    eevidence-uat-validation.md alongside the spec.
  - scripts/ gains build-uat-validation.mjs which reads the spec, the
    Appendix F intake, and emits the UAT doc. Must be idempotent and
    deterministic in scenario ordering.
  - README.md updates to describe the dual output.

ANTI-DRIFT
- Don't introduce a test runner (Cypress, Playwright Test) at this
  stage — UAT scenarios are business-readable prose, not automated tests.
- Don't infer acceptance criteria the spec doesn't already imply. If a
  gap row has no clear acceptance criterion, leave the scenario as a
  placeholder with "Pending business sign-off on acceptance bar".
- Don't rename or restructure existing skill files; only add.
```

---

## 5. LENS-LRMS unit-test review — business-scenario gap analysis

### Context

Engineering on LENS-LRMS has authored unit tests. We need a business-side audit: do the tests cover the scenarios the BUSINESS side (us, the case-form workstream) cares about? Particularly the eEvidence workflows mapped in item 3's spec.

### Deliverable

A gap-analysis doc at `c:\R\DARS_eEvidence\docs\lens-lrms-unit-test-coverage-gaps.md` listing:
- Existing test files (path) + the scenarios they cover (one-line summary each).
- Business scenarios from Appendix F + the prototype that are NOT covered, with severity (P0 = must-fix-before-ship, P1 = soon, P2 = nice-to-have).

### Copilot Agent prompt

```text
You are auditing the LENS-LRMS unit-test suite for gaps relative to the
business scenarios needed for eEvidence. Repos: c:\R\LENS-LRMS (prod
code + tests), c:\R\DARS_eEvidence (prototype + spec at
c:\R\DARS_eEvidence\docs\eevidence-ux-contracts-spec.md).

GOAL
Produce a coverage-gap report that lists every business scenario from
Appendix F + the prototype that LENS-LRMS unit tests do NOT exercise,
prioritized.

PHASE 1 — INVENTORY EXISTING TESTS
1. In c:\R\LENS-LRMS, find every test file. Identify the test framework
   (xUnit / NUnit / Jest depending on whether it's .NET or Node).
2. For each test file, extract the public test method names. Map each
   to a one-line description of what business scenario it covers (use
   the test name + first 5 lines of the body as the source of truth).
3. Save the raw inventory to c:\R\DARS_eEvidence\docs\_intake\
   lens-lrms-test-inventory.md with this format per file:

     ## <relative path>
     - <TestMethod1>: <one-line scenario summary>
     - <TestMethod2>: ...

4. STOP. Tell me how many test files + methods you inventoried.

PHASE 2 — INVENTORY BUSINESS SCENARIOS
1. Read c:\R\DARS_eEvidence\docs\eevidence-ux-contracts-spec.md.
   Extract every workflow + its acceptance criteria.
2. Read c:\R\DARS_eEvidence\docs\eevidence-uat-validation.md (from
   item 4). Extract every UAT scenario.
3. Build a flat list of business scenarios with stable IDs (e.g.
   EE-W3-S2 for "eEvidence workflow 3, scenario 2"). Save to
   c:\R\DARS_eEvidence\docs\_intake\business-scenarios.md.

PHASE 3 — COVERAGE MAP + GAPS
For each business scenario, search the test inventory for a match
(test name keywords, body text, or annotations). Three buckets:
  - COVERED: at least one test directly exercises it.
  - PARTIAL: tests cover part of the scenario but not all branches /
    error paths.
  - GAP: no test exercises it at all.

Write the report to c:\R\DARS_eEvidence\docs\
lens-lrms-unit-test-coverage-gaps.md with three sections:
  1. Coverage summary (counts + percentage by status + by workflow).
  2. Gaps table — one row per GAP scenario:
       | Scenario ID | Workflow | Description | Severity | Suggested
         test file(s) to add | Owner |
     Severity rubric:
       P0 = touches money, legal compliance, data loss, or the eEvidence
            cross-border path (any gap here blocks ship).
       P1 = a primary user flow gap that won't block ship but will hurt
            confidence.
       P2 = edge case / cosmetic / low-traffic path.
  3. Partial-coverage table — same shape, smaller scope.

STOP. Walk me through the top-10 P0 gaps before any follow-up work.

ANTI-DRIFT
- Do NOT write any unit tests yourself in this run. Audit only.
- Do NOT modify LENS-LRMS source. Read-only.
- Do NOT score severity from gut feel — apply the rubric strictly. If a
  scenario doesn't fit any rubric category, leave severity as "?" and
  flag it.
- If you cannot determine whether a test covers a scenario from name +
  first 5 lines alone, mark it PARTIAL with a note "needs human review",
  not COVERED.
```

---

## Cross-cutting notes for the user

- **Ordering**: items 3 → 4 → 5 are sequential (each depends on the prior). Items 1 and 2 are independent and can run in parallel with items 3-5.
- **Copilot Agent vs Claude Code**: the prompts above assume GitHub Copilot Chat in Agent mode inside VS Code. Items 3b and the skill-update part of item 4 produce Claude Code skill files; Copilot can write them, but only Claude Code can *invoke* them after they exist.
- **Approval gates**: every prompt embeds explicit STOP points after each phase. Honour them — Copilot Agent will keep pushing if you let it. The friction is intentional.
- **Secrets / auth**: the SharePoint doc fetch goes through the **WorkIQ MCP** (`mcp__workiq__ask_work_iq`) which handles Microsoft SSO automatically. ADO clones rely on cached Git Credential Manager tokens. Don't paste tokens into a prompt. If Copilot asks for one, redirect it to use WorkIQ for SharePoint and cached creds for ADO.
- **WorkIQ scope**: WorkIQ is the canonical path for any Microsoft-internal content (SharePoint, OneDrive, Teams, internal wikis) in these prompts. If a prompt mentions fetching MS content via another channel, replace it with a WorkIQ call before handing off.
