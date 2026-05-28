import React, { useState, useCallback, useRef } from "react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import {
  ChevronDown,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

export interface StepperSection {
  /** Unique key for the section */
  key: string;
  /** Display label */
  label: string;
  /** Lucide icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** The content to render inside the section */
  content: React.ReactNode;
  /** Optional collapsed summary shown when section is not active */
  collapsedSummary?: React.ReactNode;
  /** Optional action rendered inside the EXPANDED section footer, next to
   *  the Previous / Next navigation buttons. Mirrors the header's
   *  `collapsedSummary` for status indicators so the active section's
   *  status is visible without scrolling back to the top. */
  footerAction?: React.ReactNode;
}

interface AccordionStepperProps {
  /** Ordered list of sections */
  sections: StepperSection[];
  /** Set of section keys that are considered "complete" */
  completedSections?: Set<string>;
  /** Optional toggle button (e.g. Collapse All / Expand All) */
  sectionToggleButton?: React.ReactNode;
  /** Class name for the outer container */
  className?: string;
  /** Controlled mode: externally managed active section key */
  activeKey?: string;
  /** Controlled mode: callback when active section changes */
  onActiveKeyChange?: (key: string) => void;
  /** Multi-expand mode: allow multiple sections open simultaneously */
  multiExpand?: boolean;
  /** Controlled set of expanded keys (multi-expand mode) */
  expandedKeys?: Set<string>;
  /** Callback when expanded keys change (multi-expand mode) */
  onExpandedKeysChange?: (keys: Set<string>) => void;
}

