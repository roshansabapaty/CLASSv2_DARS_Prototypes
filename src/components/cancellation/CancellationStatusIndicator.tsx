/**
 * CancellationStatusIndicator — Visual indicators for pipeline job states
 * during a cancellation workflow.
 *
 * Shows clear differentiation between:
 *  - Completed (green checkmark) — job finished before cancellation
 *  - In Progress (amber spinner) — in-flight, cannot be stopped
 *  - Cancelled (grey X) — successfully prevented from running
 *  - Blocked (red shield) — delivery blocked by user action
 */
import React from "react";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ShieldBan,
  Ban,
  CircleDot,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

export type CancellationJobState =
  | "completed"
  | "in-progress"
  | "cancelled"
  | "blocked"
  | "not-started";

interface CancellationStatusIndicatorProps {
  state: CancellationJobState;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

const stateConfig: Record<
  CancellationJobState,
  {
    icon: React.ComponentType<any>;
    label: string;
    badgeClass: string;
    iconClass: string;
    animate?: boolean;
  }
> = {
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    badgeClass:
      "bg-[#dff6dd] text-[#107c10] border-[#107c10]",
    iconClass: "text-[#107c10]",
  },
  "in-progress": {
    icon: Loader2,
    label: "In Progress",
    badgeClass:
      "bg-[#fff4ce] text-[#8a6d3b] border-[#c19c00]",
    iconClass: "text-[#8a6d3b]",
    animate: true,
  },
  cancelled: {
    icon: Ban,
    label: "Cancelled",
    badgeClass:
      "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]",
    iconClass: "text-[#605e5c]",
  },
  blocked: {
    icon: ShieldBan,
    label: "Blocked",
    badgeClass:
      "bg-[#fde7e9] text-[#a4262c] border-[#d13438]",
    iconClass: "text-[#a4262c]",
  },
  "not-started": {
    icon: CircleDot,
    label: "Not Started",
    badgeClass:
      "bg-white text-[#605e5c] border-[#c8c6c4]",
    iconClass: "text-[#c8c6c4]",
  },
};

export function CancellationStatusIndicator({
  state,
  label,
  size = "sm",
  className,
}: CancellationStatusIndicatorProps) {
  const config = stateConfig[state];
  const Icon = config.icon;
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium gap-1",
        config.badgeClass,
        className
      )}
    >
      <Icon
        className={cn(
          iconSize,
          config.iconClass,
          config.animate && "animate-spin"
        )}
      />
      {label || config.label}
    </Badge>
  );
}

/**
 * Inline status dot for compact table cells
 */
export function CancellationStatusDot({
  state,
  className,
}: {
  state: CancellationJobState;
  className?: string;
}) {
  const colorMap: Record<CancellationJobState, string> = {
    completed: "bg-[#107c10]",
    "in-progress": "bg-[#c19c00] animate-pulse",
    cancelled: "bg-[#8a8886]",
    blocked: "bg-[#d13438]",
    "not-started": "bg-[#c8c6c4]",
  };

  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        colorMap[state],
        className
      )}
      aria-label={stateConfig[state].label}
    />
  );
}