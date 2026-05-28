# Merge Cross-Border Login Activity into the Enterprise Attorney Escalation Prototype

## Context

The Enterprise Attorney Escalation prototype at `C:\R\enterprise-attorney-escalation-prototype\` lets an attorney triage enterprise cases. Today the **Target User** view only shows static summary data (`geoResolutions30d: ["GB", "FR", "DE", "US"]`) without the evidence behind it.

The cross-border prototype at `C:\R\login-location-prototype\` already implements the full evidence trail: IP geolocation, day-by-day login timeline, jurisdiction analysis relative to the issuing agency, country breakdown, VPN/Tor flagging, and impossible-travel detection.

**Goal:** an attorney reviewing an enterprise case can drill from "user resolves across 4 jurisdictions" into the **actual login events** that prove it, see whether those events are cross-border *relative to the issuing agency*, and spot red flags (impossible travel, VPN/Tor) — without leaving the case.

DARS_eEvidence remains untouched. The login-location-prototype remains untouched. We **copy** types/services/components from it into the Enterprise prototype and wire them in.

---

## What the cross-border prototype provides (analysis)

### Data model (`src/types.ts`)
- `LoginEvent` — id, identifier, timestamp, ip, userAgent, device, outcome (success/failure/mfa_challenge)
- `GeoLocation` — country, countryCode, region, city, lat/lon, isp, isVpn, isTor
- `Agency` — id, name, shortName, countryCode, country, type
- `JurisdictionStatus = "in_jurisdiction" | "cross_border" | "indeterminate"`
- `EnrichedLoginEvent` = LoginEvent + geo + jurisdiction
- `CountrySummary` — country, loginCount, firstSeen, lastSeen, cities, uniqueIps, VPN/Tor flags, jurisdiction
- `TimelineDay` — day-grouped events with `hasImpossibleTravel`
- `QueryResult` — full result envelope incl. counts by jurisdiction

### Services
- [`src/services/geolocation.ts`](C:/R/login-location-prototype/src/services/geolocation.ts) — `lookupIp(ip)` (mock table from `GEO_TABLE`)
- [`src/services/loginQuery.ts`](C:/R/login-location-prototype/src/services/loginQuery.ts) — `queryLogins({ identifier, rangeStart, rangeEnd, issuingAgencyId })`:
  - filters `LOGIN_EVENTS` by identifier + range
  - enriches with geo via `lookupIp`
  - computes per-event jurisdiction relative to agency country
  - aggregates `CountrySummary[]` and `TimelineDay[]`
  - runs haversine + speed check (`MAX_TRAVEL_SPEED_KMH = 900`) to flag impossible-travel

### UI components
- `SearchForm` — identifier + date range + agency picker
- `ResultsHeader` — counts: total events, cross-border, indeterminate, in-jurisdiction
- `CountrySummaryCards` — country grid with jurisdiction tagging
- `LoginTimeline` — day-by-day grouped events; flagged events get red border + "Impossible travel" badge; per-event jurisdiction badge (`Cross-border` / `Indeterminate`) + VPN/Tor badges + outcome icon

### Seed data
- `LOGIN_EVENTS` for 4 personas (alice, bob, carol, dave); we will NOT reuse these identifiers — instead we seed login events for the 6 case identifiers from `mockCases.ts`

---

## Integration design

### Where the cross-border surface mounts

**Three placements, all wired from one underlying query — pick once, render in three contexts:**

1. **Tri-pane Target User stripe (existing)** — gains 2 inline signals:
   - "🌍 N countries · X cross-border" badge (computed from `queryLogins`)
   - ⚠ "Impossible travel" red chip when `impossibleEventIds.length > 0`
   - Both badges always render — they replace nothing, they augment the existing static row.

2. **Attorney Dashboard queue row icons (existing `HeatIcons`)** — add an "impossible travel" icon when the case's identifier has any flagged event. Reuse the existing `Tooltip` pattern.

3. **Case Form — new "Cross-Border Login Activity" section** (the main payoff)
   - Mounts inside the **Enterprise Context section** as a child of `UserPanel` — logically nested under the user identifier it describes. Spec §5.3 calls Target User a Tier 2 entity; cross-border data is the evidence layer beneath it.
   - Collapsible accordion, **collapsed by default** so the case form doesn't get long.
   - Inside the accordion:
     - Compact date-range picker (defaults to 30 days before `dateOfService`, but attorney can widen).
     - The case's agency is locked (no agency dropdown — the issuing agency is the case's submitting agency, not user-selectable).
     - `ResultsHeader` (counts)
     - `CountrySummaryCards`
     - `LoginTimeline` (full timeline)
     - "Hide in-jurisdiction" toggle (same as login-location-prototype)
   - Each `UserPanel` instance has its own accordion. Multi-identifier cases get one section per user.

**Why nested, not a new top-level surface:** the attorney is already in "evaluate this user's geographic footprint" mode by the time they reach the User panel. Putting the timeline anywhere else makes them context-switch. The cost is a longer case form when expanded, but it's collapsed by default and the data is exactly what they need to see in this moment.

### Data mapping: case → cross-border query

| Cross-border input | Enterprise prototype source |
| ------------------ | --------------------------- |
| `identifier`       | `AccountIdentifier.value` from `case.identifiers[i]` |
| `rangeStart`       | Default: `dateOfService` − 30d. Attorney can override. |
| `rangeEnd`         | Default: `dateOfService`. Attorney can override. |
| `issuingAgencyId`  | Resolved from `case.agencyCountryCode` + a registry lookup (see Agency mapping below) |

### Agency mapping

The cross-border prototype keys jurisdiction off `Agency.countryCode`. The enterprise prototype currently stores `c.agencyCountry` as a free string (`"United States"`).

**Minimal change:** add `agencyCountryCode: string` (ISO-2) to `CaseFormData` and seed it on all 6 mock cases. Then build a synthetic `Agency` object at query time from the case (no full agency directory needed). This avoids duplicating the prototype's `AGENCIES` array.

```ts
function caseAsAgency(c: CaseFormData): Agency {
  return {
    id: c.caseId,
    name: c.agencyName,
    shortName: c.agencyName,
    countryCode: c.agencyCountryCode,
    country: c.agencyCountry,
    type: c.requestType === "eEvidence" ? "Judicial Authority" : "Law Enforcement",
  };
}
```

Then in `queryLogins`, accept either `issuingAgency?: Agency` (object) or keep `issuingAgencyId` and add a lookup. **Cleanest:** widen `QueryInput` to accept `issuingAgency?: Agency` directly — small refactor in the copied service file.

---

## Files to create / modify

### NEW files in the Enterprise prototype

```
C:\R\enterprise-attorney-escalation-prototype\
└─ src\
   ├─ types\
   │  └─ cross-border.ts             Copy of login-location-prototype's types.ts (LoginEvent, GeoLocation, Agency, EnrichedLoginEvent, CountrySummary, TimelineDay, QueryResult, JurisdictionStatus)
   ├─ data\
   │  ├─ mockGeoTable.ts             Copy of login-location-prototype's geoTable.ts + 4–6 new IPs for the case identifiers
   │  └─ mockLoginEvents.ts          NEW: login events for the 6 case identifiers (not the alice/bob/carol/dave seed)
   ├─ services\
   │  ├─ geolocation.ts              Copy verbatim from login-location-prototype
   │  └─ loginQuery.ts               Copy with one tweak: accept `issuingAgency?: Agency` directly (drop the agencyId lookup)
   └─ components\
      └─ cross-border\
         ├─ CrossBorderLoginActivity.tsx   Top-level wrapper: date-range picker + ResultsHeader + CountrySummaryCards + LoginTimeline + hide-in-jurisdiction toggle
         ├─ CrossBorderHeatBadges.tsx      Compact 2-badge display used in the Tri-Pane Target User stripe
         ├─ CrossBorderRangePicker.tsx     Compact date-range form (lighter than login-location's SearchForm; identifier/agency locked)
         ├─ ResultsHeader.tsx              Lift from login-location-prototype
         ├─ CountrySummaryCards.tsx        Lift from login-location-prototype
         └─ LoginTimeline.tsx              Lift from login-location-prototype
```

### MODIFY existing files

| File | Change |
| ---- | ------ |
| `src/types/case.ts` | Add `agencyCountryCode: string` to `CaseFormData` |
| `src/data/mockCases.ts` | Seed `agencyCountryCode` on all 6 cases (`US`, `ES`, `US`, `DE`, `GB`, `BR`) |
| `src/components/enterprise-context/UserPanel.tsx` | Add collapsed `<Accordion>` mounting `CrossBorderLoginActivity` for the identifier |
| `src/components/tri-pane/EnterpriseTriPaneSummary.tsx` | In the Target User stripe, render `<CrossBorderHeatBadges>` next to `geoResolutions30d` |
| `src/components/dashboard/AttorneyQueueList.tsx` | In `HeatIcons`, add a new icon when impossible travel is detected for any identifier on the case |
| `README.md` | Add cross-border integration to the demo walkthrough |

### Login event seeding (the demo payoff)

One identifier per case, login events that paint distinct stories:

| Case | Identifier | Story to seed |
| ---- | ---------- | ------------- |
| LNS-2026-00501 | michael.ross@contoso.com | US-mostly (NYC + SF), one London trip — **MEDIUM cross-border** relative to FBI/US |
| LNS-2026-00502 | subject-es@corp-iberia.example | Spain (Madrid + Barcelona) + 2 days in France — **LOW** relative to Spanish IA (in-jurisdiction) |
| LNS-2026-00503 | j.alvarez@fabrikam.com | Chicago US only — **LOW** (in-jurisdiction) |
| LNS-2026-00504 | operator@northwind.example | Seattle US + one Berlin login — **MEDIUM**; this is the manifest-error case |
| LNS-2026-00505 | k.williams@tailwind.co.uk | UK + FR + DE + US over the window — **HIGH** relative to Met Police; **the star demo** |
| LNS-2026-00506 | diretor@adventureworks.com.br | Brazil + one VPN exit (Switzerland) — **MEDIUM with indeterminate flag**; demos VPN/Tor handling |

Plus: **one impossible-travel insert** for `k.williams@tailwind.co.uk` — a London 09:00 → Tokyo 11:30 same-day pair → flagged red. Makes the dashboard queue row light up the impossible-travel icon and proves the detection pathway end-to-end.

The `GEO_TABLE` already covers most cities needed (SF, NYC, Seattle, London, Manchester, Paris, Berlin, Tokyo, São Paulo, Madrid is missing — add it). Add ~3 new IPs:
- Madrid (`88.27.xxx.xxx`) → ES
- Barcelona (`80.58.xxx.xxx`) → ES
- Chicago (`24.13.xxx.xxx`) → US

Reuse VPN/Tor entries already in `GEO_TABLE`.

---

## Implementation order

1. **Type lift + agency mapping** — copy `cross-border.ts`, add `agencyCountryCode` to `CaseFormData`, seed mock cases. ~15 min.
2. **Geo table + login events seed** — copy `geoTable.ts`, add 3 Madrid/Barcelona/Chicago IPs, author `mockLoginEvents.ts` for the 6 case identifiers (~40 events total). ~30 min.
3. **Services** — copy `geolocation.ts`, copy `loginQuery.ts` with `issuingAgency` object instead of id lookup. ~15 min.
4. **Lift presentational components** — `ResultsHeader`, `CountrySummaryCards`, `LoginTimeline` copied verbatim (already Fluent v9). ~10 min.
5. **`CrossBorderRangePicker`** — small wrapper around `DatePicker` × 2 with a "30 days before service" preset. ~20 min.
6. **`CrossBorderLoginActivity`** — orchestrator. Defaults range to (`dateOfService` − 30d, `dateOfService`). Builds synthetic agency from the case. Memoizes `queryLogins` call. Renders header + cards + timeline + toggle. ~30 min.
7. **Mount inside `UserPanel`** as an `Accordion` titled "Cross-Border Login Activity (N events, M cross-border)" — count from the query. Collapsed by default. ~10 min.
8. **`CrossBorderHeatBadges`** for the tri-pane Target User stripe — show country count + cross-border count + impossible-travel red chip. ~15 min.
9. **Dashboard `HeatIcons` addition** — impossible-travel icon. ~10 min.
10. **README update** + manual demo. ~10 min.

Total: ~2h 30m focused work.

---

## Demo walkthrough (post-merge, 5 min)

1. Land on Attorney Dashboard. Queue rows now show **impossible-travel icon** on **LNS-2026-00505** (Tailwind).
2. Click **LNS-2026-00505** → preview pane tri-pane → Target User stripe now shows "🌍 4 countries · 3 cross-border · ⚠ Impossible travel".
3. **Open full case** → scroll to Enterprise Context → expand User panel → expand "Cross-Border Login Activity" accordion.
4. See full timeline: London logins on Mar 9, then a Tokyo login Mar 9 13:30 UTC — the timeline highlights the pair with red border + "Impossible travel" badge. The day card shows both countries.
5. Toggle "Hide in-jurisdiction" → all 4 UK events disappear; only cross-border + indeterminate remain.
6. Adjust the date range back to Feb → see expanded history.
7. Switch to **LNS-2026-00502** (Spanish EPOC) → expand cross-border → all events are in-jurisdiction (Spain matches IA country). Toggling "hide in-jurisdiction" empties the timeline. This proves the merge respects the case's issuing agency country.
8. Switch to **LNS-2026-00506** (Brazil) → expand cross-border → one event shows a VPN badge + "Indeterminate" jurisdiction (Switzerland ProtonVPN exit). Demos the indeterminate path.

---

## Verification

```
cd C:\R\enterprise-attorney-escalation-prototype
npm run dev   # already running on port 3012
```

Then:
- `npx tsc -b` — no errors (one type widening: `issuingAgency` in QueryInput)
- Manual walk-through above
- Edge case: open a case whose identifier has zero seeded login events → empty-state copy renders ("No login events seeded for this identifier in the selected range.")
- Edge case: switch persona to **RS** → Attorney Dashboard hides; the cross-border accordion still renders in the case form (it's informational, not gated). Confirm copy still reads correctly for non-attorneys.

---

## Explicit non-goals

- **No real IP lookup integration** — `GEO_TABLE` stays as the source of truth for the prototype.
- **No real Kusto/Sentinel "About a User" integration** — the spec's Tier 2 needs list mentions Kusto; we mock it here.
- **No agency directory** — the agency comes from the case itself, not a separate registry. We do **not** lift `AGENCIES` from the cross-border prototype.
- **No multi-identifier resolution across tenants** — one user panel per identifier per case; we render N cross-border accordions for N identifiers.
- **No persistence of the date-range override** — refresh resets to (service date − 30d, service date).
- **No edits** to `C:\R\login-location-prototype\` or `C:\R\DARS_eEvidence\` — both are read-only reference.

---

## Open questions to clarify before implementation

1. **Default range** — 30 days before `dateOfService`, or 30 days before `dateOfService` and 14 days after (to capture "what happened around the time we received the request")? Spec doesn't say. **Default I picked: 30d before only.**
2. **Multi-identifier cases** — all 6 mock cases have exactly 1 identifier today. If a case had 2 identifiers, we'd render 2 cross-border accordions (one per User panel). Confirm that's the right shape if/when we add multi-identifier mocks.
3. **Should the cross-border section emit audit events when the attorney opens it?** Could log a `CrossBorderActivityViewed` audit kind. Low value for demo, easy to add — **default: no audit event**.
4. **Tri-pane in the dashboard preview** — should the impossible-travel red chip there be clickable (jump straight to the timeline, accordion auto-expanded)? Would polish the demo flow — **recommend yes**, ~5 extra min.
