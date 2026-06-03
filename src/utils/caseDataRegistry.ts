/**
 * caseDataRegistry — central lookup from `caseId` to its FormData builder.
 *
 * Before this module existed, the only callers of the per-case mock
 * builders (`buildLENS202600150FormData`, …) were App.tsx's open-case
 * switch and a couple of correspondence seeds. The Attorney Dashboard
 * needs to read each case's `attorneyEscalation` to derive its own
 * filter + sort, which would otherwise mean either:
 *   - duplicating the switch in the dashboard (drifts), or
 *   - copying `attorneyEscalation` onto every CaseQueueItem (drifts).
 *
 * Instead we expose a memoised `getCaseFormDataById(caseId)` that builds
 * the FormData once per case (lazy) and caches it module-scope. The
 * dashboard reads only `attorneyEscalation` from it; full FormData is
 * available if a future surface needs more.
 *
 * Memoisation is intentional: the builders generate fresh random IDs +
 * dates on each call. For dashboard reads we want stable values across
 * renders, so the cache is a feature, not a leak.
 */

import type { FormData } from "../types/caseTypes";
import type { AttorneyEscalation } from "../types/caseTypes";
import type { CaseQueueItem } from "../components/case-queue/case-queue-types";
import { MOCK_CASES } from "../components/case-queue/case-queue-types";
import { buildFormDataFromQueueItem } from "./mockCaseDataFactory";

import { buildLENS202500095FormData } from "./mockCaseData";
import { buildLENS202500125FormData } from "./mockCaseDataLENS202500125";
import { buildLENS202500142FormData } from "./mockCaseDataLENS202500142";
import { buildLENS202600130FormData } from "./mockCaseDataLENS202600130";
import { buildLENS202600140FormData } from "./mockCaseDataLENS202600140";
import { buildLENS202600150FormData } from "./mockCaseDataLENS202600150";
import { buildLENS202600160FormData } from "./mockCaseDataLENS202600160";
import { buildLENS202600170FormData } from "./mockCaseDataLENS202600170";
import { buildLENS202600180FormData } from "./mockCaseDataLENS202600180";
import { buildLENS202600190FormData } from "./mockCaseDataLENS202600190";
import { buildLENS202600200FormData } from "./mockCaseDataLENS202600200";
import { buildLENS202600210FormData } from "./mockCaseDataLENS202600210";
import { buildLENS202600215FormData } from "./mockCaseDataLENS202600215";
import { buildLENS202600220FormData } from "./mockCaseDataLENS202600220";
import { buildLENS202600230FormData } from "./mockCaseDataLENS202600230";
import { buildLENS202600240FormData } from "./mockCaseDataLENS202600240";
import { buildLENS202600245FormData } from "./mockCaseDataLENS202600245";
import { buildLENS202600247FormData } from "./mockCaseDataLENS202600247";
import { buildLENS202600250FormData } from "./mockCaseDataLENS202600250";
import { buildLENS202600255FormData } from "./mockCaseDataLENS202600255";
import { buildLENS202600265FormData } from "./mockCaseDataLENS202600265";
import { buildLENS202600270FormData } from "./mockCaseDataLENS202600270";
import { buildLENS202600280FormData } from "./mockCaseDataLENS202600280";
import { buildLENS202600300FormData } from "./mockCaseDataLENS202600300";
import { buildLENS202600310FormData } from "./mockCaseDataLENS202600310";

