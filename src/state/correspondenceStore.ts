/**
 * correspondenceStore — module-level singleton holding the latest
 * correspondence items per case across the prototype.
 *
 * Why this exists: cross-case notification surfaces (AppHeader bell, queue
 * card badges) need to read correspondence for cases the user isn't
 * currently viewing. The active case's `FormData.correspondence` covers the
 * in-case experience; this store is the cross-case mirror.
 *
 * Lifecycle:
 *  - Seeded once at module import from `MOCK_CORRESPONDENCE_SEEDS`.
 *  - Mutators in DataEntryForm and CollectionTracker call `set(caseId, …)`
 *    after every correspondence write so the store stays current.
 *  - Mock case builders read `get(caseId)` to hydrate the active
 *    FormData when the user opens a case (so cross-case mutations carry
 *    over from earlier sessions in the same browser tab).
 *
 * Subscribe API is built for `useSyncExternalStore` so consumers re-render
 * on changes with stable identities.
 */

import type { CorrespondenceItem } from "../types/correspondence";
import { MOCK_CORRESPONDENCE_SEEDS } from "../data/mockCorrespondenceSeeds";

type Listener = () => void;

const data = new Map<string, CorrespondenceItem[]>();
const listeners = new Set<Listener>();

// Stable empty array reused as the fallback for cases with no entry. Critical
// for `useSyncExternalStore`: a fresh `[]` per call breaks snapshot equality
// and triggers an infinite-update loop → render crash.
const EMPTY_ITEMS: ReadonlyArray<CorrespondenceItem> = Object.freeze([]);

// Seed at module load. We use a fresh Map identity each time `get` is
// called via `getSnapshot` so that consumers see a stable reference until
// `set` runs.
let snapshotVersion = 0;
let snapshotCache: ReadonlyMap<string, CorrespondenceItem[]> = data;

function bumpSnapshot(): void {
  snapshotVersion++;
  snapshotCache = new Map(data);
  for (const fn of listeners) fn();
}

// Initial seed.
for (const [caseId, items] of Object.entries(MOCK_CORRESPONDENCE_SEEDS)) {
  data.set(caseId, items);
}
snapshotCache = new Map(data);

export function get(caseId: string): CorrespondenceItem[] {
  return (data.get(caseId) ?? EMPTY_ITEMS) as CorrespondenceItem[];
}

export function set(caseId: string, items: CorrespondenceItem[]): void {
  data.set(caseId, items);
  bumpSnapshot();
}

export function getAllSnapshot(): ReadonlyMap<string, CorrespondenceItem[]> {
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
