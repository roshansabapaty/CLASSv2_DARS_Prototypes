# DARS — Manual Collection via Standalone Tools

**Product specification for front-end and back-end engineering**

| Field | Value |
|---|---|
| Status | Draft for engineering review |
| Author | Product (DARS / LENS) |
| Date | 2026-06-16 |
| Applies to | DARS Fulfillment & Collection (UK COPO / TS 103 120 **and** eEvidence / TS 104 144) |
| Source of truth (code) | `src/config/lensServicesConfig.ts`, `src/components/ManualCollectionForm.tsx`, `src/components/ManualServiceCategories.tsx`, `src/components/CollectionTracker.tsx`, `src/types/caseTypes.ts`, `src/constants/collectionBoundaries.ts` |
| Grounding (product) | `docs/eEvidence_MVP_Spec.md` §4 (Workload Integration exclusion), `docs/LE_EXTERNAL_SERVICE_MAPPING.md` |

> **Decisions baked into this spec** (confirmed with PM, 2026-06-16):
> 1. **Upload model = pointer + status now, ingest as roadmap.** MVP records a *pointer* to externally-staged data (Content Boundary + SAS token) plus per-category status; DARS does **not** ingest file bytes at MVP. True in-app upload is specified as a forward-looking roadmap section (§12), not MVP.
> 2. **Tool coverage = generic spine + per-tool appendix.** One canonical tool-agnostic flow (§6–§9), with a per-named-tool appendix (§Appendix A) for CRM, Compliance Portal, the OneDrive Tool, and partner teams (Xbox/Minecraft).
> 3. **Program scope = program-agnostic core + eEvidence delivery.** Manual collection mechanics are shared; eEvidence-specific delivery/SLA interplay is isolated in §11.

---

## 1. Why this scenario exists (the problem)

DARS orchestrates the **collection → publish → delivery** pipeline for legal demands. For most modern Microsoft services, LENS exposes a **programmatic collection API**: the Response Specialist (RS) selects data categories, submits, and an automated job runs, lands data, and advances the pipeline with no human collection step.

**A material subset of services and data types has no programmatic collection path.** For these, the data lives in systems LENS does not (yet) automate against. To collect them, an RS must leave DARS, operate a **standalone external tool** (CRM, the Compliance Portal, the OneDrive Tool), or task a **partner team** (e.g., the Xbox/Minecraft compliance team), retrieve the data there, stage it in an approved storage location, and then return to DARS to record what happened so the data can re-enter the pipeline for publish and delivery.

This is not a temporary gap. The eEvidence MVP spec is explicit (`docs/eEvidence_MVP_Spec.md` §4, *Workload Integration*):

> *"Integration of any new workloads are out of scope. Existing manual processes for data collection will continue to remain. Phase 2 – eEvidence will ensure parity for all automated services that exist today in CRM, Compliance Portal and OneDrive Tool."*

**So DARS must do two things at once:**
- **Not break** the existing manual collection processes that already run outside DARS.
- **Wrap** those manual processes in a first-class DARS surface so that manually-collected data is tracked, audited, SLA-counted, and delivered through the *same* pipeline and case record as automated data — with no second-class status.

The user-facing consequence: an RS working a single case will frequently have **some categories collected automatically and others collected manually, on the same identifier, at the same time.** The product must make that split obvious, must tell the RS exactly which items need a trip to an external tool, and must give them a clean way to report status and the staged-data location back into the case.

### 1.1 Goals

| # | Goal |
|---|---|
| G1 | Make it unambiguous, at selection time, **which data types require an external tool** and which are automated. |
| G2 | Give the RS a guided surface to **record manual collection status** per data category through the full C→P→D pipeline. |
| G3 | Capture **where the staged data lives** (Content Boundary + collection point + SAS token) so publish/delivery can locate it. |
| G4 | Keep manually-collected categories **inside the same case, audit trail, SLA clock, and delivery pipeline** as automated categories. |
| G5 | Preserve **chain of custody and attribution** (who set what status, when) for every manual action. |
| G6 | Do all of the above **without requiring any change to the external tools themselves.** |

### 1.2 Non-goals (MVP)

