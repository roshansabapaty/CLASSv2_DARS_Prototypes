# eEvidence MVP — CaseIQ Roadmap Integration Plan

**Last updated:** 2026-03-30
**Hard deadline:** 18 August 2026 (EU Regulation 2023/1543 enforcement)
**Standard:** ETSI TS 104 144 v1.1.1

---

## Overview

The eEvidence MVP must be live by 18 August 2026. CaseIQ Phases 1–3 are the foundational phases. This document outlines how eEvidence MVP work maps to and extends those phases, what must be parallel-tracked in an eEvidence Fast Lane, and what open decisions need to be resolved before engineering begins.

---

## Part 1: What Maps into Existing CaseIQ Phases 1–3

### Phase 1 — Persona System & Data Foundation

**eEvidence additions to Phase 1 scope:**

- **Attorney persona** — Attorney tasking, acknowledgment, and grounds-for-refusal decisions are attorney-persona workflows. The Attorney must be a named persona in Phase 1 alongside Triage Specialist, Response Specialist, and Manager.
- **EU PKI certificate provisioning** — eEvidence intake requires mTLS using EU PKI certificates (separate trust chain from RED). Certificate provisioning and rotation strategy must be established in Phase 1 alongside identity/auth infrastructure.
- **eEvidence case type** — eEvidence cases are a distinct entity type (separate from standard lawful access cases). The data model must support this from Phase 1.
- **SLA timestamp infrastructure** — The 10-day standard and 8-hour emergency SLA clocks require storage and event hooks. These must be built into the event bus and audit log schema established in Phase 1.

---

### Phase 2 — CHI Scoring + LDI Extraction

**eEvidence additions to Phase 2 scope:**

- **ETSI XML intake parser** — eEvidence intake arrives as ETSI-compliant XML (EPOC Form 1, EPOCPR Form 2), not scanned PDFs. This is easier for LDI than PDF extraction — fields are structured and deterministic. LDI must be extended to handle XML intake as a first-class path alongside PDF extraction.
- **eEvidence CHI scoring inputs** — CHI scoring needs eEvidence-specific signals:
  - Emergency flag → auto CHI-1
  - EA (Enforcing Authority) involvement → increases complexity score
  - SLA time remaining on 10-day or 8-hour clock → deadline risk signal
  - Stop-clock status → pauses CHI escalation
- **SLA engine** — 10-day standard clock, 8-hour emergency clock, stop-clock trigger logic. Built on Phase 1 timestamp infrastructure.
- **Intake endpoint handling** — `/eevidence/production` and `/eevidence/preservation` endpoint handling (intake and acknowledgment only at this phase; delivery is Fast Lane scope).

---

### Phase 3 — Case List View & Search

**eEvidence additions to Phase 3 scope:**

- **Emergency badge** — CHI-1 variant visually distinct for eEvidence emergency cases
- **EA involvement flag** — visible indicator in case list for cross-border cases with Enforcing Authority
- **SLA countdown display** — 10-day / 8-hour clock visible in case list row
- **Attorney escalation indicator** — case awaiting attorney decision surfaced in list
- **Stop-clock indicator** — visible when SLA is paused pending grounds-for-refusal resolution
- **eEvidence case type filter** — in search, saved views, and assignment group configuration

---

## Part 2: eEvidence Fast Lane (Parallel Track, Aug 2026 Gate)

Four eEvidence MVP workflows require capabilities from CaseIQ Phases 4–5 that would not normally ship before August 2026 under the sequential roadmap. These must be parallel-tracked as a scoped Fast Lane.

### Fast Lane Scope

| Capability | Normally in CaseIQ | Why Needed for Aug 2026 |
|------------|-------------------|--------------------------|
| NotificationObject construction + WISP/DIS delivery | Phase 5 | Hard deadline — delivery must work at enforcement date |
| Correspondence inbox + compose (formal notices) | Phase 4 | Required for grounds-for-refusal workflow and formal IA communication |
| Grounds for Refusal attorney workflow | Phase 4 | Attorney must act before SLA expires |
| Subsequent Production — Form 5 (link to preserved data) | Phase 5 | Required for full production cycle |
| Preservation Extension — Form 6 | Phase 5 | Required for preservation lifecycle |
| End Preservation notice handling | Phase 5 | Required for preservation lifecycle |

### What the Fast Lane Does NOT Require

The Fast Lane pulls forward only eEvidence-specific delivery and correspondence capabilities. It does not require:
- Full Phase 4 (Focus Profiles, Assignment Groups)
- Full Phase 5 (complete CLASS v2 Collector pipeline for all data categories)