/**
 * Finds the nearest scrollable ancestor of an element.
 */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = getComputedStyle(node);
    if (
      style.overflowY === "auto" ||
      style.overflowY === "scroll" ||
      style.overflow === "auto" ||
      style.overflow === "scroll"
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * AccordionStepper — Vertical accordion stepper layout.
 *
 * Only one section is expanded at a time. Each section footer has
 * Continue / Back buttons. A compact progress rail at the top shows
 * which sections are complete with checkmarks.
 *
 * Uses instant display toggle (not height animation) to avoid
 * layout instability and footer gap issues during transitions.
 */
export function AccordionStepper({
  sections,
  completedSections = new Set(),
  sectionToggleButton,
  className,
  activeKey: controlledActiveKey,
  onActiveKeyChange,
  multiExpand = false,
  expandedKeys: controlledExpandedKeys,
  onExpandedKeysChange,
}: AccordionStepperProps) {
  const [internalActiveKey, setInternalActiveKey] = useState<string>(sections[0]?.key ?? "");
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Controlled vs uncontrolled: use external key/setter if provided
  const activeKey = controlledActiveKey ?? internalActiveKey;
  const setActiveKey = onActiveKeyChange ?? setInternalActiveKey;

  const expandedKeys = controlledExpandedKeys ?? internalExpandedKeys;
  const setExpandedKeys = onExpandedKeysChange ?? setInternalExpandedKeys;

  const activeIndex = sections.findIndex((s) => s.key === activeKey);

  /**
   * Scrolls the nearest scroll-ancestor so the progress rail
   * (top of the accordion container) is visible, with a small offset.
   */
  const scrollToTop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    // Allow the DOM to update before measuring
    requestAnimationFrame(() => {
      const scrollParent = findScrollParent(el);
      if (scrollParent) {
        // Calculate the position of the accordion top relative to the scroll container
        const containerRect = el.getBoundingClientRect();
        const parentRect = scrollParent.getBoundingClientRect();
        const offset = containerRect.top - parentRect.top + scrollParent.scrollTop;
        scrollParent.scrollTo({ top: Math.max(0, offset - 8), behavior: "smooth" });
      } else {
        // Fallback: use scrollIntoView on the container itself
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }, []);

  const goTo = useCallback(
    (key: string) => {
      setActiveKey(key);
      scrollToTop();
    },
    [scrollToTop]
  );

  const goNext = useCallback(() => {
    if (activeIndex < sections.length - 1) {
      goTo(sections[activeIndex + 1].key);
    }
  }, [activeIndex, sections, goTo]);

  const goBack = useCallback(() => {
    if (activeIndex > 0) {
      goTo(sections[activeIndex - 1].key);
    }
  }, [activeIndex, sections, goTo]);

  const toggleSection = useCallback(
    (key: string) => {
      if (activeKey === key) {
        // Collapse the active section (allow all-collapsed state)
        setActiveKey("");
      } else {
        setActiveKey(key);
        scrollToTop();
      }
    },
    [activeKey, scrollToTop]
  );

  const toggleExpand = useCallback(
    (key: string) => {
      if (expandedKeys.has(key)) {
        setExpandedKeys(new Set([...expandedKeys].filter(k => k !== key)));
      } else {
        setExpandedKeys(new Set([...expandedKeys, key]));
      }
    },
    [expandedKeys, setExpandedKeys]
  );

  return (
    <div ref={containerRef} className={cn("space-y-0", className)}>
      {/* ── Progress Rail ── */}
      <div className="bg-[#f3f2f1] border border-[#e1dfdd] rounded-t-lg px-3 py-2">
        <div className="flex items-center justify-end gap-2">
          {sectionToggleButton && (
            <div className="flex items-center shrink-0">
              {sectionToggleButton}
            </div>
          )}
        </div>
      </div>

      {/* ── Accordion Sections ── */}
      <div className="border-x border-b border-[#e1dfdd] rounded-b-lg divide-y divide-[#e1dfdd]">
        {sections.map((section, idx) => {
          const isExpanded = multiExpand
            ? expandedKeys.has(section.key)
            : section.key === activeKey;
          const isComplete = completedSections.has(section.key);
          const isFirst = idx === 0;
          const isLast = idx === sections.length - 1;
          const Icon = section.icon;

          return (
            <div
              key={section.key}
              id={`stepper-${section.key}`}
            >
              {/* Section header — always visible, acts as toggle.
                  Rendered as <div role="button"> rather than <button> because the
                  collapsedSummary slot may contain action buttons (e.g. "Mark as
                  reviewed") and nested <button> elements are invalid HTML. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => multiExpand ? toggleExpand(section.key) : toggleSection(section.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (multiExpand) toggleExpand(section.key);
                    else toggleSection(section.key);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                  "hover:bg-[#faf9f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0078d4]",
                  isExpanded && "bg-[#faf9f8]"
                )}
                aria-expanded={isExpanded}
                aria-controls={`stepper-content-${section.key}`}
              >
                {/* Step number — always rendered. Completion signal lives
                    in the collapsed-summary slot on the right of the row. */}
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0",
                    isExpanded
                      ? "bg-[#0078d4] text-white"
                      : "bg-[#e1dfdd] text-[#605e5c]"
                  )}
                >
                  {idx + 1}
                </span>
                <Icon
                  className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isExpanded ? "text-[#0078d4]" : "text-[#605e5c]"
                  )}
                />
                <span
                  className={cn(
                    "text-sm flex-1 min-w-0",
                    isExpanded
                      ? "text-[#0078d4] font-semibold"
                      : isComplete
                      ? "text-[#323130] font-semibold"
                      : "text-[#323130]"
                  )}
                >
                  {section.label}
                </span>

                {/* Collapsed summary */}
                {!isExpanded && section.collapsedSummary && (
                  <div className="flex items-center gap-2 text-xs text-[#605e5c] flex-shrink-0 mr-2">
                    {section.collapsedSummary}
                  </div>
                )}

                {/* Chevron */}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-[#605e5c] transition-transform duration-200 flex-shrink-0",
                    !isExpanded && "-rotate-90"
                  )}
                />
              </div>

              {/* Section content — instant show/hide, no height animation */}
              {isExpanded && (
                <div
                  id={`stepper-content-${section.key}`}
                  role="region"
                  aria-labelledby={`stepper-${section.key}`}
                >
                  <div className="px-4 pb-4 pt-1 space-y-4">
                    {section.content}

                    {/* ── Section footer — only in single-step mode ──
                        Left: optional status indicator mirroring the
                        section header (e.g. "Complete" badge when the
                        section's fields are filled in).
                        Right: Previous / Next navigation pair. */}
                    {!multiExpand && (
                    <div className="flex items-center justify-between gap-2 pt-4 mt-2 border-t border-[#edebe9]">
                      <div className="flex items-center">
                        {section.footerAction}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isFirst && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={goBack}
                            className="gap-1.5 border-[#c8c6c4] text-[#323130] hover:bg-[#f3f2f1] cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Previous step {idx}
                          </Button>
                        )}
                        {!isLast && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={goNext}
                            className="gap-1.5 bg-[#0078d4] text-white hover:bg-[#106ebe] cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Next step {idx + 2}
                          </Button>
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}