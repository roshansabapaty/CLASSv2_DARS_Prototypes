# Session Resume — eEvidence Inbound Correspondences Feature Plan

> **Last updated:** 2026-05-07
> **Working directory:** `c:\R\DARS_eEvidence`
> **Goal:** Plan the "all inbound correspondences" feature for the DARS_eEvidence web app, grounded entirely in the SharePoint PM spec.

## How to resume

1. `cd c:\R\DARS_eEvidence`
2. Read this file first.
3. Then read the two artifacts below in order.

## Primary artifacts

| File | What it is |
|---|---|
| `docs/eEvidence_MVP_Spec.md` | Verbatim grounding source from SharePoint, retrieved via WorkIQ. **Do not invent beyond this.** |
| `docs/eEvidence_Inbound_Correspondences_Feature_Plan.md` | The deliverable: 20-scenario inventory, categorization, UX patterns for Discover/Review/Respond, three duplicate-case linkage patterns, and 8 open questions. |

## Original SharePoint source

`https://microsoft.sharepoint.com/:w:/t/LENSEngineeringEC/cQrpcAYRtoN6R5rVPmoezwcQEgUCS8IwXXGoMT3bQsedPJJwtQ`
(File: `DARS Phase 2 - eEvidence MVP Spec v1.docx`, version 1.0 draft, dated 2026-03-20.)

To re-fetch, use the WorkIQ MCP tool `mcp__workiq__ask_work_iq` with the URL above as `fileUrls`. Note: WorkIQ truncates large responses and sometimes inserts meta-placeholders like `[the rest continues]` — when that happens, ask for one named subsection at a time and instruct: *"Do not insert placeholders. If a length cap hits, stop mid-sentence."*

## What's done

- §1 Regulatory Context (incl. all 17 ETSI TS 104 144 endpoints, inbound + outbound)
- §2 Actors and Roles (IA / EA / WISP / SP / LERS / Attorney / Central Authority; National vs International cases)
- §3 MVP Scope (3.0, 3.1, 3.4 have body content; 3.2/3.3/3.5/3.6/3.7/3.8 came back near-empty — flagged in spec file)
- §4 Explicit Non-MVP Exclusions
- §5 MVP Features 5.1–5.19 (all retrieved except §5.9 which appears to be missing in the doc itself — numbering jumps 5.8.2 → 5.10)
- §6 Assumptions, Dependencies, and Open Questions (13 open questions)
- Appendix F Workflow Summaries (F.1 standard production, F.2 EA review, F.3 emergency, F.4 preservation, F.5 Form 5 subsequent production, F.6 GFR, F.6.1 GFR all branches A–F, F.7 Form 3, F.7.1 Form 3 branches A–G, F.8 withdrawal)
- Audit of existing DARS_eEvidence src — no Correspondence Inbox, no eEvidence badges, no Audit Thread, no Linked Cases yet (greenfield)
- Inbound feature plan with 20 scenarios, 5 surface UX recommendation, 3 duplicate-case linkage patterns

## What's deferred / still missing

| # | Item | Status | Why deferred |
|---|---|---|---|
| 1 | **Appendix A** (full payload specs for the 10 inbound endpoints) | Not fetched | Not needed for UX-pattern evaluation; pull when implementation begins or when payload-field-level details are needed |
| 2 | Subsection bodies for §3.2 / 3.3 / 3.5 / 3.6 / 3.7 / 3.8 list | Empty in fetch | Headings only came back; re-fetch from SharePoint when needed |
| 3 | Appendix B (Notification Object technical specs) | Not fetched | Pull when implementing Form 3 / withdrawal confirmation outbound |
| 4 | Appendix C (Attorney escalation form) | Not fetched | Pull when implementing attorney case-assignment gate |
| 5 | Appendix D (Reference Implementation Delta Table) | Not fetched | Lower priority; cross-reference with UK COPO impl |
| 6 | Appendix E (full text of EU Regulation 2023/1543 referenced articles) | Not fetched | Reference material; only fetch if a specific article is needed |

## Three duplicate-case patterns (the user's specific concern)

Per spec, an IA/EA "creating a duplicate request" decomposes into three intentional patterns — not a bug:

