# eEvidence MVP — Product Manager Specification

> **Source:** SharePoint — `DARS Phase 2 - eEvidence MVP Spec v1.docx`
> **Retrieved via:** WorkIQ (M365 Copilot) on 2026-05-07
> **SharePoint URL:** https://microsoft.sharepoint.com/:w:/t/LENSEngineeringEC/cQrpcAYRtoN6R5rVPmoezwcQEgUCS8IwXXGoMT3bQsedPJJwtQ
>
> This file is the verbatim grounding source for feature work in `c:\R\DARS_eEvidence`.
> Do not invent content beyond what appears here. If a section is incomplete, note it
> and re-fetch from the SharePoint source.

---

## Document Metadata

| Field | Value |
|---|---|
| Document Type | Product Manager Specification |
| Version | 1.0 (draft) |
| Date | 2026-03-20 |
| Regulation | EU Regulation 2023/1543 — European Production Order and European Preservation Order |
| Standard Reference | https://www.etsi.org/deliver/etsi_ts/104100_104199/104144/01.02.01_60/ts_104144v010201p.pdf |
| Project | Project Diya — Phase 2: e-Evidence |
| Enforcement Date | **18 August 2026** |

L1: All API specifications referenced in this document are defined in ETSI TS 104 144 V1.2.1, which must be read alongside this document. This specification describes how ETSI TS 104 144 V1.2.1 is used to support the operational processes of LENS, considering the regulatory and operational requirements of Regulation (EU) 2023/1543 and what DARS must deliver as a product to enable the LENS operations team to handle EPOCs end-to-end.

L2: **Table of Contents**

L3: **Main Body**
- Regulatory Context
- Actors and Roles
- MVP Scope
- Explicit Non-MVP Exclusions
- MVP Features
- Assumptions, Dependencies, and Open Questions

L4: **Appendices**
- Appendix A: API Endpoint Specifications (Complete)
- Appendix B: Notification Object Technical Specifications
- Appendix C: Attorney Escalation and Enterprise Review Form
- Appendix D: Reference Implementation Delta Table
- Appendix F: Workflow Summaries
- Appendix E: EU Regulation 2023/1543 — Referenced Articles (Full Text)

---

## 1. Regulatory Context

L5: On **18 August 2026**, EU Regulation 2023/1543 comes into force. EU law enforcement authorities in any of the 27 member states can send legally binding production or preservation orders to Microsoft. Microsoft must respond within **10 days** (standard) or **8 hours** (emergency threat to life). Non-compliance carries fines of up to **2% of Microsoft's total worldwide annual turnover**.

L6: This document assumes that a standardized technical channel defined by **ETSI TS 104 144 V1.2.1** must be used. Microsoft connects to the EU's Distributed IT System (DIS) via the **Web-based Interface for Service Providers (WISP)**. All EPOCs, notifications, and responses are exchanged through this channel, however, there must continue to be support for tracking and managing external communications.

### 1.1 Microsoft's Obligations

| Obligation |
|---|
| Receive and respond to European Production Order Certificates (EPOCs) within 10 days / 8 hours |
| Act on European Preservation Order Certificates (EPOC-PRs) preserve data for ≥60 days |
| Submit Form 3 (Non-Execution) when unable to comply, with structured reason codes and escalate to LENS Policy as appropriate. |
| Enforce the Enforcing Authority 10-day review window — do not release data until window closes or EA decides |
| Deliver data to the Issuing Authority via push model through WISP with the exception of >25mb data deliveries where a potential pull model may be used. |
| Maintain confidentiality — do not contact or notify the data subject |
| Maintain immutable audit records of all interactions per case |

L7: _For full article text, see Appendix E._

### 1.2 How the Existing System Supports e-Evidence and What Additional Functionality is Required

L8: Microsoft's current lawful disclosure system (LENS-API + DARS) provides a strong operational foundation for the e-Evidence program. The UK COPO program under ETSI TS 103 120 has already established core capabilities that carry over directly: structured legal demand intake, case management and triage, data collection and specialist workflows, partial publishing, SLA tracking, and audit logging. DARS's case queue, case assignment model, and operations workflow are all reused without replacement.

L9: However, EU Regulation 2023/1543 introduces requirements that go beyond the current system's scope and must be added as net-new functionality:

| Existing Capability (Accrues to e-Evidence) | Additional Functionality Required |
|---|---|
| Programmatic intake (103120) | 3-party routing via WISP/DIS intermediary. No direct IA/EA connection (104144) |
| SLA tracking and specialist assignment | 10-day Enforcing Authority review window with programmatic hold/release |
| Data Delivery | Push-based data delivery to IA (replaces authority-initiated pull) with a potential push based out of band delivery for > 25 mb. |
| Partial publish capability | Formal Grounds for Refusal handling with delivery blocks |
| Case correspondence (informal) | Formal bi-directional correspondence via WISP protocol |
| Workflow rejection logic | Formal Form 3 Non-Execution with structured reason codes and IA 5-day response cycle |
| EPOC-PR preservation case type but no preservation flow | Preservation workflow with linked EPOC-PR → Form 5 → Form 6 production lifecycle |
| Immutable audit thread | Additional logging of eEvidence events and actions |
| Case assignments | Enterprise classification with attorney escalation case assignment gate and enterprise escalation process |

#### New Technical Interface: ETSI TS 104 144 V1.2.1 Workflow Endpoints

L10: The existing system (LENS-API + DARS under ETSI TS 103 120) has no equivalent to the WISP/DIS routing intermediary and no endpoints conforming to ETSI TS 104 144. All 17 endpoints listed below are net-new and must be implemented as part of eEvidence. This is the most significant technical delta between UK COPO and eEvidence at the API layer.

L11: **Inbound Endpoints (WISP → SP) — Hosted by Microsoft; 10 new endpoints** _(ETSI TS 104 144 V1.2.1, Table 5.1-1, p. 13)_

| # | Path | Form / Function | Equivalent in TS 103 120 |
|---|---|---|---|
| 1 | POST /eevidence/production | EPOC Form 1 — production order intake | Closest: bilateral HI-1 intake — **different standard, different routing** |
| 2 | POST /eevidence/preservation | EPOC-PR Form 2 — preservation order intake | Not in UK COPO production path — **net-new case type** |
| 3 | POST /eevidence/groundsforrefusal | EA Grounds for Refusal decision (DocumentObject with GFR EPOCDocumentType) | No EA party exists in UK COPO |
| 4 | POST /eevidence/subsequentproduction | Form 5 — subsequent production request on an active EPOC-PR | Not supported — **net-new** |
| 5 | POST /eevidence/preservationextension | Form 6 — preservation extension beyond initial 60-day window | Not supported — **net-new** |
| 6 | POST /eevidence/endpreservation | IA instruction to end an active preservation | Not supported — **net-new** |
| 7 | POST /eevidence/newdeadline | IA-issued revised SLA deadline (e.g. extension granted) | Not supported — **net-new** |
| 8 | POST /eevidence/withdraw | IA instruction to withdraw an EPOC before execution | Not supported — **net-new** |
| 9 | POST /eevidence/deliverystatus | IA delivery acknowledgement (Received or Error) after SP push | No equivalent — pull model has no ack loop — **net-new** |
| 10 | POST /eevidence/correspondence | Formal inbound correspondence from IA or EA (DocumentObject) | Offline only (email/phone) — **net-new formal channel** |

L12: **Outbound Endpoints (SP → WISP) — Called by Microsoft; 7 new endpoints** _(ETSI TS 104 144 V1.2.1, Table 6.1-1, p. 32)_

| # | Path | Function | Equivalent in TS 103 120 |
|---|---|---|---|
| 11 | POST /eevidence/outcome | Push data delivery to IA (replaces pull model) | TS 103 707 pull URL |
| 12 | POST /eevidence/nonexecution | Form 3 Non-Execution submission with NotificationObject + Form3Information | Informal offline — **net-new formal construct** |
| 13 | POST /eevidence/datapreserved | Preservation confirmation to IA (NotificationObject) | Not present — **net-new** |
| 14 | POST /eevidence/confirmwithdrawal | Withdrawal confirmation to IA (NotificationObject) | Not present — **net-new** |
| 15 | POST /eevidence/correspondence | Outbound formal correspondence to IA or EA (DocumentObject) | Offline only — **net-new formal channel** |
| 16 | POST /eevidence/enforcingauthorityId | EA identifier lookup — SP sends empty HI-1; WISP returns EA identifier in header | Not present — **net-new** |
| 17 | POST /eevidence/authorities | DIS Court Database query (LIST/GET AuthorityObjects) — **new in V1.2.1 CR007** | Not present — **net-new** |

L13: **Full endpoint request/response specifications are in Appendix A.**

---

## 2. Actors and Roles

### 2.1 Party Overview

| Party | Who They Are | Role in e-Evidence |
|---|---|---|
| **Issuing Authority (IA)** | EU law enforcement / judicial authority in an EU member state | Issues EPOC or EPOC-PR; receives data; decides on Form 3 responses |
| **Enforcing Authority (EA)** | National authority in Microsoft's member state (Ireland) | Reviews international EPOCs; 10-day window to raise Grounds for Refusal; does not receive data |
| **WISP / DIS (Judex/e-CODEX)** | EU decentralized IT system; accessed via Web-based Interface for Service Providers | Routes all EPOCs, notifications, and responses between parties; never communicate directly with IA/EA outside WISP (with the exception of >25mb delivery) |
| **Service Provider (SP)** | Microsoft | Receives EPOCs, collects data, enforces EA hold, delivers via push, submits Form 3, maintains audit |
| **Response Specialist (LERS)** | Microsoft operations staff | Manages cases in DARS; primary operations user |
| **Attorney (LENS Attorney)** | Microsoft internal legal | Reviews enterprise cases and legally complex scenarios; approves/escalates in DARS |
| **Central Authority** | Member State compliance agency | Mediates between IA and EA; Microsoft does not interact directly |

### 2.2 National vs. International Cases

L14: **National case (No Notification)**: IA and Microsoft in the same EU member state. No EA involvement. Microsoft can proceed immediately after EPOC receipt.

L15: **International case (Notification)**: IA in a different member state from Microsoft's establishment (Ireland). EA is **notified** simultaneously. Microsoft must wait up to 10 days before releasing data.

---

<!-- SECTIONS BELOW PENDING — to be filled by subsequent WorkIQ fetches -->

## 3. MVP Scope

L16: The e-Evidence MVP is the **minimum complete implementation** required for legal compliance on 18 August 2026. All items below are required for go-live; however, LENS Operations and LENS Policy will continue to review and prioritize them to distinguish go-live needs from post–go-live enhancements.

### 3.0 High-Level MVP Scope Overview

L17: The following areas are in scope for the e-Evidence MVP.

L18: **Intake**
- Programmatic intake via ETSI TS 104 144 V1.2.1 for all e-Evidence order types:
- Production (Form 1),
- Preservation (Form 2),
- Subsequent Production (Form 5),
- Preservation Extension (Form 6),

