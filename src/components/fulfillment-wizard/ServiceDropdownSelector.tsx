/**
 * ServiceDropdownSelector
 *
 * Drop-in replacement for ServiceAccordionSelector with an add/remove UX:
 *   • "Add Service +" button opens an inline searchable dropdown of unselected services
 *   • Only added services render as cards in the workspace
 *   • Each card has a × dismiss button to remove it
 *   • Multiple cards can be expanded simultaneously
 *   • Expand All / Collapse All toolbar controls
 *   • Empty state when no services have been added yet
 *
 * Props interface is identical to ServiceAccordionSelectorProps — drop-in replacement.
 */

import React, { useState, useCallback, useRef } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import {
  ChevronRight,
  ChevronDown,
  Check,
  Plus,
  X,
} from "lucide-react";
import { cn } from "../ui/utils";
import {
  LENS_SERVICE_MAP,
  type CategoryGroupConfig,
} from "../../config/lensServicesConfig";
import type { ItemSelectionState } from "../../utils/categoryUtils";
import { toggleItemSelection, isItemSelected } from "../../utils/categoryUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Info } from "lucide-react";
import { AddServiceDialog } from "./AddServiceDialog";
import { RecentlyAddedBand } from "./RecentlyAddedBand";

// ---------------------------------------------------------------------------
// Types (identical to ServiceAccordionSelectorProps)
// ---------------------------------------------------------------------------

