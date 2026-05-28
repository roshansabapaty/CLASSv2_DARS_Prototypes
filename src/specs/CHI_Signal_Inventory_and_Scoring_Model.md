# Case Health Index (CHI) — Signal Inventory & Scoring Model

**Purpose:** Complete inventory of every signal that feeds CHI scoring, with rank weights and a worked example showing how a real case gets scored.

---

## 1. Scoring Architecture

CHI is not a single formula. It's a **two-pass evaluation**:

```
Pass 1: CHI Level (1-5)
  Deterministic decision tree — evaluates urgency, risk, and consequence signals.
  Produces the CHI badge (CHI-1 through CHI-5).

Pass 2: Complexity Score (numeric)
  Weighted formula — predicts RS effort based on case composition.
  Produces the Complexity Tier (Quick through Complex).

Together: CHI Level + Complexity Tier = complete case health picture.
  CHI-1 + Complex = most critical, most effort
  CHI-5 + Quick = healthiest, least effort
```

A third layer — **auto-escalation** — runs continuously and can promote the CHI level as time passes. CHI never downgrades automatically.

---

## 2. CHI Level Signals — Decision Tree (Pass 1)

The decision tree evaluates in order. **First match wins** — once a case qualifies for a level, it stops. Higher levels (lower numbers) take precedence.

### CHI-1: Critical — Immediate Action Required

| # | Signal | Field(s) | Condition | Weight | Rationale |
|---|--------|----------|-----------|--------|-----------|
| 1 | Issuing authority deadline imminent | `deadlineType`, `dateDue` | `deadlineType = "IssuingAuthorityImposed"` AND `daysUntilDue <= 5` | **Absolute** — any match = CHI-1 | Contempt / sanctions risk from issuing authority |
| 2 | Financial penalty imminent | `hasFinancialPenalty`, `dateDue` | `hasFinancialPenalty = true` AND `daysUntilDue <= 7` | **Absolute** | Direct financial liability to Microsoft |
| 3 | Child exploitation case | `crimeType` | `crimeType = "ChildExploitation"` | **Absolute** | Always highest priority regardless of deadline |
| 4 | Threat to life | `crimeType` OR `isThreatToLife` | `crimeType = "ThreatToLife"` OR `isThreatToLife = true` | **Absolute** | Safety-critical |
| 5 | Emergency priority | `casePriority` | `casePriority = "Emergency"` (P0) | **Absolute** | Explicit emergency classification |
| 6 | eEvidence emergency flag | `eEvidenceEmergency` | `eEvidenceEmergency = true` | **Absolute** | EU regulation mandates immediate processing |

### CHI-2: Urgent — At Risk of Breach

| # | Signal | Field(s) | Condition | Weight | Rationale |
|---|--------|----------|-----------|--------|-----------|
| 7 | SLA breach approaching | `dateDue`, `slaWarningDays` | `daysUntilDue <= slaWarningDays` | **Absolute** — any match = CHI-2 | Case will breach if not acted on soon |
| 8 | Financial penalty attached | `hasFinancialPenalty` | `hasFinancialPenalty = true` (any deadline) | **Absolute** | Even if deadline isn't imminent, penalty presence elevates urgency |
| 9 | Urgent priority | `casePriority` | `casePriority = "Urgent"` (P1) | **Absolute** | Explicit urgent classification |
| 10 | Reactivated case | `caseState` | `caseState = "Reactivated"` | **Absolute** | Was closed, reopened — indicates something went wrong |
| 11 | Terrorism crime type | `crimeType` | `crimeType = "Terrorism"` | **Absolute** | High-severity crime below CE but above standard |
| 12 | Enterprise domain flagged (V100) | `enterpriseDomainFlagged` | `enterpriseDomainFlagged = true` | **Absolute** | Special legal language requires attorney escalation |
| 13a | Staffing capacity breach risk | `capacityRatio`, `daysUntilDue` | `availableRSForGroup <= 2` AND `casesInGroup / availableRS > completableByDeadline` | **Conditional** | Even a healthy case becomes urgent when there aren't enough people to reach it before deadline. See Section 2B. |
| 13b | High-urgency country origin | `country` | `country = "India"` (72-hr SLA) | **Absolute** | India's 3-day SLA means any India case that isn't CHI-1 is at minimum CHI-2 once entered into the system |
| 13c | Resolved enterprise account with registry-matched domain | `resolvedAccountType`, `resolvedDomain`, `domainRegistryMatches` | `resolvedAccountType = "Enterprise"` AND `domainRegistryMatches.length > 0` AND `any match has urgencyFloor` | **Absolute** (takes most severe floor across matched registries) | Account existence check reveals enterprise tenant → domain checked against all active registries → matched registry rules apply. See Section 2C for multi-registry schema. |

### CHI-3: Significant — High Resource Consumption

| # | Signal | Field(s) | Condition | Weight | Rationale |
|---|--------|----------|-----------|--------|-----------|
| 13 | Heavy or Complex complexity | `complexityTier` | `complexityTier IN ("Heavy", "Complex")` | **Absolute** — any match = CHI-3 | High effort cases need visibility |
| 14 | Multi-service case | `services` | `distinctServiceCount >= 3` | **Absolute** | Tool switching, context switching, coordination cost |
| 15 | High identifier count | `identifierCountOriginal + identifierCountSupplemental` | `totalIdentifiers >= 25` | **Absolute** | Volume of work regardless of complexity per identifier |
| 16 | Azure involved | `services` | `services.includes("Azure")` AND `complexityTier IN ("Medium", "Heavy", "Complex")` | **Conditional** | Azure requires specialized tooling + limited qualified RS |

### CHI-4: Standard — Routine Processing

| # | Signal | Field(s) | Condition | Weight | Rationale |
|---|--------|----------|-----------|--------|-----------|
| 17 | Within SLA | `dateDue` | `daysUntilDue > slaWarningDays` | Default | No deadline pressure |
| 18 | Standard complexity | `complexityTier` | `complexityTier IN ("Light", "Medium")` | Default | Moderate effort |
| 19 | Routine priority | `casePriority` | `casePriority = "Routine"` (P2) | Default | No urgency flag |

### CHI-5: Healthy — Quick Resolution

| # | Signal | Field(s) | Condition | Weight | Rationale |
|---|--------|----------|-----------|--------|-----------|
| 20 | Single identifier | `identifierCount` | `totalIdentifiers = 1` | Must meet ALL three | Minimal scope |
| 21 | Single service | `services` | `distinctServiceCount = 1` | Must meet ALL three | No tool switching |
| 22 | Routine request type | `requestType` | `requestType IN ("Preservation", "Subpoena", "Administrative Subpoena", "Consent Release")` | Must meet ALL three | Low-complexity legal demand type |

