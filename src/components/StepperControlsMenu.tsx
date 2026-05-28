import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import {
  ChevronsUp,
  ChevronsDown,
  ChevronDown,
  Layers,
  ListCollapse,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { cn } from "./ui/utils";

interface StepperControlsMenuProps {
  /** Whether all inner cards are expanded */
  allCardsExpanded: boolean;
  /** Expand all inner cards */
  expandAllCards: () => void;
  /** Collapse all inner cards */
  collapseAllCards: () => void;
  /** Whether multi-step mode is active */
  multiStepMode: boolean;
  /** Toggle multi-step mode */
  onToggleMultiStep: () => void;
  /** Expand all accordion steps (enters multi-step + opens all) */
  onExpandAllSteps: () => void;
  /** Collapse to single active step */
  onCollapseToActive: () => void;
}

export function StepperControlsMenu({
  allCardsExpanded,
  expandAllCards,
  collapseAllCards,
  multiStepMode,
  onToggleMultiStep,
  onExpandAllSteps,
  onCollapseToActive,
}: StepperControlsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      {/* Split button: primary action + dropdown trigger */}
      <div className="flex items-center">
        {/* Primary action: quick toggle cards */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={allCardsExpanded ? collapseAllCards : expandAllCards}
          className="h-7 text-xs text-[#0078d4] hover:text-[#106ebe] hover:bg-[#f3f2f1] px-2 whitespace-nowrap rounded-r-none"
        >
          {allCardsExpanded ? (
            <><ChevronsUp className="w-3.5 h-3.5 mr-1" />Collapse Cards</>
          ) : (
            <><ChevronsDown className="w-3.5 h-3.5 mr-1" />Expand Cards</>
          )}
        </Button>
        {/* Dropdown chevron */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="h-7 text-xs text-[#0078d4] hover:text-[#106ebe] hover:bg-[#f3f2f1] px-1.5 rounded-l-none border-l border-[#e1dfdd]"
          aria-label="More view options"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      {/* Dropdown menu */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#e1dfdd] rounded-md shadow-lg z-50 py-1"
        >
          {/* Card controls */}
          <div className="px-2 py-1">
            <span className="text-[10px] text-[#a19f9d] uppercase tracking-wider">Detail Cards</span>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => { expandAllCards(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#323130] hover:bg-[#f3f2f1] cursor-pointer text-left"
          >
            <ChevronsDown className="w-3.5 h-3.5 text-[#605e5c]" />
            Expand All Cards
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { collapseAllCards(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#323130] hover:bg-[#f3f2f1] cursor-pointer text-left"
          >
            <ChevronsUp className="w-3.5 h-3.5 text-[#605e5c]" />
            Collapse All Cards
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-[#edebe9]" />

          {/* Step controls */}
          <div className="px-2 py-1">
            <span className="text-[10px] text-[#a19f9d] uppercase tracking-wider">Wizard Steps</span>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onToggleMultiStep(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#323130] hover:bg-[#f3f2f1] cursor-pointer text-left"
          >
            <Layers className="w-3.5 h-3.5 text-[#605e5c]" />
            <span className="flex-1">Multi-Step View</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded",
                multiStepMode
                  ? "bg-[#deecf9] text-[#0078d4]"
                  : "bg-[#f3f2f1] text-[#a19f9d]"
              )}
            >
              {multiStepMode ? "ON" : "OFF"}
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onExpandAllSteps(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#323130] hover:bg-[#f3f2f1] cursor-pointer text-left"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#605e5c]" />
            Expand All Steps
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => { onCollapseToActive(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#323130] hover:bg-[#f3f2f1] cursor-pointer text-left"
          >
            <ListCollapse className="w-3.5 h-3.5 text-[#605e5c]" />
            Collapse to Active Step
          </button>
        </div>
      )}
    </div>
  );
}
