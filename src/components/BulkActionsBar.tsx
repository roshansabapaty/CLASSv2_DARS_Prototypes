import React from "react";
import { Button } from "./ui/button";
import { Trash2, CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "./ui/utils";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  availableStatuses?: { value: string; label: string; icon?: any }[];
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onStatusChange,
  availableStatuses = [],
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40",
        "bg-[#323130] text-white rounded-lg shadow-2xl",
        "animate-in slide-in-from-bottom-5 duration-300",
        className
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <div className="flex items-center gap-4 px-6 py-4">
        {/* Selection Count */}
        <div className="flex items-center gap-2 border-r border-[#605e5c] pr-4">
          <CheckCircle className="w-5 h-5 text-[#0078d4]" />
          <span className="font-semibold">
            {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Select/Deselect All */}
          {selectedCount < totalCount ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="h-9 text-white hover:bg-[#605e5c] hover:text-white"
            >
              Select All ({totalCount})
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              className="h-9 text-white hover:bg-[#605e5c] hover:text-white"
            >
              Deselect All
            </Button>
          )}

          {/* Status Actions */}
          {availableStatuses.length > 0 && onStatusChange && (
            <>
              <div className="w-px h-6 bg-[#605e5c]" />
              {availableStatuses.map(status => {
                const Icon = status.icon;
                return (
                  <Button
                    key={status.value}
                    variant="ghost"
                    size="sm"
                    onClick={() => onStatusChange(status.value)}
                    className="h-9 text-white hover:bg-[#605e5c] hover:text-white"
                  >
                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                    {status.label}
                  </Button>
                );
              })}
            </>
          )}

          {/* Delete */}
          {onDelete && (
            <>
              <div className="w-px h-6 bg-[#605e5c]" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-9 text-[#d13438] hover:bg-[#d13438] hover:text-white"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
        </div>

        {/* Close */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeselectAll}
          className="h-9 w-9 p-0 ml-2 text-white hover:bg-[#605e5c] hover:text-white"
          aria-label="Close bulk actions"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}