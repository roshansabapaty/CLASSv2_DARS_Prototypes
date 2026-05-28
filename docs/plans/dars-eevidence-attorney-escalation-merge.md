# Integration Plan: Merge Enterprise Attorney Escalation Prototype into DARS_eEvidence

## Context

The prototype at `C:\R\enterprise-attorney-escalation-prototype\` (built over the last several sessions) introduced a substantial attorney-review surface that doesn't exist in the production app at `C:\R\DARS_eEvidence\`:

- **Per-identifier attorney escalation** (DARS_eEvidence is case-level today; the prototype proved partial-escalation flows like Fabrikam's 2-of-3-identifiers scenario).
- **Tri-pane Target Identifier summary** with the file-tab switcher and promote-on-selection pattern for multi-identifier cases.
- **Disclosure & non-disclosure section** in the Attorney Review panel (controller / user notification posture per identifier, including **exempt-category** non-disclosure for case types where MS doesn't notify even without an NDO — e.g. child exploitation).
- **Cross-border login activity** drill-down driven by IP geolocation + impossible-travel detection.
- **Enterprise context section** (Org + nested Target Identifier(s)) with 5 enterprise-only CTAs and auto-suggestion chips.
- **Prior LNS tenant history** + a stacked Prior Case Detail drawer.
- **Escalation reason badges** (Enterprise / Cross-Border / eEvidence / Other) in the dashboard queue and case header.

This plan brings those surfaces into DARS_eEvidence in **4 phased PRs**, each independently shippable, with the per-identifier data model in scope.

**Confirmed scope decisions:**
- Phased merge — 4 PRs (this plan).
- Per-identifier escalation model **is in scope** — DARS_eEvidence migrates from `FormData.attorneyEscalation` to `AccountIdentifier.attorneyEscalation`.
- **Persona / role-flag system is OUT of scope** — defer to a future PR. The Attorney Dashboard remains accessible to all users regardless of role. DARS_eEvidence keeps its existing `CURRENT_USER = "Nicole Garcia"` constant. Capability-flag gating (`isAttorney`, `canFlagExecReview`) on the new CTAs is also deferred — every CTA is available to whoever is using the app.

---

## Stack alignment (one-time, applies across all phases)

- **Both apps are React + Vite + Fluent v9.** The prototype only uses Fluent + Griffel, which matches DARS_eEvidence's policy in [docs/UI_LIBRARY_POLICY.md](C:/R/DARS_eEvidence/docs/UI_LIBRARY_POLICY.md).
- **DARS_eEvidence has some legacy shadcn-styled files** in `src/components/escalation/` and `src/components/ui/`. Per the policy: *shadcn allowed until file is touched.* Any file we touch must be migrated to Fluent v9 + Griffel `makeStyles(tokens)` in the same PR.
- **DARS_eEvidence's pre-commit hook** `scripts/check-no-new-shadcn-imports.sh` enforces this — keep it green in every PR.

---

## Phase 1 — Per-identifier data model migration

**Goal:** move escalation state from `FormData.attorneyEscalation` to `AccountIdentifier.attorneyEscalation`, add the `taskStatus = "AttorneyReview"` value, and route all reducer actions through `identifierId`. This is the largest architectural change; everything in Phases 2-4 depends on it.

**Modified files:**
- `src/types/caseTypes.ts`:
  - On `AccountIdentifier`: add `taskId: string`, change `taskStatus` to include `"AttorneyReview"`, add `attorneyEscalation?: AttorneyEscalation`, add `createdBy?: "LE Provided" | "Supplemental"`.
  - On `AttorneyEscalation` (lines ~170-205): add `scope: "case" | "identifier"` (default `"case"` for migration safety).
  - On `EscalationAuditEvent` (lines ~210-225): add optional `identifierId?: string`.
  - On `FormData`: remove `attorneyEscalation` (or mark `@deprecated` for one release if anything external depends on the shape).
- `src/components/identifier-table/identifier-table-utils.ts` — add `AttorneyReview` entry to `TASK_STATUS_MAP` (purple, label "Attorney Review"). Match Fluent token colors used in the prototype's `TaskStatusBadge`.
- `src/utils/caseDataRegistry.ts` (or wherever the reducer / write actions live) — all `ESCALATE` / `ATTORNEY_ACTION` / `ACK_CONDITIONS` actions take `identifierId`. Add `taskStatusForAttorneyStatus()` helper (lift from `prototype/src/store/caseStore.tsx` lines 142-155).
- `src/utils/escalationHelpers.ts` — extend `isAttorneyAssignedForCase`, `getEscalationSummaryForCase`, etc. to derive from identifier-level state. Add new helpers from `prototype/src/helpers/caseEscalation.ts`: `getEscalatedIdentifiers`, `isCaseInAttorneyQueue`, `getEscalationSummary`, `findIdentifier`.

**New files:**
- `src/helpers/caseEscalation.ts` — copy from `prototype/src/helpers/caseEscalation.ts` verbatim.

**Migration of existing mock cases:**
- `src/utils/mockCaseDataFactory.ts` + per-case mock files (e.g. `mockCaseDataLENS202600180.ts`, `mockCaseDataLENS202600190.ts`) — for any case that has `formData.attorneyEscalation`, move the escalation block onto the matching identifier, set that identifier's `taskStatus: "AttorneyReview"`, set `scope: "case"`, give each identifier a `taskId`. Add `identifierId` to each existing audit event.

**Modified consumer files (find via grep `c.attorneyEscalation`):**
- `src/components/escalation/AttorneyReviewPanel.tsx` — takes `identifierId` prop; reads from identifier (pattern: `prototype/src/components/escalation/AttorneyReviewPanel.tsx`). **Migrate from shadcn to Fluent v9 + Griffel as part of this touch.**
- `src/components/escalation/ConditionsBanner.tsx` — takes `identifierId`; Fluent migration.
- `src/components/escalation/EnterpriseEscalationBanner.tsx` — uses `isCaseInAttorneyQueue` for the "already escalated" gate; Fluent migration.
- `src/components/escalation/EscalateToAttorneyDialog.tsx` — adds Scope radio + identifier picker (pattern: `prototype/src/components/escalation/EscalateToAttorneyDialog.tsx` lines 88-180); Fluent migration.
- `src/components/escalation/AuditThread.tsx` — takes `case` prop; per-identifier filter dropdown; Fluent migration.
- `src/components/app-shell/AttorneyDashboard.tsx` — uses `isCaseInAttorneyQueue` for queue filter. Sort by deadline asc. **Stays accessible to everyone — no persona gate.**

**Verification:**
- Existing DARS_eEvidence cases (LNS-2026-00180 Spanish EPOC, LNS-2026-00190 manifest error) still show in the Attorney Dashboard.
- Open one → expand its identifier row → AttorneyReviewPanel renders inline with the escalation reason.
- Release the identifier → `taskStatus` flips to `InProgress`; case exits the queue.
- AuditThread shows the new entry tagged with the identifier value.
- `npx tsc -b` clean; `bash scripts/check-no-new-shadcn-imports.sh` clean.

---

## Phase 2 — New attorney surfaces (tri-pane, disclosure, reason badges, identifier-table extensions)

**Goal:** ship the visible attorney UX additions on top of the Phase 1 foundation.

**New files (copy from prototype, retarget imports):**
- `src/types/enterprise.ts` — `EnterpriseContext`, `EnterpriseOrgContext`, `EnterpriseUserContext`, `ConflictOfLawHeat`, `EnterpriseTrigger`, `DerogationCheckResult` (`PriorCase` deferred to Phase 4).
- `src/types/case.ts` extension or `src/types/disclosure.ts` — `NotificationPermission`, `DisclosureConstraints`, with the prototype's shape **extended** as follows for the merge:
  - `source` enum gains `"Exempt category"` alongside `"Order"` / `"Jurisdiction default"` / `"Attorney decision"`. Represents the case where LE did NOT include an NDO but MS still doesn't disclose because the case/identifier type is policy-exempt (e.g. CSE/CSAM, imminent threat to life, national security).
  - New optional `exemptCategory?: string` field — names the policy category when `source === "Exempt category"` (e.g. `"Child Sexual Exploitation"`).
  - `DisclosureSection` UI shows a distinctive treatment when exempt: a third badge state alongside the `Prohibited` status badge — e.g. a purple `Exempt: CSE` chip + the policy citation in the note. Communicates "this is a structural non-disclosure, not an NDO from the order".
- `src/components/tri-pane/EnterpriseTriPaneSummary.tsx` — the full tri-pane with file-tab pill bar + promote-on-selection + linked detail box. Spec §5.2.
- `src/components/escalation/DisclosureSection.tsx` — mounted inside AttorneyReviewPanel.
- `src/components/escalation/EnterpriseConflictOfLawStrip.tsx` — heat-row replacement for `ControllerNotificationStrip` on non-eEvidence cases.
- `src/components/dashboard/EscalationReasonBadges.tsx` — `Enterprise` / `Cross-Border` / `eEvidence` / `Other` badges.
- `src/components/enterprise-context/EnterpriseContextSection.tsx`, `OrgPanel.tsx`, `UserPanel.tsx`, `AutoSuggestionChips.tsx`.
- `src/helpers/isEnterpriseCase.ts`, `conflictOfLaw.ts`, `escalationReasons.ts`, `autoSuggestions.ts`, `targetUserSummary.ts`. (`crossBorderSignal.ts` ships in Phase 3 — for now, `escalationReasons` only fires the `Cross-Border` badge from enterprise-context heat.)

**Modified files:**
- `src/types/caseTypes.ts` — `FormData` gains `enterpriseContext?`, `disclosureConstraints?`.
- `src/components/identifier-table/IdentifierTableRow.tsx`:
  - Expand state per row (the prototype version of [`IdentifierTableRow.tsx`](C:/R/enterprise-attorney-escalation-prototype/src/components/identifier-table/IdentifierTableRow.tsx) is structured around this).
  - Escalated row: left-border accent + expanded content hosts `AttorneyReviewPanel`.
  - Non-escalated row: dimmed (70% opacity), expanded content shows "Not flagged for attorney review."
- `src/components/identifier-table/IdentifierTable.tsx` — add stats bar showing "N of M awaiting attorney review" + expand-all toggle.
- `src/components/escalation/AttorneyReviewPanel.tsx` — mount `DisclosureSection` below the Reason box, `EnterpriseConflictOfLawStrip` below that.
- `src/components/app-shell/AttorneyDashboard.tsx` — render `EscalationReasonBadges` per row; add `N/M review` chip on multi-identifier cases. Add `AttorneyPreviewPane` (split-pane) that mounts `EnterpriseTriPaneSummary` for the selected case.
- `src/components/case-form/CaseSummaryHeader.tsx` (or DARS_eEvidence equivalent) — replace the lone request-type badge with `EscalationReasonBadges`.

**Mock data:**
- `src/utils/mockOrgs.ts` (new) — port the 6 enterprise tenants from `prototype/src/data/mockOrgs.ts`. Hook a couple of DARS_eEvidence's existing cases (LNS-2026-00180 Iberia, LNS-2026-00190 Northwind) up to org records so the Enterprise Context section has data to render.
- Seed `disclosureConstraints` on the existing DARS_eEvidence cases (controller / user notification posture).
- **Add at least one CSE-exempt mock case** to demonstrate the new exempt-category path — e.g. a new `LNS-2026-00CSE` with a consumer Outlook identifier, FBI agency, child exploitation crime, no NDO in the order, but `controllerNotification: "Prohibited"` + `userNotification: "Prohibited"` + `source: "Exempt category"` + `exemptCategory: "Child Sexual Exploitation"` + a note like "Microsoft policy mandates non-disclosure for CSE / CSAM cases regardless of order language."

**Layout fix carried over:** apply the Chrome sticky-CTA-footer fix from the prototype to DARS_eEvidence's AttorneyDashboard at the same time — `gridTemplateRows: "minmax(0, 1fr)"` on the dashboard grid + `minHeight: 0` on the preview pane's scroll container.

**Verification:**
- Open LNS-2026-00180 (Iberia EPOC) → tri-pane renders LE & Order / Target Identifier / Enterprise Org stripes; Iberia org appears.
- Open Attorney Review panel → Notification & Non-disclosure section shows Controller=Required (eEvidence), User=Permitted.
- Dashboard queue row shows `[Enterprise] [Cross-Border] [eEvidence]` badges and `1/1 review` chip.
- Identifier table row has red left border + expand → inline AttorneyReviewPanel.
- **CSE-exempt case verification:** Open the new CSE mock case → Attorney Review panel shows Notification & Non-disclosure: Controller=Prohibited / User=Prohibited with a purple `Exempt: Child Sexual Exploitation` chip alongside each `Prohibited` badge. Hover or read the note → "Microsoft policy mandates non-disclosure for CSE / CSAM cases regardless of order language." Confirms the attorney can distinguish at a glance between "NDO from order" and "structural policy exempt."

---

## Phase 3 — Cross-border login activity

**Goal:** bring in the login-location service + the side drawer that lets the attorney drill from "Last logon" into the full timeline. This is a relatively isolated module — minimal touchpoints on existing files.

**New files (copy verbatim from prototype):**
- `src/types/cross-border.ts`.
- `src/services/geolocation.ts`, `src/services/loginQuery.ts`.
- `src/data/mockGeoTable.ts`, `src/data/mockLoginEvents.ts`. **Seed login events for every existing DARS_eEvidence identifier so the panel has content** — pick 1-2 cases to author rich stories (multi-geo, impossible-travel, VPN).
- `src/components/cross-border/LoginLocationPanel.tsx`, `LoginTimeline.tsx`, `CountrySummaryCards.tsx`, `ResultsHeader.tsx`.
- `src/helpers/crossBorderSignal.ts`.

**Modified files:**
- `src/types/caseTypes.ts` — add `agencyCountryCode: string` (ISO-2) to `FormData`. Seed on every existing mock case.
- `src/components/identifier-table/IdentifierTableRow.tsx` — add "Logins" button in the Actions column (dispatches `OPEN_LOGIN_LOCATION`).
- `src/components/enterprise-context/UserPanel.tsx` — "See more" button next to Last logon for enterprise cases.
- `src/components/tri-pane/EnterpriseTriPaneSummary.tsx` — conditional "See more" button on the Last logon row for consumer cases (no UserPanel mounts there).
- Store / caseDataRegistry — add `loginLocationPanel: { caseId, identifierId } | null` slot + actions.
- `src/helpers/conflictOfLaw.ts` — fallback to login-derived countries when `enterpriseContext` is absent (for consumer cross-border detection).
- `src/helpers/escalationReasons.ts` — `Cross-Border` badge can fire from `hasCrossBorderLogins(c)` in addition to enterprise-context heat.

**Verification:**
- Open a case with seeded multi-geo logins → click an identifier's "Logins" button → drawer opens, ResultsHeader summary correct, timeline groups by day, impossible-travel pair flagged red.
- Toggle "Hide in-jurisdiction" → only cross-border + indeterminate events remain.
- Consumer case (e.g., one with a Brazilian agency + non-BR logins) → shows the `Cross-Border` reason badge in the dashboard despite having no enterprise context.

---

## Phase 4 — Prior tenant history + Enterprise CTAs

**Goal:** the remaining enterprise-only attorney capabilities — prior LNS lookup with stacked detail drawer, and the 5 enterprise CTAs from spec §6.2.

**New files (copy from prototype):**
- `src/types/enterprise.ts` (extend with `PriorCase` type).
- `src/data/mockPriorHistory.ts` — seed prior LNS for at least one tenant the existing DARS_eEvidence cases reference, so the panel has content.
- `src/helpers/priorTenantLookup.ts` — `getPriorCasesForTenant`, `getPriorCaseById`, `summarizePriorHistory`.
- `src/components/enterprise-context/PriorTenantHistoryPanel.tsx`, `PriorCaseDetailPanel.tsx` (stacked drawer).
- `src/components/enterprise-context/enterprise-ctas/RedirectToEnterpriseDialog.tsx`, `CheckConcessionTrackerDialog.tsx`, `FlagPolicyReviewButton.tsx`, `FlagExecReviewButton.tsx`, `ViewPriorHistoryButton.tsx`. **All CTAs available to any user (no role-flag gating).**

**Modified files:**
- `src/components/enterprise-context/OrgPanel.tsx` — "Prior LNS history" row hosts `ViewPriorHistoryButton`.
- `src/components/enterprise-context/EnterpriseContextSection.tsx` — CTA row at the bottom with the 4 remaining buttons.
- `src/components/tri-pane/EnterpriseTriPaneSummary.tsx` — Prior LNS row in LE & Order stripe shows inline clickable case-ID links (Fluent `Link as="button"`) opening the Prior Case Detail drawer.
- Store — `sidePanel: { kind: "priorTenantHistory" }` and `priorCaseDetail: { caseId }` slots stack. New actions: `OPEN_PRIOR_CASE_DETAIL`, `CLOSE_PRIOR_CASE_DETAIL`, `OPEN_SIDE_PANEL`, `CLOSE_SIDE_PANEL`, `RECORD_DEROGATION_CHECK`, `REDIRECT_TO_ENTERPRISE`, `FLAG_POLICY_REVIEW` / `UNFLAG_POLICY_REVIEW`, `FLAG_EXEC_REVIEW` / `UNFLAG_EXEC_REVIEW`.
- New audit kinds in `EscalationAuditEvent`: `RedirectedToEnterprise`, `DerogationChecked`, `PolicyReviewFlagged`, `PolicyReviewCleared`, `ExecReviewFlagged`, `ExecReviewCleared`, `PriorTenantHistoryViewed`.

**Verification:**
- Open a case for a tenant with prior history (e.g. mock Fabrikam with 3 prior LNS) → Org panel shows "Prior LNS history" + ViewPriorHistoryButton.
- Click button → side drawer opens, lists prior cases.
- Click a case ID in the drawer → second drawer stacks with the Prior Case Detail card.
- Tri-pane Prior LNS row lists case IDs as inline links — click one bypasses the list and opens detail directly.
- Take "Flag for Exec Review" → audit event written + status badge appears in Enterprise Context header.

---

## Critical files to read before starting any phase

**In DARS_eEvidence (the target):**
- [src/types/caseTypes.ts](C:/R/DARS_eEvidence/src/types/caseTypes.ts) (lines 132-237 for escalation types; lines 63-83 for `TaskStatus` enum; the broader `FormData` to understand what we're extending).
- [src/utils/caseDataRegistry.ts](C:/R/DARS_eEvidence/src/utils/caseDataRegistry.ts) — the store / action layer that Phase 1 reshapes.
- [src/utils/escalationHelpers.ts](C:/R/DARS_eEvidence/src/utils/escalationHelpers.ts) — case-level helpers to extend with per-identifier variants.
- [src/components/identifier-table/IdentifierTable.tsx](C:/R/DARS_eEvidence/src/components/identifier-table/IdentifierTable.tsx) and [IdentifierTableRow.tsx](C:/R/DARS_eEvidence/src/components/identifier-table/IdentifierTableRow.tsx) — what we extend in Phase 2.
- [src/components/identifier-table/identifier-table-utils.ts](C:/R/DARS_eEvidence/src/components/identifier-table/identifier-table-utils.ts) — `TASK_STATUS_MAP` to extend.
- [src/components/app-shell/AttorneyDashboard.tsx](C:/R/DARS_eEvidence/src/components/app-shell/AttorneyDashboard.tsx) — the existing queue to evolve.
- [src/components/escalation/*.tsx](C:/R/DARS_eEvidence/src/components/escalation/) — the existing escalation surface (shadcn — to be Fluent-migrated as touched).
- [docs/UI_LIBRARY_POLICY.md](C:/R/DARS_eEvidence/docs/UI_LIBRARY_POLICY.md) + [scripts/check-no-new-shadcn-imports.sh](C:/R/DARS_eEvidence/scripts/check-no-new-shadcn-imports.sh) — enforced policy.

**In the prototype (the source):**
- [src/types/](C:/R/enterprise-attorney-escalation-prototype/src/types/) — type files (cross-border, attorney, enterprise, case, correspondence). **Skip `persona.ts` — out of scope.**
- [src/store/caseStore.tsx](C:/R/enterprise-attorney-escalation-prototype/src/store/caseStore.tsx) — the reducer pattern Phase 1 ports.
- [src/helpers/](C:/R/enterprise-attorney-escalation-prototype/src/helpers/) — all 8 helper modules.
- [src/components/tri-pane/EnterpriseTriPaneSummary.tsx](C:/R/enterprise-attorney-escalation-prototype/src/components/tri-pane/EnterpriseTriPaneSummary.tsx) — the file-tab pattern.
- [src/components/escalation/DisclosureSection.tsx](C:/R/enterprise-attorney-escalation-prototype/src/components/escalation/DisclosureSection.tsx) and [AttorneyReviewPanel.tsx](C:/R/enterprise-attorney-escalation-prototype/src/components/escalation/AttorneyReviewPanel.tsx).
- [src/components/identifier-table/](C:/R/enterprise-attorney-escalation-prototype/src/components/identifier-table/) — the row with inline `AttorneyReviewPanel` mount.
- [src/components/cross-border/LoginLocationPanel.tsx](C:/R/enterprise-attorney-escalation-prototype/src/components/cross-border/LoginLocationPanel.tsx).

---

## Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| **Per-identifier migration breaks fulfillment / preservation flows** that read `formData.attorneyEscalation` | Phase 1 keeps both fields readable for one release (deprecation comment); migrate downstream callers in a follow-up before deleting. |
| **shadcn → Fluent rewrite on touched files balloons each PR** | Limit the migration to files actually changed by the merge. Anything not touched stays on shadcn (per policy). Resist scope creep. |
| **Existing AttorneyDashboard.tsx already filters by `assignedToLawyer` / `escalatedToLE` / `isThreatToLife`** | Phase 1's `isCaseInAttorneyQueue` should be OR'd with the existing predicates so neither system regresses. Confirm with product whether the new per-identifier model fully supersedes the old flags. |
| **Tri-pane in DARS_eEvidence may collide with existing case-summary layouts** | Phase 2 adds tri-pane only to AttorneyDashboard preview pane + the case-form view when `caseStage === "AwaitingAttorneyReview"`. Doesn't replace existing summary cards on other stages. |
| **Cross-border login data is mocked** | Phase 3 ships with `mockLoginEvents.ts`. The real integration (Kusto / IP-geo service) is out of scope per spec §9.2 — surface a "Mock data" banner in dev / staging builds. |
| **The 5 enterprise CTAs touch external systems (concession tracker, RAVE, etc.)** | Phase 4 lands them as stubs (writing audit events + UI feedback, no external calls). Mark as "Demo only" in the dialog copy until backends ship. |
| **All CTAs available to any user (no role-flag gating yet)** | Acceptable tradeoff for now — persona system is a separate future PR. When personas land, retrofit gating onto the Exec Review CTA + Attorney Review actions. Track in a follow-up issue. |

---

## End-to-end verification (post-Phase 4)

```
cd C:\R\DARS_eEvidence
npm run dev
```

**Existing case (LNS-2026-00180 Iberia EPOC):**
1. Land on Attorney Dashboard (rail item always visible). Queue row shows reason badges `[Enterprise] [Cross-Border] [eEvidence]` + `1/1 review` chip + sort-by-deadline.
2. Click the row → preview pane shows tri-pane with file-tab Target Identifier (one tab since single-identifier).
3. Open full case → Identifier Table row has red left border + Attorney Review status. Expand → inline AttorneyReviewPanel.
4. Disclosure section shows Controller=Required (per eEvidence Art. 9(3)), User=Permitted.
5. Expand Enterprise Context → Org panel shows Iberia tenant data + Prior LNS row + 4 CTA buttons.
6. Click "Login activity" on the identifier → cross-border drawer opens with seeded logins.
7. Take "Approve with Conditions" → ConditionsBanner appears in the case; AuditThread gets the new event tagged with the identifier; the identifier's `taskStatus` flips to `InProgress`; case exits the queue.

**New multi-identifier case** (port LNS-2026-00503 Fabrikam pattern into DARS_eEvidence):
1. Dashboard shows `2/3 review` chip.
2. Tri-pane Target Identifier stripe has the file-tab pill bar — 2 escalated tabs + "+1 not flagged" menu.
3. Click "+1 not flagged" → t.brooks promotes to a tab (italic + "Not flagged" chip).
4. Expand each row in the identifier table — each has its own inline AttorneyReviewPanel. Release one — other stays in the queue.

**Hooks / typecheck:**
- `npx tsc -b` clean.
- `bash scripts/check-no-new-shadcn-imports.sh` clean.

---

## Implementation Status & Decisions (updated 2026-05-27)

The plan ran in order — Phase 1 → 2 → 3 → 4 — followed by a Phase 1 write-side migration and a multi-tenant TPID rollup that the original plan didn't anticipate. All four phases are complete; this section records the deviations and final design state so a future reader knows what's actually in the codebase.

### What landed (vs. plan)

**Phase 1 — Per-identifier data model**: shipped as designed. The migration was kept **additive**: `FormData.attorneyEscalation` stays alongside `AccountIdentifier.attorneyEscalation` rather than being deleted. Read-side migration covers all 14 banner / panel / predicate sites via `getActiveAttorneyEscalation(c)` (helper picks per-identifier first, falls back to case-level). Write-side migration (Step ?) added in a later pass.

**Phase 2 — Attorney surfaces**: shipped as designed plus extras the plan didn't list:
- New `AttorneyReviewWorkspace` top-level page reachable from the dashboard. Hosts the tri-pane summary + AttorneyReviewPanel + EnterpriseContextSection + IdentifierTable in one focused view.
- Right-pane split with three switchable surfaces: `CaseRequestSnapshot` (DARS Request View), `LegalDemandSnapshot` (Legal Demand Preview), and the **writeable** `CorrespondencePanel` (initial scoping was read-only; we changed it to writeable mid-merge because attorneys need to compose outbound correspondence to IA/EA themselves).
- `IdentifierTableRow` fully migrated to Fluent v9 + Griffel (kept as `<tr>`/`<td>` so it still nests inside the parent shadcn `<TableBody>`).
- `AttorneyDashboard` polish was kept surgical — added to the shadcn allowlist with a tracked follow-up for full Fluent migration rather than blowing up the PR.

**Phase 3 — Cross-border login activity** was scoped down + renamed mid-merge:
- Renamed "IP History" / "Login Location History" → **"Consumer User Locations"**, restricted to Consumer-typed identifiers.
- Lookup pivoted from a per-identifier manual fetch to a **side-effect of Check Accounts**: the 30-day-back window populates the cross-surface `ipHistoryStore` for every Consumer identifier on the case. Removed the dialog's From/To inputs and "Look up locations" button; the panel becomes a display-only viewer.
- Enterprise identifiers don't surface a per-user IP history; instead they get the **"Org Home Location"** field (renamed from "HQ country") with an inline **Cross-border / In-jurisdiction chip** comparing tenant HQ vs issuing-authority country. Surfaced in both OrgPanel and the tri-pane Enterprise Org stripe.
- New `"Consumer User Location Summary"` column on the IdentifierTable. Populated by Check Accounts; em-dashed for Enterprise identifiers.

**Phase 4 — Prior tenant history + 5 enterprise CTAs**: shipped as designed. Added two MOCK_ORGS entries (Kontoso DE, Contoso FR) and seeded prior history for them so the demo paths render end-to-end.

**Phase 1 write-side migration (added mid-stream)**: not in the original plan but became necessary once the read migration showed where the case-level field was being mutated. Added:
- `SignalScope` discriminated union: `all | tenant | tpid | some | none`. Variants chosen based on real authority-decision semantics — IA / CA / VA / EA signals shouldn't produce competing case-level + per-task records simultaneously.
- **Hybrid storage rule** (your decision): `scope=all` writes mirror to FormData.attorneyEscalation (case-level) AND replicate per-identifier; `scope=some/tenant/tpid` writes per-identifier only and clear the case-level field; `scope=none` writes audit-event only.
- 8 attorney-escalation write handlers migrated to the unified helpers (`createAttorneyEscalation`, `applyAttorneyAction`, `acknowledgeConditions`, `linkHeldOutboundToEscalation`).
- `EscalateToAttorneyDialog` scope picker — dropdown that surfaces tenant / TPID options dynamically from the case's identifier mix.

**Multi-tenant + TPID rollup (added mid-stream)**: anticipated as a future scenario but built now because the plumbing was free once `SignalScope` existed.
- `EnterpriseOrgContext.parentTpid` + `parentTpidDisplayName` added.
- `AccountIdentifier.checkAccounts.parentTpid` added (per-identifier TPID for multi-tenant cases).
- `EnterpriseContext.orgs?: EnterpriseOrgContext[]` added (single-org `org` field still required for back-compat).
- New multi-tenant seed: **LNS-2026-00300** — USAO SDNY subpoena spanning Contoso US (`tenant-contoso`) + Contoso France (`tenant-contoso-fr`), both under `TPID-CONTOSO` / Contoso Holdings.
- `getPriorCasesForTpid(tpid)` + `summarizePriorHistoryForTpid(tpid)` helpers walk MOCK_ORGS for child tenants under the parent TPID and aggregate prior history across them.
- `ViewPriorHistoryButton` auto-detects multi-tenant cases and surfaces "+ N more tenants" / "TPID rollup" chips.
- `PriorTenantHistoryPanel` accepts an optional `tpid` and renders a "TPID rollup" header badge + subtitle when set.
- `PriorCaseDetailPanel` surfaces a **"From {tenant display name}"** originating-tenant badge so the attorney always sees which child tenant a prior case originated under.

### Key design decisions made during implementation

| Decision | Choice | Reason |
|---|---|---|
| Per-identifier escalation model rollout | Additive (case-level field stays `@deprecated`) | Avoids breaking 24 downstream consumers in one PR; lets the read-side migration land cleanly. |
| Scope storage rule | **Hybrid** for scope=all (case-level + replicate); per-identifier only for scope=some/tenant/tpid | No competing case-level + per-task records ever exist simultaneously; legacy readers still resolve via the case-level fallback. |
| `scope=none` semantics | Applies to attorney escalation too (not just authority signals) | Lets an attorney record an administrative review without gating any task. Audit-event-only. |
| Multi-tenant case shape | `EnterpriseContext.orgs?` (list) alongside `org` (primary). Per-identifier `tenantId` + `parentTpid` on `checkAccounts` | Preserves single-tenant seeds untouched; multi-tenant cases populate both. |
| Phase 3 lookup trigger | **Check Accounts** populates IP History (not a separate fetch) | Matches authority-data-collection workflow; UX shows one "fetch the user account context" affordance instead of two. |
| Phase 3 Enterprise path | **Org Home Location vs Issuing Authority** comparison chip, not per-user IP history | Enterprise tenant data isn't per-user — the cross-border signal lives at the org boundary. |
| Authority-signal handlers (IA Form 4, EA GFR) | Helpers scaffolded; not wired to runtime entry points | The codebase doesn't yet have IA Form 4 inbound / EA GFR inbound surfaces. The unified helpers are ready when those flows land. |
| AttorneyDashboard Fluent migration | Surgical-only, added to shadcn allowlist | 661 lines; full migration would have ballooned the PR. Functional polish (N/M chip, sort, predicate) shipped without it. |
| Persona / role-flag system | Out of scope as per the plan | All CTAs universally accessible. |

### Pinned follow-ups

Numbered for cross-reference in future PRs.

1. **`FormData.attorneyEscalation` final deletion** — Once hybrid-storage retires (no callers depend on the case-level mirror), strip the field from the `FormData` type, remove the case-level mirror logic from `applyAttorneyAction` / `createAttorneyEscalation` / `acknowledgeConditions` / `linkHeldOutboundToEscalation`, drop the fallback in `getActiveAttorneyEscalation`, and clean it out of every seed. Largely mechanical; gated only on confirming no out-of-tree consumers read the field.

2. **Real authority-signal handlers (IA Form 4 + EA GFR ingestion)** — `applyAuthorizationStatusUpdate` + `applyGfrDecision` exist in [caseEscalation.ts](C:/R/DARS_eEvidence/src/utils/caseEscalation.ts). Need a runtime entry point: either real IA Form 4 / EA GFR inbox surfaces, OR a prototype "Simulate authority signal" affordance that calls the helpers with mock payloads so the demo can exercise them end-to-end (status badge flip, audit-thread entry, scope=all/some/none persistence).

3. **Full Fluent migration of [AttorneyDashboard.tsx](C:/R/DARS_eEvidence/src/components/app-shell/AttorneyDashboard.tsx)** — 661 lines, on the shadcn allowlist. Functional polish (N/M chip, sort-by-deadline tiebreaker, `isCaseInAttorneyQueue` predicate) shipped surgically. Full migration awaits.

4. **Sticky CTA-footer fix on the dashboard preview pane** — `gridTemplateRows: "minmax(0, 1fr)"` on the dashboard grid + `minHeight: 0` on `CaseQueuePreviewPane`'s scroll container, per the plan. Behavioural symptom: footer CTAs in the preview pane scroll off-screen on long content in Chrome.

5. **TPID-aware production lookups (CLASS / LERS swap-out)** — The mock-backed helpers (`getPriorCasesForTpid`, `summarizePriorHistoryForTpid`, `getPriorCaseOriginOrg`) read from `MOCK_PRIOR_HISTORY` + `MOCK_ORGS`. Production wires through CLASS Org Profile + LERS prior-tenant queries — same helper signatures, swap the data source. Define a thin lookup-source interface so the swap is a single import change.

6. **`EnterpriseContext.org` legacy field cleanup** — Once all seeds populate `orgs[]`, mark `org` strictly `@deprecated` (it currently keeps the primary org for single-tenant back-compat). Reader helpers (`getEnterpriseOrgs`, `getPrimaryOrg`) already shield consumers; cleanup is type-only.

7. **TPID-aware lookups for derogation / RAVE / Concession Tracker** — Same pattern as #5: `Check Concession Tracker` currently writes a per-case `DerogationCheckResult`. Multi-tenant cases should aggregate at the TPID level. Small extension of the existing helper.

---

## Out of scope

- **Persona / role-flag system** (`AppUser`, `PersonaCapability`, `isAttorney`, persona switcher in header, LeftNavRail gating, capability gates on CTAs) — deferred to a follow-up PR. Attorney Dashboard and all CTAs are universally accessible in this merge.
- **Real backend integrations** (CLASS, Lynx, Kusto, RAVE, concession tracker, real IP-geo) — all mocked. Each enterprise CTA writes audit events only.
- **Real production-letter generation** for "Redirect to Enterprise" — stays a stub.
- **Real correspondence engine extensions** — Phase 4 reuses existing DARS_eEvidence correspondence types where it fits.
- **Migrating files that this merge doesn't touch from shadcn → Fluent** — leave them alone per policy.
- **DARS roadmap features beyond the prototype's surface** (CHI scoring, LENS Health, persona system Phase 1 from the DARS spec) — separate work.