L19: **Case Management and Workflows**
- SLA tracking: statutory deadlines (10-day standard / 8-hour emergency), stop-clock signals for GFR and non-execution holds, live SLA countdown visible in Case Queue
- Grounds for Refusal workflow: GFR endpoint handling, DARS badge application, correspondence with IA/EA
- EA review window enforcement: 10-day programmatic hold using case badges (`EA REVIEW WINDOW`, `GFR HOLD`, `PARTIAL GFR`); `Specialist must manually proceed` after expiry (auto-publish on Day-10 expiry is a **stretch goal** — see Section 3.8

  > **Comment thread:**
  > - Blake Bratt (CELA), 2026-04-01: clmulvey@microsoft.com, I would like your recommendation on this. Does the accountability stay with the RS that worked the case, or are there other options (IPH sweeps cases at the end of day, etc.)
  > - Claire Mulvey (CELA), 2026-04-03: I don't think the accountability needs to stay with the RS if they have completed everything from their side and a sweep at the end of each day by IPH could be a great option.
  > - Ian Doyle (CELA), 2026-04-08: Agreed. I think, like India and federal, we will need to watch these like a hawk until the process and operational practice is clear and in run-state.
  >
  > - Mark Wilkins (CELA), 2026-04-01: I think this needs to be MVP or agreed on ASAP as it will have staffing implications - LERS working to close cases where 10+1 falls outside of office hours or weekends.

- Non-Execution (Form 3): structured reason codes, mandatory QES/AES digital signature on Form 3 PDF before WISP submission, IA 5-day response window, close on Day 5+1 if no IA response with a `retention of 45 days after case closure.`

  > **Comment:** Faisal Younas, 2026-03-27: Confirm with Jamie and Jason

- Support task-level deadlines: Specialists can and view deadlines on Data Fulfillment Tasks, and Non-Execution events can update those deadlines programmatically to recalculate the SLA timer.
- Ability to set deadlines on a Data Fulfillment Task and update deadlines + adjust SLA if a new deadline is received programtically as a result of Non-Execution.
- Formal correspondence channel: bi-directional IA/EA/SP messaging via WISP with in-app Correspondence management per case
- _Ensure correspondences remain open even after case has been closed. (Support process)_
- Emergency request handling: EightHours priority, immediate broadcast to DARS users, targeted on-call alert, top-of-queue sort
- EPOC Priority support: `TenDaysASAP`, `TenDaysSubjectToEA`, `EightHours`
- New DocumentType handling. 17 new document types.
- Nested documents (e.g., documents attached to correspondences, or correspondences linked to other correspondences) are under discussion and may need to be supported. (April 2nd, 2026 – TCLI-EC coordination for TS 104144)
- _Discuss nested documents (Documents linked to correspondences or corespondences linked to other correspondences). Raised April 2nd 2026 – TCLI-EC coordination for TS 104 144)_
- Attorney escalation via case assignment for enterprise cases and Form 3 based on reason codes; existing Case Queue used.
- `Ability to handle bidirectional escalations. Any role can escalate.`
- `Push notifications to alert attorneys and specialists as attorney review process flows complete gates checks`
- `SLA monitoring against Attorney tasks`
- Withdrawal confirmation: mandatory manual Specialist confirmation before `confirmwithdrawal` is sent; auto-cancels all tasks belonging to the EPOC on confirmation.
- Ensuring the system can handle cancellation of tasks that can be in either one of the workflow stages - Triage, Fulfillment or Publish/Delivery
- Auto-cancel task and data-entry guards: when an EPOC is canceled (`WithdrawalConfirmed`), no new tasks may be added; when a task is individually canceled, no new data categories may be added to that task
- Queue management: filter/sort by status, priority, and badges; single and multi-select assignment
- End to End preservation workflow

  > **Comment:** Faisal Younas, 2026-04-09: Need to discuss how Preservation request, given tight SLAs will be prioritized.

- Ability to support end preservation
- Ability to support preservation extensions
- Ability to support linking of Form 5
- Ability to link subsequent production cases