export interface ServiceItem {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface ServiceDropdownSelectorProps {
  label?: string;
  services: ServiceItem[];
  availableGroups: Record<string, CategoryGroupConfig[]>;
  selectedServices: string[];
  selectedItems: ItemSelectionState;
  onSelectionChange: (services: string[], items: ItemSelectionState) => void;
  renderBody?: (serviceId: string) => React.ReactNode;
  showCard?: boolean;
  /** Optional identifier scope info — drives the AddServiceDialog title chip
   *  ("For analyst@contoso.com (Enterprise)"). When omitted, the dialog still
   *  works but without the scope chip. */
  identifierId?: string;
  identifierLabel?: string;
  identifierAccountType?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ServiceDropdownSelector({
  label = "Microsoft Services",
  services,
  availableGroups,
  selectedServices,
  selectedItems,
  onSelectionChange,
  renderBody,
  showCard = true,
  identifierId,
  identifierLabel,
  identifierAccountType,
}: ServiceDropdownSelectorProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Recently-added band state ───────────────────────────────────────────────
  const [recentSummary, setRecentSummary] = useState("");
  const [recentToken, setRecentToken] = useState(0);
  const [recentSvcId, setRecentSvcId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ------ Helpers ------

  function countSelectedForService(serviceId: string): number {
    const groups = selectedItems[serviceId] || {};
    return Object.values(groups).reduce((acc, items) => acc + items.length, 0);
  }

  function countTotalItemsForService(serviceId: string): number {
    return (availableGroups[serviceId] || []).reduce((acc, g) => acc + g.items.length, 0);
  }

  const unaddedServices = services.filter((s) => !selectedServices.includes(s.id));

  // ------ Handlers ------

  /** AddServiceDialog → commit. Translates the per-service picks into the
   *  selectionState shape this component already maintains. */
  const handleDialogCommit = useCallback(
    (commit: { picksByService: Record<string, Record<string, string[]>>; targetsByService: Record<string, string[]> }) => {
      const newServiceIds = Object.keys(commit.picksByService);
      if (newServiceIds.length === 0) return;
      const nextServices = [...selectedServices];
      const nextItems: ItemSelectionState = { ...selectedItems };
      for (const svcId of newServiceIds) {
        if (!nextServices.includes(svcId)) nextServices.push(svcId);
        nextItems[svcId] = commit.picksByService[svcId];
      }
      setExpandedIds((prev) => new Set([...prev, ...newServiceIds]));
      onSelectionChange(nextServices, nextItems);

      // Surface confirmation in the recently-added band — name the most
      // recently picked service for the Jump-to link.
      const lastSvcId = newServiceIds[newServiceIds.length - 1];
      const lastSvc = services.find((s) => s.id === lastSvcId);
      const lastSvcName = lastSvc?.name ?? lastSvcId;
      const totalPicks = Object.values(
        commit.picksByService[lastSvcId] ?? {},
      ).reduce((acc, arr) => acc + arr.length, 0);
      setRecentSvcId(lastSvcId);
      const summarySuffix =
        newServiceIds.length === 1
          ? `${lastSvcName} (${totalPicks} ${totalPicks === 1 ? "data category" : "data categories"})`
          : `${newServiceIds.length} services`;
      setRecentSummary(summarySuffix);
      setRecentToken((t) => t + 1);
    },
    [selectedServices, selectedItems, onSelectionChange, services],
  );

  /** Scrolls the recently-added card into view. */
  const onJumpToRecent = useCallback(() => {
    if (!recentSvcId) return;
    const el = cardRefs.current[recentSvcId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [recentSvcId]);

  const removeService = useCallback(
    (serviceId: string) => {
      const nextServices = selectedServices.filter((s) => s !== serviceId);
      const nextItems = { ...selectedItems };
      delete nextItems[serviceId];
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(serviceId);
        return next;
      });
      onSelectionChange(nextServices, nextItems);
    },
    [selectedServices, selectedItems, onSelectionChange]
  );

  const toggleExpand = useCallback((serviceId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(selectedServices));
  }, [selectedServices]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

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

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Service button — opens the shared AddServiceDialog */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={unaddedServices.length === 0}
            className={cn(
              "h-8 px-3 text-xs border-[#0078d4] text-[#0078d4] hover:bg-[#deecf9] gap-1.5",
              dialogOpen && "bg-[#deecf9]"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Service
            {unaddedServices.length > 0 && (
              <Badge className="ml-0.5 h-4 min-w-[18px] px-1 text-[10px] bg-[#0078d4] text-white border-0 rounded-full">
                {unaddedServices.length}
              </Badge>
            )}
          </Button>

          {/* Expand / Collapse All — only show when there are added services */}
          {selectedServices.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="h-8 px-3 text-xs text-[#323130] hover:bg-[#f3f2f1]"
              >
                Expand All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="h-8 px-3 text-xs text-[#323130] hover:bg-[#f3f2f1]"
              >
                Collapse All
              </Button>
            </>
          )}
        </div>

        {/* Right count */}
        {selectedServices.length > 0 && (
          <span className="text-xs text-[#605e5c] flex-shrink-0">
            {selectedServices.length}/{services.length} services selected
          </span>
        )}
      </div>

      {/* Empty state */}
      {selectedServices.length === 0 && (
        <div className="border border-dashed border-[#c8c6c4] rounded-lg py-10 flex flex-col items-center gap-3 text-center">
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-sm font-medium text-[#323130]">No services added yet</p>
            <p className="text-xs text-[#605e5c] mt-0.5">
              Click "Add Service" above to begin selecting data categories
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-8 px-4 text-xs border-[#0078d4] text-[#0078d4] hover:bg-[#deecf9] gap-1.5 mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Service
          </Button>
        </div>
      )}

      {/* Recently-added confirmation band — surfaces the just-added service so the
          user doesn't have to scroll the (potentially long) cards list. */}
      <RecentlyAddedBand
        lastAddedSummary={recentSummary}
        addToken={recentToken}
        onJumpTo={onJumpToRecent}
      />

      {/* Service cards */}
      <div className="space-y-2">
        {selectedServices.map((serviceId) => {
          const service = services.find((s) => s.id === serviceId);
          if (!service) return null;
          const isExpanded = expandedIds.has(serviceId);
          const selectedCount = countSelectedForService(serviceId);
          const totalCount = countTotalItemsForService(serviceId);

          return (
            <div
              key={serviceId}
              ref={(el) => {
                cardRefs.current[serviceId] = el;
              }}
              className="border border-[#0078d4]/30 rounded-lg bg-[#f5f9fd]"
            >
              {/* Card header */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  onClick={() => toggleExpand(serviceId)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <span className="text-base flex-shrink-0">{service.icon}</span>
                  <span className="text-sm font-semibold text-[#323130] truncate">
                    {service.name}
                  </span>
                </button>

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
                    {selectedCount}/{totalCount} cats
                  </Badge>

                  <button
                    onClick={() => toggleExpand(serviceId)}
                    className="p-0.5 rounded hover:bg-[#deecf9] transition-colors"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-[#605e5c]" />
                      : <ChevronRight className="w-4 h-4 text-[#605e5c]" />}
                  </button>

                  <button
                    onClick={() => removeService(serviceId)}
                    className="p-0.5 rounded hover:bg-[#fde7e9] transition-colors"
                    aria-label={`Remove ${service.name}`}
                  >
                    <X className="w-4 h-4 text-[#a19f9d] hover:text-[#d13438]" />
                  </button>
                </div>
              </div>

              {/* Card body */}
              {isExpanded && (
                renderBody ? (
                  <div className="pb-1">{renderBody(serviceId)}</div>
                ) : (
                  <div className="px-3 pb-3 border-t border-[#e1dfdd]">
                    {/* Quick actions */}
                    <div className="flex items-center gap-2 pt-2.5 pb-2 ml-7">
                      <Button variant="ghost" size="sm" onClick={() => selectAllItems(serviceId)}
                        className="h-7 px-2 text-xs text-[#0078d4] hover:bg-[#deecf9]">
                        Select All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deselectAllItems(serviceId)}
                        className="h-7 px-2 text-xs text-[#605e5c] hover:bg-[#f3f2f1]">
                        Deselect All
                      </Button>
                    </div>

                    {/* Group headers + item checkboxes */}
                    <div className="ml-7 space-y-3">
                      {(availableGroups[serviceId] || []).map((group) => (
                        <div key={group.key}>
                          <div className="text-[10px] font-semibold text-[#8a8886] uppercase tracking-wider px-2 pb-1">
                            {group.name}
                          </div>
                          <div className="space-y-0.5">
                            {group.items.map((item) => {
                              const checked = isItemSelected(selectedItems, serviceId, group.key, item.key);
                              return (
                                <button
                                  key={item.key}
                                  onClick={() => handleToggleItem(serviceId, group.key, item.key)}
                                  className="flex items-center gap-2 text-left w-full py-1.5 px-2 rounded hover:bg-[#f3f2f1] transition-colors"
                                >
                                  <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0",
                                    checked ? "bg-[#0078d4] border-[#0078d4]" : "border-[#c8c6c4]"
                                  )}>
                                    {checked && <Check className="w-3 h-3 text-white" />}
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
                      <Button size="sm" onClick={() => toggleExpand(serviceId)}
                        className="h-8 px-4 text-xs bg-[#0078d4] hover:bg-[#106ebe] text-white">
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Done
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Shared 3-step Add Service dialog */}
      {(() => {
        const dialogScopeLabel =
          identifierLabel
            ? `For ${identifierLabel}${identifierAccountType && identifierAccountType !== "N/A" ? ` (${identifierAccountType})` : ""}`
            : "";
        const targetId = identifierId ?? "self";
        const routedTargets = unaddedServices.reduce<Record<string, string[]>>(
          (acc, s) => {
            acc[s.id] = [targetId];
            return acc;
          },
          {},
        );
        const serviceAccountType = unaddedServices.reduce<
          Record<string, "Consumer" | "Enterprise" | undefined>
        >((acc, s) => {
          const at = LENS_SERVICE_MAP[s.id]?.accountType;
          acc[s.id] = at;
          return acc;
        }, {});
        return (
          <AddServiceDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            scopeLabel={dialogScopeLabel}
            services={unaddedServices.map((s) => ({
              id: s.id,
              name: s.name,
              icon: s.icon,
            }))}
            availableGroups={availableGroups}
            routedTargets={routedTargets}
            identifiers={[
              {
                id: targetId,
                label: identifierLabel ?? "this identifier",
                accountType: identifierAccountType as
                  | "Consumer"
                  | "Enterprise"
                  | "N/A"
                  | undefined,
              },
            ]}
            serviceAccountType={serviceAccountType}
            onCommit={handleDialogCommit}
          />
        );
      })()}
    </>
  );

  if (showCard) {
    return <Card className="border-[#e1dfdd] bg-white p-4">{content}</Card>;
  }
  return <div>{content}</div>;
}