The shared infrastructure from Phases 1–3 (attorney persona, SLA engine, EU PKI, eEvidence case type) is a prerequisite for Fast Lane work to begin.

---

## Part 3: Delivery Structure

```
CaseIQ Foundation Track              eEvidence Fast Lane
(Sequential)                         (Parallel, gates on Aug 2026)
─────────────────────────────        ──────────────────────────────────
Phase 1
  + Attorney persona
  + EU PKI
  + SLA timestamp infra
  + eEvidence case entity
         │
Phase 2                              eEvidence intake endpoints (EPOC/EPOCPR)
  + ETSI XML parser                  SLA engine (10-day / 8-hour / stop-clock)
  + eEvidence CHI inputs             NotificationObject + WISP/DIS delivery
  + Intake endpoints                 Correspondence module (formal notices)
         │                           Grounds for Refusal attorney workflow
Phase 3                              Subsequent Production (Form 5)
  + eEvidence badges                 Preservation Extension / End Preservation
  + SLA countdown display
  + Attorney escalation flag
         │                                    │
         └──────────────────────────────────────┘
                         ↓
               18 August 2026 — eEvidence MVP live
```

---

## Part 4: eEvidence Workflows in Scope for MVP

Eight workflows must be supported at the enforcement date:

| # | Workflow | Key Requirement | CaseIQ Phase |
|---|----------|----------------|--------------|
| 1 | Standard Production (national, no EA) | EPOC intake → RS review → collect → WISP delivery | Phase 2 (intake) + Fast Lane (delivery) |
| 2 | Cross-Border Production (EA involved) | EA notification, parallel SLA tracking, EA flag in case | Phase 2 + Phase 3 |
| 3 | Emergency Production | 8-hour SLA, DRI trigger, CHI-1 auto-escalation | Phase 2 + Phase 3 |
| 4 | Preservation Order | EPOCPR intake, preservation timer tracked | Phase 2 (intake) + Fast Lane |
| 5 | Subsequent Production | Form 5 linking to preserved data, no re-collection | Fast Lane |
| 6 | Preservation Extension | Form 6 → update expiry, recalculate SLA | Fast Lane |
| 7 | End Preservation | End notice → terminate preservation obligation | Fast Lane |
| 8 | Grounds for Refusal / Non-Execution | Stop-clock, attorney review, formal notification | Phase 3 (display) + Fast Lane (correspondence) |

---

## Part 5: Open Decisions (Must Resolve Before Phase 2 Engineering)

| Decision | Why It Blocks | Owner |
|----------|--------------|-------|
| Which services are manual vs. automated for eEvidence MVP | Affects CHI complexity scoring inputs in Phase 2 | PM + CLASS team |
| Stop-clock rule matrix (exact triggers and conditions) | Required to implement SLA engine correctly | Legal + Engineering |
| Extent of CLASS integration for eEvidence MVP | Determines Phase 2 account existence check scope for ETSI identifiers | Engineering + CLASS team |
| How "obvious errors" in incoming requests are handled (currently policy-blocked) | Affects RS workflow and correspondence module scope | Legal |
| EU PKI certificate chain management ownership | Blocks Phase 1 identity/auth work | Security + Engineering |

---

## Part 6: Key Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Enforcement date is immovable (18 Aug 2026) | Critical | Fast Lane must be scoped and staffed independently of main CaseIQ phases |
| Cross-border EA coordination complexity | High | EA workflow must be UAT'd with real EU member state scenarios before go-live |
| Emergency handling operational load (8-hour SLA) | High | DRI process and on-call runbook required before eEvidence goes live |
| EU PKI certificate rotation failure | High | Certificate lifecycle automation required; manual rotation is not acceptable at scale |
| Inconsistent national interpretations of ETSI profiles | Medium | Legal must confirm which national profiles Microsoft will support at MVP |
| CLASS integration depth TBD | Medium | Resolve before Phase 2 begins to avoid scope change mid-phase |

---

## Part 7: Relationship to Existing CaseIQ Pitch Deck

- **Slide 14 (Roadmap)** — Phase 1–3 scope entries should reflect eEvidence additions above
- **Slide 14A (Compliance Gate)** — EU Regulation 2023/1543, ETSI TS 104 144, and EU PKI must be added to the compliance gate review areas
- **Slide 14B (CLASS v2 dependency)** — CLASS integration for eEvidence identifier types (ETSI-compliant identifiers) should be noted alongside existing CLASS v2 scope
- **Slide 16 (The Ask)** — eEvidence Fast Lane staffing should be called out as a distinct resourcing need from the main CaseIQ phase track
