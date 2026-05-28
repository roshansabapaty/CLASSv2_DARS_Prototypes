/**
 * CancellationBadge — Prominent badge displayed in the sticky header
 * when Authorization Desired Status = "Cancelled".
 * 
 * Visual: Red/amber pulsing badge with Ban icon, positioned next to case status.
 * Clicking opens the CancellationWorkflowDialog.
 */
import { Ban } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../ui/utils";

interface CancellationBadgeProps {
  onClick?: () => void;
  /** Whether all cancellation steps have been completed */
  allStepsComplete?: boolean;
  className?: string;
}

export function CancellationBadge({
  onClick,
  allStepsComplete = false,
  className,
}: CancellationBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer text-xs font-semibold gap-1 transition-all",
              allStepsComplete
                ? "bg-[#f3f2f1] text-[#605e5c] border-[#8a8886]"
                : "bg-[#fde7e9] text-[#a4262c] border-[#d13438] animate-pulse",
              className
            )}
            onClick={onClick}
          >
            <Ban className="w-3 h-3" />
            {allStepsComplete
              ? "Cancellation Complete"
              : "Authorization Cancellation"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs max-w-xs">
            <p className="font-semibold mb-1">
              {allStepsComplete
                ? "All cancellation steps have been completed"
                : "Authorization Desired Status is Cancelled"}
            </p>
            {!allStepsComplete && (
              <p className="text-slate-400">
                Click to open the cancellation workflow checklist
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