- DARS does **not** ingest, store, scan, or hash the collected file bytes at MVP (see §12 roadmap).
- DARS does **not** automate or replace the external tools.
- DARS does **not** validate that the staged data actually matches the order — the RS attests to that.

---

## 2. Personas

| Persona | Role in this flow |
|---|---|
| **Response Specialist (RS / LERS)** | Primary actor. Selects categories, identifies which are manual, operates the external tool, stages data, records status + location in DARS. |
| **Partner/Workload team** (e.g., Xbox/Minecraft compliance) | Performs collection for services DARS routes to them; returns staged data + location out of band. The RS records their result. |
| **Ops Manager** | Monitors manual-collection backlog and SLA exposure; manual jobs are the most SLA-risky because they depend on human/partner turnaround. |
| **Attorney** | Indirectly affected — manual categories can be in scope of enterprise/Form 3 review, but the attorney does not perform collection. |
| **Back-end / LENS-API** | Derives boundaries from account-check results, persists status/location, mints/scopes SAS tokens to the collection point, advances publish/delivery, writes audit entries. |

---

## 3. Core concepts & glossary

These terms are used precisely throughout the spec and map directly to code.

| Term | Definition | Where it lives in code |
|---|---|---|
| **Automated flag** | Per-data-category-item boolean. `automated: true` → programmatic collection exists. `automated: false` → **manual collection required (external tool).** Absent/undefined → treated as automated (see §4.3 data-quality note). | `CategoryItemConfig.automated` in `lensServicesConfig.ts` |
| **`isManualCategory(serviceKey, "group:item")`** | The single resolver that decides manual vs automated for any category. Returns `true` only when the item's `automated === false`. **This function is the contract** — every surface keys off it. | `lensServicesConfig.ts` |
| **Data category item ("data type")** | The leaf unit the RS selects and collects, e.g. *Detailed Billing*, *Strike Logs*, *OneDrive Content*. Grouped under a **category group** (Subscriber / Authentication / Traffic / Content). | `SERVICE_CATEGORY_GROUPS` |
| **Job** | A single (identifier × service × category) unit of work, with its own `jobId` and C/P/D status. Manual and automated jobs share the same shape. | `SubCategory` in `caseTypes.ts` |
| **Content Boundary** | The LENS region bucket where collection runs / data is staged. Exactly **10**: United States, Europe, United Kingdom, Asia Pacific, Brazil, India, Canada, France, Switzerland, Mexico. | `COLLECTION_BOUNDARIES` |
| **Storage Location → Boundary** | The account's Azure storage location (from the account check) rolls up to one of the 10 boundaries. | `mapStorageLocationToCollectionBoundary()` |
| **Collection Point** | The concrete staging URL the RS deposits data into: `https://sdrmsagain{boundary}.blob.core.windows.net/cpt/{identifier}`. | `getCollectionPointPath()` in `ManualCollectionForm.tsx` |
| **SAS Token** | A scoped, time-boxed access token to the collection point. DARS surfaces a **Copy SAS Token** action so the RS/partner can write the staged data into the right container. | `handleCopySASToken()` |
| **C → P → D pipeline** | Collection → Publish (Package) → Delivery. Manual jobs traverse the identical pipeline; only the **Collection** step is performed by a human. | `getCurrentStage()` |

---

## 4. The critical inventory — what requires external tooling

> **This is the heart of the spec.** Engineering must treat this list as the canonical set of services / data categories / data types that cannot be collected programmatically and therefore route through the manual surface. It is generated from `lensServicesConfig.ts` (`automated: false`). **The config is the runtime source of truth** — this table is its human-readable projection and must be regenerated whenever the config changes.

### 4.1 Fully-manual services (every selectable data type is manual)

