/**
 * useResizablePaneWidth — drag-to-resize hook for the WorkflowListPane.
 *
 * Returns the current width plus pointer / keyboard handlers ready to wire
 * to a thin resize handle on the right edge of the pane. Mirrors how Teams
 * lets users resize the channel / chat list pane. Width persists per-user
 * via localStorage so the choice round-trips across sessions.
 *
 * Bounds:
 *   - Min ~ 240 px (anything narrower truncates the case-id chip).
 *   - Max ~ 480 px (above that the pane starts dominating the workspace).
 *
 * Keyboard nav: when the handle is focused, ←/→ shift width ±8 px and
 * Home/End jump to the min/max. The handle exposes `role="separator"` with
 * `aria-orientation="vertical"` + `aria-valuenow / aria-valuemin /
 * aria-valuemax` so AT users get a meaningful resize affordance.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface ResizablePaneOptions {
  /** Initial / default width when no stored value exists. */
  defaultWidth: number;
  /** Lower bound — handle won't drag below this. */
  minWidth: number;
  /** Upper bound — handle won't drag above this. */
  maxWidth: number;
  /** localStorage key for persistence. */
  storageKey: string;
}

interface PointerDownHandlers {
  /** Spread onto the resize-handle element. */
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function useResizablePaneWidth({
  defaultWidth,
  minWidth,
  maxWidth,
  storageKey,
}: ResizablePaneOptions): [number, PointerDownHandlers, () => void] {
  // Read persisted width once on mount. Clamp aggressively so a stale
  // localStorage value from before a min/max change can't render the pane
  // at an unusable size.
  const [width, setWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? Number.parseInt(raw, 10) : NaN;
      if (Number.isFinite(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed;
      }
    } catch {
      /* localStorage may be blocked */
    }
    return defaultWidth;
  });

  // Persist subsequent changes.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(width));
    } catch {
      /* localStorage may be blocked */
    }
  }, [width, storageKey]);

  // Ref-based drag state so pointer handlers don't need to re-bind on every
  // width update.
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragRef.current = { startX: event.clientX, startWidth: width };

      function onMove(ev: PointerEvent) {
        if (!dragRef.current) return;
        const delta = ev.clientX - dragRef.current.startX;
        const next = Math.max(
          minWidth,
          Math.min(maxWidth, dragRef.current.startWidth + delta),
        );
        setWidth(next);
      }

      function onUp() {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [width, minWidth, maxWidth],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const STEP = 8;
      let next: number | null = null;
      if (event.key === "ArrowLeft") next = width - STEP;
      else if (event.key === "ArrowRight") next = width + STEP;
      else if (event.key === "Home") next = minWidth;
      else if (event.key === "End") next = maxWidth;
      if (next === null) return;
      event.preventDefault();
      setWidth(Math.max(minWidth, Math.min(maxWidth, next)));
    },
    [width, minWidth, maxWidth],
  );

  // Double-click on the handle resets to the default width. Mirrors Teams'
  // affordance for "I dragged too far, undo." Wired by the caller via the
  // returned reset function (we expose it separately so the caller can
  // bind it however makes sense — typically `onDoubleClick`).
  const resetWidth = useCallback(() => {
    setWidth(defaultWidth);
  }, [defaultWidth]);

  return [width, { onPointerDown, onKeyDown }, resetWidth];
}