- **P1 — Field update on the same case** (Form 6 preservation extension, EndPreservation, NewDeadline, DeliveryStatus). No new case. Surfaces as a banner + Correspondence-tab event on the existing case.
- **P2 — New linked case** (Form 5 Subsequent Production, revised EPOC after Form 3). LENS-API matches via `LinkedEPOCPRTransactionId`. Reciprocal hyperlinks both ways. Originating EPOC-PR gets `SUBSEQUENT PRODUCTION ACTIVE` badge.
- **P3 — Orphan Form 5 (no matching EPOC-PR)** → must submit Form 3 NonExecution. Spec §5.12 L100, F.5.

Full details and UX implications in `docs/eEvidence_Inbound_Correspondences_Feature_Plan.md` §3.

## Five UI surfaces the feature reduces to

1. Correspondence Inbox tab (per case)
2. Case-condition badges + banners
3. Linked Cases panel
4. Form 3 NonExecution wizard
5. Audit Thread tab

(Plus smaller additions: "Confirm Withdrawal" button, per-task re-delivery — slot into existing case-action surfaces.)

## 8 open questions blocking detailed design

See `docs/eEvidence_Inbound_Correspondences_Feature_Plan.md` §5. Highlights:

1. `Maintain` correspondence — does it always trigger ATTORNEY REVIEW REQUIRED, or only conditionally?
2. Four `?`-marked badge cells in §5.5.2 routing table for the EA agree/disagree/recognize/notrecognize cases
3. `ResponseRequiredBy` deadline rendering pattern
4. Nested documents (under TCLI-EC discussion, 2026-04-02)
5. Correspondence after case closure
6. Cancel-in-flight delivery (active engineering open item)
7. Default Form 3 reason code for orphan Form 5 (recommend `DataNotHeld`)
8. 8H emergency broadcast — primary channel (on-call vs all DARS users)

## Suggested implementation order (from the plan)

1. Data model + types (`Correspondence`, `DocumentObject`, `LinkedCase`, `CaseCondition`, `AuditEvent`)
2. Correspondence Inbox (read-only first)
3. Case-condition badges + banners
4. Send Correspondence modal (Request/Provide AdditionalInformation only)
5. Linked Cases panel
6. Form 3 NonExecution wizard
7. Audit Thread
8. Manual-confirm Withdrawal + per-task re-delivery

## MCP servers configured this session

Six MCP servers now in user-scope `~/.claude.json`:

- `plugin:playwright:playwright` (existing)
- `workiq` ✓ — used to fetch SharePoint spec content
- `sharepoint`, `m365-copilot`, `onedrive`, `enghub` ✓ — connected, not used yet
- `skill-router` ✗ — failed to register (sandbox blocked external npm package `@stuffbucket/skills`); manual `claude mcp add -s user skill-router -- cmd /c npx -y @stuffbucket/skills` required

The legacy `~/.claude/.mcp.json` listing these servers is now redundant — Claude Code only auto-loads from `~/.claude.json`.

## Side-quest: LENS metadata enum locations

While in this session, the user also asked for several enum lists. Cached here for next session:

- **NatureOfCrimes / EU27DSAHarms / Countries / AgentRoles (LRMS canonical):** `LENS-LRMS\sources\dev\WebApi\src\BusinessLogic\Handlers\MetadataHandler.cs:22-58`. Hardcoded `IReadOnlyList<MetadataOption>`; not C# enums; exposed via `/metadata` endpoint.
- **CrimeTypes (LEPortal, TS, 13 values):** `LENS-LEPortal\sources\dev\WebClient\src\features\request-creation\store\types.ts:2-16`.
- **Countries (LEPortal):** DB-seeded, not enumerated. DSA list at `LENS-LEPortal\sources\dev\WebApi\src\LEPortal.Db\Migrations\20240118210628_AddDsaMemberCountriesTable.cs:38-43`.

LRMS and LEPortal lists are **independent** — they don't share definitions today.

## Side-quest: 11 LENS-* repos synced this session

All on `master` and fast-forwarded except `LENS-LRMS` which is on user branch `users/lisawu/casequeueupdate` with 23 dirty files (intentionally skipped). Repos updated:
LENS-ARS, LENS-CMS, LENS-Common, LENS-DCS, LENS-Delivery, LENS-Docs, LENS-LEAPI, LENS-LEPortal, LENS-Publish, LENS-SMS, LENS-Teams.