| Service (`key`) | Account type | Manual data types (category group → item) |
|---|---|---|
| OneDrive for Business (`oneDriveForBusiness`) | Enterprise | Content → OneDrive Content |
| SharePoint Online (`sharePointOnline`) | Enterprise | Content → SharePoint Content |
| DevTunnels (`devTunnels`) | — | Traffic → Device Info; Content → DevTunnels Content |
| BitLocker (`bitlocker`) | — | Content → BitLocker Key |
| Azure Storage (`azureStorage`) | Enterprise | Traffic → ARM Logs / Netflow IP; Content → Blobs / Sites / File Shares / Tables & Queues; Content → Unified Audit Logs |
| Azure VM Disks (`azureVMDisks`) | Enterprise | Traffic → ARM Logs / Netflow IP / VIP History; Content → Azure VMs & Disks; Content → Unified Audit Logs |
| CoPilot Consumer (`coPilotConsumer`) | Consumer | Content → CoPilot Prompts & Responses |
| CoPilot Enterprise (`coPilotEnterprise`) | Enterprise | Content → CoPilot Prompts & Responses / Tenant ID |
| Xbox (`xbox`) | Consumer | Subscriber → Basic Subscriber Data; Auth → Basic Authentication/IP; Traffic → Strike Logs / Purchase History / PrePaid Balance; Content → Profile Photo / Clubs / Contacts / Content / Video / Voice |
| Skype (`skype`) | Consumer | Content → Contact List / Skype Buddy List |
| Microsoft Ads (`microsoftAds`) | — | Content → Domain Names / Keywords |
| Bing Search (`bingSearch`) | — | Content → Bing Search Query Content |
| GroupMe (`groupMe`) | Consumer | Content → GroupMe Chat Content |
| Minecraft (`minecraft`) | Consumer | Traffic → Purchase History; Content → Minecraft Content |
| Microsoft Forms (`microsoftForms`) | — | Subscriber → Associated Account Information |
| Production Letters (`productionLetters`) | UK COPO scope | Disclosure Letters → Affidavit *(manual document upload — see §10)* |

### 4.2 Mixed services (automated **and** manual data types on the same service)

These are the highest-UX-risk services: on one identifier, the RS will see some categories advance automatically while others demand an external-tool trip.

| Service (`key`) | Automated data types | **Manual** data types |
|---|---|---|
| MSA Profile (`msaProfile`) | Basic Subscriber Data, Date of Birth, Gender, Device Info, Basic Authentication/IP | **Basic Billing**, **2FA/MFA/Proof**, **Push Tokens**, **Detailed Billing**, **Reverse 2FA**, **Reverse IP** |
| EntraID Profile (`entraIDProfile`) | Basic Subscriber Data, Language, DoB, Device Info, Gender, Basic Authentication/IP | **Basic Billing**, **List of Accounts**, **List of Domains**, **Detailed Billing**, **Password Change History**, **Advertising Information**, **Reverse 2FA**, **Reverse IP** |
| Exchange Enterprise (`exchangeEnterprise`) | Email Headers (Non-Content), Email Content, Email Headers, Contacts, Calendar | **Password Change History** |
| Teams for Business (`teamsForBusiness`) | Generic Content (chat) | **2FA/MFA/Proof** |
| Teams for Life (`teamsForLife`) | Generic Content (chat) | **Teams Live Intercept** |
| OneDrive Consumer (`oneDriveConsumer`) | Generic Traffic Data (API Logs) | **OneDrive Content** |

### 4.3 Data-quality note (must resolve with config owner)

`isManualCategory` returns `true` **only** when `automated === false`. Items with **no** `automated` field default to the automated path. Today that affects:
- `msaProfile` → Content → **Unified Audit Logs** has no `automated` flag → currently treated as **automated**, whereas the same item on `azureStorage`/`azureVMDisks` is explicitly `automated: false` (manual). This inconsistency is likely a config gap. **Engineering should not "fix" this in code** — flag it to the config/CSV owner (`lens_Services_DataCategoryGroups_DataCategories.csv`) so the source data is corrected; the code behavior is correct given the data.

---

## 5. End-to-end flow (the spine)

```
                  ┌─────────────────────── DARS ───────────────────────┐
  TRIAGE          │ Step 2: Services & Categories                       │
                  │   • RS selects data categories per identifier       │
                  │   • isManualCategory() tags each → 🔧 Manual badge   │
                  ▼                                                      │
  PLAN / SUBMIT   │ Step 3: Plan Review                                  │
                  │   • Account check → Storage Location → Boundary      │
                  │   • Submit to Collection → jobs created (C status)   │
                  ▼                                                      │
  COLLECTION      │ Collection Tracker                                   │
                  │   ┌─ 🔧 Manual Collection Services (amber) ────────┐  │
   ── RS leaves ──┼──▶│  per-category status, Content Boundary,        │  │
   DARS, uses     │   │  Copy SAS Token, Collection Notes              │  │
   external tool  │   └───────────────────────────────────────────────┘  │
   ── RS returns ─┼──▶ RS sets Collection = Complete + records boundary   │
                  ▼                                                      │
  PUBLISH (P)     │ Manual job re-enters the SAME pipeline as automated  │
  DELIVERY (D)    │ Package → Deliver (eEvidence: push to IA, §11)       │
                  └─────────────────────────────────────────────────────┘
                       Every step writes to the immutable Audit Thread
```

