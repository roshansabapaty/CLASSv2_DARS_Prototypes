/**
 * ServiceAccordionSelector
 *
 * Reusable accordion-based service & data-category selector.
 * Each service renders as a collapsible panel with:
 *   • Checkbox to enable/disable the service
 *   • Collapsed summary chip showing "N/M categories"
 *   • Expanded body with Select All / Deselect All + category checkboxes
 *   • "Save" button that collapses the panel after configuration
 *
 * Designed for Fluent UI visual language (blue accent, neutral greys).
 */

import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import {
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Check,
  Info,
} from "lucide-react";
import { cn } from "../ui/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { CategoryGroupConfig } from "../../config/lensServicesConfig";
import type { ItemSelectionState } from "../../utils/categoryUtils";
import { toggleItemSelection, isItemSelected } from "../../utils/categoryUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServiceItem {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface ServiceAccordionSelectorProps {
  /** Label rendered above the accordion list */
  label?: string;
  /** Available services */
  services: ServiceItem[];
  /** Map of serviceId → available category groups (with items) */
  availableGroups: Record<string, CategoryGroupConfig[]>;
  /** Currently selected service IDs */
  selectedServices: string[];
  /** Currently selected items per service: serviceKey → groupKey → itemKey[] */
  selectedItems: ItemSelectionState;
  /** Called when the full selection state changes */
  onSelectionChange: (
    services: string[],
    items: ItemSelectionState
  ) => void;
  /** Optional custom body renderer — replaces default group/item checkboxes when provided */
  renderBody?: (serviceId: string) => React.ReactNode;
  /** Whether to wrap in a Card (default true) */
  showCard?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ServiceAccordionSelector({
  label = "Microsoft Services",
  services,
  availableGroups,
  selectedServices,
  selectedItems,
  onSelectionChange,
  renderBody,
  showCard = true,
}: ServiceAccordionSelectorProps) {
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  // ------ Helpers ------

  function countSelectedForService(serviceId: string): number {
    const groups = selectedItems[serviceId] || {};
    return Object.values(groups).reduce((acc, items) => acc + items.length, 0);
  }

  function countTotalItemsForService(serviceId: string): number {
    return (availableGroups[serviceId] || []).reduce(
      (acc, g) => acc + g.items.length,
      0
    );
  }

  // ------ Handlers ------

  const toggleService = useCallback(
    (serviceId: string) => {
      const isCurrentlySelected = selectedServices.includes(serviceId);
      if (isCurrentlySelected) {
        const nextServices = selectedServices.filter((s) => s !== serviceId);
        const nextItems = { ...selectedItems };
        delete nextItems[serviceId];
        setExpandedServiceId((prev) => (prev === serviceId ? null : prev));
        onSelectionChange(nextServices, nextItems);
      } else {
        const nextServices = [...selectedServices, serviceId];
        setExpandedServiceId(serviceId);
        onSelectionChange(nextServices, { ...selectedItems, [serviceId]: {} });
      }
    },
    [selectedServices, selectedItems, onSelectionChange]
  );

  const handleToggleItem = useCallback(
    (serviceId: string, groupKey: string, itemKey: string) => {
      onSelectionChange(
        selectedServices,
        toggleItemSelection(selectedItems, serviceId, groupKey, itemKey)
      );
    },
    [selectedServices, selectedItems, onSelectionChange]
  );

  const selectAllItems = useCallback(
    (serviceId: string) => {
      const groups = availableGroups[serviceId] || [];
      const next: Record<string, string[]> = {};
      groups.forEach((g) => {
        next[g.key] = g.items.map((i) => i.key);
      });
      onSelectionChange(selectedServices, { ...selectedItems, [serviceId]: next });
    },
    [selectedServices, selectedItems, availableGroups, onSelectionChange]
  );

  const deselectAllItems = useCallback(
    (serviceId: string) => {
      onSelectionChange(selectedServices, { ...selectedItems, [serviceId]: {} });
    },
    [selectedServices, selectedItems, onSelectionChange]
  );

  const handleSaveAndCollapse = useCallback((serviceId: string) => {
    setExpandedServiceId((prev) => (prev === serviceId ? null : prev));
  }, []);

  const toggleExpand = useCallback((serviceId: string) => {
    setExpandedServiceId((prev) => (prev === serviceId ? null : serviceId));
  }, []);

  // ------ Render ------

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm text-[#323130]" style={{ fontWeight: 500 }}>
          {label}
        </label>
        <Badge variant="outline" className="text-xs">
          {selectedServices.length} selected
        </Badge>
      </div>

      {/* Service list */}
      <div className="space-y-2">
        {services.map((service) => {
          const isSelected = selectedServices.includes(service.id);
          const isExpanded = expandedServiceId === service.id;
          const selectedCount = countSelectedForService(service.id);
          const totalCount = countTotalItemsForService(service.id);

          return (
            <div
              key={service.id}
              className={cn(
                "border rounded-lg transition-colors",
                isSelected ? "border-[#0078d4]/30 bg-[#f5f9fd]" : "border-[#e1dfdd] bg-white"
              )}
            >
              {/* ---- Accordion Header ---- */}
              <div className="flex items-center gap-2 p-3">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleService(service.id); }}
                  className="flex-shrink-0"
                  aria-label={`${isSelected ? "Deselect" : "Select"} ${service.name}`}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                    isSelected ? "bg-[#0078d4] border-[#0078d4]" : "border-[#c8c6c4] hover:border-[#8a8886]"
                  )}>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </button>

                <button
                  onClick={() => isSelected ? toggleExpand(service.id) : toggleService(service.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <span className="text-lg flex-shrink-0">{service.icon}</span>
                  <span
                    className={cn("text-sm truncate", isSelected ? "text-[#323130]" : "text-[#605e5c]")}
                    style={{ fontWeight: isSelected ? 600 : 400 }}
                  >
                    {service.name}
                  </span>
                </button>

                {isSelected && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        selectedCount === totalCount && totalCount > 0
                          ? "bg-[#dff6dd] text-[#107c10] border-[#107c10]/30"
                          : selectedCount > 0
                          ? "bg-[#deecf9] text-[#0078d4] border-[#0078d4]/30"
                          : "text-[#a19f9d]"
                      )}
                    >
                      {selectedCount}/{totalCount} items
                    </Badge>
                    <button
                      onClick={() => toggleExpand(service.id)}
                      className="p-0.5 rounded hover:bg-[#e1dfdd] transition-colors"
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-[#605e5c]" />
                        : <ChevronRight className="w-4 h-4 text-[#605e5c]" />}
                    </button>
                  </div>
                )}
              </div>

              {/* ---- Accordion Body ---- */}
              {isSelected && isExpanded && (
                renderBody ? (
                  <div className="pb-1">{renderBody(service.id)}</div>
                ) : (
                  <div className="px-3 pb-3 border-t border-[#e1dfdd]">
                    {/* Quick actions */}
                    <div className="flex items-center gap-2 pt-2.5 pb-2 ml-7">
                      <Button variant="ghost" size="sm" onClick={() => selectAllItems(service.id)}
                        className="h-7 px-2 text-xs text-[#0078d4] hover:bg-[#deecf9]">
                        Select All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deselectAllItems(service.id)}
                        className="h-7 px-2 text-xs text-[#605e5c] hover:bg-[#f3f2f1]">
                        Deselect All
                      </Button>
                    </div>

                    {/* Group headers + item checkboxes */}
                    <div className="ml-7 space-y-3">
                      {(availableGroups[service.id] || []).map((group) => (
                        <div key={group.key}>
                          {/* Category Group label */}
                          <div className="text-[10px] font-semibold text-[#8a8886] uppercase tracking-wider px-2 pb-1">
                            {group.name}
                          </div>
                          {/* Items */}
                          <div className="space-y-0.5">
                            {group.items.map((item) => {
                              const checked = isItemSelected(selectedItems, service.id, group.key, item.key);
                              return (
                                <button
                                  key={item.key}
                                  onClick={() => handleToggleItem(service.id, group.key, item.key)}
                                  className="flex items-center gap-2 text-left w-full py-1.5 px-2 rounded hover:bg-[#f3f2f1] transition-colors"
                                >
                                  <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                    checked ? "bg-[#0078d4] border-[#0078d4]" : "border-[#c8c6c4]"
                                  )}>
                                    {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className="text-sm text-[#605e5c] flex items-center gap-1">
                                    {item.name}
                                    {item.info && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Info className="w-3 h-3 shrink-0 text-[#a19f9d] hover:text-[#605e5c] cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent side="right" className="max-w-[240px] text-xs">
                                            {item.info}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Save & collapse */}
                    <div className="flex justify-end mt-3 ml-7">
                      <Button size="sm" onClick={() => handleSaveAndCollapse(service.id)}
                        className="h-8 px-4 text-xs bg-[#0078d4] hover:bg-[#106ebe] text-white">
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Save
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  if (showCard) {
    return <Card className="border-[#e1dfdd] bg-white p-4">{content}</Card>;
  }
  return <div>{content}</div>;
}