**CHI-5 requires ALL three signals** — one identifier, one service, and a routine request type. If any one is missing, the case stays at CHI-4.

---

## 2A. Country Origin Signal — Cross-Cutting Dimension

Country of origin is not a single-step signal — it affects CHI across **all three passes** (urgency, effort, and breach risk). Different countries impose different SLA windows, legal frameworks, and operational complexity.

### Country Origin → Urgency (Pass 1)

| Country / Region | SLA Window | CHI Impact | Rationale |
|-----------------|-----------|-----------|-----------|
| **India** | 3 days (72-hour SLA) | Any India case not already CHI-1 enters at minimum **CHI-2** | Claire checks 3x/day. 72-hour window means every hour matters. |
| **EU (eEvidence)** | 10 days | Cases within 3 days of 10-day deadline → **CHI-1**; within 5 days → **CHI-2** | EU regulation with enforcement penalties |
| **Brazil** | Varies (often court-imposed) | Follows standard deadline rules, but Brazil frequently attaches financial penalties | Penalty signal elevates independently |
| **US** | 14 days | Standard SLA rules apply | Largest volume, standard processing |
| **Rest of World** | 14 days | Standard SLA rules apply | Default |

### Country Origin → Effort (Pass 2 — Complexity Modifier)

| Country / Region | Complexity Modifier | Rationale |
|-----------------|-------------------:|-----------|
| **India** | +1.0 | High volume of bomb threat duplicates requiring cross-reference; Claire: "the suspect would create an email and send 20 threats" |
| **EU (eEvidence / ETSI)** | +2.0 | ETSI XML format, stop-clock rules, EU PKI, attorney involvement, formal notification objects |
| **International Order / MLAT** | +2.5 | Cross-border coordination, data sovereignty, multi-language, outside counsel involvement |
| **France / Germany / UK (emergency-with-legal-demand)** | +1.5 | Tracy: "technically emergencies but because they have a legal demand, we process them as an emergency but don't set it as one" — ambiguous handling |
| **US** | 0.0 | Baseline (most tooling and processes are US-optimized) |
| **Rest of World** | +0.5 | Less-familiar legal frameworks, potentially manual due-date calculation |

### Country Origin → Breach Risk (Pass 3 — Escalation Sensitivity)

Country determines how aggressively auto-escalation fires:

| Country / Region | Escalation Sensitivity | Effect |
|-----------------|----------------------|--------|
| **India** | **High** — SLA warning window = 1 day (not the standard 14) | A CHI-4 India case auto-escalates to CHI-2 after just 2 days in system |
| **EU (eEvidence)** | **High** — SLA warning = 3 days before 10-day deadline | Escalation fires at day 7 |
| **Brazil (with penalty)** | **High** — penalty presence drives escalation independently | Financial penalty rules override standard SLA timing |
| **US** | **Standard** — SLA warning per request type (1-14 days) | Default behavior |
| **Rest of World** | **Standard** | Default behavior |

---

## 2C. Resolved Account Type & Enterprise Domain Registries — Post-Lookup Signals

**These signals only become available after the CLASS v2 account existence check runs during triage (Phase 2).** The submitted identifier may be a plain email address, but the account it resolves to could be an enterprise account linked to a domain with special legal obligations.

### Signal Chain

```
LE submits identifier: "user@contoso.com" (type: Email)
  ↓
CLASS v2 account existence check
  ↓
Result: {
  accountExists: true,
  accountType: "Enterprise",        ← signal: resolved account type
  tenantDomain: "contoso.com",      ← signal: resolved enterprise domain
  tenantId: "abc-123-def"
}
  ↓
Domain lookup against ALL registered domain registries
  ↓
Results:
  Registry "V100 — Special Legal Language":  MATCH ✓  (action: attorney escalation)
  Registry "Government Tenants":             NO MATCH
  Registry "Education (EDU)":                NO MATCH
  Registry "Critical Infrastructure":        NO MATCH
  ↓
CHI Impact:
  - Complexity: +2.0 (enterprise account type) + 3.0 (V100 registry match) = +5.0
  - Urgency: CHI-2 minimum (V100 match → attorney escalation required)
  - The case was originally scored CHI-4 based on submitted metadata.
    After account lookup, it's now CHI-2 with +5.0 complexity bump.
```

### Why This Matters

Jessalyn described the enterprise workflow: she checks if cases meet escalation criteria for attorneys. If YES, she escalates. If NO, she releases back to the pool. Today this is a **manual check** — she opens the case, reviews the identifiers, determines if it's enterprise, and decides.

With resolved account type and domain registry matching as CHI signals:
- The system **automatically detects** enterprise accounts at triage (not at fulfillment)
- Domain registry matches **auto-escalate** based on registry-specific rules without RS intervention
- Jessalyn's "enterprise hack" (only keeping cases that meet escalation criteria) becomes **the system's default behavior**

### Enterprise Domain Registry — Scalable Multi-Registry Schema

The business may maintain **multiple domain registries**, each with its own purpose, rules, and CHI impact. The V100 list is one registry, but there will be others — government tenants, education domains, critical infrastructure, domains under active litigation, domains with data localization requirements, etc.

**The schema must be registry-agnostic.** Adding a new registry should require zero code changes — only a data entry by an authorized administrator.

```typescript
interface DomainRegistry {
  id: string;                          // unique registry identifier
  name: string;                        // display name: "V100 — Special Legal Language"
  description: string;                 // what this registry represents
  registryType: DomainRegistryType;    // categorization
  isActive: boolean;                   // soft disable without deletion

  // CHI impact when a domain in this registry is matched
  chiImpact: {
    urgencyFloor: CHILevel | null;     // minimum CHI level (e.g., 2 for V100)
    complexityBonus: number;           // added to complexity score (e.g., +3.0)
    escalationTarget: string | null;   // role/group to escalate to (e.g., "attorney")
    autoEscalate: boolean;             // if true, escalation fires without RS review
    flagLabel: string;                 // badge text shown in UI (e.g., "V100", "GOV", "EDU")
    flagColor: string;                 // badge color hex
  };

  // Access control
  managedBy: string;                   // team/role that maintains this registry
  lastUpdatedBy: string;
  lastUpdatedAt: Date;

  // Metadata
  createdAt: Date;
  domainCount: number;                 // derived: how many domains in this registry
}

type DomainRegistryType =
  | "SpecialLegalLanguage"             // V100 — domains with contractual obligations
  | "GovernmentTenant"                 // government/sovereign entity domains
  | "Education"                        // .edu and education institution tenants
  | "CriticalInfrastructure"           // domains designated as critical infrastructure
  | "ActiveLitigation"                 // domains involved in current litigation
  | "DataLocalization"                 // domains with cross-border data restrictions
  | "HighProfile"                      // VIP / high-profile entity domains
  | "Sanctions"                        // domains under sanctions or export control
  | "Custom";                          // business-defined custom registry

interface DomainRegistryEntry {
  id: string;
  registryId: string;                  // FK → DomainRegistry
  domain: string;                      // "contoso.com"
  notes: string;                       // context: "Special language per 2024 agreement"
  addedBy: string;
  addedAt: Date;
  expiresAt: Date | null;             // optional expiry (e.g., litigation registry entries)
  isActive: boolean;
}
```