The defining property: **the human step is confined to Collection.** Once the RS marks a manual category `Complete` and records its Content Boundary, the job is indistinguishable from an automated job for Publish and Delivery. This is why DARS can keep one pipeline, one SLA clock, one delivery path.

---

## 6. Screen-by-screen UX specification

Each screen below states **what the RS sees**, **what they do**, and — per your requirement — **why** the design is shaped that way.

### 6.1 Step 2 — Services & Category Configuration (Triage)

**What:** The RS enables services on an identifier and selects data categories within each. Every category item is evaluated by `isManualCategory()`. Manual items render a **🔧 Manual** badge (amber) inline next to the category.

**Actions:**
- Select/deselect categories (manual and automated selected identically — no separate workflow).
- Hover the 🔧 badge → tooltip: *"This data type has no automated collection. It will be collected manually using an external tool and tracked in the Collection stage."*

**Why:**
- **Set expectations at the earliest decision point.** The RS commits effort and SLA risk the moment they select a category. Surfacing "manual" here — not three steps later in Collection — lets them plan partner asks and lead times up front (G1).
- **No separate selection workflow** for manual items, because the *order* doesn't care how Microsoft collects the data. Splitting selection by collection method would leak an internal implementation detail into the legal-scope decision. The split belongs in *fulfillment*, not *scope*.
- **Mixed services are the reason the badge is per-item, not per-service.** A per-service "manual" label would be wrong for MSA Profile (mostly automated, a few manual items). Per-item badging is the only honest representation (§4.2).

### 6.2 Step 3 — Plan Review (boundary derivation)

**What:** Per identifier, DARS shows the account check result, **Storage Location**, and the derived **Collection Boundary** (one of the 10). For manual categories this boundary is the *suggested* staging region.

**Actions:**
- Run account check (if not already run) → populates `checkAccounts.dataLocation`, `accountType`, `primaryIdentifier`.
- Submit to Collection → creates jobs; collection status starts at `Not Started`.

**Why:**
- **Storage Location ≠ Collection Boundary.** Storage Location is where the account physically lives (fine-grained Azure region); Collection Boundary is the coarser LENS bucket the collection actually runs in (`mapStorageLocationToCollectionBoundary`). The RS must stage manual data in the *boundary*, so DARS pre-derives it rather than making the RS translate Azure regions by hand. When derivation fails, DARS renders "—" instead of guessing (the helper returns `undefined`) — a wrong boundary would stage data in the wrong jurisdiction.
- Deriving the boundary **before** Collection means the manual surface can pre-fill it, shrinking RS effort and error at the moment of staging.

### 6.3 Collection Tracker — the manual surface

This is where the manual workflow lives. The tracker splits jobs:

```
formData.identifiers → for each service → for each enabled category:
    isManualCategory(serviceKey, categoryKey)
        ? manualJobs   (grouped by identifier+service)
        : automatedJobs
```

Manual jobs render in a dedicated, **visually distinct amber section** ("🔧 Manual Collection Services ({n})") above the automated "Fulfillment Tracker". Two presentations exist in the codebase and serve different layouts:

- **`ManualCollectionForm`** — a per-(identifier×service) card showing all that service's manual categories together, with a shared Content Boundary picker, Copy SAS Token, per-category status dropdowns, the C→P→D pipeline, and Collection Notes.
- **`ManualServiceCategories`** — a denser, per-category inline-expand row variant (Data Type / Account Type / Date Range / Created / Job IDs / Phase Status / Updated + Edit), used in the by-identifier view. Same fields, same save contract.

> **FE note:** these must stay behaviorally identical (same statuses, same validation, same save payload). Treat one as the canonical model and the other as a layout variant; do not let their rules drift.

