/**
 * useDragAutoScroll — auto-scroll a container horizontally (and/or
 * vertically) while the user is dragging something near its edges.
 *
 * Fluent v9 doesn't ship a drag-auto-scroll utility (its DataGrid
 * doesn't bake it in either) so this hook is the prototype's bridge:
 * attach a ref to whatever element clips the table, and the hook will
 * listen for `dragover` events on it and pan the scroll position via
 * `requestAnimationFrame` as long as the pointer stays inside a hot
 * zone near the edge.
 *
 * The hot zone is `edgeWidth` pixels deep. Scroll speed ramps from
 * `minSpeed` at the outer edge of the zone up to `maxSpeed` when the
 * pointer reaches (or crosses) the container's edge, so casual edge
 * brushes don't fling the table.
 *
 * Used by `CaseQueueListHeader` (via the parent table container) so the
 * user can drag a column past the visible edge to drop it in a
 * currently-off-screen position.
 */

import { useEffect, useRef } from "react";

export interface DragAutoScrollOptions {
  /** Pixel depth of the hot zone at each edge. Defaults to 60. */
  edgeWidth?: number;
  /** Lower bound on scroll-per-frame (px). Defaults to 2. */
  minSpeed?: number;
  /** Upper bound on scroll-per-frame (px). Defaults to 14. */
  maxSpeed?: number;
  /** Set to false to disable the listeners (e.g. when no drag is
   *  active, or on a surface where the hook is conditionally wired). */
  enabled?: boolean;
  /** Which axes to auto-scroll. Default is horizontal only — the case
   *  list grid scrolls horizontally for column reorder but its rows are
   *  in a vertically-scrolling parent (which is fine to leave alone).
   */
  axis?: "x" | "y" | "both";
}

export function useDragAutoScroll<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  opts: DragAutoScrollOptions = {},
): void {
  const {
    edgeWidth = 60,
    minSpeed = 2,
    maxSpeed = 14,
    enabled = true,
    axis = "x",
  } = opts;

  // requestAnimationFrame handle — refs survive across renders without
  // triggering re-render when set.
  const rafRef = useRef<number | null>(null);
  // Current scroll vector. `{ vx, vy }` in px-per-frame. Null = idle.
  const vRef = useRef<{ vx: number; vy: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const cancelRaf = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const step = () => {
      const node = ref.current;
      const v = vRef.current;
      if (!node || !v) {
        rafRef.current = null;
        return;
      }
      if (v.vx !== 0) node.scrollLeft += v.vx;
      if (v.vy !== 0) node.scrollTop += v.vy;
      rafRef.current = requestAnimationFrame(step);
    };

    const computeSpeed = (distInside: number): number => {
      // distInside: how far past the outer edge of the hot zone the
      // pointer is, in pixels (0 = at the outer edge, edgeWidth = at the
      // container's edge). Ramp linearly between minSpeed and maxSpeed.
      const t = Math.max(0, Math.min(1, distInside / edgeWidth));
      return Math.round(minSpeed + (maxSpeed - minSpeed) * t);
    };

    const onDragOver = (e: DragEvent) => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      let vx = 0;
      let vy = 0;
      if (axis === "x" || axis === "both") {
        const fromLeft = e.clientX - rect.left;
        const fromRight = rect.right - e.clientX;
        if (fromLeft < edgeWidth && node.scrollLeft > 0) {
          vx = -computeSpeed(edgeWidth - fromLeft);
        } else if (
          fromRight < edgeWidth &&
          node.scrollLeft + node.clientWidth < node.scrollWidth
        ) {
          vx = computeSpeed(edgeWidth - fromRight);
        }
      }
      if (axis === "y" || axis === "both") {
        const fromTop = e.clientY - rect.top;
        const fromBottom = rect.bottom - e.clientY;
        if (fromTop < edgeWidth && node.scrollTop > 0) {
          vy = -computeSpeed(edgeWidth - fromTop);
        } else if (
          fromBottom < edgeWidth &&
          node.scrollTop + node.clientHeight < node.scrollHeight
        ) {
          vy = computeSpeed(edgeWidth - fromBottom);
        }
      }
      if (vx === 0 && vy === 0) {
        // Out of hot zone — stop the scroll loop.
        vRef.current = null;
        cancelRaf();
        return;
      }
      // Set the new vector and (re)start the loop if it's idle.
      vRef.current = { vx, vy };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    const stop = () => {
      vRef.current = null;
      cancelRaf();
    };

    el.addEventListener("dragover", onDragOver);
    el.addEventListener("drop", stop);
    el.addEventListener("dragleave", stop);
    el.addEventListener("dragend", stop);
    // Failsafe: a drag that ends outside the container's bounds (the
    // browser's ghost flies off and the dragend fires on <body>) should
    // also stop the scroll loop.
    document.addEventListener("dragend", stop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("drop", stop);
      el.removeEventListener("dragleave", stop);
      el.removeEventListener("dragend", stop);
      document.removeEventListener("dragend", stop);
      cancelRaf();
    };
  }, [ref, edgeWidth, minSpeed, maxSpeed, enabled, axis]);
}