export const CASE_DATA_BUILDERS: Record<string, () => FormData> = {
  "LNS-2025-00095": buildLENS202500095FormData,
  // Phase 2 attorney-escalation merge — Tier 3 seeds.
  // Lawyer-assigned UK preservation case (Michael Chen on the assignee).
  "LNS-2025-00125": buildLENS202500125FormData,
  // Emergency Disclosure Request — kidnapping / threat-to-life, multi-id.
  "LNS-2025-00142": buildLENS202500142FormData,
  // Workflow 1 — Standard Production National (Irish IA + Irish SP, no EA leg).
  // Demonstrates the default eEvidence happy path: full pipeline, Routine SLA.
  "LNS-2026-00130": buildLENS202600130FormData,
  // Workflow 3 — Emergency Production 8h (Reg 2023/1543 Art. 9(2)).
  // German BKA kidnapping case; SLA tier swaps to 8h via getSlaConfig context.
  "LNS-2026-00140": buildLENS202600140FormData,
  "LNS-2026-00150": buildLENS202600150FormData,
  "LNS-2026-00160": buildLENS202600160FormData,
  "LNS-2026-00170": buildLENS202600170FormData,
  "LNS-2026-00180": buildLENS202600180FormData,
  "LNS-2026-00190": buildLENS202600190FormData,
  "LNS-2026-00200": buildLENS202600200FormData,
  "LNS-2026-00210": buildLENS202600210FormData,
  // Workflow 4 — Preservation Order active (Spanish EPOC-PR). Exercises
  // the PreservationOrderActiveBanner + Acknowledge Receipt CTA.
  "LNS-2026-00215": buildLENS202600215FormData,
  "LNS-2026-00220": buildLENS202600220FormData,
  "LNS-2026-00230": buildLENS202600230FormData,
  // Phase A — Form1-Full-EaBlocks (Workflow chain 2 → 6)
  "LNS-2026-00240": buildLENS202600240FormData,
  // Workflow 2 — Active EA review window (Italian EPOC, 5 days remaining).
  // Exercises the blocked Submit-to-Delivery + countdown chip.
  "LNS-2026-00245": buildLENS202600245FormData,
  // Workflow 2 — EA review window lapsed (French EPOC, expired 2 days
  // ago). Exercises the auto-detection hook (EaWindowExpired audit) +
  // Resume Delivery CTA on case open.
  "LNS-2026-00247": buildLENS202600247FormData,
  // Phase B — Form1-Partial-EaBlocksOneTask (Workflow chain 2 → 6)
  "LNS-2026-00250": buildLENS202600250FormData,
  // Phase B — Form1-None-EaClears (Workflow chain 2 → 6)
  "LNS-2026-00255": buildLENS202600255FormData,
  // Phase B — Form3Response-None-EaOverrulesSp (Workflow chain 2 → 7 → 6)
  "LNS-2026-00265": buildLENS202600265FormData,
  // Mixed Manual + Automated Job Categories demo — single Consumer
  // identifier with 4 services and 10 pre-seeded jobs (5 automated, 5
  // manual) for the CollectionTracker Manual vs Automated breakdown.
  "LNS-2026-00270": buildLENS202600270FormData,
  // Workflow 8 — IA Withdrawal (mid-collection). Portuguese EPOC-ER.
  // Demonstrates the Withdrawal handler: cancels pending delivery,
  // starts 45-day retention, flips caseStage to Withdrawn.
  "LNS-2026-00280": buildLENS202600280FormData,
  // Multi-tenant TPID demo — Contoso US + Contoso France share TPID-CONTOSO.
  // Exercises the EscalateToAttorneyDialog tenant + tpid scope variants.
  "LNS-2026-00300": buildLENS202600300FormData,
  // LE → internal service mapping failure demo (Romanian EPOC ER).
  // eEvidence Form 1's free-text Services field is where this failure
  // mode actually surfaces in production. Three identifiers, each
  // exercising a different resolver failure mode (unmapped-name x2 +
  // wrong-account-type x2). See mockCaseDataLENS202600310.ts.
  "LNS-2026-00310": buildLENS202600310FormData,
};

const cache = new Map<string, FormData>();

/** Resolves a case to its hydrated FormData, with a fallback path for
 *  legacy mocks that lack a dedicated builder.
 *
 *  Resolution order:
 *   1. Cached value (if any) — same memoised entry the dedicated
 *      builders write to.
 *   2. Dedicated builder in `CASE_DATA_BUILDERS` (rich, hand-curated).
 *   3. `MOCK_CASES` queue item + `buildFormDataFromQueueItem` factory
 *      (synthetic but complete enough for read-only surfaces like the
 *      preview pane's tripanel summary).
 *   4. `undefined` — only when the caseId isn't in MOCK_CASES either.
 *
 *  The factory output is cached on the same map so subsequent reads
 *  return the same object reference (stable for memoised consumers).
 */
