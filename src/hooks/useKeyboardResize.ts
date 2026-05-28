/**
 * useKeyboardResize — arrow-key resize support for `re-resizable`
 * handles. Returns props you spread onto the handle element so a
 * keyboard user can focus it, hear its current width via aria-valuenow,
 * and adjust the width with ArrowLeft / ArrowRight (Shift = larger step,
 * Home/End jump to min/max).
 *
 * Side panels in this app slide in from the right and have their resize
 * handle on the left edge. Convention: ArrowLeft *widens* the panel
 * (handle moves left, panel grows), ArrowRight shrinks it. The visual
 * direction matches what the user sees when dragging.
 *
 * Typical wiring:
 *
 *   const resizeProps = useKeyboardResize(panelWidth, onResize, {
 *     min: 420, max: 1200,
 *   });
 *   return <Resizable handleComponent={{ left: <div {...resizeProps} /> }} ... />;
 */

import * as React from "react";

interface UseKeyboardResizeOptions {
  /** Lower bound. Defaults to 0. */
  min?: number;
  /** Upper bound. Defaults to `Number.MAX_SAFE_INTEGER`. */
  max?: number;
  /** Pixels per arrow press. Defaults to 16. */
  step?: number;
  /** Pixels per Shift+arrow press. Defaults to 64. */
  bigStep?: number;
  /** Label announced for the handle. Defaults to "Resize panel". */
  label?: string;
  /** Suffix added to the live announcement (e.g., "pixels wide").
   *  Defaults to "pixels". */
  unitLabel?: string;
}

interface KeyboardResizeProps {
  tabIndex: 0;
  role: "separator";
  "aria-orientation": "vertical";
  "aria-label": string;
  "aria-valuenow": number;
  "aria-valuemin": number;
  "aria-valuemax": number;
  "aria-valuetext": string;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function useKeyboardResize(
  width: number,
  onResize: (next: number) => void,
  options: UseKeyboardResizeOptions = {},
): KeyboardResizeProps {
  const {
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
    step = 16,
    bigStep = 64,
    label = "Resize panel",
    unitLabel = "pixels",
  } = options;

  const clamp = React.useCallback(
    (n: number) => Math.max(min, Math.min(max, n)),
    [min, max],
  );

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      // Convention (matches the visual drag): ArrowLeft widens the panel
      // (handle moves left → panel grows), ArrowRight shrinks it.
      const delta = e.shiftKey ? bigStep : step;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onResize(clamp(width + delta));
          break;
        case "ArrowRight":
          e.preventDefault();
          onResize(clamp(width - delta));
          break;
        case "Home":
          e.preventDefault();
          onResize(max);
          break;
        case "End":
          e.preventDefault();
          onResize(min);
          break;
      }
    },
    [width, onResize, clamp, step, bigStep, min, max],
  );

  return {
    tabIndex: 0,
    role: "separator",
    "aria-orientation": "vertical",
    "aria-label": label,
    "aria-valuenow": width,
    "aria-valuemin": min,
    "aria-valuemax": max,
    "aria-valuetext": `${width} ${unitLabel}`,
    onKeyDown,
  };
}