**Example registries the business might maintain:**

| Registry | Type | CHI Impact | Escalation | Example Domains |
|----------|------|-----------|------------|-----------------|
| **V100 — Special Legal Language** | SpecialLegalLanguage | Floor: CHI-2, Complexity: +3.0 | Auto-escalate to attorney | contoso.com, fabrikam.com |
| **Government Tenants** | GovernmentTenant | Floor: CHI-2, Complexity: +2.0 | Flag for senior RS review | agency.gov, state.gov.uk |
| **Education Institutions** | Education | Floor: none, Complexity: +1.0 | Flag only (no auto-escalation) | university.edu, school.ac.uk |
| **Critical Infrastructure** | CriticalInfrastructure | Floor: CHI-2, Complexity: +2.5 | Auto-escalate to attorney + compliance | power-grid.com, water-utility.org |
| **Active Litigation** | ActiveLitigation | Floor: CHI-2, Complexity: +2.0 | Auto-escalate to litigation attorney | plaintiff-corp.com |
| **Data Localization** | DataLocalization | Floor: none, Complexity: +2.0 | Flag for compliance review | eu-sovereign.de, brazil-data.com.br |
| **High Profile Entities** | HighProfile | Floor: CHI-3, Complexity: +1.5 | Flag for manager awareness | celebrity-brand.com |
| **Sanctions / Export Control** | Sanctions | Floor: CHI-1, Complexity: +3.0 | Auto-escalate to compliance + legal | sanctioned-entity.ru |

### Domain Matching Logic

When a case's resolved enterprise domain is known:

```
function matchDomainRegistries(
  resolvedDomain: string,
  registries: DomainRegistry[],
  entries: DomainRegistryEntry[]
): DomainRegistryMatch[] {

  const matches: DomainRegistryMatch[] = [];

  for (const registry of registries.filter(r => r.isActive)) {
    const entry = entries.find(e =>
      e.registryId === registry.id &&
      e.domain === resolvedDomain &&
      e.isActive &&
      (e.expiresAt === null || e.expiresAt > now())
    );

    if (entry) {
      matches.push({
        registryId: registry.id,
        registryName: registry.name,
        registryType: registry.registryType,
        domain: resolvedDomain,
        chiImpact: registry.chiImpact,
        entry: entry
      });
    }
  }

  return matches;  // a domain can match MULTIPLE registries
}
```

**A single domain can match multiple registries.** For example, `sanctioned-entity.ru` might be in both the Sanctions registry (CHI-1, +3.0) and the Data Localization registry (+2.0). CHI impact rules:
- **Urgency floor:** Take the most severe (lowest CHI number) across all matched registries
- **Complexity bonus:** Sum all matched registry bonuses
- **Escalation targets:** Combine all escalation targets (attorney + compliance + legal)
- **Flags:** Show all matched registry badges on the case

### Fields

| Field | Type | Source | Available When |
|-------|------|--------|----------------|
| `resolvedAccountType` | `"Consumer" \| "Enterprise" \| "Unknown"` | CLASS v2 `/v2/accountidentifiers` response | After account existence check (Phase 2 triage) |
| `resolvedDomain` | `string` (e.g., "contoso.com") | CLASS v2 response — tenant domain for enterprise accounts | After account existence check |
| `resolvedTenantId` | `string` | CLASS v2 response | After account existence check |
| `domainRegistryMatches` | `DomainRegistryMatch[]` | Derived: resolved domain checked against all active registries | After domain registry lookup |
| `hasEnterpriseAccount` | `boolean` | Derived: `ANY identifier.resolvedAccountType = "Enterprise"` | After account existence check |
| `highestRegistryUrgencyFloor` | `CHILevel \| null` | Derived: most severe `urgencyFloor` across all matched registries | After domain registry lookup |
| `totalRegistryComplexityBonus` | `number` | Derived: sum of `complexityBonus` across all matched registries | After domain registry lookup |
| `registryEscalationTargets` | `string[]` | Derived: combined escalation targets from all matched registries | After domain registry lookup |

**Note:** A single case can have BOTH consumer and enterprise identifiers. If any identifier resolves to enterprise, the case gets the enterprise signals applied. The `hasEnterpriseAccount` flag is true if at least one identifier is enterprise. If multiple identifiers resolve to different enterprise domains, each domain is checked independently — the case accumulates the combined impact of all matched registries across all its identifiers.

---

## 2B. Staffing Capacity Pressure — Systemic Breach Risk Signal

**This is the signal the user identified as missing from both DARS and CaseIQ.** Individual case scoring is necessary but not sufficient. A CHI-4 case is "healthy" in isolation, but if there are 100 Enterprise cases and only 2 RS available that week, many of those CHI-4 cases **will** become CHI-1 by Friday through no fault of their own — they'll simply age past their deadlines because there aren't enough hands.

### How It Works

Staffing capacity pressure is a **systemic modifier** that can promote CHI for cases within an under-staffed assignment group. It bridges the gap between individual case health and LENS Health.

```
For each Assignment Group:

  availableRS = qualified RS who are on-rotation this week and not on leave/on-call
  totalCapacityPerDay = sum(each RS's avg_throughput_per_day)
  casesInGroup = unassigned + staged + active cases matching this group

  For each case in the group:
    daysUntilDue = case.dateDue - now()
    workDaysRemaining = business_days(now(), case.dateDue)

    // Can the team reach this case before its deadline?
    casesAheadInPriority = count of cases in group with CHI < this case's CHI
                          + count of cases with same CHI but older
    daysBeforeThisCaseGetsWorked = casesAheadInPriority / totalCapacityPerDay

    IF daysBeforeThisCaseGetsWorked >= workDaysRemaining:
      // This case will NOT be reached before its deadline at current staffing
      → Escalate to CHI-2 (capacity-driven breach risk)
      → Flag: "Capacity shortfall — {availableRS} RS cannot clear
               {casesAheadInPriority} higher-priority cases before this
               case's deadline of {dateDue}"

    IF availableRS <= 1:
      // Single point of failure — any unplanned absence means breach
      → Flag: "SPOF — only {availableRS} RS available for {group.name}"
```