L20: **Publish and Delivery**
- Push-based delivery for payloads ≤25MB via `POST /eevidence/outcome`
- Large payload delivery (>25MB): in scope; secure delivery mechanism outside the DITS is an active open item (see Section 10.3, Open Question #4
- New Ask: Cancel delivery action button within DARS.
- What happens if something has been delivered programmatically, how do we cancel / revert that?
- Push, may not be instantanios. There may be an ability to cancel something mid delivery. (Time window maybe minutes not days here)
- Perhaps send them a signal/correspondence? (Further policy discussion needed)
- Delivery acknowledgement tracked at the task/DeliveryObject level (not case state); per-task status: `Complete`, `Acknowledged`, `Failed`; Specialists can re-deliver individual failed tasks

  > **Comment:** Faisal Younas, 2026-04-01: Requires further discussion. Support (Ops) process may need to be considered. Further engineering/ops alignment required.

- `Fatal error auto-ICM: when a fatal system error is detected (e.g., repeated WISP unreachable, certificate failure, unrecoverable data collection error), DARS automatically raises an ICM incident with relevant case context`

  > **Comment thread:**
  > - Faisal Younas, 2026-03-30: Discuss further with Jamie and Jason. This needs to align with our broader architectural vision of handling fatal errors.
  > - Blake Bratt (CELA), 2026-04-01: clmulvey@microsoft.com, mawilk@microsoft.com, this needs to be added to a Support section. RS (Tier 1) will need to be notified for LE engagement, and if automatic flagging to Engineering is not available, we need to be able to raise to Tier 2 (Engineering). What is that process, how are we tracking the tickets, etc?

- Preservation confirmation via `POST /eevidence/datapreserved`

L21: **Notifications**
- DARS constructs and submits all three NotificationObject types: `NonExecution`, `DataPreserved`, `ConfirmationOfWithdrawal`
- Form3Information structured object submitted alongside digitally signed Form 3

L22: **Audit and Compliance**
- Immutable per-case audit trail: every WISP message, DARS action, correspondence, and NotificationObject logged with UTC timestamp, actor, event details; `7-year retention`

  > **Comment:** Faisal Younas, 2026-03-27: Confirm this retention period.

- `45-day post-close data retention across three scenarios; Day 46: storage cleanup`

  > **Comment:** Faisal Younas, 2026-03-27: This should most likely follow our current clean up / retention periods rather than 46 days.

- `Ability to search for any field and produce reports as needed (simple xls export for MVP)`

L23: **Reporting**

  > **Comment thread:**
  > - Tracy Ingle (CELA), 2026-04-20: I see Reporting here in MVP Scope but nothing yet in the MVP features section. I'd like to ensure that I can build it out fully. Please let me know where/if I should add. faisalyounas@microsoft.com
  > - Faisal Younas, 2026-04-21: tracyi@microsoft.com I wanted to make sure the ask was accounted for but do not have the requirements fully defined yet to have a detailed section for it under features. Let's add it as section 5.19 under MVP Features.

- Basic reporting: By original received date, total cases received and identifiers included within a date range, breakdown by submitting authority (Country), breakdown by request type (EPOC, EPOC PR, EPOC Emergency), SLA comparison (due date vs. actual), breakdown by resolution outcome, breakdown by enterprise and consumer (or the ability to separate them)

### 3.1 MVP Goals

| # | Goal |
|---|---|
| 1 | Receive, validate, and process EPOCs (Form 1) and EPOC-PRs (Form 2) through WISP |
| 2 | Enforce 10-day SLA (standard) and 8-hour SLA (emergency) — clock from EPOC timestamp |
| 3 | Enforce 10-day EA review window — block data release during hold |
| 4 | Collect and push data to IA via `POST /eevidence/outcome` only for data under 25mb. |
|   | Delvery of data over 25 Mb |
| 5 | Handle all EA GFR decision branches: full block, partial, clearance, Day-10 expiry — hold lapses on Day 10 (2); DARS notifies Specialist; manual proceed required in MVP (auto-proceed on expiry is a stretch goal) |
| 6 | Submit Form 3 Non-Execution with structured reason codes and Form3Information |
| 7 | Confirm preservation (EPOC-PR) and handle Form 5 (subsequent production) and Form 6 (extension) |
| 8 | Exchange formal bi-directional correspondence with IA and EA through WISP |
| 9 | Confirm EPOC withdrawals and enforce 45-day post-close data retention |
| 10 | Immutable per-case audit trail of every WISP message, DARS action, and NotificationObject |
| 11 | Complete operations UI for Response Specialists and Attorneys |
| 12 | Informal communications within the system to be able to redirect for Enterprise Cases (requires discussion with Policy and Ops) |

### 3.2 In-Scope Workflows

L24: All 8 workflows are required for MVP.

> _NOTE: Subsection body content for 3.2 was not returned by the source fetch beyond this single line. Re-verify against SharePoint source if more detail is expected._

### 3.3 In-Scope Endpoints (Summary)

L25: **Full endpoint specifications with payload details are in Appendix A.**

> _NOTE: Subsection body content for 3.3 was not returned by the source fetch beyond this line. Re-verify against SharePoint source if more detail is expected._

### 3.4 Case Indicators

L29: Existing DARS workflow states are used throughout. No new substates are introduced. Additional case conditions (GFR hold, EA review window, attorney review required, court escalation, enforcement proceedings) are surfaced as **badges or indicators** on the case in DARS.

### 3.5 System Components

> _NOTE: Subsection body content for 3.5 was not returned by the source fetch. Re-verify against SharePoint source._

### 3.6 In-Scope Data Categories

> _NOTE: Subsection body content for 3.6 was not returned by the source fetch. Re-verify against SharePoint source._

### 3.7 Compliance and Security Requirements

> _NOTE: Subsection body content for 3.7 was not returned by the source fetch. Re-verify against SharePoint source._

### 3.8 Stretch Goals

L31: The following items are explicitly captured as stretch goals in the **Project Diya — DARS Phased Approach, Phase 2**. They are desirable but not required for MVP go-live on 18 August 2026:

> _NOTE: Stretch goal list body was not returned by the source fetch beyond this introductory line. Re-verify against SharePoint source._

---

## 4. Explicit Non-MVP Exclusions

| Exclusion | Rationale |
|---|---|
| **Production Letters (non-programmatic)** | Workshop decision: required only if non-programmatic contingency is activated |
| **Automated content redaction** | Out of scope for Phase 1 (UK COPO) and Phase 2 (eEvidence) |
| **Dynamic EPOC form rendering** | WISP not expected to support dynamic forms at MVP |
| **NDO extensions** | User notice handled by IA/EA, not Microsoft |
| **Automated legal approval workflow** | Manual specialist actions only |
| **Country-contact workflow** | No Country Contact involvement |
| **Lawful Interception for e-Evidence** | TS 104 144 does not extend LI; |
| **Intelligent priority scoring** | Priority based on `EPOCPriority` values only |
| **Reporting dashboards** | While report generation will be supported, Phase 2 will not include any built in report dashboards within DARS |
| **Workload Integration** | Integration of any new workloads are out of scope. Existing manual processes for data collection will continue to remain. Phase 2 – eEvidence will ensure parity for all automated services that exist today in CRM, Cpliance Portal and OneDrive Tool. |

L32: **Note — large-payload delivery (>25MB)**: URL-based delivery for payloads exceeding 25MB is technically supported by ETSI TS 104 144 V1.2.1, Clause 6.3.3, and is in scope for the DARS Phased Approach Phase 2. It is **not excluded from scope** — it is an active engineering open item. The challenge is determining how to deliver large payloads securely outside the decentralized IT system. See Section 10.3, Open Question #4.

## 5. MVP Features

### 5.1 Outbound Notification Object Submission

L33: _Feature Need: DARS must automatically construct and submit the correct structured notification object (NonExecution, DataPreserved, or ConfirmationOfWithdrawal) to WISP in response to Specialist lifecycle actions — no manual XML composition by Specialists is permitted._

L34: Notification Objects are structured XML messages that Microsoft (SP) **creates and sends outward** via WISP to formally report lifecycle status to the IA or EA. They flow **FROM Microsoft TO WISP** (outbound only) `the IA/EA never polls for them`. DARS constructs and submits all NotificationObjects automatically because of Specialist UI actions; Specialists never compose XML manually.

  > **Comment:** Faisal Younas, 2026-04-24: Discuss with policy/investigate. Jamie provided feedback that this may not be the case based on initial meetings with Irish DOJ and advised to descope from MVP if possible with incremental add on in a later phase.

L35: Three types are required for MVP. Full technical payload specifications are in **Appendix B**.

L36: **`NonExecution`** _(Clause 6.4, ETSI TS 104 144 V1.2.1)_

L37: Submitted when Microsoft cannot comply with an EPOC. Triggered by the Specialist completing the Form 3 Non-Execution flow in DARS. V1.2.1 requires three objects to be submitted together in the same `POST /eevidence/nonexecution` call:
- **NotificationObject** — type: `NonExecution`; marks the associated LDTask(s) and/or Authorisation Object status as `"Invalid"`, meaning the order cannot be fulfilled.
- **DocumentObject** — the signed Form 3 PDF (the legally required human-readable non-execution notice to the IA).
- **Form3Information** — a structured machine-readable object containing the specific reason codes, ConflictOfLaw structured fields (if applicable), and RequestForClarification (if applicable)

L38: After submission, the IA has 5 days to respond. If no response is received then the Case will be manually closed.

  > **Comment:** Faisal Younas, 2026-03-30: Discuss what happens when the case is closed. Should this be treated as a withdrawal with a confirmation of withdrawal sent back to WISP?

L39: **`DataPreserved`** _(Clause 6.5, ETSI TS 104 144 V1.2.1)_

L40: Submitted after a data snapshot has been taken and locked for an EPOC-PR. Confirms to the IA that preservation has been completed and the data is available for subsequent production. Submitted via `POST /eevidence/datapreserved`. LDTask status → `"Preserved"`. Where specific categories within a task could not be preserved, supplemental per-category detail is included within the NotificationObject explaining which categories were unavailable and why.

L41: **`ConfirmationOfWithdrawal`** _(Clause 6.7, ETSI TS 104 144 V1.2.1)_

L42: Submitted after the Specialist manually confirms an IA withdrawal in DARS based on receiving an AuthorisationDesiredStatus → `"Canceled"`. Formally signals to WISP and the EU infrastructure that the EPOC is canceled. Submitted via `POST /eevidence/confirmwithdrawal`. AuthorizationObject status → `"Canceled"`. WISP closes the case from the EU side. `Triggers the 45-day retention obligation in DARS.`

L43: **Note — UI/UX design sessions required to identify how notifications will be triggered in DARS for each of the scenarios above.**

### 5.2 Form 3 Non-Execution: Submission Interface and Reason Codes

  > **Comment:** Faisal Younas, 2026-04-24: Case Details section is being introduced in ETSI 104144 that needs to be added in potentially.

L44: _Feature Need: DARS must provide a structured Non-Execution submission form covering all ten reason code categories defined in ETSI TS 104 144 V1.2.1, Clause 6.4.4, enabling Specialists to complete and submit all mandatory Non-Execution objects (NotificationObject + DocumentObject + Form3Information) without manual XML authoring._

L45: **Foundation**: Builds on existing case actions.

L46: **What is needed**:
- Specialists must be able to submit a Form 3 Non-Execution directly from the case
- The feature must capture the mandatory Form 3 data required by V1.2.1:
- Reason code from the standard's taxonomy (Incomplete, ManifestErrors, InsufficientInformation, DataNotHeld, DeFactoImpossibility, InvalidIssuingAuthority, OffenceNotCovered, ServiceNotCovered, ImmunitiesOrPrivileges, ConflictOfLaw — per ETSI TS 104 144 V1.2.1, Clause 6.4.4)
- Affected Tasks/data categories, and a narrative.
- For `ConflictOfLaw` _(V1.2.1, Clause 6.4.4)_: the additional structured fields must be capturable
- Title of Law,
- Applicable Statutory Provisions,
- Nature of Conflicting Obligations,
- Why Conflict of Law Applies,
- Link Between SP and Third Country, Consequences for Addressee,
- Any Other Relevant Information
- An optional Request for Clarification field must be available, mapping to `Form3Information.RequestForClarification`.
- Before Form 3 is submitted to WISP, the Form 3 PDF (DocumentObject) must be digitally signed by the authorized Specialist or attorney. DARS must provide an in-application digital signature step. The signature must be a qualified electronic signature (QES) or advanced electronic signature (AES) consistent with eIDAS Regulation requirements and any applicable member-state implementing rules. The digital signature step is mandatory and cannot be bypassed. Form 3 cannot be submitted to WISP without a valid signature applied to the DocumentObject.
- Submission must require explicit Specialist or Attorney confirmation — Form 3 is legally binding.
- DARS must automatically construct and submit all three mandatory ETSI V1.2.1 objects on confirmation: NotificationObject + DocumentObject + Form3Information _(Clause 6.4.2)_.
- Attorney approval is mandatory before submitting Form 3 with DeFactoImpossibility, ServiceNotCovered, ImmunitiesOrPrivileges, or ConflictOfLaw. See Section 5.6.1 for the full reason code reference. The Specialist assigns the case to an attorney via the standard Case Queue — see Appendix C.
- Submitted Form 3 and PDFs must be archived as part of the Case. Should this be part of the audit log and surfaced to LENS RS?

#### 5.2.1 Form 3 Reason Codes: Attorney Gate and EPOC Defect Handling

L47: The table below is the definitive reference for Form 3 reason code handling in DARS. For reason codes where Attorney Gate = No, Specialists submit Form 3 directly without internal escalation. For reason codes where Attorney Gate = Yes, the case must be assigned to an attorney and attorney approval obtained before Form 3 is submitted to WISP.

| Reason Code | When It Applies | IA Correction Window | Attorney Gate |
|---|---|---|---|
| Incomplete | One or more required EPOC/EPOC-PR sections are entirely blank. Affected sections: see EPOC Section Reference below. | IA has 5 days to correct and resubmit; SLA clock resets on valid resubmission. | No |
| ManifestErrors | Required section fields contain incorrect or erroneous details. | IA has 5 days to correct and resubmit; SLA clock resets on valid resubmission. | No |
| InsufficientInformation | Section E is present but insufficient to uniquely identify an account. | IA has 5 days to correct and resubmit; SLA clock resets on valid resubmission. | No |
| DataNotHeld | All accounts listed in the EPOC/EPOC-PR return no account found at Microsoft. | Subject to IA acceptance. | No |
| DeFactoImpossibility | Not feasible within the statutory deadline due to the size or complexity of the request, a technical system failure, or unanticipated exigent circumstances not attributable to Microsoft or the IA. | — | Yes |
| ServiceNotCovered | The service named in the EPOC is not covered by Regulation (EU) 2023/1543. | — | Yes |
| ImmunitiesOrPrivileges | The requested data is protected by immunities or privileges under the law of the enforcing State, or is covered by rules on the determination or limitation of criminal liability relating to freedom of the press or freedom of expression in other media. | — | Yes |
| ConflictOfLaw | Compliance with the EPOC conflicts with the applicable law of a third country. Requires ConflictOfLaw structured fields in Form3Information (see Section 5.6). | — | Yes |

### 5.3 Formal Correspondence Exchange (Inbound and Outbound)

L48: _Feature Need: DARS must provide a protocol-level correspondence channel through WISP for all formal inbound and outbound communications with Issuing Authorities and Enforcing Authorities, with every message forming part of the immutable case record. Correspondences must continue to be received or sent even after a Case has been closed._

L49: Correspondences are formal, protocol-level messages exchanged between parties **through WISP** — not email, phone, or any out-of-band channel. Both inbound (IA/EA → SP) and outbound (SP → IA or EA) correspondences are part of the official case record and must be logged in the DARS Audit Thread.

L50: **Why correspondences matter**: Correspondences are used throughout the GFR and Non-Execution workflows for information requests, objections, enforcement notices, and final decisions.

#### 5.3.1 Inbound Correspondences (IA/EA to SP)

L51: Received by SP via POST /eevidence/correspondence (ETSI TS 104 144 V1.2.1, Clause 5.12, p. 30, Table 5.12.3-2, p. 32). Each inbound correspondence arrives as a DocumentObject and is placed in the Correspondence Inbox on the relevant case. DARS parses the DocumentType to determine whether a badge, banner, or state change is required. All inbound correspondences are logged to the Audit Thread on receipt with UTC timestamp, sender identity, and DocumentType.

L52: The DocumentObject must include: CountryCode (ISO country code of sender), OwnerIdentifier (technical identifier of sender), AssociatedObjects (Object ID of the originating AuthorizationObject), DocumentName set to Correspondence, DocumentType from the EPOCDocumentType dictionary (Table 5.12.3-2), and optionally DocumentBody. `If DocumentType is RequestAdditionalInformation and a response deadline applies, DocumentProperties must carry ResponseRequiredBy` (ETSI TS 104 144 V1.2.1, Tables 5.12.3-1 and 5.12.3-3).

L53: Should correspondeces always be accesable as part of the case..Yes but discuss with LENS.

| DocumentType | Sent By | Purpose | DARS Effect |
|---|---|---|---|
| Maintain | IA | IA confirms the EPOC is maintained; case continues in current state. | No badge change. Specialist and Attorney notified. |
| ProceedingToCourt | IA | IA is escalating the case to court proceedings. | COURT ESCALATION badge applied; attorney case assignment recommended. Specialist + Attorney notified. |
| RequestAdditionalInformation | IA or EA | IA or EA requests clarification or further information from SP (e.g., before finalising a GFR decision or Non-Execution response). | Action badge applied; no case state change. Specialist notified. |
| ProvideAdditionalInformation | IA or EA | IA or EA provides information in response to a prior SP request. | Information recorded on case; no badge; no state change. Specialist notified. |
| EnforcingAuthorityAgreesWithObjection | EA | EA confirms it supports SP's objection to the EPOC. | EA hold confirmed; existing badge retained. Specialist notified. |
| EnforcingAuthorityDisagreesWithObjection | EA | EA rejects SP's objection to the EPOC. | SP-raised hold cleared; relevant badge removed. Specialist notified. |
| EnforcingAuthorityRecognizesOrder | EA | EA confirms the EPOC is valid and the order is recognized. | Information recorded; no badge change; no state change. Specialist notified. |
| EnforcingAuthorityDoesNotRecogniseOrder | EA | EA does not recognise the EPOC as valid. | Badge applied; attorney case assignment strongly recommended. Specialist notified. |
| EnforcementProceduresInitiated | EA | EA has formally initiated enforcement proceedings because SP has not complied with the EPOC. | ENFORCEMENT PROCEEDINGS badge applied; attorney assignment required; delivery blocked pending legal resolution. Specialist + Attorney notified. |

#### 5.3.2 Outbound Correspondences (SP to IA or EA)

L54: Sent by SP via POST /eevidence/correspondence (ETSI TS 104 144 V1.2.1, Clause 6.6, p. 39). The Specialist (or assigned attorney) composes the message in DARS, selecting the recipient (IA or EA), DocumentType, free-text body (required), and optional PDF attachment. A confirmation prompt is shown before submission: "You are sending a formal correspondence via WISP. This message will be part of the official case record. Confirm?" Sent correspondences are immediately added to the Correspondence Inbox and Audit Thread.

L55: The following outbound DocumentTypes are available to SP (ETSI TS 104 144 V1.2.1, Clause 6.6):

| DocumentType | Sent By | Purpose | DARS Effect |
|---|---|---|---|
| RequestAdditionalInformation | SP | SP requests clarification or further information from the IA or EA. Used before or during a Non-Execution or GFR workflow. Best practice before filing Form 3 is to seek clarification from the IA to avoid unnecessary non-execution. | Sent correspondence logged to Correspondence Inbox and Audit Thread; no case state change. |
| ProvideAdditionalInformation | SP | SP provides information in response to a RequestAdditionalInformation received from the IA or EA. | Sent correspondence logged to Correspondence Inbox and Audit Thread; no case state change. |

#### 5.2.3 Correspondence Inbox and Notification Requirements

L56: The following requirements define how DARS must manage the Correspondence Inbox, send functionality, inbound notifications, and attorney escalation via correspondence (ETSI TS 104 144 V1.2.1, Clauses 5.12 and 6.6).

L57: Correspondence Inbox per Case
- "Correspondence" tab or section on case detail page.
- Displays all inbound and outbound correspondences for the case in chronological order.
- Per entry: sender (IA/EA/SP), DocumentType, UTC timestamp, link to full message and attachments.
- Unread inbound correspondence: bold indicator on the entry and badge on the case queue row.

L58: Send Correspondence from DARS
- "Send Correspondence" button on case detail page.
- Available actions: Request Additional Information / Provide Additional Information
- Each outbound correspondence requires: recipient (IA or EA), DocumentType, Document Attachment
- Confirmation prompt before send: "You are sending a formal correspondence via WISP. This message will be part of the official case record. Confirm?"
- Sent correspondences are immediately added to the Correspondence Inbox and Audit Thread.

L59: Inbound Correspondence Notification
- Inbound correspondence triggers an in-app notification to the assigned Specialist and Ops Manager.
- Cases with unread correspondence are flagged in the case queue with a message badge.

### 5.4 Case Condition Indicators, Action Gates, and Document Type Routing

L63: _Feature Need: DARS must ensure Specialists are clearly and immediately informed of the status, constraints, and required actions for every active case condition — including preservation holds, regulatory review windows, attorney escalations, and enforcement proceedings. For each condition, DARS must communicate what has happened, which actions are currently restricted, and what is needed to resolve the condition. The recommended implementation is a set of persistent, prominently displayed visual indicator badges on the case header._

L64: When specific conditions arise on an e-Evidence case, Specialists need to know immediately: what has changed, which actions are restricted as a result, and what steps are needed to proceed. The conditions below each carry distinct informational and operational needs that DARS must surface clearly. DARS recommends implementing these as a set of named visual case indicator badges. See Section 3.4 for the supporting state and badge model.

#### 5.5.1 Conditions Surfaced as Indicators

L65: _Feature Need: DARS must inform Specialists of each of the following active case conditions by specifying: what triggered it, which actions are restricted while it is active, and what event or action will resolve it. The recommended implementation surfaces each condition as a distinct, named visual indicator badge on the case view. Multiple conditions may be active simultaneously._

L66: These conditions are driven by programmatic case attributes and do not require new workflow states. All six existing DARS case states are reused as-is. Each condition is independently triggered and cleared, and multiple conditions may coexist on a single case.

| Condition | Badge / Indicator | Set By | Cleared When |
|---|---|---|---|
| Notification case in 10-day EA window | `EA REVIEW WINDOW` | Priority = 10 Day subject to EA | EA decides or Day 10 + 1 auto-expires |
| Attorney/policy review required | `ATTORNEY REVIEW REQUIRED` | Based on various Attorney gates (Form 3, Correspondences, Enterprise) | Attorney completes action |
| EPOC-PR confirmed; data locked | `PRESERVATION ACTIVE` | `EPOC PR = resolved` | `EndPreservation` received, or 60 days expires without receiving extension or subsequent production request |
| Form 5 received; production SLA running | `SUBSEQUENT PRODUCTION ACTIVE` | Form 5 appended to EPOC PR Case | Subsequent production case reaches `Resolved` |

#### 5.5.2 EPOCDocumentType Classification, Badge Effects, and Routing

L67: _Feature Need: When an inbound DocumentObject is received from IA or EA, DARS must identify its type and immediately communicate to the Specialist that a document has been received and, which actions are now affected, and what (if any) response is required. The table below defines the required badge change, delivery effect, and notification for each of the 18 defined document types across all inbound endpoints._

L68: _(ETSI TS 104 144 V1.2.1, Clause 5.5.3 and Clause 5.12)_

| DocumentType | Source Endpoint | Badge / Indicator Effect | Informed |
|---|---|---|---|
| `FullGroundsForRefusal` _(Clause 5.5.3)_ | `groundsforrefusal` | `GFR HOLD` badge applied; delivery not recommended — consider a blocking indicator or confirmation prompt | Specialist |
| `PartialGroundsForRefusal` _(Clause 5.5.3)_ | `groundsforrefusal` | `PARTIAL GFR` badge applied; delivery of refused categories not recommended — consider a warning or confirmation prompt | Specialist |
| `NoGroundsForRefusal` _(Clause 5.5.3)_ | `groundsforrefusal` | `EA REVIEW WINDOW` badges cleared; delivery re-enabled | Specialist |
| `Maintain` _(Clause 5.12)_ | `correspondence` | IA confirms EPOC maintained; enforces Attorney escalation | Specialist + Attorney |
| `ProceedingToCourt` _(Clause 5.12)_ | `correspondence` | `COURT ESCALATION` badge applied; enforces Attorney escalation | Specialist + Attorney |
| `RequestAdditionalInformation` _(Clause 5.12)_ | `correspondence` | N/A | Specialist |
| `ProvideAdditionalInformation` _(Clause 5.12)_ | `correspondence` | N/A | Specialist |
| `EnforcingAuthorityAgreesWithObjection` _(Clause 5.12)_ | `correspondence` | `?` | Specialist |
| `EnforcingAuthorityDisagreesWithObjection` _(Clause 5.12)_ | `correspondence` | `?` | Specialist |
| `EnforcingAuthorityRecognizesOrder` _(Clause 5.12)_ | `correspondence` | `?` | `Specialist` |
| `EnforcingAuthorityDoesNotRecogniseOrder` _(Clause 5.12)_ | `correspondence` | `?` | `Specialist` |
| `EnforcementProceduresInitiated` _(Clause 5.12)_ | `correspondence` | `ENFORCEMENT PROCEEDINGS` badge applied; attorney case assignment required; state unchanged | Specialist + Attorney |

#### 5.5.3 Complete EPOCDocumentType Dictionary (ETSI TS 104 144 V1.2.1, Annex C, Table C.2-2)

L69: The EPOCDocumentType dictionary defines all valid DocumentType values used across inbound WISP endpoints. Values received via POST /eevidence/groundsforrefusal are defined in Table 5.5.3-2; values received via POST /eevidence/correspondence are defined in Table 5.12.3-2. The complete dictionary is:

| DocumentType | Source Endpoint | Standard Definition |
|---|---|---|
| Form1 | /eevidence/production | DocumentObject contains a signed EPOC certificate (Form 1, Annex I of the Regulation). |
| Form2 | /eevidence/preservation | DocumentObject contains a signed EPOC-PR certificate (Form 2, Annex II of the Regulation). |
| Form3 | /eevidence/nonexecution | DocumentObject contains a signed non-execution notice (Form 3, Annex III of the Regulation). |
| Form5 | /eevidence/subsequentproduction | DocumentObject contains a signed confirmation of issuance following an EPOC-PR (Form 5, Annex V of the Regulation). |
| Form6 | /eevidence/preservationextension | DocumentObject contains a signed notice of extension of an EPOC-PR (Form 6, Annex VI of the Regulation). |
| OtherAttachment | Any endpoint | DocumentObject contains an arbitrary attachment (Annex B). |
| NoGroundsForRefusal | /eevidence/groundsforrefusal | EA has determined no grounds for refusal. |
| PartialGroundsForRefusal | /eevidence/groundsforrefusal | EA has determined partial grounds for refusal. |
| FullGroundsForRefusal | /eevidence/groundsforrefusal | EA has determined full grounds for refusal. |
| Maintain | /eevidence/correspondence | IA wishes to maintain the initial request upon receipt of Form 3. |
| ProceedingToCourt | /eevidence/correspondence | IA, disagreeing with Form 3 reasons, is upholding the EPOC and intends to proceed to court. |
| RequestAdditionalInformation | /eevidence/correspondence and outbound via WISP | Additional information is requested. If a response deadline applies, DocumentProperties must carry a ResponseRequiredBy value. |
| ProvideAdditionalInformation | /eevidence/correspondence and outbound via WISP | Additional information is provided in response to a prior request. |
| EnforcingAuthorityAgreesWithObjection | /eevidence/correspondence | EA agrees with an objection raised by the SP. |
| EnforcingAuthorityDisagreesWithObjection | /eevidence/correspondence | EA disagrees with an objection raised by the SP. |
| EnforcementProceduresInitiated | /eevidence/correspondence | IA has initiated enforcement procedures to compel SP compliance with an EPOC or EPOC-PR. |
| EnforcingAuthorityRecognizesOrder | /eevidence/correspondence | EA has decided to recognize the order as part of enforcement procedures and requires SP compliance. |
| EnforcingAuthorityDoesNotRecogniseOrder | /eevidence/correspondence | EA does not recognize the order upon initiation of enforcement procedures by the IA. |

L70: Note: RequestAdditionalInformation and ProvideAdditionalInformation are the only DocumentTypes valid for outbound SP-to-WISP correspondence (ETSI TS 104 144 V1.2.1, Clause 6.6). All other types are inbound only.

### 5.11 New Deadline Reception and SLA Reset

L89: _Feature Need: DARS must process incoming new deadline instructions from WISP immediately upon receipt — recalculating and updating the live SLA countdown, logging an immutable NEW_DEADLINE_RECEIVED audit entry, notifying the Specialist and Ops Manager, without disrupting any active GFR HOLD, EA REVIEW WINDOW, or other case badges._

L90: The Issuing Authority (IA) may reset the statutory deadline on an active EPOC by sending a POST /eevidence/newdeadline request via WISP to LENS-API (ETSI TS 104 144 V1.2.1, Clause 6.1.5).

L91: **DARS must, immediately upon receipt:**

L92: 1. Recalculate the SLA countdown from the new deadline timestamp in the NewDeadlineObject and update the live SLA counter in the case queue and case header immediately.

L93: 2. Log a NEW_DEADLINE_RECEIVED audit entry against the case recording: the original deadline, the new deadline, the TransactionID, and the UTC timestamp of receipt.

L94: 3. Notify the assigned Specialist and Ops Manager via in-app alert: "SLA deadline updated by Issuing Authority. New deadline: [date/time]."

L95: **Constraints:**

L96: - No case state change, no badge change, and no disruption to any active GFR HOLD or EA REVIEW WINDOW.

L97: - A new deadline received after the case has reached Resolved or WithdrawalConfirmed is discarded and a warning logged to the audit thread.

L98: See Appendix A (Endpoint 6) for the full technical payload specification.

### 5.12 Preservation Lifecycle, Case View, and Subsequent Production Linkage

L99: _Feature Need:_
- _DARS must support the end-to-end preservation workflow, including receiving and acknowledging EPOC-PR forms (Form 2), surfacing all preservation lifecycle data to Specialists, linking preservation cases to Subsequent Production orders (Form 5), and ensuring that preserved data is held for the required duration._
- _DARS must enforce preservation end-date suppression while a Subsequent Production (Form 5) case remains active against the same EPOC-PR, surface all preservation lifecycle data on the case view, and provide navigable links between the preservation case and any linked Subsequent Production case._

When Form 5 is received against an active EPOC-PR case, the SUBSEQUENT PRODUCTION ACTIVE indicator is applied to the preservation case. While this indicator is active, the preservation end date must not be enforced — data must continue to be held regardless of the 60-day clock or any EndPreservation instruction received. The preservation end date and retention cleanup (Day 46) are only triggered once the subsequent production case reaches Resolved (full delivery acknowledged).

Requirements

L100: for preservation cases:
- Preservation cases (EPOC-PR, Form 2) must be clearly distinguishable from production cases in both the case queue and case detail view.
- The case must surface: preserved data categories, preservation start date, 60-day minimum retention end date, and the 45-day post-end expiry window.
- `Deliver and Publish actions must not be available on preservation cases.`
- When Form 5 (Subsequent Production) arrives, the preservation case and the new production case must be linked and navigable from each other.
- A Form 5 with no matching EPOC-PR must surface an error to the Specialist and prevent progression.
- When Form 5 is received against an active EPOC-PR case, the SUBSEQUENT PRODUCTION ACTIVE indicator is applied to the preservation case. While this indicator is active, the preservation end date must not be enforced — data must continue to be held regardless of the 60-day clock or any EndPreservation instruction received. The preservation end date and retention cleanup (Day 46) are only triggered once the subsequent production case reaches Resolved (full delivery acknowledged).

### 5.12 EPOC Withdrawal Receipt, Confirmation, and Task Cancellation

> _NOTE: The source document numbers two consecutive subsections "5.12". This is preserved verbatim — likely a doc bug to flag with the author._

L101: _Feature Need: DARS must receive withdrawal instructions from WISP, alert the Specialist, require explicit Specialist confirmation, automatically cancel all associated tasks, construct and submit a ConfirmationOfWithdrawal notification object, and start the 45-day data retention clock on confirmation._

L102: When a withdrawal instruction is received via `POST /eevidence/withdraw` the Authorization Desired Status will be set to "Cancelled" and the Specialist confirms it, DARS must automatically cancel all tasks belonging to that EPOC. On cancellation:
- No new tasks may be added to the case
- No new data categories may be added to any canceled task
- If a task is individually canceled (without full EPOC withdrawal), no new data categories may be added to that specific task
- DARS constructs and submits a `ConfirmationOfWithdrawal` NotificationObject
- 45-day retention clock starts
- All cancellations are logged to the immutable audit thread

Add details pertaining to parital cancellation of tasks.
- Would tasks be cancelled one by one or can more than one be cancelled in a single request.
- What happens if all tasks are cancelled but the authorization itself is not cancelled/withdrawn? Do we keep it open? What happens to the SLA clock in that case.
- Can additional tasks be added to an existing request? What is the point at which tasks cannot be added.
- If new tasks are added to an existing Case/EPOC how does that affect the 10 day timer?
- If a new tasks is created, Specialits should be informed.
- Check rules in 103120.

### 5.15 Delivery Acknowledgement, Retry Management, and Outcome Visibility

L108: _Feature Need: DARS must track delivery status and acknowledgement independently per Task within a DeliveryObject, display per-task delivery outcomes on the case view, and enable targeted re-delivery of individual failed tasks._

L109: `DeliveryAcknowledged` is tracked independently per task that forms part of a DeliveryObject. This allows granular visibility and targeted re-delivery of individual failed tasks.

| Attribute | Values | Meaning |
|---|---|---|
| Task delivery status | `Complete` | Delivery pushed; awaiting IA `deliverystatus` ack |
| Task delivery status | `Acknowledged` | IA confirmed receipt via `POST /eevidence/deliverystatus` |
| Task delivery status | `Failed` | IA returned error or no ack after retry exhaustion |

L110: Where one or more tasks in a DeliveryObject are in Failed status, the Specialist can re-deliver those specific failed tasks.

L111: Delivery outcome visibility (UI): After delivery is pushed, the case view must display for each task: push timestamp, IA acknowledgement state (via POST /eevidence/deliverystatus), ack timestamp, and per-category delivery status. Where no acknowledgement is received within 4 hours of push, the assigned Specialist must be notified.

### 5.5 Contact Management and EPOC Authorization Level

L71: _Feature Need: DARS must maintain named contacts for each participating party on every e-Evidence case, and must determine the EPOC authorization level from the EPOC XML to indicate data category permissions consistent with the judicial or prosecutorial authority that signed the order._

L72: Contact Management:
- DARS must allow one or more named contacts to be stored per party role: Issuing Authority (IA), Validating Authority (EA).
- Each contact record must include: full name, organization, role or title, email address, and phone number. (based on properties defined in ETSI TS 104 144 V1.2.1, Clause 5.3.3, Tables 5.3.3-6 and 5.3.3-9)
- Contacts must be pre-populated from EPOC metadata where available (e.g., Issuing Authority name and country from AuthorizationObject) and editable or supplementable manually by Specialists.
- Multiple contacts per party must be supported for example, multiple IA representatives.
- The full contact list for a case must be accessible from the case detail view without navigating away.

L73: EPOC Authorization Level — Data Category Scope Information:
- The EPOC XML carries the authorization level through the ApprovalRole field within AuthorizationApprovalDetails → ApproverDetails (ETSI TS 104 144 V1.2.1, Clause 5.3.3, Tables 5.3.3-6 and 5.3.3-9).
- Form 1 (Production): Section I of the paper form corresponds to the Issuing Authority ApprovalRole; Section J corresponds to the Validating Authority ApprovalRole.
- Form 2 (Preservation): Section F corresponds to the Issuing Authority ApprovalRole; Section G corresponds to the Validating Authority ApprovalRole.
- ApprovalRole values: JudgeCourtOrInvestigatingJudge | PublicProsecutor | OtherCompetentAuthority (OtherCompetentAuthority is only permitted for the Issuing Authority, not the Validating Authority).
- EPOC Authorization Indicator: DARS must display an authorization level indicator to the Specialist based on the parsed ApprovalRole. If either the Issuing Authority or Validating Authority ApprovalRole is JudgeCourtOrInvestigatingJudge, the indicator must show that all four data categories (Category 1–4: Subscriber, Identifying, Traffic, Content) are within scope of this order. If neither role is JudgeCourtOrInvestigatingJudge, the indicator must show that only Category 1 (Subscriber) and Category 2 (Identifying) apply. This indicator is informational — it communicates the expected scope of the order to the Specialist.

  > **Comment:** Faisal Younas, 2026-03-27: Call out for Emma. This was added based on a discussion with her.

- DARS must parse the ApprovalRole from the EPOC XML on intake and display the EPOC Authorization Level indicator on the case detail view, clearly showing which data categories are within scope of the order. Specialists should use this indicator as guidance when selecting data types for collection. No system-level enforcement is applied — the indicator is advisory.

### 5.6 EPOCAdditionalInfo Viewer

L74: _Feature Need: DARS must render the EPOCAdditionalInfo block from the inbound EPOC payload in a structured, human-readable panel on the case view, supporting all defined field types and ensuring no additional information data is silently dropped or truncated._

L75: **Foundation**: Builds on existing case detail view.

L76: **What is needed**: Where EPOCAdditionalInfo is present on an inbound EPOC, Specialists must be able to view it on the case. The display must make clear this data is supplementary, provided by the Issuing Authority,

### 5.7 Emergency Case Notifications

L77: _Feature Need: DARS must generate and deliver urgent alerts to on call rotation until the alert is acknowledged whenever a case is received with EPOCPriority=Emergency (8-hour SLA), ensuring emergency cases are never missed due to standard queue processing latency._

L78: **Foundation**: Builds on existing notification system.

L79: **What is needed**:
- When an 8-hour emergency EPOC is received, DARS must immediately broadcast an ICM alert to the on call rotation starting with the primary on call individual and working through the back up list until the alert is acknowledged and case is assigned.
- Alerts must persist until the case is assigned.
- Emergency cases must be distinguishable from and surfaced above standard cases in the queue.

### 5.8 Grounds for Refusal, EA Decision Handling, and Review Window Enforcement (Requires updated based on latest version of 104144 v1.3.1)

L80: _Feature Need: DARS must enforce the statutory 10-day EA review window for all international cases under — programmatically blocking delivery during the window, surfacing the countdown on the case view, and automatically lapsing the hold on Day 10+1 if no EA determination is received — with full audit logging and Specialist notification. Specific GFR and EA badge conditions are defined in Section 5.3._
- The EA review window expiry date/time (EPOC timestamp + 10 days) must be surfaced on the case header and tracked as a live countdown.
- All international cases: 10-day concurrent EA window starts from the EPOC timestamp (same clock as the SLA). An EA REVIEW WINDOW indicator is applied to the case.
- During the window: all data delivery is programmatically blocked. Publish/deliver buttons are **disabled** (not hidden) with tooltip: _"Action blocked — EA review window active."_
- Grounds for Refusal received via POST /eevidence/groundsforrefusal (ETSI TS 104 144 V1.2.1, Clause 5.5): GFR HOLD or PARTIAL GFR badge applied per DocumentType. SLA clock pauses until EA issues a final decision. See Section 5.4 for full badge state logic
- When the window expires or EA decides: badge is cleared and delivery is re-enabled per applicable branch (see Appendix F). See **Section 5.4** for full badge state logic.

#### 5.8.1 Day-10 EA Window Expiry — Hold Lapses; Manual Proceed Required

L81: _Feature Need: DARS must implement a scheduled job that detects Day-10 window expiry, clears all EA and GFR badges, re-enables delivery controls, logs an EA_WINDOW_EXPIRED audit entry, and notifies the Specialist— requiring manual Specialist initiation of delivery in MVP (auto-publish is a stretch goal)._

L82: **Regulatory basis**: The EA has up to 10 days from EPOC receipt to raise Grounds for Refusal. If no determination is received within that period, the legal hold lapses by operation of the Regulation and Microsoft must proceed with delivery.

L83: **MVP vs Stretch Goal**: The hold expiry notification and badge clearance are **MVP requirements**. Automatically triggering delivery publication on Day 10 expiry is a **stretch goal** (DARS Phased Approach Phase 2 — "Automate publishing for Grounds for Refusal cases that are placed on hold... when the hold is lifted and the EPOC is maintained, publishing should resume automatically"). **In MVP, the Specialist must manually initiate delivery after seeing the Day-10 expiry banner.**

L84: **DARS implementation requirements for Day-10 expiry:**
- DARS maintains a dedicated **EA window expiry timer** per notification case — separate from the SLA clock. The timer is set to EPOC timestamp + 10 days (calendar days, pending legal confirmation per Open Question #2).
- On expiry with no EA final decision received:
- EA hold badge(s) are cleared from the case.
- `DARS generates a green banner: _"EA review window expired with no determination — delivery is now permitted"_`
- An **immutable audit entry** is created: event type "EA_WINDOW_EXPIRED", EPOC timestamp, calculated expiry, note that no EA decision was received.
- Specialist is notified.
- All publish/deliver controls re-enabled.
- **Specialist must manually review the case and initiate delivery.**
- If a GFR was in place: only tasks/categories covered by an explicit PartialGroundsForRefusal block remain restricted. Tasks/Categories not subject to a specific block are released.

#### 5.8.2 Grounds for Refusal Endpoint and DocumentType Handling

L85: The Enforcing Authority communicates its GFR decision via POST /eevidence/groundsforrefusal (ETSI TS 104 144 V1.2.1, Clause 5.5). DARS receives a DocumentObject whose DocumentType field (Table 5.5.3-2) determines the required DARS response. The DocumentObject must reference the AuthorizationObject of the original EPOC via AssociatedObjects. The three valid DocumentType values and required DARS actions are:

| DocumentType | Standard Definition (Table 5.5.3-2) | Required DARS Action |
|---|---|---|
| FullGroundsForRefusal | EA has determined full grounds for refusal. | Apply GFR HOLD badge (red banner); block all delivery actions; stop SLA clock; notify Specialist; log immutable audit entry. Attorney assignment recommended. Case awaits EA final decision, IA withdrawal, or Day-10 expiry. |
| PartialGroundsForRefusal | EA has determined partial grounds for refusal. | Apply PARTIAL GFR badge (amber banner); block delivery of refused categories only — remaining categories remain deliverable; pause SLA clock for blocked categories; notify Specialist; log immutable GFR_RECEIVED audit entry. Specialist partially delivers non-blocked categories. |
| NoGroundsForRefusal | EA has determined no grounds for refusal. | Clear EA REVIEW WINDOW badge and any active GFR badge immediately; show green banner: EA confirmed - no grounds for refusal. Delivery permitted. (ETSI TS 104 144 V1.2.1, Clause 5.5.3); re-enable all delivery controls; notify Specialist; log immutable EA_NO_GFR audit entry. |

L86: For Day-10 window expiry behavior when no GFR or final determination is received, see Section 5.12.1. For the full DocumentType routing table covering all inbound document types, see Section 5.5.3.

### 5.10 SLA Deadline Tracking and Priority-Based Stop-Clock

L87: _Feature Need: DARS must track the statutory SLA deadline for every EPOC from the EPOC timestamp (not LENS-API receipt time), enforce 8-hour and 10-day SLA windows based on EPOCPriority, and apply a stop-clock when a GFR HOLD or EA REVIEW WINDOW badge is active on TenDaysSubjectToEA cases._

| Priority | SLA | Stop-Clock |
|---|---|---|
| EightHours | 8 hours from EPOC timestamp | No |
| TenDaysASAP | 10 calendar days | No |
| TenDaysSubjectToEA | 10 calendar days; pauses on GFR hold | Yes |

L88: The following table defines the factors that start, pause, resume, or reset the SLA timer:

| Factor | Effect on SLA Timer |
|---|---|
| EPOC Priority = EightHours | Sets initial deadline to 8 hours from EPOC timestamp. No stop-clock. |
| EPOC Priority = TenDaysASAP | Sets initial deadline to 10 calendar days from EPOC timestamp. No stop-clock. |
| EPOC Priority = TenDaysSubjectToEA | Sets initial deadline to 10 calendar days from EPOC timestamp. Stop-clock applies when GFR HOLD or EA REVIEW WINDOW are active. |
| GFR HOLD badge applied (TenDaysSubjectToEA cases only) | Stops the SLA clock. Can this be resumed again in any scenario? Can this decision be reverted? |
| NewDeadline received from Issuing Authority | Resets the SLA deadline to the new timestamp provided in the NewDeadlineObject. Any active stop-clock is preserved; new deadline applied when hold is lifted. |
| Case reaches Resolved or WithdrawalConfirmed | SLA tracking ends. 45-day post-case retention begins. |
| Form 3 submitted | Pauses the SLA clock. Clock resumes when IA responds. |

### 5.13 Case Queue Additions for eEvidence Handling

L103: _Feature Need: DARS must extend the existing case queue with the following capabilities to support e-Evidence case visibility, prioritisation, filtering, and Specialist workflow awareness across all EPOC form types and active holds._

L104: The following capabilities are needed in the case queue to support e-Evidence case handling. Designers and engineers have flexibility on how these are surfaced:

| Capability Needed | Type | Requirement |
|---|---|---|
| EPOC Form Type indicator | New | Distinguish Form 1 (Production), Form 2 (Preservation), Form 5 (Subsequent Production) |
| SLA countdown | New | Live SLA timer |
| Active hold indicator | New | Communicate to Specialist that a case has a GFR HOLD or EA REVIEW WINDOW badge active |
| Unread correspondence indicator | New | Surface cases with unread inbound correspondence |
| Protocol lane filter | New | Filter by e-Evidence / UK COPO / All |
| Emergency case prioritization | Existing sort | EightHours cases must appear above all other cases |
| ~~Pending notification indicator~~ | ~~New~~ | ~~Cases with pending outbound NotificationObject events~~ |
| ~~Workflow stage visibility~~ | ~~New~~ | ~~Surface current workflow stage alongside case state~~ |

### 5.14 Post-Case Data Retention and Cleanup Schedule

L105: _Feature Need: DARS must enforce the correct retention period for every case scenario defined in EU Regulation 2023/1543 and trigger automated cleanup at the precise retention expiry date — no manual retention management is permitted for standard scenarios._

L106: The following table defines the retention period and cleanup trigger for each scenario. DARS must track the applicable retention deadline per case and initiate automated cleanup on Day 46 without manual intervention.

| Scenario | Trigger Event | Retention Period | Day 46 Action |
|---|---|---|---|
| Standard production resolved | Case reaches Resolved — all delivery acknowledged by IA | 45 days from case close date | DARS storage cleanup; data purged |
| Non-execution accepted | IA accepts Form 3 non-execution notice (or 5-day IA response window expires without objection) | 45 days from acceptance / window expiry date | DARS storage cleanup; data purged |
| EPOC withdrawal confirmed | Specialist confirms withdrawal; ConfirmationOfWithdrawal notification submitted to WISP | 45 days from confirmation date | DARS storage cleanup; data purged |
| Preservation only — no Subsequent Production | EndPreservation received from IA, or 60-day minimum preservation window expires with no Form 5 | 45 days from end of preservation period | DARS storage cleanup; data purged |
| Subsequent production resolved | Subsequent production (Form 5) case reaches Resolved — all delivery acknowledged | 45 days from Form 5 case close date | DARS storage cleanup; data purged |

  > **Comment:** Faisal Younas, 2026-03-27: Storage clean up requirements may need to be aligned with our current storage clean up process and periods. This is unless we are required to enforce 45 + 1 day for eEvidence only.

L107: Retention starts from the event date in the relevant scenario. DARS must surface the retention expiry date on the case view. All three standard scenarios carry a 45-day retention obligation under EU Regulation 2023/1543. Disputes or non-standard cases are out of scope for automated cleanup and must be flagged for legal review.

### 5.16 Audit Thread

L112: _Feature Need: DARS must maintain a case audit log recording every system event, Specialist action, and WISP message with a timestamp and actor, no audit entry may be edited or deleted after creation._

L113: **Foundation**: Builds on existing audit capabilities.

L114: **What is needed**:
- Every case must have a read-only, chronological log of all events.
- Events that must be recorded: EPOC receipt, every GFR/EA DocumentObject received, EA decisions, Form 3 submitted, delivery pushed, delivery ack received, withdrawals, withdrawal confirmation sent, Form 5 received, preservation extension received, all correspondences (with DocumentType), deadline updates, all badge state changes.
- Per entry must record: UTC timestamp, event type, event details, actor
- No modification or deletion is permitted after creation.

### 5.17 Fatal Error Auto-ICM

L115: _Feature Need: DARS must automatically raise an ICM incident whenever a fatal error occurs during WISP API communication or case processing — such as a non-retryable error after queue exhaustion — so that the on-call engineer is alerted without requiring Specialist intervention._

L116: **Foundation**: Net-new capability.

L117: **What is needed**:
- DARS must detect defined categories of fatal errors: persistent WISP connection failure, mTLS certificate error, unrecoverable data collection failure, and any condition that prevents a case from progressing past its current state.
- On fatal error detection, an ICM incident must be automatically created and populated with: case ID, EPOC Transaction ID, error type, last successful operation timestamp, and SLA deadline.
- The Specialist and Ops Manager must receive an in-app notification.
- The affected case must surface a visible error indicator in both the case queue and case detail until the ICM is resolved and the case is manually resumed by an Ops Manager or Engineer.
- The ICM creation event must be logged in the audit thread.

Identify all the scenarios where fatal errors can happen. Geneva is the foundation for this. Who would the ICMs get assigned to in this case.
Should information from ICM be surfaced in DARS?

### 5.18 Data Fulfillment Capability Gaps (Placeholder to track critical data capability gaps that get identified. Due to time constraints these capabilities will not get prioritized for MVP)

L118: The following fulfillment capability gaps have been identified and must be addressed or tracked:
- Volume Data Export for Services: DARS must provide the ability to query and export a volume summary of data held per service for a given target identifier (e.g., number of emails, storage size in GB, number of files per service). This capability is distinct from the export of the data itself and is required to satisfy orders that seek to understand the scope of available evidence before production.
- Services Provisioned Check and Export: DARS must support a check and export function for Services Provisioned for a given target identifier. This is distinct from Services Utilized: Services Provisioned covers services that have been configured or allocated to the target — regardless of whether the target has actively used them. The Services Provisioned check is driven by IP History associated with the target identifier and must return the set of provisioned services at the time of the order.
- Services Utilized — Continued Filter Support: The existing Services Utilized function must continue to support Service and Date range filters, enabling Specialists to scope the utilized-services result to a specific service type and time window relevant to the EPOC request period.

### 5.19 Metrics and Reporting Requirements (MVP)

  > **Comment thread:**
  > - Tracy Ingle (CELA), 2026-04-23: faisalyounas@microsoft.com let me know if you want me to put in a mock-report of what this would look like
  > - Faisal Younas, 2026-04-24: That would be great tracyi@microsoft.com. Let's add that in the appendix.

L119: _Feature Need: Article 28 reporting requirements dictates that service providers must be able to report statistics on received demands under eEvidence. Microsoft will provide these metrics alongside our Government Requests Report on a bi-annual basis. This means that these cases must be able to be separated from other reporting post MVP when all requests are in DARS. MVP Report must include:_
- _All requests received within a defined time period, based on the Original Received Date of the request._
- _Report must show requests by Country (Issuing Authority), by Request Type (EPOC, EPOC PR, EPOC Emergency), and by closure reason (Information Provided (further sub divided by Cat 1-2-3 Non-Content or Cat 4 Content), No Data Found, or Rejected._
- _Mean & Average for the time period for Time to Resolve (TTR) based on Original Received Date and the date the case is completed ensuring that any "clock stops" are accounted for and removed from time calculation_
- _SLA Comparison (Due date vs actual)_
- _Separate reports for Enterprise and Consumer (where Enterprise is defined as a tenant with more than 50 seats)_
- _Count of Identifiers impacted by the requests_

> _NOTE: Subsection 5.9 was not retrieved (jump in numbering from 5.8.2 to 5.10). Re-fetch from SharePoint if needed._

## 6. Assumptions, Dependencies, and Open Questions

### 6.1 External Dependencies (All Blocking)

| Dependency | Owner | Detail |
|---|---|---|
| WISP/DIS sandbox access | EU / Member States | Required for end-to-end integration testing before go-live. Must be secured before engineering begins |
| WISP endpoint schema (final) | EU | Current normative reference: ETSI TS 104 144 V1.2.1 (November 2025). Schema must be confirmed before LENS-API build |
| EA directory / EA metadata format | EU | Format for EA identifier in EPOC XML not confirmed. V1.2.1 `/eevidence/authorities` endpoint (Clause 6.9) may address this |
| SP-to-WISP mTLS certificate issuance | EU PKI | Lead time unknown. **Must be determined immediately** |
| EU member state WISP operational readiness | EU | As of March 2026: only Czechia has adopted implementing legislation; 6 have drafts; 20 have no public developments |
| Digital signature requirements | EU / Legal | Must be clarified before implementation |
| EU enforcement date confirmation | EU / Legal | 18 August 2026 drives all timelines |

### 6.2 Open Questions — Resolution Required Before Implementation

| # | Question | Blocking? | Owner |
|---|---|---|---|
| 1 | WISP/DIS sandbox access process and timeline? | **Yes** | EU / WISP |
| 2 | EA review window: 10 calendar days or 10 business days? | **Yes** | Legal |
| 3 | Retention obligation for data collected under a refused EPOC? | **Yes** | Legal |
| 4 | What is the secure mechanism for large-payload delivery (>25MB) outside the DIS? V1.2.1 Clause 6.3.3 confirms URL delivery is supported by the standard — the engineering challenge is determining how Microsoft delivers securely out-of-band. | **Yes** | Engineering / Security |
| 5 | Digital signature requirements for EPOC submissions? | **Yes** | EU / Legal |
| 6 | Certificate authority for mTLS certs; lead time? | **Yes** | EU PKI / Security |
| 7 | Which member states have WISP/DIS operational at MVP launch? | **Yes** | EU / Legal |
| 8 | Is partial Form 3 (some categories non-executed while others delivered) legally acceptable? | **Yes** | Legal |
| 9 | When will member states accept Microsoft-defined dataset buckets into Judex/APIs? | **Yes** | EU / Policy |
| 10 | Contingency delivery mechanism if Judex is unavailable at runtime? | **Yes** | Engineering / Policy |
| 11 | Reporting alignment between DARS reports and EU Commission system | No (Phase 2+) | PM / Compliance |
| 12 | Will all EU demands go through e-Evidence or will demands be split? | No | Policy / Legal |
| 13 | Granularity of Microsoft customer-facing data dictionary | **Yes** | Policy / Operations |

> _NOTE: §6 returned with these two subsections only. No section "10.3" was found in §6 — the spec body's reference to "Section 10.3, Open Question #4" appears to be a stale internal reference; the actual location is §6.2, row #4 above._

---

## Appendix A: API Endpoint Specifications (Complete)

_Pending fetch._

## Appendix B: Notification Object Technical Specifications

_Pending fetch._

## Appendix C: Attorney Escalation and Enterprise Review Form

_Pending fetch._

## Appendix D: Reference Implementation Delta Table

_Pending fetch._

## Appendix E: EU Regulation 2023/1543 — Referenced Articles (Full Text)

_Pending fetch._

## Appendix F: Workflow Summaries

L299: Detailed decision branch tables for Workflows 6 and 7 (including all correspondence types per branch) are in Sections F.6.1 and F.7.1 below. The summaries below provide full operational context.

### F.1 Workflow 1 — Standard Production, No EA Review (National Case)

L300: **Trigger**: IA and Microsoft are in the same EU member state. No EA involvement.
- IA issues EPOC Form 1 via POST /eevidence/production. LENS-API receives it and acknowledges receipt.
- DARS creates the case as **New**. The **SLA clock starts from the EPOC timestamp** (not LENS-API receipt time — timestamp discrepancies between EU systems must be handled).
- Specialist is assigned the case. Specialist reviews the EPOC, verifies the Issuing Authority, checks account existence, and confirms the requested data categories and services.
- Specialist initiates data collection for the requested categories. Collection is either automated via integrated tasking (Exchange, Teams, OneDrive) or manual via upload where automation is not available.
- Once collected, Specialist reviews the data and initiates delivery. Delivery payload is constructed and call is made to POST /eevidence/outcome (push model — data is sent to the IA via WISP; the IA does not download it).
- DARS awaits delivery acknowledgement from WISP via POST /eevidence/deliverystatus.
- On "Received" status: task status renders **DeliveryAcknowledged**. Specialist closes the case. 45-day retention begins from close date.
- On "Error" status: DARS alerts Specialist with Retry Delivery option.

L301: If Microsoft cannot fulfil the EPOC for any reason (data not held, technical issue, etc.), the Specialist submits Form 3 Non-Execution — see Workflow 7.

### F.2 Workflow 2 — Standard Production, With EA Review (International Case)

L302: **Trigger**: IA is in a different EU member state from Microsoft's establishment (Ireland). **This is the default for virtually all e-Evidence cases** — because Microsoft's EU establishment is in Ireland, almost every EPOC will come from a different member state, triggering the EA review window.
- IA issues EPOC Form 1. WISP routes to Microsoft **and simultaneously notifies the Enforcing Authority (EA)** — Microsoft's case is held from delivery until the EA window closes.
- DARS creates case as New, moves to Active. SLA clock starts from EPOC timestamp.
- Because EPOCPriority = TenDaysSubjectToEA, DARS immediately applies the **EA REVIEW WINDOW badge** to the case. All publish/deliver actions are **disabled** (not hidden). Tooltip: _"Action blocked — EA review window active. Awaiting EA determination."_
- Specialist collects data normally during the hold — **only delivery is blocked, not collection**. Data must be ready before the window closes. EA review window expiry date/time is shown as a countdown on the case.
- The EA has 10 days from the EPOC timestamp to raise Grounds for Refusal. Three outcomes:
- **EA sends NoGroundsForRefusal** (via POST /eevidence/groundsforrefusal): EA REVIEW WINDOW badge cleared immediately. Green banner: _"EA confirmed no grounds for refusal."_ Specialist proceeds to deliver.
- **EA raises Grounds for Refusal**: GFR HOLD or PARTIAL GFR badge applied. See Workflow 6.
- **EA is silent — Day 10 passes** with no EA determination: The hold lapses by operation of Art. 8 and Art. 10(2), EU Reg. 2023/1543. DARS: clears the EA REVIEW WINDOW badge, shows green banner _"EA review window expired — delivery is now permitted (Art. 8 and Art. 10(2), EU Reg. 2023/1543),"_ notifies Specialist and Ops Manager, and creates immutable audit entry EA_WINDOW_EXPIRED. **Specialist must manually initiate delivery.** _(MVP: manual proceed required. Auto-publish on Day-10 expiry is a stretch goal — Section 3.8.)_
- Specialist delivers via POST /eevidence/outcome. WISP confirms via POST /eevidence/deliverystatus. Case closed. 45-day retention.

L303: _"Due to conflicting deadlines, the Service Provider must wait until the 10 days have passed before releasing the data to the Issuing Authority to avoid any over-disclosure."_

### F.3 Workflow 3 — Emergency Production (Threat to Life)

L304: **Trigger**: EPOC arrives with EPOCPriority = EightHours.
- LENS-API routes EPOC to DARS. DARS **immediately broadcasts** an in-app alert to **all DARS users** simultaneously. A targeted alert is also dispatched to the on-call rotation. Alerts persist until the case is picked up and assigned — at that point broad alerts cease and ownership is established.
- Case is sorted to the **top of the Case Queue** above all others. 8H EMERGENCY badge is displayed prominently.
- SLA clock shows **8 hours from EPOC timestamp** — displayed in hours and minutes, not days. No EA waiting window applies to emergency cases.
- Specialist picks up the case immediately and reviews the EPOC. Data collection is fast-tracked using all available automated tasking.
- Specialist pushes delivery via POST /eevidence/outcome within the 8-hour window. WISP confirms via POST /eevidence/deliverystatus. Case closed.

L305: If the SLA is at risk of breach, DARS must notify both the Specialist and Ops Manager. A breached SLA on an emergency case constitutes a compliance violation.

### F.4 Workflow 4 — Preservation Order (Form 2 EPOC-PR)

L306: **Trigger**: IA requires Microsoft to preserve data (not produce it yet). IA issues EPOC-PR Form 2.
- IA issues EPOC-PR via POST /eevidence/preservation. LENS-API acknowledges receipt. DARS creates case.
- A **point-in-time snapshot** of the target data is taken immediately and locked. **No delivery occurs at this stage.** The snapshot is held securely for subsequent production.
- DARS calls POST /eevidence/datapreserved with a DataPreserved NotificationObject (LDTask status → "Preserved"). This confirms to the IA that data has been locked.
- The **60-day minimum preservation clock** starts from EPOC-PR receipt. Specialist can view the snapshot details, data categories, estimated volume, start date, and minimum retention expiry in DARS.
- The case then waits for one of four events:
- **Form 5 received** (POST /eevidence/subsequentproduction): IA requests production of the preserved data — see Workflow 5.
- **Form 6 received** (POST /eevidence/preservationextension): IA extends the preservation period. DARS extends the retention clock accordingly.
- **End Preservation received** (POST /eevidence/endpreservation): preservation obligation ends. 45-day retention begins from the end date.
- **Form 3 required**: If the data cannot be preserved (DataNotHeld, DeFactoImpossibility, etc.), Specialist submits Form 3 Non-Execution — see Workflow 7.

L307: There is no SLA countdown for the preservation confirmation itself but the preservation must be confirmed promptly after receipt.

  > **Comment:** Faisal Younas, 2026-03-17: Confirm with policy

### F.5 Workflow 5 — Subsequent Production of Preserved Data (Form 5)

L308: **Trigger**: IA previously issued an EPOC-PR (Workflow 4) and now wants the preserved data produced.
- IA issues Form 5 via POST /eevidence/subsequentproduction. LENS-API matches this to the originating EPOC-PR case using the **LinkedEPOCPRTransactionId field**.
- If **no matching EPOC-PR** is found in DARS: Specialist submits Form 3 Non-Execution (cannot fulfil without a corresponding preservation case).
- DARS links the new Form 5 case to the originating EPOC-PR case with **reciprocal hyperlinks** in both case records. A **new 10-day SLA production clock starts**.
- If the IA is international: **EA review window applies** (EA REVIEW WINDOW badge applied, same rules as Workflow 2).
- Specialist delivers from the **preserved data snapshot** (not a fresh collection) via POST /eevidence/outcome. The snapshot was locked at the time of preservation.
- WISP confirms delivery via POST /eevidence/deliverystatus. Case closed. 45-day retention.

### F.6 Workflow 6 — Grounds for Refusal (EA Objects)

L309: **Trigger**: EA raises legal objections to an EPOC via POST /eevidence/groundsforrefusal (ETSI TS 104 144 V1.2.1, Clause 5.5). The DocumentObject DocumentType determines the branch: FullGroundsForRefusal, PartialGroundsForRefusal, or NoGroundsForRefusal.

L310: Grounds for Refusal can be triggered by: legal immunities or privileges (attorney-client, journalistic, government); manifest breach of fundamental rights; double jeopardy; conduct that is not a criminal offence in the EA's state. See Section 5.2 for full correspondence type definitions and DARS handling.
- EA sends a DocumentObject via POST /eevidence/groundsforrefusal. The DocumentType determines the nature of the GFR.
- DARS **immediately** applies the appropriate badge and disables all publish/deliver actions. SLA clock pauses.
- A **GFR panel** is shown on the case displaying: EA name, GFR receipt date, reason summary, and a countdown to the EA review window expiry date.

L311: **Branch by DocumentType:**

L312: **FullGroundsForRefusal** — GFR HOLD badge applied (red banner). All delivery is blocked. IA and EA negotiate independently — Microsoft is not party to the negotiation and must wait. This typically leads to an IA withdrawal (Workflow 8). Attorney assignment may be required for complex scenarios.

L313: **PartialGroundsForRefusal** — PARTIAL GFR badge applied (amber banner). Only specific data categories are blocked; the remainder can still be published. Specialist partially publishes the approved categories. The blocked categories remain held.

L314: **NoGroundsForRefusal** — All badges cleared immediately (green banner). Delivery proceeds normally.

L315: **Day-10 expiry with no final EA decision** — If the EA raised a GFR but issued no further final determination by Day 10, the hold lapses by Art. 8 and Art. 10(2). DARS: clears the GFR badge, shows the expiry banner, creates the EA_WINDOW_EXPIRED audit entry, and notifies Specialist and Ops Manager. **Specialist must manually proceed to deliver** (auto-publish on Day-10 expiry is a **stretch goal** — DARS Phased Approach Phase 2; not MVP). Data collection must have continued throughout the hold period. 45-day retention runs from case closure, not from Day 10.

L316: For EA agreement with SP objection, and EA enforcement proceedings, see Sections F.6 (Branches E and F) below.

### F.6.1 Workflow 6 — Grounds for Refusal: All Decision Branches

L317: **Initial sequence (applies to all branches):**
- IA issues EPOC → WISP routes to Microsoft. EA notified simultaneously.
- Microsoft collects data; SLA clock running.
- EA raises Grounds for Refusal → WISP delivers DocumentObject via `POST /eevidence/groundsforrefusal`.
- DARS immediately places case on hold. SLA clock pauses. All publish/deliver actions blocked.
- EA has up to 10 days from EPOC receipt to issue final decision.

L318: **What triggers Grounds for Refusal:** Legal immunities/privileges (attorney-client, journalistic, government); manifest breach of fundamental rights; double jeopardy; conduct not a criminal offence in the EA's state.

L319: **Branch A — Full Grounds for Refusal → Withdrawal → Case Closed**

L320: _DocumentType: FullGroundsForRefusal - EA has determined full grounds for refusal (ETSI TS 104 144 V1.2.1, Clause 5.5.3, Table 5.5.3-2)_
- DARS shows full delivery block (red banner). All publish/deliver actions permanently disabled.
- IA and EA negotiate (Microsoft awaits outcome; is not party to the negotiation).
- IA determines EPOC cannot stand → sends withdrawal via `POST /eevidence/withdraw`.
- DARS shows withdrawal banner. **Response Specialist must manually confirm withdrawal.**
- Specialist confirms → Microsoft sends `POST /eevidence/confirmwithdrawal` (NotificationObject: `ConfirmationOfWithdrawal`).
- Case → `WithdrawalConfirmed`. **45-day retention begins. Day 46: cleanup.**

| Stage | Who Sends | DocumentType | Purpose |
|---|---|---|---|
| During GFR hold | IA or EA → SP | `RequestAdditionalInformation` | Seek context before finalising decision |
| During GFR hold | SP → IA or EA | `ProvideAdditionalInformation` (outbound) | Microsoft clarifies a point |
| After Full Refusal, pre-withdrawal | IA → SP | `RequestAdditionalInformation` | IA may seek clarification before confirming withdrawal |
| Escalation during hold | IA → SP | `EnforcementProceduresInitiated` | IA escalates to formal enforcement; attorney task required |

L321: **Branch B — Partial Grounds for Refusal → Partial Publish**

L322: _DocumentType: PartialGroundsForRefusal - EA has determined partial grounds for refusal (ETSI TS 104 144 V1.2.1, Clause 5.5.3, Table 5.5.3-2)_
- DARS shows partial block (amber banner). Only specific categories blocked; others remain publishable.
- Response Specialist partially publishes approved categories.
- Blocked categories remain held until Day 10 → auto-cleared by Day-10 expiry rule.

| Stage | Who Sends | DocumentType | Purpose |
|---|---|---|---|
| Post-Partial-GFR | IA or EA → SP | `RequestAdditionalInformation` | Clarify which categories are blocked |
| Post-Partial-GFR | SP → IA or EA | `ProvideAdditionalInformation` (outbound) | Clarify permitted vs. blocked scope |

L323: **Branch C — No Grounds for Refusal → Proceed**

L324: _DocumentType: NoGroundsForRefusal - EA has determined no grounds for refusal (ETSI TS 104 144 V1.2.1, Clause 5.5.3, Table 5.5.3-2)_
- EA issues `NoGroundsForRefusal` → DARS automatically clears hold.
- Green banner: _"EA confirmed — no grounds for refusal. Delivery permitted."_
- Specialist proceeds with standard delivery.

L325: **Branch D — Day-10 Expiry with No EA Decision → Hold Lapses; Specialist Manually Proceeds**

L326: _Regulatory basis: Art. 8 and Art. 10(2), EU Regulation 2023/1543. The EA's right to raise Grounds for Refusal lapses at the end of the 10-day window. No further determination is required for Microsoft to proceed._

L327: **MVP vs Stretch Goal**: DARS clearing badges and notifying the Specialist on Day 10 is **MVP**. Automatically triggering delivery publication without Specialist action is a **stretch goal** (DARS Phased Approach Phase 2 Stretch Goals). Specialist must manually initiate delivery after the expiry banner appears.

L328: This branch applies in two sub-cases:

L329: **Branch D1 — No GFR was ever raised**: EA was notified when the EPOC was received but sent no `groundsforrefusal` message within 10 days.

L330: **Branch D2 — GFR was raised but EA issued no further final decision**: EA sent an initial GFR DocumentObject within the window, placing the case on hold, but did not follow through with a final determination (e.g., no withdrawal, no `NoGroundsForRefusal`, no complete blocking order) by the end of Day 10.

L331: **Sequence (both sub-cases):**
- DARS EA window expiry timer reaches Day 10 + 1 (at the EPOC timestamp + 10 days, to the second).
- DARS scheduled job detects the expired window with no final EA decision received.
- All EA/GFR badges cleared from the case. Categories not subject to an explicit `PartialGroundsForRefusal` block are released.
- Green banner on case: _"EA review window expired with no determination — delivery is now permitted (Art. 8 and Art. 10(2), EU Reg. 2023/1543)."_
- All publish/deliver controls re-enabled (for non-blocked categories).
- Immutable audit entry created: event type `EA_WINDOW_EXPIRED`, EPOC timestamp, calculated expiry timestamp, note that no EA decision was received.
- Specialist and Ops Manager notified.
- **Specialist reviews the case and manually initiates delivery** via `POST /eevidence/outcome`.
- Case closes normally. 45-day post-close retention begins from closure date.

| Column | Value |
|---|---|
| **Trigger** | EPOC timestamp + 10 days; no final EA decision received |
| **DARS badge action** | EA/GFR badges cleared; delivery controls re-enabled |
| **UI** | Green banner; Specialist notification |
| **Delivery** | Manual — Specialist must initiate (auto-publish is stretch goal) |
| **Audit event** | `EA_WINDOW_EXPIRED` with timestamps |
| **Notification** | Specialist |
| **Data retention** | 45 days from case closure (not from Day 10) |

L332: _"If we have not received a determination by the EA by Day 10, we would close the request out. We will still continue to keep the data for 45 days. On Day 46, storage cleanup rules can begin to apply."_ — February 2026 Dublin Workshop

L333: **Legal note**: The audit record must reflect that the EA hold lapsed by operation of Art. 8 and Art. 10(2) — not that the EA granted clearance. Microsoft should not represent to the IA that the EA cleared the order if the EA simply did not respond.

L334: **Branch E — EA Agrees with SP Objection**

L335: _DocumentType via `POST /eevidence/correspondence`: `EnforcingAuthorityAgreesWithObjection`_
- Microsoft raised an objection through e-DES or Correspondence to the EA.
- EA confirms SP's objection is supported.
- DARS: EA hold confirmed on basis of SP's objection.
- Case proceeds to Branch A or B depending on EA scope.

L336: **Branch F — EA Enforcement Proceedings Initiated**

L337: _DocumentType via `POST /eevidence/correspondence`: `EnforcementProceduresInitiated` or `EnforcingAuthorityDoesNotRecogniseOrder`_
- IA has initiated formal enforcement because Microsoft has not complied.
- DARS shows red urgent banner. `ENFORCEMENT PROCEEDINGS` badge applied to case. Specialist must immediately assign case to attorney. Ops Manager notified.
- Delivery blocked pending legal resolution.
- If `EnforcingAuthorityRecognizesOrder` follows: order confirmed valid; attorney removes hold; delivery may proceed.
- If `EnforcingAuthorityDoesNotRecogniseOrder`: EA does not recognise the order; delivery blocked; attorney escalation required.

### F.7 Workflow 7 — Non-Execution (Microsoft Cannot Comply — Form 3)

L338: **Trigger**: Specialist determines Microsoft cannot fulfil the EPOC.

L339: Grounds for non-execution include: EPOC incomplete or contains manifest errors; insufficient information to act; data not held by Microsoft; technical impossibility outside Microsoft's control; invalid or incompetent issuing authority; offence not covered by EU Reg. 2023/1543; service not covered; data protected by immunities or privileges; compliance would conflict with third-country law. See Section 5.6.1 for the full reason code matrix including attorney gate requirements.

L340: _"Consider erring on the side of goodwill with the IA when invoking a grounds for non-execution."_ Non-Execution should not be used as a shortcut. Clarification should be sought from the IA first where reasonable.

L341: **Step-by-step:**
- Specialists determine a ground for non-execution applies. Before filing Form 3, Specialist **may send a `RequestAdditionalInformation` correspondence** to the IA to seek clarification — this is best practice and often avoids unnecessary non-execution.
- If the case is **enterprise**, or the reason code is DeFactoImpossibility, ServiceNotCovered, ImmunitiesOrPrivileges, or ConflictOfLaw: attorney review is mandatory **before proceeding**. Specialist assigns the case to an attorney. `ATTORNEY REVIEW REQUIRED` badge is applied. Attorney accesses the case via their standard Case Queue and approves or blocks before Form 3 can be submitted (see Appendix C).
- Specialist selects the reason code, affected data categories, and narrative in DARS. For `ConflictOfLaw`, additional structured fields are required (Title of Law, Applicable Statutory Provisions, Nature of Conflicting Obligations, etc.).
- Specialist confirms submission. DARS shows confirmation modal: _"You are submitting a formal Form 3 Non-Execution Notice. This action is part of the official legal record and cannot be undone. Confirm?"_
- DARS constructs and submits all three mandatory objects via `POST /eevidence/nonexecution` (ETSI TS 104 144 V1.2.1, Clause 6.4.2):
- **NotificationObject** (type: `NonExecution`; LDTask status → `"Invalid"`)
- **DocumentObject** (signed Form 3 PDF)
- **Form3Information** (structured reason data, ConflictOfLaw fields if applicable, RequestForClarification if applicable) — new in V1.2.1, CR002
- Case moves to **NonExecutionSubmitted**. IA has **5 days** to respond.

L342: **IA response outcomes:**
- **IA Maintains**: Order stands; case returns to Active. Specialist must attempt compliance again. Attorney consultation strongly recommended before a second Form 3.
- **IA requests clarification or sets new deadline**: Case continues with updated information or extended deadline.
- **IA issues revised EPOC**: New case created by LENS-API; new 10-day SLA clock.
- **IA proceeds to court**: `COURT ESCALATION` badge applied; Specialist must immediately assign case to attorney; case blocked until legal resolution (see Section F.6 above).
- **IA accepts / withdraws**: Withdrawal flow applies — see Section F.8 (Workflow 8) below.
- **No IA response within 5 days** (Branch G): DARS auto-closes the case and logs _"IA did not respond within the 5-day window — non-execution treated as accepted. Case closed."_ Audit entry `NON_EXECUTION_IA_NO_RESPONSE` created. 45-day retention begins from case closure. Specialist and Ops Manager notified.

L343: Full decision branch logic (Branches A–G) is in Appendix F.

### F.7.1 Workflow 7 — Non-Execution: All Decision Branches

L344: **What triggers Non-Execution (SP only):** EPOC incomplete or contains manifest errors; data not held by Microsoft; technical impossibility; incompetent issuing authority; service not covered; immunities/privileges (limited); conflict of third-country law.

L345: **Initial sequence:**
- Specialist determines Microsoft cannot comply. Attorney required for enterprise cases, DeFactoImpossibility, ServiceNotCovered, ConflictOfLaw, ImmunitiesOrPrivileges. See Section 5.6.1.
- Specialist may send outbound `RequestAdditionalInformation` Correspondence before filing Form 3.
- Specialist submits Form 3 → Microsoft sends `POST /eevidence/nonexecution` (NotificationObject + DocumentObject + Form3Information per V1.2.1, Clause 6.4).
- Case → `NonExecutionSubmitted`. IA has **5 days** to respond. If no response received by Day 5 + 1, DARS auto-closes the case (Branch G).

L346: **Branch A — IA Maintains → SP Must Attempt Compliance Again**

L347: _DocumentType: `Maintain`_
- DARS → `Active`. Specialist notified.
- If original reason persists: second Form 3 may be required (attorney consultation strongly recommended).

| Stage | Who Sends | DocumentType | Purpose |
|---|---|---|---|
| IA response | IA → SP | `Maintain` | Order stands; SP must comply |
| SP context | SP → IA | `ProvideAdditionalInformation` (outbound) | SP clarifies why compliance remains impossible |

L348: **Branch B — IA Proceeds to Court → Legal Escalation**

L349: _DocumentType: `ProceedingToCourt`_
- DARS shows red urgent banner. `COURT ESCALATION` badge applied to case. Specialist must immediately assign the case to an attorney.
- Ops Manager and Attorney notified immediately.
- No delivery until legal matter resolved.

| Stage | Who Sends | DocumentType | Purpose |
|---|---|---|---|
| IA escalation | IA → SP | `ProceedingToCourt` | IA proceeding to court |
| Attorney response | SP (Attorney) → IA | `ProvideAdditionalInformation` | Attorney formal response |

L350: **Branch C — IA Issues Revised EPOC → New SLA Clock**

L351: _IA sends new/amended EPOC via `POST /eevidence/production` or `/eevidence/preservation`_
- IA determines Form 3 reason is correctible; issues revised EPOC.
- LENS-API routes as **new linked case**. New 10-day SLA clock starts.
- Original non-execution case remains in `NonExecutionSubmitted`; new case linked for audit.

L352: **Branch D — IA Requests Clarification → SP Provides Info**

L353: _DocumentType: `RequestAdditionalInformation`_
- DARS shows amber notification; action required badge.
- Specialist or Attorney sends outbound `ProvideAdditionalInformation`.
- IA reviews; may proceed to Branch A, C, or E.

L354: **Branch E — IA Accepts Non-Execution and Withdraws → Case Closed**

L355: _Withdrawal via `POST /eevidence/withdraw`_
- Standard Withdrawal Flow (Workflow 8) applies.
- Specialist halts collection, manually confirms, Microsoft sends `confirmwithdrawal`.
- Case → `WithdrawalConfirmed`. 45-day retention begins.

L356: **Branch F — IA Sets New Deadline → SLA Reset**

L357: _IA sends `POST /eevidence/newdeadline`_
- DARS updates SLA clock. Specialist notified.
- Case returns to `Active`. New deadline for compliance.

L358: **Branch G — IA Does Not Respond within 5 Days → Silence = Acceptance (Auto-Close)**

L359: _Regulatory basis: The IA has 5 days from Form 3 receipt to respond. If no response is received within that window, the non-execution is treated as accepted by default._

L360: **Workshop decision basis (February 2026 Dublin Workshop)**: Consistent with the Grounds for Refusal day-10 closure rule — _"If we have not received a determination by Day 10, we would close the request out. We will still continue to keep the data for 45 days. On Day 46, storage cleanup rules can begin to apply."_ The same principle applies here: IA silence after the 5-day Form 3 response window is treated as acceptance of the non-execution.
- DARS 5-day IA response timer (set from Form 3 submission timestamp) expires with no IA response received.
- DARS scheduled job detects the expired window.
- Case → `Closed`. Green banner: _"IA did not respond within the 5-day window — non-execution treated as accepted. Case closed."_
- Immutable audit entry created: event type `NON_EXECUTION_IA_NO_RESPONSE`, Form 3 submission timestamp, calculated 5-day expiry timestamp, note that no IA response was received.
- Data retained for **45 days** from case closure. Day 46: storage cleanup begins.
- Specialist and Ops Manager notified.

| Column | Value |
|---|---|
| **Trigger** | Form 3 submission timestamp + 5 days; no IA response received |
| **DARS action** | Auto-close case; 45-day retention starts |
| **UI** | Green banner; case → `Closed` |
| **Audit event** | `NON_EXECUTION_IA_NO_RESPONSE` with timestamps |
| **Notification** | Specialist |
| **Data retention** | 45 days from case closure; Day 46: cleanup |

L361: **Important**: The audit record must reflect that the IA did not respond within the statutory window — not that the IA explicitly accepted the non-execution. These are legally distinct.

L362: _"Consider erring on the side of goodwill with the IA when invoking a grounds for non-execution."_ Non-Execution should not be used as a shortcut. Attorneys must be consulted for enterprise cases and `ConflictOfLaw` / `ImmunitiesOrPrivileges` reason codes.

### F.8 Workflow 8 — Withdrawal

L363: **Trigger**: IA decides to withdraw the EPOC or EPOC-PR.
- IA sends withdrawal via POST /eevidence/withdraw. DARS applies a withdrawal badge on the Case Queue row. Assigned Specialist is notified.
- If delivery is **in-progress** at the time of withdrawal: delivery must be halted before the withdrawal can be confirmed.
- Specialist reviews the withdrawal reason and the retention obligation, then **manually confirms** the withdrawal in DARS via the "Confirm Withdrawal" button. This manual step is required — withdrawal is never automatic.
- Specialist confirms. DARS sends POST /eevidence/confirmwithdrawal with a ConfirmationOfWithdrawal NotificationObject (AuthorizationObject status → "Canceled").
- WISP closes the case from the EU infrastructure side. Case moves to **WithdrawalConfirmed**. **45-day retention begins from the confirmation date. Day 46: storage cleanup.**

