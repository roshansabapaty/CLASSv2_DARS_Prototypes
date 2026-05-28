import React from "react";
import { Save, Check, Loader2 } from "lucide-react";
import { cn } from "./ui/utils";
import { formatDateToMMM } from "../utils/fulfillmentWizardHelpers";

interface AutosaveIndicatorProps {
  lastSaved: Date | null;
  isSaving: boolean;
  className?: string;
}

export function AutosaveIndicator({ lastSaved, isSaving, className }: AutosaveIndicatorProps) {
  const getTimeAgo = (date: Date | null): string => {
    if (!date) return "Never";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSeconds < 10) return "Just now";
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDateToMMM(date);
  };

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 text-[#0078d4] animate-spin" />
          <span className="text-[#605e5c]">Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <Check className="w-4 h-4 text-[#107c10]" />
          <span className="text-[#605e5c]">
            Saved {getTimeAgo(lastSaved)}
          </span>
        </>
      ) : (
        <>
          <Save className="w-4 h-4 text-[#605e5c]" />
          <span className="text-[#605e5c]">Not saved</span>
        </>
      )}
    </div>
  );
}