### Staffing Capacity Fields

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `availableRSForGroup` | Derived (from qualifications + leave calendar) | Phase 4 + 6 | Qualified RS on rotation this week |
| `totalCapacityPerDay` | Derived (from RS throughput baselines) | Phase 4 | Estimated cases/day the group can process |
| `casesAheadInPriority` | Derived (from CHI sort order) | Phase 2 | How many cases will be worked before this one |
| `daysBeforeThisCaseGetsWorked` | Derived (division) | Phase 2 + 4 | Estimated wait time at current staffing |
| `capacityBreachRisk` | Derived (boolean) | Phase 2 + 4 | True if case will not be reached before deadline |
| `staffingCoverageRatio` | Derived (availableRS / minRequiredRS) | Phase 6 | Group-level coverage health |

### Example

```
Assignment Group: "Enterprise"
Available RS this week: 2 (Dale, Jessalyn)
Combined throughput: 8 cases/day (Dale: 3/day, Jessalyn: 5/day)
Cases in group: 100

Case LNS-2026-08812:
  CHI: 4 (Standard)
  dateDue: April 4 (5 work days remaining)
  Cases ahead in priority: 47 (all CHI-1, CHI-2, CHI-3 cases + older CHI-4s)
  Days before this case gets worked: 47 / 8 = 5.9 days

  5.9 days > 5 work days remaining
  → ESCALATE to CHI-2: "Capacity shortfall — 2 RS cannot clear 47
     higher-priority cases before this case's deadline of April 4"
```

**This is the signal that turns invisible staffing problems into visible case-level urgency.** The manager sees it in the LENS Health Dashboard as a capacity gap. The RS sees it on the case itself as a CHI-2 badge with a "capacity shortfall" reason. Both perspectives show the same truth.

---

## 3. Complexity Score Signals — Weighted Formula (Pass 2)

The complexity score is a numeric value. Higher = more effort.

### Base Signals (Additive)

| # | Signal | Field | Formula | Weight | Example |
|---|--------|-------|---------|--------|---------|
| C1 | Identifier count | `identifierCountOriginal + identifierCountSupplemental` | count × weight | **1.0 per identifier** | 5 identifiers = 5.0 |
| C2 | Service breadth | `distinctServiceCount` | count × weight | **2.0 per distinct service** | 3 services = 6.0 |
| C3 | Azure involvement | `services.includes("Azure")` | flat bonus if true | **+3.0** | Azure present = +3.0 |
| C4a | Enterprise identifier types (submitted) | identifier types include TenantID, SubscriptionID, Domain | flat bonus if true | **+2.0** | Submitted identifier is explicitly enterprise — Tenant ID, Subscription ID, or Domain |
| C4b | Resolved enterprise account type | `resolvedAccountType = "Enterprise"` (from CLASS v2 account existence check) | flat bonus if true | **+2.0** | Account lookup resolved to enterprise tenant — even if submitted identifier was a plain email. Triggers enterprise workflow regardless of what was submitted. |
| C4c | Resolved enterprise domain registry matches | `resolvedDomain` (from CLASS v2 account lookup) | lookup against all active domain registries | **Sum of matched registry bonuses** (e.g., V100 = +3.0, Gov = +2.0) | The domain the enterprise account is linked to is checked against every active domain registry. An email like user@contoso.com resolves to Contoso tenant → Contoso is on V100 registry → +3.0 complexity + attorney escalation. A domain on multiple registries accumulates all bonuses. See Section 2C for full schema. |
| C5 | Linked preservation | `hasLinkedPreservation` | flat bonus if true | **+1.5** | Preservation linked = +1.5 |
| C6 | Request type weight | `requestType` → weight lookup | flat value | **1.0 - 3.0** (see table) | Court Order = 2.5 |
| C7 | Identifier type complexity | `identifiers[].type` → weight lookup | sum of per-identifier type weights | **0.0 - 2.0 per identifier** (see table) | 2 emails (0.0) + 1 gamertag (1.5) = 1.5 |
| C8 | Country origin modifier | `country` → weight lookup | flat bonus | **0.0 - 2.5** (see Section 2A) | EU eEvidence case = +2.0 |

### Identifier Type Complexity Weights (Component C7)

Not all identifiers are equal. An email address is a straightforward lookup. A gamertag requires Xbox-specific tooling. A Skype name could be ambiguous with an Xbox gamertag (Dale: "they could follow the same format"). Serial numbers and 5x5 tokens require specialized service knowledge.

| Identifier Type | Weight | Rationale |
|----------------|-------:|-----------|
| Email address | 0.0 | Baseline — every RS can handle email lookups |
| Phone Number | 0.0 | Standard lookup |
| CID | 0.0 | Standard lookup |
| PUID | 0.0 | Standard lookup |
| MRN | 0.0 | Standard lookup |
| Credit Card (Last 4) | 0.5 | Payment instrument lookup, less common |
| Other Payment Instrument | 0.5 | Less common, may require specialized knowledge |
| IP address | 0.5 | Reverse lookup, may span multiple services, Azure involvement possible |
| Domain Name | 0.5 | Enterprise domain lookup, may trigger V100 flag |
| Sharepoint URL | 0.5 | Service-specific parsing |
| Microsoft Forms URL | 0.5 | Service-specific parsing |
| Other URL | 0.5 | Ambiguous — requires analysis to determine target service |
| Teams Meeting ID | 0.5 | Teams-specific lookup |
| Teams Meeting URL | 0.5 | Teams-specific parsing + lookup |
| SkypeID | 1.0 | Skype-specific tooling; potential ambiguity with gamertag format |
| Tenant ID | 1.0 | Enterprise — triggers enterprise complexity; limited RS qualified |
| NCMEC Report ID | 1.0 | NCMEC process knowledge required; often CE-related |
| Xbox Gamertag | 1.5 | Xbox-specific tooling; Dale: "probably one of the most tricky ones for people to do"; manual collection (not automated) |
| Serial Number | 1.5 | Device-specific lookup; hardware serial → account mapping is non-trivial |
| XBOX 5x5 Token | 1.5 | Xbox-specific; 5x5 format requires specialized knowledge; also exists for M365 |
| Push Tokens | 1.5 | Mobile-specific; less common; specialized lookup path |
| Other | 1.0 | Unknown type — requires analysis to determine handling |

**Calculation:** Sum the weight of each identifier type present in the case. If a case has 2 email addresses (0.0 + 0.0) and 1 Xbox Gamertag (1.5), the C7 contribution = **1.5**.

