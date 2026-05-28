# DARS Case Operations & Workforce Intelligence
## Pitch Deck — Transforming Lawful Access Request Processing at Microsoft

---

### SLIDE 1: Title

**CaseIQ - LENS Case Operations & Workforce Intelligence**
Transforming how Microsoft responds to lawful access requests — faster, safer, smarter.

*Digital Access Request System — Next Generation*

---

### SLIDE 2: The Mission We Serve

Every day, law enforcement agencies around the world submit legal demands to Microsoft requesting user data to investigate crimes — child exploitation, terrorism, financial fraud, threats to life.

**Our response specialists are the people who ensure:**
- Legitimate legal demands are fulfilled accurately and on time
- User privacy is protected from invalid or overreaching requests
- Microsoft meets its legal obligations across 100+ jurisdictions
- Data reaches investigators before deadlines expire — and before people get hurt

**This work is urgent, high-stakes, and deeply human.**

When we respond in time, investigations move forward. When we don't, court deadlines pass, financial penalties accumulate, and in the worst cases, lives are at risk.

---

### SLIDE 3: The Problem — Today's Reality

> *"I don't even know what half the queue views are that we've got."*
> — Dale Ayers, Response Specialist

Our response specialists are working with a system that fights them at every step:

**For Response Specialists:**
- Manually filtering through hundreds of cases to find what to work on
- Embedding shorthand codes in case titles ("CE", "Fed", "+25", "PIP") because the system can't classify
- No way to tell at a glance: How urgent is this? How complex? What's blocking it?
- Searching for identifiers across cases is painfully slow — "two or three sentences into this click and still nothing has popped up"
- Releasing a case back to the queue? Only works from certain views

**For Managers:**
- Building weekly assignment slide decks by hand every Tuesday morning
- Manually counting cases per queue to figure out where the backlog is
- No visibility into whether they have enough qualified staff for next week
- When India bomb threats spike on a Wednesday, they scramble over Teams chat to re-shuffle

**For the Organization:**
- No audit trail that proves compliance in legal challenges
- Financial penalties when court deadlines are missed because cases sat in a queue too long
- Qualified specialists for Azure requests? Only 2 out of 20+ people. If one is on leave, single point of failure.
- Cases from 2024 still sitting in 2026 queues, polluting every metric

---

### SLIDE 4: The Human Cost

This isn't about software. It's about the people doing this work.

**Dale** has built his own custom CRM views because the defaults are useless. He spends time configuring his tool instead of responding to legal demands.

**David** takes small batches of cases because he's learned that priorities can change mid-day and he'll have to release everything and start over. The system punishes planning ahead.

**Shane** spends hours before every Tuesday meeting manually counting cases by country and type to figure out who should work on what. There's no system to tell him where the team is falling behind — until it's already a crisis.

**Every hour a response specialist spends fighting the tool is an hour they're not responding to a legal demand.**

---

### SLIDE 5: The Vision — DARS Next Generation

**One system. Every persona. Complete visibility.**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Triage Specialist    Response Specialist    Manager       │
│   "What needs          "What should I         "Where are    │
│    classification?"     work on next?"         we hurting?"  │
│         │                    │                     │         │
│         ▼                    ▼                     ▼         │
│   ┌──────────┐    ┌──────────────────┐   ┌──────────────┐  │
│   │ Structured│    │ Focus-Filtered   │   │ LENS Health │  │
│   │ Triage    │───▶│ Focus-Filtered   │◀──│ LENS Health  │  │
│   │ with CHI  │    │ Case View + CHI  │   │ Dashboard    │  │
│   │ with CHI  │    │ Scoring          │   │ + Forecasts  │  │
│   └──────────┘    └──────────────────┘   └──────────────┘  │
│         │                    │                     │         │
│         ▼                    ▼                     ▼         │
│   Cases classified     Cases completed      Capacity        │
│   consistently         on time              planned ahead   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### SLIDE 6: Case Health Index (CHI) — Every Case Scored Automatically

**The problem:** Priority is set manually. Two triage specialists might prioritize the same case differently. A routine case can silently age past its deadline because nobody noticed.

**The solution:** The Case Health Index (CHI) is a deterministic, 5-level score calculated automatically from case metadata — urgency, complexity, deadline risk, and resource requirements.

