/**
 * PaneToggleButton — reusable hide/show toggle for collapsible side panes.
 *
 * Matches the visual convention already used in CaseScopeHeader and
 * CaseHeaderActions: a 28×28 square button with a 14 px lucide icon, slate
 * hover, blue focus ring, and a sibling Tooltip whose text equals the
 * aria-label exactly (so sighted users and AT users hear the same identifier).
 *
 * Direction prop selects the icon pair:
 *   - "left":  PanelLeftClose (collapse) ↔ PanelLeftOpen (expand) — for panes
 *              docked to the left side of the workspace.
 *   - "right": PanelRightClose (collapse) ↔ PanelRightOpen (expand) — for
 *              panes docked to the right side.
 *
 * Designed to be drop-in reusable for the WorkflowListPane, Document panel,
 * Identifier panel, Correspondence panel, and any future collapsible surface.
 */
import * as React from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../ui/utils";

export interface PaneToggleButtonProps {
  /** Whether the pane is currently visible. Drives icon direction + label. */
  paneVisible: boolean;
  /** Click handler — typically a toggle from usePaneVisibility. */
  onClick: () => void;
  /** Which edge the pane is docked to. */
  direction: "left" | "right";
  /** Identifier for the pane this button controls — used in the tooltip
   *  and aria-label (e.g. "workflow", "document", "identifier"). */
  paneName: string;
  /** Optional extra classes on the button element. */
  className?: string;
}

export function PaneToggleButton({
  paneVisible,
  onClick,
  direction,
  paneName,
  className,
}: PaneToggleButtonProps) {
  const label = paneVisible
    ? `Hide ${paneName} pane`
    : `Show ${paneName} pane`;

  const Icon = paneVisible
    ? direction === "left"
      ? PanelLeftClose
      : PanelRightClose
    : direction === "left"
      ? PanelLeftOpen
      : PanelRightOpen;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={!paneVisible}
          className={cn(
            "inline-flex items-center justify-center h-7 w-7 rounded text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
            className,
          )}
        >
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