**Note on duplication:** If the same identifier type appears multiple times (e.g., 3 email addresses), only count the type weight **once** — the per-identifier count is already captured in C1. C7 measures type diversity/difficulty, not volume.

### Request Type Weights (Component C6)

| Request Type | Weight | Rationale |
|-------------|--------|-----------|
| Preservation | 1.0 | Date change, minimal analysis |
| Consent Release | 1.0 | Straightforward |
| Administrative Subpoena / Summons | 1.5 | Standard processing |
| Civil Demand | 1.5 | Standard |
| Subpoena (standalone) | 1.5 | Standard |
| Grand Jury Subpoena | 1.5 | Standard but with NDO implications |
| Search Warrant | 2.0 | Content-level disclosure, more analysis |
| COPO Order | 2.0 | Court order variant |
| Pen Register / Trap & Trace (PRTT) | 2.0 | Real-time monitoring setup |
| Court Order | 2.5 | Content + analysis + potential appeal |
| International Order / MLAT | 2.5 | Cross-border coordination |
| National Security Letter (NSL) | 2.5 | Classified handling |
| Emergency Letter | 3.0 | Fast but high-touch, requires immediate response |
| Lawful Intercept | 3.0 | Ongoing real-time, multi-day, specialized tooling |

### Complexity Score → Tier Mapping

| Score Range | Tier | Estimated RS Effort | CHI Impact |
|------------|------|--------------------:|------------|
| 0 - 3 | **Quick** | < 1 hour | Qualifies for CHI-5 (if other conditions met) |
| 4 - 8 | **Light** | 1 - 2 hours | CHI-4 typical |
| 9 - 15 | **Medium** | 2 - 4 hours | CHI-4 typical |
| 16 - 25 | **Heavy** | 4 - 8 hours | Promotes to CHI-3 |
| 26+ | **Complex** | 8+ hours / multi-day | Promotes to CHI-3 |

---

## 4. Auto-Escalation Signals (Pass 3 — Continuous)

These run on every case load and on a timer. They can **only promote** (lower the CHI number). They never downgrade.

| Rule | Trigger Signal(s) | Condition | Action | Priority |
|------|-------------------|-----------|--------|----------|
| **Penalty Imminent** | `hasFinancialPenalty`, `dateDue` | `hasFinancialPenalty AND daysUntilDue <= 3` | Escalate to **CHI-1** | Highest |
| **Issuing Authority Deadline** | `deadlineType`, `dateDue` | `deadlineType = "IssuingAuthorityImposed" AND daysUntilDue <= 5` | Escalate to **CHI-1** | Highest |
| **SLA Approaching** | `dateDue`, `slaWarningDays` | `daysUntilDue <= slaWarningDays AND currentCHI > 2` | Escalate to **CHI-2** | High |
| **Unassigned Aging** | `assignee`, `dateEnteredQueue`, `medianCaseAge` | `assignee = null AND daysInSystem > (2 × medianCaseAge)` | **Flag** (no CHI change) | Medium |
| **Blocker Stagnation** | `currentBlockers`, `blockerLastUpdated` | `hasBlockers AND blockerUnchangedDays > 5` | **Flag** (no CHI change) | Medium |
| **Picked But Idle** | `pickState`, `lastActivityAt` | `pickState = "Active" AND daysSinceActivity > 3` | **Flag** (no CHI change) | Low |

### SLA Warning Windows (Request-Type Dependent)

| Request Type Category | SLA Warning (days before due) |
|----------------------|-------------------------------|
| Emergency (Letter, Disclosure) | 1 day |
| Lawful Intercept, PRTT | 3 days |
| Search Warrant, Court Order, NSL, Issuing Authority Order | 7 days |
| All others (Subpoena, Preservation, etc.) | 14 days |

---

## 5. Behavioral Signals (Phase 1 — Seeding CHI)

These are captured passively from how RS and managers work. They don't feed the formula directly but calibrate it over time.

| Signal | How Captured | What It Reveals | Feeds Into |
|--------|-------------|-----------------|-----------|
| **Pick order** | Audit log: which case an RS picks from the available list, and its position | Implicit priority — cases picked out of order signal higher perceived urgency | CHI calibration: if RS consistently pick CHI-3 cases before CHI-2 cases, the scoring may need adjustment |
| **Time-to-pick** | `datePicked - dateEnteredQueue` | How long a case sat before anyone claimed it. Consistently fast-picked cases have characteristics that should map to higher urgency | CHI validation: compare time-to-pick against CHI level |
| **Dwell time** | `dateCompleted - datePicked` | How long an RS worked on a case. Short = simple. Long = complex | Complexity Score calibration |
| **Manager intervention** | Audit log: manager reassigns, escalates, or overrides | Cases that require manager attention were likely misclassified initially | Auto-escalation rule tuning |
| **Release-without-work** | Picked then released with no field changes | RS saw something unexpected after opening — possible misclassification | CHI confidence signal |
| **Override frequency** | CHI override count per assignment group | Which case types are consistently overridden = systematic scoring error | CHI engine refinement |

---

## 6. LDI Extraction Confidence (Modifier)

LDI extraction doesn't change the CHI level directly, but it affects **confidence in the score** and may add to complexity.

| Scenario | CHI Modifier | Complexity Modifier |
|----------|-------------|-------------------|
| All extracted fields high confidence (>90%) | CHI scored at full confidence | No change |
| Mixed confidence (some >90%, some 60-90%) | CHI flagged: "review suggested" | No change |
| Low confidence across multiple fields (<60%) | CHI flagged: "unverified" | +2.0 to complexity (manual work required) |
| Document missing entirely | CHI flagged: "unverified — no document" | +3.0 to complexity (all fields manual) |
| Cross-validation discrepancy found | CHI flagged: "discrepancy detected" | +1.0 to complexity (needs resolution) |

---

## 7. Worked Example — Scoring a Real Case

### Case: LNS-2026-04521

**Scenario:** The FBI Seattle office submits a federal search warrant for 3 target identifiers (2 email addresses + 1 Xbox Gamertag) requesting data from Outlook, Teams, and Xbox. The warrant was served on March 15 and Microsoft received it March 17. The court has set a return date of April 15. There is no financial penalty, but the deadline is court-imposed. The case has a linked preservation from a prior request. During LDI extraction, the system identified the deadline, agency, and identifiers with high confidence but flagged the gamertag at 72% confidence.

### Case Attributes

