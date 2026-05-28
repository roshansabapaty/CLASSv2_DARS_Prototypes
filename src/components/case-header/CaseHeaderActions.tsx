/**
 * CaseHeaderActions — Right-side action buttons for the unified case header.
 * Save button, Document/Identifier panel tabs, and Close button.
 */
import React from "react";
import {
  FileText,
  PanelRightClose,
  Fingerprint,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { cn } from "../ui/utils";

interface CaseHeaderActionsProps {
  // Save (kept for prop compat but no longer rendered here)
  isDirty?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  lastSaved?: Date | null;
  // Document panel
  documentPanelOpen?: boolean;
  onToggleDocumentPanel?: () => void;
  // Identifier panel
  identifierPanelOpen?: boolean;
  onToggleIdentifierPanel?: () => void;
  workflowStage: "triage" | "fulfillment" | "collection";
  // Close (kept for prop compat but no longer rendered here)
  onNavigateToQueue?: () => void;
}

export function CaseHeaderActions({
  documentPanelOpen,
  onToggleDocumentPanel,
  identifierPanelOpen,
  onToggleIdentifierPanel,
  workflowStage,
}: CaseHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {/* Panel Tabs */}
      <div className="flex items-center gap-1.5">
        {/* Document Panel Tab */}
        {onToggleDocumentPanel && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleDocumentPanel}
                className={cn(
                  "inline-flex items-center gap-2 h-8 px-3 rounded-md text-sm transition-all duration-200 border",
                  documentPanelOpen
                    ? "bg-[#e8f4fd] border-[#0078d4] border-l-2 text-[#0078d4] hover:bg-[#d6ecf9]"
                    : "bg-white border-[#e1dfdd] text-[#323130] hover:border-[#0078d4] hover:text-[#0078d4] hover:bg-[#f3f9ff]"
                )}
                aria-label={
                  documentPanelOpen
                    ? "Close document panel"
                    : "Open document panel (Alt+D)"
                }
                aria-pressed={documentPanelOpen}
              >
                {documentPanelOpen ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {documentPanelOpen ? "Close Docs" : "Documents"}
                </span>
                <kbd
                  className={cn(
                    "hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono",
                    documentPanelOpen
                      ? "bg-[#0078d4]/10 text-[#0078d4]/70"
                      : "bg-[#f3f2f1] text-[#605e5c]"
                  )}
                >
                  Alt+D
                </kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {documentPanelOpen
                  ? "Close document panel"
                  : "Open document panel"}{" "}
                <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono">
                  Alt+D
                </kbd>
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Identifier Panel Tab - Only in fulfillment */}
        {onToggleIdentifierPanel && workflowStage === "fulfillment" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleIdentifierPanel}
                className={cn(
                  "inline-flex items-center gap-2 h-8 px-3 rounded-md text-sm transition-all duration-200 border",
                  identifierPanelOpen
                    ? "bg-[#f3eefa] border-[#8764b8] border-l-2 text-[#8764b8] hover:bg-[#ebe0f5]"
                    : "bg-white border-[#e1dfdd] text-[#323130] hover:border-[#8764b8] hover:text-[#8764b8] hover:bg-[#f9f5ff]"
                )}
                aria-label={
                  identifierPanelOpen
                    ? "Close fulfillment wizard"
                    : "Open fulfillment wizard (Alt+I)"
                }
                aria-pressed={identifierPanelOpen}
              >
                {identifierPanelOpen ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <Fingerprint className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {identifierPanelOpen ? "Close IDs" : "Identifiers"}
                </span>
                <kbd
                  className={cn(
                    "hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono",
                    identifierPanelOpen
                      ? "bg-[#8764b8]/10 text-[#8764b8]/70"
                      : "bg-[#f3f2f1] text-[#605e5c]"
                  )}
                >
                  Alt+I
                </kbd>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {identifierPanelOpen
                  ? "Close fulfillment wizard"
                  : "Open fulfillment wizard"}{" "}
                <kbd className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[10px] font-mono">
                  Alt+I
                </kbd>
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}