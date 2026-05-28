/**
 * PageContainer — the centered content column for case-management pages.
 *
 * Wraps body content (NOT the sticky case header — see decision in the
 * UX-Polish "review-the-code-and-nested-locket" plan, Phase 3) at a
 * `max-width` of `var(--page-max-w)` with horizontal gutters of
 * `var(--page-gutter-x)`. Centers via `mx-auto`.
 *
 * Why body-only:
 *   - The sticky case header (workflow stage banner + `CaseHeaderSummary`)
 *     keeps its action chips (assignee, escalate, resolve, save, check
 *     jobs) anchored to the screen edge for one-glance discoverability.
 *     Wrapping it in the centered container would float the chips inward
 *     and lose that anchor on wide monitors.
 *   - Right-edge slide-out panels (DocumentViewerPanel, IdentifierPanel,
 *     CorrespondencePanel) continue to overlay the centered container at
 *     a higher z-index — they're outside this wrapper too.
 *
 * Token coupling: both `--page-max-w` and `--page-gutter-x` are defined
 * in `src/styles/globals.css`. Phase 3 sets `--page-max-w` to 1280px;
 * Phase 2 already bumped `--page-gutter-x` to 32px. Tuning either token
 * re-flows every page that uses this wrapper.
 */

import * as React from "react";
import { cn } from "../ui/utils";

export interface PageContainerProps {
  /** Container content. Typically a page's body sections — not the
   *  sticky header above and not the right-edge panel overlays. */
  children: React.ReactNode;
  /** Optional extra classes on the centered wrapper. Use sparingly —
   *  width / padding tokens should stay on the wrapper itself so the
   *  airy retune is a single CSS diff. */
  className?: string;
  /** Render as a `<main>` element for the page route content (CaseQueue,
   *  DataEntryForm body, CollectionTracker body). Defaults to `<div>`
   *  because most callers already sit inside a parent `<main>` or
   *  similar landmark. */
  as?: "div" | "main" | "section";
}

export function PageContainer({
  children,
  className,
  as: Tag = "div",
}: PageContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full",
        "max-w-[var(--page-max-w)]",
        "px-[var(--page-gutter-x)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