| CHI | Label | Meaning | Example |
|-----|-------|---------|---------|
| CHI-1 | Critical | Immediate legal/safety consequence | CE case, court deadline in 3 days, financial penalty imminent |
| CHI-2 | Urgent | At risk of SLA breach | Approaching deadline, penalty attached, reactivated |
| CHI-3 | Significant | High resource consumption | 25+ identifiers, 3+ services, Azure + enterprise |
| CHI-4 | Standard | Routine, within SLA | Standard subpoena, moderate complexity |
| CHI-5 | Healthy | Quick resolution | Single identifier, single service, routine |

**CHI is dynamic.** A CHI-4 case auto-escalates to CHI-2 as its deadline approaches, then to CHI-1 if a court deadline becomes imminent. No human action needed.

**Impact:** Same inputs always produce the same score. No more inconsistent prioritization. No more cases silently aging past deadlines.

---

### SLIDE 7: Case List Health — Instant Situational Awareness

**Any collection of cases has a health status.** Your active cases, a search result, a saved view, an assignment group — LENS tells you the temperature before you scan a single row.

```
┌──────────────────────────────────────────────────────────┐
│  US Federal — 47 cases                  Health: 🟠 WARNING │
│  CHI-1: 5  CHI-2: 8  CHI-3: 12  CHI-4: 18  CHI-5: 4     │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│  3 past due · 2 penalty at risk · 6 unassigned             │
└──────────────────────────────────────────────────────────┘
```

**Health flows upward through the system:**
- **Case Health** (CHI per case) → **List Health** (any view) → **LENS Health** (per assignment group) → **System Health** (operating mode)

Filter to "India + Emergency" — the health bar recalculates for just those cases. A manager's dashboard is the same calculation scoped per assignment group with thresholds and trends.

---

### SLIDE 8: Focus Profiles — The Right Work to the Right People

**The problem:** Every Tuesday, Shane builds a slide deck assigning priorities. RS manually navigate and filter CRM queues to find matching cases. When priorities change Wednesday, it's Teams chat and confusion.

**The solution:** Managers define Assignment Groups (e.g., "US Federal — CE", "Azure non-US"), qualify RS for each group, and publish Weekly Focus Profiles. When an RS opens DARS, they see exactly what they should work on, in priority order.

```
Dale's Focus This Week:
  ① Azure (non-US, non-preservation)  — 12 cases
  ② US Federal                        — 47 cases
  ③ Oldest in US JTQ                  — 203 cases
```

**Impact:**
- RS spends zero time configuring filters
- Manager publishes profiles once, adjusts mid-week with one click
- System enforces qualifications — only trained RS see Azure cases
- Dynamic caseload caps prevent overload, adjusted by case complexity

---

### SLIDE 9: LENS Health Dashboard — From Firefighting to Forecasting

**The problem:** Managers discover backlogs after they've already become crises. No visibility into whether they have enough qualified staff for next week. India volume spikes on Wednesday — scramble.

**The solution:** The LENS Health Dashboard shows every assignment group's health at a glance, with drill-down into demand, risk, and capacity metrics.

```
┌──────────────────────────────────────────────────────────┐
│  LENS HEALTH                       Week of Mar 24, 2026  │
│  Operating Mode: ELEVATED                                 │
│                                                           │
│  🔴 US Federal — CE    23 cases  +4.1/day  2/4 RS  ⚠ 3   │
│  🟠 Brazil Fin Penalty 17 cases  +2.3/day  1/3 RS  💰 17  │
│  🟡 Azure (non-US)    12 cases  +0.8/day  2/2 RS  ⚠ SPOF│
│  🟢 US State & Local   8 cases  -1.1/day  8/10 RS       │
└──────────────────────────────────────────────────────────┘
```

**Staffing forecasts** project 4 weeks ahead: "David is on leave week 14. US Federal capacity drops 22%. Backlog will grow to 106 cases. Assign 1 additional RS now to prevent crisis."

**Surge protocols** activate automatically when thresholds breach: Focus profiles override, caseload caps increase, low-priority work deferred.

---

### SLIDE 10: Legal Demand Intelligence — The Documents Tell the Story

**The problem:** Issuing authorities submit legal demands as scanned PDFs and images of physical court orders, warrants, and subpoenas. Triage specialists manually read every page and re-type every field into the case form — agency name, target identifiers, date ranges, deadlines, statutory citations. It's slow, error-prone, and delays the start of real work.