#### 6.3.1 Fields & controls (per manual job)

| Control | Values / behavior | Why |
|---|---|---|
| **Content Boundary** (region select) | The 10 `COLLECTION_BOUNDARIES`. Pre-filled from derived boundary when available. | The publish/delivery step must know which staging container holds the data. Region also encodes jurisdiction — a legal, not cosmetic, choice. |
| **Copy SAS Token** | Copies a scoped token to `https://sdrmsagain{boundary}.blob.core.windows.net/cpt/{identifier}`. Disabled until a boundary is chosen. | Lets the RS/partner *write* the externally-collected files into the exact container DARS will read. Tooltip surfaces the collection-point path so the RS can verify destination. |
| **Collection Status** (per category) | `Not Started` · `In Progress` · `Complete` · `No Data` · `Failed` · `Blocked` | Mirrors the automated lifecycle so manual and automated jobs report status in one vocabulary. `No Data`/`Failed` are terminal; `Blocked` flags an external dependency (e.g., partner team stalled). |
| **Collection Notes** | Rich text + attachments (`NoteFieldEditor`, `subType: "manual-collection"` / `"manual-service"`). | Manual collection is where human context lives: which tool, who was tasked, ticket numbers, why "No Data". This is operational memory **and** part of the case record. |
| **Pipeline C→P→D** | Read-only visual; advances as P/D statuses populate. | Reassures the RS that a manual job is a first-class pipeline citizen, not a dead-end. |
| **Save Status Update** | Persists status + boundary + notes; stamps `lastUpdatedBy` + `lastUpdatedAt`. | Attribution and chain of custody (G5). |

#### 6.3.2 Validation rules (must be enforced FE **and** BE)

1. **Content Boundary is required when any category in the card is `Complete`.** Rationale: a "Complete" collection with no staging location is undeliverable — publish/delivery would have nowhere to read from. Enforced in both components (`isLocationRequired = anyCompleted`); BE must reject a Complete-without-boundary save as defense in depth.
2. **Terminal states lock the row.** `Delivery = Complete`, `Collection = No Data`, or `Collection = Failed` make the entry non-editable (no Edit affordance). Rationale: once data is delivered or formally declared absent, re-opening collection silently would corrupt the audit narrative.
3. **In-pipeline lock.** Once Publish/Delivery has started, Collection Status renders as a read-only badge (with an attribution tooltip), not a dropdown. Rationale: you cannot "un-collect" data that is already being packaged or delivered.
4. **Unsaved-changes guard.** The card shows "Unsaved changes" / "All changes saved" and a Reset. Rationale: manual entry is deliberate; accidental navigation must not silently drop a status the RS believes they recorded.

**Why the whole surface is amber + 🔧:** automated jobs are blue; manual jobs are amber with a wrench. The color/iconography is a constant signal that *a human is the collection engine here* — different failure modes (partner SLA, tool outage), different turnaround, different attention. Operationally, manual jobs are the backlog Ops watches most closely, so they are pulled to the **top** of the tracker.

### 6.4 The "leave DARS" moment (explicitly designed, not incidental)

Between marking `In Progress` and `Complete`, the RS performs the actual collection in an external tool. DARS supports this gap deliberately:
- **Copy SAS Token** + collection-point tooltip give the RS everything needed to deposit data in the right place.
- **Collection Notes** capture what was done out of band (tool, ticket, contact), so the case record reflects work that physically happened elsewhere.
- **`Blocked`** status names the common reality that the RS is waiting on someone else.

This is the product's answer to "how does DARS support users who must use standalone tools": it **brackets** the external work — handing off a precise destination on the way out, and capturing status + location + narrative on the way back in — so the case never loses the thread even though the collection happened in another system.

---

## 7. Data model & FE/BE contract

### 7.1 Per-job (category) shape — `SubCategory` (`caseTypes.ts`)

```ts
interface SubCategory {
  enabled: boolean;
  taskId: string;
  startDate?: Date; endDate?: Date;     // fulfillment plan coverage
  createdOn?: Date;
  jobId?: string;                       // Collection job
  identifierId?: string;
  collectionStatus?: "Not Started" | "Started" | "Complete" | "No Data" | "Failed" | "Cancelled";
  publishStatus?:    "Not Started" | "Started" | "Complete" | "Failed" | "Cancelled";
  deliveryStatus?:   DeliveryStatus;    // eEvidence adds DeliveryAcknowledged/Failed (WISP callback)
  publishJobId?: string; deliveryJobId?: string;
  collectionStatusUpdatedAt?: Date;
  publishStatusUpdatedAt?: Date;
  deliveryStatusUpdatedAt?: Date;
}
```