```
caseId:                "LNS-2026-04521"
requestType:           "Search Warrant"
casePriority:          "Routine" (P2)
crimeType:             "CyberCrime"
country:               "United States"
jurisdiction:          "Federal"
dateServed:            2026-03-15
dateReceived:          2026-03-17
dateEnteredQueue:      2026-03-18  (triage completed in 1 day)
dateDue:               2026-04-15  (issuing authority return date)
deadlineType:          "IssuingAuthorityImposed"
hasFinancialPenalty:   false
penaltyAmount:         null
assigneeName:          "Jessalyn Halbritter"
isThreatToLife:        false
enterpriseDomainFlag:  false

identifiers: [
  { value: "suspect1@outlook.com", type: "Email", createdBy: "LE Agency" },
  { value: "suspect2@hotmail.com", type: "Email", createdBy: "LE Agency" },
  { value: "xb0x_g4m3r_t4g",     type: "Xbox Gamertag", createdBy: "LE Agency" }
]

identifierCountOriginal:      3
identifierCountSupplemental:  0
services:              ["Outlook", "Teams", "Xbox"]
hasLinkedPreservation: true
hasAzure:              false
hasEnterpriseIds:      false

agencyName:            "FBI — Seattle Field Office"
requestorVerification: "Verified"

ldiExtractionConfidence: {
  agencyName:    96%,
  requestType:   94%,
  deadline:      91%,
  identifiers:   [99%, 95%, 72%],   // gamertag at 72%
  overallAvg:    88%
}

currentBlockers:       []
caseState:             "Active"
caseAgingState:        "Normal"  (1 day in system)
```

### Pass 1: CHI Level Evaluation

**Step 1 — CHI-1 check (Immediate consequence):**

| Signal | Value | Condition | Result |
|--------|-------|-----------|--------|
| Issuing authority deadline imminent? | `deadlineType = "IssuingAuthorityImposed"`, `daysUntilDue = 28` | `daysUntilDue <= 5`? | **NO** (28 days remaining) |
| Financial penalty imminent? | `hasFinancialPenalty = false` | — | **NO** |
| Child exploitation? | `crimeType = "CyberCrime"` | `= "ChildExploitation"`? | **NO** |
| Threat to life? | `isThreatToLife = false` | — | **NO** |
| Emergency priority? | `casePriority = "Routine"` | `= "Emergency"`? | **NO** |

**→ Not CHI-1. Move to Step 2.**

**Step 2 — CHI-2 check (Breach risk):**

| Signal | Value | Condition | Result |
|--------|-------|-----------|--------|
| SLA breach approaching? | `daysUntilDue = 28`, `slaWarningDays = 7` (Search Warrant) | `28 <= 7`? | **NO** |
| Financial penalty attached? | `hasFinancialPenalty = false` | — | **NO** |
| Urgent priority? | `casePriority = "Routine"` | `= "Urgent"`? | **NO** |
| Reactivated? | `caseState = "Active"` | `= "Reactivated"`? | **NO** |
| Terrorism? | `crimeType = "CyberCrime"` | `= "Terrorism"`? | **NO** |
| Enterprise domain flagged? | `enterpriseDomainFlagged = false` | — | **NO** |

**→ Not CHI-2. Move to Step 3.**

**Step 3 — CHI-3 check (Resource consumption):**

| Signal | Value | Condition | Result |
|--------|-------|-----------|--------|
| Heavy/Complex complexity? | (need to calculate — see Pass 2 below) | — | **Evaluate after complexity** |
| Multi-service (3+)? | `services = ["Outlook", "Teams", "Xbox"]` → 3 distinct | `>= 3`? | **YES** |

**→ CHI-3 (Significant).** Multi-service case with 3 distinct services qualifies immediately.

**Final CHI Level: CHI-3 (Significant)**

---

### Pass 2: Complexity Score Calculation

| Component | Signal | Value | Weight | Contribution |
|-----------|--------|-------|--------|-------------|
| C1 | Identifier count | 3 original + 0 supplemental = 3 | × 1.0 | **3.0** |
| C2 | Service breadth | 3 distinct services (Outlook, Teams, Xbox) | × 2.0 | **6.0** |
| C3 | Azure involvement | false | +3.0 if true | **0.0** |
| C4 | Enterprise identifiers | false (no TenantID, SubscriptionID) | +2.0 if true | **0.0** |
| C5 | Linked preservation | true | +1.5 if true | **1.5** |
| C6 | Request type weight | Search Warrant | flat | **2.0** |
| C7 | Identifier type complexity | Email (0.0) + Email (0.0) + Xbox Gamertag (1.5) = **1.5** (counted once per type: Email=0.0, Gamertag=1.5) | sum of type weights | **1.5** |
| C8 | Country origin modifier | US | +0.0 (baseline) | **0.0** |
| — | LDI confidence modifier | avg 88%, one field at 72% | mixed → no penalty | **0.0** |
| | | | **TOTAL** | **14.0** |

**Complexity Tier:** 14.0 falls in **9-15 → Medium** (estimated 2-4 hours RS effort)

*Note: The Xbox Gamertag identifier type (C7=1.5) pushed the score from 12.5 to 14.0 — closer to the Heavy threshold. If this case had 2 more identifiers of complex types, it would cross into Heavy (16+) and promote to CHI-3 via complexity alone.*

### Staffing Capacity Check

| Factor | Value |
|--------|-------|
| Assignment Group | US Federal |
| Available RS this week | 5 (Jessalyn, Dale, David, Will, Sarah) |
| Combined throughput | ~22 cases/day |
| Cases in group (unassigned) | 47 |
| Cases ahead of this case in priority | 13 (5 CHI-1 + 8 CHI-2 cases) |
| Days before this case gets worked | 13 / 22 = **0.6 days** |
| Work days until deadline | 28 |
| Capacity breach risk? | **NO** — 0.6 days << 28 days remaining |

If instead this were an **Enterprise** group with only 2 RS and 100 cases:
- Cases ahead: 47 higher-priority
- Days before worked: 47 / 8 = **5.9 days**
- If deadline were April 4 (5 work days): **BREACH RISK → escalate to CHI-2**

---

### Pass 3: Auto-Escalation Check (at current time)

| Rule | Condition | Current State | Fires? |
|------|-----------|---------------|--------|
| Penalty Imminent | `hasFinancialPenalty AND daysUntilDue <= 3` | No penalty | **NO** |
| Issuing Authority Deadline | `deadlineType = "IssuingAuthorityImposed" AND daysUntilDue <= 5` | 28 days remaining | **NO** |
| SLA Approaching | `daysUntilDue <= 7 AND currentCHI > 2` | 28 days remaining | **NO** |
| Unassigned Aging | `assignee = null AND daysInSystem > 2 × median` | Assigned (Jessalyn) | **NO** |
| Blocker Stagnation | `hasBlockers AND blockerDays > 5` | No blockers | **NO** |
| Picked But Idle | `pickState = "Active" AND daysSinceActivity > 3` | Just picked (day 1) | **NO** |

