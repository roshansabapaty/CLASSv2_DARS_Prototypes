/**
 * useFocusRestoration — restore keyboard focus to the element that was
 * focused before a dialog / panel / overlay opened. Tracks
 * `document.activeElement` when `active` flips true, then re-focuses it
 * when `active` flips false.
 *
 * Designed for non-Radix overlays. Radix's Dialog / Popover primitives
 * already manage focus restoration internally — use this hook for
 * custom panels (DocumentViewerPanel, CorrespondencePanel, IdentifierPanel)
 * and any AlertDialog wrappers that don't ship with built-in restoration.
 *
 * Fallback chain when the original trigger is gone (e.g., unmounted while
 * the overlay was open):
 *   1. `fallbackRef.current` — caller-supplied target
 *   2. `[role="main"]` — the page's main landmark
 *   3. `document.body` — last resort so focus never disappears
 */

import * as React from "react";

interface UseFocusRestorationOptions {
  /** Override the captured `activeElement`. Useful when the trigger
   *  unmounts mid-flow but the caller knows where focus should land. */
  fallbackRef?: React.RefObject<HTMLElement | null>;
  /** Skip restoration entirely (e.g., when the caller wants its own
   *  focus management). Defaults to false. */
  skipRestore?: boolean;
}

export function useFocusRestoration(
  active: boolean,
  options: UseFocusRestorationOptions = {},
): void {
  const { fallbackRef, skipRestore = false } = options;
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  // Capture the active element each time we transition into the active
  // state. We deliberately capture on the entering edge so the user can
  // re-open the overlay and have focus restored to the latest trigger.
  React.useEffect(() => {
    if (!active) return;
    const current = document.activeElement;
    previouslyFocusedRef.current =
      current instanceof HTMLElement ? current : null;
  }, [active]);

  // Restore on the trailing edge: when `active` flips back to false (or
  // the component unmounts while still active).
  React.useEffect(() => {
    if (active || skipRestore) return;
    const target = resolveFocusTarget(
      previouslyFocusedRef.current,
      fallbackRef?.current ?? null,
    );
    // Defer to the next paint so any DOM teardown the overlay does on
    // close (Radix portals unmounting, etc.) finishes before we touch
    // focus. Otherwise the browser can ignore the .focus() call.
    const id = requestAnimationFrame(() => {
      try {
        target.focus({ preventScroll: false });
      } catch {
        // Element may have detached between the rAF schedule and fire.
      }
    });
    return () => cancelAnimationFrame(id);
  }, [active, skipRestore, fallbackRef]);
}

function resolveFocusTarget(
  primary: HTMLElement | null,
  fallback: HTMLElement | null,
): HTMLElement {
  if (primary && document.contains(primary)) return primary;
  if (fallback && document.contains(fallback)) return fallback;
  const main = document.querySelector<HTMLElement>('[role="main"], main');
  if (main) return main;
  return document.body;
}
