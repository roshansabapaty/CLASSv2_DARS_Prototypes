import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { SidebarNavState, SidebarStep } from "../types/sidebarNav";
import {
  LayoutGrid,
  AlertCircle,
  User,
  Send,
  CheckCircle2,
} from "lucide-react";

/**
 * Collection page sidebar step definitions.
 * Maps the readiness filter tabs to sidebar navigation steps.
 */
const COLLECTION_STEP_DEFS = [
  {
    key: "all",
    label: "All Jobs",
    icon: LayoutGrid,
    description: "Overview of all collection jobs",
  },
  {
    key: "needs-action",
    label: "Needs Action",
    icon: AlertCircle,
    description: "Jobs requiring attention",
  },
  {
    key: "by-identifier",
    label: "By Identifier",
    icon: User,
    description: "Jobs grouped by identifier",
  },
  {
    key: "prepare-deliver",
    label: "Package & Deliver",
    icon: Send,
    description: "Review and deliver completed jobs",
  },
  {
    key: "complete",
    label: "Complete",
    icon: CheckCircle2,
    description: "Fully processed jobs",
  },
] as const;

interface CollectionSidebarNavProps {
  /** Current readiness filter from CollectionTracker */
  readinessFilter: "all" | "needs-action" | "by-identifier" | "complete";
  /** Callback to change the readiness filter */
  onReadinessFilterChange: (filter: "all" | "needs-action" | "by-identifier" | "complete") => void;
  /** Whether the prepare & deliver section is active (has publishable/deliverable jobs) */
  hasPrepareDeliverActive?: boolean;
  /** Completion stats for step indicators */
  completionStats?: {
    needsActionCount: number;
    completeCount: number;
    totalCount: number;
  };
  /** Callback emitting nav state for sidebar */
  onStepperStateChange?: (state: SidebarNavState) => void;
  /** External step key request from sidebar click */
  requestedStepKey?: string | null;
  /** The rendered CollectionTracker */
  children: React.ReactNode;
}

/**
 * CollectionSidebarNav — Thin wrapper that emits sidebar navigation state
 * for the Collection page without adding code to CollectionTracker itself.
 *
 * It maps CollectionTracker's readinessFilter tabs to sidebar steps
 * and handles bidirectional navigation (sidebar click ↔ filter change).
 */
export function CollectionSidebarNav({
  readinessFilter,
  onReadinessFilterChange,
  hasPrepareDeliverActive = false,
  completionStats,
  onStepperStateChange,
  requestedStepKey,
  children,
}: CollectionSidebarNavProps) {
  // Track whether prepare-deliver is the "active" view
  // (it's a conceptual step, not a readiness filter value)
  const [prepareDeliverActive, setPrepareDeliverActive] = useState(false);

  // Determine which step key is currently active
  const activeStepKey = prepareDeliverActive ? "prepare-deliver" : readinessFilter;

  // Build sidebar steps with dynamic completion
  const steps: SidebarStep[] = useMemo(() => {
    const stats = completionStats;
    return COLLECTION_STEP_DEFS.map((def) => ({
      key: def.key,
      label: def.label,
      icon: def.icon,
      description: def.description,
      isComplete:
        def.key === "complete"
          ? (stats?.completeCount ?? 0) > 0 && stats?.completeCount === stats?.totalCount
          : def.key === "needs-action"
          ? (stats?.needsActionCount ?? 0) === 0
          : false,
    }));
  }, [completionStats]);

  // Emit nav state upward
  useEffect(() => {
    onStepperStateChange?.({ steps, activeStepKey });
  }, [steps, activeStepKey, onStepperStateChange]);

  // Handle sidebar-initiated step navigation
  useEffect(() => {
    if (!requestedStepKey) return;

    if (requestedStepKey === "prepare-deliver") {
      setPrepareDeliverActive(true);
      // Keep current filter, just flag the prepare section
    } else if (["all", "needs-action", "by-identifier", "complete"].includes(requestedStepKey)) {
      setPrepareDeliverActive(false);
      onReadinessFilterChange(requestedStepKey as "all" | "needs-action" | "by-identifier" | "complete");
    }
  }, [requestedStepKey, onReadinessFilterChange]);

  // When the readiness filter changes externally, clear prepare-deliver flag
  useEffect(() => {
    setPrepareDeliverActive(false);
  }, [readinessFilter]);

  return <>{children}</>;
}
