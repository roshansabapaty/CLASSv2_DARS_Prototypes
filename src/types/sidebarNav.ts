import type React from "react";

/**
 * Represents a single step in the sidebar's contextual navigation.
 * Used by WorkflowSidebar to render page-specific wizard steps.
 */
export interface SidebarStep {
  /** Unique key matching the page component's internal step key */
  key: string;
  /** Display label for the step */
  label: string;
  /** Lucide icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Short description shown below the label (expanded mode only) */
  description?: string;
  /** Whether this step is considered complete */
  isComplete: boolean;
}

/**
 * The full state payload that page components emit upward
 * so App.tsx can feed it to WorkflowSidebar.
 */
export interface SidebarNavState {
  /** The ordered steps for the current page */
  steps: SidebarStep[];
  /** The currently active step key */
  activeStepKey: string;
}
