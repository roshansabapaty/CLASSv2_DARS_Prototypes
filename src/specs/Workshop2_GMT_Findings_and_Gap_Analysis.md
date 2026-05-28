# LENS Case Management Workshop #1 (GMT) — Findings & Gap Analysis

**Source:** `LENS Case Management Workshop #1 - GMT.vtt`
**Date:** March 2026
**Duration:** ~1 hour 25 minutes
**Facilitator:** Lisa Wu (UX/Design)

---

## Participants

| Name | Role | Location | Tenure | Focus Area |
|------|------|----------|--------|------------|
| **Shane Mulvey** | Response Specialist | Dublin | 9 years | Operational excellence, daily/weekly metrics, resource deployment, FY goal tracking |
| **Claire Mulvey** | Response Specialist | Dublin | 6 years | India point-of-contact (72-hour SLA), outside counsel, search warrants, DSA, eEvidence |
| **Jessalyn Halbritter** | Response Specialist | US | 3 years | US operations, US metrics, USJT fulfillment queue |
| **Tracy Ingle** | Engineering/Program | — | — | Regulatory/transparency reporting, CRM system architecture, litigation research |
| **Faisal Younas** | Programmatic (ETSI) | — | — | eEvidence/ETSI programmatic deadlines |

---

## 1. Validated Roadmap Coverage

The following CaseIQ roadmap features were **directly validated** by workshop participants as solving real pain points:

| Roadmap Feature | Workshop Validation | Key Quote |
|----------------|--------------------|-----------|
| **CHI auto-scoring + auto-escalation** | No automatic timestamps today. Cases silently age. Manual priority judgment. | Shane: "If it's captured automatically in the system, users wouldn't have to do that and we would have access to that data that would allow for operational decisions." |
| **Case List Health / LENS Health** | Shane manually counts cases 1-2x/day. Claire checks India 3x/day. Jessalyn pulls metrics every Monday. | Shane: "looking after metrics, daily metrics, weekly metrics, all that kind of stuff to figure out where we need to deploy resources for the coming week" |
| **Focus Profiles (Phase 4)** | Shane's resource deployment process is exactly what Focus Profiles replace. | Shane uses Power BI pivot tables to see breakdown by federal, CE, state/local, enterprise, Azure — then assigns people. |
| **Identifier cross-reference search** | Claire uses identifier search heavily for India bomb threat cases — same email sent to 20 agencies. | Claire: "the suspect would create an e-mail address and they'd send 20 threats out and then we'd get that in 20 times" |
| **Saved/shared views with permissions** | Tracy creates litigation views shared only with attorneys. | Tracy: "I do a lot of research projects for various litigation. So I'll create a view... the only people we share it with are attorneys." / "100%" wants this in DARS. |
| **Column customization** | Each person wants different columns — jurisdiction, due date, original received date all missing from defaults. | Jessalyn: jurisdiction not shown. Shane: original received date not shown. |
| **Audit trail / activity log** | Previous manual timeline attempt failed because people didn't use it. Needs to be automatic. | Shane: "Tracy did try to implement something... but just people just weren't using it." |
| **Legal Demand Intelligence (LDI)** | CRM had an "Entity Recognition Score" from a prior Gen AI project that failed. Validates the concept but proves human-in-the-loop is essential. | Shane: "The Gen AI system was scanned through the legal demand and I will tell you how much of it was accurate." Tracy: "You can get rid of it." |
| **Duplicate detection** | Tracy wants automatic bulk cross-reference on every new case. | Tracy: "I would love if when a request comes in, every single account on that request is automatically checked for any other legal demand." |
| **Elimination of personal case pools** | Cases getting lost in personal queues is "the bane of existence." | Tracy: "Personal cues are the bane of existence. They stuff will get stuck in there and you don't know it's there." |
| **Pick/release from any view** | Release only works from Queue Items view, not Requests view. | Jessalyn: "if I clicked here I couldn't release this request from this view" |

---

## 2. New Gaps — Not in Current CaseIQ Roadmap

### GAP W2-1: "Worked On" vs. "Completed" — Multi-Contributor Activity Tracking

**What's missing:** The system only tracks who "completed" a case (via the custom `Worked By` field set on pick). It cannot track who worked on a case but didn't bring it to completion. Shane estimates Jessalyn completed 200 cases but actually worked on 350 in a month — the other 150 get no credit.

**Why it matters:** Performance evaluation, capacity planning, and FY goal tracking are all distorted. During Azure connect season, RS check 200-300 requests but only 20 are actually Azure-impacted — the checking work is invisible.

