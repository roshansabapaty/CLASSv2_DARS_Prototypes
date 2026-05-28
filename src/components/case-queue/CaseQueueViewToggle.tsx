/**
 * CaseQueueViewToggle — three-button icon group that switches the case
 * list between Cards / Detailed list / Preview pane.
 *
 * Mirrors the Outlook "View" toggle pattern: a single segmented control
 * where the active mode is filled, the others are subtle. Each button
 * carries `aria-pressed` so screen readers announce the toggle state,
 * and the group itself is `role="group"` with an aria-label.
 *
 * Visual: a 1px-bordered rounded chip housing the three icons. The
 * pressed button takes brand background + white icon; unpressed
 * buttons stay neutral. Hover on unpressed = subtle background tint.
 */

import { LayoutGrid, List, PanelRight } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../ui/utils";

export type CaseListViewMode = "cards" | "list" | "preview";

export const VIEW_MODE_LABEL: Record<CaseListViewMode, string> = {
  cards: "Card view",
  list: "Detailed list view",
  preview: "Preview pane view",
};

interface ViewToggleOption {
  value: CaseListViewMode;
  label: string;
  shortcut: string;
  Icon: typeof LayoutGrid;
}

const OPTIONS: ViewToggleOption[] = [
  { value: "cards", label: "Cards", shortcut: "Ctrl+1", Icon: LayoutGrid },
  { value: "list", label: "Detailed list", shortcut: "Ctrl+2", Icon: List },
  { value: "preview", label: "Preview pane", shortcut: "Ctrl+3", Icon: PanelRight },
];

interface CaseQueueViewToggleProps {
  value: CaseListViewMode;
  onChange: (next: CaseListViewMode) => void;
  /** When true, the Preview-pane button is disabled (e.g., viewport is too
   *  narrow). The tooltip explains why. */
  previewDisabled?: boolean;
}

export function CaseQueueViewToggle({
  value,
  onChange,
  previewDisabled = false,
}: CaseQueueViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="Case list view mode"
      className="inline-flex items-center gap-0.5 rounded-md border border-[#c8c6c4] bg-white p-0.5"
    >
      <TooltipProvider>
        {OPTIONS.map(({ value: optValue, label, shortcut, Icon }) => {
          const isActive = value === optValue;
          const isDisabled = optValue === "preview" && previewDisabled;
          return (
            <Tooltip key={optValue}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={isActive}
                  aria-label={label}
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) onChange(optValue);
                  }}
                  className={cn(
                    "h-8 w-8 p-0 rounded",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
                    isActive
                      ? "bg-[#0078d4] text-white hover:bg-[#106ebe] hover:text-white"
                      : "text-[#605e5c] hover:bg-[#f3f2f1] hover:text-[#323130]",
                    isDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-[#605e5c]",
                  )}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div style={{ fontWeight: 600 }}>{label}</div>
                  <div className="text-slate-400 mt-0.5">
                    {isDisabled
                      ? "Resize window wider to enable"
                      : shortcut}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