**The solution:** Legal Demand Intelligence (LDI) extracts structured entities from attached documents and auto-populates case fields — with human validation that improves accuracy over time.

```
┌──────────────────────────────────────────────────────────┐
│  EXTRACTION REVIEW                          Case LNS-4521 │
│                                                           │
│  ┌────────────────────┐  ┌──────────────────────────────┐│
│  │                    │  │ Extracted Fields:             ││
│  │  [PDF Document]    │  │                               ││
│  │                    │  │ Agency: FBI - Seattle    ✅ 96%││
│  │  UNITED STATES     │  │ Type: Search Warrant    ✅ 94%││
│  │  DISTRICT COURT    │  │ Deadline: Apr 15, 2026  ✅ 91%││
│  │  Western District  │  │ Identifiers:            ⚠️ 78%││
│  │  of Washington     │  │   user@outlook.com      ✅ 99%││
│  │                    │  │   +1-206-555-0142       ✅ 95%││
│  │  IN THE MATTER OF  │  │   xb0x_g4m3r_t4g       ⚠️ 72%││
│  │  Search Warrant    │  │ Penalty clause: Yes     ✅ 88%││
│  │  ...               │  │ NDO: Active             ✅ 92%││
│  │                    │  │                               ││
│  │                    │  │ ⚠️ Cross-validation:          ││
│  │                    │  │ Submitted type: "Subpoena"    ││
│  │                    │  │ Extracted type: "Search Warrant"│
│  │                    │  │ → Discrepancy flagged          ││
│  └────────────────────┘  └──────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

**Three layers of value:**

1. **Triage acceleration** — Fields pre-populated from the document. High-confidence extractions (>90%) are one-click accept. Triage specialists review, not re-type.

2. **Cross-validation** — System compares what the agency submitted in the portal vs. what the legal document actually says. Catches errors in both directions: "Agency said Subpoena but document cites search warrant statute."

3. **CHI signal** — Extraction confidence feeds Case Health Index. High extraction confidence = more data for accurate scoring. Low confidence = flag for deeper review. Missing document entirely = CHI marked "unverified."

**Over time:** Every accept/correct/reject from the triage specialist is a training signal. Extraction accuracy improves per jurisdiction, per document type, per agency format. Phase 7 tracks accuracy and predicts which document types need the most human review.

---

### SLIDE 11: The Full Case Lifecycle — End to End

DARS supports the complete journey of every legal demand:

```
Legal Demand Arrives
  ↓
TRIAGE — Classify, validate, score CHI, route
  ↓
FULFILLMENT — Configure what data to collect per identifier/service
  ↓
COLLECTION — Automated data pull, per-service pipeline tracking
  ↓
DELIVERY — Secure delivery to law enforcement, confirmation tracking
  ↓
