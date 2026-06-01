/**
 * TruncatedText — span wrapper that surfaces a Radix Tooltip with the full
 * text **only when the rendered content is actually truncated by its
 * container**. Avoids the noise of "tooltip on every label, even short
 * ones" while still giving users a hover-to-reveal escape hatch when a
 * column / pane is narrow enough to clip the value.
 *
 * Use it anywhere the parent applies `truncate` (or any flexbox + min-w-0
 * pattern that clips overflow). Common spots:
 *   - Case ID / assignee chips in the case-list table (CaseQueueListRow).
 *   - Case ID / assignee in the workflow pane scope header
 *     (CaseScopeHeader) — pane is user-resizable, so narrow widths clip
 *     the text.
 *   - Country / Internal Escalation / sub-step labels.
 *
 * Implementation: ResizeObserver watches `scrollWidth > clientWidth` on
 * the inner <span>. When the result flips, the tooltip content is mounted
 * or unmounted. Detection re-runs whenever the children change.
 *
 * A11y: the underlying Radix Tooltip already wires `aria-describedby` on
 * the trigger so screen readers announce the full text on focus, not just
 * on hover.
 */

import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./tooltip";

export interface TruncatedTextProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** Optional override for the tooltip text. Defaults to `children`. Use
   *  this when the children include extra markup (e.g. emojis, icons)
   *  but the tooltip should be plain text. */
  tooltipText?: React.ReactNode;
  /** Tooltip side. Defaults to "top". */
  side?: "top" | "right" | "bottom" | "left";
}

export function TruncatedText({
  children,
  tooltipText,
  side = "top",
  className,
  ...rest
}: TruncatedTextProps) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      // scrollWidth is the intrinsic content width; clientWidth is the
      // rendered (clipped) width. A delta means CSS truncation is hiding
      // characters.
      setIsTruncated(el.scrollWidth > el.clientWidth + 1);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
    // Re-check whenever the rendered content changes — different text
    // length almost always changes scrollWidth.
  }, [children]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span ref={ref} className={className} {...rest}>
          {children}
        </span>
      </TooltipTrigger>
      {isTruncated && (
        <TooltipContent side={side}>
          {tooltipText ?? children}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