**No escalation at this time.**

---

### Auto-Escalation Projection: What Happens Over Time

| Day | Date | daysUntilDue | What Changes | CHI |
|-----|------|-------------|--------------|-----|
| Day 1 | Mar 18 | 28 | Case enters system, assigned to Jessalyn | **CHI-3** |
| Day 7 | Mar 24 | 22 | RS working case, normal progress | CHI-3 |
| Day 14 | Mar 31 | 15 | Still within SLA warning window (7 days for warrant) | CHI-3 |
| Day 21 | Apr 7 | 8 | Still > 7 days. No escalation. | CHI-3 |
| **Day 22** | **Apr 8** | **7** | **SLA warning triggered** (daysUntilDue = 7 = slaWarningDays for Search Warrant). But CHI-3 is already ≤ 2? No — CHI-3 > 2, so rule fires. | **→ CHI-2** |
| Day 25 | Apr 10 | 5 | **Issuing authority deadline imminent** (daysUntilDue = 5, deadlineType = IssuingAuthorityImposed) | **→ CHI-1** |
| Day 28 | Apr 13 | 2 | CHI-1, maximum urgency | CHI-1 |
| Day 30 | Apr 15 | 0 | **Deadline day** — SLA breach if not completed | CHI-1 + BREACH flag |

---

### Final Score Card

```
┌────────────────────────────────────────────────────────┐
│  LNS-2026-04521                                         │
│  FBI Seattle · Search Warrant · US Federal              │
│                                                         │
│  CHI: 3 (Significant)          Complexity: Medium (12.5)│
│  ███░░ ← 3 of 5                Est. 2-4 hours RS effort │
│                                                         │
│  Identifiers: 3 (0 supplemental)                        │
│  Services: Outlook · Teams · Xbox                       │
│  Preservation: Linked ✓                                 │
│  Deadline: Apr 15 (Issuing Authority) — 28 days remaining│
│  Penalty: None                                          │
│  Agency: FBI Seattle (Verified ✓)                       │
│  LDI: 88% avg confidence (gamertag at 72% ⚠️)           │
│                                                         │
│  Auto-escalation forecast:                              │
│  → CHI-2 on Apr 8 (SLA warning at 7 days)              │
│  → CHI-1 on Apr 10 (issuing authority deadline at 5 days)│
│                                                         │
│  Age: 1 day (Normal)                                    │
│  Blockers: None                                         │
│  Assigned: Jessalyn Halbritter                          │
└────────────────────────────────────────────────────────┘
```

---

## 8. Complete Signal Index (All 87 Signals)

### Category A: Urgency Signals (CHI Level — Pass 1)

| # | Signal | Type | CHI Impact | Phase |
|---|--------|------|-----------|-------|
| A1 | Issuing authority deadline proximity | Derived (time) | CHI-1 if ≤ 5 days | 2 |
| A2 | Financial penalty + deadline proximity | Derived (time) | CHI-1 if ≤ 7 days | 2 |
| A3 | Child exploitation crime type | Static attribute | Always CHI-1 | 2 |
| A4 | Threat to life flag | Static attribute | Always CHI-1 | 2 |
| A5 | Emergency priority (P0) | Static attribute | Always CHI-1 | 2 |
| A6 | eEvidence emergency flag | Static attribute | Always CHI-1 | 2 |
| A7 | SLA warning window proximity | Derived (time) | CHI-2 | 2 |
| A8 | Financial penalty attached (any) | Static attribute | CHI-2 | 2 |
| A9 | Urgent priority (P1) | Static attribute | CHI-2 | 2 |
| A10 | Case reactivated | Derived (state) | CHI-2 | 2 |
| A11 | Terrorism crime type | Static attribute | CHI-2 | 2 |
| A12 | Enterprise domain flagged (V100) — submitted | Static attribute | CHI-2 | 4 |
| A13 | **Resolved enterprise account + domain registry match** | Derived (post-lookup) | Takes most severe urgency floor from matched registries (e.g., V100=CHI-2, Sanctions=CHI-1) | 2 |
| A14 | **Staffing capacity breach risk** | Derived (systemic) | CHI-2 if case unreachable before deadline at current staffing | 4+6 |
| A15 | **High-urgency country origin** | Static attribute | India = minimum CHI-2 on entry; EU eEvidence = tighter escalation windows | 2 |
| A15 | Heavy/Complex complexity tier | Derived (formula) | CHI-3 | 2 |
| A16 | Multi-service (3+) | Derived (count) | CHI-3 | 2 |
| A17 | High identifier count (25+) | Derived (count) | CHI-3 | 2 |
| A18 | Azure + medium+ complexity | Derived (compound) | CHI-3 | 2 |
| A19 | Single identifier + single service + routine type | Derived (compound) | CHI-5 | 2 |

### Category B: Effort Signals (Complexity Score — Pass 2)

| # | Signal | Type | Weight | Phase |
|---|--------|------|--------|-------|
| B1 | Identifier count (original) | Derived (count) | 1.0 per | 1 |
| B2 | Identifier count (supplemental) | Derived (count) | 1.0 per | 1 |
| B3 | Distinct service count | Derived (count) | 2.0 per | 1 |
| B4 | Azure involvement | Boolean | +3.0 | 1 |
| B5a | Enterprise identifier types (submitted) | Boolean | +2.0 | 1 |
| B5b | **Resolved enterprise account type** | Boolean (from CLASS v2) | +2.0 | 2 |
| B5c | **Domain registry match bonus** | Derived (sum across matched registries) | Varies per registry (V100=+3.0, Gov=+2.0, etc.) | 2 |
| B6 | Linked preservation | Boolean | +1.5 | 1 |
| B7 | Request type weight | Lookup (1.0-3.0) | Varies | 1 |
| B8 | **Identifier type complexity** | Lookup per type (0.0-1.5) | Sum of unique type weights | 1 |
| B9 | **Country origin modifier** | Lookup (0.0-2.5) | Flat bonus per country/region | 2 |
| B10 | LDI low confidence penalty | Derived (confidence) | +2.0 or +3.0 | 2 |
| B11 | LDI cross-validation discrepancy | Derived (comparison) | +1.0 | 2 |

### Category C: Temporal Signals (Auto-Escalation — Pass 3)

| # | Signal | Type | Trigger | Phase |
|---|--------|------|---------|-------|
| C1 | Days until due date | Derived (time) | SLA/penalty/issuing authority rules | 2 |
| C2 | Days in system (unassigned) | Derived (time) | Unassigned aging rule | 2 |
| C3 | Days blocker unchanged | Derived (time) | Stagnation rule | 2 |
| C4 | Days since last activity | Derived (time) | Idle rule | 2 |
| C5 | Median case age (system-wide) | Derived (aggregate) | Aging threshold | 6 |
| C6 | SLA warning window (per request type) | Config (lookup) | SLA rule | 2 |