CLOSURE — Retention policy, transparency reporting
```

**Plus lifecycle events at any point:**
- **Cancellation** — full case or specific identifiers, LE-initiated or internal
- **Internal review** — policy, escalation, quality, or compliance holds
- **Renewal** — preservation and intercept cases approaching expiry
- **LE modifications** — additional identifiers, date range changes, urgency updates
- **NDO tracking** — non-disclosure order lifecycle and expiry alerts

---

### SLIDE 12: What We Gain Over Current State

| Capability | Today (CRM) | DARS Next Gen |
|-----------|-------------|--------------|
| Case prioritization | Manual, inconsistent, freetext titles | CHI: deterministic, auto-escalating, complexity-aware |
| Case browsing | Card view, manual filters, slow | Compact table + card toggle, instant health bar, saved views |
| Finding cases | Paste LNS number, wait, pray | Multi-entity search: by case, identifier, contact, agency |
| Work assignment | Tuesday slide deck, Teams chat | Focus Profiles: published, qualified, auto-filtered |
| Operational visibility | Manually count cases per view | LENS Health Dashboard with CHI breakdown and trends |
| Staffing planning | Gut feel + spreadsheets | 4-week forecasts, "what if" simulation, cross-training recs |
| When overwhelmed | Scramble | Surge protocols: automatic behavioral changes at each severity |
| Cancellations | Full case only | Partial (per identifier), LE-initiated, reason-tracked |
| Renewals | Manual tracking | Auto-alert when preservation/intercept approaching expiry |
| Audit trail | Fragmented | Every action logged, chain of custody, compliance-ready |
| Font confusion | l vs I vs 1 = errors | Disambiguated monospace for identifier fields |

---

### SLIDE 13: What We Gain Over Kodex (Industry Standard)

DARS isn't just replacing CRM — it's building capabilities that exceed the commercial standard:

| DARS Advantage | Why It Matters |
|---------------|---------------|
| **Case Health Index (CHI)** | Deterministic multi-factor scoring. Kodex has basic priority flags. |
| **Complexity-adjusted capacity** | Plan by effort, not just case count. 20 simple cases ≠ 20 complex cases. |
| **Surge protocols** | System-wide behavioral changes when overwhelmed. Kodex has escalation, not mode shifts. |
| **Staffing forecasts** | "What if David goes on leave?" Kodex has reporting, not prediction. |
| **Weekly Focus Profiles** | Structured manager→RS assignment. More sophisticated than rules-based routing. |
| **Cross-training recommendations** | System identifies qualification gaps before they become crises. |
| **Case List Health** | Any view has a computed health status. Novel concept not in any commercial tool. |
| **Data package reuse** | Same identifier + date range across agencies = reuse, not re-pull. |
| **Legal Demand Intelligence** | AI extraction from scanned legal documents with human validation loop. Kodex stores documents but doesn't extract or cross-validate. |

---

### SLIDE 14: Implementation Roadmap — Full Program View

Seven phases, each complete only when the feature is **built, tested, compliant, and adopted.**

| Phase | Engineering Deliverable | Included in Phase Scope |
|-------|------------------------|--------------------------|
| **Pre-Phase** | Compliance & Legal Gate | Audit trail spec, data residency review (GDPR/MLAT for 100+ jurisdictions), encryption standard, LDI liability scope, transparency reporting format — all signed off before Phase 1 begins. Baseline metrics study commissioned. |
| **Phase 1** | Persona System & Data Foundation | Identity/auth integration (Entra ID), audit log schema validated with Legal, observability foundation (logging, alerting), baseline metrics study executed with RS + manager teams (US + GMT), CLASS v2 API access provisioned and integration contract established with CLASS team. **eEvidence:** Attorney persona added; EU PKI certificate provisioning and rotation strategy; eEvidence case type as a first-class data entity; SLA timestamp infrastructure (10-day / 8-hour clocks) built into event bus. |
| **Phase 2** | CHI Scoring + LDI Extraction | **CLASS v2 `/v2/accountidentifiers` integration** — account existence check called during triage; result feeds CHI scoring (unresolved identifiers flagged as unverified, affects complexity score). CHI accuracy UAT with triage specialists run in parallel with manual prioritization for minimum 2 weeks. LDI human validation loop reviewed by Legal for liability scope. Low-confidence extraction thresholds tuned with triage team feedback. **eEvidence:** ETSI XML intake parser for EPOC (Form 1) and EPOCPR (Form 2); eEvidence CHI scoring inputs (emergency flag → auto CHI-1, EA involvement, stop-clock state, SLA time remaining); SLA engine with stop-clock trigger logic; `/eevidence/production` and `/eevidence/preservation` intake endpoints. |
| **Phase 3** | Case List View & Search | CLASS v2 account existence results surfaced per identifier in case list view. RS user acceptance testing with US + GMT teams (minimum 3 RS per region). Training materials delivered before rollout. Saved view migration from current CRM custom views (Dale's views, etc.). **eEvidence:** Emergency badge (CHI-1 variant); EA involvement flag; SLA countdown display (10-day / 8-hour clock in case list row); attorney escalation indicator; stop-clock indicator; eEvidence case type filter in search and saved views. |
| **Phase 4** | Assignment Groups & Focus Profiles | Manager onboarding to Focus Profile publishing workflow (Shane, Jessalyn + GMT leads). RS qualification data migrated and validated from current records. Mid-week profile change protocol documented and tested. Caseload cap logic UAT'd against real assignment group sizes. |
| **Phase 5** | Collection, Delivery & Lifecycle Events | **Full CLASS v2 Collector API integration** — DARS triggers DCS jobs for: profile identifiers, enterprise org/user profile, auth logs, basic registration, credential history, consumer user location. Job state table (DCSJobId, CaseId, TaskId, status lifecycle) tracked and displayed in DARS. Partial success handling (PartiallySucceeded status) surfaced to RS. LE Portal integration tested end-to-end. Partial cancellation CHI recalculation logic UAT'd. Data package reuse criteria reviewed by Legal. NDO lifecycle alerts validated with compliance team. |
| **Phase 6** | LENS Health & Operational Monitoring | Operating Mode runbooks written and reviewed with managers before launch. Manager training on LENS Health and surge protocols. 15-minute snapshot performance load-tested against full assignment group volume. 90-day trend comparison report generated vs. Phase 1 baseline. |
| **Phase 7** | Forecasting + Intelligence + LDI Advanced | **CLASS v2 `/v2/consumeruserlocationssummary`** — 30-day login location summary surfaced in DARS for Attorney review (direct API, not Collector). HR system leave calendar integration live and validated. Forecast accuracy baseline established (Week 1–4 projections vs. actuals). Cross-training recommendation logic reviewed with managers. Full program retrospective vs. baseline metrics. Transparency reporting output reviewed by Legal. |
| **Post-Phase 7** | Full Cutover | Legacy CRM data migration executed and validated (2024–2026 cases). Parallel-run period (DARS + CRM simultaneously) with defined exit criteria. Old system retirement sign-off from Legal and Operations. |

**What "complete" means for every phase:**
- Feature built and passes integration tests
- UAT signed off by at least 2 RS or managers from the relevant persona group
- Training material delivered before rollout, not after
- No open compliance flags from Legal

**Each phase is independently valuable.** Phase 1 alone gives RS persona-aware case views. Phase 2 alone gives deterministic prioritization. They compound — but they don't require all-or-nothing delivery.

**Technical foundation — shared index, not a separate data pipeline:**

CaseIQ does not require a new operational database. Phase 1 establishes a read-optimized indexed copy of the case management database — the same investment that powers four distinct capabilities across the roadmap:

| Capability | How the index serves it | Phase |
|------------|------------------------|-------|
| Case search & discovery | Multi-field search over indexed case records | Phase 3 |
| CHI scoring | Structured case fields (age, identifiers, SLA state, service flags) extracted as scoring inputs | Phase 2 |
| Queue health aggregations | Roll-up queries over indexed case fields per assignment group | Phase 6 |
| Forecasting | Case event history in the index becomes the training signal for predictive models | Phase 7 |

The index is CaseIQ's data contract with the operational system. It defines exactly which fields are consumed — enforcing the signal-only model (LENS case number as key, no OII or EUII in the feature store). The operational database (LRMS/CRM) keeps writing cases; CaseIQ reads from the copy with zero read load on the production system.

**In the early phases before automated scoring is fully calibrated**, the index also captures behavioral signals — which cases specialists pick up first, how long cases sit before being worked, when managers intervene. These observed patterns seed the CHI model without requiring specialists to rate or tag cases manually. Automated scoring takes over progressively as confidence builds from real outcomes, and specialists validate by exception rather than by routine.

**eEvidence Fast Lane — parallel track gated on 18 August 2026:**

EU Regulation 2023/1543 (eEvidence) enforcement is a hard deadline. Capabilities from Phases 4–5 that are required for eEvidence MVP are parallel-tracked and do not wait for the full sequential roadmap:

```
CaseIQ Foundation (Phases 1–3)       eEvidence Fast Lane
+ Attorney persona                    NotificationObject + WISP/DIS delivery
+ EU PKI + SLA infrastructure         Correspondence inbox + formal notices
+ ETSI XML intake parser              Grounds for Refusal attorney workflow
+ eEvidence CHI inputs                Subsequent Production (Form 5)
+ SLA engine + stop-clock            Preservation Extension (Form 6)
+ eEvidence badges + list view        End Preservation notice handling
         │                                      │
         └──────────────────────────────────────┘
                          ↓
              18 August 2026 — eEvidence MVP live