**Key quote:** Shane: "We can't do that at the moment... Jessalyn might have completed 200 requests, but she's worked on 350 over that month."

**Suggested phase:** Phase 1 (audit log foundation) — if the audit log captures every pick, release, field change, and time-in-state, this metric becomes a derived query rather than a separate feature.

---

### GAP W2-2: Jurisdiction-Based Default Due Dates

**What's missing:** Outside US and Brazil, the `requested due date` field is never populated. The LE Portal does not and will never let law enforcement set their own due dates. The system needs auto-calculated defaults based on jurisdiction.

**Business rules (confirmed by Shane + Tracy):**

| Jurisdiction | Default Due Date | Source |
|-------------|-----------------|--------|
| US | 14 days from original received date | Standard |
| EU | 10 days from original received date | eEvidence regulation |
| India | 3 days from original received date | 72-hour SLA |
| Brazil | Generally provided by LE on court orders; default 14 days if not | Standard |
| Rest of World | 14 days from original received date | Standard |

**Additional rules:**
- If LE provides a due date, use that instead of the default
- Due date may also come from "other items from Ali portal" (Tracy)
- Default is determined by jurisdiction + country + potentially other intake signals

**Key quote:** Shane: "with the requested due date, other than the US and Brazil, that field is never getting populated." Tracy: "No, it does not [let LE set due dates] and it never will because otherwise they're just going to put, you know, now on everything."

**Suggested phase:** Phase 2 (CHI engine) — CHI depends on `dateDue` for deadline-based scoring. If the field is blank for 80% of cases, CHI is blind to deadline risk. This must be solved before CHI is useful.

---

### GAP W2-3: Agency Registry with Type Classification & Deduplication

**What's missing:** Agency names are free-text, causing rampant duplication. The policy team in Dublin also needs to distinguish intelligence agencies from law enforcement agencies — a new classification not in any current field.

**Key quote:** Shane: "if we look at the Metropolitan Police in London, there could be London Met, Metropolitan Police London, Metropolitan Police UK, Metropolitan Police, London Met, and they're all the same agency."

**What's needed:**
- Standardized agency entity (one record per agency, not free-text)
- Agency type field: Intelligence Agency | Law Enforcement | Other
- Deduplication / merge capability for existing data
- Agency lookup during case creation (autocomplete, not free-text)

**Suggested phase:** Phase 1 (data model) for the entity; Phase 2 (triage form) for the lookup UI. Also feeds into Kodex GAP 2 (requestor verification).

---

### GAP W2-4: Pre-Loaded Enterprise Domain Flags ("V100 List")

**What's missing:** Enterprise domains with special contractual legal language need to be flagged in the system BEFORE any request arrives, so that when a request does come in for that domain, the system auto-escalates to attorneys. Today attorneys check an external system manually every time.

**Key quote:** Tracy: "We need to be able to add enterprise domains in here that we not necessarily have gotten a request on because they have special language. The attorneys need to know that it has to be flagged immediately." / "so that the attorneys don't have to go look in this other external system every time we get an enterprise"

**What's needed:**
- Domain registry with legal language flags
- Import the "V100 list" (referenced by Lisa) into the system
- Auto-escalation rule: if case identifier matches a flagged domain → immediately escalate to attorney + flag for RS
- Tracy: "There may even be flags for response specialist. Hey, this one's been flagged — escalate even faster than you would."

**Suggested phase:** Phase 4 (assignment/escalation rules) — this is a specialized Assignment Group trigger: "any case with identifier matching a V100 domain → auto-route to attorney escalation group."

---

### GAP W2-5: Automatic Bulk Identifier Cross-Reference on Intake

**What's missing:** When a new case arrives, there's no automatic check of whether its identifiers have appeared in prior cases. Today this is a manual search. Tracy wants every identifier on every new case automatically checked against all historical legal demands.

**Key quote:** Tracy: "What is missing today is bulk. I would love if when a request comes in, every single account on that request is automatically checked for any other legal demand that has come in for that account and provides a set of information."

**What's needed (per Tracy — the result set for each identifier):**
- All cases/requests where the identifier appeared (all time — "beginning of time")
- Whether those cases are resolved or open
- Request type (preservation, disclosure, real-time)
- Date/time received
- LNS number
- Whether preserved data still exists
- Whether preservation is in progress or complete

**Suggested phase:** Phase 2 (triage — run on intake) + Phase 7 (intelligence — proactive pattern detection). The Phase 3 identifier search builds the query capability; this gap is about running it automatically on every new case.