### Category D: Deadline & Date Signals

| # | Signal | Type | Used By | Phase |
|---|--------|------|---------|-------|
| D1 | Date due (`dateDue`) | Static or auto-calculated | CHI steps 1-2, escalation | 1-2 |
| D2 | Deadline type | Static attribute | CHI step 1 | 1 |
| D3 | Date received | Static (from LE) | Default due date calculation | 1 |
| D4 | Date served | Static (legal demand date) | Reference | 1 |
| D5 | Date entered system | System timestamp | Aging calculation | 1 |
| D6 | Jurisdiction-based default due date | Derived (from D3 + jurisdiction) | Populates D1 if blank | 2 |
| D7 | Task-level deadline (ETSI) | Static per task | eEvidence task CHI | 2 |

### Category E: Classification Signals

| # | Signal | Type | Used By | Phase |
|---|--------|------|---------|-------|
| E1 | Request type | Static attribute | Complexity weight, CHI-5 check | 1 |
| E2 | Request sub-type | Static attribute | Granular classification | 1 |
| E3 | Crime type | Static attribute | CHI steps 1-2 | 2 |
| E4 | Case priority (legacy P0-P2) | Static attribute | CHI steps 1-2 | 1 |
| E5 | Country | Static attribute | Default due date, jurisdiction | 1 |
| E6 | Jurisdiction | Static attribute | Default due date | 1 |
| E7 | Agency type (intelligence vs LE) | Static attribute | Reporting, routing | 1 |
| E8 | Nature of crimes (array) | Static attribute | Context for crime type | 1 |

### Category F: Verification & Confidence Signals

| # | Signal | Type | Used By | Phase |
|---|--------|------|---------|-------|
| F1 | Requestor verification status | Derived (verification) | CHI confidence | 2 |
| F2 | Agency registry match | Derived (lookup) | Deduplication, verification | 2 |
| F3 | LDI overall extraction confidence | Derived (avg) | CHI confidence flag | 2 |
| F4 | LDI per-field confidence | Derived (per entity) | Individual field trust | 2 |
| F5 | LDI cross-validation result | Derived (comparison) | Discrepancy flag | 2 |
| F6 | Account existence check result | Derived (API call) | NSU detection, complexity | 2 |
| F7 | **Resolved account type** | Derived (CLASS v2 response) | Enterprise detection, complexity, escalation | 2 |
| F8 | **Resolved enterprise domain** | Derived (CLASS v2 response) | V100 match, attorney escalation trigger | 2 |
| F9 | **Domain registry matches** | Derived (multi-registry lookup) | Per-registry urgency floor, complexity bonus, escalation targets | 2+4 |

### Category G: Assignment & Ownership Signals

| # | Signal | Type | Used By | Phase |
|---|--------|------|---------|-------|
| G1 | Assigned to (current owner) | Static (user) | Unassigned aging rule | 1 |
| G2 | Pick state (Available/Staged/Active) | Derived (state) | Idle rule, caseload | 4 |
| G3 | Current blockers | Static (array) | Stagnation rule | 1 |
| G4 | Case aging state | Derived (from D5) | Metric exclusion | 2 |

### Category H: Behavioral Signals (Calibration — Passive)

| # | Signal | Type | Used By | Phase |
|---|--------|------|---------|-------|
| H1 | Pick order (position in list when picked) | Behavioral (audit log) | CHI calibration | 1 |
| H2 | Time-to-pick | Behavioral (audit log) | CHI validation | 1 |
| H3 | Dwell time (pick to completion) | Behavioral (audit log) | Complexity calibration | 1 |
| H4 | Manager intervention frequency | Behavioral (audit log) | Escalation rule tuning | 1 |
| H5 | Release-without-work frequency | Behavioral (audit log) | Misclassification signal | 1 |
| H6 | CHI override frequency per group | Behavioral (audit log) | Scoring error detection | 2 |

### Category I: System Context & Staffing Signals

| # | Signal | Type | Used By | Phase |
|---|--------|------|---------|-------|
| I1 | Operating mode (Normal/Elevated/Surge/Crisis) | Derived (aggregate) | Escalation threshold adjustment | 6 |
| I2 | CHI-1 backlog size (system-wide) | Derived (aggregate) | Crisis trigger | 6 |
| I3 | Assignment group health status | Derived (aggregate) | Mode escalation | 6 |
| I4 | **Available RS for group** | Derived (qualifications + leave) | Capacity breach risk calculation | 4+6 |
| I5 | **Total capacity per day (group)** | Derived (RS throughput sum) | Capacity breach risk calculation | 4+6 |
| I6 | **Cases ahead in priority** | Derived (CHI sort position) | Per-case reachability estimate | 2+4 |
| I7 | **Days before case gets worked** | Derived (I6 / I5) | Capacity-driven escalation trigger | 2+4 |
| I8 | **Staffing coverage ratio** | Derived (available / required) | SPOF detection, capacity flag | 6 |

### Category J: Override Signals

| # | Signal | Type | Used By | Phase |
|---|--------|------|---------|-------|
| J1 | CHI override applied (boolean) | Metadata | Display, audit | 2 |
| J2 | Original CHI (pre-override) | Metadata | Audit trail | 2 |
| J3 | Override justification | Metadata | Audit, pattern analysis | 2 |
| J4 | Override author + timestamp | Metadata | Audit trail | 2 |

---

## 9. Signal Count Summary

| Category | Count | Description |
|----------|------:|-------------|
| A: Urgency (CHI Level) | 21 | Decision tree inputs (includes: staffing capacity breach, country origin, resolved enterprise + V100 domain) |
| B: Effort (Complexity) | 14 | Weighted formula components (includes: identifier type complexity, country origin, resolved account type, V100 domain match) |
| C: Temporal (Escalation) | 6 | Time-based promotion triggers |
| D: Deadlines & Dates | 7 | Date fields and derived calculations |
| E: Classification | 8 | Case metadata categories |
| F: Verification & Confidence | 9 | LDI, requestor, and account resolution signals (includes: resolved account type, domain, V100 match) |
| G: Assignment & Ownership | 4 | State and blocker signals |
| H: Behavioral (Calibration) | 6 | Passive learning signals |
| I: System Context & Staffing | 8 | Aggregate system state + staffing capacity signals |
| J: Override | 4 | Manual override metadata |
| **Total** | **87** | **Deduplicated unique signals** |