```

---

### SLIDE 14A: Pre-Engineering Gate — Compliance & Legal Alignment

**Before Phase 1 engineering begins, we will complete a structured compliance review.**

DARS handles the most sensitive data requests Microsoft receives — legal demands spanning 100+ jurisdictions, subject to the Stored Communications Act, MLAT treaties, GDPR, and local data localization laws. Building first and reviewing later is not an option.

**Gate criteria (target: weeks 1–4):**

| Review Area | Owner | Deliverable |
|-------------|-------|-------------|
| Audit trail specification | Legal + Engineering | What events must be logged, retained, and exportable for legal challenges |
| International data residency | DPO + Compliance | Which case data can be stored where; EU/Brazil/India localization requirements |
| Transparency reporting requirements | Legal | Format, frequency, and recipient of required disclosures |
| Data classification & encryption standard | CISO | At-rest and in-transit encryption requirements for case data and attachments |
| LDI liability scope | Legal | Liability framework if AI extraction produces an incorrect field value |
| EU Regulation 2023/1543 compliance | Legal + CELA | Confirm ETSI TS 104 144 v1.1.1 implementation meets regulatory requirements by 18 Aug 2026 |
| EU PKI certificate chain | Security + Engineering | Certificate provisioning, rotation strategy, and trust chain separation from RED |
| eEvidence stop-clock rule matrix | Legal + Engineering | Exact triggers and conditions for SLA pause under grounds for refusal |

**Gate exit criteria:** Legal and Compliance sign off in writing before Phase 1 kickoff. Engineering does not begin until this gate clears.

**Why this matters:** Phase 1 establishes the audit log schema and event bus. If compliance requirements change after Phase 1 ships, retroactive fixes are expensive and may require re-migration of case history. Getting this right at the start is the lowest-cost path.

**CaseIQ data classification posture:**

CaseIQ stores signals, not identities. Response specialists see case details — identifiers, services, account signals — in the DARS UI as part of processing legal demands. What the system itself stores and reasons over is a different matter: calculated case features (CHI score, complexity indicators, service presence, volume category, VIP match signal) keyed exclusively to the LENS case number. No OII or EUII is persisted in the CaseIQ data store. Those values remain within the restricted boundaries of CLASS v2 and LENS Storage, which are independently reviewed under their own compliance frameworks.

The compliance review for CaseIQ therefore focuses on three things:
- **Certifying the signal boundary** — no OII or EUII escapes into the CaseIQ feature store
- **Confirming volume signals are coarse enough** to prevent re-identification from stored features alone
- **Specifying audit log content** — what is permissible to log without reintroducing restricted data through the back door

---

### SLIDE 14B: Key External Dependency — CLASS v2 API

**DARS depends on CLASS v2 (Check Account Results Service) for identifier resolution and data collection at multiple phases of the roadmap.**

CLASS v2 is a shared internal API that resolves law enforcement identifiers (email addresses, phone numbers, PUIDs, tenant IDs, and more) against Microsoft account systems and retrieves profile, authentication, and registration data on behalf of DARS and LRMS.

**How CLASS v2 integrates with DARS across phases:**

| Phase | CLASS v2 Touchpoint | Integration Pattern |
|-------|-------------------|---------------------|
| Phase 2 | `/v2/accountidentifiers` — account existence check during triage | Direct API — result feeds CHI scoring |
| Phase 3 | Account existence result displayed per identifier in case list | UI display of Phase 2 data |
| Phase 5 | Full Collector API — auth logs, profile, basic registration, credential history, consumer location | DCS → CLASS v2 Collector → LENS Storage |
| Phase 7 | `/v2/consumeruserlocationssummary` — 30-day location summary for Attorney review | Direct API |

**Identifier types supported:** Email (SMTP), Skype number, Skype ID, phone number, PUID, tenant ID, and domain — covering all 7 types submitted by law enforcement.

**Dependency risk — CLASS v2 roadmap alignment:**

CLASS v2 is currently at **v1.1.0 (Draft, as of January 2026)**. Versions 2.2–2.4, which add Azure profile lookup, Xbox, and push token support, are still marked TBD. Azure cases are already identified as a specialist skill gap in DARS (Slide 3: only 2 of 20+ RS are qualified). If CLASS v2 Azure support (v2.2) is delayed, Phase 5 collection for Azure cases will remain partially manual.

**Action required:** Coordinate with the CLASS team to align CLASS v2.2 delivery with DARS Phase 5 scope. Track CLASS roadmap milestones as a dependency in the DARS program plan.

**eEvidence dependency note:** CLASS v2 identifier resolution is also required for eEvidence MVP — ETSI-compliant identifiers (email, phone, PUID, tenantId) submitted via EPOC/EPOCPR forms must be validated against Microsoft account systems during triage. The depth of CLASS integration for eEvidence MVP is an open decision that must be resolved before Phase 2 engineering begins. CLASS vNext alignment spec is a Project Diya Phase 1 deliverable and is a prerequisite for this integration.

---

### SLIDE 15: The Impact — By the Numbers

| Metric | Current | Projected | How |
|--------|---------|-----------|-----|
| Time to find a case | Minutes (manual filter/search) | Seconds (unified search, focus-filtered view) | Phase 3 + 4 |
| Time to assess priority | Manual judgment per case | Instant (CHI auto-calculated) | Phase 2 |
| Tuesday planning overhead | Hours (manual case counting) | Minutes (LENS Health Dashboard + forecast) | Phase 6 + 7 |
| SLA breach detection | Reactive (discovered after breach) | Proactive (auto-escalation days before) | Phase 2 |
| Capacity gap detection | After backlog forms | 2-4 weeks advance warning | Phase 7 |
| Re-navigation after priority change | 15+ minutes re-filtering | Instant (Focus Profile update) | Phase 4 |
| Document processing | Read PDF, re-type every field manually | LDI extracts entities, auto-populates, human validates | Phase 2 |
| Cross-validation | Trust what LE typed | Compare submitted vs. extracted, flag discrepancies | Phase 2 |
| Audit compliance | Fragmented, incomplete | Complete chain of custody from day one | Phase 1 |

---

### SLIDE 15B: Measuring Success — Baseline & Tracking Plan

**We cannot claim "minutes → seconds" without first measuring minutes.**

Before DARS ships, we will conduct a structured baseline study to capture current-state performance. Every projected improvement in Slide 15 will be tied to a measured before-state and a defined measurement method.

**Baseline study scope (target: weeks 1–6, runs in parallel with compliance gate):**

| Metric | How We'll Measure | Who |
|--------|-------------------|-----|
| Time to find a case | Observed task timing with 5–8 RS across US + GMT teams | UX Research + RS team |
| Time to assess case priority | Timed observation: how long does manual prioritization take per case? | UX Research |
| Tuesday planning overhead | Shane + 1 other manager time-box the next 3 weekly planning sessions | Managers |
| Current SLA breach rate | Pull 90-day case completion data vs. deadline from CRM | Data Engineering |
| Current penalty exposure | Count of penalty-attached cases breached in last 12 months | Legal + Operations |
| RS workload distribution variance | Case assignments per RS per week over 8 weeks | Operations |
| Dormant case volume | Cases > 90 days without activity, by assignment group | Data Engineering |

**Post-launch tracking:**
- Metrics above re-measured at 30, 60, and 90 days post each phase launch
- Dashboard owner assigned per metric
- Quarterly review with response specialist team leads to assess trajectory

**Definition of success at program completion:**
- SLA breach rate reduced by ≥ 40% vs. baseline
- Tuesday planning time reduced by ≥ 60%
- RS time-to-case < 30 seconds (vs. measured baseline)
- Zero cases miss deadline due to system routing failures

---

### SLIDE 16: The Ask

**We are building the system our people deserve.**

They process the most sensitive data requests Microsoft receives. They work under legal deadlines with financial penalties. They handle child exploitation cases that require immediate action.

They shouldn't also have to fight their tools.

**What we need:**
- Engineering investment across 7 phases
- A dedicated **eEvidence Fast Lane** team staffed independently of the main CaseIQ phase track — gated on the immovable 18 August 2026 EU enforcement deadline
- Partnership with the response specialist and attorney teams (GMT + US) for ongoing feedback
- Alignment with compliance and legal on audit trail, retention, EU Regulation 2023/1543, and EU PKI requirements — resolved before Phase 1 begins
- Coordination with the LE portal team on intake integration and WISP/DIS delivery alignment
- Coordination with the CLASS team to align CLASS vNext spec delivery with Phase 2 eEvidence identifier resolution requirements

**What we deliver:**
- Faster, more consistent responses to lawful access requests
- Proactive capacity management instead of reactive firefighting
- Complete audit trail for legal defensibility
- A system that exceeds the commercial standard — built specifically for how Microsoft operates

---

### SLIDE 17: Close

> *"The ability to just say, right, AI, I want to be able to see what requests are in this queue, how many identifiers are in each of them, what types of identifiers they are, and when they need to be done by — that would be brilliant."*
> — Dale Ayers, Response Specialist

**DARS Case Operations & Workforce Intelligence**
Making lawful access response faster, safer, and smarter.
