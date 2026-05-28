/**
 * ipHistoryStore — module-level cache of the most recent IP History
 * lookup per identifier, surfaced into the IdentifierTable's
 * "Last Logon Location" column.
 *
 * Why this exists:
 *   The LoginLocationPanel is mounted independently in four surfaces
 *   (AttorneyReviewWorkspace, DataEntryForm Triage, FulfillmentWizard
 *   inline Step 1, and the extracted Step1IdentifierReview). Each
 *   surface owns its own panel `open` state and runs its own query.
 *   We want the IdentifierTable column to surface "last logon" the
 *   moment the user clicks Look up locations — regardless of which
 *   surface they're in — without prop-drilling a callback through
 *   every mount point.
 *
 * Lifecycle:
 *   - Empty at module load. A row's column reads `null` until the
 *     attorney / RS / TS clicks Look up locations.
 *   - LoginLocationPanel writes the result to the store via
 *     `setLastLogon` when its query completes successfully.
 *   - IdentifierTableRow subscribes via `useSyncExternalStore`
 *     (snapshot is a stable reference until `setLastLogon` runs).
 *
 * The store key is `AccountIdentifier.id`. Identifier ids are
 * generated with `Date.now() + random` so they're effectively
 * unique across cases — no need to thread the case id through.
 */

import type { EnrichedLoginEvent } from "../types/crossBorder";

export interface IpHistoryLookup {
  /** Most recent (latest-timestamp) enriched login event in the query
   *  window. `null` when the query returned zero events. */
  lastEvent: EnrichedLoginEvent | null;
  /** Total events the lookup returned. Lets the row distinguish
   *  "no events found" (totalEvents=0) from "haven't run yet"
   *  (no store entry at all). */
  totalEvents: number;
  /** When the lookup completed. Surfaced as the "queried at" caption. */
  queriedAt: Date;
  /** YYYY-MM-DD range the lookup ran against. */
  rangeStart: string;
  rangeEnd: string;
}

type Listener = () => void;

const data = new Map<string, IpHistoryLookup>();
const listeners = new Set<Listener>();

// Stable snapshot reused as the empty-state fallback so consumers
// using `useSyncExternalStore` don't break snapshot equality on every
// read. Critical for avoiding infinite-update loops.
let snapshotVersion = 0;
let snapshotCache: ReadonlyMap<string, IpHistoryLookup> = data;

function bumpSnapshot(): void {
  snapshotVersion++;
  snapshotCache = new Map(data);
  for (const fn of listeners) fn();
}

export function getLastLogon(
  identifierId: string,
): IpHistoryLookup | undefined {
  return data.get(identifierId);
}

export function setLastLogon(
  identifierId: string,
  lookup: IpHistoryLookup,
): void {
  data.set(identifierId, lookup);
  bumpSnapshot();
}

export function clearLastLogon(identifierId: string): void {
  if (!data.has(identifierId)) return;
  data.delete(identifierId);
  bumpSnapshot();
}

export function getAllSnapshot(): ReadonlyMap<string, IpHistoryLookup> {
  return snapshotCache;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Diagnostic — used in tests / dev tools. */
export function _version(): number {
  return snapshotVersion;
}
