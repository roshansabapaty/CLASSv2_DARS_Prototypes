import React, { useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Filter, X, Save, Bookmark, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "./ui/utils";
import { format } from "date-fns";

export interface FilterPreset {
  id: string;
  name: string;
  filters: AdvancedFilters;
}

export interface AdvancedFilters {
  statuses: string[];
  priorities: string[];
  assignees: string[];
  dateFrom?: Date;
  dateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  requestTypes: string[];
}

interface AdvancedFiltersComponentProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  availableAssignees?: string[];
  presets?: FilterPreset[];
  onSavePreset?: (name: string, filters: AdvancedFilters) => void;
  onLoadPreset?: (preset: FilterPreset) => void;
}

const DEFAULT_FILTERS: AdvancedFilters = {
  statuses: [],
  priorities: [],
  assignees: [],
  requestTypes: [],
};

export function AdvancedFiltersComponent({
  filters,
  onFiltersChange,
  availableAssignees = [],
  presets = [],
  onSavePreset,
  onLoadPreset,
}: AdvancedFiltersComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  const activeFilterCount = 
    filters.statuses.length +
    filters.priorities.length +
    filters.assignees.length +
    filters.requestTypes.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.dueDateFrom ? 1 : 0) +
    (filters.dueDateTo ? 1 : 0);

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const handlePriorityToggle = (priority: string) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFiltersChange({ ...filters, priorities: newPriorities });
  };

  const handleAssigneeToggle = (assignee: string) => {
    const newAssignees = filters.assignees.includes(assignee)
      ? filters.assignees.filter(a => a !== assignee)
      : [...filters.assignees, assignee];
    onFiltersChange({ ...filters, assignees: newAssignees });
  };

  const handleRequestTypeToggle = (type: string) => {
    const newTypes = filters.requestTypes.includes(type)
      ? filters.requestTypes.filter(t => t !== type)
      : [...filters.requestTypes, type];
    onFiltersChange({ ...filters, requestTypes: newTypes });
  };

  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const handleSavePreset = () => {
    if (savePresetName.trim() && onSavePreset) {
      onSavePreset(savePresetName.trim(), filters);
      setSavePresetName("");
      setShowSavePreset(false);
    }
  };

  const statusOptions = [
    { value: "New", label: "New", color: "bg-[#0078d4]" },
    { value: "In Progress", label: "In Progress", color: "bg-[#8764b8]" },
    { value: "Triage Complete", label: "Triage Complete", color: "bg-[#107c10]" },
    { value: "Collection In Progress", label: "Collection In Progress", color: "bg-[#ca5010]" },
    { value: "Ready to Submit", label: "Ready to Submit", color: "bg-[#0078d4]" },
  ];

  const priorityOptions = [
    { value: "Critical", label: "Critical", color: "text-[#d13438]" },
    { value: "High", label: "High", color: "text-[#ca5010]" },
    { value: "Medium", label: "Medium", color: "text-[#0078d4]" },
    { value: "Low", label: "Low", color: "text-[#605e5c]" },
  ];

  const requestTypeOptions = [
    { value: "search-warrant", label: "Search Warrant" },
    { value: "subpoena", label: "Subpoena" },
    { value: "court-order", label: "Court Order" },
    { value: "exigent", label: "Exigent Circumstances" },
  ];

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 gap-2 border-[#c8c6c4] hover:border-[#0078d4] transition-colors",
          activeFilterCount > 0 && "border-[#0078d4] bg-[#deecf9]"
        )}
      >
        <Filter className="w-4 h-4" />
        Advanced Filters
        {activeFilterCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-[#0078d4] text-white text-xs rounded-full">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-12 right-0 z-50 w-[600px] bg-white border border-[#e1dfdd] rounded-lg shadow-xl">
          <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#edebe9]">
              <div>
                <h3 className="text-lg font-semibold text-[#323130]">Advanced Filters</h3>
                <p className="text-sm text-[#605e5c] mt-0.5">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Saved Presets */}
            {presets.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#323130]">Saved Filters</Label>
                <div className="flex flex-wrap gap-2">
                  {presets.map(preset => (
                    <Button
                      key={preset.id}
                      variant="outline"
                      size="sm"
                      onClick={() => onLoadPreset && onLoadPreset(preset)}
                      className="h-8 gap-2 border-[#c8c6c4] hover:border-[#0078d4]"
                    >
                      <Bookmark className="w-3 h-3" />
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#323130]">Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleStatusToggle(option.value)}
                    className={cn(
                      "px-3 py-1.5 rounded text-sm border transition-colors",
                      filters.statuses.includes(option.value)
                        ? "border-[#0078d4] bg-[#deecf9] text-[#0078d4] font-medium"
                        : "border-[#c8c6c4] bg-white text-[#605e5c] hover:border-[#605e5c]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#323130]">Priority</Label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handlePriorityToggle(option.value)}
                    className={cn(
                      "px-3 py-1.5 rounded text-sm border transition-colors",
                      filters.priorities.includes(option.value)
                        ? "border-[#0078d4] bg-[#deecf9] text-[#0078d4] font-medium"
                        : "border-[#c8c6c4] bg-white text-[#605e5c] hover:border-[#605e5c]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Request Type Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-[#323130]">Request Type</Label>
              <div className="flex flex-wrap gap-2">
                {requestTypeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleRequestTypeToggle(option.value)}
                    className={cn(
                      "px-3 py-1.5 rounded text-sm border transition-colors",
                      filters.requestTypes.includes(option.value)
                        ? "border-[#0078d4] bg-[#deecf9] text-[#0078d4] font-medium"
                        : "border-[#c8c6c4] bg-white text-[#605e5c] hover:border-[#605e5c]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee Filter */}
            {availableAssignees.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#323130]">Assigned To</Label>
                <div className="flex flex-wrap gap-2">
                  {availableAssignees.map(assignee => (
                    <button
                      key={assignee}
                      onClick={() => handleAssigneeToggle(assignee)}
                      className={cn(
                        "px-3 py-1.5 rounded text-sm border transition-colors",
                        filters.assignees.includes(assignee)
                          ? "border-[#0078d4] bg-[#deecf9] text-[#0078d4] font-medium"
                          : "border-[#c8c6c4] bg-white text-[#605e5c] hover:border-[#605e5c]"
                      )}
                    >
                      {assignee}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Ranges */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#323130]">Created From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 w-4 h-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-[#323130]">Created To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 w-4 h-4" />
                      {filters.dateTo ? format(filters.dateTo, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#edebe9]">
              <div className="flex items-center gap-2">
                {!showSavePreset ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSavePreset(true)}
                    className="h-9 gap-2"
                    disabled={activeFilterCount === 0}
                  >
                    <Save className="w-4 h-4" />
                    Save Preset
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Preset name..."
                      value={savePresetName}
                      onChange={(e) => setSavePresetName(e.target.value)}
                      className="h-9 px-3 border border-[#c8c6c4] rounded text-sm"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSavePreset} className="h-9">
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowSavePreset(false);
                        setSavePresetName("");
                      }}
                      className="h-9"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  disabled={activeFilterCount === 0}
                  className="h-9"
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-9 bg-[#0078d4] hover:bg-[#106ebe]"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}