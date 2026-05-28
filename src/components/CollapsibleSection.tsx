import React, { useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "./ui/utils";

interface CollapsibleSectionProps {
  /** Unique section identifier for state tracking */
  sectionId: string;
  /** Whether the section is open by default */
  defaultOpen?: boolean;
  /** The header content (icon, title, subtitle area) */
  header: React.ReactNode;
  /** Optional actions to render on the right side of the header (badges, buttons) */
  headerActions?: React.ReactNode;
  /** Content to show/hide */
  children: React.ReactNode;
  /** Optional className for the outer wrapper */
  className?: string;
  /** Whether the header has a bottom border (most sections do) */
  headerBorder?: boolean;
  /** Custom header padding override */
  headerClassName?: string;
  /** Optional collapsed summary text/badge shown next to chevron when collapsed */
  collapsedSummary?: React.ReactNode;
  /** External control: if provided, overrides internal state */
  isOpen?: boolean;
  /** External control: callback when toggle is clicked */
  onToggle?: (isOpen: boolean) => void;
  /** aria-label for the toggle button */
  ariaLabel?: string;
}

/**
 * CollapsibleSection — Progressive disclosure wrapper for form sections.
 * 
 * Wraps the content of a card section, keeping the header always visible
 * with a chevron toggle to expand/collapse the body content.
 * 
 * Usage:
 *   <PrimaryCard accent="blue">
 *     <CollapsibleSection
 *       sectionId="case-details"
 *       defaultOpen={true}
 *       header={<div className="flex items-center gap-3">...</div>}
 *       headerActions={<Badge>...</Badge>}
 *     >
 *       {/* card body content *\/}
 *     </CollapsibleSection>
 *   </PrimaryCard>
 */
export function CollapsibleSection({
  sectionId,
  defaultOpen = true,
  header,
  headerActions,
  children,
  className,
  headerBorder = true,
  headerClassName,
  collapsedSummary,
  isOpen: controlledIsOpen,
  onToggle,
  ariaLabel,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    if (onToggle) {
      onToggle(newState);
    } else {
      setInternalOpen(newState);
    }
  }, [isOpen, onToggle]);

  const hasActions = !!(headerActions || (!isOpen && collapsedSummary));

  return (
    <div className={cn("p-4", className)} data-section-id={sectionId}>
      {/* Header row */}
      <div
        className={cn(
          "w-full flex items-center gap-3",
          headerBorder && isOpen && "pb-3 border-b border-[#edebe9]",
          headerBorder && !isOpen && "pb-0",
          headerClassName,
        )}
      >
        {/* Clickable toggle area */}
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "flex items-center gap-3 flex-1 min-w-0 cursor-pointer group text-left",
            "transition-colors duration-150 rounded-sm py-0.5 px-1",
            "hover:bg-[#f3f2f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0078d4] focus-visible:ring-offset-1",
          )}
          aria-expanded={isOpen}
          aria-controls={`${sectionId}-content`}
          aria-label={ariaLabel || `Toggle ${sectionId} section`}
        >
          {/* Chevron */}
          <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[#605e5c] group-hover:text-[#323130] transition-transform duration-200">
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                !isOpen && "-rotate-90"
              )}
            />
          </div>
          {/* Header content */}
          <div className="flex items-center gap-3 min-w-0">{header}</div>
        </button>
        {/* Actions area — outside the button to avoid nested <button> DOM nesting */}
        {hasActions && (
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            {!isOpen && collapsedSummary && (
              <div className="text-xs text-[#605e5c]">{collapsedSummary}</div>
            )}
            {headerActions}
          </div>
        )}
      </div>

      {/* Collapsible Content */}
      <div
        id={`${sectionId}-content`}
        role="region"
        aria-labelledby={`${sectionId}-header`}
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[10000px] opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
        )}
        style={{
          // Use a very large max-height for open state; CSS transition handles the animation
          visibility: isOpen ? "visible" : "hidden",
        }}
      >
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * CollapsibleSectionCustomHeader — For sections like Agency Details
 * that have custom header layouts (gradient backgrounds, etc.)
 * This version separates the header area from the content area,
 * adding just a toggle button rather than wrapping the entire header.
 */
interface CollapsibleSectionCustomHeaderProps {
  sectionId: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function useCollapsibleSections(
  sectionIds: string[],
  defaultOpen: Record<string, boolean> = {}
) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sectionIds.forEach((id) => {
      initial[id] = defaultOpen[id] !== undefined ? defaultOpen[id] : true;
    });
    return initial;
  });

  const toggle = useCallback((sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const isOpen = useCallback(
    (sectionId: string) => openSections[sectionId] ?? true,
    [openSections]
  );

  const expandAll = useCallback(() => {
    setOpenSections((prev) => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        next[key] = true;
      });
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setOpenSections((prev) => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        next[key] = false;
      });
      return next;
    });
  }, []);

  const allExpanded = Object.values(openSections).every(Boolean);
  const allCollapsed = Object.values(openSections).every((v) => !v);

  return {
    openSections,
    toggle,
    isOpen,
    expandAll,
    collapseAll,
    allExpanded,
    allCollapsed,
  };
}