export function getCaseFormDataById(caseId: string): FormData | undefined {
  if (cache.has(caseId)) return cache.get(caseId);
  const builder = CASE_DATA_BUILDERS[caseId];
  if (builder) {
    const data = builder();
    cache.set(caseId, data);
    return data;
  }
  // Legacy-mock fallback — synthesise FormData from the queue item so
  // every case in MOCK_CASES can render the preview-pane tripanel,
  // even without a dedicated builder. Enterprise Org stripe auto-
  // hides when `enterpriseContext` is absent, which is the right
  // outcome for these non-Enterprise terminal-state demos.
  const queueItem = MOCK_CASES.find((c) => c.caseId === caseId);
  if (!queueItem) return undefined;
  const data = buildFormDataFromQueueItem(queueItem);
  cache.set(caseId, data);
  return data;
}

/** Replace the cached FormData for a case. Used by the AttorneyReviewWorkspace
 *  so attorney actions taken in the focused review surface stay visible
 *  when the user navigates between surfaces in the same session. Surfaces
 *  outside the immediate caller won't auto-re-render — they'll pick up the
 *  new value on their next read. */
export function setCaseFormDataInRegistry(caseId: string, next: FormData): void {
  cache.set(caseId, next);
}

export function getAttorneyEscalation(
  caseId: string,
): AttorneyEscalation | undefined {
  return getCaseFormDataById(caseId)?.attorneyEscalation;
}

/** True when the case has an active (non-terminal) attorney escalation —
 *  status is Pending, InformationRequested, or Blocked. Terminal states
 *  (ApprovedForDelivery / ApprovedWithConditions) return false because
 *  the chip is cleared once the attorney clears the case. */
export function hasActiveAttorneyEscalation(caseId: string): boolean {
  const e = getAttorneyEscalation(caseId);
  if (!e) return false;
  return (
    e.status === "Pending" ||
    e.status === "InformationRequested" ||
    e.status === "Blocked"
  );
}

// ── Identifier search index ─────────────────────────────────────────────
// The queue + Attorney Dashboard need to match user search terms against
// the actual identifier values on each case (email addresses, phone
// numbers, account IDs, IP addresses…), not just the queue-level summary.
//
// Strategy: lazy + cached per case.
//   1. If the case has a dedicated builder in CASE_DATA_BUILDERS we reuse
//      `getCaseFormDataById` (already memoised, so this is free after the
//      first call from anywhere).
//   2. Otherwise we fall back to `buildFormDataFromQueueItem`, which
//      produces deterministic identifier values from `IDENTIFIER_SAMPLES`.
//      We memoise the *values* (not the full FormData) so the factory only
//      runs once per case.

const identifierValuesCache = new Map<string, string[]>();

/**
 * Returns the identifier values (email addresses, phone numbers, etc.)
 * for a case as they will appear inside the case form. Used by the queue
 * + Attorney Dashboard to drive identifier search. Cached per case.
 *
 * Pass the `CaseQueueItem` so we can fall back to the factory for cases
 * without a dedicated builder. Pass `undefined` and we'll only succeed
 * for cases that have a dedicated builder registered above.
 */
export function getCaseIdentifierValues(
  caseId: string,
  queueItem?: CaseQueueItem,
): string[] {
  const cached = identifierValuesCache.get(caseId);
  if (cached) return cached;

  let formData: FormData | undefined = getCaseFormDataById(caseId);
  if (!formData && queueItem) {
    formData = buildFormDataFromQueueItem(queueItem);
  }
  const values = formData?.identifiers?.map((i) => i.value).filter(Boolean) ?? [];
  identifierValuesCache.set(caseId, values);
  return values;
}