> **Status-vocabulary caveat (FE/BE must align):** the **persisted** model uses `"Started"` for in-progress; the **UI** labels it `"In Progress"`. The manual components map between them (`Started ↔ In Progress`). Pick one wire value (`Started`) and keep the label-mapping strictly in the view layer. Do not persist `"In Progress"`.

### 7.2 Per-(identifier×service) manual fields (`caseTypes.ts`)

```ts
collectionMethod?: "automated" | "manual";   // service-level hint; authoritative split is isManualCategory()
dataLocation?: string;                        // selected Content Boundary (region key)
collectionNotes?: string;
manualStatusLastUpdatedBy?: string;
manualStatusLastUpdatedAt?: Date;
```

### 7.3 The save payload (FE → BE) — from `onStatusUpdate`

```ts
onStatusUpdate(identifierId, serviceKey, {
  dataLocation: string,                 // Content Boundary region key
  collectionNotes: string,
  categoryUpdates: Record<categoryKey, {
    collectionStatus: string,           // wire value (Started, Complete, …)
    lastUpdatedBy: string,
    lastUpdatedAt: Date,
  }>,
})
```

**BE must, on receipt:** persist status + boundary + notes; set `lastUpdatedBy/At` from the authenticated principal (do **not** trust the client's `"Current User"` placeholder — that is a mock); write an audit entry per category status transition; and run the §6.3.2 validation as a hard gate.

### 7.4 Inputs BE must provide to FE

- `checkAccounts.{dataLocation, accountType, primaryIdentifier}` per identifier (drives boundary derivation + the card's "Check Accounts Information" panel).
- A **real SAS token** scoped to the collection point (read for verification, write for staging) with a short expiry. The current `MockSASTokenSignature…` string is a placeholder; the token-minting endpoint is a BE deliverable.
- Job IDs (`jobId`, `publishJobId`, `deliveryJobId`) for C/P/D.

---

## 8. Back-end responsibilities

| # | Responsibility | Detail |
|---|---|---|
| BE1 | **Boundary derivation** | Expose / persist the storage-location→boundary roll-up consistent with `mapStorageLocationToCollectionBoundary`. The mapping table should live server-side long-term so it can change without a FE deploy (mirror the open-question pattern in `LE_EXTERNAL_SERVICE_MAPPING.md`). |
| BE2 | **Collection point + SAS** | Provision the per-(boundary,identifier) container `cpt/{identifier}` and mint scoped, time-boxed SAS tokens on demand. Tokens must be least-privilege and audit-logged at issuance. |
| BE3 | **Status persistence + validation** | Enforce §6.3.2 rules server-side. Reject Complete-without-boundary, edits to terminal/in-pipeline jobs, and status writes after case `Resolved`/`WithdrawalConfirmed`. |
| BE4 | **Pipeline continuity** | A manual job marked `Collection = Complete` must become eligible for Publish exactly as an automated job does — same publish/delivery code path keyed on the staged boundary/container. |
| BE5 | **Audit** | Every manual status transition, boundary set, SAS issuance, and note edit → immutable audit entry (UTC, actor, before→after). Aligns with eEvidence MVP audit requirement (7-yr retention). |
| BE6 | **Attribution** | `lastUpdatedBy/At` set from the authenticated identity, never the client. |
| BE7 | **SLA neutrality** | Manual jobs count toward the same case SLA clock; no special exemption. `Blocked` does **not** stop the statutory clock (only GFR/non-execution holds do, per MVP spec). Surface manual `Blocked` jobs to Ops as SLA risk. |

---

## 9. State machine (per manual category)

```
Not Started ──▶ Started(In Progress) ──▶ Complete ──▶ [Publish] ──▶ [Delivery]
     │                  │                    ▲
     │                  ├──▶ No Data ────────┘ (terminal: nothing to deliver)
     │                  ├──▶ Failed   ────────  (terminal: collection could not complete)
     │                  └──▶ Blocked  ────────  (transient: waiting on external tool/partner)
     └────────────────────────────────────────  Cancelled (task/EPOC cancellation)
```

- **`Complete` requires Content Boundary** (§6.3.2-1).
- **`No Data` / `Failed`** are terminal at Collection — the job will not be delivered; `No Data` should still be reportable to the authority (and, for eEvidence preservation, surfaced as a per-category unavailability note — see MVP `DataPreserved` semantics).
- **`Blocked`** is the explicit "human is waiting" state; it keeps the job visible and SLA-counted.
- **`Cancelled`** flows from task/EPOC cancellation; once cancelled, no new categories may be added (per MVP cancellation guards).

---

## 10. Special case — Production Letters / Affidavit (document, not data)

`productionLetters` (UK COPO, `requestTypeScope: ["COPO Order"]`) is auto-enabled on every identifier of a COPO order. Its single item, **Affidavit**, is `automated: false` and is described in config as a **manual upload attached to the identifier's collection notes via the manual collection form.**

This is a deliberate reuse: rather than build a separate document surface, an authority-side *deliverable document* rides the **same** manual-collection mechanism (status + attachment in Collection Notes). 

**Why it matters for engineering:** the manual surface is not only for "service data" — it is the generic vehicle for any item that a human must produce and stage. The Affidavit demonstrates the §12 ingest roadmap in miniature (it genuinely wants an attached file, not just a pointer). Config comments flag the long-term intent to move this to a case-level Documents viewer; **do not hard-wire Affidavit logic into the manual-collection components** — keep it config-driven so the migration is clean.

---

## 11. eEvidence delivery specifics (program-scoped)

Manual collection is program-agnostic; **delivery** is where eEvidence diverges. Once a manual job reaches `Collection = Complete` and enters Publish → Delivery:

- **≤25MB:** delivered by push to the IA via `POST /eevidence/outcome` through WISP — identical to automated jobs.
- **>25MB:** out-of-band secure delivery (active open item in MVP spec §10.3) — relevant because **manual content categories (OneDrive/SharePoint/Azure content, Xbox video/voice) are exactly the large payloads** most likely to exceed 25MB. Engineering should expect manual jobs to be over-represented in the >25MB path.
- **Delivery acknowledgement** is tracked per task via `POST /eevidence/deliverystatus` (`Complete` → `Acknowledged` / `Failed`); manual jobs use the same `deliveryStatus` callback states (`DeliveryAcknowledged`, `Failed` with retry).
- **Preservation (EPOC-PR):** for manually-collected preservation data, a per-category `No Data`/unavailability must be reflected in the `DataPreserved` NotificationObject's supplemental per-category detail.

UK COPO uses the existing TS 103 120 delivery; the collection mechanics in §6–§9 are unchanged across both programs.

---

## 12. Roadmap — true in-app ingest (post-MVP)

MVP is **pointer + status**: DARS records *where* the data was staged, not the data itself. The forward design (called out in `XBOX_MANUAL_COLLECTION_IMPLEMENTATION.md` "Future Enhancements") is **in-app upload/ingest**:

| Capability | MVP (this spec) | Ingest roadmap |
|---|---|---|
| Data bytes | Staged externally; DARS holds a pointer (boundary + SAS) | RS uploads files directly in DARS; DARS ingests to managed storage |
| Integrity | RS attests via status | Server-side hashing + chain-of-custody manifest |
| Safety | N/A (no bytes) | Virus/malware scan on ingest; quarantine on fail |
| Limits | N/A | Size caps, type allow-list, resumable upload for large content |
| Attribution | `lastUpdatedBy/At` on status | Upload actor + hash + timestamp bound to the file |

The MVP data model is intentionally forward-compatible: the per-job `dataLocation`/boundary becomes the ingest *destination*, and `collectionNotes` attachments are the seam where real file ingest first appears (the Affidavit, §10). No schema break is required to graduate.

---

## 13. Open questions for engineering / product

1. **SAS token scope & lifetime** — read-for-verify vs write-for-stage, expiry window, re-issue policy. (BE2)
2. **`msaProfile` Unified Audit Logs** automated/manual inconsistency vs Azure services (§4.3) — confirm intended value with config owner.
3. **`Blocked` & SLA** — confirmed neutral to the statutory clock here; validate against LENS Ops policy (the MVP spec only stops the clock for GFR/non-execution).
4. **`No Data` reporting** — for eEvidence, is a per-category `No Data` surfaced to the IA proactively, or only on request? Affects Form 3 / `DataPreserved` content.
5. **Two manual components** — pick the canonical surface (`ManualCollectionForm` vs `ManualServiceCategories`) or formally designate one as the layout variant, to prevent rule drift.
6. **Boundary derivation failures** — when `mapStorageLocationToCollectionBoundary` returns `undefined`, what is the RS's prescribed fallback (manual pick + justification note)?
7. **Per-tool routing metadata** — should the config carry an explicit `collectionTool` per manual item (CRM / Compliance Portal / OneDrive Tool / Partner), so the surface can tell the RS *which* tool to use rather than just "manual"? (See Appendix A.)

---

## Appendix A — Per-tool collection profiles

The generic flow (§6–§9) is the spine. Each standalone tool plugs into it at the **Collection** step. These profiles are advisory until a `collectionTool` field exists in config (Open Q7); today the RS infers the tool from the service.

| Tool | Services / data types it serves (from §4) | RS sub-flow at Collection | Notes for engineering |
|---|---|---|---|
| **OneDrive Tool** | OneDrive for Business *content*, OneDrive Consumer *content*, SharePoint Online *content* | RS runs the OneDrive Tool against the identifier, exports content, stages to `cpt/{identifier}` in the derived boundary, returns to DARS → `Complete` + boundary. | Large payloads — expect >25MB delivery path (§11). Parity target named explicitly in MVP exclusion. |
| **Compliance Portal** | Exchange enterprise *Password Change History*, Entra/MSA traffic items (List of Accounts/Domains, billing, reverse lookups), Unified Audit Logs (Azure) | RS runs eDiscovery/Compliance Portal searches/exports, stages results, records status + notes (search ID in notes). | Parity target named in MVP exclusion. Capture the portal search/case ID in Collection Notes for audit linkage. |
| **CRM** | Subscriber/billing items requiring CRM lookup (e.g., Basic/Detailed Billing, account profile attributes) | RS queries CRM, transcribes/export, stages, records. | Parity target named in MVP exclusion. Often *small* payloads (subscriber/billing) → ≤25MB push path. |
| **Partner team (Xbox / Minecraft)** | All Xbox data types; Minecraft content/purchase history | RS **tasks the partner team** (out of band), who collect and stage to the collection point; RS records `Blocked` while waiting, then `Complete` on return. | This is the clearest "DARS user depends on another team" case. `Blocked` + Collection Notes (ticket/contact) are essential. Highest SLA risk (external turnaround). |
| **Other / legacy** (BitLocker, DevTunnels, CoPilot, Skype, GroupMe, Bing, MS Ads, MS Forms, Azure Storage/VM) | See §4.1 | Service-specific manual retrieval, then stage + record. | These have no named tool in the MVP exclusion; treat as generic manual until a `collectionTool` mapping is defined. |

---

## Appendix B — Component / file index (for implementers)

| Concern | File |
|---|---|
| Manual/automated split rule | `src/config/lensServicesConfig.ts` → `isManualCategory`, `SERVICE_CATEGORY_GROUPS` (`automated` flags) |
| Service catalog & account-type scoping | `src/config/lensServicesConfig.ts` → `LENS_SERVICES` |
| Boundaries & derivation | `src/constants/collectionBoundaries.ts` |
| Per-service card surface | `src/components/ManualCollectionForm.tsx` |
| Per-category inline surface | `src/components/ManualServiceCategories.tsx` |
| Tracker split + sectioning | `src/components/CollectionTracker.tsx` (`manualJobs` / `automatedJobs` `useMemo`) |
| Job & service data shapes | `src/types/caseTypes.ts` (`SubCategory`, service manual fields) |
| Notes editor (rich text + attachments) | `src/components/NoteFieldEditor.tsx` |
| Program/delivery context | `docs/eEvidence_MVP_Spec.md` (§4 exclusion, §5.15 delivery), `docs/LE_EXTERNAL_SERVICE_MAPPING.md` |
