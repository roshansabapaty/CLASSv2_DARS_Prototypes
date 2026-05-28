/**
 * useCountdownTick — returns a Date that re-renders the consumer once a
 * minute. Cheap enough to mount on every queue card / sticky header without
 * burning CPU, and granular enough to flip an SLA chip from OnTrack →
 * Approaching → Overdue while the user is looking at the page.
 *
 * The shared global tick avoids hundreds of independent setInterval timers
 * on a queue with many cards — every consumer subscribes to the same Date.
 */

import { useEffect, useState } from "react";

const TICK_MS = 60_000; // 1 minute

let listeners: Set<(d: Date) => void> | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
let lastNow = new Date();

function ensureInterval(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(() => {
    lastNow = new Date();
    listeners?.forEach((fn) => fn(lastNow));
  }, TICK_MS);
}

function subscribe(fn: (d: Date) => void): () => void {
  if (!listeners) listeners = new Set();
  listeners.add(fn);
  ensureInterval();
  return () => {
    listeners?.delete(fn);
    if (listeners && listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

export function useCountdownTick(): Date {
  const [now, setNow] = useState<Date>(() => lastNow);
  useEffect(() => {
    const unsub = subscribe(setNow);
    // Sync immediately in case the shared `lastNow` is newer than our
    // initial state (mounted between ticks).
    setNow(lastNow);
    return unsub;
  }, []);
  return now;
}