---

### GAP W2-6: Granular Legal Demand Subtypes

**What's missing:** "Summons-subpoena" is a single combined value. The policy team needs granular breakdown for regulatory reporting.

**Key quote:** Shane: "Currently we track everything as a summons dash subpoena in the US if it's a subpoena. What Ryan wants to be able to do is how many subpoenas or how many summonses are we getting."

**What's needed:** Split into separate values:
- Summons
- Subpoena
- Grand Jury Subpoena
- Administrative Subpoena

**Suggested phase:** Phase 1 (data model — update `REQUEST_SUB_TYPES` enum) + Phase 2 (triage form dropdown).

---

### GAP W2-7: Eliminate Personal Case Pools Entirely

**What's missing:** CRM's "assign" action (vs. "route") sends cases to a personal queue that no one else can see. Cases get lost. Managers can't pull from personal queues for reporting.

**Key quotes:**
- Tracy: "Personal cues are the bane of existence."
- Shane: "Ideally, no one would have their own personal cue. We should all be working out the same queue."
- Shane: "I can't go in in CRM and find out what's in Justin's queue and pull it."
- Tracy: "I'm just a pitch for getting rid of queues entirely and just relying on filters because things get lost."

**What's needed:** CaseIQ should have NO hidden personal pools. All cases are in a single shared pool, visible via filters and views. "My Active Cases" is a filter (assigned_to = me), not a separate container.

**Suggested phase:** Phase 4 (case pool architecture). This is already implicit in the Focus Profile design but should be explicitly called out as a design principle: **there is one case pool, and views are filters on that pool — never separate containers.**

---

### GAP W2-8: Preservation Data Auto-Import (Same Country)

**What's missing:** During triage, IPH checks for matching preservation cases. If found, they manually open Azure Storage Explorer, copy files from the preservation case's storage into the new case's "Do Not Disclose" folder. The RS then redacts and delivers.

**Key quote:** Jessalyn: "if the preservation is completed, they will import the data into the current request for the response specialist."

**Constraints:**
- Same-country only — cross-country copy risks data sovereignty violation
- Tracy: "I don't think we would want to copy between different countries because that could potentially move the data."
- Needs legal review before full automation
- Preservation extensions: just change dates on the original, no data import (Tracy: "We just have to change the dates on the original and off you go")
- Extensions can be 3-4 deep, so data can be older than 90 days

**Suggested phase:** Phase 5 (collection/delivery). Related to existing data package reuse concept but specifically about the preservation-to-production import path.

---

### GAP W2-9: Exchange Compliance Portal Auto-Copy

**What's missing:** When Exchange data is collected via the compliance portal, it lands in one Azure Storage container. The RS must manually open Azure Storage Explorer and copy it to the "first collection point" container.

**Key quote:** Shane: "The only other thing we copy is if we run exchange data in the compliance portal, when that data returns, we have to open up that storage container, then we open up first collection point storage container and we have to copy from one into another. If that could be automated, it'd be helpful."

**Suggested phase:** Phase 5 (collection pipeline automation).

---

### GAP W2-10: UTC Everywhere

**What's missing:** Timezone mismatches cause cases to appear "finished before opened." If a case is logged in PST but resolved by a GMT RS early in their morning, the resolve timestamp can predate the creation timestamp.

**Key quotes:**
- Shane: "the first resolve date is resolved based on the response specialist location."
- Tracy: "If it comes in and we log it in PST and the person is in GMT, it was finished before it was opened."
- **Resolution agreed in the workshop:** UTC across the board on everything.

**Suggested phase:** Phase 1 (data model foundation). Every `Date` field, every timestamp, every audit log entry must be UTC. Display can be localized per user preference, but storage and computation must be UTC.

---

### GAP W2-11: Task-Level Deadlines (Not Just Case-Level)

**What's missing:** For ETSI/programmatic cases, the deadline is on the individual task, not the case. Tasks within a case can have different deadlines, and those deadlines can be adjusted (e.g., issuing authority grounds for non-execution extends the task deadline).

**Key quote:** Faisal Younas: "There's a not at the case level. There's a deadline field on the tasks itself and those deadlines can be adjusted as well as part of the issuing authority grounds for non execution flow."

**Impact:** CHI scoring and auto-escalation currently operate at the case level. For eEvidence compliance, they need to also operate at the task level — a case might be CHI-4 overall but have one task that's CHI-1 because its specific deadline is imminent.

