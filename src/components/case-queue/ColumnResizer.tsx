/**
 * ColumnResizer — 4 px draggable bar that sits between two column
 * headers in the Detailed-list table. Resizes the column to its
 * left.
 *
 * Mouse drag updates the column width via `pointer` events so it
 * works with touch / pen too. Keyboard support: when focused, Arrow
 * Left / Right adjust the width in 8 px steps (Shift = 32 px). Home /
 * End jump to the column's min / max bounds. The handle exposes
 * `role="separator"` + `aria-valuenow` so screen readers can announce
 * the current width.
 *
 * Visual: invisible at rest. On hover or focus, a 2 px brand-tinted
 * line appears to confirm the affordance. Dragging upgrades the body
 * cursor to `col-resize` so the user sees the resize cue even when
 * their pointer drifts outside the 4 px hit area.
 */

import * as React from "react";
import { type ColumnId } from "./caseListColumns";

interface ColumnResizerProps {
  columnId: ColumnId;
  columnLabel: string;
  currentWidth: number;
  minWidth: number;
  maxWidth: number;
  onResize: (nextWidth: number) => void;
}

const KEY_STEP_PX = 8;
const KEY_STEP_BIG_PX = 32;

export function ColumnResizer({
  columnId,
  columnLabel,
  currentWidth,
  minWidth,
  maxWidth,
  onResize,
}: ColumnResizerProps) {
  // Width at drag-start — captured on pointerdown so the move handler
  // can compute a stable delta from a fixed baseline, independent of
  // any re-renders that fire mid-drag.
  const dragStartRef = React.useRef<{ x: number; width: number } | null>(null);

  const clamp = React.useCallback(
    (n: number) => Math.max(minWidth, Math.min(n, maxWidth)),
    [minWidth, maxWidth],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartRef.current = { x: e.clientX, width: currentWidth };
    e.currentTarget.setPointerCapture(e.pointerId);
    // Override the body cursor for the duration of the drag so the
    // user still sees the col-resize cue when their pointer drifts off
    // the 4 px hit area.
    document.body.style.cursor = "col-resize";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const next = clamp(dragStartRef.current.width + dx);
    if (next !== currentWidth) onResize(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.cursor = "";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEY_STEP_BIG_PX : KEY_STEP_PX;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        onResize(clamp(currentWidth - step));
        break;
      case "ArrowRight":
        e.preventDefault();
        onResize(clamp(currentWidth + step));
        break;
      case "Home":
        e.preventDefault();
        onResize(minWidth);
        break;
      case "End":
        e.preventDefault();
        onResize(maxWidth);
        break;
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${columnLabel} column — use arrow keys`}
      aria-valuenow={currentWidth}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      aria-valuetext={`${currentWidth} pixels wide`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      data-column-id={columnId}
      className="h-full cursor-col-resize group flex items-center justify-center focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className="h-2/3 w-px bg-transparent group-hover:bg-[#0078d4] group-focus-visible:bg-[#0078d4] group-focus-visible:w-[2px] transition-colors"
      />
    </div>
  );
}
