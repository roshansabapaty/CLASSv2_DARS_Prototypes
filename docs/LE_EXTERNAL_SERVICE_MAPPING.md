# Plan — Map LE-submitted external service names to internal LENS services

## Context

External law enforcement agencies submit legal demands using a programmatic
API contract (e.g., **UK COPO** — UK Communications Order Portal) that names
services in a generic, customer-facing way: `Microsoft Account Profile`,
`Email`, `Teams`, `OneDrive`, `SharePoint`, `XBOX/Minecraft`. Internally LENS
operates against a richer, account-type-scoped catalog: `msaProfile`,
`entraIDProfile`, `exchangeEnterprise`, `exchangeConsumer`, `teamsForBusiness`,
`teamsForLife`, `oneDriveForBusiness`, `oneDriveConsumer`, `sharePointOnline`,
`xbox`, …

Today the wizard's mock data pre-loads the **internal** keys directly on
`identifier.services[*].enabled`. That hides the actual translation step a
Response Specialist (or future automated pipeline) must perform: take the
LE-supplied external name, combine it with the identifier's account-check
result, resolve to the right internal service. This plan adds the mapping
layer end-to-end.

The mapping (per the user's spec):

| External (LE-supplied) | Account type | Internal LENS key |
|---|---|---|
| `Microsoft Account Profile` | Consumer | `msaProfile` |
| `Microsoft Account Profile` | Enterprise | `entraIDProfile` |
| `Email` | Enterprise | `exchangeEnterprise` |
| `Email` | Consumer | `exchangeConsumer` |
| `Teams` | Enterprise | `teamsForBusiness` |
| `Teams` | Consumer | `teamsForLife` |
| `OneDrive` | Enterprise | `oneDriveForBusiness` |
| `OneDrive` | Consumer | `oneDriveConsumer` |
| `SharePoint` | Enterprise | `sharePointOnline` |
| `XBOX/Minecraft` | Consumer | `xbox` |

Notes:
- Some external names have **only one** account-type variant
  (`SharePoint` is Enterprise-only; `XBOX/Minecraft` is Consumer-only).
- Some internal services have **no** external mapping today (e.g.,
  `azureStorage`, `bitlocker`, `coPilotEnterprise`, `microsoftForms`) — those
  are RS-driven additions, not LE-supplied. They stay in the catalog but
  aren't reachable from a UK COPO submission.
- `XBOX/Minecraft` mapping currently resolves to `xbox` only. If LE
  separately requests Minecraft we'd need a `minecraft` row — design choice
  documented at the bottom (open question 3).

---

## Phase 1 — Data model: identifier-level external services

Add an optional field on `AccountIdentifier` to capture the raw LE-submitted
external service names:

```ts
// src/types/caseTypes.ts
export interface AccountIdentifier {
  // ...existing fields
  /** Service names as supplied by the external LE submission (UK COPO etc.).
   *  Each entry is the *external* programmatic name (e.g., "Email", "Teams").
   *  Resolution to internal LENS service keys happens at wizard load time
   *  via `resolveExternalServices` (account-type-aware). When undefined or
   *  empty, mock cases fall back to the legacy `identifier.services[*].enabled`
   *  pre-loaded shape. */
  leExternalServices?: string[];
  /** Optional per-external-service date range supplied by LE. Keyed by the
   *  external name. Resolution writes the same range onto every internal
   *  service derived from that external name. */
  leExternalServiceDates?: Record<string, { start: string; end: string }>;
}
```

This is purely additive — existing mock data continues to work unchanged.

---

## Phase 2 — Mapping table

New file: [src/config/leExternalServiceMap.ts](src/config/leExternalServiceMap.ts).

```ts
/**
 * leExternalServiceMap — translation from LE-supplied external service names
 * (e.g., "Email", "Teams" from UK COPO) to internal LENS service keys,
 * disambiguated by the target identifier's account check result.
 *
 * Format: externalName → accountType → internalKey
 * When an external name has only one account-type variant (e.g., SharePoint
 * is Enterprise-only), the missing variant is omitted; resolution returns
 * `null` if the wrong account type is requested.
 */

export type ExternalAccountType = "Consumer" | "Enterprise";

export interface ExternalServiceMapping {
  /** The internal LENS service key when the identifier is Consumer-typed. */
  Consumer?: string;
  /** The internal LENS service key when the identifier is Enterprise-typed. */
  Enterprise?: string;
}

export const LE_EXTERNAL_SERVICE_MAP: Record<string, ExternalServiceMapping> = {
  "Microsoft Account Profile": {
    Consumer: "msaProfile",
    Enterprise: "entraIDProfile",
  },
  Email: {
    Consumer: "exchangeConsumer",
    Enterprise: "exchangeEnterprise",
  },
  Teams: {
    Consumer: "teamsForLife",
    Enterprise: "teamsForBusiness",
  },
  OneDrive: {
    Consumer: "oneDriveConsumer",
    Enterprise: "oneDriveForBusiness",
  },
  SharePoint: {
    Enterprise: "sharePointOnline",
  },
  "XBOX/Minecraft": {
    Consumer: "xbox",
  },
};

/** Quick-list of all external names the system recognizes — for unmapped
 *  detection and UI display. */
export const KNOWN_EXTERNAL_NAMES: readonly string[] = Object.keys(
  LE_EXTERNAL_SERVICE_MAP
);
```

---

## Phase 3 — Resolver function

New file: [src/utils/resolveExternalServices.ts](src/utils/resolveExternalServices.ts).

```ts
import type { AccountIdentifier } from "../types/caseTypes";
import { LE_EXTERNAL_SERVICE_MAP, type ExternalAccountType } from "../config/leExternalServiceMap";

export type ResolutionStatus =
  | "resolved"
  | "unmapped-name"          // external name not in our map
  | "missing-account-type"   // identifier hasn't been account-checked yet
  | "wrong-account-type";    // external is Consumer-only but identifier is Enterprise (or vice versa)

export interface ResolvedService {
  externalName: string;
  internalKey: string | null;
  status: ResolutionStatus;
  /** Reason text for UI banners when status !== "resolved". */
  reason?: string;
}

/** Resolve a single external name + an identifier's account-check result. */
export function mapExternalToInternal(
  externalName: string,
  accountType: ExternalAccountType | "N/A" | undefined
): ResolvedService {
  const mapping = LE_EXTERNAL_SERVICE_MAP[externalName];
  if (!mapping) {
    return {
      externalName,
      internalKey: null,
      status: "unmapped-name",
      reason: `"${externalName}" is not a known external service.`,
    };
  }
  if (!accountType || accountType === "N/A") {
    return {
      externalName,
      internalKey: null,
      status: "missing-account-type",
      reason: `Run the account check to resolve "${externalName}".`,
    };
  }
  const key = mapping[accountType];
  if (!key) {
    const onlySupports = Object.keys(mapping).join(" or ");
    return {
      externalName,
      internalKey: null,
      status: "wrong-account-type",
      reason: `"${externalName}" only supports ${onlySupports}; this identifier is ${accountType}.`,
    };
  }
  return { externalName, internalKey: key, status: "resolved" };
}

/** Resolve every external service on an identifier into a list with status. */
export function resolveIdentifierExternalServices(
  identifier: AccountIdentifier
): ResolvedService[] {
  const externals = identifier.leExternalServices ?? [];
  const at = identifier.checkAccounts?.accountType as ExternalAccountType | "N/A" | undefined;
  return externals.map((name) => mapExternalToInternal(name, at));
}

/** Convenience: list of resolved internal keys only (drops unmapped). */
export function resolvedInternalKeys(identifier: AccountIdentifier): string[] {
  return resolveIdentifierExternalServices(identifier)
    .filter((r) => r.status === "resolved" && r.internalKey)
    .map((r) => r.internalKey!) as string[];
}
```

---

## Phase 4 — Integrate with `leBaseline` snapshot

The wizard's [leBaseline.ts](src/components/fulfillment-wizard/leBaseline.ts)
captures "what LE asked for" by reading `identifier.services[*].enabled` at
mount. With external mapping, the snapshot must ALSO honor
`leExternalServices`:

- For each identifier, before snapshotting, call `resolvedInternalKeys` and
  flip `identifier.services[k].enabled = true` for every resolved key.
- For unresolved entries (status `unmapped-name` / `missing-account-type` /
  `wrong-account-type`), keep them in a separate field on the baseline so the
  LE Review panel can surface the issues.

Two integration points:

1. **`snapshotLEBaseline`** — extend to honor external mapping. New
   `LEIdentifierBaseline` shape:

```ts
export interface LEIdentifierBaseline {
  services: string[];                 // resolved internal keys
  items: ItemSelectionState;
  categoryDates: Record<string, { start: string; end: string }>;
  // NEW:
  externalUnresolved: ResolvedService[]; // entries with status !== "resolved"
}
```

2. **Mock case loader / wizard mount** — at the place where the wizard
   computes the baseline, also flip the resolved internal keys on
   `identifier.services[*].enabled` so the existing render paths (Step 2 right
   panel, ServiceCategoryTable, validateIdentifier's enabled-services count)
   pick them up without further changes.

The existing `routeServicesByAccountType` continues to work — it operates on
already-resolved internal keys.

---

## Phase 5 — Surface unresolved entries in the LE Review (left) panel

[`LEReviewPanel.tsx`](src/components/fulfillment-wizard/LEReviewPanel.tsx)
gets a new banner case for each unresolved external service:

| `status` | MessageBar `intent` | Body |
|---|---|---|
| `missing-account-type` | `warning` | "LE requested {externalName} but the account check hasn't run for this identifier. [Run check]" |
| `wrong-account-type` | `error` | "LE requested {externalName} ({mapping.onlySupports} only) but this identifier is {accountType}. The service cannot be fulfilled." |
| `unmapped-name` | `error` | "LE requested {externalName}, which is not in the LENS service catalog. Escalate to mapping owner." |

These banners stack with the existing validation banners (account-check-not-run
etc.) — `validateIdentifier` is extended in Phase 7 to surface them as
informational issues so Step 3 readiness gate can see them too.

The LE Review panel's per-service tree continues to show only the **resolved**
internal services (so the existing rendering for groups + items + dates works
unchanged).

---

## Phase 6 — Mock data: example case using external names

Add at least one mock case to demonstrate the flow. Example identifier shape:

```ts
const id1: AccountIdentifier = {
  id: genId(),
  value: "user@outlook.com",
  type: "Email Address",
  taskId: genIdentifierTaskId(),
  taskStatus: "InProgress",
  // Account check not run yet (so we exercise the missing-account-type path
  // before the RS clicks Run check).
  accountExistenceStatus: "not-checked",
  createdBy: "LE Agency",
  services: makeAllDefaultServices(),
  leExternalServices: ["Email", "Teams", "OneDrive", "Microsoft Account Profile"],
  leExternalServiceDates: {
    Email: { start: "2024-10-08", end: "2025-01-08" },
    Teams: { start: "2024-10-08", end: "2025-01-08" },
    OneDrive: { start: "2024-10-08", end: "2025-01-08" },
    "Microsoft Account Profile": { start: "2024-10-08", end: "2025-01-08" },
  },
};
```

Walkthrough the demo can show:
1. Open the case in Step 2 → LE Review banner: "Run account check to
   resolve {Email, Teams, OneDrive, Microsoft Account Profile}".
2. RS runs the check → identifier comes back as `Consumer`.
3. Banners clear; LE Review now shows: Exchange Consumer, Teams for Life,
   OneDrive for Consumer, MSA Profile — all with the LE-requested date range
   shown directly under each service header (per the recent UX move).
4. RS proceeds normally.

A second mock identifier seeded with `accountType: "Enterprise"` exercises
the same external names resolving to the Enterprise variants.

A third mock identifier with `leExternalServices: ["SharePoint"]` and
`accountType: "Consumer"` exercises the `wrong-account-type` blocking
banner ("SharePoint requires Enterprise; this identifier is Consumer").

---

## Phase 7 — `validateIdentifier` integration

Extend the validation engine
[`src/utils/validateIdentifier.ts`](src/utils/validateIdentifier.ts) with
three new informational-or-blocking checks driven by the resolver:

| # | Code | Severity | Detection |
|---|---|---|---|
| 13 | `external-unmapped` | informational | LE supplied an external name not in `LE_EXTERNAL_SERVICE_MAP`. |
| 14 | `external-account-type-pending` | blocking | LE supplied a name that requires the account type to resolve, but the check hasn't run / is N/A. (Already partly covered by the existing `account-check-not-run` / `account-check-na` cases — this is more specific.) |
| 15 | `external-wrong-account-type` | informational | LE supplied an external name whose only mapping is for the OTHER account type. The RS may need to clarify with LE. |

Step 3 readiness gate consumes these via `isReadyForSubmission`: case 14
blocks; cases 13 + 15 don't block but are listed in the per-identifier
"informational issues" pane.

---

## Phase 8 — Files modified / created

**New**:
- [src/config/leExternalServiceMap.ts](src/config/leExternalServiceMap.ts) — the lookup table + `KNOWN_EXTERNAL_NAMES` export.
- [src/utils/resolveExternalServices.ts](src/utils/resolveExternalServices.ts) — `mapExternalToInternal`, `resolveIdentifierExternalServices`, `resolvedInternalKeys`.

**Modified**:
- [src/types/caseTypes.ts](src/types/caseTypes.ts) — add `leExternalServices?` and `leExternalServiceDates?` to `AccountIdentifier`.
- [src/components/fulfillment-wizard/leBaseline.ts](src/components/fulfillment-wizard/leBaseline.ts) — `snapshotLEBaseline` reads `leExternalServices` and resolves them; new `externalUnresolved` field on `LEIdentifierBaseline`.
- [src/components/fulfillment-wizard/LEReviewPanel.tsx](src/components/fulfillment-wizard/LEReviewPanel.tsx) — render `externalUnresolved` entries as MessageBars at the top of the panel.
- [src/utils/validateIdentifier.ts](src/utils/validateIdentifier.ts) — three new checks (cases 13–15).
- One mock case file (e.g., [src/utils/mockCaseData.ts](src/utils/mockCaseData.ts) or one of the LENS-2025-* fixtures) — seed an identifier with `leExternalServices` to exercise the flow end-to-end.

**Untouched**:
- The catalog ([lensServicesConfig.ts](src/config/lensServicesConfig.ts)) — internal keys / categories / dates unchanged.
- `routeServicesByAccountType` — still operates on resolved internal keys.
- `RSEditPanel`, `IdentifierAccordion`, `BulkActionsToolbar` — they consume already-resolved internal keys; no awareness of external names needed.

---

## Verification

1. **Pure-function unit test for `mapExternalToInternal`**:
   - `("Email", "Consumer")` → `{ status: "resolved", internalKey: "exchangeConsumer" }`
   - `("Email", "Enterprise")` → `exchangeEnterprise`
   - `("SharePoint", "Consumer")` → `{ status: "wrong-account-type" }`
   - `("Teams", undefined)` → `{ status: "missing-account-type" }`
   - `("FaceShare", "Consumer")` → `{ status: "unmapped-name" }`
2. **Demo mock case**:
   - Open the case → Step 2 → LE Review shows banners for unresolved.
   - Run account check → banners clear; resolved internal services appear with their LE-requested dates.
3. **Mixed-account-type case**: identifier 1 is Consumer + LE asked for `["Email"]`, identifier 2 is Enterprise + same `["Email"]` → both resolve correctly to different internal keys.
4. **Account check returns N/A**: identifier shows red error banner ("No Microsoft account exists") AND each external entry shows "Run account check…" — the existing N/A banner takes precedence.
5. **Bulk smart routing** still works: routing operates on resolved internal keys, so Exchange Consumer + Exchange Enterprise route correctly across mixed Consumer + Enterprise identifiers.
6. **Submit gate**: identifier with only unresolved externals (`SharePoint` + Consumer) cannot proceed unless the RS removes / replaces the requested service. Resolution: identifier-level Reject is the escape hatch.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| New external name appears from LE that we haven't mapped | Medium | `unmapped-name` status surfaces it visibly; RS escalates to mapping owner. Add to map; no code change. |
| Internal catalog removes a service that the map references | Low | Add a startup-time assertion in `leExternalServiceMap.ts` — e.g., a small consistency-check function that confirms every internal key exists in `LENS_SERVICE_MAP`. Fail loudly in dev. |
| Account-check result drift after services are resolved (RS re-runs check, account type changes) | Low | Re-resolution happens on next snapshot. If user has already configured services manually based on the OLD account type, surface a warning ("account check changed; previously-resolved services may no longer apply"). Phase-9 follow-up. |
| External name has both Consumer + Enterprise variants but the identifier has BOTH account types (rare; per main-app mock convention identifiers have ONE accountType) | Low | Phase 9 follow-up. For now, resolution picks the identifier's primary account type. |
| LE provides a per-external date range that disagrees with `categoryDates` already in the LE baseline | Low | Per-external dates take precedence and overwrite `categoryDates` for the resolved internal key. Document this. |
| External `XBOX/Minecraft` should sometimes resolve to `minecraft` (separate internal service) | Medium | Open question 3 — for now, single mapping to `xbox`. Decision deferred. |

---

## Open questions

1. **Where does the mapping live in production?** This plan treats it as a
   client-side static lookup. Long-term it likely lives on a backend service
   so it can be updated without a frontend deploy. Ship as static for now;
   API contract can replace the static export later without consumer-facing
   API change.
2. **Localization of external names**: UK COPO uses English. If other
   countries' APIs use translated terms (e.g., German "E-Mail"), the mapping
   should be language-aware. Punt for now; assume English-only LE input.
3. **`XBOX/Minecraft` ambiguity**: today maps to `xbox` only. Should it also
   resolve to `minecraft` (a separate Consumer service in the catalog)?
   If LE never distinguishes between the two in the external API, leave as-is
   and let RS manually add `minecraft` if needed. If LE does distinguish,
   add a separate row `"Minecraft" → { Consumer: "minecraft" }` and split
   `XBOX/Minecraft` if the API sometimes uses each.
4. **Date range resolution when LE doesn't provide dates per external
   service**: if `leExternalServiceDates` is empty, fall back to the
   `identifier`-level date range or omit. Decide in implementation.

---

## Recommended implementation order

1. Phase 1 + 2 (data model + mapping table) — purely additive, ~15 min.
2. Phase 3 (resolver function) + unit tests — ~20 min.
3. Phase 6 (mock case) — exercise the flow visually before wiring further.
4. Phase 4 (leBaseline snapshot integration) — the core change.
5. Phase 5 (LE Review panel banners) — UX surface.
6. Phase 7 (validateIdentifier checks) — gate integration.
7. Verification walkthrough.

Total: ~half a day for the full graduation if the data shape is fixed up
front. Independently reviewable: Phases 1–3 are foundation; Phases 4–5 are
the visible change; Phase 7 is the gate hook.