**Suggested phase:** Phase 2 (eEvidence SLA engine — already scoped in the pitch deck's eEvidence fast lane).

---

### GAP W2-12: Request Type Taxonomy Overhaul

**What's missing:** France, Germany, and UK send requests that are "technically emergencies but because they have a legal demand, we process them as an emergency, but we don't set it as an emergency." The current request type taxonomy doesn't handle this edge case cleanly.

**Key quote:** Tracy: "We need to have a conversation about request types because there's a lot of things that need to be updated with that."

**What's needed:** A dedicated session with Tracy to redesign the request type taxonomy. This affects CHI scoring (request type is a CHI input), regulatory reporting, and operational metrics.

**Suggested phase:** Separate workstream — Tracy flagged this as needing its own conversation before it can be scoped into a phase. Likely feeds into Phase 1 (data model) and Phase 2 (CHI inputs).

---

### GAP W2-13: Regulatory vs. Operational Metrics Separation

**What's missing:** Tracy's transparency/regulatory reporting requirements are "completely different in a lot of ways" from operational metrics. The current roadmap's Phase 6 (LENS Health Dashboard) and Phase 7 (Forecasting) are designed around operational metrics. Regulatory reporting (transparency reports, compliance exports, litigation research) needs its own design track.

**Key quotes:**
- Tracy: "I do all of my reporting out of views. I don't use the Power BI at all because that's tailored for OPS."
- Tracy: "If you want to have a separate one for regulatory and transparency reporting, just include me and Shane."
- Tracy: "If we're tracking it, I want to be able to pull a report on it."
- Tracy: exports can be "up to 100,000 lines"

**What's needed:**
- Regulatory reporting view distinct from operational dashboard
- Large export capability (100K+ rows)
- Date range queries across all cases received in a period
- First closure date as "response date" for regulatory calculations
- Intelligence agency vs. law enforcement breakdown
- Subpoena type granularity
- Case-to-litigation linking (from saved views shared with attorneys)

**Suggested phase:** Phase 6 (parallel track to LENS Health) or Phase 7 (analytics). Requires a dedicated session with Tracy + Shane to scope properly.

---

## 3. New Business Rules Discovered

### Due Date Defaults
See GAP W2-2 above. This is the single most impactful business rule for CHI scoring.

### UTC Requirement
See GAP W2-10 above. Agreed by all participants.

### Preservation Extension Window
- Tracy: "I'm only going to extend it if it was received in the last 90 days."
- Extensions can go 3-4 deep, so the underlying data can be older than 90 days.
- Extension is just a date change, no data import needed.

### "Worked By" Is a Custom Field
- Not out-of-the-box CRM. Updated when someone "picks" a case.
- When routing to a different queue, `Worked By` is cleared.
- `Assigned To` carries over from triage but is NOT used for metrics.

### Triage Completion Definition
- Shane: "I would count triage as complete at the moment it leaves the triage queue to the fulfillment queue." QC is still considered part of triage.

### Enterprise Escalation Criteria
- Jessalyn checks if enterprise cases meet escalation criteria for attorneys.
- If YES: keeps the case, escalates.
- If NO: releases back to pool. This creates a tracking gap — she did work but gets no credit (connects to GAP W2-1).

### Training Path Progression
- Shane: "We start them all on Sageus MSA, then we go to Skype, then Xbox, then OneDrive."
- New RS are trained on progressively more complex identifier types/services.
- Shane uses identifier type views to find appropriate training cases.
- **Implication for Phase 4:** Qualification proficiency levels (Trainee → Competent → Expert) should map to service/identifier type complexity, not just assignment groups.

---

## 4. CRM Terminology & Field Reference

| CRM Term | Meaning | CaseIQ Equivalent |
|----------|---------|-------------------|
| `Worked By` | Custom field — set when RS "picks" a case | `assigneeName` / `assignedTo` |
| `Assigned To` | CRM built-in — carries over from triage, NOT used for metrics | Legacy field, do not use for metrics |
| `Original Received Date` | Date LE submitted the request | `dateReceived` |
| `Requested Due Date` | When LE needs response (often blank outside US/Brazil) | `dateDue` (with auto-default per GAP W2-2) |
| `First Closure Date` | Used as "response date" for regulatory reporting | `dateCompleted` or `dateResolved` |
| `Entity Recognition Score` | Dead Gen AI feature — remove | Replaced by LDI (Phase 2) |
| `Release` | Unassign from yourself, return case to shared pool | Release action (exists in roadmap) |
| `Route` | Move case to a different fulfillment queue (correct action) | Route / transfer |
| `Assign` | Move case to personal queue (WRONG action — causes lost cases) | Should not exist in CaseIQ |
| `Queue Items` view | Primary working view — supports assign/release actions | Case list view (Phase 3) |
| `Service Requests` view | Queue-agnostic — shows all cases across all queues | "Browse All Cases" fallback |
| `First Collection Point` | Azure Storage container where collected data lands | Collection storage |
| `Do Not Disclose` folder | Where imported preservation data is placed before redaction | Restricted data folder |
| `NSU cases` | "No Such User" — identifier/account doesn't exist, can be closed quickly | Auto-detectable via account existence check (Phase 2 CHI input) |
| `Cropper tool` | Tool used to extract email content for redaction | Redaction tooling (Phase 5) |
| `V100 list` | External list of enterprise domains requiring special legal language | Enterprise domain registry (GAP W2-4) |

---

## 5. Follow-Up Sessions Identified

| Session | Participants | Purpose | Status |
|---------|-------------|---------|--------|
| **Power BI walkthrough** | Shane, Jessalyn, Claire, Lisa | Review current Power BI reports, identify what to replicate/replace in CaseIQ | Scheduled (Thursday same time) |
| **Regulatory/transparency reporting** | Tracy + Shane only | Scope regulatory reporting requirements separately from operational metrics | Needs scheduling |
| **Request types conversation** | Tracy + team | Redesign request type taxonomy (France/Germany/UK emergency edge cases, summons/subpoena split) | Tracy flagged, needs scheduling |
| **IP House queue usage** | Tracy recommended | Understand how IPH uses metrics for triage operations | Needs scheduling |

---

## 6. Key Quotes for Pitch Deck

| Speaker | Quote | Usable For |
|---------|-------|-----------|
| Tracy | "Personal cues are the bane of existence. Stuff will get stuck in there and you don't know it's there." | Slide 3 (Problem) |
| Shane | "If it's captured automatically in the system, users wouldn't have to do that and we would have access to that data that would allow for operational decisions." | Slide 4 (Human Cost) or Slide 6 (CHI) |
| Tracy | "I would love if when a request comes in, every single account on that request is automatically checked for any other legal demand." | Slide 10 (LDI) or duplicate detection |
| Shane | "Jessalyn might have completed 200 requests, but she's worked on 350 over that month." | Slide 4 (Human Cost) — invisible work |
| Tracy | "If we're tracking it, I want to be able to pull a report on it." | Slide 9 (LENS Health Dashboard) |
| Shane | "Ideally, no one would have their own personal cue. We should all be working out the same queue." | Slide 5 (Vision) — single shared pool |
| Tracy | "No, it does not [let LE set due dates] and it never will because otherwise they're just going to put, you know, now on everything." | Slide 6 (CHI) — system must auto-calculate |
| Claire | "the suspect would create an e-mail address and they'd send 20 threats out and then we'd get that in 20 times" | Slide 10 (LDI) or identifier search |
| Tracy | "I'm just a pitch for getting rid of queues entirely and just relying on filters because things get lost, they get moved, they're in the wrong spot." | Slide 5 (Vision) — validates CaseIQ's filter-based architecture |

---

## 7. Gap-to-Phase Mapping Summary

| Gap | Description | Priority | Suggested Phase |
|-----|-------------|----------|----------------|
| **W2-1** | Worked On vs Completed tracking | High | Phase 1 (audit log) |
| **W2-2** | Default due dates by jurisdiction | Critical | Phase 2 (CHI depends on it) |
| **W2-3** | Agency registry + type classification | High | Phase 1 (data) + Phase 2 (UI) |
| **W2-4** | Enterprise domain flags (V100 list) | Medium-High | Phase 4 (escalation rules) |
| **W2-5** | Bulk identifier cross-ref on intake | High | Phase 2 (triage) + Phase 7 |
| **W2-6** | Granular legal demand subtypes | Medium | Phase 1 (enum) + Phase 2 (form) |
| **W2-7** | Eliminate personal case pools | Critical | Phase 4 (design principle) |
| **W2-8** | Preservation data auto-import | Medium | Phase 5 (collection) |
| **W2-9** | Exchange compliance auto-copy | Medium | Phase 5 (collection) |
| **W2-10** | UTC everywhere | Critical | Phase 1 (foundation) |
| **W2-11** | Task-level deadlines | High | Phase 2 (eEvidence SLA) |
| **W2-12** | Request type taxonomy overhaul | High | Separate workstream → Phase 1-2 |
| **W2-13** | Regulatory vs operational metrics | Medium-High | Phase 6-7 (parallel track) |
